import jsPDF from 'jspdf';
import { DiagnosticResult } from '@/types/diagnostic';

// ── Layout constants ──
const M = 20;        // margin
const PW = 210;      // page width
const PH = 297;      // page height
const CW = PW - M * 2; // content width
const LH = 5.5;      // line height

// ── Color palette ──
const C = {
  dark:       [22, 22, 28]   as const,
  accent:     [82, 62, 170]  as const,
  accentSoft: [237, 233, 255] as const,
  accentLight:[120, 100, 200] as const,
  red:        [190, 50, 50]  as const,
  redSoft:    [255, 240, 240] as const,
  yellow:     [190, 150, 30] as const,
  green:      [40, 140, 70]  as const,
  greenSoft:  [235, 250, 240] as const,
  text:       [35, 35, 40]   as const,
  muted:      [110, 110, 120] as const,
  light:      [155, 155, 165] as const,
  border:     [210, 210, 218] as const,
  bg:         [245, 245, 248] as const,
  cardBg:     [250, 250, 253] as const,
  white:      [255, 255, 255] as const,
};

type RGB = readonly [number, number, number];

interface Ctx { doc: jsPDF; y: number; pageNum: number; }

// ── Page break helper ──
function pb(ctx: Ctx, need = 14) {
  if (ctx.y + need > PH - M - 8) {
    ctx.doc.addPage();
    ctx.pageNum++;
    ctx.y = M + 4;
    // subtle top line on continuation pages
    ctx.doc.setDrawColor(...C.border);
    ctx.doc.setLineWidth(0.3);
    ctx.doc.line(M, ctx.y - 2, M + CW, ctx.y - 2);
  }
}

// ── Primitives ──

function sectionHeader(ctx: Ctx, num: number, title: string, accentColor: RGB = C.accent) {
  pb(ctx, 18);
  ctx.y += 8;
  const { doc } = ctx;
  
  // Number badge
  doc.setFillColor(...accentColor);
  doc.roundedRect(M, ctx.y - 4, 8, 8, 2, 2, 'F');
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...C.white);
  doc.text(String(num), M + 2.8, ctx.y + 0.8);
  
  // Title
  doc.setFontSize(11.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...C.dark);
  doc.text(title, M + 12, ctx.y + 0.8);
  
  // Underline accent
  const tw = doc.getTextWidth(title);
  doc.setDrawColor(...accentColor);
  doc.setLineWidth(0.6);
  doc.line(M + 12, ctx.y + 3, M + 12 + Math.min(tw, CW - 14), ctx.y + 3);
  
  ctx.y += 10;
}

function textBlock(ctx: Ctx, t: string, color: RGB = C.text, indent = 0) {
  if (!t) return;
  const { doc } = ctx;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...color);
  const lines = doc.splitTextToSize(t, CW - indent);
  for (const l of lines) {
    pb(ctx, LH + 1);
    doc.text(l, M + indent, ctx.y);
    ctx.y += LH;
  }
  ctx.y += 2;
}

function bulletItem(ctx: Ctx, t: string, dotColor: RGB = C.accent, icon?: string) {
  const { doc } = ctx;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...C.text);
  const lines = doc.splitTextToSize(t, CW - 10);
  pb(ctx, lines.length * LH + 2);
  
  if (icon) {
    doc.setFontSize(8);
    doc.setTextColor(...dotColor);
    doc.text(icon, M + 2, ctx.y);
  } else {
    doc.setFillColor(...dotColor);
    doc.circle(M + 3, ctx.y - 1.2, 1, 'F');
  }
  
  doc.setFontSize(9);
  doc.setTextColor(...C.text);
  for (const l of lines) {
    doc.text(l, M + 8, ctx.y);
    ctx.y += LH;
  }
  ctx.y += 1.5;
}

function alertBox(ctx: Ctx, t: string, borderColor: RGB = C.red, bgColor: RGB = C.redSoft) {
  if (!t) return;
  const { doc } = ctx;
  doc.setFontSize(9);
  const lines = doc.splitTextToSize(t, CW - 16);
  const h = lines.length * LH + 10;
  pb(ctx, h + 2);
  
  // Background
  doc.setFillColor(...bgColor);
  doc.roundedRect(M, ctx.y, CW, h, 2.5, 2.5, 'F');
  // Left accent bar
  doc.setFillColor(...borderColor);
  doc.roundedRect(M, ctx.y, 3, h, 1.5, 1.5, 'F');
  
  ctx.y += 6;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...C.text);
  for (const l of lines) {
    doc.text(l, M + 9, ctx.y);
    ctx.y += LH;
  }
  ctx.y += 6;
}

