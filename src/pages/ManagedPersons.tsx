import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth, PLAN_LIMITS } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/AppLayout';
import { Users, Plus, Trash2, Crown, Lock, UserCircle, Phone, Calendar, Mail, Send, Pencil, ToggleLeft, ToggleRight, Check, X, Eye } from 'lucide-react';
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
  is_active: boolean;
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
  const navigate = useNavigate();
  const [persons, setPersons] = useState<ManagedPerson[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [sendingInvite, setSendingInvite] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form state
  const [formName, setFormName] = useState('');
  const [formCpf, setFormCpf] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formBirthDate, setFormBirthDate] = useState('');
  const [saving, setSaving] = useState(false);

  // Edit form state
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editBirthDate, setEditBirthDate] = useState('');

  const limit = getPersonLimit(planType, isSuperAdmin);
  const activeCount = persons.filter(p => p.is_active).length;
  const canAdd = isSuperAdmin || activeCount < limit;
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
      .order('is_active', { ascending: false })
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
      toast.error(`Limite de ${limit} perfil(is) ativo(s) atingido.`);
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
      is_active: true,
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

  const handleToggleActive = async (person: ManagedPerson) => {
    // If reactivating, check the limit
    if (!person.is_active && !isSuperAdmin && activeCount >= limit) {
      toast.error(`Limite de ${limit} perfil(is) ativo(s) atingido. Desative outro perfil primeiro.`);
      return;
    }

    const { error } = await supabase
      .from('managed_persons')
      .update({ is_active: !person.is_active })
      .eq('id', person.id);

    if (error) {
      console.error('Toggle error:', error);
      toast.error('Erro ao alterar status.');
    } else {
      toast.success(person.is_active ? 'Perfil desativado.' : 'Perfil reativado!');
      await fetchPersons();
    }
  };

  const startEditing = (person: ManagedPerson) => {
    setEditingId(person.id);
    setEditName(person.name);
    setEditPhone(person.phone ? formatPhone(person.phone) : '');
    setEditBirthDate(person.birth_date);
  };

  const handleSaveEdit = async (personId: string) => {
    const nameResult = nameSchema.safeParse(editName);
    if (!nameResult.success) { toast.error(nameResult.error.errors[0].message); return; }

    if (editPhone) {
      const phoneResult = phoneSchema.safeParse(editPhone);
      if (!phoneResult.success) { toast.error('Telefone inválido'); return; }
    }

    if (!editBirthDate) { toast.error('Informe a data de nascimento'); return; }

    const cleanPhone = editPhone.replace(/\D/g, '') || null;

    const { error } = await supabase
      .from('managed_persons')
      .update({
        name: nameResult.data,
        phone: cleanPhone,
        birth_date: editBirthDate,
      })
      .eq('id', personId);

    if (error) {
      console.error('Update error:', error);
      toast.error('Erro ao atualizar cadastro.');
    } else {
      toast.success('Cadastro atualizado!');
      setEditingId(null);
      await fetchPersons();
    }
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
              <span className="font-medium text-foreground">{activeCount}</span>/{limit} ativos
              {persons.length > activeCount && (
                <span className="ml-2 text-muted-foreground/60">· {persons.length - activeCount} inativo(s)</span>
              )}
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
                if (planType === 'standard' && activeCount >= PLAN_LIMITS.standard.maxPersons) {
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

          {!canAdd && !isSuperAdmin && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/30 px-3 py-2 rounded-lg">
              <Lock className="w-3.5 h-3.5" />
              Limite atingido
            </div>
          )}
          </div>
        </motion.div>

        {/* Add Form */}
        <AnimatePresence>
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
        </AnimatePresence>

        {/* Upsell */}
        {planType === 'standard' && activeCount >= PLAN_LIMITS.standard.maxPersons && (
          <motion.div {...fadeUp} className="bg-primary/5 border border-primary/20 rounded-xl p-5 flex items-center gap-4">
            <Crown className="w-8 h-8 text-primary shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">Desbloqueie mais perfis</p>
              <p className="text-xs text-muted-foreground mt-0.5">Com o plano Pessoal, analise até 3 perfis. Com o Profissional, até 15.</p>
            </div>
            <a href="/checkout" className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 shrink-0">
              Upgrade
            </a>
          </motion.div>
        )}

        {/* Invite form */}
        <AnimatePresence>
        {showInviteForm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="bg-card rounded-xl border border-border p-6 space-y-4">
            <h3 className="text-lg font-serif mb-2 flex items-center gap-2"><Send className="w-4 h-4 text-primary" /> Convidar por email</h3>
            <p className="text-xs text-muted-foreground">O convidado receberá um email para se cadastrar na plataforma e será vinculado à sua conta.</p>
            <div className="flex gap-3">
              <input type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} placeholder="email@exemplo.com" className={inputClass} />
              <button
                onClick={async () => {
                  if (!inviteEmail || !inviteEmail.includes('@')) { toast.error('Email inválido'); return; }
                  setSendingInvite(true);
                  const { data: inviteData, error } = await supabase.from('invites').insert({ inviter_id: user!.id, email: inviteEmail }).select('token').single();
                  if (error) {
                    if (error.code === '23505') toast.error('Convite já enviado para este email.');
                    else toast.error('Erro ao enviar convite.');
                  } else {
                    // Send invite email via Resend
                    const inviteLink = `${window.location.origin}/auth?invite=${inviteData?.token || ''}`;
                    supabase.functions.invoke('send-email', {
                      body: {
                        templateName: 'platform-invite',
                        to: inviteEmail,
                        data: {
                          inviterName: profile?.name || 'Um profissional',
                          inviteLink,
                        },
                      },
                    }).catch(() => {});
                    toast.success('Convite enviado por email!');
                    setInviteEmail('');
                    setShowInviteForm(false);
                  }
                  setSendingInvite(false);
                }}
                disabled={sendingInvite}
                className="px-5 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50 whitespace-nowrap"
              >
                {sendingInvite ? 'Enviando...' : 'Enviar'}
              </button>
            </div>
            <button onClick={() => setShowInviteForm(false)} className="text-xs text-muted-foreground hover:text-foreground">Cancelar</button>
          </motion.div>
        )}
        </AnimatePresence>

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
            {persons.map((person, i) => {
              const isEditing = editingId === person.id;

              return (
                <motion.div
                  key={person.id}
                  {...fadeUp}
                  transition={{ delay: i * 0.05 }}
                  className={`bg-card rounded-xl border p-5 transition-all ${
                    person.is_active
                      ? 'border-border'
                      : 'border-border/40 opacity-60'
                  }`}
                >
                  {isEditing ? (
                    /* Edit Mode */
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Nome</label>
                          <input type="text" value={editName} onChange={e => setEditName(e.target.value)} maxLength={100} className={inputClass} />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">CPF (não editável)</label>
                          <input type="text" value={formatCpfDisplay(person.cpf)} disabled className={`${inputClass} opacity-50 cursor-not-allowed`} />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Telefone</label>
                          <input type="tel" value={editPhone} onChange={e => setEditPhone(formatPhone(e.target.value))} maxLength={15} placeholder="(11) 99999-9999" className={inputClass} />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Data de nascimento</label>
                          <input type="date" value={editBirthDate} onChange={e => setEditBirthDate(e.target.value)} max={new Date().toISOString().split('T')[0]} className={inputClass} />
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => handleSaveEdit(person.id)} className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 flex items-center gap-1.5">
                          <Check className="w-3.5 h-3.5" /> Salvar
                        </button>
                        <button onClick={() => setEditingId(null)} className="px-4 py-2 border border-border rounded-lg text-sm text-muted-foreground hover:bg-muted/30 flex items-center gap-1.5">
                          <X className="w-3.5 h-3.5" /> Cancelar
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* View Mode */
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-4 min-w-0">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                          person.is_active ? 'bg-primary/10' : 'bg-muted/30'
                        }`}>
                          <UserCircle className={`w-5 h-5 ${person.is_active ? 'text-primary' : 'text-muted-foreground'}`} />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium text-foreground truncate">{person.name}</p>
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[0.65rem] font-semibold uppercase tracking-wider ${
                              person.is_active
                                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                : 'bg-muted/50 text-muted-foreground'
                            }`}>
                              {person.is_active ? 'Ativo' : 'Inativo'}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 mt-0.5 flex-wrap">
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

                      <div className="flex items-center gap-1 shrink-0">
                        {/* Toggle active/inactive */}
                        <button
                          onClick={() => handleToggleActive(person)}
                          className={`p-2 rounded-lg transition-colors ${
                            person.is_active
                              ? 'text-emerald-600 hover:bg-emerald-500/10'
                              : 'text-muted-foreground hover:bg-muted/30'
                          }`}
                          title={person.is_active ? 'Desativar perfil' : 'Reativar perfil'}
                        >
                          {person.is_active
                            ? <ToggleRight className="w-5 h-5" />
                            : <ToggleLeft className="w-5 h-5" />
                          }
                        </button>

                        {/* View detail */}
                        <button
                          onClick={() => navigate(`/paciente/${person.id}`)}
                          className="text-muted-foreground hover:text-primary transition-colors p-2"
                          title="Ver ficha completa"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        {/* Edit */}
                        <button
                          onClick={() => startEditing(person)}
                          className="text-muted-foreground hover:text-foreground transition-colors p-2"
                          title="Editar cadastro"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>

                        {/* Delete */}
                        {persons.length > 1 && (
                          <button
                            onClick={() => handleDelete(person)}
                            className="text-muted-foreground hover:text-destructive transition-colors p-2"
                            title="Remover pessoa"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
