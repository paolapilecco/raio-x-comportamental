import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface CompletedSession {
  id: string;
  completed_at: string;
  test_module_id: string | null;
  person_id: string | null;
}

export interface SessionResult {
  id: string;
  session_id: string;
  dominant_pattern: string;
  secondary_patterns: string[] | null;
  intensity: string;
  profile_name: string;
  mental_state: string;
  state_summary: string;
  mechanism: string;
  triggers: string[] | null;
  traps: string[] | null;
  self_sabotage_cycle: string[] | null;
  blocking_point: string;
  contradiction: string;
  life_impact: any;
  exit_strategy: any;
  all_scores: any;
  direction: string;
  combined_title: string;
  created_at: string;
  core_pain?: string;
  key_unlock_area?: string;
  critical_diagnosis?: string;
  impact?: string;
  what_not_to_do?: string[] | null;
}

interface UseDiagnosticSessionsOptions {
  personId?: string | null;
  /** columns to select from diagnostic_sessions (default: id, completed_at, test_module_id, person_id) */
  ascending?: boolean;
  /** Whether to auto-fetch results for each session */
  fetchResults?: boolean;
}

interface UseDiagnosticSessionsReturn {
  sessions: CompletedSession[];
  results: SessionResult[];
  loading: boolean;
  /** Re-fetch data */
  refetch: () => void;
  /** Get the set of completed test_module_ids */
  completedModuleIds: Set<string>;
  /** Latest session */
  latestSession: CompletedSession | null;
}

/**
 * Reusable hook to fetch completed diagnostic sessions + optionally their results.
 * Replaces duplicated logic across Dashboard, DiagnosticHistory, CentralReport, etc.
 */
export function useDiagnosticSessions(
  userId: string | undefined,
  options: UseDiagnosticSessionsOptions = {},
): UseDiagnosticSessionsReturn {
  const { personId, ascending = false, fetchResults = true } = options;
  const [sessions, setSessions] = useState<CompletedSession[]>([]);
  const [results, setResults] = useState<SessionResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [trigger, setTrigger] = useState(0);

  const refetch = () => setTrigger(t => t + 1);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    const load = async () => {
      setLoading(true);
      try {
        let query = supabase
          .from('diagnostic_sessions')
          .select('id, completed_at, test_module_id, person_id')
          .eq('user_id', userId)
          .not('completed_at', 'is', null)
          .order('completed_at', { ascending });

        if (personId) {
          query = query.eq('person_id', personId);
        }

        const { data: sessData, error: sessErr } = await query;
        if (sessErr) {
          console.error('Error fetching sessions:', sessErr);
        }

        const fetchedSessions = (sessData || []) as CompletedSession[];
        if (cancelled) return;
        setSessions(fetchedSessions);

        if (fetchResults && fetchedSessions.length > 0) {
          const { data: resData, error: resErr } = await supabase
            .from('diagnostic_results')
            .select('*')
            .in('session_id', fetchedSessions.map(s => s.id));

          if (resErr) {
            console.error('Error fetching results:', resErr);
          }
          if (!cancelled) {
            setResults((resData || []) as SessionResult[]);
          }
        } else if (!cancelled) {
          setResults([]);
        }
      } catch (err) {
        console.error('Error in useDiagnosticSessions:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => { cancelled = true; };
  }, [userId, personId, ascending, fetchResults, trigger]);

  const completedModuleIds = new Set(
    sessions.map(s => s.test_module_id).filter(Boolean) as string[],
  );

  const latestSession = ascending
    ? sessions[sessions.length - 1] ?? null
    : sessions[0] ?? null;

  return { sessions, results, loading, refetch, completedModuleIds, latestSession };
}
