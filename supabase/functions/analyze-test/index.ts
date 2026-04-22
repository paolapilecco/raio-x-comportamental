import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

// ═══════════════════════════════════════════════════════════════
// CORS & UTILITIES
// ═══════════════════════════════════════════════════════════════

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

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

interface TemplateSection {
  key: string;
  slug?: string;
  label?: string;
  name?: string;
  maxSentences?: number;
  maxSize?: number;
  required: boolean;
  aiInstructions?: string;
  contentType?: "text" | "list" | "table";
  emotionalWeight?: "impacto" | "validacao" | "desconforto" | "esperanca" | "neutro";
  exampleOutput?: string;
}

interface OutputRules {
  tone?: string;
  simplicityLevel?: number;
  maxSentencesPerBlock?: number;
  maxTotalBlocks?: number;
  repetitionProhibited?: boolean;
  requiredBlocks?: string[];
  forbiddenLanguage?: string[];
  emotionalArchitecture?: string;
}

// ─── STORYBOARD 3-ACT TYPES ───

interface StoryboardSlot {
  key: string;
  label: string;
  format: "prose" | "list" | "cards" | "quote" | "alert";
  maxSentences: number;
  instruction: string;
  example: string;
  enabled: boolean;
}

interface StoryboardAct {
  id: "espelho" | "confronto" | "direcao";
  title: string;
  subtitle: string;
  tone: string;
  slots: StoryboardSlot[];
}

interface CompositionRules {
  maxTotalWords: number;
  proportions: { espelho: number; confronto: number; direcao: number };
  forbiddenTerms: string[];
  mandatoryElements: string[];
  narrativeVoice: string;
}

interface StoryboardTemplate {
  acts: StoryboardAct[];
  rules: CompositionRules;
}

interface ReportTemplate {
  sections: TemplateSection[];
  output_rules: OutputRules;
  storyboard?: StoryboardTemplate;
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

// ─── DIAGNOSTIC CORE TYPE ───

interface DiagnosticCore {
  dominantPattern: string;
  dominantPatternLabel: string;
  secondaryPattern: string;
  secondaryPatternLabel: string;
  mainConflict: string;
  maintenancePattern: string;
  emotionalReactionStyle: string;
  selfSabotageTendency: string;
  decisionMakingStyle: string;
  primaryLifeImpact: string;
  temperamentReading: string;
  confidenceLevel: string;
  selfDeceptionIndex: number;
  inconsistencies: string[];
  priorityChangeDirection: string;
  corePatternMechanism: string;
  hiddenMotivation: string;
  // ─── CICLO LÓGICO COMPLETO ───
  causaProvavel: string;
  gatilhoPrincipal: string;
  comportamentoAutomatico: string;
  justificativaInterna: string;
  consequenciaRepetida: string;
}

// ═══════════════════════════════════════════════════════════════
// RATE LIMITER
// ═══════════════════════════════════════════════════════════════

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(userId);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(userId, { count: 1, resetAt: now + 60_000 });
    return true;
  }
  if (entry.count >= 10) return false;
  entry.count++;
  return true;
}

// ═══════════════════════════════════════════════════════════════
// MODULE 1: SCORE ANALYSIS
// ═══════════════════════════════════════════════════════════════

function classifyIntensity(pct: number): string {
  if (pct >= 75) return "ALTO";
  if (pct >= 50) return "MODERADO";
  return "LEVE";
}

function buildDataBlock(sortedScores: ScoreEntry[], answers: StructuredAnswer[]): string {
  const lines: string[] = ["═══ DADOS QUANTITATIVOS DO USUÁRIO ═══"];

  lines.push("\nSCORES POR EIXO (ordem decrescente):");
  sortedScores.forEach((s) => {
    lines.push(`  ${s.key}: ${s.percentage}% — ${classifyIntensity(s.percentage)}`);
  });

  const dominant = sortedScores[0];
  lines.push(`\nPADRÃO DOMINANTE: ${dominant.key} (${dominant.percentage}%)`);

  const secondary = sortedScores.filter((s, i) => i > 0 && s.percentage >= 40).slice(0, 3);
  if (secondary.length > 0) {
    lines.push("PADRÕES SECUNDÁRIOS ATIVOS (score ≥ 40%):");
    secondary.forEach((s) => lines.push(`  - ${s.key}: ${s.percentage}%`));
  } else {
    lines.push("PADRÕES SECUNDÁRIOS ATIVOS: NENHUM");
  }

  const highScores = sortedScores.filter((s) => s.percentage >= 50);
  const conflicts: string[] = [];
  for (let i = 0; i < highScores.length; i++) {
    for (let j = i + 1; j < highScores.length; j++) {
      conflicts.push(`  ${highScores[i].key} (${highScores[i].percentage}%) × ${highScores[j].key} (${highScores[j].percentage}%)`);
    }
  }
  if (conflicts.length > 0) {
    lines.push("CONFLITOS DETECTADOS (dois eixos ≥ 50%):");
    conflicts.forEach((c) => lines.push(c));
  }

  if (answers && answers.length > 0) {
    const extremes = answers.filter((a) => (a.mappedScore ?? 0) >= 80);
    if (extremes.length > 0) {
      lines.push("\nEVIDÊNCIAS COMPORTAMENTAIS (respostas com score ≥ 80):");
      extremes.forEach((a) => {
        const score = a.mappedScore ?? 0;
        const opt = a.chosenOption ? `"${a.chosenOption}"` : `score ${score}`;
        lines.push(`  - "${a.questionText}" → ${opt} (score: ${score})`);
      });
    }

    const moderates = answers.filter((a) => {
      const s = a.mappedScore ?? 0;
      return s >= 60 && s < 80;
    }).slice(0, 5);
    if (moderates.length > 0) {
      lines.push("\nPADRÕES MODERADOS (score 60-79 — contexto adicional):");
      moderates.forEach((a) => {
        lines.push(`  - "${a.questionText}" → score ${a.mappedScore ?? 0} [eixos: ${a.axes.join(", ")}]`);
      });
    }

    const axisAnswerCount: Record<string, { high: number; moderate: number; low: number }> = {};
    answers.forEach((a) => {
      const s = a.mappedScore ?? 0;
      a.axes.forEach((axis) => {
        if (!axisAnswerCount[axis]) axisAnswerCount[axis] = { high: 0, moderate: 0, low: 0 };
        if (s >= 80) axisAnswerCount[axis].high++;
        else if (s >= 50) axisAnswerCount[axis].moderate++;
        else axisAnswerCount[axis].low++;
      });
    });
    lines.push("\nDISTRIBUIÇÃO DE RESPOSTAS POR EIXO:");
    Object.entries(axisAnswerCount)
      .sort((a, b) => b[1].high - a[1].high)
      .forEach(([axis, counts]) => {
        lines.push(`  ${axis}: ${counts.high} alta | ${counts.moderate} moderada | ${counts.low} baixa`);
      });
  }

  return lines.join("\n");
}

// ═══════════════════════════════════════════════════════════════
// MODULE 2: EVOLUTION COMPARISON
// ═══════════════════════════════════════════════════════════════

