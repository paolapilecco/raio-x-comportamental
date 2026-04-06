import type { PatternKey } from '@/types/diagnostic';

export interface ConflictPair {
  patternA: PatternKey;
  patternB: PatternKey;
  description: string;
}

/**
 * All known behavioral conflict pairs with descriptions.
 * A conflict is detected when both patterns score above the threshold.
 */
export const CONFLICT_PAIRS: ConflictPair[] = [
  {
    patternA: 'paralyzing_perfectionism',
    patternB: 'unstable_execution',
    description: 'Exige perfeição mas não consegue manter execução consistente — ciclo de paralisia e frustração.',
  },
  {
    patternA: 'validation_dependency',
    patternB: 'excessive_self_criticism',
    description: 'Busca aprovação externa mas se autocritica constantemente — nunca se sente suficiente.',
  },
  {
    patternA: 'functional_overload',
    patternB: 'discomfort_escape',
    description: 'Acumula responsabilidades mas foge do desconforto — colapso inevitável.',
  },
  {
    patternA: 'emotional_self_sabotage',
    patternB: 'low_routine_sustenance',
    description: 'Sabota emocionalmente e não sustenta rotinas — recomeça do zero repetidamente.',
  },
  {
    patternA: 'paralyzing_perfectionism',
    patternB: 'discomfort_escape',
    description: 'Perfeccionismo gera desconforto que leva à fuga — nada é iniciado ou concluído.',
  },
  {
    patternA: 'validation_dependency',
    patternB: 'emotional_self_sabotage',
    description: 'Depende de validação mas sabota relações — ciclo de rejeição autoimposta.',
  },
];

export const DEFAULT_CONFLICT_THRESHOLD = 55;

/**
 * Short descriptions indexed by "patternA+patternB" for quick UI lookup.
 */
export const CONFLICT_PAIR_DESCRIPTIONS: Record<string, string> = Object.fromEntries(
  CONFLICT_PAIRS.map((cp) => [`${cp.patternA}+${cp.patternB}`, cp.description])
);

export interface DetectedConflict {
  patternA: string;
  patternB: string;
  description: string;
}

/**
 * Detects internal conflicts: high scores on opposing behavioral axes.
 * @param scores - Record of pattern keys to percentage scores (0-100)
 * @param labelMap - Optional map from pattern key to human label
 * @param threshold - Minimum score for both patterns (default 55)
 */
export function detectConflicts(
  scores: Record<string, number>,
  labelMap?: Record<string, string>,
  threshold: number = DEFAULT_CONFLICT_THRESHOLD
): DetectedConflict[] {
  const conflicts: DetectedConflict[] = [];

  for (const { patternA, patternB, description } of CONFLICT_PAIRS) {
    if ((scores[patternA] || 0) >= threshold && (scores[patternB] || 0) >= threshold) {
      conflicts.push({
        patternA: labelMap?.[patternA] || patternA,
        patternB: labelMap?.[patternB] || patternB,
        description,
      });
    }
  }

  return conflicts;
}

/**
 * Returns raw detected conflict pairs (keys only, no labels).
 * Useful for UI that needs the keys to look up descriptions separately.
 */
export function detectConflictPairs(
  scores: Record<string, number>,
  threshold: number = DEFAULT_CONFLICT_THRESHOLD
): [PatternKey, PatternKey][] {
  return CONFLICT_PAIRS
    .filter(({ patternA, patternB }) =>
      (scores[patternA] || 0) >= threshold && (scores[patternB] || 0) >= threshold
    )
    .map(({ patternA, patternB }) => [patternA, patternB]);
}
