import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/hooks/useSubscription';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Brain, ArrowRight, Clock, CheckCircle2, Lock, Crown, ChevronRight, Activity } from 'lucide-react';

interface TestTrackingItem {
  testModuleId: string;
  testName: string;
  testIcon: string;
  lastTestDate: string;
  dominantPattern: string;
  profileName: string;
  diagnosticResultId: string;
  sessionId: string;
  actionsTotal: number;
  actionsCompleted: number;
  daysSinceTest: number;
  retestAvailable: boolean;
  daysUntilRetest: number;
}

const RETEST_DAYS = 15;

export default function Tracking() {
  const { user } = useAuth();
  const { isPremium, isSuperAdmin } = useSubscription();
  const navigate = useNavigate();
  const [items, setItems] = useState<TestTrackingItem[]>([]);
  const [loading, setLoading] = useState(true);

  const hasAccess = isPremium || isSuperAdmin;

  useEffect(() => {
    if (!user || !hasAccess) { setLoading(false); return; }

    const load = async () => {
      try {
        // Get all completed sessions with their test modules
        const { data: sessions } = await supabase
          .from('diagnostic_sessions')
          .select('id, completed_at, test_module_id')
          .eq('user_id', user.id)
          .not('completed_at', 'is', null)
          .order('completed_at', { ascending: false });

        if (!sessions?.length) { setLoading(false); return; }

        // Get test modules
        const moduleIds = [...new Set(sessions.map(s => s.test_module_id).filter(Boolean))];
        const { data: modules } = await supabase
          .from('test_modules')
          .select('id, name, icon')
          .in('id', moduleIds as string[]);

        const moduleMap = new Map((modules || []).map(m => [m.id, m]));

        // Group sessions by test_module_id, take latest per module
        const latestByModule = new Map<string, typeof sessions[0]>();
        for (const s of sessions) {
          if (s.test_module_id && !latestByModule.has(s.test_module_id)) {
            latestByModule.set(s.test_module_id, s);
          }
        }

        // Get results for latest sessions
        const sessionIds = [...latestByModule.values()].map(s => s.id);
        const { data: results } = await supabase
          .from('diagnostic_results')
          .select('id, session_id, dominant_pattern, profile_name')
          .in('session_id', sessionIds);

        const resultMap = new Map((results || []).map(r => [r.session_id, r]));

        // Get action plan counts
        const resultIds = (results || []).map(r => r.id);
        const { data: actions } = await supabase
          .from('action_plan_tracking')
          .select('diagnostic_result_id, completed')
          .in('diagnostic_result_id', resultIds.length ? resultIds : ['__none__']);

        // Group actions by result
        const actionsByResult = new Map<string, { total: number; completed: number }>();
        for (const a of (actions || [])) {
          const existing = actionsByResult.get(a.diagnostic_result_id) || { total: 0, completed: 0 };
          existing.total++;
          if (a.completed) existing.completed++;
          actionsByResult.set(a.diagnostic_result_id, existing);
        }

        const trackingItems: TestTrackingItem[] = [];
        for (const [moduleId, session] of latestByModule) {
          const mod = moduleMap.get(moduleId);
          const result = resultMap.get(session.id);
          if (!mod || !result) continue;

          const lastDate = new Date(session.completed_at!);
          const daysSince = Math.floor((Date.now() - lastDate.getTime()) / 86400000);
          const actionStats = actionsByResult.get(result.id) || { total: 0, completed: 0 };

          trackingItems.push({
            testModuleId: moduleId,
            testName: mod.name,
            testIcon: mod.icon,
            lastTestDate: session.completed_at!,
            dominantPattern: result.dominant_pattern,
            profileName: result.profile_name,
            diagnosticResultId: result.id,
            sessionId: session.id,
            actionsTotal: actionStats.total,
            actionsCompleted: actionStats.completed,
            daysSinceTest: daysSince,
            retestAvailable: daysSince >= RETEST_DAYS,
            daysUntilRetest: Math.max(0, RETEST_DAYS - daysSince),
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
  }, [user, hasAccess]);

  if (!hasAccess) {
    return (
      <AppLayout>
        <div className="min-h-[80vh] flex items-center justify-center p-6">
          <Card className="max-w-md text-center">
            <CardContent className="pt-8 pb-8 space-y-4">
              <div className="w-16 h-16 rounded-full bg-accent/20 flex items-center justify-center mx-auto">
                <Lock className="w-8 h-8 text-accent" />
              </div>
              <h2 className="text-xl font-bold text-foreground">Área Premium</h2>
              <p className="text-muted-foreground text-sm leading-relaxed">
                O acompanhamento por teste é exclusivo para assinantes premium.
                Monitore seu progresso, anote reflexões e receba feedback da IA.
              </p>
              <Button onClick={() => navigate('/checkout')} className="bg-accent text-accent-foreground hover:bg-accent/90">
                <Crown className="w-4 h-4 mr-2" />
                Desbloquear por R$9,99/mês
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

  return (
    <AppLayout>
      <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-6">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center gap-3 mb-1">
            <Activity className="w-6 h-6 text-primary" />
            <h1 className="text-2xl font-bold text-foreground">Acompanhamento</h1>
          </div>
          <p className="text-muted-foreground text-sm">
            Acompanhe seu progresso em cada teste realizado. Execute ações, anote reflexões e evolua.
          </p>
        </motion.div>

        {items.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Brain className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-muted-foreground">Nenhum teste realizado ainda.</p>
              <Button variant="outline" className="mt-4" onClick={() => navigate('/tests')}>
                Ir para o catálogo de testes
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {items.map((item, i) => {
              const progressPct = item.actionsTotal > 0
                ? Math.round((item.actionsCompleted / item.actionsTotal) * 100)
                : 0;

              return (
                <motion.div
                  key={item.testModuleId}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <Card
                    className="cursor-pointer hover:border-primary/30 transition-all group"
                    onClick={() => navigate(`/acompanhamento/${item.testModuleId}`)}
                  >
                    <CardContent className="p-5">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                            <Brain className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-foreground text-sm">{item.testName}</h3>
                            <p className="text-xs text-muted-foreground">{item.profileName}</p>
                          </div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                      </div>

                      <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          {new Date(item.lastTestDate).toLocaleDateString('pt-BR')}
                        </span>
                        <span className="flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          {item.actionsCompleted}/{item.actionsTotal} ações
                        </span>
                        {item.retestAvailable ? (
                          <Badge variant="outline" className="text-[10px] border-accent text-accent">
                            Reteste liberado
                          </Badge>
                        ) : (
                          <span className="text-[10px]">{item.daysUntilRetest}d para reteste</span>
                        )}
                      </div>

                      <Progress value={progressPct} className="h-1.5" />
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
