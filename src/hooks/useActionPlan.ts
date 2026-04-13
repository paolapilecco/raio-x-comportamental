import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { trackEvent } from '@/lib/trackEvent';

export interface ActionPlanDay {
  id: string;
  day_number: number;
  action_text: string;
  completed: boolean;
  completed_at: string | null;
  notes: string;
}

export interface ActionPlanStats {
  execution_rate: number;
  current_streak: number;
  completed_days: number;
  remaining_days: number;
  total_days: number;
}

export interface ActionPlanData {
  days: ActionPlanDay[];
  stats: ActionPlanStats;
  diagnosticResultId: string | null;
  loading: boolean;
  toggleDay: (dayId: string, completed: boolean) => Promise<void>;
}

export function useActionPlan(userId: string | undefined): ActionPlanData {
  const [days, setDays] = useState<ActionPlanDay[]>([]);
  const [diagnosticResultId, setDiagnosticResultId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) { setLoading(false); return; }

    const fetch = async () => {
      try {
        // Get the latest completed diagnostic session
        const { data: sessions } = await supabase
          .from('diagnostic_sessions')
          .select('id')
          .eq('user_id', userId)
          .not('completed_at', 'is', null)
          .order('completed_at', { ascending: false })
          .limit(1);

        if (!sessions?.[0]) { setLoading(false); return; }

        const { data: results } = await supabase
          .from('diagnostic_results')
          .select('id')
          .eq('session_id', sessions[0].id)
          .maybeSingle();

        if (!results) { setLoading(false); return; }

        setDiagnosticResultId(results.id);

        // Fetch action plan tracking for this result
        const { data: tracking } = await supabase
          .from('action_plan_tracking')
          .select('id, day_number, action_text, completed, completed_at, notes')
          .eq('diagnostic_result_id', results.id)
          .eq('user_id', userId)
          .order('day_number');

        setDays(tracking || []);
      } catch (e) {
        console.error('Error fetching action plan:', e);
      } finally {
        setLoading(false);
      }
    };

    fetch();
  }, [userId]);

  const toggleDay = useCallback(async (dayId: string, completed: boolean) => {
    const now = completed ? new Date().toISOString() : null;

    // Optimistic update
    setDays(prev => prev.map(d => 
      d.id === dayId ? { ...d, completed, completed_at: now } : d
    ));

    const { error } = await supabase
      .from('action_plan_tracking')
      .update({ completed, completed_at: now })
      .eq('id', dayId);

    if (error) {
      // Revert
      setDays(prev => prev.map(d => 
        d.id === dayId ? { ...d, completed: !completed, completed_at: completed ? null : d.completed_at } : d
      ));
      console.error('Error toggling day:', error);
    } else if (completed && userId) {
      trackEvent({ userId, event: 'action_plan_day_completed', diagnosticResultId: diagnosticResultId || undefined, metadata: { dayId } });
    }
  }, [userId, diagnosticResultId]);

  // Compute stats
  const completedDays = days.filter(d => d.completed).length;
  const totalDays = days.length;
  const remainingDays = totalDays - completedDays;
  const executionRate = totalDays > 0 ? Math.round((completedDays / totalDays) * 100) : 0;

  // Calculate current streak (consecutive completed actions from start)
  let currentStreak = 0;
  const sorted = [...days].sort((a, b) => a.day_number - b.day_number);
  for (const d of sorted) {
    if (d.completed) currentStreak++;
    else break;
  }

  return {
    days,
    stats: { execution_rate: executionRate, current_streak: currentStreak, completed_days: completedDays, remaining_days: remainingDays, total_days: totalDays },
    diagnosticResultId,
    loading,
    toggleDay,
  };
}

/**
 * Creates action plan tracking records for a diagnostic result.
 * Stores exactly 1 row per action (max 3 actions).
 * Call after saving diagnostic results.
 */
export async function createActionPlanTracking(
  userId: string,
  diagnosticResultId: string,
  actions: string[]
): Promise<void> {
  console.log(`[ActionPlan] Creating tracking: userId=${userId}, resultId=${diagnosticResultId}, actions=${actions.length}`);
  
  if (!actions || actions.length === 0) {
    console.warn('[ActionPlan] No actions provided — skipping tracking creation');
    return;
  }

  // Check if plan already exists
  const { data: existing } = await supabase
    .from('action_plan_tracking')
    .select('id')
    .eq('diagnostic_result_id', diagnosticResultId)
    .limit(1);

  if (existing && existing.length > 0) {
    console.log(`[ActionPlan] Tracking already exists for ${diagnosticResultId} — skipping`);
    return;
  }

  // Store exactly 1 row per action (max 3)
  const rows = actions.slice(0, 3).map((actionText, i) => ({
    user_id: userId,
    diagnostic_result_id: diagnosticResultId,
    day_number: i + 1,
    action_text: actionText,
  }));

  const { error } = await supabase.from('action_plan_tracking').insert(rows);
  
  if (error) {
    console.error('[ActionPlan] Failed to insert tracking rows:', error);
  } else {
    console.log(`[ActionPlan] ✅ Successfully created ${rows.length} tracking rows for ${diagnosticResultId}`);
  }
}
