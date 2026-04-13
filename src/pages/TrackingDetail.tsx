import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useParams, useNavigate } from 'react-router-dom';
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
import { Brain, ArrowLeft, Clock, CheckCircle2, RefreshCw, Sparkles, ChevronDown, ChevronUp, Save, Lock, Crown } from 'lucide-react';
import { toast } from 'sonner';

interface ActionItem {
  id: string;
  day_number: number;
  action_text: string;
  completed: boolean;
  completed_at: string | null;
  notes: string;
}

interface TestSummary {
  testName: string;
  testIcon: string;
  lastTestDate: string;
  dominantPattern: string;
  profileName: string;
  stateSummary: string;
  diagnosticResultId: string;
  sessionId: string;
  allScores: { key: string; label: string; percentage: number }[];
  topScore: { label: string; percentage: number } | null;
}

const RETEST_DAYS = 15;

export default function TrackingDetail() {
  const { testModuleId } = useParams<{ testModuleId: string }>();
  const { user } = useAuth();
  const { isPremium, isSuperAdmin } = useSubscription();
  const navigate = useNavigate();
  const hasAccess = isPremium || isSuperAdmin;

  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<TestSummary | null>(null);
  const [actions, setActions] = useState<ActionItem[]>([]);
  const [expandedAction, setExpandedAction] = useState<string | null>(null);
  const [savingNotes, setSavingNotes] = useState<Set<string>>(new Set());
  const [aiFeedback, setAiFeedback] = useState<string | null>(null);
  const [loadingAI, setLoadingAI] = useState(false);
  const [daysSinceTest, setDaysSinceTest] = useState(0);
  const [daysUntilRetest, setDaysUntilRetest] = useState(RETEST_DAYS);
  const [retestAvailable, setRetestAvailable] = useState(false);

  useEffect(() => {
    if (!user || !hasAccess || !testModuleId) { setLoading(false); return; }

    const load = async () => {
      try {
        // Get latest session for this module
        const { data: sessions } = await supabase
          .from('diagnostic_sessions')
          .select('id, completed_at')
          .eq('user_id', user.id)
          .eq('test_module_id', testModuleId)
          .not('completed_at', 'is', null)
          .order('completed_at', { ascending: false })
          .limit(1);

        if (!sessions?.length) { setLoading(false); return; }
        const session = sessions[0];

        // Get module info
        const { data: mod } = await supabase
          .from('test_modules')
          .select('name, icon')
          .eq('id', testModuleId)
          .single();

        // Get result
        const { data: result } = await supabase
          .from('diagnostic_results')
          .select('id, dominant_pattern, profile_name, state_summary, all_scores')
          .eq('session_id', session.id)
          .single();

        if (!result) { setLoading(false); return; }

        const scores = (result.all_scores as any[] || []) as { key: string; label: string; percentage: number }[];
        const topScore = scores.length > 0
          ? scores.reduce((max, s) => s.percentage > max.percentage ? s : max, scores[0])
          : null;

        const lastDate = new Date(session.completed_at!);
        const daysSince = Math.floor((Date.now() - lastDate.getTime()) / 86400000);

        setSummary({
          testName: mod?.name || 'Teste',
          testIcon: mod?.icon || 'brain',
          lastTestDate: session.completed_at!,
          dominantPattern: result.dominant_pattern,
          profileName: result.profile_name,
          stateSummary: result.state_summary,
          diagnosticResultId: result.id,
          sessionId: session.id,
          allScores: scores,
          topScore,
        });

        setDaysSinceTest(daysSince);
        setDaysUntilRetest(Math.max(0, RETEST_DAYS - daysSince));
        setRetestAvailable(daysSince >= RETEST_DAYS);

        // Get actions
        const { data: actionData } = await supabase
          .from('action_plan_tracking')
          .select('id, day_number, action_text, completed, completed_at, notes')
          .eq('diagnostic_result_id', result.id)
          .eq('user_id', user.id)
          .order('day_number');

        setActions((actionData as ActionItem[]) || []);

        // Get latest AI feedback
        const { data: feedback } = await supabase
          .from('progress_ai_feedback')
          .select('feedback_text')
          .eq('user_id', user.id)
          .eq('diagnostic_result_id', result.id)
          .order('created_at', { ascending: false })
          .limit(1);

        if (feedback?.length) {
          setAiFeedback(feedback[0].feedback_text);
        }
      } catch (e) {
        console.error('Error loading tracking detail:', e);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [user, hasAccess, testModuleId]);

  const toggleAction = useCallback(async (actionId: string, completed: boolean) => {
    const now = completed ? new Date().toISOString() : null;
    setActions(prev => prev.map(a => a.id === actionId ? { ...a, completed, completed_at: now } : a));

    const { error } = await supabase
      .from('action_plan_tracking')
      .update({ completed, completed_at: now })
      .eq('id', actionId);

    if (error) {
      setActions(prev => prev.map(a => a.id === actionId ? { ...a, completed: !completed } : a));
      toast.error('Erro ao atualizar ação');
    }
  }, []);

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
    if (!summary || !user) return;
    setLoadingAI(true);

    try {
      const { data, error } = await supabase.functions.invoke('analyze-progress', {
        body: {
          userId: user.id,
          diagnosticResultId: summary.diagnosticResultId,
          testModuleId,
        },
      });

      if (error) throw error;
      if (data?.feedback) {
        setAiFeedback(data.feedback);
        toast.success('Feedback gerado');
      }
    } catch (e) {
      console.error('AI feedback error:', e);
      toast.error('Erro ao gerar feedback');
    } finally {
      setLoadingAI(false);
    }
  }, [summary, user, testModuleId]);

  if (!hasAccess) {
    return (
      <AppLayout>
        <div className="min-h-[80vh] flex items-center justify-center p-6">
          <Card className="max-w-md text-center">
            <CardContent className="pt-8 pb-8 space-y-4">
              <Lock className="w-10 h-10 text-accent mx-auto" />
              <h2 className="text-xl font-bold">Área Premium</h2>
              <Button onClick={() => navigate('/checkout')} className="bg-accent text-accent-foreground">
                <Crown className="w-4 h-4 mr-2" /> Desbloquear por R$9,99/mês
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

  if (!summary) {
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

  const completedCount = actions.filter(a => a.completed).length;
  const progressPct = actions.length > 0 ? Math.round((completedCount / actions.length) * 100) : 0;
  const retestProgressPct = Math.min(100, Math.round((daysSinceTest / RETEST_DAYS) * 100));

  return (
    <AppLayout>
      <div className="p-4 md:p-8 max-w-3xl mx-auto space-y-5">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate('/acompanhamento')}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <h1 className="text-lg font-bold text-foreground">{summary.testName}</h1>
        </div>

        {/* BLOCO A — Resumo */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <Card>
            <CardContent className="p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Diagnóstico Principal</p>
                  <p className="font-semibold text-foreground">{summary.profileName}</p>
                </div>
                {summary.topScore && (
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Eixo mais alto</p>
                    <p className="text-sm font-semibold text-primary">{summary.topScore.label}: {summary.topScore.percentage}%</p>
                  </div>
                )}
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">{summary.stateSummary}</p>
              <div className="flex items-center gap-4 text-xs text-muted-foreground pt-1">
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  {new Date(summary.lastTestDate).toLocaleDateString('pt-BR')}
                </span>
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {completedCount}/{actions.length} ações concluídas
                </span>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* BLOCO D — Contagem Regressiva */}
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
                    Seu ciclo atual se completou. Refaça o teste para medir sua evolução real.
                  </p>
                  <Button
                    size="sm"
                    className="w-full"
                    onClick={() => navigate(`/diagnostic/${testModuleId}`)}
                  >
                    <RefreshCw className="w-3.5 h-3.5 mr-2" /> Refazer Teste
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

        {/* BLOCO B — Ações */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Ações Propostas</CardTitle>
                <span className="text-xs text-muted-foreground">{progressPct}% concluído</span>
              </div>
              <Progress value={progressPct} className="h-1.5" />
            </CardHeader>
            <CardContent className="space-y-2 pt-0">
              {actions.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">Nenhuma ação gerada para este teste.</p>
              ) : (
                actions.map((action) => {
                  const isExpanded = expandedAction === action.id;
                  return (
                    <div key={action.id} className="border border-border/50 rounded-xl p-3 space-y-2">
                      <div className="flex items-start gap-3">
                        <Checkbox
                          checked={action.completed}
                          onCheckedChange={(checked) => toggleAction(action.id, !!checked)}
                          className="mt-0.5"
                        />
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm leading-relaxed ${action.completed ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                            {action.action_text}
                          </p>
                          {action.completed && action.completed_at && (
                            <p className="text-[10px] text-muted-foreground mt-1">
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

                      {/* BLOCO C — Anotação individual */}
                      {isExpanded && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          className="pl-8 space-y-2"
                        >
                          <label className="text-xs text-muted-foreground font-medium">Anotação</label>
                          <Textarea
                            placeholder="O que aconteceu quando tentou aplicar? O que sentiu? Funcionou?"
                            value={action.notes}
                            onChange={(e) => {
                              const val = e.target.value;
                              setActions(prev => prev.map(a => a.id === action.id ? { ...a, notes: val } : a));
                            }}
                            className="min-h-[60px] text-sm resize-none"
                          />
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
                  <CardTitle className="text-base">Leitura da IA</CardTitle>
                </div>
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
              </div>
            </CardHeader>
            <CardContent>
              {aiFeedback ? (
                <div className="text-sm text-foreground leading-relaxed whitespace-pre-line bg-secondary/30 rounded-xl p-4">
                  {aiFeedback}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Marque ações e escreva anotações para receber um feedback personalizado da IA sobre seu progresso.
                </p>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </AppLayout>
  );
}
