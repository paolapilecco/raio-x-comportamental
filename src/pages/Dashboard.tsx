import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer } from 'recharts';
import { Brain, LogOut, History, LayoutGrid, Layers, User, Lock, ArrowRight, TrendingUp, Shield, Zap, Heart, CheckCircle2, X } from 'lucide-react';
import { patternDefinitions } from '@/data/patterns';
import { generateDiagnosticPdf } from '@/lib/generatePdf';
import { toast } from 'sonner';
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
  const { user, profile, role, isPremium, isSuperAdmin, signOut } = useAuth();
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

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

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
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-foreground/20 border-t-foreground rounded-full animate-spin" />
      </div>
    );
  }

  const displayName = profile?.name?.split(' ')[0] || user?.email?.split('@')[0] || 'Usuário';
  const hasData = !!latestResult || (centralProfile && centralProfile.tests_completed > 0);

  const radarData = centralProfile
    ? Object.entries(centralProfile.aggregated_scores).map(([key, value]) => ({ axis: radarAxisLabels[key] || key, value }))
    : latestResult
    ? ((latestResult.all_scores as any[]) || []).map((s: any) => ({ axis: radarAxisLabels[s.key] || s.label, value: s.percentage }))
    : [];

  return (
    <div className="min-h-screen bg-background" role="main" aria-label="Dashboard">
      {/* Header */}
      <header className="border-b border-border/30 bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto flex items-center justify-between px-6 md:px-8 h-16">
          <div className="flex items-center gap-3">
            <span className="text-base font-semibold text-foreground tracking-tight">Raio-X</span>
            {isSuperAdmin && (
              <span className="text-[10px] font-medium px-2.5 py-1 rounded-lg bg-primary/10 text-primary">Admin</span>
            )}
            {isPremium && !isSuperAdmin && (
              <span className="text-[10px] font-medium px-2.5 py-1 rounded-lg bg-accent/15 text-accent">Premium</span>
            )}
          </div>
          <div className="flex items-center gap-1">
            {!isPremium && !isSuperAdmin && (
              <button
                onClick={() => navigate('/checkout')}
                className="text-xs font-medium mr-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground hover:brightness-90 transition-all duration-200 active:scale-[0.97]"
              >
                Upgrade
              </button>
            )}
            <button onClick={() => navigate('/profile')} className="text-muted-foreground hover:text-foreground transition-all duration-200 p-2.5 rounded-xl hover:bg-secondary/50">
              <User className="w-4 h-4" />
            </button>
            <button onClick={handleSignOut} className="text-muted-foreground hover:text-foreground transition-all duration-200 p-2.5 rounded-xl hover:bg-secondary/50">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-6 md:px-8 py-10 space-y-12">

        {/* Hero greeting */}
        <motion.section {...fadeIn} className="space-y-2">
          <h1 className="text-3xl md:text-4xl font-semibold tracking-tight text-foreground">
            Olá, {displayName}
          </h1>
          {centralProfile?.mental_state ? (
            <p className="text-base text-muted-foreground leading-relaxed max-w-xl">{centralProfile.mental_state}</p>
          ) : (
            <p className="text-base text-muted-foreground leading-relaxed max-w-xl">
              Acompanhe seus padrões comportamentais e evolução pessoal.
            </p>
          )}
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

        {/* Complete profile nudge */}
        {!isSuperAdmin && !profile && (
          <motion.div {...fadeIn} className="flex items-center justify-between bg-card rounded-2xl p-6 shadow-[0_1px_3px_0_rgb(0_0_0/0.04)] border border-border/30">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-secondary/80 flex items-center justify-center">
                <User className="w-4 h-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Complete seu perfil</p>
                <p className="text-xs text-muted-foreground mt-0.5">Adicione nome e data de nascimento para personalizar sua experiência.</p>
              </div>
            </div>
            <button onClick={() => navigate('/onboarding')} className="text-xs font-medium text-primary hover:text-primary/80 transition-colors whitespace-nowrap">
              Completar →
            </button>
          </motion.div>
        )}

        {/* Stats overview */}
        <motion.section {...fadeIn} transition={{ ...fadeIn.transition, delay: 0.05 }}>
          <div className="grid grid-cols-3 gap-5">
            {[
              { value: sessionCount, label: sessionCount === 1 ? 'Leitura realizada' : 'Leituras realizadas', accent: false },
              { value: centralProfile?.dominant_patterns?.length || 0, label: 'Padrões identificados', accent: false },
              { value: role === 'super_admin' ? 'Admin' : role === 'premium' ? 'Premium' : 'Free', label: 'Seu plano', accent: role === 'premium' },
            ].map((stat, i) => (
              <div key={i} className="bg-card rounded-2xl p-6 shadow-[0_1px_3px_0_rgb(0_0_0/0.04)] border border-border/30 text-center">
                <p className={`text-2xl font-semibold capitalize ${stat.accent ? 'text-accent' : 'text-foreground'}`}>
                  {stat.value}
                </p>
                <p className="text-xs text-muted-foreground mt-2 font-light">{stat.label}</p>
              </div>
            ))}
          </div>
        </motion.section>

        {/* Quick navigation */}
        <motion.section {...fadeIn} transition={{ ...fadeIn.transition, delay: 0.1 }}>
          <h2 className="text-lg font-semibold text-foreground mb-5">Navegação rápida</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { icon: LayoutGrid, label: 'Testes', desc: 'Módulos de análise', path: '/tests', locked: false },
              { icon: Layers, label: 'Relatório Central', desc: 'Perfil unificado', path: '/central-report', locked: !isPremium },
              { icon: History, label: 'Histórico', desc: 'Leituras anteriores', path: '/history', locked: !isPremium },
              { icon: TrendingUp, label: 'Evolução', desc: 'Progresso temporal', path: '/central-report', locked: !isPremium },
            ].map((item, i) => (
              <button
                key={i}
                onClick={() => item.locked ? toast.info('Disponível no plano Premium') : navigate(item.path)}
                className={`group text-left bg-card rounded-2xl p-6 transition-all duration-200 border ${
                  item.locked
                    ? 'border-border/20 opacity-50 cursor-default'
                    : 'border-border/30 hover:border-primary/20 hover:shadow-[0_2px_8px_0_rgb(0_0_0/0.06)] cursor-pointer active:scale-[0.98]'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                    item.locked ? 'bg-secondary/40' : 'bg-secondary/80 group-hover:bg-primary/10'
                  } transition-colors duration-200`}>
                    {item.locked
                      ? <Lock className="w-4 h-4 text-muted-foreground/30" />
                      : <item.icon className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors duration-200" />
                    }
                  </div>
                  {item.locked && <span className="text-[10px] font-medium text-muted-foreground/60">Premium</span>}
                </div>
                <p className="text-sm font-medium text-foreground">{item.label}</p>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{item.desc}</p>
              </button>
            ))}
          </div>
        </motion.section>

        {/* Central Profile */}
        {centralProfile && centralProfile.tests_completed > 0 && (
          <motion.section {...fadeIn} transition={{ ...fadeIn.transition, delay: 0.15 }}>
            <div className="bg-card rounded-2xl p-8 shadow-[0_1px_3px_0_rgb(0_0_0/0.04)] border border-border/30">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="text-xl font-semibold text-foreground">Perfil Central</h2>
                  <p className="text-xs text-muted-foreground mt-1 font-light">Visão consolidada dos seus padrões</p>
                </div>
                <span className="text-xs text-muted-foreground font-light px-3 py-1.5 rounded-lg bg-secondary/60">
                  {centralProfile.tests_completed} {centralProfile.tests_completed === 1 ? 'leitura' : 'leituras'}
                </span>
              </div>
              <div className="grid sm:grid-cols-2 gap-10">
                <div className="space-y-7">
                  <div>
                    <p className="text-[11px] text-muted-foreground/70 uppercase tracking-widest mb-2 font-light">Perfil Dominante</p>
                    <p className="text-lg font-semibold text-foreground">{centralProfile.profile_name || '-'}</p>
                  </div>
                  {centralProfile.core_pain && (
                    <div>
                      <p className="text-[11px] text-muted-foreground/70 uppercase tracking-widest mb-2 font-light">Dor Central</p>
                      <p className="text-sm text-foreground/70 leading-relaxed">{centralProfile.core_pain}</p>
                    </div>
                  )}
                  {centralProfile.key_unlock_area && (
                    <div>
                      <p className="text-[11px] text-muted-foreground/70 uppercase tracking-widest mb-2 font-light">Área-chave de Desbloqueio</p>
                      <p className="text-sm text-foreground/70 leading-relaxed">{centralProfile.key_unlock_area}</p>
                    </div>
                  )}
                </div>
                {radarData.length > 0 && (
                  <div className="flex items-center justify-center">
                    <ResponsiveContainer width="100%" height={240}>
                      <RadarChart data={radarData}>
                        <PolarGrid stroke="hsl(var(--border))" strokeOpacity={0.6} />
                        <PolarAngleAxis dataKey="axis" tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} />
                        <Radar name="Intensidade" dataKey="value" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.08} strokeWidth={1.5} />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            </div>
          </motion.section>
        )}

        {/* Latest result */}
        {latestResult && (
          <motion.section {...fadeIn} transition={{ ...fadeIn.transition, delay: 0.2 }}>
            <div className="bg-card rounded-2xl p-8 shadow-[0_1px_3px_0_rgb(0_0_0/0.04)] border border-border/30">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-semibold text-foreground">Última Leitura</h2>
                  <p className="text-xs text-muted-foreground mt-1 font-light">Resultado mais recente</p>
                </div>
                <button
                  onClick={handleDownloadPdf}
                  className="text-xs text-muted-foreground hover:text-foreground transition-all duration-200 px-3 py-1.5 rounded-lg hover:bg-secondary/50"
                >
                  Baixar PDF
                </button>
              </div>
              <div className="space-y-5">
                <div>
                  <p className="text-lg font-semibold text-foreground">{latestResult.profile_name}</p>
                  <div className="flex items-center gap-3 flex-wrap mt-2">
                    <span className="text-sm text-muted-foreground">{latestResult.combined_title}</span>
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-lg" style={{ color: intensityColor[latestResult.intensity], backgroundColor: `${intensityColor[latestResult.intensity]}10` }}>
                      {intensityLabel[latestResult.intensity] || latestResult.intensity}
                    </span>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">{latestResult.state_summary}</p>
                {latestResult.direction && (
                  <div className="border-l-2 border-primary/30 pl-5 py-1">
                    <p className="text-[11px] text-muted-foreground/70 uppercase tracking-widest mb-1.5 font-light">Foco Atual</p>
                    <p className="text-sm text-foreground/70 leading-relaxed">{latestResult.direction}</p>
                  </div>
                )}
              </div>
            </div>
          </motion.section>
        )}

        {/* Empty state */}
        {!hasData && !isSuperAdmin && (
          <motion.section {...fadeIn}>
            <div className="bg-card border border-dashed border-border/40 rounded-2xl p-16 text-center space-y-6">
              <div className="w-14 h-14 rounded-2xl bg-secondary/60 flex items-center justify-center mx-auto">
                <Brain className="w-6 h-6 text-muted-foreground/40" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-foreground">Comece sua análise</h3>
                <p className="text-sm text-muted-foreground mt-2 max-w-sm mx-auto leading-relaxed">
                  Faça seu primeiro teste para descobrir seu padrão comportamental dominante.
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

        {/* Premium CTA */}
        {!isPremium && (
          <motion.section {...fadeIn} transition={{ ...fadeIn.transition, delay: 0.25 }}>
            <div className="bg-card rounded-2xl p-8 shadow-[0_1px_3px_0_rgb(0_0_0/0.04)] border border-border/30">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
                <div>
                  <h3 className="text-lg font-semibold text-foreground">Desbloqueie o acesso completo</h3>
                  <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">
                    Todos os testes, relatórios avançados e acompanhamento de evolução.
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

        {/* Test modules */}
        {modules.length > 0 && (
          <motion.section {...fadeIn} transition={{ ...fadeIn.transition, delay: 0.3 }}>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-semibold text-foreground">Módulos de Análise</h2>
                <p className="text-xs text-muted-foreground mt-1 font-light">Escolha um teste para iniciar sua leitura</p>
              </div>
              <button onClick={() => navigate('/tests')} className="text-xs text-muted-foreground hover:text-foreground transition-all duration-200 px-3 py-1.5 rounded-lg hover:bg-secondary/50">
                Ver todos →
              </button>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {modules.map((mod) => {
                const Icon = iconMap[mod.icon] || Brain;
                const isFreeTest = mod.slug === 'padrao-comportamental';
                const canAccess = isSuperAdmin || isPremium || isFreeTest;
                const isCompleted = completedModules.has(mod.id);
                return (
                  <div
                    key={mod.id}
                    onClick={() => canAccess ? navigate(`/diagnostic/${mod.slug}`) : setShowUpgradeModal(true)}
                    className={`group bg-card rounded-2xl p-6 transition-all duration-200 cursor-pointer border ${
                      canAccess
                        ? 'border-border/30 hover:border-primary/20 hover:shadow-[0_2px_8px_0_rgb(0_0_0/0.06)] active:scale-[0.98]'
                        : 'border-border/20 opacity-50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                        canAccess ? 'bg-secondary/80 group-hover:bg-primary/10' : 'bg-secondary/40'
                      } transition-colors duration-200`}>
                        {canAccess
                          ? <Icon className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors duration-200" />
                          : <Lock className="w-4 h-4 text-muted-foreground/30" />
                        }
                      </div>
                      {isCompleted && canAccess && (
                        <span className="flex items-center gap-1.5 text-[10px] text-muted-foreground/60 font-light">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Concluído
                        </span>
                      )}
                      {!canAccess && <span className="text-[10px] font-medium text-muted-foreground/50">Premium</span>}
                    </div>
                    <h4 className="text-sm font-medium text-foreground mb-1.5">{mod.name}</h4>
                    <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">{mod.description}</p>
                    <div className="flex items-center gap-3 text-[11px] text-muted-foreground/50 mt-4 font-light">
                      <span>~{Math.ceil(mod.question_count * 0.5)} min</span>
                      <span className="w-1 h-1 rounded-full bg-border" />
                      <span>{mod.question_count} itens</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.section>
        )}

        {/* Bottom actions */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center pb-10 pt-6">
          <button
            onClick={() => navigate('/tests')}
            className="inline-flex items-center justify-center gap-2 px-7 py-3.5 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:brightness-90 transition-all duration-200 active:scale-[0.97]"
          >
            {hasData ? 'Nova leitura' : 'Começar teste'}
            <ArrowRight className="w-4 h-4" />
          </button>
          {hasData && (
            <button
              onClick={() => navigate('/history')}
              className="inline-flex items-center justify-center gap-2 px-7 py-3.5 border border-border/40 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-all duration-200 active:scale-[0.97]"
            >
              Ver histórico
            </button>
          )}
        </div>
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
              <h2 className="text-xl font-semibold text-foreground">Desbloqueie todos os testes</h2>
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
    </div>
  );
};

export default Dashboard;
