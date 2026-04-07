import jsPDF from 'jspdf';
import { DiagnosticResult } from '@/types/diagnostic';

const M = 22;
const PW = 210;
const PH = 297;
const CW = PW - M * 2;
const LH = 5.8;

const C = {
  dark: [25, 25, 30] as const,
  accent: [90, 70, 180] as const,
  accentSoft: [240, 237, 255] as const,
  red: [195, 55, 55] as const,
  yellow: [200, 160, 40] as const,
  green: [50, 150, 80] as const,
  text: [40, 40, 45] as const,
  muted: [120, 120, 130] as const,
  light: [160, 160, 170] as const,
  border: [215, 215, 220] as const,
  bg: [248, 248, 250] as const,
  white: [255, 255, 255] as const,
};

interface Ctx { doc: jsPDF; y: number; }

function pb(ctx: Ctx, need = 16) {
  if (ctx.y + need > PH - M) { ctx.doc.addPage(); ctx.y = M + 6; }
}

// ── Primitives ──

function sectionNum(ctx: Ctx, num: number, title: string) {
  pb(ctx, 16);
  ctx.y += 6;
  const { doc } = ctx;
  doc.setFillColor(...C.accent);
  doc.roundedRect(M, ctx.y - 3.5, 7, 7, 1.5, 1.5, 'F');
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...C.white);
  doc.text(String(num), M + 2.3, ctx.y + 0.5);
  doc.setFontSize(11);
  doc.setTextColor(...C.dark);
  doc.text(title, M + 10, ctx.y + 0.5);
  ctx.y += 8;
}

function text(ctx: Ctx, t: string, color: readonly number[] = C.text) {
  if (!t) return;
  const { doc } = ctx;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...(color as [number, number, number]));
  const lines = doc.splitTextToSize(t, CW);
  for (const l of lines) { pb(ctx); doc.text(l, M, ctx.y); ctx.y += LH; }
  ctx.y += 2;
}

function bullet(ctx: Ctx, t: string, dotColor: readonly number[] = C.accent) {
  const { doc } = ctx;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...C.text);
  const lines = doc.splitTextToSize(t, CW - 7);
  pb(ctx, lines.length * LH + 1);
  doc.setFillColor(...(dotColor as [number, number, number]));
  doc.circle(M + 2, ctx.y - 1, 0.9, 'F');
  for (const l of lines) { doc.text(l, M + 6, ctx.y); ctx.y += LH; }
  ctx.y += 1;
}

function callout(ctx: Ctx, t: string, color: readonly number[] = C.accent) {
  if (!t) return;
  const { doc } = ctx;
  const lines = doc.splitTextToSize(t, CW - 12);
  const h = lines.length * LH + 8;
  pb(ctx, h + 2);
  doc.setFillColor(...C.accentSoft);
  doc.roundedRect(M, ctx.y, CW, h, 2, 2, 'F');
  doc.setFillColor(...(color as [number, number, number]));
  doc.roundedRect(M, ctx.y, 2.5, h, 1, 1, 'F');
  ctx.y += 5;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...C.text);
  for (const l of lines) { doc.text(l, M + 7, ctx.y); ctx.y += LH; }
  ctx.y += 5;
}

function pillarCard(ctx: Ctx, area: string, effect: string) {
  const { doc } = ctx;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...C.accent);
  pb(ctx, 14);
  doc.text(area, M + 4, ctx.y);
  ctx.y += LH;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...C.muted);
  doc.setFontSize(9);
  const lines = doc.splitTextToSize(effect, CW - 8);
  for (const l of lines) { doc.text(l, M + 4, ctx.y); ctx.y += LH; }
  ctx.y += 3;
}

// ── Main ──

