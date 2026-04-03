/**
 * Report Quality Validator
 * 
 * Validates that generated report content meets quality criteria:
 * 1. Has conflict (not just description)
 * 2. Has cause (why it happens)
 * 3. Has consequence (what it costs)
 * 4. Has clear direction (what to do)
 * 
 * If content is generic or predictable, it refines automatically.
 */

import { DiagnosticResult } from '@/types/diagnostic';

// ──────────────────────────────────────────────
// GENERIC PHRASES BLACKLIST
// ──────────────────────────────────────────────

const GENERIC_PHRASES = [
  'você precisa de mais disciplina',
  'tenha mais foco',
  'acredite em si mesmo',
  'você consegue',
  'basta querer',
  'saia da zona de conforto',
  'seja mais organizado',
  'defina suas prioridades',
  'tenha mais autoconfiança',
  'pratique o autoconhecimento',
  'busque equilíbrio',
  'reflita sobre',
  'tente se conhecer melhor',
  'você é capaz',
  'não desista',
  'mantenha a calma',
  'respire fundo',
  'faça uma lista',
  'crie uma rotina',
  'defina metas claras',
  'siga sua paixão',
  'o universo conspira',
  'tudo acontece por um motivo',
];

const VAGUE_PATTERNS = [
  /^(você |o usuário )?(precisa|deve|deveria|poderia) (ter mais|buscar|encontrar|desenvolver)/i,
  /^(tente|procure|busque) (ser|ter|encontrar) (mais|melhor)/i,
  /^(é importante|é fundamental|é essencial) (que você|buscar|ter)/i,
];

// ──────────────────────────────────────────────
// QUALITY CHECKS
// ──────────────────────────────────────────────

interface QualityCheck {
  name: string;
  check: (text: string) => boolean;
}

const CONFLICT_INDICATORS = ['mas ', 'porém', 'no entanto', 'ao mesmo tempo', 'enquanto', 'contradição', 'conflito', 'oposto', 'paradoxo', 'versus', 'contra ', ' vs '];
const CAUSE_INDICATORS = ['porque', 'pois', 'causa', 'raiz', 'origem', 'motivo', 'fonte', 'gera ', 'produz', 'alimenta', 'sustenta', 'mantém', 'reforça'];
const CONSEQUENCE_INDICATORS = ['resultado', 'consequência', 'efeito', 'impacto', 'custo', 'preço', 'leva a', 'provoca', 'causa ', 'gera ', 'produz', 'destrui', 'compromete', 'impede'];
const DIRECTION_INDICATORS = ['quando', 'nos próximos', 'durante', 'por ', 'dias', 'minutos', 'semana', 'primeiro passo', 'comece', 'pare de', 'substitua', 'ao perceber', 'no momento em que'];

function hasIndicators(text: string, indicators: string[]): boolean {
  const lower = text.toLowerCase();
  return indicators.some(ind => lower.includes(ind));
}

function isGeneric(text: string): boolean {
  const lower = text.toLowerCase();
  if (GENERIC_PHRASES.some(phrase => lower.includes(phrase))) return true;
  if (VAGUE_PATTERNS.some(pattern => pattern.test(text))) return true;
  if (text.length < 30) return true;
  return false;
}

// ──────────────────────────────────────────────
// REFINEMENT FUNCTIONS
// ──────────────────────────────────────────────

function refineCorePain(original: string, dominantLabel: string, blockingPoint: string): string {
  if (!isGeneric(original) && hasIndicators(original, CAUSE_INDICATORS)) return original;
  return `${original} Isso acontece porque o padrão de ${dominantLabel.toLowerCase()} se ativa automaticamente, criando um ciclo onde ${blockingPoint.toLowerCase().replace(/\.$/, '')} — e cada repetição reforça a crença de que essa é a única forma de funcionar.`;
}

function refineDirection(original: string, dominantLabel: string): string {
  if (!isGeneric(original) && hasIndicators(original, DIRECTION_INDICATORS)) return original;
  return `${original} Ação imediata: nos próximos 7 dias, ao perceber o padrão de ${dominantLabel.toLowerCase()} se ativando, pause por 90 segundos antes de agir no automático. O objetivo não é mudar — é perceber o momento exato da decisão inconsciente.`;
}

