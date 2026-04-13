import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

// ═══════════════════════════════════════════════════════════
// ▌ SECTION 1: Constants & Types
// ═══════════════════════════════════════════════════════════

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface ScoreEntry {
  key: string;
  label: string;
  score: number;
  maxScore: number;
  percentage: number;
}

interface PromptRecord {
  prompt_type: string;
  content: string;
  title: string;
}

interface ReportTemplate {
  sections: TemplateSection[];
  output_rules: OutputRules;
}

interface TemplateSection {
  key: string;
  name: string;
  maxSize: number;
  required: boolean;
}

interface OutputRules {
  tone?: string;
  simplicityLevel?: number;
  maxSentencesPerBlock?: number;
  maxTotalBlocks?: number;
  repetitionProhibited?: boolean;
  requiredBlocks?: string[];
  forbiddenLanguage?: string[];
}

interface StructuredAnswer {
  questionId: number;
  questionText: string;
  questionType: string;
  axes: string[];
  value: number;
  mappedScore?: number;
  chosenOption: string | null;
}

interface RequestBody {
  test_module_id: string;
  scores: ScoreEntry[];
  slug: string;
  refine_level?: number;
  answers?: StructuredAnswer[];
}

interface EvolutionComparison {
  improved_axes: { key: string; label: string; previous: number; current: number; delta: number }[];
  worsened_axes: { key: string; label: string; previous: number; current: number; delta: number }[];
  unchanged_axes: { key: string; label: string; value: number }[];
  previous_score: number;
  current_score: number;
  previous_date: string;
  summary_text: string;
}

// ═══════════════════════════════════════════════════════════
// ▌ SECTION 2: Helpers
// ═══════════════════════════════════════════════════════════

function jsonResponse(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function errorResponse(message: string, status: number): Response {
  return jsonResponse({ error: message }, status);
}

function fallbackResponse(): Response {
  return jsonResponse({ useFallback: true });
}

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 10;

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(userId);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(userId, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }
  if (entry.count >= RATE_LIMIT_MAX) return false;
  entry.count++;
  return true;
}

function classifyIntensity(pct: number): string {
  if (pct >= 75) return "ALTO";
  if (pct >= 50) return "MODERADO";
  return "LEVE";
}

// ═══════════════════════════════════════════════════════════
// ▌ SECTION 3: Score Analysis
// ═══════════════════════════════════════════════════════════

function buildScoresSummary(sortedScores: ScoreEntry[]): string {
  return sortedScores
    .map((s) => `${s.key}: ${s.percentage}% — ${classifyIntensity(s.percentage)}`)
    .join("\n");
}

function buildDominantSection(dominant: ScoreEntry): string {
  return `PADRÃO DOMINANTE: ${dominant.key} (${dominant.percentage}%)`;
}

function buildSecondarySection(secondary: ScoreEntry[]): string {
  if (secondary.length === 0) return "PADRÕES SECUNDÁRIOS ATIVOS (score ≥ 40%): NENHUM";
  return `PADRÕES SECUNDÁRIOS ATIVOS (score ≥ 40%):\n${secondary
    .map((s) => `- ${s.key}: ${s.percentage}%`)
    .join("\n")}`;
}

function buildConflictsSection(scores: ScoreEntry[]): string {
  const highScores = scores.filter((s) => s.percentage >= 50);
  const conflicts: string[] = [];

  for (let i = 0; i < highScores.length; i++) {
    for (let j = i + 1; j < highScores.length; j++) {
      conflicts.push(
        `CONFLITO DETECTADO: ${highScores[i].key} (${highScores[i].percentage}%) × ${highScores[j].key} (${highScores[j].percentage}%)`
      );
    }
  }

  if (conflicts.length === 0) return "CONFLITOS DETECTADOS (dois eixos ≥ 50%): NENHUM";
  return `CONFLITOS DETECTADOS (dois eixos ≥ 50%):\n${conflicts.join("\n")}`;
}

function buildEvidencesSection(answers: StructuredAnswer[]): string {
  if (!answers || answers.length === 0) return "EVIDÊNCIAS COMPORTAMENTAIS: Dados não disponíveis";

  const extremes = answers.filter((a) => {
    const score = a.mappedScore ?? 0;
    return score >= 80;
  });

  if (extremes.length === 0) return "EVIDÊNCIAS COMPORTAMENTAIS (respostas com score ≥ 80): NENHUMA";

  const lines = extremes.map((a) => {
    const score = a.mappedScore ?? 0;
    const optionText = a.chosenOption ? `"${a.chosenOption}"` : `score ${score}`;
    return `- "${a.questionText}" → ${optionText} (score: ${score})`;
  });

  return `EVIDÊNCIAS COMPORTAMENTAIS (respostas com score ≥ 80):\n${lines.join("\n")}`;
}

// ═══════════════════════════════════════════════════════════
// ▌ SECTION 3.5: Evolution Comparison Builder
// ═══════════════════════════════════════════════════════════

