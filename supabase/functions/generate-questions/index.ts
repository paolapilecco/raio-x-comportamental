import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MIN_PER_AXIS = 3;

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

function normalizeQuestions(raw: any[], startIndex = 0) {
  return (raw || [])
    .filter((q: any) => q && typeof q.text === "string" && q.text.trim())
    .map((q: any, i: number) => {
      const type = validTypes.includes(q.type) ? q.type : "likert";
      const axes = Array.isArray(q.axes) ? q.axes.filter((a: any) => typeof a === "string" && a.trim()).slice(0, 3) : ["geral"];
      const isReverse = q.reverse === true;
      const options = Array.isArray(q.options) && q.options.length >= 2 ? q.options.map(String) : defaultOpts[type] || defaultOpts.likert;

      let scores: number[];
      if (Array.isArray(q.option_scores) && q.option_scores.length === options.length) {
        scores = q.option_scores.map((s: any) => Math.max(0, Math.min(100, Number(s) || 0)));
      } else {
        scores = [...(defaultScores[type] || defaultScores.likert)];
      }
      if (isReverse && scores.length > 0) scores = scores.map(s => 100 - s);

      return {
        text: q.text.trim(),
        type,
        axes: axes.length > 0 ? axes : ["geral"],
        weight: typeof q.weight === "number" ? Math.max(0.5, Math.min(2, q.weight)) : 1,
        sort_order: startIndex + i + 1,
        options,
        option_scores: scores,
        reverse: isReverse,
        reasoning: typeof q.reasoning === "string" ? q.reasoning.trim() : undefined,
      };
    });
}

