export type PatternKey =
  | 'unstable_execution'
  | 'emotional_self_sabotage'
  | 'functional_overload'
  | 'discomfort_escape'
  | 'paralyzing_perfectionism'
  | 'validation_dependency'
  | 'excessive_self_criticism'
  | 'low_routine_sustenance';

export interface Question {
  id: number;
  text: string;
  axes: PatternKey[];
}

export interface Answer {
  questionId: number;
  value: number; // 1-5
}

export interface PatternScore {
  key: PatternKey;
  label: string;
  score: number;
  maxScore: number;
  percentage: number;
}

export type IntensityLevel = 'leve' | 'moderado' | 'alto';

export interface DiagnosticResult {
  dominantPattern: PatternDefinition;
  secondaryPatterns: PatternDefinition[];
  intensity: IntensityLevel;
  allScores: PatternScore[];
  summary: string;
  mechanism: string;
  contradiction: string;
  impact: string;
  direction: string;
  combinedTitle: string;
  profileName: string;
  mentalState: string;
  triggers: string[];
  mentalTraps: string[];
  selfSabotageCycle: string[];
  blockingPoint: string;
  lifeImpact: LifePillarImpact[];
  exitStrategy: ExitStep[];
  corePain: string;
  keyUnlockArea: string;
  criticalDiagnosis: string;
  whatNotToDo: string[];
}

export interface LifePillarImpact {
  pillar: string;
  impact: string;
}

export interface ExitStep {
  step: number;
  title: string;
  action: string;
}

export interface PatternDefinition {
  key: PatternKey;
  label: string;
  description: string;
  mechanism: string;
  contradiction: string;
  impact: string;
  direction: string;
  profileName: string;
  mentalState: string;
  triggers: string[];
  mentalTraps: string[];
  selfSabotageCycle: string[];
  blockingPoint: string;
  lifeImpact: LifePillarImpact[];
  exitStrategy: ExitStep[];
  corePain: string;
  keyUnlockArea: string;
  criticalDiagnosis: string;
  whatNotToDo: string[];
}

export type DiagnosticStep = 'landing' | 'questionnaire' | 'analyzing' | 'report';