function buildEvolutionComparison(
  currentScores: ScoreEntry[],
  previousScores: ScoreEntry[],
  previousDate: string
): Omit<EvolutionComparison, "summary_text"> {
  const prevMap = new Map(previousScores.map((s) => [s.key, s]));
  const improved: EvolutionComparison["improved_axes"] = [];
  const worsened: EvolutionComparison["worsened_axes"] = [];
  const unchanged: EvolutionComparison["unchanged_axes"] = [];

  const THRESHOLD = 3; // minimum % change to count as improved/worsened

  for (const curr of currentScores) {
    const prev = prevMap.get(curr.key);
    if (!prev) continue;
    const delta = curr.percentage - prev.percentage;
    if (delta <= -THRESHOLD) {
      // Lower score = improved (less of a problem)
      improved.push({ key: curr.key, label: curr.label, previous: prev.percentage, current: curr.percentage, delta });
    } else if (delta >= THRESHOLD) {
      worsened.push({ key: curr.key, label: curr.label, previous: prev.percentage, current: curr.percentage, delta });
    } else {
      unchanged.push({ key: curr.key, label: curr.label, value: curr.percentage });
    }
  }

  const prevAvg = previousScores.length > 0 ? Math.round(previousScores.reduce((a, b) => a + b.percentage, 0) / previousScores.length) : 0;
  const currAvg = currentScores.length > 0 ? Math.round(currentScores.reduce((a, b) => a + b.percentage, 0) / currentScores.length) : 0;

  return {
    improved_axes: improved,
    worsened_axes: worsened,
    unchanged_axes: unchanged,
    previous_score: prevAvg,
    current_score: currAvg,
    previous_date: previousDate,
  };
}

function buildEvolutionPromptSection(comparison: Omit<EvolutionComparison, "summary_text">): string {
  const lines: string[] = ["--- COMPARAÇÃO COM DIAGNÓSTICO ANTERIOR ---"];
  lines.push(`Score médio anterior: ${comparison.previous_score}% | Score médio atual: ${comparison.current_score}%`);
  lines.push(`Data do diagnóstico anterior: ${comparison.previous_date}`);

  if (comparison.improved_axes.length > 0) {
    lines.push(`\nEIXOS QUE MELHORARAM (score diminuiu):`);
    comparison.improved_axes.forEach((a) => lines.push(`- ${a.label}: ${a.previous}% → ${a.current}% (${a.delta}%)`));
  }
  if (comparison.worsened_axes.length > 0) {
    lines.push(`\nEIXOS QUE PIORARAM (score aumentou):`);
    comparison.worsened_axes.forEach((a) => lines.push(`- ${a.label}: ${a.previous}% → ${a.current}% (+${a.delta}%)`));
  }
  if (comparison.unchanged_axes.length > 0) {
    lines.push(`\nEIXOS SEM ALTERAÇÃO SIGNIFICATIVA:`);
    comparison.unchanged_axes.forEach((a) => lines.push(`- ${a.label}: ${a.value}%`));
  }

  lines.push(`\nGere o campo "evolutionSummary" com base nesses dados. Direto, sem motivacional, mostrando claramente o que melhorou, piorou e permanece igual.`);

  return lines.join("\n");
}

// ═══════════════════════════════════════════════════════════
// ▌ SECTION 4: Prompt Builders
// ═══════════════════════════════════════════════════════════

const SYSTEM_PROMPT = `Você é um especialista em análise comportamental e Terapia Neurocientífica. Gere um relatório diagnóstico baseado exclusivamente nos dados reais do usuário fornecidos abaixo.

REGRAS DE PROFUNDIDADE PSICOLÓGICA:
1. NUNCA use linguagem genérica, motivacional ou de autoajuda.
2. NUNCA escreva frases que poderiam servir para qualquer pessoa — cada frase deve ser impossível de aplicar a outro perfil.
3. O diagnóstico deve revelar algo que a pessoa NÃO sabe sobre si mesma — não repetir o que ela já sabe.
4. Cada bloco deve trazer INFORMAÇÃO NOVA — nunca reformular o que já foi dito em outro campo.
5. Use linguagem direta, psicológica, precisa — sem rodeios, sem amenizar, sem psicologuês vazio.
6. O "chamaAtencao" deve ser o insight mais REVELADOR — algo que cause impacto real de reconhecimento.
7. O "padraoRepetido" deve descrever o MECANISMO exato — como o ciclo se instala, não apenas nomeá-lo.
8. O "corePain" deve ir na CAUSA por trás dos sintomas — não no sintoma em si.
9. O "comoAparece" deve descrever situações CONCRETAS e observáveis — não abstrações.
10. PROIBIDO: "busque equilíbrio", "tenha mais consciência", "acredite em si", "saia da zona de conforto", "pratique o autoconhecimento".

Retorne exclusivamente um JSON válido sem nenhum texto antes ou depois.`;

