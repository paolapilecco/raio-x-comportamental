import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const ASAAS_API_URL = "https://api.asaas.com/v3";

const PLANS = {
  monthly: { value: 4.99, cycle: "MONTHLY", description: "Plano Premium Mensal" },
  yearly: { value: 49.90, cycle: "YEARLY", description: "Plano Premium Anual" },
};

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

    if (!asaasApiKey) {
      console.error("ASAAS_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "Configuração de pagamento indisponível" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify user
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

    const body = await req.json().catch(() => ({}));
    const { plan, billingType } = body;

    // Validate inputs
    if (!plan || !["monthly", "yearly"].includes(plan)) {
      return new Response(
        JSON.stringify({ error: "Plano inválido. Use 'monthly' ou 'yearly'." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!billingType || !["CREDIT_CARD", "PIX"].includes(billingType)) {
      return new Response(
        JSON.stringify({ error: "Forma de pagamento inválida." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const selectedPlan = PLANS[plan as keyof typeof PLANS];

    // Check if user already has an active subscription
    const { data: existingSub } = await adminClient
      .from("subscriptions")
      .select("id, status, asaas_subscription_id")
      .eq("user_id", user.id)
      .in("status", ["active", "pending"])
      .maybeSingle();

    if (existingSub) {
      return new Response(
        JSON.stringify({ error: "Você já possui uma assinatura ativa ou pendente." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get user profile for name
    const { data: profile } = await adminClient
      .from("profiles")
      .select("name")
      .eq("user_id", user.id)
      .maybeSingle();

    // Step 1: Create or find customer in Asaas
    let asaasCustomerId: string;

    // Check if user already has a customer ID from a previous subscription
    const { data: prevSub } = await adminClient
      .from("subscriptions")
      .select("asaas_customer_id")
      .eq("user_id", user.id)
      .not("asaas_customer_id", "is", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (prevSub?.asaas_customer_id) {
      asaasCustomerId = prevSub.asaas_customer_id;
    } else {
      // Create new customer
      const customerRes = await fetch(`${ASAAS_API_URL}/customers`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "access_token": asaasApiKey,
        },
        body: JSON.stringify({
          name: profile?.name || user.email?.split("@")[0] || "Cliente",
          email: user.email,
          externalReference: user.id,
        }),
      });

      const customerData = await customerRes.json();
      if (!customerRes.ok) {
        console.error("Asaas customer creation failed:", JSON.stringify(customerData));
        return new Response(
          JSON.stringify({ error: "Erro ao processar pagamento. Tente novamente." }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      asaasCustomerId = customerData.id;
    }

    // Step 2: Create subscription in Asaas
    const nextDueDate = new Date();
    nextDueDate.setDate(nextDueDate.getDate() + 1); // Tomorrow
    const dueDateStr = nextDueDate.toISOString().split("T")[0];

    const subscriptionPayload: Record<string, unknown> = {
      customer: asaasCustomerId,
      billingType,
      value: selectedPlan.value,
      cycle: selectedPlan.cycle,
      description: selectedPlan.description,
      externalReference: user.id,
      nextDueDate: dueDateStr,
    };

    const subRes = await fetch(`${ASAAS_API_URL}/subscriptions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "access_token": asaasApiKey,
      },
      body: JSON.stringify(subscriptionPayload),
    });

    const subData = await subRes.json();
    if (!subRes.ok) {
      console.error("Asaas subscription creation failed:", JSON.stringify(subData));
      return new Response(
        JSON.stringify({ error: "Erro ao criar assinatura. Tente novamente." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Step 3: Save subscription locally
    const { error: insertError } = await adminClient
      .from("subscriptions")
      .insert({
        user_id: user.id,
        asaas_customer_id: asaasCustomerId,
        asaas_subscription_id: subData.id,
        plan,
        status: "pending",
        billing_type: billingType,
        value: selectedPlan.value,
        next_due_date: dueDateStr,
      });

    if (insertError) {
      console.error("Failed to save subscription:", insertError);
    }

    // Step 4: Get the first payment to return payment link/QR code
    // Wait a moment for Asaas to generate the payment
    await new Promise(resolve => setTimeout(resolve, 2000));

    const paymentsRes = await fetch(
      `${ASAAS_API_URL}/payments?subscription=${subData.id}`,
      {
        headers: { "access_token": asaasApiKey },
      }
    );
    const paymentsData = await paymentsRes.json();

    let paymentInfo: Record<string, unknown> = {};

    if (paymentsData.data && paymentsData.data.length > 0) {
      const firstPayment = paymentsData.data[0];

      if (billingType === "PIX") {
        // Get PIX QR Code
        const pixRes = await fetch(
          `${ASAAS_API_URL}/payments/${firstPayment.id}/pixQrCode`,
          {
            headers: { "access_token": asaasApiKey },
          }
        );
        const pixData = await pixRes.json();
        if (pixRes.ok) {
          paymentInfo = {
            type: "PIX",
            paymentId: firstPayment.id,
            qrCodeImage: pixData.encodedImage,
            qrCodePayload: pixData.payload,
            expirationDate: pixData.expirationDate,
          };
        }
      } else {
        // For credit card, return the payment link
        paymentInfo = {
          type: "CREDIT_CARD",
          paymentId: firstPayment.id,
          invoiceUrl: firstPayment.invoiceUrl,
          bankSlipUrl: firstPayment.bankSlipUrl,
        };
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        subscriptionId: subData.id,
        plan,
        value: selectedPlan.value,
        cycle: selectedPlan.cycle,
        payment: paymentInfo,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("asaas-checkout error:", e);
    return new Response(
      JSON.stringify({ error: "Erro interno. Tente novamente." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
