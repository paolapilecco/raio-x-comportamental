import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { trackEvent } from '@/lib/trackEvent';

export interface StrategicTask {
  id: string;
  task_number: number;
  titulo: string;
  objetivo: string;
  porque: string;
  comoExecutar: string;
  criterio: string;
  gatilho: string;
  acao: string;
  completed: boolean;
  completed_at: string | null;
  notes: string;
  status: 'not_started' | 'in_progress' | 'completed';
}

export interface ActionPlanStats {
  execution_rate: number;
  current_streak: number;
  completed_days: number;
  remaining_days: number;
  total_days: number;
  has_started: boolean;
  has_in_progress: boolean;
  all_completed: boolean;
}

export interface ActionPlanData {
  days: StrategicTask[];
  stats: ActionPlanStats;
  diagnosticResultId: string | null;
  loading: boolean;
  toggleDay: (dayId: string, completed: boolean) => Promise<void>;
  updateTaskStatus: (taskId: string, status: 'not_started' | 'in_progress' | 'completed') => Promise<void>;
}

function parseTaskMetadata(actionText: string, gatilho: string, acao: string): Pick<StrategicTask, 'titulo' | 'objetivo' | 'porque' | 'comoExecutar' | 'criterio'> {
  // Try to parse JSON metadata from notes field first, fallback to legacy format
  const defaults = {
    titulo: '',
    objetivo: '',
    porque: '',
    comoExecutar: '',
    criterio: '',
  };

  // Legacy action text: "Quando X → Y"
  if (!actionText) return defaults;

  try {
    const parsed = JSON.parse(actionText);
    return {
      titulo: parsed.titulo || '',
      objetivo: parsed.objetivo || '',
      porque: parsed.porque || '',
      comoExecutar: parsed.comoExecutar || '',
      criterio: parsed.criterio || '',
    };
  } catch {
    // Legacy format — generate basic title from gatilho/acao
    return {
      ...defaults,
      titulo: acao ? acao.slice(0, 50) : 'Tarefa comportamental',
    };
  }
}

function inferStatus(completed: boolean, notes: string): 'not_started' | 'in_progress' | 'completed' {
  if (completed) return 'completed';
  // Check if notes contain status marker
  if (notes.includes('__status:in_progress')) return 'in_progress';
  return 'not_started';
}

