import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

const RETEST_INTERVAL_DAYS = 15;

const LEVELS: { name: string; minXP: number }[] = [
  { name: 'Iniciante', minXP: 0 },
  { name: 'Consciente', minXP: 100 },
  { name: 'Desperto', minXP: 300 },
  { name: 'Lúcido', minXP: 600 },
  { name: 'Mestre', minXP: 1000 },
];

const XP_PER_TEST = 25;
const XP_PER_UNIQUE_MODULE = 40;
const XP_PER_STREAK_WEEK = 15;

function getWeekKey(date: Date): string {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay() || 7;
  d.setDate(d.getDate() + 4 - day);
  const yearStart = new Date(d.getFullYear(), 0, 1);
  const weekNum = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;
}

function getPreviousWeekKey(weekKey: string): string {
  const [yearStr, weekStr] = weekKey.split('-W');
  let year = parseInt(yearStr);
  let week = parseInt(weekStr);
  week -= 1;
  if (week < 1) { year--; week = 52; }
  return `${year}-W${String(week).padStart(2, '0')}`;
}

function getLevelInfo(xp: number) {
  let currentLevel = LEVELS[0];
  let nextLevel: typeof LEVELS[0] | null = LEVELS[1];
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (xp >= LEVELS[i].minXP) {
      currentLevel = LEVELS[i];
      nextLevel = LEVELS[i + 1] || null;
      break;
    }
  }
  const levelIndex = LEVELS.indexOf(currentLevel);
  const xpInLevel = xp - currentLevel.minXP;
  const xpRange = nextLevel ? nextLevel.minXP - currentLevel.minXP : 1;
  const progress = nextLevel ? Math.min(Math.round((xpInLevel / xpRange) * 100), 100) : 100;
  return { level: levelIndex + 1, levelName: currentLevel.name, levelProgress: progress, xpToNextLevel: nextLevel ? nextLevel.minXP - xp : 0 };
}

export interface ScoreComparison {
  key: string; label: string; previous: number; current: number; delta: number;
}

export interface PersonBadge {
  id: string; emoji: string; name: string; description: string; unlocked: boolean;
}

export interface PersonGamificationData {
  loading: boolean;
  // Score Global
  globalScore: number;
  scoreBreakdown: { awareness: number; consistency: number; coverage: number; recency: number };
  // Streak & Level
  currentStreak: number;
  longestStreak: number;
  streakActive: boolean;
  totalXP: number;
  level: number;
  levelName: string;
  levelProgress: number;
  xpToNextLevel: number;
  // Retest Cycle
  lastTestDate: Date | null;
  daysSinceLastTest: number;
  daysUntilRetest: number;
  retestAvailable: boolean;
  retestProgressPercent: number;
  scoreComparisons: ScoreComparison[];
  // Badges
  badges: PersonBadge[];
  unlockedBadges: number;
  // Stats
  totalTests: number;
  uniqueModules: number;
}

