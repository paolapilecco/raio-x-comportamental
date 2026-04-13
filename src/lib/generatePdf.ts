import jsPDF from 'jspdf';
import { DiagnosticResult } from '@/types/diagnostic';

export interface PdfEvolutionData {
  futureConsequence?: string;
  evolutionComparison?: {
    previous_score?: number;
    current_score?: number;
    improved_axes?: { key: string; label: string; previous: number; current: number }[];
    worsened_axes?: { key: string; label: string; previous: number; current: number }[];
    unchanged_axes?: { key: string; label: string; previous: number; current: number }[];
    summary_text?: string;
  };
  evolutionSummary?: string;
  actionPlanStatus?: {
    total_days: number;
    completed_days: number;
    execution_rate: number;
    current_streak: number;
  };
  actionTexts?: string[];
}

// ── Layout constants ──
const M = 24;
const PW = 210;
const PH = 297;
const CW = PW - M * 2;
const LH = 5.8;

// ── Color palette ──
const C = {
  dark:       [28, 32, 36]   as const,
  accent:     [31, 61, 58]   as const,
  accentSoft: [240, 245, 244] as const,
  accentLight:[100, 140, 135] as const,
  gold:       [198, 169, 105] as const,
  goldSoft:   [252, 248, 240] as const,
  red:        [170, 60, 60]  as const,
  redSoft:    [252, 242, 242] as const,
  yellow:     [175, 140, 40] as const,
  green:      [50, 130, 80]  as const,
  greenSoft:  [238, 248, 242] as const,
  text:       [40, 44, 48]   as const,
  muted:      [120, 125, 130] as const,
  light:      [165, 168, 172] as const,
  border:     [218, 220, 224] as const,
  bg:         [248, 248, 250] as const,
  cardBg:     [252, 252, 254] as const,
  white:      [255, 255, 255] as const,
};

type RGB = readonly [number, number, number];

interface Ctx { doc: jsPDF; y: number; pageNum: number; }

function pb(ctx: Ctx, need = 14) {
  if (ctx.y + need > PH - M - 10) {
    ctx.doc.addPage();
    ctx.pageNum++;
    ctx.y = M + 6;
  }
}

// ── Primitives — NO numbering ──

function sectionTitle(ctx: Ctx, title: string, accentColor: RGB = C.accent) {
  pb(ctx, 22);
  ctx.y += 12;
  const { doc } = ctx;
  doc.setFillColor(...accentColor);
  doc.roundedRect(M, ctx.y - 4, 2, 10, 1, 1, 'F');
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...C.dark);
  doc.text(title, M + 8, ctx.y + 1.5);
  ctx.y += 14;
}

function safe(v: any): string {
  if (v == null || v === undefined || v === 'undefined') return '';
  const s = String(v).trim();
  return s === 'undefined' ? '' : s;
}

function textBlock(ctx: Ctx, t: string, color: RGB = C.text, indent = 0) {
  if (!safe(t)) return;
  const { doc } = ctx;
  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...color);
  const lines = doc.splitTextToSize(t, CW - indent);
  for (const l of lines) {
    pb(ctx, LH + 1);
    doc.text(l, M + indent, ctx.y);
    ctx.y += LH;
  }
  ctx.y += 3;
}

function bulletItem(ctx: Ctx, t: string, dotColor: RGB = C.accent, icon?: string) {
  const { doc } = ctx;
  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...C.text);
  const lines = doc.splitTextToSize(t, CW - 12);
  pb(ctx, lines.length * LH + 2);
  
  if (icon) {
    doc.setFontSize(8);
    doc.setTextColor(...dotColor);
    doc.text(icon, M + 2, ctx.y);
  } else {
    doc.setFillColor(...dotColor);
    doc.circle(M + 3, ctx.y - 1.2, 0.8, 'F');
  }
  
  doc.setFontSize(9.5);
  doc.setTextColor(...C.text);
  for (const l of lines) {
    doc.text(l, M + 10, ctx.y);
    ctx.y += LH;
  }
  ctx.y += 2;
}