async function callAIForQuestions(params: {
  apiKey: string;
  systemPrompt: string;
  userPrompt: string;
  timeoutMs?: number;
}): Promise<any[]> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), params.timeoutMs ?? 60000);

  let response: Response;
  try {
    response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${params.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: params.systemPrompt },
          { role: "user", content: params.userPrompt },
        ],
        temperature: 0.6,
      }),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    const errBody = await response.text().catch(() => "");
    throw new Error(`AI gateway ${response.status}: ${errBody.slice(0, 200)}`);
  }

  const aiData = await response.json();
  const rawContent = aiData.choices?.[0]?.message?.content || "";
  let jsonStr = rawContent;
  const match = rawContent.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (match) jsonStr = match[1];
  jsonStr = jsonStr.trim();

  return JSON.parse(jsonStr);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const {
      testName, testDescription, questionCount = 10,
      promptsContext, existingQuestionsFromOtherTests,
      existingQuestionsFromThisTest, existingAxes,
      testModuleId, extraInstructions,
    } = await req.json();

    if (!testName || typeof testName !== "string" || testName.length > 200) {
      return new Response(JSON.stringify({ error: "Nome do diagnóstico inválido" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (!testDescription || typeof testDescription !== "string" || testDescription.length > 1000) {
      return new Response(JSON.stringify({ error: "Descrição do diagnóstico inválida" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const count = Math.min(Math.max(Number(questionCount) || 10, 3), 50);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    // Fetch global system_prompt
    let globalSystemPrompt = "";
    if (testModuleId) {
      try {
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const tmpClient = createClient(supabaseUrl, supabaseKey);
        const { data: gConfig } = await tmpClient.from("global_ai_config").select("system_prompt").limit(1).maybeSingle();
        if (gConfig?.system_prompt) globalSystemPrompt = gConfig.system_prompt;
      } catch { /* use empty */ }
    }

    // ── STEP 1: Fetch full test context from DB ──
    let reportTemplateSections = "";
    let outputRules = "";
    let patternDefinitionsContext = "";

    if (testModuleId) {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const supabase = createClient(supabaseUrl, supabaseKey);

      const [templateRes, patternRes] = await Promise.all([
        supabase.from("report_templates").select("sections, output_rules").eq("test_id", testModuleId).maybeSingle(),
        supabase.from("pattern_definitions").select("pattern_key, label, description, core_pain, key_unlock_area, triggers, mechanism").eq("test_module_id", testModuleId),
      ]);

      if (templateRes.data) {
        const sections = templateRes.data.sections as any;
        if (Array.isArray(sections) && sections.length > 0) {
          reportTemplateSections = sections.map((s: any) => `- ${s.label || s.key}: ${s.description || ""}`).join("\n");
        } else if (sections?.acts && Array.isArray(sections.acts)) {
          reportTemplateSections = sections.acts.map((a: any) => `- ${a.title || a.key}: ${a.description || ""}`).join("\n");
        }
        const rules = templateRes.data.output_rules;
        if (rules && typeof rules === "object") {
          outputRules = JSON.stringify(rules);
        }
      }

      if (patternRes.data && patternRes.data.length > 0) {
        patternDefinitionsContext = patternRes.data.map((p: any) =>
          `PADRÃO "${p.label}" (${p.pattern_key}):\n  Descrição: ${p.description}\n  Dor Central: ${p.core_pain}\n  Mecanismo: ${p.mechanism}\n  Gatilhos: ${(p.triggers || []).join(", ")}\n  Área-chave: ${p.key_unlock_area}`
        ).join("\n\n");
      }
    }

    // ── STEP 2: Detect test category/type ──
    const testNameLower = testName.toLowerCase();
    const testDescLower = testDescription.toLowerCase();

    let testTypeAnalysis = "";
    if (testNameLower.includes("mapa de vida") || testNameLower.includes("life map") || testDescLower.includes("áreas da vida")) {
      testTypeAnalysis = `TIPO DE TESTE DETECTADO: MAPA DE VIDA / EVOLUÇÃO\nEste NÃO é um teste comportamental tradicional. É uma avaliação multidimensional por ÁREAS DA VIDA.`;
    } else if (testDescLower.includes("propósito") || testDescLower.includes("sentido") || testDescLower.includes("purpose")) {
      testTypeAnalysis = `TIPO DE TESTE DETECTADO: PROPÓSITO / SENTIDO DE VIDA`;
    } else if (testDescLower.includes("emocional") || testDescLower.includes("emoção") || testDescLower.includes("regulação")) {
      testTypeAnalysis = `TIPO DE TESTE DETECTADO: REGULAÇÃO EMOCIONAL`;
    } else if (testDescLower.includes("execução") || testDescLower.includes("produtividade") || testDescLower.includes("procrastin")) {
      testTypeAnalysis = `TIPO DE TESTE DETECTADO: EXECUÇÃO / PRODUTIVIDADE`;
    } else if (testDescLower.includes("relacionamento") || testDescLower.includes("relação") || testDescLower.includes("vínculo")) {
      testTypeAnalysis = `TIPO DE TESTE DETECTADO: RELACIONAMENTOS / VÍNCULOS`;
    } else if (testDescLower.includes("dinheiro") || testDescLower.includes("financeir") || testDescLower.includes("money")) {
      testTypeAnalysis = `TIPO DE TESTE DETECTADO: RELAÇÃO COM DINHEIRO`;
    } else {
      testTypeAnalysis = `TIPO DE TESTE: COMPORTAMENTAL GERAL`;
    }

    // ── STEP 3: Build the enriched prompt ──
    const promptContextBlock = promptsContext && typeof promptsContext === "string" && promptsContext.length > 0
      ? `\n\n═══ PROMPTS ATIVOS DO DIAGNÓSTICO ═══\n${promptsContext.slice(0, 4000)}`
      : "";

    const deduplicationBlock = Array.isArray(existingQuestionsFromOtherTests) && existingQuestionsFromOtherTests.length > 0
      ? `\n\n═══ PERGUNTAS DE OUTROS TESTES (NÃO REPITA) ═══\n${existingQuestionsFromOtherTests.slice(0, 100).map((q: string) => `- ${q}`).join("\n")}`
      : "";

    const internalDedupBlock = Array.isArray(existingQuestionsFromThisTest) && existingQuestionsFromThisTest.length > 0
      ? `\n\n═══ PERGUNTAS JÁ EXISTENTES NESTE TESTE (NÃO DUPLIQUE) ═══\n${existingQuestionsFromThisTest.slice(0, 80).map((q: string) => `- ${q}`).join("\n")}`
      : "";

    const templateBlock = reportTemplateSections
      ? `\n\n═══ SEÇÕES DO RELATÓRIO FINAL ═══\n${reportTemplateSections}`
      : "";

    const patternBlock = patternDefinitionsContext
      ? `\n\n═══ PADRÕES COMPORTAMENTAIS DEFINIDOS ═══\n${patternDefinitionsContext}`
      : "";

    const rulesBlock = outputRules
      ? `\n\n═══ REGRAS DE SAÍDA DO RELATÓRIO ═══\n${outputRules}`
      : "";

    // ── DISTRIBUTION PLAN: forçar mínimo por eixo ──
    const axes: string[] = Array.isArray(existingAxes) ? existingAxes.filter((a: any) => typeof a === "string" && a.trim()) : [];
    const numAxes = axes.length;
    let distributionPlan = "";
    let perAxis = 0;
    if (numAxes > 0) {
      perAxis = Math.max(MIN_PER_AXIS, Math.floor(count / numAxes));
      distributionPlan = `\n\n═══ DISTRIBUIÇÃO OBRIGATÓRIA POR EIXO ═══\nEXATAMENTE ${perAxis} perguntas para CADA eixo abaixo (mínimo ${MIN_PER_AXIS} por eixo). NENHUM eixo pode ficar sem cobertura. Distribua TODAS as ${count} perguntas nesses ${numAxes} eixos:\n${axes.map((a: string) => `- ${a} → ${perAxis} perguntas`).join("\n")}\n\nREGRA CRÍTICA: o campo "axes" de cada pergunta DEVE conter pelo menos um dos eixos da lista acima. Use os nomes EXATOS (em snake_case).`;
    }

    const baseSystemPrompt = `Você é um especialista em psicometria, neurociência comportamental e design de instrumentos de avaliação.

═══ ${testTypeAnalysis} ═══

═══ REGRAS DE CONSTRUÇÃO ═══
PRINCÍPIO: Cada pergunta é um SENSOR — captura um dado específico que o motor precisa.

TIPOS:
- LIKERT (60-70%): AFIRMAÇÕES (nunca interrogação).
- FREQUÊNCIA (20-30%): Escala temporal.
- ESCOLHA COMPORTAMENTAL (10-20%): Cenários com 4 opções concretas.

QUALIDADE:
1. Comportamento OBSERVÁVEL e ESPECÍFICO.
2. NUNCA linguagem genérica.
3. NUNCA perguntas abertas.
4. Priorize COMPORTAMENTO sobre OPINIÃO.

INVERTIDAS (20-30% obrigatório): "reverse": true.
CRUZAMENTO DE EIXOS (40% obrigatório): perguntas com 2 eixos.
${promptContextBlock}${templateBlock}${patternBlock}${rulesBlock}${deduplicationBlock}${internalDedupBlock}${distributionPlan}

═══ FORMATO DE SAÍDA (JSON array) ═══
- text, type, axes, weight (0.5-2.0), options, option_scores, reverse, reasoning`;

    const extraBlock = extraInstructions && typeof extraInstructions === "string" && extraInstructions.trim()
      ? `\n\nINSTRUÇÕES ADICIONAIS DO ADMINISTRADOR:\n${extraInstructions.trim().slice(0, 1000)}`
      : "";

    // Real total considerando distribuição (pode arredondar para cima)
    const realTotal = numAxes > 0 ? perAxis * numAxes : count;

    const userPrompt = `Gere ${realTotal} perguntas para:

NOME: ${testName}
OBJETIVO: ${testDescription}

REQUISITOS:
- ${Math.max(2, Math.round(realTotal * 0.25))} perguntas INVERTIDAS (reverse-scored)
- ${Math.max(2, Math.round(realTotal * 0.4))} perguntas com CRUZAMENTO DE 2 EIXOS
${numAxes > 0 ? `- DISTRIBUIÇÃO OBRIGATÓRIA: ${perAxis} perguntas por eixo (${numAxes} eixos × ${perAxis} = ${realTotal})` : ''}
${extraBlock}

Retorne APENAS um JSON array. Sem texto adicional.`;

    const fullSystem = [globalSystemPrompt, baseSystemPrompt].filter(Boolean).join("\n\n");

    let parsed: any[];
    try {
      parsed = await callAIForQuestions({ apiKey: LOVABLE_API_KEY, systemPrompt: fullSystem, userPrompt });
    } catch (err: any) {
      console.error("AI primary call failed:", err.message);
      const msg = String(err.message || "");
      if (msg.includes("429")) {
        return new Response(JSON.stringify({ error: "Limite de requisições excedido." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      if (msg.includes("402")) {
        return new Response(JSON.stringify({ error: "Créditos de IA esgotados." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      return new Response(JSON.stringify({ error: "Erro ao gerar perguntas" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (!Array.isArray(parsed)) {
      return new Response(JSON.stringify({ error: "Formato de resposta inválido" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    let normalized = normalizeQuestions(parsed, 0);

    // ── AUTO-RETRY: cobrir eixos faltantes (1 tentativa para evitar timeout) ──
    let retryAttempts = 0;
    const MAX_RETRIES = 1;
    if (numAxes > 0) {
      while (retryAttempts < MAX_RETRIES) {
        const axisCounts: Record<string, number> = {};
        axes.forEach(a => { axisCounts[a] = 0; });
        normalized.forEach((q: any) => {
          (q.axes || []).forEach((a: string) => {
            if (axisCounts[a] !== undefined) axisCounts[a]++;
          });
        });
        const missing = axes.filter(a => axisCounts[a] < MIN_PER_AXIS);
        if (missing.length === 0) break;

        retryAttempts++;
        console.log(`Retry ${retryAttempts}: cobrindo ${missing.length} eixos faltantes`, missing);

        const needed = missing.flatMap(a => [a, a, a]); // 3 cada
        const retryUser = `URGENTE: Os seguintes eixos ficaram SEM cobertura mínima. Gere EXATAMENTE ${needed.length} perguntas adicionais distribuídas assim:
${missing.map(a => `- ${a}: ${MIN_PER_AXIS} perguntas`).join("\n")}

Use OS NOMES EXATOS dos eixos no campo "axes". Nenhum outro eixo deve aparecer como principal. Mesmas regras de qualidade. Retorne APENAS um JSON array.`;

        try {
          const retryParsed = await callAIForQuestions({ apiKey: LOVABLE_API_KEY, systemPrompt: fullSystem, userPrompt: retryUser });
          if (Array.isArray(retryParsed)) {
            const newOnes = normalizeQuestions(retryParsed, normalized.length);
            normalized = [...normalized, ...newOnes];
          }
        } catch (e) {
          console.error("Retry failed:", e);
          break;
        }
      }
    }

    // Quality metrics
    const totalQ = normalized.length;
    const reverseCount = normalized.filter((q: any) => q.reverse).length;
    const crossAxisCount = normalized.filter((q: any) => q.axes.length >= 2).length;
    const allAxesUsed = new Set(normalized.flatMap((q: any) => q.axes));
    const coveredAxes = axes.filter((a: string) => allAxesUsed.has(a));
    const uncoveredAxes = axes.filter((a: string) => !allAxesUsed.has(a));

    // Per-axis density (real coverage check)
    const axisDensity: Record<string, number> = {};
    axes.forEach(a => { axisDensity[a] = 0; });
    normalized.forEach((q: any) => {
      (q.axes || []).forEach((a: string) => {
        if (axisDensity[a] !== undefined) axisDensity[a]++;
      });
    });
    const underCoveredAxes = axes.filter(a => axisDensity[a] < MIN_PER_AXIS);

    const qualityMetrics = {
      total: totalQ,
      reverseCount,
      reversePercent: totalQ > 0 ? Math.round((reverseCount / totalQ) * 100) : 0,
      crossAxisCount,
      crossAxisPercent: totalQ > 0 ? Math.round((crossAxisCount / totalQ) * 100) : 0,
      coveredAxes: coveredAxes.length,
      totalAxes: axes.length,
      uncoveredAxes,
      underCoveredAxes,
      axisDensity,
      minPerAxis: MIN_PER_AXIS,
      retryAttempts,
      hasReasoning: normalized.some((q: any) => q.reasoning),
    };

    return new Response(JSON.stringify({ questions: normalized, qualityMetrics }), {
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
