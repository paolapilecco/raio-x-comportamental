import { useEffect, useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/hooks/useSubscription';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/AppLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Brain, Clock, CheckCircle2, Lock, Crown, ChevronRight, Activity,
  AlertTriangle, Flame, TrendingUp, Pause, BarChart3, Calendar
} from 'lucide-react';

interface ActionRaw {
  id: string;
  completed: boolean;
  completed_at: string | null;
  started_at: string | null;
  created_at: string;
  diagnostic_result_id: string;
  action_text: string;
}

interface TestTrackingItem {
  testModuleId: string;
  testName: string;
  testIcon: string;
  lastTestDate: string;
  dominantPattern: string;
  profileName: string;
  totalCycles: number;
  actionsTotal: number;
  actionsCompleted: number;
  actionsStarted: number;
  actionsAbandoned: number;
  daysSinceTest: number;
  retestAvailable: boolean;
  daysUntilRetest: number;
  cycleStatus: 'active' | 'completed' | 'abandoned' | 'waiting_retest';
}

interface PeriodStats {
  started: number;
  completed: number;
  abandoned: number;
  retestReady: number;
}

const RETEST_DAYS = 15;
const ABANDON_DAYS = 3;

function getAbandonmentMessage(item: TestTrackingItem): string | null {
  if (item.actionsStarted > 0 && item.actionsCompleted === 0 && item.daysSinceTest >= ABANDON_DAYS) {
    return 'Você parou exatamente na fase em que costuma parar.';
  }
  if (item.actionsCompleted > 0 && item.actionsCompleted < item.actionsTotal && item.daysSinceTest >= ABANDON_DAYS * 2) {
    return 'Você começou a mudança, mas parou antes de consolidar.';
  }
  return null;
}

function getProgressMessage(item: TestTrackingItem): { text: string; type: 'warn' | 'progress' | 'success' | 'abandon' } | null {
  if (item.actionsTotal === 0) return null;
  const pct = item.actionsCompleted / item.actionsTotal;

  const abandon = getAbandonmentMessage(item);
  if (abandon) return { text: abandon, type: 'abandon' };

  if (pct === 1) return { text: 'Esse ciclo foi executado até o fim.', type: 'success' };
  if (pct >= 0.5) return { text: 'Você concluiu o que normalmente abandonaria.', type: 'progress' };
  if (item.actionsStarted > 0) return { text: 'Você iniciou, agora precisa sustentar.', type: 'warn' };
  return null;
}

function computePeriodStats(allActions: ActionRaw[], daysBack: number): PeriodStats {
  const cutoff = new Date(Date.now() - daysBack * 86400000).toISOString();
  const inPeriod = allActions.filter(a => a.created_at >= cutoff);

  const started = inPeriod.filter(a => a.started_at).length;
  const completed = inPeriod.filter(a => a.completed).length;
  const abandoned = inPeriod.filter(a => {
    if (a.completed) return false;
    if (!a.started_at) return false;
    const startedDate = new Date(a.started_at);
    return (Date.now() - startedDate.getTime()) > ABANDON_DAYS * 86400000;
  }).length;

  return { started, completed, abandoned, retestReady: 0 };
}

