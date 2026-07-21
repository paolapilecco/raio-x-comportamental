/**
 * Mirrors STRONG_VERBS from supabase/functions/analyze-test/index.ts.
 * The edge function requires every tarefaEstrategica's ação to contain one of these verbs;
 * if an admin bans one of them via ReportTemplatePanel's forbiddenTerms, the AI can never
 * produce a valid action and the "Plano estratégico" section silently disappears from every
 * report generated with that template. Keep this list in sync with the edge function's copy.
 */
export const STRONG_VERBS = new Set([
  'pare', 'interrompa', 'responda', 'envie', 'entregue', 'diga', 'faca',
  'anote', 'corte', 'recuse', 'finalize', 'publique', 'apague', 'reescreva', 'bloqueie',
  'cronometre', 'defina', 'assuma', 'avise', 'saia', 'volte', 'retome', 'cancele',
  'feche', 'abra', 'grave', 'marque', 'combine', 'delegue', 'pergunte', 'exponha',
  'escreva', 'liste', 'elimine', 'substitua', 'confronte', 'declare', 'mude',
]);

const DIACRITICS_REGEX = new RegExp('[\\u0300-\\u036f]', 'g');

function norm(text: string): string {
  return text.toLowerCase().normalize('NFD').replace(DIACRITICS_REGEX, '').trim();
}

/**
 * Returns the forbidden terms that overlap with a verb the action-validation step requires.
 * Banning ALL of these at once would make it mathematically impossible for the AI to pass
 * validation (no strong verb left to use), soft-failing the strategic action plan.
 */
export function findStrongVerbConflicts(forbiddenTerms: string[]): string[] {
  return forbiddenTerms.filter((term) => STRONG_VERBS.has(norm(term)));
}
