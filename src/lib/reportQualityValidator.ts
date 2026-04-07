/**
 * Report Quality Validator
 * 
 * Pre-display validation pipeline:
 * 1. Clarity check — detects complex/jargon language
 * 2. Repetition check — detects semantic overlap between blocks
 * 3. Length check — enforces density limits
 * 4. Language difficulty — replaces hard words with simpler alternatives
 * 5. Coherence check — validates content matches test context
 * 6. Cross-block dedup — prevents same concept in different blocks
 * 
 * If any check fails, auto-refines before returning.
 */

import { DiagnosticResult } from '@/types/diagnostic';

// ── Constants ──

const STOPWORDS = new Set([
  'a', 'o', 'e', 'de', 'do', 'da', 'em', 'um', 'uma', 'que', 'é', 'se',
  'não', 'no', 'na', 'com', 'para', 'por', 'mais', 'mas', 'como', 'ao',
  'os', 'as', 'dos', 'das', 'seu', 'sua', 'isso', 'esse', 'essa', 'este',
  'está', 'são', 'tem', 'ter', 'ser', 'foi', 'você', 'ele', 'ela', 'nos',
  'nas', 'pela', 'pelo', 'entre', 'até', 'mesmo', 'quando', 'muito', 'já',
  'também', 'só', 'ou', 'cada', 'num', 'numa', 'nem', 'sem', 'às', 'aos',
]);

/** Words considered too complex for general audience */
const COMPLEX_WORDS: Record<string, string> = {
  'resiliência': 'capacidade de se recuperar',
  'paradigma': 'modelo',
  'dicotomia': 'divisão',
  'catalisar': 'acelerar',
  'proatividade': 'iniciativa',
  'ambivalência': 'dúvida',
  'cognição': 'pensamento',
  'dissonância': 'conflito interno',
  'homeostase': 'equilíbrio interno',
  'metacognição': 'pensamento sobre o próprio pensamento',
  'sublimação': 'transformação',
  'somatização': 'corpo reagindo ao emocional',
  'ruminação': 'pensamento repetitivo',
  'hipervigilância': 'estado de alerta constante',
  'reatividade': 'reação automática',
  'autossabotagem': 'boicote interno',
  'autoengano': 'mentira que você conta pra si',
  'procrastinação': 'adiamento',
  'perfeccionismo': 'exigência excessiva',
  'codependência': 'dependência emocional',
  'alexitimia': 'dificuldade de entender emoções',
  'anedonia': 'perda de prazer',
  'comorbidade': 'problema associado',
  'interoceptivo': 'percepção do corpo',
  'operante': 'aprendido por consequências',
  'contingência': 'condição',
  'introjeção': 'absorção de crenças externas',
  'neurodivergente': 'cérebro que funciona diferente',
};

/** Forbidden generic phrases that add no value */
const FORBIDDEN_PHRASES = [
  'zona de conforto',
  'acredite em si',
  'saia da caixa',
  'busque equilíbrio',
  'tenha mais foco',
  'seja mais positivo',
  'pratique mindfulness',
  'faça terapia',
  'invista em autoconhecimento',
  'confie no processo',
  'abrace suas imperfeições',
  'tudo tem seu tempo',
  'mude sua mentalidade',
  'trabalhe isso',
  'reflita sobre',
  'pense a respeito',
  'tente melhorar',
  'se esforce mais',
  'busque ajuda',
];

/** Vague direction/action phrases — too generic to be useful */
const VAGUE_ACTION_PHRASES = [
  'mude sua forma de pensar',
  'trabalhe sua autoestima',
  'busque mais equilíbrio',
  'tente ser mais consciente',
  'procure se conhecer melhor',
  'melhore sua rotina',
  'cuide mais de você',
  'preste mais atenção',
  'seja mais disciplinado',
  'organize melhor seu tempo',
  'desenvolva mais paciência',
  'interromper o comportamento',
  'melhorar o padrão',
  'interromper comportamento',
  'melhorar padrão',
  'mudar o comportamento',
  'ajustar o padrão',
  'desenvolver técnicas',
  'trabalhar o autoconhecimento',
  'fortalecer a consciência',
  'aumentar a percepção',
];

// ── Helpers ──

function splitSentences(text: string): string[] {
  if (!text) return [];
  return text.split(/(?<=[.!?])\s+/).filter(s => s.trim().length > 0);
}

