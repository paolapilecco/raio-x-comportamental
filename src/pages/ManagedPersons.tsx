import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth, PLAN_LIMITS } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { AppLayout } from '@/components/AppLayout';
import { Users, Plus, Trash2, Crown, Lock, UserCircle, Phone, Calendar, Mail, Send } from 'lucide-react';
import { z } from 'zod';
import { getPersonLimit } from '@/lib/planLimits';

const nameSchema = z.string().trim().min(2, 'Nome deve ter pelo menos 2 caracteres').max(100);
const cpfSchema = z.string().trim().regex(/^\d{3}\.?\d{3}\.?\d{3}-?\d{2}$/, 'CPF inválido');
const phoneSchema = z.string().trim().regex(/^\(?\d{2}\)?\s?\d{4,5}-?\d{4}$/, 'Telefone inválido').optional().or(z.literal(''));

interface ManagedPerson {
  id: string;
  name: string;
  cpf: string;
  phone: string | null;
  birth_date: string;
  age: number | null;
  created_at: string;
}

function formatPhone(value: string): string {
  let v = value.replace(/\D/g, '').slice(0, 11);
  if (v.length > 6) v = v.replace(/(\d{2})(\d{4,5})(\d{1,4})/, '($1) $2-$3');
  else if (v.length > 2) v = v.replace(/(\d{2})(\d{1,5})/, '($1) $2');
  return v;
}

function formatCpfDisplay(cpf: string): string {
  const clean = cpf.replace(/\D/g, '');
  if (clean.length === 11) return clean.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  return cpf;
}

const fadeUp = { initial: { opacity: 0, y: 15 }, animate: { opacity: 1, y: 0 } };

