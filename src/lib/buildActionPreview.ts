/**
 * Action string parser utility.
 * 
 * ARCHITECTURE:
 * - Actions are generated EXCLUSIVELY in the backend (analyze-test edge function)
 * - Persisted in action_plan_tracking table
 * - Frontend ONLY reads and renders — NO generation, NO fallback
 * - This file provides ONLY parsing utilities
 */

export interface ActionPreview {
  trigger: string;
  action: string;
}

/** Parse a persisted action string back into trigger/action */
export function parseActionString(text: string): ActionPreview {
  // Try "Quando X → Y" format
  const matchQuando = text.match(/^Quando\s+(.+?)\s+→\s+(.+)$/i);
  if (matchQuando) return { trigger: matchQuando[1], action: matchQuando[2] };
  
  // Try "Se X → Y" format (legacy)
  const matchSe = text.match(/^Se\s+(.+?)\s+→\s+(.+)$/i);
  if (matchSe) return { trigger: matchSe[1], action: matchSe[2] };
  
  return { trigger: 'o padrão se repetir', action: text };
}

/** Convert ActionPreview[] to strings for persistence in action_plan_tracking */
export function actionPreviewsToStrings(previews: ActionPreview[]): string[] {
  return previews.map(p => `Quando ${p.trigger} → ${p.action}`);
}
