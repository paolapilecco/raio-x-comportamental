import { useEffect, useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useDiagnosticSessions } from '@/hooks/useDiagnosticSessions';
import { useNavigate } from 'react-router-dom';
import { Brain, History, Lock, ArrowRight, TrendingUp, Shield, Zap, Heart, CheckCircle2, X, Crown, Flame, Star, Trophy, Gauge } from 'lucide-react';
import { InactivityAlertCard } from '@/components/dashboard/InactivityAlertCard';
import { useGamification } from '@/hooks/useGamification';
import { useRetestCycle } from '@/hooks/useRetestCycle';
import { useActionPlan } from '@/hooks/useActionPlan';
import { RetestCycleCard } from '@/components/dashboard/RetestCycleCard';
import { ActionPlanCard } from '@/components/dashboard/ActionPlanCard';
import { usePatternDefinitions } from '@/hooks/usePatternDefinitions';
import { useRetestConfig } from '@/hooks/useRetestConfig';
import { useAxisLabels } from '@/hooks/useAxisLabels';
import { generateDiagnosticPdf, PdfEvolutionData } from '@/lib/generatePdf';
import { generateLifeMapPdf } from '@/lib/generateLifeMapPdf';
import { toast } from 'sonner';
import { AppLayout } from '@/components/AppLayout';
import { DashboardSkeleton } from '@/components/skeletons/DashboardSkeleton';
import type { PatternKey, PatternDefinition, DiagnosticResult, IntensityLevel } from '@/types/diagnostic';

interface StoredResult {
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

interface CentralProfile {
  dominant_patterns: { key: string; score: number }[];
  aggregated_scores: Record<string, number>;
  tests_completed: number;
  mental_state: string | null;
  core_pain: string | null;
  key_unlock_area: string | null;
  profile_name: string | null;
  last_test_at: string | null;
}

const iconMap: Record<string, any> = { brain: Brain, zap: Zap, shield: Shield, heart: Heart };

interface TestModule {
  id: string;
  slug: string;
  name: string;
  description: string;
  icon: string;
  question_count: number;
}

const intensityLabel: Record<string, string> = { leve: 'Leve', moderado: 'Moderado', alto: 'Alto' };
const intensityColor: Record<string, string> = { leve: 'hsl(152, 45%, 42%)', moderado: 'hsl(var(--gold))', alto: 'hsl(0, 65%, 52%)' };


const fadeIn = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] },
};

