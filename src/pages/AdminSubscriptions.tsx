import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Loader2, CreditCard, RefreshCw, Search, Crown,
  Clock, AlertCircle, CheckCircle2, XCircle, Calendar,
  TrendingUp, DollarSign, Users, ChevronDown, ChevronUp, Wifi,
} from 'lucide-react';
import { toast } from 'sonner';

interface Subscription {
  id: string;
  user_id: string;
  plan: string;
  plan_type: string;
  status: string;
  billing_type: string;
  value: number;
  created_at: string;
  current_period_start: string | null;
  current_period_end: string | null;
  canceled_at: string | null;
  next_due_date: string | null;
  asaas_subscription_id: string | null;
  asaas_customer_id: string | null;
  profileName?: string;
}

interface PlanChange {
  id: string;
  user_id: string;
  previous_plan: string;
  new_plan: string;
  changed_at: string;
  changed_by: string;
  profileName?: string;
}

const statusConfig: Record<string, { label: string; icon: any; color: string; bg: string }> = {
  active: { label: 'Ativo', icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
  pending: { label: 'Pendente', icon: Clock, color: 'text-amber-500', bg: 'bg-amber-500/10' },
  overdue: { label: 'Atrasado', icon: AlertCircle, color: 'text-red-500', bg: 'bg-red-500/10' },
  canceled: { label: 'Cancelado', icon: XCircle, color: 'text-muted-foreground', bg: 'bg-muted' },
  expired: { label: 'Expirado', icon: XCircle, color: 'text-muted-foreground', bg: 'bg-muted' },
};

const planTypeLabels: Record<string, string> = {
  pessoal: 'Pessoal',
  profissional: 'Profissional',
};

const planLabels: Record<string, string> = {
  monthly: 'Mensal',
  yearly: 'Anual',
  profissional: 'Profissional',
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
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isRealtime, setIsRealtime] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [subsRes, historyRes, profilesRes] = await Promise.all([
        supabase.from('subscriptions').select('*').order('created_at', { ascending: false }),
        supabase.from('plan_change_history').select('*').order('changed_at', { ascending: false }).limit(100),
        supabase.from('profiles').select('user_id, name'),
      ]);

      const profileMap: Record<string, string> = {};
      (profilesRes.data || []).forEach((p: any) => { profileMap[p.user_id] = p.name; });

      setSubs((subsRes.data || []).map((s: any) => ({ ...s, profileName: profileMap[s.user_id] || null })));
      setHistory((historyRes.data || []).map((h: any) => ({ ...h, profileName: profileMap[h.user_id] || null })));
    } catch {
      toast.error('Erro ao carregar assinaturas');
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!isSuperAdmin) { navigate('/dashboard', { replace: true }); return; }
    fetchData();
  }, [authLoading, isSuperAdmin, fetchData]);

  // Realtime subscription updates
  useEffect(() => {
    if (!isRealtime || !isSuperAdmin) return;

    const channel = supabase
      .channel('admin-subscriptions')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'subscriptions' }, () => {
        fetchData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'plan_change_history' }, () => {
        fetchData();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [isRealtime, isSuperAdmin, fetchData]);

  const formatDate = (d: string | null) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const formatDateTime = (d: string | null) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const filtered = subs.filter(s => {
    if (statusFilter !== 'all' && s.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (s.profileName?.toLowerCase() || '').includes(q) ||
        s.user_id.toLowerCase().includes(q) ||
        s.billing_type.toLowerCase().includes(q) ||
        (planTypeLabels[s.plan_type] || '').toLowerCase().includes(q);
    }
    return true;
  });

  // KPIs
  const activeSubs = subs.filter(s => s.status === 'active');
  const mrr = activeSubs.reduce((sum, s) => {
    if (s.plan === 'yearly') return sum + (s.value / 12);
    return sum + s.value;
  }, 0);
  const totalRevenue = activeSubs.reduce((sum, s) => sum + s.value, 0);
  const conversionRate = subs.length > 0 ? ((activeSubs.length / subs.length) * 100) : 0;

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/admin/dashboard')} className="p-2 rounded-lg hover:bg-accent transition-colors">
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-foreground">Monitor de Assinaturas</h1>
            <p className="text-sm text-muted-foreground">{subs.length} assinaturas registradas</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsRealtime(!isRealtime)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                isRealtime ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-muted text-muted-foreground border border-border'
              }`}
            >
              <Wifi className={`w-3 h-3 ${isRealtime ? 'animate-pulse' : ''}`} />
              {isRealtime ? 'Tempo Real' : 'Parado'}
            </button>
            <button onClick={fetchData} className="p-2 rounded-lg hover:bg-accent transition-colors" title="Atualizar">
              <RefreshCw className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
        </div>

        {/* Revenue KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="w-4 h-4 text-emerald-500" />
              <span className="text-xs font-medium text-muted-foreground">MRR</span>
            </div>
            <p className="text-xl font-bold text-foreground">R$ {mrr.toFixed(2).replace('.', ',')}</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="w-4 h-4 text-violet-500" />
              <span className="text-xs font-medium text-muted-foreground">Receita Ativa</span>
            </div>
            <p className="text-xl font-bold text-foreground">R$ {totalRevenue.toFixed(2).replace('.', ',')}</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-2 mb-1">
              <Users className="w-4 h-4 text-blue-500" />
              <span className="text-xs font-medium text-muted-foreground">Assinantes Ativos</span>
            </div>
            <p className="text-xl font-bold text-foreground">{activeSubs.length}</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="w-4 h-4 text-amber-500" />
              <span className="text-xs font-medium text-muted-foreground">Conversão</span>
            </div>
            <p className="text-xl font-bold text-foreground">{conversionRate.toFixed(1)}%</p>
          </div>
        </div>

        {/* Status filter cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
          <button
            onClick={() => setStatusFilter('all')}
            className={`rounded-xl border p-3 text-left transition-all ${
              statusFilter === 'all' ? 'border-primary bg-primary/5' : 'border-border bg-card hover:border-primary/30'
            }`}
          >
            <span className="text-xs font-medium text-muted-foreground">Todos</span>
            <p className="text-lg font-bold text-foreground">{subs.length}</p>
          </button>
          {Object.entries(statusConfig).map(([key, cfg]) => {
            const count = subs.filter(s => s.status === key).length;
            return (
              <button
                key={key}
                onClick={() => setStatusFilter(statusFilter === key ? 'all' : key)}
                className={`rounded-xl border p-3 text-left transition-all ${
                  statusFilter === key ? 'border-primary bg-primary/5' : 'border-border bg-card hover:border-primary/30'
                }`}
              >
                <div className="flex items-center gap-1.5 mb-0.5">
                  <cfg.icon className={`w-3.5 h-3.5 ${cfg.color}`} />
                  <span className="text-xs font-medium text-muted-foreground">{cfg.label}</span>
                </div>
                <p className="text-lg font-bold text-foreground">{count}</p>
              </button>
            );
          })}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-border">
          {[
            { key: 'subscriptions', label: 'Assinaturas', icon: CreditCard },
            { key: 'history', label: 'Histórico', icon: Calendar },
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
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                className="w-full pl-10 pr-4 py-2 rounded-lg bg-card border border-border text-foreground text-sm focus:ring-2 focus:ring-primary/50 outline-none"
                placeholder="Buscar por nome, ID, tipo de plano..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>

            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Usuário</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Tipo</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Ciclo</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden md:table-cell">Pagamento</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden md:table-cell">Valor</th>
                      <th className="w-10"></th>
                    </tr>
                  </thead>
                  <tbody>
                    <AnimatePresence>
                      {filtered.map((s, i) => {
                        const sc = statusConfig[s.status] || statusConfig.pending;
                        const isExpanded = expandedId === s.id;
                        return (
                          <motion.tr
                            key={s.id}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ delay: i * 0.015 }}
                            className={`border-b border-border/50 last:border-0 cursor-pointer transition-colors ${isExpanded ? 'bg-muted/30' : 'hover:bg-muted/20'}`}
                            onClick={() => setExpandedId(isExpanded ? null : s.id)}
                          >
                            <td className="px-4 py-3" colSpan={isExpanded ? 7 : 1}>
                              {!isExpanded ? (
                                <div>
                                  <p className="text-sm font-medium text-foreground">{s.profileName || '—'}</p>
                                  <p className="text-xs text-muted-foreground/60 font-mono">{s.user_id.slice(0, 8)}...</p>
                                </div>
                              ) : (
                                <div className="space-y-4">
                                  <div className="flex items-center justify-between">
                                    <div>
                                      <p className="text-base font-semibold text-foreground">{s.profileName || '—'}</p>
                                      <p className="text-xs text-muted-foreground font-mono">{s.user_id}</p>
                                    </div>
                                    <ChevronUp className="w-4 h-4 text-muted-foreground" />
                                  </div>
                                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                    <div>
                                      <p className="text-xs text-muted-foreground mb-0.5">Tipo de Plano</p>
                                      <span className="text-sm font-medium text-foreground">{planTypeLabels[s.plan_type] || s.plan_type}</span>
                                    </div>
                                    <div>
                                      <p className="text-xs text-muted-foreground mb-0.5">Ciclo</p>
                                      <span className="text-sm font-medium text-foreground">{planLabels[s.plan] || s.plan}</span>
                                    </div>
                                    <div>
                                      <p className="text-xs text-muted-foreground mb-0.5">Status</p>
                                      <span className={`inline-flex items-center gap-1 text-sm font-medium ${sc.color}`}>
                                        <sc.icon className="w-3.5 h-3.5" />
                                        {sc.label}
                                      </span>
                                    </div>
                                    <div>
                                      <p className="text-xs text-muted-foreground mb-0.5">Valor</p>
                                      <span className="text-sm font-bold text-foreground">R$ {s.value.toFixed(2).replace('.', ',')}</span>
                                    </div>
                                    <div>
                                      <p className="text-xs text-muted-foreground mb-0.5">Pagamento</p>
                                      <span className="text-sm text-foreground">{s.billing_type}</span>
                                    </div>
                                    <div>
                                      <p className="text-xs text-muted-foreground mb-0.5">Criado em</p>
                                      <span className="text-sm text-foreground">{formatDateTime(s.created_at)}</span>
                                    </div>
                                    <div>
                                      <p className="text-xs text-muted-foreground mb-0.5">Período Atual</p>
                                      <span className="text-sm text-foreground">{formatDate(s.current_period_start)} → {formatDate(s.current_period_end)}</span>
                                    </div>
                                    <div>
                                      <p className="text-xs text-muted-foreground mb-0.5">Próxima Cobrança</p>
                                      <span className="text-sm text-foreground">{formatDate(s.next_due_date)}</span>
                                    </div>
                                    {s.canceled_at && (
                                      <div>
                                        <p className="text-xs text-muted-foreground mb-0.5">Cancelado em</p>
                                        <span className="text-sm text-red-400">{formatDateTime(s.canceled_at)}</span>
                                      </div>
                                    )}
                                    {s.asaas_subscription_id && (
                                      <div>
                                        <p className="text-xs text-muted-foreground mb-0.5">ID Asaas</p>
                                        <span className="text-xs text-muted-foreground font-mono">{s.asaas_subscription_id}</span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}
                            </td>
                            {!isExpanded && (
                              <>
                                <td className="px-4 py-3">
                                  <span className="text-xs px-2 py-1 rounded-full bg-blue-500/10 text-blue-400 font-medium">
                                    {planTypeLabels[s.plan_type] || s.plan_type}
                                  </span>
                                </td>
                                <td className="px-4 py-3">
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-violet-500/10 text-violet-400 border border-violet-500/20">
                                    <Crown className="w-3 h-3" />
                                    {planLabels[s.plan] || s.plan}
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
                                <td className="px-4 py-3">
                                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                                </td>
                              </>
                            )}
                          </motion.tr>
                        );
                      })}
                    </AnimatePresence>
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
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium text-foreground">{h.profileName || '—'}</p>
                        <p className="text-xs text-muted-foreground font-mono">{h.user_id.slice(0, 8)}...</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs px-2 py-1 rounded-full bg-muted text-muted-foreground capitalize">{h.previous_plan}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-1 rounded-full capitalize ${
                          h.new_plan === 'premium' ? 'bg-violet-500/10 text-violet-400' : 'bg-muted text-muted-foreground'
                        }`}>{h.new_plan}</span>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{formatDateTime(h.changed_at)}</td>
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
