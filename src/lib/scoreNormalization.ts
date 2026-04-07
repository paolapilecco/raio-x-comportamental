/**
 * Score Normalization
 * 
 * Ensures diagnostic scores reflect clinical reality:
 * - Only patterns with meaningful scores (≥ 15%) are considered "active"
 * - Active patterns get a small visual floor of 20% for radar chart readability
 * - Inactive/negligible patterns stay as-is (can be 0%)
 * - All values capped at 100%
 * - Relative ordering is preserved
 */

import { PatternScore } from '@/types/diagnostic';

const ACTIVE_FLOOR = 20;      // Minimum visible % for active patterns on radar
const ACTIVE_THRESHOLD = 15;  // Raw % must be ≥ this to be considered "active"

/**
 * Normalize sorted scores so that identified active patterns
 * have a minimum visible percentage, without exceeding 100%.
 * Patterns with very low scores (< threshold) are kept as-is to reflect reality.
 */
export function normalizeScoresForDiagnosis(sortedScores: PatternScore[]): PatternScore[] {
  if (sortedScores.length === 0) return sortedScores;

  return sortedScores.map((score, index) => {
    // Only the dominant (index 0) or patterns above threshold are "active"
    const isActive = (index === 0 && score.percentage >= 10) || score.percentage >= ACTIVE_THRESHOLD;
    
    if (isActive && score.percentage > 0 && score.percentage < ACTIVE_FLOOR) {
      return { ...score, percentage: ACTIVE_FLOOR };
    }

    return { ...score, percentage: Math.min(100, score.percentage) };
  });
}