function buildEvolutionComparison(
  currentScores: ScoreEntry[],
  previousScores: ScoreEntry[],
  previousDate: string
): Omit<EvolutionComparison, "summary_text"> {
  const prevMap = new Map(previousScores.map((s) => [s.key, s]));
  const improved: EvolutionComparison["improved_axes"] = [];
  const worsened: EvolutionComparison["worsened_axes"] = [];
  const unchanged: EvolutionComparison["unchanged_axes"] = [];
  const THRESHOLD = 3;

  for (const curr of currentScores) {
    const prev = prevMap.get(curr.key);
    if (!prev) continue;
    const delta = curr.percentage - prev.percentage;
    if (delta <= -THRESHOLD) improved.push({ key: curr.key, label: curr.label, previous: prev.percentage, current: curr.percentage, delta });
    else if (delta >= THRESHOLD) worsened.push({ key: curr.key, label: curr.label, previous: prev.percentage, current: curr.percentage, delta });
    else unchanged.push({ key: curr.key, label: curr.label, value: curr.percentage });
  }

  const avg = (arr: ScoreEntry[]) => arr.length > 0 ? Math.round(arr.reduce((a, b) => a + b.percentage, 0) / arr.length) : 0;

  return {
    improved_axes: improved,
    worsened_axes: worsened,
    unchanged_axes: unchanged,
    previous_score: avg(previousScores),
    current_score: avg(currentScores),
    previous_date: previousDate,
  };
}

function buildEvolutionBlock(comparison: Omit<EvolutionComparison, "summary_text">): string {
  const lines: string[] = ["═══ COMPARAÇÃO COM DIAGNÓSTICO ANTERIOR ═══"];
  lines.push(`Score médio anterior: ${comparison.previous_score}% | Atual: ${comparison.current_score}%`);
  lines.push(`Data anterior: ${comparison.previous_date}`);

  if (comparison.improved_axes.length > 0) {
    lines.push("\nMELHORARAM:");
    comparison.improved_axes.forEach((a) => lines.push(`  - ${a.label}: ${a.previous}% → ${a.current}% (${a.delta}%)`));
  }
  if (comparison.worsened_axes.length > 0) {
    lines.push("\nPIORARAM:");
    comparison.worsened_axes.forEach((a) => lines.push(`  - ${a.label}: ${a.previous}% → ${a.current}% (+${a.delta}%)`));
  }
  if (comparison.unchanged_axes.length > 0) {
    lines.push("\nINALTERADOS:");
    comparison.unchanged_axes.forEach((a) => lines.push(`  - ${a.label}: ${a.value}%`));
  }

  lines.push(`\nGere "evolutionSummary" direto, sem motivacional, mostrando o que mudou.`);
  return lines.join("\n");
}

// ═══════════════════════════════════════════════════════════════
// PHASE 1: DIAGNOSTIC CORE PROMPT
// ═══════════════════════════════════════════════════════════════

const CORE_SYSTEM_PROMPT = `Você é um analista comportamental de alta precisão. Sua tarefa é gerar um NÚCLEO DIAGNÓSTICO INTERNO — a verdade comportamental estruturada sobre o usuário.

Este núcleo NÃO é o relatório final. É a base de dados diagnóstica que será usada para gerar o relatório.

PRINCÍPIOS:
1. Cada campo deve ser IMPOSSÍVEL de aplicar a outro perfil
2. Revele o que a pessoa NÃO sabe sobre si mesma
3. Baseie TUDO nos dados quantitativos fornecidos
4. Sem amenizar, sem "psicologuês", sem motivacional
5. PROIBIDO: "busque equilíbrio", "tenha consciência", "acredite em si"

REGRA DO CICLO LÓGICO:
O núcleo DEVE conter um CICLO COMPLETO que conecta 5 campos obrigatórios:
  causaProvavel → gatilhoPrincipal → comportamentoAutomatico → justificativaInterna → consequenciaRepetida

Esse ciclo deve formar uma cadeia causal FECHADA:
- A CAUSA gera vulnerabilidade ao GATILHO
- O GATILHO dispara o COMPORTAMENTO AUTOMÁTICO
- O comportamento é sustentado pela JUSTIFICATIVA INTERNA
- A justificativa permite a CONSEQUÊNCIA se repetir
- A consequência REFORÇA a causa original (loop)

Exemplo de ciclo coerente:
- causaProvavel: "Necessidade de aprovação externa instalada por ambiente familiar crítico"
- gatilhoPrincipal: "Quando percebe que alguém pode estar decepcionado com seu desempenho"
- comportamentoAutomatico: "Abandona a tarefa atual e inicia uma nova para gerar resultado visível rápido"
- justificativaInterna: "Se eu entregar algo novo e impressionante, vão perceber meu valor"
- consequenciaRepetida: "Acumula projetos inacabados, gerando mais frustração e confirmando a crença de incapacidade"

Retorne APENAS JSON válido. Sem markdown, sem texto antes ou depois.`;

function buildCoreOutputSchema(): string {
  return `═══ SCHEMA DO NÚCLEO DIAGNÓSTICO ═══

Retorne APENAS este JSON:

{
  "dominantPattern": "nome do padrão dominante (snake_case do eixo)",
  "dominantPatternLabel": "nome legível do padrão dominante",
  "secondaryPattern": "nome do padrão secundário (snake_case)",
  "secondaryPatternLabel": "nome legível do padrão secundário",
  "mainConflict": "descrição do conflito principal entre padrões — como eles se contradizem internamente (2 frases)",
  "maintenancePattern": "como o padrão se mantém ativo — o ciclo que alimenta a repetição (2 frases)",
  "emotionalReactionStyle": "como a pessoa reage emocionalmente sob pressão — padrão de resposta automática (1 frase)",
  "selfSabotageTendency": "a forma específica de autossabotagem — o que a pessoa faz sem perceber que destrói o progresso (2 frases)",
  "decisionMakingStyle": "como a pessoa toma decisões — o viés que domina e como isso gera consequências (1 frase)",
  "primaryLifeImpact": "o impacto mais destrutivo desse padrão na vida real — área + consequência concreta (1 frase)",
  "temperamentReading": "leitura complementar de temperamento — traço dominante e como amplifica o padrão (1 frase)",
  "confidenceLevel": "alta | media | baixa — baseado em consistência e contradições das respostas",
  "selfDeceptionIndex": 0-100,
  "inconsistencies": ["inconsistência detectada 1", "inconsistência 2"],
  "priorityChangeDirection": "a mudança mais urgente e impactante — ponto de alavanca (1 frase)",
  "corePatternMechanism": "explicação do mecanismo neural/comportamental que instala e mantém o padrão (2 frases)",
  "hiddenMotivation": "o que realmente motiva o comportamento por baixo da superfície — necessidade oculta (1 frase)",

  "causaProvavel": "origem provável do padrão — experiência, ambiente ou crença formadora que instalou a vulnerabilidade (1-2 frases)",
  "gatilhoPrincipal": "situação específica e recorrente que ativa o padrão — contexto + emoção envolvida (1 frase concreta)",
  "comportamentoAutomatico": "o que a pessoa FAZ automaticamente quando o gatilho dispara — ação observável, não sentimento (1 frase)",
  "justificativaInterna": "a narrativa que a pessoa conta para si mesma para justificar o comportamento — a frase mental exata (1 frase entre aspas)",
  "consequenciaRepetida": "o resultado concreto que se repete na vida — o preço real pago pelo padrão (1 frase)"
}

IMPORTANTE: Os 5 campos do ciclo (causaProvavel → gatilhoPrincipal → comportamentoAutomatico → justificativaInterna → consequenciaRepetida) devem formar uma CADEIA CAUSAL FECHADA onde a consequência reforça a causa original.`;
}

// ═══════════════════════════════════════════════════════════════
// PHASE 2: REPORT GENERATION PROMPT (from core)
// ═══════════════════════════════════════════════════════════════

