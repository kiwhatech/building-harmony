import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );

  try {
    // Authenticate user
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data: userData } = await supabaseClient.auth.getUser(token);
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated");

    const { paymentType, feeId, requestId } = await req.json();

    if (!paymentType || !['unit_fee', 'intervention'].includes(paymentType)) {
      throw new Error("paymentType must be 'unit_fee' or 'intervention'");
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    let amount: number;
    let description: string;
    let metadata: Record<string, string> = { payment_type: paymentType, user_id: user.id };

    if (paymentType === 'unit_fee') {
      if (!feeId) throw new Error("feeId is required for unit_fee payments");

      const { data: fee, error: feeError } = await supabaseClient
        .from("fees")
        .select("id, description, amount, status")
        .eq("id", feeId)
        .single();

      if (feeError || !fee) throw new Error("Fee not found");
      if (fee.status === "paid") throw new Error("Fee is already paid");

      amount = Number(fee.amount);
      description = fee.description || "Building Fee";
      metadata.fee_id = fee.id;
    } else {
      // intervention payment
      if (!requestId) throw new Error("requestId is required for intervention payments");

      const { data: request, error: reqError } = await supabaseClient
        .from("unified_requests")
        .select("id, title, estimated_amount, status")
        .eq("id", requestId)
        .single();

      if (reqError || !request) throw new Error("Request not found");
      if (request.status !== "ready_for_payment") throw new Error("Request is not ready for payment");
      if (!request.estimated_amount) throw new Error("No amount set for this intervention");

      amount = Number(request.estimated_amount);
      description = request.title || "Intervention Payment";
      metadata.request_id = request.id;
    }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Find or create Stripe customer
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId: string | undefined;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    }

    // Create payment record
    const { data: payment, error: paymentError } = await supabaseAdmin
      .from("payments")
      .insert({
        fee_id: paymentType === 'unit_fee' ? feeId : null,
        request_id: paymentType === 'intervention' ? requestId : null,
        amount,
        created_by: user.id,
        status: "created",
        currency: "EUR",
        payment_type: paymentType,
        payment_method: "stripe",
        metadata: { description },
      })
      .select()
      .single();

    if (paymentError) throw new Error(`Failed to create payment: ${paymentError.message}`);

    metadata.payment_id = payment.id;

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: [
        {
          price_data: {
            currency: "eur",
            product_data: {
              name: description,
              description: paymentType === 'intervention'
                ? `Intervention payment — ${description}`
                : `Fee payment — ${description}`,
            },
            unit_amount: Math.round(amount * 100),
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${req.headers.get("origin")}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.get("origin")}/${paymentType === 'intervention' ? `requests/${requestId}` : 'fees'}`,
      metadata,
    });

    // Update payment with session ID
    await supabaseAdmin
      .from("payments")
      .update({ stripe_session_id: session.id, status: "pending" })
      .eq("id", payment.id);

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Checkout error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
