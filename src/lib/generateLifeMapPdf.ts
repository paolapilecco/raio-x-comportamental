import jsPDF from 'jspdf';

const MARGIN = 20;
const PAGE_WIDTH = 210;
const PAGE_HEIGHT = 297;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

// Brand palette
const C = {
  dark: [25, 25, 30] as const,
  accent: [90, 70, 180] as const,
  accentLight: [240, 237, 255] as const,
  white: [255, 255, 255] as const,
  text: [40, 40, 45] as const,
  textLight: [100, 100, 110] as const,
  textMuted: [140, 140, 150] as const,
  border: [210, 210, 215] as const,
  bgLight: [248, 248, 250] as const,
  red: [195, 55, 55] as const,
  yellow: [200, 160, 40] as const,
  green: [50, 150, 80] as const,
};

// Area labels and colors for each slice
const AREA_CONFIG: Record<string, { label: string; color: readonly [number, number, number] }> = {
  emocional:       { label: 'Emocional',       color: [120, 80, 200] },
  espiritual:      { label: 'Espiritual',       color: [80, 130, 200] },
  profissional:    { label: 'Profissional',     color: [60, 160, 120] },
  financeiro:      { label: 'Financeiro',       color: [200, 170, 50] },
  intelectual:     { label: 'Intelectual',      color: [50, 140, 180] },
  saude:           { label: 'Saúde',            color: [60, 180, 90] },
  social:          { label: 'Social',           color: [200, 120, 60] },
  familia:         { label: 'Família',          color: [180, 80, 120] },
  relacionamento:  { label: 'Relacionamento',   color: [200, 80, 80] },
  proposito:       { label: 'Propósito',        color: [140, 100, 200] },
};

interface AreaScore {
  key: string;
  label: string;
  score: number;       // raw 0-10
  percentage: number;  // 0-100
}

/**
 * Extracts area scores from all_scores, normalizing to 0-10 scale
 */
function extractAreaScores(allScores: any[]): AreaScore[] {
  if (!allScores || allScores.length === 0) return [];
  return allScores.map(s => ({
    key: s.key,
    label: AREA_CONFIG[s.key]?.label || s.label || s.key,
    score: Math.round(s.percentage / 10),  // percentage (0-100) → score (0-10)
    percentage: s.percentage,
  }));
}

/**
 * Draws the Roda da Vida (Wheel of Life) circle chart
 */