const REPORT_SYSTEM_PROMPT = `Você é um analista comportamental que transforma diagnósticos internos em relatórios claros e impactantes para o usuário.

Você receberá um NÚCLEO DIAGNÓSTICO já processado. Sua tarefa é TRADUZIR esse núcleo em linguagem clara, direta e impactante.

PRINCÍPIOS INEGOCIÁVEIS:
1. Cada frase deve ser IMPOSSÍVEL de aplicar a outro perfil — se serve para qualquer pessoa, está errada
2. O diagnóstico revela algo que a pessoa NÃO sabe — nunca repita o que ela já disse
3. Cada bloco traz INFORMAÇÃO NOVA — zero reformulação do que já foi dito
4. Linguagem direta, precisa, sem rodeios — sem amenizar, sem "psicologuês" vazio
5. PROIBIDO: "busque equilíbrio", "tenha consciência", "acredite em si", "saia da zona de conforto", "pratique autoconhecimento", "talvez", "pode ser que"

REGRA CRÍTICA PARA tarefasEstrategicas:
Gere EXATAMENTE 3 tarefasEstrategicas. Cada uma tem um PAPEL PSICOLÓGICO ESPECÍFICO no processo de transformação:

tarefasEstrategicas[0] → FASE: CONSCIÊNCIA — objetivo: fazer o usuário PERCEBER o padrão em tempo real
  - Ataca o PADRÃO DOMINANTE do núcleo diagnóstico
  - A tarefa deve criar um momento de "flagrar" o padrão acontecendo
  - Não é para mudar ainda, é para VER com clareza o que antes era automático

tarefasEstrategicas[1] → FASE: INTERRUPÇÃO — objetivo: QUEBRAR o comportamento automático
  - Ataca o EIXO COM MAIOR SCORE (%)
  - A tarefa deve criar uma ação que INTERROMPE o ciclo no momento em que ele acontece
  - É o ponto de virada: onde o usuário age diferente do que sempre fez

tarefasEstrategicas[2] → FASE: CONSOLIDAÇÃO — objetivo: criar um NOVO PADRÃO que substitua o antigo
  - Ataca COMPORTAMENTO RECORRENTE das evidências (score ≥ 80)
  - A tarefa deve instalar um comportamento alternativo que se repita
  - É a construção do novo circuito neural — repetição consciente

Cada tarefa DEVE conter:
- "titulo": nome curto e direto da tarefa (máx 8 palavras, sem jargão)
- "fase": OBRIGATÓRIO — "consciencia" | "interrupcao" | "consolidacao"
- "padraoAlvo": nome do padrão específico que essa tarefa ataca
- "objetivo": o que muda concretamente na vida se executar (1 frase, resultado tangível)
- "porque": por que essa tarefa existe — CITE o padrão pelo nome e explique a conexão direta (2 frases máx, linguagem confrontadora)
- "comoExecutar": instruções práticas, passo a passo real (3-4 frases com ações concretas)
- "criterio": como saber que concluiu — indicador observável, não subjetivo (1 frase)
- "gatilho": situação concreta do dia-a-dia onde o padrão aparece (mín 20 caracteres, sem vaguezas)
- "acao": resposta comportamental específica com verbo forte + contexto + tempo

QUALIDADE DO GATILHO:
- CORRETO: "quando estiver adiando uma conversa difícil com alguém do trabalho por medo de rejeição"
- ERRADO: "quando se sentir mal", "em situações difíceis", "quando estiver estressada"

QUALIDADE DA AÇÃO:
- CORRETO: "pare, diga em voz alta 'estou evitando isso por medo, não por estratégia' e envie a mensagem em até 3 minutos"
- ERRADO: "respire fundo", "observe seus padrões", "reflita sobre isso"

Retorne APENAS JSON válido. Sem markdown, sem texto antes ou depois.`;

function buildReportOutputSchema(template: ReportTemplate | null): string {
  const schema: Record<string, string> = {
    profileName: '"nome do perfil comportamental"',
    combinedTitle: '"título que captura o padrão central"',
    mentalState: '"estado mental atual em 1 frase"',
    corePain: '"dor central — causa raiz, não o sintoma"',
    mechanism: '"mecanismo de como o padrão se instala"',
    contradiction: '"contradição interna em 1 frase"',
    direction: '"direção de mudança"',
    keyUnlockArea: '"área chave de desbloqueio"',
    blockingPoint: '"ponto de travamento"',
    triggers: '["gatilho concreto 1", "gatilho 2", "gatilho 3"]',
    mentalTraps: '["armadilha 1", "armadilha 2"]',
    selfSabotageCycle: '["passo 1", "passo 2", "passo 3", "passo 4"]',
    lifeImpact: '[{"pillar": "área", "impact": "impacto concreto"}]',
    whatNotToDo: '["não fazer 1", "não fazer 2"]',
    exitStrategy: '["passo 1", "passo 2", "passo 3"]',
    tarefasEstrategicas: `[
      {"titulo": "nome curto", "fase": "consciencia", "padraoAlvo": "nome do padrão dominante", "objetivo": "resultado tangível", "porque": "conexão direta citando o padrão pelo nome", "comoExecutar": "passo a passo prático", "criterio": "indicador observável", "gatilho": "situação do PADRÃO DOMINANTE", "acao": "verbo + contexto + tempo"},
      {"titulo": "nome curto", "fase": "interrupcao", "padraoAlvo": "nome do eixo mais alto", "objetivo": "resultado", "porque": "conexão direta", "comoExecutar": "passo a passo", "criterio": "indicador", "gatilho": "situação do EIXO MAIS ALTO", "acao": "verbo + contexto + tempo"},
      {"titulo": "nome curto", "fase": "consolidacao", "padraoAlvo": "nome do comportamento recorrente", "objetivo": "resultado", "porque": "conexão direta", "comoExecutar": "passo a passo", "criterio": "indicador", "gatilho": "comportamento das EVIDÊNCIAS (score ≥ 80)", "acao": "verbo + contexto + tempo"}
    ]`,
    evolutionSummary: '"comparação com diagnóstico anterior (vazio se não houver)"',
    summary: '"resumo geral em 2 frases"',
    impact: '"impacto na vida em 1 frase"',
    cicloLogico: `{
      "causa": "origem do padrão — derivada de causaProvavel do núcleo",
      "gatilho": "situação que ativa — derivada de gatilhoPrincipal do núcleo",
      "comportamento": "ação automática — derivada de comportamentoAutomatico do núcleo",
      "justificativa": "narrativa interna — derivada de justificativaInterna do núcleo",
      "consequencia": "resultado repetido — derivada de consequenciaRepetida do núcleo"
    }`,
  };

  // ─── STORYBOARD MODE: inject slots from acts ───
  if (template?.storyboard?.acts?.length) {
    for (const act of template.storyboard.acts) {
      for (const slot of act.slots) {
        if (!slot.enabled) continue;
        if (schema[slot.key]) continue;
        const formatHint = slot.format === "list" ? " (array de strings)" :
                           slot.format === "cards" ? " (array de objetos)" :
                           slot.format === "quote" ? " (frase citável)" :
                           slot.format === "alert" ? " (alerta direto)" : "";
        schema[slot.key] = `"${slot.label} — máx ${slot.maxSentences} frases${formatHint}"`;
      }
    }
  }
  // ─── LEGACY MODE: flat sections ───
  else if (template?.sections) {
    for (const section of template.sections) {
      if (schema[section.key]) continue;
      const max = section.maxSentences ?? section.maxSize ?? 2;
      const label = section.label || section.name || section.key;
      const typeHint = section.contentType === "list" ? " (array de strings)" :
                       section.contentType === "table" ? ' (array de objetos)' : "";
      schema[section.key] = `"${label} — máx ${max} frases${typeHint}"`;
    }
  }

  const fieldLines = Object.entries(schema).map(([k, v]) => `  "${k}": ${v}`).join(",\n");
  let output = `═══ SCHEMA DE SAÍDA ═══\n\nRetorne APENAS este JSON:\n\n{\n${fieldLines}\n}`;

  // ─── STORYBOARD: per-act instructions ───
  if (template?.storyboard?.acts?.length) {
    for (const act of template.storyboard.acts) {
      const enabledSlots = act.slots.filter((s) => s.enabled);
      if (enabledSlots.length === 0) continue;

      output += `\n\n═══ ${act.title.toUpperCase()} ═══`;
      output += `\nObjetivo: ${act.subtitle}`;
      output += `\nTom: ${act.tone}`;

      for (const slot of enabledSlots) {
        const formatTag = `[${slot.format.toUpperCase()}]`;
        output += `\n\n"${slot.key}" ${formatTag}: "${slot.label}" — máx ${slot.maxSentences} frases`;
        if (slot.instruction?.trim()) output += `\n  → ${slot.instruction.trim()}`;
        if (slot.example?.trim()) output += `\n  EXEMPLO: ${slot.example.trim()}`;
      }
    }

    if (template.storyboard.rules) {
      const rules = template.storyboard.rules;
      output += `\n\n═══ REGRAS DE COMPOSIÇÃO ═══`;
      if (rules.maxTotalWords) output += `\n- LIMITE TOTAL: ${rules.maxTotalWords} palavras`;
      if (rules.proportions) {
        output += `\n- PROPORÇÃO: Espelho ${rules.proportions.espelho}% | Confronto ${rules.proportions.confronto}% | Direção ${rules.proportions.direcao}%`;
      }
      if (rules.narrativeVoice) output += `\n- VOZ NARRATIVA: ${rules.narrativeVoice}`;
      if (rules.forbiddenTerms?.length) output += `\n- PROIBIDO: ${rules.forbiddenTerms.map((t) => `"${t}"`).join(", ")}`;
      if (rules.mandatoryElements?.length) output += `\n- OBRIGATÓRIO incluir: ${rules.mandatoryElements.join(", ")}`;
    }
  }
  // ─── LEGACY: section-specific instructions ───
  else if (template?.sections && template.sections.length > 0) {
    output += "\n\n═══ INSTRUÇÕES POR SEÇÃO ═══";
    for (const s of template.sections) {
      const max = s.maxSentences ?? s.maxSize ?? 2;
      const label = s.label || s.name || s.key;
      const tags = [
        s.required ? "[OBRIGATÓRIO]" : "[OPCIONAL]",
        s.contentType ? `[${s.contentType}]` : "",
        s.emotionalWeight ? `[tom: ${s.emotionalWeight}]` : "",
      ].filter(Boolean).join(" ");

      output += `\n\n"${s.key}" ${tags}: "${label}" — máx ${max} frases`;
      if (s.aiInstructions?.trim()) output += `\n  → ${s.aiInstructions.trim()}`;
      if (s.exampleOutput?.trim()) output += `\n  EXEMPLO: ${s.exampleOutput.trim()}`;
    }
  }

  output += `\n\nPESOS EMOCIONAIS:
- impacto: forte e revelador — surpresa e reconhecimento
- validação: empático — leitor se sente compreendido
- desconforto: provocativo — incômodo que motiva mudança
- esperança: construtivo — caminho claro e acessível
- neutro: informativo — dados sem carga emocional`;

  return output;
}

