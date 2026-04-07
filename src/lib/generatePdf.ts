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
  ctx.y += 8;

  // 1. Resumo principal
  sectionNum(ctx, 1, 'Resumo principal');
  callout(ctx, resumo, C.red);

  // 2. O que isso significa na prática
  sectionNum(ctx, 2, 'O que isso significa na prática');
  text(ctx, significado);

  // 3. Padrão identificado
  sectionNum(ctx, 3, 'Padrão identificado');
  text(ctx, padrao);

  // 4. Como aparece no dia a dia
  sectionNum(ctx, 4, 'Como aparece no dia a dia');
  text(ctx, comoAparece, C.muted);
  if (result.selfSabotageCycle?.length > 0) {
    result.selfSabotageCycle.forEach((s, i) => bullet(ctx, `${i + 1}. ${s}`, C.muted));
  }

  // 5. Gatilhos principais
  if (gatilhos?.length > 0) {
    sectionNum(ctx, 5, 'Gatilhos principais');
    gatilhos.forEach((t: string) => bullet(ctx, t, C.red));
  }

  // 6. Impacto nas áreas da vida
  if (impactoVida?.length > 0) {
    sectionNum(ctx, 6, 'Impacto nas áreas da vida');
    impactoVida.forEach((item: any) => pillarCard(ctx, item.area || item.pillar, item.efeito || item.impact));
  }

  // 7. Primeira direção de ajuste
  sectionNum(ctx, 7, 'Primeira direção de ajuste');
  callout(ctx, direcao, C.green);

  // 8. O que evitar agora
  if (oQueEvitar?.length > 0) {
    sectionNum(ctx, 8, 'O que evitar agora');
    oQueEvitar.forEach((item: string) => bullet(ctx, `✗ ${item}`, C.red));
  }

  // 9. Próximo passo simples
  sectionNum(ctx, 9, 'Próximo passo simples');
  callout(ctx, proximo, C.accent);

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
