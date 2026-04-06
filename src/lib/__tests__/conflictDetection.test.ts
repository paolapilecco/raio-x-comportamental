import { describe, it, expect } from 'vitest';
import {
  detectConflicts,
  detectConflictPairs,
  CONFLICT_PAIRS,
  CONFLICT_PAIR_DESCRIPTIONS,
  DEFAULT_CONFLICT_THRESHOLD,
} from '@/lib/conflictDetection';

describe('conflictDetection', () => {
  describe('CONFLICT_PAIRS', () => {
    it('should have at least 5 conflict pairs defined', () => {
      expect(CONFLICT_PAIRS.length).toBeGreaterThanOrEqual(5);
    });

    it('each pair should have valid patternA, patternB, and description', () => {
      CONFLICT_PAIRS.forEach((pair) => {
        expect(pair.patternA).toBeTruthy();
        expect(pair.patternB).toBeTruthy();
        expect(pair.description.length).toBeGreaterThan(10);
        expect(pair.patternA).not.toBe(pair.patternB);
      });
    });
  });

  describe('CONFLICT_PAIR_DESCRIPTIONS', () => {
    it('should have one description per conflict pair', () => {
      expect(Object.keys(CONFLICT_PAIR_DESCRIPTIONS).length).toBe(CONFLICT_PAIRS.length);
    });

    it('keys should follow patternA+patternB format', () => {
      Object.keys(CONFLICT_PAIR_DESCRIPTIONS).forEach((key) => {
        expect(key).toContain('+');
        const [a, b] = key.split('+');
        expect(a.length).toBeGreaterThan(0);
        expect(b.length).toBeGreaterThan(0);
      });
    });
  });

  describe('detectConflicts', () => {
    it('should detect conflict when both patterns are above threshold', () => {
      const scores = {
        paralyzing_perfectionism: 70,
        unstable_execution: 65,
      };
      const result = detectConflicts(scores);
      expect(result.length).toBe(1);
      expect(result[0].description).toContain('perfeição');
    });

    it('should NOT detect conflict when one pattern is below threshold', () => {
      const scores = {
        paralyzing_perfectionism: 70,
        unstable_execution: 30, // below 55
      };
      const result = detectConflicts(scores);
      expect(result.length).toBe(0);
    });

    it('should detect multiple conflicts', () => {
      const scores = {
        paralyzing_perfectionism: 80,
        unstable_execution: 75,
        validation_dependency: 60,
        excessive_self_criticism: 70,
      };
      const result = detectConflicts(scores);
      expect(result.length).toBe(2);
    });

    it('should use custom labels when provided', () => {
      const scores = {
        paralyzing_perfectionism: 70,
        unstable_execution: 65,
      };
      const labels = {
        paralyzing_perfectionism: 'Perfeccionismo',
        unstable_execution: 'Execução',
      };
      const result = detectConflicts(scores, labels);
      expect(result[0].patternA).toBe('Perfeccionismo');
      expect(result[0].patternB).toBe('Execução');
    });

    it('should use pattern key as fallback when no label provided', () => {
      const scores = {
        paralyzing_perfectionism: 70,
        unstable_execution: 65,
      };
      const result = detectConflicts(scores);
      expect(result[0].patternA).toBe('paralyzing_perfectionism');
    });

    it('should respect custom threshold', () => {
      const scores = {
        paralyzing_perfectionism: 45,
        unstable_execution: 42,
      };
      // Default threshold (55) - no conflict
      expect(detectConflicts(scores).length).toBe(0);
      // Lower threshold - conflict detected
      expect(detectConflicts(scores, undefined, 40).length).toBe(1);
    });

    it('should return empty array when scores are empty', () => {
      expect(detectConflicts({}).length).toBe(0);
    });

    it('should handle missing keys gracefully (default to 0)', () => {
      const scores = { paralyzing_perfectionism: 70 };
      expect(detectConflicts(scores).length).toBe(0);
    });
  });

  describe('detectConflictPairs', () => {
    it('should return tuples of PatternKey pairs', () => {
      const scores = {
        paralyzing_perfectionism: 80,
        unstable_execution: 75,
      };
      const result = detectConflictPairs(scores);
      expect(result.length).toBe(1);
      expect(result[0]).toEqual(['paralyzing_perfectionism', 'unstable_execution']);
    });

    it('should return empty when no conflicts', () => {
      expect(detectConflictPairs({ paralyzing_perfectionism: 10 }).length).toBe(0);
    });
  });

  describe('DEFAULT_CONFLICT_THRESHOLD', () => {
    it('should be 55', () => {
      expect(DEFAULT_CONFLICT_THRESHOLD).toBe(55);
    });
  });
});
