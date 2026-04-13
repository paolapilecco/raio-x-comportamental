import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const ASAAS_API_URL = "https://api.asaas.com/v3";

const PLANS: Record<string, Record<string, { value: number; cycle: string; description: string }>> = {
  pessoal: {
    monthly: { value: 9.99, cycle: "MONTHLY", description: "Plano Pessoal Mensal" },
    yearly: { value: 99.90, cycle: "YEARLY", description: "Plano Pessoal Anual" },
  },
  profissional: {
    monthly: { value: 39.90, cycle: "MONTHLY", description: "Plano Profissional Mensal" },
    yearly: { value: 399.90, cycle: "YEARLY", description: "Plano Profissional Anual" },
  },
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
    const { plan, billingType, planType } = body;

    // Validate inputs
    if (!plan || !["monthly", "yearly"].includes(plan)) {
      return new Response(
        JSON.stringify({ error: "Plano inválido." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!planType || !["pessoal", "profissional"].includes(planType)) {
      return new Response(
        JSON.stringify({ error: "Tipo de plano inválido." }),
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
    const selectedPlan = PLANS[planType][plan];

    // Check existing active subscription
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

    // Get user profile for name and CPF
    const { data: profile } = await adminClient
      .from("profiles")
      .select("name, cpf")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!profile?.cpf) {
      return new Response(
        JSON.stringify({ error: "CPF não encontrado. Atualize seu perfil." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create or find Asaas customer
    let asaasCustomerId: string;

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
      const customerRes = await fetch(`${ASAAS_API_URL}/customers`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "access_token": asaasApiKey,
        },
        body: JSON.stringify({
          name: profile?.name || user.email?.split("@")[0] || "Cliente",
          email: user.email,
          cpfCnpj: profile.cpf,
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

    // Create subscription in Asaas
    const nextDueDate = new Date();
    nextDueDate.setDate(nextDueDate.getDate() + 1);
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

    // Save subscription locally with plan_type
    const { error: insertError } = await adminClient
      .from("subscriptions")
      .insert({
        user_id: user.id,
        asaas_customer_id: asaasCustomerId,
        asaas_subscription_id: subData.id,
        plan,
        plan_type: planType,
        status: "pending",
        billing_type: billingType,
        value: selectedPlan.value,
        next_due_date: dueDateStr,
      });

    if (insertError) {
      console.error("Failed to save subscription:", insertError);
    }

    // Get the first payment
    await new Promise(resolve => setTimeout(resolve, 2000));

    const paymentsRes = await fetch(
      `${ASAAS_API_URL}/payments?subscription=${subData.id}`,
      { headers: { "access_token": asaasApiKey } }
    );
    const paymentsData = await paymentsRes.json();

    let paymentInfo: Record<string, unknown> = {};

    if (paymentsData.data && paymentsData.data.length > 0) {
      const firstPayment = paymentsData.data[0];

      if (billingType === "PIX") {
        const pixRes = await fetch(
          `${ASAAS_API_URL}/payments/${firstPayment.id}/pixQrCode`,
          { headers: { "access_token": asaasApiKey } }
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
        planType,
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
