import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const ASAAS_API_URL = "https://api.asaas.com/v3";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Não autorizado" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const asaasApiKey = Deno.env.get("ASAAS_API_KEY");

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Não autorizado" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Get user's current subscription
    const { data: sub } = await adminClient
      .from("subscriptions")
      .select("*")
      .eq("user_id", user.id)
      .in("status", ["active", "pending"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!sub) {
      return new Response(
        JSON.stringify({ subscription: null }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // If pending and has asaas subscription, check payment status
    if (sub.status === "pending" && sub.asaas_subscription_id && asaasApiKey) {
      const paymentsRes = await fetch(
        `${ASAAS_API_URL}/payments?subscription=${sub.asaas_subscription_id}`,
        { headers: { "access_token": asaasApiKey } }
      );
      const paymentsData = await paymentsRes.json();

      if (paymentsData.data && paymentsData.data.length > 0) {
        const latestPayment = paymentsData.data[0];

        if (["CONFIRMED", "RECEIVED"].includes(latestPayment.status)) {
          // Payment confirmed, update locally
          await adminClient
            .from("subscriptions")
            .update({ status: "active" })
            .eq("id", sub.id);

          // Grant premium
          const { data: existingRole } = await adminClient
            .from("user_roles")
            .select("id")
            .eq("user_id", user.id)
            .eq("role", "premium")
            .maybeSingle();

          if (!existingRole) {
            await adminClient
              .from("user_roles")
              .insert({ user_id: user.id, role: "premium" });

            await adminClient.from("plan_change_history").insert({
              user_id: user.id,
              previous_plan: "standard",
              new_plan: "premium",
              changed_by: user.id,
            });
          }

          sub.status = "active";
        }

        // If PIX and still pending, refresh QR code
        if (sub.billing_type === "PIX" && latestPayment.status === "PENDING") {
          const pixRes = await fetch(
            `${ASAAS_API_URL}/payments/${latestPayment.id}/pixQrCode`,
            { headers: { "access_token": asaasApiKey } }
          );
          if (pixRes.ok) {
            const pixData = await pixRes.json();
            return new Response(
              JSON.stringify({
                subscription: sub,
                payment: {
                  type: "PIX",
                  paymentId: latestPayment.id,
                  qrCodeImage: pixData.encodedImage,
                  qrCodePayload: pixData.payload,
                  status: latestPayment.status,
                },
              }),
              { headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
        }
      }
    }

    return new Response(
      JSON.stringify({ subscription: sub }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("asaas-status error:", e);
    return new Response(
      JSON.stringify({ error: "Erro ao verificar status" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
