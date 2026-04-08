import jsPDF from 'jspdf';
import type { PersonGamificationData, ScoreComparison, PersonBadge } from '@/hooks/usePersonGamification';

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

function drawSection(ctx: Ctx, title: string) {
  pb(ctx, 20);
  ctx.y += 4;
  ctx.doc.setFillColor(...C.accent);
  ctx.doc.roundedRect(M, ctx.y, 3, 10, 1.5, 1.5, 'F');
  ctx.doc.setFont('helvetica', 'bold');
  ctx.doc.setFontSize(12);
  ctx.doc.setTextColor(...C.dark);
  ctx.doc.text(title, M + 8, ctx.y + 7.5);
  ctx.y += 16;
}

function drawKPIRow(ctx: Ctx, items: { label: string; value: string; color?: readonly number[] }[]) {
  pb(ctx, 28);
  const gap = 4;
  const w = (CW - gap * (items.length - 1)) / items.length;
  items.forEach((item, i) => {
    const x = M + i * (w + gap);
    ctx.doc.setFillColor(...C.bg);
    ctx.doc.roundedRect(x, ctx.y, w, 24, 3, 3, 'F');
    ctx.doc.setFont('helvetica', 'bold');
    ctx.doc.setFontSize(16);
    ctx.doc.setTextColor(...(item.color || C.dark));
    ctx.doc.text(item.value, x + w / 2, ctx.y + 12, { align: 'center' });
    ctx.doc.setFont('helvetica', 'normal');
    ctx.doc.setFontSize(7);
    ctx.doc.setTextColor(...C.muted);
    ctx.doc.text(item.label, x + w / 2, ctx.y + 20, { align: 'center' });
  });
  ctx.y += 30;
}

function drawScoreRing(ctx: Ctx, score: number, x: number, y: number, r: number) {
  // Background ring
  ctx.doc.setDrawColor(...C.border);
  ctx.doc.setLineWidth(2.5);
  ctx.doc.circle(x, y, r);
  // Score arc
  const color = score >= 70 ? C.green : score >= 40 ? C.yellow : C.red;
  ctx.doc.setDrawColor(...color);
  ctx.doc.setLineWidth(2.5);
  const steps = Math.round(score / 100 * 60);
  for (let i = 0; i < steps; i++) {
    const angle = (-90 + i * 6) * Math.PI / 180;
    const px = x + Math.cos(angle) * r;
    const py = y + Math.sin(angle) * r;
    ctx.doc.circle(px, py, 0.4, 'F');
  }
  // Score text
  ctx.doc.setFont('helvetica', 'bold');
  ctx.doc.setFontSize(18);
  ctx.doc.setTextColor(...C.dark);
  ctx.doc.text(String(score), x, y + 2, { align: 'center' });
  ctx.doc.setFontSize(6);
  ctx.doc.setTextColor(...C.muted);
  ctx.doc.text('Score Global', x, y + 8, { align: 'center' });
}

function drawBar(ctx: Ctx, label: string, value: number, delta: number) {
  pb(ctx, 10);
  const barW = CW - 80;
  // Label
  ctx.doc.setFont('helvetica', 'normal');
  ctx.doc.setFontSize(7.5);
  ctx.doc.setTextColor(...C.text);
  const lines = ctx.doc.splitTextToSize(label, 38);
  ctx.doc.text(lines, M, ctx.y + 4.5);
  // Bar bg
  const barX = M + 42;
  ctx.doc.setFillColor(...C.bg);
  ctx.doc.roundedRect(barX, ctx.y + 1, barW, 5, 2, 2, 'F');
  // Bar fill
  const color = value >= 70 ? C.red : value >= 40 ? C.yellow : C.green;
  ctx.doc.setFillColor(...color);
  const fillW = Math.max(2, (value / 100) * barW);
  ctx.doc.roundedRect(barX, ctx.y + 1, fillW, 5, 2, 2, 'F');
  // Value
  ctx.doc.setFont('helvetica', 'bold');
  ctx.doc.setFontSize(7);
  ctx.doc.setTextColor(...C.text);
  ctx.doc.text(`${value}%`, barX + barW + 3, ctx.y + 5);
  // Delta
  if (delta !== 0) {
    const deltaColor = delta < 0 ? C.green : C.red;
    ctx.doc.setTextColor(...deltaColor);
    ctx.doc.text(`${delta > 0 ? '+' : ''}${delta}%`, barX + barW + 15, ctx.y + 5);
  }
  ctx.y += 9;
}

