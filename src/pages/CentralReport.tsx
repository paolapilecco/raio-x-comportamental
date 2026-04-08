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
  Lock, Crown, ArrowUpRight, ArrowDownRight, Minus, Users, User,
  ClipboardList, CheckCircle2, ChevronRight,
} from 'lucide-react';
import { usePatternDefinitions } from '@/hooks/usePatternDefinitions';
import { useAxisLabels } from '@/hooks/useAxisLabels';
import type { PatternKey } from '@/types/diagnostic';
import { detectConflictPairs, CONFLICT_PAIR_DESCRIPTIONS } from '@/lib/conflictDetection';
import { toast } from 'sonner';
import { CentralReportSkeleton } from '@/components/skeletons/CentralReportSkeleton';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

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

interface ManagedPerson {
  id: string;
  name: string;
  cpf: string;
  phone: string | null;
  birth_date: string;
  age: number | null;
}

interface PersonSummary {
  person: ManagedPerson;
  testsCount: number;
  lastTestDate: string | null;
  dominantPattern: string | null;
  keyActions: string[];
}

const LIFE_MAP_MODULE_ID = 'a17d95eb-fa4b-4fbc-802c-29f7d97d9d22';

const fadeUp = { initial: { opacity: 0, y: 15 }, animate: { opacity: 1, y: 0 } };