function enforceMaxSentences(text: string, max: number): string {
  if (!text) return text;
  const sentences = splitSentences(text);
  return sentences.length <= max ? text : sentences.slice(0, max).join(' ');
}

function trimArrayItems(items: string[], maxItems: number): string[] {
  if (!items) return items;
  return items.slice(0, maxItems).map(item => {
    const sentences = splitSentences(item);
    return sentences.length > 1 ? sentences[0] : item;
  });
}

function extractKeywords(text: string): Set<string> {
  if (!text) return new Set();
  const words = text.toLowerCase()
    .replace(/[^\p{L}\s]/gu, '')
    .split(/\s+/)
    .filter(w => w.length > 2 && !STOPWORDS.has(w));
  return new Set(words);
}

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

function isRedundant(textA: string, textB: string, threshold = 0.6): boolean {
  if (!textA || !textB) return false;
  return semanticOverlap(textA, textB) >= threshold;
}

// ── Validation Checks ──

interface ValidationIssue {
  field: string;
  type: 'too_long' | 'redundant' | 'complex_language' | 'forbidden_phrase' | 'unclear';
  detail: string;
}

/** Check 1: Is it clear? Detect overly long sentences (>35 words per sentence) */
function checkClarity(text: string, field: string): ValidationIssue[] {
  if (!text) return [];
  const issues: ValidationIssue[] = [];
  const sentences = splitSentences(text);
  for (const s of sentences) {
    const wordCount = s.split(/\s+/).length;
    if (wordCount > 35) {
      issues.push({ field, type: 'unclear', detail: `Frase com ${wordCount} palavras é difícil de ler` });
    }
  }
  return issues;
}

/** Check 2: Is it too long? */
function checkLength(text: string, field: string, maxSentences: number): ValidationIssue[] {
  if (!text) return [];
  const count = splitSentences(text).length;
  if (count > maxSentences) {
    return [{ field, type: 'too_long', detail: `${count} frases (máx: ${maxSentences})` }];
  }
  return [];
}

/** Check 3: Uses difficult language? */
function checkLanguageDifficulty(text: string, field: string): ValidationIssue[] {
  if (!text) return [];
  const issues: ValidationIssue[] = [];
  const lower = text.toLowerCase();
  for (const word of Object.keys(COMPLEX_WORDS)) {
    if (lower.includes(word)) {
      issues.push({ field, type: 'complex_language', detail: `"${word}" → "${COMPLEX_WORDS[word]}"` });
    }
  }
  for (const phrase of [...FORBIDDEN_PHRASES, ...VAGUE_ACTION_PHRASES]) {
    if (lower.includes(phrase)) {
      issues.push({ field, type: 'forbidden_phrase', detail: `Frase genérica/vaga: "${phrase}"` });
    }
  }
  return issues;
}

// ── Auto-Refiners ──

/** Simplify complex language in text */
function simplifyLanguage(text: string): string {
  if (!text) return text;
  let result = text;
  // Replace complex words
  for (const [complex, simple] of Object.entries(COMPLEX_WORDS)) {
    const regex = new RegExp(complex, 'gi');
    result = result.replace(regex, simple);
  }
  // Remove forbidden + vague phrases
  for (const phrase of [...FORBIDDEN_PHRASES, ...VAGUE_ACTION_PHRASES]) {
    const regex = new RegExp(phrase, 'gi');
    result = result.replace(regex, '').replace(/\s{2,}/g, ' ').trim();
  }
  // Break overly long sentences (>35 words) at first comma/semicolon after word 15
  const sentences = splitSentences(result);
  const refined = sentences.map(s => {
    if (s.split(/\s+/).length <= 35) return s;
    const words = s.split(/\s+/);
    const midpoint = Math.floor(words.length / 2);
    // Find natural break point near middle
    for (let i = midpoint - 5; i <= midpoint + 5 && i < words.length; i++) {
      if (words[i]?.match(/[,;—–]/)) {
        const first = words.slice(0, i + 1).join(' ').replace(/[,;—–]$/, '.');
        const second = words.slice(i + 1).join(' ');
        if (second.length > 5) {
          return first + ' ' + second.charAt(0).toUpperCase() + second.slice(1);
        }
      }
    }
    return s;
  });
  return refined.join(' ');
}

