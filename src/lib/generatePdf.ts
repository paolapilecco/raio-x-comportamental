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

function addBlockHeader(ctx: PDFContext, text: string) {
  checkPageBreak(ctx, 28);
  ctx.y += 6;
  ctx.doc.setFillColor(30, 30, 35);
  ctx.doc.roundedRect(MARGIN, ctx.y, CONTENT_WIDTH, 10, 1, 1, 'F');
  ctx.doc.setFontSize(11);
  ctx.doc.setFont('helvetica', 'bold');
  ctx.doc.setTextColor(255, 255, 255);
  ctx.doc.text(text.toUpperCase(), MARGIN + 4, ctx.y + 7);
  ctx.y += 16;
}

function addTitle(ctx: PDFContext, text: string) {
  checkPageBreak(ctx, 20);
  ctx.doc.setFontSize(12);
  ctx.doc.setFont('helvetica', 'bold');
  ctx.doc.setTextColor(30, 30, 30);
  ctx.doc.text(text, MARGIN, ctx.y);
  ctx.y += 7;
  ctx.doc.setDrawColor(180, 180, 180);
  ctx.doc.setLineWidth(0.2);
  ctx.doc.line(MARGIN, ctx.y, MARGIN + CONTENT_WIDTH, ctx.y);
  ctx.y += 5;
}

function addParagraph(ctx: PDFContext, text: string) {
  if (!text) return;
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
  doc.text('Mapa de Funcionamento Comportamental', MARGIN, 30);

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

  // ─── Combined Title + Intensity ───
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 30, 30);
  const titleLines = doc.splitTextToSize(result.combinedTitle, CONTENT_WIDTH);
  for (const line of titleLines) {
    doc.text(line, MARGIN, ctx.y);
    ctx.y += 8;
  }
  ctx.y += 2;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  const intensityLabel = result.intensity === 'alto' ? 'Alta' : result.intensity === 'moderado' ? 'Moderada' : 'Leve';
  doc.text(`Intensidade: ${intensityLabel}  ·  Perfil: ${result.profileName}`, MARGIN, ctx.y);
  ctx.y += SECTION_GAP + 4;

  // ══════════════════════════════════════════
  // BLOCO 1 — DIAGNÓSTICO
  // ══════════════════════════════════════════
  addBlockHeader(ctx, '1. Diagnóstico');

  addTitle(ctx, 'Diagnóstico Crítico');
  addParagraph(ctx, result.criticalDiagnosis);
  ctx.y += 2;

  addTitle(ctx, 'Dor Central');
  addParagraph(ctx, result.corePain);
  ctx.y += 2;

  addTitle(ctx, 'Estado Mental Atual');
  addParagraph(ctx, result.mentalState);
  ctx.y += SECTION_GAP - 4;

  // ══════════════════════════════════════════
  // BLOCO 2 — PADRÃO COMPORTAMENTAL
  // ══════════════════════════════════════════
  addBlockHeader(ctx, '2. Padrão Comportamental');

  addTitle(ctx, 'Mecanismo Principal');
  addParagraph(ctx, result.mechanism);
  ctx.y += 2;

  if (result.selfSabotageCycle.length > 0) {
    addTitle(ctx, 'Ciclo de Autossabotagem');
    result.selfSabotageCycle.forEach((step, i) => {
      addBullet(ctx, `${i + 1}. ${step}`);
    });
    ctx.y += 4;
  }

  if (result.triggers.length > 0) {
    addTitle(ctx, 'Gatilhos Identificados');
    result.triggers.forEach(t => addBullet(ctx, t));
    ctx.y += 4;
  }

  if (result.mentalTraps.length > 0) {
    addTitle(ctx, 'Armadilhas Mentais');
    result.mentalTraps.forEach(t => addParagraph(ctx, `"${t}"`));
    ctx.y += 2;
  }

  addTitle(ctx, 'Contradição Interna');
  addParagraph(ctx, result.contradiction);
  ctx.y += SECTION_GAP - 4;

  // ══════════════════════════════════════════
  // BLOCO 3 — IMPACTO
  // ══════════════════════════════════════════
  addBlockHeader(ctx, '3. Impacto na Vida');

  if (result.lifeImpact.length > 0) {
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
  }

  // ─── Intensity Map ───
  addTitle(ctx, 'Mapa de Intensidade por Eixo');
  result.allScores.slice(0, 8).forEach(score => {
    checkPageBreak(ctx, 14);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(60, 60, 60);
    doc.text(score.label, MARGIN + 2, ctx.y);
    doc.text(`${score.percentage}%`, MARGIN + CONTENT_WIDTH - 10, ctx.y);

    const barY = ctx.y + 2;
    const barWidth = CONTENT_WIDTH - 4;
    doc.setFillColor(220, 220, 220);
    doc.roundedRect(MARGIN + 2, barY, barWidth, 3, 1.5, 1.5, 'F');

    // Color based on percentage: green (<40), yellow (40-65), red (>65)
    if (score.percentage > 65) {
      doc.setFillColor(200, 60, 60);   // red
    } else if (score.percentage >= 40) {
      doc.setFillColor(210, 170, 50);  // yellow
    } else {
      doc.setFillColor(60, 160, 90);   // green
    }
    const fillWidth = (score.percentage / 100) * barWidth;
    if (fillWidth > 0) {
      doc.roundedRect(MARGIN + 2, barY, Math.max(fillWidth, 3), 3, 1.5, 1.5, 'F');
    }
    ctx.y += 10;
  });
  ctx.y += SECTION_GAP - 4;

  // ══════════════════════════════════════════
  // BLOCO 4 — PLANO DE AÇÃO
  // ══════════════════════════════════════════
  addBlockHeader(ctx, '4. Plano de Ação');

  // Unified: Key unlock + direction + exit strategy
  addTitle(ctx, 'Área-Chave de Destravamento');
  addParagraph(ctx, result.keyUnlockArea);
  addParagraph(ctx, result.direction);
  ctx.y += 2;

  if (result.exitStrategy.length > 0) {
    addTitle(ctx, 'Passos Práticos');
    result.exitStrategy.forEach(step => {
      addNumberedItem(ctx, step.step, step.title, step.action);
    });
    ctx.y += 4;
  }

  if (result.whatNotToDo.length > 0) {
    addTitle(ctx, 'O Que NÃO Fazer');
    result.whatNotToDo.forEach(item => {
      addBullet(ctx, `✗ ${item}`);
    });
    ctx.y += 4;
  }

  // ─── Footer notice ───
  checkPageBreak(ctx, 20);
  ctx.y += 6;
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
