import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import {
  RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer, Tooltip as RechartsTooltip,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts';
import {
  ArrowLeft, Layers, Brain, TrendingUp,
  Crosshair, Compass, Activity, User,
  ArrowUpRight, ArrowDownRight, Minus,
} from 'lucide-react';
import { usePatternDefinitions } from '@/hooks/usePatternDefinitions';
import { useAxisLabels } from '@/hooks/useAxisLabels';
import type { PatternKey } from '@/types/diagnostic';
import { detectConflictPairs } from '@/lib/conflictDetection';
import { toast } from 'sonner';
import { CentralReportSkeleton } from '@/components/skeletons/CentralReportSkeleton';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// Componentized sections
import { SummaryScreen } from '@/components/central-report/SummaryScreen';
import { ReportMiniKPIs } from '@/components/central-report/ReportMiniKPIs';
import { RadarSection } from '@/components/central-report/RadarSection';
import { TimelineSection } from '@/components/central-report/TimelineSection';
import { ConflictsSection } from '@/components/central-report/ConflictsSection';
import { CriticalAreasSection } from '@/components/central-report/CriticalAreasSection';
import { AIInsightsSection } from '@/components/central-report/AIInsightsSection';
import { StickyPremiumCTA } from '@/components/central-report/StickyPremiumCTA';
import {
  fadeUp,
  LIFE_MAP_MODULE_ID,
  type AIInsights,
  type CentralProfile,
  type HistoryEntry,
  type LifeMapEntry,
  type ManagedPerson,
  type PersonSummary,
} from '@/components/central-report/types';

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

  // 1. Load managed persons and summaries
  useEffect(() => {
    if (!user) return;
    const load = async () => {
      try {
        const { data: persons } = await supabase
          .from('managed_persons')
          .select('*')
          .eq('owner_id', user.id)
          .order('created_at', { ascending: true });

        if (!persons || persons.length === 0) { setLoading(false); return; }
        setManagedPersons(persons);

        const { data: sessions } = await supabase
          .from('diagnostic_sessions')
          .select('id, completed_at, test_module_id, person_id')
          .eq('user_id', user.id)
          .not('completed_at', 'is', null)
          .order('completed_at', { ascending: false });

        let allResults: any[] = [];
        if (sessions && sessions.length > 0) {
          const { data: results } = await supabase
            .from('diagnostic_results')
            .select('session_id, dominant_pattern, all_scores, key_unlock_area, core_pain, direction')
            .in('session_id', sessions.map(s => s.id));
          allResults = results || [];
        }

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
            person, testsCount: personSessions.length,
            lastTestDate: lastSession?.completed_at || null,
            dominantPattern: latestResult?.dominant_pattern || null,
            keyActions: keyActions.slice(0, 2),
          };
        });
        setPersonSummaries(summaries);
      } catch (err) {
        console.error('Error loading persons:', err);
        toast.error('Erro ao carregar dados.');
      } finally { setLoading(false); }
    };
    load();
  }, [user]);

  // 2. Load person report data
  useEffect(() => {
    if (!user || !selectedPersonId) return;
    setLoadingReport(true);
    setCentralProfile(null); setHistory([]); setLifeMapHistory([]); setAiInsights(null);

    const fetchPersonData = async () => {
      try {
        const { data: sessions } = await supabase
          .from('diagnostic_sessions')
          .select('id, completed_at, test_module_id, person_id')
          .eq('user_id', user.id)
          .eq('person_id', selectedPersonId)
          .not('completed_at', 'is', null)
          .order('completed_at', { ascending: true });

        if (!sessions || sessions.length === 0) { setLoadingReport(false); return; }

        const { data: results } = await supabase
          .from('diagnostic_results').select('*')
          .in('session_id', sessions.map(s => s.id));

        if (!results || results.length === 0) { setLoadingReport(false); return; }

        const axisData: Record<string, { totalWeighted: number; totalWeight: number }> = {};
        results.forEach((result, index) => {
          const recencyWeight = Math.pow(0.85, results.length - 1 - index);
          const scores = (result.all_scores as unknown as { key: string; percentage: number; label: string }[]) || [];
          scores.forEach(s => {
            if (!axisData[s.key]) axisData[s.key] = { totalWeighted: 0, totalWeight: 0 };
            axisData[s.key].totalWeighted += s.percentage * recencyWeight;
            axisData[s.key].totalWeight += recencyWeight;
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

        const sessionMap = new Map(sessions.map(s => [s.id, s]));
        const allEntries: HistoryEntry[] = results.map(r => {
          const sess = sessionMap.get(r.session_id);
          return {
            all_scores: (r.all_scores as unknown as { key: string; percentage: number; label: string }[]) || [],
            created_at: r.created_at, dominant_pattern: r.dominant_pattern,
            intensity: r.intensity, test_module_id: sess?.test_module_id || null,
          };
        });
        setHistory(allEntries);

        const lifeMapEntries: LifeMapEntry[] = allEntries
          .filter(e => e.test_module_id === LIFE_MAP_MODULE_ID)
          .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
          .map(e => {
            const scores: Record<string, number> = {};
            e.all_scores.forEach(s => { scores[s.label || s.key] = s.percentage; });
            return { date: new Date(e.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }), scores, created_at: e.created_at };
          });
        setLifeMapHistory(lifeMapEntries);
      } catch (err) {
        console.error('Error loading person report:', err);
        toast.error('Erro ao carregar relatório.');
      } finally { setLoadingReport(false); }
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
    } finally { setInsightsLoading(false); }
  };

  if (loading) return <CentralReportSkeleton />;

  if (managedPersons.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <motion.div {...fadeUp} className="text-center space-y-6 max-w-md">
          <Layers className="w-12 h-12 text-muted-foreground mx-auto" />
          <h1 className="text-2xl font-serif">Relatório Central</h1>
          <p className="text-muted-foreground">Nenhum perfil cadastrado. Complete o onboarding para começar.</p>
          <button onClick={() => navigate('/onboarding')} className="px-8 py-3 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity">Ir para Onboarding</button>
        </motion.div>
      </div>
    );
  }

  const totalTests = personSummaries.reduce((s, p) => s + p.testsCount, 0);
  const selectedPerson = managedPersons.find(p => p.id === selectedPersonId);

  // ══════════════════════ SUMMARY SCREEN ══════════════════════
  if (!selectedPersonId) {
    return (
      <SummaryScreen
        managedPersons={managedPersons}
        personSummaries={personSummaries}
        totalTests={totalTests}
        hasAccess={hasAccess}
        patternDefinitions={patternDefinitions}
        onSelectPerson={setSelectedPersonId}
      />
    );
  }

  // ══════════════════════ REPORT VIEW ══════════════════════
  if (loadingReport) return <CentralReportSkeleton />;

  if (!centralProfile || centralProfile.tests_completed === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <motion.div {...fadeUp} className="text-center space-y-6 max-w-md">
          <Layers className="w-12 h-12 text-muted-foreground mx-auto" />
          <h1 className="text-2xl font-serif">Relatório de {selectedPerson?.name}</h1>
          <p className="text-muted-foreground">Nenhuma leitura concluída. Realize um teste primeiro.</p>
          <div className="flex gap-3 justify-center">
            <button onClick={() => setSelectedPersonId(null)} className="px-6 py-3 border border-border rounded-lg text-sm font-medium hover:bg-muted/50 transition-colors">Voltar</button>
            <button onClick={() => navigate('/tests')} className="px-8 py-3 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity">Iniciar leitura</button>
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

  const lifeAreas = [
    { area: 'Trabalho & Produtividade', score: Math.max(scores.unstable_execution || 0, scores.functional_overload || 0) },
    { area: 'Rotina & Consistência', score: scores.low_routine_sustenance || 0 },
    { area: 'Regulação Emocional', score: scores.emotional_self_sabotage || 0 },
    { area: 'Relacionamentos', score: scores.validation_dependency || 0 },
    { area: 'Autoestima & Identidade', score: Math.max(scores.excessive_self_criticism || 0, scores.paralyzing_perfectionism || 0) },
  ].sort((a, b) => b.score - a.score);

  const futureTendency = riskScore >= 60
    ? `Com risco ${riskLevel.toLowerCase()}, há tendência de intensificação dos padrões de ${dominantDef?.label?.toLowerCase() || 'autossabotagem'} se não houver intervenção.`
    : `Os padrões atuais estão em nível gerenciável. Com ação consistente na área de ${centralProfile.key_unlock_area?.substring(0, 60) || 'foco identificado'}, há potencial de melhoria significativa.`;

  return (
    <div className="min-h-screen px-4 py-8 md:py-12">
      <div className="max-w-5xl mx-auto space-y-6 sm:space-y-8">
        {/* Header */}
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
                {managedPersons.map(p => (<SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>))}
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

          {/* ═══════════════ TAB 1: RELATÓRIO CENTRAL ═══════════════ */}
          <TabsContent value="central" className="mt-6">
            <StickyPremiumCTA hasAccess={hasAccess} patternsCount={sorted.length} conflictsCount={detectedConflicts.length} />
            <div className={`space-y-6 sm:space-y-8 ${!hasAccess ? 'pointer-events-none select-none' : ''}`}>

              {/* NEW: Mini KPIs */}
              <ReportMiniKPIs
                testsCompleted={centralProfile.tests_completed}
                conflictsCount={detectedConflicts.length}
                riskLevel={riskLevel}
                riskColor={riskColor}
                dominantLabel={dominantDef?.label || dominantKey}
                hasAccess={hasAccess}
              />

              {/* Dominant Pattern */}
              <motion.div {...fadeUp} transition={{ delay: 0.08 }} className="bg-gradient-to-br from-primary/5 to-primary/10 rounded-xl border border-primary/20 p-6 md:p-8 shadow-sm">
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

              {/* IMPROVED: Radar (Top 5) */}
              <RadarSection scores={scores} axisLabels={radarAxisLabels} hasAccess={hasAccess} />

              {/* Conflicts */}
              <ConflictsSection conflicts={detectedConflicts} patternDefinitions={patternDefinitions} hasAccess={hasAccess} />

              {/* Critical Areas (grid badges) */}
              <CriticalAreasSection lifeAreas={lifeAreas} hasAccess={hasAccess} />

              {/* Pattern Bars — Combinação de Padrões */}
              <motion.div {...fadeUp} transition={{ delay: 0.28 }} className="bg-card rounded-xl border border-border p-6 md:p-8 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <Layers className="w-5 h-5 text-primary" />
                  <h3 className="text-xl font-serif">Combinação de Padrões</h3>
                </div>
                <div className="space-y-3">
                  {sorted.slice(0, 5).map(([key, score]) => {
                    const def = patternDefinitions?.[key as PatternKey];
                    return (
                      <div key={key}>
                        <div className="flex items-center justify-between mb-1">
                          <span className={`text-sm font-medium text-foreground ${!hasAccess ? 'filter blur-[3px]' : ''}`}>{def?.label || key}</span>
                          <span className={`text-xs text-muted-foreground ${!hasAccess ? 'filter blur-[4px]' : ''}`}>{score}%</span>
                        </div>
                        <div className="w-full bg-muted/50 rounded-full h-2">
                          <div className="bg-primary rounded-full h-2 transition-all duration-500" style={{ width: `${score}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </motion.div>

              {/* Dominant Trigger */}
              <motion.div {...fadeUp} transition={{ delay: 0.3 }} className="bg-card rounded-xl border border-border p-6 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <Crosshair className="w-5 h-5 text-primary" />
                  <h3 className="text-lg font-serif">Gatilho Dominante</h3>
                </div>
                <p className={`text-sm text-foreground/80 leading-relaxed ${!hasAccess ? 'filter blur-[5px]' : ''}`}>{dominantDef?.triggers?.[0] || 'Não identificado'}</p>
                {dominantDef?.triggers && dominantDef.triggers.length > 1 && (
                  <div className="mt-4 space-y-2">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Outros gatilhos</p>
                    {dominantDef.triggers.slice(1, 4).map((t: string, i: number) => (
                      <div key={i} className="flex items-start gap-2">
                        <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-muted-foreground/40 shrink-0" />
                        <p className={`text-xs text-foreground/60 ${!hasAccess ? 'filter blur-[5px]' : ''}`}>{t}</p>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>

              {/* Future Tendency */}
              <motion.div {...fadeUp} transition={{ delay: 0.32 }} className="bg-card rounded-xl border border-border p-6 md:p-8 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <TrendingUp className="w-5 h-5 text-primary" />
                  <h3 className="text-xl font-serif">Tendência Futura</h3>
                </div>
                <p className={`text-sm text-foreground/80 leading-relaxed ${!hasAccess ? 'filter blur-[5px]' : ''}`}>{futureTendency}</p>
              </motion.div>

              {/* IMPROVED: Timeline (Top 3 + toggle) */}
              <TimelineSection history={history} axisLabels={radarAxisLabels} />

              {/* AI Insights */}
              <AIInsightsSection aiInsights={aiInsights} insightsLoading={insightsLoading} hasAccess={hasAccess} onGenerate={generateInsights} />
            </div>
          </TabsContent>

          {/* ═══════════════ TAB 2: MAPA DE VIDA ═══════════════ */}
          <TabsContent value="lifemap" className="mt-6">
            <StickyPremiumCTA hasAccess={hasAccess} patternsCount={sorted.length} conflictsCount={detectedConflicts.length} />
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
                        <ResponsiveContainer width="100%" height={350}>
                          <RadarChart data={radarEntries} cx="50%" cy="50%" outerRadius="68%">
                            <PolarGrid stroke="hsl(var(--border))" />
                            <PolarAngleAxis dataKey="area" tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} />
                            <RechartsTooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }} />
                            <Radar name="Nota Atual" dataKey="nota" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.2} strokeWidth={2} dot={{ r: 3, fill: 'hsl(var(--primary))' }} />
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
          </TabsContent>
        </Tabs>

        {/* Actions */}
        <motion.div {...fadeUp} transition={{ delay: 0.5 }} className="flex flex-col sm:flex-row gap-4 justify-center pb-12">
          <button onClick={() => setSelectedPersonId(null)} className="px-8 py-3 border border-border rounded-lg text-sm font-medium text-foreground hover:bg-muted/50 transition-colors">Voltar ao Resumo</button>
          <button onClick={() => navigate('/tests')} className="px-8 py-3 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity">Nova leitura</button>
        </motion.div>
      </div>
    </div>
  );
};

export default CentralReport;