function buildPhase2UserPrompt(
  core: DiagnosticCore,
  dataBlock: string,
  prompts: PromptRecord[],
  template: ReportTemplate | null,
  evolutionBlock?: string,
  userContext?: string,
): string {
  const sections: string[] = [];

  if (userContext) sections.push(userContext);

  // Inject the diagnostic core as the primary truth
  sections.push(`═══ NÚCLEO DIAGNÓSTICO (VERDADE PRINCIPAL — USE COMO BASE) ═══

PADRÃO DOMINANTE: ${core.dominantPatternLabel} (${core.dominantPattern})
PADRÃO SECUNDÁRIO: ${core.secondaryPatternLabel} (${core.secondaryPattern})
CONFLITO PRINCIPAL: ${core.mainConflict}
PADRÃO DE MANUTENÇÃO: ${core.maintenancePattern}
ESTILO DE REAÇÃO EMOCIONAL: ${core.emotionalReactionStyle}
TENDÊNCIA DE AUTOSSABOTAGEM: ${core.selfSabotageTendency}
TOMADA DE DECISÃO: ${core.decisionMakingStyle}
IMPACTO PRINCIPAL NA VIDA: ${core.primaryLifeImpact}
LEITURA DE TEMPERAMENTO: ${core.temperamentReading}
CONFIABILIDADE: ${core.confidenceLevel}
ÍNDICE DE AUTOENGANO: ${core.selfDeceptionIndex}%
INCONSISTÊNCIAS: ${core.inconsistencies.length > 0 ? core.inconsistencies.join(" | ") : "nenhuma significativa"}
DIREÇÃO DE MUDANÇA: ${core.priorityChangeDirection}
MECANISMO CENTRAL: ${core.corePatternMechanism}
MOTIVAÇÃO OCULTA: ${core.hiddenMotivation}

═══ CICLO LÓGICO DO PADRÃO (cadeia causal fechada) ═══
CAUSA PROVÁVEL: ${core.causaProvavel}
GATILHO PRINCIPAL: ${core.gatilhoPrincipal}
COMPORTAMENTO AUTOMÁTICO: ${core.comportamentoAutomatico}
JUSTIFICATIVA INTERNA: ${core.justificativaInterna}
CONSEQUÊNCIA REPETIDA: ${core.consequenciaRepetida}

REGRA: Todos os textos do relatório devem ser DERIVADOS deste núcleo e do ciclo lógico. O ciclo deve ser visível no relatório — o usuário precisa enxergar a cadeia causa→gatilho→comportamento→justificativa→consequência. Não invente informações que contradigam o diagnóstico acima.`);

  sections.push(dataBlock);

  if (evolutionBlock) sections.push(evolutionBlock);

  // Inject admin prompts in order
  const promptOrder: [string, string][] = [
    ["interpretation", "INSTRUÇÕES DE ANÁLISE"],
    ["diagnosis", "INSTRUÇÕES DE DIAGNÓSTICO"],
    ["profile", "INSTRUÇÕES DE PERFIL"],
    ["core_pain", "INSTRUÇÕES DE DOR CENTRAL"],
    ["triggers", "INSTRUÇÕES DE GATILHOS"],
    ["direction", "INSTRUÇÕES DE DIREÇÃO"],
    ["restrictions", "RESTRIÇÕES ABSOLUTAS"],
  ];

  const promptMap: Record<string, string> = {};
  prompts.forEach((p) => { promptMap[p.prompt_type] = p.content; });

  for (const [key, title] of promptOrder) {
    if (promptMap[key]?.trim()) {
      sections.push(`═══ ${title} ═══\n${promptMap[key]}`);
    }
  }

  // Output rules
  if (template?.output_rules) {
    const rules = template.output_rules;
    const ruleLines: string[] = [];
    if (rules.tone) ruleLines.push(`- TOM: ${rules.tone}`);
    if (rules.maxSentencesPerBlock) ruleLines.push(`- MÁX ${rules.maxSentencesPerBlock} frases/bloco`);
    if (rules.repetitionProhibited) ruleLines.push(`- REPETIÇÃO PROIBIDA entre seções`);
    if (rules.forbiddenLanguage?.length) ruleLines.push(`- PROIBIDO: ${rules.forbiddenLanguage.map((t) => `"${t}"`).join(", ")}`);
    if (rules.emotionalArchitecture?.trim()) {
      ruleLines.push(`\n═══ ARQUITETURA EMOCIONAL ═══\n${rules.emotionalArchitecture.trim()}\nSiga essa jornada emocional na ordem de cada seção.`);
    }
    if (ruleLines.length > 0) {
      sections.push(`═══ REGRAS DE SAÍDA ═══\n${ruleLines.join("\n")}`);
    }
  }

  sections.push(buildReportOutputSchema(template));

  return sections.join("\n\n");
}

