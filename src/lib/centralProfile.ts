import { supabase } from '@/integrations/supabase/client';
import { patternDefinitions } from '@/data/patterns';
import type { PatternKey } from '@/types/diagnostic';

interface ScoreEntry {
  key: string;
  label: string;
  score: number;
  maxScore: number;
  percentage: number;
}

interface UnifiedProfile {
  dominantPattern: { key: string; score: number } | null;
  secondaryPatterns: { key: string; score: number }[];
  internalConflicts: { patternA: string; patternB: string; description: string }[];
  behaviorTendency: string;
  selfSabotageRisk: 'low' | 'moderate' | 'high' | 'critical';
  aggregatedScores: Record<string, number>;
  testsCompleted: number;
  dataConfidence: number; // 0-100, normalized by volume
}

/**
 * Normalizes a score based on data volume.
 * More data points = higher confidence, less variance.
 */
function normalizeByVolume(rawAvg: number, sampleCount: number, maxSamples: number = 10): number {
  // Bayesian-style shrinkage toward 50% (neutral) when data is sparse
  const confidenceFactor = Math.min(sampleCount / maxSamples, 1);
  const prior = 50; // neutral baseline
  return Math.round(prior * (1 - confidenceFactor) + rawAvg * confidenceFactor);
}

/**
 * Detects internal conflicts: high scores on opposing behavioral axes.
 */
function detectConflicts(scores: Record<string, number>): { patternA: string; patternB: string; description: string }[] {
  const conflictPairs: [PatternKey, PatternKey, string][] = [
    ['paralyzing_perfectionism', 'unstable_execution', 'Exige perfeição mas não consegue manter execução consistente — ciclo de paralisia e frustração.'],
    ['validation_dependency', 'excessive_self_criticism', 'Busca aprovação externa mas se autocritica constantemente — nunca se sente suficiente.'],
    ['functional_overload', 'discomfort_escape', 'Acumula responsabilidades mas foge do desconforto — colapso inevitável.'],
    ['emotional_self_sabotage', 'low_routine_sustenance', 'Sabota emocionalmente e não sustenta rotinas — recomeça do zero repetidamente.'],
    ['paralyzing_perfectionism', 'discomfort_escape', 'Perfeccionismo gera desconforto que leva à fuga — nada é iniciado ou concluído.'],
    ['validation_dependency', 'emotional_self_sabotage', 'Depende de validação mas sabota relações — ciclo de rejeição autoimposta.'],
  ];

  const threshold = 55; // both patterns must be above this to count as conflict
  const conflicts: { patternA: string; patternB: string; description: string }[] = [];

  for (const [a, b, desc] of conflictPairs) {
    if ((scores[a] || 0) >= threshold && (scores[b] || 0) >= threshold) {
      const labelA = patternDefinitions[a]?.label || a;
      const labelB = patternDefinitions[b]?.label || b;
      conflicts.push({ patternA: labelA, patternB: labelB, description: desc });
    }
  }

  return conflicts;
}

/**
 * Calculates self-sabotage risk based on pattern combination intensity.
 */
function calculateSabotageRisk(scores: Record<string, number>, conflicts: unknown[]): 'low' | 'moderate' | 'high' | 'critical' {
  const sabotageKeys: PatternKey[] = ['emotional_self_sabotage', 'discomfort_escape', 'unstable_execution', 'low_routine_sustenance'];
  const sabotageAvg = sabotageKeys.reduce((sum, k) => sum + (scores[k] || 0), 0) / sabotageKeys.length;

  const conflictBonus = conflicts.length * 5;
  const riskScore = sabotageAvg + conflictBonus;

  if (riskScore >= 75) return 'critical';
  if (riskScore >= 60) return 'high';
  if (riskScore >= 40) return 'moderate';
  return 'low';
}

/**
 * Determines the overall behavioral tendency from aggregated scores.
 */
function determineBehaviorTendency(scores: Record<string, number>): string {
  const sorted = Object.entries(scores).sort(([, a], [, b]) => b - a);
  const top = sorted[0];
  if (!top) return 'Indefinido — dados insuficientes.';

  const key = top[0] as PatternKey;
  const def = patternDefinitions[key];
  if (!def) return 'Indefinido — padrão não reconhecido.';

  const intensity = top[1] >= 75 ? 'forte' : top[1] >= 50 ? 'moderada' : 'leve';
  return `Tendência ${intensity} para ${def.label.toLowerCase()}: ${def.description.substring(0, 120)}...`;
}