const OUTPUT_SCHEMA = `--- SCHEMA DE SAÍDA ---

Retorne APENAS este JSON, sem markdown, sem texto adicional:

{
  "profileName": "nome do perfil comportamental",
  "combinedTitle": "título do relatório que captura o padrão central",
  "perfilComportamental": "descrição do perfil em 3 frases",
  "diagnosis": "diagnóstico central em 3 frases",
  "chamaAtencao": "insight mais revelador em 2 frases",
  "padraoRepetido": "ciclo que se repete em 2 frases",
  "corePain": "dor central em 2 frases",
  "comoAparece": "como aparece na rotina em 2 frases",
  "gatilhos": ["gatilho 1", "gatilho 2", "gatilho 3"],
  "impactoPorArea": [
    {"area": "nome da área", "impacto": "impacto concreto"},
    {"area": "nome da área", "impacto": "impacto concreto"}
  ],
  "corrigirPrimeiro": "direção de mudança em 2 frases",
  "pararDeFazer": "comportamento a parar em 1 frase",
  "acaoInicial": "ação concreta dos próximos 7 dias + gancho reteste",
  "selfSabotageCycle": ["passo 1", "passo 2", "passo 3", "passo 4"],
  "microAcoes": [
    {"gatilho": "situação específica derivada do PADRÃO DOMINANTE do usuário", "acao": "ação que ataca diretamente esse padrão — verbo claro + tempo + instrução concreta"},
    {"gatilho": "situação derivada do EIXO COM MAIOR SCORE do usuário", "acao": "ação que neutraliza esse eixo — verbo claro + tempo + instrução concreta"},
    {"gatilho": "comportamento recorrente detectado nas EVIDÊNCIAS COMPORTAMENTAIS (respostas com score >= 80)", "acao": "ação que interrompe esse comportamento — verbo claro + tempo + instrução concreta"}
  ],
  "exitStrategy": ["passo 1", "passo 2", "passo 3"],
  "blindSpot": "ponto cego em 1 frase",
  "mentalCommand": "comando mental em 1 frase curta",
  "futureConsequence": "o que acontece se esse padrão continuar nos próximos meses — em 3 frases: (1) o que a pessoa tende a repetir, (2) o que ela tende a perder, (3) como esse padrão mantém estagnação. Direto, prático, sem motivacional, sem exagero dramático, sem psicologuês.",
  "evolutionSummary": "resumo da comparação com diagnóstico anterior (se dados fornecidos). 3 frases: o que melhorou, o que piorou, o que continua igual. Direto, sem motivacional. Se não houver dados de comparação, retorne string vazia.",
  "summary": "resumo geral em 2 frases",
  "mechanism": "mecanismo central em 2 frases",
  "contradiction": "contradição interna em 1 frase",
  "impact": "impacto na vida em 1 frase",
  "direction": "direção de mudança resumida",
  "keyUnlockArea": "área chave de desbloqueio",
  "criticalDiagnosis": "diagnóstico crítico em 2 frases",
  "mentalState": "estado mental atual em 1 frase",
  "blockingPoint": "ponto de travamento em 1 frase",
  "triggers": ["gatilho 1", "gatilho 2", "gatilho 3"],
  "mentalTraps": ["armadilha 1", "armadilha 2"],
  "whatNotToDo": ["o que não fazer 1", "o que não fazer 2"],
  "lifeImpact": [{"pillar": "área", "impact": "impacto"}],
  "focoMudanca": "foco da mudança em 1 frase curta"
}

REGRAS OBRIGATÓRIAS PARA microAcoes:

═══ 1. VINCULAÇÃO AO DIAGNÓSTICO (INEGOCIÁVEL) ═══
- microAcoes[0] → ataca o PADRÃO DOMINANTE. O gatilho descreve a situação concreta onde esse padrão aparece na vida real.
- microAcoes[1] → ataca o EIXO COM MAIOR SCORE (%). O gatilho referencia um comportamento real desse eixo.
- microAcoes[2] → ataca um COMPORTAMENTO RECORRENTE das EVIDÊNCIAS COMPORTAMENTAIS (respostas score >= 80). O gatilho cita o comportamento específico revelado.

═══ 2. GATILHO CONCRETO (OBRIGATÓRIO) ═══
O gatilho DEVE incluir pelo menos um: contexto real, situação específica, tipo de interação, comportamento observável, pessoa/ambiente/canal.
CORRETO: "quando estiver evitando responder alguém no WhatsApp para não entrar em conflito"
CORRETO: "quando perceber que concordou com algo no trabalho só para não desagradar"
CORRETO: "quando começar a enrolar antes de uma tarefa que exige exposição"
ERRADO: "quando se sentir mal", "em situações difíceis", "quando estiver estressada", "quando sentir desconforto"

═══ 3. AÇÃO FORTE (OBRIGATÓRIO) ═══
Cada ação DEVE ter: verbo claro + contexto + tempo definido + instrução física ou mental concreta + leve desconforto produtivo + interrupção real do padrão.
CORRETO: "pare, conte até 5 e diga em voz alta o que você está evitando antes de sair da situação"
CORRETO: "responda em até 2 minutos com uma frase objetiva, sem explicar demais"
CORRETO: "faça exatamente o oposto do impulso automático por 5 minutos e anote o resultado"
ERRADO: "respire fundo", "observe seus padrões", "reflita sobre isso", "tenha consciência", "mude seu comportamento"

═══ 4. FORMATO ═══
- 1 frase executável por ação (curta, direta)
- Sem texto longo, sem explicação teórica, sem linguagem motivacional, sem psicologuês

═══ 5. VALIDAÇÃO MENTAL OBRIGATÓRIA (antes de aceitar cada ação) ═══
Teste 1: "essa ação faz sentido APENAS para esse diagnóstico específico?" → se não, DESCARTAR
Teste 2: "essa ação tem gatilho concreto e execução real?" → se não, DESCARTAR
Teste 3: "essa ação interrompe o padrão ou é só conselho bonito?" → se não, DESCARTAR
Se descartada → reescrever até passar nos 3 testes.

═══ 6. PROIBIÇÕES ABSOLUTAS ═══
- Gatilhos vagos ou abstratos
- Conselhos genéricos que serviriam para qualquer pessoa
- Linguagem abstrata ou bonita demais
- Ações sem verbo forte, sem tempo ou sem condição
- Qualquer ação que NÃO referencia implicitamente o padrão dominante, eixo mais alto ou evidência comportamental

═══ 7. OBJETIVO ═══
Cada microAção deve fazer o usuário pensar: "isso foi escrito exatamente para o meu problema"

Exemplo CORRETO (padrão dominante = evitação de conflito):
{"gatilho": "perceber que está escolhendo ficar quieta para não criar conflito com alguém próximo", "acao": "pare, diga em voz alta 'eu estou evitando' e formule uma frase honesta sobre o que você quer — diga antes de sair do ambiente"}

Exemplo CORRETO (eixo alto = perfeccionismo paralisante):
{"gatilho": "quando perceber que está revisando a mesma tarefa pela terceira vez antes de entregar", "acao": "entregue agora como está, cronometre 2 minutos e anote o que aconteceu de verdade — nada do que você temia"}

Exemplo ERRADO:
{"gatilho": "quando se sentir insegura", "acao": "respire fundo e observe o que está sentindo"}`;



