/**
 * Report Quality Validator
 * 
 * 1. Trims overly long sections
 * 2. Detects semantic repetition between sections
 * 3. Rewrites redundant sections to add unique value
 */

import { DiagnosticResult } from '@/types/diagnostic';

// ── Helpers ──

function trimIfLong(text: string, maxSentences = 4): string {
  if (!text) return text;
  const sentences = text.split(/(?<=[.!?])\s+/).filter(Boolean);
  if (sentences.length <= maxSentences) return text;
  return sentences.slice(0, maxSentences).join(' ');
}

/**
 * Extract meaningful words from a text (ignoring stopwords).
 * Returns a Set for fast comparison.
 */
function extractKeywords(text: string): Set<string> {
  if (!text) return new Set();
  const STOPWORDS = new Set([
    'a', 'o', 'e', 'de', 'do', 'da', 'em', 'um', 'uma', 'que', 'é', 'se',
    'não', 'no', 'na', 'com', 'para', 'por', 'mais', 'mas', 'como', 'ao',
    'os', 'as', 'dos', 'das', 'seu', 'sua', 'isso', 'esse', 'essa', 'este',
    'está', 'são', 'tem', 'ter', 'ser', 'foi', 'você', 'ele', 'ela', 'nos',
    'nas', 'pela', 'pelo', 'entre', 'até', 'mesmo', 'quando', 'muito', 'já',
    'também', 'só', 'ou', 'cada', 'num', 'numa', 'nem', 'sem', 'às', 'aos',
    'the', 'and', 'of', 'to', 'in', 'is', 'it', 'that', 'this', 'was',
  ]);
  const words = text.toLowerCase()
    .replace(/[^\p{L}\s]/gu, '')
    .split(/\s+/)
    .filter(w => w.length > 2 && !STOPWORDS.has(w));
  return new Set(words);
}

/**
 * Calculate overlap ratio between two texts (0-1).
 * 1 = identical keyword sets, 0 = completely different.
 */
function semanticOverlap(textA: string, textB: string): number {
  const a = extractKeywords(textA);
  const b = extractKeywords(textB);
  if (a.size === 0 || b.size === 0) return 0;
  
  let intersection = 0;
  for (const word of a) {
    if (b.has(word)) intersection++;
  }
  
  const smaller = Math.min(a.size, b.size);
  return smaller > 0 ? intersection / smaller : 0;
}

/**
 * Check if two texts are semantically redundant (>60% keyword overlap).
 */
function isRedundant(textA: string, textB: string, threshold = 0.6): boolean {
  if (!textA || !textB) return false;
  return semanticOverlap(textA, textB) >= threshold;
}

// ── Rewriters ──
// Each rewriter takes the redundant text and the "reference" text it overlaps with,
// and produces a differentiated version.

function rewriteCorePain(original: string, criticalDiagnosis: string, dominantLabel: string): string {
  // If corePain repeats the diagnosis, focus on the WHY instead
  if (!isRedundant(original, criticalDiagnosis)) return original;
  const sentences = original.split(/(?<=[.!?])\s+/).filter(Boolean);
  // Keep only sentences not heavily present in the diagnosis
  const unique = sentences.filter(s => !isRedundant(s, criticalDiagnosis, 0.5));
  if (unique.length > 0) return unique.join(' ');
  // Full rewrite: shift focus to mechanism
  return `O que sustenta esse travamento é o padrão de ${dominantLabel.toLowerCase()} operando de forma automática — você não percebe quando ele se ativa, e quando percebe, já agiu no piloto automático.`;
}

function rewriteDirection(original: string, whatNotToDo: string[], dominantLabel: string): string {
  const combined = whatNotToDo.join('. ');
  if (!isRedundant(original, combined)) return original;
  // Shift from "don't do X" to "do Y instead"
  return `A mudança começa por criar um intervalo entre o impulso e a ação. Quando o padrão de ${dominantLabel.toLowerCase()} se ativar, espere 60 segundos antes de reagir — esse intervalo é o espaço onde a escolha consciente acontece.`;
}