export function generateEvolutionPdf(
  data: PersonGamificationData,
  patientName?: string,
) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const ctx: Ctx = { doc, y: M };

  // Header
  doc.setFillColor(...C.accent);
  doc.roundedRect(M, ctx.y, CW, 30, 4, 4, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(...C.white);
  doc.text('Relatório de Evolução', M + 10, ctx.y + 13);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(patientName || 'Paciente', M + 10, ctx.y + 21);
  doc.setFontSize(7);
  doc.text(new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }), M + CW - 10, ctx.y + 21, { align: 'right' });
  ctx.y += 38;

  // Score Global ring
  drawScoreRing(ctx, data.globalScore, M + 20, ctx.y + 14, 12);

  // Score breakdown next to ring
  const bx = M + 48;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...C.dark);
  doc.text('Score Global de Evolução', bx, ctx.y + 4);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...C.muted);

  const bd = data.scoreBreakdown;
  const breakdownItems = [
    { label: 'Autoconsciência', value: bd.awareness, emoji: '🧠' },
    { label: 'Consistência', value: bd.consistency, emoji: '🔥' },
    { label: 'Cobertura', value: bd.coverage, emoji: '📊' },
    { label: 'Recência', value: bd.recency, emoji: '⏱' },
  ];

  breakdownItems.forEach((item, i) => {
    const iy = ctx.y + 10 + i * 6;
    doc.setTextColor(...C.text);
    doc.setFontSize(7.5);
    doc.text(`${item.label}: ${item.value}%`, bx, iy);
    // mini bar
    const mbx = bx + 45;
    doc.setFillColor(...C.bg);
    doc.roundedRect(mbx, iy - 3, 50, 3.5, 1.5, 1.5, 'F');
    const mbColor = item.value >= 70 ? C.green : item.value >= 40 ? C.yellow : C.red;
    doc.setFillColor(...mbColor);
    doc.roundedRect(mbx, iy - 3, Math.max(1, item.value / 100 * 50), 3.5, 1.5, 1.5, 'F');
  });
  ctx.y += 38;

  // Gamification KPIs
  drawSection(ctx, 'Gamificação');
  drawKPIRow(ctx, [
    { label: 'Streak (semanas)', value: String(data.currentStreak) },
    { label: `Nível ${data.level}`, value: data.levelName },
    { label: 'XP Total', value: String(data.totalXP) },
    { label: 'Testes', value: String(data.totalTests) },
  ]);

  // Retest cycle
  drawSection(ctx, 'Ciclo de Reteste');
  pb(ctx, 16);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...C.text);
  if (data.lastTestDate) {
    doc.text(`Último teste: ${data.lastTestDate.toLocaleDateString('pt-BR')}`, M, ctx.y);
    ctx.y += 6;
    doc.text(`Dias desde o último teste: ${data.daysSinceLastTest}`, M, ctx.y);
    ctx.y += 6;
    if (data.retestAvailable) {
      doc.setTextColor(...C.green);
      doc.setFont('helvetica', 'bold');
      doc.text('✓ Reteste disponível', M, ctx.y);
    } else {
      doc.setTextColor(...C.accent);
      doc.text(`${data.daysUntilRetest} dias restantes para o próximo reteste`, M, ctx.y);
    }
    ctx.y += 10;
  } else {
    doc.text('Nenhum teste realizado.', M, ctx.y);
    ctx.y += 10;
  }

  // Badges
  drawSection(ctx, `Conquistas (${data.unlockedBadges}/${data.badges.length})`);
  pb(ctx, 10 + data.badges.length * 7);
  data.badges.forEach(badge => {
    doc.setFont('helvetica', badge.unlocked ? 'bold' : 'normal');
    doc.setFontSize(8);
    const txtColor = badge.unlocked ? C.text : C.light;
    doc.setTextColor(txtColor[0], txtColor[1], txtColor[2]);
    doc.text(`${badge.emoji}  ${badge.name} — ${badge.description}`, M + 4, ctx.y);
    if (badge.unlocked) {
      doc.setFillColor(...C.green);
      doc.circle(M, ctx.y - 1.5, 1.2, 'F');
    } else {
      doc.setDrawColor(...C.light);
      doc.circle(M, ctx.y - 1.5, 1.2);
    }
    ctx.y += 7;
  });

  // Score Comparisons
  if (data.scoreComparisons.length > 0) {
    drawSection(ctx, 'Comparação entre Últimos Testes');
    data.scoreComparisons.forEach(sc => {
      drawBar(ctx, sc.label, sc.current, sc.delta);
    });
  }

  // Footer
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(6.5);
    doc.setTextColor(...C.light);
    doc.text('Raio-X Comportamental — Relatório de Evolução', M, PH - 8);
    doc.text(`${i}/${totalPages}`, PW - M, PH - 8, { align: 'right' });
  }

  doc.save(`evolucao_${(patientName || 'paciente').replace(/\s+/g, '_').toLowerCase()}.pdf`);
}