const Dashboard = () => {
  const { user, profile, role, isPremium, isSuperAdmin, previewMode, togglePreviewMode } = useAuth();
  const { data: patternDefinitions } = usePatternDefinitions();
  useAxisLabels(); // kept for hook stability
  const navigate = useNavigate();
  const [latestResult, setLatestResult] = useState<StoredResult | null>(null);
  const [centralProfile, setCentralProfile] = useState<CentralProfile | null>(null);
  const [generating, setGenerating] = useState(false);
  const [modules, setModules] = useState<TestModule[]>([]);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [latestModuleId, setLatestModuleId] = useState<string | null>(null);
  const [extraLoading, setExtraLoading] = useState(true);

  const { sessions, completedModuleIds: completedModules, latestSession, loading: sessionsLoading } = useDiagnosticSessions(user?.id, { fetchResults: false });
  const sessionCount = sessions.length;
  const loading = sessionsLoading || extraLoading;
  const gamification = useGamification(user?.id);
  const retestCycle = useRetestCycle(user?.id);
  const actionPlan = useActionPlan(user?.id);
  const retestConfig = useRetestConfig();

  const inactiveModules = useMemo(() => {
    if (!sessions.length || !modules.length) return [];
    if (!retestConfig.retest_enabled || !retestConfig.dashboard_alert_enabled) return [];
    const now = Date.now();
    const INACTIVITY_THRESHOLD = retestConfig.retest_days_threshold * 24 * 60 * 60 * 1000;
    const latestByModule = new Map<string, Date>();
    for (const s of sessions) {
      if (!s.test_module_id || !s.completed_at) continue;
      const d = new Date(s.completed_at);
      const prev = latestByModule.get(s.test_module_id);
      if (!prev || d > prev) latestByModule.set(s.test_module_id, d);
    }
    const result: { moduleId: string; moduleName: string; moduleSlug: string; daysSinceLastTest: number }[] = [];
    for (const [modId, lastDate] of latestByModule) {
      const diff = now - lastDate.getTime();
      if (diff >= INACTIVITY_THRESHOLD) {
        const mod = modules.find(m => m.id === modId);
        if (mod) {
          result.push({
            moduleId: modId,
            moduleName: mod.name,
            moduleSlug: mod.slug,
            daysSinceLastTest: Math.floor(diff / (24 * 60 * 60 * 1000)),
          });
        }
      }
    }
    return result.sort((a, b) => b.daysSinceLastTest - a.daysSinceLastTest);
  }, [sessions, modules, retestConfig]);
  const generateTestData = async () => {
    if (!user || role !== 'super_admin') return;
    setGenerating(true);
    try {
      const { data: session, error: sessionErr } = await supabase
        .from('diagnostic_sessions')
        .insert({ user_id: user.id, completed_at: new Date().toISOString() })
        .select('id')
        .single();
      if (sessionErr || !session) throw sessionErr;

      const mockScores = [
        { key: 'unstable_execution', label: 'Execução Instável', percentage: 72 },
        { key: 'emotional_self_sabotage', label: 'Autossabotagem Emocional', percentage: 65 },
        { key: 'functional_overload', label: 'Sobrecarga Funcional', percentage: 48 },
        { key: 'discomfort_escape', label: 'Fuga do Desconforto', percentage: 58 },
        { key: 'paralyzing_perfectionism', label: 'Perfeccionismo Paralisante', percentage: 41 },
        { key: 'validation_dependency', label: 'Dependência de Validação', percentage: 53 },
        { key: 'excessive_self_criticism', label: 'Autocrítica Excessiva', percentage: 67 },
        { key: 'low_routine_sustenance', label: 'Baixa Sustentação de Rotina', percentage: 74 },
      ];

      await supabase.from('diagnostic_results').insert({
        session_id: session.id,
        dominant_pattern: 'unstable_execution',
        secondary_patterns: ['excessive_self_criticism', 'low_routine_sustenance'],
        intensity: 'alto',
        profile_name: 'O Velocista sem Linha de Chegada',
        mental_state: 'Você vive em um estado de entusiasmo intermitente seguido de esgotamento.',
        state_summary: 'Seu funcionamento atual alterna entre picos de energia e quedas abruptas.',
        mechanism: 'A energia inicial vem de um impulso emocional, não de uma estrutura real.',
        triggers: ['Perda da novidade', 'Resultados que demoram', 'Baixa energia', 'Sem feedback'],
        traps: ['"Quando eu estiver motivado, eu retomo"', '"Talvez não era para mim"'],
        self_sabotage_cycle: ['Ideia nova', 'Energia inicial', 'Desconforto', 'Motivação cai', 'Abandono', 'Culpa'],
        blocking_point: 'Quando a ação deixa de ser estimulante e passa a exigir disciplina.',
        contradiction: 'Quer resultados consistentes, mas opera em ciclos de intensidade e abandono.',
        life_impact: [
          { pillar: 'Carreira', impact: 'Projetos abandonados antes de gerar resultados.' },
          { pillar: 'Saúde', impact: 'Dietas e exercícios duram dias ou semanas.' },
        ],
        exit_strategy: [{ step: 'Meta micro por dia', detail: 'Reduza ao mínimo viável.' }],
        all_scores: mockScores,
        direction: 'Sustentação da ação após o desaparecimento da motivação inicial.',
        combined_title: 'Execução Instável + Autocrítica Excessiva',
      });

      const aggregated: Record<string, number> = {};
      mockScores.forEach(s => { aggregated[s.key] = s.percentage; });

      const { data: existing } = await supabase.from('user_central_profile').select('id').eq('user_id', user.id).maybeSingle();
      const profileData = {
        dominant_patterns: [{ key: 'unstable_execution', score: 72 }, { key: 'low_routine_sustenance', score: 74 }],
        aggregated_scores: aggregated,
        tests_completed: 1,
        last_test_at: new Date().toISOString(),
        mental_state: 'Entusiasmo intermitente seguido de esgotamento',
        core_pain: 'Sensação constante de que nunca termina nada',
        key_unlock_area: 'Sustentação da ação pós-motivação inicial',
        profile_name: 'O Velocista sem Linha de Chegada',
      };
      if (existing) {
        await supabase.from('user_central_profile').update(profileData).eq('user_id', user.id);
      } else {
        await supabase.from('user_central_profile').insert({ user_id: user.id, ...profileData });
      }

      toast.success('Dados de teste gerados com sucesso');
      window.location.reload();
    } catch (err) {
      console.error(err);
      toast.error('Erro ao gerar dados de teste');
    } finally {
      setGenerating(false);
    }
  };

  useEffect(() => {
    if (!user || sessionsLoading) return;
    const fetchExtra = async () => {
      try {
        const [cpRes, modulesRes] = await Promise.all([
          supabase.from('user_central_profile').select('*').eq('user_id', user.id).maybeSingle(),
          supabase.from('test_modules').select('id, slug, name, description, icon, question_count').eq('is_active', true).order('sort_order'),
        ]);

        if (cpRes.data) {
          const cp = cpRes.data;
          setCentralProfile({
            dominant_patterns: (cp.dominant_patterns as unknown as { key: string; score: number }[]) || [],
            aggregated_scores: (cp.aggregated_scores as unknown as Record<string, number>) || {},
            tests_completed: cp.tests_completed,
            mental_state: cp.mental_state,
            core_pain: cp.core_pain,
            key_unlock_area: cp.key_unlock_area,
            profile_name: cp.profile_name,
            last_test_at: cp.last_test_at,
          });
        }

        setModules((modulesRes.data as TestModule[]) || []);

        if (latestSession) {
          setLatestModuleId(latestSession.test_module_id || null);
          const { data: result } = await supabase.from('diagnostic_results').select('*').eq('session_id', latestSession.id).maybeSingle();
          setLatestResult(result);
        }
      } catch (err) {
        console.error('Error loading dashboard data:', err);
        toast.error('Erro ao carregar dados. Tente recarregar a página.');
      } finally {
        setExtraLoading(false);
      }
    };
    fetchExtra();
  }, [user, sessionsLoading, latestSession]);

  const handleDownloadPdf = async () => {
    if (!latestResult) return;

    // Check if latest result is from "Mapa de Vida" module
    const latestModule = modules.find(m => m.id === latestModuleId);
    if (latestModule?.slug === 'mapa-de-vida') {
      generateLifeMapPdf((latestResult.all_scores as any[]) || [], profile?.name);
      return;
    }

    const dominantDef = patternDefinitions?.[latestResult.dominant_pattern as PatternKey];
    const secondaryDefs = (latestResult.secondary_patterns || []).map(k => patternDefinitions?.[k as PatternKey]).filter(Boolean);
    const diagResult: DiagnosticResult = {
      dominantPattern: dominantDef!,
      secondaryPatterns: secondaryDefs as PatternDefinition[],
      intensity: latestResult.intensity as IntensityLevel,
      allScores: (latestResult.all_scores as any[]) || [],
      summary: latestResult.state_summary,
      mechanism: latestResult.mechanism,
      contradiction: latestResult.contradiction,
      impact: latestResult.impact || dominantDef?.impact || '',
      direction: latestResult.direction,
      combinedTitle: latestResult.combined_title,
      profileName: latestResult.profile_name,
      mentalState: latestResult.mental_state,
      triggers: latestResult.triggers || [],
      mentalTraps: latestResult.traps || [],
      selfSabotageCycle: latestResult.self_sabotage_cycle || [],
      blockingPoint: latestResult.blocking_point,
      lifeImpact: (latestResult.life_impact as any[]) || [],
      exitStrategy: (latestResult.exit_strategy as any[]) || [],
      corePain: latestResult.core_pain || dominantDef?.corePain || '',
      keyUnlockArea: latestResult.key_unlock_area || dominantDef?.keyUnlockArea || '',
      criticalDiagnosis: latestResult.critical_diagnosis || dominantDef?.criticalDiagnosis || '',
      whatNotToDo: latestResult.what_not_to_do || dominantDef?.whatNotToDo || [],
    };

    // Fetch action plan tracking
    let extras: PdfEvolutionData | undefined;
    if (user) {
      try {
        const { data: tracking } = await supabase
          .from('action_plan_tracking')
          .select('completed, day_number, action_text')
          .eq('user_id', user.id)
          .eq('diagnostic_result_id', latestResult.id)
          .order('day_number');
        if (tracking && tracking.length > 0) {
          const completed = tracking.filter(t => t.completed).length;
          let streak = 0;
          const sorted = [...tracking].sort((a, b) => a.day_number - b.day_number);
          for (let i = sorted.length - 1; i >= 0; i--) {
            if (sorted[i].completed) streak++;
            else break;
          }
          // Extract unique action texts for PDF
          const seen = new Set<string>();
          const uniqueTexts: string[] = [];
          for (const row of tracking) {
            if (!seen.has(row.action_text) && uniqueTexts.length < 3) {
              seen.add(row.action_text);
              uniqueTexts.push(row.action_text);
            }
          }
          extras = {
            actionPlanStatus: {
              total_days: tracking.length,
              completed_days: completed,
              execution_rate: Math.round((completed / tracking.length) * 100),
              current_streak: streak,
            },
            actionTexts: uniqueTexts,
          };
        }
      } catch { /* ignore */ }
    }

    generateDiagnosticPdf(diagResult, profile?.name, extras);
  };

  if (loading) {
    return <DashboardSkeleton />;
  }

  const displayName = profile?.name?.split(' ')[0] || user?.email?.split('@')[0] || 'Usuário';
  const hasData = !!latestResult || (centralProfile && centralProfile.tests_completed > 0);

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 md:px-10 py-6 sm:py-10 space-y-8 sm:space-y-10">

        {/* Hero greeting */}
        <motion.section {...fadeIn} className="space-y-2">
          <h1 className="text-2xl sm:text-3xl md:text-[2.5rem] font-semibold tracking-tight text-foreground leading-tight">
            Bem-vindo, {displayName}.
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground leading-relaxed max-w-xl">
            Avalie perfis comportamentais detalhados com base em suas respostas, {displayName}.
          </p>
        </motion.section>

        {/* Score Global de Evolução */}
        {!gamification.loading && gamification.totalTests > 0 && (
          <motion.section {...fadeIn} transition={{ ...fadeIn.transition, delay: 0.03 }}>
            <div className="bg-card rounded-2xl border border-border/30 shadow-[0_1px_3px_0_rgb(0_0_0/0.04)] p-6 sm:p-8">
              <div className="flex flex-col sm:flex-row items-center gap-6 sm:gap-8">
                {/* Circular score indicator */}
                <div className="relative w-28 h-28 sm:w-32 sm:h-32 shrink-0">
                  <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
                    <circle cx="60" cy="60" r="52" fill="none" stroke="hsl(var(--muted)/0.15)" strokeWidth="8" />
                    <motion.circle
                      cx="60" cy="60" r="52"
                      fill="none"
                      stroke={
                        gamification.globalScore >= 70 ? 'hsl(152, 45%, 42%)' :
                        gamification.globalScore >= 40 ? 'hsl(var(--gold))' :
                        'hsl(0, 65%, 52%)'
                      }
                      strokeWidth="8"
                      strokeLinecap="round"
                      strokeDasharray={`${2 * Math.PI * 52}`}
                      initial={{ strokeDashoffset: 2 * Math.PI * 52 }}
                      animate={{ strokeDashoffset: 2 * Math.PI * 52 * (1 - gamification.globalScore / 100) }}
                      transition={{ delay: 0.5, duration: 1.5, ease: [0.22, 1, 0.36, 1] }}
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <motion.span
                      className="text-3xl sm:text-4xl font-bold tabular-nums text-foreground"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.8 }}
                    >
                      {gamification.globalScore}
                    </motion.span>
                    <span className="text-[0.55rem] uppercase tracking-[0.15em] text-muted-foreground font-semibold">de 100</span>
                  </div>
                </div>

                {/* Score details */}
                <div className="flex-1 w-full space-y-3">
                  <div className="flex items-center gap-2.5 mb-1">
                    <Gauge className="w-4 h-4 text-primary" />
                    <h3 className="text-base font-semibold text-foreground">Score de Evolução</h3>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed mb-3">
                    Quanto maior, mais consciente e consistente é seu processo de autoconhecimento.
                  </p>

                  {/* Breakdown bars */}
                  <div className="space-y-2">
                    {[
                      { label: 'Autoconsciência', value: gamification.scoreBreakdown.awareness, weight: '40%' },
                      { label: 'Consistência', value: gamification.scoreBreakdown.consistency, weight: '25%' },
                      { label: 'Cobertura', value: gamification.scoreBreakdown.coverage, weight: '20%' },
                      { label: 'Atividade', value: gamification.scoreBreakdown.recency, weight: '15%' },
                    ].map((item) => (
                      <div key={item.label} className="flex items-center gap-3">
                        <span className="text-[0.65rem] text-muted-foreground w-28 shrink-0">{item.label}</span>
                        <div className="flex-1 h-1.5 bg-muted/20 rounded-full overflow-hidden">
                          <motion.div
                            className="h-full rounded-full bg-primary/70"
                            initial={{ width: 0 }}
                            animate={{ width: `${item.value}%` }}
                            transition={{ delay: 0.7, duration: 1, ease: [0.22, 1, 0.36, 1] }}
                          />
                        </div>
                        <span className="text-[0.6rem] text-muted-foreground/50 w-8 text-right tabular-nums">{item.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </motion.section>
        )}

        {/* Gamification: Streak + Level */}
        {!gamification.loading && gamification.totalTests > 0 && (
          <motion.section {...fadeIn} transition={{ ...fadeIn.transition, delay: 0.05 }}>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Streak */}
              <div className="bg-card rounded-2xl p-5 border border-border/30 shadow-[0_1px_3px_0_rgb(0_0_0/0.04)] relative overflow-hidden">
                <div className="flex items-center gap-2.5 mb-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                    gamification.streakActive ? 'bg-orange-500/10' : 'bg-muted/50'
                  }`}>
                    <Flame className={`w-[18px] h-[18px] ${gamification.streakActive ? 'text-orange-500' : 'text-muted-foreground/40'}`} />
                  </div>
                  <div>
                    <p className="text-[0.65rem] uppercase tracking-[0.1em] text-muted-foreground font-semibold">Streak</p>
                  </div>
                </div>
                <div className="flex items-baseline gap-1.5">
                  <span className={`text-2xl font-bold tabular-nums ${gamification.streakActive ? 'text-orange-500' : 'text-muted-foreground'}`}>
                    {gamification.currentStreak}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {gamification.currentStreak === 1 ? 'semana' : 'semanas'}
                  </span>
                </div>
                {gamification.streakActive && gamification.currentStreak > 0 && (
                  <div className="flex gap-0.5 mt-2">
                    {Array.from({ length: Math.min(gamification.currentStreak, 8) }).map((_, i) => (
                      <div key={i} className="w-2 h-2 rounded-full bg-orange-500/80" />
                    ))}
                  </div>
                )}
                {!gamification.streakActive && gamification.totalTests > 0 && (
                  <p className="text-[0.65rem] text-muted-foreground/60 mt-2">Faça uma leitura esta semana!</p>
                )}
              </div>

              {/* Level */}
              <div className="bg-card rounded-2xl p-5 border border-border/30 shadow-[0_1px_3px_0_rgb(0_0_0/0.04)]">
                <div className="flex items-center gap-2.5 mb-3">
                  <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Star className="w-[18px] h-[18px] text-primary" />
                  </div>
                  <div>
                    <p className="text-[0.65rem] uppercase tracking-[0.1em] text-muted-foreground font-semibold">Nível</p>
                  </div>
                </div>
                <p className="text-lg font-bold text-foreground">{gamification.levelName}</p>
                <div className="mt-2 space-y-1">
                  <div className="w-full h-1.5 rounded-full bg-secondary/60">
                    <div
                      className="h-full rounded-full bg-primary transition-all duration-700"
                      style={{ width: `${gamification.levelProgress}%` }}
                    />
                  </div>
                  <p className="text-[0.6rem] text-muted-foreground/60">
                    {gamification.xpToNextLevel > 0 ? `${gamification.xpToNextLevel} XP para próximo nível` : 'Nível máximo!'}
                  </p>
                </div>
              </div>

              {/* XP Total */}
              <div className="bg-card rounded-2xl p-5 border border-border/30 shadow-[0_1px_3px_0_rgb(0_0_0/0.04)]">
                <div className="flex items-center gap-2.5 mb-3">
                  <div className="w-9 h-9 rounded-xl bg-accent/10 flex items-center justify-center">
                    <Zap className="w-[18px] h-[18px] text-accent" />
                  </div>
                  <div>
                    <p className="text-[0.65rem] uppercase tracking-[0.1em] text-muted-foreground font-semibold">XP Total</p>
                  </div>
                </div>
                <span className="text-2xl font-bold text-foreground tabular-nums">{gamification.totalXP}</span>
                <p className="text-[0.6rem] text-muted-foreground/60 mt-1">
                  {gamification.totalTests} {gamification.totalTests === 1 ? 'leitura' : 'leituras'} · {gamification.uniqueModules} {gamification.uniqueModules === 1 ? 'módulo' : 'módulos'}
                </p>
              </div>

              {/* Best Streak */}
              <div className="bg-card rounded-2xl p-5 border border-border/30 shadow-[0_1px_3px_0_rgb(0_0_0/0.04)]">
                <div className="flex items-center gap-2.5 mb-3">
                  <div className="w-9 h-9 rounded-xl bg-gold/10 flex items-center justify-center">
                    <Trophy className="w-[18px] h-[18px] text-gold" />
                  </div>
                  <div>
                    <p className="text-[0.65rem] uppercase tracking-[0.1em] text-muted-foreground font-semibold">Recorde</p>
                  </div>
                </div>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl font-bold text-foreground tabular-nums">{gamification.longestStreak}</span>
                  <span className="text-xs text-muted-foreground">
                    {gamification.longestStreak === 1 ? 'semana' : 'semanas'}
                  </span>
                </div>
                <p className="text-[0.6rem] text-muted-foreground/60 mt-1">Melhor sequência</p>
              </div>
            </div>
          </motion.section>
        )}

        {/* Retest Cycle - 15 days */}
        {!retestCycle.loading && retestCycle.lastTestDate && (
          <RetestCycleCard retest={retestCycle} />
        )}

        {/* Inactivity Alert */}
        {!loading && inactiveModules.length > 0 && (
          <InactivityAlertCard inactiveModules={inactiveModules} userId={user?.id} />
        )}

        {/* Action Plan Tracking */}
        {!actionPlan.loading && actionPlan.days.length > 0 && (
          <motion.section {...fadeIn} transition={{ ...fadeIn.transition, delay: 0.08 }}>
            {(isPremium || isSuperAdmin) ? (
              <ActionPlanCard plan={actionPlan} />
            ) : (
              <div className="bg-card rounded-2xl border border-destructive/20 shadow-[0_1px_3px_0_rgb(0_0_0/0.04)] overflow-hidden">
                <div className="px-6 py-5 border-b border-destructive/10 bg-destructive/[0.03]">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-destructive/10 flex items-center justify-center">
                      <Lock className="w-[18px] h-[18px] text-destructive" />
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-foreground">Você já sabe o que está errado.</h3>
                      <p className="text-[0.65rem] text-destructive/80 font-medium">Mas continua fazendo igual.</p>
                    </div>
                  </div>
                </div>
                <div className="px-6 py-5 space-y-4">
                  <p className="text-sm text-foreground/90 font-bold leading-relaxed">
                    Sem execução, nada muda.
                  </p>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Seu diagnóstico já revelou o padrão. As ações já estão prontas. Cada dia sem agir fortalece exatamente o que te trava.
                  </p>
                  <p className="text-[11px] text-muted-foreground/70 text-center">
                    +32.847 mulheres já estão executando esse plano
                  </p>
                  <div className="border-t border-destructive/10 pt-3">
                    <p className="text-xs text-destructive/80 text-center font-medium leading-relaxed mb-3">
                      Se você não fizer isso, daqui 30 dias você ainda vai estar no mesmo padrão.
                    </p>
                    <button
                      onClick={() => navigate('/premium')}
                      className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-destructive text-destructive-foreground rounded-xl text-sm font-bold hover:brightness-90 transition-all duration-200 active:scale-[0.97] shadow-md"
                    >
                      <Crown className="w-4 h-4" />
                      Desbloquear acompanhamento — R$9,99
                    </button>
                  </div>
                  <p className="text-[10px] text-muted-foreground/50 text-center">
                    Você já tem o diagnóstico. Falta a ação.
                  </p>
                </div>
              </div>
            )}
          </motion.section>
        )}

        {/* Super Admin tools */}
        {role === 'super_admin' && (
          <div className="flex items-center gap-3 flex-wrap">
            {!previewMode && (
              <button onClick={() => navigate('/admin/dashboard')} className="text-xs font-medium px-4 py-2 rounded-xl border border-border/40 hover:bg-secondary/50 transition-all duration-200 active:scale-[0.97]">
                Painel Admin
              </button>
            )}
            {!hasData && !previewMode && (
              <button onClick={generateTestData} disabled={generating} className="text-xs font-medium px-4 py-2 rounded-xl border border-border/40 hover:bg-secondary/50 transition-all duration-200 disabled:opacity-50 active:scale-[0.97]">
                {generating ? 'Gerando...' : 'Gerar dados de teste'}
              </button>
            )}
            <button
              onClick={togglePreviewMode}
              className={`text-xs font-medium px-4 py-2 rounded-xl border transition-all duration-200 active:scale-[0.97] ${
                previewMode
                  ? 'border-primary/40 bg-primary/10 text-primary hover:bg-primary/20'
                  : 'border-border/40 hover:bg-secondary/50'
              }`}
            >
              {previewMode ? '👁 Modo Preview Ativo — Clique para sair' : '👁 Ver como usuário padrão'}
            </button>
          </div>
        )}

        {/* Preview mode banner */}
        {previewMode && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-primary/5 border border-primary/20 rounded-2xl p-4 flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <span className="text-sm">👁</span>
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Modo Pré-visualização</p>
                <p className="text-xs text-muted-foreground">Você está vendo a plataforma como um usuário padrão (sem Premium)</p>
              </div>
            </div>
            <button
              onClick={togglePreviewMode}
              className="text-xs font-medium px-4 py-2 rounded-xl bg-primary text-primary-foreground hover:brightness-90 transition-all active:scale-[0.97]"
            >
              Sair do Preview
            </button>
          </motion.div>
        )}

        {/* Test modules - main grid matching reference */}
        {modules.length > 0 && (
          <motion.section {...fadeIn} transition={{ ...fadeIn.transition, delay: 0.1 }}>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {modules.map((mod) => {
                const Icon = iconMap[mod.icon] || Brain;
                const isFreeTest = mod.slug === 'padrao-comportamental';
                const canAccess = isSuperAdmin || isPremium || isFreeTest;
                const isCompleted = completedModules.has(mod.id);
                return (
                  <div
                    key={mod.id}
                    className="bg-card rounded-2xl p-7 border border-border/30 shadow-[0_1px_3px_0_rgb(0_0_0/0.04)] hover:shadow-[0_4px_12px_0_rgb(0_0_0/0.06)] hover:border-border/50 transition-all duration-200"
                  >
                    <div className="flex items-center gap-3 mb-5">
                      <div className="w-10 h-10 rounded-xl bg-secondary/80 flex items-center justify-center">
                        {canAccess
                          ? <Icon className="w-[18px] h-[18px] text-primary" />
                          : <Lock className="w-[18px] h-[18px] text-muted-foreground/40" />
                        }
                      </div>
                      {isCompleted && canAccess && (
                        <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center ml-auto">
                          <CheckCircle2 className="w-3.5 h-3.5 text-primary" />
                        </div>
                      )}
                    </div>
                    <h3 className="text-base font-semibold text-foreground mb-2">{mod.name}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed mb-6 line-clamp-2">{mod.description}</p>
                    {canAccess ? (
                      <button
                        onClick={() => navigate(`/diagnostic/${mod.slug}`)}
                        className="w-full py-3 rounded-xl text-sm font-medium bg-primary text-primary-foreground hover:brightness-90 transition-all duration-200 active:scale-[0.97]"
                      >
                        {isCompleted ? 'Refazer Leitura' : 'Iniciar Leitura'}
                      </button>
                    ) : (
                      <button
                        onClick={() => setShowUpgradeModal(true)}
                        className="w-full py-3 rounded-[14px] text-[0.85rem] font-bold tracking-wide
                          bg-gradient-to-r from-[#B8860B] via-[#F2D27A] to-[#C9A24A]
                          text-white shadow-[0_4px_18px_-4px_rgba(0,0,0,0.15),inset_0_1px_1px_rgba(255,255,255,0.35)]
                          hover:shadow-[0_6px_24px_-4px_rgba(0,0,0,0.22),inset_0_1px_2px_rgba(255,255,255,0.45)]
                          hover:brightness-110 hover:scale-[1.02] active:scale-[0.98]
                          transition-all duration-300 ease-out flex items-center justify-center gap-2
                          relative overflow-hidden"
                      >
                        <span className="absolute inset-0 bg-gradient-to-b from-white/15 to-transparent pointer-events-none" />
                        <Crown className="w-4 h-4 relative z-10 drop-shadow-sm" />
                        <span className="relative z-10 drop-shadow-sm">Premium</span>
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </motion.section>
        )}

        {/* Empty state */}
        {!hasData && modules.length === 0 && role !== 'super_admin' && (
          <motion.section {...fadeIn}>
            <div className="bg-card border border-dashed border-border/40 rounded-2xl p-8 sm:p-16 text-center space-y-6">
              <div className="w-14 h-14 rounded-2xl bg-secondary/60 flex items-center justify-center mx-auto">
                <Brain className="w-6 h-6 text-muted-foreground/40" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-foreground">Comece sua análise</h3>
                <p className="text-sm text-muted-foreground mt-2 max-w-sm mx-auto leading-relaxed">
                  Faça sua primeira leitura para descobrir seu padrão comportamental dominante.
                </p>
              </div>
              <button
                onClick={() => navigate('/tests')}
                className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:brightness-90 transition-all duration-200 active:scale-[0.97]"
              >
                Ver módulos
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </motion.section>
        )}

        {/* Seus Perfis section */}
        {hasData && (
          <motion.section {...fadeIn} transition={{ ...fadeIn.transition, delay: 0.15 }}>
            <h2 className="text-2xl font-semibold text-foreground mb-6">Seus Perfis</h2>
            <div className="grid sm:grid-cols-2 gap-6">
              {/* Latest result card */}
              {latestResult && (
                <div className="bg-card rounded-2xl p-7 border border-border/30 shadow-[0_1px_3px_0_rgb(0_0_0/0.04)] hover:shadow-[0_4px_12px_0_rgb(0_0_0/0.06)] transition-all duration-200">
                  <h4 className="text-base font-semibold text-foreground mb-2">Padrão Comportamental</h4>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm text-muted-foreground">{latestResult.profile_name}</span>
                    <span
                      className="text-xs font-semibold px-2.5 py-1 rounded-lg"
                      style={{ color: intensityColor[latestResult.intensity], backgroundColor: `${intensityColor[latestResult.intensity]}10` }}
                    >
                      {intensityLabel[latestResult.intensity] || latestResult.intensity}
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-secondary/60 mb-3">
                    <div
                      className="h-full rounded-full bg-primary transition-all duration-500"
                      style={{ width: `${latestResult.all_scores?.[0]?.percentage || 60}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{new Date(latestResult.created_at).toLocaleDateString('pt-BR', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
                    <button onClick={handleDownloadPdf} className="text-primary hover:underline transition-colors">Ver resultados</button>
                  </div>
                </div>
              )}

              {/* Central profile card */}
              {centralProfile && centralProfile.tests_completed > 0 && (
                <div className="bg-card rounded-2xl p-7 border border-border/30 shadow-[0_1px_3px_0_rgb(0_0_0/0.04)] hover:shadow-[0_4px_12px_0_rgb(0_0_0/0.06)] transition-all duration-200">
                  <h4 className="text-base font-semibold text-foreground mb-2">Perfil Central</h4>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm text-muted-foreground">{centralProfile.profile_name || 'Consolidado'}</span>
                    <span className="text-xs font-medium px-2.5 py-1 rounded-lg bg-accent/15 text-accent">
                      {centralProfile.tests_completed} {centralProfile.tests_completed === 1 ? 'leitura' : 'leituras'}
                    </span>
                  </div>
                  {centralProfile.core_pain && (
                    <p className="text-sm text-muted-foreground leading-relaxed mb-3 line-clamp-2">{centralProfile.core_pain}</p>
                  )}
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{centralProfile.last_test_at ? new Date(centralProfile.last_test_at).toLocaleDateString('pt-BR', { month: 'long', day: 'numeric', year: 'numeric' }) : ''}</span>
                    <button onClick={() => navigate('/central-report')} className="text-primary hover:underline transition-colors">Ver resultados</button>
                  </div>
                </div>
              )}
            </div>
          </motion.section>
        )}

        {/* Evolution CTA */}
        {sessionCount >= 1 && (
          <motion.section {...fadeIn} transition={{ ...fadeIn.transition, delay: 0.2 }}>
            <div className="bg-card rounded-2xl p-7 border border-border/30 shadow-[0_1px_3px_0_rgb(0_0_0/0.04)]">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-secondary/80 flex items-center justify-center">
                    <TrendingUp className="w-[18px] h-[18px] text-primary" />
                  </div>
                  <div>
                    <h4 className="text-base font-semibold text-foreground">
                      {sessionCount >= 2 ? 'Veja sua evolução' : 'Acompanhe sua evolução'}
                    </h4>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {sessionCount >= 2
                        ? `${sessionCount} leituras registradas — compare antes vs depois`
                        : 'Refaça uma leitura após um período para comparar resultados'
                      }
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => navigate('/history')}
                  className="inline-flex items-center gap-2 px-5 py-2.5 border border-border/40 rounded-xl text-sm font-medium hover:bg-secondary/50 transition-all active:scale-[0.97]"
                >
                  <History className="w-4 h-4" />
                  Ver histórico
                </button>
              </div>
            </div>
          </motion.section>
        )}

        {/* Premium CTA */}
        {!isPremium && (
          <motion.section {...fadeIn} transition={{ ...fadeIn.transition, delay: 0.25 }}>
            <div className="bg-card rounded-2xl p-8 shadow-[0_1px_3px_0_rgb(0_0_0/0.04)] border border-border/30">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
                <div>
                  <h3 className="text-lg font-semibold text-foreground">Desbloqueie o acesso completo</h3>
                  <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">
                    Todas as análises, relatórios avançados e acompanhamento de evolução.
                  </p>
                </div>
                <button
                  onClick={() => navigate('/checkout')}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:brightness-90 transition-all duration-200 whitespace-nowrap active:scale-[0.97]"
                >
                  Upgrade Premium
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.section>
        )}
      </div>

      {/* Upgrade Modal */}
      {showUpgradeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4" role="dialog" aria-modal="true" aria-label="Upgrade para Premium">
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setShowUpgradeModal(false)} />
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="relative bg-card border border-border/30 rounded-2xl shadow-xl w-full max-w-md p-8 space-y-6"
          >
            <button onClick={() => setShowUpgradeModal(false)} aria-label="Fechar modal" className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors p-1.5 rounded-lg hover:bg-secondary/50">
              <X className="w-4 h-4" />
            </button>
            <div>
              <h2 className="text-xl font-semibold text-foreground">Desbloqueie todas as análises</h2>
              <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                Acesse todos os módulos, relatórios avançados e acompanhamento de evolução.
              </p>
            </div>
            <div className="space-y-3">
              {[
                'Todos os módulos de análise',
                'Relatório Central unificado',
                'Histórico completo',
                'Evolução comportamental',
                'Download em PDF',
              ].map((feature, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-3 h-3 text-primary" />
                  </div>
                  <span className="text-sm text-foreground/80">{feature}</span>
                </div>
              ))}
            </div>
            <button
              onClick={() => { setShowUpgradeModal(false); navigate('/checkout'); }}
              className="w-full py-3 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:brightness-90 transition-all duration-200 active:scale-[0.97]"
            >
              Upgrade para Premium
            </button>
            <p className="text-center text-xs text-muted-foreground font-light">Cancele quando quiser</p>
          </motion.div>
        </div>
      )}
    </AppLayout>
  );
};

export default Dashboard;
