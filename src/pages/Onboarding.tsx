import { useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { z } from 'zod';
import { ScanLine } from 'lucide-react';

const nameSchema = z.string().trim().min(2, 'Nome deve ter pelo menos 2 caracteres').max(100);

const Onboarding = () => {
  const [name, setName] = useState('');
  const [birthDate, setBirthDate] = useState('');
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
      const { error } = await supabase.from('profiles').insert({
        user_id: user!.id,
        name: nameResult.data,
        birth_date: birthDate,
      });

      if (error) {
        if (error.code === '23505') {
          await refreshProfile();
          navigate('/diagnostic');
          return;
        }
        toast.error('Erro ao salvar perfil: ' + error.message);
        return;
      }

      await refreshProfile();
      toast.success('Perfil criado!');
      navigate('/diagnostic');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-16">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-md space-y-10"
      >
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-2.5 px-5 py-2 rounded-full border border-primary/12 bg-primary/[0.03]">
            <ScanLine className="w-3.5 h-3.5 text-primary/70" />
            <span className="text-[10px] tracking-[0.35em] uppercase text-primary/80 font-semibold">
              Passo 1 de 2
            </span>
          </div>
          <h1 className="text-3xl md:text-4xl">Sobre você</h1>
          <p className="text-[0.85rem] text-muted-foreground/70 leading-[1.7] max-w-sm mx-auto">
            Essas informações personalizam a leitura do seu padrão comportamental.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-card/80 backdrop-blur-sm rounded-2xl border border-border/60 p-8 space-y-5 shadow-sm">
          <div className="space-y-2">
            <label className="text-[0.8rem] font-medium text-foreground/80 tracking-wide">Nome</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              maxLength={100}
              className="flex h-12 w-full rounded-xl border border-input bg-background px-4 py-2 text-sm ring-offset-background placeholder:text-muted-foreground/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 transition-all"
              placeholder="Seu nome"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[0.8rem] font-medium text-foreground/80 tracking-wide">Data de nascimento</label>
            <input
              type="date"
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
              required
              max={new Date().toISOString().split('T')[0]}
              className="flex h-12 w-full rounded-xl border border-input bg-background px-4 py-2 text-sm ring-offset-background placeholder:text-muted-foreground/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 transition-all"
            />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="w-full h-12 bg-primary text-primary-foreground rounded-xl text-[0.9rem] font-semibold tracking-[0.02em] hover:opacity-90 transition-all duration-300 shadow-[0_6px_24px_-4px_hsl(var(--primary)/0.3)] disabled:opacity-50"
          >
            {submitting ? 'Salvando...' : 'Continuar para a leitura'}
          </button>
        </form>
      </motion.div>
    </div>
  );
};

export default Onboarding;
