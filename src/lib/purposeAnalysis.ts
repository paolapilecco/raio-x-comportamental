import { PurposePatternKey, PurposePatternScore, PurposeResult, PurposeConnectionLevel, MeaningConstructionType } from '@/types/purpose';
import { purposeQuestions } from '@/data/purposeQuestions';
import { purposePatternDefinitions } from '@/data/purposePatterns';
import { Answer } from '@/types/diagnostic';

const ALL_PURPOSE_PATTERNS: PurposePatternKey[] = [
  'meaning_orientation',
  'identity_alignment',
  'internal_conflict',
  'emotional_engagement',
  'avoidance',
  'external_pressure',
  'self_expression',
  'fulfillment_level',
];

// These axes are "inverted" — high score = good (connected), so we invert for problem detection
const POSITIVE_AXES: PurposePatternKey[] = [
  'meaning_orientation',
  'identity_alignment',
  'emotional_engagement',
  'self_expression',
];

function calculatePurposeScores(answers: Answer[]): PurposePatternScore[] {
  const rawScores: Record<PurposePatternKey, number> = {} as any;
  const maxScores: Record<PurposePatternKey, number> = {} as any;

  ALL_PURPOSE_PATTERNS.forEach((key) => {
    rawScores[key] = 0;
    maxScores[key] = 0;
  });

  answers.forEach((answer) => {
    const question = purposeQuestions.find((q) => q.id === answer.questionId);
    if (!question) return;

    question.axes.forEach((axis) => {
      // For positive axes, invert the score (5 becomes 1, 1 becomes 5)
      // so that high percentage = more problematic / disconnected
      if (POSITIVE_AXES.includes(axis)) {
        rawScores[axis] += (6 - answer.value);
      } else {
        rawScores[axis] += answer.value;
      }
      maxScores[axis] += 5;
    });
  });

  return ALL_PURPOSE_PATTERNS.map((key) => ({
    key,
    label: purposePatternDefinitions[key].label,
    score: rawScores[key],
    maxScore: maxScores[key],
    percentage: maxScores[key] > 0 ? Math.round((rawScores[key] / maxScores[key]) * 100) : 0,
  })).sort((a, b) => b.percentage - a.percentage);
}

function getConnectionLevel(avgPercentage: number): PurposeConnectionLevel {
  if (avgPercentage >= 65) return 'desconectado';
  if (avgPercentage >= 40) return 'parcial';
  return 'conectado';
}

function determineMeaningType(scores: PurposePatternScore[]): MeaningConstructionType {
  // Determine based on which positive axes are strongest (least problematic)
  const positiveScores = scores.filter(s => POSITIVE_AXES.includes(s.key));
  const leastProblematic = positiveScores.sort((a, b) => a.percentage - b.percentage)[0];

  if (!leastProblematic) return 'contribuição';

  const typeMap: Record<PurposePatternKey, MeaningConstructionType> = {
    meaning_orientation: 'contribuição',
    identity_alignment: 'liberdade',
    emotional_engagement: 'criação',
    self_expression: 'criação',
    internal_conflict: 'estabilidade',
    avoidance: 'estabilidade',
    external_pressure: 'reconhecimento',
    fulfillment_level: 'conexão',
  };

  return typeMap[leastProblematic.key] || 'contribuição';
}

export function analyzePurposeAnswers(answers: Answer[]): PurposeResult {
  const allScores = calculatePurposeScores(answers);

  const dominant = allScores[0];
  const secondary = allScores.slice(1, 3).filter((s) => s.percentage >= 40);

  const dominantDef = purposePatternDefinitions[dominant.key];
  const secondaryDefs = secondary.map((s) => purposePatternDefinitions[s.key]);

  const avgPercentage = Math.round(allScores.reduce((sum, s) => sum + s.percentage, 0) / allScores.length);
  const connectionLevel = getConnectionLevel(avgPercentage);
  const meaningType = determineMeaningType(allScores);

  const intensity = dominant.percentage >= 75 ? 'alto' as const : dominant.percentage >= 50 ? 'moderado' as const : 'leve' as const;

  const combinedTitle = secondary.length > 0
    ? `${dominantDef.label} com ${secondaryDefs[0].label}`
    : dominantDef.label;

  let summary = dominantDef.description;
  if (secondaryDefs.length > 0) {
    summary += ` Além disso, há traços significativos de ${secondaryDefs.map(d => d.label.toLowerCase()).join(' e ')}, o que aprofunda a desconexão.`;
  }

  let mechanism = dominantDef.mechanism;
  if (secondaryDefs.length > 0) {
    mechanism += ` Esse mecanismo é intensificado pela presença de ${secondaryDefs[0].label.toLowerCase()}: ${secondaryDefs[0].mechanism.charAt(0).toLowerCase() + secondaryDefs[0].mechanism.slice(1)}`;
  }

  const triggers = [...dominantDef.triggers];
  secondaryDefs.forEach(sd => {
    sd.triggers.slice(0, 2).forEach(t => { if (!triggers.includes(t)) triggers.push(t); });
  });

  const mentalTraps = [...dominantDef.mentalTraps];
  secondaryDefs.forEach(sd => {
    sd.mentalTraps.slice(0, 1).forEach(t => { if (!mentalTraps.includes(t)) mentalTraps.push(t); });
  });

  const lifeImpact = [...dominantDef.lifeImpact];
  secondaryDefs.forEach(sd => {
    sd.lifeImpact.slice(0, 2).forEach(li => {
      if (!lifeImpact.find(existing => existing.pillar === li.pillar)) lifeImpact.push(li);
    });
  });

  const exitStrategy = [...dominantDef.exitStrategy];
  if (secondaryDefs.length > 0) {
    exitStrategy.push({
      step: exitStrategy.length + 1,
      title: `Contra ${secondaryDefs[0].label.toLowerCase()}`,
      action: secondaryDefs[0].exitStrategy[0].action,
    });
  }

  const whatNotToDo = [...dominantDef.whatNotToDo];
  secondaryDefs.forEach(sd => {
    sd.whatNotToDo.slice(0, 1).forEach(w => { if (!whatNotToDo.includes(w)) whatNotToDo.push(w); });
  });

  return {
    connectionLevel,
    meaningType,
    mainConflict: dominantDef.contradiction,
    disconnectionPoint: dominantDef.disconnectionPoint,
    perceivedVoid: dominantDef.perceivedVoid,
    escapePatter: dominantDef.escapePatter,
    idealEnvironment: dominantDef.idealEnvironment,
    reconnectionDirection: dominantDef.direction,
    dominantPattern: dominantDef,
    secondaryPatterns: secondaryDefs,
    allScores,
    summary,
    combinedTitle,
    profileName: dominantDef.profileName,
    mentalState: dominantDef.mentalState,
    triggers,
    mentalTraps,
    selfSabotageCycle: dominantDef.selfSabotageCycle,
    blockingPoint: dominantDef.blockingPoint,
    lifeImpact,
    exitStrategy,
    corePain: dominantDef.corePain,
    keyUnlockArea: dominantDef.keyUnlockArea,
    criticalDiagnosis: dominantDef.criticalDiagnosis,
    whatNotToDo,
    contradiction: dominantDef.contradiction,
    mechanism,
    impact: dominantDef.impact,
    direction: dominantDef.direction,
    intensity,
  };
}