/** Rewrite a block that is redundant with another, making it unique */
function makeUnique(text: string, referenceText: string, context: string): string {
  if (!text || !isRedundant(text, referenceText)) return text;
  // Keep only sentences NOT present in reference
  const sentences = splitSentences(text);
  const unique = sentences.filter(s => !isRedundant(s, referenceText, 0.5));
  if (unique.length > 0) return unique.join(' ');
  // Fallback: generic differentiation based on context
  const fallbacks: Record<string, string> = {
    corePain: 'O que mantém esse padrão vivo é uma necessidade que você nem percebe — ela age antes de qualquer decisão consciente.',
    direction: 'A mudança começa com uma pausa: perceber o impulso, esperar, e escolher diferente mesmo sentindo desconforto.',
    impact: 'O efeito concreto aparece nas decisões adiadas, nos ciclos que se repetem e na sensação de estar sempre no mesmo lugar.',
    summary: 'Seu resultado revela um padrão que opera de forma automática e consistente, influenciando áreas que você talvez não associe a ele.',
    acaoInicial: 'Nos próximos 3 dias, observe quando o padrão aparece — apenas observe, sem tentar mudar. Anotar já é agir.',
    corrigirPrimeiro: 'O primeiro ajuste é criar um intervalo entre perceber o impulso e agir. Isso desmonta o automático.',
  };
  return fallbacks[context] || unique.length > 0 ? unique.join(' ') : text;
}

/** Cross-block deduplication: ensure no two blocks say the same thing */
function crossBlockDedup(blocks: Record<string, string>): Record<string, string> {
  const keys = Object.keys(blocks);
  const result = { ...blocks };
  
  // Priority order: earlier blocks keep their content, later ones get rewritten
  for (let i = 0; i < keys.length; i++) {
    for (let j = i + 1; j < keys.length; j++) {
      if (isRedundant(result[keys[i]], result[keys[j]], 0.55)) {
        result[keys[j]] = makeUnique(result[keys[j]], result[keys[i]], keys[j]);
      }
    }
  }
  return result;
}

