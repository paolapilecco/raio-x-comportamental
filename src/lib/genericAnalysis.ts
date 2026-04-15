import { Answer, DiagnosticResult, IntensityLevel, PatternScore } from '@/types/diagnostic';
import { generateInterpretation } from './interpretationEngine';
import { validateAndRefineReport } from './reportQualityValidator';
import { normalizeScoresForDiagnosis } from './scoreNormalization';
import { analyzeConsistency, applyCounterproofAdjustments, calculateTemperament, type QuestionWithMeta } from './consistencyEngine';

export interface GenericPatternDefinition {
  key: string;
  label: string;
  profileName: string;
  description: string;
  mechanism: string;
  mentalState: string;
  corePain: string;
  keyUnlockArea: string;
  criticalDiagnosis: string;
  whatNotToDo: string[];
  triggers: string[];
  mentalTraps: string[];
  selfSabotageCycle: string[];
  blockingPoint: string;
  contradiction: string;
  impact: string;
  direction: string;
  lifeImpact: { pillar: string; impact: string }[];
  exitStrategy: { step: number; title: string; action: string }[];
}

interface DbQuestion {
  id: number;
  text: string;
  axes: string[];
  type?: string;
  option_scores?: number[] | null;
  weight?: number;
}

function getIntensity(percentage: number): IntensityLevel {
  if (percentage >= 75) return 'alto';
  if (percentage >= 50) return 'moderado';
  return 'leve';
}

