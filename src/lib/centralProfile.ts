import { supabase } from '@/integrations/supabase/client';
import { patternDefinitions } from '@/data/patterns';
import type { PatternKey } from '@/types/diagnostic';

interface ScoreEntry {
  key: string;
  label: string;
  score: number;
  maxScore: number;
  percentage: number;
}

export async function updateCentralProfile(userId: string) {
  // Fetch all completed sessions with results
  const { data: sessions } = await supabase
    .from('diagnostic_sessions')
    .select('id, completed_at')
    .eq('user_id', userId)
    .not('completed_at', 'is', null)
    .order('completed_at', { ascending: false });

  if (!sessions || sessions.length === 0) return;

  const { data: results } = await supabase
    .from('diagnostic_results')
    .select('*')
    .in('session_id', sessions.map(s => s.id));

  if (!results || results.length === 0) return;

  // Aggregate scores across all tests (weighted toward recent)
  const allPatternScores: Record<string, { total: number; count: number; weight: number }> = {};

  results.forEach((result, index) => {
    const recencyWeight = 1 + (results.length - index) * 0.2; // more recent = higher weight
    const scores = (result.all_scores as unknown as ScoreEntry[]) || [];
    scores.forEach((s) => {
      if (!allPatternScores[s.key]) {
        allPatternScores[s.key] = { total: 0, count: 0, weight: 0 };
      }
      allPatternScores[s.key].total += s.percentage * recencyWeight;
      allPatternScores[s.key].weight += recencyWeight;
      allPatternScores[s.key].count += 1;
    });
  });

  // Calculate weighted averages
  const aggregatedScores: Record<string, number> = {};
  Object.entries(allPatternScores).forEach(([key, val]) => {
    aggregatedScores[key] = Math.round(val.total / val.weight);
  });

  // Find dominant patterns (sorted by score)
  const sortedPatterns = Object.entries(aggregatedScores)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([key, score]) => ({ key, score }));

  const dominantKey = sortedPatterns[0]?.key as PatternKey;
  const dominantDef = patternDefinitions[dominantKey];

  // Latest result for mental state
  const latestResult = results[0];

  const profileData = {
    user_id: userId,
    dominant_patterns: sortedPatterns,
    aggregated_scores: aggregatedScores,
    tests_completed: sessions.length,
    mental_state: latestResult.mental_state,
    core_pain: dominantDef?.corePain || null,
    key_unlock_area: dominantDef?.keyUnlockArea || null,
    profile_name: dominantDef?.profileName || latestResult.profile_name,
    last_test_at: sessions[0].completed_at,
  };

  // Upsert central profile
  const { data: existing } = await supabase
    .from('user_central_profile')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle();

  if (existing) {
    await supabase
      .from('user_central_profile')
      .update(profileData)
      .eq('user_id', userId);
  } else {
    await supabase
      .from('user_central_profile')
      .insert(profileData);
  }
}
