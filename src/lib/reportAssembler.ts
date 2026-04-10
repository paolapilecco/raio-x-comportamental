/**
 * Report Assembler
 * 
 * Pure passthrough from AI JSON to report structure.
 * NO hardcoded fallbacks. If a field is empty, it stays empty.
 */

import { DiagnosticResult } from '@/types/diagnostic';

/**
 * Assembles the report from raw AI output.
 * Maps AI JSON fields directly — no fallback injection.
 */
export function assembleReport(rawResult: DiagnosticResult): DiagnosticResult {
  // Simply return the result as-is — all field mapping
  // is handled by the edge function's normalizeResult.
  // No hardcoded content injection.
  return rawResult;
}
