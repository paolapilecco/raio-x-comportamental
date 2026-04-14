import { useEffect, useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useDiagnosticSessions } from '@/hooks/useDiagnosticSessions';
import { useNavigate } from 'react-router-dom';
import {
  Brain, History, Lock, ArrowRight, TrendingUp, Shield, Zap, Heart,
  CheckCircle2, X, Crown, Flame, Star, Gauge, AlertTriangle,
  ChevronRight, Calendar,
} from 'lucide-react';
import { InactivityAlertCard } from '@/components/dashboard/InactivityAlertCard';
import { JourneyNextStep } from '@/components/dashboard/JourneyNextStep';
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
import { PHASE_META } from '@/hooks/useActionPlan';

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
  behavioral_tendencies?: { key: string; label: string; intensity: number }[];
  behavioral_memory?: Record<string, unknown>;
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
  useAxisLabels();
  const navigate = useNavigate();
  const [latestResult, setLatestResult] = useState<StoredResult | null>(null);
  const [centralProfile, setCentralProfile] = useState<CentralProfile | null>(null);
  const [generating, setGenerating] = useState(false);
  const [resetting, setResetting] = useState(false);
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
        if (mod) result.push({ moduleId: modId, moduleName: mod.name, moduleSlug: mod.slug, daysSinceLastTest: Math.floor(diff / (24 * 60 * 60 * 1000)) });
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
        session_id: session.id, dominant_pattern: 'unstable_execution',
        secondary_patterns: ['excessive_self_criticism', 'low_routine_sustenance'], intensity: 'alto',
        profile_name: 'O Velocista sem Linha de Chegada',
        mental_state: 'Você vive em um estado de entusiasmo intermitente seguido de esgotamento.',
        state_summary: 'Seu funcionamento atual alterna entre picos de energia e quedas abruptas.',
        mechanism: 'A energia inicial vem de um impulso emocional, não de uma estrutura real.',
        triggers: ['Perda da novidade', 'Resultados que demoram', 'Baixa energia', 'Sem feedback'],
        traps: ['"Quando eu estiver motivado, eu retomo"', '"Talvez não era para mim"'],
        self_sabotage_cycle: ['Ideia nova', 'Energia inicial', 'Desconforto', 'Motivação cai', 'Abandono', 'Culpa'],
        blocking_point: 'Quando a ação deixa de ser estimulante e passa a exigir disciplina.',
        contradiction: 'Quer resultados consistentes, mas opera em ciclos de intensidade e abandono.',
        life_impact: [{ pillar: 'Carreira', impact: 'Projetos abandonados antes de gerar resultados.' }, { pillar: 'Saúde', impact: 'Dietas e exercícios duram dias ou semanas.' }],
        exit_strategy: [{ step: 'Meta micro por dia', detail: 'Reduza ao mínimo viável.' }],
        all_scores: mockScores, direction: 'Sustentação da ação após o desaparecimento da motivação inicial.',
        combined_title: 'Execução Instável + Autocrítica Excessiva',
      });
      const aggregated: Record<string, number> = {};
      mockScores.forEach(s => { aggregated[s.key] = s.percentage; });
      const { data: existing } = await supabase.from('user_central_profile').select('id').eq('user_id', user.id).maybeSingle();
      const profileData = {
        dominant_patterns: [{ key: 'unstable_execution', score: 72 }, { key: 'low_routine_sustenance', score: 74 }],
        aggregated_scores: aggregated, tests_completed: 1, last_test_at: new Date().toISOString(),
        mental_state: 'Entusiasmo intermitente seguido de esgotamento', core_pain: 'Sensação constante de que nunca termina nada',
        key_unlock_area: 'Sustentação da ação pós-motivação inicial', profile_name: 'O Velocista sem Linha de Chegada',
      };
      if (existing) await supabase.from('user_central_profile').update(profileData).eq('user_id', user.id);
      else await supabase.from('user_central_profile').insert({ user_id: user.id, ...profileData });
      toast.success('Dados de teste gerados com sucesso');
      window.location.reload();
    } catch (err) {
      console.error(err);
      toast.error('Erro ao gerar dados de teste');
    } finally { setGenerating(false); }
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
            tests_completed: cp.tests_completed, mental_state: cp.mental_state,
            core_pain: cp.core_pain, key_unlock_area: cp.key_unlock_area,
            profile_name: cp.profile_name, last_test_at: cp.last_test_at,
            behavioral_tendencies: (cp as any).behavioral_tendencies,
            behavioral_memory: (cp as any).behavioral_memory,
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
      } finally { setExtraLoading(false); }
    };
    fetchExtra();
  }, [user, sessionsLoading, latestSession]);

  const handleDownloadPdf = async () => {
    if (!latestResult) return;
    const latestModule = modules.find(m => m.id === latestModuleId);
    if (latestModule?.slug === 'mapa-de-vida') { generateLifeMapPdf((latestResult.all_scores as any[]) || [], profile?.name); return; }
    const dominantDef = patternDefinitions?.[latestResult.dominant_pattern as PatternKey];
    const secondaryDefs = (latestResult.secondary_patterns || []).map(k => patternDefinitions?.[k as PatternKey]).filter(Boolean);
    const diagResult: DiagnosticResult = {
      dominantPattern: dominantDef!, secondaryPatterns: secondaryDefs as PatternDefinition[],
      intensity: latestResult.intensity as IntensityLevel, allScores: (latestResult.all_scores as any[]) || [],
      summary: latestResult.state_summary, mechanism: latestResult.mechanism, contradiction: latestResult.contradiction,
      impact: latestResult.impact || dominantDef?.impact || '', direction: latestResult.direction,
      combinedTitle: latestResult.combined_title, profileName: latestResult.profile_name, mentalState: latestResult.mental_state,
      triggers: latestResult.triggers || [], mentalTraps: latestResult.traps || [],
      selfSabotageCycle: latestResult.self_sabotage_cycle || [], blockingPoint: latestResult.blocking_point,
      lifeImpact: (latestResult.life_impact as any[]) || [], exitStrategy: (latestResult.exit_strategy as any[]) || [],
      corePain: latestResult.core_pain || dominantDef?.corePain || '',
      keyUnlockArea: latestResult.key_unlock_area || dominantDef?.keyUnlockArea || '',
      criticalDiagnosis: latestResult.critical_diagnosis || dominantDef?.criticalDiagnosis || '',
      whatNotToDo: latestResult.what_not_to_do || dominantDef?.whatNotToDo || [],
    };
    let extras: PdfEvolutionData | undefined;
    if (user) {
      try {
        const { data: tracking } = await supabase.from('action_plan_tracking').select('completed, day_number, action_text')
          .eq('user_id', user.id).eq('diagnostic_result_id', latestResult.id).order('day_number');
        if (tracking && tracking.length > 0) {
          const completed = tracking.filter(t => t.completed).length;
          let streak = 0;
          const sorted = [...tracking].sort((a, b) => a.day_number - b.day_number);
          for (let i = sorted.length - 1; i >= 0; i--) { if (sorted[i].completed) streak++; else break; }
          const seen = new Set<string>(); const uniqueTexts: string[] = [];
          for (const row of tracking) { if (!seen.has(row.action_text) && uniqueTexts.length < 3) { seen.add(row.action_text); uniqueTexts.push(row.action_text); } }
          extras = { actionPlanStatus: { total_days: tracking.length, completed_days: completed, execution_rate: Math.round((completed / tracking.length) * 100), current_streak: streak }, actionTexts: uniqueTexts };
        }
      } catch { /* ignore */ }
    }
    generateDiagnosticPdf(diagResult, profile?.name, extras);
  };

  if (loading) return <DashboardSkeleton />;

  const displayName = profile?.name?.split(' ')[0] || user?.email?.split('@')[0] || 'Usuário';
  const hasData = !!latestResult || (centralProfile && centralProfile.tests_completed > 0);
  const showFull = isPremium || isSuperAdmin;

  // Determine greeting context
  const getGreeting = () => {
    if (!hasData) return { title: `${displayName}, você ainda não sabe o que te trava.`, sub: 'Seu padrão opera no automático. Descubra o que está por baixo — antes que ele decida mais uma vez por você.' };
    const planStalled = actionPlan.days.length > 0 && actionPlan.days[0]?.status === 'completed' && actionPlan.days.slice(1).every(d => d.status === 'not_started') && !showFull;
    if (planStalled) return { title: `${displayName}, você parou exatamente onde costuma parar.`, sub: 'Isso não é coincidência — é o padrão se protegendo. Continue ou confirme o ciclo.' };
    if (actionPlan.stats.all_completed && retestCycle.retestAvailable) return { title: `${displayName}, agora é hora de ver se você mudou de verdade.`, sub: 'Seu cérebro vai dizer que sim. Não confie. Meça.' };
    if (actionPlan.stats.all_completed) return { title: `${displayName}, você executou o processo completo.`, sub: 'Agora o padrão precisa de tempo para enfraquecer. A reavaliação vai mostrar a verdade.' };
    if (actionPlan.stats.has_in_progress) return { title: `${displayName}, você já começou a quebrar o padrão. Continue.`, sub: 'Cada fase concluída enfraquece o circuito que te mantém preso. Não pare agora.' };
    if (actionPlan.days.length > 0 && !actionPlan.stats.has_started) return { title: `${displayName}, o padrão continua intacto.`, sub: 'Você viu. Agora precisa agir. Enquanto espera, o circuito se fortalece.' };
    return { title: `${displayName}, seu padrão continua ativo.`, sub: 'Cada dia sem ação fortalece o circuito que te mantém no mesmo lugar.' };
  };
  const greeting = getGreeting();

  // Pattern labels
  const dominantPatternDef = latestResult?.dominant_pattern ? patternDefinitions?.[latestResult.dominant_pattern as PatternKey] : undefined;
  const secondaryPatternDefs = (latestResult?.secondary_patterns || []).map(k => patternDefinitions?.[k as PatternKey]).filter(Boolean);

  // Top behavioral tendency
  const topTendency = centralProfile?.behavioral_tendencies?.[0];

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 md:px-8 py-6 sm:py-10 space-y-6 sm:space-y-8">

        {/* ═══════════ 1) GREETING — Contextual & Dynamic ═══════════ */}
        <motion.section {...fadeIn}>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground leading-tight">
            {greeting.title}
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed mt-2 max-w-xl">
            {greeting.sub}
          </p>
        </motion.section>

        {/* ═══════════ PREVIEW MODE BANNER ═══════════ */}
        {previewMode && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
            className="bg-primary/5 border border-primary/20 rounded-2xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center"><span className="text-sm">👁</span></div>
              <div>
                <p className="text-sm font-semibold text-foreground">Modo Pré-visualização</p>
                <p className="text-xs text-muted-foreground">Vendo como usuário padrão (sem Premium)</p>
              </div>
            </div>
            <button onClick={togglePreviewMode} className="text-xs font-medium px-4 py-2 rounded-xl bg-primary text-primary-foreground hover:brightness-90 transition-all active:scale-[0.97]">Sair</button>
          </motion.div>
        )}

        {/* ═══════════ 2) PROFILE SUMMARY — Current Pattern ═══════════ */}
        {hasData && latestResult && (
          <motion.section {...fadeIn} transition={{ ...fadeIn.transition, delay: 0.03 }}>
            <div className="bg-card rounded-2xl border border-border/30 shadow-sm p-5 sm:p-6">
              <p className="text-[0.6rem] uppercase tracking-[0.15em] text-muted-foreground font-semibold mb-3">
                Esse é o seu padrão hoje
              </p>

              {/* Dominant */}
              <div className="flex items-start gap-4 mb-4">
                <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center shrink-0">
                  <Brain className="w-5 h-5 text-destructive" />
                </div>
                <div className="flex-1">
                  <h3 className="text-base font-bold text-foreground">{latestResult.profile_name}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">{latestResult.combined_title}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-[0.6rem] font-bold px-2 py-0.5 rounded-md"
                      style={{ color: intensityColor[latestResult.intensity], backgroundColor: `${intensityColor[latestResult.intensity]}10` }}>
                      Intensidade: {intensityLabel[latestResult.intensity] || latestResult.intensity}
                    </span>
                  </div>
                </div>
              </div>

              {/* Secondary */}
              {secondaryPatternDefs.length > 0 && (
                <div className="border-t border-border/10 pt-3 mb-3">
                  <p className="text-[0.55rem] uppercase tracking-wider text-muted-foreground/60 font-semibold mb-2">Padrões secundários</p>
                  <div className="flex flex-wrap gap-2">
                    {secondaryPatternDefs.map((pd, i) => (
                      <span key={i} className="text-[0.65rem] font-medium px-2.5 py-1 rounded-lg bg-secondary text-muted-foreground">
                        {(pd as PatternDefinition).label}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Top behavioral tendency */}
              {topTendency && (
                <div className="border-t border-border/10 pt-3">
                  <p className="text-[0.55rem] uppercase tracking-wider text-muted-foreground/60 font-semibold mb-1.5">Principal tendência comportamental</p>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-foreground">{topTendency.label}</span>
                    <div className="flex-1 h-1.5 bg-muted/20 rounded-full overflow-hidden max-w-32">
                      <div className="h-full rounded-full bg-destructive/60" style={{ width: `${topTendency.intensity}%` }} />
                    </div>
                    <span className="text-[0.6rem] text-muted-foreground tabular-nums">{topTendency.intensity}%</span>
                  </div>
                </div>
              )}

              {/* Core pain */}
              {centralProfile?.core_pain && (
                <div className="mt-3 rounded-xl bg-destructive/[0.04] border border-destructive/10 px-4 py-2.5">
                  <p className="text-xs text-foreground/70 leading-relaxed italic">"{centralProfile.core_pain}"</p>
                </div>
              )}
            </div>
          </motion.section>
        )}

        {/* ═══════════ 3) JOURNEY PROGRESS — Phase Progress ═══════════ */}
        {!loading && hasData && actionPlan.days.length > 0 && (
          <motion.section {...fadeIn} transition={{ ...fadeIn.transition, delay: 0.05 }}>
            <div className="bg-card rounded-2xl border border-border/30 shadow-sm p-5 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-[0.6rem] uppercase tracking-[0.15em] text-muted-foreground font-semibold">Progresso da jornada</p>
                  <p className="text-xs text-muted-foreground/60 mt-0.5">
                    {actionPlan.stats.all_completed
                      ? 'Ciclo completo — agora precisa consolidar'
                      : `${actionPlan.stats.completed_days} de ${actionPlan.stats.total_days} fases concluídas — você ainda não terminou`}
                  </p>
                </div>
                {actionPlan.stats.all_completed && (
                  <div className="px-3 py-1 rounded-full bg-green-500/10 text-green-600 text-[0.6rem] font-bold">✓ Completo</div>
                )}
              </div>

              {/* Phase progress bars */}
              <div className="grid grid-cols-3 gap-3">
                {actionPlan.days.map((task, i) => {
                  const phase = PHASE_META[task.fase];
                  const isCompleted = task.status === 'completed';
                  const isActive = task.status === 'in_progress';
                  const isLocked = !showFull && i > 0;
                  return (
                    <div key={task.id} className="text-center">
                      <div className={`h-2 rounded-full mb-2 ${
                        isCompleted ? 'bg-green-500' : isActive ? 'bg-amber-500 animate-pulse' : isLocked ? 'bg-muted-foreground/10' : 'bg-muted-foreground/15'
                      }`} />
                      <p className={`text-[0.55rem] font-bold uppercase tracking-wider ${
                        isCompleted ? 'text-green-600' : isActive ? 'text-amber-600' : 'text-muted-foreground/40'
                      }`}>
                        {isLocked && <Lock className="w-2.5 h-2.5 inline mr-0.5" />}
                        {phase?.label || task.fase}
                      </p>
                      <p className="text-[0.5rem] text-muted-foreground/40 mt-0.5">
                        {isCompleted ? 'Concluída' : isActive ? 'Em execução' : isLocked ? 'Bloqueada' : 'Pendente'}
                      </p>
                    </div>
                  );
                })}
              </div>

              {/* Urgency if stalled */}
              {!actionPlan.stats.all_completed && actionPlan.stats.has_started && !actionPlan.stats.has_in_progress && (
                <div className="mt-3 rounded-xl bg-amber-500/[0.06] border border-amber-500/10 px-4 py-2.5">
                  <p className="text-[0.65rem] text-amber-600 font-semibold flex items-center gap-1.5">
                    <AlertTriangle className="w-3 h-3 shrink-0" />
                    Você começou mas parou. O padrão agradece sua inação.
                  </p>
                </div>
              )}
            </div>
          </motion.section>
        )}

        {/* ═══════════ 4) NEXT STEP — Main CTA ═══════════ */}
        {!loading && (
          <JourneyNextStep
            hasCompletedTest={!!latestResult || (centralProfile?.tests_completed ?? 0) > 0}
            actionPlan={actionPlan}
            retestCycle={retestCycle}
            latestModuleSlug={modules.find(m => m.id === latestModuleId)?.slug}
            behavioralMemory={centralProfile?.behavioral_memory}
          />
        )}

        {/* ═══════════ 5 & 6) TASKS — In Progress & Completed ═══════════ */}
        {!actionPlan.loading && actionPlan.days.length > 0 && (
          <motion.section {...fadeIn} transition={{ ...fadeIn.transition, delay: 0.08 }}>
            <ActionPlanCard plan={actionPlan} behavioralMemory={centralProfile?.behavioral_memory} testsCompleted={centralProfile?.tests_completed} />
          </motion.section>
        )}

        {/* ═══════════ 7) RETEST — Urgency ═══════════ */}
        {!retestCycle.loading && retestCycle.lastTestDate && (
          <motion.section {...fadeIn} transition={{ ...fadeIn.transition, delay: 0.1 }}>
            <RetestCycleCard retest={retestCycle} planCompleted={actionPlan.stats.all_completed} />
          </motion.section>
        )}

        {/* ═══════════ 8) EVOLUTION & SCORE ═══════════ */}
        {!gamification.loading && gamification.totalTests > 0 && (
          <motion.section {...fadeIn} transition={{ ...fadeIn.transition, delay: 0.12 }}>
            <div className="bg-card rounded-2xl border border-border/30 shadow-sm p-5 sm:p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Gauge className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-foreground">Score de Evolução</h3>
                  <p className="text-xs text-muted-foreground">Quanto maior, mais consciente e consistente é seu processo.</p>
                </div>
              </div>

              <div className="flex items-center gap-6">
                {/* Score circle */}
                <div className="relative w-20 h-20 shrink-0">
                  <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
                    <circle cx="60" cy="60" r="52" fill="none" stroke="hsl(var(--muted)/0.15)" strokeWidth="8" />
                    <motion.circle cx="60" cy="60" r="52" fill="none"
                      stroke={gamification.globalScore >= 70 ? 'hsl(152, 45%, 42%)' : gamification.globalScore >= 40 ? 'hsl(var(--gold))' : 'hsl(0, 65%, 52%)'}
                      strokeWidth="8" strokeLinecap="round" strokeDasharray={`${2 * Math.PI * 52}`}
                      initial={{ strokeDashoffset: 2 * Math.PI * 52 }}
                      animate={{ strokeDashoffset: 2 * Math.PI * 52 * (1 - gamification.globalScore / 100) }}
                      transition={{ delay: 0.5, duration: 1.5, ease: [0.22, 1, 0.36, 1] }}
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-xl font-bold tabular-nums text-foreground">{gamification.globalScore}</span>
                    <span className="text-[0.45rem] uppercase tracking-wider text-muted-foreground">de 100</span>
                  </div>
                </div>

                {/* Breakdown */}
                <div className="flex-1 space-y-1.5">
                  {[
                    { label: 'Autoconsciência', value: gamification.scoreBreakdown.awareness },
                    { label: 'Consistência', value: gamification.scoreBreakdown.consistency },
                    { label: 'Cobertura', value: gamification.scoreBreakdown.coverage },
                    { label: 'Atividade', value: gamification.scoreBreakdown.recency },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center gap-2">
                      <span className="text-[0.6rem] text-muted-foreground w-24 shrink-0">{item.label}</span>
                      <div className="flex-1 h-1 bg-muted/20 rounded-full overflow-hidden">
                        <motion.div className="h-full rounded-full bg-primary/60"
                          initial={{ width: 0 }} animate={{ width: `${item.value}%` }}
                          transition={{ delay: 0.7, duration: 1, ease: [0.22, 1, 0.36, 1] }} />
                      </div>
                      <span className="text-[0.5rem] text-muted-foreground/40 w-6 text-right tabular-nums">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Interpretation */}
              {retestCycle.scoreComparisons.length > 0 && (
                <div className="mt-4 rounded-xl bg-secondary/30 px-4 py-3">
                  <p className="text-[0.6rem] uppercase tracking-wider text-muted-foreground font-semibold mb-1.5">Evolução recente</p>
                  <div className="flex items-center gap-3 text-xs">
                    {retestCycle.improvementCount > 0 && (
                      <span className="text-green-600 font-medium">↓ {retestCycle.improvementCount} eixo{retestCycle.improvementCount > 1 ? 's' : ''} enfraqueceu</span>
                    )}
                    {retestCycle.worsenedCount > 0 && (
                      <span className="text-red-500 font-medium">↑ {retestCycle.worsenedCount} se intensificou</span>
                    )}
                  </div>
                  <p className="text-[0.6rem] text-muted-foreground/60 mt-1">
                    {retestCycle.improvementCount > retestCycle.worsenedCount
                      ? 'Seu padrão enfraqueceu em mais áreas do que se manteve. Continue.'
                      : 'O padrão ainda se mantém forte em algumas áreas. Atenção redobrada.'}
                  </p>
                </div>
              )}

              {/* Stats row */}
              <div className="grid grid-cols-3 gap-3 mt-4">
                <div className="text-center bg-secondary/20 rounded-xl py-3">
                  <Flame className={`w-4 h-4 mx-auto mb-1 ${gamification.streakActive ? 'text-orange-500' : 'text-muted-foreground/30'}`} />
                  <p className="text-lg font-bold tabular-nums text-foreground">{gamification.currentStreak}</p>
                  <p className="text-[0.5rem] text-muted-foreground uppercase">Streak</p>
                </div>
                <div className="text-center bg-secondary/20 rounded-xl py-3">
                  <Star className="w-4 h-4 mx-auto mb-1 text-primary" />
                  <p className="text-sm font-bold text-foreground">{gamification.levelName}</p>
                  <p className="text-[0.5rem] text-muted-foreground uppercase">Nível</p>
                </div>
                <div className="text-center bg-secondary/20 rounded-xl py-3">
                  <Zap className="w-4 h-4 mx-auto mb-1 text-accent" />
                  <p className="text-lg font-bold tabular-nums text-foreground">{gamification.totalXP}</p>
                  <p className="text-[0.5rem] text-muted-foreground uppercase">XP Total</p>
                </div>
              </div>
            </div>
          </motion.section>
        )}

        {/* ═══════════ 9) TEST HISTORY ═══════════ */}
        {hasData && (
          <motion.section {...fadeIn} transition={{ ...fadeIn.transition, delay: 0.14 }}>
            <div className="bg-card rounded-2xl border border-border/30 shadow-sm p-5 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-secondary/80 flex items-center justify-center">
                    <History className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-foreground">Histórico de testes</h3>
                    <p className="text-xs text-muted-foreground">{sessionCount} leitura{sessionCount !== 1 ? 's' : ''} realizadas</p>
                  </div>
                </div>
                <button onClick={() => navigate('/history')}
                  className="text-xs font-medium text-primary hover:underline transition-colors flex items-center gap-1">
                  Ver tudo <ChevronRight className="w-3 h-3" />
                </button>
              </div>

              {/* Latest test */}
              {latestResult && (
                <div className="border border-border/15 rounded-xl p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Brain className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{latestResult.profile_name}</p>
                      <p className="text-[0.6rem] text-muted-foreground flex items-center gap-1">
                        <Calendar className="w-2.5 h-2.5" />
                        {new Date(latestResult.created_at).toLocaleDateString('pt-BR', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                    </div>
                  </div>
                  <span className="text-[0.6rem] font-bold px-2 py-0.5 rounded-md"
                    style={{ color: intensityColor[latestResult.intensity], backgroundColor: `${intensityColor[latestResult.intensity]}10` }}>
                    {intensityLabel[latestResult.intensity]}
                  </span>
                </div>
              )}

              {/* Free plan limitation */}
              {!showFull && sessionCount > 1 && (
                <div className="mt-3 rounded-xl bg-secondary/20 border border-border/10 px-4 py-3 text-center">
                  <Lock className="w-3.5 h-3.5 text-muted-foreground/40 mx-auto mb-1" />
                  <p className="text-[0.6rem] text-muted-foreground/60 font-medium">
                    Comparação entre testes e evolução detalhada disponíveis no processo completo.
                  </p>
                </div>
              )}

              {/* Evolution CTA */}
              {showFull && sessionCount >= 2 && (
                <button onClick={() => navigate('/history')}
                  className="w-full mt-3 py-2.5 rounded-xl text-xs font-semibold bg-primary/10 text-primary hover:bg-primary/15 transition-all active:scale-[0.97] flex items-center justify-center gap-2">
                  <TrendingUp className="w-3.5 h-3.5" />
                  Comparar evolução entre testes
                </button>
              )}
            </div>
          </motion.section>
        )}

        {/* ═══════════ 10) ALERTS — Behavioral ═══════════ */}
        {!loading && inactiveModules.length > 0 && (
          <motion.section {...fadeIn} transition={{ ...fadeIn.transition, delay: 0.16 }}>
            <InactivityAlertCard inactiveModules={inactiveModules} userId={user?.id} />
          </motion.section>
        )}

        {/* ═══════════ TESTS CATALOG — Quick Access ═══════════ */}
        {modules.length > 0 && (
          <motion.section {...fadeIn} transition={{ ...fadeIn.transition, delay: 0.18 }}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-foreground">Módulos de análise</h2>
              <button onClick={() => navigate('/tests')} className="text-xs font-medium text-primary hover:underline flex items-center gap-1">
                Ver catálogo <ChevronRight className="w-3 h-3" />
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {modules.slice(0, 6).map((mod) => {
                const Icon = iconMap[mod.icon] || Brain;
                const isFreeTest = mod.slug === 'padrao-comportamental';
                const canAccess = isSuperAdmin || isPremium || isFreeTest;
                const isCompleted = completedModules.has(mod.id);
                return (
                  <button
                    key={mod.id}
                    onClick={() => canAccess ? navigate(`/diagnostic/${mod.slug}`) : setShowUpgradeModal(true)}
                    className="bg-card rounded-xl p-4 border border-border/20 hover:border-border/40 hover:shadow-sm transition-all duration-200 active:scale-[0.97] text-left"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-7 h-7 rounded-lg bg-secondary/60 flex items-center justify-center">
                        {canAccess ? <Icon className="w-3.5 h-3.5 text-primary" /> : <Lock className="w-3.5 h-3.5 text-muted-foreground/30" />}
                      </div>
                      {isCompleted && canAccess && <CheckCircle2 className="w-3 h-3 text-green-500 ml-auto" />}
                    </div>
                    <p className="text-xs font-medium text-foreground leading-tight">{mod.name}</p>
                    {!canAccess && (
                      <span className="text-[0.5rem] text-muted-foreground/40 font-medium mt-1 block">Premium</span>
                    )}
                  </button>
                );
              })}
            </div>
          </motion.section>
        )}

        {/* ═══════════ PREMIUM CTA — For Free Users ═══════════ */}
        {!isPremium && hasData && (
          <motion.section {...fadeIn} transition={{ ...fadeIn.transition, delay: 0.2 }}>
            <div className="bg-card rounded-2xl p-6 shadow-sm border border-destructive/20 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-destructive/60 via-destructive/40 to-transparent" />
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold text-foreground">Você já viu o padrão. E agora?</h3>
                  <p className="text-sm text-foreground/70 mt-1.5 leading-relaxed">
                    Consciência sem execução completa não gera mudança. Você precisa das 3 fases para quebrar o ciclo.
                  </p>
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="bg-green-500/5 border border-green-500/10 rounded-xl px-2 py-2 text-center">
                    <p className="font-bold text-green-600 text-[0.6rem]">✓ Fase 1</p>
                    <p className="text-muted-foreground text-[0.5rem] mt-0.5">Consciência</p>
                  </div>
                  <div className="bg-amber-500/5 border border-amber-500/10 rounded-xl px-2 py-2 text-center">
                    <p className="font-bold text-amber-600 text-[0.6rem]">🔒 Fase 2</p>
                    <p className="text-muted-foreground text-[0.5rem] mt-0.5">Interrupção</p>
                  </div>
                  <div className="bg-primary/5 border border-primary/10 rounded-xl px-2 py-2 text-center">
                    <p className="font-bold text-primary text-[0.6rem]">🔒 Fase 3</p>
                    <p className="text-muted-foreground text-[0.5rem] mt-0.5">Consolidação</p>
                  </div>
                </div>
                <div className="border border-primary/10 bg-primary/[0.03] rounded-xl px-4 py-2.5 text-center">
                  <p className="text-xs text-foreground/80 font-medium">
                    Imagina não repetir isso amanhã. Imagina sair desse ciclo de verdade.
                  </p>
                </div>
                <button onClick={() => navigate('/checkout')}
                  className="w-full py-3 bg-destructive text-destructive-foreground rounded-xl text-sm font-bold hover:brightness-90 transition-all active:scale-[0.97] shadow-md flex items-center justify-center gap-2">
                  <Crown className="w-4 h-4" />
                  Eu vou fazer diferente dessa vez
                </button>
                <p className="text-[10px] text-muted-foreground/40 text-center">R$9,99/mês · Isso muda a forma como você decide hoje</p>
              </div>
            </div>
          </motion.section>
        )}

        {/* ═══════════ EMPTY STATE ═══════════ */}
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
              <button onClick={() => navigate('/tests')}
                className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:brightness-90 transition-all active:scale-[0.97]">
                Ver módulos <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </motion.section>
        )}

        {/* ═══════════ SUPER ADMIN TOOLS ═══════════ */}
        {role === 'super_admin' && (
          <div className="flex items-center gap-3 flex-wrap pt-4 border-t border-border/10">
            {!previewMode && (
              <button onClick={() => navigate('/admin/dashboard')} className="text-xs font-medium px-4 py-2 rounded-xl border border-border/40 hover:bg-secondary/50 transition-all active:scale-[0.97]">
                Painel Admin
              </button>
            )}
            {!hasData && !previewMode && (
              <button onClick={generateTestData} disabled={generating} className="text-xs font-medium px-4 py-2 rounded-xl border border-border/40 hover:bg-secondary/50 transition-all disabled:opacity-50 active:scale-[0.97]">
                {generating ? 'Gerando...' : 'Gerar dados de teste'}
              </button>
            )}
            {!previewMode && (
              <button
                onClick={async () => {
                  if (!user || !window.confirm('Tem certeza? Isso apagará TODOS os seus dados de teste (sessões, resultados, plano de ação, perfil central). Essa ação é irreversível.')) return;
                  setResetting(true);
                  try {
                    const uid = user.id;
                    await supabase.from('action_plan_tracking').delete().eq('user_id', uid);
                    await supabase.from('progress_ai_feedback').delete().eq('user_id', uid);
                    const { data: mySessions } = await supabase.from('diagnostic_sessions').select('id').eq('user_id', uid);
                    if (mySessions?.length) {
                      const ids = mySessions.map(s => s.id);
                      await supabase.from('diagnostic_results').delete().in('session_id', ids);
                      await supabase.from('diagnostic_answers').delete().in('session_id', ids);
                    }
                    await supabase.from('diagnostic_sessions').delete().eq('user_id', uid);
                    await supabase.from('user_central_profile').delete().eq('user_id', uid);
                    await supabase.from('user_profile').delete().eq('user_id', uid);
                    await supabase.from('test_usage').delete().eq('user_id', uid);
                    toast.success('Todos os dados de teste foram apagados!');
                    window.location.reload();
                  } catch { toast.error('Erro ao resetar dados'); }
                  setResetting(false);
                }}
                disabled={resetting}
                className="text-xs font-medium px-4 py-2 rounded-xl border border-destructive/40 text-destructive hover:bg-destructive/10 transition-all disabled:opacity-50 active:scale-[0.97]"
              >
                {resetting ? 'Apagando...' : '🗑 Reset Total dos Testes'}
              </button>
            )}
            <button onClick={togglePreviewMode}
              className={`text-xs font-medium px-4 py-2 rounded-xl border transition-all active:scale-[0.97] ${
                previewMode ? 'border-primary/40 bg-primary/10 text-primary hover:bg-primary/20' : 'border-border/40 hover:bg-secondary/50'
              }`}>
              {previewMode ? '👁 Modo Preview Ativo — Clique para sair' : '👁 Ver como usuário padrão'}
            </button>
          </div>
        )}
      </div>

      {/* ═══════════ UPGRADE MODAL ═══════════ */}
      {showUpgradeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setShowUpgradeModal(false)} />
          <motion.div initial={{ opacity: 0, scale: 0.96, y: 8 }} animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.25 }} className="relative bg-card border border-border/30 rounded-2xl shadow-xl w-full max-w-md p-8 space-y-5">
            <button onClick={() => setShowUpgradeModal(false)} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors p-1.5 rounded-lg hover:bg-secondary/50">
              <X className="w-4 h-4" />
            </button>
            <div>
              <h2 className="text-xl font-semibold text-foreground">Esse teste faz parte do processo completo</h2>
              <p className="text-sm text-foreground/70 mt-2 leading-relaxed">
                Cada módulo expõe uma camada diferente do seu padrão. Sem acessar todas, você vê apenas uma fração do que te trava.
              </p>
            </div>
            <div className="space-y-2.5">
              {[
                { text: 'Todos os módulos de leitura comportamental', desc: 'Cada ângulo revela algo que os outros escondem' },
                { text: 'Plano de ação em 3 fases completas', desc: 'Consciência + Interrupção + Consolidação' },
                { text: 'Acompanhamento e evolução real', desc: 'Comparação entre antes e depois, área por área' },
                { text: 'Histórico completo + reavaliação', desc: 'Prove que mudou — ou descubra que não mudou' },
              ].map((feature, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                    <CheckCircle2 className="w-3 h-3 text-primary" />
                  </div>
                  <div>
                    <span className="text-sm font-medium text-foreground/80">{feature.text}</span>
                    <p className="text-[11px] text-muted-foreground/60">{feature.desc}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="border-t border-border/10 pt-4 space-y-3">
              <p className="text-xs text-foreground/60 font-semibold text-center">
                Imagina reagir diferente da próxima vez. Imagina perceber o padrão antes dele acontecer.
              </p>
              <button onClick={() => { setShowUpgradeModal(false); navigate('/checkout'); }}
                className="w-full py-3.5 bg-destructive text-destructive-foreground rounded-xl text-sm font-bold hover:brightness-90 transition-all active:scale-[0.97] shadow-md flex items-center justify-center gap-2">
                <Crown className="w-4 h-4" />
                Eu vou fazer diferente dessa vez
              </button>
              <p className="text-center text-[10px] text-muted-foreground/40">R$9,99/mês · Isso muda a forma como você decide hoje</p>
            </div>
          </motion.div>
        </div>
      )}
    </AppLayout>
  );
};

export default Dashboard;