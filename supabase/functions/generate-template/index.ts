import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { testName, testDescription, prompts, questions, existingSections } = await req.json();

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

    // Build context blocks
    let promptsBlock = "";
    if (Array.isArray(prompts) && prompts.length > 0) {
      promptsBlock = `\n\nPROMPTS CONFIGURADOS PARA ESTE TESTE:\n${prompts.slice(0, 10).map((p: any) => `[${p.prompt_type?.toUpperCase()}]: ${(p.content || '').slice(0, 500)}`).join("\n\n")}`;
    }

    let questionsBlock = "";
    if (Array.isArray(questions) && questions.length > 0) {
      const axes = new Set<string>();
      questions.forEach((q: any) => {
        if (Array.isArray(q.axes)) q.axes.forEach((a: string) => axes.add(a));
      });
      questionsBlock = `\n\nPERGUNTAS DO TESTE (${questions.length} total):\nEixos comportamentais detectados: ${Array.from(axes).join(", ")}\n\nExemplos de perguntas:\n${questions.slice(0, 15).map((q: any) => `- [${q.type}] ${q.text} (eixos: ${(q.axes || []).join(", ")})`).join("\n")}`;
    }

    let existingBlock = "";
    if (Array.isArray(existingSections) && existingSections.length > 0) {
      existingBlock = `\n\nTEMPLATE ATUAL (use como referência, melhore se necessário):\n${existingSections.map((s: any) => `- ${s.key}: "${s.label}" (max ${s.maxSentences} frases, ${s.required ? "obrigatório" : "opcional"})`).join("\n")}`;
    }

    const systemPrompt = `Você é um especialista em relatórios comportamentais. Gere a estrutura ideal de seções para um relatório de diagnóstico comportamental.

REGRAS:
1. Cada seção deve ter um propósito CLARO e ÚNICO
2. A ordem das seções deve criar uma narrativa: do diagnóstico → explicação → ação
3. Siga a regra de COMPLETUDE: Diagnóstico + Explicação + Ação prática
4. Seções devem ser ESPECÍFICAS ao tipo de teste, não genéricas
5. Use nomes de seções CURTOS e diretos (máx 5 palavras)
6. A key deve ser camelCase, descritiva e única
7. maxSentences: 1 para listas/itens, 2 para explicações, 3 para análises profundas
8. Seções essenciais devem ser "required: true"
9. Inclua sempre uma seção de AÇÃO PRÁTICA no final
10. O template deve permitir que o motor de IA gere conteúdo ESPECÍFICO e MENSURÁVEL

ESTRUTURA NARRATIVA OBRIGATÓRIA:
- Abertura: O que está acontecendo (diagnóstico direto)
- Desenvolvimento: Por que isso acontece (padrão neural/comportamental)
- Evidência: Como aparece no dia a dia
- Gatilhos: O que ativa o padrão
- Impacto: Onde isso afeta a vida
- Direção: O que fazer (ação executável)
- Restrição: O que NÃO fazer
- Comando: Frase de reprogramação + ação imediata${promptsBlock}${questionsBlock}${existingBlock}

FORMATO DE SAÍDA (JSON array):
Cada item:
- key: string (camelCase, único)
- label: string (nome da seção, curto)
- maxSentences: number (1-4)
- required: boolean`;

    const userPrompt = `Gere o template de relatório ideal para:

TESTE: ${testName}
${testDescription ? `OBJETIVO: ${testDescription}` : ""}

Retorne APENAS um JSON array. Sem texto adicional.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: [globalSystemPrompt, systemPrompt].filter(Boolean).join("\n\n") },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.5,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições excedido." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos de IA esgotados." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      console.error("AI gateway error:", response.status);
      return new Response(JSON.stringify({ error: "Erro ao gerar template" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const aiData = await response.json();
    const rawContent = aiData.choices?.[0]?.message?.content || "";

    let jsonStr = rawContent;
    const match = rawContent.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (match) jsonStr = match[1];
    jsonStr = jsonStr.trim();

    let parsedSections;
    try {
      parsedSections = JSON.parse(jsonStr);
    } catch {
      console.error("Failed to parse AI template:", rawContent.slice(0, 500));
      return new Response(JSON.stringify({ error: "Erro ao processar resposta da IA" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (!Array.isArray(parsedSections) || parsedSections.length === 0) {
      return new Response(JSON.stringify({ error: "Formato de resposta inválido" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Normalize
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
