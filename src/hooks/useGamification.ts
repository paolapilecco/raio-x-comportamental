import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface GamificationData {
  // Streak
  currentStreak: number;
  longestStreak: number;
  lastActivityDate: string | null;
  streakActive: boolean;

  // XP & Level
  totalXP: number;
  level: number;
  levelName: string;
  levelProgress: number;
  xpToNextLevel: number;

  // Global Score (0-100)
  globalScore: number;
  scoreBreakdown: {
    awareness: number;    // from aggregated behavioral scores (inverted)
    consistency: number;  // from streak
    coverage: number;     // from module diversity
    recency: number;      // from activity recency
  };

  // Stats
  totalTests: number;
  uniqueModules: number;
  loading: boolean;
}

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
  // ISO week: Monday-based
  const day = d.getDay() || 7;
  d.setDate(d.getDate() + 4 - day);
  const yearStart = new Date(d.getFullYear(), 0, 1);
  const weekNum = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;
}

function getCurrentWeekKey(): string {
  return getWeekKey(new Date());
}

function getPreviousWeekKey(weekKey: string): string {
  // Parse year and week number
  const [yearStr, weekStr] = weekKey.split('-W');
  let year = parseInt(yearStr);
  let week = parseInt(weekStr);
  week -= 1;
  if (week < 1) {
    year -= 1;
    week = 52; // approximate
  }
  return `${year}-W${String(week).padStart(2, '0')}`;
}

function getLevelInfo(xp: number) {
  let currentLevel = LEVELS[0];
  let nextLevel = LEVELS[1];

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
  const xpToNext = nextLevel ? nextLevel.minXP - xp : 0;

  return {
    level: levelIndex + 1,
    levelName: currentLevel.name,
    levelProgress: progress,
    xpToNextLevel: xpToNext,
  };
}

export function useGamification(userId: string | undefined): GamificationData {
  const [data, setData] = useState<GamificationData>({
    currentStreak: 0,
    longestStreak: 0,
    lastActivityDate: null,
    streakActive: false,
    totalXP: 0,
    level: 1,
    levelName: 'Iniciante',
    levelProgress: 0,
    xpToNextLevel: 100,
    globalScore: 0,
    scoreBreakdown: { awareness: 0, consistency: 0, coverage: 0, recency: 0 },
    totalTests: 0,
    uniqueModules: 0,
    loading: true,
  });

  useEffect(() => {
    if (!userId) return;

    const compute = async () => {
      const { data: sessions } = await supabase
        .from('diagnostic_sessions')
        .select('id, completed_at, test_module_id')
        .eq('user_id', userId)
        .not('completed_at', 'is', null)
        .order('completed_at', { ascending: true });

      if (!sessions || sessions.length === 0) {
        setData(prev => ({ ...prev, loading: false }));
        return;
      }

      const totalTests = sessions.length;
      const uniqueModuleIds = new Set(sessions.map(s => s.test_module_id).filter(Boolean));
      const uniqueModules = uniqueModuleIds.size;

      // Calculate weekly activity for streak
      const weeklyActivity = new Set<string>();
      sessions.forEach(s => {
        if (s.completed_at) {
          weeklyActivity.add(getWeekKey(new Date(s.completed_at)));
        }
      });

      // Calculate current streak (consecutive weeks ending at current or last week)
      const currentWeek = getCurrentWeekKey();
      const streakActive = weeklyActivity.has(currentWeek);

      let streakStart = streakActive ? currentWeek : getPreviousWeekKey(currentWeek);
      let currentStreak = 0;

      // Only start counting if the start week has activity
      if (weeklyActivity.has(streakStart)) {
        let checkWeek = streakStart;
        while (weeklyActivity.has(checkWeek)) {
          currentStreak++;
          checkWeek = getPreviousWeekKey(checkWeek);
        }
      }

      // Longest streak
      const sortedWeeks = Array.from(weeklyActivity).sort();
      let longestStreak = 0;
      let tempStreak = 0;
      let prevWeek = '';

      for (const week of sortedWeeks) {
        if (prevWeek && getPreviousWeekKey(week) === prevWeek) {
          tempStreak++;
        } else {
          tempStreak = 1;
        }
        longestStreak = Math.max(longestStreak, tempStreak);
        prevWeek = week;
      }

      // Calculate XP
      const testXP = totalTests * XP_PER_TEST;
      const moduleXP = uniqueModules * XP_PER_UNIQUE_MODULE;
      const streakXP = currentStreak * XP_PER_STREAK_WEEK;
      const totalXP = testXP + moduleXP + streakXP;

      const levelInfo = getLevelInfo(totalXP);
      const lastSession = sessions[sessions.length - 1];

      // Fetch aggregated scores for global score calculation
      const { data: centralProfile } = await supabase
        .from('user_central_profile')
        .select('aggregated_scores')
        .eq('user_id', userId)
        .maybeSingle();

      // Fetch total active modules for coverage
      const { count: totalModulesCount } = await supabase
        .from('test_modules')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true);

      // Global Score calculation (0-100)
      // 1. Awareness (40%): inverted avg of behavioral scores (lower patterns = better awareness)
      let awareness = 50; // default neutral
      if (centralProfile?.aggregated_scores) {
        const scores = Object.values(centralProfile.aggregated_scores as Record<string, number>);
        if (scores.length > 0) {
          const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
          // Invert: lower avg pattern score = higher awareness
          awareness = Math.round(Math.max(0, Math.min(100, 100 - avg)));
        }
      }

      // 2. Consistency (25%): based on streak (cap at 8 weeks = 100%)
      const consistency = Math.min(Math.round((currentStreak / 8) * 100), 100);

      // 3. Coverage (20%): modules completed / total modules
      const totalMods = totalModulesCount || 1;
      const coverage = Math.min(Math.round((uniqueModules / totalMods) * 100), 100);

      // 4. Recency (15%): days since last activity (0 days = 100%, 30+ days = 0%)
      let recency = 0;
      if (lastSession.completed_at) {
        const daysSince = Math.floor((Date.now() - new Date(lastSession.completed_at).getTime()) / 86400000);
        recency = Math.max(0, Math.round(100 - (daysSince / 30) * 100));
      }

      const globalScore = Math.round(
        awareness * 0.4 + consistency * 0.25 + coverage * 0.2 + recency * 0.15
      );

      setData({
        currentStreak,
        longestStreak,
        lastActivityDate: lastSession.completed_at,
        streakActive,
        totalXP,
        ...levelInfo,
        globalScore: Math.max(0, Math.min(100, globalScore)),
        scoreBreakdown: { awareness, consistency, coverage, recency },
        totalTests,
        uniqueModules,
        loading: false,
      });
    };

    compute();
  }, [userId]);

  return data;
}
