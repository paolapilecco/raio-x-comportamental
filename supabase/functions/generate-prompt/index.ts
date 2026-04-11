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
  future_consequence: "Descrever o que acontece se o padrão comportamental atual continuar ativo: o que a pessoa tende a repetir, o que tende a perder e como o padrão mantém estagnação. Linguagem direta, sem motivacional.",
  restrictions: "Definir regras negativas obrigatórias — o que a IA NÃO deve fazer ao gerar os resultados.",
};

// ── MELHORIA 1: Exemplos de saída ideal por seção ──
const SECTION_OUTPUT_EXAMPLES: Record<string, string> = {
  interpretation: `EXEMPLO DE SAÍDA IDEAL (para referência de qualidade):
---
"Os eixos 'fuga_do_desconforto' (82%) e 'perfeccionismo_paralisante' (78%) formam um ciclo: o medo de errar (perfeccionismo) ativa a fuga para tarefas fáceis (desconforto). O eixo 'dependência_de_validação' (65%) reforça: a pessoa não age sem aprovação externa, o que alimenta tanto a paralisia quanto a fuga. Contradição central: o score alto em 'autocrítica_excessiva' (75%) mostra que a pessoa se cobra muito, mas o score baixo em 'execução_instável' (30%) indica que, quando age, executa bem — o problema não é capacidade, é INÍCIO."
---
Note: específico aos eixos, conecta dados entre si, identifica contradição com evidência.`,

  diagnosis: `EXEMPLO DE SAÍDA IDEAL (para referência de qualidade):
---
"Ciclo de Paralisia por Antecipação: Você imagina todas as formas possíveis de dar errado antes de começar. O cérebro trata o 'possível erro futuro' como ameaça real e dispara a mesma resposta de quando algo realmente dá errado. Resultado: você sente o fracasso ANTES de fracassar. A causa não é preguiça — é um sistema de proteção que aprendeu a evitar dor antecipando-a. O mecanismo funciona assim: surge uma tarefa → você pensa no resultado → imagina o pior → sente a dor antecipada → adia para 'aliviar' → alívio temporário → culpa → mais paralisia."
---
Note: nomeia o ciclo, explica causa raiz, descreve mecanismo completo, sem psicologuês.`,

  profile: `EXEMPLO DE SAÍDA IDEAL (para referência de qualidade):
---
"Nome: O Arquiteto de Planos que Nunca Saem do Papel. Estado mental: planejamento perpétuo como substituição de ação. Traços: (1) Coleciona informações antes de agir, (2) Troca de projeto quando o atual exige esforço real, (3) Confunde pesquisar sobre algo com fazer algo, (4) Sente que 'está quase pronto' há meses. Risco de autossabotagem: ALTO — o planejamento infinito é a armadilha mais difícil de perceber porque parece produtividade."
---
Note: nome criativo e revelador, traços concretos e observáveis, risco justificado.`,

  core_pain: `EXEMPLO DE SAÍDA IDEAL (para referência de qualidade):
---
"Dor central: Medo de ser 'desmascarado' como incompetente. Não é insegurança genérica — é a crença de que qualquer erro público vai revelar que você não é tão capaz quanto os outros pensam. Isso se disfarça no cotidiano como perfeccionismo ('preciso entregar perfeito') e procrastinação ('se não fizer, não podem me julgar'). O comportamento de adiar não é sobre a tarefa — é sobre evitar a possibilidade de confirmação dessa crença."
---
Note: específico ao perfil, diferencia de sintomas, explica disfarce.`,

  triggers: `EXEMPLO DE SAÍDA IDEAL (para referência de qualidade):
---
"GATILHOS: (1) Quando recebe uma tarefa com deadline visível para outros, (2) Quando alguém pergunta 'como está indo o projeto?', (3) Quando precisa apresentar algo em público, (4) Quando compara seu progresso com o de colegas.
ARMADILHAS MENTAIS: (1) 'Se eu tivesse mais tempo, faria melhor', (2) 'Preciso estudar mais antes de começar', (3) 'Todo mundo parece fazer isso fácil, o problema sou eu', (4) 'Melhor fazer outra coisa produtiva enquanto penso nisso'.
CICLO: Tarefa surge → Imagina julgamento → Ansiedade → Busca tarefa substituta → Alívio momentâneo → Prazo aperta → Faz correndo → Resultado medíocre → Confirma crença de incapacidade → Mais medo na próxima vez."
---
Note: gatilhos são situações concretas, armadilhas são frases reais, ciclo tem etapas claras.`,

  direction: `EXEMPLO DE SAÍDA IDEAL (para referência de qualidade):
---
"PRIMEIRA AÇÃO (7 dias): Escolha a tarefa que está adiando há mais tempo. Trabalhe nela por 15 minutos cronometrados. Não precisa terminar — só começar. O critério de sucesso é sentar e abrir o arquivo/documento.
ÁREA-CHAVE: O problema não está na execução — está no INÍCIO. Você executa bem quando começa. O bloqueio é o gap entre 'pensar sobre fazer' e 'fazer'.
PONTO DE BLOQUEIO: Seu cérebro vai te oferecer uma tarefa 'mais urgente' nos primeiros 3 minutos. Isso é a fuga se ativando. Contorne: diga em voz alta 'isso é fuga' e volte.
PARAR DE FAZER: Parar de pesquisar sobre produtividade — cada artigo/vídeo sobre 'como ser mais produtivo' é uma forma disfarçada de procrastinação."
---
Note: ação única e executável, identifica ponto exato do bloqueio, inclui o que PARAR.`,

  restrictions: `EXEMPLO DE SAÍDA IDEAL (para referência de qualidade):
---
"1. NÃO diga 'você tem potencial' ou 'acredite em si' — isso é exatamente o que coaches genéricos dizem e não muda nada
2. NÃO sugira 'faça listas' ou 'organize seu tempo' — o problema não é organização, é medo
3. NÃO minimize o padrão — se os scores indicam risco alto, diga que é alto
4. NÃO repita o diagnóstico na seção de direção — cada seção tem função diferente
5. NÃO gere insights que se aplicariam a qualquer pessoa — se trocar o nome e ainda funcionar, reescreva"
---
Note: cada restrição é justificada e específica ao contexto do teste.`,
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

// ── MELHORIA 3: Cross-validation — detect overlap between prompts ──
function detectOverlap(otherPrompts: { prompt_type: string; content: string }[], sectionType: string): string {
  if (otherPrompts.length === 0) return "";

  // Extract key instruction phrases from existing prompts
  const existingInstructions: { type: string; phrases: string[] }[] = [];
  otherPrompts.forEach(p => {
    if (p.prompt_type === sectionType || !p.content.trim()) return;
    const lines = p.content.split('\n').filter(l => l.trim().length > 20);
    const keyPhrases = lines
      .filter(l => /^\d+\.|^-|^•|DEVE|PRECISA|OBRIGATÓRIO|PROIBIDO|NÃO|SEMPRE/i.test(l.trim()))
      .map(l => l.trim().slice(0, 120));
    if (keyPhrases.length > 0) {
      existingInstructions.push({ type: p.prompt_type, phrases: keyPhrases.slice(0, 8) });
    }
  });

  if (existingInstructions.length === 0) return "";

  return `\n\nVALIDAÇÃO CRUZADA — INSTRUÇÕES QUE JÁ EXISTEM EM OUTROS PROMPTS (NÃO repita):
${existingInstructions.map(ei =>
    `[${ei.type}] contém:\n${ei.phrases.map(p => `  → ${p}`).join('\n')}`
  ).join('\n\n')}

REGRA: Se o prompt que você gerar contiver instruções SEMELHANTES às listadas acima, REESCREVA para trazer um ângulo DIFERENTE ou REMOVA.
Cada prompt deve ter função ÚNICA — zero sobreposição.`;
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

    // Fetch global system_prompt
    let globalSystemPrompt = "";
    try {
      const { data: globalConfig } = await supabase
        .from("global_ai_config")
        .select("system_prompt")
        .limit(1)
        .maybeSingle();
      if (globalConfig?.system_prompt) globalSystemPrompt = globalConfig.system_prompt;
    } catch { /* use empty */ }

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

    // Fetch questions, report template, existing prompts, AND prompt history in parallel
    // MELHORIA 2: Feedback loop — fetch prompt_history to use admin-edited versions as reference
    const [questionsRes, templateRes, promptsRes, historyRes] = await Promise.all([
      supabase.from("questions").select("text, type, axes, weight, options, context").eq("test_id", testId).order("sort_order").limit(50),
      supabase.from("report_templates").select("sections, output_rules").eq("test_id", testId).maybeSingle(),
      supabase.from("test_prompts").select("prompt_type, content, is_active").eq("test_id", testId).eq("is_active", true),
      supabase.from("prompt_history")
        .select("prompt_type, old_content, new_content, changed_at")
        .eq("test_id", testId)
        .eq("prompt_type", sectionType)
        .order("changed_at", { ascending: false })
        .limit(3),
    ]);

    const questions = questionsRes.data || [];
    const template = templateRes.data;
    const existingPrompts = promptsRes.data || [];
    const editHistory = historyRes.data || [];

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

    // MELHORIA 2: Build feedback loop context from edit history
    let feedbackLoopContext = "";
    if (editHistory.length > 0) {
      const latestEdit = editHistory[0];
      const editedContent = latestEdit.new_content?.trim();
      if (editedContent && editedContent.length > 50) {
        feedbackLoopContext = `\n\nREFERÊNCIA DE QUALIDADE — ÚLTIMA VERSÃO EDITADA PELO ADMIN:
O administrador editou manualmente o prompt desta seção. A versão editada representa o padrão de qualidade desejado.
Use esta versão como REFERÊNCIA DE ESTILO E PROFUNDIDADE (não copie literalmente — melhore):
---
${editedContent.slice(0, 800)}
---
INSTRUÇÃO: O prompt que você gerar deve manter o mesmo nível de especificidade, tom e estrutura da versão editada pelo admin, mas com conteúdo atualizado baseado nas perguntas atuais.`;
      }
    }

    // MELHORIA 3: Cross-validation
    const crossValidation = detectOverlap(existingPrompts, sectionType);

    // MELHORIA 1: Get output example for this section
    const outputExample = SECTION_OUTPUT_EXAMPLES[sectionType] || "";

    const isLifeMap = isLifeMapTest(testModule.slug);
    const lifeMapBlock = isLifeMap ? LIFE_MAP_CONTEXT : "";

    // MELHORIA 4: Axis coverage analysis
    const coveredAxesInPrompts: Set<string> = new Set();
    existingPrompts.forEach(p => {
      if (!p.content) return;
      const lower = p.content.toLowerCase();
      axes.forEach(a => {
        if (lower.includes(a.toLowerCase())) coveredAxesInPrompts.add(a);
      });
    });
    const uncoveredAxes = axes.filter(a => !coveredAxesInPrompts.has(a));
    const axisCoverageNote = uncoveredAxes.length > 0
      ? `\n\nALERTA DE COBERTURA: Os seguintes eixos NÃO são mencionados em nenhum prompt ativo: ${uncoveredAxes.join(", ")}. 
O prompt que você gerar DEVE referenciar estes eixos descobertos para garantir cobertura completa.`
      : "";

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

${outputExample ? `\n${outputExample}\n` : ""}

PROIBIDO:
- "busque equilíbrio", "tenha mais consciência", "acredite em si"
- Instruções vagas como "analise profundamente" sem especificar O QUÊ
- Repetir a descrição do teste como se fosse instrução
- Ignorar os dados reais das perguntas
${crossValidation}
${feedbackLoopContext}
${axisCoverageNote}

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
          { role: "system", content: [globalSystemPrompt, systemPrompt].filter(Boolean).join("\n\n") },
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

    // MELHORIA 3: Check for overlap with existing prompts
    const overlapDetected: string[] = [];
    existingPrompts.forEach(ep => {
      if (ep.prompt_type === sectionType || !ep.content) return;
      const epLines = ep.content.split('\n').filter(l => l.trim().length > 30);
      epLines.forEach(line => {
        const lineWords = line.toLowerCase().split(/\s+/).filter(w => w.length > 4);
        if (lineWords.length < 4) return;
        const matchCount = lineWords.filter(w => cleanedLower.includes(w)).length;
        if (matchCount / lineWords.length > 0.7) {
          overlapDetected.push(ep.prompt_type);
        }
      });
    });
    const uniqueOverlaps = [...new Set(overlapDetected)];
    if (uniqueOverlaps.length > 0) {
      qualityScore -= 15;
      qualityIssues.push(`Possível sobreposição com: ${uniqueOverlaps.join(", ")}`);
    }

    // MELHORIA 4: Axis coverage in generated prompt
    const coveredInGenerated = axes.filter(a => cleanedLower.includes(a.toLowerCase()));
    const uncoveredInGenerated = axes.filter(a => !cleanedLower.includes(a.toLowerCase()));
    const axisCoverage = {
      total: axes.length,
      covered: coveredInGenerated.length,
      uncovered: uncoveredInGenerated,
      percentage: axes.length > 0 ? Math.round((coveredInGenerated.length / axes.length) * 100) : 100,
    };

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
${uncoveredInGenerated.length > 0 ? `5. COBRIR estes eixos que ficaram descobertos: ${uncoveredInGenerated.join(", ")}` : ""}

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

          const retryCoveredAxes = axes.filter(a => retryLower.includes(a.toLowerCase()));
          const retryUncovered = axes.filter(a => !retryLower.includes(a.toLowerCase()));

          if (retryScore > qualityScore) {
            return new Response(JSON.stringify({
              prompt: retryCleaned,
              quality: { score: retryScore, level: retryScore >= 70 ? "high" : "medium", issues: [], retried: true },
              axisCoverage: {
                total: axes.length,
                covered: retryCoveredAxes.length,
                uncovered: retryUncovered,
                percentage: axes.length > 0 ? Math.round((retryCoveredAxes.length / axes.length) * 100) : 100,
              },
              feedbackUsed: editHistory.length > 0,
              crossValidated: uniqueOverlaps.length > 0,
            }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
          }
        }
      }
    }

    return new Response(JSON.stringify({
      prompt: cleaned,
      quality: { score: qualityScore, level: qualityLevel, issues: qualityIssues, retried: false },
      axisCoverage,
      feedbackUsed: editHistory.length > 0,
      crossValidated: uniqueOverlaps.length > 0,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("generate-prompt error:", e);
    return new Response(JSON.stringify({ error: "Erro interno ao gerar prompt" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
