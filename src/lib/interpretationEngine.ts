/**
 * Interpretation Engine v2
 * 
 * Goes beyond simple score aggregation to detect:
 * - Internal conflicts between opposing patterns
 * - Contradictions between behavior answers and perception answers
 * - Self-deception (high confidence + low execution)
 * - Derived core pain and key unlock area from cross-pattern analysis
 */

import { Answer, PatternScore, InternalConflict, ResponseContradiction, InterpretiveInsight, BehavioralProfile } from '@/types/diagnostic';

interface QuestionMeta {
  id: number;
  axes: string[];
  type?: string;
}

// ──────────────────────────────────────────────
// 1. CONFLICT DETECTION
// ──────────────────────────────────────────────

const CONFLICT_PAIRS: [string, string, string][] = [
  ['paralyzing_perfectionism', 'unstable_execution', 'Exige perfeição mas não sustenta execução — ciclo de paralisia e frustração constante.'],
  ['validation_dependency', 'excessive_self_criticism', 'Busca aprovação externa mas se autocritica impiedosamente — nunca se sente suficiente.'],
  ['functional_overload', 'discomfort_escape', 'Acumula responsabilidades mas foge do desconforto — colapso inevitável por esgotamento.'],
  ['emotional_self_sabotage', 'low_routine_sustenance', 'Sabota emocionalmente e não sustenta rotinas — recomeça do zero repetidamente.'],
  ['paralyzing_perfectionism', 'discomfort_escape', 'Perfeccionismo gera desconforto que leva à fuga — nada é iniciado ou concluído.'],
  ['validation_dependency', 'emotional_self_sabotage', 'Depende de validação mas sabota relações — ciclo de rejeição autoimposta.'],
  ['excessive_self_criticism', 'unstable_execution', 'Autocrítica paralisa a ação — quanto mais se cobra, menos executa.'],
  ['functional_overload', 'low_routine_sustenance', 'Acumula tarefas mas não sustenta rotina — produtividade caótica sem consistência.'],
  // Cross-domain conflicts
  ['meaning_orientation', 'avoidance', 'Busca sentido mas evita confrontar o vazio — propósito superficial por medo.'],
  ['identity_alignment', 'external_pressure', 'Quer alinhamento interno mas cede à pressão externa — vive a identidade dos outros.'],
  ['emotional_engagement', 'internal_conflict', 'Deseja engajamento emocional mas conflito interno bloqueia — sentir vira ameaça.'],
  ['self_expression', 'fulfillment_level', 'Quer se expressar mas não se sente realizado — expressão sem raiz.'],
];

export function detectConflicts(
  scores: Record<string, number>,
  threshold: number = 50
): InternalConflict[] {
  const conflicts: InternalConflict[] = [];

  for (const [a, b, desc] of CONFLICT_PAIRS) {
    const scoreA = scores[a] || 0;
    const scoreB = scores[b] || 0;

    if (scoreA >= threshold && scoreB >= threshold) {
      const avgIntensity = (scoreA + scoreB) / 2;
      const severity: InternalConflict['severity'] =
        avgIntensity >= 75 ? 'critical' : avgIntensity >= 60 ? 'high' : 'moderate';

      conflicts.push({ patternA: a, patternB: b, description: desc, severity });
    }
  }

  return conflicts.sort((a, b) => {
    const order = { critical: 3, high: 2, moderate: 1 };
    return order[b.severity] - order[a.severity];
  });
}

// ──────────────────────────────────────────────
// 2. CONTRADICTION DETECTION
// ──────────────────────────────────────────────

interface AnswersByType {
  likert: { questionId: number; value: number; axes: string[] }[];
  behavior_choice: { questionId: number; value: number; axes: string[] }[];
  frequency: { questionId: number; value: number; axes: string[] }[];
}

function groupAnswersByType(
  answers: Answer[],
  questions: QuestionMeta[]
): AnswersByType {
  const grouped: AnswersByType = { likert: [], behavior_choice: [], frequency: [] };

  answers.forEach(answer => {
    const q = questions.find(qq => qq.id === answer.questionId);
    if (!q) return;
    const type = (q.type || 'likert') as keyof AnswersByType;
    if (grouped[type]) {
      grouped[type].push({ questionId: answer.questionId, value: answer.value, axes: q.axes });
    }
  });

  return grouped;
}

