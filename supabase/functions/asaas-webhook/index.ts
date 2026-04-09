import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const PLAN_LABELS: Record<string, string> = {
  monthly: "Pessoal Mensal",
  yearly: "Pessoal Anual",
  profissional: "Profissional",
};

async function sendEmail(
  supabase: any,
  templateName: string,
  to: string,
  data: Record<string, string>,
) {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    if (!LOVABLE_API_KEY) return;

    await fetch(`${supabaseUrl}/functions/v1/send-email`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${anonKey}`,
      },
      body: JSON.stringify({ templateName, to, data }),
    });
  } catch (e) {
    console.error(`Failed to send ${templateName} email:`, e);
  }
}

async function getUserEmail(adminClient: any, userId: string): Promise<string | null> {
  try {
    const { data } = await adminClient
      .from("profiles")
      .select("name")
      .eq("user_id", userId)
      .maybeSingle();

    // Get email from auth
    const { data: authData } = await adminClient.auth.admin.getUserById(userId);
    return authData?.user?.email || null;
  } catch {
    return null;
  }
}

async function getUserName(adminClient: any, userId: string): Promise<string> {
  const { data } = await adminClient
    .from("profiles")
    .select("name")
    .eq("user_id", userId)
    .maybeSingle();
  return data?.name || "";
}

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
      if (payment?.subscription) {
        const { data: sub } = await adminClient
          .from("subscriptions")
          .select("id, user_id, status, plan")
          .eq("asaas_subscription_id", payment.subscription)
          .maybeSingle();

        if (sub) {
          const nextDueDate = payment.dueDate
            ? new Date(new Date(payment.dueDate).getTime() + 30 * 24 * 60 * 60 * 1000).toISOString()
            : null;

          // Update subscription status
          await adminClient
            .from("subscriptions")
            .update({
              status: "active",
              current_period_start: new Date().toISOString(),
              current_period_end: nextDueDate,
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
            changed_by: sub.user_id,
          });

          console.log(`User ${sub.user_id} upgraded to premium via payment`);

          // 📧 Send subscription-confirmed email
          const email = await getUserEmail(adminClient, sub.user_id);
          const name = await getUserName(adminClient, sub.user_id);
          if (email) {
            await sendEmail(adminClient, "subscription-confirmed", email, {
              name,
              planName: PLAN_LABELS[sub.plan] || "Premium",
              value: payment.value?.toFixed(2)?.replace(".", ",") || "—",
              nextDueDate: nextDueDate
                ? new Date(nextDueDate).toLocaleDateString("pt-BR")
                : "—",
            });
          }
        }
      }
    }

    if (event === "PAYMENT_OVERDUE") {
      if (payment?.subscription) {
        const { data: sub } = await adminClient
          .from("subscriptions")
          .select("id, user_id, plan")
          .eq("asaas_subscription_id", payment.subscription)
          .maybeSingle();

        await adminClient
          .from("subscriptions")
          .update({ status: "overdue" })
          .eq("asaas_subscription_id", payment.subscription);

        console.log(`Subscription ${payment.subscription} marked as overdue`);

        // 📧 Send payment-overdue email
        if (sub) {
          const email = await getUserEmail(adminClient, sub.user_id);
          const name = await getUserName(adminClient, sub.user_id);
          if (email) {
            await sendEmail(adminClient, "payment-overdue", email, {
              name,
              planName: PLAN_LABELS[sub.plan] || "Premium",
              value: payment.value?.toFixed(2)?.replace(".", ",") || "—",
              dueDate: payment.dueDate
                ? new Date(payment.dueDate).toLocaleDateString("pt-BR")
                : "—",
            });
          }
        }
      }
    }

    // Handle subscription events
    if (event === "SUBSCRIPTION_DELETED" || event === "SUBSCRIPTION_INACTIVE") {
      const subId = subscription?.id || payment?.subscription;
      if (subId) {
        const { data: sub } = await adminClient
          .from("subscriptions")
          .select("id, user_id, plan, current_period_end")
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

          // 📧 Send subscription-canceled email
          const email = await getUserEmail(adminClient, sub.user_id);
          const name = await getUserName(adminClient, sub.user_id);
          if (email) {
            await sendEmail(adminClient, "subscription-canceled", email, {
              name,
              planName: PLAN_LABELS[sub.plan] || "Premium",
              accessUntil: sub.current_period_end
                ? new Date(sub.current_period_end).toLocaleDateString("pt-BR")
                : "fim do período atual",
            });
          }
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