function buildUserPrompt(
  userContext: string,
  sortedScores: ScoreEntry[],
  dominant: ScoreEntry,
  secondary: ScoreEntry[],
  answers: StructuredAnswer[],
  prompts: PromptRecord[],
  template: ReportTemplate | null,
  evolutionSection?: string,
): string {
  const promptMap: Record<string, string> = {};
  prompts.forEach((p) => { promptMap[p.prompt_type] = p.content; });

  const sections: string[] = [];

  // 1. User context
  sections.push(userContext);

  // 2. User data
  sections.push("--- DADOS DO USUÁRIO ---");
  sections.push(`SCORES POR EIXO (ordem decrescente):\n${buildScoresSummary(sortedScores)}`);
  sections.push(buildDominantSection(dominant));
  sections.push(buildSecondarySection(secondary));
  sections.push(buildConflictsSection(sortedScores));
  sections.push(buildEvidencesSection(answers));

  // 2.5. Evolution comparison (if exists)
  if (evolutionSection) {
    sections.push(evolutionSection);
  }

  // 3. Admin prompts — injected in order
  const promptTypes: [string, string][] = [
    ["interpretation", "INSTRUÇÕES DE ANÁLISE"],
    ["diagnosis", "INSTRUÇÕES DE DIAGNÓSTICO"],
    ["profile", "INSTRUÇÕES DE PERFIL"],
    ["core_pain", "INSTRUÇÕES DE DOR CENTRAL"],
    ["triggers", "INSTRUÇÕES DE GATILHOS"],
    ["direction", "INSTRUÇÕES DE DIREÇÃO"],
    ["restrictions", "RESTRIÇÕES ABSOLUTAS"],
  ];

  for (const [key, title] of promptTypes) {
    if (promptMap[key] && promptMap[key].trim().length > 0) {
      sections.push(`--- ${title} ---\n${promptMap[key]}`);
    }
  }

  // 4. Output rules from template (if configured)
  if (template?.output_rules) {
    const rules = template.output_rules;
    const ruleLines: string[] = [];
    if (rules.tone) ruleLines.push(`- TOM OBRIGATÓRIO: ${rules.tone}`);
    if (rules.maxSentencesPerBlock) ruleLines.push(`- MÁXIMO ${rules.maxSentencesPerBlock} frases por bloco`);
    if (rules.repetitionProhibited) ruleLines.push(`- REPETIÇÃO PROIBIDA entre seções`);
    if (rules.forbiddenLanguage?.length) ruleLines.push(`- TERMOS PROIBIDOS: ${rules.forbiddenLanguage.map((t) => `"${t}"`).join(", ")}`);
    if (ruleLines.length > 0) {
      sections.push(`--- REGRAS DE SAÍDA ---\n${ruleLines.join("\n")}`);
    }
  }

  // 5. JSON output schema
  sections.push(OUTPUT_SCHEMA);

  return sections.join("\n\n");
}

// ═══════════════════════════════════════════════════════════
// ▌ SECTION 5: microAcoes Deep Validation + Result Normalization
// ═══════════════════════════════════════════════════════════

// ── Blacklists ──

