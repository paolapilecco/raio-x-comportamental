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
    { label: 'Módulos', icon: Brain, path: '/admin/test-modules', desc: 'Diagnósticos e perguntas' },
    { label: 'Perguntas', icon: FileText, path: '/admin/questions', desc: 'Editar leituras' },
    { label: 'Prompts IA', icon: Settings, path: '/admin/prompts', desc: 'Configurar prompts de IA' },
    { label: 'Prompts & IA', icon: Settings, path: '/admin/prompts', desc: 'Prompts e configuração de IA' },
    { label: 'Roadmap', icon: LayoutGrid, path: '/admin/roadmap', desc: 'Tarefas do projeto' },
  ];

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto px-6 md:px-10 py-10 space-y-10">
        {/* Header */}
        <motion.div {...fadeUp} className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl md:text-[2.5rem] font-semibold tracking-tight text-foreground leading-tight">
              Painel Administrativo
            </h1>
            <p className="text-base text-muted-foreground mt-1">Visão geral do sistema</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCSV}
              disabled={exporting}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border/40 text-sm font-medium text-foreground hover:bg-secondary/50 transition-all duration-200 disabled:opacity-50 active:scale-[0.97]"
            >
              <Download className="w-4 h-4" />
              {exporting ? 'Exportando...' : 'Exportar CSV'}
            </button>
            <button onClick={fetchMetrics} className="p-2.5 rounded-xl hover:bg-secondary/50 transition-all duration-200" title="Atualizar">
              <RefreshCw className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
        </motion.div>

        {/* KPI Cards */}
        {metrics && (
          <motion.div {...fadeUp} transition={{ delay: 0.05 }} className="grid grid-cols-2 md:grid-cols-4 gap-5">
            {[
              { label: 'Total Usuários', value: metrics.totalUsers, icon: Users, color: 'text-primary', bg: 'bg-primary/10' },
              { label: 'Premium', value: metrics.premiumCount, icon: Crown, color: 'text-accent', bg: 'bg-accent/10' },
              { label: 'Receita Mensal', value: `R$ ${metrics.monthlyRevenue.toFixed(2).replace('.', ',')}`, icon: DollarSign, color: 'text-primary', bg: 'bg-primary/10' },
              { label: 'Conversão', value: `${metrics.conversionRate}%`, icon: Percent, color: 'text-accent', bg: 'bg-accent/10' },
            ].map((kpi, i) => (
              <motion.div
                key={kpi.label}
                {...fadeUp}
                transition={{ delay: i * 0.05 }}
                className="bg-card rounded-2xl border border-border/30 p-6 shadow-[0_1px_3px_0_rgb(0_0_0/0.04)] hover:shadow-[0_4px_12px_0_rgb(0_0_0/0.06)] transition-all duration-200"
              >
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[11px] font-light text-muted-foreground uppercase tracking-widest">{kpi.label}</span>
                  <div className={`p-2 rounded-xl ${kpi.bg}`}>
                    <kpi.icon className={`w-4 h-4 ${kpi.color}`} />
                  </div>
                </div>
                <p className="text-2xl font-semibold text-foreground">{kpi.value}</p>
              </motion.div>
            ))}
          </motion.div>
        )}

        {/* Secondary Stats */}
        {metrics && (
          <motion.div {...fadeUp} transition={{ delay: 0.1 }} className="grid grid-cols-2 md:grid-cols-4 gap-5">
            {[
              { label: 'Assinaturas Ativas', value: metrics.activeSubs, icon: CreditCard },
              { label: 'Leituras Realizadas', value: metrics.totalSessions, icon: Activity },
              { label: 'Módulos Ativos', value: metrics.totalModules, icon: Brain },
              { label: 'Novos (7 dias)', value: metrics.newUsersThisWeek, icon: UserCheck },
            ].map((stat) => (
              <div key={stat.label} className="bg-card rounded-2xl border border-border/30 p-5 flex items-center gap-4 shadow-[0_1px_3px_0_rgb(0_0_0/0.04)]">
                <div className="w-10 h-10 rounded-xl bg-secondary/80 flex items-center justify-center shrink-0">
                  <stat.icon className="w-[18px] h-[18px] text-muted-foreground" />
                </div>
                <div>
                  <p className="text-lg font-semibold text-foreground">{stat.value}</p>
                  <p className="text-xs text-muted-foreground font-light">{stat.label}</p>
                </div>
              </div>
            ))}
          </motion.div>
        )}

        {/* Admin Navigation Grid */}
        <motion.div {...fadeUp} transition={{ delay: 0.15 }}>
          <h2 className="text-xl font-semibold text-foreground mb-5">Gerenciamento</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {adminLinks.map((link) => (
              <button
                key={link.path}
                onClick={() => navigate(link.path)}
                className="bg-card rounded-2xl border border-border/30 p-6 text-left hover:border-primary/20 hover:shadow-[0_4px_12px_0_rgb(0_0_0/0.06)] transition-all duration-200 group active:scale-[0.98] shadow-[0_1px_3px_0_rgb(0_0_0/0.04)]"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-secondary/80 group-hover:bg-primary/10 flex items-center justify-center transition-colors duration-200">
                    <link.icon className="w-[18px] h-[18px] text-muted-foreground group-hover:text-primary transition-colors duration-200" />
                  </div>
                  <span className="font-medium text-sm text-foreground">{link.label}</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">{link.desc}</p>
              </button>
            ))}
          </div>
        </motion.div>

        {/* Recent Users */}
        {metrics && metrics.recentUsers.length > 0 && (
          <motion.div {...fadeUp} transition={{ delay: 0.2 }} className="bg-card rounded-2xl border border-border/30 p-7 shadow-[0_1px_3px_0_rgb(0_0_0/0.04)]">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <h3 className="font-semibold text-foreground">Cadastros Recentes</h3>
              </div>
              <button onClick={() => navigate('/admin/users')} className="text-xs text-primary hover:underline font-medium transition-colors">
                Ver todos →
              </button>
            </div>
            <div className="space-y-1">
              {metrics.recentUsers.map((u, i) => (
                <div key={i} className="flex items-center justify-between py-3 border-b border-border/20 last:border-0">
                  <span className="text-sm text-foreground/80">{u.email}</span>
                  <span className="text-xs text-muted-foreground font-light">
                    {new Date(u.created_at).toLocaleDateString('pt-BR')}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </AppLayout>
  );
}