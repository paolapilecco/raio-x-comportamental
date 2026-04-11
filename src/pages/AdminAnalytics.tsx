import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/AppLayout';
import { BarChart3, TrendingUp, Download, Brain, RefreshCw, Users, Flame, CheckCircle2, Crown, Mail } from 'lucide-react';
import { toast } from 'sonner';

interface FunnelMetrics {
  diagnostics: number;
  reportViews: number;
  pdfDownloads: number;
  actionPlansCreated: number;
  actionPlanDaysCompleted: number;
  retestAlerts: number;
  retestEmails: number;
  retestStarted: number;
  retestCompleted: number;
  paywallViews: number;
  checkoutStarted: number;
  checkoutCompleted: number;
}

interface ModuleMetric {
  moduleId: string;
  moduleName: string;
  diagnostics: number;
  retests: number;
  retestRate: number;
  pdfDownloads: number;
}

const fadeUp = { initial: { opacity: 0, y: 15 }, animate: { opacity: 1, y: 0 } };

export default function AdminAnalytics() {
  const { isSuperAdmin, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState<FunnelMetrics | null>(null);
  const [moduleMetrics, setModuleMetrics] = useState<ModuleMetric[]>([]);
  const [planCompletionRate, setPlanCompletionRate] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !isSuperAdmin) navigate('/dashboard', { replace: true });
  }, [authLoading, isSuperAdmin]);

  const loadMetrics = async () => {
    setLoading(true);
    try {
      const { data: events } = await supabase
        .from('analytics_events' as any)
        .select('event_name, module_id, user_id, metadata, created_at')
        .order('created_at', { ascending: false });

      const all = (events as any[]) || [];

      const count = (name: string) => all.filter(e => e.event_name === name).length;

      setMetrics({
        diagnostics: count('diagnostic_completed'),
        reportViews: count('report_viewed'),
        pdfDownloads: count('pdf_downloaded'),
        actionPlansCreated: count('action_plan_created'),
        actionPlanDaysCompleted: count('action_plan_day_completed'),
        retestAlerts: count('retest_alert_viewed'),
        retestEmails: count('retest_email_sent'),
        retestStarted: count('retest_started'),
        retestCompleted: count('retest_completed'),
        paywallViews: count('premium_paywall_viewed'),
        checkoutStarted: count('premium_checkout_started'),
        checkoutCompleted: count('premium_checkout_completed'),
      });

      // Module metrics
      const { data: modules } = await supabase.from('test_modules').select('id, name').eq('is_active', true);
      const modMap = new Map((modules || []).map((m: any) => [m.id, m.name]));

      const diagEvents = all.filter(e => e.event_name === 'diagnostic_completed' && e.module_id);
      const moduleGroups = new Map<string, { diagnostics: number; users: Set<string>; retests: number; pdfs: number }>();

      diagEvents.forEach(e => {
        if (!moduleGroups.has(e.module_id)) {
          moduleGroups.set(e.module_id, { diagnostics: 0, users: new Set(), retests: 0, pdfs: 0 });
        }
        const g = moduleGroups.get(e.module_id)!;
        g.diagnostics++;
        if (g.users.has(e.user_id)) g.retests++;
        g.users.add(e.user_id);
      });

      all.filter(e => e.event_name === 'pdf_downloaded' && e.module_id).forEach(e => {
        if (moduleGroups.has(e.module_id)) moduleGroups.get(e.module_id)!.pdfs++;
      });

      const modMetrics: ModuleMetric[] = [];
      moduleGroups.forEach((g, id) => {
        modMetrics.push({
          moduleId: id,
          moduleName: modMap.get(id) || id,
          diagnostics: g.diagnostics,
          retests: g.retests,
          retestRate: g.diagnostics > 0 ? Math.round((g.retests / g.diagnostics) * 100) : 0,
          pdfDownloads: g.pdfs,
        });
      });
      setModuleMetrics(modMetrics.sort((a, b) => b.diagnostics - a.diagnostics));

      // Plan completion rate
      const { data: plans } = await supabase.from('action_plan_tracking').select('completed');
      if (plans && plans.length > 0) {
        const completed = plans.filter((p: any) => p.completed).length;
        setPlanCompletionRate(Math.round((completed / plans.length) * 100));
      }
    } catch (err) {
      console.error('Error loading analytics:', err);
      toast.error('Erro ao carregar métricas.');
    }
    setLoading(false);
  };

  useEffect(() => { if (isSuperAdmin) loadMetrics(); }, [isSuperAdmin]);

  if (authLoading || loading) {
    return (
      <AppLayout>
        <div className="max-w-6xl mx-auto px-6 py-10 space-y-6">
          {[1, 2, 3].map(i => <div key={i} className="h-32 bg-card rounded-xl border animate-pulse" />)}
        </div>
      </AppLayout>
    );
  }

  if (!metrics) return null;

  const kpis = [
    { label: 'Diagnósticos', value: metrics.diagnostics, icon: Brain, color: 'text-primary' },
    { label: 'Relatórios vistos', value: metrics.reportViews, icon: BarChart3, color: 'text-primary' },
    { label: 'PDFs baixados', value: metrics.pdfDownloads, icon: Download, color: 'text-primary' },
    { label: 'Planos criados', value: metrics.actionPlansCreated, icon: CheckCircle2, color: 'text-emerald-600' },
    { label: 'Dias concluídos', value: metrics.actionPlanDaysCompleted, icon: Flame, color: 'text-orange-500' },
    { label: 'Alertas inatividade', value: metrics.retestAlerts, icon: TrendingUp, color: 'text-yellow-600' },
    { label: 'Emails reteste', value: metrics.retestEmails, icon: Mail, color: 'text-blue-500' },
    { label: 'Retestes iniciados', value: metrics.retestStarted, icon: RefreshCw, color: 'text-blue-600' },
    { label: 'Retestes concluídos', value: metrics.retestCompleted, icon: RefreshCw, color: 'text-emerald-600' },
    { label: 'Paywall views', value: metrics.paywallViews, icon: Crown, color: 'text-amber-500' },
    { label: 'Checkouts iniciados', value: metrics.checkoutStarted, icon: Users, color: 'text-primary' },
    { label: 'Checkouts concluídos', value: metrics.checkoutCompleted, icon: Crown, color: 'text-emerald-600' },
  ];

  const conversionRate = metrics.paywallViews > 0 ? Math.round((metrics.checkoutCompleted / metrics.paywallViews) * 100) : 0;
  const pdfRate = metrics.diagnostics > 0 ? Math.round((metrics.pdfDownloads / metrics.diagnostics) * 100) : 0;
  const retestRate = metrics.retestStarted > 0 ? Math.round((metrics.retestCompleted / metrics.retestStarted) * 100) : 0;
  const retestFromAlerts = metrics.retestAlerts > 0 ? Math.round((metrics.retestStarted / metrics.retestAlerts) * 100) : 0;

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 md:px-10 py-6 sm:py-10 space-y-8">
        <motion.div {...fadeUp} className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-serif">Telemetria do Ciclo de Retenção</h1>
            <p className="text-sm text-muted-foreground mt-1">Funil completo de uso, retenção e monetização</p>
          </div>
          <button onClick={loadMetrics} className="flex items-center gap-2 px-4 py-2 border border-border rounded-lg text-sm hover:bg-muted/30">
            <RefreshCw className="w-4 h-4" /> Atualizar
          </button>
        </motion.div>

        {/* KPI Grid */}
        <motion.div {...fadeUp} transition={{ delay: 0.05 }} className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {kpis.map((kpi, i) => (
            <div key={i} className="bg-card rounded-xl border p-4">
              <div className="flex items-center gap-2 mb-2">
                <kpi.icon className={`w-4 h-4 ${kpi.color}`} />
                <span className="text-xs text-muted-foreground">{kpi.label}</span>
              </div>
              <span className="text-xl font-bold text-foreground">{kpi.value}</span>
            </div>
          ))}
        </motion.div>

        {/* Rates */}
        <motion.div {...fadeUp} transition={{ delay: 0.1 }} className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          {[
            { label: 'Taxa de conversão Premium', value: `${conversionRate}%`, sub: `${metrics.checkoutCompleted}/${metrics.paywallViews}` },
            { label: 'Taxa de download PDF', value: `${pdfRate}%`, sub: `${metrics.pdfDownloads}/${metrics.diagnostics}` },
            { label: 'Taxa de reavaliação', value: `${retestRate}%`, sub: `${metrics.retestCompleted}/${metrics.retestAlerts}` },
            { label: 'Conclusão do plano 15d', value: `${planCompletionRate}%`, sub: 'dias concluídos / total' },
          ].map((r, i) => (
            <div key={i} className="bg-card rounded-xl border p-5">
              <span className="text-xs text-muted-foreground">{r.label}</span>
              <div className="text-2xl font-bold text-foreground mt-1">{r.value}</div>
              <span className="text-xs text-muted-foreground">{r.sub}</span>
            </div>
          ))}
        </motion.div>

        {/* Module Breakdown */}
        {moduleMetrics.length > 0 && (
          <motion.div {...fadeUp} transition={{ delay: 0.15 }}>
            <h2 className="text-lg font-semibold mb-4">Retenção por Módulo</h2>
            <div className="bg-card rounded-xl border overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Módulo</th>
                    <th className="text-center px-4 py-3 font-medium text-muted-foreground">Diagnósticos</th>
                    <th className="text-center px-4 py-3 font-medium text-muted-foreground">Reavaliações</th>
                    <th className="text-center px-4 py-3 font-medium text-muted-foreground">Taxa Reteste</th>
                    <th className="text-center px-4 py-3 font-medium text-muted-foreground">PDFs</th>
                  </tr>
                </thead>
                <tbody>
                  {moduleMetrics.map(m => (
                    <tr key={m.moduleId} className="border-b last:border-0">
                      <td className="px-4 py-3 font-medium">{m.moduleName}</td>
                      <td className="px-4 py-3 text-center">{m.diagnostics}</td>
                      <td className="px-4 py-3 text-center">{m.retests}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${m.retestRate >= 30 ? 'bg-emerald-500/10 text-emerald-600' : m.retestRate >= 10 ? 'bg-yellow-500/10 text-yellow-600' : 'bg-muted text-muted-foreground'}`}>
                          {m.retestRate}%
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">{m.pdfDownloads}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}
      </div>
    </AppLayout>
  );
}