const FORBIDDEN_ACTION_STARTS = [
  "respire", "observe", "reflita", "tenha consciência", "mude seu",
  "preste atenção", "tente melhorar", "busque ajuda", "aceite",
  "seja mais", "tente ser", "procure entender", "procure perceber",
  "tome consciência", "pense sobre", "analise", "considere",
  "lembre-se", "permita-se", "abra-se", "confie", "acredite",
  "mantenha a calma", "fique tranquil", "não se preocupe",
  "tenha paciência", "cuide de", "valorize", "pratique",
];

const VAGUE_TRIGGER_PHRASES = [
  "quando se sentir mal", "em situações difíceis", "quando estiver estressad",
  "quando sentir desconforto", "em momentos de crise", "quando tiver problema",
  "quando se sentir insegur", "em situações de estresse", "quando sentir ansiedade",
  "quando se sentir trist", "quando ficar nervos", "quando sentir medo",
  "quando se sentir sobrecarregad", "em momentos difíceis", "quando tiver dúvida",
  "quando se sentir frustad", "quando sentir raiva", "quando estiver confus",
  "em situações de pressão", "quando se sentir vulnerável",
];

const STRONG_VERBS = [
  "diga", "fale", "pare", "faça", "escreva", "bloqueie", "responda",
  "inicie", "entregue", "levante", "volte", "apague", "cronometre",
  "formule", "execute", "abra", "feche", "mande", "envie", "delete",
  "cancele", "saia", "entre", "sente", "pegue", "anote", "liste",
  "recuse", "aceite", "repita", "conte", "leia", "grave", "marque",
  "desative", "silencie", "coloque", "tire", "troque", "defina",
  "programe", "agende", "estabeleça", "interrompa", "corte",
];

const TIME_CONTEXT_MARKERS = [
  "minuto", "segundo", "hora", "agora", "hoje", "antes de",
  "depois de", "imediatamente", "já", "neste momento", "por ",
  "durante ", "até ", "em até", "no máximo", "sem parar",
  "antes que", "ainda", "primeiro",
];

// ── Validation Engine ──

interface ValidationContext {
  dominantPattern: string;
  topAxisLabel: string;
  evidenceTexts: string[];     // from behavioral evidences (score >= 80)
}

function normalizeText(text: string): string {
  return text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
}

function validateTriggerQuality(gatilho: string): { pass: boolean; reason?: string } {
  const g = normalizeText(gatilho);
  
  // Too short = too vague
  if (g.length < 25) return { pass: false, reason: "trigger_too_short" };
  
  // Check against vague phrases
  for (const vague of VAGUE_TRIGGER_PHRASES) {
    if (g.includes(normalizeText(vague))) return { pass: false, reason: `vague_trigger: ${vague}` };
  }
  
  // Must describe a situation (should contain a verb or context indicator)
  const hasContextMarker = ["quando", "ao", "no momento", "na hora", "perceber que", "notar que", "começar a", "antes de", "depois de", "durante"].some(m => g.includes(m));
  if (!hasContextMarker) return { pass: false, reason: "no_situational_context" };
  
  return { pass: true };
}

function validateActionQuality(acao: string): { pass: boolean; reason?: string } {
  const a = normalizeText(acao);
  
  // Check forbidden action starts
  for (const forbidden of FORBIDDEN_ACTION_STARTS) {
    if (a.startsWith(normalizeText(forbidden))) return { pass: false, reason: `forbidden_start: ${forbidden}` };
  }
  
  // Must start with or contain a strong verb
  const firstWord = a.split(/[\s,]/)[0];
  const hasStrongVerb = STRONG_VERBS.some(v => firstWord.startsWith(normalizeText(v)) || a.includes(normalizeText(v)));
  if (!hasStrongVerb) return { pass: false, reason: "no_strong_verb" };
  
  // Must have time/condition/context
  const hasTimeContext = TIME_CONTEXT_MARKERS.some(m => a.includes(normalizeText(m)));
  if (!hasTimeContext) return { pass: false, reason: "no_time_context" };
  
  // Minimum complexity (at least 6 words for real instruction)
  if (a.split(" ").length < 6) return { pass: false, reason: "action_too_simple" };
  
  // Must not be just advice (check for imperative + concrete instruction)
  const advicePatterns = ["tente ", "procure ", "busque ", "lembre ", "permita ", "confie "];
  for (const adv of advicePatterns) {
    if (a.startsWith(normalizeText(adv))) return { pass: false, reason: `advice_pattern: ${adv}` };
  }
  
  return { pass: true };
}

