import jsPDF from 'jspdf';
import { DiagnosticResult } from '@/types/diagnostic';

const MARGIN = 22;
const PAGE_WIDTH = 210;
const PAGE_HEIGHT = 297;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
const LINE_HEIGHT = 6.5;
const SECTION_GAP = 12;

// Brand colors
const COLORS = {
  dark: [25, 25, 30] as const,
  accent: [90, 70, 180] as const,    // purple accent
  accentLight: [240, 237, 255] as const,
  red: [195, 55, 55] as const,
  yellow: [200, 160, 40] as const,
  green: [50, 150, 80] as const,
  text: [40, 40, 45] as const,
  textLight: [100, 100, 110] as const,
  textMuted: [140, 140, 150] as const,
  border: [210, 210, 215] as const,
  bgLight: [248, 248, 250] as const,
  white: [255, 255, 255] as const,
};

interface PDFContext {
  doc: jsPDF;
  y: number;
}

function checkPageBreak(ctx: PDFContext, needed: number = 20) {
  if (ctx.y + needed > PAGE_HEIGHT - MARGIN) {
    ctx.doc.addPage();
    ctx.y = MARGIN + 6;
    // Subtle page header line
    ctx.doc.setDrawColor(...COLORS.border);
    ctx.doc.setLineWidth(0.3);
    ctx.doc.line(MARGIN, ctx.y - 2, MARGIN + CONTENT_WIDTH, ctx.y - 2);
    ctx.y += 4;
  }
}

// ─── Highlighted insight box (key takeaway) ───
function addHighlightBox(ctx: PDFContext, label: string, text: string, color: readonly number[] = COLORS.accent) {
  if (!text) return;
  const { doc } = ctx;
  const lines = doc.splitTextToSize(text, CONTENT_WIDTH - 18);
  const boxHeight = 10 + lines.length * LINE_HEIGHT + 4;
  checkPageBreak(ctx, boxHeight + 4);

  // Background
  doc.setFillColor(...COLORS.accentLight);
  doc.roundedRect(MARGIN, ctx.y, CONTENT_WIDTH, boxHeight, 2, 2, 'F');

  // Left accent bar
  doc.setFillColor(...(color as [number, number, number]));
  doc.roundedRect(MARGIN, ctx.y, 3, boxHeight, 1.5, 1.5, 'F');

  // Label
  ctx.y += 7;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...(color as [number, number, number]));
  doc.text(label.toUpperCase(), MARGIN + 8, ctx.y);
  ctx.y += 5;

  // Text
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...COLORS.text);
  for (const line of lines) {
    doc.text(line, MARGIN + 8, ctx.y);
    ctx.y += LINE_HEIGHT;
  }
  ctx.y += 6;
}

// ─── Block header with number badge ───
function addBlockHeader(ctx: PDFContext, num: string, text: string) {
  checkPageBreak(ctx, 24);
  ctx.y += 8;

  const { doc } = ctx;

  // Number badge circle
  doc.setFillColor(...COLORS.accent);
  doc.circle(MARGIN + 5, ctx.y + 3, 5, 'F');
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.white);
  doc.text(num, MARGIN + 3.5, ctx.y + 5.5);

  // Title text
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.dark);
  doc.text(text, MARGIN + 14, ctx.y + 5);

  ctx.y += 12;

  // Separator line
  doc.setDrawColor(...COLORS.border);
  doc.setLineWidth(0.3);
  doc.line(MARGIN, ctx.y, MARGIN + CONTENT_WIDTH, ctx.y);
  ctx.y += 8;
}

function addTitle(ctx: PDFContext, text: string) {
  checkPageBreak(ctx, 18);
  ctx.doc.setFontSize(11);
  ctx.doc.setFont('helvetica', 'bold');
  ctx.doc.setTextColor(...COLORS.text);
  ctx.doc.text(text, MARGIN, ctx.y);
  ctx.y += 7;
}

