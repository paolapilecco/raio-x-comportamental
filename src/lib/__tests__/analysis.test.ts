import { describe, it, expect } from 'vitest';
import { analyzeAnswers } from '@/lib/analysis';
import { questions } from '@/data/questions';
import type { Answer } from '@/types/diagnostic';

// Helper: generate answers with a fixed value for all questions
function makeAnswers(value: number): Answer[] {
  return questions.map((q) => ({ questionId: q.id, value }));
}

// Helper: generate answers weighted toward specific axes
function makeWeightedAnswers(highAxes: string[], highValue = 5, lowValue = 1): Answer[] {
  return questions.map((q) => ({
    questionId: q.id,
    value: q.axes.some((a) => highAxes.includes(a)) ? highValue : lowValue,
  }));
}

describe('analyzeAnswers', () => {
  it('should return a valid DiagnosticResult', () => {
    const answers = makeAnswers(3);
    const result = analyzeAnswers(answers);

    expect(result).toBeDefined();
    expect(result.dominantPattern).toBeDefined();
    expect(result.dominantPattern.key).toBeTruthy();
    expect(result.dominantPattern.label).toBeTruthy();
    expect(result.intensity).toMatch(/^(leve|moderado|alto)$/);
    expect(result.allScores.length).toBeGreaterThan(0);
    expect(result.combinedTitle).toBeTruthy();
    expect(result.profileName).toBeTruthy();
  });

  it('should have allScores sorted by percentage descending', () => {
    const answers = makeAnswers(3);
    const result = analyzeAnswers(answers);

    for (let i = 1; i < result.allScores.length; i++) {
      expect(result.allScores[i - 1].percentage).toBeGreaterThanOrEqual(
        result.allScores[i].percentage
      );
    }
  });

  it('should identify high intensity when all answers are 5', () => {
    const answers = makeAnswers(5);
    const result = analyzeAnswers(answers);
    // With all 5s, dominant should be alto
    expect(result.intensity).toBe('alto');
  });

  it('should identify low intensity when all answers are 1', () => {
    const answers = makeAnswers(1);
    const result = analyzeAnswers(answers);
    expect(result.intensity).toBe('leve');
  });

  it('should detect unstable_execution as dominant when weighted high', () => {
    const answers = makeWeightedAnswers(['unstable_execution']);
    const result = analyzeAnswers(answers);
    expect(result.dominantPattern.key).toBe('unstable_execution');
  });

  it('should detect emotional_self_sabotage as dominant when weighted high', () => {
    const answers = makeWeightedAnswers(['emotional_self_sabotage']);
    const result = analyzeAnswers(answers);
    expect(result.dominantPattern.key).toBe('emotional_self_sabotage');
  });

  it('should include secondary patterns when above 40%', () => {
    // Weight two axes high
    const answers = makeWeightedAnswers(
      ['unstable_execution', 'paralyzing_perfectionism'],
      5,
      2
    );
    const result = analyzeAnswers(answers);
    expect(result.secondaryPatterns.length).toBeGreaterThanOrEqual(0);
    // All secondary should be >= 40%
    const secondaryScores = result.allScores.slice(1, 3).filter((s) => s.percentage >= 40);
    expect(result.secondaryPatterns.length).toBe(secondaryScores.length);
  });

  it('should produce a combined title with secondary when present', () => {
    const answers = makeWeightedAnswers(
      ['unstable_execution', 'paralyzing_perfectionism'],
      5,
      1
    );
    const result = analyzeAnswers(answers);
    if (result.secondaryPatterns.length > 0) {
      expect(result.combinedTitle).toContain(' com ');
    }
  });

  it('should have required fields populated', () => {
    const answers = makeAnswers(4);
    const result = analyzeAnswers(answers);

    expect(result.summary.length).toBeGreaterThan(20);
    expect(result.mechanism.length).toBeGreaterThan(10);
    expect(result.contradiction.length).toBeGreaterThan(5);
    expect(result.mentalState.length).toBeGreaterThan(10);
    expect(result.blockingPoint.length).toBeGreaterThan(5);
    expect(result.direction.length).toBeGreaterThan(5);
    expect(result.corePain.length).toBeGreaterThan(5);
    expect(result.keyUnlockArea.length).toBeGreaterThan(5);
    expect(result.criticalDiagnosis.length).toBeGreaterThan(10);
    expect(result.triggers.length).toBeGreaterThan(0);
    expect(result.mentalTraps.length).toBeGreaterThan(0);
    expect(result.selfSabotageCycle.length).toBeGreaterThan(0);
    expect(result.lifeImpact.length).toBeGreaterThan(0);
    expect(result.exitStrategy.length).toBeGreaterThan(0);
    expect(result.whatNotToDo.length).toBeGreaterThan(0);
  });

  it('should include interpretation data', () => {
    const answers = makeAnswers(4);
    const result = analyzeAnswers(answers);

    expect(result.interpretation).toBeDefined();
    if (result.interpretation) {
      expect(typeof result.interpretation.selfDeceptionIndex).toBe('number');
      expect(typeof result.interpretation.behaviorVsPerceptionGap).toBe('number');
      expect(result.interpretation.behavioralProfile).toBeDefined();
    }
  });

  it('allScores percentages should be between 0 and 100', () => {
    const answers = makeAnswers(3);
    const result = analyzeAnswers(answers);
    result.allScores.forEach((score) => {
      expect(score.percentage).toBeGreaterThanOrEqual(0);
      expect(score.percentage).toBeLessThanOrEqual(100);
    });
  });

  it('exit strategy steps should be numbered sequentially', () => {
    const answers = makeAnswers(4);
    const result = analyzeAnswers(answers);
    result.exitStrategy.forEach((step, i) => {
      expect(step.step).toBe(i + 1);
      expect(step.title).toBeTruthy();
      expect(step.action).toBeTruthy();
    });
  });
});
