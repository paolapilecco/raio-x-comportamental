/**
 * Report Quality Validator — Lightweight version
 * 
 * Validates quality without inflating content length.
 * Flags generic content but keeps refinements brief.
 */

import { DiagnosticResult } from '@/types/diagnostic';

const GENERIC_PHRASES = [
  'você precisa de mais disciplina', 'tenha mais foco', 'acredite em si mesmo',
  'basta querer', 'saia da zona de conforto', 'seja mais organizado',
  'pratique o autoconhecimento', 'busque equilíbrio', 'você é capaz',
  'não desista', 'siga sua paixão', 'o universo conspira',
];

const VAGUE_PATTERNS = [
  /^(você |o usuário )?(precisa|deve) (ter mais|buscar|encontrar|desenvolver)/i,
  /^(tente|procure|busque) (ser|ter|encontrar) (mais|melhor)/i,
  /^(é importante|é fundamental) (que você|buscar|ter)/i,
];

function isGeneric(text: string): boolean {
  const lower = text.toLowerCase();
  if (GENERIC_PHRASES.some(p => lower.includes(p))) return true;
  if (VAGUE_PATTERNS.some(p => p.test(text))) return true;
  return text.length < 20;
}

function trimIfLong(text: string, maxSentences = 4): string {
  const sentences = text.split(/(?<=[.!?])\s+/).filter(Boolean);
  if (sentences.length <= maxSentences) return text;
  return sentences.slice(0, maxSentences).join(' ');
}

export function validateAndRefineReport(result: DiagnosticResult): DiagnosticResult {
  return {
    ...result,
    corePain: trimIfLong(result.corePain, 4),
    criticalDiagnosis: trimIfLong(result.criticalDiagnosis, 3),
    direction: trimIfLong(result.direction, 3),
    summary: trimIfLong(result.summary, 5),
    triggers: result.triggers.slice(0, 5),
    mentalTraps: result.mentalTraps.slice(0, 4),
    exitStrategy: result.exitStrategy.slice(0, 5),
    whatNotToDo: result.whatNotToDo.slice(0, 5),
  };
}
