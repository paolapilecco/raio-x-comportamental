import { Answer, DiagnosticResult, IntensityLevel, PatternKey, PatternScore } from '@/types/diagnostic';
import { questions } from '@/data/questions';
import { patternDefinitions } from '@/data/patterns';

const ALL_PATTERNS: PatternKey[] = [
  'unstable_execution',
  'emotional_self_sabotage',
  'functional_overload',
  'discomfort_escape',
  'paralyzing_perfectionism',
  'validation_dependency',
  'excessive_self_criticism',
  'low_routine_sustenance',
];

function calculateScores(answers: Answer[]): PatternScore[] {
  const rawScores: Record<PatternKey, number> = {} as any;
  const maxScores: Record<PatternKey, number> = {} as any;

  ALL_PATTERNS.forEach((key) => {
    rawScores[key] = 0;
    maxScores[key] = 0;
  });

  answers.forEach((answer) => {
    const question = questions.find((q) => q.id === answer.questionId);
    if (!question) return;

    question.axes.forEach((axis) => {
      rawScores[axis] += answer.value;
      maxScores[axis] += 5;
    });
  });

  return ALL_PATTERNS.map((key) => ({
    key,
    label: patternDefinitions[key].label,
    score: rawScores[key],
    maxScore: maxScores[key],
    percentage: maxScores[key] > 0 ? Math.round((rawScores[key] / maxScores[key]) * 100) : 0,
  })).sort((a, b) => b.percentage - a.percentage);
}

function getIntensity(percentage: number): IntensityLevel {
  if (percentage >= 75) return 'alto';
  if (percentage >= 50) return 'moderado';
  return 'leve';
}

export function analyzeAnswers(answers: Answer[]): DiagnosticResult {
  const allScores = calculateScores(answers);

  const dominant = allScores[0];
  const secondary = allScores.slice(1, 3).filter((s) => s.percentage >= 40);

  const dominantDef = patternDefinitions[dominant.key];
  const secondaryDefs = secondary.map((s) => patternDefinitions[s.key]);

  const intensity = getIntensity(dominant.percentage);

  const combinedTitle = secondary.length > 0
    ? `${dominantDef.label} com ${secondaryDefs[0].label}`
    : dominantDef.label;

  let summary = dominantDef.description;
  if (secondaryDefs.length > 0) {
    summary += ` Além disso, há traços significativos de ${secondaryDefs.map(d => d.label.toLowerCase()).join(' e ')}, o que intensifica a complexidade do seu funcionamento.`;
  }

  let mechanism = dominantDef.mechanism;
  if (secondaryDefs.length > 0) {
    mechanism += ` Esse mecanismo é amplificado pela presença de ${secondaryDefs[0].label.toLowerCase()}: ${secondaryDefs[0].mechanism.charAt(0).toLowerCase() + secondaryDefs[0].mechanism.slice(1)}`;
  }

  // Combine triggers from dominant + secondary
  const triggers = [...dominantDef.triggers];
  if (secondaryDefs.length > 0) {
    secondaryDefs.forEach(sd => {
      sd.triggers.slice(0, 2).forEach(t => {
        if (!triggers.includes(t)) triggers.push(t);
      });
    });
  }

  // Combine mental traps
  const mentalTraps = [...dominantDef.mentalTraps];
  if (secondaryDefs.length > 0) {
    secondaryDefs.forEach(sd => {
      sd.mentalTraps.slice(0, 1).forEach(t => {
        if (!mentalTraps.includes(t)) mentalTraps.push(t);
      });
    });
  }

  // Combine life impacts
  const lifeImpact = [...dominantDef.lifeImpact];
  if (secondaryDefs.length > 0) {
    secondaryDefs.forEach(sd => {
      sd.lifeImpact.slice(0, 2).forEach(li => {
        if (!lifeImpact.find(existing => existing.pillar === li.pillar)) {
          lifeImpact.push(li);
        }
      });
    });
  }

  // Combine exit strategies
  const exitStrategy = [...dominantDef.exitStrategy];
  if (secondaryDefs.length > 0) {
    const secondaryStep = secondaryDefs[0].exitStrategy[0];
    exitStrategy.push({
      step: exitStrategy.length + 1,
      title: `Contra ${secondaryDefs[0].label.toLowerCase()}`,
      action: secondaryStep.action,
    });
  }

  // Combine whatNotToDo
  const whatNotToDo = [...dominantDef.whatNotToDo];
  if (secondaryDefs.length > 0) {
    secondaryDefs.forEach(sd => {
      sd.whatNotToDo.slice(0, 1).forEach(w => {
        if (!whatNotToDo.includes(w)) whatNotToDo.push(w);
      });
    });
  }

  return {
    dominantPattern: dominantDef,
    secondaryPatterns: secondaryDefs,
    intensity,
    allScores,
    summary,
    mechanism,
    contradiction: dominantDef.contradiction,
    impact: dominantDef.impact,
    direction: dominantDef.direction,
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
  };
}
