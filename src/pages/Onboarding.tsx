import { useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { z } from 'zod';
import { ScanLine, ArrowRight, Fingerprint, Shield, Brain, Phone } from 'lucide-react';

const nameSchema = z.string().trim().min(2, 'Nome deve ter pelo menos 2 caracteres').max(100);
const cpfSchema = z.string().trim().regex(/^\d{3}\.?\d{3}\.?\d{3}-?\d{2}$/, 'CPF inválido');
const phoneSchema = z.string().trim().regex(/^\(?\d{2}\)?\s?\d{4,5}-?\d{4}$/, 'Telefone inválido');

function formatPhone(value: string): string {
  let v = value.replace(/\D/g, '').slice(0, 11);
  if (v.length > 6) v = v.replace(/(\d{2})(\d{4,5})(\d{1,4})/, '($1) $2-$3');
  else if (v.length > 2) v = v.replace(/(\d{2})(\d{1,5})/, '($1) $2');
  return v;
}

const Onboarding = () => {
  const [name, setName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [cpf, setCpf] = useState('');
  const [phone, setPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { user, refreshProfile } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const nameResult = nameSchema.safeParse(name);
    if (!nameResult.success) {
      toast.error(nameResult.error.errors[0].message);
      return;
    }

    const cpfResult = cpfSchema.safeParse(cpf);
    if (!cpfResult.success) {
      toast.error(cpfResult.error.errors[0].message);
      return;
    }
    const cleanCpf = cpf.replace(/\D/g, '');

    const phoneResult = phoneSchema.safeParse(phone);
    if (!phoneResult.success) {
      toast.error(phoneResult.error.errors[0].message);
      return;
    }
    const cleanPhone = phone.replace(/\D/g, '');

    if (!birthDate) {
      toast.error('Informe sua data de nascimento');
      return;
    }

    const birth = new Date(birthDate);
    const today = new Date();
    if (birth >= today) {
      toast.error('Data de nascimento inválida');
      return;
    }

    setSubmitting(true);
    try {
      // 1. Create profile
      const { error } = await supabase.from('profiles').insert({
        user_id: user!.id,
        name: nameResult.data,
        birth_date: birthDate,
        cpf: cleanCpf,
        phone: cleanPhone,
      });

      if (error) {
        if (error.code === '23505') {
          await refreshProfile();
          navigate('/dashboard');
          return;
        }
        console.error('Profile save error:', error.message);
        toast.error('Erro ao salvar perfil. Tente novamente.');
        return;
      }

      // 2. Auto-create first managed_person (the user themselves)
      await supabase.from('managed_persons').insert({
        owner_id: user!.id,
        name: nameResult.data,
        cpf: cleanCpf,
        phone: cleanPhone,
        birth_date: birthDate,
      });

      await refreshProfile();
      toast.success('Perfil criado!');
      navigate('/dashboard');
    } finally {
      setSubmitting(false);
    }
  };

  const steps = [
    { icon: Fingerprint, label: 'Identificação', desc: 'Seus dados básicos' },
    { icon: Brain, label: 'Leitura', desc: 'Responder perguntas' },
    { icon: Shield, label: 'Resultado', desc: 'Seu perfil revelado' },
  ];

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 sm:py-16 relative overflow-hidden" role="main" aria-label="Configuração de perfil">
      {/* Ambient background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-15%] right-[-5%] w-[500px] h-[500px] rounded-full bg-primary/[0.04] blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[400px] h-[400px] rounded-full bg-gold/[0.03] blur-[100px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-md space-y-10 relative z-10"
      >
        {/* Header */}
        <div className="text-center space-y-5">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1, duration: 0.5 }}
            className="inline-flex items-center gap-2.5 px-5 py-2.5 rounded-full border border-primary/10 bg-primary/[0.03]"
          >
            <ScanLine className="w-3.5 h-3.5 text-primary/60" />
            <span className="text-[10px] tracking-[0.35em] uppercase text-primary/70 font-semibold font-display">
              Etapa 1 — Identificação
            </span>
          </motion.div>
          <h1 className="text-3xl md:text-4xl tracking-[-0.04em]">Sobre você</h1>
          <p className="text-[0.85rem] text-muted-foreground/60 leading-[1.7] max-w-sm mx-auto">
            Essas informações personalizam a leitura do seu padrão comportamental.
          </p>
        </div>

        {/* Journey Steps */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="flex items-center justify-between px-2"
        >
          {steps.map((step, i) => {
            const StepIcon = step.icon;
            const isActive = i === 0;
            return (
              <div key={step.label} className="flex items-center gap-2 flex-1">
                <div className="flex flex-col items-center text-center flex-1">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-2 transition-all ${
                    isActive
                      ? 'bg-primary/10 border border-primary/20'
                      : 'bg-muted/30 border border-border/30'
                  }`}>
                    <StepIcon className={`w-4 h-4 ${isActive ? 'text-primary' : 'text-muted-foreground/40'}`} />
                  </div>
                  <p className={`text-[0.65rem] font-semibold tracking-[0.08em] uppercase ${
                    isActive ? 'text-primary/80' : 'text-muted-foreground/40'
                  }`}>{step.label}</p>
                </div>
                {i < steps.length - 1 && (
                  <div className={`h-px flex-shrink-0 w-6 mb-6 ${isActive ? 'bg-primary/20' : 'bg-border/30'}`} />
                )}
              </div>
            );
          })}
        </motion.div>

        {/* Form */}
        <motion.form
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          onSubmit={handleSubmit}
          className="bg-card/60 backdrop-blur-xl rounded-3xl border border-border/40 p-7 sm:p-9 space-y-5 shadow-[0_20px_60px_-15px_hsl(var(--primary)/0.08)]"
          noValidate
        >
          <div className="space-y-2">
            <label htmlFor="onboarding-name" className="text-[0.78rem] font-semibold text-foreground/70 tracking-[0.04em] uppercase font-display">
              Nome completo
            </label>
            <input
              id="onboarding-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              maxLength={100}
              autoComplete="name"
              className="flex h-13 w-full rounded-2xl border border-border/40 bg-background/60 px-5 py-3 text-[0.9rem] ring-offset-background placeholder:text-muted-foreground/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:border-primary/20 transition-all duration-300"
              placeholder="Seu nome completo"
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="onboarding-birth" className="text-[0.78rem] font-semibold text-foreground/70 tracking-[0.04em] uppercase font-display">
              Data de nascimento
            </label>
            <input
              id="onboarding-birth"
              type="date"
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
              required
              max={new Date().toISOString().split('T')[0]}
              className="flex h-13 w-full rounded-2xl border border-border/40 bg-background/60 px-5 py-3 text-[0.9rem] ring-offset-background placeholder:text-muted-foreground/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:border-primary/20 transition-all duration-300"
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="onboarding-cpf" className="text-[0.78rem] font-semibold text-foreground/70 tracking-[0.04em] uppercase font-display">
              CPF
            </label>
            <input
              id="onboarding-cpf"
              type="text"
              value={cpf}
              onChange={(e) => {
                let v = e.target.value.replace(/\D/g, '').slice(0, 11);
                if (v.length > 9) v = v.replace(/(\d{3})(\d{3})(\d{3})(\d{1,2})/, '$1.$2.$3-$4');
                else if (v.length > 6) v = v.replace(/(\d{3})(\d{3})(\d{1,3})/, '$1.$2.$3');
                else if (v.length > 3) v = v.replace(/(\d{3})(\d{1,3})/, '$1.$2');
                setCpf(v);
              }}
              required
              maxLength={14}
              placeholder="000.000.000-00"
              inputMode="numeric"
              className="flex h-13 w-full rounded-2xl border border-border/40 bg-background/60 px-5 py-3 text-[0.9rem] ring-offset-background placeholder:text-muted-foreground/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:border-primary/20 transition-all duration-300"
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="onboarding-phone" className="text-[0.78rem] font-semibold text-foreground/70 tracking-[0.04em] uppercase font-display">
              Telefone / WhatsApp
            </label>
            <input
              id="onboarding-phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(formatPhone(e.target.value))}
              required
              maxLength={15}
              placeholder="(11) 99999-9999"
              inputMode="tel"
              className="flex h-13 w-full rounded-2xl border border-border/40 bg-background/60 px-5 py-3 text-[0.9rem] ring-offset-background placeholder:text-muted-foreground/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:border-primary/20 transition-all duration-300"
            />
          </div>

          <p className="text-[0.7rem] text-muted-foreground/40 flex items-center gap-1.5">
            <Shield className="w-3 h-3" />
            Seus dados são protegidos e nunca compartilhados
          </p>

          <button
            type="submit"
            disabled={submitting}
            className="group w-full h-13 bg-primary text-primary-foreground rounded-2xl text-[0.9rem] font-semibold tracking-[-0.01em] hover:opacity-90 transition-all duration-500 shadow-[0_8px_30px_-6px_hsl(var(--primary)/0.35)] hover:shadow-[0_12px_40px_-4px_hsl(var(--primary)/0.45)] hover:translate-y-[-1px] active:translate-y-[0px] disabled:opacity-50 flex items-center justify-center gap-2.5 relative overflow-hidden"
          >
            <span className="relative z-10">{submitting ? 'Salvando...' : 'Continuar para a leitura'}</span>
            {!submitting && <ArrowRight className="w-4 h-4 relative z-10 group-hover:translate-x-1 transition-transform duration-300" />}
            <div className="absolute inset-0 bg-gradient-to-t from-black/[0.08] to-white/[0.05] pointer-events-none" />
          </button>
        </motion.form>
      </motion.div>
    </div>
  );
};

export default Onboarding;