function calculateAxisAvgByType(
  answersOfType: { value: number; axes: string[] }[]
): Record<string, { sum: number; count: number; avg: number }> {
  const data: Record<string, { sum: number; count: number; avg: number }> = {};

  answersOfType.forEach(a => {
    a.axes.forEach(axis => {
      if (!data[axis]) data[axis] = { sum: 0, count: 0, avg: 0 };
      data[axis].sum += a.value;
      data[axis].count += 1;
    });
  });

  Object.values(data).forEach(d => {
    d.avg = d.count > 0 ? (d.sum / d.count / 5) * 100 : 0;
  });

  return data;
}

// Contradiction templates: what they say (perception) vs what they do (behavior)
const CONTRADICTION_RULES: {
  type: string;
  label: string;
  perceptionAxis: string;
  behaviorAxis: string;
  perceptionHigh: boolean; // true = contradiction when perception is HIGH
  behaviorHigh: boolean;   // true = contradiction when behavior is HIGH
  description: string;
}[] = [
  {
    type: 'self_deception',
    label: 'Autoengano',
    perceptionAxis: 'paralyzing_perfectionism', // "I'm a perfectionist" (high self-perception)
    behaviorAxis: 'unstable_execution',          // but behavior shows inconsistency
    perceptionHigh: true,
    behaviorHigh: true,
    description: 'Você se vê como alguém criterioso e exigente, mas seu comportamento real mostra inconsistência na execução. A imagem que você tem de si não corresponde aos resultados que produz.',
  },
  {
    type: 'false_confidence',
    label: 'Falsa confiança',
    perceptionAxis: 'validation_dependency',     // low dependency = "I'm independent"
    behaviorAxis: 'validation_dependency',        // but behavior shows seeking validation
    perceptionHigh: false,
    behaviorHigh: true,
    description: 'Você acredita ser independente nas suas decisões, mas seus comportamentos revelam uma busca constante por aprovação externa. Há uma desconexão entre quem você pensa que é e como age.',
  },
  {
    type: 'hidden_avoidance',
    label: 'Evitação mascarada',
    perceptionAxis: 'functional_overload',       // "I'm always busy" (high)
    behaviorAxis: 'discomfort_escape',            // but behavior shows escape
    perceptionHigh: true,
    behaviorHigh: true,
    description: 'Você mantém uma aparência de produtividade intensa, mas usa a ocupação como escudo para evitar o que realmente importa. Estar ocupado virou seu mecanismo de fuga.',
  },
  {
    type: 'paralyzed_ambition',
    label: 'Ambição paralisada',
    perceptionAxis: 'excessive_self_criticism',  // high self-demand
    behaviorAxis: 'low_routine_sustenance',      // but can't sustain action
    perceptionHigh: true,
    behaviorHigh: true,
    description: 'Você tem padrões altíssimos para si mesmo, mas não consegue sustentar as rotinas necessárias para alcançá-los. A autocrítica devora a energia que deveria ir para a ação.',
  },
  {
    type: 'emotional_disconnect',
    label: 'Desconexão emocional',
    perceptionAxis: 'emotional_self_sabotage',   // low (perceives stability)
    behaviorAxis: 'emotional_self_sabotage',     // but behavior shows sabotage
    perceptionHigh: false,
    behaviorHigh: true,
    description: 'Você se percebe como emocionalmente estável, mas seus padrões de comportamento revelam ciclos de autossabotagem emocional que você não reconhece.',
  },
];

