import jsPDF from 'jspdf';
import { DiagnosticResult } from '@/types/diagnostic';

const M = 22; // margin
const PW = 210;
const PH = 297;
const CW = PW - M * 2;
const LH = 6;

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

function pageBreak(ctx: Ctx, need = 18) {
  if (ctx.y + need > PH - M) {
    ctx.doc.addPage();
    ctx.y = M + 8;
  }
}

function gap(ctx: Ctx, n = 6) { ctx.y += n; }

// ── Primitives ──

function heading(ctx: Ctx, num: number, text: string) {
  pageBreak(ctx, 20);
  gap(ctx, 8);
  const { doc } = ctx;
  // Number badge
  doc.setFillColor(...C.accent);
  doc.roundedRect(M, ctx.y - 4, 8, 8, 2, 2, 'F');
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...C.white);
  doc.text(String(num), M + 2.8, ctx.y + 1);
  // Title
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...C.dark);
  doc.text(text, M + 12, ctx.y + 1);
  ctx.y += 10;
  doc.setDrawColor(...C.border);
  doc.setLineWidth(0.3);
  doc.line(M, ctx.y, M + CW, ctx.y);
  ctx.y += 6;
}

function label(ctx: Ctx, text: string) {
  pageBreak(ctx, 12);
  ctx.doc.setFontSize(8);
  ctx.doc.setFont('helvetica', 'bold');
  ctx.doc.setTextColor(...C.muted);
  ctx.doc.text(text.toUpperCase(), M, ctx.y);
  ctx.y += 5;
}

function para(ctx: Ctx, text: string, color: readonly number[] = C.text) {
  if (!text) return;
  const { doc } = ctx;
  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...(color as [number, number, number]));
  const lines = doc.splitTextToSize(text, CW);
  for (const line of lines) {
    pageBreak(ctx);
    doc.text(line, M, ctx.y);
    ctx.y += LH;
  }
  ctx.y += 2;
}

function bullet(ctx: Ctx, text: string) {
  const { doc } = ctx;
  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...C.text);
  const lines = doc.splitTextToSize(text, CW - 8);
  pageBreak(ctx, lines.length * LH + 2);
  doc.setFillColor(...C.accent);
  doc.circle(M + 2, ctx.y - 1.2, 1, 'F');
  for (const line of lines) {
    doc.text(line, M + 6, ctx.y);
    ctx.y += LH;
  }
  ctx.y += 1;
}

function callout(ctx: Ctx, title: string, text: string, color: readonly number[] = C.accent) {
  if (!text) return;
  const { doc } = ctx;
  const lines = doc.splitTextToSize(text, CW - 14);
  const h = 8 + lines.length * LH + 4;
  pageBreak(ctx, h + 2);
  doc.setFillColor(...C.accentSoft);
  doc.roundedRect(M, ctx.y, CW, h, 2, 2, 'F');
  doc.setFillColor(...(color as [number, number, number]));
  doc.roundedRect(M, ctx.y, 2.5, h, 1, 1, 'F');
  ctx.y += 6;
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...(color as [number, number, number]));
  doc.text(title.toUpperCase(), M + 7, ctx.y);
  ctx.y += 4;
  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...C.text);
  for (const line of lines) {
    doc.text(line, M + 7, ctx.y);
    ctx.y += LH;
  }
  ctx.y += 5;
}

function step(ctx: Ctx, num: number, title: string, action: string) {
  pageBreak(ctx, 18);
  const { doc } = ctx;
  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...C.accent);
  doc.text(`${num}.`, M, ctx.y);
  doc.setTextColor(...C.text);
  doc.text(title, M + 6, ctx.y);
  ctx.y += LH;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...C.muted);
  const lines = doc.splitTextToSize(action, CW - 8);
  for (const line of lines) {
    pageBreak(ctx);
    doc.text(line, M + 6, ctx.y);
    ctx.y += LH;
  }
  ctx.y += 3;
}

// ── Main ──