export function usePersonGamification(userId: string | undefined, personId: string | undefined): PersonGamificationData {
  const [data, setData] = useState<PersonGamificationData>({
    loading: true, globalScore: 0,
    scoreBreakdown: { awareness: 0, consistency: 0, coverage: 0, recency: 0 },
    currentStreak: 0, longestStreak: 0, streakActive: false,
    totalXP: 0, level: 1, levelName: 'Iniciante', levelProgress: 0, xpToNextLevel: 100,
    lastTestDate: null, daysSinceLastTest: 0, daysUntilRetest: RETEST_INTERVAL_DAYS,
    retestAvailable: false, retestProgressPercent: 0, scoreComparisons: [],
    badges: [], unlockedBadges: 0, totalTests: 0, uniqueModules: 0,
  });

  useEffect(() => {
    if (!userId || !personId) return;

    const compute = async () => {
      // Fetch sessions for this person
      const { data: sessions } = await supabase
        .from('diagnostic_sessions')
        .select('id, completed_at, test_module_id')
        .eq('user_id', userId)
        .eq('person_id', personId)
        .not('completed_at', 'is', null)
        .order('completed_at', { ascending: true });

      if (!sessions || sessions.length === 0) {
        setData(prev => ({ ...prev, loading: false }));
        return;
      }

      const totalTests = sessions.length;
      const uniqueModuleIds = new Set(sessions.map(s => s.test_module_id).filter(Boolean));
      const uniqueModules = uniqueModuleIds.size;

      // Weekly streak
      const weeklyActivity = new Set<string>();
      sessions.forEach(s => { if (s.completed_at) weeklyActivity.add(getWeekKey(new Date(s.completed_at))); });

      const currentWeek = getWeekKey(new Date());
      const streakActive = weeklyActivity.has(currentWeek);
      let streakStart = streakActive ? currentWeek : getPreviousWeekKey(currentWeek);
      let currentStreak = 0;
      if (weeklyActivity.has(streakStart)) {
        let checkWeek = streakStart;
        while (weeklyActivity.has(checkWeek)) { currentStreak++; checkWeek = getPreviousWeekKey(checkWeek); }
      }

      const sortedWeeks = Array.from(weeklyActivity).sort();
      let longestStreak = 0, tempStreak = 0, prevWeek = '';
      for (const week of sortedWeeks) {
        tempStreak = (prevWeek && getPreviousWeekKey(week) === prevWeek) ? tempStreak + 1 : 1;
        longestStreak = Math.max(longestStreak, tempStreak);
        prevWeek = week;
      }

      // XP & Level
      const totalXP = totalTests * XP_PER_TEST + uniqueModules * XP_PER_UNIQUE_MODULE + currentStreak * XP_PER_STREAK_WEEK;
      const levelInfo = getLevelInfo(totalXP);

      // Retest cycle
      const sortedDesc = [...sessions].sort((a, b) => new Date(b.completed_at!).getTime() - new Date(a.completed_at!).getTime());
      const lastTestDate = new Date(sortedDesc[0].completed_at!);
      const daysSince = Math.floor((Date.now() - lastTestDate.getTime()) / 86400000);
      const daysUntilRetest = Math.max(0, RETEST_INTERVAL_DAYS - daysSince);
      const retestAvailable = daysSince >= RETEST_INTERVAL_DAYS;
      const retestProgressPercent = Math.min(100, Math.round((daysSince / RETEST_INTERVAL_DAYS) * 100));

      // Score comparisons
      let scoreComparisons: ScoreComparison[] = [];
      if (sortedDesc.length >= 2) {
        const { data: results } = await supabase
          .from('diagnostic_results')
          .select('session_id, all_scores')
          .in('session_id', [sortedDesc[0].id, sortedDesc[1].id]);

        if (results && results.length >= 2) {
          const curr = results.find(r => r.session_id === sortedDesc[0].id);
          const prev = results.find(r => r.session_id === sortedDesc[1].id);
          if (curr?.all_scores && prev?.all_scores) {
            const cScores = curr.all_scores as unknown as { key: string; label: string; percentage: number }[];
            const pScores = prev.all_scores as unknown as { key: string; label: string; percentage: number }[];
            const pMap = new Map(pScores.map(s => [s.key, s]));
            scoreComparisons = cScores.map(c => {
              const p = pMap.get(c.key);
              return { key: c.key, label: c.label || c.key, current: c.percentage, previous: p?.percentage ?? c.percentage, delta: c.percentage - (p?.percentage ?? c.percentage) };
            }).sort((a, b) => a.delta - b.delta);
          }
        }
      }

      // Fetch all results for badges
      const sessionIds = sessions.map(s => s.id);
      const { data: allResults } = await supabase
        .from('diagnostic_results')
        .select('session_id, all_scores')
        .in('session_id', sessionIds);

      // Badge: improvement check
      let hasImprovement = false;
      const moduleResults: Record<string, { first: any[]; last: any[] }> = {};
      sessions.forEach(s => {
        if (!s.test_module_id) return;
        const result = (allResults || []).find(r => r.session_id === s.id);
        if (!result) return;
        const scores = (result.all_scores as any[]) || [];
        if (!moduleResults[s.test_module_id]) moduleResults[s.test_module_id] = { first: scores, last: scores };
        else moduleResults[s.test_module_id].last = scores;
      });
      for (const mod of Object.values(moduleResults)) {
        if (mod.first !== mod.last) {
          for (const ls of mod.last) {
            const fs = mod.first.find((s: any) => s.key === ls.key);
            if (fs && ls.percentage < fs.percentage) { hasImprovement = true; break; }
          }
        }
        if (hasImprovement) break;
      }

      // Badge: conflict
      let hasConflict = false;
      for (const result of (allResults || [])) {
        const scores = (result.all_scores as any[]) || [];
        if (scores.filter((s: any) => s.percentage >= 65).length >= 2) { hasConflict = true; break; }
      }

      // Total active modules for coverage
      const { count: totalModulesCount } = await supabase
        .from('test_modules')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true);

      const allModulesCompleted = totalModulesCount ? uniqueModules >= totalModulesCount : false;

      // Badges
      const badges: PersonBadge[] = [
        { id: 'first_reading', emoji: '🥇', name: 'Primeiro Raio-X', description: 'Completou primeira leitura', unlocked: totalTests >= 1 },
        { id: 'pattern_revealed', emoji: '🔄', name: 'Padrão Revelado', description: '3 leituras diferentes', unlocked: uniqueModules >= 3 },
        { id: 'evolving', emoji: '📈', name: 'Em Evolução', description: 'Score melhorou no reteste', unlocked: hasImprovement },
        { id: 'complete_map', emoji: '🧠', name: 'Mapa Completo', description: 'Todos os módulos completados', unlocked: allModulesCompleted },
        { id: 'four_weeks', emoji: '🔥', name: '4 Semanas Seguidas', description: 'Streak de 4 semanas', unlocked: longestStreak >= 4 },
        { id: 'blind_spot', emoji: '💡', name: 'Ponto Cego', description: 'Conflito interno detectado', unlocked: hasConflict },
      ];

      // Global score
      let awareness = 50;
      if (allResults && allResults.length > 0) {
        const latestResult = allResults.find(r => r.session_id === sortedDesc[0].id);
        if (latestResult?.all_scores) {
          const scores = (latestResult.all_scores as any[]).map((s: any) => s.percentage);
          if (scores.length > 0) {
            const avg = scores.reduce((a: number, b: number) => a + b, 0) / scores.length;
            awareness = Math.round(Math.max(0, Math.min(100, 100 - avg)));
          }
        }
      }
      const consistency = Math.min(Math.round((currentStreak / 8) * 100), 100);
      const totalMods = totalModulesCount || 1;
      const coverage = Math.min(Math.round((uniqueModules / totalMods) * 100), 100);
      let recency = 0;
      const daysSinceLast = Math.floor((Date.now() - lastTestDate.getTime()) / 86400000);
      recency = Math.max(0, Math.round(100 - (daysSinceLast / 30) * 100));

      const globalScore = Math.round(awareness * 0.4 + consistency * 0.25 + coverage * 0.2 + recency * 0.15);

      setData({
        loading: false,
        globalScore: Math.max(0, Math.min(100, globalScore)),
        scoreBreakdown: { awareness, consistency, coverage, recency },
        currentStreak, longestStreak, streakActive,
        totalXP, ...levelInfo,
        lastTestDate, daysSinceLastTest: daysSince,
        daysUntilRetest, retestAvailable, retestProgressPercent,
        scoreComparisons,
        badges, unlockedBadges: badges.filter(b => b.unlocked).length,
        totalTests, uniqueModules,
      });
    };

    compute();
  }, [userId, personId]);

  return data;
}
