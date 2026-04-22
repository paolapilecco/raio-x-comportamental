/**
 * Pretty Portuguese labels for behavioral pattern axes.
 * Replaces raw snake_case keys from the DB with clinical, presentable names.
 *
 * Used by BehavioralRadar (web) and generatePdf (PDF). If a key is missing,
 * we humanize it on the fly (snake_case -> Title Case).
 */
const MAP: Record<string, string> = {
  functional_overload: 'Sobrecarga Funcional',
  discomfort_escape: 'Fuga do Desconforto',
  excessive_self_criticism: 'Autocrítica Excessiva',
  validation_dependency: 'Dependência de Validação',
  paralyzing_perfectionism: 'Perfeccionismo Paralisante',
  emotional_self_sabotage: 'Autossabotagem Emocional',
  unstable_execution: 'Execução Instável',
  low_routine_sustenance: 'Baixa Sustentação de Rotina',
  // Common variants seen in other test modules
  procrastination: 'Procrastinação',
  avoidance: 'Evitação',
  control_need: 'Necessidade de Controle',
  rigidity: 'Rigidez Mental',
  impulsivity: 'Impulsividade',
  rumination: 'Ruminação',
  social_anxiety: 'Ansiedade Social',
  conflict_aversion: 'Aversão ao Conflito',
};

function humanize(key: string): string {
  return key
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function getBehavioralAxisLabel(key: string, fallback?: string): string {
  if (MAP[key]) return MAP[key];
  // If there's a fallback that already looks like Portuguese (has space or accent), use it
  if (fallback && (fallback.includes(' ') || /[áàâãéêíóôõúç]/i.test(fallback))) {
    return fallback;
  }
  return humanize(fallback || key);
}
