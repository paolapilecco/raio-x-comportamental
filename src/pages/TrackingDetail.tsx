import { useEffect, useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
import {
  ArrowLeft, CheckCircle2, RefreshCw, Sparkles, ChevronDown, ChevronUp,
  Save, Lock, Crown, History, Target, AlertTriangle, Zap,
  Play, Eye, Hammer, RotateCcw, Calendar, TrendingUp, TrendingDown, Minus,
  Shield, ArrowUpRight, ArrowDownRight
} from 'lucide-react';
import { toast } from 'sonner';

interface ActionItem {
  id: string;
  day_number: number;
  action_text: string;
  gatilho: string;
  acao: string;
  completed: boolean;
  completed_at: string | null;
  started_at: string | null;
  notes: string;
  fase: string;
  padraoAlvo: string;
  titulo: string;
  objetivo: string;
}

interface CycleData {
  cycleNumber: number;
  sessionId: string;
  diagnosticResultId: string;
  completedAt: string;
  dominantPattern: string;
  profileName: string;
  stateSummary: string;
  intensity: string;
  contradiction: string;
  selfDeceptionIndex: number;
  confidenceScore: number;
  consistencyScore: number;
  allScores: { key: string; label: string; percentage: number }[];
  topScore: { label: string; percentage: number } | null;
  actions: ActionItem[];
  aiFeedback: string | null;
}

type EvolutionClass = 'evolution' | 'stagnation' | 'regression';

interface EvolutionComparison {
  classification: EvolutionClass;
  patternChanged: boolean;
  intensityDelta: number; // negative = improvement
  selfDeceptionDelta: number;
  confidenceDelta: number;
  consistencyDelta: number;
  interpretation: string;
  riskMessage: string | null;
  scoreDiffs: { key: string; label: string; prev: number; curr: number; delta: number }[];
}

const RETEST_DAYS = 15;
const ABANDON_DAYS = 3;

const PHASE_ICONS: Record<string, typeof Eye> = {
  consciencia: Eye,
  interrupcao: Hammer,
  consolidacao: RotateCcw,
};

const PHASE_LABELS: Record<string, string> = {
  consciencia: 'Consciência',
  interrupcao: 'Interrupção',
  consolidacao: 'Consolidação',
};

const PHASE_COLORS: Record<string, string> = {
  consciencia: 'text-blue-500 bg-blue-500/10 border-blue-500/20',
  interrupcao: 'text-orange-500 bg-orange-500/10 border-orange-500/20',
  consolidacao: 'text-green-600 bg-green-500/10 border-green-500/20',
};

const INTENSITY_VALUE: Record<string, number> = { leve: 1, moderado: 2, alto: 3 };
const INTENSITY_LABEL: Record<string, string> = { leve: 'Leve', moderado: 'Moderado', alto: 'Alto' };

function getTaskStatus(action: ActionItem): 'not_started' | 'in_progress' | 'completed' | 'abandoned' {
  if (action.completed) return 'completed';
  if (action.started_at) {
    const started = new Date(action.started_at);
    if ((Date.now() - started.getTime()) > ABANDON_DAYS * 86400000) return 'abandoned';
    return 'in_progress';
  }
  return 'not_started';
}

function getProgressInterpretation(completed: number, total: number, hasAbandoned: boolean): { text: string; icon: typeof AlertTriangle } {
  if (total === 0) return { text: '', icon: AlertTriangle };
  if (hasAbandoned) return { text: 'Você parou exatamente onde costuma parar. O padrão está ganhando.', icon: AlertTriangle };
  if (completed === 0) return { text: 'Saber não muda — fazer muda. A execução precisa começar.', icon: AlertTriangle };
  if (completed < total * 0.5) return { text: 'Você iniciou, agora precisa sustentar. Padrões não se quebram com uma tentativa.', icon: Zap };
  if (completed < total) return { text: 'Você já está rompendo o padrão, mas ainda não consolidou.', icon: Target };
  return { text: 'Você concluiu todas as ações deste ciclo. Hora de medir se a mudança foi real.', icon: CheckCircle2 };
}

function parseMetadata(actionText: string, index: number): Pick<ActionItem, 'titulo' | 'objetivo' | 'fase' | 'padraoAlvo'> {
  const phases = ['consciencia', 'interrupcao', 'consolidacao'];
  try {
    const parsed = JSON.parse(actionText);
    return {
      titulo: parsed.titulo || '',
      objetivo: parsed.objetivo || '',
      fase: parsed.fase || phases[index] || 'consciencia',
      padraoAlvo: parsed.padraoAlvo || '',
    };
  } catch {
    return { titulo: '', objetivo: '', fase: phases[index] || 'consciencia', padraoAlvo: '' };
  }
}

function getEvolutionSummary(ev: EvolutionComparison, curr: CycleData): string {
  if (ev.classification === 'evolution') {
    if (ev.patternChanged) return 'Você evoluiu — o padrão dominante mudou. Agora precisa consolidar.';
    if (ev.consistencyDelta > 10) return 'Você evoluiu e está mais consistente. Falta sustentar.';
    return 'Você evoluiu, mas ainda não consolidou.';
  }
  if (ev.classification === 'regression') {
    if (ev.selfDeceptionDelta > 5) return 'Você regrediu — o padrão voltou a dominar e o autoengano subiu.';
    return 'Você regrediu — o comportamento voltou a se fortalecer.';
  }
  // stagnation
  if (ev.confidenceDelta > 0) return 'Você entendeu o padrão, mas não mudou o comportamento.';
  return 'Estagnação — o padrão continua ativo sem alteração real.';
}

function getEvolutionDirection(ev: EvolutionComparison, curr: CycleData): string {
  const hasIncomplete = curr.actions.some(a => !a.completed);
  const abandoned = curr.actions.some(a => getTaskStatus(a) === 'abandoned');

  if (ev.classification === 'evolution') {
    if (hasIncomplete) return 'Sustentar até consolidar — complete as ações restantes deste ciclo.';
    return 'Preparar o próximo ciclo com foco em manutenção do progresso.';
  }
  if (ev.classification === 'regression') {
    if (abandoned) return 'Recomeçar o ciclo com foco em execução — retome a tarefa abandonada.';
    return 'Executar novamente a fase de interrupção — o padrão retomou controle.';
  }
  // stagnation
  if (hasIncomplete) return 'Finalizar as ações pendentes antes de reavaliar.';
  return 'Refazer o teste e comparar — a mudança precisa ser medida.';
}

function computeEvolution(prev: CycleData, curr: CycleData): EvolutionComparison {
  const patternChanged = prev.dominantPattern !== curr.dominantPattern;
  const prevIntensity = INTENSITY_VALUE[prev.intensity] || 2;
  const currIntensity = INTENSITY_VALUE[curr.intensity] || 2;
  const intensityDelta = currIntensity - prevIntensity;
  const selfDeceptionDelta = (curr.selfDeceptionIndex || 0) - (prev.selfDeceptionIndex || 0);
  const confidenceDelta = (curr.confidenceScore || 0) - (prev.confidenceScore || 0);
  const consistencyDelta = (curr.consistencyScore || 0) - (prev.consistencyScore || 0);

  // Build score diffs
  const prevScoreMap = new Map(prev.allScores.map(s => [s.key, s]));
  const scoreDiffs = curr.allScores.map(s => {
    const p = prevScoreMap.get(s.key);
    return { key: s.key, label: s.label, prev: p?.percentage || 0, curr: s.percentage, delta: s.percentage - (p?.percentage || 0) };
  });

  // Classify
  const improvementSignals = [
    intensityDelta < 0,
    selfDeceptionDelta < 0,
    confidenceDelta > 5,
    consistencyDelta > 5,
    patternChanged,
  ].filter(Boolean).length;

  const regressionSignals = [
    intensityDelta > 0,
    selfDeceptionDelta > 5,
    confidenceDelta < -5,
    consistencyDelta < -5,
  ].filter(Boolean).length;

  let classification: EvolutionClass = 'stagnation';
  if (improvementSignals >= 2) classification = 'evolution';
  else if (regressionSignals >= 2) classification = 'regression';

  // Interpretation
  let interpretation = '';
  if (classification === 'evolution') {
    if (patternChanged) {
      interpretation = `Seu padrão dominante mudou de "${prev.dominantPattern}" para "${curr.dominantPattern}". Isso indica uma reestruturação real do comportamento.`;
    } else {
      interpretation = `Seu padrão "${curr.dominantPattern}" enfraqueceu. A intensidade diminuiu e os indicadores mostram progresso real.`;
    }
    if (selfDeceptionDelta < -5) interpretation += ' Seu índice de autoengano caiu — você está se vendo com mais clareza.';
  } else if (classification === 'regression') {
    interpretation = `Houve regressão — o comportamento "${curr.dominantPattern}" voltou a se fortalecer.`;
    if (selfDeceptionDelta > 5) interpretation += ' Seu índice de autoengano subiu. Pode estar justificando o padrão novamente.';
    if (intensityDelta > 0) interpretation += ` A intensidade subiu de ${INTENSITY_LABEL[prev.intensity] || prev.intensity} para ${INTENSITY_LABEL[curr.intensity] || curr.intensity}.`;
  } else {
    interpretation = `Seu padrão "${curr.dominantPattern}" se mantém ativo com a mesma intensidade. Houve entendimento, mas ainda não houve mudança estrutural.`;
  }

  // Risk
  let riskMessage: string | null = null;
  if (classification === 'evolution') {
    const prevCompleted = prev.actions.filter(a => a.completed).length;
    const prevTotal = prev.actions.length;
    if (prevTotal > 0 && prevCompleted < prevTotal) {
      riskMessage = 'Você melhorou, mas ainda está instável. Sem continuidade, esse padrão pode voltar.';
    }
  } else if (classification === 'regression') {
    riskMessage = 'A regressão indica que o padrão retomou controle. Ação imediata é necessária.';
  }

  return { classification, patternChanged, intensityDelta, selfDeceptionDelta, confidenceDelta, consistencyDelta, interpretation, riskMessage, scoreDiffs };
}

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
  const [showRetestConfirm, setShowRetestConfirm] = useState(false);

  useEffect(() => {
    if (!user || !hasAccess || !testModuleId) { setLoading(false); return; }

    const load = async () => {
      try {
        const { data: mod } = await supabase.from('test_modules').select('name, icon').eq('id', testModuleId).single();
        setTestName(mod?.name || 'Teste');

        const { data: sessions } = await supabase
          .from('diagnostic_sessions')
          .select('id, completed_at')
          .eq('user_id', user.id)
          .eq('test_module_id', testModuleId)
          .not('completed_at', 'is', null)
          .order('completed_at', { ascending: true });

        if (!sessions?.length) { setLoading(false); return; }

        const sessionIds = sessions.map(s => s.id);
        const { data: results } = await supabase
          .from('diagnostic_results')
          .select('id, session_id, dominant_pattern, profile_name, state_summary, all_scores, intensity, contradiction, self_deception_index, confidence_score, consistency_score')
          .in('session_id', sessionIds);

        if (!results?.length) { setLoading(false); return; }
        const resultMap = new Map(results.map(r => [r.session_id, r]));
        const resultIds = results.map(r => r.id);

        const { data: allActions } = await supabase
          .from('action_plan_tracking')
          .select('id, day_number, action_text, gatilho, acao, completed, completed_at, started_at, notes, diagnostic_result_id')
          .in('diagnostic_result_id', resultIds)
          .eq('user_id', user.id)
          .order('day_number');

        const actionsByResult = new Map<string, ActionItem[]>();
        for (const a of (allActions || [])) {
          const meta = parseMetadata(a.action_text, (actionsByResult.get(a.diagnostic_result_id)?.length || 0));
          const list = actionsByResult.get(a.diagnostic_result_id) || [];
          list.push({ ...a, ...meta, started_at: a.started_at || null, notes: a.notes || '' });
          actionsByResult.set(a.diagnostic_result_id, list);
        }

        const { data: allFeedback } = await supabase
          .from('progress_ai_feedback')
          .select('diagnostic_result_id, feedback_text, created_at')
          .in('diagnostic_result_id', resultIds)
          .order('created_at', { ascending: false });

        const feedbackByResult = new Map<string, string>();
        for (const f of (allFeedback || [])) {
          if (!feedbackByResult.has(f.diagnostic_result_id)) feedbackByResult.set(f.diagnostic_result_id, f.feedback_text);
        }

        const cycleList: CycleData[] = [];
        sessions.forEach((session, index) => {
          const result = resultMap.get(session.id);
          if (!result) return;
          const scores = (result.all_scores as any[] || []) as { key: string; label: string; percentage: number }[];
          const topScore = scores.length > 0 ? scores.reduce((max, s) => s.percentage > max.percentage ? s : max, scores[0]) : null;
          cycleList.push({
            cycleNumber: index + 1,
            sessionId: session.id,
            diagnosticResultId: result.id,
            completedAt: session.completed_at!,
            dominantPattern: result.dominant_pattern,
            profileName: result.profile_name,
            stateSummary: result.state_summary,
            intensity: result.intensity || 'moderado',
            contradiction: result.contradiction || '',
            selfDeceptionIndex: result.self_deception_index || 0,
            confidenceScore: result.confidence_score || 0,
            consistencyScore: result.consistency_score || 0,
            allScores: scores,
            topScore,
            actions: actionsByResult.get(result.id) || [],
            aiFeedback: feedbackByResult.get(result.id) || null,
          });
        });

        setCycles(cycleList);
        setActiveCycleIndex(cycleList.length - 1);
      } catch (e) {
        console.error('Error loading tracking detail:', e);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [user, hasAccess, testModuleId]);

  const activeCycle = cycles[activeCycleIndex] || null;

  // Evolution comparison — compare active cycle with previous
  const evolution = useMemo<EvolutionComparison | null>(() => {
    if (activeCycleIndex <= 0 || !cycles[activeCycleIndex] || !cycles[activeCycleIndex - 1]) return null;
    return computeEvolution(cycles[activeCycleIndex - 1], cycles[activeCycleIndex]);
  }, [cycles, activeCycleIndex]);

  const updateActionInCycle = useCallback((actionId: string, updates: Partial<ActionItem>) => {
    setCycles(prev => prev.map((cycle, idx) =>
      idx === activeCycleIndex
        ? { ...cycle, actions: cycle.actions.map(a => a.id === actionId ? { ...a, ...updates } : a) }
        : cycle
    ));
  }, [activeCycleIndex]);

  const startTask = useCallback(async (actionId: string) => {
    const now = new Date().toISOString();
    updateActionInCycle(actionId, { started_at: now });
    const { error } = await supabase.from('action_plan_tracking').update({ started_at: now }).eq('id', actionId);
    if (error) { updateActionInCycle(actionId, { started_at: null }); toast.error('Erro ao iniciar tarefa'); }
    else toast.success('Tarefa iniciada');
  }, [updateActionInCycle]);

  const toggleAction = useCallback(async (actionId: string, completed: boolean) => {
    const now = completed ? new Date().toISOString() : null;
    const startedNow = completed ? new Date().toISOString() : undefined;
    const updates: Partial<ActionItem> = { completed, completed_at: now };
    const action = activeCycle?.actions.find(a => a.id === actionId);
    if (completed && action && !action.started_at) updates.started_at = startedNow;
    updateActionInCycle(actionId, updates);
    const dbUpdate: any = { completed, completed_at: now };
    if (completed && action && !action.started_at) dbUpdate.started_at = startedNow;
    const { error } = await supabase.from('action_plan_tracking').update(dbUpdate).eq('id', actionId);
    if (error) { updateActionInCycle(actionId, { completed: !completed }); toast.error('Erro ao atualizar ação'); }
  }, [updateActionInCycle, activeCycle]);

  const saveNotes = useCallback(async (actionId: string, notes: string) => {
    setSavingNotes(prev => new Set(prev).add(actionId));
    const { error } = await supabase.from('action_plan_tracking').update({ notes }).eq('id', actionId);
    setSavingNotes(prev => { const n = new Set(prev); n.delete(actionId); return n; });
    if (error) toast.error('Erro ao salvar anotação');
    else toast.success('Anotação salva');
  }, []);

  const requestAIFeedback = useCallback(async () => {
    if (!activeCycle || !user) return;
    setLoadingAI(true);
    try {
      const { data, error } = await supabase.functions.invoke('analyze-progress', {
        body: { userId: user.id, diagnosticResultId: activeCycle.diagnosticResultId, testModuleId },
      });
      if (error) throw error;
      if (data?.feedback) {
        setCycles(prev => prev.map((cycle, idx) =>
          idx === activeCycleIndex ? { ...cycle, aiFeedback: data.feedback } : cycle
        ));
        toast.success('Feedback gerado');
      }
    } catch {
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
              <p className="text-foreground font-bold">Sem execução, nada muda.</p>
              <Button onClick={() => navigate('/checkout')} className="bg-accent text-accent-foreground w-full">
                <Crown className="w-4 h-4 mr-2" /> Desbloquear — R$9,99/mês
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
          <p className="text-muted-foreground">Nenhum resultado encontrado.</p>
          <Button variant="outline" className="mt-4" onClick={() => navigate('/acompanhamento')}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Voltar
          </Button>
        </div>
      </AppLayout>
    );
  }

  const completedCount = activeCycle.actions.filter(a => a.completed).length;
  const totalActions = activeCycle.actions.length;
  const progressPct = totalActions > 0 ? Math.round((completedCount / totalActions) * 100) : 0;
  const lastDate = new Date(activeCycle.completedAt);
  const daysSinceTest = Math.floor((Date.now() - lastDate.getTime()) / 86400000);
  const daysUntilRetest = Math.max(0, RETEST_DAYS - daysSinceTest);
  const retestAvailable = daysSinceTest >= RETEST_DAYS;
  const retestProgressPct = Math.min(100, Math.round((daysSinceTest / RETEST_DAYS) * 100));
  const isLatestCycle = activeCycleIndex === cycles.length - 1;
  const hasAbandoned = activeCycle.actions.some(a => getTaskStatus(a) === 'abandoned');
  const hasActions = totalActions > 0;
  const progressInfo = getProgressInterpretation(completedCount, totalActions, hasAbandoned);
  const hasAnyCompletion = activeCycle.actions.some(a => a.completed);
  const hasAnyNote = activeCycle.actions.some(a => a.notes?.trim());
  const canRequestFeedback = hasAnyCompletion || hasAnyNote;
  const notesCount = activeCycle.actions.filter(a => a.notes?.trim()).length;
  const sortedActions = [...activeCycle.actions].sort((a, b) => a.day_number - b.day_number);

  const evolutionColors: Record<EvolutionClass, string> = {
    evolution: 'border-green-500/30 bg-green-500/[0.03]',
    stagnation: 'border-amber-500/30 bg-amber-500/[0.03]',
    regression: 'border-destructive/30 bg-destructive/[0.03]',
  };

  const evolutionLabels: Record<EvolutionClass, { label: string; icon: typeof TrendingUp }> = {
    evolution: { label: 'Evolução Real', icon: TrendingUp },
    stagnation: { label: 'Estagnação', icon: Minus },
    regression: { label: 'Regressão', icon: TrendingDown },
  };

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
                Ciclo {activeCycle.cycleNumber} de {cycles.length}{isLatestCycle && ' (atual)'}
              </p>
            </div>
          </div>
          {cycles.length > 1 && (
            <Button variant="outline" size="sm" onClick={() => setShowCycleHistory(!showCycleHistory)} className="text-xs">
              <History className="w-3.5 h-3.5 mr-1" /> Ciclos
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
                  const cycleAbandoned = cycle.actions.some(a => getTaskStatus(a) === 'abandoned');

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
                          <span className="text-sm font-semibold text-foreground">Ciclo {cycle.cycleNumber}</span>
                          {realIdx === cycles.length - 1 && <Badge variant="secondary" className="ml-2 text-[10px]">Atual</Badge>}
                          {cycleAbandoned && <Badge variant="destructive" className="ml-2 text-[10px]">Interrompido</Badge>}
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

        {/* === EVOLUTION TIMELINE === */}
        {cycles.length > 1 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <Card>
              <CardContent className="p-5">
                <div className="flex items-center gap-2 mb-4">
                  <History className="w-4 h-4 text-primary" />
                  <h3 className="text-sm font-semibold text-foreground">Linha do Tempo</h3>
                </div>
                <div className="relative">
                  {/* Timeline line */}
                  <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border/50" />
                  
                  {cycles.map((cycle, idx) => {
                    const isActive = idx === activeCycleIndex;
                    const cycleCompleted = cycle.actions.filter(a => a.completed).length;
                    const cyclePct = cycle.actions.length > 0 ? Math.round((cycleCompleted / cycle.actions.length) * 100) : 0;
                    const prevCycle = idx > 0 ? cycles[idx - 1] : null;
                    const patternChanged = prevCycle && prevCycle.dominantPattern !== cycle.dominantPattern;

                    return (
                      <div key={cycle.sessionId} className="relative pl-10 pb-4 last:pb-0">
                        {/* Dot */}
                        <div className={`absolute left-2.5 w-3.5 h-3.5 rounded-full border-2 ${
                          isActive ? 'bg-primary border-primary' :
                          cyclePct === 100 ? 'bg-green-500 border-green-500' :
                          'bg-background border-muted-foreground/30'
                        }`} style={{ top: '4px' }} />
                        
                        <button
                          onClick={() => setActiveCycleIndex(idx)}
                          className={`w-full text-left p-2.5 rounded-lg transition-all ${
                            isActive ? 'bg-primary/5 border border-primary/20' : 'hover:bg-secondary/30'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <span className="text-xs font-bold text-foreground">Ciclo {cycle.cycleNumber}</span>
                              <span className="text-[10px] text-muted-foreground ml-2">
                                {new Date(cycle.completedAt).toLocaleDateString('pt-BR')}
                              </span>
                            </div>
                            <span className="text-[10px] font-medium text-muted-foreground">{cyclePct}%</span>
                          </div>
                          <p className="text-[11px] text-muted-foreground mt-0.5">{cycle.profileName}</p>
                          {patternChanged && (
                            <div className="flex items-center gap-1 mt-1">
                              <ArrowUpRight className="w-3 h-3 text-green-600" />
                              <span className="text-[10px] font-medium text-green-600">Padrão mudou</span>
                            </div>
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* === EVOLUTION COMPARISON === */}
        {evolution && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.03 }}>
            <Card className={evolutionColors[evolution.classification]}>
              <CardContent className="p-5 space-y-4">
                {/* Classification badge */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {(() => {
                      const EvIcon = evolutionLabels[evolution.classification].icon;
                      return <EvIcon className={`w-5 h-5 ${
                        evolution.classification === 'evolution' ? 'text-green-600' :
                        evolution.classification === 'regression' ? 'text-destructive' : 'text-amber-500'
                      }`} />;
                    })()}
                    <h3 className="text-sm font-bold text-foreground">
                      Comparação: Ciclo {activeCycleIndex} → {activeCycleIndex + 1}
                    </h3>
                  </div>
                  <Badge className={`text-[10px] ${
                    evolution.classification === 'evolution' ? 'bg-green-500/15 text-green-600 border-green-500/30' :
                    evolution.classification === 'regression' ? 'bg-destructive/15 text-destructive border-destructive/30' :
                    'bg-amber-500/15 text-amber-600 border-amber-500/30'
                  }`}>
                    {evolutionLabels[evolution.classification].label}
                  </Badge>
                </div>

                {/* Interpretation */}
                <p className="text-sm text-foreground leading-relaxed">{evolution.interpretation}</p>

                {/* Key metrics */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-xl bg-background/50 border border-border/30">
                    <p className="text-[10px] text-muted-foreground mb-1">Intensidade</p>
                    <div className="flex items-center gap-1.5">
                      {evolution.intensityDelta < 0 ? <ArrowDownRight className="w-3.5 h-3.5 text-green-600" /> :
                       evolution.intensityDelta > 0 ? <ArrowUpRight className="w-3.5 h-3.5 text-destructive" /> :
                       <Minus className="w-3.5 h-3.5 text-muted-foreground" />}
                      <span className="text-sm font-bold text-foreground">
                        {INTENSITY_LABEL[activeCycle.intensity] || activeCycle.intensity}
                      </span>
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-background/50 border border-border/30">
                    <p className="text-[10px] text-muted-foreground mb-1">Autoengano</p>
                    <div className="flex items-center gap-1.5">
                      {evolution.selfDeceptionDelta < 0 ? <ArrowDownRight className="w-3.5 h-3.5 text-green-600" /> :
                       evolution.selfDeceptionDelta > 0 ? <ArrowUpRight className="w-3.5 h-3.5 text-destructive" /> :
                       <Minus className="w-3.5 h-3.5 text-muted-foreground" />}
                      <span className="text-sm font-bold text-foreground">{activeCycle.selfDeceptionIndex}%</span>
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-background/50 border border-border/30">
                    <p className="text-[10px] text-muted-foreground mb-1">Confiança</p>
                    <div className="flex items-center gap-1.5">
                      {evolution.confidenceDelta > 0 ? <ArrowUpRight className="w-3.5 h-3.5 text-green-600" /> :
                       evolution.confidenceDelta < 0 ? <ArrowDownRight className="w-3.5 h-3.5 text-destructive" /> :
                       <Minus className="w-3.5 h-3.5 text-muted-foreground" />}
                      <span className="text-sm font-bold text-foreground">{activeCycle.confidenceScore}%</span>
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-background/50 border border-border/30">
                    <p className="text-[10px] text-muted-foreground mb-1">Consistência</p>
                    <div className="flex items-center gap-1.5">
                      {evolution.consistencyDelta > 0 ? <ArrowUpRight className="w-3.5 h-3.5 text-green-600" /> :
                       evolution.consistencyDelta < 0 ? <ArrowDownRight className="w-3.5 h-3.5 text-destructive" /> :
                       <Minus className="w-3.5 h-3.5 text-muted-foreground" />}
                      <span className="text-sm font-bold text-foreground">{activeCycle.consistencyScore}%</span>
                    </div>
                  </div>
                </div>

                {/* Score diffs */}
                {evolution.scoreDiffs.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Mudança por eixo</p>
                    {evolution.scoreDiffs.map(sd => (
                      <div key={sd.key} className="flex items-center gap-3">
                        <span className="text-[11px] text-muted-foreground w-28 truncate">{sd.label}</span>
                        <div className="flex-1 h-1.5 rounded-full bg-secondary/60 overflow-hidden">
                          <div className="h-full rounded-full bg-primary/60" style={{ width: `${sd.curr}%` }} />
                        </div>
                        <span className={`text-[11px] font-bold tabular-nums w-12 text-right ${
                          sd.delta < -3 ? 'text-green-600' : sd.delta > 3 ? 'text-destructive' : 'text-muted-foreground'
                        }`}>
                          {sd.delta > 0 ? '+' : ''}{sd.delta}%
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Risk warning */}
                {evolution.riskMessage && (
                  <div className={`flex items-start gap-2.5 rounded-lg p-3 ${
                    evolution.classification === 'regression' ? 'bg-destructive/5 border border-destructive/10' : 'bg-amber-500/5 border border-amber-500/10'
                  }`}>
                    <Shield className={`w-4 h-4 shrink-0 mt-0.5 ${
                      evolution.classification === 'regression' ? 'text-destructive' : 'text-amber-500'
                    }`} />
                    <p className={`text-xs font-medium ${
                      evolution.classification === 'regression' ? 'text-destructive/80' : 'text-amber-600'
                    }`}>{evolution.riskMessage}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* === EVOLUTION STRATEGIC CLOSURE === */}
        {evolution && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.06 }}>
            <Card className="border-primary/20 bg-primary/[0.02]">
              <CardContent className="p-5 space-y-4">
                {/* Resumo da evolução */}
                <div>
                  <p className="text-[10px] text-primary font-bold uppercase tracking-wider mb-2">Resumo da sua evolução</p>
                  <p className={`text-sm font-semibold leading-relaxed ${
                    evolution.classification === 'evolution' ? 'text-green-600' :
                    evolution.classification === 'regression' ? 'text-destructive' : 'text-amber-600'
                  }`}>
                    {getEvolutionSummary(evolution, activeCycle)}
                  </p>
                </div>

                <div className="h-px bg-border/40" />

                {/* Direcionamento pós-análise */}
                <div>
                  <p className="text-[10px] text-primary font-bold uppercase tracking-wider mb-2">Com base nisso, você precisa agora:</p>
                  <div className="flex items-start gap-2.5 p-3 rounded-lg bg-primary/5 border border-primary/10">
                    <Target className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                    <p className="text-sm font-medium text-foreground">{getEvolutionDirection(evolution, activeCycle)}</p>
                  </div>
                </div>

                {/* CTA */}
                <Button
                  size="sm"
                  className="w-full"
                  onClick={() => {
                    const firstPending = activeCycle.actions.find(a => !a.completed);
                    if (firstPending) {
                      setExpandedAction(firstPending.id);
                      document.getElementById(`action-${firstPending.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }
                  }}
                >
                  <Zap className="w-3.5 h-3.5 mr-1.5" /> Ir para a próxima ação
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Diagnosis summary */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <Card>
            <CardContent className="p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Ciclo {activeCycle.cycleNumber} — Diagnóstico</p>
                  <p className="font-semibold text-foreground">{activeCycle.profileName}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-[10px]">
                    {INTENSITY_LABEL[activeCycle.intensity] || activeCycle.intensity}
                  </Badge>
                  {activeCycle.topScore && (
                    <div className="text-right">
                      <p className="text-[10px] text-muted-foreground">Eixo mais alto</p>
                      <p className="text-xs font-semibold text-primary">{activeCycle.topScore.label}: {activeCycle.topScore.percentage}%</p>
                    </div>
                  )}
                </div>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">{activeCycle.stateSummary}</p>
              
              {/* Retest status indicator */}
              {isLatestCycle && (
                <div className="flex items-center gap-2 pt-1">
                  <div className={`w-2 h-2 rounded-full ${
                    retestAvailable ? 'bg-accent animate-pulse' :
                    daysSinceTest >= RETEST_DAYS * 0.7 ? 'bg-amber-500' : 'bg-green-500'
                  }`} />
                  <span className="text-[10px] text-muted-foreground">
                    {retestAvailable ? 'Reavaliação disponível' :
                     daysSinceTest >= RETEST_DAYS * 0.7 ? `Reavaliação em ${daysUntilRetest} dias` :
                     `Período de execução — ${daysUntilRetest} dias restantes`}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Progress block */}
        {hasActions && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
            <Card>
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Target className="w-[18px] h-[18px] text-primary" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-foreground">Progresso do Ciclo</h3>
                      <p className="text-[10px] text-muted-foreground">{totalActions} ações para executar</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-3 mb-3">
                  <div className="text-center">
                    <p className="text-lg font-bold text-foreground tabular-nums">{completedCount}</p>
                    <p className="text-[10px] text-muted-foreground">concluídas</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-bold text-foreground tabular-nums">{activeCycle.actions.filter(a => getTaskStatus(a) === 'in_progress').length}</p>
                    <p className="text-[10px] text-muted-foreground">em andamento</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-bold text-destructive tabular-nums">{activeCycle.actions.filter(a => getTaskStatus(a) === 'abandoned').length}</p>
                    <p className="text-[10px] text-muted-foreground">paradas</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-bold text-primary tabular-nums">{progressPct}%</p>
                    <p className="text-[10px] text-muted-foreground">execução</p>
                  </div>
                </div>

                <div className="w-full h-2 rounded-full bg-secondary/60 overflow-hidden mb-3">
                  <motion.div
                    className={`h-full rounded-full ${hasAbandoned ? 'bg-destructive' : progressPct >= 70 ? 'bg-green-500' : progressPct >= 40 ? 'bg-primary' : 'bg-muted-foreground/30'}`}
                    initial={{ width: 0 }}
                    animate={{ width: `${progressPct}%` }}
                    transition={{ duration: 0.8 }}
                  />
                </div>

                {isLatestCycle && progressInfo.text && (
                  <div className={`flex items-start gap-2.5 rounded-lg p-3 ${hasAbandoned ? 'bg-destructive/5' : 'bg-secondary/30'}`}>
                    <progressInfo.icon className={`w-4 h-4 shrink-0 mt-0.5 ${hasAbandoned ? 'text-destructive' : 'text-muted-foreground'}`} />
                    <p className={`text-xs leading-relaxed ${hasAbandoned ? 'text-destructive/80 font-medium' : 'text-foreground/80'}`}>{progressInfo.text}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Actions */}
        {hasActions ? (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Ações — Ciclo {activeCycle.cycleNumber}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 pt-0">
                {sortedActions.map((action, idx) => {
                  const isExpanded = expandedAction === action.id;
                  const isPastCycle = !isLatestCycle;
                  const trigger = action.gatilho || parseActionString(action.action_text).trigger;
                  const actionText = action.acao || parseActionString(action.action_text).action;
                  const status = getTaskStatus(action);
                  const PhaseIcon = PHASE_ICONS[action.fase] || Eye;
                  const phaseLabel = PHASE_LABELS[action.fase] || action.fase;
                  const phaseColor = PHASE_COLORS[action.fase] || 'text-muted-foreground bg-muted/50';

                  return (
                    <div key={action.id} className={`border rounded-xl overflow-hidden transition-all ${
                      status === 'completed' ? 'border-green-500/30 bg-green-500/[0.03]' :
                      status === 'abandoned' ? 'border-destructive/30 bg-destructive/[0.03]' :
                      status === 'in_progress' ? 'border-primary/40 bg-primary/[0.03] ring-1 ring-primary/10' :
                      'border-border/50'
                    }`}>
                      {/* Phase + status header */}
                      <div className={`px-4 py-2 border-b flex items-center justify-between ${
                        status === 'abandoned' ? 'bg-destructive/5 border-destructive/10' :
                        status === 'in_progress' ? 'bg-primary/5 border-primary/10' :
                        status === 'completed' ? 'bg-green-500/5 border-green-500/10' :
                        'bg-secondary/30 border-border/30'
                      }`}>
                        <div className="flex items-center gap-2">
                          <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${phaseColor}`}>
                            <PhaseIcon className="w-3.5 h-3.5" />
                          </div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                            Fase {idx + 1}: {phaseLabel}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          {status === 'abandoned' && (
                            <Badge variant="destructive" className="text-[9px]">
                              <AlertTriangle className="w-2.5 h-2.5 mr-0.5" /> Parada
                            </Badge>
                          )}
                          {status === 'in_progress' && (
                            <Badge className="bg-primary/15 text-primary border-primary/30 text-[9px]">
                              <Play className="w-2.5 h-2.5 mr-0.5" /> Em andamento
                            </Badge>
                          )}
                          {status === 'completed' && (
                            <Badge className="bg-green-500/15 text-green-600 border-green-500/30 text-[9px]">
                              <CheckCircle2 className="w-2.5 h-2.5 mr-0.5" /> Concluída
                            </Badge>
                          )}
                        </div>
                      </div>

                      {/* Task content */}
                      <div className="p-4 space-y-2">
                        {action.titulo && <p className="text-sm font-semibold text-foreground">{action.titulo}</p>}
                        {action.padraoAlvo && (
                          <p className="text-[10px] text-muted-foreground">Padrão alvo: <span className="font-medium text-foreground/70">{action.padraoAlvo}</span></p>
                        )}
                        {action.objetivo && (
                          <p className="text-xs text-muted-foreground leading-relaxed">Objetivo: {action.objetivo}</p>
                        )}

                        <div className="flex items-start gap-3 mt-2">
                          <Checkbox
                            checked={action.completed}
                            onCheckedChange={(checked) => toggleAction(action.id, !!checked)}
                            disabled={isPastCycle}
                            className="mt-0.5"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-[11px] text-muted-foreground/60 mb-1">
                              Quando <span className="text-foreground/70 font-medium">{trigger}</span> →
                            </p>
                            <p className={`text-sm leading-relaxed ${
                              action.completed ? 'line-through text-muted-foreground' : 'text-foreground font-medium'
                            }`}>{actionText}</p>
                          </div>
                          <button
                            onClick={() => setExpandedAction(isExpanded ? null : action.id)}
                            className="p-1 rounded-lg hover:bg-secondary/50 text-muted-foreground shrink-0"
                          >
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </button>
                        </div>

                        <div className="flex items-center gap-4 text-[10px] text-muted-foreground/60 mt-2">
                          {action.started_at && (
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              Iniciada: {new Date(action.started_at).toLocaleDateString('pt-BR')}
                            </span>
                          )}
                          {action.completed_at && (
                            <span className="flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" />
                              Concluída: {new Date(action.completed_at).toLocaleDateString('pt-BR')}
                            </span>
                          )}
                        </div>

                        {status === 'not_started' && isLatestCycle && (
                          <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); startTask(action.id); }} className="text-xs mt-2">
                            <Play className="w-3 h-3 mr-1" /> Iniciar tarefa
                          </Button>
                        )}
                      </div>

                      {/* Expanded notes */}
                      {isExpanded && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          className="border-t border-border/30 bg-secondary/10 p-4 space-y-2"
                        >
                          <label className="text-xs text-muted-foreground font-medium">📝 Observações</label>
                          <Textarea
                            placeholder="O que aconteceu quando tentou aplicar? O que sentiu? Funcionou?"
                            value={action.notes}
                            onChange={(e) => updateActionInCycle(action.id, { notes: e.target.value })}
                            className="min-h-[80px] text-sm resize-none"
                            disabled={isPastCycle}
                          />
                          {!isPastCycle && (
                            <Button
                              size="sm" variant="outline"
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
                })}
              </CardContent>
            </Card>
          </motion.div>
        ) : (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Card className="border-destructive/30">
              <CardContent className="py-8 text-center space-y-3">
                <AlertTriangle className="w-10 h-10 text-destructive/60 mx-auto" />
                <p className="text-sm font-semibold text-foreground">Nenhuma ação gerada para este ciclo</p>
                <p className="text-xs text-muted-foreground">Refaça o teste para gerar suas ações.</p>
                <Button size="sm" variant="outline" onClick={() => navigate(`/diagnostic/${testModuleId}`)} className="text-xs">
                  <RefreshCw className="w-3.5 h-3.5 mr-1" /> Refazer teste
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Retest countdown */}
        {isLatestCycle && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
            <Card className={retestAvailable ? 'border-accent/40' : ''}>
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <RefreshCw className={`w-4 h-4 ${retestAvailable ? 'text-accent' : 'text-muted-foreground'}`} />
                    <span className="text-sm font-medium text-foreground">Ciclo de Reteste</span>
                  </div>
                  {retestAvailable ? (
                    <Badge className="bg-accent/15 text-accent border-accent/30 text-[10px]">Reteste liberado!</Badge>
                  ) : (
                    <span className="text-xs text-muted-foreground">{daysUntilRetest} dias restantes</span>
                  )}
                </div>
                <Progress value={retestProgressPct} className="h-1.5 mb-2" />
                {retestAvailable ? (
                  <AnimatePresence mode="wait">
                    {!showRetestConfirm ? (
                      <motion.div key="btn" initial={{ opacity: 1 }} exit={{ opacity: 0 }}>
                        <p className="text-xs text-muted-foreground mb-2">Hora de medir se você realmente mudou.</p>
                        <Button size="sm" className="w-full" onClick={() => setShowRetestConfirm(true)}>
                          <RefreshCw className="w-3.5 h-3.5 mr-2" /> Preparar Ciclo {activeCycle.cycleNumber + 1}
                        </Button>
                      </motion.div>
                    ) : (
                      <motion.div key="confirm" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-3 bg-secondary/30 rounded-xl p-4">
                        <p className="text-sm font-semibold text-foreground">Resumo do Ciclo {activeCycle.cycleNumber}</p>
                        <div className="grid grid-cols-3 gap-2 text-center">
                          <div>
                            <p className="text-base font-bold text-foreground">{completedCount}/{totalActions}</p>
                            <p className="text-[10px] text-muted-foreground">ações feitas</p>
                          </div>
                          <div>
                            <p className="text-base font-bold text-foreground">{progressPct}%</p>
                            <p className="text-[10px] text-muted-foreground">execução</p>
                          </div>
                          <div>
                            <p className="text-base font-bold text-foreground">{notesCount}</p>
                            <p className="text-[10px] text-muted-foreground">anotações</p>
                          </div>
                        </div>
                        <p className="text-sm text-foreground/80 font-medium">Agora vamos medir se você realmente mudou ou só entendeu o problema.</p>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" className="flex-1 text-xs" onClick={() => setShowRetestConfirm(false)}>Voltar</Button>
                          <Button size="sm" className="flex-1 text-xs" onClick={() => navigate(`/diagnostic/${testModuleId}`)}>
                            Iniciar Ciclo {activeCycle.cycleNumber + 1}
                          </Button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                ) : (
                  <p className="text-sm text-foreground font-medium">
                    Você ainda tem <span className="text-primary font-bold">{daysUntilRetest} dia{daysUntilRetest !== 1 ? 's' : ''}</span> para provar que consegue sair desse padrão.
                  </p>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* AI Feedback */}
        {hasActions && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-accent" />
                    <CardTitle className="text-base">Leitura da IA — Ciclo {activeCycle.cycleNumber}</CardTitle>
                  </div>
                  {isLatestCycle && canRequestFeedback && (
                    <Button size="sm" variant="outline" onClick={requestAIFeedback} disabled={loadingAI} className="text-xs">
                      {loadingAI ? (
                        <><div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin mr-1" />Analisando...</>
                      ) : (
                        <><Sparkles className="w-3 h-3 mr-1" /> Gerar feedback</>
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
                      ? canRequestFeedback
                        ? 'Clique em "Gerar feedback" para receber uma análise personalizada.'
                        : 'Marque uma ação ou escreva uma anotação para liberar o feedback.'
                      : 'Nenhum feedback gerado para este ciclo.'}
                  </p>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>
    </AppLayout>
  );
}