function addParagraph(ctx: PDFContext, text: string) {
  if (!text) return;
  ctx.doc.setFontSize(10);
  ctx.doc.setFont('helvetica', 'normal');
  ctx.doc.setTextColor(...COLORS.text);
  const lines = ctx.doc.splitTextToSize(text, CONTENT_WIDTH);
  for (const line of lines) {
    checkPageBreak(ctx);
    ctx.doc.text(line, MARGIN, ctx.y);
    ctx.y += LINE_HEIGHT;
  }
  ctx.y += 3;
}

function addBullet(ctx: PDFContext, text: string, color: readonly number[] = COLORS.accent) {
  const { doc } = ctx;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...COLORS.text);
  const lines = doc.splitTextToSize(text, CONTENT_WIDTH - 10);
  checkPageBreak(ctx, lines.length * LINE_HEIGHT + 2);

  // Colored bullet dot
  doc.setFillColor(...(color as [number, number, number]));
  doc.circle(MARGIN + 3, ctx.y - 1.5, 1.2, 'F');

  for (let i = 0; i < lines.length; i++) {
    doc.text(lines[i], MARGIN + 8, ctx.y);
    ctx.y += LINE_HEIGHT;
  }
  ctx.y += 1;
}

function addNumberedStep(ctx: PDFContext, num: number, title: string, text: string) {
  checkPageBreak(ctx, 22);
  const { doc } = ctx;

  // Step number badge
  doc.setFillColor(...COLORS.bgLight);
  doc.roundedRect(MARGIN, ctx.y - 4, CONTENT_WIDTH, 6 + LINE_HEIGHT * (doc.splitTextToSize(text, CONTENT_WIDTH - 18).length + 1) + 4, 2, 2, 'F');

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.accent);
  doc.text(`Passo ${num}`, MARGIN + 4, ctx.y);
  doc.setTextColor(...COLORS.text);
  doc.text(`  ${title}`, MARGIN + 4 + doc.getTextWidth(`Passo ${num}`), ctx.y);
  ctx.y += LINE_HEIGHT + 1;

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...COLORS.text);
  const lines = doc.splitTextToSize(text, CONTENT_WIDTH - 12);
  for (const line of lines) {
    checkPageBreak(ctx);
    doc.text(line, MARGIN + 8, ctx.y);
    ctx.y += LINE_HEIGHT;
  }
  ctx.y += 5;
}

// ─── Pillar impact card ───
function addPillarCard(ctx: PDFContext, pillar: string, impact: string) {
  const { doc } = ctx;
  const lines = doc.splitTextToSize(impact, CONTENT_WIDTH - 14);
  const cardHeight = 8 + lines.length * LINE_HEIGHT + 4;
  checkPageBreak(ctx, cardHeight + 2);

  // Card background
  doc.setFillColor(...COLORS.bgLight);
  doc.roundedRect(MARGIN, ctx.y, CONTENT_WIDTH, cardHeight, 2, 2, 'F');

  // Pillar name
  ctx.y += 7;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.accent);
  doc.text(pillar, MARGIN + 5, ctx.y);
  ctx.y += LINE_HEIGHT;

  // Impact text
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...COLORS.text);
  for (const line of lines) {
    doc.text(line, MARGIN + 5, ctx.y);
    ctx.y += LINE_HEIGHT;
  }
  ctx.y += 5;
}

