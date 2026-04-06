import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { questionText, testName } = await req.json();

    if (!questionText || typeof questionText !== "string" || questionText.trim().length < 5 || questionText.length > 500) {
      return new Response(JSON.stringify({ error: "Texto da pergunta inválido (mínimo 5 caracteres)" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (testName && (typeof testName !== "string" || testName.length > 200)) {
      return new Response(JSON.stringify({ error: "Nome do diagnóstico inválido" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const systemPrompt = `Você é um especialista em psicometria comportamental. Analise o texto de uma pergunta/afirmação e sugira a configuração ideal.

CRITÉRIOS DE CLASSIFICAÇÃO:
- LIKERT: percepções, crenças, sentimentos internos. Usa afirmações (sem interrogação). Ex: "Eu me sinto inseguro ao tomar decisões"
- FREQUENCY: comportamentos observáveis e repetitivos. Ex: "Com que frequência você adia tarefas?"  
- BEHAVIOR_CHOICE: cenários reais com múltiplas reações possíveis. Ex: "Quando alguém critica seu trabalho, você..."

REGRAS:
1. Identifique se o texto é sobre percepção/crença (likert), comportamento repetitivo (frequency) ou cenário (behavior_choice)
2. Sugira 1-2 eixos comportamentais específicos e relevantes (snake_case, em inglês)
3. Sugira peso de 0.5 a 2.0 baseado na relevância diagnóstica
4. Para behavior_choice, crie 4 opções de resposta realistas e progressivas
5. Sugira option_scores compatíveis com o tipo
6. Adicione uma justificativa curta (1 frase) para cada sugestão`;

    const userPrompt = `Analise esta pergunta${testName ? ` do diagnóstico "${testName}"` : ""}:

"${questionText.trim()}"

Retorne APENAS um JSON com:
{
  "type": "likert" | "frequency" | "behavior_choice",
  "axes": ["eixo1", "eixo2"],
  "weight": 1.0,
  "options": ["opção1", "opção2", ...],
  "option_scores": [0, 25, 50, 75, 100],
  "reasoning": {
    "type_reason": "por que este tipo",
    "axes_reason": "por que estes eixos",
    "weight_reason": "por que este peso"
  }
}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns minutos." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos de IA esgotados." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      console.error("AI gateway error:", response.status);
      return new Response(JSON.stringify({ error: "Erro ao gerar sugestão" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await response.json();
    const rawContent = aiData.choices?.[0]?.message?.content || "";

    let jsonStr = rawContent;
    const match = rawContent.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (match) jsonStr = match[1];
    jsonStr = jsonStr.trim();

    let suggestion;
    try {
      suggestion = JSON.parse(jsonStr);
    } catch {
      console.error("Failed to parse AI suggestion:", rawContent.slice(0, 500));
      return new Response(JSON.stringify({ error: "Erro ao processar sugestão da IA" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const validTypes = ["likert", "behavior_choice", "frequency"];
    const defaultOpts: Record<string, string[]> = {
      likert: ["Discordo totalmente", "Discordo", "Neutro", "Concordo", "Concordo totalmente"],
      frequency: ["Nunca", "Raramente", "Às vezes", "Frequentemente", "Sempre"],
    };
    const defaultScores: Record<string, number[]> = {
      likert: [0, 25, 50, 75, 100],
      frequency: [0, 25, 50, 75, 100],
      behavior_choice: [0, 33, 66, 100],
    };

    const type = validTypes.includes(suggestion.type) ? suggestion.type : "likert";
    const axes = Array.isArray(suggestion.axes)
      ? suggestion.axes.filter((a: any) => typeof a === "string" && a.trim()).slice(0, 3)
      : ["geral"];
    const options = Array.isArray(suggestion.options) && suggestion.options.length >= 2
      ? suggestion.options.map(String)
      : defaultOpts[type] || defaultOpts.likert;
    const optionScores = Array.isArray(suggestion.option_scores) && suggestion.option_scores.length === options.length
      ? suggestion.option_scores.map((s: any) => Math.max(0, Math.min(100, Number(s) || 0)))
      : defaultScores[type] || defaultScores.likert;

    const normalized = {
      type,
      axes: axes.length > 0 ? axes : ["geral"],
      weight: typeof suggestion.weight === "number" ? Math.max(0.5, Math.min(2, suggestion.weight)) : 1,
      options,
      option_scores: optionScores,
      reasoning: suggestion.reasoning || {},
    };

    return new Response(JSON.stringify({ suggestion: normalized }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("suggest-question-config error:", e);
    return new Response(JSON.stringify({ error: "Erro interno ao gerar sugestão" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