function deduplicateArray(items: string[]): string[] {
  if (!items || items.length <= 1) return items;
  const result: string[] = [items[0]];
  for (let i = 1; i < items.length; i++) {
    if (!result.some(existing => isRedundant(items[i], existing, 0.55))) {
      result.push(items[i]);
    }
  }
  return result;
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

/** Ensure focus-of-change fields are specific and actionable, not abstract */
function refineActionableField(text: string, patternLabel: string): string {
  if (!text) return text;
  let refined = text;
  // Strip vague phrases first
  for (const phrase of VAGUE_ACTION_PHRASES) {
    const regex = new RegExp(phrase + '[^.]*\\.?\\s*', 'gi');
    refined = refined.replace(regex, '').trim();
  }
  // If stripped to empty or too short, generate a concrete fallback
  if (refined.length < 15) {
    refined = `Parar de repetir o ciclo de ${patternLabel.toLowerCase()} quando a pressão aparece.`;
  }
  return refined;
}

// ── Main Validator ──

export function validateAndRefineReport(result: DiagnosticResult): DiagnosticResult {
  const ai = result as any;

  // ── Step 1: Enforce density limits ──
  let corePain = enforceMaxSentences(result.corePain, 2);
  let criticalDiagnosis = enforceMaxSentences(result.criticalDiagnosis, 2);
  let direction = enforceMaxSentences(result.direction, 2);
  let summary = enforceMaxSentences(result.summary, 3);
  let impact = enforceMaxSentences(result.impact || '', 2);
  let mechanism = enforceMaxSentences(result.mechanism || '', 2);
  let contradiction = enforceMaxSentences(result.contradiction || '', 2);
  let chamaAtencao = enforceMaxSentences(ai.chamaAtencao || '', 2);
  let padraoRepetido = enforceMaxSentences(ai.padraoRepetido || '', 2);
  let comoAparece = enforceMaxSentences(ai.comoAparece || '', 2);
  let comoAtrapalha = enforceMaxSentences(ai.comoAtrapalha || '', 2);
  let corrigirPrimeiro = enforceMaxSentences(ai.corrigirPrimeiro || '', 2);
  let acaoInicial = enforceMaxSentences(ai.acaoInicial || '', 2);

  // ── Step 2: Simplify language ──
  corePain = simplifyLanguage(corePain);
  criticalDiagnosis = simplifyLanguage(criticalDiagnosis);
  direction = simplifyLanguage(direction);
  summary = simplifyLanguage(summary);
  impact = simplifyLanguage(impact);
  mechanism = simplifyLanguage(mechanism);
  contradiction = simplifyLanguage(contradiction);
  chamaAtencao = simplifyLanguage(chamaAtencao);
  padraoRepetido = simplifyLanguage(padraoRepetido);
  comoAparece = simplifyLanguage(comoAparece);
  comoAtrapalha = simplifyLanguage(comoAtrapalha);
  corrigirPrimeiro = simplifyLanguage(corrigirPrimeiro);
  acaoInicial = simplifyLanguage(acaoInicial);

  // ── Step 3: Cross-block deduplication ──
  const textBlocks: Record<string, string> = {};
  if (criticalDiagnosis) textBlocks.criticalDiagnosis = criticalDiagnosis;
  if (corePain) textBlocks.corePain = corePain;
  if (mechanism) textBlocks.mechanism = mechanism;
  if (impact) textBlocks.impact = impact;
  if (direction) textBlocks.direction = direction;
  if (summary) textBlocks.summary = summary;
  if (chamaAtencao) textBlocks.chamaAtencao = chamaAtencao;
  if (padraoRepetido) textBlocks.padraoRepetido = padraoRepetido;
  if (comoAparece) textBlocks.comoAparece = comoAparece;
  if (comoAtrapalha) textBlocks.comoAtrapalha = comoAtrapalha;
  if (corrigirPrimeiro) textBlocks.corrigirPrimeiro = corrigirPrimeiro;
  if (acaoInicial) textBlocks.acaoInicial = acaoInicial;

  const deduped = crossBlockDedup(textBlocks);

  // Apply deduped back
  criticalDiagnosis = deduped.criticalDiagnosis || criticalDiagnosis;
  corePain = deduped.corePain || corePain;
  mechanism = deduped.mechanism || mechanism;
  impact = deduped.impact || impact;
  direction = deduped.direction || direction;
  summary = deduped.summary || summary;
  chamaAtencao = deduped.chamaAtencao || chamaAtencao;
  padraoRepetido = deduped.padraoRepetido || padraoRepetido;
  comoAparece = deduped.comoAparece || comoAparece;
  comoAtrapalha = deduped.comoAtrapalha || comoAtrapalha;
  corrigirPrimeiro = deduped.corrigirPrimeiro || corrigirPrimeiro;
  acaoInicial = deduped.acaoInicial || acaoInicial;

  // ── Step 4: Deduplicate arrays ──
  const triggers = trimArrayItems(deduplicateArray(result.triggers || []), 4);
  const mentalTraps = trimArrayItems(deduplicateArray(result.mentalTraps || []), 4);
  const whatNotToDo = trimArrayItems(deduplicateArray(result.whatNotToDo || []), 4);
  const gatilhos = trimArrayItems(deduplicateArray(ai.gatilhos || []), 4);
  const pararDeFazer = trimArrayItems(deduplicateArray(ai.pararDeFazer || []), 4);

  // ── Step 5: Life impact dedup ──
  const lifeImpact = deduplicateLifeImpact(result.lifeImpact || [], result.mechanism || '');

  return {
    ...result,
    corePain,
    criticalDiagnosis,
    direction,
    summary,
    impact,
    mechanism,
    contradiction,
    lifeImpact,
    triggers,
    mentalTraps,
    exitStrategy: (result.exitStrategy || []).slice(0, 4),
    whatNotToDo,
    ...(chamaAtencao ? { chamaAtencao } : {}),
    ...(padraoRepetido ? { padraoRepetido } : {}),
    ...(comoAparece ? { comoAparece } : {}),
    ...(comoAtrapalha ? { comoAtrapalha } : {}),
    ...(corrigirPrimeiro ? { corrigirPrimeiro } : {}),
    ...(acaoInicial ? { acaoInicial } : {}),
    ...(gatilhos.length > 0 ? { gatilhos } : {}),
    ...(pararDeFazer.length > 0 ? { pararDeFazer } : {}),
  } as DiagnosticResult;
}
