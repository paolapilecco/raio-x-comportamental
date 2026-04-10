/**
 * Interpretation Engine v3
 * 
 * Dynamic per-module conflict/contradiction detection.
 * Receives moduleSlug to load the correct rules from moduleConflictRules.
 */

import { Answer, PatternScore, InternalConflict, ResponseContradiction, InterpretiveInsight, BehavioralProfile, BlindSpot } from '@/types/diagnostic';
import { getModuleRules, type ModuleRules } from './moduleConflictRules';

interface QuestionMeta {
  id: number;
  axes: string[];
}

// ──────────────────────────────────────────────
// 1. CONFLICT DETECTION
// ──────────────────────────────────────────────

export function detectConflicts(
  scores: Record<string, number>,
  rules: ModuleRules,
  threshold: number = 50
): InternalConflict[] {
  const conflicts: InternalConflict[] = [];

  for (const pair of rules.conflictPairs) {
    const scoreA = scores[pair.axisA] || 0;
    const scoreB = scores[pair.axisB] || 0;

    if (scoreA >= threshold && scoreB >= threshold) {
      const avgIntensity = (scoreA + scoreB) / 2;
      const severity: InternalConflict['severity'] =
        avgIntensity >= 75 ? 'critical' : avgIntensity >= 60 ? 'high' : 'moderate';

      conflicts.push({ patternA: pair.axisA, patternB: pair.axisB, description: pair.description, severity });
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

function groupAnswersByAxes(
  answers: Answer[],
  questions: QuestionMeta[]
): { questionId: number; value: number; axes: string[] }[] {
  return answers.map(answer => {
    const q = questions.find(qq => qq.id === answer.questionId);
    return q ? { questionId: answer.questionId, value: answer.value, axes: q.axes } : null;
  }).filter(Boolean) as { questionId: number; value: number; axes: string[] }[];
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

export function detectContradictions(
  answers: Answer[],
  questions: QuestionMeta[],
  overallScores: Record<string, number>,
  rules: ModuleRules
): ResponseContradiction[] {
  const allAnswers = groupAnswersByAxes(answers, questions);
  const contradictions: ResponseContradiction[] = [];

  if (allAnswers.length === 0) {
    return contradictions;
  }

  const axisByAvg = calculateAxisAvgByType(allAnswers);

  for (const rule of rules.contradictionRules) {
    const perceptionData = axisByAvg[rule.perceptionAxis];
    const behaviorData = axisByAvg[rule.behaviorAxis];

    if (!perceptionData || !behaviorData) continue;

    const perceptionAvg = perceptionData.avg;
    const behaviorAvg = behaviorData.avg;

    const perceptionMet = rule.perceptionHigh ? perceptionAvg >= 60 : perceptionAvg <= 40;
    const behaviorMet = rule.behaviorHigh ? behaviorAvg >= 60 : behaviorAvg <= 40;

    if (perceptionMet && behaviorMet) {
      const gap = Math.abs(perceptionAvg - behaviorAvg);
      contradictions.push({
        type: rule.type,
        label: rule.label,
        description: rule.description,
        evidence: `Eixo A: ${Math.round(perceptionAvg)}% | Eixo B: ${Math.round(behaviorAvg)}% (gap: ${Math.round(gap)}%)`,
      });
    }
  }

  // Generic axis-gap detection (works for ALL modules)
  const axisEntries = Object.entries(overallScores);
  for (let i = 0; i < axisEntries.length; i++) {
    for (let j = i + 1; j < axisEntries.length; j++) {
      const [axisA, scoreA] = axisEntries[i];
      const [axisB, scoreB] = axisEntries[j];
      const gap = Math.abs(scoreA - scoreB);
      if (gap >= 30) {
        const direction = scoreA > scoreB
          ? `${axisA} significativamente mais alto que ${axisB} — possível ponto cego.`
          : `${axisB} significativamente mais alto que ${axisA} — possível ponto cego.`;
        const alreadyExists = contradictions.find(c => c.type === `axis_gap_${axisA}_${axisB}`);
        if (!alreadyExists) {
          contradictions.push({
            type: `axis_gap_${axisA}_${axisB}`,
            label: `Divergência entre eixos`,
            description: direction,
            evidence: `${axisA}: ${Math.round(scoreA)}% | ${axisB}: ${Math.round(scoreB)}% (gap: ${Math.round(gap)}%)`,
          });
        }
      }
    }
  }

  return contradictions;
}

// ──────────────────────────────────────────────
// 3. SELF-DECEPTION INDEX
// ──────────────────────────────────────────────

export function calculateSelfDeceptionIndex(
  answers: Answer[],
  questions: QuestionMeta[]
): { selfDeceptionIndex: number; behaviorVsPerceptionGap: number } {
  const allAnswers = groupAnswersByAxes(answers, questions);

  if (allAnswers.length === 0) {
    return { selfDeceptionIndex: 0, behaviorVsPerceptionGap: 0 };
  }

  const axisByAvg = calculateAxisAvgByType(allAnswers);
  const axes = Object.keys(axisByAvg);
  if (axes.length < 2) return { selfDeceptionIndex: 0, behaviorVsPerceptionGap: 0 };

  let totalGap = 0;
  let deceptionSignals = 0;
  let comparisons = 0;

  for (let i = 0; i < axes.length; i++) {
    for (let j = i + 1; j < axes.length; j++) {
      const avgA = axisByAvg[axes[i]].avg;
      const avgB = axisByAvg[axes[j]].avg;
      const gap = Math.abs(avgA - avgB);
      totalGap += gap;
      comparisons++;
      if (gap > 40) deceptionSignals += 1;
    }
  }

  const avgGap = comparisons > 0 ? totalGap / comparisons : 0;
  const behaviorVsPerceptionGap = Math.min(Math.round(avgGap), 100);
  const blindSpotRatio = comparisons > 0 ? deceptionSignals / comparisons : 0;
  const selfDeceptionIndex = Math.min(Math.round((avgGap * 0.6 + blindSpotRatio * 100 * 0.4)), 100);

  return { selfDeceptionIndex, behaviorVsPerceptionGap };
}

// ──────────────────────────────────────────────
// 4. DERIVED CORE PAIN & KEY UNLOCK AREA
// ──────────────────────────────────────────────

export function deriveCorePainAndUnlock(
  scores: Record<string, number>,
  conflicts: InternalConflict[],
  rules: ModuleRules
): { derivedCorePain: string; derivedKeyUnlockArea: string } {
  // Try module-specific pain rules first
  for (const rule of rules.painRules) {
    if (rule.condition(scores, conflicts.length)) {
      return { derivedCorePain: rule.pain, derivedKeyUnlockArea: rule.unlock };
    }
  }

  // Fallback: use the highest scoring pattern with module-specific unlock map
  const sorted = Object.entries(scores).sort(([, a], [, b]) => b - a);
  const topKey = sorted[0]?.[0] || '';
  const topScore = sorted[0]?.[1] || 0;

  if (topScore >= 50 && rules.patternUnlockMap[topKey]) {
    return {
      derivedCorePain: rules.patternUnlockMap[topKey].pain,
      derivedKeyUnlockArea: rules.patternUnlockMap[topKey].unlock,
    };
  }

  if (topScore >= 50) {
    return {
      derivedCorePain: `Padrão dominante de ${topKey} indica uma dor recorrente que se mantém por repetição inconsciente.`,
      derivedKeyUnlockArea: 'Mapear em que momento exato do dia o padrão se ativa e interromper com uma ação diferente nos próximos 60 segundos.',
    };
  }

  return {
    derivedCorePain: 'Padrões dispersos sem dominância clara — a dificuldade não está em um ponto, mas na falta de foco.',
    derivedKeyUnlockArea: 'Escolher a área com maior impacto negativo nos últimos 30 dias e dedicar atenção exclusiva a ela por 3 semanas.',
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

  if (selfDeceptionIndex >= 60) {
    parts.push(`⚠️ Índice de autoengano elevado (${selfDeceptionIndex}%): existe uma desconexão significativa entre como você se percebe e como realmente se comporta.`);
  } else if (selfDeceptionIndex >= 35) {
    parts.push(`Índice de autoengano moderado (${selfDeceptionIndex}%): há áreas onde sua percepção não corresponde totalmente ao seu comportamento.`);
  }

  if (behaviorGap >= 25) {
    parts.push(`A divergência entre percepção e comportamento é de ${behaviorGap}%. O que você diz sentir e o que você realmente faz contam histórias diferentes.`);
  }

  if (conflicts.length >= 3) {
    parts.push(`Foram detectados ${conflicts.length} conflitos internos simultâneos. Isso fragmenta severamente sua energia.`);
  } else if (conflicts.length > 0) {
    const critical = conflicts.filter(c => c.severity === 'critical');
    if (critical.length > 0) {
      parts.push(`Conflito crítico identificado: ${critical[0].description}`);
    } else {
      parts.push(`${conflicts.length} conflito(s) interno(s) detectado(s): forças opostas que se neutralizam e impedem progresso.`);
    }
  }

  const meaningfulContradictions = contradictions.filter(c => !c.type.startsWith('axis_gap_'));
  if (meaningfulContradictions.length > 0) {
    parts.push(`Contradição principal: ${meaningfulContradictions[0].label} — ${meaningfulContradictions[0].description}`);
  }

  if (parts.length === 0) {
    parts.push(`Seu padrão dominante de ${dominantLabel} é coerente entre percepção e comportamento. O desafio agora é agir diferente.`);
  }

  return parts.join('\n\n');
}

// ──────────────────────────────────────────────
// 6. BEHAVIORAL PROFILE CLASSIFICATION
// ──────────────────────────────────────────────

export function classifyBehavioralProfile(
  scores: Record<string, number>,
  conflicts: InternalConflict[],
  rules: ModuleRules
): BehavioralProfile {
  // If module has no profile definitions, return a generic profile
  if (rules.profileDefinitions.length === 0) {
    const sorted = Object.entries(scores).sort(([, a], [, b]) => b - a);
    const topKey = sorted[0]?.[0] || 'indefinido';
    const topScore = sorted[0]?.[1] || 0;
    const riskLevel: BehavioralProfile['riskLevel'] =
      topScore >= 75 ? 'critical' : topScore >= 60 ? 'high' : topScore >= 45 ? 'moderate' : 'low';
    return {
      id: topKey,
      name: `Perfil ${topKey.replace(/_/g, ' ')}`,
      description: `Padrão dominante identificado no eixo ${topKey} com intensidade de ${Math.round(topScore)}%.`,
      dominantTraits: sorted.slice(0, 3).map(([k]) => k.replace(/_/g, ' ')),
      riskLevel,
    };
  }

  let bestProfile = rules.profileDefinitions[0];
  let bestStrength = 0;

  for (const profile of rules.profileDefinitions) {
    const { match, strength } = profile.condition(scores, conflicts.length);
    if (match && strength > bestStrength) {
      bestProfile = profile;
      bestStrength = strength;
    }
  }

  const riskLevel: BehavioralProfile['riskLevel'] =
    bestStrength >= 75 ? 'critical' : bestStrength >= 60 ? 'high' : bestStrength >= 45 ? 'moderate' : 'low';

  return {
    id: bestProfile.id,
    name: bestProfile.name,
    description: bestProfile.description,
    dominantTraits: bestProfile.dominantTraits,
    riskLevel,
  };
}

// ──────────────────────────────────────────────
// 7. BLIND SPOT DETECTION
// ──────────────────────────────────────────────

function deriveBlindSpot(
  scores: Record<string, number>,
  conflicts: InternalConflict[],
  selfDeceptionIndex: number,
  rules: ModuleRules
): BlindSpot {
  for (const rule of rules.blindSpotRules) {
    if (rule.condition(scores, conflicts.length, selfDeceptionIndex)) {
      return { perceivedProblem: rule.perceived, realProblem: rule.real };
    }
  }

  // Fallback: use module-specific map
  const sorted = Object.entries(scores).sort(([, a], [, b]) => b - a);
  const topKey = sorted[0]?.[0] || '';

  if (rules.blindSpotFallbackMap[topKey]) return rules.blindSpotFallbackMap[topKey];

  return {
    perceivedProblem: 'Você acredita que sabe qual é o problema e que é uma questão de tempo até resolver.',
    realProblem: 'Mas o problema real é que o padrão que te trava opera abaixo da sua consciência — enquanto você tenta resolver o sintoma visível, a causa real continua intocada.',
  };
}

// ──────────────────────────────────────────────
// 8. MAIN ENTRY POINT
// ──────────────────────────────────────────────

export function generateInterpretation(
  answers: Answer[],
  questions: QuestionMeta[],
  allScores: PatternScore[],
  dominantLabel: string,
  moduleSlug?: string
): InterpretiveInsight {
  // Load rules for this module
  const rules = getModuleRules(moduleSlug);

  // Build scores map
  const scoresMap: Record<string, number> = {};
  allScores.forEach(s => { scoresMap[s.key] = s.percentage; });

  // 1. Detect conflicts
  const internalConflicts = detectConflicts(scoresMap, rules);

  // 2. Detect contradictions
  const contradictions = detectContradictions(answers, questions, scoresMap, rules);

  // 3. Calculate self-deception index (module-agnostic)
  const { selfDeceptionIndex, behaviorVsPerceptionGap } = calculateSelfDeceptionIndex(answers, questions);

  // 4. Derive core pain and unlock area
  const { derivedCorePain, derivedKeyUnlockArea } = deriveCorePainAndUnlock(scoresMap, internalConflicts, rules);

  // 5. Classify behavioral profile
  const behavioralProfile = classifyBehavioralProfile(scoresMap, internalConflicts, rules);

  // 6. Build interpretive summary
  const interpretiveSummary = buildInterpretiveSummary(
    internalConflicts,
    contradictions,
    selfDeceptionIndex,
    behaviorVsPerceptionGap,
    dominantLabel
  );

  // 7. Derive blind spot
  const blindSpot = deriveBlindSpot(scoresMap, internalConflicts, selfDeceptionIndex, rules);

  return {
    internalConflicts,
    contradictions,
    derivedCorePain,
    derivedKeyUnlockArea,
    behaviorVsPerceptionGap,
    selfDeceptionIndex,
    interpretiveSummary,
    behavioralProfile,
    blindSpot,
  };
}
