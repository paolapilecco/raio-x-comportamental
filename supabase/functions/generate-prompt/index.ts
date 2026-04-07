import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SECTION_PURPOSES: Record<string, string> = {
  interpretation: "Interpretar os scores dos eixos e identificar padrões dominantes, conflitos internos e contradições entre percepção e ação.",
  diagnosis: "Gerar o diagnóstico final nomeando o ciclo, causa raiz, mecanismo exato e diferença entre problema percebido vs real.",
  profile: "Criar um perfil comportamental com nome criativo, estado mental, traços dominantes e nível de risco.",
  core_pain: "Identificar a dor central (medo/ferida emocional) que sustenta todos os padrões — não sintomas, mas a causa.",
  triggers: "Mapear gatilhos situacionais concretos, armadilhas mentais (pensamentos automáticos) e o ciclo de autossabotagem.",
  direction: "Sugerir direção prática com ação imediata, área-chave de destravamento e ponto de bloqueio.",
  restrictions: "Definir regras negativas obrigatórias — o que a IA NÃO deve fazer ao gerar os resultados.",
};

const LIFE_MAP_SLUGS = ["mapa-de-vida", "mapa-de-vida-e-evolucao", "life-map"];

const LIFE_MAP_CONTEXT = `
ATENÇÃO — REGRA ESPECIAL: Este teste é do tipo "Mapa de Vida & Evolução".
Ele NÃO segue a lógica dos testes comportamentais tradicionais.

DIFERENÇAS FUNDAMENTAIS:
1. As perguntas medem ÁREAS DA VIDA (emocional, espiritual, profissional, financeiro, intelectual, saúde, social, família, relacionamento, propósito) com notas de 0 a 10
2. O relatório analisa DESEQUILÍBRIO entre áreas — não padrões comportamentais
3. A leitura é por ÁREA, não por eixo psicológico
4. O foco é identificar: áreas fortes, áreas frágeis, hiato (gap) entre elas, fase atual (Consolidação/Ajuste/Reconstrução/Crítica)

ESTRUTURA DO RELATÓRIO MAPA DE VIDA (7 seções):
1. Fase Atual — classificar em Consolidação, Ajuste, Reconstrução ou Crítica
2. Diagnóstico de Desequilíbrio — baseado no gap entre notas altas e baixas
3. Áreas Fortes — quais áreas sustentam o indivíduo
4. Áreas Frágeis — quais áreas precisam de atenção urgente
5. Plano de Ação 60 dias — 3 ações concretas para cada área com nota < 7
6. Comparação Histórica — antes vs depois (se houver dados anteriores)
7. Revisão em 60 dias — marco de reavaliação

PROIBIDO PARA MAPA DE VIDA:
- Usar linguagem de "padrão comportamental" ou "ciclo de autossabotagem"
- Tratar como teste psicológico tradicional
- Gerar diagnóstico de perfil comportamental
- Ignorar a lógica de áreas da vida
- Usar termos como "padrão dominante", "perfil comportamental", "traço de personalidade"

OBRIGATÓRIO PARA MAPA DE VIDA:
- Referenciar ÁREAS DA VIDA específicas (emocional, financeiro, saúde, etc.)
- Focar em equilíbrio/desequilíbrio entre áreas
- Incluir lógica de plano de ação prático por área
- Considerar a fase atual do indivíduo
- Manter tom prático e orientado a resultados mensuráveis
`;

