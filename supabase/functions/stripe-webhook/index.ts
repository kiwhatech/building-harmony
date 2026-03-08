import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, stripe-signature",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
    apiVersion: "2025-08-27.basil",
  });

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    const body = await req.text();
    const signature = req.headers.get("stripe-signature");

    let event: Stripe.Event;

    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    if (webhookSecret && signature) {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } else {
      // Fallback for development: parse raw event
      event = JSON.parse(body) as Stripe.Event;
    }

    console.log(`Processing Stripe event: ${event.type}`);

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const paymentId = session.metadata?.payment_id;
        const feeId = session.metadata?.fee_id;

        if (paymentId) {
          await supabaseAdmin
            .from("payments")
            .update({
              status: "succeeded",
              gateway_payment_id: session.payment_intent as string,
              reference_number: session.id,
              updated_at: new Date().toISOString(),
            })
            .eq("id", paymentId);
        }

        if (feeId) {
          await supabaseAdmin
            .from("fees")
            .update({ status: "paid" })
            .eq("id", feeId);
        }

        console.log(`Payment ${paymentId} succeeded for fee ${feeId}`);
        break;
      }

      case "checkout.session.expired": {
        const session = event.data.object as Stripe.Checkout.Session;
        const paymentId = session.metadata?.payment_id;

        if (paymentId) {
          await supabaseAdmin
            .from("payments")
            .update({
              status: "canceled",
              updated_at: new Date().toISOString(),
            })
            .eq("id", paymentId);
        }
        break;
      }

      case "charge.refunded": {
        const charge = event.data.object as Stripe.Charge;
        // Find payment by gateway_payment_id
        const { data: payments } = await supabaseAdmin
          .from("payments")
          .select("id, fee_id")
          .eq("gateway_payment_id", charge.payment_intent as string)
          .limit(1);

        if (payments && payments.length > 0) {
          await supabaseAdmin
            .from("payments")
            .update({
              status: "refunded",
              updated_at: new Date().toISOString(),
            })
            .eq("id", payments[0].id);

          // Revert fee status
          if (payments[0].fee_id) {
            await supabaseAdmin
              .from("fees")
              .update({ status: "pending" })
              .eq("id", payments[0].fee_id);
          }
        }
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Webhook error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});
