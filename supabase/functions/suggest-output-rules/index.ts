import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { moduleName, moduleSlug, moduleDescription } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const systemPrompt = `Você configura regras de saída para relatórios diagnósticos comportamentais.
Cada módulo tem foco temático único, então tom e linguagem proibida devem ser específicos.
Tom NUNCA é genérico — adapte ao tema (ex: Dinheiro = "direto e prático sem moralismo financeiro"; Emoções = "acolhedor e validante sem psicobabble"; Relacionamentos = "honesto sem culpabilizar").
Linguagem proibida: termos clichês, jargão psicológico vazio, e frases típicas do TEMA específico (ex: módulo Dinheiro proíbe "abundância", "mentalidade próspera"; módulo Emoções proíbe "abrace suas dores", "cure seu interior").`;

    const userPrompt = `Módulo: ${moduleName}
Slug: ${moduleSlug}
Descrição: ${moduleDescription || 'sem descrição'}

Gere as regras de saída específicas para este módulo.`;

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
        tools: [{
          type: "function",
          function: {
            name: "set_output_rules",
            description: "Define output rules for the module",
            parameters: {
              type: "object",
              properties: {
                tone: { type: "string", description: "Tom específico ao módulo, ex: 'direto e prático sem moralismo'" },
                simplicityLevel: { type: "number", enum: [1, 2, 3, 4, 5], description: "1=técnico, 5=ultra-simples" },
                maxSentencesPerBlock: { type: "number", enum: [1, 2, 3], description: "Máximo de frases por bloco" },
                maxTotalBlocks: { type: "number", description: "Total de blocos do relatório (5-12)" },
                forbiddenLanguage: {
                  type: "array",
                  items: { type: "string" },
                  description: "8-12 termos/frases proibidos ESPECÍFICOS ao tema do módulo. Inclua clichês do nicho.",
                },
              },
              required: ["tone", "simplicityLevel", "maxSentencesPerBlock", "maxTotalBlocks", "forbiddenLanguage"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "set_output_rules" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) return new Response(JSON.stringify({ error: "Limite de requisições. Tente novamente em instantes." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (response.status === 402) return new Response(JSON.stringify({ error: "Créditos esgotados. Adicione fundos no workspace." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "Falha na IA" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("Sem tool_call na resposta");
    const args = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify(args), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("suggest-output-rules error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