function refineSummary(original: string, conflicts: number, selfDeception: number): string {
  if (!isGeneric(original) && original.length > 100) return original;
  let refined = original;
  if (conflicts > 0 && !hasIndicators(original, CONFLICT_INDICATORS)) {
    refined += ` Existem ${conflicts} conflito${conflicts > 1 ? 's' : ''} interno${conflicts > 1 ? 's' : ''} ativo${conflicts > 1 ? 's' : ''} que fragmentam sua energia e tornam a mudança mais difícil do que deveria ser.`;
  }
  if (selfDeception >= 40 && !original.includes('autoengano') && !original.includes('percepção')) {
    refined += ` Há uma desconexão de ${selfDeception}% entre como você se percebe e como realmente se comporta — essa distância é o que impede mudanças reais.`;
  }
  return refined;
}

function refineCriticalDiagnosis(original: string, mechanism: string): string {
  if (!isGeneric(original) && hasIndicators(original, CAUSE_INDICATORS) && hasIndicators(original, CONSEQUENCE_INDICATORS)) return original;
  if (!hasIndicators(original, CAUSE_INDICATORS)) {
    original += ` A causa raiz é o mecanismo de ${mechanism.toLowerCase().split('.')[0]}.`;
  }
  if (!hasIndicators(original, CONSEQUENCE_INDICATORS)) {
    original += ` O custo disso é a perda progressiva de confiança na própria capacidade de mudança.`;
  }
  return original;
}

function refineKeyUnlockArea(original: string): string {
  if (!isGeneric(original) && hasIndicators(original, DIRECTION_INDICATORS)) return original;
  return original;
}

function refineTriggers(triggers: string[]): string[] {
  return triggers.map(t => {
    if (t.length < 30 || isGeneric(t)) {
      return `${t} — observe em que momento do dia isso acontece com mais frequência e o que você estava fazendo/sentindo imediatamente antes.`;
    }
    return t;
  });
}

function refineMentalTraps(traps: string[]): string[] {
  return traps.map(t => {
    if (t.length < 20) {
      return `"${t}" — essa frase opera como permissão interna para manter o padrão ativo sem questionamento.`;
    }
    return t;
  });
}

function refineExitStrategy(steps: { step: number; title: string; action: string }[]): { step: number; title: string; action: string }[] {
  return steps.map(s => {
    if (isGeneric(s.action) || !hasIndicators(s.action, DIRECTION_INDICATORS)) {
      return {
        ...s,
        action: `${s.action} Prazo: comece nos próximos 3 dias. Critério de sucesso: completar pelo menos 4 dos 7 dias.`,
      };
    }
    return s;
  });
}

function refineWhatNotToDo(items: string[]): string[] {
  return items.map(item => {
    if (item.length < 30) {
      return `${item} — isso parece produtivo mas reforça exatamente o padrão que precisa ser quebrado.`;
    }
    return item;
  });
}

// ──────────────────────────────────────────────
// MAIN VALIDATOR
// ──────────────────────────────────────────────

export function validateAndRefineReport(result: DiagnosticResult): DiagnosticResult {
  const conflicts = result.interpretation?.internalConflicts.length || 0;
  const selfDeception = result.interpretation?.selfDeceptionIndex || 0;
  const dominantLabel = result.dominantPattern.label;

  return {
    ...result,
    corePain: refineCorePain(result.corePain, dominantLabel, result.blockingPoint),
    direction: refineDirection(result.direction, dominantLabel),
    summary: refineSummary(result.summary, conflicts, selfDeception),
    criticalDiagnosis: refineCriticalDiagnosis(result.criticalDiagnosis, result.mechanism),
    keyUnlockArea: refineKeyUnlockArea(result.keyUnlockArea),
    triggers: refineTriggers(result.triggers),
    mentalTraps: refineMentalTraps(result.mentalTraps),
    exitStrategy: refineExitStrategy(result.exitStrategy),
    whatNotToDo: refineWhatNotToDo(result.whatNotToDo),
  };
}