function accentBox(ctx: Ctx, t: string, borderColor: RGB = C.accent, bgColor: RGB = C.accentSoft) {
  if (!t) return;
  const { doc } = ctx;
  doc.setFontSize(9);
  const lines = doc.splitTextToSize(t, CW - 16);
  const h = lines.length * LH + 10;
  pb(ctx, h + 2);
  
  doc.setFillColor(...bgColor);
  doc.roundedRect(M, ctx.y, CW, h, 2.5, 2.5, 'F');
  doc.setFillColor(...borderColor);
  doc.roundedRect(M, ctx.y, 3, h, 1.5, 1.5, 'F');
  
  ctx.y += 6;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...C.text);
  for (const l of lines) {
    doc.text(l, M + 9, ctx.y);
    ctx.y += LH;
  }
  ctx.y += 6;
}

function greenBox(ctx: Ctx, t: string) {
  alertBox(ctx, t, C.green, C.greenSoft);
}

function labelAbove(ctx: Ctx, label: string, color: RGB = C.light) {
  pb(ctx, 8);
  const { doc } = ctx;
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...color);
  doc.text(label.toUpperCase(), M + 4, ctx.y);
  ctx.y += 4;
}


function renderImpactCards(ctx: Ctx, items: { area: string; efeito: string }[]) {
  // Render as 2-column cards
  for (let i = 0; i < items.length; i += 2) {
    const left = items[i];
    const right = items[i + 1];
    const colW = (CW - 4) / 2;
    
    const { doc } = ctx;
    doc.setFontSize(9);
    const leftLines = doc.splitTextToSize(left.efeito, colW - 10);
    const rightLines = right ? doc.splitTextToSize(right.efeito, colW - 10) : [];
    const maxH = Math.max(leftLines.length, rightLines.length) * LH + 12;
    
    pb(ctx, maxH + 2);
    
    // Left card
    doc.setFillColor(...C.cardBg);
    doc.setDrawColor(...C.border);
    doc.roundedRect(M, ctx.y, colW, maxH, 2, 2, 'FD');
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...C.accent);
    doc.text(left.area.toUpperCase(), M + 5, ctx.y + 5);
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...C.text);
    let ly = ctx.y + 9;
    for (const l of leftLines) { doc.text(l, M + 5, ly); ly += LH; }
    
    // Right card
    if (right) {
      const rx = M + colW + 4;
      doc.setFillColor(...C.cardBg);
      doc.setDrawColor(...C.border);
      doc.roundedRect(rx, ctx.y, colW, maxH, 2, 2, 'FD');
      doc.setFontSize(6.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...C.accent);
      doc.text(right.area.toUpperCase(), rx + 5, ctx.y + 5);
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...C.text);
      let ry = ctx.y + 9;
      for (const l of rightLines) { doc.text(l, rx + 5, ry); ry += LH; }
    }
    
    ctx.y += maxH + 3;
  }
}

// ── Main export ──

