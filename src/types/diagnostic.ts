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

export interface InternalConflict {
  patternA: string;
  patternB: string;
  description: string;
  severity: 'moderate' | 'high' | 'critical';
}

export interface ResponseContradiction {
  type: string;
  label: string;
  description: string;
  evidence: string;
}

export interface BehavioralProfile {
  id: string;
  name: string;
  description: string;
  dominantTraits: string[];
  riskLevel: 'low' | 'moderate' | 'high' | 'critical';
}

export interface BlindSpot {
  perceivedProblem: string;
  realProblem: string;
}

export interface InterpretiveInsight {
  internalConflicts: InternalConflict[];
  contradictions: ResponseContradiction[];
  derivedCorePain: string;
  derivedKeyUnlockArea: string;
  behaviorVsPerceptionGap: number; // 0-100
  selfDeceptionIndex: number; // 0-100
  interpretiveSummary: string;
  behavioralProfile: BehavioralProfile;
  blindSpot: BlindSpot;
  // Enhanced consistency fields
  consistencyScore?: number;        // 0-100
  confidenceLevel?: 'alta' | 'media' | 'baixa';
  confidenceScore?: number;         // 0-100
  contradictionCount?: number;
  responsePatternFlags?: string[];
  temperamentProfile?: {
    sanguineo: number;
    colerico: number;
    melancolico: number;
    fleumatico: number;
    dominant: string;
    secondary: string | null;
  };
}

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
  interpretation?: InterpretiveInsight;
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