function drawWheel(
  doc: jsPDF,
  cx: number,
  cy: number,
  radius: number,
  areas: AreaScore[],
  previousAreas?: AreaScore[],
) {
  const count = areas.length;
  if (count === 0) return;

  const angleStep = (2 * Math.PI) / count;
  const startAngle = -Math.PI / 2; // start from top

  // Draw concentric rings (0-10 scale)
  for (let ring = 1; ring <= 10; ring++) {
    const r = (ring / 10) * radius;
    doc.setDrawColor(...C.border);
    doc.setLineWidth(ring === 5 ? 0.4 : 0.15);
    doc.circle(cx, cy, r);

    // Number labels on the right side
    if (ring % 2 === 0) {
      doc.setFontSize(5.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...C.textMuted);
      doc.text(String(ring), cx + r + 1, cy + 1.5);
    }
  }

  // Draw radial lines for each area
  for (let i = 0; i < count; i++) {
    const angle = startAngle + i * angleStep;
    const x2 = cx + radius * Math.cos(angle);
    const y2 = cy + radius * Math.sin(angle);
    doc.setDrawColor(...C.border);
    doc.setLineWidth(0.2);
    doc.line(cx, cy, x2, y2);
  }

  // Draw previous scores polygon (if available)
  if (previousAreas && previousAreas.length === count) {
    const prevPoints: [number, number][] = previousAreas.map((area, i) => {
      const angle = startAngle + i * angleStep;
      const r = (area.score / 10) * radius;
      return [cx + r * Math.cos(angle), cy + r * Math.sin(angle)];
    });

    doc.setDrawColor(180, 180, 190);
    doc.setLineWidth(0.8);
    doc.setLineDashPattern([2, 2], 0);
    for (let i = 0; i < prevPoints.length; i++) {
      const next = prevPoints[(i + 1) % prevPoints.length];
      doc.line(prevPoints[i][0], prevPoints[i][1], next[0], next[1]);
    }
    doc.setLineDashPattern([], 0);
  }

  // Draw current scores — filled polygon
  const points: [number, number][] = areas.map((area, i) => {
    const angle = startAngle + i * angleStep;
    const r = (area.score / 10) * radius;
    return [cx + r * Math.cos(angle), cy + r * Math.sin(angle)];
  });

  // Fill polygon with semi-transparent accent
  doc.setFillColor(90, 70, 180);
  doc.setDrawColor(90, 70, 180);
  doc.setLineWidth(1.5);

  // Draw filled shape using triangle fan from center
  for (let i = 0; i < points.length; i++) {
    const next = points[(i + 1) % points.length];
    // Triangle: center → point[i] → point[i+1]
    doc.setGState(new (doc as any).GState({ opacity: 0.12 }));
    doc.triangle(cx, cy, points[i][0], points[i][1], next[0], next[1], 'F');
  }
  doc.setGState(new (doc as any).GState({ opacity: 1 }));

  // Outline of polygon
  doc.setDrawColor(...C.accent);
  doc.setLineWidth(1.5);
  for (let i = 0; i < points.length; i++) {
    const next = points[(i + 1) % points.length];
    doc.line(points[i][0], points[i][1], next[0], next[1]);
  }

  // Score dots + labels
  for (let i = 0; i < count; i++) {
    const area = areas[i];
    const angle = startAngle + i * angleStep;
    const r = (area.score / 10) * radius;
    const px = cx + r * Math.cos(angle);
    const py = cy + r * Math.sin(angle);

    // Score dot
    doc.setFillColor(...C.white);
    doc.circle(px, py, 2.8, 'F');
    const dotColor = area.score >= 7 ? C.green : area.score >= 4 ? C.yellow : C.red;
    doc.setFillColor(...dotColor);
    doc.circle(px, py, 2.2, 'F');

    // Score number inside dot
    doc.setFontSize(6);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...C.white);
    const scoreText = String(area.score);
    const sw = doc.getTextWidth(scoreText);
    doc.text(scoreText, px - sw / 2, py + 1.8);

    // Area label outside the wheel
    const labelR = radius + 10;
    const lx = cx + labelR * Math.cos(angle);
    const ly = cy + labelR * Math.sin(angle);

    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    const cfg = AREA_CONFIG[area.key];
    if (cfg) {
      doc.setTextColor(...cfg.color);
    } else {
      doc.setTextColor(...C.text);
    }

    // Align text based on position
    const labelText = area.label.toUpperCase();
    const tw = doc.getTextWidth(labelText);
    const cosA = Math.cos(angle);
    let textX = lx;
    if (cosA < -0.3) textX = lx - tw;
    else if (cosA > 0.3) textX = lx;
    else textX = lx - tw / 2;

    doc.text(labelText, textX, ly + 2);
  }
}

/**
 * Main export function — generates the Roda da Vida PDF
 */
