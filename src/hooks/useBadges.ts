import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface Badge {
  id: string;
  emoji: string;
  name: string;
  description: string;
  unlocked: boolean;
  unlockedAt?: string;
}

export interface BadgesData {
  badges: Badge[];
  unlockedCount: number;
  totalCount: number;
  loading: boolean;
}

export function useBadges(userId: string | undefined): BadgesData {
  const [data, setData] = useState<BadgesData>({
    badges: [],
    unlockedCount: 0,
    totalCount: 7,
    loading: true,
  });

  useEffect(() => {
    if (!userId) return;

    const compute = async () => {
      const [sessionsRes, resultsRes, invitesRes] = await Promise.all([
        supabase
          .from('diagnostic_sessions')
          .select('id, completed_at, test_module_id')
          .eq('user_id', userId)
          .not('completed_at', 'is', null)
          .order('completed_at', { ascending: true }),
        supabase
          .from('diagnostic_results')
          .select('session_id, all_scores, created_at')
          .order('created_at', { ascending: true }),
        supabase
          .from('invites')
          .select('id, status')
          .eq('inviter_id', userId),
      ]);

      const sessions = sessionsRes.data || [];
      const allResults = resultsRes.data || [];
      const invites = invitesRes.data || [];

      // Filter results to only user's sessions
      const sessionIds = new Set(sessions.map(s => s.id));
      const results = allResults.filter(r => sessionIds.has(r.session_id));

      const uniqueModules = new Set(sessions.map(s => s.test_module_id).filter(Boolean));
      const acceptedInvites = invites.filter(i => i.status === 'accepted');

      // Weekly streak calculation (simplified)
      const getWeekKey = (date: Date): string => {
        const d = new Date(date);
        d.setHours(0, 0, 0, 0);
        const day = d.getDay() || 7;
        d.setDate(d.getDate() + 4 - day);
        const yearStart = new Date(d.getFullYear(), 0, 1);
        const weekNum = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
        return `${d.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;
      };

      const weeklyActivity = new Set<string>();
      sessions.forEach(s => {
        if (s.completed_at) weeklyActivity.add(getWeekKey(new Date(s.completed_at)));
      });

      // Calculate longest streak
      const sortedWeeks = Array.from(weeklyActivity).sort();
      let longestStreak = 0;
      let tempStreak = 0;
      let prevWeek = '';
      const getPrevWeek = (wk: string) => {
        const [y, w] = wk.split('-W').map(Number);
        let nw = w - 1, ny = y;
        if (nw < 1) { ny--; nw = 52; }
        return `${ny}-W${String(nw).padStart(2, '0')}`;
      };
      for (const week of sortedWeeks) {
        if (prevWeek && getPrevWeek(week) === prevWeek) {
          tempStreak++;
        } else {
          tempStreak = 1;
        }
        longestStreak = Math.max(longestStreak, tempStreak);
        prevWeek = week;
      }

      // Check for score improvement (compare first and last result for same module)
      let hasImprovement = false;
      const moduleResults: Record<string, { first: any[]; last: any[] }> = {};
      sessions.forEach(s => {
        if (!s.test_module_id) return;
        const result = results.find(r => r.session_id === s.id);
        if (!result) return;
        const scores = (result.all_scores as any[]) || [];
        if (!moduleResults[s.test_module_id]) {
          moduleResults[s.test_module_id] = { first: scores, last: scores };
        } else {
          moduleResults[s.test_module_id].last = scores;
        }
      });

      for (const mod of Object.values(moduleResults)) {
        if (mod.first !== mod.last) {
          // Check if any score improved (lower is better for negative patterns, but we check percentage change)
          for (const lastScore of mod.last) {
            const firstScore = mod.first.find((s: any) => s.key === lastScore.key);
            if (firstScore && lastScore.percentage < firstScore.percentage) {
              hasImprovement = true;
              break;
            }
          }
        }
        if (hasImprovement) break;
      }

      // Check for internal conflict detection
      let hasConflict = false;
      for (const result of results) {
        const scores = (result.all_scores as any[]) || [];
        const highScores = scores.filter((s: any) => s.percentage >= 65);
        if (highScores.length >= 2) {
          hasConflict = true;
          break;
        }
      }

      // Get total active modules count
      const { count: totalModulesCount } = await supabase
        .from('test_modules')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true);

      const allModulesCompleted = totalModulesCount ? uniqueModules.size >= totalModulesCount : false;

      // Build badges
      const badges: Badge[] = [
        {
          id: 'first_reading',
          emoji: '🥇',
          name: 'Primeiro Raio-X',
          description: 'Completou sua primeira leitura',
          unlocked: sessions.length >= 1,
          unlockedAt: sessions.length >= 1 ? sessions[0].completed_at || undefined : undefined,
        },
        {
          id: 'pattern_revealed',
          emoji: '🔄',
          name: 'Padrão Revelado',
          description: 'Realizou 3 leituras diferentes',
          unlocked: uniqueModules.size >= 3,
          unlockedAt: uniqueModules.size >= 3 ? sessions.find((_, i) => {
            const mods = new Set(sessions.slice(0, i + 1).map(s => s.test_module_id).filter(Boolean));
            return mods.size >= 3;
          })?.completed_at || undefined : undefined,
        },
        {
          id: 'evolving',
          emoji: '📈',
          name: 'Em Evolução',
          description: 'Score melhorou em algum eixo no reteste',
          unlocked: hasImprovement,
        },
        {
          id: 'complete_map',
          emoji: '🧠',
          name: 'Mapa Completo',
          description: 'Completou todos os módulos disponíveis',
          unlocked: allModulesCompleted,
        },
        {
          id: 'four_weeks',
          emoji: '🔥',
          name: '4 Semanas Seguidas',
          description: 'Streak de 4 semanas consecutivas',
          unlocked: longestStreak >= 4,
        },
        {
          id: 'blind_spot',
          emoji: '💡',
          name: 'Ponto Cego Encontrado',
          description: 'Relatório detectou conflito interno',
          unlocked: hasConflict,
        },
        {
          id: 'guide',
          emoji: '👥',
          name: 'Guia',
          description: 'Indicou alguém para a plataforma',
          unlocked: acceptedInvites.length > 0,
        },
      ];

      setData({
        badges,
        unlockedCount: badges.filter(b => b.unlocked).length,
        totalCount: badges.length,
        loading: false,
      });
    };

    compute();
  }, [userId]);

  return data;
}
