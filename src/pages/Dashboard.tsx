import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer } from 'recharts';
import { Brain, LogOut, History, LayoutGrid, Layers, User, FlaskConical, Crown, Lock, ArrowRight, FileText, TrendingUp, Sparkles, Shield, Zap, Heart, Clock, CheckCircle2, X, Users } from 'lucide-react';
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
const intensityColor: Record<string, string> = { leve: 'hsl(152, 45%, 45%)', moderado: 'hsl(var(--gold))', alto: 'hsl(0, 65%, 52%)' };

const fadeUp = { initial: { opacity: 0, y: 15 }, animate: { opacity: 1, y: 0 } };

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
        <div className="w-8 h-8 border border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  const displayName = profile?.name?.split(' ')[0] || user?.email?.split('@')[0] || 'Usuário';
  const hasData = !!latestResult || (centralProfile && centralProfile.tests_completed > 0);

  const roleBadge = isSuperAdmin
    ? { label: 'Super Admin', icon: Shield, className: 'bg-gold/10 border-gold/20 text-gold' }
    : isPremium
    ? { label: 'Premium', icon: Crown, className: 'bg-primary/10 border-primary/20 text-primary' }
    : { label: 'Gratuito', icon: Sparkles, className: 'bg-muted/50 border-border/50 text-muted-foreground' };

  const radarData = centralProfile
    ? Object.entries(centralProfile.aggregated_scores).map(([key, value]) => ({ axis: radarAxisLabels[key] || key, value }))
    : latestResult
    ? ((latestResult.all_scores as any[]) || []).map((s: any) => ({ axis: radarAxisLabels[s.key] || s.label, value: s.percentage }))
    : [];

  return (
    <div className="min-h-screen relative overflow-hidden" role="main" aria-label="Dashboard">
      {/* Ambient background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] rounded-full bg-primary/[0.03] blur-[100px]" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[400px] h-[400px] rounded-full bg-gold/[0.02] blur-[80px]" />
      </div>

      <div className="relative z-10 max-w-5xl mx-auto px-4 py-6 sm:py-8 md:py-12 space-y-6">

        {/* ── Header ── */}
        <motion.div {...fadeUp} transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }} className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1.5 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <p className="text-[10px] tracking-[0.3em] uppercase text-primary/40 font-semibold font-display">Raio-X Comportamental</p>
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-[0.6rem] font-semibold tracking-wide uppercase font-display ${roleBadge.className}`}>
                <roleBadge.icon className="w-3 h-3" />
                {roleBadge.label}
              </span>
            </div>
            <h1 className="text-3xl md:text-4xl tracking-[-0.04em]">Olá, {displayName}</h1>
            {centralProfile?.mental_state && (
              <p className="text-[0.82rem] text-muted-foreground/50 leading-[1.6] max-w-lg">{centralProfile.mental_state}</p>
            )}
          </div>
          <div className="flex items-center gap-2 flex-wrap shrink-0">
            {!isPremium && !isSuperAdmin && (
              <button
                onClick={() => navigate('/checkout')}
                className="group flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-primary to-navy-light text-primary-foreground rounded-xl text-[0.78rem] font-semibold shadow-[0_8px_30px_-6px_hsl(var(--primary)/0.35)] hover:shadow-[0_12px_40px_-4px_hsl(var(--primary)/0.5)] hover:translate-y-[-1px] transition-all duration-300 font-display"
              >
                <Crown className="w-3.5 h-3.5" />
                Acesso Premium
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </button>
            )}
            {isPremium && !isSuperAdmin && (
              <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-[0.72rem] font-semibold bg-primary/10 text-primary border border-primary/15 font-display">
                <Crown className="w-3.5 h-3.5" />
                Plano Premium ativo
              </span>
            )}
            <button onClick={() => navigate('/profile')} className="flex items-center gap-1.5 text-[0.75rem] text-muted-foreground/50 hover:text-foreground/70 transition-colors px-3 py-2 rounded-xl hover:bg-card/60 border border-transparent hover:border-border/30">
              <User className="w-3.5 h-3.5" /> Perfil
            </button>
            <button onClick={handleSignOut} className="flex items-center gap-1.5 text-[0.75rem] text-muted-foreground/50 hover:text-foreground/70 transition-colors px-3 py-2 rounded-xl hover:bg-card/60 border border-transparent hover:border-border/30">
              <LogOut className="w-3.5 h-3.5" /> Sair
            </button>
          </div>
        </motion.div>

        {/* ── Super Admin badge ── */}
        {isSuperAdmin && (
          <motion.div {...fadeUp} transition={{ delay: 0.02 }} className="flex items-center justify-between bg-gold/[0.05] border border-gold/15 rounded-2xl px-5 py-3.5">
            <span className="text-[0.78rem] text-gold font-medium font-display tracking-wide">Modo super admin ativo</span>
            <div className="flex items-center gap-2 flex-wrap">
              <button onClick={() => navigate('/admin/dashboard')} className="flex items-center gap-1.5 px-4 py-1.5 bg-gold/10 hover:bg-gold/20 text-gold rounded-xl text-[0.72rem] font-semibold transition-colors font-display">
                <LayoutGrid className="w-3 h-3" />
                Painel Admin
              </button>
              {!hasData && (
                <button onClick={generateTestData} disabled={generating} className="flex items-center gap-1.5 px-4 py-1.5 bg-gold/10 hover:bg-gold/20 text-gold rounded-xl text-[0.72rem] font-semibold transition-colors disabled:opacity-50 font-display">
                  <FlaskConical className="w-3 h-3" />
                  {generating ? 'Gerando...' : 'Gerar dados de teste'}
                </button>
              )}
            </div>
          </motion.div>
        )}

        {/* ── Complete Profile Nudge ── */}
        {!isSuperAdmin && !profile && (
          <motion.div {...fadeUp} transition={{ delay: 0.03 }} className="flex items-center justify-between bg-card/60 backdrop-blur-sm border border-border/40 rounded-2xl px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-primary/8">
                <User className="w-4 h-4 text-primary/60" />
              </div>
              <div>
                <p className="text-[0.82rem] font-medium text-foreground/75">Complete seu perfil</p>
                <p className="text-[0.72rem] text-muted-foreground/45">Adicione nome e data de nascimento para personalizar suas leituras.</p>
              </div>
            </div>
            <button
              onClick={() => navigate('/onboarding')}
              className="flex items-center gap-1.5 px-4 py-2 bg-primary/10 hover:bg-primary/15 text-primary rounded-xl text-[0.72rem] font-semibold transition-colors whitespace-nowrap font-display"
            >
              Completar <ArrowRight className="w-3 h-3" />
            </button>
          </motion.div>
        )}

        {/* ── Quick Stats ── */}
        <motion.div {...fadeUp} transition={{ delay: 0.05 }} className="grid grid-cols-3 gap-3">
          {[
            { value: sessionCount, label: sessionCount === 1 ? 'Leitura realizada' : 'Leituras realizadas' },
            { value: centralProfile?.dominant_patterns?.length || 0, label: 'Padrões identificados' },
            { value: role === 'super_admin' ? 'Admin' : role === 'premium' ? 'Premium' : 'Free', label: 'Seu plano' },
          ].map((stat, i) => (
            <div key={i} className="bg-card/50 backdrop-blur-sm rounded-2xl border border-border/30 p-5 text-center group hover:border-primary/15 transition-all duration-300">
              <p className="text-2xl font-semibold text-foreground capitalize">{stat.value}</p>
              <p className="text-[0.7rem] text-muted-foreground/45 mt-1 font-display tracking-wide">{stat.label}</p>
            </div>
          ))}
        </motion.div>

        {/* ── Quick Nav Cards ── */}
        <motion.div {...fadeUp} transition={{ delay: 0.07 }} className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { icon: LayoutGrid, label: 'Testes', desc: 'Módulos de análise', path: '/tests', locked: false },
            { icon: Layers, label: 'Relatório Central', desc: 'Perfil unificado', path: '/central-report', locked: !isPremium },
            { icon: History, label: 'Histórico', desc: 'Leituras anteriores', path: '/history', locked: !isPremium },
            { icon: TrendingUp, label: 'Evolução', desc: 'Progresso temporal', path: '/central-report', locked: !isPremium },
          ].map((item, i) => (
            <button
              key={i}
              onClick={() => item.locked ? toast.info('Disponível no plano Premium') : navigate(item.path)}
              className={`relative text-left bg-card/50 backdrop-blur-sm rounded-2xl border p-4 transition-all duration-300 group ${
                item.locked ? 'border-border/20 opacity-70 cursor-default' : 'border-border/30 hover:border-primary/20 hover:shadow-[0_8px_30px_-10px_hsl(var(--primary)/0.08)] cursor-pointer'
              }`}
            >
              {item.locked && (
                <div className="absolute top-3 right-3">
                  <Lock className="w-3 h-3 text-muted-foreground/30" />
                </div>
              )}
              <div className="p-2 rounded-xl bg-primary/[0.04] border border-primary/8 w-fit mb-3">
                <item.icon className={`w-4.5 h-4.5 ${item.locked ? 'text-muted-foreground/25' : 'text-primary/50'}`} />
              </div>
              <p className="text-[0.82rem] font-medium text-foreground/80">{item.label}</p>
              <p className="text-[0.7rem] text-muted-foreground/40 mt-0.5">{item.desc}</p>
            </button>
          ))}
        </motion.div>

        {/* ── Central Profile Summary ── */}
        {centralProfile && centralProfile.tests_completed > 0 && (
          <motion.div {...fadeUp} transition={{ delay: 0.1 }} className="bg-gradient-to-br from-primary/[0.03] via-primary/[0.06] to-gold/[0.02] rounded-3xl border border-primary/12 p-6 md:p-8">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-primary/8">
                  <Brain className="w-5 h-5 text-primary/60" />
                </div>
                <h3 className="text-xl font-medium">Perfil Central</h3>
              </div>
              <span className="text-[10px] tracking-[0.2em] uppercase bg-primary/[0.06] text-primary/60 px-3.5 py-1.5 rounded-full font-semibold font-display">
                {centralProfile.tests_completed} {centralProfile.tests_completed === 1 ? 'leitura' : 'leituras'}
              </span>
            </div>
            <div className="grid sm:grid-cols-2 gap-6">
              <div className="space-y-5">
                <div>
                  <p className="text-[10px] tracking-[0.25em] uppercase text-muted-foreground/40 mb-1.5 font-semibold font-display">Perfil Dominante</p>
                  <p className="text-xl font-medium text-foreground">{centralProfile.profile_name || '-'}</p>
                </div>
                {centralProfile.core_pain && (
                  <div>
                    <p className="text-[10px] tracking-[0.25em] uppercase text-muted-foreground/40 mb-1.5 font-semibold font-display">Dor Central</p>
                    <p className="text-[0.82rem] text-foreground/65 leading-[1.65]">{centralProfile.core_pain}</p>
                  </div>
                )}
                {centralProfile.key_unlock_area && (
                  <div>
                    <p className="text-[10px] tracking-[0.25em] uppercase text-muted-foreground/40 mb-1.5 font-semibold font-display">Área-chave de Destravamento</p>
                    <p className="text-[0.82rem] text-foreground/65 leading-[1.65]">{centralProfile.key_unlock_area}</p>
                  </div>
                )}
              </div>
              {radarData.length > 0 && (
                <div>
                  <ResponsiveContainer width="100%" height={220}>
                    <RadarChart data={radarData}>
                      <PolarGrid stroke="hsl(var(--border))" strokeOpacity={0.5} />
                      <PolarAngleAxis dataKey="axis" tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} />
                      <Radar name="Intensidade" dataKey="value" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.1} strokeWidth={1.5} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* ── Latest Result Card ── */}
        {latestResult && (
          <motion.div {...fadeUp} transition={{ delay: 0.12 }} className="bg-card/50 backdrop-blur-sm rounded-3xl border border-border/30 p-6 md:p-8">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-primary/8">
                  <FileText className="w-4 h-4 text-primary/60" />
                </div>
                <h3 className="text-lg font-medium">Última Leitura</h3>
              </div>
              <button onClick={handleDownloadPdf} className="flex items-center gap-1.5 text-[0.72rem] text-muted-foreground/40 hover:text-foreground/60 transition-colors px-3 py-1.5 rounded-xl hover:bg-muted/20 border border-transparent hover:border-border/30 font-display">
                <FileText className="w-3 h-3" /> Baixar PDF
              </button>
            </div>
            <div className="space-y-3">
              <p className="text-xl font-medium text-foreground">{latestResult.profile_name}</p>
              <div className="flex items-center gap-4 flex-wrap">
                <span className="text-[0.78rem] text-muted-foreground/50">{latestResult.combined_title}</span>
                <span className="text-[0.78rem] font-semibold font-display" style={{ color: intensityColor[latestResult.intensity] }}>
                  {intensityLabel[latestResult.intensity] || latestResult.intensity}
                </span>
              </div>
              <p className="text-[0.82rem] text-foreground/55 leading-[1.75]">{latestResult.state_summary}</p>
              {latestResult.direction && (
                <div className="border-l-2 border-primary/20 pl-4 mt-4">
                  <p className="text-[10px] tracking-[0.25em] uppercase text-muted-foreground/40 mb-1 font-semibold font-display">Foco Atual</p>
                  <p className="text-[0.82rem] text-foreground/60 italic leading-[1.65]">{latestResult.direction}</p>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* ── Empty State ── */}
        {!hasData && !isSuperAdmin && (
          <motion.div {...fadeUp} transition={{ delay: 0.08 }} className="bg-card/40 backdrop-blur-sm rounded-3xl border border-border/25 p-12 text-center space-y-6">
            <div className="w-16 h-16 rounded-2xl bg-primary/8 flex items-center justify-center mx-auto">
              <Brain className="w-8 h-8 text-primary/30" />
            </div>
            <div className="space-y-2">
              <h3 className="text-2xl font-medium">Comece sua análise</h3>
              <p className="text-[0.85rem] text-muted-foreground/50 leading-[1.7] max-w-md mx-auto">
                Você ainda não realizou nenhuma leitura. Faça seu primeiro teste para descobrir seu padrão comportamental dominante.
              </p>
            </div>
            <button
              onClick={() => navigate('/tests')}
              className="inline-flex items-center gap-2.5 px-10 py-4 bg-primary text-primary-foreground rounded-2xl text-[0.9rem] font-semibold tracking-[0.02em] shadow-[0_8px_30px_-6px_hsl(var(--primary)/0.35)] hover:shadow-[0_12px_40px_-4px_hsl(var(--primary)/0.45)] hover:translate-y-[-1px] transition-all duration-300"
            >
              <LayoutGrid className="w-4 h-4" /> Ver módulos disponíveis
            </button>
          </motion.div>
        )}

        {/* ── Premium Upgrade CTA ── */}
        {!isPremium && (
          <motion.div {...fadeUp} transition={{ delay: 0.15 }} className="relative overflow-hidden rounded-3xl border border-gold/15 bg-gradient-to-br from-primary/[0.04] via-gold/[0.03] to-transparent p-6 md:p-8">
            <div className="absolute top-0 right-0 w-64 h-64 bg-gold/[0.04] rounded-full blur-[80px] pointer-events-none" />
            <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
              <div className="space-y-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-gold/10">
                    <Crown className="w-5 h-5 text-gold" />
                  </div>
                  <h3 className="text-xl font-medium text-foreground">Desbloqueie o acesso completo</h3>
                </div>
                <p className="text-[0.82rem] text-muted-foreground/55 leading-[1.65] max-w-md">
                  Com o plano Premium, acesse todos os testes, relatórios detalhados, histórico de evolução e cronograma comportamental.
                </p>
                <div className="flex flex-wrap gap-2 pt-1">
                  {['Todos os testes', 'Relatório Central', 'Histórico', 'Evolução temporal'].map((f) => (
                    <span key={f} className="text-[0.68rem] font-medium text-primary/60 bg-primary/[0.05] px-3 py-1.5 rounded-full font-display">{f}</span>
                  ))}
                </div>
              </div>
              <button
                onClick={() => navigate('/checkout')}
                className="group flex items-center gap-2 px-8 py-3.5 bg-primary text-primary-foreground rounded-2xl text-[0.85rem] font-semibold shadow-[0_8px_30px_-6px_hsl(var(--primary)/0.35)] hover:shadow-[0_12px_40px_-4px_hsl(var(--primary)/0.5)] hover:translate-y-[-1px] transition-all duration-300 whitespace-nowrap"
              >
                Upgrade Premium
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </motion.div>
        )}

        {/* ── Test Modules Grid ── */}
        {modules.length > 0 && (
          <motion.div {...fadeUp} transition={{ delay: 0.2 }}>
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-primary/8">
                  <LayoutGrid className="w-4 h-4 text-primary/50" />
                </div>
                <h3 className="text-xl font-medium">Módulos de Análise</h3>
              </div>
              <button onClick={() => navigate('/tests')} className="text-[0.75rem] text-primary/60 hover:text-primary font-semibold transition-colors font-display tracking-wide">
                Ver todos →
              </button>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {modules.map((mod) => {
                const Icon = iconMap[mod.icon] || Brain;
                const isFreeTest = mod.slug === 'padrao-comportamental';
                const canAccess = isSuperAdmin || isPremium || isFreeTest;
                const isCompleted = completedModules.has(mod.id);
                return (
                  <div
                    key={mod.id}
                    onClick={() => canAccess ? navigate(`/diagnostic/${mod.slug}`) : setShowUpgradeModal(true)}
                    className={`relative bg-card/50 backdrop-blur-sm rounded-2xl border p-5 transition-all duration-300 cursor-pointer group ${
                      canAccess ? 'border-border/30 hover:border-primary/15 hover:shadow-[0_8px_30px_-10px_hsl(var(--primary)/0.08)]' : 'border-border/20'
                    }`}
                  >
                    {isCompleted && canAccess && (
                      <div className="absolute top-3 right-3">
                        <CheckCircle2 className="w-4 h-4 text-primary/50" />
                      </div>
                    )}
                    {!canAccess && (
                      <div className="absolute top-3 right-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gold/8 border border-gold/12">
                        <Crown className="w-3 h-3 text-gold/60" />
                        <span className="text-[0.6rem] font-semibold text-gold/70 tracking-wide uppercase font-display">Premium</span>
                      </div>
                    )}
                    <div className="space-y-3">
                      <div className="p-2.5 rounded-xl bg-primary/[0.04] border border-primary/8 w-fit">
                        {canAccess ? <Icon className="w-5 h-5 text-primary/45" /> : <Lock className="w-5 h-5 text-muted-foreground/25" />}
                      </div>
                      <div>
                        <h4 className={`text-[0.9rem] font-medium mb-1 tracking-[-0.01em] ${canAccess ? 'text-foreground/80' : 'text-foreground/45'}`}>{mod.name}</h4>
                        <p className="text-[0.75rem] text-muted-foreground/45 leading-[1.65] line-clamp-2">{mod.description}</p>
                      </div>
                      <div className="flex items-center gap-3 text-[0.68rem] text-muted-foreground/35 pt-0.5 font-display">
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> ~{Math.ceil(mod.question_count * 0.5)} min</span>
                        <span>{mod.question_count} itens</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* ── Bottom Actions ── */}
        <motion.div {...fadeUp} transition={{ delay: 0.25 }} className="flex flex-col sm:flex-row gap-3 justify-center pb-12 pt-4">
          <button
            onClick={() => navigate('/tests')}
            className="flex items-center justify-center gap-2.5 px-10 py-4 bg-primary text-primary-foreground rounded-2xl text-[0.9rem] font-semibold tracking-[0.02em] shadow-[0_8px_30px_-6px_hsl(var(--primary)/0.35)] hover:shadow-[0_12px_40px_-4px_hsl(var(--primary)/0.45)] hover:translate-y-[-1px] transition-all duration-300"
          >
            <LayoutGrid className="w-4 h-4" /> {hasData ? 'Nova leitura' : 'Começar teste'}
          </button>
          {hasData && (
            <button
              onClick={() => navigate('/history')}
              className="flex items-center justify-center gap-2.5 px-10 py-4 border border-border/40 rounded-2xl text-[0.85rem] font-medium text-muted-foreground/60 hover:text-foreground/70 hover:border-border/60 hover:bg-card/40 transition-all duration-300"
            >
              <History className="w-4 h-4" /> Ver histórico
            </button>
          )}
        </motion.div>
      </div>

      {/* ── Upgrade Modal ── */}
      {showUpgradeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4" role="dialog" aria-modal="true" aria-label="Upgrade para Premium">
          <div className="absolute inset-0 bg-background/80 backdrop-blur-md" onClick={() => setShowUpgradeModal(false)} aria-hidden="true" />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="relative bg-card/95 backdrop-blur-xl border border-border/40 rounded-3xl shadow-[0_25px_60px_-15px_hsl(var(--primary)/0.15)] w-full max-w-lg p-8 space-y-6"
          >
            <button onClick={() => setShowUpgradeModal(false)} aria-label="Fechar modal" className="absolute top-4 right-4 text-muted-foreground/30 hover:text-foreground/60 transition-colors p-1.5 rounded-xl hover:bg-muted/20">
              <X className="w-5 h-5" />
            </button>
            <div className="text-center space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-gold/15 to-primary/10 flex items-center justify-center mx-auto shadow-[0_8px_30px_-6px_hsl(var(--gold)/0.2)]">
                <Crown className="w-8 h-8 text-gold" />
              </div>
              <h2 className="text-2xl">Desbloqueie todos os testes</h2>
              <p className="text-[0.85rem] text-muted-foreground/55 leading-[1.7] max-w-sm mx-auto">
                Com o plano Premium, você acessa todos os módulos de análise, relatórios avançados e acompanhamento de evolução.
              </p>
            </div>
            <div className="space-y-3">
              {[
                'Acesso a todos os módulos de análise',
                'Relatório Central unificado',
                'Histórico completo de leituras',
                'Cronograma de evolução comportamental',
                'Download de relatórios em PDF',
              ].map((feature, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-3 h-3 text-primary" />
                  </div>
                  <span className="text-[0.82rem] text-foreground/70">{feature}</span>
                </div>
              ))}
            </div>
            <button
              onClick={() => { setShowUpgradeModal(false); navigate('/checkout'); }}
              className="w-full group flex items-center justify-center gap-2 py-4 bg-primary text-primary-foreground rounded-2xl text-[0.9rem] font-semibold shadow-[0_8px_30px_-6px_hsl(var(--primary)/0.35)] hover:shadow-[0_12px_40px_-4px_hsl(var(--primary)/0.5)] hover:translate-y-[-1px] transition-all duration-300"
            >
              <Crown className="w-4 h-4" />
              Upgrade para Premium
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
            <p className="text-center text-[0.7rem] text-muted-foreground/35 font-display">Cancele quando quiser · Acesso imediato</p>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
