import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import {
  Users, Crown, TrendingUp, BarChart3, Activity, Download,
  Loader2, RefreshCw, CreditCard, Brain, LayoutGrid,
  Settings, FileText, UserCheck, DollarSign, Percent, Calendar,
} from 'lucide-react';
import { toast } from 'sonner';
import { AppLayout } from '@/components/AppLayout';

interface Metrics {
  totalUsers: number;
  premiumCount: number;
  freeCount: number;
  activeSubs: number;
  monthlyRevenue: number;
  totalSessions: number;
  totalModules: number;
  newUsersThisWeek: number;
  conversionRate: number;
  recentUsers: { email: string; created_at: string }[];
}

const fadeUp = { initial: { opacity: 0, y: 15 }, animate: { opacity: 1, y: 0 } };

export default function AdminDashboard() {
  const { isSuperAdmin, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!isSuperAdmin) { navigate('/dashboard', { replace: true }); return; }
    fetchMetrics();
  }, [authLoading, isSuperAdmin]);

  const fetchMetrics = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-users', {
        body: { action: 'metrics' },
      });
      if (error || !data) {
        toast.error('Erro ao carregar métricas');
      } else {
        setMetrics(data);
      }
    } catch {
      toast.error('Erro ao carregar métricas');
    }
    setLoading(false);
  };

  const handleExportCSV = async () => {
    setExporting(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-users', {
        body: { action: 'export_users' },
      });
      if (error || !data?.csv) {
        toast.error('Erro ao exportar dados');
        return;
      }
      const blob = new Blob([data.csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `usuarios_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Arquivo CSV exportado!');
    } catch {
      toast.error('Erro ao exportar dados');
    }
    setExporting(false);
  };

  if (authLoading || loading) {
    return (
      <AppLayout>
        <div className="min-h-[60vh] flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  const adminLinks = [
    { label: 'Usuários', icon: Users, path: '/admin/users', desc: 'Gerenciar planos e permissões' },
    { label: 'Assinaturas', icon: CreditCard, path: '/admin/subscriptions', desc: 'Pagamentos e assinaturas' },
    { label: 'Módulos', icon: Brain, path: '/admin/test-modules', desc: 'Testes e perguntas' },
    { label: 'Perguntas', icon: FileText, path: '/admin/questions', desc: 'Editar questionários' },
    { label: 'Prompts IA', icon: Settings, path: '/admin/prompts', desc: 'Configurar prompts de IA' },
    { label: 'Config IA', icon: BarChart3, path: '/admin/ai-config', desc: 'Configurações globais de IA' },
    { label: 'Roadmap', icon: LayoutGrid, path: '/admin/roadmap', desc: 'Tarefas do projeto' },
  ];

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/dashboard')} className="p-2 rounded-lg hover:bg-accent transition-colors">
              <ArrowLeft className="w-5 h-5 text-foreground" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Painel Administrativo</h1>
              <p className="text-sm text-muted-foreground">Visão geral do sistema</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCSV}
              disabled={exporting}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-accent transition-colors disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              {exporting ? 'Exportando...' : 'Exportar CSV'}
            </button>
            <button onClick={fetchMetrics} className="p-2 rounded-lg hover:bg-accent transition-colors" title="Atualizar">
              <RefreshCw className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
        </div>

        {/* KPI Cards */}
        {metrics && (
          <motion.div {...fadeUp} className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Total Usuários', value: metrics.totalUsers, icon: Users, color: 'text-blue-500', bg: 'bg-blue-500/10' },
              { label: 'Premium', value: metrics.premiumCount, icon: Crown, color: 'text-violet-500', bg: 'bg-violet-500/10' },
              { label: 'Receita Mensal', value: `R$ ${metrics.monthlyRevenue.toFixed(2).replace('.', ',')}`, icon: DollarSign, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
              { label: 'Conversão', value: `${metrics.conversionRate}%`, icon: Percent, color: 'text-amber-500', bg: 'bg-amber-500/10' },
            ].map((kpi, i) => (
              <motion.div
                key={kpi.label}
                {...fadeUp}
                transition={{ delay: i * 0.05 }}
                className="bg-card rounded-xl border border-border p-5"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{kpi.label}</span>
                  <div className={`p-2 rounded-lg ${kpi.bg}`}>
                    <kpi.icon className={`w-4 h-4 ${kpi.color}`} />
                  </div>
                </div>
                <p className="text-2xl font-bold text-foreground">{kpi.value}</p>
              </motion.div>
            ))}
          </motion.div>
        )}

        {/* Secondary Stats */}
        {metrics && (
          <motion.div {...fadeUp} transition={{ delay: 0.1 }} className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Assinaturas Ativas', value: metrics.activeSubs, icon: CreditCard },
              { label: 'Testes Realizados', value: metrics.totalSessions, icon: Activity },
              { label: 'Módulos Ativos', value: metrics.totalModules, icon: Brain },
              { label: 'Novos (7 dias)', value: metrics.newUsersThisWeek, icon: UserCheck },
            ].map((stat) => (
              <div key={stat.label} className="bg-card/60 rounded-xl border border-border/50 p-4 flex items-center gap-3">
                <stat.icon className="w-5 h-5 text-muted-foreground/50" />
                <div>
                  <p className="text-lg font-semibold text-foreground">{stat.value}</p>
                  <p className="text-[0.7rem] text-muted-foreground/60">{stat.label}</p>
                </div>
              </div>
            ))}
          </motion.div>
        )}

        {/* Admin Navigation Grid */}
        <motion.div {...fadeUp} transition={{ delay: 0.15 }}>
          <h2 className="text-lg font-semibold text-foreground mb-4">Gerenciamento</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {adminLinks.map((link) => (
              <button
                key={link.path}
                onClick={() => navigate(link.path)}
                className="bg-card rounded-xl border border-border p-4 text-left hover:border-primary/30 hover:bg-primary/[0.02] transition-all group"
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 rounded-lg bg-primary/[0.06] border border-primary/10">
                    <link.icon className="w-4 h-4 text-primary/60 group-hover:text-primary transition-colors" />
                  </div>
                  <span className="font-medium text-sm text-foreground">{link.label}</span>
                </div>
                <p className="text-xs text-muted-foreground/60">{link.desc}</p>
              </button>
            ))}
          </div>
        </motion.div>

        {/* Recent Users */}
        {metrics && metrics.recentUsers.length > 0 && (
          <motion.div {...fadeUp} transition={{ delay: 0.2 }} className="bg-card rounded-xl border border-border p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-muted-foreground/60" />
                <h3 className="font-semibold text-foreground text-sm">Cadastros Recentes</h3>
              </div>
              <button onClick={() => navigate('/admin/users')} className="text-xs text-primary/70 hover:text-primary font-medium">
                Ver todos →
              </button>
            </div>
            <div className="space-y-2">
              {metrics.recentUsers.map((u, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-border/30 last:border-0">
                  <span className="text-sm text-foreground/80">{u.email}</span>
                  <span className="text-xs text-muted-foreground/50">
                    {new Date(u.created_at).toLocaleDateString('pt-BR')}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}