function rewriteImpact(original: string, mechanism: string): string {
  if (!isRedundant(original, mechanism)) return original;
  const sentences = original.split(/(?<=[.!?])\s+/).filter(Boolean);
  const unique = sentences.filter(s => !isRedundant(s, mechanism, 0.5));
  if (unique.length > 0) return unique.join(' ');
  return `O custo real aparece nas decisões adiadas, nas oportunidades perdidas e na sensação constante de que poderia estar melhor — mas nunca está.`;
}

function deduplicateLifeImpact(items: { pillar: string; impact: string }[], mechanism: string): { pillar: string; impact: string }[] {
  if (!items || items.length === 0) return items;
  return items.map(item => {
    if (isRedundant(item.impact, mechanism, 0.5)) {
      return { ...item, impact: `Compromete diretamente a área de ${item.pillar.toLowerCase()} pela repetição do padrão.` };
    }
    return item;
  });
}

function deduplicateArray(items: string[]): string[] {
  if (!items || items.length <= 1) return items;
  const result: string[] = [items[0]];
  for (let i = 1; i < items.length; i++) {
    const isDuplicate = result.some(existing => isRedundant(items[i], existing, 0.55));
    if (!isDuplicate) result.push(items[i]);
  }
  return result;
}

function rewriteSummaryIfRedundant(summary: string, criticalDiagnosis: string): string {
  if (!isRedundant(summary, criticalDiagnosis)) return summary;
  // Keep only unique sentences from summary
  const sentences = summary.split(/(?<=[.!?])\s+/).filter(Boolean);
  const unique = sentences.filter(s => !isRedundant(s, criticalDiagnosis, 0.5));
  return unique.length > 0 ? unique.join(' ') : summary;
}

// ── Main Validator ──

export function validateAndRefineReport(result: DiagnosticResult): DiagnosticResult {
  const dominantLabel = result.dominantPattern?.label || '';
  const ai = result as any;

  // 1. Trim overly long sections
  let corePain = trimIfLong(result.corePain, 4);
  let criticalDiagnosis = trimIfLong(result.criticalDiagnosis, 3);
  let direction = trimIfLong(result.direction, 3);
  let summary = trimIfLong(result.summary, 5);
  let impact = result.impact || '';

  // 2. Anti-repetition: check pairs and rewrite if redundant
  corePain = rewriteCorePain(corePain, criticalDiagnosis, dominantLabel);
  direction = rewriteDirection(direction, result.whatNotToDo || [], dominantLabel);
  impact = rewriteImpact(impact, result.mechanism || '');
  summary = rewriteSummaryIfRedundant(summary, criticalDiagnosis);

  // 3. Anti-repetition: corrigirPrimeiro vs acaoInicial
  let corrigirPrimeiro = ai.corrigirPrimeiro || '';
  let acaoInicial = ai.acaoInicial || '';
  if (corrigirPrimeiro && acaoInicial && isRedundant(corrigirPrimeiro, acaoInicial, 0.5)) {
    acaoInicial = `Na próxima vez que o padrão de ${dominantLabel.toLowerCase()} aparecer, pare e espere 60 segundos antes de reagir. Só isso.`;
  }

  // 4. Deduplicate life impact against mechanism
  const lifeImpact = deduplicateLifeImpact(result.lifeImpact || [], result.mechanism || '');

  // 5. Deduplicate within arrays (triggers, traps, etc.)
  const triggers = deduplicateArray(result.triggers || []).slice(0, 5);
  const mentalTraps = deduplicateArray(result.mentalTraps || []).slice(0, 4);
  const whatNotToDo = deduplicateArray(result.whatNotToDo || []).slice(0, 5);

  return {
    ...result,
    corePain,
    criticalDiagnosis,
    direction,
    summary,
    impact,
    lifeImpact,
    triggers,
    mentalTraps,
    exitStrategy: (result.exitStrategy || []).slice(0, 5),
    whatNotToDo,
    ...(corrigirPrimeiro ? { corrigirPrimeiro } : {}),
    ...(acaoInicial ? { acaoInicial } : {}),
  } as DiagnosticResult;
}
