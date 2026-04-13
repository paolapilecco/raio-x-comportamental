/**
 * Builds exactly 3 practical "Quando X → faça Y" actions from diagnosis data.
 * 
 * ARCHITECTURE:
 * - Called ONCE in Diagnostic.tsx after analysis
 * - Persisted as strings in action_plan_tracking
 * - Report.tsx, Dashboard, and PDF all READ from action_plan_tracking
 * - This file is the SINGLE SOURCE of action generation logic
 * 
 * QUALITY RULES:
 * - Every action must have a concrete situational trigger
 * - Every action must have an executable response with time/quantity
 * - No generic phrases like "mude seu comportamento"
 * - Format: "Quando [situação específica] → [ação concreta com prazo/medida]"
 */

import { DiagnosticResult } from '@/types/diagnostic';

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

export function buildActionPreviews(result: DiagnosticResult): ActionPreview[] {
  const ai = result as any;
  const actions: ActionPreview[] = [];

  // 1. From AI microAcoes (highest quality — AI-generated trigger-action pairs)
  if (Array.isArray(ai.microAcoes)) {
    ai.microAcoes.forEach((a: any) => {
      if (actions.length >= 3) return;
      if (typeof a === 'object' && a?.gatilho && a?.acao) {
        actions.push({ trigger: a.gatilho, action: a.acao });
      } else if (typeof a === 'object' && a?.acao) {
        actions.push({ trigger: 'o padrão se ativar', action: a.acao });
      }
    });
  }

  // 2. From exitStrategy
  if (actions.length < 3 && Array.isArray(result.exitStrategy)) {
    result.exitStrategy.forEach((s: any) => {
      if (actions.length >= 3) return;
      const text = s.action || s.title || '';
      if (text && !actions.some(a => a.action === text)) {
        actions.push({ trigger: s.trigger || s.gatilho || 'o comportamento aparecer', action: text });
      }
    });
  }

  // 3. Build concrete trigger→action fallbacks from diagnosis fields
  const triggers = Array.isArray(result.triggers) ? result.triggers : [];
  const traps = Array.isArray(result.mentalTraps) ? result.mentalTraps : [];
  const gatilhos = Array.isArray(ai.gatilhos) ? ai.gatilhos : [];
  const allTriggers = [...gatilhos, ...triggers].filter(Boolean);
  const truncate = (s: string, max = 55) => s.length > max ? s.slice(0, max - 3) + '...' : s;

  const fallbacks: ActionPreview[] = [];

  // Fallback 1: blockingPoint → concrete pause with timer
  if (result.blockingPoint) {
    const bp = truncate(result.blockingPoint);
    fallbacks.push({
      trigger: `você perceber que "${bp}"`,
      action: 'pare, conte até 5 em silêncio e pergunte em voz alta: "eu estou escolhendo isso ou reagindo no automático?"',
    });
  }

  // Fallback 2: first trigger → write it down
  if (allTriggers[0]) {
    const t = truncate(allTriggers[0]);
    fallbacks.push({
      trigger: `"${t}" acontecer`,
      action: 'abra o bloco de notas do celular e escreva: situação, o que sentiu e o que fez. Releia antes de dormir',
    });
  }

  // Fallback 3: mental trap → inversion test
  if (traps[0]) {
    const trap = truncate(traps[0]);
    fallbacks.push({
      trigger: `o pensamento "${trap}" aparecer`,
      action: 'faça exatamente o oposto do que o pensamento manda por 5 minutos. Anote o que aconteceu de diferente',
    });
  }

  // Fallback 4: second trigger → body scan
  if (allTriggers[1]) {
    const t = truncate(allTriggers[1]);
    fallbacks.push({
      trigger: `você notar "${t}"`,
      action: 'feche os olhos por 10 segundos, sinta onde o corpo tensiona e respire nesse ponto 3 vezes antes de agir',
    });
  }

  // Fallback 5: corePain → keyUnlockArea as concrete focus
  if (result.corePain && result.keyUnlockArea) {
    const pain = truncate(result.corePain.split('.')[0]);
    fallbacks.push({
      trigger: `sentir "${pain}"`,
      action: `dedique 10 minutos hoje exclusivamente a: ${result.keyUnlockArea}. Sem celular, sem interrupção`,
    });
  }

  // Fallback 6: direction → daily micro-action
  if (result.direction) {
    const dir = truncate(result.direction.split('.')[0]);
    fallbacks.push({
      trigger: 'acordar amanhã',
      action: `antes de qualquer outra coisa, escreva em um papel: "${dir}" — e cole onde vai ver durante o dia`,
    });
  }

  for (const fb of fallbacks) {
    if (actions.length >= 3) break;
    if (!actions.some(a => a.action === fb.action)) {
      actions.push(fb);
    }
  }

  // Last resort — still situational and executable
  const lastResort: ActionPreview[] = [
    { trigger: 'você querer desistir de algo que importa', action: 'escreva 1 motivo concreto para continuar e releia 3 vezes antes de decidir' },
    { trigger: 'perceber que está no piloto automático', action: 'pare onde está, descreva em voz alta o que está fazendo e por quê — se não souber responder, mude a ação' },
    { trigger: 'o mesmo problema se repetir pela 3ª vez', action: 'anote no celular: "isso já aconteceu antes" e mude UMA variável da situação (lugar, hora ou resposta)' },
  ];
  for (const lr of lastResort) {
    if (actions.length >= 3) break;
    actions.push(lr);
  }

  return actions.slice(0, 3);
}

/** Convert ActionPreview[] to strings for persistence in action_plan_tracking */
export function actionPreviewsToStrings(previews: ActionPreview[]): string[] {
  return previews.map(p => `Quando ${p.trigger} → ${p.action}`);
}