const CentralReport = () => {
  const { user, isPremium, isSuperAdmin } = useAuth();
  const navigate = useNavigate();
  const { data: patternDefinitions } = usePatternDefinitions();
  const radarAxisLabels = useAxisLabels();

  const [managedPersons, setManagedPersons] = useState<ManagedPerson[]>([]);
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);
  const [personSummaries, setPersonSummaries] = useState<PersonSummary[]>([]);

  const [centralProfile, setCentralProfile] = useState<CentralProfile | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [lifeMapHistory, setLifeMapHistory] = useState<LifeMapEntry[]>([]);
  const [aiInsights, setAiInsights] = useState<AIInsights | null>(null);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingReport, setLoadingReport] = useState(false);

  const hasAccess = isPremium || isSuperAdmin;

  // 1. Load managed persons and build summaries
  useEffect(() => {
    if (!user) return;
    const load = async () => {
      try {
        const { data: persons } = await supabase
          .from('managed_persons')
          .select('*')
          .eq('owner_id', user.id)
          .order('created_at', { ascending: true });

        if (!persons || persons.length === 0) {
          setLoading(false);
          return;
        }
        setManagedPersons(persons);

        // Get all sessions for this user
        const { data: sessions } = await supabase
          .from('diagnostic_sessions')
          .select('id, completed_at, test_module_id, person_id')
          .eq('user_id', user.id)
          .not('completed_at', 'is', null)
          .order('completed_at', { ascending: false });

        // Get results for all sessions
        let allResults: any[] = [];
        if (sessions && sessions.length > 0) {
          const { data: results } = await supabase
            .from('diagnostic_results')
            .select('session_id, dominant_pattern, all_scores, key_unlock_area, core_pain, direction')
            .in('session_id', sessions.map(s => s.id));
          allResults = results || [];
        }

        // Build per-person summaries
        const summaries: PersonSummary[] = persons.map(person => {
          const personSessions = (sessions || []).filter(s => s.person_id === person.id);
          const personSessionIds = new Set(personSessions.map(s => s.id));
          const personResults = allResults.filter(r => personSessionIds.has(r.session_id));

          const lastSession = personSessions[0];
          const latestResult = personResults[0];

          const keyActions: string[] = [];
          if (latestResult?.key_unlock_area) keyActions.push(latestResult.key_unlock_area);
          if (latestResult?.direction) keyActions.push(latestResult.direction.substring(0, 100));

          return {
            person,
            testsCount: personSessions.length,
            lastTestDate: lastSession?.completed_at || null,
            dominantPattern: latestResult?.dominant_pattern || null,
            keyActions: keyActions.slice(0, 2),
          };
        });

        setPersonSummaries(summaries);
      } catch (err) {
        console.error('Error loading persons:', err);
        toast.error('Erro ao carregar dados.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user]);

  // 2. Load report data when a person is selected
  useEffect(() => {
    if (!user || !selectedPersonId) return;
    setLoadingReport(true);
    setCentralProfile(null);
    setHistory([]);
    setLifeMapHistory([]);
    setAiInsights(null);

    const fetchPersonData = async () => {
      try {
        // Sessions for this person
        const { data: sessions } = await supabase
          .from('diagnostic_sessions')
          .select('id, completed_at, test_module_id, person_id')
          .eq('user_id', user.id)
          .eq('person_id', selectedPersonId)
          .not('completed_at', 'is', null)
          .order('completed_at', { ascending: true });

        if (!sessions || sessions.length === 0) {
          setLoadingReport(false);
          return;
        }

        const { data: results } = await supabase
          .from('diagnostic_results')
          .select('*')
          .in('session_id', sessions.map(s => s.id));

        if (!results || results.length === 0) {
          setLoadingReport(false);
          return;
        }

        // Build aggregated profile from results
        const axisData: Record<string, { totalWeighted: number; totalWeight: number; count: number }> = {};
        results.forEach((result, index) => {
          const recencyWeight = Math.pow(0.85, results.length - 1 - index);
          const scores = (result.all_scores as unknown as { key: string; percentage: number; label: string }[]) || [];
          scores.forEach(s => {
            if (!axisData[s.key]) axisData[s.key] = { totalWeighted: 0, totalWeight: 0, count: 0 };
            axisData[s.key].totalWeighted += s.percentage * recencyWeight;
            axisData[s.key].totalWeight += recencyWeight;
            axisData[s.key].count += 1;
          });
        });

        const aggregatedScores: Record<string, number> = {};
        Object.entries(axisData).forEach(([key, val]) => {
          aggregatedScores[key] = Math.round(val.totalWeighted / val.totalWeight);
        });

        const sortedPatterns = Object.entries(aggregatedScores)
          .sort(([, a], [, b]) => b - a)
          .map(([key, score]) => ({ key, score }));

        const latestResult = results[results.length - 1];

        setCentralProfile({
          dominant_patterns: sortedPatterns.slice(0, 3),
          aggregated_scores: aggregatedScores,
          tests_completed: sessions.length,
          mental_state: latestResult.mental_state,
          core_pain: latestResult.core_pain || null,
          key_unlock_area: latestResult.key_unlock_area || null,
          profile_name: latestResult.profile_name,
          last_test_at: sessions[sessions.length - 1].completed_at,
        });

        // Build history entries
        const sessionMap = new Map(sessions.map(s => [s.id, s]));
        const allEntries: HistoryEntry[] = results.map(r => {
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

        // Life map entries
        const lifeMapEntries: LifeMapEntry[] = allEntries
          .filter(e => e.test_module_id === LIFE_MAP_MODULE_ID)
          .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
          .map(e => {
            const scores: Record<string, number> = {};
            e.all_scores.forEach(s => { scores[s.label || s.key] = s.percentage; });
            return {
              date: new Date(e.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }),
              scores,
              created_at: e.created_at,
            };
          });
        setLifeMapHistory(lifeMapEntries);
      } catch (err) {
        console.error('Error loading person report:', err);
        toast.error('Erro ao carregar relatório.');
      } finally {
        setLoadingReport(false);
      }
    };
    fetchPersonData();
  }, [user, selectedPersonId]);

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

  if (loading) return <CentralReportSkeleton />;

  if (managedPersons.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <motion.div {...fadeUp} className="text-center space-y-6 max-w-md">
          <Users className="w-12 h-12 text-muted-foreground mx-auto" />
          <h1 className="text-2xl font-serif">Relatório Central</h1>
          <p className="text-muted-foreground">Nenhum perfil cadastrado. Complete o onboarding para começar.</p>
          <button onClick={() => navigate('/onboarding')} className="px-8 py-3 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity">
            Ir para Onboarding
          </button>
        </motion.div>
      </div>
    );
  }

  const totalTests = personSummaries.reduce((s, p) => s + p.testsCount, 0);
  const totalActions = personSummaries.reduce((s, p) => s + p.keyActions.length, 0);
  const selectedPerson = managedPersons.find(p => p.id === selectedPersonId);

  // Helper: fake preview data for non-premium summary
  const fakeRadarPreview = [
    { axis: 'Execução', value: 72 }, { axis: 'Emocional', value: 58 },
    { axis: 'Sobrecarga', value: 65 }, { axis: 'Fuga', value: 44 },
    { axis: 'Perfeccionismo', value: 81 }, { axis: 'Validação', value: 37 },
    { axis: 'Autocrítica', value: 69 }, { axis: 'Rotina', value: 53 },
  ];
  const fakePatternBars = [
    { label: 'Perfeccionismo Paralisante', score: 81 },
    { label: 'Execução Instável', score: 72 },
    { label: 'Autocrítica Excessiva', score: 69 },
    { label: 'Sobrecarga Funcional', score: 65 },
    { label: 'Autossabotagem Emocional', score: 58 },
  ];

  // ══════════════════════ SUMMARY SCREEN ══════════════════════
  if (!selectedPersonId) {
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
              <p className="text-sm text-muted-foreground">Visão geral de todos os perfis e diagnósticos</p>
            </div>
          </motion.div>

          {/* KPI Cards — always visible */}
          <motion.div {...fadeUp} transition={{ delay: 0.05 }} className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-card rounded-xl border border-border p-5 shadow-sm text-center">
              <Users className="w-6 h-6 text-primary mx-auto mb-2" />
              <p className="text-3xl font-serif font-bold text-foreground">{managedPersons.length}</p>
              <p className="text-xs text-muted-foreground mt-1">Perfis Cadastrados</p>
            </div>
            <div className="bg-card rounded-xl border border-border p-5 shadow-sm text-center">
              <ClipboardList className="w-6 h-6 text-primary mx-auto mb-2" />
              <p className="text-3xl font-serif font-bold text-foreground">{totalTests}</p>
              <p className="text-xs text-muted-foreground mt-1">Testes Realizados</p>
            </div>
            <div className="bg-card rounded-xl border border-border p-5 shadow-sm text-center">
              <CheckCircle2 className="w-6 h-6 text-primary mx-auto mb-2" />
              <p className="text-3xl font-serif font-bold text-foreground">{totalActions}</p>
              <p className="text-xs text-muted-foreground mt-1">Ações Propostas</p>
            </div>
            <div className="bg-card rounded-xl border border-border p-5 shadow-sm text-center">
              <Brain className="w-6 h-6 text-primary mx-auto mb-2" />
              <p className="text-3xl font-serif font-bold text-foreground">{personSummaries.filter(s => s.dominantPattern).length}</p>
              <p className="text-xs text-muted-foreground mt-1">Perfis Analisados</p>
            </div>
          </motion.div>

          {/* Person Cards — always visible & clickable */}
          <motion.div {...fadeUp} transition={{ delay: 0.1 }}>
            <h2 className="text-lg font-serif mb-4 flex items-center gap-2">
              <User className="w-5 h-5 text-primary" />
              Selecione um perfil para visualizar
            </h2>
            <div className="space-y-3">
              {personSummaries.map((summary, i) => {
                const def = summary.dominantPattern ? patternDefinitions?.[summary.dominantPattern as PatternKey] : null;
                return (
                  <motion.button
                    key={summary.person.id}
                    {...fadeUp}
                    transition={{ delay: 0.12 + i * 0.05 }}
                    onClick={() => hasAccess ? setSelectedPersonId(summary.person.id) : navigate('/checkout')}
                    className="w-full bg-card rounded-xl border border-border p-5 shadow-sm hover:border-primary/40 hover:shadow-md transition-all text-left group"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        <div className="w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <User className="w-5 h-5 text-primary" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-foreground truncate">{summary.person.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {summary.person.age ? `${summary.person.age} anos` : ''} · CPF: ***{summary.person.cpf.slice(-4)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right hidden sm:block">
                          <p className="text-xs text-muted-foreground">{summary.testsCount} {summary.testsCount === 1 ? 'teste' : 'testes'}</p>
                          {summary.lastTestDate && (
                            <p className="text-xs text-muted-foreground">
                              Último: {new Date(summary.lastTestDate).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                            </p>
                          )}
                        </div>
                        {def && (
                          <span className="hidden md:inline-flex text-xs px-3 py-1 rounded-full bg-primary/10 text-primary font-medium truncate max-w-[160px]">
                            {def.label}
                          </span>
                        )}
                        {summary.testsCount === 0 && (
                          <span className="text-xs px-3 py-1 rounded-full bg-muted text-muted-foreground font-medium">Sem testes</span>
                        )}
                        {!hasAccess && <Lock className="w-4 h-4 text-amber-500 shrink-0" />}
                        <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                      </div>
                    </div>
                  </motion.button>
                );
              })}
            </div>
          </motion.div>

          {/* Blurred Preview Section — only for non-premium */}
          {!hasAccess && totalTests > 0 && (
            <div className="relative">
              {/* Blurred fake content */}
              <div className="pointer-events-none select-none space-y-6" style={{ filter: 'blur(5px)' }}>
                {/* Fake pattern card */}
                <div className="bg-gradient-to-br from-primary/5 to-primary/10 rounded-xl border border-primary/20 p-6">
                  <div className="flex items-center gap-3 mb-3">
                    <Brain className="w-5 h-5 text-primary" />
                    <h3 className="text-lg font-serif">Padrão Dominante Global</h3>
                  </div>
                  <p className="text-xl font-serif mb-2">Perfeccionismo Paralisante</p>
                  <p className="text-sm text-foreground/70">Tendência a bloquear ação por medo de errar, gerando ciclos de procrastinação e autocrítica.</p>
                </div>

                {/* Fake pattern bars */}
                <div className="bg-card rounded-xl border border-border p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <Layers className="w-5 h-5 text-primary" />
                    <h3 className="text-lg font-serif">Combinação de Padrões</h3>
                  </div>
                  <div className="space-y-3">
                    {fakePatternBars.map((bar, i) => (
                      <div key={i}>
                        <div className="flex justify-between mb-1">
                          <span className="text-sm font-medium">{bar.label}</span>
                          <span className="text-xs text-muted-foreground">{bar.score}%</span>
                        </div>
                        <div className="w-full bg-muted/50 rounded-full h-2">
                          <div className="bg-primary rounded-full h-2" style={{ width: `${bar.score}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Fake radar */}
                <div className="bg-card rounded-xl border border-border p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <Activity className="w-5 h-5 text-primary" />
                    <h3 className="text-lg font-serif">Mapa de Funcionamento</h3>
                  </div>
                  <ResponsiveContainer width="100%" height={220}>
                    <RadarChart data={fakeRadarPreview}>
                      <PolarGrid stroke="hsl(var(--border))" />
                      <PolarAngleAxis dataKey="axis" tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} />
                      <Radar dataKey="value" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.15} strokeWidth={2} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>

                {/* Fake conflicts */}
                <div className="bg-card rounded-xl border border-destructive/20 p-6">
                  <div className="flex items-center gap-3 mb-3">
                    <Zap className="w-5 h-5 text-destructive" />
                    <h3 className="text-lg font-serif">Contradições Internas</h3>
                  </div>
                  <div className="space-y-3">
                    <div className="bg-destructive/5 border border-destructive/10 rounded-lg p-3">
                      <p className="text-sm font-medium">Perfeccionismo × Execução Instável</p>
                      <p className="text-xs text-foreground/60 mt-1">Conflito entre padrões opostos detectado no perfil.</p>
                    </div>
                    <div className="bg-destructive/5 border border-destructive/10 rounded-lg p-3">
                      <p className="text-sm font-medium">Autocrítica × Validação Externa</p>
                      <p className="text-xs text-foreground/60 mt-1">Conflito entre padrões opostos detectado no perfil.</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Floating CTA over blurred content */}
              <div className="absolute inset-0 z-30 flex items-center justify-center">
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.3, duration: 0.5 }}
                  className="bg-card/95 backdrop-blur-xl border border-amber-500/30 rounded-2xl p-6 sm:p-8 text-center space-y-4 max-w-sm mx-4 shadow-[0_20px_60px_-15px_hsl(var(--primary)/0.2)]"
                >
                  <div className="w-14 h-14 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center mx-auto shadow-lg">
                    <Eye className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-lg font-serif text-foreground">Análise completa disponível</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Identificamos <span className="font-semibold text-foreground">{personSummaries.filter(s => s.dominantPattern).length} padrões</span> em{' '}
                    <span className="font-semibold text-foreground">{totalTests} testes</span> realizados.
                    Desbloqueie para ver radar, conflitos e recomendações.
                  </p>
                  <button
                    onClick={() => navigate('/checkout')}
                    className="px-8 py-3 bg-gradient-to-r from-amber-500 to-amber-600 text-white rounded-xl text-sm font-semibold hover:opacity-90 transition-all duration-300 flex items-center gap-2 mx-auto shadow-[0_8px_25px_-6px_rgba(217,160,32,0.4)] hover:shadow-[0_12px_35px_-4px_rgba(217,160,32,0.5)] hover:translate-y-[-1px]"
                  >
                    <Crown className="w-4 h-4" /> Desbloquear Relatório
                  </button>
                  <p className="text-[0.65rem] text-muted-foreground/50">A partir de R$ 5,99/mês</p>
                </motion.div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ══════════════════════ REPORT VIEW (person selected) ══════════════════════
  if (loadingReport) return <CentralReportSkeleton />;

  if (!centralProfile || centralProfile.tests_completed === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <motion.div {...fadeUp} className="text-center space-y-6 max-w-md">
          <Layers className="w-12 h-12 text-muted-foreground mx-auto" />
          <h1 className="text-2xl font-serif">Relatório de {selectedPerson?.name}</h1>
          <p className="text-muted-foreground">Nenhuma leitura concluída para este perfil. Realize um teste primeiro.</p>
          <div className="flex gap-3 justify-center">
            <button onClick={() => setSelectedPersonId(null)} className="px-6 py-3 border border-border rounded-lg text-sm font-medium hover:bg-muted/50 transition-colors">
              Voltar
            </button>
            <button onClick={() => navigate('/tests')} className="px-8 py-3 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity">
              Iniciar leitura
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  const scores = centralProfile.aggregated_scores;
  const sorted = Object.entries(scores).sort(([, a], [, b]) => b - a);
  const dominantKey = sorted[0]?.[0] as PatternKey;
  const dominantDef = patternDefinitions?.[dominantKey];
  const detectedConflicts = detectConflictPairs(scores);

  const sabotageKeys: PatternKey[] = ['emotional_self_sabotage', 'discomfort_escape', 'unstable_execution', 'low_routine_sustenance'];
  const sabotageAvg = sabotageKeys.reduce((sum, k) => sum + (scores[k] || 0), 0) / sabotageKeys.length;
  const riskScore = sabotageAvg + detectedConflicts.length * 5;
  const riskLevel = riskScore >= 75 ? 'Crítico' : riskScore >= 60 ? 'Alto' : riskScore >= 40 ? 'Moderado' : 'Baixo';
  const riskColor = riskScore >= 75 ? 'text-red-500' : riskScore >= 60 ? 'text-orange-500' : riskScore >= 40 ? 'text-yellow-500' : 'text-green-500';
  const dominantTrigger = dominantDef?.triggers?.[0] || 'Não identificado';

  const futureTendency = riskScore >= 60
    ? `Com risco ${riskLevel.toLowerCase()}, há tendência de intensificação dos padrões de ${dominantDef?.label?.toLowerCase() || 'autossabotagem'} se não houver intervenção.`
    : `Os padrões atuais estão em nível gerenciável. Com ação consistente na área de ${centralProfile.key_unlock_area?.substring(0, 60) || 'foco identificado'}, há potencial de melhoria significativa.`;

  const lifeAreas = [
    { area: 'Trabalho & Produtividade', score: Math.max(scores.unstable_execution || 0, scores.functional_overload || 0) },
    { area: 'Rotina & Consistência', score: scores.low_routine_sustenance || 0 },
    { area: 'Regulação Emocional', score: scores.emotional_self_sabotage || 0 },
    { area: 'Relacionamentos', score: scores.validation_dependency || 0 },
    { area: 'Autoestima & Identidade', score: Math.max(scores.excessive_self_criticism || 0, scores.paralyzing_perfectionism || 0) },
  ].sort((a, b) => b.score - a.score);

  const radarData = Object.entries(scores).map(([key, value]) => ({ axis: radarAxisLabels[key] || key, value }));

  const timelineData = history.map((entry, i) => {
    const point: Record<string, any> = { date: new Date(entry.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }), index: i + 1 };
    entry.all_scores.forEach(s => { point[radarAxisLabels[s.key] || s.key] = s.percentage; });
    return point;
  });
  const timelineKeys = Object.keys(radarAxisLabels);
  const timelineColors = ['hsl(var(--primary))', 'hsl(0, 65%, 52%)', 'hsl(38, 72%, 50%)', 'hsl(152, 45%, 45%)', 'hsl(270, 50%, 55%)', 'hsl(200, 60%, 50%)', 'hsl(330, 50%, 50%)', 'hsl(60, 60%, 45%)'];

  // Strategic blur: show real content with blur on text, charts visible with blurred labels
  const BlurredText = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
    <span className={`${!hasAccess ? 'filter blur-[4px] select-none' : ''} ${className}`}>{children}</span>
  );

  const StickyPremiumCTA = () => !hasAccess ? (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5, duration: 0.5 }}
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-card/95 backdrop-blur-xl border border-amber-500/30 rounded-2xl px-6 py-4 shadow-[0_20px_60px_-15px_hsl(var(--primary)/0.25)] flex items-center gap-4 max-w-lg"
    >
      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shrink-0 shadow-lg">
        <Eye className="w-5 h-5 text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground">
          {sorted.length} padrões · {detectedConflicts.length} conflito{detectedConflicts.length !== 1 ? 's' : ''} detectado{detectedConflicts.length !== 1 ? 's' : ''}
        </p>
        <p className="text-xs text-muted-foreground">Desbloqueie para ler a análise completa</p>
      </div>
      <button
        onClick={() => navigate('/checkout')}
        className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 text-white rounded-xl text-xs font-semibold hover:opacity-90 transition-all flex items-center gap-1.5 shrink-0 shadow-[0_6px_20px_-4px_rgba(217,160,32,0.4)]"
      >
        <Crown className="w-3.5 h-3.5" /> Desbloquear
      </button>
    </motion.div>
  ) : null;

  return (
    <div className="min-h-screen px-4 py-8 md:py-12">
      <div className="max-w-5xl mx-auto space-y-6 sm:space-y-8">
        {/* Header with person selector */}
        <motion.div {...fadeUp} transition={{ duration: 0.5 }} className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex items-center gap-4 flex-1">
            <button onClick={() => setSelectedPersonId(null)} className="text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-2xl md:text-3xl font-serif">Relatório Central</h1>
              <p className="text-sm text-muted-foreground">{centralProfile.tests_completed} {centralProfile.tests_completed === 1 ? 'leitura' : 'leituras'} de {selectedPerson?.name}</p>
            </div>
          </div>
          {managedPersons.length > 1 && (
            <Select value={selectedPersonId || ''} onValueChange={setSelectedPersonId}>
              <SelectTrigger className="w-full sm:w-[220px]">
                <User className="w-4 h-4 mr-2 text-muted-foreground" />
                <SelectValue placeholder="Selecionar pessoa" />
              </SelectTrigger>
              <SelectContent>
                {managedPersons.map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </motion.div>

        {/* Tabs */}
        <Tabs defaultValue="central" className="w-full">
          <TabsList className="w-full grid grid-cols-2 bg-muted/50 rounded-xl p-1">
            <TabsTrigger value="central" className="rounded-lg text-sm data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <Layers className="w-4 h-4 mr-2" /> Relatório Central
            </TabsTrigger>
            <TabsTrigger value="lifemap" className="rounded-lg text-sm data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <Compass className="w-4 h-4 mr-2" /> Mapa de Vida
            </TabsTrigger>
          </TabsList>

          {/* ═══════════════════ TAB 1: RELATÓRIO CENTRAL ═══════════════════ */}
          <TabsContent value="central" className="mt-6">
            <StickyPremiumCTA />
            <div className="relative">
              <div className={`space-y-6 sm:space-y-8 ${!hasAccess ? 'pointer-events-none select-none' : ''}`}>
                {/* Global Dominant Pattern */}
                <motion.div {...fadeUp} transition={{ delay: 0.05 }} className="bg-gradient-to-br from-primary/5 to-primary/10 rounded-xl border border-primary/20 p-6 md:p-8 shadow-sm">
                  <div className="flex items-center gap-3 mb-4">
                    <Brain className="w-5 h-5 text-primary" />
                    <h3 className="text-xl font-serif">Padrão Dominante Global</h3>
                  </div>
                  <p className={`text-2xl font-serif text-foreground mb-2 ${!hasAccess ? 'filter blur-[3px]' : ''}`}>{dominantDef?.label || dominantKey}</p>
                  <p className={`text-sm text-foreground/70 leading-relaxed mb-4 ${!hasAccess ? 'filter blur-[5px]' : ''}`}>{dominantDef?.description}</p>
                  <div className="grid sm:grid-cols-2 gap-4 mt-4">
                    {centralProfile.core_pain && (
                      <div className="bg-background/50 rounded-lg p-4 border border-border">
                        <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Dor Central</p>
                        <p className={`text-sm text-foreground/80 ${!hasAccess ? 'filter blur-[5px]' : ''}`}>{centralProfile.core_pain}</p>
                      </div>
                    )}
                    {centralProfile.key_unlock_area && (
                      <div className="bg-background/50 rounded-lg p-4 border border-border">
                        <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Área de Destravamento</p>
                        <p className={`text-sm text-foreground/80 ${!hasAccess ? 'filter blur-[5px]' : ''}`}>{centralProfile.key_unlock_area}</p>
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
                              <span className={`text-sm font-medium text-foreground ${!hasAccess ? 'filter blur-[3px]' : ''}`}>{def?.label || key}</span>
                              <span className={`text-xs text-muted-foreground ${!hasAccess ? 'filter blur-[4px]' : ''}`}>{score}%</span>
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
                              <span className={`text-sm font-medium text-foreground ${!hasAccess ? 'filter blur-[3px]' : ''}`}>
                                {patternDefinitions?.[a]?.label} × {patternDefinitions?.[b]?.label}
                              </span>
                            </div>
                            <p className={`text-sm text-foreground/70 ${!hasAccess ? 'filter blur-[5px]' : ''}`}>{desc}</p>
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
                    <p className={`text-sm text-foreground/80 leading-relaxed ${!hasAccess ? 'filter blur-[5px]' : ''}`}>{dominantTrigger}</p>
                    {dominantDef?.triggers && dominantDef.triggers.length > 1 && (
                      <div className="mt-4 space-y-2">
                        <p className="text-xs text-muted-foreground uppercase tracking-wide">Outros gatilhos</p>
                        {dominantDef.triggers.slice(1, 4).map((t, i) => (
                          <div key={i} className="flex items-start gap-2">
                            <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-muted-foreground/40 shrink-0" />
                            <p className={`text-xs text-foreground/60 ${!hasAccess ? 'filter blur-[5px]' : ''}`}>{t}</p>
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
                    <p className={`text-3xl font-serif font-bold ${riskColor} ${!hasAccess ? 'filter blur-[4px]' : ''}`}>{riskLevel}</p>
                    <p className={`text-xs text-muted-foreground mt-2 ${!hasAccess ? 'filter blur-[4px]' : ''}`}>Score: {Math.round(riskScore)} | {detectedConflicts.length} conflito(s)</p>
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
                            <div className={`rounded-full h-1.5 transition-all duration-500 ${area.score >= 60 ? 'bg-destructive' : area.score >= 40 ? 'bg-yellow-500' : 'bg-green-500'}`} style={{ width: `${area.score}%` }} />
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

                {/* Timeline */}
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
                          <Line key={key} type="monotone" dataKey={radarAxisLabels[key]} stroke={timelineColors[i % timelineColors.length]} strokeWidth={2} dot={{ r: 3 }} connectNulls />
                        ))}
                      </LineChart>
                    </ResponsiveContainer>
                  </motion.div>
                )}

                {/* AI Insights */}
                <motion.div {...fadeUp} transition={{ delay: 0.5 }} className="bg-gradient-to-br from-primary/5 via-primary/10 to-accent/5 rounded-xl border border-primary/20 p-6 md:p-8 shadow-sm">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <Sparkles className="w-5 h-5 text-primary" />
                      <h3 className="text-xl font-serif">Insights com IA</h3>
                    </div>
                    {!aiInsights && (
                      <button onClick={generateInsights} disabled={insightsLoading} className="px-5 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2">
                        {insightsLoading ? (<><div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />Analisando...</>) : (<><Sparkles className="w-4 h-4" />Gerar Análise</>)}
                      </button>
                    )}
                  </div>
                  {!aiInsights && !insightsLoading && <p className="text-sm text-muted-foreground">A IA analisará o histórico para gerar interpretações e recomendações.</p>}
                  {insightsLoading && <div className="space-y-4 animate-pulse"><div className="h-4 bg-muted/50 rounded w-full" /><div className="h-4 bg-muted/50 rounded w-5/6" /><div className="h-4 bg-muted/50 rounded w-4/6" /></div>}
                  {aiInsights && (
                    <div className="space-y-6">
                      <div>
                        <div className="flex items-center gap-2 mb-3"><Brain className="w-4 h-4 text-primary" /><p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Interpretação Personalizada</p></div>
                        <div className="text-sm text-foreground/80 leading-relaxed whitespace-pre-line">{aiInsights.interpretacao_personalizada}</div>
                      </div>
                      {aiInsights.padroes_invisiveis.length > 0 && (
                        <div>
                          <div className="flex items-center gap-2 mb-3"><Eye className="w-4 h-4 text-primary" /><p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Padrões Invisíveis</p></div>
                          <div className="space-y-2">{aiInsights.padroes_invisiveis.map((p, i) => (<div key={i} className="flex items-start gap-3 bg-background/50 border border-border rounded-lg p-3"><span className="mt-0.5 w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center text-xs text-primary font-medium shrink-0">{i + 1}</span><p className="text-sm text-foreground/80">{p}</p></div>))}</div>
                        </div>
                      )}
                      {aiInsights.contradicoes_profundas.length > 0 && (
                        <div>
                          <div className="flex items-center gap-2 mb-3"><Target className="w-4 h-4 text-destructive" /><p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Contradições Profundas</p></div>
                          <div className="space-y-2">{aiInsights.contradicoes_profundas.map((c, i) => (<div key={i} className="flex items-start gap-3 bg-destructive/5 border border-destructive/10 rounded-lg p-3"><Zap className="w-4 h-4 text-destructive mt-0.5 shrink-0" /><p className="text-sm text-foreground/80">{c}</p></div>))}</div>
                        </div>
                      )}
                      {aiInsights.recomendacoes_praticas.length > 0 && (
                        <div>
                          <div className="flex items-center gap-2 mb-3"><Lightbulb className="w-4 h-4 text-primary" /><p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Recomendações Práticas</p></div>
                          <div className="space-y-2">{aiInsights.recomendacoes_praticas.map((r, i) => (<div key={i} className="flex items-start gap-3 bg-primary/5 border border-primary/10 rounded-lg p-3"><span className="mt-0.5 w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center text-xs text-primary font-medium shrink-0">✓</span><p className="text-sm text-foreground/80">{r}</p></div>))}</div>
                        </div>
                      )}
                      <button onClick={generateInsights} disabled={insightsLoading} className="text-sm text-primary hover:underline flex items-center gap-1"><Sparkles className="w-3 h-3" />Gerar nova análise</button>
                    </div>
                  )}
                </motion.div>
              </div>
            </div>
          </TabsContent>

          {/* ═══════════════════ TAB 2: MAPA DE VIDA ═══════════════════ */}
          <TabsContent value="lifemap" className="mt-6">
            <div className="relative">
              <div className={`space-y-6 sm:space-y-8 ${!hasAccess ? 'pointer-events-none select-none' : ''}`} style={!hasAccess ? { filter: 'blur(5px)' } : undefined}>
                {lifeMapHistory.length === 0 ? (
                  <motion.div {...fadeUp} className="bg-card rounded-xl border border-border p-8 text-center space-y-4">
                    <Compass className="w-10 h-10 text-muted-foreground mx-auto" />
                    <h3 className="text-lg font-serif">Nenhum Mapa de Vida realizado</h3>
                    <p className="text-sm text-muted-foreground max-w-md mx-auto">Complete o teste "Mapa de Vida & Evolução" para visualizar a evolução aqui.</p>
                    <button onClick={() => navigate('/tests')} className="px-6 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity">Ir para Catálogo</button>
                  </motion.div>
                ) : (
                  <>
                    {/* Latest Radar */}
                    <motion.div {...fadeUp} transition={{ delay: 0.05 }} className="bg-card rounded-xl border border-border p-6 md:p-8 shadow-sm">
                      <div className="flex items-center gap-3 mb-2">
                        <Activity className="w-5 h-5 text-primary" />
                        <h3 className="text-xl font-serif">Mapa de Vida Atual</h3>
                      </div>
                      <p className="text-xs text-muted-foreground mb-4">Última avaliação: {lifeMapHistory[lifeMapHistory.length - 1].date}</p>
                      {(() => {
                        const latest = lifeMapHistory[lifeMapHistory.length - 1];
                        const radarEntries = Object.entries(latest.scores).map(([key, val]) => ({ area: key, nota: Math.round(val / 10) }));
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
                        <p className="text-xs text-muted-foreground mb-6">{lifeMapHistory.length} avaliações — comparando a mais recente com a anterior</p>
                        {(() => {
                          const latest = lifeMapHistory[lifeMapHistory.length - 1];
                          const previous = lifeMapHistory[lifeMapHistory.length - 2];
                          const allKeys = Array.from(new Set([...Object.keys(latest.scores), ...Object.keys(previous.scores)]));
                          const comparisons = allKeys.map(key => {
                            const curr = Math.round((latest.scores[key] || 0) / 10);
                            const prev = Math.round((previous.scores[key] || 0) / 10);
                            return { area: key, current: curr, previous: prev, diff: curr - prev };
                          }).sort((a, b) => b.diff - a.diff);
                          return (
                            <div className="space-y-3">
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
                                  <span className={`col-span-2 text-center text-sm font-semibold flex items-center justify-center gap-1 ${c.diff > 0 ? 'text-green-500' : c.diff < 0 ? 'text-red-500' : 'text-muted-foreground'}`}>
                                    {c.diff > 0 ? <ArrowUpRight className="w-3.5 h-3.5" /> : c.diff < 0 ? <ArrowDownRight className="w-3.5 h-3.5" /> : <Minus className="w-3.5 h-3.5" />}
                                    {c.diff > 0 ? `+${c.diff}` : c.diff}
                                  </span>
                                  <span className="col-span-2 text-center">
                                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${c.diff > 0 ? 'bg-green-500/10 text-green-600' : c.diff < 0 ? 'bg-red-500/10 text-red-600' : 'bg-muted text-muted-foreground'}`}>
                                      {c.diff > 0 ? 'Melhorou' : c.diff < 0 ? 'Caiu' : 'Estável'}
                                    </span>
                                  </span>
                                </div>
                              ))}
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

                    {/* Full Timeline */}
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
                            Object.entries(entry.scores).forEach(([key, val]) => { point[key] = Math.round(val / 10); });
                            return point;
                          });
                          const areaKeys = Object.keys(lifeMapHistory[0].scores);
                          const areaColors = ['#22c55e', '#3b82f6', '#ef4444', '#f59e0b', '#8b5cf6', '#06b6d4', '#ec4899', '#14b8a6', '#f97316', '#6366f1', '#84cc16'];
                          return (
                            <ResponsiveContainer width="100%" height={350}>
                              <LineChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                                <XAxis dataKey="date" tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} />
                                <YAxis domain={[0, 10]} tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} width={25} />
                                <Tooltip />
                                <Legend wrapperStyle={{ fontSize: 10 }} />
                                {areaKeys.map((key, i) => (<Line key={key} type="monotone" dataKey={key} stroke={areaColors[i % areaColors.length]} strokeWidth={2} dot={{ r: 3 }} connectNulls />))}
                              </LineChart>
                            </ResponsiveContainer>
                          );
                        })()}
                      </motion.div>
                    )}

                    {/* History list */}
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
                              <div><p className="text-sm font-medium text-foreground">{entry.date}</p><p className="text-xs text-muted-foreground">{Object.keys(entry.scores).length} áreas avaliadas</p></div>
                              <div className="text-right"><p className="text-lg font-serif font-bold text-primary">{(avg / 10).toFixed(1)}</p><p className="text-xs text-muted-foreground">Média geral</p></div>
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
          <button onClick={() => setSelectedPersonId(null)} className="px-8 py-3 border border-border rounded-lg text-sm font-medium text-foreground hover:bg-muted/50 transition-colors">
            Voltar ao Resumo
          </button>
          <button onClick={() => navigate('/tests')} className="px-8 py-3 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity">
            Nova leitura
          </button>
        </motion.div>
      </div>
    </div>
  );
};

export default CentralReport;