function validateDiagnosticConnection(
  item: { gatilho?: string; acao?: string },
  index: number,
  ctx: ValidationContext
): { pass: boolean; reason?: string } {
  const g = normalizeText(item.gatilho || "");
  const a = normalizeText(item.acao || "");
  const combined = g + " " + a;
  
  // Action 0 must reference dominant pattern
  if (index === 0) {
    const patternWords = normalizeText(ctx.dominantPattern).split(/\s+/).filter(w => w.length > 3);
    const hasPatternRef = patternWords.some(w => combined.includes(w));
    if (!hasPatternRef && patternWords.length > 0) {
      // Looser check: at least one semantic keyword from the pattern
      const semanticHit = patternWords.length <= 2 || patternWords.slice(0, 3).some(w => combined.includes(w));
      if (!semanticHit) {
        console.log(`[validate] Action 0 weak connection to pattern "${ctx.dominantPattern}"`);
        // Don't reject — the AI prompt already forces this. Just log.
      }
    }
  }
  
  // Action 1 must reference top axis
  if (index === 1) {
    const axisWords = normalizeText(ctx.topAxisLabel).split(/\s+/).filter(w => w.length > 3);
    const hasAxisRef = axisWords.some(w => combined.includes(w));
    if (!hasAxisRef && axisWords.length > 0) {
      console.log(`[validate] Action 1 weak connection to axis "${ctx.topAxisLabel}"`);
    }
  }
  
  // Action 2 must reference behavioral evidence
  if (index === 2 && ctx.evidenceTexts.length > 0) {
    const evidenceWords = ctx.evidenceTexts.flatMap(e => normalizeText(e).split(/\s+/).filter(w => w.length > 4)).slice(0, 10);
    const hasEvidenceRef = evidenceWords.some(w => combined.includes(w));
    if (!hasEvidenceRef) {
      console.log(`[validate] Action 2 weak connection to evidence`);
    }
  }
  
  // Universal check: would this action work for ANY diagnosis?
  // If trigger + action are completely generic (no specific behavior mentioned), reject
  const specificityIndicators = [
    "evitando", "concordou", "revisando", "adiando", "postergando",
    "fugindo", "ignorando", "repetindo", "comparando", "controlando",
    "perfeccion", "conflito", "rejeição", "aprovação", "julgamento",
    "exposição", "confronto", "decisão", "entregar", "começar",
    "terminar", "responder", "recusar", "aceitar", "pedir",
    "cobrar", "estabelecer limite", "dizer não", "dizer sim",
    "delegar", "priorizar", "abandonar", "desistir", "insistir",
  ];
  const hasSpecificity = specificityIndicators.some(s => combined.includes(normalizeText(s)));
  if (!hasSpecificity) {
    return { pass: false, reason: "too_generic_for_any_diagnosis" };
  }
  
  return { pass: true };
}

function validateMicroAcoes(
  rawMicro: { gatilho?: string; acao?: string }[],
  dominant: ScoreEntry,
  sortedScores: ScoreEntry[],
  answers: StructuredAnswer[]
): { gatilho: string; acao: string }[] {
  const evidenceTexts = (answers || [])
    .filter(a => (a.mappedScore ?? 0) >= 80)
    .map(a => a.questionText)
    .slice(0, 5);
  
  const ctx: ValidationContext = {
    dominantPattern: dominant.label || dominant.key || "",
    topAxisLabel: sortedScores[0]?.label || sortedScores[0]?.key || "",
    evidenceTexts,
  };
  
  const validated: { gatilho: string; acao: string }[] = [];
  
  for (let i = 0; i < Math.min(rawMicro.length, 6); i++) {
    const item = rawMicro[i];
    if (!item?.gatilho || !item?.acao) {
      console.log(`[validate] Action ${i} REJECTED: missing gatilho or acao`);
      continue;
    }
    
    const triggerCheck = validateTriggerQuality(item.gatilho);
    if (!triggerCheck.pass) {
      console.log(`[validate] Action ${i} REJECTED: ${triggerCheck.reason} | gatilho: "${item.gatilho.substring(0, 50)}..."`);
      continue;
    }
    
    const actionCheck = validateActionQuality(item.acao);
    if (!actionCheck.pass) {
      console.log(`[validate] Action ${i} REJECTED: ${actionCheck.reason} | acao: "${item.acao.substring(0, 50)}..."`);
      continue;
    }
    
    const targetIndex = validated.length; // assign to the next slot
    const connectionCheck = validateDiagnosticConnection(item, targetIndex, ctx);
    if (!connectionCheck.pass) {
      console.log(`[validate] Action ${i} REJECTED: ${connectionCheck.reason}`);
      continue;
    }
    
    validated.push({ gatilho: item.gatilho, acao: item.acao });
    if (validated.length >= 3) break;
  }
  
  if (validated.length < 3) {
    console.warn(`[analyze-test] ⚠️ QUALITY ALERT: Only ${validated.length}/3 actions passed validation. Raw: ${rawMicro.length} generated. Dominant: "${ctx.dominantPattern}", TopAxis: "${ctx.topAxisLabel}"`);
  }
  
  console.log(`[analyze-test] microAcoes validation: ${rawMicro.length} generated → ${validated.length} approved`);
  return validated;
}

// ── Result Normalization ──