export function generateDiagnosticPdf(result: DiagnosticResult, userName?: string) {
  const doc = new jsPDF('p', 'mm', 'a4');
  const ctx: Ctx = { doc, y: M };

  // ── Cover ──
  doc.setFillColor(...C.dark);
  doc.rect(0, 0, PW, 58, 'F');
  doc.setFillColor(...C.accent);
  doc.rect(0, 58, PW, 1.5, 'F');

  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...C.white);
  doc.text('Raio-X Comportamental', M, 26);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(180, 180, 190);
  doc.text('Relatório Simplificado', M, 36);

  if (userName) {
    doc.setFontSize(9);
    doc.setTextColor(160, 160, 170);
    doc.text(userName, M, 47);
  }
  const date = new Date().toLocaleDateString('pt-BR');
  doc.setFontSize(8);
  doc.setTextColor(...C.light);
  doc.text(date, PW - M - doc.getTextWidth(date), 47);

  ctx.y = 68;

  // Title + badge
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...C.dark);
  const titleLines = doc.splitTextToSize(result.combinedTitle, CW);
  for (const l of titleLines) { doc.text(l, M, ctx.y); ctx.y += 7; }
  ctx.y += 2;

  const intLabel = result.intensity === 'alto' ? 'Alta' : result.intensity === 'moderado' ? 'Moderada' : 'Leve';
  const intColor = result.intensity === 'alto' ? C.red : result.intensity === 'moderado' ? C.yellow : C.green;
  doc.setFillColor(...(intColor as [number, number, number]));
  const badge = `Intensidade: ${intLabel}`;
  doc.setFontSize(8);
  const bw = doc.getTextWidth(badge) + 8;
  doc.roundedRect(M, ctx.y - 3.5, bw, 6, 3, 3, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...C.white);
  doc.text(badge, M + 4, ctx.y);
  ctx.y += 10;

  // ═══════════════════════════════════
  // BLOCO 1 — RESUMO
  // ═══════════════════════════════════
  heading(ctx, 1, 'Resumo');
  callout(ctx, 'O que está acontecendo', result.criticalDiagnosis, C.red);

  label(ctx, 'Dor Central');
  para(ctx, result.corePain);

  label(ctx, 'Estado Mental');
  para(ctx, result.mentalState, C.muted);
  gap(ctx, 4);

  // ═══════════════════════════════════
  // BLOCO 2 — SEU PADRÃO
  // ═══════════════════════════════════
  heading(ctx, 2, 'Seu Padrão');

  label(ctx, 'Como funciona');
  para(ctx, result.mechanism);

  if (result.selfSabotageCycle.length > 0) {
    label(ctx, 'Ciclo que se repete');
    result.selfSabotageCycle.forEach((s, i) => bullet(ctx, `${i + 1}. ${s}`));
    gap(ctx, 3);
  }

  if (result.triggers.length > 0) {
    label(ctx, 'O que ativa');
    result.triggers.forEach(t => bullet(ctx, t));
    gap(ctx, 3);
  }

  if (result.mentalTraps.length > 0) {
    callout(ctx, 'Frases que te prendem', result.mentalTraps.map(t => `"${t}"`).join('\n'), C.red);
  }

  label(ctx, 'Contradição');
  para(ctx, result.contradiction);
  gap(ctx, 4);

  // ═══════════════════════════════════
  // BLOCO 3 — O QUE FAZER
  // ═══════════════════════════════════
  heading(ctx, 3, 'O Que Fazer');

  callout(ctx, 'Comece por aqui', result.keyUnlockArea, C.green);

  if (result.exitStrategy.length > 0) {
    label(ctx, 'Passos práticos');
    result.exitStrategy.forEach(s => step(ctx, s.step, s.title, s.action));
  }

  if (result.whatNotToDo.length > 0) {
    callout(ctx, 'Pare de fazer', result.whatNotToDo.map(i => `✗ ${i}`).join('\n'), C.red);
  }

  gap(ctx, 6);

  // ═══════════════════════════════════
  // MAPA DE INTENSIDADE
  // ═══════════════════════════════════
  label(ctx, 'Intensidade por eixo');
  gap(ctx, 2);

  // Legend
  const ly = ctx.y;
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setFillColor(...C.green);
  doc.circle(M + 2, ly - 1, 1.2, 'F');
  doc.setTextColor(...C.light);
  doc.text('< 40%', M + 5, ly);
  doc.setFillColor(...C.yellow);
  doc.circle(M + 25, ly - 1, 1.2, 'F');
  doc.text('40-65%', M + 28, ly);
  doc.setFillColor(...C.red);
  doc.circle(M + 52, ly - 1, 1.2, 'F');
  doc.text('> 65%', M + 55, ly);
  ctx.y += 5;

  result.allScores.slice(0, 8).forEach(score => {
    pageBreak(ctx, 12);
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...C.text);
    doc.text(score.label, M + 2, ctx.y);
    doc.setFont('helvetica', 'bold');
    const pct = `${score.percentage}%`;
    doc.text(pct, M + CW - doc.getTextWidth(pct), ctx.y);
    const by = ctx.y + 2;
    doc.setFillColor(...C.border);
    doc.roundedRect(M + 2, by, CW - 4, 3, 1.5, 1.5, 'F');
    const bc = score.percentage > 65 ? C.red : score.percentage >= 40 ? C.yellow : C.green;
    doc.setFillColor(...(bc as [number, number, number]));
    const fw = (score.percentage / 100) * (CW - 4);
    if (fw > 0) doc.roundedRect(M + 2, by, Math.max(fw, 3), 3, 1.5, 1.5, 'F');
    ctx.y += 10;
  });

  // ── Footer ──
  pageBreak(ctx, 20);
  gap(ctx, 6);
  doc.setDrawColor(...C.border);
  doc.setLineWidth(0.3);
  doc.line(M, ctx.y, M + CW, ctx.y);
  ctx.y += 5;
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(...C.light);
  const notice = 'Este relatório oferece uma leitura comportamental baseada em suas respostas e não substitui avaliação psicológica ou clínica profissional.';
  const nl = doc.splitTextToSize(notice, CW);
  nl.forEach((line: string) => { doc.text(line, M, ctx.y); ctx.y += 4; });

  doc.save(`raio-x-comportamental-${new Date().toISOString().slice(0, 10)}.pdf`);
}