// ═══════════════════════════════════════════════════════════════
// MODULE 4: ACTION VALIDATION (tarefasEstrategicas)
// ═══════════════════════════════════════════════════════════════

const FORBIDDEN_STARTS = new Set([
  "respire", "observe", "reflita", "tenha consciencia", "mude seu",
  "preste atencao", "tente melhorar", "busque ajuda", "aceite",
  "seja mais", "tente ser", "procure entender", "procure perceber",
  "tome consciencia", "pense sobre", "considere",
  "lembre-se", "permita-se", "abra-se", "confie", "acredite",
  "mantenha a calma", "fique tranquil", "nao se preocupe",
  "tenha paciencia", "cuide de", "valorize", "pratique",
]);

const VAGUE_TRIGGERS = [
  "quando se sentir mal", "em situacoes dificeis", "quando estiver estressad",
  "quando sentir desconforto", "em momentos de crise", "quando tiver problema",
  "quando se sentir insegur", "em situacoes de estresse", "quando sentir ansiedade",
  "quando se sentir trist", "quando ficar nervos", "quando sentir medo",
  "quando se sentir sobrecarregad", "em momentos dificeis", "quando tiver duvida",
  "quando se sentir frustad", "quando sentir raiva", "quando estiver confus",
  "em situacoes de pressao", "quando se sentir vulneravel",
];

const STRONG_VERBS = new Set([
  "pare", "interrompa", "responda", "envie", "entregue", "diga", "faca",
  "anote", "corte", "recuse", "finalize", "publique", "apague", "reescreva", "bloqueie",
  "cronometre", "defina", "assuma", "avise", "saia", "volte", "retome", "cancele",
  "feche", "abra", "grave", "marque", "combine", "delegue", "pergunte", "exponha",
  "escreva", "liste", "elimine", "substitua", "confronte", "declare", "mude",
]);

const TIME_REGEX = /\b(agora|hoje|amanh[ãa]|imediatamente|na hora|assim que|antes de|depois de|durante|em at[eé]|dentro de|por \d+|por [a-z]+ minutos?|por [a-z]+ horas?|\d+\s*(minuto|minutos|hora|horas|dia|dias))\b/i;

const STOPWORDS = new Set([
  "quando", "voce", "para", "com", "sem", "sobre", "porque", "como", "isso",
  "essa", "esse", "este", "esta", "mais", "menos", "muito", "pouco", "uma", "um",
  "dos", "das", "nos", "nas", "por", "que", "seu", "sua", "seus", "suas",
  "esta", "estar", "ficar", "depois", "antes", "durante", "entao", "ainda",
  "mesmo", "toda", "todo", "cada", "algo", "onde", "entre", "desde", "apenas", "sempre",
]);

function norm(text: string): string {
  return text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
}

function tokenize(text: string): string[] {
  return norm(text).split(/[^a-z0-9]+/).filter((t) => t.length >= 4 && !STOPWORDS.has(t));
}

function buildAnchorTokens(parts: (string | null | undefined)[]): Set<string> {
  const tokens = new Set<string>();
  parts.filter(Boolean).forEach((p) => {
    tokenize(p as string).forEach((t) => tokens.add(t));
    const snakeWords = (p as string).split(/[_\\s-]+/).map((w) => norm(w)).filter((w) => w.length >= 4 && !STOPWORDS.has(w));
    snakeWords.forEach((t) => tokens.add(t));
  });
  return tokens;
}

interface ValidationContext {
  dominant: { tokens: Set<string>; ref: string };
  topAxis: { tokens: Set<string>; ref: string };
  evidence: { tokens: Set<string>; ref: string };
}

function buildValidationContext(
  dominant: ScoreEntry,
  sortedScores: ScoreEntry[],
  answers: StructuredAnswer[] = [],
): ValidationContext & { hasRealAnswers: boolean } {
  const topAxis = sortedScores[0] ?? dominant;
  const hasRealAnswers = answers.length > 0;

  const getTopAnswers = (axisKey?: string, minScore = 65, limit = 3) =>
    [...answers]
      .filter((a) => (a.mappedScore ?? 0) >= minScore && (!axisKey || a.axes.includes(axisKey)))
      .sort((a, b) => (b.mappedScore ?? 0) - (a.mappedScore ?? 0))
      .slice(0, limit);

  const domEvidence = getTopAnswers(dominant.key);
  const topEvidence = getTopAnswers(topAxis.key);
  const strongEvidence = getTopAnswers(undefined, 80, 1)[0] || getTopAnswers(undefined, 65, 1)[0];

  const allScoreTokens = !hasRealAnswers
    ? sortedScores.flatMap((s) => [s.key, s.label])
    : [];

  return {
    hasRealAnswers,
    dominant: {
      ref: domEvidence[0]?.questionText || dominant.label || dominant.key,
      tokens: buildAnchorTokens([dominant.key, dominant.label, ...allScoreTokens, ...domEvidence.flatMap((a) => [a.questionText, a.chosenOption])]),
    },
    topAxis: {
      ref: topEvidence[0]?.questionText || topAxis.label || topAxis.key,
      tokens: buildAnchorTokens([topAxis.key, topAxis.label, ...allScoreTokens, ...topEvidence.flatMap((a) => [a.questionText, a.chosenOption])]),
    },
    evidence: {
      ref: strongEvidence ? `${strongEvidence.questionText} | ${strongEvidence.chosenOption || strongEvidence.value}` : dominant.label || dominant.key,
      tokens: buildAnchorTokens(strongEvidence ? [strongEvidence.questionText, strongEvidence.chosenOption] : [dominant.key, dominant.label, ...allScoreTokens]),
    },
  };
}

function hasMatch(text: string, anchors: Set<string>): boolean {
  if (anchors.size === 0) return true;
  return tokenize(text).some((t) => anchors.has(t));
}

function validateAction(
  index: number,
  gatilho: string,
  acao: string,
  ctx: ValidationContext & { hasRealAnswers?: boolean },
): { pass: boolean; reason?: string } {
  const g = norm(gatilho.replace(/^quando\s+/i, "").trim());
  const a = norm(acao.replace(/^→\s*/i, "").trim());

  if (g.length < 20) return { pass: false, reason: `action_${index + 1}:trigger_too_short` };
  if (g.split(" ").length < 4) return { pass: false, reason: `action_${index + 1}:trigger_too_generic` };
  for (const vague of VAGUE_TRIGGERS) {
    if (g.includes(norm(vague))) return { pass: false, reason: `action_${index + 1}:vague_trigger` };
  }

  for (const forbidden of FORBIDDEN_STARTS) {
    if (a.startsWith(norm(forbidden))) return { pass: false, reason: `action_${index + 1}:forbidden_start` };
  }
  if (a.length < 25) return { pass: false, reason: `action_${index + 1}:action_too_short` };
  if (a.split(" ").length < 5) return { pass: false, reason: `action_${index + 1}:action_too_simple` };
  if (!tokenize(acao).some((t) => STRONG_VERBS.has(t))) {
    return { pass: false, reason: `action_${index + 1}:no_strong_verb` };
  }
  if (!TIME_REGEX.test(acao)) {
    return { pass: false, reason: `action_${index + 1}:no_time_condition` };
  }

  if (ctx.hasRealAnswers !== false) {
    const combined = `${g} ${a}`;
    const target = index === 0 ? ctx.dominant : index === 1 ? ctx.topAxis : ctx.evidence;
    if (!hasMatch(combined, target.tokens)) {
      return { pass: false, reason: `action_${index + 1}:no_diagnostic_link` };
    }
  }

  return { pass: true };
}

