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

    const { feeId } = await req.json();
    if (!feeId) throw new Error("feeId is required");

    // Fetch the fee details
    const { data: fee, error: feeError } = await supabaseClient
      .from("fees")
      .select("id, description, amount, building_id, unit_id, status")
      .eq("id", feeId)
      .single();

    if (feeError || !fee) throw new Error("Fee not found");
    if (fee.status === "paid") throw new Error("Fee is already paid");

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Find or reference Stripe customer
    const customers = await stripe.customers.list({
      email: user.email,
      limit: 1,
    });
    let customerId: string | undefined;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    }

    // Create payment record first
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { data: payment, error: paymentError } = await supabaseAdmin
      .from("payments")
      .insert({
        fee_id: fee.id,
        amount: fee.amount,
        created_by: user.id,
        status: "created",
        currency: "EUR",
        payment_method: "stripe",
        metadata: { fee_description: fee.description },
      })
      .select()
      .single();

    if (paymentError) throw new Error(`Failed to create payment record: ${paymentError.message}`);

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: [
        {
          price_data: {
            currency: "eur",
            product_data: {
              name: fee.description || "Building Fee",
              description: `Fee payment — ${fee.description}`,
            },
            unit_amount: Math.round(Number(fee.amount) * 100), // cents
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${req.headers.get("origin")}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.get("origin")}/fees`,
      metadata: {
        fee_id: fee.id,
        payment_id: payment.id,
        user_id: user.id,
      },
    });

    // Update payment with stripe session id
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
