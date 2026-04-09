import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GATEWAY_URL = "https://connector-gateway.lovable.dev/resend";
const FROM_EMAIL = "Raio-X Mental <noreply@raio-xmental.com.br>";

// ─── Email Templates ──────────────────────────────────────

function baseLayout(content: string): string {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#f7f7f5;font-family:'DM Sans',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f7f7f5;padding:40px 0;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.06);">
  <!-- Header -->
  <tr><td style="background:linear-gradient(135deg,#1f3d37,#2a5248);padding:32px 40px;text-align:center;">
    <h1 style="margin:0;color:#f7f7f5;font-size:22px;font-weight:700;letter-spacing:-0.3px;">🧠 Raio-X Mental</h1>
  </td></tr>
  <!-- Body -->
  <tr><td style="padding:36px 40px;">
    ${content}
  </td></tr>
  <!-- Footer -->
  <tr><td style="padding:24px 40px;background-color:#f7f7f5;text-align:center;border-top:1px solid #e5e5e0;">
    <p style="margin:0;font-size:12px;color:#999;">© ${new Date().getFullYear()} Raio-X Mental. Todos os direitos reservados.</p>
    <p style="margin:6px 0 0;font-size:11px;color:#bbb;">Este é um email automático, por favor não responda.</p>
  </td></tr>
</table>
</td></tr></table>
</body></html>`;
}

const btn = (url: string, label: string) =>
  `<a href="${url}" style="display:inline-block;background-color:#2a5248;color:#f7f7f5;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;">${label}</a>`;

const templates: Record<string, (data: Record<string, string>) => { subject: string; html: string }> = {
  "welcome": (data) => ({
    subject: "Bem-vindo(a) ao Raio-X Mental! 🧠",
    html: baseLayout(`
      <h2 style="margin:0 0 16px;color:#1f3d37;font-size:20px;">Olá, ${data.name || ""}! 👋</h2>
      <p style="color:#3d3d3d;font-size:15px;line-height:1.6;">Sua conta foi criada com sucesso. Você agora tem acesso à plataforma de diagnóstico comportamental mais avançada do Brasil.</p>
      <p style="color:#3d3d3d;font-size:15px;line-height:1.6;">Com o Raio-X Mental, você poderá:</p>
      <ul style="color:#3d3d3d;font-size:14px;line-height:1.8;padding-left:20px;">
        <li>Realizar diagnósticos comportamentais profundos</li>
        <li>Identificar padrões inconscientes</li>
        <li>Receber relatórios detalhados com IA</li>
      </ul>
      <div style="text-align:center;margin:28px 0;">
        ${btn(data.appUrl || "https://raio-x-comportamental.lovable.app", "Acessar Plataforma")}
      </div>
    `),
  }),

  "test-invite": (data) => ({
    subject: `${data.professionalName || "Seu profissional"} enviou um teste para você`,
    html: baseLayout(`
      <h2 style="margin:0 0 16px;color:#1f3d37;font-size:20px;">Olá, ${data.patientName || ""}! 👋</h2>
      <p style="color:#3d3d3d;font-size:15px;line-height:1.6;"><strong>${data.professionalName || "Seu profissional"}</strong> preparou o teste <strong>"${data.testName || "Diagnóstico"}"</strong> para você.</p>
      <p style="color:#3d3d3d;font-size:15px;line-height:1.6;">O teste é simples, confidencial e leva poucos minutos. Suas respostas ajudarão no seu acompanhamento profissional.</p>
      <div style="text-align:center;margin:28px 0;">
        ${btn(data.testLink || "#", "Iniciar Teste")}
      </div>
      <p style="color:#999;font-size:12px;text-align:center;">⏰ Este link expira em 7 dias.</p>
    `),
  }),

  "test-completed": (data) => ({
    subject: `📊 ${data.patientName || "Paciente"} completou o teste "${data.testName || ""}"`,
    html: baseLayout(`
      <h2 style="margin:0 0 16px;color:#1f3d37;font-size:20px;">Novo resultado disponível! 📊</h2>
      <p style="color:#3d3d3d;font-size:15px;line-height:1.6;">O paciente <strong>${data.patientName || ""}</strong> completou o teste <strong>"${data.testName || ""}"</strong>.</p>
      <div style="background:#f0f7f5;border-radius:8px;padding:20px;margin:20px 0;">
        <p style="margin:0;font-size:14px;color:#2a5248;"><strong>Padrão dominante:</strong> ${data.dominantPattern || "—"}</p>
        <p style="margin:8px 0 0;font-size:14px;color:#2a5248;"><strong>Intensidade:</strong> ${data.intensity || "—"}</p>
      </div>
      <div style="text-align:center;margin:28px 0;">
        ${btn(data.detailUrl || "#", "Ver Resultado Completo")}
      </div>
    `),
  }),

  "platform-invite": (data) => ({
    subject: `Você foi convidado(a) para o Raio-X Mental! 🧠`,
    html: baseLayout(`
      <h2 style="margin:0 0 16px;color:#1f3d37;font-size:20px;">Você recebeu um convite! 🎉</h2>
      <p style="color:#3d3d3d;font-size:15px;line-height:1.6;"><strong>${data.inviterName || "Um profissional"}</strong> convidou você para fazer parte do Raio-X Mental.</p>
      <p style="color:#3d3d3d;font-size:15px;line-height:1.6;">Crie sua conta e comece a explorar seus padrões comportamentais com a plataforma de diagnóstico mais avançada do Brasil.</p>
      <div style="text-align:center;margin:28px 0;">
        ${btn(data.inviteLink || "#", "Aceitar Convite")}
      </div>
      <p style="color:#999;font-size:12px;text-align:center;">⏰ Este convite expira em 7 dias.</p>
    `),
  }),

  "retest-reminder": (data) => ({
    subject: `⏰ Lembrete: hora de reaplicar o teste para ${data.patientName || ""}`,
    html: baseLayout(`
      <h2 style="margin:0 0 16px;color:#1f3d37;font-size:20px;">Lembrete de reteste ⏰</h2>
      <p style="color:#3d3d3d;font-size:15px;line-height:1.6;">O ciclo de reteste para <strong>${data.patientName || ""}</strong> está previsto para hoje.</p>
      <p style="color:#3d3d3d;font-size:15px;line-height:1.6;">Reaplicar testes periodicamente permite acompanhar a evolução e identificar mudanças nos padrões comportamentais.</p>
      <div style="text-align:center;margin:28px 0;">
        ${btn(data.detailUrl || "#", "Ver Paciente")}
      </div>
    `),
  }),
};

// ─── Handler ──────────────────────────────────────────────

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { templateName, to, data, action } = await req.json();

    // Action: list templates (for admin)
    if (action === "list-templates") {
      const templateList = Object.entries(templates).map(([key, fn]) => {
        const sample = fn({});
        return { key, subject: sample.subject, preview: sample.html.substring(0, 200) + "..." };
      });
      return new Response(JSON.stringify({ templates: templateList }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Action: preview template (for admin)
    if (action === "preview") {
      if (!templateName || !templates[templateName]) {
        return new Response(JSON.stringify({ error: "Template não encontrado" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { subject, html } = templates[templateName](data || {});
      return new Response(JSON.stringify({ subject, html }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Action: get logs (for admin)
    if (action === "get-logs") {
      const limit = data?.limit || 50;
      const offset = data?.offset || 0;
      const statusFilter = data?.statusFilter;
      const templateFilter = data?.templateFilter;

      let query = supabase
        .from("email_logs")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1);

      if (statusFilter && statusFilter !== "all") query = query.eq("status", statusFilter);
      if (templateFilter && templateFilter !== "all") query = query.eq("template_name", templateFilter);

      const { data: logs, count, error } = await query;
      if (error) {
        console.error("Logs query error:", error);
        return new Response(JSON.stringify({ error: "Erro ao buscar logs" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Stats
      const { data: stats } = await supabase
        .from("email_logs")
        .select("status");

      const statCounts = { total: stats?.length || 0, sent: 0, failed: 0, pending: 0 };
      stats?.forEach((s: any) => {
        if (s.status === "sent") statCounts.sent++;
        else if (s.status === "failed") statCounts.failed++;
        else statCounts.pending++;
      });

      return new Response(JSON.stringify({ logs, count, stats: statCounts }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Default: send email
    if (!templateName || typeof templateName !== "string") {
      return new Response(JSON.stringify({ error: "templateName obrigatório" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!to || typeof to !== "string" || !to.includes("@")) {
      return new Response(JSON.stringify({ error: "Email de destino inválido" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const templateFn = templates[templateName];
    if (!templateFn) {
      return new Response(JSON.stringify({ error: "Template não encontrado" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { subject, html } = templateFn(data || {});

    // Log as pending
    const { data: logEntry } = await supabase.from("email_logs").insert({
      template_name: templateName,
      recipient_email: to,
      status: "pending",
      template_data: data || {},
      sent_by: data?._sentBy || null,
    }).select("id").single();

    const response = await fetch(`${GATEWAY_URL}/emails`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "X-Connection-Api-Key": RESEND_API_KEY,
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [to],
        subject,
        html,
      }),
    });

    const result = await response.json();

    // Update log status
    if (logEntry?.id) {
      if (response.ok) {
        await supabase.from("email_logs").update({ status: "sent", resend_id: result.id }).eq("id", logEntry.id);
      } else {
        await supabase.from("email_logs").update({ status: "failed", error_message: JSON.stringify(result) }).eq("id", logEntry.id);
      }
    }

    if (!response.ok) {
      console.error("Resend API error:", JSON.stringify(result));
      return new Response(JSON.stringify({ error: "Erro ao enviar email" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, id: result.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("send-email error:", e);
    return new Response(JSON.stringify({ error: "Erro interno ao processar email" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
