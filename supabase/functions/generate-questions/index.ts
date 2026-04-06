import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { testName, testDescription, questionCount = 10, promptsContext, existingQuestionsFromOtherTests } = await req.json();

    if (!testName || typeof testName !== "string" || testName.length > 200) {
      return new Response(JSON.stringify({ error: "Nome do diagnóstico inválido" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (!testDescription || typeof testDescription !== "string" || testDescription.length > 1000) {
      return new Response(JSON.stringify({ error: "Descrição do diagnóstico inválida" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const count = Math.min(Math.max(Number(questionCount) || 10, 3), 30);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    // Build prompt context from test prompts
    let promptContextBlock = "";
    if (promptsContext && typeof promptsContext === "string" && promptsContext.length > 0) {
      promptContextBlock = `\n\nCONTEXTO DOS PROMPTS DO DIAGNÓSTICO (use como referência obrigatória para gerar perguntas coerentes):\n${promptsContext.slice(0, 3000)}`;
    }

    // Build deduplication block
    let deduplicationBlock = "";
    if (Array.isArray(existingQuestionsFromOtherTests) && existingQuestionsFromOtherTests.length > 0) {
      const existing = existingQuestionsFromOtherTests.slice(0, 100).map((q: string) => `- ${q}`).join("\n");
      deduplicationBlock = `\n\nPERGUNTAS JÁ EXISTENTES EM OUTROS DIAGNÓSTICOS (NÃO REPITA nenhuma dessas, nem reformule de forma similar):\n${existing}`;
    }

    const systemPrompt = `Você é um especialista em psicometria e análise comportamental. Gere perguntas estruturadas para diagnósticos comportamentais.

REGRAS OBRIGATÓRIAS:
1. LIKERT: sempre usar AFIRMAÇÕES (nunca interrogação). Ex: "Eu começo tarefas mas não termino"
2. FREQUÊNCIA: usar perguntas com escala temporal. Ex: "Com que frequência você adia decisões importantes?"
3. ESCOLHA COMPORTAMENTAL: cenários reais com 4 opções específicas de comportamento
4. NUNCA use perguntas abertas (por que, como, o que, explique)
5. NUNCA use linguagem genérica (melhorar, equilíbrio, zona de conforto, ser feliz)
6. Cada pergunta deve ser específica e mensurável
7. Priorize o formato LIKERT (60-70% das perguntas)
8. Use FREQUÊNCIA para comportamentos repetitivos (20-30%)
9. Use ESCOLHA COMPORTAMENTAL com moderação (10-20%)
10. Os eixos devem ser específicos ao tema do diagnóstico, nunca genéricos
11. CADA PERGUNTA DEVE SER ÚNICA — não repita conceitos, reformulações ou variações de perguntas já existentes
12. As perguntas devem ser COERENTES com os prompts e metodologia do diagnóstico${promptContextBlock}${deduplicationBlock}

CAMADA DE PROFUNDIDADE:
- Cruze padrões entre os eixos comportamentais
- Identifique contradições que podem surgir nas respostas
- Aponte a causa real por trás do comportamento
- Evite respostas genéricas — cada pergunta deve revelar algo específico

FORMATO DE SAÍDA (JSON array):
Cada item deve ter:
- text: texto da pergunta/afirmação
- type: "likert" | "frequency" | "behavior_choice"
- axes: array de 1-2 eixos comportamentais específicos do diagnóstico
- weight: número 0.5-2.0 (1 = padrão)
- options: array de opções de resposta (usar padrão para likert/frequency, personalizar para behavior_choice)
- option_scores: array de pontuações numéricas (0-100)`;

    const userPrompt = `Gere ${count} perguntas para o seguinte diagnóstico:

NOME: ${testName}
OBJETIVO: ${testDescription}

Retorne APENAS um JSON array com as perguntas estruturadas. Sem texto adicional.`;

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
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns minutos." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos de IA esgotados." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      console.error("AI gateway error:", response.status);
      return new Response(JSON.stringify({ error: "Erro ao gerar perguntas" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const aiData = await response.json();
    const rawContent = aiData.choices?.[0]?.message?.content || "";

    // Extract JSON from response (handle markdown code blocks)
    let jsonStr = rawContent;
    const match = rawContent.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (match) jsonStr = match[1];
    jsonStr = jsonStr.trim();

    let questions;
    try {
      questions = JSON.parse(jsonStr);
    } catch {
      console.error("Failed to parse AI response:", rawContent.slice(0, 500));
      return new Response(JSON.stringify({ error: "Erro ao processar resposta da IA" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (!Array.isArray(questions)) {
      return new Response(JSON.stringify({ error: "Formato de resposta inválido" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Validate and normalize each question
    const defaultOpts: Record<string, string[]> = {
      likert: ["Discordo totalmente", "Discordo", "Neutro", "Concordo", "Concordo totalmente"],
      frequency: ["Nunca", "Raramente", "Às vezes", "Frequentemente", "Sempre"],
      behavior_choice: [],
    };
    const defaultScores: Record<string, number[]> = {
      likert: [0, 25, 50, 75, 100],
      frequency: [0, 25, 50, 75, 100],
      behavior_choice: [0, 33, 66, 100],
    };

    const validTypes = ["likert", "behavior_choice", "frequency"];
    const normalized = questions
      .filter((q: any) => q && typeof q.text === "string" && q.text.trim())
      .map((q: any, i: number) => {
        const type = validTypes.includes(q.type) ? q.type : "likert";
        const axes = Array.isArray(q.axes) ? q.axes.filter((a: any) => typeof a === "string" && a.trim()).slice(0, 3) : ["geral"];
        const options = Array.isArray(q.options) && q.options.length >= 2 ? q.options.map(String) : defaultOpts[type] || defaultOpts.likert;
        const scores = Array.isArray(q.option_scores) && q.option_scores.length === options.length
          ? q.option_scores.map((s: any) => Math.max(0, Math.min(100, Number(s) || 0)))
          : defaultScores[type] || defaultScores.likert;

        return {
          text: q.text.trim(),
          type,
          axes: axes.length > 0 ? axes : ["geral"],
          weight: typeof q.weight === "number" ? Math.max(0.5, Math.min(2, q.weight)) : 1,
          sort_order: i + 1,
          options,
          option_scores: scores,
        };
      });

    return new Response(JSON.stringify({ questions: normalized }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-questions error:", e);
    return new Response(JSON.stringify({ error: "Erro interno ao gerar perguntas" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