function validateTarefasEstrategicas(
  raw: any[],
  ctx: ValidationContext,
): { actions: any[]; errors: string[] } {
  const errors: string[] = [];
  if (!Array.isArray(raw) || raw.length !== 3) {
    errors.push(`count:${raw?.length ?? 0}`);
    return { actions: [], errors };
  }

  const validated: any[] = [];
  const seen = new Set<string>();
  const expectedFases = ["consciencia", "interrupcao", "consolidacao"];

  for (let i = 0; i < raw.length; i++) {
    const item = raw[i];
    if (!item?.gatilho || !item?.acao) {
      errors.push(`action_${i + 1}:missing_fields`);
      continue;
    }

    // Validate fase
    if (!item.fase || !expectedFases.includes(norm(item.fase))) {
      errors.push(`action_${i + 1}:invalid_fase`);
    }

    const gatilho = item.gatilho.replace(/^quando\s+/i, "").trim().replace(/[.\s]+$/, "");
    const acao = item.acao.replace(/^→\s*/i, "").trim().replace(/[.\s]+$/, "");
    const key = `${norm(gatilho)}::${norm(acao)}`;
    if (seen.has(key)) { errors.push(`action_${i + 1}:duplicate`); continue; }
    seen.add(key);

    const check = validateAction(i, gatilho, acao, ctx);
    if (!check.pass) {
      console.log(`[pipeline] tarefa ${i + 1} REJECTED: ${check.reason} | gatilho: "${gatilho.slice(0, 60)}" | acao: "${acao.slice(0, 60)}"`);
      errors.push(check.reason!);
      continue;
    }

    // Validate required fields
    const requiredFields = ["titulo", "fase", "padraoAlvo", "objetivo", "porque", "comoExecutar", "criterio"];
    const missing = requiredFields.filter(f => !item[f] || (typeof item[f] === "string" && item[f].trim().length < 5));
    if (missing.length > 0) {
      errors.push(`action_${i + 1}:missing_detail_fields:${missing.join(",")}`);
    }

    validated.push({
      titulo: item.titulo || "",
      fase: item.fase || expectedFases[i],
      padraoAlvo: item.padraoAlvo || "",
      objetivo: item.objetivo || "",
      porque: item.porque || "",
      comoExecutar: item.comoExecutar || "",
      criterio: item.criterio || "",
      gatilho,
      acao,
    });
  }

  console.log(`[pipeline] tarefasEstrategicas: ${raw.length} → ${validated.length} approved`);
  return { actions: validated, errors };
}

// ═══════════════════════════════════════════════════════════════
// MODULE 5: RESULT NORMALIZER
// ═══════════════════════════════════════════════════════════════

function countSentences(text: string): number {
  if (!text || typeof text !== "string") return 0;
  return text.split(/[.!?]+/).filter((s) => s.trim().length > 5).length;
}

function trimSentences(text: string, max: number): string {
  if (!text || max <= 0) return text;
  const sentences = text.match(/[^.!?]+[.!?]+/g);
  if (!sentences || sentences.length <= max) return text;
  return sentences.slice(0, max).join("").trim();
}

function normalizeResult(
  result: Record<string, unknown>,
  dominant: ScoreEntry,
  sortedScores: ScoreEntry[],
  answers: StructuredAnswer[] = [],
  template: ReportTemplate | null = null,
  diagnosticCore: DiagnosticCore | null = null,
): Record<string, unknown> {
  // Ensure arrays
  for (const f of ["triggers", "mentalTraps", "selfSabotageCycle", "whatNotToDo", "exitStrategy"]) {
    if (!Array.isArray(result[f])) result[f] = [];
  }
  if (!Array.isArray(result.lifeImpact)) result.lifeImpact = [];

  // Merge legacy duplicates
  const legacyMerge: [string, string, (v: unknown) => unknown][] = [
    ["gatilhos", "triggers", (v) => v],
    ["impactoPorArea", "lifeImpact", (v) => Array.isArray(v) ? (v as any[]).map((i: any) => ({ pillar: i.area || i.pillar || "", impact: i.impacto || i.impact || "" })) : v],
    ["corrigirPrimeiro", "direction", (v) => v],
    ["acaoInicial", "focoMudanca", (v) => v],
  ];
  for (const [old, canonical, transform] of legacyMerge) {
    if (result[old] && (!result[canonical] || (Array.isArray(result[canonical]) && (result[canonical] as any[]).length === 0) || (typeof result[canonical] === "string" && !(result[canonical] as string)))) {
      result[canonical] = transform(result[old]);
    }
    delete result[old];
  }

  // pararDeFazer → whatNotToDo
  if (result.pararDeFazer) {
    const arr = typeof result.pararDeFazer === "string" ? [result.pararDeFazer] : Array.isArray(result.pararDeFazer) ? result.pararDeFazer : [];
    if (arr.length > 0 && (!Array.isArray(result.whatNotToDo) || (result.whatNotToDo as any[]).length === 0)) {
      result.whatNotToDo = arr;
    }
    delete result.pararDeFazer;
  }

  // Validate tarefasEstrategicas (new name, replaces microAcoes)
  const rawTarefas = Array.isArray(result.tarefasEstrategicas) ? result.tarefasEstrategicas as any[] : [];
  // Also check legacy microAcoes
  const rawMicro = Array.isArray(result.microAcoes) ? result.microAcoes as any[] : [];
  const actionsToValidate = rawTarefas.length > 0 ? rawTarefas : rawMicro;

  const ctx = buildValidationContext(dominant, sortedScores, answers);
  const validatedActions = validateTarefasEstrategicas(actionsToValidate, ctx);
  result.tarefasEstrategicas = validatedActions.actions;
  // Keep legacy microAcoes for backward compatibility
  result.microAcoes = validatedActions.actions.map((t: any) => ({ gatilho: t.gatilho, acao: t.acao }));
  result.tarefasValidation = {
    dominantPatternReference: ctx.dominant.ref,
    topAxisReference: ctx.topAxis.ref,
    evidenceReference: ctx.evidence.ref,
    errors: validatedActions.errors,
  };

  // Inject diagnostic core data
  if (diagnosticCore) {
    result.diagnosticCore = diagnosticCore;
  }

  // Ensure string fields
  const stringFields = [
    "profileName", "combinedTitle", "perfilComportamental", "diagnosis",
    "chamaAtencao", "padraoRepetido", "corePain", "comoAparece",
    "blindSpot", "mentalCommand", "futureConsequence", "evolutionSummary",
    "summary", "mechanism", "contradiction", "impact", "direction",
    "keyUnlockArea", "criticalDiagnosis", "mentalState", "blockingPoint",
    "focoMudanca", "leituraRapida",
  ];
  for (const f of stringFields) {
    if (typeof result[f] !== "string") result[f] = "";
  }
  if (!result.combinedTitle) result.combinedTitle = dominant.label || "";

  // Trim sections exceeding maxSentences
  const trimmed: string[] = [];
  const violations: string[] = [];

  if (template?.storyboard?.acts?.length) {
    for (const act of template.storyboard.acts) {
      for (const slot of act.slots) {
        if (!slot.enabled || slot.maxSentences <= 0) continue;
        const val = result[slot.key];
        if (typeof val !== "string" || !val) continue;
        if (countSentences(val) > slot.maxSentences) {
          violations.push(`${slot.label}: ${countSentences(val)}/${slot.maxSentences}`);
          result[slot.key] = trimSentences(val, slot.maxSentences);
          trimmed.push(slot.key);
        }
      }
    }
  } else if (template?.sections) {
    for (const section of template.sections) {
      const max = section.maxSentences ?? section.maxSize ?? 0;
      if (max <= 0) continue;
      const val = result[section.key];
      if (typeof val !== "string" || !val) continue;
      if (countSentences(val) > max) {
        violations.push(`${section.label || section.key}: ${countSentences(val)}/${max}`);
        result[section.key] = trimSentences(val, max);
        trimmed.push(section.key);
      }
    }
  }
  if (violations.length > 0) console.log(`[pipeline] trimmed: ${violations.join(", ")}`);
  result._sectionTrimming = { trimmed, violations };

  // Quantitative anchor
  result._quantitativeAnchor = {
    topAxis: sortedScores[0]?.label || "",
    topPercentage: sortedScores[0]?.percentage || 0,
    secondaryAxes: sortedScores.slice(1, 3).map((s) => ({ label: s.label, percentage: s.percentage })),
  };

  return result;
}