export function generateDiagnosticPdf(result: DiagnosticResult, userName?: string, extras?: PdfEvolutionData) {
  const doc = new jsPDF('p', 'mm', 'a4');
  const ctx: Ctx = { doc, y: M, pageNum: 1 };

  const ai = result as any;
  
  // ── Resolve all fields ──
  const chamaAtencao = ai.chamaAtencao || ai.resumoPrincipal || result.criticalDiagnosis;
  const padraoRepetido = ai.padraoRepetido || ai.padraoIdentificado || result.mechanism;
  const comoAparece = ai.comoAparece || result.mentalState;
  const gatilhos: string[] = ai.gatilhos || result.triggers || [];
  const comoAtrapalha = ai.comoAtrapalha || ai.significadoPratico || result.corePain;
  const impactoPorArea: { area: string; efeito: string }[] = ai.impactoPorArea || ai.impactoVida?.map((l: any) => ({ area: l.area || l.pillar, efeito: l.efeito || l.impact })) || result.lifeImpact?.map((l: any) => ({ area: l.pillar, efeito: l.impact })) || [];
  const corrigirPrimeiro = ai.corrigirPrimeiro || ai.direcaoAjuste || result.keyUnlockArea;
  const pararDeFazer: string[] = ai.pararDeFazer || ai.oQueEvitar || result.whatNotToDo || [];
  const acaoInicial = ai.acaoInicial || ai.proximoPasso || result.exitStrategy?.[0]?.action || result.direction;
  const microAcoes: { acao: string; detalhe?: string }[] = Array.isArray(ai.microAcoes) ? ai.microAcoes : [];
  const mentalCommand: string = ai.mentalCommand || '';
  const blindSpot = result.interpretation?.blindSpot;
  const mecanismoNeural = ai.mecanismoNeural as { neurotransmissor?: string; cicloNeural?: string; neuroplasticidade?: string } | undefined;
  const actionPlan: { area: string; score: number; actions: string[] }[] = Array.isArray(ai.actionPlan) ? ai.actionPlan : [];
  const focoMudanca = ai.focoMudanca || result.keyUnlockArea || '';

  // ═══════════════════════════════════════════
  // COVER
  // ═══════════════════════════════════════════
  
  // Dark header band
  doc.setFillColor(...C.dark);
  doc.rect(0, 0, PW, 58, 'F');
  
  // Accent stripe
  doc.setFillColor(...C.accent);
  doc.rect(0, 58, PW, 2, 'F');
  
  // Title
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...C.white);
  doc.text('Raio-X Comportamental', M, 26);
  
  // Subtitle
  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(170, 170, 185);
  doc.text('Relatório Completo de Leitura', M, 36);
  
  // User name & date
  if (userName) {
    doc.setFontSize(8);
    doc.setTextColor(145, 145, 160);
    doc.text(userName, M, 46);
  }
  const date = new Date().toLocaleDateString('pt-BR');
  doc.setFontSize(8);
  doc.setTextColor(...C.light);
  doc.text(date, PW - M - doc.getTextWidth(date), 46);

  ctx.y = 68;

  // ── Combined Title + Intensity ──
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...C.dark);
  const titleLines = doc.splitTextToSize(result.combinedTitle, CW);
  for (const l of titleLines) { doc.text(l, M, ctx.y); ctx.y += 7; }
  ctx.y += 3;
  
  const intLabel = result.intensity === 'alto' ? 'Alta' : result.intensity === 'moderado' ? 'Moderada' : 'Leve';
  const intColor: RGB = result.intensity === 'alto' ? C.red : result.intensity === 'moderado' ? C.yellow : C.green;
  doc.setFillColor(...intColor);
  const badge = `Intensidade: ${intLabel}`;
  doc.setFontSize(7.5);
  const bw = doc.getTextWidth(badge) + 8;
  doc.roundedRect(M, ctx.y - 3.5, bw, 6, 3, 3, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...C.white);
  doc.text(badge, M + 4, ctx.y);
  ctx.y += 6;

  // ═══════════════════════════════════════════
  // QUICK-READ CARD
  // ═══════════════════════════════════════════
  pb(ctx, 36);
  ctx.y += 3;
  const qrY = ctx.y;
  const qrH = 32;
  
  doc.setFillColor(...C.bg);
  doc.setDrawColor(...C.border);
  doc.roundedRect(M, qrY, CW, qrH, 2.5, 2.5, 'FD');
  
  // Header
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...C.muted);
  doc.text('LEITURA RÁPIDA', M + 5, qrY + 5.5);
  
  const halfW = (CW - 8) / 2;
  const col1 = M + 5;
  const col2 = M + 5 + halfW + 4;
  const row1 = qrY + 10;
  const row2 = qrY + 21;
  
  // Cell labels
  doc.setFontSize(6);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...C.light);
  doc.text('Padrão principal', col1, row1);
  doc.text('Intensidade', col2, row1);
  doc.text('Ponto de travamento', col1, row2);
  doc.text('Foco de mudança', col2, row2);
  
  // Cell values
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...C.dark);
  const pName = (result as any).interpretation?.behavioralProfile?.name || result.profileName || String(result.dominantPattern || '');
  doc.text(pName.length > 30 ? pName.slice(0, 27) + '…' : pName, col1, row1 + 4.5);
  doc.setTextColor(...intColor);
  doc.text(intLabel, col2, row1 + 4.5);
  doc.setTextColor(...C.dark);
  const bp = (ai.blockingPoint || result.blockingPoint || 'Não identificado');
  doc.text(bp.length > 38 ? bp.slice(0, 35) + '…' : bp, col1, row2 + 4.5);
  const fm = focoMudanca || corrigirPrimeiro || 'Não identificado';
  doc.text((fm as string).length > 38 ? (fm as string).slice(0, 35) + '…' : fm, col2, row2 + 4.5);
  
  ctx.y = qrY + qrH + 6;

  // ═══════════════════════════════════════════
  // SECTION 1: O que mais chama atenção
  // ═══════════════════════════════════════════
  sectionHeader(ctx, 1, 'O que mais chama atenção no seu resultado', C.red);
  alertBox(ctx, chamaAtencao);

  // ── Blind Spot (if available) ──
  if (blindSpot?.realProblem) {
    pb(ctx, 20);
    labelAbove(ctx, 'Ponto Cego', C.muted);
    const { doc: d } = ctx;
    d.setFontSize(8);
    d.setFont('helvetica', 'italic');
    d.setTextColor(...C.muted);
    d.text(`O que você acredita: ${blindSpot.perceivedProblem || ''}`, M + 4, ctx.y);
    ctx.y += 5;
    d.setFontSize(9);
    d.setFont('helvetica', 'normal');
    d.setTextColor(...C.text);
    const bsLines = d.splitTextToSize(`→ ${blindSpot.realProblem}`, CW - 8);
    for (const l of bsLines) { pb(ctx); d.text(l, M + 4, ctx.y); ctx.y += LH; }
    ctx.y += 3;
  }

  // ═══════════════════════════════════════════
  // SECTION 2: O padrão que mais se repete
  // ═══════════════════════════════════════════
  sectionHeader(ctx, 2, 'O padrão que mais se repete em você');
  
  // Profile name highlight
  if (result.interpretation?.behavioralProfile?.name) {
    pb(ctx, 12);
    const profName = result.interpretation.behavioralProfile.name;
    doc.setFillColor(...C.bg);
    doc.setDrawColor(...C.border);
    const pnW = doc.getTextWidth(profName) * 1.1 + 14;
    doc.roundedRect(M + 2, ctx.y - 3.5, Math.min(pnW, CW - 4), 8, 2, 2, 'FD');
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...C.accent);
    doc.text(profName, M + 8, ctx.y + 0.5);
    ctx.y += 8;
  }
  textBlock(ctx, padraoRepetido);

  // ═══════════════════════════════════════════
  // SECTION 3: Como isso aparece na sua rotina
  // ═══════════════════════════════════════════
  sectionHeader(ctx, 3, 'Como isso aparece na sua rotina');
  textBlock(ctx, comoAparece, C.muted);
  
  if (result.selfSabotageCycle?.length > 0) {
    labelAbove(ctx, 'Ciclo de autossabotagem', C.muted);
    result.selfSabotageCycle.forEach((step, i) => {
      bulletItem(ctx, `${i + 1}. ${step}`, C.muted);
    });
  }

  // ═══════════════════════════════════════════
  // SECTION 4: Gatilhos
  // ═══════════════════════════════════════════
  if (gatilhos.length > 0) {
    sectionHeader(ctx, 4, 'O que geralmente dispara esse padrão', C.red);
    gatilhos.forEach((t: string) => bulletItem(ctx, t, C.red, '⚡'));
  }

  // ═══════════════════════════════════════════
  // SECTION 5: Como isso te atrapalha
  // ═══════════════════════════════════════════
  sectionHeader(ctx, 5, 'Como isso te atrapalha');
  if (impactoPorArea.length > 0) {
    renderImpactCards(ctx, impactoPorArea);
  } else {
    textBlock(ctx, comoAtrapalha);
  }

  // ═══════════════════════════════════════════
  // SECTION 6: Direção de ajuste
  // ═══════════════════════════════════════════
  sectionHeader(ctx, 6, 'Direção de ajuste', C.accent);
  labelAbove(ctx, 'O que precisa mudar', C.accent);
  accentBox(ctx, corrigirPrimeiro);

  // ═══════════════════════════════════════════
  // SECTION 7: O que parar de fazer
  // ═══════════════════════════════════════════
  if (pararDeFazer.length > 0) {
    sectionHeader(ctx, 7, 'O que parar de fazer agora', C.red);
    pararDeFazer.forEach((item: string) => bulletItem(ctx, item, C.red, '✗'));
  }

  // ═══════════════════════════════════════════
  // SECTION 8: Próxima ação prática
  // ═══════════════════════════════════════════
  sectionHeader(ctx, 8, 'Próxima ação prática', C.green);
  
  // Mental Command (reprogramming phrase)
  if (mentalCommand) {
    pb(ctx, 18);
    labelAbove(ctx, 'Repita antes de agir', C.accent);
    const mcLines = doc.splitTextToSize(`"${mentalCommand}"`, CW - 14);
    const mcH = mcLines.length * LH + 8;
    doc.setFillColor(...C.accentSoft);
    doc.setDrawColor(...C.accentLight);
    doc.roundedRect(M, ctx.y, CW, mcH, 2.5, 2.5, 'FD');
    ctx.y += 5;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bolditalic');
    doc.setTextColor(...C.accent);
    for (const l of mcLines) { doc.text(l, M + 7, ctx.y); ctx.y += LH; }
    ctx.y += 5;
  }
  
  // Micro-actions (numbered action cards)
  if (microAcoes.length > 0) {
    microAcoes.forEach((item, i) => {
      const lines = doc.splitTextToSize(item.acao, CW - 18);
      const detLines = item.detalhe ? doc.splitTextToSize(item.detalhe, CW - 18) : [];
      const h = (lines.length + detLines.length) * LH + 12;
      pb(ctx, h + 2);
      
      // Card background
      doc.setFillColor(...C.greenSoft);
      doc.setDrawColor(180, 220, 195);
      doc.roundedRect(M, ctx.y, CW, h, 2.5, 2.5, 'FD');
      
      // Number badge
      doc.setFillColor(...C.green);
      doc.roundedRect(M + 4, ctx.y + 4, 6, 6, 1.5, 1.5, 'F');
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...C.white);
      doc.text(String(i + 1), M + 5.8, ctx.y + 8.2);
      
      // Action text
      let ay = ctx.y + 6;
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...C.text);
      for (const l of lines) { doc.text(l, M + 14, ay); ay += LH; }
      
      // Detail text
      if (detLines.length > 0) {
        ay += 1;
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...C.muted);
        for (const l of detLines) { doc.text(l, M + 14, ay); ay += LH; }
      }
      
      ctx.y += h + 3;
    });
    
    // "Regra de ouro" box
    pb(ctx, 14);
    doc.setFillColor(...C.bg);
    doc.roundedRect(M, ctx.y, CW, 12, 2, 2, 'F');
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...C.muted);
    doc.text('REGRA DE OURO', M + 5, ctx.y + 4.5);
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...C.text);
    doc.text('Só comece novas tarefas quando essas estiverem feitas. Sem exceção.', M + 5, ctx.y + 9);
    ctx.y += 15;
  } else {
    // Fallback: single action
    labelAbove(ctx, 'Faça isso agora', C.green);
    greenBox(ctx, acaoInicial);
  }

  // ═══════════════════════════════════════════
  // SECTION 9: Mecanismo Neural
  // ═══════════════════════════════════════════
  if (mecanismoNeural && (mecanismoNeural.neurotransmissor || mecanismoNeural.cicloNeural || mecanismoNeural.neuroplasticidade)) {
    sectionHeader(ctx, 9, 'Mecanismo Neural', C.accent);
    
    if (mecanismoNeural.neurotransmissor) {
      pb(ctx, 14);
      labelAbove(ctx, 'Neurotransmissor envolvido', C.accent);
      accentBox(ctx, mecanismoNeural.neurotransmissor);
    }
    
    if (mecanismoNeural.cicloNeural) {
      pb(ctx, 14);
      labelAbove(ctx, 'Como o circuito se formou', C.muted);
      textBlock(ctx, mecanismoNeural.cicloNeural, C.muted);
    }
    
    if (mecanismoNeural.neuroplasticidade) {
      pb(ctx, 14);
      labelAbove(ctx, 'Neuroplasticidade — a boa notícia', C.green);
      greenBox(ctx, mecanismoNeural.neuroplasticidade);
    }
  }

  // ═══════════════════════════════════════════
  // SECTION 10: Plano de Ação (if available)
  // ═══════════════════════════════════════════
  if (actionPlan.length > 0) {
    sectionHeader(ctx, 10, 'Plano de Ação por Área', C.green);
    
    actionPlan.forEach((plan) => {
      pb(ctx, 16);
      const { doc: d } = ctx;
      
      // Area header with score
      d.setFontSize(9);
      d.setFont('helvetica', 'bold');
      d.setTextColor(...C.accent);
      d.text(plan.area, M + 4, ctx.y);
      
      const scoreLabel = `${plan.score}/10`;
      const scoreColor: RGB = plan.score < 4 ? C.red : plan.score < 7 ? C.yellow : C.green;
      d.setFontSize(8);
      d.setTextColor(...scoreColor);
      d.text(scoreLabel, M + CW - d.getTextWidth(scoreLabel) - 4, ctx.y);
      ctx.y += 5;
      
      // Actions
      plan.actions.forEach((action: string) => {
        bulletItem(ctx, action, C.green, '→');
      });
      ctx.y += 2;
    });
  }

  // ═══════════════════════════════════════════
  // INTENSITY BARS
  // ═══════════════════════════════════════════
  ctx.y += 4;
  pb(ctx, 24);
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...C.muted);
  doc.text('INTENSIDADE POR EIXO', M, ctx.y);
  ctx.y += 5;
  
  // Legend
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'normal');
  doc.setFillColor(...C.green);
  doc.circle(M + 2, ctx.y - 0.8, 1, 'F');
  doc.setTextColor(...C.light);
  doc.text('< 40%', M + 5, ctx.y);
  doc.setFillColor(...C.yellow);
  doc.circle(M + 22, ctx.y - 0.8, 1, 'F');
  doc.text('40-65%', M + 25, ctx.y);
  doc.setFillColor(...C.red);
  doc.circle(M + 48, ctx.y - 0.8, 1, 'F');
  doc.text('> 65%', M + 51, ctx.y);
  ctx.y += 5;

  result.allScores.slice(0, 8).forEach(score => {
    pb(ctx, 11);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...C.text);
    doc.text(score.label, M + 2, ctx.y);
    doc.setFont('helvetica', 'bold');
    const p = `${score.percentage}%`;
    doc.text(p, M + CW - doc.getTextWidth(p), ctx.y);
    const by = ctx.y + 2.5;
    doc.setFillColor(...C.border);
    doc.roundedRect(M + 2, by, CW - 4, 3, 1.5, 1.5, 'F');
    const bc: RGB = score.percentage > 65 ? C.red : score.percentage >= 40 ? C.yellow : C.green;
    doc.setFillColor(...bc);
    const fw = (score.percentage / 100) * (CW - 4);
    if (fw > 0) doc.roundedRect(M + 2, by, Math.max(fw, 2), 3, 1.5, 1.5, 'F');
    ctx.y += 10;
  });

  // ═══════════════════════════════════════════
  // FOOTER
  // ═══════════════════════════════════════════
  pb(ctx, 20);
  ctx.y += 6;
  doc.setDrawColor(...C.border);
  doc.setLineWidth(0.3);
  doc.line(M, ctx.y, M + CW, ctx.y);
  ctx.y += 5;
  doc.setFontSize(7);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(...C.light);
  const disclaimer = 'Este relatório oferece uma leitura comportamental baseada em suas respostas e não substitui avaliação profissional.';
  doc.splitTextToSize(disclaimer, CW).forEach((l: string) => {
    doc.text(l, M, ctx.y);
    ctx.y += 4;
  });

  // Page numbers on all pages
  const totalPages = ctx.pageNum;
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...C.light);
    const pageText = `${i} / ${totalPages}`;
    doc.text(pageText, PW - M - doc.getTextWidth(pageText), PH - 8);
  }

  doc.save(`raio-x-comportamental-${new Date().toISOString().slice(0, 10)}.pdf`);
}
