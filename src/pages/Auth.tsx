import { useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { z } from 'zod';
import { lovable } from '@/integrations/lovable/index';

const emailSchema = z.string().trim().email('Email inválido').max(255);
const passwordSchema = z.string().min(6, 'Mínimo de 6 caracteres').max(128);

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const emailResult = emailSchema.safeParse(email);
    if (!emailResult.success) {
      toast.error(emailResult.error.errors[0].message);
      return;
    }
    const passwordResult = passwordSchema.safeParse(password);
    if (!passwordResult.success) {
      toast.error(passwordResult.error.errors[0].message);
      return;
    }

    setSubmitting(true);
    try {
      if (isLogin) {
        const { error } = await signIn(emailResult.data, password);
        if (error) {
          toast.error(error.message === 'Invalid login credentials' ? 'Email ou senha incorretos' : error.message);
        } else {
          navigate('/dashboard');
        }
      } else {
        const { error } = await signUp(emailResult.data, password);
        if (error) {
          toast.error(error.message);
        } else {
          toast.success('Conta criada! Complete seu perfil.');
          navigate('/onboarding');
        }
      }
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
            Mapa de Padrão Comportamental
          </p>
          <h1 className="text-3xl md:text-4xl">
            {isLogin ? 'Entrar' : 'Criar conta'}
          </h1>
          <p className="text-muted-foreground text-sm">
            {isLogin ? 'Acesse seu diagnóstico e acompanhe sua evolução.' : 'Comece sua jornada de autoconhecimento.'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-card rounded-xl border border-border p-8 space-y-5 shadow-sm">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              maxLength={255}
              className="flex h-11 w-full rounded-lg border border-input bg-background px-4 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              placeholder="seu@email.com"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Senha</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              maxLength={128}
              className="flex h-11 w-full rounded-lg border border-input bg-background px-4 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              placeholder="Mínimo 6 caracteres"
            />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="w-full h-11 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {submitting ? 'Aguarde...' : isLogin ? 'Entrar' : 'Criar conta'}
          </button>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          {isLogin ? 'Não tem conta?' : 'Já tem conta?'}{' '}
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="text-primary hover:underline font-medium"
          >
            {isLogin ? 'Criar conta' : 'Entrar'}
          </button>
        </p>
      </motion.div>
    </div>
  );
};

export default Auth;
