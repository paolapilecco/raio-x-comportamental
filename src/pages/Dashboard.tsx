import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { Brain, AlertTriangle, Eye, Target, Compass, LogOut, History, RefreshCw, ArrowRight, Download } from 'lucide-react';
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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchLatest = async () => {
      const { data: sessions } = await supabase
        .from('diagnostic_sessions')
        .select('id')
        .eq('user_id', user.id)
        .not('completed_at', 'is', null)
        .order('completed_at', { ascending: false })
        .limit(1);

      if (!sessions || sessions.length === 0) {
        setLoading(false);
        return;
      }

      const { data: result } = await supabase
        .from('diagnostic_results')
        .select('*')
        .eq('session_id', sessions[0].id)
        .single();

      setLatestResult(result);
      setLoading(false);
    };

    fetchLatest();
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
          <h1 className="text-3xl">Bem-vindo, {profile?.name?.split(' ')[0]}</h1>
          <p className="text-muted-foreground">Você ainda não completou nenhum diagnóstico. Faça seu primeiro para acessar o dashboard completo.</p>
          <button
            onClick={() => navigate('/diagnostic')}
            className="px-8 py-3 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
          >
            Iniciar diagnóstico
          </button>
        </motion.div>
      </div>
    );
  }

  const allScores = (latestResult.all_scores as any[]) || [];
  const radarData = allScores.map((s: any) => ({
    axis: radarAxisLabels[s.key] || s.label,
    value: s.percentage,
  }));

  const pillarData = [
    { name: 'Execução', value: allScores.find((s: any) => s.key === 'unstable_execution')?.percentage || 0 },
    { name: 'Fuga', value: allScores.find((s: any) => s.key === 'discomfort_escape')?.percentage || 0 },
    { name: 'Reg. Emocional', value: allScores.find((s: any) => s.key === 'emotional_self_sabotage')?.percentage || 0 },
    { name: 'Consistência', value: allScores.find((s: any) => s.key === 'low_routine_sustenance')?.percentage || 0 },
    { name: 'Autocrítica', value: allScores.find((s: any) => s.key === 'excessive_self_criticism')?.percentage || 0 },
  ];

  const cycle = latestResult.self_sabotage_cycle || [];
  const triggers = latestResult.triggers || [];
  const traps = latestResult.traps || [];
  const lifeImpact = (latestResult.life_impact as any[]) || [];
  const patternDef = patternDefinitions[latestResult.dominant_pattern as PatternKey];

  return (
    <div className="min-h-screen px-4 py-8 md:py-12">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Header */}
        <motion.div {...fadeUp} transition={{ duration: 0.5 }} className="flex items-center justify-between">
          <div>
            <p className="text-sm text-subtle">Olá, {profile?.name?.split(' ')[0]}</p>
            <h1 className="text-2xl md:text-3xl">Dashboard</h1>
          </div>
          <div className="flex items-center gap-3">
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
            <button onClick={() => navigate('/history')} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
              <History className="w-4 h-4" /> Histórico
            </button>
            <button onClick={handleSignOut} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
              <LogOut className="w-4 h-4" /> Sair
            </button>
          </div>
        </motion.div>

        {/* Current State Summary */}
        <motion.div {...fadeUp} transition={{ delay: 0.05, duration: 0.5 }} className="bg-card rounded-xl border border-border p-6 md:p-8 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <Brain className="w-5 h-5 text-primary" />
            <h3 className="text-xl">Resumo do Estado Atual</h3>
          </div>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <span className="text-2xl font-serif text-foreground">{latestResult.profile_name}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-subtle">Padrão dominante:</span>
              <span className="text-sm font-medium text-foreground">{latestResult.combined_title}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-subtle">Intensidade:</span>
              <span className="text-sm font-semibold" style={{ color: intensityColor[latestResult.intensity] }}>
                {intensityLabel[latestResult.intensity] || latestResult.intensity}
              </span>
            </div>
            <p className="text-sm text-foreground/70 leading-relaxed mt-2">{latestResult.state_summary}</p>
          </div>
        </motion.div>

        {/* Charts */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Radar Chart */}
          <motion.div {...fadeUp} transition={{ delay: 0.1, duration: 0.5 }} className="bg-card rounded-xl border border-border p-6 shadow-sm">
            <h3 className="text-lg mb-4">Gráfico de Funcionamento</h3>
            <ResponsiveContainer width="100%" height={280}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="hsl(var(--border))" />
                <PolarAngleAxis dataKey="axis" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                <Radar name="Intensidade" dataKey="value" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.15} strokeWidth={2} />
              </RadarChart>
            </ResponsiveContainer>
          </motion.div>

          {/* Bar Chart */}
          <motion.div {...fadeUp} transition={{ delay: 0.15, duration: 0.5 }} className="bg-card rounded-xl border border-border p-6 shadow-sm">
            <h3 className="text-lg mb-4">Eixos Comportamentais</h3>
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
            <h3 className="text-xl">Ciclo de Comportamento</h3>
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
          <p className="text-xs text-subtle mt-4 italic">
            O ponto destacado em vermelho indica onde o travamento é mais intenso.
          </p>
        </motion.div>

        {/* Triggers + Traps side by side */}
        <div className="grid md:grid-cols-2 gap-6">
          <motion.div {...fadeUp} transition={{ delay: 0.25, duration: 0.5 }} className="bg-card rounded-xl border border-border p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="w-5 h-5 text-primary" />
              <h3 className="text-lg">Gatilhos</h3>
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
              <h3 className="text-lg">Armadilhas Mentais</h3>
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
          <h3 className="text-xl mb-4">Impacto nos Pilares</h3>
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
            <h3 className="text-xl">Foco Atual</h3>
          </div>
          <div className="border-l-2 border-primary pl-5">
            <p className="text-foreground/90 leading-relaxed italic">{latestResult.direction}</p>
          </div>
        </motion.div>

        {/* Actions */}
        <motion.div {...fadeUp} transition={{ delay: 0.45, duration: 0.5 }} className="flex flex-col sm:flex-row gap-4 justify-center pb-12">
          <button
            onClick={() => navigate('/diagnostic')}
            className="flex items-center justify-center gap-2 px-8 py-3 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
          >
            <RefreshCw className="w-4 h-4" /> Refazer diagnóstico
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