// ═══════════════════════════════════════════════════════════════
// MODULE 6: DATA FETCHER (parallel queries)
// ═══════════════════════════════════════════════════════════════

async function fetchAllData(
  adminClient: ReturnType<typeof createClient>,
  userClient: ReturnType<typeof createClient>,
  userId: string,
  testModuleId: string,
) {
  const [promptsRes, templateRes, profileRes, previousRes, testConfigRes, globalConfigRes] = await Promise.all([
    adminClient.from("test_prompts").select("prompt_type, title, content").eq("test_id", testModuleId).eq("is_active", true),
    adminClient.from("report_templates").select("sections, output_rules").eq("test_id", testModuleId).maybeSingle(),
    userClient.from("profiles").select("name, age").eq("user_id", userId).maybeSingle(),
    adminClient
      .from("diagnostic_sessions")
      .select("id, completed_at, diagnostic_results(all_scores)")
      .eq("user_id", userId)
      .eq("test_module_id", testModuleId)
      .not("completed_at", "is", null)
      .order("completed_at", { ascending: false })
      .limit(2),
    adminClient.from("test_ai_config").select("use_global_defaults, ai_enabled, temperature, max_tokens").eq("test_id", testModuleId).maybeSingle(),
    adminClient.from("global_ai_config").select("ai_model, temperature, max_tokens, system_prompt").limit(1).maybeSingle(),
  ]);

  return { promptsRes, templateRes, profileRes, previousRes, testConfigRes, globalConfigRes };
}

// ═══════════════════════════════════════════════════════════════
// MODULE 7: AI CALLER
// ═══════════════════════════════════════════════════════════════

async function callAI(
  systemPrompt: string,
  userPrompt: string,
  model: string,
  temperature: number,
  maxTokens: number,
  apiKey: string,
): Promise<{ result: Record<string, unknown> | null; error?: string }> {
  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature,
      max_tokens: maxTokens,
    }),
  });

  if (!response.ok) {
    const status = response.status;
    await response.text();
    if (status === 429) return { result: null, error: "rate_limit" };
    if (status === 402) return { result: null, error: "credits_exhausted" };
    return { result: null, error: `ai_error_${status}` };
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || "";

  try {
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, content];
    return { result: JSON.parse(jsonMatch[1]!.trim()) };
  } catch {
    console.error("[pipeline] JSON parse error:", content.substring(0, 300));
    return { result: null, error: "parse_error" };
  }
}

