import jsPDF from 'jspdf';
import { DiagnosticResult } from '@/types/diagnostic';

const MARGIN = 20;
const PAGE_WIDTH = 210;
const PAGE_HEIGHT = 297;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
const LINE_HEIGHT = 6;
const SECTION_GAP = 10;

interface PDFContext {
  doc: jsPDF;
  y: number;
}

function checkPageBreak(ctx: PDFContext, needed: number = 20) {
  if (ctx.y + needed > PAGE_HEIGHT - MARGIN) {
    ctx.doc.addPage();
    ctx.y = MARGIN;
  }
}

function addTitle(ctx: PDFContext, text: string) {
  checkPageBreak(ctx, 20);
  ctx.doc.setFontSize(13);
  ctx.doc.setFont('helvetica', 'bold');
  ctx.doc.setTextColor(30, 30, 30);
  ctx.doc.text(text, MARGIN, ctx.y);
  ctx.y += 8;
  // underline
  ctx.doc.setDrawColor(100, 100, 100);
  ctx.doc.setLineWidth(0.3);
  ctx.doc.line(MARGIN, ctx.y, MARGIN + CONTENT_WIDTH, ctx.y);
  ctx.y += 6;
}

function addParagraph(ctx: PDFContext, text: string) {
  ctx.doc.setFontSize(10);
  ctx.doc.setFont('helvetica', 'normal');
  ctx.doc.setTextColor(60, 60, 60);
  const lines = ctx.doc.splitTextToSize(text, CONTENT_WIDTH);
  for (const line of lines) {
    checkPageBreak(ctx);
    ctx.doc.text(line, MARGIN, ctx.y);
    ctx.y += LINE_HEIGHT;
  }
  ctx.y += 2;
}

function addBullet(ctx: PDFContext, text: string) {
  ctx.doc.setFontSize(10);
  ctx.doc.setFont('helvetica', 'normal');
  ctx.doc.setTextColor(60, 60, 60);
  const lines = ctx.doc.splitTextToSize(text, CONTENT_WIDTH - 8);
  checkPageBreak(ctx, lines.length * LINE_HEIGHT);
  ctx.doc.text('•', MARGIN + 2, ctx.y);
  for (let i = 0; i < lines.length; i++) {
    ctx.doc.text(lines[i], MARGIN + 8, ctx.y);
    ctx.y += LINE_HEIGHT;
  }
}

function addNumberedItem(ctx: PDFContext, num: number, title: string, text: string) {
  checkPageBreak(ctx, 18);
  ctx.doc.setFontSize(10);
  ctx.doc.setFont('helvetica', 'bold');
  ctx.doc.setTextColor(40, 40, 40);
  ctx.doc.text(`${num}. ${title}`, MARGIN + 2, ctx.y);
  ctx.y += LINE_HEIGHT;
  ctx.doc.setFont('helvetica', 'normal');
  ctx.doc.setTextColor(60, 60, 60);
  const lines = ctx.doc.splitTextToSize(text, CONTENT_WIDTH - 8);
  for (const line of lines) {
    checkPageBreak(ctx);
    ctx.doc.text(line, MARGIN + 8, ctx.y);
    ctx.y += LINE_HEIGHT;
  }
  ctx.y += 2;
}