function alertBox(ctx: Ctx, t: string, borderColor: RGB = C.red, bgColor: RGB = C.redSoft) {
  if (!safe(t)) return;
  const { doc } = ctx;
  doc.setFontSize(9.5);
  const lines = doc.splitTextToSize(t, CW - 18);
  const h = lines.length * LH + 12;
  pb(ctx, h + 2);
  doc.setFillColor(...bgColor);
  doc.roundedRect(M, ctx.y, CW, h, 3, 3, 'F');
  doc.setFillColor(...borderColor);
  doc.roundedRect(M, ctx.y, 2.5, h, 1, 1, 'F');
  ctx.y += 7;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...C.text);
  for (const l of lines) {
    doc.text(l, M + 10, ctx.y);
    ctx.y += LH;
  }
  ctx.y += 7;
}

function accentBox(ctx: Ctx, t: string, borderColor: RGB = C.accent, bgColor: RGB = C.accentSoft) {
  if (!safe(t)) return;
  const { doc } = ctx;
  doc.setFontSize(9.5);
  const lines = doc.splitTextToSize(t, CW - 18);
  const h = lines.length * LH + 12;
  pb(ctx, h + 2);
  doc.setFillColor(...bgColor);
  doc.roundedRect(M, ctx.y, CW, h, 3, 3, 'F');
  doc.setFillColor(...borderColor);
  doc.roundedRect(M, ctx.y, 2.5, h, 1, 1, 'F');
  ctx.y += 7;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...C.text);
  for (const l of lines) {
    doc.text(l, M + 10, ctx.y);
    ctx.y += LH;
  }
  ctx.y += 7;
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
  ctx.y += 5;
}

function renderImpactCards(ctx: Ctx, items: { area: string; efeito: string }[]) {
  const validItems = items.filter(i => safe(i.area) && safe(i.efeito));
  if (validItems.length === 0) return;
  for (let i = 0; i < validItems.length; i += 2) {
    const left = validItems[i];
    const right = validItems[i + 1];
    const colW = (CW - 6) / 2;
    const { doc } = ctx;
    doc.setFontSize(9.5);
    const leftLines = doc.splitTextToSize(safe(left.efeito), colW - 12);
    const rightLines = right ? doc.splitTextToSize(safe(right.efeito), colW - 12) : [];
    const maxH = Math.max(leftLines.length, rightLines.length) * LH + 14;
    pb(ctx, maxH + 2);
    doc.setFillColor(...C.cardBg);
    doc.setDrawColor(...C.border);
    doc.roundedRect(M, ctx.y, colW, maxH, 3, 3, 'FD');
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...C.accent);
    doc.text(left.area.toUpperCase(), M + 6, ctx.y + 6);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...C.text);
    let ly = ctx.y + 10;
    for (const l of leftLines) { doc.text(l, M + 6, ly); ly += LH; }
    if (right) {
      const rx = M + colW + 6;
      doc.setFillColor(...C.cardBg);
      doc.setDrawColor(...C.border);
      doc.roundedRect(rx, ctx.y, colW, maxH, 3, 3, 'FD');
      doc.setFontSize(6.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...C.accent);
      doc.text(right.area.toUpperCase(), rx + 6, ctx.y + 6);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...C.text);
      let ry = ctx.y + 10;
      for (const l of rightLines) { doc.text(l, rx + 6, ry); ry += LH; }
    }
    ctx.y += maxH + 4;
  }
}

// ── Main export ──