export function generateLifeMapPdf(
  allScores: any[],
  userName?: string,
  previousScores?: any[],
  dateStr?: string,
  previousDateStr?: string,
) {
  const doc = new jsPDF('p', 'mm', 'a4');
  const areas = extractAreaScores(allScores);
  const prevAreas = previousScores ? extractAreaScores(previousScores) : undefined;

  if (areas.length === 0) return;

  // ═══════════════════════════════════
  // COVER HEADER
  // ═══════════════════════════════════
  doc.setFillColor(...C.dark);
  doc.rect(0, 0, PAGE_WIDTH, 50, 'F');

  doc.setFillColor(...C.accent);
  doc.rect(0, 50, PAGE_WIDTH, 2, 'F');

  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...C.white);
  doc.text('Roda da Vida', MARGIN, 22);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(180, 180, 190);
  doc.text('Mapa de Vida & Evolução · Autoavaliação Sistêmica', MARGIN, 32);

  if (userName) {
    doc.setFontSize(9);
    doc.setTextColor(160, 160, 170);
    doc.text(userName, MARGIN, 43);
  }

  const date = dateStr || new Date().toLocaleDateString('pt-BR');
  doc.setFontSize(8);
  doc.setTextColor(...C.textMuted);
  doc.text(date, PAGE_WIDTH - MARGIN - doc.getTextWidth(date), 43);

  // ═══════════════════════════════════
  // WHEEL CHART
  // ═══════════════════════════════════
  const wheelCx = PAGE_WIDTH / 2;
  const wheelCy = 122;
  const wheelRadius = 50;

  drawWheel(doc, wheelCx, wheelCy, wheelRadius, areas, prevAreas);

  // Legend if comparing
  if (prevAreas) {
    const legY = wheelCy + wheelRadius + 18;
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');

    doc.setDrawColor(...C.accent);
    doc.setLineWidth(1.5);
    doc.line(MARGIN, legY, MARGIN + 10, legY);
    doc.setTextColor(...C.text);
    doc.text(`Atual (${date})`, MARGIN + 13, legY + 1);

    doc.setDrawColor(180, 180, 190);
    doc.setLineWidth(0.8);
    doc.setLineDashPattern([2, 2], 0);
    doc.line(MARGIN + 65, legY, MARGIN + 75, legY);
    doc.setLineDashPattern([], 0);
    doc.setTextColor(...C.textLight);
    doc.text(`Anterior (${previousDateStr || '—'})`, MARGIN + 78, legY + 1);
  }

  // ═══════════════════════════════════
  // SCORES TABLE
  // ═══════════════════════════════════
  let tableY = prevAreas ? wheelCy + wheelRadius + 28 : wheelCy + wheelRadius + 18;

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...C.dark);
  doc.text('Detalhamento por Área', MARGIN, tableY);
  tableY += 8;

  // Table header
  doc.setFillColor(...C.accentLight);
  doc.roundedRect(MARGIN, tableY - 4, CONTENT_WIDTH, 7, 1, 1, 'F');
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...C.accent);
  doc.text('ÁREA', MARGIN + 3, tableY);
  doc.text('NOTA', MARGIN + 55, tableY);
  doc.text('NÍVEL', MARGIN + 72, tableY);
  if (prevAreas) {
    doc.text('ANTERIOR', MARGIN + 100, tableY);
    doc.text('EVOLUÇÃO', MARGIN + 125, tableY);
  }
  doc.text('BARRA', MARGIN + (prevAreas ? 148 : 95), tableY);
  tableY += 6;

  // Sort by score ascending (worst first)
  const sorted = [...areas].sort((a, b) => a.score - b.score);

  sorted.forEach((area) => {
    if (tableY > PAGE_HEIGHT - 30) {
      doc.addPage();
      tableY = MARGIN + 6;
    }

    const cfg = AREA_CONFIG[area.key];
    const level = area.score >= 7 ? 'Bom' : area.score >= 4 ? 'Atenção' : 'Crítico';
    const levelColor = area.score >= 7 ? C.green : area.score >= 4 ? C.yellow : C.red;

    // Area name
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...C.text);
    doc.text(area.label, MARGIN + 3, tableY);

    // Score
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...(levelColor as [number, number, number]));
    doc.text(String(area.score), MARGIN + 58, tableY);

    // Level badge
    doc.setFontSize(6.5);
    doc.setFillColor(...(levelColor as [number, number, number]));
    const badgeW = doc.getTextWidth(level) + 5;
    doc.roundedRect(MARGIN + 70, tableY - 3.5, badgeW, 5, 2, 2, 'F');
    doc.setTextColor(...C.white);
    doc.setFont('helvetica', 'bold');
    doc.text(level, MARGIN + 72.5, tableY);

    // Previous + evolution
    if (prevAreas) {
      const prev = prevAreas.find(p => p.key === area.key);
      if (prev) {
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...C.textLight);
        doc.text(String(prev.score), MARGIN + 107, tableY);

        const diff = area.score - prev.score;
        const diffText = diff > 0 ? `+${diff}` : String(diff);
        doc.setFont('helvetica', 'bold');
        if (diff > 0) doc.setTextColor(...C.green);
        else if (diff < 0) doc.setTextColor(...C.red);
        else doc.setTextColor(...C.textMuted);
        doc.text(diffText, MARGIN + 130, tableY);
      }
    }

    // Mini bar
    const barX = MARGIN + (prevAreas ? 148 : 95);
    const barW = CONTENT_WIDTH - (prevAreas ? 150 : 97);
    doc.setFillColor(...C.border);
    doc.roundedRect(barX, tableY - 2.5, barW, 3.5, 1.5, 1.5, 'F');
    doc.setFillColor(...(levelColor as [number, number, number]));
    const fillW = Math.max((area.score / 10) * barW, 2);
    doc.roundedRect(barX, tableY - 2.5, fillW, 3.5, 1.5, 1.5, 'F');

    tableY += 9;
  });

  // ═══════════════════════════════════
  // SUMMARY INSIGHTS
  // ═══════════════════════════════════
  tableY += 6;
  if (tableY > PAGE_HEIGHT - 60) {
    doc.addPage();
    tableY = MARGIN + 6;
  }

  const avg = Math.round(areas.reduce((s, a) => s + a.score, 0) / areas.length * 10) / 10;
  const lowest = sorted[0];
  const highest = sorted[sorted.length - 1];

  // Average box
  doc.setFillColor(...C.accentLight);
  doc.roundedRect(MARGIN, tableY, CONTENT_WIDTH, 18, 2, 2, 'F');
  doc.setFillColor(...C.accent);
  doc.roundedRect(MARGIN, tableY, 3, 18, 1.5, 1.5, 'F');

  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...C.accent);
  doc.text('VISÃO GERAL', MARGIN + 8, tableY + 5);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...C.text);
  doc.text(`Média geral: ${avg}/10`, MARGIN + 8, tableY + 11);
  doc.text(`Ponto mais forte: ${highest.label} (${highest.score})  ·  Ponto mais fraco: ${lowest.label} (${lowest.score})`, MARGIN + 8, tableY + 16);

  tableY += 26;

  // Critical areas (< 4)
  const critical = sorted.filter(a => a.score < 4);
  if (critical.length > 0) {
    doc.setFillColor(255, 245, 245);
    const boxH = 8 + critical.length * 6;
    doc.roundedRect(MARGIN, tableY, CONTENT_WIDTH, boxH, 2, 2, 'F');
    doc.setFillColor(...C.red);
    doc.roundedRect(MARGIN, tableY, 3, boxH, 1.5, 1.5, 'F');

    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...C.red);
    doc.text('ÁREAS CRÍTICAS — AÇÃO IMEDIATA', MARGIN + 8, tableY + 5);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...C.text);
    critical.forEach((a, i) => {
      doc.text(`• ${a.label} — nota ${a.score}/10`, MARGIN + 8, tableY + 11 + i * 6);
    });
    tableY += boxH + 6;
  }

  // Attention areas (4-6)
  const attention = sorted.filter(a => a.score >= 4 && a.score < 7);
  if (attention.length > 0 && tableY < PAGE_HEIGHT - 40) {
    doc.setFillColor(255, 252, 240);
    const boxH = 8 + attention.length * 6;
    doc.roundedRect(MARGIN, tableY, CONTENT_WIDTH, boxH, 2, 2, 'F');
    doc.setFillColor(...C.yellow);
    doc.roundedRect(MARGIN, tableY, 3, boxH, 1.5, 1.5, 'F');

    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...C.yellow);
    doc.text('ÁREAS DE ATENÇÃO', MARGIN + 8, tableY + 5);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...C.text);
    attention.forEach((a, i) => {
      doc.text(`• ${a.label} — nota ${a.score}/10`, MARGIN + 8, tableY + 11 + i * 6);
    });
    tableY += boxH + 6;
  }

  // ═══════════════════════════════════
  // FOOTER
  // ═══════════════════════════════════
  if (tableY > PAGE_HEIGHT - 20) {
    doc.addPage();
    tableY = MARGIN + 6;
  }
  doc.setDrawColor(...C.border);
  doc.setLineWidth(0.3);
  doc.line(MARGIN, tableY, MARGIN + CONTENT_WIDTH, tableY);
  tableY += 4;

  doc.setFillColor(...C.accent);
  doc.rect(MARGIN, tableY + 6, CONTENT_WIDTH, 1, 'F');

  doc.setFontSize(7);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(...C.textMuted);
  doc.text('Este mapa oferece uma leitura sistêmica baseada em suas autoavaliações e não substitui acompanhamento profissional.', MARGIN, tableY);

  // Save
  const filename = `roda-da-vida-${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(filename);
}
