import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { Brain, AlertTriangle, Eye, Target, Compass, LogOut, History, ArrowRight, Download, LayoutGrid, Layers, User, FlaskConical } from 'lucide-react';
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

const intensityLabel: Record<string, string> = {
  leve: 'Leve',
  moderado: 'Moderado',
  alto: 'Alto',
};

const intensityColor: Record<string, string> = {
  leve: 'hsl(152, 45%, 45%)',
  moderado: 'hsl(38, 72%, 50%)',
  alto: 'hsl(0, 65%, 52%)',
};

const fadeUp = {
  initial: { opacity: 0, y: 15 },
  animate: { opacity: 1, y: 0 },
};

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
  const { user, profile, isAdmin, isSuperAdmin, signOut } = useAuth();
  const navigate = useNavigate();
  const [latestResult, setLatestResult] = useState<StoredResult | null>(null);
  const [centralProfile, setCentralProfile] = useState<CentralProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  const generateTestData = async () => {
    if (!user || !isSuperAdmin) return;
    setGenerating(true);
    try {
      // 1. Create session
      const { data: session, error: sessionErr } = await supabase
        .from('diagnostic_sessions')
        .insert({ user_id: user.id, completed_at: new Date().toISOString() })
        .select('id')
        .single();
      if (sessionErr || !session) throw sessionErr;

      // 2. Create mock scores
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

      // 3. Create diagnostic result
      const { error: resultErr } = await supabase.from('diagnostic_results').insert({
        session_id: session.id,
        dominant_pattern: 'unstable_execution',
        secondary_patterns: ['excessive_self_criticism', 'low_routine_sustenance'],
        intensity: 'alto',
        profile_name: 'O Velocista sem Linha de Chegada',
        mental_state: 'Você vive em um estado de entusiasmo intermitente seguido de esgotamento.',
        state_summary: 'Seu funcionamento atual alterna entre picos de energia e quedas abruptas. A mente busca estímulos novos para se manter ativa, mas abandona projetos quando o esforço rotineiro aparece.',
        mechanism: 'A energia inicial vem de um impulso emocional, não de uma estrutura real. Quando o desconforto natural do processo aparece, não há sistema interno que sustente a ação.',
        triggers: ['Perda da novidade em um projeto', 'Resultados que demoram', 'Dias de baixa energia emocional', 'Ausência de feedback imediato'],
        traps: ['"Quando eu estiver mais motivado, eu retomo"', '"Talvez esse projeto não era para mim"', '"Amanhã eu recomeço com força total"'],
        self_sabotage_cycle: ['Surge uma ideia nova', 'Explosão de energia inicial', 'Desconforto do processo aparece', 'Motivação cai', 'Abandono silencioso', 'Culpa e frustração'],
        blocking_point: 'O travamento acontece quando a ação deixa de ser estimulante e passa a exigir disciplina.',
        contradiction: 'Você quer resultados consistentes, mas opera em ciclos de intensidade e abandono.',
        life_impact: [
          { pillar: 'Carreira', impact: 'Projetos profissionais são abandonados antes de gerar resultados.' },
          { pillar: 'Saúde', impact: 'Dietas e exercícios duram dias ou semanas.' },
          { pillar: 'Finanças', impact: 'Investimentos em cursos e projetos sem retorno.' },
          { pillar: 'Relacionamentos', impact: 'As pessoas ao redor perdem confiança nas suas promessas.' },
          { pillar: 'Autoconfiança', impact: 'Cada ciclo interrompido reforça a narrativa de que "não consegue".' },
        ],
        exit_strategy: [
          { step: 'Definir uma única meta micro por dia', detail: 'Reduza a ação ao mínimo viável.' },
          { step: 'Registrar execução diária', detail: 'Apenas sim/não — sem julgamento.' },
          { step: 'Eliminar novos projetos por 30 dias', detail: 'Foco total no que já começou.' },
        ],
        all_scores: mockScores,
        direction: 'Sustentação da ação após o desaparecimento da motivação inicial.',
        combined_title: 'Execução Instável + Autocrítica Excessiva',
      });
      if (resultErr) throw resultErr;

      // 4. Create/update central profile
      const aggregated: Record<string, number> = {};
      mockScores.forEach(s => { aggregated[s.key] = s.percentage; });

      const { data: existing } = await supabase
        .from('user_central_profile')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (existing) {
        await supabase.from('user_central_profile').update({
          dominant_patterns: [{ key: 'unstable_execution', score: 72 }, { key: 'low_routine_sustenance', score: 74 }],
          aggregated_scores: aggregated,
          tests_completed: 1,
          last_test_at: new Date().toISOString(),
          mental_state: 'Entusiasmo intermitente seguido de esgotamento',
          core_pain: 'Sensação constante de que nunca termina nada',
          key_unlock_area: 'Sustentação da ação pós-motivação inicial',
          profile_name: 'O Velocista sem Linha de Chegada',
        }).eq('user_id', user.id);
      } else {
        await supabase.from('user_central_profile').insert({
          user_id: user.id,
          dominant_patterns: [{ key: 'unstable_execution', score: 72 }, { key: 'low_routine_sustenance', score: 74 }],
          aggregated_scores: aggregated,
          tests_completed: 1,
          last_test_at: new Date().toISOString(),
          mental_state: 'Entusiasmo intermitente seguido de esgotamento',
          core_pain: 'Sensação constante de que nunca termina nada',
          key_unlock_area: 'Sustentação da ação pós-motivação inicial',
          profile_name: 'O Velocista sem Linha de Chegada',
        });
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
      const { data: cp } = await supabase
        .from('user_central_profile')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (cp) {
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

      const { data: sessions } = await supabase
        .from('diagnostic_sessions')
        .select('id')
        .eq('user_id', user.id)
        .not('completed_at', 'is', null)
        .order('completed_at', { ascending: false })
        .limit(1);

      if (sessions && sessions.length > 0) {
        const { data: result } = await supabase
          .from('diagnostic_results')
          .select('*')
          .eq('session_id', sessions[0].id)
          .single();
        setLatestResult(result);
      }

      setLoading(false);
    };

    fetchData();
  }, [user]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!latestResult && !isSuperAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <motion.div {...fadeUp} transition={{ duration: 0.6 }} className="text-center space-y-6 max-w-md">
          <h1 className="text-3xl md:text-4xl">Bem-vindo, {profile?.name?.split(' ')[0]}</h1>
          <p className="text-[0.9rem] text-muted-foreground/70 leading-[1.7]">Você ainda não completou nenhuma leitura. Escolha um módulo para começar seu raio-x comportamental.</p>
          <button
            onClick={() => navigate('/tests')}
            className="px-10 py-[1rem] bg-primary text-primary-foreground rounded-2xl text-[0.95rem] font-semibold tracking-[0.02em] shadow-[0_8px_30px_-6px_hsl(var(--primary)/0.35)] hover:shadow-[0_12px_40px_-4px_hsl(var(--primary)/0.45)] hover:translate-y-[-1px] transition-all duration-300"
          >
            Ver módulos disponíveis
          </button>
        </motion.div>
      </div>
    );
  }

  const allScores = (latestResult.all_scores as any[]) || [];

  const radarData = centralProfile
    ? Object.entries(centralProfile.aggregated_scores).map(([key, value]) => ({
        axis: radarAxisLabels[key] || key,
        value,
      }))
    : allScores.map((s: any) => ({
        axis: radarAxisLabels[s.key] || s.label,
        value: s.percentage,
      }));

  const pillarData = [
    { name: 'Execução', value: centralProfile?.aggregated_scores?.unstable_execution || allScores.find((s: any) => s.key === 'unstable_execution')?.percentage || 0 },
    { name: 'Fuga', value: centralProfile?.aggregated_scores?.discomfort_escape || allScores.find((s: any) => s.key === 'discomfort_escape')?.percentage || 0 },
    { name: 'Reg. Emocional', value: centralProfile?.aggregated_scores?.emotional_self_sabotage || allScores.find((s: any) => s.key === 'emotional_self_sabotage')?.percentage || 0 },
    { name: 'Consistência', value: centralProfile?.aggregated_scores?.low_routine_sustenance || allScores.find((s: any) => s.key === 'low_routine_sustenance')?.percentage || 0 },
    { name: 'Autocrítica', value: centralProfile?.aggregated_scores?.excessive_self_criticism || allScores.find((s: any) => s.key === 'excessive_self_criticism')?.percentage || 0 },
  ];

  const cycle = latestResult.self_sabotage_cycle || [];
  const triggers = latestResult.triggers || [];
  const traps = latestResult.traps || [];
  const lifeImpact = (latestResult.life_impact as any[]) || [];

  return (
    <div className="min-h-screen px-4 py-8 md:py-12">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Header */}
        <motion.div {...fadeUp} transition={{ duration: 0.5 }} className="flex items-center justify-between">
          <div>
            <p className="text-[10px] tracking-[0.3em] uppercase text-primary/50 font-semibold">Painel de Leitura</p>
            <h1 className="text-2xl md:text-3xl mt-1">Olá, {profile?.name?.split(' ')[0]}</h1>
          </div>
          <div className="flex items-center gap-2 flex-wrap justify-end">
            {[
              { icon: LayoutGrid, label: 'Módulos', path: '/tests' },
              { icon: Layers, label: 'Relatório', path: '/central-report' },
              { icon: History, label: 'Histórico', path: '/history' },
              { icon: User, label: 'Perfil', path: '/profile' },
            ].map((item) => (
              <button key={item.path} onClick={() => navigate(item.path)} className="flex items-center gap-1.5 text-[0.75rem] text-muted-foreground/60 hover:text-foreground/80 transition-colors px-2.5 py-1.5 rounded-lg hover:bg-card/60">
                <item.icon className="w-3.5 h-3.5" /> {item.label}
              </button>
            ))}
            <button onClick={() => {
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
            }} className="flex items-center gap-1.5 text-[0.75rem] text-muted-foreground/60 hover:text-foreground/80 transition-colors px-2.5 py-1.5 rounded-lg hover:bg-card/60">
              <Download className="w-3.5 h-3.5" /> PDF
            </button>
            <button onClick={handleSignOut} className="flex items-center gap-1.5 text-[0.75rem] text-muted-foreground/60 hover:text-foreground/80 transition-colors px-2.5 py-1.5 rounded-lg hover:bg-card/60">
              <LogOut className="w-3.5 h-3.5" /> Sair
            </button>
          </div>
        </motion.div>

        {/* Admin empty state notice */}
        {isSuperAdmin && !latestResult && (
          <motion.div {...fadeUp} transition={{ delay: 0.03, duration: 0.5 }} className="bg-card/60 backdrop-blur-sm rounded-2xl border border-border/40 p-6 text-center space-y-4">
            <p className="text-[0.85rem] text-muted-foreground/60 leading-[1.7]">
              Você ainda não realizou análises. Os dados aparecerão conforme os testes forem feitos.
            </p>
            <div className="flex items-center justify-center gap-3 flex-wrap">
              <button
                onClick={() => navigate('/tests')}
                className="px-6 py-2.5 bg-primary/10 text-primary rounded-xl text-[0.8rem] font-medium hover:bg-primary/15 transition-colors"
              >
                Ver módulos disponíveis
              </button>
              <button
                onClick={generateTestData}
                disabled={generating}
                className="flex items-center gap-2 px-6 py-2.5 bg-primary text-primary-foreground rounded-xl text-[0.8rem] font-semibold shadow-[0_4px_16px_-4px_hsl(var(--primary)/0.3)] hover:shadow-[0_6px_24px_-4px_hsl(var(--primary)/0.4)] hover:translate-y-[-1px] transition-all duration-300 disabled:opacity-50"
              >
                <FlaskConical className="w-3.5 h-3.5" />
                {generating ? 'Gerando...' : 'Gerar dados de teste'}
              </button>
            </div>
          </motion.div>
        )}

        {/* Central Profile Card */}
        {centralProfile && centralProfile.tests_completed > 0 && (
          <motion.div {...fadeUp} transition={{ delay: 0.03, duration: 0.5 }} className="bg-gradient-to-br from-primary/[0.04] to-primary/[0.08] rounded-2xl border border-primary/15 p-6 md:p-8">
            <div className="flex items-center gap-3 mb-4">
              <Layers className="w-5 h-5 text-primary/60" />
              <h3 className="text-xl">Perfil Central Unificado</h3>
              <span className="text-[10px] tracking-[0.2em] uppercase bg-primary/[0.08] text-primary/70 px-3 py-1 rounded-full ml-auto font-semibold">
                {centralProfile.tests_completed} {centralProfile.tests_completed === 1 ? 'leitura' : 'leituras'}
              </span>
            </div>
            <div className="grid sm:grid-cols-3 gap-4">
              <div>
                <p className="text-[10px] tracking-[0.25em] uppercase text-muted-foreground/50 mb-1 font-medium">Perfil</p>
                <p className="text-lg font-medium text-foreground">{centralProfile.profile_name || '-'}</p>
              </div>
              {centralProfile.core_pain && (
                <div>
                  <p className="text-[10px] tracking-[0.25em] uppercase text-muted-foreground/50 mb-1 font-medium">Dor Central</p>
                  <p className="text-[0.82rem] text-foreground/75 leading-[1.6]">{centralProfile.core_pain.slice(0, 100)}...</p>
                </div>
              )}
              {centralProfile.key_unlock_area && (
                <div>
                  <p className="text-[10px] tracking-[0.25em] uppercase text-muted-foreground/50 mb-1 font-medium">Área-chave</p>
                  <p className="text-[0.82rem] text-foreground/75 leading-[1.6]">{centralProfile.key_unlock_area.slice(0, 100)}...</p>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* Current State Summary */}
        <motion.div {...fadeUp} transition={{ delay: 0.05, duration: 0.5 }} className="bg-card/80 backdrop-blur-sm rounded-2xl border border-border/60 p-6 md:p-8">
          <div className="flex items-center gap-3 mb-4">
            <Brain className="w-5 h-5 text-primary/60" />
            <h3 className="text-xl">Última Leitura</h3>
          </div>
          <div className="space-y-3">
            <span className="text-2xl text-foreground">{latestResult.profile_name}</span>
            <div className="flex items-center gap-2">
              <span className="text-[0.8rem] text-muted-foreground/60">Padrão dominante:</span>
              <span className="text-[0.8rem] font-medium text-foreground/80">{latestResult.combined_title}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[0.8rem] text-muted-foreground/60">Intensidade:</span>
              <span className="text-[0.8rem] font-semibold" style={{ color: intensityColor[latestResult.intensity] }}>
                {intensityLabel[latestResult.intensity] || latestResult.intensity}
              </span>
            </div>
            <p className="text-[0.85rem] text-foreground/65 leading-[1.75] mt-2">{latestResult.state_summary}</p>
          </div>
        </motion.div>

        {/* Charts */}
        <div className="grid md:grid-cols-2 gap-6">
          <motion.div {...fadeUp} transition={{ delay: 0.1, duration: 0.5 }} className="bg-card/80 backdrop-blur-sm rounded-2xl border border-border/60 p-6">
            <h3 className="text-lg mb-1">Gráfico de Funcionamento</h3>
            {centralProfile && centralProfile.tests_completed > 1 && (
              <p className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground/50 mb-3 font-medium">Agregado de {centralProfile.tests_completed} leituras</p>
            )}
            <ResponsiveContainer width="100%" height={280}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="hsl(var(--border))" />
                <PolarAngleAxis dataKey="axis" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                <Radar name="Intensidade" dataKey="value" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.12} strokeWidth={1.5} />
              </RadarChart>
            </ResponsiveContainer>
          </motion.div>

          <motion.div {...fadeUp} transition={{ delay: 0.15, duration: 0.5 }} className="bg-card/80 backdrop-blur-sm rounded-2xl border border-border/60 p-6">
            <h3 className="text-lg mb-4">Eixos Comportamentais</h3>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={pillarData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                <Tooltip />
                <Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </motion.div>
        </div>

        {/* Self-sabotage Cycle */}
        <motion.div {...fadeUp} transition={{ delay: 0.2, duration: 0.5 }} className="bg-card/80 backdrop-blur-sm rounded-2xl border border-border/60 p-6 md:p-8">
          <div className="flex items-center gap-3 mb-4">
            <Target className="w-5 h-5 text-primary/60" />
            <h3 className="text-xl">Ciclo de Comportamento</h3>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {cycle.map((step, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className={`px-3 py-1.5 rounded-xl text-[0.75rem] font-medium border ${
                  i === Math.floor(cycle.length / 2) ? 'bg-destructive/[0.06] border-destructive/20 text-destructive' : 'bg-muted/30 border-border/50 text-foreground/70'
                }`}>
                  {step}
                </span>
                {i < cycle.length - 1 && <ArrowRight className="w-3 h-3 text-muted-foreground/40 shrink-0" />}
              </div>
            ))}
          </div>
          <p className="text-[0.75rem] text-muted-foreground/50 mt-4 italic">
            O ponto destacado indica onde o travamento é mais intenso.
          </p>
        </motion.div>

        {/* Triggers + Traps */}
        <div className="grid md:grid-cols-2 gap-6">
          <motion.div {...fadeUp} transition={{ delay: 0.25, duration: 0.5 }} className="bg-card/80 backdrop-blur-sm rounded-2xl border border-border/60 p-6">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="w-5 h-5 text-primary/60" />
              <h3 className="text-lg">Gatilhos</h3>
            </div>
            <div className="space-y-2">
              {triggers.map((t, i) => (
                <div key={i} className="flex items-start gap-3 py-1.5">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-primary/50 shrink-0" />
                  <p className="text-[0.82rem] text-foreground/70 leading-[1.65]">{t}</p>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div {...fadeUp} transition={{ delay: 0.3, duration: 0.5 }} className="bg-card/80 backdrop-blur-sm rounded-2xl border border-border/60 p-6">
            <div className="flex items-center gap-3 mb-4">
              <Eye className="w-5 h-5 text-primary/60" />
              <h3 className="text-lg">Armadilhas Mentais</h3>
            </div>
            <div className="space-y-2">
              {traps.map((t, i) => (
                <div key={i} className="bg-muted/20 border border-border/40 rounded-xl px-4 py-2.5">
                  <p className="text-[0.82rem] text-foreground/75 italic leading-[1.65]">{t}</p>
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Life Impact */}
        <motion.div {...fadeUp} transition={{ delay: 0.35, duration: 0.5 }} className="bg-card/80 backdrop-blur-sm rounded-2xl border border-border/60 p-6 md:p-8">
          <h3 className="text-xl mb-4">Impacto nos Pilares</h3>
          <div className="grid sm:grid-cols-2 gap-4">
            {lifeImpact.slice(0, 4).map((item: any, i: number) => (
              <div key={i} className="border border-border/50 rounded-xl p-4">
                <h4 className="font-sans font-semibold text-[0.75rem] uppercase tracking-[0.15em] text-foreground/60 mb-1.5">{item.pillar}</h4>
                <p className="text-[0.82rem] text-foreground/65 leading-[1.65]">{item.impact}</p>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Current Focus */}
        <motion.div {...fadeUp} transition={{ delay: 0.4, duration: 0.5 }} className="bg-card/80 backdrop-blur-sm rounded-2xl border border-border/60 p-6 md:p-8">
          <div className="flex items-center gap-3 mb-4">
            <Compass className="w-5 h-5 text-primary/60" />
            <h3 className="text-xl">Foco Atual</h3>
          </div>
          <div className="border-l-2 border-primary/30 pl-5">
            <p className="text-foreground/75 leading-[1.75] italic text-[0.9rem]">{latestResult.direction}</p>
          </div>
        </motion.div>

        {/* Actions */}
        <motion.div {...fadeUp} transition={{ delay: 0.45, duration: 0.5 }} className="flex flex-col sm:flex-row gap-4 justify-center pb-12">
          <button
            onClick={() => navigate('/tests')}
            className="flex items-center justify-center gap-2.5 px-10 py-[1rem] bg-primary text-primary-foreground rounded-2xl text-[0.9rem] font-semibold tracking-[0.02em] shadow-[0_8px_30px_-6px_hsl(var(--primary)/0.35)] hover:shadow-[0_12px_40px_-4px_hsl(var(--primary)/0.45)] hover:translate-y-[-1px] transition-all duration-300"
          >
            <LayoutGrid className="w-4 h-4" /> Nova leitura
          </button>
          <button
            onClick={() => navigate('/history')}
            className="flex items-center justify-center gap-2.5 px-10 py-[1rem] border border-border/50 rounded-2xl text-[0.85rem] font-medium text-muted-foreground/70 hover:text-foreground/80 hover:border-border hover:bg-card/60 transition-all duration-300"
          >
            <History className="w-4 h-4" /> Ver histórico
          </button>
        </motion.div>
      </div>
    </div>
  );
};

export default Dashboard;