// ═══════════════════════════════════════════════════════════════
// MAIN HANDLER — 2-PHASE PIPELINE
// ═══════════════════════════════════════════════════════════════

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return errorResponse("Não autorizado", 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) return fallbackResponse();

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) return errorResponse("Não autorizado", 401);
    if (!checkRateLimit(user.id)) return errorResponse("Limite de requisições. Aguarde um minuto.", 429);

    const body: RequestBody = await req.json();
    const { test_module_id, scores, slug, refine_level, answers: structuredAnswers } = body;

    if (!test_module_id || !scores || !Array.isArray(scores)) {
      return errorResponse("Dados inválidos", 400);
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // ─── FETCH ALL DATA IN PARALLEL ───
    const { promptsRes, templateRes, profileRes, previousRes, testConfigRes, globalConfigRes } = 
      await fetchAllData(adminClient, userClient, user.id, test_module_id);

    if (promptsRes.error) {
      console.error("Prompts error:", promptsRes.error);
      return errorResponse("Erro ao carregar configuração", 500);
    }
    if (!promptsRes.data?.length) return fallbackResponse();

    // Parse template
    let reportTemplate: ReportTemplate | null = null;
    if (templateRes.data) {
      const rawSections = templateRes.data.sections;
      const rawRules = templateRes.data.output_rules;

      let storyboard: StoryboardTemplate | undefined;
      let legacySections: TemplateSection[] = [];

      if (rawSections && typeof rawSections === "object" && !Array.isArray(rawSections)) {
        const obj = rawSections as Record<string, unknown>;
        if (Array.isArray(obj.acts)) {
          storyboard = {
            acts: obj.acts as StoryboardAct[],
            rules: (obj.rules || {}) as CompositionRules,
          };
          console.log(`[pipeline] Storyboard detected: ${storyboard.acts.length} acts, ${storyboard.acts.reduce((n, a) => n + a.slots.filter((s) => s.enabled).length, 0)} active slots`);
        }
      } else if (Array.isArray(rawSections)) {
        legacySections = rawSections as TemplateSection[];
      }

      reportTemplate = {
        sections: legacySections,
        output_rules: (rawRules && typeof rawRules === "object") ? rawRules as OutputRules : {},
        storyboard,
      };
    }

    // Prepare scores
    const sortedScores = [...scores]
      .map((s) => ({ ...s, percentage: Math.min(100, Math.max(0, s.percentage)) }))
      .sort((a, b) => b.percentage - a.percentage);
    const dominant = sortedScores[0];

    // ─── EVOLUTION COMPARISON ───
    let evolutionData: Omit<EvolutionComparison, "summary_text"> | null = null;
    let evolutionBlock: string | undefined;
    try {
      if (previousRes.data?.length) {
        const prevSession = previousRes.data.find((s: any) => {
          const results = s.diagnostic_results;
          return Array.isArray(results) && results.length > 0 && Array.isArray(results[0]?.all_scores) && results[0].all_scores.length > 0;
        });
        if (prevSession) {
          const prevResults = Array.isArray(prevSession.diagnostic_results) ? prevSession.diagnostic_results[0] : prevSession.diagnostic_results;
          const prevScores: ScoreEntry[] = (prevResults as any)?.all_scores || [];
          if (prevScores.length > 0) {
            evolutionData = buildEvolutionComparison(sortedScores, prevScores, prevSession.completed_at || "");
            evolutionBlock = buildEvolutionBlock(evolutionData);
          }
        }
      }
    } catch (e) {
      console.error("[pipeline] Evolution error (non-blocking):", e);
    }

    // ─── AI CONFIG ───
    let aiModel = "google/gemini-3-flash-preview";
    let aiTemp = 0.55;
    let aiMaxTokens = 8000;

    if (globalConfigRes.data?.ai_model) aiModel = globalConfigRes.data.ai_model;
    if (testConfigRes.data && !testConfigRes.data.use_global_defaults) {
      if (testConfigRes.data.temperature != null) aiTemp = Number(testConfigRes.data.temperature);
      if (testConfigRes.data.max_tokens != null) aiMaxTokens = Number(testConfigRes.data.max_tokens);
    } else if (globalConfigRes.data) {
      if (globalConfigRes.data.temperature != null) aiTemp = Number(globalConfigRes.data.temperature);
      if (globalConfigRes.data.max_tokens != null) aiMaxTokens = Number(globalConfigRes.data.max_tokens);
    }

    const profile = profileRes.data;
    const userContext = profile
      ? `Usuário: ${profile.name || "Anônimo"}${profile.age ? `, ${profile.age} anos` : ""}`
      : "Usuário anônimo";

    const dataBlock = buildDataBlock(sortedScores, structuredAnswers || []);

    let globalSystemPrompt = globalConfigRes.data?.system_prompt || "";
    const refineLevel = refine_level ?? 0;
    let refineNote = "";
    if (refineLevel >= 1) {
      refineNote = "\n\nINSTRUÇÃO: A resposta anterior foi genérica. Seja mais específico, use dados reais, cada bloco com informação nova.";
    }

    // ═══════════════════════════════════════════════════════════════
    // PHASE 1: GENERATE DIAGNOSTIC CORE
    // ═══════════════════════════════════════════════════════════════

    console.log(`[pipeline] ═══ PHASE 1: Diagnostic Core | Model: ${aiModel}, Slug: ${slug} ═══`);

    const coreUserPrompt = `${userContext}\n\n${dataBlock}\n\n${buildCoreOutputSchema()}`;
    const coreSystemFull = [globalSystemPrompt, CORE_SYSTEM_PROMPT, refineNote].filter(Boolean).join("\n\n");

    const coreResult = await callAI(coreSystemFull, coreUserPrompt, aiModel, aiTemp, 3500, LOVABLE_API_KEY);

    if (coreResult.error === "rate_limit") return errorResponse("Limite de requisições. Tente novamente.", 429);
    if (coreResult.error === "credits_exhausted") return errorResponse("Créditos de IA esgotados.", 402);

    let diagnosticCore: DiagnosticCore | null = null;

    if (coreResult.result) {
      const r = coreResult.result;
      diagnosticCore = {
        dominantPattern: (r.dominantPattern as string) || dominant.key,
        dominantPatternLabel: (r.dominantPatternLabel as string) || dominant.label,
        secondaryPattern: (r.secondaryPattern as string) || (sortedScores[1]?.key || ""),
        secondaryPatternLabel: (r.secondaryPatternLabel as string) || (sortedScores[1]?.label || ""),
        mainConflict: (r.mainConflict as string) || "",
        maintenancePattern: (r.maintenancePattern as string) || "",
        emotionalReactionStyle: (r.emotionalReactionStyle as string) || "",
        selfSabotageTendency: (r.selfSabotageTendency as string) || "",
        decisionMakingStyle: (r.decisionMakingStyle as string) || "",
        primaryLifeImpact: (r.primaryLifeImpact as string) || "",
        temperamentReading: (r.temperamentReading as string) || "",
        confidenceLevel: (r.confidenceLevel as string) || "media",
        selfDeceptionIndex: typeof r.selfDeceptionIndex === "number" ? r.selfDeceptionIndex : 0,
        inconsistencies: Array.isArray(r.inconsistencies) ? r.inconsistencies as string[] : [],
        priorityChangeDirection: (r.priorityChangeDirection as string) || "",
        corePatternMechanism: (r.corePatternMechanism as string) || "",
        hiddenMotivation: (r.hiddenMotivation as string) || "",
        // Ciclo lógico completo
        causaProvavel: (r.causaProvavel as string) || "",
        gatilhoPrincipal: (r.gatilhoPrincipal as string) || "",
        comportamentoAutomatico: (r.comportamentoAutomatico as string) || "",
        justificativaInterna: (r.justificativaInterna as string) || "",
        consequenciaRepetida: (r.consequenciaRepetida as string) || "",
      };
      console.log(`[pipeline] Core generated: dominant=${diagnosticCore.dominantPatternLabel}, confidence=${diagnosticCore.confidenceLevel}, selfDeception=${diagnosticCore.selfDeceptionIndex}%`);
    } else {
      console.warn(`[pipeline] Core generation failed (${coreResult.error}), proceeding with data-only phase 2`);
    }

    // ═══════════════════════════════════════════════════════════════
    // PHASE 2: GENERATE REPORT FROM CORE
    // ═══════════════════════════════════════════════════════════════

    console.log(`[pipeline] ═══ PHASE 2: Report Generation ═══`);

    let normalized: Record<string, unknown> | null = null;
    const MAX_ATTEMPTS = 4;
    let lastErrors: string[] = [];

    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      const retryContext = attempt > 0
        ? `\n\nATENÇÃO: Tentativa ${attempt + 1}. As tarefasEstrategicas anteriores foram REJEITADAS: ${lastErrors.join(" | ")}. Corrija os problemas.`
        : "";

      const fullSystem = [globalSystemPrompt, REPORT_SYSTEM_PROMPT, refineNote, retryContext].filter(Boolean).join("\n\n");

      // Build phase 2 user prompt — with or without diagnostic core
      let userPrompt: string;
      if (diagnosticCore) {
        userPrompt = buildPhase2UserPrompt(diagnosticCore, dataBlock, promptsRes.data as PromptRecord[], reportTemplate, evolutionBlock, userContext);
      } else {
        // Fallback: build prompt without core (legacy style)
        const sections: string[] = [userContext, dataBlock];
        if (evolutionBlock) sections.push(evolutionBlock);
        const promptMap: Record<string, string> = {};
        (promptsRes.data as PromptRecord[]).forEach((p) => { promptMap[p.prompt_type] = p.content; });
        const promptOrder: [string, string][] = [
          ["interpretation", "INSTRUÇÕES DE ANÁLISE"], ["diagnosis", "INSTRUÇÕES DE DIAGNÓSTICO"],
          ["profile", "INSTRUÇÕES DE PERFIL"], ["core_pain", "INSTRUÇÕES DE DOR CENTRAL"],
          ["triggers", "INSTRUÇÕES DE GATILHOS"], ["direction", "INSTRUÇÕES DE DIREÇÃO"],
          ["restrictions", "RESTRIÇÕES ABSOLUTAS"],
        ];
        for (const [key, title] of promptOrder) {
          if (promptMap[key]?.trim()) sections.push(`═══ ${title} ═══\n${promptMap[key]}`);
        }
        sections.push(buildReportOutputSchema(reportTemplate));
        userPrompt = sections.join("\n\n");
      }

      console.log(`[pipeline] Phase 2 Attempt ${attempt + 1}/${MAX_ATTEMPTS}`);

      const { result, error } = await callAI(fullSystem, userPrompt, aiModel, aiTemp, aiMaxTokens, LOVABLE_API_KEY);

      if (error === "rate_limit") return errorResponse("Limite de requisições. Tente novamente.", 429);
      if (error === "credits_exhausted") return errorResponse("Créditos de IA esgotados.", 402);
      if (!result) {
        if (attempt < MAX_ATTEMPTS - 1) continue;
        return fallbackResponse();
      }

      if (!(result.chamaAtencao || result.diagnosis || result.criticalDiagnosis || result.profileName || result.combinedTitle)) {
        if (attempt < MAX_ATTEMPTS - 1) continue;
        return fallbackResponse();
      }

      normalized = normalizeResult(result, dominant, sortedScores, structuredAnswers || [], reportTemplate, diagnosticCore);

      const tarefaCount = Array.isArray(normalized.tarefasEstrategicas) ? (normalized.tarefasEstrategicas as any[]).length : 0;
      lastErrors = (normalized as any).tarefasValidation?.errors || [];

      console.log(`[pipeline] Phase 2 Attempt ${attempt + 1}: ${tarefaCount}/3 tarefasEstrategicas`);

      if (tarefaCount >= 3) break;

      if (attempt >= MAX_ATTEMPTS - 1) {
        console.warn(`[pipeline] SOFT FAIL: ${tarefaCount}/3 after ${MAX_ATTEMPTS} attempts — proceeding with partial`);
        break;
      }
    }

    if (!normalized) return fallbackResponse();

    // Add evolution data
    if (evolutionData) {
      normalized.evolutionComparison = {
        ...evolutionData,
        summary_text: (typeof normalized.evolutionSummary === "string" && (normalized.evolutionSummary as string).trim()) 
          ? normalized.evolutionSummary as string : "",
      };
    }

    return jsonResponse({ analysis: normalized });
  } catch (e) {
    console.error("pipeline error:", e);
    return errorResponse("Erro interno do servidor", 500);
  }
});
