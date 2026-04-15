/**
 * Consistency Engine v1
 * 
 * Detects response inconsistencies via:
 * 1. Mirror question comparison (same axis, different framing)
 * 2. Counter-proof adjustments (invalidates inflated self-perception)
 * 3. Confidence level calculation
 * 4. Temperament layer extraction
 */

import type { Answer, PatternScore } from '@/types/diagnostic';

// ──────────────────────────────────────────────
// TYPES
// ──────────────────────────────────────────────

export interface QuestionWithMeta {
  id: number;
  axes: string[];
  type?: string;
  question_category?: string;
  mirror_pair_id?: string | null;
  is_counterproof?: boolean;
  weight?: number;
  option_scores?: number[] | null;
}

export interface ConsistencyResult {
  consistencyScore: number;         // 0-100 (100 = perfectly consistent)
  mirrorDiscrepancies: MirrorDiscrepancy[];
  counterproofAdjustments: CounterproofAdjustment[];
  confidenceLevel: 'alta' | 'media' | 'baixa';
  confidenceScore: number;          // 0-100
  contradictionCount: number;
  responsePatternFlags: string[];
}

export interface MirrorDiscrepancy {
  questionA: number;
  questionB: number;
  axis: string;
  valueA: number;
  valueB: number;
  discrepancy: number;  // absolute difference as percentage
}

export interface CounterproofAdjustment {
  axis: string;
  originalScore: number;
  adjustedScore: number;
  reason: string;
}

export interface TemperamentProfile {
  sanguineo: number;     // 0-100
  colerico: number;      // 0-100
  melancolico: number;   // 0-100
  fleumatico: number;    // 0-100
  dominant: string;
  secondary: string | null;
}

// ──────────────────────────────────────────────
// 1. MIRROR QUESTION CONSISTENCY
// ──────────────────────────────────────────────

function detectMirrorDiscrepancies(
  answers: Answer[],
  questions: QuestionWithMeta[]
): MirrorDiscrepancy[] {
  const discrepancies: MirrorDiscrepancy[] = [];
  const answerMap = new Map(answers.map(a => [a.questionId, a.value]));
  const processed = new Set<string>();

  for (const q of questions) {
    if (!q.mirror_pair_id) continue;

    const pairId = Number(q.mirror_pair_id);
    const pairKey = [Math.min(q.id, pairId), Math.max(q.id, pairId)].join('-');
    if (processed.has(pairKey)) continue;
    processed.add(pairKey);

    const valueA = answerMap.get(q.id);
    const valueB = answerMap.get(pairId);
    if (valueA === undefined || valueB === undefined) continue;

    const pairQuestion = questions.find(qq => qq.id === pairId);
    if (!pairQuestion) continue;

    // Find shared axes
    const sharedAxes = q.axes.filter(a => pairQuestion.axes.includes(a));
    for (const axis of sharedAxes) {
      // Normalize both to 0-100 scale
      const normA = ((valueA - 1) / 4) * 100;
      const normB = ((valueB - 1) / 4) * 100;
      const disc = Math.abs(normA - normB);

      if (disc >= 40) {
        discrepancies.push({
          questionA: q.id,
          questionB: pairId,
          axis,
          valueA,
          valueB,
          discrepancy: Math.round(disc),
        });
      }
    }
  }

  return discrepancies.sort((a, b) => b.discrepancy - a.discrepancy);
}

// ──────────────────────────────────────────────
// 2. COUNTER-PROOF ADJUSTMENTS
// ──────────────────────────────────────────────