export function analyzeGenericTest(
  answers: Answer[],
  questions: DbQuestion[],
  axisKeys: string[],
  definitions: Record<string, GenericPatternDefinition>,
  moduleSlug?: string
): DiagnosticResult {
  // Calculate scores per axis
  const rawScores: Record<string, number> = {};
  const maxScores: Record<string, number> = {};
  axisKeys.forEach(k => { rawScores[k] = 0; maxScores[k] = 0; });

  answers.forEach(answer => {
    const question = questions.find(q => q.id === answer.questionId);
    if (!question) return;

    let scoreValue: number;
    let maxPerQuestion: number;

    if (question.option_scores && question.option_scores.length > 0) {
      const idx = Math.max(0, Math.min(answer.value - 1, question.option_scores.length - 1));
      scoreValue = question.option_scores[idx];
      maxPerQuestion = Math.max(...question.option_scores);
    } else if (question.type === 'intensity') {
      scoreValue = answer.value;
      maxPerQuestion = 10;
    } else {
      scoreValue = Math.max(0, answer.value - 1);
      maxPerQuestion = 4;
    }

    const weight = question.weight || 1;
    question.axes.forEach(axis => {
      if (axis in rawScores) {
        rawScores[axis] += scoreValue * weight;
        maxScores[axis] += maxPerQuestion * weight;
      }
    });
  });

  const rawAllScores: PatternScore[] = axisKeys.map(key => ({
    key: key as any,
    label: definitions[key]?.label || key,
    score: rawScores[key],
    maxScore: maxScores[key],
    percentage: maxScores[key] > 0 ? Math.min(100, Math.round((rawScores[key] / maxScores[key]) * 100)) : 0,
  })).sort((a, b) => b.percentage - a.percentage);

  // Build scores map for consistency analysis
  const scoresMap: Record<string, number> = {};
  rawAllScores.forEach(s => { scoresMap[s.key] = s.percentage; });

  // Run consistency engine
  const questionsWithMeta: QuestionWithMeta[] = questions.map(q => ({
    id: q.id,
    axes: q.axes,
    type: q.type,
    question_category: (q as any).question_category,
    mirror_pair_id: (q as any).mirror_pair_id,
    is_counterproof: (q as any).is_counterproof,
    weight: q.weight,
    option_scores: q.option_scores,
  }));
  const consistency = analyzeConsistency(answers, questionsWithMeta, scoresMap);

  // Apply counter-proof adjustments to scores
  const adjustedScores = applyCounterproofAdjustments(rawAllScores, consistency.counterproofAdjustments);
  const allScores = normalizeScoresForDiagnosis(adjustedScores);

  // Calculate temperament
  const temperament = calculateTemperament(scoresMap);

  const dominant = allScores[0];
  const secondary = allScores.slice(1, 3).filter(s => s.percentage >= 40);

  const dominantDef = definitions[dominant.key];
  const secondaryDefs = secondary.map(s => definitions[s.key]).filter(Boolean);

  const intensity = getIntensity(dominant.percentage);

  // ── INTERPRETATION ENGINE ──
  const questionMeta = questions.map(q => ({
    id: q.id,
    axes: q.axes,
    type: q.type || 'likert',
  }));
  const interpretation = generateInterpretation(answers, questionMeta, allScores, dominant.label, moduleSlug);

  // Enrich interpretation with consistency data
  interpretation.consistencyScore = consistency.consistencyScore;
  interpretation.confidenceLevel = consistency.confidenceLevel;
  interpretation.confidenceScore = consistency.confidenceScore;
  interpretation.contradictionCount = consistency.contradictionCount;
  interpretation.responsePatternFlags = consistency.responsePatternFlags;
  interpretation.temperamentProfile = temperament;

  const corePain = interpretation.derivedCorePain || dominantDef.corePain;
  const keyUnlockArea = interpretation.derivedKeyUnlockArea || dominantDef.keyUnlockArea;

    ? `${dominantDef.label} com ${secondaryDefs[0]?.label}`
    : dominantDef.label;

  let summary = dominantDef.description;
  if (secondaryDefs.length > 0) {
    summary += ` Além disso, há traços significativos de ${secondaryDefs.map(d => d.label.toLowerCase()).join(' e ')}, o que intensifica a complexidade do seu funcionamento.`;
  }
  if (interpretation.interpretiveSummary) {
    summary += `\n\n${interpretation.interpretiveSummary}`;
  }

  let mechanism = dominantDef.mechanism;
  if (secondaryDefs.length > 0) {
    mechanism += ` Esse mecanismo é amplificado pela presença de ${secondaryDefs[0].label.toLowerCase()}: ${secondaryDefs[0].mechanism.charAt(0).toLowerCase() + secondaryDefs[0].mechanism.slice(1)}`;
  }

  let contradiction = dominantDef.contradiction;
  if (interpretation.contradictions.length > 0) {
    contradiction = `${interpretation.contradictions[0].label}: ${interpretation.contradictions[0].description}`;
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
      if (!lifeImpact.find(e => e.pillar === li.pillar)) lifeImpact.push(li);
    });
  });

  const exitStrategy = [...dominantDef.exitStrategy];
  if (secondaryDefs.length > 0) {
    exitStrategy.push({
      step: exitStrategy.length + 1,
      title: `Contra ${secondaryDefs[0].label.toLowerCase()}`,
      action: secondaryDefs[0].exitStrategy[0]?.action || '',
    });
  }

  const whatNotToDo = [...dominantDef.whatNotToDo];
  secondaryDefs.forEach(sd => {
    sd.whatNotToDo.slice(0, 1).forEach(w => { if (!whatNotToDo.includes(w)) whatNotToDo.push(w); });
  });

  let criticalDiagnosis = dominantDef.criticalDiagnosis;
  if (interpretation.selfDeceptionIndex >= 50) {
    criticalDiagnosis += ` Índice de autoengano: ${interpretation.selfDeceptionIndex}%.`;
  }

  const toPatternDef = (d: GenericPatternDefinition) => ({
    key: d.key as any,
    label: d.label,
    description: d.description,
    mechanism: d.mechanism,
    contradiction: d.contradiction,
    impact: d.impact,
    direction: d.direction,
    profileName: d.profileName,
    mentalState: d.mentalState,
    triggers: d.triggers,
    mentalTraps: d.mentalTraps,
    selfSabotageCycle: d.selfSabotageCycle,
    blockingPoint: d.blockingPoint,
    lifeImpact: d.lifeImpact,
    exitStrategy: d.exitStrategy,
    corePain: d.corePain,
    keyUnlockArea: d.keyUnlockArea,
    criticalDiagnosis: d.criticalDiagnosis,
    whatNotToDo: d.whatNotToDo,
  });

  const rawResult: DiagnosticResult = {
    dominantPattern: toPatternDef(dominantDef),
    secondaryPatterns: secondaryDefs.map(toPatternDef),
    intensity,
    allScores,
    summary,
    mechanism,
    contradiction,
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
    corePain,
    keyUnlockArea,
    criticalDiagnosis,
    whatNotToDo,
    interpretation,
  };

  return validateAndRefineReport(rawResult);
}
