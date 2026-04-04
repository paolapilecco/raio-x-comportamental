import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const asaasWebhookToken = Deno.env.get("ASAAS_WEBHOOK_TOKEN");

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Optional: Validate webhook token from query params or headers
    const url = new URL(req.url);
    const token = url.searchParams.get("token");
    if (asaasWebhookToken && token !== asaasWebhookToken) {
      console.warn("Invalid webhook token received");
      return new Response(
        JSON.stringify({ error: "Token inválido" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json().catch(() => null);
    if (!body || !body.event) {
      return new Response(
        JSON.stringify({ error: "Payload inválido" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { event, payment, subscription } = body;
    console.log(`Asaas webhook received: ${event}`);

    // Handle payment events
    if (event === "PAYMENT_CONFIRMED" || event === "PAYMENT_RECEIVED") {
      // Payment confirmed - activate subscription
      if (payment?.subscription) {
        const { data: sub } = await adminClient
          .from("subscriptions")
          .select("id, user_id, status")
          .eq("asaas_subscription_id", payment.subscription)
          .maybeSingle();

        if (sub) {
          // Update subscription status
          await adminClient
            .from("subscriptions")
            .update({
              status: "active",
              current_period_start: new Date().toISOString(),
              current_period_end: payment.dueDate
                ? new Date(new Date(payment.dueDate).getTime() + 30 * 24 * 60 * 60 * 1000).toISOString()
                : null,
            })
            .eq("id", sub.id);

          // Grant premium role
          const { data: existingRole } = await adminClient
            .from("user_roles")
            .select("id")
            .eq("user_id", sub.user_id)
            .eq("role", "premium")
            .maybeSingle();

          if (!existingRole) {
            await adminClient
              .from("user_roles")
              .insert({ user_id: sub.user_id, role: "premium" });
          }

          // Log plan change
          await adminClient.from("plan_change_history").insert({
            user_id: sub.user_id,
            previous_plan: "standard",
            new_plan: "premium",
            changed_by: sub.user_id, // self via payment
          });

          console.log(`User ${sub.user_id} upgraded to premium via payment`);
        }
      }
    }

    if (event === "PAYMENT_OVERDUE") {
      if (payment?.subscription) {
        await adminClient
          .from("subscriptions")
          .update({ status: "overdue" })
          .eq("asaas_subscription_id", payment.subscription);
        console.log(`Subscription ${payment.subscription} marked as overdue`);
      }
    }

    // Handle subscription events
    if (event === "SUBSCRIPTION_DELETED" || event === "SUBSCRIPTION_INACTIVE") {
      const subId = subscription?.id || payment?.subscription;
      if (subId) {
        const { data: sub } = await adminClient
          .from("subscriptions")
          .select("id, user_id")
          .eq("asaas_subscription_id", subId)
          .maybeSingle();

        if (sub) {
          await adminClient
            .from("subscriptions")
            .update({
              status: "canceled",
              canceled_at: new Date().toISOString(),
            })
            .eq("id", sub.id);

          // Remove premium role
          await adminClient
            .from("user_roles")
            .delete()
            .eq("user_id", sub.user_id)
            .eq("role", "premium");

          // Log plan change
          await adminClient.from("plan_change_history").insert({
            user_id: sub.user_id,
            previous_plan: "premium",
            new_plan: "standard",
            changed_by: sub.user_id,
          });

          console.log(`User ${sub.user_id} downgraded - subscription canceled`);
        }
      }
    }

    return new Response(
      JSON.stringify({ received: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("asaas-webhook error:", e);
    return new Response(
      JSON.stringify({ received: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
