import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useParams, useNavigate } from 'react-router-dom';
import { parseActionString } from '@/lib/buildActionPreview';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/hooks/useSubscription';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Clock, CheckCircle2, RefreshCw, Sparkles, ChevronDown, ChevronUp, Save, Lock, Crown, History } from 'lucide-react';
import { toast } from 'sonner';

interface ActionItem {
  id: string;
  day_number: number;
  action_text: string;
  completed: boolean;
  completed_at: string | null;
  notes: string;
}

interface CycleData {
  cycleNumber: number;
  sessionId: string;
  diagnosticResultId: string;
  completedAt: string;
  dominantPattern: string;
  profileName: string;
  stateSummary: string;
  allScores: { key: string; label: string; percentage: number }[];
  topScore: { label: string; percentage: number } | null;
  actions: ActionItem[];
  aiFeedback: string | null;
}

const RETEST_DAYS = 15;

export default function TrackingDetail() {
  const { testModuleId } = useParams<{ testModuleId: string }>();
  const { user } = useAuth();
  const { isPremium, isSuperAdmin } = useSubscription();
  const navigate = useNavigate();
  const hasAccess = isPremium || isSuperAdmin;

  const [loading, setLoading] = useState(true);
  const [testName, setTestName] = useState('');
  const [cycles, setCycles] = useState<CycleData[]>([]);
  const [activeCycleIndex, setActiveCycleIndex] = useState(0);
  const [expandedAction, setExpandedAction] = useState<string | null>(null);
  const [savingNotes, setSavingNotes] = useState<Set<string>>(new Set());
  const [loadingAI, setLoadingAI] = useState(false);
  const [showCycleHistory, setShowCycleHistory] = useState(false);

  useEffect(() => {
    if (!user || !hasAccess || !testModuleId) { setLoading(false); return; }

    const load = async () => {
      try {
        // Get module info
        const { data: mod } = await supabase
          .from('test_modules')
          .select('name, icon')
          .eq('id', testModuleId)
          .single();

        setTestName(mod?.name || 'Teste');

        // Get ALL completed sessions for this module (cycles)
        const { data: sessions } = await supabase
          .from('diagnostic_sessions')
          .select('id, completed_at')
          .eq('user_id', user.id)
          .eq('test_module_id', testModuleId)
          .not('completed_at', 'is', null)
          .order('completed_at', { ascending: true }); // oldest first = cycle 1

        if (!sessions?.length) { setLoading(false); return; }

        // Get results for all sessions
        const sessionIds = sessions.map(s => s.id);
        const { data: results } = await supabase
          .from('diagnostic_results')
          .select('id, session_id, dominant_pattern, profile_name, state_summary, all_scores')
          .in('session_id', sessionIds);

        if (!results?.length) { setLoading(false); return; }

        const resultMap = new Map(results.map(r => [r.session_id, r]));

        // Get actions for all results
        const resultIds = results.map(r => r.id);
        const { data: allActions } = await supabase
          .from('action_plan_tracking')
          .select('id, day_number, action_text, completed, completed_at, notes, diagnostic_result_id')
          .in('diagnostic_result_id', resultIds)
          .eq('user_id', user.id)
          .order('day_number');

        const actionsByResult = new Map<string, ActionItem[]>();
        for (const a of (allActions || [])) {
          const list = actionsByResult.get(a.diagnostic_result_id) || [];
          list.push(a);
          actionsByResult.set(a.diagnostic_result_id, list);
        }

        // Get AI feedback for all results
        const { data: allFeedback } = await supabase
          .from('progress_ai_feedback')
          .select('diagnostic_result_id, feedback_text, created_at')
          .in('diagnostic_result_id', resultIds)
          .order('created_at', { ascending: false });

        const feedbackByResult = new Map<string, string>();
        for (const f of (allFeedback || [])) {
          if (!feedbackByResult.has(f.diagnostic_result_id)) {
            feedbackByResult.set(f.diagnostic_result_id, f.feedback_text);
          }
        }

        // Build cycles
        const cycleList: CycleData[] = [];
        sessions.forEach((session, index) => {
          const result = resultMap.get(session.id);
          if (!result) return;

          const scores = (result.all_scores as any[] || []) as { key: string; label: string; percentage: number }[];
          const topScore = scores.length > 0
            ? scores.reduce((max, s) => s.percentage > max.percentage ? s : max, scores[0])
            : null;

          cycleList.push({
            cycleNumber: index + 1,
            sessionId: session.id,
            diagnosticResultId: result.id,
            completedAt: session.completed_at!,
            dominantPattern: result.dominant_pattern,
            profileName: result.profile_name,
            stateSummary: result.state_summary,
            allScores: scores,
            topScore,
            actions: actionsByResult.get(result.id) || [],
            aiFeedback: feedbackByResult.get(result.id) || null,
          });
        });

        setCycles(cycleList);
        setActiveCycleIndex(cycleList.length - 1); // latest cycle active by default
      } catch (e) {
        console.error('Error loading tracking detail:', e);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [user, hasAccess, testModuleId]);

  const activeCycle = cycles[activeCycleIndex] || null;

  const updateActionInCycle = useCallback((actionId: string, updates: Partial<ActionItem>) => {
    setCycles(prev => prev.map((cycle, idx) =>
      idx === activeCycleIndex
        ? { ...cycle, actions: cycle.actions.map(a => a.id === actionId ? { ...a, ...updates } : a) }
        : cycle
    ));
  }, [activeCycleIndex]);

  const toggleAction = useCallback(async (actionId: string, completed: boolean) => {
    const now = completed ? new Date().toISOString() : null;
    updateActionInCycle(actionId, { completed, completed_at: now });

    const { error } = await supabase
      .from('action_plan_tracking')
      .update({ completed, completed_at: now })
      .eq('id', actionId);

    if (error) {
      updateActionInCycle(actionId, { completed: !completed });
      toast.error('Erro ao atualizar ação');
    }
  }, [updateActionInCycle]);

  const saveNotes = useCallback(async (actionId: string, notes: string) => {
    setSavingNotes(prev => new Set(prev).add(actionId));

    const { error } = await supabase
      .from('action_plan_tracking')
      .update({ notes })
      .eq('id', actionId);

    setSavingNotes(prev => { const n = new Set(prev); n.delete(actionId); return n; });

    if (error) {
      toast.error('Erro ao salvar anotação');
    } else {
      toast.success('Anotação salva');
    }
  }, []);

  const requestAIFeedback = useCallback(async () => {
    if (!activeCycle || !user) return;
    setLoadingAI(true);

    try {
      const { data, error } = await supabase.functions.invoke('analyze-progress', {
        body: {
          userId: user.id,
          diagnosticResultId: activeCycle.diagnosticResultId,
          testModuleId,
        },
      });

      if (error) throw error;
      if (data?.feedback) {
        setCycles(prev => prev.map((cycle, idx) =>
          idx === activeCycleIndex ? { ...cycle, aiFeedback: data.feedback } : cycle
        ));
        toast.success('Feedback gerado');
      }
    } catch (e) {
      console.error('AI feedback error:', e);
      toast.error('Erro ao gerar feedback');
    } finally {
      setLoadingAI(false);
    }
  }, [activeCycle, user, testModuleId, activeCycleIndex]);

  if (!hasAccess) {
    return (
      <AppLayout>
        <div className="min-h-[80vh] flex items-center justify-center p-6">
          <Card className="max-w-md text-center">
            <CardContent className="pt-8 pb-8 space-y-4">
              <Lock className="w-10 h-10 text-accent mx-auto" />
              <div className="space-y-2">
                <p className="text-foreground font-bold text-base">Você já sabe o que está errado.</p>
                <p className="text-foreground font-bold text-base">Mas continua fazendo igual.</p>
                <p className="text-muted-foreground text-sm">Sem execução, nada muda.</p>
              </div>
              <Button onClick={() => navigate('/checkout')} className="bg-accent text-accent-foreground w-full">
                <Crown className="w-4 h-4 mr-2" /> Desbloquear acompanhamento — R$9,99/mês
              </Button>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  if (loading) {
    return (
      <AppLayout>
        <div className="min-h-[80vh] flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </AppLayout>
    );
  }

  if (!activeCycle) {
    return (
      <AppLayout>
        <div className="p-8 text-center">
          <p className="text-muted-foreground">Nenhum resultado encontrado para este teste.</p>
          <Button variant="outline" className="mt-4" onClick={() => navigate('/acompanhamento')}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Voltar
          </Button>
        </div>
      </AppLayout>
    );
  }

  const completedCount = activeCycle.actions.filter(a => a.completed).length;
  const progressPct = activeCycle.actions.length > 0 ? Math.round((completedCount / activeCycle.actions.length) * 100) : 0;
  const lastDate = new Date(activeCycle.completedAt);
  const daysSinceTest = Math.floor((Date.now() - lastDate.getTime()) / 86400000);
  const daysUntilRetest = Math.max(0, RETEST_DAYS - daysSinceTest);
  const retestAvailable = daysSinceTest >= RETEST_DAYS;
  const retestProgressPct = Math.min(100, Math.round((daysSinceTest / RETEST_DAYS) * 100));
  const isLatestCycle = activeCycleIndex === cycles.length - 1;

  return (
    <AppLayout>
      <div className="p-4 md:p-8 max-w-3xl mx-auto space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate('/acompanhamento')}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-lg font-bold text-foreground">{testName}</h1>
              <p className="text-xs text-muted-foreground">
                Ciclo {activeCycle.cycleNumber} de {cycles.length}
                {isLatestCycle && ' (atual)'}
              </p>
            </div>
          </div>
          {cycles.length > 1 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowCycleHistory(!showCycleHistory)}
              className="text-xs"
            >
              <History className="w-3.5 h-3.5 mr-1" />
              Ciclos
            </Button>
          )}
        </div>

        {/* Cycle selector */}
        {showCycleHistory && cycles.length > 1 && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}>
            <Card>
              <CardContent className="p-4 space-y-2">
                <p className="text-xs font-medium text-muted-foreground mb-2">Histórico de Ciclos</p>
                {[...cycles].reverse().map((cycle, reverseIdx) => {
                  const realIdx = cycles.length - 1 - reverseIdx;
                  const isActive = realIdx === activeCycleIndex;
                  const cycleCompleted = cycle.actions.filter(a => a.completed).length;
                  const cyclePct = cycle.actions.length > 0 ? Math.round((cycleCompleted / cycle.actions.length) * 100) : 0;

                  return (
                    <button
                      key={cycle.sessionId}
                      onClick={() => { setActiveCycleIndex(realIdx); setShowCycleHistory(false); }}
                      className={`w-full text-left p-3 rounded-xl border transition-all ${
                        isActive ? 'border-primary bg-primary/5' : 'border-border/50 hover:border-primary/30'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-sm font-semibold text-foreground">
                            Ciclo {cycle.cycleNumber}
                          </span>
                          {realIdx === cycles.length - 1 && (
                            <Badge variant="secondary" className="ml-2 text-[10px]">Atual</Badge>
                          )}
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {new Date(cycle.completedAt).toLocaleDateString('pt-BR')} — {cycle.profileName}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-medium text-foreground">{cyclePct}%</p>
                          <p className="text-[10px] text-muted-foreground">{cycleCompleted}/{cycle.actions.length}</p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* BLOCO A — Resumo */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <Card>
            <CardContent className="p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">
                    Ciclo {activeCycle.cycleNumber} — Diagnóstico Principal
                  </p>
                  <p className="font-semibold text-foreground">{activeCycle.profileName}</p>
                </div>
                {activeCycle.topScore && (
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Eixo mais alto</p>
                    <p className="text-sm font-semibold text-primary">
                      {activeCycle.topScore.label}: {activeCycle.topScore.percentage}%
                    </p>
                  </div>
                )}
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">{activeCycle.stateSummary}</p>
              <div className="flex items-center gap-4 text-xs text-muted-foreground pt-1">
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  {new Date(activeCycle.completedAt).toLocaleDateString('pt-BR')}
                </span>
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {completedCount}/{activeCycle.actions.length} ações concluídas
                </span>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* BLOCO D — Contagem Regressiva (only for latest cycle) */}
        {isLatestCycle && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
            <Card className={retestAvailable ? 'border-accent/40' : ''}>
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <RefreshCw className={`w-4 h-4 ${retestAvailable ? 'text-accent' : 'text-muted-foreground'}`} />
                    <span className="text-sm font-medium text-foreground">Ciclo de Reteste</span>
                  </div>
                  {retestAvailable ? (
                    <Badge className="bg-accent/15 text-accent border-accent/30 text-[10px]">
                      Reteste liberado!
                    </Badge>
                  ) : (
                    <span className="text-xs text-muted-foreground">{daysUntilRetest} dias restantes</span>
                  )}
                </div>
                <Progress value={retestProgressPct} className="h-1.5 mb-2" />
                {retestAvailable ? (
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground">
                      Seu ciclo {activeCycle.cycleNumber} se completou. Refaça o teste para iniciar o ciclo {activeCycle.cycleNumber + 1}.
                    </p>
                    <Button
                      size="sm"
                      className="w-full"
                      onClick={() => navigate(`/diagnostic/${testModuleId}`)}
                    >
                      <RefreshCw className="w-3.5 h-3.5 mr-2" /> Iniciar Ciclo {activeCycle.cycleNumber + 1}
                    </Button>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Continue executando suas ações. O reteste será liberado em {daysUntilRetest} dia{daysUntilRetest !== 1 ? 's' : ''}.
                  </p>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* BLOCO B — Ações */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Ações — Ciclo {activeCycle.cycleNumber}</CardTitle>
                <span className="text-xs text-muted-foreground">{progressPct}% concluído</span>
              </div>
              <Progress value={progressPct} className="h-1.5" />
            </CardHeader>
            <CardContent className="space-y-2 pt-0">
              {activeCycle.actions.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  Nenhuma ação gerada para este ciclo.
                </p>
              ) : (
                activeCycle.actions.map((action) => {
                  const isExpanded = expandedAction === action.id;
                  const isPastCycle = !isLatestCycle;
                  const parsed = parseActionString(action.action_text);
                  return (
                    <div key={action.id} className={`border rounded-xl p-4 space-y-2 transition-all ${
                      action.completed ? 'border-green-500/20 bg-green-500/[0.02]' : 'border-border/50'
                    }`}>
                      <div className="flex items-start gap-3">
                        <Checkbox
                          checked={action.completed}
                          onCheckedChange={(checked) => toggleAction(action.id, !!checked)}
                          className="mt-1"
                          disabled={isPastCycle}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] text-muted-foreground/60 mb-1 leading-relaxed">
                            Quando <span className="text-foreground/70 font-medium">{parsed.trigger}</span> →
                          </p>
                          <p className={`text-sm leading-relaxed ${action.completed ? 'line-through text-muted-foreground' : 'text-foreground font-medium'}`}>
                            {parsed.action}
                          </p>
                          {action.completed && action.completed_at && (
                            <p className="text-[10px] text-green-600/60 mt-1.5 flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" />
                              Concluída em {new Date(action.completed_at).toLocaleDateString('pt-BR')}
                            </p>
                          )}
                        </div>
                        <button
                          onClick={() => setExpandedAction(isExpanded ? null : action.id)}
                          className="p-1 rounded-lg hover:bg-secondary/50 text-muted-foreground"
                        >
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                      </div>

                      {isExpanded && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          className="pl-8 space-y-2 pt-1"
                        >
                          <label className="text-xs text-muted-foreground font-medium">Anotação</label>
                          <Textarea
                            placeholder="O que aconteceu quando tentou aplicar? O que sentiu? Funcionou?"
                            value={action.notes}
                            onChange={(e) => {
                              const val = e.target.value;
                              updateActionInCycle(action.id, { notes: val });
                            }}
                            className="min-h-[60px] text-sm resize-none"
                            disabled={isPastCycle}
                          />
                          {!isPastCycle && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => saveNotes(action.id, action.notes)}
                              disabled={savingNotes.has(action.id)}
                              className="text-xs"
                            >
                              <Save className="w-3 h-3 mr-1" />
                              {savingNotes.has(action.id) ? 'Salvando...' : 'Salvar'}
                            </Button>
                          )}
                        </motion.div>
                      )}
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* BLOCO E — Feedback da IA */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-accent" />
                  <CardTitle className="text-base">Leitura da IA — Ciclo {activeCycle.cycleNumber}</CardTitle>
                </div>
                {isLatestCycle && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={requestAIFeedback}
                    disabled={loadingAI}
                    className="text-xs"
                  >
                    {loadingAI ? (
                      <>
                        <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin mr-1" />
                        Analisando...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3 h-3 mr-1" /> Gerar feedback
                      </>
                    )}
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {activeCycle.aiFeedback ? (
                <div className="text-sm text-foreground leading-relaxed whitespace-pre-line bg-secondary/30 rounded-xl p-4">
                  {activeCycle.aiFeedback}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  {isLatestCycle
                    ? 'Marque ações e escreva anotações para receber um feedback personalizado da IA sobre seu progresso.'
                    : 'Nenhum feedback gerado para este ciclo.'}
                </p>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </AppLayout>
  );
}
