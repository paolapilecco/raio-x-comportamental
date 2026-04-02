import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { z } from 'zod';
import { ScanLine } from 'lucide-react';

const passwordSchema = z.string().min(6, 'Mínimo de 6 caracteres').max(128);

const ResetPassword = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [ready, setReady] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const hash = window.location.hash;
    if (hash.includes('type=recovery')) {
      setReady(true);
    } else {
      supabase.auth.onAuthStateChange((event) => {
        if (event === 'PASSWORD_RECOVERY') setReady(true);
      });
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = passwordSchema.safeParse(password);
    if (!result.success) {
      toast.error(result.error.errors[0].message);
      return;
    }
    if (password !== confirmPassword) {
      toast.error('As senhas não coincidem');
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.auth.updateUser({ password });
    setSubmitting(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success('Senha atualizada com sucesso!');
      navigate('/dashboard');
    }
  };

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Verificando link de recuperação...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-16">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="w-full max-w-md space-y-10">
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-2.5 px-5 py-2 rounded-full border border-primary/12 bg-primary/[0.03]">
            <ScanLine className="w-3.5 h-3.5 text-primary/70" />
            <span className="text-[10px] tracking-[0.35em] uppercase text-primary/80 font-semibold">Redefinir Senha</span>
          </div>
          <h1 className="text-3xl md:text-4xl">Nova senha</h1>
          <p className="text-[0.85rem] text-muted-foreground/70 leading-[1.7] max-w-sm mx-auto">
            Digite sua nova senha abaixo.
          </p>
        </div>
        <form onSubmit={handleSubmit} className="bg-card/80 backdrop-blur-sm rounded-2xl border border-border/60 p-8 space-y-5 shadow-sm">
          <div className="space-y-2">
            <label className="text-[0.8rem] font-medium text-foreground/80 tracking-wide">Nova senha</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} maxLength={128} className="flex h-12 w-full rounded-xl border border-input bg-background px-4 py-2 text-sm ring-offset-background placeholder:text-muted-foreground/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 transition-all" placeholder="Mínimo 6 caracteres" />
          </div>
          <div className="space-y-2">
            <label className="text-[0.8rem] font-medium text-foreground/80 tracking-wide">Confirmar senha</label>
            <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required minLength={6} maxLength={128} className="flex h-12 w-full rounded-xl border border-input bg-background px-4 py-2 text-sm ring-offset-background placeholder:text-muted-foreground/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 transition-all" placeholder="Repita a senha" />
          </div>
          <button type="submit" disabled={submitting} className="w-full h-12 bg-primary text-primary-foreground rounded-xl text-[0.9rem] font-semibold tracking-[0.02em] hover:opacity-90 transition-all duration-300 shadow-[0_6px_24px_-4px_hsl(var(--primary)/0.3)] disabled:opacity-50">
            {submitting ? 'Aguarde...' : 'Redefinir senha'}
          </button>
        </form>
      </motion.div>
    </div>
  );
};

export default ResetPassword;