export function generateDiagnosticPdf(result: DiagnosticResult, userName?: string) {
  const doc = new jsPDF('p', 'mm', 'a4');
  const ctx: PDFContext = { doc, y: MARGIN };

  // ═══════════════════════════════════
  // CAPA
  // ═══════════════════════════════════
  doc.setFillColor(...COLORS.dark);
  doc.rect(0, 0, PAGE_WIDTH, 65, 'F');

  // Accent strip
  doc.setFillColor(...COLORS.accent);
  doc.rect(0, 65, PAGE_WIDTH, 2, 'F');

  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.white);
  doc.text('Raio-X Comportamental', MARGIN, 28);

  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(180, 180, 190);
  doc.text('Mapa de Funcionamento · Relatório Completo', MARGIN, 38);

  if (userName) {
    doc.setFontSize(10);
    doc.setTextColor(160, 160, 170);
    doc.text(userName, MARGIN, 50);
  }

  const date = new Date().toLocaleDateString('pt-BR');
  doc.setFontSize(9);
  doc.setTextColor(...COLORS.textMuted);
  doc.text(date, PAGE_WIDTH - MARGIN - doc.getTextWidth(date), 50);

  ctx.y = 78;

  // ─── Combined Title ───
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.dark);
  const titleLines = doc.splitTextToSize(result.combinedTitle, CONTENT_WIDTH);
  for (const line of titleLines) {
    doc.text(line, MARGIN, ctx.y);
    ctx.y += 8;
  }

  // Intensity + Profile badge
  ctx.y += 3;
  const intensityLabel = result.intensity === 'alto' ? 'Alta' : result.intensity === 'moderado' ? 'Moderada' : 'Leve';
  const intensityColor = result.intensity === 'alto' ? COLORS.red : result.intensity === 'moderado' ? COLORS.yellow : COLORS.green;

  // Intensity badge
  doc.setFillColor(...(intensityColor as [number, number, number]));
  const badgeText = `Intensidade: ${intensityLabel}`;
  doc.setFontSize(9);
  const badgeWidth = doc.getTextWidth(badgeText) + 8;
  doc.roundedRect(MARGIN, ctx.y - 4, badgeWidth, 7, 3, 3, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.white);
  doc.text(badgeText, MARGIN + 4, ctx.y);

  // Profile name
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...COLORS.textLight);
  doc.text(`Perfil: ${result.profileName}`, MARGIN + badgeWidth + 6, ctx.y);

  ctx.y += SECTION_GAP + 6;

  // ═══════════════════════════════════
  // BLOCO 1 — DIAGNÓSTICO
  // ═══════════════════════════════════
  addBlockHeader(ctx, '1', 'Diagnóstico');

  // Key insight box for critical diagnosis
  addHighlightBox(ctx, 'O que realmente te trava', result.criticalDiagnosis);

  addTitle(ctx, 'Dor Central');
  addParagraph(ctx, result.corePain);

  addTitle(ctx, 'Estado Mental Atual');
  addParagraph(ctx, result.mentalState);
  ctx.y += SECTION_GAP - 6;

  // ═══════════════════════════════════
  // BLOCO 2 — PADRÃO COMPORTAMENTAL
  // ═══════════════════════════════════
  addBlockHeader(ctx, '2', 'Padrão Comportamental');

  addTitle(ctx, 'Como o padrão funciona');
  addParagraph(ctx, result.mechanism);

  if (result.selfSabotageCycle.length > 0) {
    addTitle(ctx, 'Ciclo de Autossabotagem');
    result.selfSabotageCycle.forEach((step, i) => {
      addBullet(ctx, `${i + 1}. ${step}`);
    });
    ctx.y += 4;
  }

  if (result.triggers.length > 0) {
    addTitle(ctx, 'Gatilhos');
    result.triggers.forEach(t => addBullet(ctx, t));
    ctx.y += 4;
  }

  if (result.mentalTraps.length > 0) {
    addHighlightBox(ctx, 'As frases que te mantêm preso(a)', result.mentalTraps.map(t => `"${t}"`).join('\n'), COLORS.red);
  }

  addHighlightBox(ctx, 'Contradição Interna', result.contradiction, COLORS.yellow);
  ctx.y += SECTION_GAP - 8;

  // ═══════════════════════════════════
  // BLOCO 3 — IMPACTO
  // ═══════════════════════════════════
  addBlockHeader(ctx, '3', 'Impacto na Vida');

  if (result.lifeImpact.length > 0) {
    result.lifeImpact.forEach(item => {
      addPillarCard(ctx, item.pillar, item.impact);
    });
    ctx.y += 2;
  }

  // ─── Intensity Map with legend ───
  addTitle(ctx, 'Mapa de Intensidade por Eixo');

  // Legend
  const legendY = ctx.y;
  const { doc: d } = ctx;
  d.setFontSize(7);
  d.setFont('helvetica', 'normal');
  
  d.setFillColor(...COLORS.green);
  d.circle(MARGIN + 2, legendY - 1.2, 1.5, 'F');
  d.setTextColor(...COLORS.textMuted);
  d.text('Baixo (<40%)', MARGIN + 6, legendY);

  d.setFillColor(...COLORS.yellow);
  d.circle(MARGIN + 40, legendY - 1.2, 1.5, 'F');
  d.text('Moderado (40-65%)', MARGIN + 44, legendY);

  d.setFillColor(...COLORS.red);
  d.circle(MARGIN + 88, legendY - 1.2, 1.5, 'F');
  d.text('Alto (>65%)', MARGIN + 92, legendY);

  ctx.y += 6;

  result.allScores.slice(0, 8).forEach(score => {
    checkPageBreak(ctx, 14);
    d.setFontSize(9);
    d.setFont('helvetica', 'normal');
    d.setTextColor(...COLORS.text);
    d.text(score.label, MARGIN + 2, ctx.y);

    // Percentage right-aligned
    d.setFont('helvetica', 'bold');
    const pctText = `${score.percentage}%`;
    d.text(pctText, MARGIN + CONTENT_WIDTH - d.getTextWidth(pctText), ctx.y);

    const barY = ctx.y + 2.5;
    const barWidth = CONTENT_WIDTH - 4;

    // Bar background
    d.setFillColor(...COLORS.border);
    d.roundedRect(MARGIN + 2, barY, barWidth, 3.5, 1.5, 1.5, 'F');

    // Bar fill with color
    const barColor = score.percentage > 65 ? COLORS.red : score.percentage >= 40 ? COLORS.yellow : COLORS.green;
    d.setFillColor(...(barColor as [number, number, number]));
    const fillWidth = (score.percentage / 100) * barWidth;
    if (fillWidth > 0) {
      d.roundedRect(MARGIN + 2, barY, Math.max(fillWidth, 3), 3.5, 1.5, 1.5, 'F');
    }
    ctx.y += 11;
  });
  ctx.y += SECTION_GAP - 4;

  // ═══════════════════════════════════
  // BLOCO 4 — PLANO DE AÇÃO
  // ═══════════════════════════════════
  addBlockHeader(ctx, '4', 'Plano de Ação');

  // Key unlock as highlight
  addHighlightBox(ctx, 'Área-chave de destravamento', result.keyUnlockArea, COLORS.green);

  addTitle(ctx, 'Direção de Mudança');
  addParagraph(ctx, result.direction);

  if (result.exitStrategy.length > 0) {
    addTitle(ctx, 'Passos Práticos');
    result.exitStrategy.forEach(step => {
      addNumberedStep(ctx, step.step, step.title, step.action);
    });
  }

  if (result.whatNotToDo.length > 0) {
    addHighlightBox(ctx, 'Pare de fazer isso', result.whatNotToDo.map(item => `✗ ${item}`).join('\n'), COLORS.red);
  }

  // ─── Footer ───
  checkPageBreak(ctx, 24);
  ctx.y += 8;
  doc.setDrawColor(...COLORS.border);
  doc.setLineWidth(0.3);
  doc.line(MARGIN, ctx.y, MARGIN + CONTENT_WIDTH, ctx.y);
  ctx.y += 6;

  doc.setFillColor(...COLORS.accent);
  doc.rect(MARGIN, ctx.y + 8, CONTENT_WIDTH, 1, 'F');

  doc.setFontSize(8);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(...COLORS.textMuted);
  const notice = 'Este relatório oferece uma leitura comportamental baseada em suas respostas e não substitui avaliação psicológica ou clínica profissional.';
  const noticeLines = doc.splitTextToSize(notice, CONTENT_WIDTH);
  noticeLines.forEach((line: string) => {
    doc.text(line, MARGIN, ctx.y);
    ctx.y += 4.5;
  });

  // Save
  const filename = `raio-x-comportamental-${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(filename);
}