export function detectContradictions(
  answers: Answer[],
  questions: QuestionMeta[],
  overallScores: Record<string, number>
): ResponseContradiction[] {
  const grouped = groupAnswersByType(answers, questions);
  const contradictions: ResponseContradiction[] = [];

  // If no behavior_choice answers, use frequency as behavioral proxy
  const behavioralAnswers = grouped.behavior_choice.length > 0
    ? grouped.behavior_choice
    : grouped.frequency;
  const perceptualAnswers = grouped.likert;

  if (perceptualAnswers.length === 0 || behavioralAnswers.length === 0) {
    return contradictions;
  }

  const perceptionByAxis = calculateAxisAvgByType(perceptualAnswers);
  const behaviorByAxis = calculateAxisAvgByType(behavioralAnswers);

  for (const rule of CONTRADICTION_RULES) {
    const perceptionData = perceptionByAxis[rule.perceptionAxis];
    const behaviorData = behaviorByAxis[rule.behaviorAxis];

    if (!perceptionData || !behaviorData) continue;

    const perceptionAvg = perceptionData.avg;
    const behaviorAvg = behaviorData.avg;

    // Check if contradiction condition is met
    const perceptionMet = rule.perceptionHigh ? perceptionAvg >= 60 : perceptionAvg <= 40;
    const behaviorMet = rule.behaviorHigh ? behaviorAvg >= 60 : behaviorAvg <= 40;

    if (perceptionMet && behaviorMet) {
      const gap = Math.abs(perceptionAvg - behaviorAvg);
      contradictions.push({
        type: rule.type,
        label: rule.label,
        description: rule.description,
        evidence: `Percepção: ${Math.round(perceptionAvg)}% | Comportamento: ${Math.round(behaviorAvg)}% (gap: ${Math.round(gap)}%)`,
      });
    }
  }

  // Also check for cross-type divergence on same axis
  Object.keys(overallScores).forEach(axis => {
    const perc = perceptionByAxis[axis];
    const behav = behaviorByAxis[axis];
    if (!perc || !behav) return;

    const gap = Math.abs(perc.avg - behav.avg);
    if (gap >= 30) {
      const direction = perc.avg > behav.avg
        ? 'Você se percebe mais afetado do que seus comportamentos indicam — possível dramatização.'
        : 'Seus comportamentos revelam mais do padrão do que você reconhece — ponto cego ativo.';

      const alreadyExists = contradictions.find(c => c.type === `axis_gap_${axis}`);
      if (!alreadyExists) {
        contradictions.push({
          type: `axis_gap_${axis}`,
          label: `Divergência em ${axis}`,
          description: direction,
          evidence: `Likert: ${Math.round(perc.avg)}% | Comportamental: ${Math.round(behav.avg)}% (gap: ${Math.round(gap)}%)`,
        });
      }
    }
  });

  return contradictions;
}

// ──────────────────────────────────────────────
// 3. SELF-DECEPTION INDEX & BEHAVIOR-PERCEPTION GAP
// ──────────────────────────────────────────────

export function calculateSelfDeceptionIndex(
  answers: Answer[],
  questions: QuestionMeta[]
): { selfDeceptionIndex: number; behaviorVsPerceptionGap: number } {
  const grouped = groupAnswersByType(answers, questions);

  if (grouped.likert.length === 0 || (grouped.behavior_choice.length === 0 && grouped.frequency.length === 0)) {
    return { selfDeceptionIndex: 0, behaviorVsPerceptionGap: 0 };
  }

  // Calculate average score per axis for each type
  const perceptionByAxis = calculateAxisAvgByType(grouped.likert);
  const behavioralAnswers = [...grouped.behavior_choice, ...grouped.frequency];
  const behaviorByAxis = calculateAxisAvgByType(behavioralAnswers);

  // Find axes that appear in both types
  const commonAxes = Object.keys(perceptionByAxis).filter(k => behaviorByAxis[k]);
  if (commonAxes.length === 0) return { selfDeceptionIndex: 0, behaviorVsPerceptionGap: 0 };

  // Calculate average gap
  let totalGap = 0;
  let deceptionSignals = 0;

  commonAxes.forEach(axis => {
    const percAvg = perceptionByAxis[axis].avg;
    const behavAvg = behaviorByAxis[axis].avg;
    const gap = Math.abs(percAvg - behavAvg);
    totalGap += gap;

    // Self-deception: perception LOW but behavior HIGH (doesn't recognize own pattern)
    if (percAvg < 40 && behavAvg > 60) {
      deceptionSignals += 1;
    }
  });

  const avgGap = totalGap / commonAxes.length;
  const behaviorVsPerceptionGap = Math.min(Math.round(avgGap), 100);

  // Self-deception index: combination of gap size + number of blind spots
  const blindSpotRatio = commonAxes.length > 0 ? deceptionSignals / commonAxes.length : 0;
  const selfDeceptionIndex = Math.min(Math.round((avgGap * 0.6 + blindSpotRatio * 100 * 0.4)), 100);

  return { selfDeceptionIndex, behaviorVsPerceptionGap };
}

