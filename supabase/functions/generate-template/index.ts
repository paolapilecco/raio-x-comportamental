import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { testName, testDescription, prompts, questions, existingSections, format } = await req.json();

    if (!testName || typeof testName !== "string" || testName.length > 200) {
      return new Response(JSON.stringify({ error: "Nome do teste inválido" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    // Fetch global system_prompt
    let globalSystemPrompt = "";
    try {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2.49.1");
      const adminClient = createClient(supabaseUrl, serviceKey);
      const { data: gConfig } = await adminClient.from("global_ai_config").select("system_prompt").limit(1).maybeSingle();
      if (gConfig?.system_prompt) globalSystemPrompt = gConfig.system_prompt;
    } catch { /* use empty */ }

    // ── Context blocks ──
    let promptsBlock = "";
    if (Array.isArray(prompts) && prompts.length > 0) {
      promptsBlock = `\n\nPROMPTS CONFIGURADOS:\n${prompts.slice(0, 10).map((p: any) => `[${p.prompt_type?.toUpperCase()}]: ${(p.content || '').slice(0, 400)}`).join("\n\n")}`;
    }

    const axesSet = new Set<string>();
    if (Array.isArray(questions)) {
      questions.forEach((q: any) => Array.isArray(q.axes) && q.axes.forEach((a: string) => axesSet.add(a)));
    }
    const axesList = Array.from(axesSet);
    const questionsBlock = questions?.length
      ? `\n\nPERGUNTAS (${questions.length} total)\nEixos: ${axesList.join(", ")}\nExemplos:\n${questions.slice(0, 12).map((q: any) => `- ${q.text} (${(q.axes || []).join(", ")})`).join("\n")}`
      : "";

    const slotsBlock = Array.isArray(existingSections) && existingSections.length > 0
      ? existingSections.map((s: any) => `- ${s.key} | ${s.label} | formato:${s.format} | máx ${s.maxSentences} frases`).join("\n")
      : "";

    // ═══════════════════════════════════════════════════════════════
    // STORYBOARD MODE — personaliza cada slot com base no módulo
    // ═══════════════════════════════════════════════════════════════
    if (format === "storyboard") {
      const systemPrompt = `Você é um diretor editorial de relatórios comportamentais premium. Sua missão é PERSONALIZAR um storyboard de 3 atos (Espelho → Confronto → Direção) para um teste específico.

CONTEXTO DO TESTE:
Nome: ${testName}
Descrição: ${testDescription || "—"}
Eixos avaliados: ${axesList.join(", ") || "não informado"}${promptsBlock}${questionsBlock}

SLOTS EXISTENTES NO STORYBOARD (preserve as keys exatamente):
${slotsBlock}

REGRAS:
1. Cada slot deve ter instrução ESPECÍFICA ao tema deste teste — NUNCA genérica.
   - Ex: para "Padrão Comportamental" cite ciclos auto-sabotagem/perfeccionismo; para "Emoções" cite reatividade/regulação; para "Relacionamentos" cite vínculos/repetições afetivas.
2. Cada slot precisa de UM exemplo curto (máx 2 frases) escrito no tom do teste, mostrando o output ideal.
3. Cada ato precisa de um TOM próprio adaptado ao teste (ex: Confronto de Emoções é mais visceral; Confronto de Execução é mais estratégico).
4. Liste 5-8 termos proibidos que soariam mal NESTE teste (autoajuda, clichês, psicobabble do tema).
5. Defina narrativeVoice em 1 frase específica do teste.
6. Linguagem: direta, sem psicologuês, sem motivacional. Máx 3 frases por bloco.

FORMATO DE SAÍDA (JSON ESTRITO, sem markdown, sem texto extra):
{
  "actTones": {
    "espelho": "tom específico para o ato 1 deste teste",
    "confronto": "tom específico para o ato 2 deste teste",
    "direcao": "tom específico para o ato 3 deste teste"
  },
  "slots": [
    { "key": "leituraRapida", "instruction": "...", "example": "..." },
    ...todas as keys listadas acima
  ],
  "rules": {
    "narrativeVoice": "1 frase específica do tema do teste",
    "forbiddenTerms": ["termo1", "termo2", ...]
  }
}`;

      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-2.5-pro",
          messages: [
            { role: "system", content: [globalSystemPrompt, systemPrompt].filter(Boolean).join("\n\n") },
            { role: "user", content: `Personalize o storyboard para "${testName}". Retorne APENAS o JSON.` },
          ],
          temperature: 0.6,
          response_format: { type: "json_object" },
        }),
      });

      if (!response.ok) {
        if (response.status === 429) return new Response(JSON.stringify({ error: "Limite de requisições excedido." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        if (response.status === 402) return new Response(JSON.stringify({ error: "Créditos de IA esgotados." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        console.error("AI gateway error:", response.status);
        return new Response(JSON.stringify({ error: "Erro ao gerar template" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const aiData = await response.json();
      let raw = aiData.choices?.[0]?.message?.content || "";
      const m = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (m) raw = m[1];
      raw = raw.trim();

      let parsed: any;
      try { parsed = JSON.parse(raw); } catch {
        console.error("Failed to parse storyboard JSON:", raw.slice(0, 400));
        return new Response(JSON.stringify({ error: "Erro ao processar resposta da IA" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const slotsOut = Array.isArray(parsed.slots)
        ? parsed.slots
            .filter((s: any) => s && typeof s.key === "string")
            .map((s: any) => ({
              key: s.key.trim(),
              instruction: String(s.instruction || "").slice(0, 800),
              example: String(s.example || "").slice(0, 600),
            }))
        : [];

      const actTones = parsed.actTones && typeof parsed.actTones === "object" ? {
        espelho: String(parsed.actTones.espelho || "").slice(0, 300),
        confronto: String(parsed.actTones.confronto || "").slice(0, 300),
        direcao: String(parsed.actTones.direcao || "").slice(0, 300),
      } : null;

      const rules = parsed.rules && typeof parsed.rules === "object" ? {
        narrativeVoice: String(parsed.rules.narrativeVoice || "").slice(0, 400),
        forbiddenTerms: Array.isArray(parsed.rules.forbiddenTerms)
          ? parsed.rules.forbiddenTerms.map((t: any) => String(t)).filter(Boolean).slice(0, 12)
          : [],
      } : null;

      return new Response(JSON.stringify({ format: "storyboard", slots: slotsOut, actTones, rules }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ═══════════════════════════════════════════════════════════════
    // LEGACY MODE (flat array) — mantido para retrocompatibilidade
    // ═══════════════════════════════════════════════════════════════
    const systemPrompt = `Você é um especialista em relatórios comportamentais. Gere a estrutura ideal de seções para um relatório.

REGRAS:
1. Cada seção tem propósito ÚNICO
2. Ordem narrativa: diagnóstico → explicação → ação
3. Específico ao teste, nunca genérico
4. Nomes curtos (máx 5 palavras), key camelCase
5. maxSentences: 1-3${promptsBlock}${questionsBlock}

FORMATO: JSON array de { key, label, maxSentences, required }`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          { role: "system", content: [globalSystemPrompt, systemPrompt].filter(Boolean).join("\n\n") },
          { role: "user", content: `Gere o template para: ${testName}. ${testDescription ? `Objetivo: ${testDescription}.` : ""} Retorne APENAS um JSON array.` },
        ],
        temperature: 0.5,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) return new Response(JSON.stringify({ error: "Limite de requisições excedido." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (response.status === 402) return new Response(JSON.stringify({ error: "Créditos de IA esgotados." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      return new Response(JSON.stringify({ error: "Erro ao gerar template" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const aiData = await response.json();
    let raw = aiData.choices?.[0]?.message?.content || "";
    const m = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (m) raw = m[1];
    raw = raw.trim();

    let parsedSections: any;
    try { parsedSections = JSON.parse(raw); } catch {
      return new Response(JSON.stringify({ error: "Erro ao processar resposta da IA" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (!Array.isArray(parsedSections)) {
      return new Response(JSON.stringify({ error: "Formato inválido" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const normalized = parsedSections
      .filter((s: any) => s && typeof s.key === "string" && typeof s.label === "string")
      .map((s: any, i: number) => ({
        key: s.key.trim().replace(/[^a-zA-Z0-9_]/g, ""),
        label: s.label.trim().slice(0, 60),
        maxSentences: Math.max(1, Math.min(5, Number(s.maxSentences) || 2)),
        required: s.required !== false,
        order: i + 1,
      }));

    return new Response(JSON.stringify({ sections: normalized }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-template error:", e);
    return new Response(JSON.stringify({ error: "Erro interno ao gerar template" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
