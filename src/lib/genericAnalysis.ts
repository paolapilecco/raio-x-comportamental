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
