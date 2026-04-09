import { GenericPatternDefinition } from '@/lib/genericAnalysis';
import { patternDefinitions } from './patterns';

/**
 * Portuguese axis keys matching the DB questions for "padrao-comportamental".
 * Maps to the existing English-keyed patternDefinitions.
 */
export const BEHAVIORAL_AXES = [
  'execucao_instavel',
  'autossabotagem_emocional',
  'sobrecarga_funcional',
  'fuga_desconforto',
  'perfeccionismo_paralisante',
  'dependencia_validacao',
  'autocritica_excessiva',
  'sustentacao_baixa',
];

const AXIS_TO_PATTERN: Record<string, string> = {
  execucao_instavel: 'unstable_execution',
  autossabotagem_emocional: 'emotional_self_sabotage',
  sobrecarga_funcional: 'functional_overload',
  fuga_desconforto: 'discomfort_escape',
  perfeccionismo_paralisante: 'paralyzing_perfectionism',
  dependencia_validacao: 'validation_dependency',
  autocritica_excessiva: 'excessive_self_criticism',
  sustentacao_baixa: 'low_routine_sustenance',
};

function toGeneric(ptKey: string): GenericPatternDefinition {
  const enKey = AXIS_TO_PATTERN[ptKey];
  const p = patternDefinitions[enKey as keyof typeof patternDefinitions];
  return {
    key: ptKey,
    label: p.label,
    profileName: p.profileName,
    description: p.description,
    mechanism: p.mechanism,
    mentalState: p.mentalState,
    corePain: p.corePain,
    keyUnlockArea: p.keyUnlockArea,
    criticalDiagnosis: p.criticalDiagnosis,
    whatNotToDo: p.whatNotToDo,
    triggers: p.triggers,
    mentalTraps: p.mentalTraps,
    selfSabotageCycle: p.selfSabotageCycle,
    blockingPoint: p.blockingPoint,
    contradiction: p.contradiction,
    impact: p.impact,
    direction: p.direction,
    lifeImpact: p.lifeImpact,
    exitStrategy: p.exitStrategy,
  };
}

export const behavioralPatterns: Record<string, GenericPatternDefinition> = Object.fromEntries(
  BEHAVIORAL_AXES.map(ptKey => [ptKey, toGeneric(ptKey)])
);