export function generateDiagnosticPdf(result: DiagnosticResult, userName?: string) {
  const doc = new jsPDF('p', 'mm', 'a4');
  const ctx: PDFContext = { doc, y: MARGIN };

  // ─── Cover header ───
  doc.setFillColor(20, 20, 25);
  doc.rect(0, 0, PAGE_WIDTH, 60, 'F');

  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text('Mapa de Padrão Comportamental', MARGIN, 30);

  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(180, 180, 180);
  doc.text('Relatório Diagnóstico Completo', MARGIN, 40);

  if (userName) {
    doc.setFontSize(10);
    doc.setTextColor(160, 160, 160);
    doc.text(`Paciente: ${userName}`, MARGIN, 50);
  }

  const date = new Date().toLocaleDateString('pt-BR');
  doc.setFontSize(9);
  doc.setTextColor(140, 140, 140);
  doc.text(date, PAGE_WIDTH - MARGIN - doc.getTextWidth(date), 50);

  ctx.y = 72;

  // ─── Combined Title ───
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 30, 30);
  const titleLines = doc.splitTextToSize(result.combinedTitle, CONTENT_WIDTH);
  for (const line of titleLines) {
    doc.text(line, MARGIN, ctx.y);
    ctx.y += 8;
  }

  // Intensity
  ctx.y += 2;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  const intensityLabel = result.intensity === 'alto' ? 'Alta' : result.intensity === 'moderado' ? 'Moderada' : 'Leve';
  doc.text(`Intensidade: ${intensityLabel}`, MARGIN, ctx.y);
  ctx.y += SECTION_GAP + 4;

  // ─── Profile Name ───
  addTitle(ctx, 'Perfil Comportamental');
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(40, 40, 40);
  doc.text(result.profileName, MARGIN, ctx.y);
  ctx.y += SECTION_GAP;

  // ─── Mental State ───
  addTitle(ctx, 'Estado Mental Atual');
  addParagraph(ctx, result.mentalState);
  ctx.y += SECTION_GAP - 4;

  // ─── Summary ───
  addTitle(ctx, 'Resumo do Padrão');
  addParagraph(ctx, result.summary);
  ctx.y += SECTION_GAP - 4;

  // ─── Mechanism ───
  addTitle(ctx, 'Mecanismo Principal');
  addParagraph(ctx, result.mechanism);
  ctx.y += SECTION_GAP - 4;

  // ─── Triggers ───
  addTitle(ctx, 'Gatilhos Identificados');
  result.triggers.forEach(t => addBullet(ctx, t));
  ctx.y += SECTION_GAP - 4;

  // ─── Mental Traps ───
  addTitle(ctx, 'Armadilhas Mentais');
  result.mentalTraps.forEach(t => {
    addParagraph(ctx, `"${t}"`);
  });
  ctx.y += SECTION_GAP - 4;

  // ─── Self-sabotage Cycle ───
  addTitle(ctx, 'Ciclo de Autossabotagem');
  result.selfSabotageCycle.forEach((step, i) => {
    addBullet(ctx, `${i + 1}. ${step}`);
  });
  ctx.y += SECTION_GAP - 4;

  // ─── Blocking Point ───
  addTitle(ctx, 'Ponto Exato de Travamento');
  addParagraph(ctx, result.blockingPoint);
  ctx.y += SECTION_GAP - 4;

  // ─── Contradiction ───
  addTitle(ctx, 'Contradição Interna');
  addParagraph(ctx, result.contradiction);
  ctx.y += SECTION_GAP - 4;

  // ─── Life Impact ───
  addTitle(ctx, 'Impacto nos Pilares da Vida');
  result.lifeImpact.forEach(item => {
    checkPageBreak(ctx, 16);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(40, 40, 40);
    doc.text(item.pillar, MARGIN + 2, ctx.y);
    ctx.y += LINE_HEIGHT;
    addParagraph(ctx, item.impact);
    ctx.y += 2;
  });
  ctx.y += SECTION_GAP - 6;

  // ─── Intensity Map (top 8) ───
  addTitle(ctx, 'Mapa de Intensidade por Eixo');
  result.allScores.slice(0, 8).forEach(score => {
    checkPageBreak(ctx, 14);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(60, 60, 60);
    doc.text(score.label, MARGIN + 2, ctx.y);
    doc.text(`${score.percentage}%`, MARGIN + CONTENT_WIDTH - 10, ctx.y);

    // bar background
    const barY = ctx.y + 2;
    const barWidth = CONTENT_WIDTH - 4;
    doc.setFillColor(220, 220, 220);
    doc.roundedRect(MARGIN + 2, barY, barWidth, 3, 1.5, 1.5, 'F');

    // bar fill
    doc.setFillColor(80, 80, 100);
    const fillWidth = (score.percentage / 100) * barWidth;
    if (fillWidth > 0) {
      doc.roundedRect(MARGIN + 2, barY, Math.max(fillWidth, 3), 3, 1.5, 1.5, 'F');
    }
    ctx.y += 10;
  });
  ctx.y += SECTION_GAP - 4;

  // ─── Direction ───
  addTitle(ctx, 'Direção Inicial de Mudança');
  addParagraph(ctx, result.direction);
  ctx.y += SECTION_GAP - 4;

  // ─── Exit Strategy ───
  addTitle(ctx, 'Estrutura Prática de Saída do Ciclo');
  result.exitStrategy.forEach(step => {
    addNumberedItem(ctx, step.step, step.title, step.action);
  });
  ctx.y += SECTION_GAP;

  // ─── Footer notice ───
  checkPageBreak(ctx, 20);
  ctx.y += 4;
  doc.setDrawColor(180, 180, 180);
  doc.setLineWidth(0.2);
  doc.line(MARGIN, ctx.y, MARGIN + CONTENT_WIDTH, ctx.y);
  ctx.y += 6;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(140, 140, 140);
  const notice = 'Este relatório oferece uma leitura comportamental baseada em suas respostas e não substitui avaliação psicológica ou clínica profissional.';
  const noticeLines = doc.splitTextToSize(notice, CONTENT_WIDTH);
  noticeLines.forEach((line: string) => {
    doc.text(line, MARGIN, ctx.y);
    ctx.y += 4;
  });

  // Save
  const filename = `diagnostico-comportamental-${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(filename);
}
