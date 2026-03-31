import { useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { z } from 'zod';

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
        className="w-full max-w-md space-y-8"
      >
        <div className="text-center space-y-2">
          <p className="text-sm tracking-[0.25em] uppercase text-subtle font-medium">
            Passo 1 de 2
          </p>
          <h1 className="text-3xl md:text-4xl">Sobre você</h1>
          <p className="text-muted-foreground text-sm">
            Essas informações ajudam a personalizar seu diagnóstico.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-card rounded-xl border border-border p-8 space-y-5 shadow-sm">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Nome</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              maxLength={100}
              className="flex h-11 w-full rounded-lg border border-input bg-background px-4 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              placeholder="Seu nome"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Data de nascimento</label>
            <input
              type="date"
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
              required
              max={new Date().toISOString().split('T')[0]}
              className="flex h-11 w-full rounded-lg border border-input bg-background px-4 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="w-full h-11 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {submitting ? 'Salvando...' : 'Continuar para o diagnóstico'}
          </button>
        </form>
      </motion.div>
    </div>
  );
};

export default Onboarding;
