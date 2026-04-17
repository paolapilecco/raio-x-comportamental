import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { testModuleId } = await req.json();
    if (!testModuleId) throw new Error("testModuleId required");

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const authHeader = req.headers.get("Authorization");
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader || "" } },
    });

    // Read full pipeline context for this module
    const [moduleRes, promptsRes, patternsRes, templateRes, existingQs] = await Promise.all([
      supabase.from("test_modules").select("name, slug, description, category").eq("id", testModuleId).single(),
      supabase.from("test_prompts").select("prompt_type, content").eq("test_id", testModuleId).eq("is_active", true),
      supabase.from("pattern_definitions").select("pattern_key, label, description, core_pain, mechanism").eq("test_module_id", testModuleId),
      supabase.from("report_templates").select("output_rules, sections").eq("test_id", testModuleId).maybeSingle(),
      supabase.from("questions").select("text, axes").eq("test_id", testModuleId).limit(20),
    ]);

    const mod = moduleRes.data;
    if (!mod) throw new Error("module not found");

    const promptsContext = (promptsRes.data || [])
      .map(p => `[${p.prompt_type?.toUpperCase()}]\n${(p.content || "").slice(0, 1200)}`)
      .join("\n\n");

    const patternsContext = (patternsRes.data || [])
      .map(p => `• ${p.label} (${p.pattern_key}): ${p.description?.slice(0, 200) || ""} | dor: ${p.core_pain?.slice(0, 150) || "—"}`)
      .join("\n");

    const outputRules = templateRes.data?.output_rules
      ? JSON.stringify(templateRes.data.output_rules).slice(0, 800)
      : "—";

    const existingSample = (existingQs.data || []).slice(0, 8).map(q => `- ${q.text}`).join("\n");

    const systemPrompt = `Você é um especialista em construção de testes psicométricos diagnósticos. Sua tarefa é gerar INSTRUÇÕES ADICIONAIS curtas e cirúrgicas para a IA que vai gerar perguntas e opções de resposta para este módulo específico.

As instruções devem:
1. Apontar foco temático único do módulo (não genérico)
2. Especificar tipos de comportamento a investigar (ações observáveis, não emoções vagas)
3. Indicar armadilhas a evitar (clichês do tema, perguntas óbvias, redundância com perguntas existentes)
4. Sugerir contextos situacionais relevantes ao tema
5. Definir tom das opções de resposta (ex: comportamentais concretas vs abstratas)

Retorne APENAS o texto das instruções, em português, máximo 6 linhas, direto ao ponto, sem cabeçalhos.`;

    const userPrompt = `MÓDULO: ${mod.name} (${mod.slug})
CATEGORIA: ${mod.category}
DESCRIÇÃO: ${mod.description}

═══ PIPELINE DE PROMPTS ATIVOS ═══
${promptsContext || "(nenhum prompt ativo)"}

═══ PADRÕES DIAGNÓSTICOS ═══
${patternsContext || "(nenhum padrão definido)"}

═══ REGRAS DE SAÍDA DO RELATÓRIO ═══
${outputRules}

═══ AMOSTRA DE PERGUNTAS EXISTENTES ═══
${existingSample || "(nenhuma)"}

Gere as instruções adicionais ideais para guiar a geração das próximas perguntas deste módulo.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) return new Response(JSON.stringify({ error: "Limite de requisições. Tente novamente em instantes." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (response.status === 402) return new Response(JSON.stringify({ error: "Créditos esgotados." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "Falha na IA" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const data = await response.json();
    const instructions = data.choices?.[0]?.message?.content?.trim() || "";

    return new Response(JSON.stringify({ instructions, contextUsed: { prompts: promptsRes.data?.length || 0, patterns: patternsRes.data?.length || 0, hasTemplate: !!templateRes.data } }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("suggest-question-instructions error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