export default function Tracking() {
  const { user } = useAuth();
  const { isPremium, isSuperAdmin } = useSubscription();
  const navigate = useNavigate();
  const [items, setItems] = useState<TestTrackingItem[]>([]);
  const [allActions, setAllActions] = useState<ActionRaw[]>([]);
  const [loading, setLoading] = useState(true);
  const [periodTab, setPeriodTab] = useState('7');

  const hasFullAccess = isPremium || isSuperAdmin;

  useEffect(() => {
    if (!user) { setLoading(false); return; }

    const load = async () => {
      try {
        const { data: sessions } = await supabase
          .from('diagnostic_sessions')
          .select('id, completed_at, test_module_id')
          .eq('user_id', user.id)
          .not('completed_at', 'is', null)
          .order('completed_at', { ascending: false });

        if (!sessions?.length) { setLoading(false); return; }

        const moduleIds = [...new Set(sessions.map(s => s.test_module_id).filter(Boolean))];
        const { data: modules } = await supabase
          .from('test_modules')
          .select('id, name, icon')
          .in('id', moduleIds as string[]);

        const moduleMap = new Map((modules || []).map(m => [m.id, m]));

        const latestByModule = new Map<string, typeof sessions[0]>();
        const cycleCountByModule = new Map<string, number>();
        for (const s of sessions) {
          if (!s.test_module_id) continue;
          cycleCountByModule.set(s.test_module_id, (cycleCountByModule.get(s.test_module_id) || 0) + 1);
          if (!latestByModule.has(s.test_module_id)) {
            latestByModule.set(s.test_module_id, s);
          }
        }

        const sessionIds = [...latestByModule.values()].map(s => s.id);
        const { data: results } = await supabase
          .from('diagnostic_results')
          .select('id, session_id, dominant_pattern, profile_name')
          .in('session_id', sessionIds);

        const resultMap = new Map((results || []).map(r => [r.session_id, r]));

        const { data: actions } = await supabase
          .from('action_plan_tracking')
          .select('id, diagnostic_result_id, completed, completed_at, started_at, created_at, action_text')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        setAllActions((actions || []) as ActionRaw[]);

        const actionsByResult = new Map<string, { total: number; completed: number; started: number; abandoned: number }>();
        for (const a of (actions || [])) {
          const existing = actionsByResult.get(a.diagnostic_result_id) || { total: 0, completed: 0, started: 0, abandoned: 0 };
          existing.total++;
          if (a.completed) existing.completed++;
          if (a.started_at) existing.started++;
          if (a.started_at && !a.completed) {
            const startDate = new Date(a.started_at);
            if ((Date.now() - startDate.getTime()) > ABANDON_DAYS * 86400000) existing.abandoned++;
          }
          actionsByResult.set(a.diagnostic_result_id, existing);
        }

        const trackingItems: TestTrackingItem[] = [];
        for (const [moduleId, session] of latestByModule) {
          const mod = moduleMap.get(moduleId);
          const result = resultMap.get(session.id);
          if (!mod || !result) continue;

          const lastDate = new Date(session.completed_at!);
          const daysSince = Math.floor((Date.now() - lastDate.getTime()) / 86400000);
          const stats = actionsByResult.get(result.id) || { total: 0, completed: 0, started: 0, abandoned: 0 };

          let cycleStatus: TestTrackingItem['cycleStatus'] = 'active';
          if (stats.total > 0 && stats.completed === stats.total) cycleStatus = daysSince >= RETEST_DAYS ? 'waiting_retest' : 'completed';
          else if (stats.abandoned > 0) cycleStatus = 'abandoned';

          trackingItems.push({
            testModuleId: moduleId,
            testName: mod.name,
            testIcon: mod.icon,
            lastTestDate: session.completed_at!,
            dominantPattern: result.dominant_pattern,
            profileName: result.profile_name,
            totalCycles: cycleCountByModule.get(moduleId) || 1,
            actionsTotal: stats.total,
            actionsCompleted: stats.completed,
            actionsStarted: stats.started,
            actionsAbandoned: stats.abandoned,
            daysSinceTest: daysSince,
            retestAvailable: daysSince >= RETEST_DAYS,
            daysUntilRetest: Math.max(0, RETEST_DAYS - daysSince),
            cycleStatus,
          });
        }

        setItems(trackingItems);
      } catch (e) {
        console.error('Error loading tracking:', e);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [user]);

  const periodStats = useMemo(() => computePeriodStats(allActions, parseInt(periodTab)), [allActions, periodTab]);
  const retestReadyCount = items.filter(i => i.retestAvailable).length;
  const freeItems = !hasFullAccess ? items.filter(i => i.actionsCompleted > 0) : items;

  if (loading) {
    return (
      <AppLayout>
        <div className="min-h-[80vh] flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center gap-3 mb-1">
            <Activity className="w-6 h-6 text-primary" />
            <h1 className="text-2xl font-bold text-foreground">Acompanhamento</h1>
          </div>
          <p className="text-muted-foreground text-sm">
            {hasFullAccess
              ? 'O que você já executou, onde travou, e o que precisa fazer agora.'
              : 'Visualize as tarefas iniciadas. Para acompanhamento completo, desbloqueie o acesso.'}
          </p>
        </motion.div>

        {/* Free user upgrade CTA */}
        {!hasFullAccess && (
          <Card className="border-amber-500/20">
            <CardContent className="pt-6 pb-6 space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0">
                  <Lock className="w-5 h-5 text-amber-500" />
                </div>
                <div>
                  <p className="text-foreground font-bold text-sm">Consciência sem execução completa não gera mudança.</p>
                  <p className="text-muted-foreground text-xs mt-1">
                    Acompanhe cada fase, veja o padrão enfraquecendo e aja diferente na próxima situação.
                  </p>
                </div>
              </div>
              <Button onClick={() => navigate('/checkout')} className="bg-destructive text-destructive-foreground hover:brightness-90 w-full font-bold">
                <Crown className="w-4 h-4 mr-2" />
                Eu vou fazer diferente dessa vez
              </Button>
              <p className="text-[10px] text-muted-foreground/40 text-center">R$9,99/mês</p>
            </CardContent>
          </Card>
        )}

        {/* Period Stats — Premium only */}
        {hasFullAccess && items.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
            <Card>
              <CardContent className="p-5 space-y-4">
                <div className="flex items-center gap-2 mb-1">
                  <BarChart3 className="w-4 h-4 text-primary" />
                  <h3 className="text-sm font-semibold text-foreground">Evolução por Período</h3>
                </div>

                <Tabs value={periodTab} onValueChange={setPeriodTab}>
                  <TabsList className="grid grid-cols-3 w-full">
                    <TabsTrigger value="7" className="text-xs">7 dias</TabsTrigger>
                    <TabsTrigger value="15" className="text-xs">15 dias</TabsTrigger>
                    <TabsTrigger value="30" className="text-xs">30 dias</TabsTrigger>
                  </TabsList>

                  {['7', '15', '30'].map(period => (
                    <TabsContent key={period} value={period} className="mt-3">
                      <div className="grid grid-cols-4 gap-3">
                        <div className="text-center p-3 rounded-xl bg-secondary/30">
                          <p className="text-lg font-bold text-foreground tabular-nums">{periodStats.started}</p>
                          <p className="text-[10px] text-muted-foreground">iniciadas</p>
                        </div>
                        <div className="text-center p-3 rounded-xl bg-green-500/5">
                          <p className="text-lg font-bold text-green-600 tabular-nums">{periodStats.completed}</p>
                          <p className="text-[10px] text-muted-foreground">concluídas</p>
                        </div>
                        <div className="text-center p-3 rounded-xl bg-destructive/5">
                          <p className="text-lg font-bold text-destructive tabular-nums">{periodStats.abandoned}</p>
                          <p className="text-[10px] text-muted-foreground">abandonadas</p>
                        </div>
                        <div className="text-center p-3 rounded-xl bg-accent/5">
                          <p className="text-lg font-bold text-accent tabular-nums">{retestReadyCount}</p>
                          <p className="text-[10px] text-muted-foreground">reteste</p>
                        </div>
                      </div>

                      {/* Contextual feedback */}
                      {periodStats.completed > 0 && periodStats.abandoned === 0 && (
                        <div className="flex items-center gap-2 mt-3 bg-green-500/5 border border-green-500/10 rounded-lg p-3">
                          <TrendingUp className="w-4 h-4 text-green-600 shrink-0" />
                          <p className="text-xs text-green-700">Execução consistente. Você está quebrando o padrão.</p>
                        </div>
                      )}
                      {periodStats.abandoned > 0 && (
                        <div className="flex items-center gap-2 mt-3 bg-destructive/5 border border-destructive/10 rounded-lg p-3">
                          <AlertTriangle className="w-4 h-4 text-destructive shrink-0" />
                          <p className="text-xs text-destructive/80">
                            {periodStats.abandoned} tarefa{periodStats.abandoned > 1 ? 's' : ''} abandonada{periodStats.abandoned > 1 ? 's' : ''}. O padrão está se repetindo.
                          </p>
                        </div>
                      )}
                      {periodStats.started === 0 && periodStats.completed === 0 && (
                        <div className="flex items-center gap-2 mt-3 bg-muted/50 border border-border/50 rounded-lg p-3">
                          <Pause className="w-4 h-4 text-muted-foreground shrink-0" />
                          <p className="text-xs text-muted-foreground">Nenhuma atividade neste período. O padrão continua ativo.</p>
                        </div>
                      )}
                    </TabsContent>
                  ))}
                </Tabs>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Test list */}
        {freeItems.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Brain className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-muted-foreground">
                {!hasFullAccess && items.length > 0
                  ? 'Você tem tarefas pendentes, mas ainda não iniciou nenhuma.'
                  : 'Nenhum teste realizado ainda.'}
              </p>
              <Button variant="outline" className="mt-4" onClick={() => navigate(items.length > 0 ? '/dashboard' : '/tests')}>
                {items.length > 0 ? 'Ir para o Dashboard' : 'Ir para o catálogo de testes'}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {freeItems.map((item, i) => {
              const progressPct = item.actionsTotal > 0 ? Math.round((item.actionsCompleted / item.actionsTotal) * 100) : 0;
              const feedback = getProgressMessage(item);

              return (
                <motion.div
                  key={item.testModuleId}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <Card
                    className={`cursor-pointer hover:border-primary/30 transition-all group ${
                      item.cycleStatus === 'abandoned' ? 'border-destructive/20' :
                      item.cycleStatus === 'completed' ? 'border-green-500/20' :
                      item.cycleStatus === 'waiting_retest' ? 'border-accent/20' : ''
                    }`}
                    onClick={() => hasFullAccess ? navigate(`/acompanhamento/${item.testModuleId}`) : navigate('/checkout')}
                  >
                    <CardContent className="p-5">
                      {/* Status badge row */}
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                            item.cycleStatus === 'abandoned' ? 'bg-destructive/10' :
                            item.cycleStatus === 'completed' ? 'bg-green-500/10' : 'bg-primary/10'
                          }`}>
                            <Brain className={`w-5 h-5 ${
                              item.cycleStatus === 'abandoned' ? 'text-destructive' :
                              item.cycleStatus === 'completed' ? 'text-green-600' : 'text-primary'
                            }`} />
                          </div>
                          <div>
                            <h3 className="font-semibold text-foreground text-sm">{item.testName}</h3>
                            <p className="text-xs text-muted-foreground">{item.profileName}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {!hasFullAccess && (
                            <Badge variant="secondary" className="text-[10px] border-amber-500/20 text-amber-600">
                              <Lock className="w-2.5 h-2.5 mr-1" /> Limitado
                            </Badge>
                          )}
                          {item.cycleStatus === 'abandoned' && (
                            <Badge variant="destructive" className="text-[10px]">
                              <AlertTriangle className="w-2.5 h-2.5 mr-1" /> Parado
                            </Badge>
                          )}
                          {item.cycleStatus === 'waiting_retest' && (
                            <Badge className="bg-accent/15 text-accent border-accent/30 text-[10px]">
                              Reteste
                            </Badge>
                          )}
                          {item.totalCycles > 1 && hasFullAccess && (
                            <Badge variant="secondary" className="text-[10px]">{item.totalCycles} ciclos</Badge>
                          )}
                          <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                        </div>
                      </div>

                      {/* Stats row */}
                      <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          {new Date(item.lastTestDate).toLocaleDateString('pt-BR')}
                        </span>
                        <span className="flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          {item.actionsCompleted}/{item.actionsTotal} ações
                        </span>
                        {hasFullAccess && item.daysSinceTest > 0 && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            {item.daysSinceTest}d atrás
                          </span>
                        )}
                      </div>

                      <Progress
                        value={progressPct}
                        className={`h-1.5 ${
                          item.cycleStatus === 'abandoned' ? '[&>div]:bg-destructive' :
                          item.cycleStatus === 'completed' ? '[&>div]:bg-green-500' : ''
                        }`}
                      />

                      {/* Contextual feedback */}
                      {feedback && hasFullAccess && (
                        <div className={`flex items-center gap-2 mt-3 rounded-lg p-2.5 ${
                          feedback.type === 'abandon' ? 'bg-destructive/5' :
                          feedback.type === 'success' ? 'bg-green-500/5' :
                          feedback.type === 'progress' ? 'bg-primary/5' : 'bg-muted/50'
                        }`}>
                          {feedback.type === 'abandon' ? <Flame className="w-3.5 h-3.5 text-destructive shrink-0" /> :
                           feedback.type === 'success' ? <CheckCircle2 className="w-3.5 h-3.5 text-green-600 shrink-0" /> :
                           feedback.type === 'progress' ? <TrendingUp className="w-3.5 h-3.5 text-primary shrink-0" /> :
                           <AlertTriangle className="w-3.5 h-3.5 text-muted-foreground shrink-0" />}
                          <p className={`text-[11px] font-medium ${
                            feedback.type === 'abandon' ? 'text-destructive/80' :
                            feedback.type === 'success' ? 'text-green-700' :
                            feedback.type === 'progress' ? 'text-primary' : 'text-muted-foreground'
                          }`}>
                            {feedback.text}
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