function normalizeResult(
  result: Record<string, unknown>,
  dominant: ScoreEntry,
  sortedScores: ScoreEntry[],
  answers: StructuredAnswer[] = []
): Record<string, unknown> {
  // Ensure arrays exist (empty if not provided by AI)
  for (const f of ["triggers", "mentalTraps", "selfSabotageCycle", "whatNotToDo", "gatilhos", "pararDeFazer", "exitStrategy"]) {
    if (!Array.isArray(result[f])) result[f] = [];
  }
  if (!Array.isArray(result.lifeImpact)) result.lifeImpact = [];
  if (!Array.isArray(result.impactoPorArea)) result.impactoPorArea = [];

  // ── Deep validate microAcoes ──
  const rawMicro = Array.isArray(result.microAcoes) ? result.microAcoes as { gatilho?: string; acao?: string }[] : [];
  result.microAcoes = validateMicroAcoes(rawMicro, dominant, sortedScores, answers);

  // Ensure strings exist (empty if not provided by AI — NO fallback content)
  const stringFields = [
    "profileName", "combinedTitle", "perfilComportamental", "diagnosis",
    "chamaAtencao", "padraoRepetido", "corePain", "comoAparece",
    "corrigirPrimeiro", "acaoInicial", "blindSpot", "mentalCommand",
    "futureConsequence", "evolutionSummary",
    "summary", "mechanism", "contradiction", "impact", "direction",
    "keyUnlockArea", "criticalDiagnosis", "mentalState", "blockingPoint",
    "focoMudanca",
  ];
  for (const f of stringFields) {
    if (typeof result[f] !== "string") result[f] = "";
  }

  // pararDeFazer: accept string or array
  if (typeof result.pararDeFazer === "string") {
    result.pararDeFazer = result.pararDeFazer ? [result.pararDeFazer as string] : [];
  }

  // combinedTitle fallback to dominant label only
  if (!result.combinedTitle) result.combinedTitle = dominant.label || "";

  // Quantitative anchor for frontend validation
  result._quantitativeAnchor = {
    topAxis: sortedScores[0]?.label || "",
    topPercentage: sortedScores[0]?.percentage || 0,
    secondaryAxes: sortedScores.slice(1, 3).map((s) => ({ label: s.label, percentage: s.percentage })),
  };

  return result;
}