// ──────────────────────────────────────────────
// 4. DERIVED CORE PAIN & KEY UNLOCK AREA
// ──────────────────────────────────────────────

const PAIN_MAP: { condition: (scores: Record<string, number>, conflicts: InternalConflict[]) => boolean; pain: string; unlock: string }[] = [
  {
    condition: (s) => (s['emotional_self_sabotage'] || 0) >= 65 && (s['validation_dependency'] || 0) >= 55,
    pain: 'Medo profundo de não ser suficiente — cada conquista precisa de validação para parecer real.',
    unlock: 'Construir uma referência interna de valor que não dependa de resultados ou opiniões.',
  },
  {
    condition: (s) => (s['paralyzing_perfectionism'] || 0) >= 65 && (s['unstable_execution'] || 0) >= 55,
    pain: 'Terror de ser exposto como medíocre — a perfeição é um escudo contra a vulnerabilidade.',
    unlock: 'Aceitar a imperfeição como parte do processo — entregar "bom o suficiente" é um ato de coragem.',
  },
  {
    condition: (s) => (s['functional_overload'] || 0) >= 65 && (s['discomfort_escape'] || 0) >= 55,
    pain: 'Usar a ocupação para não confrontar o vazio — parar significa encarar o que você evita.',
    unlock: 'Criar espaço de desconforto intencional — 15min diários sem produtividade, sem distração.',
  },
  {
    condition: (s) => (s['excessive_self_criticism'] || 0) >= 65 && (s['low_routine_sustenance'] || 0) >= 55,
    pain: 'A autocrítica consome a energia que deveria ir para a ação — quanto mais se cobra, menos faz.',
    unlock: 'Substituir a autocrítica por auto-observação: notar sem julgar, agir sem exigir perfeição.',
  },
  {
    condition: (s, c) => c.length >= 2,
    pain: 'Múltiplos conflitos internos fragmentam sua energia — você está lutando contra si mesmo em várias frentes.',
    unlock: 'Identificar o conflito primário e resolver um de cada vez — priorizar a contradição mais dolorosa.',
  },
  {
    condition: (s) => (s['discomfort_escape'] || 0) >= 70,
    pain: 'Aversão profunda ao desconforto — qualquer fricção gera fuga, mantendo você em zona de conforto permanente.',
    unlock: 'Microexposições diárias: fazer uma coisa desconfortável por dia durante 5 minutos.',
  },
  {
    condition: (s) => (s['low_routine_sustenance'] || 0) >= 70 && (s['unstable_execution'] || 0) >= 60,
    pain: 'Incapacidade de sustentar — você funciona em sprints que esgotam e recomeços que frustram.',
    unlock: 'Reduzir pela metade o que você planeja e dobrar o tempo de manutenção — consistência mínima supera intensidade máxima.',
  },
];

export function deriveCorePainAndUnlock(
  scores: Record<string, number>,
  conflicts: InternalConflict[]
): { derivedCorePain: string; derivedKeyUnlockArea: string } {
  for (const rule of PAIN_MAP) {
    if (rule.condition(scores, conflicts)) {
      return { derivedCorePain: rule.pain, derivedKeyUnlockArea: rule.unlock };
    }
  }

  // Default: use the highest scoring pattern
  const sorted = Object.entries(scores).sort(([, a], [, b]) => b - a);
  const topKey = sorted[0]?.[0] || '';
  const topScore = sorted[0]?.[1] || 0;

  if (topScore >= 60) {
    return {
      derivedCorePain: `Padrão dominante de ${topKey} indica uma dor recorrente que se mantém por repetição inconsciente.`,
      derivedKeyUnlockArea: 'Quebrar o ciclo automático com consciência ativa sobre o momento exato da repetição.',
    };
  }

  return {
    derivedCorePain: 'Sem padrão dominante claro — a dor está dispersa e difusa, dificultando o foco.',
    derivedKeyUnlockArea: 'Identificar qual das suas tendências mais compromete resultados e focar nela por 30 dias.',
  };
}

