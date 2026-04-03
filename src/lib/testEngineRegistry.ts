import { GenericPatternDefinition } from './genericAnalysis';
import { EXECUTION_AXES, executionPatterns } from '@/data/executionPatterns';
import { EMOTIONAL_AXES, emotionalPatterns } from '@/data/emotionalPatterns';
import { RELATIONSHIP_AXES, relationshipPatterns } from '@/data/relationshipPatterns';
import { SELF_IMAGE_AXES, selfImagePatterns } from '@/data/selfImagePatterns';
import { MONEY_AXES, moneyPatterns } from '@/data/moneyPatterns';
import { HIDDEN_AXES, hiddenPatterns } from '@/data/hiddenPatterns';

export interface TestEngine {
  axes: string[];
  definitions: Record<string, GenericPatternDefinition>;
}

const engineRegistry: Record<string, TestEngine> = {
  'execucao-produtividade': {
    axes: EXECUTION_AXES,
    definitions: executionPatterns,
  },
  'emocoes-reatividade': {
    axes: EMOTIONAL_AXES,
    definitions: emotionalPatterns,
  },
  'relacionamentos-apego': {
    axes: RELATIONSHIP_AXES,
    definitions: relationshipPatterns,
  },
  'autoimagem-identidade': {
    axes: SELF_IMAGE_AXES,
    definitions: selfImagePatterns,
  },
  'dinheiro-decisao': {
    axes: MONEY_AXES,
    definitions: moneyPatterns,
  },
  'padroes-ocultos': {
    axes: HIDDEN_AXES,
    definitions: hiddenPatterns,
  },
};

export function getTestEngine(slug: string): TestEngine | null {
  return engineRegistry[slug] || null;
}

export function hasSpecificEngine(slug: string): boolean {
  return slug in engineRegistry;
}
