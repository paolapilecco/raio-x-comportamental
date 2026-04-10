/**
 * Report Assembler
 * 
 * Transforms raw AI/local analysis output into a structured report
 * with fixed block order, size limits, deduplication, and coherence checks.
 * 
 * Fixed block order:
 *   1. Diagnóstico (chamaAtencao)
 *   2. Perfil (padraoRepetido)  
 *   3. Dor (comoAtrapalha)
 *   4. Gatilhos (gatilhos)
 *   5. Direção (corrigirPrimeiro + acaoInicial)
 */

import { DiagnosticResult } from '@/types/diagnostic';
import { validateAndRefineReport } from './reportQualityValidator';

// ── Block definitions with fixed order & size limits ──

interface BlockConfig {
  key: string;
  maxSentences: number;
  required: boolean;
}

const BLOCK_ORDER: BlockConfig[] = [
  { key: 'chamaAtencao', maxSentences: 2, required: true },
  { key: 'padraoRepetido', maxSentences: 2, required: true },
  { key: 'comoAparece', maxSentences: 2, required: false },
  { key: 'comoAtrapalha', maxSentences: 2, required: true },
  { key: 'corrigirPrimeiro', maxSentences: 2, required: true },
  { key: 'acaoInicial', maxSentences: 2, required: true },
];


// ── Helpers ──

function splitSentences(text: string): string[] {
  if (!text) return [];
  return text.split(/(?<=[.!?])\s+/).filter(s => s.trim().length > 0);
}

function truncateToSentences(text: string, max: number): string {
  if (!text) return text;
  const sentences = splitSentences(text);
  return sentences.length <= max ? text : sentences.slice(0, max).join(' ');
}

// ── Source resolution: pick best available field ──

function resolveField(ai: any, ...keys: string[]): string {
  for (const k of keys) {
    const v = ai[k];
    if (typeof v === 'string' && v.trim().length > 0) return v;
  }
  return '';
}

function resolveArray(ai: any, ...keys: string[]): string[] {
  for (const k of keys) {
    const v = ai[k];
    if (Array.isArray(v) && v.length > 0) return v;
  }
  return [];
}

// ── Main assembler ──

export function assembleReport(rawResult: DiagnosticResult): DiagnosticResult {
  const ai = rawResult as any;

  // Step 1: Resolve each block from best available source
  const resolved: Record<string, string> = {
    chamaAtencao: resolveField(ai, 'chamaAtencao', 'resumoPrincipal', 'criticalDiagnosis'),
    padraoRepetido: resolveField(ai, 'padraoRepetido', 'padraoIdentificado', 'mechanism'),
    comoAparece: resolveField(ai, 'comoAparece', 'mentalState'),
    comoAtrapalha: resolveField(ai, 'comoAtrapalha', 'significadoPratico', 'corePain', 'impact'),
    corrigirPrimeiro: resolveField(ai, 'corrigirPrimeiro', 'direcaoAjuste', 'keyUnlockArea', 'direction'),
    acaoInicial: resolveField(ai, 'acaoInicial', 'proximoPasso', 'firstAction'),
  };

  // Step 2: If acaoInicial is empty, derive from exitStrategy
  if (!resolved.acaoInicial && rawResult.exitStrategy?.[0]?.action) {
    resolved.acaoInicial = rawResult.exitStrategy[0].action;
  }

  // Step 3: Enforce sentence limits per block
  for (const block of BLOCK_ORDER) {
    if (resolved[block.key]) {
      resolved[block.key] = truncateToSentences(resolved[block.key], block.maxSentences);
    }
  }

  // Step 4: Resolve list blocks
  const lists: Record<string, string[]> = {
    gatilhos: resolveArray(ai, 'gatilhos', 'triggers').slice(0, 4),
    pararDeFazer: resolveArray(ai, 'pararDeFazer', 'oQueEvitar', 'whatNotToDo').slice(0, 4),
  };

  // Step 5: Apply resolved blocks back onto the result
  const assembled: any = {
    ...rawResult,
    chamaAtencao: resolved.chamaAtencao,
    padraoRepetido: resolved.padraoRepetido,
    comoAparece: resolved.comoAparece,
    comoAtrapalha: resolved.comoAtrapalha,
    corrigirPrimeiro: resolved.corrigirPrimeiro,
    acaoInicial: resolved.acaoInicial,
    gatilhos: lists.gatilhos,
    pararDeFazer: lists.pararDeFazer,
    // Sync legacy fields
    criticalDiagnosis: resolved.chamaAtencao || rawResult.criticalDiagnosis,
    mechanism: resolved.padraoRepetido || rawResult.mechanism,
    corePain: resolved.comoAtrapalha || rawResult.corePain,
    direction: resolved.corrigirPrimeiro || rawResult.direction,
  };

  // Step 6: Run full quality validation (dedup, language simplification, coherence)
  return validateAndRefineReport(assembled as DiagnosticResult);
}
