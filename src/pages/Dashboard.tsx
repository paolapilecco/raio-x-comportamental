import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { Brain, AlertTriangle, Eye, Target, Compass, LogOut, History, RefreshCw, ArrowRight, Download, LayoutGrid, Layers } from 'lucide-react';
import { patternDefinitions } from '@/data/patterns';
import { generateDiagnosticPdf } from '@/lib/generatePdf';
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
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [latestResult, setLatestResult] = useState<StoredResult | null>(null);
  const [centralProfile, setCentralProfile] = useState<CentralProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      // Fetch central profile
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

      // Fetch latest result
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
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!latestResult) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <motion.div {...fadeUp} transition={{ duration: 0.6 }} className="text-center space-y-6 max-w-md">
          <h1 className="text-3xl font-serif">Bem-vindo, {profile?.name?.split(' ')[0]}</h1>
          <p className="text-muted-foreground">Você ainda não completou nenhuma leitura. Escolha um módulo para começar seu raio-x comportamental.</p>
          <button
            onClick={() => navigate('/tests')}
            className="px-8 py-3 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
          >
            Ver módulos disponíveis
          </button>
        </motion.div>
      </div>
    );
  }

  const allScores = (latestResult.all_scores as any[]) || [];

  // Use central profile aggregated scores for radar if available
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
            <p className="text-sm text-muted-foreground">Olá, {profile?.name?.split(' ')[0]}</p>
            <h1 className="text-2xl md:text-3xl font-serif">Dashboard</h1>
          </div>
          <div className="flex items-center gap-3 flex-wrap justify-end">
            <button onClick={() => navigate('/tests')} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
              <LayoutGrid className="w-4 h-4" /> Módulos
            </button>
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
            }} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
              <Download className="w-4 h-4" /> PDF
            </button>
            <button onClick={() => navigate('/central-report')} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
              <Layers className="w-4 h-4" /> Relatório Central
            </button>
            <button onClick={() => navigate('/history')} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
              <History className="w-4 h-4" /> Histórico
            </button>
            <button onClick={handleSignOut} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
              <LogOut className="w-4 h-4" /> Sair
            </button>
          </div>
        </motion.div>

        {/* Central Profile Card */}
        {centralProfile && centralProfile.tests_completed > 0 && (
          <motion.div {...fadeUp} transition={{ delay: 0.03, duration: 0.5 }} className="bg-gradient-to-br from-primary/5 to-primary/10 rounded-xl border border-primary/20 p-6 md:p-8 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <Layers className="w-5 h-5 text-primary" />
              <h3 className="text-xl font-serif">Perfil Central Unificado</h3>
              <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded ml-auto">
                {centralProfile.tests_completed} {centralProfile.tests_completed === 1 ? 'leitura realizada' : 'leituras realizadas'}
              </span>
            </div>
            <div className="grid sm:grid-cols-3 gap-4">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Perfil</p>
                <p className="text-lg font-medium text-foreground">{centralProfile.profile_name || '-'}</p>
              </div>
              {centralProfile.core_pain && (
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Dor Central</p>
                  <p className="text-sm text-foreground/80">{centralProfile.core_pain.slice(0, 100)}...</p>
                </div>
              )}
              {centralProfile.key_unlock_area && (
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Área-chave</p>
                  <p className="text-sm text-foreground/80">{centralProfile.key_unlock_area.slice(0, 100)}...</p>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* Current State Summary */}
        <motion.div {...fadeUp} transition={{ delay: 0.05, duration: 0.5 }} className="bg-card rounded-xl border border-border p-6 md:p-8 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <Brain className="w-5 h-5 text-primary" />
            <h3 className="text-xl font-serif">Último Diagnóstico</h3>
          </div>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <span className="text-2xl font-serif text-foreground">{latestResult.profile_name}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Padrão dominante:</span>
              <span className="text-sm font-medium text-foreground">{latestResult.combined_title}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Intensidade:</span>
              <span className="text-sm font-semibold" style={{ color: intensityColor[latestResult.intensity] }}>
                {intensityLabel[latestResult.intensity] || latestResult.intensity}
              </span>
            </div>
            <p className="text-sm text-foreground/70 leading-relaxed mt-2">{latestResult.state_summary}</p>
          </div>
        </motion.div>

        {/* Charts */}
        <div className="grid md:grid-cols-2 gap-6">
          <motion.div {...fadeUp} transition={{ delay: 0.1, duration: 0.5 }} className="bg-card rounded-xl border border-border p-6 shadow-sm">
            <h3 className="text-lg mb-1 font-serif">Gráfico de Funcionamento</h3>
            {centralProfile && centralProfile.tests_completed > 1 && (
              <p className="text-xs text-muted-foreground mb-3">Agregado de {centralProfile.tests_completed} testes</p>
            )}
            <ResponsiveContainer width="100%" height={280}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="hsl(var(--border))" />
                <PolarAngleAxis dataKey="axis" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                <Radar name="Intensidade" dataKey="value" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.15} strokeWidth={2} />
              </RadarChart>
            </ResponsiveContainer>
          </motion.div>

          <motion.div {...fadeUp} transition={{ delay: 0.15, duration: 0.5 }} className="bg-card rounded-xl border border-border p-6 shadow-sm">
            <h3 className="text-lg mb-4 font-serif">Eixos Comportamentais</h3>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={pillarData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                <Tooltip />
                <Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </motion.div>
        </div>

        {/* Self-sabotage Cycle */}
        <motion.div {...fadeUp} transition={{ delay: 0.2, duration: 0.5 }} className="bg-card rounded-xl border border-border p-6 md:p-8 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <Target className="w-5 h-5 text-primary" />
            <h3 className="text-xl font-serif">Ciclo de Comportamento</h3>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {cycle.map((step, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className={`px-3 py-1.5 rounded-lg text-xs font-medium border ${
                  i === Math.floor(cycle.length / 2) ? 'bg-destructive/10 border-destructive/30 text-destructive' : 'bg-muted/50 border-border text-foreground/80'
                }`}>
                  {step}
                </span>
                {i < cycle.length - 1 && <ArrowRight className="w-3 h-3 text-muted-foreground shrink-0" />}
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-4 italic">
            O ponto destacado em vermelho indica onde o travamento é mais intenso.
          </p>
        </motion.div>

        {/* Triggers + Traps side by side */}
        <div className="grid md:grid-cols-2 gap-6">
          <motion.div {...fadeUp} transition={{ delay: 0.25, duration: 0.5 }} className="bg-card rounded-xl border border-border p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="w-5 h-5 text-primary" />
              <h3 className="text-lg font-serif">Gatilhos</h3>
            </div>
            <div className="space-y-2">
              {triggers.map((t, i) => (
                <div key={i} className="flex items-start gap-3 py-1.5">
                  <span className="mt-1.5 w-2 h-2 rounded-full bg-primary/60 shrink-0" />
                  <p className="text-sm text-foreground/80">{t}</p>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div {...fadeUp} transition={{ delay: 0.3, duration: 0.5 }} className="bg-card rounded-xl border border-border p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <Eye className="w-5 h-5 text-primary" />
              <h3 className="text-lg font-serif">Armadilhas Mentais</h3>
            </div>
            <div className="space-y-2">
              {traps.map((t, i) => (
                <div key={i} className="bg-muted/30 border border-border rounded-lg px-4 py-2.5">
                  <p className="text-sm text-foreground/90 italic">{t}</p>
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Life Impact */}
        <motion.div {...fadeUp} transition={{ delay: 0.35, duration: 0.5 }} className="bg-card rounded-xl border border-border p-6 md:p-8 shadow-sm">
          <h3 className="text-xl mb-4 font-serif">Impacto nos Pilares</h3>
          <div className="grid sm:grid-cols-2 gap-4">
            {lifeImpact.slice(0, 4).map((item: any, i: number) => (
              <div key={i} className="border border-border rounded-lg p-4">
                <h4 className="font-sans font-semibold text-sm uppercase tracking-wide text-foreground mb-1">{item.pillar}</h4>
                <p className="text-xs text-foreground/70 leading-relaxed">{item.impact}</p>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Current Focus */}
        <motion.div {...fadeUp} transition={{ delay: 0.4, duration: 0.5 }} className="bg-card rounded-xl border border-border p-6 md:p-8 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <Compass className="w-5 h-5 text-primary" />
            <h3 className="text-xl font-serif">Foco Atual</h3>
          </div>
          <div className="border-l-2 border-primary pl-5">
            <p className="text-foreground/90 leading-relaxed italic">{latestResult.direction}</p>
          </div>
        </motion.div>

        {/* Actions */}
        <motion.div {...fadeUp} transition={{ delay: 0.45, duration: 0.5 }} className="flex flex-col sm:flex-row gap-4 justify-center pb-12">
          <button
            onClick={() => navigate('/tests')}
            className="flex items-center justify-center gap-2 px-8 py-3 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
          >
            <LayoutGrid className="w-4 h-4" /> Fazer novo teste
          </button>
          <button
            onClick={() => navigate('/history')}
            className="flex items-center justify-center gap-2 px-8 py-3 border border-border rounded-lg text-sm font-medium text-foreground hover:bg-muted/50 transition-colors"
          >
            <History className="w-4 h-4" /> Ver histórico
          </button>
        </motion.div>
      </div>
    </div>
  );
};

export default Dashboard;
