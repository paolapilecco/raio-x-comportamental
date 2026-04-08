import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import {
  RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts';
import {
  ArrowLeft, Layers, Brain, AlertTriangle, TrendingUp, Shield,
  Crosshair, Compass, Activity, Zap, Sparkles, Eye, Target, Lightbulb,
  Lock, Crown, ArrowUpRight, ArrowDownRight, Minus,
} from 'lucide-react';
import { usePatternDefinitions } from '@/hooks/usePatternDefinitions';
import { useAxisLabels } from '@/hooks/useAxisLabels';
import type { PatternKey } from '@/types/diagnostic';
import { detectConflictPairs, CONFLICT_PAIR_DESCRIPTIONS } from '@/lib/conflictDetection';
import { toast } from 'sonner';
import { CentralReportSkeleton } from '@/components/skeletons/CentralReportSkeleton';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

interface AIInsights {
  interpretacao_personalizada: string;
  padroes_invisiveis: string[];
  contradicoes_profundas: string[];
  recomendacoes_praticas: string[];
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

interface HistoryEntry {
  all_scores: { key: string; percentage: number; label: string }[];
  created_at: string;
  dominant_pattern: string;
  intensity: string;
  test_module_id?: string | null;
}

interface LifeMapEntry {
  date: string;
  scores: Record<string, number>;
  created_at: string;
}

const LIFE_MAP_MODULE_ID = 'a17d95eb-fa4b-4fbc-802c-29f7d97d9d22';

const LIFE_MAP_AREAS = [
  'Saúde Física', 'Saúde Mental', 'Relacionamento Amoroso', 'Família',
  'Amizades', 'Carreira', 'Finanças', 'Crescimento Pessoal',
  'Diversão & Lazer', 'Espiritualidade', 'Contribuição Social',
];

const fadeUp = { initial: { opacity: 0, y: 15 }, animate: { opacity: 1, y: 0 } };

const CentralReport = () => {
  const { user, isPremium, isSuperAdmin } = useAuth();
  const navigate = useNavigate();
  const { data: patternDefinitions } = usePatternDefinitions();
  const radarAxisLabels = useAxisLabels();
  const [centralProfile, setCentralProfile] = useState<CentralProfile | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [lifeMapHistory, setLifeMapHistory] = useState<LifeMapEntry[]>([]);
  const [aiInsights, setAiInsights] = useState<AIInsights | null>(null);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [loading, setLoading] = useState(true);

  const hasAccess = isPremium || isSuperAdmin;

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      try {
        const { data: cp, error: cpErr } = await supabase
          .from('user_central_profile')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();

        if (cpErr) {
          console.error('Error fetching central profile:', cpErr);
          toast.error('Erro ao carregar perfil central.');
        }

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

        // Fetch all sessions with test_module_id
        const { data: sessions, error: sessErr } = await supabase
          .from('diagnostic_sessions')
          .select('id, completed_at, test_module_id')
          .eq('user_id', user.id)
          .not('completed_at', 'is', null)
          .order('completed_at', { ascending: true });

        if (sessErr) {
          console.error('Error fetching sessions:', sessErr);
          toast.error('Erro ao carregar sessões.');
        }

        if (sessions && sessions.length > 0) {
          const { data: results, error: resErr } = await supabase
            .from('diagnostic_results')
            .select('all_scores, created_at, dominant_pattern, intensity, session_id')
            .in('session_id', sessions.map(s => s.id));

          if (resErr) {
            console.error('Error fetching results:', resErr);
            toast.error('Erro ao carregar resultados.');
          }

          if (results) {
            const sessionMap = new Map(sessions.map(s => [s.id, s]));
            
            const allEntries = results.map(r => {
              const sess = sessionMap.get(r.session_id);
              return {
                all_scores: (r.all_scores as unknown as { key: string; percentage: number; label: string }[]) || [],
                created_at: r.created_at,
                dominant_pattern: r.dominant_pattern,
                intensity: r.intensity,
                test_module_id: sess?.test_module_id || null,
              };
            });
            
            setHistory(allEntries);

            // Extract life map entries
            const lifeMapEntries: LifeMapEntry[] = allEntries
              .filter(e => e.test_module_id === LIFE_MAP_MODULE_ID)
              .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
              .map(e => {
                const scores: Record<string, number> = {};
                e.all_scores.forEach(s => {
                  scores[s.label || s.key] = s.percentage;
                });
                return {
                  date: new Date(e.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }),
                  scores,
                  created_at: e.created_at,
                };
              });
            setLifeMapHistory(lifeMapEntries);
          }
        }
      } catch (err) {
        console.error('Error loading central report:', err);
        toast.error('Erro ao carregar relatório. Tente novamente.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  const generateInsights = async () => {
    setInsightsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-insights');
      if (error) throw error;
      setAiInsights(data as AIInsights);
    } catch (e: any) {
      console.error('Insights error:', e);
      toast.error('Erro ao gerar insights. Tente novamente.');
    } finally {
      setInsightsLoading(false);
    }
  };

  if (loading) {
    return <CentralReportSkeleton />;
  }

  if (!centralProfile || centralProfile.tests_completed === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <motion.div {...fadeUp} className="text-center space-y-6 max-w-md">
          <Layers className="w-12 h-12 text-muted-foreground mx-auto" />
          <h1 className="text-2xl font-serif">Relatório Central</h1>
          <p className="text-muted-foreground">Complete pelo menos uma leitura para gerar seu relatório central unificado.</p>
          <button onClick={() => navigate('/tests')} className="px-8 py-3 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity">
            Iniciar leitura
          </button>
        </motion.div>
      </div>
    );
  }

  const scores = centralProfile.aggregated_scores;
  const sorted = Object.entries(scores).sort(([, a], [, b]) => b - a);
  const dominantKey = sorted[0]?.[0] as PatternKey;
  const dominantDef = patternDefinitions?.[dominantKey];

  // Detect conflicts
  const detectedConflicts = detectConflictPairs(scores);

  // Sabotage risk
  const sabotageKeys: PatternKey[] = ['emotional_self_sabotage', 'discomfort_escape', 'unstable_execution', 'low_routine_sustenance'];
  const sabotageAvg = sabotageKeys.reduce((sum, k) => sum + (scores[k] || 0), 0) / sabotageKeys.length;
  const riskScore = sabotageAvg + detectedConflicts.length * 5;
  const riskLevel = riskScore >= 75 ? 'Crítico' : riskScore >= 60 ? 'Alto' : riskScore >= 40 ? 'Moderado' : 'Baixo';
  const riskColor = riskScore >= 75 ? 'text-red-500' : riskScore >= 60 ? 'text-orange-500' : riskScore >= 40 ? 'text-yellow-500' : 'text-green-500';

  // Dominant trigger from dominant pattern
  const dominantTrigger = dominantDef?.triggers?.[0] || 'Não identificado';

  // Future tendency
  const futureTendency = riskScore >= 60
    ? `Com risco ${riskLevel.toLowerCase()}, há tendência de intensificação dos padrões de ${dominantDef?.label?.toLowerCase() || 'autossabotagem'} se não houver intervenção. Os conflitos internos detectados podem amplificar o ciclo destrutivo.`
    : `Os padrões atuais estão em nível gerenciável. Com ação consistente na área de ${centralProfile.key_unlock_area?.substring(0, 60) || 'foco identificado'}, há potencial de melhoria significativa nos próximos ciclos.`;

  // Life areas affected
  const lifeAreas = [
    { area: 'Trabalho & Produtividade', affected: (scores.unstable_execution || 0) >= 50 || (scores.functional_overload || 0) >= 50, score: Math.max(scores.unstable_execution || 0, scores.functional_overload || 0) },
    { area: 'Rotina & Consistência', affected: (scores.low_routine_sustenance || 0) >= 50, score: scores.low_routine_sustenance || 0 },
    { area: 'Regulação Emocional', affected: (scores.emotional_self_sabotage || 0) >= 50, score: scores.emotional_self_sabotage || 0 },
    { area: 'Relacionamentos', affected: (scores.validation_dependency || 0) >= 50, score: scores.validation_dependency || 0 },
    { area: 'Autoestima & Identidade', affected: (scores.excessive_self_criticism || 0) >= 50 || (scores.paralyzing_perfectionism || 0) >= 50, score: Math.max(scores.excessive_self_criticism || 0, scores.paralyzing_perfectionism || 0) },
  ].sort((a, b) => b.score - a.score);

  // Radar data
  const radarData = Object.entries(scores).map(([key, value]) => ({
    axis: radarAxisLabels[key] || key,
    value,
  }));

  // Timeline data
  const timelineData = history.map((entry, i) => {
    const point: Record<string, any> = {
      date: new Date(entry.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }),
      index: i + 1,
    };
    entry.all_scores.forEach(s => {
      point[radarAxisLabels[s.key] || s.key] = s.percentage;
    });
    return point;
  });

  const timelineKeys = Object.keys(radarAxisLabels);
  const timelineColors = [
    'hsl(var(--primary))', 'hsl(0, 65%, 52%)', 'hsl(38, 72%, 50%)', 'hsl(152, 45%, 45%)',
    'hsl(270, 50%, 55%)', 'hsl(200, 60%, 50%)', 'hsl(330, 50%, 50%)', 'hsl(60, 60%, 45%)',
  ];

  // Premium overlay component
  const PremiumOverlay = () => (
    <div className="absolute inset-0 z-20 flex items-center justify-center rounded-xl">
      <div className="absolute inset-0 bg-background/60 backdrop-blur-md rounded-xl" />
      <div className="relative z-10 text-center space-y-4 px-6">
        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center mx-auto shadow-lg">
          <Lock className="w-6 h-6 text-white" />
        </div>
        <h3 className="text-lg font-serif text-foreground">Conteúdo Premium</h3>
        <p className="text-sm text-muted-foreground max-w-xs">
          Desbloqueie o relatório central completo com análise unificada e evolução do Mapa de Vida.
        </p>
        <button
          onClick={() => navigate('/checkout')}
          className="px-6 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity flex items-center gap-2 mx-auto"
        >
          <Crown className="w-4 h-4" />
          Desbloquear Premium
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen px-4 py-8 md:py-12">
      <div className="max-w-5xl mx-auto space-y-6 sm:space-y-8">
        {/* Header */}
        <motion.div {...fadeUp} transition={{ duration: 0.5 }} className="flex items-center gap-4">
          <button onClick={() => navigate('/dashboard')} className="text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl md:text-3xl font-serif">Relatório Central</h1>
            <p className="text-sm text-muted-foreground">Análise unificada de {centralProfile.tests_completed} {centralProfile.tests_completed === 1 ? 'leitura' : 'leituras'}</p>
          </div>
        </motion.div>

        {/* Tabs */}
        <Tabs defaultValue="central" className="w-full">
          <TabsList className="w-full grid grid-cols-2 bg-muted/50 rounded-xl p-1">
            <TabsTrigger value="central" className="rounded-lg text-sm data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <Layers className="w-4 h-4 mr-2" />
              Relatório Central
            </TabsTrigger>
            <TabsTrigger value="lifemap" className="rounded-lg text-sm data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <Compass className="w-4 h-4 mr-2" />
              Mapa de Vida
            </TabsTrigger>
          </TabsList>

          {/* ═══════════════════════════ TAB 1: RELATÓRIO CENTRAL ═══════════════════════════ */}
          <TabsContent value="central" className="mt-6">
            <div className="relative">
              {!hasAccess && <PremiumOverlay />}
              <div className={`space-y-6 sm:space-y-8 ${!hasAccess ? 'filter blur-sm pointer-events-none select-none' : ''}`}>
                {/* Global Dominant Pattern */}
                <motion.div {...fadeUp} transition={{ delay: 0.05 }} className="bg-gradient-to-br from-primary/5 to-primary/10 rounded-xl border border-primary/20 p-6 md:p-8 shadow-sm">
                  <div className="flex items-center gap-3 mb-4">
                    <Brain className="w-5 h-5 text-primary" />
                    <h3 className="text-xl font-serif">Padrão Dominante Global</h3>
                  </div>
                  <p className="text-2xl font-serif text-foreground mb-2">{dominantDef?.label || dominantKey}</p>
                  <p className="text-sm text-foreground/70 leading-relaxed mb-4">{dominantDef?.description}</p>
                  <div className="grid sm:grid-cols-2 gap-4 mt-4">
                    {centralProfile.core_pain && (
                      <div className="bg-background/50 rounded-lg p-4 border border-border">
                        <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Dor Central</p>
                        <p className="text-sm text-foreground/80">{centralProfile.core_pain}</p>
                      </div>
                    )}
                    {centralProfile.key_unlock_area && (
                      <div className="bg-background/50 rounded-lg p-4 border border-border">
                        <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Área de Destravamento</p>
                        <p className="text-sm text-foreground/80">{centralProfile.key_unlock_area}</p>
                      </div>
                    )}
                  </div>
                </motion.div>

                {/* Pattern Combination */}
                <motion.div {...fadeUp} transition={{ delay: 0.1 }} className="bg-card rounded-xl border border-border p-6 md:p-8 shadow-sm">
                  <div className="flex items-center gap-3 mb-4">
                    <Layers className="w-5 h-5 text-primary" />
                    <h3 className="text-xl font-serif">Combinação de Padrões</h3>
                  </div>
                  <div className="space-y-3">
                    {sorted.slice(0, 5).map(([key, score]) => {
                      const def = patternDefinitions?.[key as PatternKey];
                      return (
                        <div key={key} className="flex items-center gap-4">
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm font-medium text-foreground">{def?.label || key}</span>
                              <span className="text-xs text-muted-foreground">{score}%</span>
                            </div>
                            <div className="w-full bg-muted/50 rounded-full h-2">
                              <div className="bg-primary rounded-full h-2 transition-all duration-500" style={{ width: `${score}%` }} />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </motion.div>

                {/* Internal Conflicts */}
                {detectedConflicts.length > 0 && (
                  <motion.div {...fadeUp} transition={{ delay: 0.15 }} className="bg-card rounded-xl border border-destructive/20 p-6 md:p-8 shadow-sm">
                    <div className="flex items-center gap-3 mb-4">
                      <Zap className="w-5 h-5 text-destructive" />
                      <h3 className="text-xl font-serif">Contradições Internas</h3>
                    </div>
                    <div className="space-y-4">
                      {detectedConflicts.map(([a, b], i) => {
                        const pairKey = `${a}+${b}`;
                        const desc = CONFLICT_PAIR_DESCRIPTIONS[pairKey] || 'Conflito entre padrões opostos detectado.';
                        return (
                          <div key={i} className="bg-destructive/5 border border-destructive/10 rounded-lg p-4">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-sm font-medium text-foreground">
                                {patternDefinitions?.[a]?.label} × {patternDefinitions?.[b]?.label}
                              </span>
                            </div>
                            <p className="text-sm text-foreground/70">{desc}</p>
                          </div>
                        );
                      })}
                    </div>
                  </motion.div>
                )}

                {/* Dominant Trigger + Risk */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                  <motion.div {...fadeUp} transition={{ delay: 0.2 }} className="bg-card rounded-xl border border-border p-6 shadow-sm">
                    <div className="flex items-center gap-3 mb-4">
                      <Crosshair className="w-5 h-5 text-primary" />
                      <h3 className="text-lg font-serif">Gatilho Dominante</h3>
                    </div>
                    <p className="text-sm text-foreground/80 leading-relaxed">{dominantTrigger}</p>
                    {dominantDef?.triggers && dominantDef.triggers.length > 1 && (
                      <div className="mt-4 space-y-2">
                        <p className="text-xs text-muted-foreground uppercase tracking-wide">Outros gatilhos</p>
                        {dominantDef.triggers.slice(1, 4).map((t, i) => (
                          <div key={i} className="flex items-start gap-2">
                            <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-muted-foreground/40 shrink-0" />
                            <p className="text-xs text-foreground/60">{t}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </motion.div>

                  <motion.div {...fadeUp} transition={{ delay: 0.25 }} className="bg-card rounded-xl border border-border p-6 shadow-sm">
                    <div className="flex items-center gap-3 mb-4">
                      <Shield className="w-5 h-5 text-primary" />
                      <h3 className="text-lg font-serif">Risco de Autossabotagem</h3>
                    </div>
                    <p className={`text-3xl font-serif font-bold ${riskColor}`}>{riskLevel}</p>
                    <p className="text-xs text-muted-foreground mt-2">
                      Score: {Math.round(riskScore)} | {detectedConflicts.length} conflito(s) detectado(s)
                    </p>
                  </motion.div>
                </div>

                {/* Future Tendency */}
                <motion.div {...fadeUp} transition={{ delay: 0.3 }} className="bg-card rounded-xl border border-border p-6 md:p-8 shadow-sm">
                  <div className="flex items-center gap-3 mb-4">
                    <TrendingUp className="w-5 h-5 text-primary" />
                    <h3 className="text-xl font-serif">Tendência Futura</h3>
                  </div>
                  <p className="text-sm text-foreground/80 leading-relaxed">{futureTendency}</p>
                </motion.div>

                {/* Critical Life Areas */}
                <motion.div {...fadeUp} transition={{ delay: 0.35 }} className="bg-card rounded-xl border border-border p-6 md:p-8 shadow-sm">
                  <div className="flex items-center gap-3 mb-4">
                    <AlertTriangle className="w-5 h-5 text-primary" />
                    <h3 className="text-xl font-serif">Áreas Críticas da Vida</h3>
                  </div>
                  <div className="space-y-3">
                    {lifeAreas.map((area, i) => (
                      <div key={i} className="flex items-center gap-4">
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm text-foreground">{area.area}</span>
                            <span className={`text-xs font-medium ${area.score >= 60 ? 'text-destructive' : area.score >= 40 ? 'text-yellow-500' : 'text-green-500'}`}>
                              {area.score >= 60 ? 'Crítico' : area.score >= 40 ? 'Atenção' : 'OK'}
                            </span>
                          </div>
                          <div className="w-full bg-muted/50 rounded-full h-1.5">
                            <div
                              className={`rounded-full h-1.5 transition-all duration-500 ${area.score >= 60 ? 'bg-destructive' : area.score >= 40 ? 'bg-yellow-500' : 'bg-green-500'}`}
                              style={{ width: `${area.score}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>

                {/* Unified Radar */}
                <motion.div {...fadeUp} transition={{ delay: 0.4 }} className="bg-card rounded-xl border border-border p-6 md:p-8 shadow-sm">
                  <div className="flex items-center gap-3 mb-4">
                    <Activity className="w-5 h-5 text-primary" />
                    <h3 className="text-xl font-serif">Mapa de Funcionamento Global</h3>
                  </div>
                  <ResponsiveContainer width="100%" height={280}>
                    <RadarChart data={radarData}>
                      <PolarGrid stroke="hsl(var(--border))" />
                      <PolarAngleAxis dataKey="axis" tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} />
                      <Radar name="Score Global" dataKey="value" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.15} strokeWidth={2} />
                    </RadarChart>
                  </ResponsiveContainer>
                </motion.div>

                {/* Timeline Evolution */}
                {history.length > 1 && (
                  <motion.div {...fadeUp} transition={{ delay: 0.45 }} className="bg-card rounded-xl border border-border p-6 md:p-8 shadow-sm">
                    <div className="flex items-center gap-3 mb-4">
                      <Compass className="w-5 h-5 text-primary" />
                      <h3 className="text-xl font-serif">Evolução ao Longo do Tempo</h3>
                    </div>
                    <p className="text-xs text-muted-foreground mb-4">Cada ponto representa uma leitura realizada</p>
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={timelineData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="date" tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} />
                        <YAxis domain={[0, 100]} tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} width={30} />
                        <Tooltip />
                        <Legend />
                        {timelineKeys.map((key, i) => (
                          <Line
                            key={key}
                            type="monotone"
                            dataKey={radarAxisLabels[key]}
                            stroke={timelineColors[i % timelineColors.length]}
                            strokeWidth={2}
                            dot={{ r: 3 }}
                            connectNulls
                          />
                        ))}
                      </LineChart>
                    </ResponsiveContainer>
                  </motion.div>
                )}

                {/* AI Insights Section */}
                <motion.div {...fadeUp} transition={{ delay: 0.5 }} className="bg-gradient-to-br from-primary/5 via-primary/10 to-accent/5 rounded-xl border border-primary/20 p-6 md:p-8 shadow-sm">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <Sparkles className="w-5 h-5 text-primary" />
                      <h3 className="text-xl font-serif">Insights com IA</h3>
                    </div>
                    {!aiInsights && (
                      <button
                        onClick={generateInsights}
                        disabled={insightsLoading}
                        className="px-5 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2"
                      >
                        {insightsLoading ? (
                          <>
                            <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                            Analisando...
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-4 h-4" />
                            Gerar Análise
                          </>
                        )}
                      </button>
                    )}
                  </div>

                  {!aiInsights && !insightsLoading && (
                    <p className="text-sm text-muted-foreground">
                      A IA analisará todo o seu histórico de leituras para gerar interpretações personalizadas, padrões invisíveis e recomendações práticas.
                    </p>
                  )}

                  {insightsLoading && (
                    <div className="space-y-4 animate-pulse">
                      <div className="h-4 bg-muted/50 rounded w-full" />
                      <div className="h-4 bg-muted/50 rounded w-5/6" />
                      <div className="h-4 bg-muted/50 rounded w-4/6" />
                      <div className="h-4 bg-muted/50 rounded w-full" />
                    </div>
                  )}

                  {aiInsights && (
                    <div className="space-y-6">
                      <div>
                        <div className="flex items-center gap-2 mb-3">
                          <Brain className="w-4 h-4 text-primary" />
                          <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Interpretação Personalizada</p>
                        </div>
                        <div className="text-sm text-foreground/80 leading-relaxed whitespace-pre-line">
                          {aiInsights.interpretacao_personalizada}
                        </div>
                      </div>

                      {aiInsights.padroes_invisiveis.length > 0 && (
                        <div>
                          <div className="flex items-center gap-2 mb-3">
                            <Eye className="w-4 h-4 text-primary" />
                            <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Padrões Invisíveis</p>
                          </div>
                          <div className="space-y-2">
                            {aiInsights.padroes_invisiveis.map((p, i) => (
                              <div key={i} className="flex items-start gap-3 bg-background/50 border border-border rounded-lg p-3">
                                <span className="mt-0.5 w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center text-xs text-primary font-medium shrink-0">{i + 1}</span>
                                <p className="text-sm text-foreground/80">{p}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {aiInsights.contradicoes_profundas.length > 0 && (
                        <div>
                          <div className="flex items-center gap-2 mb-3">
                            <Target className="w-4 h-4 text-destructive" />
                            <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Contradições Profundas</p>
                          </div>
                          <div className="space-y-2">
                            {aiInsights.contradicoes_profundas.map((c, i) => (
                              <div key={i} className="flex items-start gap-3 bg-destructive/5 border border-destructive/10 rounded-lg p-3">
                                <Zap className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
                                <p className="text-sm text-foreground/80">{c}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {aiInsights.recomendacoes_praticas.length > 0 && (
                        <div>
                          <div className="flex items-center gap-2 mb-3">
                            <Lightbulb className="w-4 h-4 text-primary" />
                            <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Recomendações Práticas</p>
                          </div>
                          <div className="space-y-2">
                            {aiInsights.recomendacoes_praticas.map((r, i) => (
                              <div key={i} className="flex items-start gap-3 bg-primary/5 border border-primary/10 rounded-lg p-3">
                                <span className="mt-0.5 w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center text-xs text-primary font-medium shrink-0">✓</span>
                                <p className="text-sm text-foreground/80">{r}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <button
                        onClick={generateInsights}
                        disabled={insightsLoading}
                        className="text-sm text-primary hover:underline flex items-center gap-1"
                      >
                        <Sparkles className="w-3 h-3" />
                        Gerar nova análise
                      </button>
                    </div>
                  )}
                </motion.div>
              </div>
            </div>
          </TabsContent>

          {/* ═══════════════════════════ TAB 2: MAPA DE VIDA ═══════════════════════════ */}
          <TabsContent value="lifemap" className="mt-6">
            <div className="relative">
              {!hasAccess && <PremiumOverlay />}
              <div className={`space-y-6 sm:space-y-8 ${!hasAccess ? 'filter blur-sm pointer-events-none select-none' : ''}`}>
                {lifeMapHistory.length === 0 ? (
                  <motion.div {...fadeUp} className="bg-card rounded-xl border border-border p-8 text-center space-y-4">
                    <Compass className="w-10 h-10 text-muted-foreground mx-auto" />
                    <h3 className="text-lg font-serif">Nenhum Mapa de Vida realizado</h3>
                    <p className="text-sm text-muted-foreground max-w-md mx-auto">
                      Complete o teste "Mapa de Vida & Evolução" para visualizar sua evolução aqui. Refaça-o mensalmente para acompanhar seu progresso.
                    </p>
                    <button onClick={() => navigate('/tests')} className="px-6 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity">
                      Ir para Catálogo
                    </button>
                  </motion.div>
                ) : (
                  <>
                    {/* Latest Radar */}
                    <motion.div {...fadeUp} transition={{ delay: 0.05 }} className="bg-card rounded-xl border border-border p-6 md:p-8 shadow-sm">
                      <div className="flex items-center gap-3 mb-2">
                        <Activity className="w-5 h-5 text-primary" />
                        <h3 className="text-xl font-serif">Mapa de Vida Atual</h3>
                      </div>
                      <p className="text-xs text-muted-foreground mb-4">
                        Última avaliação: {lifeMapHistory[lifeMapHistory.length - 1].date}
                      </p>
                      {(() => {
                        const latest = lifeMapHistory[lifeMapHistory.length - 1];
                        const radarEntries = Object.entries(latest.scores).map(([key, val]) => ({
                          area: key,
                          nota: Math.round(val / 10), // percentage to 0-10 scale
                        }));
                        return (
                          <ResponsiveContainer width="100%" height={320}>
                            <RadarChart data={radarEntries}>
                              <PolarGrid stroke="hsl(var(--border))" />
                              <PolarAngleAxis dataKey="area" tick={{ fontSize: 8, fill: 'hsl(var(--muted-foreground))' }} />
                              <Radar name="Nota Atual" dataKey="nota" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.2} strokeWidth={2} />
                            </RadarChart>
                          </ResponsiveContainer>
                        );
                      })()}
                    </motion.div>

                    {/* Evolution Comparison */}
                    {lifeMapHistory.length >= 2 && (
                      <motion.div {...fadeUp} transition={{ delay: 0.1 }} className="bg-card rounded-xl border border-border p-6 md:p-8 shadow-sm">
                        <div className="flex items-center gap-3 mb-2">
                          <TrendingUp className="w-5 h-5 text-primary" />
                          <h3 className="text-xl font-serif">Comparativo de Evolução</h3>
                        </div>
                        <p className="text-xs text-muted-foreground mb-6">
                          {lifeMapHistory.length} avaliações realizadas — comparando a mais recente com a anterior
                        </p>

                        {(() => {
                          const latest = lifeMapHistory[lifeMapHistory.length - 1];
                          const previous = lifeMapHistory[lifeMapHistory.length - 2];

                          const allKeys = Array.from(new Set([...Object.keys(latest.scores), ...Object.keys(previous.scores)]));
                          
                          const comparisons = allKeys.map(key => {
                            const curr = Math.round((latest.scores[key] || 0) / 10);
                            const prev = Math.round((previous.scores[key] || 0) / 10);
                            const diff = curr - prev;
                            return { area: key, current: curr, previous: prev, diff };
                          }).sort((a, b) => b.diff - a.diff);

                          return (
                            <div className="space-y-3">
                              {/* Header labels */}
                              <div className="grid grid-cols-12 gap-2 text-xs text-muted-foreground uppercase tracking-wide px-1 mb-2">
                                <span className="col-span-4">Área</span>
                                <span className="col-span-2 text-center">Anterior</span>
                                <span className="col-span-2 text-center">Atual</span>
                                <span className="col-span-2 text-center">Variação</span>
                                <span className="col-span-2 text-center">Status</span>
                              </div>

                              {comparisons.map((c, i) => (
                                <div key={i} className="grid grid-cols-12 gap-2 items-center bg-muted/20 rounded-lg p-3 border border-border/30">
                                  <span className="col-span-4 text-sm font-medium text-foreground truncate">{c.area}</span>
                                  <span className="col-span-2 text-center text-sm text-muted-foreground">{c.previous}</span>
                                  <span className="col-span-2 text-center text-sm font-medium text-foreground">{c.current}</span>
                                  <span className={`col-span-2 text-center text-sm font-semibold flex items-center justify-center gap-1 ${
                                    c.diff > 0 ? 'text-green-500' : c.diff < 0 ? 'text-red-500' : 'text-muted-foreground'
                                  }`}>
                                    {c.diff > 0 ? <ArrowUpRight className="w-3.5 h-3.5" /> : c.diff < 0 ? <ArrowDownRight className="w-3.5 h-3.5" /> : <Minus className="w-3.5 h-3.5" />}
                                    {c.diff > 0 ? `+${c.diff}` : c.diff}
                                  </span>
                                  <span className="col-span-2 text-center">
                                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                      c.diff > 0 ? 'bg-green-500/10 text-green-600' : c.diff < 0 ? 'bg-red-500/10 text-red-600' : 'bg-muted text-muted-foreground'
                                    }`}>
                                      {c.diff > 0 ? 'Melhorou' : c.diff < 0 ? 'Caiu' : 'Estável'}
                                    </span>
                                  </span>
                                </div>
                              ))}

                              {/* Summary */}
                              {(() => {
                                const improved = comparisons.filter(c => c.diff > 0).length;
                                const declined = comparisons.filter(c => c.diff < 0).length;
                                const stable = comparisons.filter(c => c.diff === 0).length;
                                return (
                                  <div className="grid grid-cols-3 gap-3 mt-4">
                                    <div className="bg-green-500/5 border border-green-500/20 rounded-lg p-3 text-center">
                                      <p className="text-2xl font-serif font-bold text-green-500">{improved}</p>
                                      <p className="text-xs text-muted-foreground">Melhoraram</p>
                                    </div>
                                    <div className="bg-muted/30 border border-border rounded-lg p-3 text-center">
                                      <p className="text-2xl font-serif font-bold text-muted-foreground">{stable}</p>
                                      <p className="text-xs text-muted-foreground">Estáveis</p>
                                    </div>
                                    <div className="bg-red-500/5 border border-red-500/20 rounded-lg p-3 text-center">
                                      <p className="text-2xl font-serif font-bold text-red-500">{declined}</p>
                                      <p className="text-xs text-muted-foreground">Caíram</p>
                                    </div>
                                  </div>
                                );
                              })()}
                            </div>
                          );
                        })()}
                      </motion.div>
                    )}

                    {/* Full Timeline Chart */}
                    {lifeMapHistory.length >= 2 && (
                      <motion.div {...fadeUp} transition={{ delay: 0.15 }} className="bg-card rounded-xl border border-border p-6 md:p-8 shadow-sm">
                        <div className="flex items-center gap-3 mb-2">
                          <Compass className="w-5 h-5 text-primary" />
                          <h3 className="text-xl font-serif">Linha do Tempo — Mapa de Vida</h3>
                        </div>
                        <p className="text-xs text-muted-foreground mb-4">Evolução das notas por área ao longo das avaliações</p>
                        {(() => {
                          const chartData = lifeMapHistory.map(entry => {
                            const point: Record<string, any> = { date: entry.date };
                            Object.entries(entry.scores).forEach(([key, val]) => {
                              point[key] = Math.round(val / 10);
                            });
                            return point;
                          });
                          const areaKeys = Object.keys(lifeMapHistory[0].scores);
                          const areaColors = [
                            '#22c55e', '#3b82f6', '#ef4444', '#f59e0b', '#8b5cf6',
                            '#06b6d4', '#ec4899', '#14b8a6', '#f97316', '#6366f1', '#84cc16',
                          ];
                          return (
                            <ResponsiveContainer width="100%" height={350}>
                              <LineChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                                <XAxis dataKey="date" tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} />
                                <YAxis domain={[0, 10]} tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} width={25} />
                                <Tooltip />
                                <Legend wrapperStyle={{ fontSize: 10 }} />
                                {areaKeys.map((key, i) => (
                                  <Line
                                    key={key}
                                    type="monotone"
                                    dataKey={key}
                                    stroke={areaColors[i % areaColors.length]}
                                    strokeWidth={2}
                                    dot={{ r: 3 }}
                                    connectNulls
                                  />
                                ))}
                              </LineChart>
                            </ResponsiveContainer>
                          );
                        })()}
                      </motion.div>
                    )}

                    {/* All evaluations list */}
                    <motion.div {...fadeUp} transition={{ delay: 0.2 }} className="bg-card rounded-xl border border-border p-6 md:p-8 shadow-sm">
                      <div className="flex items-center gap-3 mb-4">
                        <Layers className="w-5 h-5 text-primary" />
                        <h3 className="text-xl font-serif">Histórico de Avaliações</h3>
                      </div>
                      <div className="space-y-3">
                        {[...lifeMapHistory].reverse().map((entry, i) => {
                          const avg = Object.values(entry.scores).reduce((a, b) => a + b, 0) / Math.max(Object.values(entry.scores).length, 1);
                          return (
                            <div key={i} className="flex items-center justify-between bg-muted/20 rounded-lg p-4 border border-border/30">
                              <div>
                                <p className="text-sm font-medium text-foreground">{entry.date}</p>
                                <p className="text-xs text-muted-foreground">{Object.keys(entry.scores).length} áreas avaliadas</p>
                              </div>
                              <div className="text-right">
                                <p className="text-lg font-serif font-bold text-primary">{(avg / 10).toFixed(1)}</p>
                                <p className="text-xs text-muted-foreground">Média geral</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </motion.div>
                  </>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Actions */}
        <motion.div {...fadeUp} transition={{ delay: 0.5 }} className="flex flex-col sm:flex-row gap-4 justify-center pb-12">
          <button onClick={() => navigate('/dashboard')} className="px-8 py-3 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity">
            Voltar ao Dashboard
          </button>
          <button onClick={() => navigate('/tests')} className="px-8 py-3 border border-border rounded-lg text-sm font-medium text-foreground hover:bg-muted/50 transition-colors">
            Nova leitura
          </button>
        </motion.div>
      </div>
    </div>
  );
};

export default CentralReport;
