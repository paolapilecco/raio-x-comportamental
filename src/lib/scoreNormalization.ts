/**
 * Score Normalization
 * 
 * Ensures diagnostic scores reflect clinical reality:
 * - Dominant pattern (rank #1) always shows ≥ 30%
 * - Secondary active patterns (rank #2-3 with % ≥ 20) get floor of 30%
 * - Inactive patterns stay as-is
 * - All values capped at 100%
 * - Relative ordering is preserved
 */

import { PatternScore } from '@/types/diagnostic';

const ACTIVE_FLOOR = 30;
const ACTIVE_THRESHOLD = 20; // raw % must be ≥ this to be considered "active"

/**
 * Normalize sorted scores so that identified active patterns
 * have a minimum visible percentage, without exceeding 100%.
 */
export function normalizeScoresForDiagnosis(sortedScores: PatternScore[]): PatternScore[] {
  if (sortedScores.length === 0) return sortedScores;

  return sortedScores.map((score, index) => {
    const isActive = index === 0 || score.percentage >= ACTIVE_THRESHOLD;
    
    if (isActive && score.percentage > 0 && score.percentage < ACTIVE_FLOOR) {
      return { ...score, percentage: ACTIVE_FLOOR };
    }

    return { ...score, percentage: Math.min(100, score.percentage) };
  });
}
