import { InterpretiveInsight } from './diagnostic';

export type PurposePatternKey =
  | 'meaning_orientation'
  | 'identity_alignment'
  | 'internal_conflict'
  | 'emotional_engagement'
  | 'avoidance'
  | 'external_pressure'
  | 'self_expression'
  | 'fulfillment_level';

export interface PurposeQuestion {
  id: number;
  text: string;
  axes: PurposePatternKey[];
}

export interface PurposePatternScore {
  key: PurposePatternKey;
  label: string;
  score: number;
  maxScore: number;
  percentage: number;
}

export type PurposeConnectionLevel = 'desconectado' | 'parcial' | 'conectado';

export type MeaningConstructionType =
  | 'contribuição'
  | 'criação'
  | 'reconhecimento'
  | 'liberdade'
  | 'estabilidade'
  | 'conexão';

export interface PurposeLifePillarImpact {
  pillar: string;
  impact: string;
}

export interface PurposeExitStep {
  step: number;
  title: string;
  action: string;
}

export interface PurposeResult {
  connectionLevel: PurposeConnectionLevel;
  meaningType: MeaningConstructionType;
  mainConflict: string;
  disconnectionPoint: string;
  perceivedVoid: string;
  escapePatter: string;
  idealEnvironment: string;
  reconnectionDirection: string;
  dominantPattern: PurposePatternDefinition;
  secondaryPatterns: PurposePatternDefinition[];
  allScores: PurposePatternScore[];
  summary: string;
  combinedTitle: string;
  profileName: string;
  mentalState: string;
  triggers: string[];
  mentalTraps: string[];
  selfSabotageCycle: string[];
  blockingPoint: string;
  lifeImpact: PurposeLifePillarImpact[];
  exitStrategy: PurposeExitStep[];
  corePain: string;
  keyUnlockArea: string;
  criticalDiagnosis: string;
  whatNotToDo: string[];
  contradiction: string;
  mechanism: string;
  impact: string;
  direction: string;
  intensity: 'leve' | 'moderado' | 'alto';
}

export interface PurposePatternDefinition {
  key: PurposePatternKey;
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
  lifeImpact: PurposeLifePillarImpact[];
  exitStrategy: PurposeExitStep[];
  corePain: string;
  keyUnlockArea: string;
  criticalDiagnosis: string;
  whatNotToDo: string[];
  meaningType: MeaningConstructionType;
  disconnectionPoint: string;
  perceivedVoid: string;
  escapePatter: string;
  idealEnvironment: string;
}
