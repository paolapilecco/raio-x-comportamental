import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface GamificationData {
  // Streak
  currentStreak: number; // weeks in a row
  longestStreak: number;
  lastActivityDate: string | null;
  streakActive: boolean; // did something this week?

  // XP & Level
  totalXP: number;
  level: number;
  levelName: string;
  levelProgress: number; // 0-100 within current level
  xpToNextLevel: number;

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

      setData({
        currentStreak,
        longestStreak,
        lastActivityDate: lastSession.completed_at,
        streakActive,
        totalXP,
        ...levelInfo,
        totalTests,
        uniqueModules,
        loading: false,
      });
    };

    compute();
  }, [userId]);

  return data;
}