export function useActionPlan(userId: string | undefined): ActionPlanData {
  const [days, setDays] = useState<StrategicTask[]>([]);
  const [diagnosticResultId, setDiagnosticResultId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) { setLoading(false); return; }

    const fetch = async () => {
      try {
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

        const { data: tracking } = await supabase
          .from('action_plan_tracking')
          .select('id, day_number, action_text, gatilho, acao, completed, completed_at, notes')
          .eq('diagnostic_result_id', results.id)
          .eq('user_id', userId)
          .order('day_number');

        const tasks: StrategicTask[] = (tracking || []).map(row => {
          const meta = parseTaskMetadata(row.action_text, row.gatilho, row.acao);
          return {
            id: row.id,
            task_number: row.day_number,
            titulo: meta.titulo,
            objetivo: meta.objetivo,
            porque: meta.porque,
            comoExecutar: meta.comoExecutar,
            criterio: meta.criterio,
            gatilho: row.gatilho,
            acao: row.acao,
            completed: row.completed,
            completed_at: row.completed_at,
            notes: row.notes,
            status: inferStatus(row.completed, row.notes),
          };
        });

        // Only take first 3 (strategic tasks, not day-based)
        setDays(tasks.slice(0, 3));
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
    const newStatus = completed ? 'completed' : 'not_started';

    setDays(prev => prev.map(d => 
      d.id === dayId ? { ...d, completed, completed_at: now, status: newStatus as any } : d
    ));

    const { error } = await supabase
      .from('action_plan_tracking')
      .update({ completed, completed_at: now })
      .eq('id', dayId);

    if (error) {
      setDays(prev => prev.map(d => 
        d.id === dayId ? { ...d, completed: !completed, completed_at: completed ? null : d.completed_at, status: inferStatus(!completed, d.notes) } : d
      ));
      console.error('Error toggling task:', error);
    } else if (completed && userId) {
      trackEvent({ userId, event: 'action_plan_task_completed', diagnosticResultId: diagnosticResultId || undefined, metadata: { dayId } });
    }
  }, [userId, diagnosticResultId]);

  const updateTaskStatus = useCallback(async (taskId: string, status: 'not_started' | 'in_progress' | 'completed') => {
    const completed = status === 'completed';
    const now = completed ? new Date().toISOString() : null;

    setDays(prev => prev.map(d => {
      if (d.id !== taskId) return d;
      const newNotes = status === 'in_progress' 
        ? (d.notes.includes('__status:') ? d.notes.replace(/__status:\w+/, '__status:in_progress') : d.notes + ' __status:in_progress')
        : d.notes.replace(/__status:\w+/g, '').trim();
      return { ...d, completed, completed_at: now, status, notes: newNotes };
    }));

    const task = days.find(d => d.id === taskId);
    const newNotes = status === 'in_progress'
      ? ((task?.notes || '').includes('__status:') ? (task?.notes || '').replace(/__status:\w+/, '__status:in_progress') : (task?.notes || '') + ' __status:in_progress')
      : (task?.notes || '').replace(/__status:\w+/g, '').trim();

    const { error } = await supabase
      .from('action_plan_tracking')
      .update({ completed, completed_at: now, notes: newNotes })
      .eq('id', taskId);

    if (error) {
      console.error('Error updating task status:', error);
    } else if (userId) {
      trackEvent({ userId, event: `action_plan_task_${status}`, diagnosticResultId: diagnosticResultId || undefined, metadata: { taskId } });
    }
  }, [userId, diagnosticResultId, days]);

  const completedDays = days.filter(d => d.completed).length;
  const totalDays = days.length;
  const remainingDays = totalDays - completedDays;
  const executionRate = totalDays > 0 ? Math.round((completedDays / totalDays) * 100) : 0;
  const hasStarted = days.some(d => d.status === 'in_progress' || d.status === 'completed');
  const hasInProgress = days.some(d => d.status === 'in_progress');
  const allCompleted = totalDays > 0 && completedDays === totalDays;

  let currentStreak = 0;
  for (const d of days) {
    if (d.completed) currentStreak++;
    else break;
  }

  return {
    days,
    stats: { 
      execution_rate: executionRate, 
      current_streak: currentStreak, 
      completed_days: completedDays, 
      remaining_days: remainingDays, 
      total_days: totalDays,
      has_started: hasStarted,
      has_in_progress: hasInProgress,
      all_completed: allCompleted,
    },
    diagnosticResultId,
    loading,
    toggleDay,
    updateTaskStatus,
  };
}

/**
 * Creates action plan tracking records for a diagnostic result.
 * Stores exactly 3 strategic task rows (1 per action).
 */
export async function createActionPlanTracking(
  userId: string,
  diagnosticResultId: string,
  actions: { gatilho: string; acao: string; titulo?: string; objetivo?: string; porque?: string; comoExecutar?: string; criterio?: string }[]
): Promise<void> {
  console.log(`[ActionPlan] Creating tracking: userId=${userId}, resultId=${diagnosticResultId}, actions=${actions.length}`);
  
  if (!actions || actions.length === 0) {
    throw new Error('[ActionPlan] Invalid action count: expected at least 1 action');
  }

  const normalizedActions = actions
    .filter((action) => action?.gatilho && action?.acao)
    .slice(0, 3);

  if (normalizedActions.length === 0) {
    throw new Error('[ActionPlan] No valid actions available to create tracking');
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

  // Create 1 row per strategic task (max 3)
  const rows = normalizedActions.map((action, i) => ({
    user_id: userId,
    diagnostic_result_id: diagnosticResultId,
    day_number: i + 1,
    action_text: JSON.stringify({
      titulo: action.titulo || '',
      objetivo: action.objetivo || '',
      porque: action.porque || '',
      comoExecutar: action.comoExecutar || '',
      criterio: action.criterio || '',
    }),
    gatilho: action.gatilho,
    acao: action.acao,
  }));

  const { error } = await supabase.from('action_plan_tracking').insert(rows);
  
  if (error) {
    console.error('[ActionPlan] Failed to insert tracking rows:', error);
    throw error;
  }
  
  console.log(`[ActionPlan] ✅ Created ${rows.length} strategic tasks for ${diagnosticResultId}`);
}
