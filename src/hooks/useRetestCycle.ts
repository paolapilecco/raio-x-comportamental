import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

const RETEST_INTERVAL_DAYS = 15;

interface ScoreComparison {
  key: string;
  label: string;
  previous: number;
  current: number;
  delta: number;
}

export interface RetestCycleData {
  loading: boolean;
  lastTestDate: Date | null;
  daysSinceLastTest: number;
  daysUntilRetest: number;
  retestAvailable: boolean;
  progressPercent: number;
  scoreComparisons: ScoreComparison[];
  hasImproved: boolean;
  improvementCount: number;
  worsenedCount: number;
}

export function useRetestCycle(userId: string | undefined): RetestCycleData {
  const [data, setData] = useState<RetestCycleData>({
    loading: true,
    lastTestDate: null,
    daysSinceLastTest: 0,
    daysUntilRetest: RETEST_INTERVAL_DAYS,
    retestAvailable: false,
    progressPercent: 0,
    scoreComparisons: [],
    hasImproved: false,
    improvementCount: 0,
    worsenedCount: 0,
  });

  useEffect(() => {
    if (!userId) return;

    const compute = async () => {
      // Fetch the two most recent completed sessions with results
      const { data: sessions } = await supabase
        .from('diagnostic_sessions')
        .select('id, completed_at')
        .eq('user_id', userId)
        .not('completed_at', 'is', null)
        .order('completed_at', { ascending: false })
        .limit(2);

      if (!sessions || sessions.length === 0) {
        setData(prev => ({ ...prev, loading: false }));
        return;
      }

      const lastTestDate = new Date(sessions[0].completed_at!);
      const now = Date.now();
      const daysSince = Math.floor((now - lastTestDate.getTime()) / 86400000);
      const daysUntil = Math.max(0, RETEST_INTERVAL_DAYS - daysSince);
      const retestAvailable = daysSince >= RETEST_INTERVAL_DAYS;
      const progressPercent = Math.min(100, Math.round((daysSince / RETEST_INTERVAL_DAYS) * 100));

      // Score comparison between last two tests
      let scoreComparisons: ScoreComparison[] = [];
      if (sessions.length >= 2) {
        const { data: results } = await supabase
          .from('diagnostic_results')
          .select('session_id, all_scores')
          .in('session_id', sessions.map(s => s.id));

        if (results && results.length >= 2) {
          const currentResult = results.find(r => r.session_id === sessions[0].id);
          const previousResult = results.find(r => r.session_id === sessions[1].id);

          if (currentResult?.all_scores && previousResult?.all_scores) {
            const currentScores = currentResult.all_scores as unknown as { key: string; label: string; percentage: number }[];
            const previousScores = previousResult.all_scores as unknown as { key: string; label: string; percentage: number }[];
            const prevMap = new Map(previousScores.map(s => [s.key, s]));

            scoreComparisons = currentScores.map(curr => {
              const prev = prevMap.get(curr.key);
              return {
                key: curr.key,
                label: curr.label || curr.key,
                current: curr.percentage,
                previous: prev?.percentage ?? curr.percentage,
                delta: curr.percentage - (prev?.percentage ?? curr.percentage),
              };
            }).sort((a, b) => a.delta - b.delta); // improvements first (negative delta = lower pattern = better)
          }
        }
      }

      const improvementCount = scoreComparisons.filter(s => s.delta < -3).length;
      const worsenedCount = scoreComparisons.filter(s => s.delta > 3).length;

      setData({
        loading: false,
        lastTestDate,
        daysSinceLastTest: daysSince,
        daysUntilRetest: daysUntil,
        retestAvailable,
        progressPercent,
        scoreComparisons,
        hasImproved: improvementCount > worsenedCount,
        improvementCount,
        worsenedCount,
      });
    };

    compute();
  }, [userId]);

  return data;
}
