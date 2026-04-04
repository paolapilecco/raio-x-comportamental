import { useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { z } from 'zod';
import { lovable } from '@/integrations/lovable/index';
import { ArrowRight } from 'lucide-react';

const emailSchema = z.string().trim().email('Email inválido').max(255);
const passwordSchema = z.string().min(6, 'Mínimo de 6 caracteres').max(128);

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [forgotMode, setForgotMode] = useState(false);
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const emailResult = emailSchema.safeParse(email);
    if (!emailResult.success) {
      toast.error(emailResult.error.errors[0].message);
      return;
    }

    if (forgotMode) {
      setSubmitting(true);
      const { error } = await supabase.auth.resetPasswordForEmail(emailResult.data, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      setSubmitting(false);
      if (error) {
        toast.error('Erro ao enviar email de recuperação. Tente novamente.');
      } else {
        toast.success('Email de recuperação enviado! Verifique sua caixa de entrada.');
        setForgotMode(false);
      }
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
          const msg = error.message?.includes('already registered')
            ? 'Este email já está cadastrado'
            : 'Erro ao criar conta. Tente novamente.';
          toast.error(msg);
        } else {
          toast.success('Conta criada! Verifique seu email para confirmar o cadastro.');
        }
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12" role="main" aria-label="Autenticação">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-sm space-y-8"
      >
        {/* Header */}
        <div className="text-center space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest">Raio-X</p>
          <h1 className="text-2xl font-semibold tracking-tight">
            {forgotMode ? 'Recuperar senha' : isLogin ? 'Entrar' : 'Criar conta'}
          </h1>
          <p className="text-sm text-muted-foreground">
            {forgotMode
              ? 'Enviaremos um link para redefinir sua senha.'
              : isLogin
              ? 'Acesse sua leitura comportamental.'
              : 'Comece sua jornada de autoconhecimento.'}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div className="space-y-1.5">
            <label htmlFor="auth-email" className="text-sm font-medium text-foreground">
              Email
            </label>
            <input
              id="auth-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              maxLength={255}
              autoComplete="email"
              className="flex h-10 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 transition-colors"
              placeholder="seu@email.com"
            />
          </div>
          {!forgotMode && (
            <div className="space-y-1.5">
              <label htmlFor="auth-password" className="text-sm font-medium text-foreground">
                Senha
              </label>
              <input
                id="auth-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                maxLength={128}
                autoComplete={isLogin ? 'current-password' : 'new-password'}
                className="flex h-10 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 transition-colors"
                placeholder="Mínimo 6 caracteres"
              />
              {isLogin && (
                <button
                  type="button"
                  onClick={() => setForgotMode(true)}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  Esqueci minha senha
                </button>
              )}
            </div>
          )}
          <button
            type="submit"
            disabled={submitting}
            className="w-full h-10 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {submitting ? (
              <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
            ) : (
              <>
                {forgotMode ? 'Enviar link' : isLogin ? 'Entrar' : 'Criar conta'}
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>

          {!forgotMode && (
            <>
              <div className="relative my-2">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-background px-3 text-muted-foreground/50">ou</span>
                </div>
              </div>

              <button
                type="button"
                onClick={async () => {
                  const result = await lovable.auth.signInWithOAuth("google", {
                    redirect_uri: window.location.origin,
                  });
                  if (result.error) {
                    toast.error('Erro ao entrar com Google');
                  } else if (!result.redirected) {
                    navigate('/dashboard');
                  }
                }}
                className="w-full h-10 border border-border rounded-lg text-sm font-medium text-foreground/70 hover:bg-secondary transition-colors flex items-center justify-center gap-2.5"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Google
              </button>
            </>
          )}
        </form>

        {/* Footer */}
        <p className="text-center text-sm text-muted-foreground">
          {forgotMode ? (
            <button onClick={() => setForgotMode(false)} className="text-foreground hover:underline font-medium transition-colors">
              Voltar ao login
            </button>
          ) : (
            <>
              {isLogin ? 'Não tem conta?' : 'Já tem conta?'}{' '}
              <button onClick={() => setIsLogin(!isLogin)} className="text-foreground hover:underline font-medium transition-colors">
                {isLogin ? 'Criar conta' : 'Entrar'}
              </button>
            </>
          )}
        </p>
      </motion.div>
    </div>
  );
};

export default Auth;
