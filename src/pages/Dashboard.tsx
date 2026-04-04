import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer } from 'recharts';
import { Brain, LogOut, History, LayoutGrid, Layers, User, FlaskConical, Crown, Lock, ArrowRight, FileText, TrendingUp, Shield, Zap, Heart, Clock, CheckCircle2, X, Users } from 'lucide-react';
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
    <div className="min-h-screen" role="main" aria-label="Dashboard">
      {/* Top nav */}
      <header className="border-b border-border/50">
        <div className="max-w-5xl mx-auto flex items-center justify-between px-6 h-14">
          <div className="flex items-center gap-4">
            <span className="text-sm font-semibold text-foreground">Raio-X</span>
            {isSuperAdmin && (
              <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-secondary text-muted-foreground">Admin</span>
            )}
            {isPremium && !isSuperAdmin && (
              <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-secondary text-muted-foreground">Premium</span>
            )}
          </div>
          <div className="flex items-center gap-1">
            {!isPremium && !isSuperAdmin && (
              <button onClick={() => navigate('/checkout')} className="text-xs font-medium text-foreground mr-2 px-3 py-1.5 rounded-md bg-foreground text-background hover:opacity-90 transition-opacity">
                Upgrade
              </button>
            )}
            <button onClick={() => navigate('/profile')} className="text-sm text-muted-foreground hover:text-foreground transition-colors p-2">
              <User className="w-4 h-4" />
            </button>
            <button onClick={handleSignOut} className="text-sm text-muted-foreground hover:text-foreground transition-colors p-2">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-12 space-y-10">

        {/* Greeting */}
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Olá, {displayName}</h1>
          {centralProfile?.mental_state && (
            <p className="text-sm text-muted-foreground mt-1 max-w-lg">{centralProfile.mental_state}</p>
          )}
        </div>

        {/* Super Admin tools */}
        {isSuperAdmin && (
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={() => navigate('/admin/dashboard')} className="text-xs font-medium px-3 py-1.5 rounded-md border border-border hover:bg-secondary transition-colors">
              Painel Admin
            </button>
            {!hasData && (
              <button onClick={generateTestData} disabled={generating} className="text-xs font-medium px-3 py-1.5 rounded-md border border-border hover:bg-secondary transition-colors disabled:opacity-50">
                {generating ? 'Gerando...' : 'Gerar dados de teste'}
              </button>
            )}
          </div>
        )}

        {/* Complete profile nudge */}
        {!isSuperAdmin && !profile && (
          <div className="flex items-center justify-between border border-border/40 rounded-2xl p-5">
            <div className="flex items-center gap-3">
              <User className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Complete seu perfil</p>
                <p className="text-xs text-muted-foreground">Adicione nome e data de nascimento.</p>
              </div>
            </div>
            <button onClick={() => navigate('/onboarding')} className="text-xs font-medium text-foreground hover:underline">
              Completar →
            </button>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-3 gap-5">
          {[
            { value: sessionCount, label: sessionCount === 1 ? 'Leitura' : 'Leituras' },
            { value: centralProfile?.dominant_patterns?.length || 0, label: 'Padrões' },
            { value: role === 'super_admin' ? 'Admin' : role === 'premium' ? 'Premium' : 'Free', label: 'Plano' },
          ].map((stat, i) => (
            <div key={i} className="border border-border/40 rounded-2xl p-5 text-center">
              <p className="text-xl font-semibold text-foreground capitalize">{stat.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Quick nav */}
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
              className={`text-left border rounded-2xl p-5 transition-colors ${
                item.locked ? 'border-border/30 opacity-60 cursor-default' : 'border-border/40 hover:bg-secondary/50 cursor-pointer'
              }`}
            >
              {item.locked && <Lock className="w-3 h-3 text-muted-foreground/40 float-right" />}
              <item.icon className={`w-4 h-4 mb-2 ${item.locked ? 'text-muted-foreground/30' : 'text-muted-foreground'}`} />
              <p className="text-sm font-medium text-foreground">{item.label}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
            </button>
          ))}
        </div>

        {/* Central Profile */}
        {centralProfile && centralProfile.tests_completed > 0 && (
          <div className="border border-border/40 rounded-2xl p-7">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold">Perfil Central</h2>
              <span className="text-xs text-muted-foreground">
                {centralProfile.tests_completed} {centralProfile.tests_completed === 1 ? 'leitura' : 'leituras'}
              </span>
            </div>
            <div className="grid sm:grid-cols-2 gap-8">
              <div className="space-y-5">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Perfil Dominante</p>
                  <p className="text-base font-semibold text-foreground">{centralProfile.profile_name || '-'}</p>
                </div>
                {centralProfile.core_pain && (
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Dor Central</p>
                    <p className="text-sm text-foreground/70 leading-relaxed">{centralProfile.core_pain}</p>
                  </div>
                )}
                {centralProfile.key_unlock_area && (
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Área-chave</p>
                    <p className="text-sm text-foreground/70 leading-relaxed">{centralProfile.key_unlock_area}</p>
                  </div>
                )}
              </div>
              {radarData.length > 0 && (
                <div>
                  <ResponsiveContainer width="100%" height={220}>
                    <RadarChart data={radarData}>
                      <PolarGrid stroke="hsl(var(--border))" />
                      <PolarAngleAxis dataKey="axis" tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} />
                      <Radar name="Intensidade" dataKey="value" stroke="hsl(var(--foreground))" fill="hsl(var(--foreground))" fillOpacity={0.06} strokeWidth={1.5} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Latest result */}
        {latestResult && (
          <div className="border border-border rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Última Leitura</h2>
              <button onClick={handleDownloadPdf} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                Baixar PDF
              </button>
            </div>
            <div className="space-y-3">
              <p className="text-base font-semibold text-foreground">{latestResult.profile_name}</p>
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-sm text-muted-foreground">{latestResult.combined_title}</span>
                <span className="text-xs font-semibold" style={{ color: intensityColor[latestResult.intensity] }}>
                  {intensityLabel[latestResult.intensity] || latestResult.intensity}
                </span>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">{latestResult.state_summary}</p>
              {latestResult.direction && (
                <div className="border-l-2 border-border pl-4 mt-4">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Foco Atual</p>
                  <p className="text-sm text-foreground/70 leading-relaxed">{latestResult.direction}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Empty state */}
        {!hasData && !isSuperAdmin && (
          <div className="border border-border border-dashed rounded-lg p-12 text-center space-y-4">
            <Brain className="w-8 h-8 text-muted-foreground/30 mx-auto" />
            <div>
              <h3 className="text-lg font-semibold">Comece sua análise</h3>
              <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
                Faça seu primeiro teste para descobrir seu padrão comportamental dominante.
              </p>
            </div>
            <button
              onClick={() => navigate('/tests')}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
            >
              Ver módulos
            </button>
          </div>
        )}

        {/* Premium CTA */}
        {!isPremium && (
          <div className="border border-border rounded-lg p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-semibold">Desbloqueie o acesso completo</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Todos os testes, relatórios e acompanhamento de evolução.
                </p>
              </div>
              <button
                onClick={() => navigate('/checkout')}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity whitespace-nowrap"
              >
                Upgrade Premium
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Test modules */}
        {modules.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Módulos</h2>
              <button onClick={() => navigate('/tests')} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                Ver todos →
              </button>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {modules.map((mod) => {
                const Icon = iconMap[mod.icon] || Brain;
                const isFreeTest = mod.slug === 'padrao-comportamental';
                const canAccess = isSuperAdmin || isPremium || isFreeTest;
                const isCompleted = completedModules.has(mod.id);
                return (
                  <div
                    key={mod.id}
                    onClick={() => canAccess ? navigate(`/diagnostic/${mod.slug}`) : setShowUpgradeModal(true)}
                    className={`border rounded-lg p-4 transition-colors cursor-pointer ${
                      canAccess ? 'border-border hover:bg-secondary/50' : 'border-border/50 opacity-60'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      {canAccess ? <Icon className="w-4 h-4 text-muted-foreground" /> : <Lock className="w-4 h-4 text-muted-foreground/30" />}
                      {isCompleted && canAccess && <CheckCircle2 className="w-3.5 h-3.5 text-muted-foreground/50" />}
                      {!canAccess && <span className="text-[10px] font-medium text-muted-foreground">Premium</span>}
                    </div>
                    <h4 className="text-sm font-medium text-foreground mb-1">{mod.name}</h4>
                    <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">{mod.description}</p>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground/60 mt-3">
                      <span>~{Math.ceil(mod.question_count * 0.5)} min</span>
                      <span>{mod.question_count} itens</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Bottom actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center pb-8 pt-4">
          <button
            onClick={() => navigate('/tests')}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
          >
            {hasData ? 'Nova leitura' : 'Começar teste'}
          </button>
          {hasData && (
            <button
              onClick={() => navigate('/history')}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 border border-border rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors"
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
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.2 }}
            className="relative bg-background border border-border rounded-lg shadow-lg w-full max-w-md p-6 space-y-5"
          >
            <button onClick={() => setShowUpgradeModal(false)} aria-label="Fechar modal" className="absolute top-3 right-3 text-muted-foreground hover:text-foreground transition-colors p-1">
              <X className="w-4 h-4" />
            </button>
            <div>
              <h2 className="text-lg font-semibold">Desbloqueie todos os testes</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Acesse todos os módulos, relatórios avançados e acompanhamento de evolução.
              </p>
            </div>
            <div className="space-y-2">
              {[
                'Todos os módulos de análise',
                'Relatório Central unificado',
                'Histórico completo',
                'Evolução comportamental',
                'Download em PDF',
              ].map((feature, i) => (
                <div key={i} className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-sm text-foreground/80">{feature}</span>
                </div>
              ))}
            </div>
            <button
              onClick={() => { setShowUpgradeModal(false); navigate('/checkout'); }}
              className="w-full py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
            >
              Upgrade para Premium
            </button>
            <p className="text-center text-xs text-muted-foreground">Cancele quando quiser</p>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
