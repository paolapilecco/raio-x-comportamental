import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GATEWAY_URL = "https://connector-gateway.lovable.dev/resend";
const FROM_EMAIL = "Raio-X Mental <noreply@raio-xmental.com.br>";

// ─── Premium Brand Design System ─────────────────────────
const BRAND = {
  green: "#1F3D3A",
  greenLight: "#2a5248",
  gold: "#C6A969",
  goldLight: "#F2D27A",
  goldDark: "#B8860B",
  offWhite: "#FAFAF9",
  warmGray: "#6B6B6B",
  text: "#2D2D2D",
  textLight: "#555555",
  border: "#E8E4DF",
  cardBg: "#FFFFFF",
};

function baseLayout(content: string, preheader?: string): string {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <meta name="color-scheme" content="light">
  <meta name="supported-color-schemes" content="light">
  ${preheader ? `<span style="display:none;font-size:1px;color:${BRAND.offWhite};max-height:0;overflow:hidden;">${preheader}</span>` : ""}
</head>
<body style="margin:0;padding:0;background-color:${BRAND.offWhite};font-family:'Georgia','Times New Roman',serif;-webkit-font-smoothing:antialiased;">
<table width="100%" cellpadding="0" cellspacing="0" style="background-color:${BRAND.offWhite};padding:40px 0;">
<tr><td align="center">

<!-- Outer Container -->
<table width="600" cellpadding="0" cellspacing="0" style="background-color:${BRAND.cardBg};border-radius:16px;overflow:hidden;box-shadow:0 8px 40px rgba(31,61,58,0.08),0 1px 3px rgba(0,0,0,0.04);">

  <!-- Header with Gold Accent -->
  <tr><td>
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr><td style="height:4px;background:linear-gradient(90deg,${BRAND.goldDark},${BRAND.gold},${BRAND.goldLight},${BRAND.gold},${BRAND.goldDark});"></td></tr>
      <tr><td style="background:linear-gradient(180deg,${BRAND.green} 0%,${BRAND.greenLight} 100%);padding:36px 48px;text-align:center;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr><td align="center">
            <p style="margin:0 0 6px;font-size:11px;letter-spacing:3px;text-transform:uppercase;color:${BRAND.gold};font-family:Arial,sans-serif;font-weight:600;">PLATAFORMA DE DIAGNÓSTICO COMPORTAMENTAL</p>
            <h1 style="margin:0;color:${BRAND.offWhite};font-size:26px;font-weight:700;letter-spacing:-0.5px;font-family:Georgia,serif;">🧠 Raio-X Mental</h1>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </td></tr>

  <!-- Body -->
  <tr><td style="padding:40px 48px;">
    ${content}
  </td></tr>

  <!-- Footer -->
  <tr><td>
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr><td style="height:1px;background:linear-gradient(90deg,transparent,${BRAND.border},transparent);"></td></tr>
      <tr><td style="padding:28px 48px;background-color:${BRAND.offWhite};text-align:center;">
        <p style="margin:0 0 4px;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:${BRAND.gold};font-family:Arial,sans-serif;font-weight:600;">RAIO-X MENTAL</p>
        <p style="margin:0 0 8px;font-size:12px;color:${BRAND.warmGray};font-family:Arial,sans-serif;">Decodificando padrões. Desbloqueando potencial.</p>
        <p style="margin:0;font-size:11px;color:#AAAAAA;font-family:Arial,sans-serif;">© ${new Date().getFullYear()} Raio-X Mental — Todos os direitos reservados</p>
        <p style="margin:6px 0 0;font-size:10px;color:#CCCCCC;font-family:Arial,sans-serif;">Este é um email automático. Não responda.</p>
      </td></tr>
    </table>
  </td></tr>

</table>
</td></tr></table>
</body></html>`;
}

const heading = (text: string) =>
  `<h2 style="margin:0 0 20px;color:${BRAND.green};font-size:22px;font-weight:700;letter-spacing:-0.3px;line-height:1.3;font-family:Georgia,serif;">${text}</h2>`;

const paragraph = (text: string) =>
  `<p style="color:${BRAND.text};font-size:15px;line-height:1.7;margin:0 0 16px;font-family:Georgia,serif;">${text}</p>`;

const btn = (url: string, label: string, gold = false) => {
  const bg = gold
    ? `background:linear-gradient(135deg,${BRAND.goldDark},${BRAND.gold},${BRAND.goldLight});color:${BRAND.green};`
    : `background:linear-gradient(135deg,${BRAND.green},${BRAND.greenLight});color:${BRAND.offWhite};`;
  return `<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:8px 0;">
    <a href="${url}" style="display:inline-block;${bg}padding:16px 40px;border-radius:12px;text-decoration:none;font-weight:700;font-size:15px;font-family:Arial,sans-serif;letter-spacing:0.3px;box-shadow:0 4px 12px rgba(31,61,58,0.15);">${label}</a>
  </td></tr></table>`;
};

const infoBox = (content: string, accent = BRAND.green) =>
  `<table width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0;"><tr>
    <td style="border-left:4px solid ${accent};background:${BRAND.offWhite};border-radius:0 12px 12px 0;padding:20px 24px;">
      ${content}
    </td>
  </tr></table>`;

const infoRow = (label: string, value: string) =>
  `<p style="margin:0 0 6px;font-size:14px;color:${BRAND.textLight};font-family:Arial,sans-serif;"><strong style="color:${BRAND.green};">${label}:</strong> ${value}</p>`;

const divider = () =>
  `<table width="100%" cellpadding="0" cellspacing="0" style="margin:28px 0;"><tr><td style="height:1px;background:linear-gradient(90deg,transparent,${BRAND.border},transparent);"></td></tr></table>`;

const goldTag = (text: string) =>
  `<span style="display:inline-block;background:linear-gradient(135deg,${BRAND.goldDark},${BRAND.gold});color:${BRAND.offWhite};padding:4px 12px;border-radius:20px;font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;font-family:Arial,sans-serif;">${text}</span>`;

// ─── Email Templates ──────────────────────────────────────

const templates: Record<string, (data: Record<string, string>) => { subject: string; html: string }> = {

  "welcome": (data) => ({
    subject: "Bem-vindo(a) ao Raio-X Mental — Sua jornada de autoconhecimento começa agora 🧠",
    html: baseLayout(`
      ${heading(`${data.name ? `${data.name}, ` : ""}sua leitura mental começa agora.`)}
      ${paragraph("Você acaba de dar o primeiro passo para decodificar os padrões invisíveis que governam suas decisões, relacionamentos e resultados.")}
      ${paragraph("O <strong>Raio-X Mental</strong> não é um teste comum. É uma plataforma de diagnóstico comportamental profundo que utiliza inteligência artificial para revelar o que poucos profissionais conseguem identificar.")}
      ${divider()}
      ${heading("O que você vai descobrir:")}
      <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
        <tr><td style="padding:12px 0;border-bottom:1px solid ${BRAND.border};">
          <p style="margin:0;font-size:14px;color:${BRAND.text};font-family:Arial,sans-serif;">🔍 <strong>Padrões inconscientes</strong> que sabotam seu progresso</p>
        </td></tr>
        <tr><td style="padding:12px 0;border-bottom:1px solid ${BRAND.border};">
          <p style="margin:0;font-size:14px;color:${BRAND.text};font-family:Arial,sans-serif;">🧬 <strong>Mecanismos de autossabotagem</strong> que operam no piloto automático</p>
        </td></tr>
        <tr><td style="padding:12px 0;border-bottom:1px solid ${BRAND.border};">
          <p style="margin:0;font-size:14px;color:${BRAND.text};font-family:Arial,sans-serif;">🎯 <strong>Direcionamentos personalizados</strong> com base em IA avançada</p>
        </td></tr>
        <tr><td style="padding:12px 0;">
          <p style="margin:0;font-size:14px;color:${BRAND.text};font-family:Arial,sans-serif;">📊 <strong>Relatórios científicos</strong> com linguagem acessível e prática</p>
        </td></tr>
      </table>
      ${btn(data.appUrl || "https://raio-x-comportamental.lovable.app", "Iniciar Meu Primeiro Diagnóstico")}
      ${divider()}
      <p style="margin:0;text-align:center;font-size:13px;color:${BRAND.warmGray};font-style:italic;font-family:Georgia,serif;">"Quem não conhece os padrões que o governam, será governado por eles."</p>
    `, "Sua jornada de autoconhecimento profundo começa agora"),
  }),

  "test-invite": (data) => ({
    subject: `${data.professionalName || "Seu profissional"} preparou um diagnóstico para você`,
    html: baseLayout(`
      ${heading(`${data.patientName || ""}, um diagnóstico foi preparado para você.`)}
      ${paragraph(`<strong>${data.professionalName || "Seu profissional"}</strong> selecionou o diagnóstico <strong>"${data.testName || "Análise Comportamental"}"</strong> especificamente para o seu perfil.`)}
      ${infoBox(`
        ${infoRow("Diagnóstico", data.testName || "Análise Comportamental")}
        ${infoRow("Solicitado por", data.professionalName || "Profissional")}
        ${infoRow("Tempo estimado", "8–12 minutos")}
      `)}
      ${paragraph("Suas respostas são <strong>100% confidenciais</strong> e processadas por inteligência artificial para gerar insights que auxiliarão seu acompanhamento profissional.")}
      ${btn(data.testLink || "#", "Iniciar Diagnóstico")}
      <p style="margin:20px 0 0;text-align:center;font-size:12px;color:${BRAND.warmGray};font-family:Arial,sans-serif;">⏰ Este link é válido por 7 dias</p>
    `, `${data.professionalName || "Seu profissional"} preparou um diagnóstico para você`),
  }),

  "test-completed": (data) => ({
    subject: `📊 Novo resultado: ${data.patientName || "Paciente"} completou "${data.testName || "diagnóstico"}"`,
    html: baseLayout(`
      ${heading("Novo resultado disponível")}
      ${paragraph(`O paciente <strong>${data.patientName || ""}</strong> completou o diagnóstico <strong>"${data.testName || ""}"</strong>. Os resultados já foram processados pela IA.`)}
      ${infoBox(`
        ${infoRow("Paciente", data.patientName || "—")}
        ${infoRow("Diagnóstico", data.testName || "—")}
        ${infoRow("Padrão dominante", data.dominantPattern || "—")}
        ${infoRow("Intensidade", data.intensity || "—")}
      `, BRAND.gold)}
      ${btn(data.detailUrl || "#", "Analisar Resultado Completo")}
    `, `${data.patientName} completou o diagnóstico - resultados prontos`),
  }),

  "platform-invite": (data) => ({
    subject: "Você recebeu acesso à plataforma Raio-X Mental 🧠",
    html: baseLayout(`
      ${heading("Você foi selecionado(a).")}
      ${paragraph(`<strong>${data.inviterName || "Um profissional"}</strong> concedeu a você acesso à plataforma de diagnóstico comportamental mais avançada do Brasil.`)}
      ${paragraph("O Raio-X Mental utiliza inteligência artificial e modelos baseados em Níveis Neurológicos para revelar padrões que normalmente levam meses — ou anos — de terapia para identificar.")}
      ${infoBox(`
        <p style="margin:0;font-size:14px;color:${BRAND.green};font-family:Arial,sans-serif;font-weight:600;">✨ Seu acesso é exclusivo e personalizado</p>
      `, BRAND.gold)}
      ${btn(data.inviteLink || "#", "Aceitar Convite e Criar Conta")}
      <p style="margin:20px 0 0;text-align:center;font-size:12px;color:${BRAND.warmGray};font-family:Arial,sans-serif;">⏰ Este convite expira em 7 dias</p>
    `, `${data.inviterName || "Um profissional"} te convidou para o Raio-X Mental`),
  }),

  "retest-reminder": (data) => ({
    subject: `⏰ Ciclo de reteste — ${data.patientName || "paciente"} está pronto para nova leitura`,
    html: baseLayout(`
      ${heading("Ciclo de reteste disponível")}
      ${paragraph(`O paciente <strong>${data.patientName || ""}</strong> completou o diagnóstico <strong>"${data.testName || ""}"</strong>. Os resultados já foram processados pela IA.`)}
      ${paragraph("Reaplicar diagnósticos em intervalos estratégicos permite mapear a <strong>evolução dos padrões</strong>, validar intervenções e identificar mudanças comportamentais com precisão científica.")}
      ${infoBox(`
        ${infoRow("Paciente", data.patientName || "—")}
        ${infoRow("Status", "Pronto para reteste")}
      `)}
      ${btn(data.detailUrl || "#", "Acessar Paciente")}
    `, `Hora de reaplicar o diagnóstico para ${data.patientName}`),
  }),

  "retest-overdue": (data) => ({
    subject: data.subjectOverride || "Sua análise já está desatualizada",
    html: baseLayout(`
      ${heading(data.heading || "Seu padrão continua ativo.")}
      ${paragraph(data.bodyIntro || "Nada indica que houve mudança.")}
      ${paragraph(`Seu último resultado no módulo <strong>"${data.moduleName || "Análise Comportamental"}"</strong> foi gerado há <strong>${data.daysSince || "15+"} dias</strong>. Esse resultado ainda define seu comportamento atual.`)}
      ${divider()}
      ${paragraph(data.bodyCta || "Refaça sua análise e veja se você evoluiu ou só adiou.")}
      ${btn(data.testUrl || "https://raio-x-comportamental.lovable.app/dashboard", "Refazer Análise")}
    `, data.heading || "Seu padrão continua ativo. Nada indica que houve mudança."),
  }),

  "password-reset": (data) => ({
    subject: "Redefinição de senha — Raio-X Mental",
    html: baseLayout(`
      ${heading("Redefinir sua senha")}
      ${paragraph("Recebemos uma solicitação de redefinição de senha para sua conta no Raio-X Mental.")}
      ${paragraph("Clique no botão abaixo para criar uma nova senha segura. Se você não solicitou esta alteração, simplesmente ignore este email — sua conta permanecerá protegida.")}
      ${btn(data.resetLink || "#", "Criar Nova Senha")}
      <p style="margin:20px 0 0;text-align:center;font-size:12px;color:${BRAND.warmGray};font-family:Arial,sans-serif;">🔒 Este link expira em 1 hora por segurança</p>
      ${divider()}
      <p style="margin:0;text-align:center;font-size:12px;color:${BRAND.warmGray};font-family:Arial,sans-serif;">Se não foi você, desconsidere este email.</p>
    `, "Solicitação de redefinição de senha"),
  }),

  "subscription-confirmed": (data) => ({
    subject: "Assinatura ativada — Bem-vindo(a) ao Raio-X Mental Premium ✨",
    html: baseLayout(`
      <div style="text-align:center;margin:0 0 24px;">
        ${goldTag("PREMIUM ATIVADO")}
      </div>
      ${heading(`${data.name ? `${data.name}, ` : ""}seu acesso Premium está ativo.`)}
      ${paragraph("Parabéns por investir no seu autoconhecimento profundo. Agora você tem acesso a todo o arsenal de diagnóstico do Raio-X Mental.")}
      ${infoBox(`
        ${infoRow("Plano", data.planName || "Premium")}
        ${infoRow("Valor", `R$ ${data.value || "—"}`)}
        ${infoRow("Próxima cobrança", data.nextDueDate || "—")}
      `, BRAND.gold)}
      ${divider()}
      ${heading("Seus recursos desbloqueados:")}
      <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
        <tr><td style="padding:10px 0;border-bottom:1px solid ${BRAND.border};">
          <p style="margin:0;font-size:14px;color:${BRAND.text};font-family:Arial,sans-serif;">🧬 Diagnósticos ilimitados em todos os módulos</p>
        </td></tr>
        <tr><td style="padding:10px 0;border-bottom:1px solid ${BRAND.border};">
          <p style="margin:0;font-size:14px;color:${BRAND.text};font-family:Arial,sans-serif;">🤖 Relatórios com análise IA avançada</p>
        </td></tr>
        <tr><td style="padding:10px 0;border-bottom:1px solid ${BRAND.border};">
          <p style="margin:0;font-size:14px;color:${BRAND.text};font-family:Arial,sans-serif;">📊 Perfil Central com mapa evolutivo</p>
        </td></tr>
        <tr><td style="padding:10px 0;">
          <p style="margin:0;font-size:14px;color:${BRAND.text};font-family:Arial,sans-serif;">🔄 Ciclos de reteste com comparação temporal</p>
        </td></tr>
      </table>
      ${btn(data.appUrl || "https://raio-x-comportamental.lovable.app", "Explorar Recursos Premium", true)}
    `, "Sua assinatura Premium foi ativada com sucesso"),
  }),

  "subscription-canceled": (data) => ({
    subject: "Sua assinatura Premium foi cancelada — Raio-X Mental",
    html: baseLayout(`
      ${heading(`${data.name ? `${data.name}, ` : ""}sua assinatura foi cancelada.`)}
      ${paragraph(`Confirmamos o cancelamento do seu plano <strong>${data.planName || "Premium"}</strong>.`)}
      ${infoBox(`
        ${infoRow("Plano cancelado", data.planName || "Premium")}
        ${infoRow("Acesso Premium até", data.accessUntil || "fim do período atual")}
      `)}
      ${paragraph("Você ainda pode utilizar todos os recursos premium até o fim do período vigente. Após isso, sua conta retornará ao plano gratuito.")}
      ${paragraph("Se mudar de ideia, você pode reativar a qualquer momento e continuar de onde parou.")}
      ${btn(data.appUrl || "https://raio-x-comportamental.lovable.app/premium", "Reativar Minha Assinatura")}
      ${divider()}
      <p style="margin:0;text-align:center;font-size:13px;color:${BRAND.warmGray};font-style:italic;font-family:Georgia,serif;">"Os padrões que você descobriu continuam válidos. Volte quando quiser."</p>
    `, "Sua assinatura Premium foi cancelada"),
  }),

  "payment-overdue": (data) => ({
    subject: "⚠️ Pagamento pendente — Raio-X Mental",
    html: baseLayout(`
      ${heading("Pagamento pendente")}
      ${paragraph(`Identificamos que o pagamento da sua assinatura <strong>${data.planName || "Premium"}</strong> está em atraso.`)}
      ${infoBox(`
        ${infoRow("Plano", data.planName || "Premium")}
        ${infoRow("Valor", `R$ ${data.value || "—"}`)}
        ${infoRow("Vencimento", data.dueDate || "—")}
      `, "#D97706")}
      ${paragraph("Para manter seu acesso Premium e continuar com diagnósticos ilimitados, regularize o pagamento o mais breve possível.")}
      ${btn(data.paymentUrl || "https://raio-x-comportamental.lovable.app/premium", "Regularizar Agora")}
      ${divider()}
      <p style="margin:0;text-align:center;font-size:12px;color:${BRAND.warmGray};font-family:Arial,sans-serif;">Em caso de dúvidas, entre em contato pelo suporte da plataforma.</p>
    `, "Seu pagamento está pendente — regularize para manter o acesso"),
  }),

  "report-ready": (data) => ({
    subject: "📄 Seu relatório foi gerado — Raio-X Mental",
    html: baseLayout(`
      <div style="text-align:center;margin:0 0 24px;">
        ${goldTag("RELATÓRIO PRONTO")}
      </div>
      ${heading(`${data.name ? `${data.name}, ` : ""}seu relatório está pronto.`)}
      ${paragraph(`O relatório <strong>"${data.reportName || "Perfil Central"}"</strong> foi processado pela nossa inteligência artificial e já está disponível para consulta.`)}
      ${paragraph("Acesse agora para explorar seus padrões comportamentais, pontos de atenção, áreas de desbloqueio e direcionamentos personalizados.")}
      ${btn(data.reportUrl || "https://raio-x-comportamental.lovable.app/central-report", "Ver Meu Relatório")}
      ${divider()}
      <p style="margin:0;text-align:center;font-size:13px;color:${BRAND.warmGray};font-style:italic;font-family:Georgia,serif;">"Conhecer seus padrões é o primeiro passo para transcendê-los."</p>
    `, "Seu relatório de diagnóstico comportamental está pronto"),
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
