import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Loader2, Users, Crown, User, Search, RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';

interface UserEntry {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at: string | null;
  roles: string[];
  profile: { name: string; age: number | null } | null;
}

export default function AdminUsers() {
  const { isSuperAdmin, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState<UserEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);
  const [search, setSearch] = useState('');

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
      console.error(error || data?.error);
    } else {
      setUsers(data.users || []);
    }
    setLoading(false);
  };

  const togglePremium = async (userId: string) => {
    setToggling(userId);
    const { data, error } = await supabase.functions.invoke('admin-users', {
      body: { action: 'toggle_premium', user_id: userId },
    });
    if (error || data?.error) {
      toast.error('Erro ao alterar plano');
    } else {
      toast.success(data.action === 'added' ? 'Plano Premium ativado!' : 'Plano rebaixado para Padrão');
      await fetchUsers();
    }
    setToggling(null);
  };

  const isPremium = (u: UserEntry) => u.roles.includes('premium') || u.roles.includes('super_admin');
  const isSuperAdminUser = (u: UserEntry) => u.roles.includes('super_admin');

  const filtered = users.filter(u => {
    if (!search) return true;
    const q = search.toLowerCase();
    return u.email?.toLowerCase().includes(q) || u.profile?.name?.toLowerCase().includes(q);
  });

  const formatDate = (d: string | null) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

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
          <button onClick={() => navigate('/admin/prompts')} className="p-2 rounded-lg hover:bg-accent transition-colors">
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

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            className="w-full pl-10 pr-4 py-2 rounded-lg bg-card border border-border text-foreground text-sm focus:ring-2 focus:ring-primary/50 outline-none"
            placeholder="Buscar por nome ou email..."
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
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden md:table-cell">Cadastro</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden md:table-cell">Último acesso</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Ação</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((u, i) => (
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
                    <td className="px-4 py-3">
                      {isSuperAdminUser(u) ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-500 border border-amber-500/20">
                          <Crown className="w-3 h-3" />
                          Admin
                        </span>
                      ) : isPremium(u) ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-violet-500/10 text-violet-400 border border-violet-500/20">
                          <Crown className="w-3 h-3" />
                          Premium
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-muted text-muted-foreground border border-border">
                          <User className="w-3 h-3" />
                          Padrão
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground hidden md:table-cell">{formatDate(u.created_at)}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground hidden md:table-cell">{formatDate(u.last_sign_in_at)}</td>
                    <td className="px-4 py-3 text-right">
                      {!isSuperAdminUser(u) && (
                        <button
                          onClick={() => togglePremium(u.id)}
                          disabled={toggling === u.id}
                          className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors disabled:opacity-50 ${
                            isPremium(u)
                              ? 'bg-muted text-muted-foreground hover:bg-destructive/10 hover:text-destructive'
                              : 'bg-violet-500/10 text-violet-400 hover:bg-violet-500/20'
                          }`}
                        >
                          {toggling === u.id ? (
                            <Loader2 className="w-3 h-3 animate-spin inline" />
                          ) : isPremium(u) ? 'Remover Premium' : 'Dar Premium'}
                        </button>
                      )}
                    </td>
                  </motion.tr>
                ))}
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
    </div>
  );
}
