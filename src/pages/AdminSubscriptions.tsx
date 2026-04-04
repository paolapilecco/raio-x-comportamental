import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Loader2, CreditCard, RefreshCw, Search, Crown,
  Clock, AlertCircle, CheckCircle2, XCircle, Calendar,
} from 'lucide-react';
import { toast } from 'sonner';

interface Subscription {
  id: string;
  user_id: string;
  plan: string;
  status: string;
  billing_type: string;
  value: number;
  created_at: string;
  current_period_start: string | null;
  current_period_end: string | null;
  canceled_at: string | null;
  asaas_subscription_id: string | null;
  profiles?: { name: string } | null;
}

interface PlanChange {
  id: string;
  user_id: string;
  previous_plan: string;
  new_plan: string;
  changed_at: string;
  changed_by: string;
}

const statusConfig: Record<string, { label: string; icon: any; color: string; bg: string }> = {
  active: { label: 'Ativo', icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
  pending: { label: 'Pendente', icon: Clock, color: 'text-amber-500', bg: 'bg-amber-500/10' },
  overdue: { label: 'Atrasado', icon: AlertCircle, color: 'text-red-500', bg: 'bg-red-500/10' },
  canceled: { label: 'Cancelado', icon: XCircle, color: 'text-muted-foreground', bg: 'bg-muted' },
  expired: { label: 'Expirado', icon: XCircle, color: 'text-muted-foreground', bg: 'bg-muted' },
};

export default function AdminSubscriptions() {
  const { isSuperAdmin, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [subs, setSubs] = useState<Subscription[]>([]);
  const [history, setHistory] = useState<PlanChange[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [tab, setTab] = useState<'subscriptions' | 'history'>('subscriptions');

  useEffect(() => {
    if (authLoading) return;
    if (!isSuperAdmin) { navigate('/dashboard', { replace: true }); return; }
    fetchData();
  }, [authLoading, isSuperAdmin]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [subsRes, historyRes, profilesRes] = await Promise.all([
        supabase.from('subscriptions').select('*').order('created_at', { ascending: false }),
        supabase.from('plan_change_history').select('*').order('changed_at', { ascending: false }).limit(50),
        supabase.from('profiles').select('user_id, name'),
      ]);

      const profileMap: Record<string, string> = {};
      (profilesRes.data || []).forEach((p: any) => { profileMap[p.user_id] = p.name; });

      const subsWithProfiles = (subsRes.data || []).map((s: any) => ({
        ...s,
        profiles: profileMap[s.user_id] ? { name: profileMap[s.user_id] } : null,
      }));

      setSubs(subsWithProfiles as Subscription[]);
      setHistory((historyRes.data || []) as PlanChange[]);
    } catch {
      toast.error('Erro ao carregar assinaturas');
    }
    setLoading(false);
  };

  const formatDate = (d: string | null) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const filtered = subs.filter(s => {
    if (statusFilter !== 'all' && s.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      const name = (s as any).profiles?.name?.toLowerCase() || '';
      return name.includes(q) || s.user_id.toLowerCase().includes(q) || s.billing_type.toLowerCase().includes(q);
    }
    return true;
  });

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/admin/dashboard')} className="p-2 rounded-lg hover:bg-accent transition-colors">
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-foreground">Assinaturas</h1>
            <p className="text-sm text-muted-foreground">{subs.length} assinaturas registradas</p>
          </div>
          <button onClick={fetchData} className="p-2 rounded-lg hover:bg-accent transition-colors">
            <RefreshCw className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Object.entries(statusConfig).map(([key, cfg]) => {
            const count = subs.filter(s => s.status === key).length;
            return (
              <button
                key={key}
                onClick={() => setStatusFilter(statusFilter === key ? 'all' : key)}
                className={`rounded-xl border p-4 text-left transition-all ${
                  statusFilter === key ? 'border-primary bg-primary/5' : 'border-border bg-card hover:border-primary/30'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <cfg.icon className={`w-4 h-4 ${cfg.color}`} />
                  <span className="text-xs font-medium text-muted-foreground">{cfg.label}</span>
                </div>
                <p className="text-xl font-bold text-foreground">{count}</p>
              </button>
            );
          })}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-border">
          {[
            { key: 'subscriptions', label: 'Assinaturas', icon: CreditCard },
            { key: 'history', label: 'Histórico de Alterações', icon: Calendar },
          ].map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key as typeof tab)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
                tab === t.key ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <t.icon className="w-4 h-4" />
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'subscriptions' && (
          <>
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                className="w-full pl-10 pr-4 py-2 rounded-lg bg-card border border-border text-foreground text-sm focus:ring-2 focus:ring-primary/50 outline-none"
                placeholder="Buscar por nome ou ID..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>

            {/* Table */}
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Usuário</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Plano</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden md:table-cell">Pagamento</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden md:table-cell">Valor</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden lg:table-cell">Criado em</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((s, i) => {
                      const sc = statusConfig[s.status] || statusConfig.pending;
                      return (
                        <motion.tr
                          key={s.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: i * 0.02 }}
                          className="border-b border-border/50 last:border-0 hover:bg-muted/20 transition-colors"
                        >
                          <td className="px-4 py-3">
                            <p className="text-sm font-medium text-foreground">{(s as any).profiles?.name || '—'}</p>
                            <p className="text-xs text-muted-foreground/60 font-mono">{s.user_id.slice(0, 8)}...</p>
                          </td>
                          <td className="px-4 py-3">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-violet-500/10 text-violet-400 border border-violet-500/20">
                              <Crown className="w-3 h-3" />
                              {s.plan === 'yearly' ? 'Anual' : 'Mensal'}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${sc.bg} ${sc.color}`}>
                              <sc.icon className="w-3 h-3" />
                              {sc.label}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-muted-foreground hidden md:table-cell">{s.billing_type}</td>
                          <td className="px-4 py-3 text-sm font-medium text-foreground hidden md:table-cell">
                            R$ {s.value.toFixed(2).replace('.', ',')}
                          </td>
                          <td className="px-4 py-3 text-xs text-muted-foreground hidden lg:table-cell">{formatDate(s.created_at)}</td>
                        </motion.tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {filtered.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  <CreditCard className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>Nenhuma assinatura encontrada</p>
                </div>
              )}
            </div>
          </>
        )}

        {tab === 'history' && (
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Usuário</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">De</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Para</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Data</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((h, i) => (
                    <motion.tr
                      key={h.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.02 }}
                      className="border-b border-border/50 last:border-0"
                    >
                      <td className="px-4 py-3 text-sm text-foreground font-mono">{h.user_id.slice(0, 8)}...</td>
                      <td className="px-4 py-3">
                        <span className="text-xs px-2 py-1 rounded-full bg-muted text-muted-foreground capitalize">{h.previous_plan}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-1 rounded-full capitalize ${
                          h.new_plan === 'premium' ? 'bg-violet-500/10 text-violet-400' : 'bg-muted text-muted-foreground'
                        }`}>{h.new_plan}</span>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{formatDate(h.changed_at)}</td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
            {history.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <Calendar className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>Nenhuma alteração registrada</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}