function isLifeMapTest(slug: string): boolean {
  return LIFE_MAP_SLUGS.some(s => slug.toLowerCase().includes(s) || s.includes(slug.toLowerCase()));
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { testId, sectionType } = await req.json();

    if (!testId || typeof testId !== "string" || testId.length > 100) {
      return new Response(JSON.stringify({ error: "ID do teste inválido" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const validSections = Object.keys(SECTION_PURPOSES);
    if (!sectionType || !validSections.includes(sectionType)) {
      return new Response(JSON.stringify({ error: "Tipo de seção inválido" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch test module info
    const { data: testModule } = await supabase
      .from("test_modules")
      .select("id, name, slug, description, category, icon")
      .eq("id", testId)
      .single();

    if (!testModule) {
      return new Response(JSON.stringify({ error: "Teste não encontrado" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch questions, report template, and existing prompts in parallel
    const [questionsRes, templateRes, promptsRes] = await Promise.all([
      supabase.from("questions").select("text, type, axes, weight, options, context").eq("test_id", testId).order("sort_order").limit(50),
      supabase.from("report_templates").select("sections, output_rules").eq("test_id", testId).maybeSingle(),
      supabase.from("test_prompts").select("prompt_type, content, is_active").eq("test_id", testId).eq("is_active", true),
    ]);

    const questions = questionsRes.data || [];
    const template = templateRes.data;
    const existingPrompts = promptsRes.data || [];

    // Build question analysis summary
    const questionsSummary = questions.length > 0
      ? questions.slice(0, 30).map((q, i) => `${i + 1}. [${q.type}] "${q.text}" (eixos: ${(q.axes || []).join(", ")}, peso: ${q.weight}${q.context ? `, contexto: ${q.context}` : ""})`).join("\n")
      : "Nenhuma pergunta cadastrada ainda.";

    const axes = [...new Set(questions.flatMap(q => q.axes || []))];
    const questionTypes = [...new Set(questions.map(q => q.type))];

    // Analyze what questions actually measure
    const axisWeights: Record<string, { count: number; totalWeight: number }> = {};
    questions.forEach(q => {
      (q.axes || []).forEach((axis: string) => {
        if (!axisWeights[axis]) axisWeights[axis] = { count: 0, totalWeight: 0 };
        axisWeights[axis].count++;
        axisWeights[axis].totalWeight += Number(q.weight) || 1;
      });
    });
    const axisAnalysis = Object.entries(axisWeights)
      .sort((a, b) => b[1].totalWeight - a[1].totalWeight)
      .map(([axis, info]) => `${axis}: ${info.count} perguntas, peso acumulado ${info.totalWeight.toFixed(1)}`)
      .join("\n");

    const templateInfo = template
      ? `Seções do relatório: ${JSON.stringify(template.sections)}\nRegras de saída: ${JSON.stringify(template.output_rules)}`
      : "Nenhum template de relatório configurado.";

    const otherPrompts = existingPrompts
      .filter(p => p.prompt_type !== sectionType && p.content.trim())
      .map(p => `[${p.prompt_type}]: ${p.content.slice(0, 300)}...`)
      .join("\n\n");

    const isLifeMap = isLifeMapTest(testModule.slug);
    const lifeMapBlock = isLifeMap ? LIFE_MAP_CONTEXT : "";

    const systemPrompt = `Você é um especialista sênior em engenharia de prompts para diagnósticos comportamentais e psicométricos.

Sua tarefa é gerar um prompt profissional para a seção "${sectionType}" (${SECTION_PURPOSES[sectionType]}) de um teste diagnóstico.
${lifeMapBlock}
MÉTODO OBRIGATÓRIO — ANÁLISE ANTES DE GERAR:
Antes de escrever o prompt, analise internamente:
1. O que as perguntas cadastradas REALMENTE medem (não o nome do teste)
2. Quais padrões comportamentais podem ser inferidos das respostas
3. Quais eixos têm maior concentração de perguntas e peso
4. Que tipo de conflito ou contradição pode surgir entre eixos
5. Quais blocos do template do relatório este prompt deve alimentar

REGRAS DE QUALIDADE PROFISSIONAL:
1. Linguagem CLARA e DIRETA — sem psicologuês vazio
2. Função ESPECÍFICA — o prompt deve servir APENAS para "${sectionType}"
3. ZERO generalização — cada instrução deve ser rastreável aos eixos/perguntas reais
4. ZERO frases motivacionais ou de autoajuda
5. ZERO repetição de instruções que existam em outros prompts do teste
6. Referencie EXPLICITAMENTE os eixos reais e o que eles captam
7. Inclua regras claras do que fazer E do que NÃO fazer
8. Estruture com seções numeradas
9. Máximo 500 palavras
10. Se o template do relatório existir, alinhe as instruções aos blocos que esta seção alimenta

PROIBIDO:
- "busque equilíbrio", "tenha mais consciência", "acredite em si"
- Instruções vagas como "analise profundamente" sem especificar O QUÊ
- Repetir a descrição do teste como se fosse instrução
- Ignorar os dados reais das perguntas

Retorne APENAS o texto do prompt — sem explicações, sem markdown extra, sem comentários.`;

    const userPrompt = `CONTEXTO COMPLETO DO TESTE:

Nome: ${testModule.name}
Slug: ${testModule.slug}
Categoria: ${testModule.category}
Descrição: ${testModule.description}
${isLifeMap ? "\n⚠️ TIPO ESPECIAL: Mapa de Vida — usar lógica de ÁREAS DA VIDA, não padrões comportamentais.\n" : ""}
ANÁLISE DOS EIXOS (por concentração):
${axisAnalysis || "Nenhum eixo identificado ainda."}

TIPOS DE PERGUNTA USADOS: ${questionTypes.length > 0 ? questionTypes.join(", ") : "nenhum ainda"}
TOTAL DE PERGUNTAS: ${questions.length}

PERGUNTAS CADASTRADAS (analise o que elas REALMENTE medem):
${questionsSummary}

TEMPLATE DO RELATÓRIO (o prompt deve alimentar estes blocos):
${templateInfo}

OUTROS PROMPTS JÁ CONFIGURADOS (NÃO repita estas instruções):
${otherPrompts || "Nenhum outro prompt configurado ainda."}

---

SEÇÃO A GERAR: ${sectionType}
FUNÇÃO DESTA SEÇÃO: ${SECTION_PURPOSES[sectionType]}

Gere o prompt profissional para esta seção. Baseie-se nos DADOS REAIS das perguntas, não em conceitos abstratos.`;

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
        temperature: 0.5,
        max_tokens: 2000,
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
      return new Response(JSON.stringify({ error: "Erro ao gerar prompt" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await response.json();
    const content = aiData.choices?.[0]?.message?.content || "";

    if (!content.trim()) {
      return new Response(JSON.stringify({ error: "A IA não retornou conteúdo" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Clean markdown fences if present
    let cleaned = content.trim();
    const fenceMatch = cleaned.match(/^```(?:\w+)?\s*\n?([\s\S]*?)\n?```$/);
    if (fenceMatch) cleaned = fenceMatch[1].trim();

    // === QUALITY VALIDATION ===
    const genericPhrases = [
      "busque equilíbrio", "tenha mais consciência", "acredite em si",
      "pratique mindfulness", "saia da zona de conforto", "mude seu mindset",
      "analise profundamente", "reflita sobre", "busque autoconhecimento",
      "tenha mais foco", "seja mais produtivo", "acredite no seu potencial",
    ];
    const cleanedLower = cleaned.toLowerCase();
    const genericCount = genericPhrases.filter(p => cleanedLower.includes(p)).length;

    // Check if prompt references actual axes from the test
    const axisReferences = axes.filter(a => cleanedLower.includes(a.toLowerCase())).length;
    const axisRatio = axes.length > 0 ? axisReferences / Math.min(axes.length, 5) : 0;

    // Check minimum length
    const wordCount = cleaned.split(/\s+/).length;

    // Quality scoring
    let qualityScore = 100;
    const qualityIssues: string[] = [];

    if (genericCount >= 3) {
      qualityScore -= 40;
      qualityIssues.push("Contém muitas frases genéricas");
    } else if (genericCount >= 1) {
      qualityScore -= 15;
      qualityIssues.push("Contém frases genéricas");
    }

    if (axes.length > 0 && axisRatio < 0.3) {
      qualityScore -= 30;
      qualityIssues.push("Não referencia os eixos reais do teste");
    }

    if (wordCount < 80) {
      qualityScore -= 25;
      qualityIssues.push("Prompt muito curto para ser útil");
    }

    // Check if it mentions the test name or its specific context
    const testNameWords = testModule.name.toLowerCase().split(/\s+/).filter((w: string) => w.length > 3);
    const nameReferences = testNameWords.filter((w: string) => cleanedLower.includes(w)).length;
    if (testNameWords.length > 0 && nameReferences === 0) {
      qualityScore -= 20;
      qualityIssues.push("Não reflete o contexto específico do teste");
    }

    const qualityLevel = qualityScore >= 70 ? "high" : qualityScore >= 45 ? "medium" : "low";

    // If quality is low, auto-retry once
    if (qualityLevel === "low") {
      console.log(`Low quality prompt (score: ${qualityScore}), retrying...`);

      const retryPrompt = `O prompt anterior ficou GENÉRICO e de baixa qualidade. Problemas: ${qualityIssues.join("; ")}.

CORRIJA agora. Você DEVE:
1. Referenciar EXPLICITAMENTE estes eixos: ${axes.join(", ")}
2. Conectar as instruções às perguntas reais do teste "${testModule.name}"
3. Remover qualquer frase genérica de autoajuda
4. Ser técnico e específico para a função "${sectionType}"

Contexto do teste: ${testModule.description}
Eixos: ${axes.join(", ")}
Tipos: ${questionTypes.join(", ")}

Gere novamente o prompt para "${sectionType}". Retorne APENAS o texto.`;

      const retryResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
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
            { role: "assistant", content: cleaned },
            { role: "user", content: retryPrompt },
          ],
          temperature: 0.4,
          max_tokens: 2000,
        }),
      });

      if (retryResponse.ok) {
        const retryData = await retryResponse.json();
        const retryContent = retryData.choices?.[0]?.message?.content || "";
        if (retryContent.trim()) {
          let retryCleaned = retryContent.trim();
          const retryFence = retryCleaned.match(/^```(?:\w+)?\s*\n?([\s\S]*?)\n?```$/);
          if (retryFence) retryCleaned = retryFence[1].trim();

          // Re-score retry
          const retryLower = retryCleaned.toLowerCase();
          const retryGeneric = genericPhrases.filter(p => retryLower.includes(p)).length;
          const retryAxisRefs = axes.filter(a => retryLower.includes(a.toLowerCase())).length;
          const retryScore = 100 - (retryGeneric >= 3 ? 40 : retryGeneric * 15)
            - (axes.length > 0 && retryAxisRefs / Math.min(axes.length, 5) < 0.3 ? 30 : 0);

          if (retryScore > qualityScore) {
            return new Response(JSON.stringify({
              prompt: retryCleaned,
              quality: { score: retryScore, level: retryScore >= 70 ? "high" : "medium", issues: [], retried: true },
            }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
          }
        }
      }
    }

    return new Response(JSON.stringify({
      prompt: cleaned,
      quality: { score: qualityScore, level: qualityLevel, issues: qualityIssues, retried: false },
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("generate-prompt error:", e);
    return new Response(JSON.stringify({ error: "Erro interno ao gerar prompt" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