// ──────────────────────────────────────────────
// 5. INTERPRETIVE SUMMARY
// ──────────────────────────────────────────────

function buildInterpretiveSummary(
  conflicts: InternalConflict[],
  contradictions: ResponseContradiction[],
  selfDeceptionIndex: number,
  behaviorGap: number,
  dominantLabel: string
): string {
  const parts: string[] = [];

  // Self-deception assessment
  if (selfDeceptionIndex >= 60) {
    parts.push(`⚠️ Índice de autoengano elevado (${selfDeceptionIndex}%): existe uma desconexão significativa entre como você se percebe e como realmente se comporta. Isso indica pontos cegos ativos que impedem mudanças reais.`);
  } else if (selfDeceptionIndex >= 35) {
    parts.push(`Índice de autoengano moderado (${selfDeceptionIndex}%): há áreas onde sua percepção não corresponde totalmente ao seu comportamento. Isso é normal, mas merece atenção.`);
  }

  // Behavior gap
  if (behaviorGap >= 25) {
    parts.push(`A divergência entre percepção e comportamento é de ${behaviorGap}%. O que você diz sentir e o que você realmente faz em cenários concretos contam histórias diferentes.`);
  }

  // Conflicts
  if (conflicts.length >= 3) {
    parts.push(`Foram detectados ${conflicts.length} conflitos internos simultâneos. Isso fragmenta severamente sua energia e torna difícil manter qualquer direção por tempo suficiente.`);
  } else if (conflicts.length > 0) {
    const critical = conflicts.filter(c => c.severity === 'critical');
    if (critical.length > 0) {
      parts.push(`Conflito crítico identificado: ${critical[0].description}`);
    } else {
      parts.push(`${conflicts.length} conflito(s) interno(s) detectado(s): forças opostas que se neutralizam e impedem progresso.`);
    }
  }

  // Contradictions
  const meaningfulContradictions = contradictions.filter(c => !c.type.startsWith('axis_gap_'));
  if (meaningfulContradictions.length > 0) {
    parts.push(`Contradição principal: ${meaningfulContradictions[0].label} — ${meaningfulContradictions[0].description}`);
  }

  if (parts.length === 0) {
    parts.push(`Seu padrão dominante de ${dominantLabel} é coerente entre percepção e comportamento. Isso significa que você tem consciência do padrão — o desafio agora é agir diferente.`);
  }

  return parts.join('\n\n');
}

// ──────────────────────────────────────────────
// 6. MAIN ENTRY POINT
// ──────────────────────────────────────────────

export function generateInterpretation(
  answers: Answer[],
  questions: QuestionMeta[],
  allScores: PatternScore[],
  dominantLabel: string
): InterpretiveInsight {
  // Build scores map
  const scoresMap: Record<string, number> = {};
  allScores.forEach(s => { scoresMap[s.key] = s.percentage; });

  // 1. Detect conflicts
  const internalConflicts = detectConflicts(scoresMap);

  // 2. Detect contradictions
  const contradictions = detectContradictions(answers, questions, scoresMap);

  // 3. Calculate self-deception index
  const { selfDeceptionIndex, behaviorVsPerceptionGap } = calculateSelfDeceptionIndex(answers, questions);

  // 4. Derive core pain and unlock area from cross-analysis
  const { derivedCorePain, derivedKeyUnlockArea } = deriveCorePainAndUnlock(scoresMap, internalConflicts);

  // 5. Build interpretive summary
  const interpretiveSummary = buildInterpretiveSummary(
    internalConflicts,
    contradictions,
    selfDeceptionIndex,
    behaviorVsPerceptionGap,
    dominantLabel
  );

  return {
    internalConflicts,
    contradictions,
    derivedCorePain,
    derivedKeyUnlockArea,
    behaviorVsPerceptionGap,
    selfDeceptionIndex,
    interpretiveSummary,
  };
}