// ═══════════════════════════════════════════════════════════
// ▌ SECTION 6: Main Handler
// ═══════════════════════════════════════════════════════════

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // ── Auth ──
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return errorResponse("Não autorizado", 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) return errorResponse("Não autorizado", 401);

    // ── Rate limit ──
    if (!checkRateLimit(user.id)) {
      return errorResponse("Limite de requisições atingido. Aguarde um minuto.", 429);
    }

    // ── Parse & validate input ──
    const body: RequestBody = await req.json();
    const { test_module_id, scores, slug, refine_level, answers: structuredAnswers } = body;

    if (!test_module_id || !scores || !Array.isArray(scores)) {
      return errorResponse("Dados inválidos", 400);
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // ── Fetch config + previous diagnostic (parallel) ──
    const [promptsRes, templateRes, profileRes, previousRes] = await Promise.all([
      adminClient.from("test_prompts").select("prompt_type, title, content").eq("test_id", test_module_id).eq("is_active", true),
      adminClient.from("report_templates").select("sections, output_rules").eq("test_id", test_module_id).maybeSingle(),
      userClient.from("profiles").select("name, age").eq("user_id", user.id).maybeSingle(),
      // Fetch previous completed diagnostic for same user + module
      adminClient
        .from("diagnostic_sessions")
        .select("id, completed_at, diagnostic_results(all_scores)")
        .eq("user_id", user.id)
        .eq("test_module_id", test_module_id)
        .not("completed_at", "is", null)
        .order("completed_at", { ascending: false })
        .limit(2), // Get 2 to skip the current one if it exists
    ]);

    if (promptsRes.error) {
      console.error("Error fetching prompts:", promptsRes.error);
      return errorResponse("Erro ao carregar configuração do diagnóstico", 500);
    }

    if (!promptsRes.data || promptsRes.data.length === 0) {
      return fallbackResponse();
    }

    let reportTemplate: ReportTemplate | null = null;
    if (templateRes.data) {
      reportTemplate = {
        sections: Array.isArray(templateRes.data.sections) ? templateRes.data.sections as TemplateSection[] : [],
        output_rules: (templateRes.data.output_rules && typeof templateRes.data.output_rules === "object") ? templateRes.data.output_rules as OutputRules : {},
      };
    }

    // ── Build analysis data ──
    const sortedScores = [...scores]
      .map((s) => ({ ...s, percentage: Math.min(100, Math.max(0, s.percentage)) }))
      .sort((a, b) => b.percentage - a.percentage);

    const dominant = sortedScores[0];
    const secondary = sortedScores.filter((s, i) => i > 0 && s.percentage >= 40).slice(0, 3);

    // ── Build evolution comparison (if previous exists) ──
    let evolutionData: Omit<EvolutionComparison, "summary_text"> | null = null;
    let evolutionPromptSection: string | undefined;

    try {
      if (previousRes.data && previousRes.data.length > 0) {
        // Find the most recent completed session that has results with scores
        const prevSession = previousRes.data.find((s: any) => {
          const results = s.diagnostic_results;
          if (Array.isArray(results) && results.length > 0) {
            return results[0]?.all_scores && Array.isArray(results[0].all_scores) && results[0].all_scores.length > 0;
          }
          return false;
        });

        if (prevSession) {
          const prevResults = Array.isArray(prevSession.diagnostic_results) ? prevSession.diagnostic_results[0] : prevSession.diagnostic_results;
          const prevScores: ScoreEntry[] = (prevResults as any)?.all_scores || [];
          if (prevScores.length > 0) {
            evolutionData = buildEvolutionComparison(sortedScores, prevScores, prevSession.completed_at || "");
            evolutionPromptSection = buildEvolutionPromptSection(evolutionData);
            console.log(`[analyze-test] Evolution comparison: improved=${evolutionData.improved_axes.length}, worsened=${evolutionData.worsened_axes.length}, unchanged=${evolutionData.unchanged_axes.length}`);
          }
        }
      }
    } catch (e) {
      console.error("[analyze-test] Evolution comparison error (non-blocking):", e);
    }

    // ── Build prompts ──
    const profile = profileRes.data;
    const userContext = profile
      ? `Usuário: ${profile.name || "Anônimo"}${profile.age ? `, ${profile.age} anos` : ""}`
      : "Usuário anônimo";

    const userPrompt = buildUserPrompt(
      userContext,
      sortedScores,
      dominant,
      secondary,
      structuredAnswers || [],
      promptsRes.data as PromptRecord[],
      reportTemplate,
      evolutionPromptSection,
    );

    // ── Fetch AI config ──
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) return fallbackResponse();

    let aiModel = "google/gemini-3-flash-preview";
    let aiTemperature = 0.55;
    let aiMaxTokens = 6000;

    try {
      const [testConfigRes, globalConfigRes] = await Promise.all([
        adminClient.from("test_ai_config").select("use_global_defaults, ai_enabled, temperature, max_tokens").eq("test_id", test_module_id).maybeSingle(),
        adminClient.from("global_ai_config").select("ai_model, temperature, max_tokens, system_prompt").limit(1).maybeSingle(),
      ]);

      if (globalConfigRes.data?.ai_model) aiModel = globalConfigRes.data.ai_model;

      if (testConfigRes.data && !testConfigRes.data.use_global_defaults) {
        if (testConfigRes.data.temperature != null) aiTemperature = Number(testConfigRes.data.temperature);
        if (testConfigRes.data.max_tokens != null) aiMaxTokens = Number(testConfigRes.data.max_tokens);
      } else if (globalConfigRes.data) {
        if (globalConfigRes.data.temperature != null) aiTemperature = Number(globalConfigRes.data.temperature);
        if (globalConfigRes.data.max_tokens != null) aiMaxTokens = Number(globalConfigRes.data.max_tokens);
      }
    } catch { /* use defaults */ }

    // ── Refine instruction ──
    let refineInstruction = "";
    const refineLevel = refine_level ?? 0;
    if (refineLevel >= 1) {
      refineInstruction = "\n\nINSTRUÇÃO DE REFINAMENTO: A resposta anterior foi genérica. Seja mais específico, use os dados reais do usuário, e garanta que cada bloco traz informação nova.";
    }

    // ── Fetch global system_prompt ──
    let globalSystemPrompt = "";
    try {
      const gConfig = await adminClient.from("global_ai_config").select("system_prompt").limit(1).maybeSingle();
      if (gConfig.data?.system_prompt) globalSystemPrompt = gConfig.data.system_prompt;
    } catch { /* use empty */ }

    // ── Call AI ──
    const fullSystemPrompt = [globalSystemPrompt, SYSTEM_PROMPT, refineInstruction].filter(Boolean).join("\n\n");
    const aiBody = {
      model: aiModel,
      messages: [
        { role: "system", content: fullSystemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: aiTemperature,
      max_tokens: aiMaxTokens,
    };

    console.log(`[analyze-test] Model: ${aiModel}, Temp: ${aiTemperature}, MaxTokens: ${aiMaxTokens}, Slug: ${slug}`);

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(aiBody),
    });

    if (!aiResponse.ok) {
      const status = aiResponse.status;
      await aiResponse.text();
      if (status === 429) return errorResponse("Limite de requisições. Tente novamente em instantes.", 429);
      if (status === 402) return errorResponse("Créditos de IA esgotados.", 402);
      console.error("AI error:", status);
      return fallbackResponse();
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content || "";

    // ── Parse JSON ──
    let result: Record<string, unknown>;
    try {
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, content];
      result = JSON.parse(jsonMatch[1]!.trim());
    } catch {
      console.error("Failed to parse AI response:", content.substring(0, 500));
      return fallbackResponse();
    }

    // ── Validate minimum fields ──
    const hasMinimumFields = result.chamaAtencao || result.diagnosis || result.criticalDiagnosis || result.profileName;
    if (!hasMinimumFields) {
      console.error("AI response missing required fields");
      return fallbackResponse();
    }

    // ── Normalize (no hardcoded fallback) ──
    const normalized = normalizeResult(result, dominant, sortedScores, structuredAnswers || []);

    // ── Attach evolution comparison data (deterministic + AI summary) ──
    if (evolutionData) {
      const summaryText = typeof normalized.evolutionSummary === "string" && normalized.evolutionSummary.trim()
        ? normalized.evolutionSummary as string
        : "";

      normalized.evolutionComparison = {
        ...evolutionData,
        summary_text: summaryText,
      };
    }

    return jsonResponse({ analysis: normalized });
  } catch (e) {
    console.error("analyze-test error:", e);
    return errorResponse("Erro interno do servidor", 500);
  }
});