function calculateCounterproofAdjustments(
  answers: Answer[],
  questions: QuestionWithMeta[],
  rawScores: Record<string, number>
): CounterproofAdjustment[] {
  const adjustments: CounterproofAdjustment[] = [];
  const answerMap = new Map(answers.map(a => [a.questionId, a.value]));

  // Group counterproof questions by axis
  const counterproofByAxis: Record<string, { values: number[]; maxValues: number[] }> = {};

  for (const q of questions) {
    if (!q.is_counterproof) continue;
    const value = answerMap.get(q.id);
    if (value === undefined) continue;

    for (const axis of q.axes) {
      if (!counterproofByAxis[axis]) {
        counterproofByAxis[axis] = { values: [], maxValues: [] };
      }
      
      let scoreValue: number;
      let maxValue: number;
      
      if (q.option_scores && q.option_scores.length > 0) {
        const idx = Math.max(0, Math.min(value - 1, q.option_scores.length - 1));
        scoreValue = q.option_scores[idx];
        maxValue = Math.max(...q.option_scores);
      } else {
        scoreValue = Math.max(0, value - 1);
        maxValue = 4;
      }
      
      counterproofByAxis[axis].values.push(scoreValue);
      counterproofByAxis[axis].maxValues.push(maxValue);
    }
  }

  // Compare counterproof average against main score
  for (const [axis, data] of Object.entries(counterproofByAxis)) {
    if (data.values.length === 0) continue;
    
    const totalMax = data.maxValues.reduce((a, b) => a + b, 0);
    const totalScore = data.values.reduce((a, b) => a + b, 0);
    const counterproofPct = totalMax > 0 ? (totalScore / totalMax) * 100 : 0;
    
    const mainScore = rawScores[axis] || 0;
    const gap = mainScore - counterproofPct;

    // If main score is significantly higher than counterproof suggests,
    // the person is likely inflating their self-perception
    if (gap >= 25) {
      const adjustment = Math.round(gap * 0.3); // Reduce by 30% of the gap
      adjustments.push({
        axis,
        originalScore: Math.round(mainScore),
        adjustedScore: Math.round(mainScore - adjustment),
        reason: `Contraprova indica inconsistência de ${Math.round(gap)}% — score ajustado em -${adjustment}%.`,
      });
    }
  }

  return adjustments;
}

// ──────────────────────────────────────────────
// 3. CONSISTENCY & CONFIDENCE SCORING
// ──────────────────────────────────────────────

function calculateConsistencyScore(
  answers: Answer[],
  _questions: QuestionWithMeta[],
  mirrorDiscrepancies: MirrorDiscrepancy[],
  counterproofAdjustments: CounterproofAdjustment[]
): { consistencyScore: number; confidenceLevel: 'alta' | 'media' | 'baixa'; confidenceScore: number; flags: string[] } {
  const flags: string[] = [];
  let penaltyPoints = 0;

  // 1. Mirror discrepancies penalty
  for (const d of mirrorDiscrepancies) {
    if (d.discrepancy >= 75) penaltyPoints += 15;
    else if (d.discrepancy >= 50) penaltyPoints += 8;
    else penaltyPoints += 4;
  }
  if (mirrorDiscrepancies.length >= 3) flags.push('multiple_mirror_contradictions');

  // 2. Counter-proof penalties
  for (const a of counterproofAdjustments) {
    const gapSize = a.originalScore - a.adjustedScore;
    if (gapSize >= 15) penaltyPoints += 12;
    else if (gapSize >= 8) penaltyPoints += 6;
    else penaltyPoints += 3;
  }
  if (counterproofAdjustments.length >= 2) flags.push('inflated_self_perception');

  // 3. Response pattern analysis
  const values = answers.map(a => a.value);
  
  // All same answer (acquiescence bias)
  const sameCount = values.filter(v => v === values[0]).length;
  if (sameCount / values.length >= 0.8) {
    penaltyPoints += 20;
    flags.push('acquiescence_bias');
  }

  // Extreme response tendency (all 1s or all 5s)
  const extremeCount = values.filter(v => v === 1 || v === 5).length;
  if (extremeCount / values.length >= 0.7) {
    penaltyPoints += 10;
    flags.push('extreme_response_tendency');
  }

  // Too fast pattern (all answers clustered around one value)
  const avgValue = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((sum, v) => sum + Math.pow(v - avgValue, 2), 0) / values.length;
  if (variance < 0.5 && values.length >= 10) {
    penaltyPoints += 15;
    flags.push('low_variance_pattern');
  }

  // 4. Question count contribution to confidence
  const questionCountBonus = Math.min(values.length / 36, 1) * 10;

  const consistencyScore = Math.max(0, Math.min(100, 100 - penaltyPoints));
  const confidenceScore = Math.max(0, Math.min(100, Math.round(
    consistencyScore * 0.6 + 
    questionCountBonus * 2 + 
    (mirrorDiscrepancies.length === 0 ? 15 : 0) +
    (counterproofAdjustments.length === 0 ? 5 : 0)
  )));

  const confidenceLevel: 'alta' | 'media' | 'baixa' = 
    confidenceScore >= 75 ? 'alta' : 
    confidenceScore >= 45 ? 'media' : 'baixa';

  return { consistencyScore, confidenceLevel, confidenceScore, flags };
}

// ──────────────────────────────────────────────
// 4. TEMPERAMENT LAYER
// ──────────────────────────────────────────────

