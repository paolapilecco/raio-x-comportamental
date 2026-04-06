import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer } from 'recharts';
import { Brain, History, Lock, ArrowRight, TrendingUp, Shield, Zap, Heart, CheckCircle2, X } from 'lucide-react';
import { patternDefinitions } from '@/data/patterns';
import { generateDiagnosticPdf } from '@/lib/generatePdf';
import { toast } from 'sonner';
import { AppLayout } from '@/components/AppLayout';
import type { PatternKey, DiagnosticResult, IntensityLevel } from '@/types/diagnostic';

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

const radarAxisLabels: Record<string, string> = {
  unstable_execution: 'Execução',
  emotional_self_sabotage: 'Autossabotagem',
  functional_overload: 'Sobrecarga',
  discomfort_escape: 'Fuga',
  paralyzing_perfectionism: 'Perfeccionismo',
  validation_dependency: 'Validação',
  excessive_self_criticism: 'Autocrítica',
  low_routine_sustenance: 'Rotina',
};

const fadeIn = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] },
};

const Dashboard = () => {
  const { user, profile, role, isPremium, isSuperAdmin, signOut, previewMode, togglePreviewMode } = useAuth();
  const navigate = useNavigate();
  const [latestResult, setLatestResult] = useState<StoredResult | null>(null);
  const [centralProfile, setCentralProfile] = useState<CentralProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [sessionCount, setSessionCount] = useState(0);
  const [modules, setModules] = useState<TestModule[]>([]);
  const [completedModules, setCompletedModules] = useState<Set<string>>(new Set());
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  const generateTestData = async () => {
    if (!user || !isSuperAdmin) return;
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
    if (!user) return;
    const fetchData = async () => {
      try {
        const [cpRes, sessionsRes, modulesRes] = await Promise.all([
          supabase.from('user_central_profile').select('*').eq('user_id', user.id).maybeSingle(),
          supabase.from('diagnostic_sessions').select('id, test_module_id').eq('user_id', user.id).not('completed_at', 'is', null).order('completed_at', { ascending: false }),
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

        const sessions = sessionsRes.data || [];
        setSessionCount(sessions.length);
        setCompletedModules(new Set(sessions.map(s => s.test_module_id).filter(Boolean) as string[]));
        setModules((modulesRes.data as TestModule[]) || []);

        if (sessions.length > 0) {
          const { data: result } = await supabase.from('diagnostic_results').select('*').eq('session_id', sessions[0].id).single();
          setLatestResult(result);
        }
      } catch (err) {
        console.error('Error loading dashboard data:', err);
        toast.error('Erro ao carregar dados. Tente recarregar a página.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user]);

  const handleDownloadPdf = () => {
    if (!latestResult) return;
    const dominantDef = patternDefinitions[latestResult.dominant_pattern as PatternKey];
    const secondaryDefs = (latestResult.secondary_patterns || []).map(k => patternDefinitions[k as PatternKey]).filter(Boolean);
    const diagResult: DiagnosticResult = {
      dominantPattern: dominantDef,
      secondaryPatterns: secondaryDefs,
      intensity: latestResult.intensity as IntensityLevel,
      allScores: (latestResult.all_scores as any[]) || [],
      summary: latestResult.state_summary,
      mechanism: latestResult.mechanism,
      contradiction: latestResult.contradiction,
      impact: dominantDef?.impact || '',
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
      corePain: dominantDef?.corePain || '',
      keyUnlockArea: dominantDef?.keyUnlockArea || '',
      criticalDiagnosis: dominantDef?.criticalDiagnosis || '',
      whatNotToDo: dominantDef?.whatNotToDo || [],
    };
    generateDiagnosticPdf(diagResult, profile?.name);
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="w-5 h-5 border-2 border-foreground/20 border-t-foreground rounded-full animate-spin" />
        </div>
      </AppLayout>
    );
  }

  const displayName = profile?.name?.split(' ')[0] || user?.email?.split('@')[0] || 'Usuário';
  const fullName = profile?.name || user?.email?.split('@')[0] || 'Usuário';
  const hasData = !!latestResult || (centralProfile && centralProfile.tests_completed > 0);

  const radarData = centralProfile
    ? Object.entries(centralProfile.aggregated_scores).map(([key, value]) => ({ axis: radarAxisLabels[key] || key, value }))
    : latestResult
    ? ((latestResult.all_scores as any[]) || []).map((s: any) => ({ axis: radarAxisLabels[s.key] || s.label, value: s.percentage }))
    : [];

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto px-6 md:px-10 py-10 space-y-10">

        {/* Hero greeting */}
        <motion.section {...fadeIn} className="space-y-2">
          <h1 className="text-3xl md:text-[2.5rem] font-semibold tracking-tight text-foreground leading-tight">
            Bem-vindo, {displayName}.
          </h1>
          <p className="text-base text-muted-foreground leading-relaxed max-w-xl">
            Avalie perfis comportamentais detalhados com base em suas respostas, {displayName}.
          </p>
        </motion.section>

        {/* Super Admin tools */}
        {isSuperAdmin && (
          <div className="flex items-center gap-3 flex-wrap">
            <button onClick={() => navigate('/admin/dashboard')} className="text-xs font-medium px-4 py-2 rounded-xl border border-border/40 hover:bg-secondary/50 transition-all duration-200 active:scale-[0.97]">
              Painel Admin
            </button>
            {!hasData && (
              <button onClick={generateTestData} disabled={generating} className="text-xs font-medium px-4 py-2 rounded-xl border border-border/40 hover:bg-secondary/50 transition-all duration-200 disabled:opacity-50 active:scale-[0.97]">
                {generating ? 'Gerando...' : 'Gerar dados de teste'}
              </button>
            )}
          </div>
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
                    <button
                      onClick={() => canAccess ? navigate(`/diagnostic/${mod.slug}`) : setShowUpgradeModal(true)}
                      className={`w-full py-3 rounded-xl text-sm font-medium transition-all duration-200 active:scale-[0.97] ${
                        canAccess
                          ? 'bg-primary text-primary-foreground hover:brightness-90'
                          : 'bg-muted text-muted-foreground cursor-default'
                      }`}
                    >
                      {!canAccess ? 'Premium' : isCompleted ? 'Refazer Leitura' : 'Iniciar Leitura'}
                    </button>
                  </div>
                );
              })}
            </div>
          </motion.section>
        )}

        {/* Empty state */}
        {!hasData && modules.length === 0 && !isSuperAdmin && (
          <motion.section {...fadeIn}>
            <div className="bg-card border border-dashed border-border/40 rounded-2xl p-16 text-center space-y-6">
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