/**
 * Main function: generates a unified behavioral profile from all test results.
 */
export async function generateUnifiedProfile(userId: string): Promise<UnifiedProfile | null> {
  // 1. Fetch all completed sessions
  const { data: sessions } = await supabase
    .from('diagnostic_sessions')
    .select('id, completed_at')
    .eq('user_id', userId)
    .not('completed_at', 'is', null)
    .order('completed_at', { ascending: false });

  if (!sessions || sessions.length === 0) return null;

  // 2. Fetch all results for these sessions
  const { data: results } = await supabase
    .from('diagnostic_results')
    .select('*')
    .in('session_id', sessions.map(s => s.id));

  if (!results || results.length === 0) return null;

  // 3. Aggregate scores across all tests with recency weighting
  const axisData: Record<string, { totalWeighted: number; totalWeight: number; count: number }> = {};

  results.forEach((result, index) => {
    // Exponential decay: most recent results have highest weight
    const recencyWeight = Math.pow(0.85, index); // e.g., 1.0, 0.85, 0.72, 0.61...
    const scores = (result.all_scores as unknown as ScoreEntry[]) || [];

    scores.forEach((s) => {
      if (!axisData[s.key]) {
        axisData[s.key] = { totalWeighted: 0, totalWeight: 0, count: 0 };
      }
      axisData[s.key].totalWeighted += s.percentage * recencyWeight;
      axisData[s.key].totalWeight += recencyWeight;
      axisData[s.key].count += 1;
    });
  });

  // 4. Calculate volume-normalized scores
  const aggregatedScores: Record<string, number> = {};
  const maxSamples = Math.max(results.length, 5);

  Object.entries(axisData).forEach(([key, val]) => {
    const weightedAvg = val.totalWeighted / val.totalWeight;
    aggregatedScores[key] = normalizeByVolume(weightedAvg, val.count, maxSamples);
  });

  // 5. Sort patterns
  const sortedPatterns = Object.entries(aggregatedScores)
    .sort(([, a], [, b]) => b - a)
    .map(([key, score]) => ({ key, score }));

  const dominantPattern = sortedPatterns[0] || null;
  const secondaryPatterns = sortedPatterns.slice(1, 4).filter(p => p.score >= 40);

  // 6. Detect conflicts, tendency, and sabotage risk
  const internalConflicts = detectConflicts(aggregatedScores);
  const behaviorTendency = determineBehaviorTendency(aggregatedScores);
  const selfSabotageRisk = calculateSabotageRisk(aggregatedScores, internalConflicts);

  // 7. Data confidence (how much we trust the profile)
  const dataConfidence = Math.min(Math.round((results.length / 5) * 100), 100);

  const profile: UnifiedProfile = {
    dominantPattern,
    secondaryPatterns,
    internalConflicts,
    behaviorTendency,
    selfSabotageRisk,
    aggregatedScores,
    testsCompleted: sessions.length,
    dataConfidence,
  };

  // 8. Persist to user_central_profile
  const dominantKey = dominantPattern?.key as PatternKey;
  const dominantDef = patternDefinitions[dominantKey];
  const latestResult = results[0];

  const profileData = {
    user_id: userId,
    dominant_patterns: sortedPatterns.slice(0, 3),
    aggregated_scores: aggregatedScores,
    tests_completed: sessions.length,
    mental_state: latestResult.mental_state,
    core_pain: dominantDef?.corePain || null,
    key_unlock_area: dominantDef?.keyUnlockArea || null,
    profile_name: dominantDef?.profileName || latestResult.profile_name,
    last_test_at: sessions[0].completed_at,
  };

  const { data: existing } = await supabase
    .from('user_central_profile')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle();

  if (existing) {
    await supabase
      .from('user_central_profile')
      .update(profileData)
      .eq('user_id', userId);
  } else {
    await supabase
      .from('user_central_profile')
      .insert(profileData);
  }

  return profile;
}

// Keep backward compatibility
export const updateCentralProfile = generateUnifiedProfile;
