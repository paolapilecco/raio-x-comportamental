import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { PatternDefinition, PatternKey } from '@/types/diagnostic';

interface DbPatternDef {
  id: string;
  pattern_key: string;
  label: string;
  profile_name: string;
  description: string;
  mechanism: string;
  mental_state: string;
  core_pain: string;
  key_unlock_area: string;
  critical_diagnosis: string;
  what_not_to_do: string[];
  triggers: string[];
  mental_traps: string[];
  self_sabotage_cycle: string[];
  blocking_point: string;
  contradiction: string;
  impact: string;
  direction: string;
  life_impact: any;
  exit_strategy: any;
  test_module_id: string | null;
}

function toPatternDefinition(row: DbPatternDef): PatternDefinition {
  return {
    key: row.pattern_key as PatternKey,
    label: row.label,
    profileName: row.profile_name,
    description: row.description,
    mechanism: row.mechanism,
    mentalState: row.mental_state,
    corePain: row.core_pain,
    keyUnlockArea: row.key_unlock_area,
    criticalDiagnosis: row.critical_diagnosis,
    whatNotToDo: row.what_not_to_do || [],
    triggers: row.triggers || [],
    mentalTraps: row.mental_traps || [],
    selfSabotageCycle: row.self_sabotage_cycle || [],
    blockingPoint: row.blocking_point,
    contradiction: row.contradiction,
    impact: row.impact,
    direction: row.direction,
    lifeImpact: row.life_impact || [],
    exitStrategy: row.exit_strategy || [],
  };
}

async function fetchPatternDefinitions(): Promise<Record<string, PatternDefinition>> {
  const { data, error } = await supabase
    .from('pattern_definitions')
    .select('*')
    .order('sort_order');

  if (error || !data) {
    console.error('Failed to fetch pattern_definitions:', error);
    return {};
  }

  const map: Record<string, PatternDefinition> = {};
  (data as unknown as DbPatternDef[]).forEach(row => {
    map[row.pattern_key] = toPatternDefinition(row);
  });
  return map;
}

/**
 * Fetches pattern definitions from the database, cached via React Query.
 * Returns a record keyed by pattern_key.
 */
export function usePatternDefinitions() {
  return useQuery({
    queryKey: ['pattern-definitions'],
    queryFn: fetchPatternDefinitions,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  });
}

/**
 * Helper to get a label for a pattern key from the definitions map.
 * Falls back to the raw key if not found.
 */
export function getPatternLabel(defs: Record<string, PatternDefinition> | undefined, key: string): string {
  return defs?.[key]?.label || key;
}