export default function ManagedPersons() {
  const { user, isPremium, isSuperAdmin, planType } = useAuth();
  const [persons, setPersons] = useState<ManagedPerson[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [sendingInvite, setSendingInvite] = useState(false);

  // Form state
  const [formName, setFormName] = useState('');
  const [formCpf, setFormCpf] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formBirthDate, setFormBirthDate] = useState('');
  const [saving, setSaving] = useState(false);

  const limit = getPersonLimit(planType, isSuperAdmin);
  const canAdd = isSuperAdmin || persons.length < limit;
  const canInvite = planType === 'pessoal' || planType === 'profissional' || isSuperAdmin;

  useEffect(() => {
    if (!user) return;
    fetchPersons();
  }, [user]);

  const fetchPersons = async () => {
    const { data, error } = await supabase
      .from('managed_persons')
      .select('*')
      .eq('owner_id', user!.id)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching persons:', error);
      toast.error('Erro ao carregar pessoas.');
    }
    setPersons((data as ManagedPerson[]) || []);
    setLoading(false);
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();

    const nameResult = nameSchema.safeParse(formName);
    if (!nameResult.success) { toast.error(nameResult.error.errors[0].message); return; }

    const cpfResult = cpfSchema.safeParse(formCpf);
    if (!cpfResult.success) { toast.error(cpfResult.error.errors[0].message); return; }

    if (formPhone) {
      const phoneResult = phoneSchema.safeParse(formPhone);
      if (!phoneResult.success) { toast.error('Telefone inválido'); return; }
    }

    if (!formBirthDate) { toast.error('Informe a data de nascimento'); return; }

    const birth = new Date(formBirthDate);
    if (birth >= new Date()) { toast.error('Data de nascimento inválida'); return; }

    if (!canAdd) {
      toast.error(`Limite de ${limit} pessoa(s) atingido. Faça upgrade para Premium.`);
      return;
    }

    setSaving(true);
    const cleanCpf = formCpf.replace(/\D/g, '');
    const cleanPhone = formPhone.replace(/\D/g, '') || null;

    const { error } = await supabase.from('managed_persons').insert({
      owner_id: user!.id,
      name: nameResult.data,
      cpf: cleanCpf,
      phone: cleanPhone,
      birth_date: formBirthDate,
    });

    if (error) {
      if (error.code === '23505') {
        toast.error('Esse CPF já está cadastrado.');
      } else {
        console.error('Insert error:', error);
        toast.error('Erro ao cadastrar pessoa.');
      }
    } else {
      toast.success('Pessoa cadastrada!');
      setFormName(''); setFormCpf(''); setFormPhone(''); setFormBirthDate('');
      setShowForm(false);
      await fetchPersons();
    }
    setSaving(false);
  };

  const handleDelete = async (person: ManagedPerson) => {
    if (persons.length <= 1) {
      toast.error('Você precisa manter pelo menos 1 pessoa cadastrada.');
      return;
    }

    const confirmed = window.confirm(`Remover ${person.name}? Todos os testes vinculados a essa pessoa perderão a referência.`);
    if (!confirmed) return;

    const { error } = await supabase.from('managed_persons').delete().eq('id', person.id);
    if (error) {
      console.error('Delete error:', error);
      toast.error('Erro ao remover pessoa.');
    } else {
      toast.success('Pessoa removida.');
      await fetchPersons();
    }
  };

  const inputClass = "flex h-12 w-full rounded-xl border border-border/40 bg-background/60 px-4 py-2.5 text-sm ring-offset-background placeholder:text-muted-foreground/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:border-primary/20 transition-all";

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto px-6 md:px-10 py-10 space-y-8">
        {/* Header */}
        <motion.div {...fadeUp} className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-serif flex items-center gap-3">
              <Users className="w-6 h-6 text-primary" />
              Pessoas Cadastradas
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {persons.length}/{limit} {persons.length === 1 ? 'pessoa cadastrada' : 'pessoas cadastradas'}
              {planType === 'standard' && ` — Upgrade libera até ${PLAN_LIMITS.pessoal.maxPersons}`}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {canInvite && !showInviteForm && (
              <button
                onClick={() => setShowInviteForm(true)}
                className="px-3 py-2 border border-border rounded-lg text-sm text-muted-foreground hover:bg-muted/30 flex items-center gap-1.5"
              >
                <Mail className="w-3.5 h-3.5" /> Convidar
              </button>
            )}

          {canAdd && !showForm && (
            <button
              onClick={() => {
                if (planType === 'standard' && persons.length >= PLAN_LIMITS.standard.maxPersons) {
                  toast.error('Faça upgrade para cadastrar mais pessoas.');
                  return;
                }
                setShowForm(true);
              }}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Adicionar
            </button>
          )}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Adicionar
            </button>
          )}

          {!canAdd && !isSuperAdmin && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/30 px-3 py-2 rounded-lg">
              <Lock className="w-3.5 h-3.5" />
              Limite atingido
            </div>
          )}
        </motion.div>

        {/* Add Form */}
        {showForm && (
          <motion.form
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            onSubmit={handleAdd}
            className="bg-card rounded-xl border border-border p-6 space-y-4"
          >
            <h3 className="text-lg font-serif mb-2">Nova pessoa</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Nome completo</label>
                <input type="text" value={formName} onChange={e => setFormName(e.target.value)} maxLength={100} placeholder="Nome da pessoa" className={inputClass} required />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">CPF</label>
                <input
                  type="text" value={formCpf} maxLength={14} placeholder="000.000.000-00" inputMode="numeric" className={inputClass} required
                  onChange={(e) => {
                    let v = e.target.value.replace(/\D/g, '').slice(0, 11);
                    if (v.length > 9) v = v.replace(/(\d{3})(\d{3})(\d{3})(\d{1,2})/, '$1.$2.$3-$4');
                    else if (v.length > 6) v = v.replace(/(\d{3})(\d{3})(\d{1,3})/, '$1.$2.$3');
                    else if (v.length > 3) v = v.replace(/(\d{3})(\d{1,3})/, '$1.$2');
                    setFormCpf(v);
                  }}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Telefone</label>
                <input type="tel" value={formPhone} onChange={e => setFormPhone(formatPhone(e.target.value))} maxLength={15} placeholder="(11) 99999-9999" inputMode="tel" className={inputClass} />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Data de nascimento</label>
                <input type="date" value={formBirthDate} onChange={e => setFormBirthDate(e.target.value)} max={new Date().toISOString().split('T')[0]} className={inputClass} required />
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button type="submit" disabled={saving} className="px-5 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50">
                {saving ? 'Salvando...' : 'Cadastrar'}
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="px-5 py-2.5 border border-border rounded-lg text-sm text-muted-foreground hover:bg-muted/30">
                Cancelar
              </button>
            </div>
          </motion.form>
        )}

        {/* Premium upsell */}
        {!hasAccess && persons.length >= FREE_LIMIT && (
          <motion.div {...fadeUp} className="bg-gradient-to-r from-amber-500/5 to-amber-600/10 border border-amber-500/20 rounded-xl p-5 flex items-center gap-4">
            <Crown className="w-8 h-8 text-amber-500 shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">Desbloqueie até 3 pessoas</p>
              <p className="text-xs text-muted-foreground mt-0.5">Com o plano Premium, analise o perfil comportamental de familiares, amigos ou clientes.</p>
            </div>
            <a href="/checkout" className="px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 text-white rounded-lg text-sm font-medium hover:opacity-90 shrink-0">
              Upgrade
            </a>
          </motion.div>
        )}

        {/* Persons List */}
        {loading ? (
          <div className="space-y-4">
            {[1, 2].map(i => (
              <div key={i} className="bg-card rounded-xl border border-border p-5 animate-pulse">
                <div className="h-5 bg-muted/50 rounded w-40 mb-2" />
                <div className="h-3 bg-muted/50 rounded w-60" />
              </div>
            ))}
          </div>
        ) : persons.length === 0 ? (
          <div className="text-center py-12 space-y-4">
            <UserCircle className="w-12 h-12 text-muted-foreground mx-auto" />
            <p className="text-muted-foreground">Nenhuma pessoa cadastrada.</p>
            <button onClick={() => setShowForm(true)} className="px-5 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90">
              Cadastrar pessoa
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {persons.map((person, i) => (
              <motion.div
                key={person.id}
                {...fadeUp}
                transition={{ delay: i * 0.05 }}
                className="bg-card rounded-xl border border-border p-5 flex items-center justify-between gap-4"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <UserCircle className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{person.name}</p>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-xs text-muted-foreground">{formatCpfDisplay(person.cpf)}</span>
                      {person.phone && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Phone className="w-3 h-3" />
                          {person.phone}
                        </span>
                      )}
                      {person.age !== null && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {person.age} anos
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {persons.length > 1 && (
                  <button
                    onClick={() => handleDelete(person)}
                    className="text-muted-foreground hover:text-destructive transition-colors p-2"
                    title="Remover pessoa"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