export function generateDiagnosticPdf(result: DiagnosticResult, userName?: string) {
  const doc = new jsPDF('p', 'mm', 'a4');
  const ctx: Ctx = { doc, y: M };

  const ai = result as any;
  const chamaAtencao = ai.chamaAtencao || ai.resumoPrincipal || result.criticalDiagnosis;
  const padraoRepetido = ai.padraoRepetido || ai.padraoIdentificado || result.mechanism;
  const comoAparece = ai.comoAparece || result.mentalState;
  const gatilhos = ai.gatilhos || result.triggers;
  const comoAtrapalha = ai.comoAtrapalha || ai.significadoPratico || result.corePain;
  const impactoPorArea: { area: string; efeito: string }[] = ai.impactoPorArea || ai.impactoVida?.map((l: any) => ({ area: l.area || l.pillar, efeito: l.efeito || l.impact })) || result.lifeImpact?.map((l: any) => ({ area: l.pillar, efeito: l.impact })) || [];
  const corrigirPrimeiro = ai.corrigirPrimeiro || ai.direcaoAjuste || result.keyUnlockArea;
  const pararDeFazer = ai.pararDeFazer || ai.oQueEvitar || result.whatNotToDo;
  const acaoInicial = ai.acaoInicial || ai.proximoPasso || result.exitStrategy?.[0]?.action || result.direction;

  // Cover
  doc.setFillColor(...C.dark);
  doc.rect(0, 0, PW, 55, 'F');
  doc.setFillColor(...C.accent);
  doc.rect(0, 55, PW, 1.5, 'F');
  doc.setFontSize(17);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...C.white);
  doc.text('Raio-X Comportamental', M, 24);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(180, 180, 190);
  doc.text('Relatório de Leitura', M, 34);
  if (userName) { doc.setFontSize(8); doc.setTextColor(160, 160, 170); doc.text(userName, M, 44); }
  const date = new Date().toLocaleDateString('pt-BR');
  doc.setFontSize(8); doc.setTextColor(...C.light);
  doc.text(date, PW - M - doc.getTextWidth(date), 44);

  ctx.y = 64;

  // Title + intensity
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...C.dark);
  const tl = doc.splitTextToSize(result.combinedTitle, CW);
  for (const l of tl) { doc.text(l, M, ctx.y); ctx.y += 7; }
  ctx.y += 2;
  const intLabel = result.intensity === 'alto' ? 'Alta' : result.intensity === 'moderado' ? 'Moderada' : 'Leve';
  const intColor = result.intensity === 'alto' ? C.red : result.intensity === 'moderado' ? C.yellow : C.green;
  doc.setFillColor(...(intColor as [number, number, number]));
  const badge = `Intensidade: ${intLabel}`;
  doc.setFontSize(7.5); const bw = doc.getTextWidth(badge) + 7;
  doc.roundedRect(M, ctx.y - 3, bw, 5.5, 2.5, 2.5, 'F');
  doc.setFont('helvetica', 'bold'); doc.setTextColor(...C.white);
  doc.text(badge, M + 3.5, ctx.y);
  ctx.y += 4;

  // Quick-read block
  pb(ctx, 32);
  const qrY = ctx.y;
  doc.setFillColor(245, 245, 248);
  doc.roundedRect(M, qrY, CW, 28, 2, 2, 'F');
  doc.setDrawColor(220, 220, 228);
  doc.roundedRect(M, qrY, CW, 28, 2, 2, 'S');
  doc.setFontSize(7); doc.setFont('helvetica', 'bold'); doc.setTextColor(...C.muted);
  doc.text('LEITURA RÁPIDA', M + 4, qrY + 5);
  const halfW = (CW - 6) / 2;
  doc.setFontSize(6); doc.setFont('helvetica', 'normal'); doc.setTextColor(...C.light);
  doc.text('Padrão principal', M + 4, qrY + 10);
  doc.text('Intensidade', M + 4 + halfW + 2, qrY + 10);
  doc.text('Ponto de travamento', M + 4, qrY + 20);
  doc.text('Foco de mudança', M + 4 + halfW + 2, qrY + 20);
  doc.setFontSize(7.5); doc.setFont('helvetica', 'bold'); doc.setTextColor(...C.dark);
  const patternName = (result as any).interpretation?.behavioralProfile?.name || result.profileName || String(result.dominantPattern || '');
  const pnTrunc = patternName.length > 28 ? patternName.slice(0, 25) + '…' : patternName;
  doc.text(pnTrunc, M + 4, qrY + 14);
  doc.setTextColor(...(intColor as [number, number, number]));
  doc.text(intLabel, M + 4 + halfW + 2, qrY + 14);
  doc.setTextColor(...C.dark);
  const bp = ((result as any).blockingPoint || 'Não identificado');
  const bpTrunc = bp.length > 35 ? bp.slice(0, 32) + '…' : bp;
  doc.text(bpTrunc, M + 4, qrY + 24);
  const cfp = corrigirPrimeiro || 'Não identificado';
  const cfpTrunc = cfp.length > 35 ? cfp.slice(0, 32) + '…' : cfp;
  doc.text(cfpTrunc, M + 4 + halfW + 2, qrY + 24);
  ctx.y = qrY + 34;

  // 1. O que mais chama atenção
  sectionNum(ctx, 1, 'O que mais chama atenção no seu resultado');
  callout(ctx, chamaAtencao, C.red);

  // 2. O padrão que mais se repete
  sectionNum(ctx, 2, 'O padrão que mais se repete em você');
  text(ctx, padraoRepetido);

  // 3. Como isso aparece na sua rotina
  sectionNum(ctx, 3, 'Como isso aparece na sua rotina');
  text(ctx, comoAparece, C.muted);
  if (result.selfSabotageCycle?.length > 0) {
    result.selfSabotageCycle.forEach((s, i) => bullet(ctx, `${i + 1}. ${s}`, C.muted));
  }

  // 4. O que geralmente dispara esse padrão
  if (gatilhos?.length > 0) {
    sectionNum(ctx, 4, 'O que geralmente dispara esse padrão');
    gatilhos.forEach((t: string) => bullet(ctx, t, C.red));
  }

  // 5. Como isso te atrapalha
  sectionNum(ctx, 5, 'Como isso te atrapalha');
  if (impactoPorArea.length > 0) {
    impactoPorArea.forEach((item: { area: string; efeito: string }) => {
      pillarCard(ctx, item.area, item.efeito);
    });
  } else {
    text(ctx, comoAtrapalha);
  }

  // 6. Direção de ajuste
  sectionNum(ctx, 6, 'Direção de ajuste');
  pb(ctx, 14);
  doc.setFontSize(6.5); doc.setFont('helvetica', 'normal'); doc.setTextColor(...C.light);
  doc.text('O QUE PRECISA MUDAR', M + 4, ctx.y); ctx.y += 3;
  callout(ctx, corrigirPrimeiro, C.accent);

  // 7. O que parar de fazer agora
  if (pararDeFazer?.length > 0) {
    sectionNum(ctx, 7, 'O que parar de fazer agora');
    pararDeFazer.forEach((item: string) => bullet(ctx, `✗ ${item}`, C.red));
  }

  // 8. Próxima ação prática
  sectionNum(ctx, 8, 'Próxima ação prática');
  pb(ctx, 14);
  doc.setFontSize(6.5); doc.setFont('helvetica', 'normal'); doc.setTextColor(...C.light);
  doc.text('FAÇA ISSO AGORA', M + 4, ctx.y); ctx.y += 3;
  callout(ctx, acaoInicial, C.green);

  // Intensity map
  ctx.y += 4;
  pb(ctx, 20);
  doc.setFontSize(8); doc.setFont('helvetica', 'bold'); doc.setTextColor(...C.muted);
  doc.text('INTENSIDADE POR EIXO', M, ctx.y); ctx.y += 5;
  // Legend
  doc.setFontSize(6.5); doc.setFont('helvetica', 'normal');
  doc.setFillColor(...C.green); doc.circle(M + 2, ctx.y - 0.8, 1, 'F'); doc.setTextColor(...C.light); doc.text('< 40%', M + 5, ctx.y);
  doc.setFillColor(...C.yellow); doc.circle(M + 22, ctx.y - 0.8, 1, 'F'); doc.text('40-65%', M + 25, ctx.y);
  doc.setFillColor(...C.red); doc.circle(M + 48, ctx.y - 0.8, 1, 'F'); doc.text('> 65%', M + 51, ctx.y);
  ctx.y += 4;

  result.allScores.slice(0, 8).forEach(score => {
    pb(ctx, 10);
    doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(...C.text);
    doc.text(score.label, M + 2, ctx.y);
    doc.setFont('helvetica', 'bold');
    const p = `${score.percentage}%`;
    doc.text(p, M + CW - doc.getTextWidth(p), ctx.y);
    const by = ctx.y + 2;
    doc.setFillColor(...C.border);
    doc.roundedRect(M + 2, by, CW - 4, 2.5, 1, 1, 'F');
    const bc = score.percentage > 65 ? C.red : score.percentage >= 40 ? C.yellow : C.green;
    doc.setFillColor(...(bc as [number, number, number]));
    const fw = (score.percentage / 100) * (CW - 4);
    if (fw > 0) doc.roundedRect(M + 2, by, Math.max(fw, 2), 2.5, 1, 1, 'F');
    ctx.y += 9;
  });

  // Footer
  pb(ctx, 16); ctx.y += 4;
  doc.setDrawColor(...C.border); doc.setLineWidth(0.3);
  doc.line(M, ctx.y, M + CW, ctx.y); ctx.y += 4;
  doc.setFontSize(7); doc.setFont('helvetica', 'italic'); doc.setTextColor(...C.light);
  const n = 'Este relatório oferece uma leitura comportamental baseada em suas respostas e não substitui avaliação profissional.';
  doc.splitTextToSize(n, CW).forEach((l: string) => { doc.text(l, M, ctx.y); ctx.y += 3.5; });

  doc.save(`raio-x-comportamental-${new Date().toISOString().slice(0, 10)}.pdf`);
}