export function generateDiagnosticPdf(result: DiagnosticResult, userName?: string, extras?: PdfEvolutionData) {
  const doc = new jsPDF('p', 'mm', 'a4');
  const ctx: Ctx = { doc, y: M, pageNum: 1 };

  const ai = result as any;
  
  // ── Resolve all fields ──
  const profileName = safe(ai.interpretation?.behavioralProfile?.name) || safe(result.profileName) || safe(result.dominantPattern) || '';
  const chamaAtencao = safe(ai.chamaAtencao) || safe(ai.resumoPrincipal) || safe(result.criticalDiagnosis);
  const padraoRepetido = safe(ai.padraoRepetido) || safe(ai.padraoIdentificado) || safe(result.mechanism);
  const comoAparece = safe(ai.comoAparece) || safe(result.mentalState);
  const gatilhos: string[] = (ai.gatilhos || result.triggers || []).filter((t: any) => safe(t));
  const comoAtrapalha = safe(ai.comoAtrapalha) || safe(ai.significadoPratico) || safe(result.corePain);
  const impactoPorArea: { area: string; efeito: string }[] = ai.impactoPorArea || ai.impactoVida?.map((l: any) => ({ area: safe(l.area) || safe(l.pillar), efeito: safe(l.efeito) || safe(l.impact) })) || result.lifeImpact?.map((l: any) => ({ area: safe(l.pillar), efeito: safe(l.impact) })) || [];
  const corrigirPrimeiro = safe(ai.corrigirPrimeiro) || safe(ai.direcaoAjuste) || safe(result.keyUnlockArea);
  const pararDeFazer: string[] = (ai.pararDeFazer || ai.oQueEvitar || result.whatNotToDo || []).filter((t: any) => safe(t));
  const acaoInicial = safe(ai.acaoInicial) || safe(ai.proximoPasso) || safe(result.exitStrategy?.[0]?.action) || safe(result.direction);
  const mentalCommand: string = safe(ai.mentalCommand);
  const blindSpot = result.interpretation?.blindSpot;
  const mecanismoNeural = ai.mecanismoNeural as { neurotransmissor?: string; cicloNeural?: string; neuroplasticidade?: string } | undefined;
  const actionPlan: { area: string; score: number; actions: string[] }[] = Array.isArray(ai.actionPlan) ? ai.actionPlan : [];
  const focoMudanca = ai.focoMudanca || result.keyUnlockArea || '';
  const blockingPoint = safe(ai.blockingPoint) || safe(result.blockingPoint);
  const dominantAxisLabel = result.allScores?.[0]?.label || result.allScores?.[0]?.key || '';

  // ═══════════════════════════════════════════
  // COVER
  // ═══════════════════════════════════════════
  
  doc.setFillColor(...C.dark);
  doc.rect(0, 0, PW, 52, 'F');
  doc.setFillColor(...C.gold);
  doc.rect(0, 52, PW, 1.5, 'F');
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...C.white);
  doc.text('Raio-X Mental', M, 24);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(180, 182, 188);
  doc.text('Leitura Comportamental Completa', M, 34);
  if (userName) {
    doc.setFontSize(8);
    doc.setTextColor(150, 155, 160);
    doc.text(userName, M, 44);
  }
  const date = new Date().toLocaleDateString('pt-BR');
  doc.setFontSize(8);
  doc.setTextColor(...C.light);
  doc.text(date, PW - M - doc.getTextWidth(date), 44);

  ctx.y = 62;

  // ── Combined Title + Intensity ──
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...C.dark);
  const titleLines = doc.splitTextToSize(result.combinedTitle, CW);
  for (const l of titleLines) { doc.text(l, M, ctx.y); ctx.y += 7.5; }
  ctx.y += 4;
  
  const intLabel = result.intensity === 'alto' ? 'Alta' : result.intensity === 'moderado' ? 'Moderada' : 'Leve';
  const intColor: RGB = result.intensity === 'alto' ? C.red : result.intensity === 'moderado' ? C.yellow : C.green;
  doc.setFillColor(...intColor);
  const badge = `Intensidade ${intLabel}`;
  doc.setFontSize(7.5);
  const bw = doc.getTextWidth(badge) + 10;
  doc.roundedRect(M, ctx.y - 3.5, bw, 6.5, 3, 3, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...C.white);
  doc.text(badge, M + 5, ctx.y + 0.5);
  ctx.y += 8;

  // ═══════════════════════════════════════════
  // EDITORIAL OPENING — replaces mechanical SINTESE grid
  // ═══════════════════════════════════════════
  pb(ctx, 40);
  ctx.y += 6;

  // Profile identity — accent bar + name
  if (profileName) {
    doc.setFillColor(...C.accent);
    doc.roundedRect(M, ctx.y - 3, 2.5, 10, 1, 1, 'F');
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...C.muted);
    doc.text('PADRAO IDENTIFICADO', M + 8, ctx.y - 1);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...C.dark);
    const pnLines = doc.splitTextToSize(profileName, CW - 12);
    pnLines.slice(0, 2).forEach((l: string, i: number) => doc.text(l, M + 8, ctx.y + 5 + i * 5));
    ctx.y += 5 + pnLines.length * 5 + 4;
  }

  // Blocking point + focus — editorial prose
  const openingY = ctx.y;
  const openingData: { label: string; text: string }[] = [];
  if (blockingPoint) openingData.push({ label: 'O QUE TRAVA VOCE', text: blockingPoint });
  if (focoMudanca) openingData.push({ label: 'ONDE CONCENTRAR ENERGIA', text: focoMudanca });

  if (openingData.length > 0) {
    // Soft card background
    const estimatedH = openingData.length * 22 + 8;
    doc.setFillColor(...C.bg);
    doc.setDrawColor(...C.border);
    doc.roundedRect(M, ctx.y, CW, estimatedH, 3, 3, 'FD');
    ctx.y += 6;

    for (const item of openingData) {
      doc.setFontSize(6.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...C.muted);
      doc.text(item.label, M + 6, ctx.y);
      ctx.y += 4;
      doc.setFontSize(9.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...C.text);
      const lines = doc.splitTextToSize(item.text, CW - 12);
      for (const l of lines) { doc.text(l, M + 6, ctx.y); ctx.y += LH; }
      ctx.y += 4;
    }
    ctx.y += 2;
  }

  ctx.y += 4;

  // ═══════════════════════════════════════════
  // SECTIONS
  // ═══════════════════════════════════════════
  
  sectionTitle(ctx, 'O que seu resultado revela', C.red);
  alertBox(ctx, chamaAtencao);

  if (blindSpot?.realProblem) {
    pb(ctx, 20);
    labelAbove(ctx, 'Ponto cego', C.muted);
    const { doc: d } = ctx;
    d.setFontSize(8);
    d.setFont('helvetica', 'italic');
    d.setTextColor(...C.muted);
    d.text(`O que voce acredita: ${blindSpot.perceivedProblem || ''}`, M + 4, ctx.y);
    ctx.y += 5;
    d.setFontSize(9.5);
    d.setFont('helvetica', 'normal');
    d.setTextColor(...C.text);
    const bsLines = d.splitTextToSize(`→ ${blindSpot.realProblem}`, CW - 8);
    for (const l of bsLines) { pb(ctx); d.text(l, M + 4, ctx.y); ctx.y += LH; }
    ctx.y += 3;
  }

  sectionTitle(ctx, 'O padrao que te define');
  if (result.interpretation?.behavioralProfile?.name) {
    pb(ctx, 12);
    doc.setFillColor(...C.accent);
    doc.roundedRect(M + 2, ctx.y - 4, 2, 9, 1, 1, 'F');
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...C.accent);
    doc.text(result.interpretation.behavioralProfile.name, M + 8, ctx.y + 0.5);
    ctx.y += 9;
  }
  textBlock(ctx, padraoRepetido);

  sectionTitle(ctx, 'Como isso vive em voce');
  textBlock(ctx, comoAparece, C.muted);
  
  if (result.selfSabotageCycle?.length > 0) {
    labelAbove(ctx, 'Ciclo de autossabotagem', C.muted);
    result.selfSabotageCycle.forEach((step) => {
      bulletItem(ctx, step, C.muted);
    });
  }

  if (gatilhos.length > 0) {
    sectionTitle(ctx, 'O que ativa esse ciclo', C.red);
    gatilhos.forEach((t: string) => bulletItem(ctx, t, C.red, '·'));
  }

  sectionTitle(ctx, 'O custo real desse padrao');
  if (impactoPorArea.length > 0) {
    renderImpactCards(ctx, impactoPorArea);
  } else {
    textBlock(ctx, comoAtrapalha);
  }

  const fc = extras?.futureConsequence || (ai as any).futureConsequence;
  if (fc) {
    sectionTitle(ctx, 'Se nada mudar', C.red);
    alertBox(ctx, fc);
  }

  const evo = extras?.evolutionComparison || (ai as any).evolutionComparison;
  if (evo && (evo.previous_score != null || evo.improved_axes?.length || evo.worsened_axes?.length)) {
    sectionTitle(ctx, 'Comparacao com diagnostico anterior', C.accent);

    if (evo.previous_score != null && evo.current_score != null) {
      pb(ctx, 28);
      const { doc: d } = ctx;
      const barW = (CW - 10) / 2;
      d.setFontSize(7);
      d.setFont('helvetica', 'bold');
      d.setTextColor(...C.muted);
      d.text('ANTERIOR', M + 4, ctx.y);
      d.setFontSize(14);
      d.setTextColor(...C.light);
      d.text(`${evo.previous_score}%`, M + 4, ctx.y + 8);
      d.setFontSize(7);
      d.setFont('helvetica', 'bold');
      d.setTextColor(...C.muted);
      d.text('ATUAL', M + 4 + barW + 6, ctx.y);
      const curColor: RGB = evo.current_score < evo.previous_score ? C.green : evo.current_score > evo.previous_score ? C.red : C.yellow;
      d.setFontSize(14);
      d.setTextColor(...curColor);
      d.text(`${evo.current_score}%`, M + 4 + barW + 6, ctx.y + 8);
      const delta = evo.current_score - evo.previous_score;
      const deltaStr = delta > 0 ? `+${delta}%` : `${delta}%`;
      d.setFontSize(9);
      d.setFont('helvetica', 'bold');
      d.setTextColor(...curColor);
      d.text(deltaStr, M + CW - d.getTextWidth(deltaStr) - 4, ctx.y + 8);
      ctx.y += 16;
    }

    if (evo.improved_axes?.length > 0) {
      labelAbove(ctx, 'Eixos que melhoraram', C.green);
      evo.improved_axes.forEach((a: any) => {
        bulletItem(ctx, `${a.label}: ${a.previous}% → ${a.current}%`, C.green, '↓');
      });
    }

    if (evo.worsened_axes?.length > 0) {
      labelAbove(ctx, 'Eixos que pioraram', C.red);
      evo.worsened_axes.forEach((a: any) => {
        bulletItem(ctx, `${a.label}: ${a.previous}% → ${a.current}%`, C.red, '↑');
      });
    }

    const evoSummary = extras?.evolutionSummary || evo.summary_text;
    if (evoSummary) {
      pb(ctx, 14);
      labelAbove(ctx, 'Resumo da evolucao', C.accent);
      accentBox(ctx, evoSummary);
    }
  }

  // ── Direction ──
  sectionTitle(ctx, 'A mudanca que importa', C.accent);
  accentBox(ctx, corrigirPrimeiro);

  // ── What to stop ──
  if (pararDeFazer.length > 0) {
    sectionTitle(ctx, 'O que abandonar agora', C.red);
    pararDeFazer.forEach((item: string) => bulletItem(ctx, item, C.red, '✗'));
  }

  // ── Actions — NO number badges ──
  sectionTitle(ctx, 'Seu proximo passo', C.green);
  
  if (mentalCommand) {
    pb(ctx, 18);
    labelAbove(ctx, 'Repita antes de agir', C.accent);
    const mcLines = doc.splitTextToSize(`"${mentalCommand}"`, CW - 16);
    const mcH = mcLines.length * LH + 10;
    doc.setFillColor(...C.accentSoft);
    doc.roundedRect(M, ctx.y, CW, mcH, 3, 3, 'F');
    ctx.y += 6;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bolditalic');
    doc.setTextColor(...C.accent);
    for (const l of mcLines) { doc.text(l, M + 8, ctx.y); ctx.y += LH; }
    ctx.y += 6;
  }

  // Diagnostic-action connection in PDF
  if (profileName || dominantAxisLabel) {
    pb(ctx, 16);
    const connectionText = `Acoes desenhadas com base no padrao "${profileName}"${dominantAxisLabel ? ` e no eixo "${dominantAxisLabel}"` : ''}.`;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(...C.muted);
    const connLines = doc.splitTextToSize(connectionText, CW - 8);
    for (const l of connLines) { doc.text(l, M + 4, ctx.y); ctx.y += 4.5; }
    ctx.y += 3;
  }

  const persistedActions = extras?.actionTexts || [];
  
  if (persistedActions.length > 0) {
    persistedActions.forEach((actionText) => {
      const lines = doc.splitTextToSize(actionText, CW - 16);
      const h = lines.length * LH + 12;
      pb(ctx, h + 2);
      
      doc.setFillColor(...C.greenSoft);
      doc.roundedRect(M, ctx.y, CW, h, 3, 3, 'F');
      
      // Accent dot instead of number badge
      doc.setFillColor(...C.green);
      doc.circle(M + 8, ctx.y + h / 2, 1.5, 'F');
      
      let ay = ctx.y + 7;
      doc.setFontSize(9.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...C.text);
      for (const l of lines) { doc.text(l, M + 14, ay); ay += LH; }
      
      ctx.y += h + 4;
    });
  } else if (acaoInicial) {
    greenBox(ctx, acaoInicial);
  }

  // ── Neural Mechanism ──
  if (mecanismoNeural && (mecanismoNeural.neurotransmissor || mecanismoNeural.cicloNeural || mecanismoNeural.neuroplasticidade)) {
    sectionTitle(ctx, 'Mecanismo neural', C.accent);
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
      labelAbove(ctx, 'Neuroplasticidade', C.green);
      greenBox(ctx, mecanismoNeural.neuroplasticidade);
    }
  }

  // ── Action Plan by area ──
  if (actionPlan.length > 0) {
    sectionTitle(ctx, 'Plano de acao por area', C.green);
    actionPlan.forEach((plan) => {
      pb(ctx, 16);
      const { doc: d } = ctx;
      d.setFontSize(9.5);
      d.setFont('helvetica', 'bold');
      d.setTextColor(...C.accent);
      d.text(plan.area, M + 4, ctx.y);
      const scoreLabel = `${plan.score}/10`;
      const scoreColor: RGB = plan.score < 4 ? C.red : plan.score < 7 ? C.yellow : C.green;
      d.setFontSize(8);
      d.setTextColor(...scoreColor);
      d.text(scoreLabel, M + CW - d.getTextWidth(scoreLabel) - 4, ctx.y);
      ctx.y += 6;
      plan.actions.forEach((action: string) => {
        bulletItem(ctx, action, C.green, '→');
      });
      ctx.y += 2;
    });
  }

  // ── Action Plan Status ──
  const aps = extras?.actionPlanStatus;
  if (aps && aps.total_days > 0) {
    sectionTitle(ctx, 'Status de execucao', C.accent);
    pb(ctx, 30);
    const { doc: d } = ctx;
    const cardH = 28;
    d.setFillColor(...C.bg);
    d.setDrawColor(...C.border);
    d.roundedRect(M, ctx.y, CW, cardH, 3, 3, 'FD');
    const colW = CW / 4;
    const metrics = [
      { label: 'TOTAL', value: `${aps.total_days} dias` },
      { label: 'CONCLUIDOS', value: `${aps.completed_days} dias` },
      { label: 'EXECUCAO', value: `${aps.execution_rate}%` },
      { label: 'SEQUENCIA', value: `${aps.current_streak} dias` },
    ];
    metrics.forEach((m, i) => {
      const x = M + colW * i + 5;
      d.setFontSize(6.5);
      d.setFont('helvetica', 'bold');
      d.setTextColor(...C.muted);
      d.text(m.label, x, ctx.y + 8);
      d.setFontSize(11);
      d.setFont('helvetica', 'bold');
      const vColor: RGB = i === 2
        ? (aps.execution_rate >= 70 ? C.green : aps.execution_rate >= 40 ? C.yellow : C.red)
        : C.dark;
      d.setTextColor(...vColor);
      d.text(m.value, x, ctx.y + 17);
    });
    const barY = ctx.y + cardH - 5;
    d.setFillColor(...C.border);
    d.roundedRect(M + 5, barY, CW - 10, 3, 1.5, 1.5, 'F');
    const pctColor: RGB = aps.execution_rate >= 70 ? C.green : aps.execution_rate >= 40 ? C.yellow : C.red;
    d.setFillColor(...pctColor);
    const fw = (aps.execution_rate / 100) * (CW - 10);
    if (fw > 0) d.roundedRect(M + 5, barY, Math.max(fw, 2), 3, 1.5, 1.5, 'F');
    ctx.y += cardH + 8;
  }

  // ═══════════════════════════════════════════
  // INTENSITY BARS
  // ═══════════════════════════════════════════
  ctx.y += 6;
  pb(ctx, 24);
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...C.muted);
  doc.text('INTENSIDADE POR EIXO', M, ctx.y);
  ctx.y += 6;
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'normal');
  doc.setFillColor(...C.green);
  doc.circle(M + 2, ctx.y - 0.8, 0.8, 'F');
  doc.setTextColor(...C.light);
  doc.text('< 40%', M + 5, ctx.y);
  doc.setFillColor(...C.yellow);
  doc.circle(M + 22, ctx.y - 0.8, 0.8, 'F');
  doc.text('40-65%', M + 25, ctx.y);
  doc.setFillColor(...C.red);
  doc.circle(M + 48, ctx.y - 0.8, 0.8, 'F');
  doc.text('> 65%', M + 51, ctx.y);
  ctx.y += 6;

  result.allScores.slice(0, 8).forEach(score => {
    pb(ctx, 12);
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...C.text);
    doc.text(score.label, M + 2, ctx.y);
    doc.setFont('helvetica', 'bold');
    const p = `${score.percentage}%`;
    doc.text(p, M + CW - doc.getTextWidth(p), ctx.y);
    const by = ctx.y + 3;
    doc.setFillColor(...C.border);
    doc.roundedRect(M + 2, by, CW - 4, 2.5, 1.2, 1.2, 'F');
    const bc: RGB = score.percentage > 65 ? C.red : score.percentage >= 40 ? C.yellow : C.green;
    doc.setFillColor(...bc);
    const barWidth = (score.percentage / 100) * (CW - 4);
    if (barWidth > 0) doc.roundedRect(M + 2, by, Math.max(barWidth, 2), 2.5, 1.2, 1.2, 'F');
    ctx.y += 11;
  });

  // ═══════════════════════════════════════════
  // FOOTER
  // ═══════════════════════════════════════════
  pb(ctx, 22);
  ctx.y += 8;
  doc.setDrawColor(...C.border);
  doc.setLineWidth(0.2);
  doc.line(M, ctx.y, M + CW, ctx.y);
  ctx.y += 6;
  doc.setFontSize(7);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(...C.light);
  const disclaimer = 'Esta leitura comportamental e baseada em suas respostas e nao substitui avaliacao profissional.';
  doc.splitTextToSize(disclaimer, CW).forEach((l: string) => {
    doc.text(l, M, ctx.y);
    ctx.y += 4;
  });

  const totalPages = ctx.pageNum;
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...C.light);
    const pageText = `${i} / ${totalPages}`;
    doc.text(pageText, PW - M - doc.getTextWidth(pageText), PH - 8);
  }

  doc.save(`raio-x-mental-${new Date().toISOString().slice(0, 10)}.pdf`);
}
