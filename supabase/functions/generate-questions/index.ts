import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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
    const count = Math.min(Math.max(Number(questionCount) || 10, 3), 30);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

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
        const sections = templateRes.data.sections;
        if (Array.isArray(sections) && sections.length > 0) {
          reportTemplateSections = sections.map((s: any) => `- ${s.label || s.key}: ${s.description || ""}`).join("\n");
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
      testTypeAnalysis = `TIPO DE TESTE DETECTADO: MAPA DE VIDA / EVOLUÇÃO
Este NÃO é um teste comportamental tradicional. É uma avaliação multidimensional por ÁREAS DA VIDA.
- As perguntas devem avaliar SATISFAÇÃO, INVESTIMENTO e RESULTADO em cada área
- Use escalas de INTENSIDADE (0-10) para medir desequilíbrios
- Foque em: saúde, relacionamentos, carreira, finanças, lazer, espiritualidade, família, desenvolvimento pessoal
- O objetivo é detectar DESEQUILÍBRIO entre áreas, não padrões comportamentais
- Perguntas devem revelar onde a pessoa INVESTE vs onde COLHE resultados`;
    } else if (testDescLower.includes("propósito") || testDescLower.includes("sentido") || testDescLower.includes("purpose")) {
      testTypeAnalysis = `TIPO DE TESTE DETECTADO: PROPÓSITO / SENTIDO DE VIDA
- As perguntas devem explorar alinhamento entre VALORES e AÇÕES
- Foque em: identidade, expressão autêntica, significado, contribuição
- Detectar se a pessoa vive no "piloto automático" ou com intencionalidade
- Perguntas devem revelar DISSONÂNCIA entre o que importa e o que a pessoa faz`;
    } else if (testDescLower.includes("emocional") || testDescLower.includes("emoção") || testDescLower.includes("regulação")) {
      testTypeAnalysis = `TIPO DE TESTE DETECTADO: REGULAÇÃO EMOCIONAL
- As perguntas devem medir REATIVIDADE, TOLERÂNCIA e RECUPERAÇÃO emocional
- Foque em: gatilhos emocionais, padrões de resposta automática, capacidade de autorregulação
- Detectar se a emoção CONTROLA a ação ou se a pessoa GERENCIA a emoção`;
    } else if (testDescLower.includes("execução") || testDescLower.includes("produtividade") || testDescLower.includes("procrastin")) {
      testTypeAnalysis = `TIPO DE TESTE DETECTADO: EXECUÇÃO / PRODUTIVIDADE
- As perguntas devem medir CONSISTÊNCIA, SUSTENTAÇÃO e BLOQUEIOS na execução
- Foque em: início vs manutenção, motivação intrínseca vs extrínseca, ciclos de abandono
- Detectar o PONTO EXATO onde a execução falha (início, meio ou finalização)`;
    } else if (testDescLower.includes("relacionamento") || testDescLower.includes("relação") || testDescLower.includes("vínculo")) {
      testTypeAnalysis = `TIPO DE TESTE DETECTADO: RELACIONAMENTOS / VÍNCULOS
- As perguntas devem medir PADRÕES RELACIONAIS recorrentes
- Foque em: apego, comunicação, conflito, vulnerabilidade, dependência
- Detectar ciclos de repetição em dinâmicas interpessoais`;
    } else if (testDescLower.includes("dinheiro") || testDescLower.includes("financeir") || testDescLower.includes("money")) {
      testTypeAnalysis = `TIPO DE TESTE DETECTADO: RELAÇÃO COM DINHEIRO
- As perguntas devem medir CRENÇAS, COMPORTAMENTOS e EMOÇÕES sobre dinheiro
- Foque em: abundância vs escassez, valor próprio, sabotagem financeira
- Detectar padrões inconscientes que limitam resultados financeiros`;
    } else {
      testTypeAnalysis = `TIPO DE TESTE: COMPORTAMENTAL GERAL
- As perguntas devem revelar PADRÕES AUTOMÁTICOS de comportamento
- Foque em comportamentos REPETITIVOS e suas consequências
- Cada pergunta deve medir um comportamento OBSERVÁVEL e MENSURÁVEL`;
    }

    // ── STEP 3: Build the enriched prompt ──
    let promptContextBlock = "";
    if (promptsContext && typeof promptsContext === "string" && promptsContext.length > 0) {
      promptContextBlock = `\n\n═══ PROMPTS ATIVOS DO DIAGNÓSTICO ═══\nEstes são os prompts que o motor de análise usará para interpretar as respostas. As perguntas DEVEM gerar dados que alimentem CADA um desses prompts:\n${promptsContext.slice(0, 4000)}`;
    }

    let deduplicationBlock = "";
    if (Array.isArray(existingQuestionsFromOtherTests) && existingQuestionsFromOtherTests.length > 0) {
      const existing = existingQuestionsFromOtherTests.slice(0, 100).map((q: string) => `- ${q}`).join("\n");
      deduplicationBlock = `\n\n═══ PERGUNTAS DE OUTROS TESTES (NÃO REPITA) ═══\n${existing}`;
    }

    let internalDedupBlock = "";
    if (Array.isArray(existingQuestionsFromThisTest) && existingQuestionsFromThisTest.length > 0) {
      const internal = existingQuestionsFromThisTest.slice(0, 80).map((q: string) => `- ${q}`).join("\n");
      internalDedupBlock = `\n\n═══ PERGUNTAS JÁ EXISTENTES NESTE TESTE (NÃO DUPLIQUE) ═══\n${internal}`;
    }

    let axisCoverageBlock = "";
    if (Array.isArray(existingAxes) && existingAxes.length > 0) {
      axisCoverageBlock = `\n\n═══ EIXOS OBRIGATÓRIOS ═══\n${existingAxes.map((a: string) => `- ${a}`).join("\n")}\nTODOS devem ser cobertos. Distribua equilibradamente.`;
    }

    let templateBlock = "";
    if (reportTemplateSections) {
      templateBlock = `\n\n═══ SEÇÕES DO RELATÓRIO FINAL ═══\nAs perguntas precisam gerar dados suficientes para preencher CADA seção abaixo:\n${reportTemplateSections}`;
    }

    let patternBlock = "";
    if (patternDefinitionsContext) {
      patternBlock = `\n\n═══ PADRÕES COMPORTAMENTAIS DEFINIDOS ═══\nEstes são os padrões que o motor de análise precisa detectar. As perguntas DEVEM ser desenhadas para REVELAR ou DESCARTAR cada um:\n${patternDefinitionsContext}`;
    }

    let rulesBlock = "";
    if (outputRules) {
      rulesBlock = `\n\n═══ REGRAS DE SAÍDA DO RELATÓRIO ═══\n${outputRules}`;
    }

    const systemPrompt = `Você é um especialista em psicometria, neurociência comportamental e design de instrumentos de avaliação.

═══ ANÁLISE PRÉ-GERAÇÃO (OBRIGATÓRIA) ═══
Antes de gerar qualquer pergunta, você DEVE analisar internamente:

1. TIPO DO TESTE: Qual é a natureza deste diagnóstico? (comportamental, mapa de vida, emocional, etc.)
2. OBJETIVO REAL: O que este teste precisa REVELAR sobre o usuário?
3. PROMPTS DE ANÁLISE: Quais informações os prompts precisam receber para gerar um diagnóstico acertivo?
4. PADRÕES A DETECTAR: Quais padrões específicos devem ser confirmados ou descartados?
5. SEÇÕES DO RELATÓRIO: Que dados são necessários para preencher cada seção do relatório final?
6. LACUNAS: O que as perguntas existentes NÃO cobrem que é essencial?

═══ ${testTypeAnalysis} ═══

═══ REGRAS DE CONSTRUÇÃO ═══

PRINCÍPIO FUNDAMENTAL: Cada pergunta é um SENSOR — ela deve capturar um dado ESPECÍFICO que o motor de análise precisa para gerar um diagnóstico preciso.

TIPOS DE PERGUNTA:
- LIKERT (60-70%): AFIRMAÇÕES (nunca interrogação). Ex: "Eu começo tarefas mas não termino"
- FREQUÊNCIA (20-30%): Escala temporal. Ex: "Com que frequência você adia decisões importantes?"
- ESCOLHA COMPORTAMENTAL (10-20%): Cenários reais com 4 opções de comportamento concreto

QUALIDADE OBRIGATÓRIA:
1. Cada pergunta deve medir UM comportamento OBSERVÁVEL e ESPECÍFICO
2. NUNCA use linguagem genérica (melhorar, equilíbrio, zona de conforto, ser feliz, focar mais)
3. NUNCA use perguntas abertas (por que, como, o que, explique)
4. Priorize COMPORTAMENTO sobre OPINIÃO — "eu faço X" em vez de "eu acho que X"
5. As perguntas devem revelar PADRÕES REPETITIVOS (mínimo 3 perguntas convergentes por padrão)
6. Cada pergunta deve ter uma RAZÃO CLARA de existir — se não alimenta nenhum prompt ou seção, não inclua

PERGUNTAS INVERTIDAS (20-30% obrigatório):
- Medem o OPOSTO do padrão. Marque com "reverse": true
- Ex normal: "Eu começo tarefas mas não termino" (concordar = padrão forte)
- Ex invertida: "Quando começo algo, consigo manter até o fim" (concordar = padrão FRACO)
- Devem parecer NATURAIS — o usuário não deve perceber que é invertida

CRUZAMENTO DE EIXOS (40% obrigatório):
- Perguntas com 2 eixos detectam CONTRADIÇÕES e CONFLITOS internos
- Ex: cruzar "perfeccionismo" + "procrastinação" revela paralisia por exigência
- ESSENCIAL para diagnósticos com profundidade

CONEXÃO COM O MOTOR DE ANÁLISE:
O motor precisa detectar:
- PADRÃO NEURAL DOMINANTE: comportamento repetido em 3+ respostas
- CICLO DE AUTOSSABOTAGEM: gatilho → comportamento → consequência
- CONTRADIÇÕES INTERNAS: conflitos entre intenção e ação
- Para cada padrão definido, deve haver 3-5 perguntas que o medem diretamente
${promptContextBlock}${templateBlock}${patternBlock}${rulesBlock}${deduplicationBlock}${internalDedupBlock}${axisCoverageBlock}

═══ FORMATO DE SAÍDA (JSON array) ═══
Cada item:
- text: texto da afirmação/pergunta
- type: "likert" | "frequency" | "behavior_choice"
- axes: array de 1-2 eixos comportamentais específicos deste diagnóstico
- weight: 0.5-2.0 (1 = padrão, 1.5+ = pergunta essencial para diagnóstico)
- options: array de opções (padrão para likert/frequency, personalizado para behavior_choice)
- option_scores: array numérico (0-100)
- reverse: boolean
- reasoning: string curta explicando POR QUE esta pergunta existe e O QUE ela mede no contexto deste teste específico`;

    const extraBlock = extraInstructions && typeof extraInstructions === "string" && extraInstructions.trim()
      ? `\n\nINSTRUÇÕES ADICIONAIS DO ADMINISTRADOR:\n${extraInstructions.trim().slice(0, 1000)}`
      : "";

    const userPrompt = `Gere ${count} perguntas para:

NOME: ${testName}
OBJETIVO: ${testDescription}

REQUISITOS MÍNIMOS:
- ${Math.max(2, Math.round(count * 0.25))} perguntas INVERTIDAS (reverse-scored)
- ${Math.max(2, Math.round(count * 0.4))} perguntas com CRUZAMENTO DE 2 EIXOS
${existingAxes?.length ? `- Cobrir TODOS os ${existingAxes.length} eixos: ${existingAxes.join(', ')}` : ''}
${patternDefinitionsContext ? `- Cada padrão definido deve ter pelo menos 2-3 perguntas convergentes` : ''}
${reportTemplateSections ? `- Gerar dados suficientes para preencher TODAS as seções do relatório` : ''}
${extraBlock}

IMPORTANTE: Analise o tipo de teste, os prompts, os padrões e o template ANTES de gerar. Cada pergunta deve ter uma razão de existir.

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
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.6,
        reasoning: { effort: "medium" },
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

    // Extract JSON from response
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

    // Validate and normalize
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
        const isReverse = q.reverse === true;
        const options = Array.isArray(q.options) && q.options.length >= 2 ? q.options.map(String) : defaultOpts[type] || defaultOpts.likert;

        let scores: number[];
        if (Array.isArray(q.option_scores) && q.option_scores.length === options.length) {
          scores = q.option_scores.map((s: any) => Math.max(0, Math.min(100, Number(s) || 0)));
        } else {
          scores = [...(defaultScores[type] || defaultScores.likert)];
        }

        if (isReverse && scores.length > 0) {
          scores = scores.map(s => 100 - s);
        }

        return {
          text: q.text.trim(),
          type,
          axes: axes.length > 0 ? axes : ["geral"],
          weight: typeof q.weight === "number" ? Math.max(0.5, Math.min(2, q.weight)) : 1,
          sort_order: i + 1,
          options,
          option_scores: scores,
          reverse: isReverse,
          reasoning: typeof q.reasoning === "string" ? q.reasoning.trim() : undefined,
        };
      });

    // Quality metrics
    const totalQ = normalized.length;
    const reverseCount = normalized.filter((q: any) => q.reverse).length;
    const crossAxisCount = normalized.filter((q: any) => q.axes.length >= 2).length;
    const allAxesUsed = new Set(normalized.flatMap((q: any) => q.axes));
    const coveredAxes = existingAxes ? (existingAxes as string[]).filter((a: string) => allAxesUsed.has(a)) : [];
    const uncoveredAxes = existingAxes ? (existingAxes as string[]).filter((a: string) => !allAxesUsed.has(a)) : [];

    const qualityMetrics = {
      total: totalQ,
      reverseCount,
      reversePercent: totalQ > 0 ? Math.round((reverseCount / totalQ) * 100) : 0,
      crossAxisCount,
      crossAxisPercent: totalQ > 0 ? Math.round((crossAxisCount / totalQ) * 100) : 0,
      coveredAxes: coveredAxes.length,
      totalAxes: existingAxes?.length || 0,
      uncoveredAxes,
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