// Maps behavioral axes to temperament traits
const TEMPERAMENT_AXIS_MAP: Record<string, { trait: keyof TemperamentProfile; weight: number; inverted?: boolean }[]> = {
  // Sanguíneo: extrovert, enthusiastic, starts things, social
  'unstable_execution': [{ trait: 'sanguineo', weight: 0.7 }],
  'validation_dependency': [{ trait: 'sanguineo', weight: 0.5 }],
  // Colérico: driven, decisive, impatient, controlling
  'functional_overload': [{ trait: 'colerico', weight: 0.7 }],
  'paralyzing_perfectionism': [{ trait: 'colerico', weight: 0.4 }, { trait: 'melancolico', weight: 0.4 }],
  // Melancólico: analytical, self-critical, detail-oriented
  'excessive_self_criticism': [{ trait: 'melancolico', weight: 0.8 }],
  'emotional_self_sabotage': [{ trait: 'melancolico', weight: 0.5 }],
  // Fleumático: avoidant, comfort-seeking, passive
  'discomfort_escape': [{ trait: 'fleumatico', weight: 0.8 }],
  'low_routine_sustenance': [{ trait: 'fleumatico', weight: 0.6 }, { trait: 'sanguineo', weight: 0.3 }],
};

export function calculateTemperament(scores: Record<string, number>): TemperamentProfile {
  const raw: Record<string, number> = {
    sanguineo: 0, colerico: 0, melancolico: 0, fleumatico: 0,
  };
  const weights: Record<string, number> = {
    sanguineo: 0, colerico: 0, melancolico: 0, fleumatico: 0,
  };

  for (const [axis, score] of Object.entries(scores)) {
    const mappings = TEMPERAMENT_AXIS_MAP[axis];
    if (!mappings) continue;

    for (const m of mappings) {
      const effectiveScore = m.inverted ? (100 - score) : score;
      raw[m.trait] += effectiveScore * m.weight;
      weights[m.trait] += m.weight;
    }
  }

  // Normalize to 0-100
  const result: Record<string, number> = {};
  for (const [trait, total] of Object.entries(raw)) {
    result[trait] = weights[trait] > 0 ? Math.round(total / weights[trait]) : 0;
  }

  // Determine dominant and secondary
  const sorted = Object.entries(result).sort(([, a], [, b]) => b - a);
  const dominant = sorted[0]?.[0] || 'fleumatico';
  const secondary = sorted[1]?.[1] >= 40 ? sorted[1]?.[0] : null;

  return {
    sanguineo: result.sanguineo,
    colerico: result.colerico,
    melancolico: result.melancolico,
    fleumatico: result.fleumatico,
    dominant,
    secondary: secondary || null,
  };
}

// ──────────────────────────────────────────────
// 5. SCORE ADJUSTMENT (apply counter-proof corrections)
// ──────────────────────────────────────────────

export function applyCounterproofAdjustments(
  scores: PatternScore[],
  adjustments: CounterproofAdjustment[]
): PatternScore[] {
  if (adjustments.length === 0) return scores;

  const adjustMap = new Map(adjustments.map(a => [a.axis, a]));

  return scores.map(s => {
    const adj = adjustMap.get(s.key);
    if (!adj) return s;

    const newPct = Math.max(0, Math.min(100, adj.adjustedScore));
    return {
      ...s,
      percentage: newPct,
    };
  }).sort((a, b) => b.percentage - a.percentage);
}

// ──────────────────────────────────────────────
// 6. MAIN ENTRY POINT
// ──────────────────────────────────────────────

export function analyzeConsistency(
  answers: Answer[],
  questions: QuestionWithMeta[],
  rawScores: Record<string, number>
): ConsistencyResult {
  // 1. Mirror discrepancies
  const mirrorDiscrepancies = detectMirrorDiscrepancies(answers, questions);

  // 2. Counter-proof adjustments
  const counterproofAdjustments = calculateCounterproofAdjustments(answers, questions, rawScores);

  // 3. Consistency & confidence
  const { consistencyScore, confidenceLevel, confidenceScore, flags } = 
    calculateConsistencyScore(answers, questions, mirrorDiscrepancies, counterproofAdjustments);

  // 4. Count total contradictions
  const contradictionCount = mirrorDiscrepancies.length + counterproofAdjustments.length;

  return {
    consistencyScore,
    mirrorDiscrepancies,
    counterproofAdjustments,
    confidenceLevel,
    confidenceScore,
    contradictionCount,
    responsePatternFlags: flags,
  };
}
