import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Loader2, Users, Crown, User, Search, RefreshCw, ChevronDown,
} from 'lucide-react';
import { toast } from 'sonner';

interface UserEntry {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at: string | null;
  roles: string[];
  profile: { name: string; age: number | null } | null;
  plan_type: string;
}

const PLAN_OPTIONS = [
  { value: 'standard', label: 'Padrão', color: 'bg-muted text-muted-foreground border-border' },
  { value: 'pessoal', label: 'Pessoal', color: 'bg-violet-500/10 text-violet-400 border-violet-500/20' },
  { value: 'profissional', label: 'Profissional', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
] as const;

export default function AdminUsers() {
  const { isSuperAdmin, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState<UserEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [changing, setChanging] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [planFilter, setPlanFilter] = useState<'all' | 'standard' | 'pessoal' | 'profissional'>('all');
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!isSuperAdmin) { navigate('/dashboard', { replace: true }); return; }
    fetchUsers();
  }, [authLoading, isSuperAdmin]);

  const fetchUsers = async () => {
    setLoading(true);
    const { data, error } = await supabase.functions.invoke('admin-users', {
      body: { action: 'list' },
    });
    if (error || data?.error) {
      toast.error('Erro ao carregar usuários');
    } else {
      setUsers(data.users || []);
    }
    setLoading(false);
  };

  const changePlan = async (userId: string, newPlan: string) => {
    setChanging(userId);
    setOpenDropdown(null);
    const { data, error } = await supabase.functions.invoke('admin-users', {
      body: { action: 'set_plan', user_id: userId, plan_type: newPlan },
    });
    if (error || data?.error) {
      toast.error('Erro ao alterar plano');
    } else {
      const planLabel = PLAN_OPTIONS.find(p => p.value === newPlan)?.label || newPlan;
      toast.success(`Plano alterado para ${planLabel}!`);
      await fetchUsers();
    }
    setChanging(null);
  };

  const isSuperAdminUser = (u: UserEntry) => u.roles.includes('super_admin');

  const getUserPlan = (u: UserEntry): string => {
    if (isSuperAdminUser(u)) return 'admin';
    return u.plan_type || 'standard';
  };

  const filtered = users.filter(u => {
    if (planFilter !== 'all') {
      const plan = getUserPlan(u);
      if (planFilter === 'standard' && plan !== 'standard') return false;
      if (planFilter === 'pessoal' && plan !== 'pessoal') return false;
      if (planFilter === 'profissional' && plan !== 'profissional') return false;
    }
    if (!search) return true;
    const q = search.toLowerCase();
    return u.email?.toLowerCase().includes(q) || u.profile?.name?.toLowerCase().includes(q);
  });

  const formatDate = (d: string | null) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const getPlanBadge = (plan: string) => {
    if (plan === 'admin') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-500 border border-amber-500/20">
          <Crown className="w-3 h-3" /> Admin
        </span>
      );
    }
    if (plan === 'profissional') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          <Crown className="w-3 h-3" /> Profissional
        </span>
      );
    }
    if (plan === 'pessoal') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-violet-500/10 text-violet-400 border border-violet-500/20">
          <Crown className="w-3 h-3" /> Pessoal
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-muted text-muted-foreground border border-border">
        <User className="w-3 h-3" /> Padrão
      </span>
    );
  };

  const countByPlan = (plan: string) => users.filter(u => getUserPlan(u) === plan).length;

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate('/admin/dashboard')} className="p-2 rounded-lg hover:bg-accent transition-colors">
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-foreground">Usuários</h1>
            <p className="text-sm text-muted-foreground">{users.length} usuários cadastrados</p>
          </div>
          <button onClick={fetchUsers} className="p-2 rounded-lg hover:bg-accent transition-colors" title="Atualizar">
            <RefreshCw className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            className="w-full pl-10 pr-4 py-2 rounded-lg bg-card border border-border text-foreground text-sm focus:ring-2 focus:ring-primary/50 outline-none"
            placeholder="Buscar por nome ou email..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <div className="flex gap-2 mb-4 flex-wrap">
          {([
            ['all', 'Todos', users.length],
            ['standard', 'Padrão', countByPlan('standard')],
            ['pessoal', 'Pessoal', countByPlan('pessoal')],
            ['profissional', 'Profissional', countByPlan('profissional')],
          ] as const).map(([value, label, count]) => (
            <button
              key={value}
              onClick={() => setPlanFilter(value as any)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
                planFilter === value
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border text-muted-foreground hover:border-primary/50'
              }`}
            >
              {label}
              <span className="ml-1.5 opacity-60">{count}</span>
            </button>
          ))}
        </div>

        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Usuário</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Plano</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden md:table-cell">Cadastro</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden md:table-cell">Último acesso</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Ação</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((u, i) => {
                  const plan = getUserPlan(u);
                  return (
                    <motion.tr
                      key={u.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.02 }}
                      className="border-b border-border/50 last:border-0 hover:bg-muted/20 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div>
                          <p className="text-sm font-medium text-foreground">{u.profile?.name || '—'}</p>
                          <p className="text-xs text-muted-foreground">{u.email}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3">{getPlanBadge(plan)}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground hidden md:table-cell">{formatDate(u.created_at)}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground hidden md:table-cell">{formatDate(u.last_sign_in_at)}</td>
                      <td className="px-4 py-3 text-right">
                        {!isSuperAdminUser(u) && (
                          <div className="relative inline-block">
                            {changing === u.id ? (
                              <Loader2 className="w-4 h-4 animate-spin text-primary inline" />
                            ) : (
                              <>
                                <button
                                  onClick={() => setOpenDropdown(openDropdown === u.id ? null : u.id)}
                                  className="text-xs px-3 py-1.5 rounded-lg font-medium transition-colors bg-muted text-foreground hover:bg-accent inline-flex items-center gap-1"
                                >
                                  Alterar Plano
                                  <ChevronDown className="w-3 h-3" />
                                </button>
                                {openDropdown === u.id && (
                                  <div className="absolute right-0 top-full mt-1 z-50 bg-card border border-border rounded-lg shadow-lg py-1 min-w-[140px]">
                                    {PLAN_OPTIONS.map(opt => (
                                      <button
                                        key={opt.value}
                                        onClick={() => changePlan(u.id, opt.value)}
                                        disabled={plan === opt.value}
                                        className={`w-full text-left px-3 py-2 text-xs font-medium transition-colors ${
                                          plan === opt.value
                                            ? 'text-muted-foreground/50 cursor-not-allowed bg-muted/30'
                                            : 'text-foreground hover:bg-accent'
                                        }`}
                                      >
                                        {opt.label}
                                        {plan === opt.value && <span className="ml-1 opacity-50">(atual)</span>}
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        )}
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {filtered.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>{search ? 'Nenhum usuário encontrado' : 'Nenhum usuário cadastrado'}</p>
            </div>
          )}
        </div>
      </div>

      {/* Close dropdown on outside click */}
      {openDropdown && (
        <div className="fixed inset-0 z-40" onClick={() => setOpenDropdown(null)} />
      )}
    </div>
  );
}
