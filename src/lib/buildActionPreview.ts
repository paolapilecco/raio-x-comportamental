/**
 * Builds exactly 3 practical "Se X → faça Y" actions from diagnosis data.
 * Shared between Report.tsx (display) and Diagnostic.tsx (persistence).
 */

import { DiagnosticResult } from '@/types/diagnostic';

export interface ActionPreview {
  trigger: string;
  action: string;
}

export function buildActionPreviews(result: DiagnosticResult): ActionPreview[] {
  const ai = result as any;
  const actions: ActionPreview[] = [];

  // 1. From microAcoes (AI)
  if (Array.isArray(ai.microAcoes)) {
    ai.microAcoes.forEach((a: any) => {
      if (actions.length >= 3) return;
      if (typeof a === 'object' && a?.gatilho && a?.acao) {
        actions.push({ trigger: a.gatilho, action: a.acao });
      } else if (typeof a === 'object' && a?.acao) {
        actions.push({ trigger: 'O padrão se ativar', action: a.acao });
      } else if (typeof a === 'string' && a.length > 5) {
        actions.push({ trigger: 'O padrão se repetir', action: a });
      }
    });
  }

  // 2. From exitStrategy
  if (actions.length < 3 && Array.isArray(result.exitStrategy)) {
    result.exitStrategy.forEach((s: any) => {
      if (actions.length >= 3) return;
      const text = s.action || s.title || '';
      if (text && !actions.some(a => a.action === text)) {
        actions.push({ trigger: s.trigger || s.gatilho || 'O comportamento aparecer', action: text });
      }
    });
  }

  // 3. Build concrete trigger-action fallbacks from diagnosis fields
  const triggers = Array.isArray(result.triggers) ? result.triggers : [];
  const traps = Array.isArray(result.mentalTraps) ? result.mentalTraps : [];
  const gatilhos = Array.isArray(ai.gatilhos) ? ai.gatilhos : [];
  const allTriggers = [...gatilhos, ...triggers].filter(Boolean);

  const fallbacks: ActionPreview[] = [];

  if (result.blockingPoint && result.direction) {
    const bp = result.blockingPoint.length > 60 ? result.blockingPoint.slice(0, 57) + '...' : result.blockingPoint;
    const dir = result.direction.split('.')[0];
    fallbacks.push({ trigger: `Você perceber que "${bp}"`, action: dir });
  }

  if (allTriggers[0]) {
    const t = allTriggers[0].length > 60 ? allTriggers[0].slice(0, 57) + '...' : allTriggers[0];
    fallbacks.push({ trigger: `"${t}" acontecer`, action: 'Pare por 10 segundos, respire fundo e pergunte: "eu escolhi isso ou estou reagindo?"' });
  }

  if (traps[0]) {
    const trap = traps[0].length > 60 ? traps[0].slice(0, 57) + '...' : traps[0];
    fallbacks.push({ trigger: `A armadilha "${trap}" se ativar`, action: 'Anote o que você estava pensando e faça o oposto por 5 minutos como teste' });
  }

  if (allTriggers[1]) {
    const t = allTriggers[1].length > 60 ? allTriggers[1].slice(0, 57) + '...' : allTriggers[1];
    fallbacks.push({ trigger: `Você notar "${t}"`, action: 'Registre em uma nota: situação, emoção e o que fez. Revise no fim do dia' });
  }

  if (result.corePain && result.keyUnlockArea) {
    const pain = result.corePain.split('.')[0];
    fallbacks.push({ trigger: `Sentir "${pain.length > 50 ? pain.slice(0, 47) + '...' : pain}"`, action: `Foque em: ${result.keyUnlockArea}` });
  }

  for (const fb of fallbacks) {
    if (actions.length >= 3) break;
    if (!actions.some(a => a.action === fb.action)) {
      actions.push(fb);
    }
  }

  // Last resort
  const lastResort: ActionPreview[] = [
    { trigger: 'Você querer desistir de algo importante', action: 'Escreva 1 motivo real para continuar e releia antes de decidir' },
    { trigger: 'Sentir que está no automático', action: 'Pare, olhe ao redor e descreva em voz alta o que está fazendo e por quê' },
    { trigger: 'Um padrão negativo se repetir', action: 'Anote: "isso já aconteceu antes?" — se sim, mude uma variável da situação' },
  ];
  for (const lr of lastResort) {
    if (actions.length >= 3) break;
    actions.push(lr);
  }

  return actions.slice(0, 3);
}

/** Convert ActionPreview[] to strings for persistence in action_plan_tracking */
export function actionPreviewsToStrings(previews: ActionPreview[]): string[] {
  return previews.map(p => `Se ${p.trigger.toLowerCase()} → ${p.action}`);
}
