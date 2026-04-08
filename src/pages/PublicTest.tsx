import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import Questionnaire from '@/components/diagnostic/Questionnaire';
import AnalyzingScreen from '@/components/diagnostic/AnalyzingScreen';
import { Answer } from '@/types/diagnostic';
import { CheckCircle, AlertTriangle, Brain } from 'lucide-react';

interface DbQuestion {
  id: number;
  text: string;
  axes: string[];
  type?: string;
  options?: string[] | null;
  option_scores?: number[] | null;
  context?: string | null;
}

type Step = 'loading' | 'intro' | 'questionnaire' | 'analyzing' | 'done' | 'error';

export default function PublicTest() {
  const { token } = useParams<{ token: string }>();
  const [step, setStep] = useState<Step>('loading');
  const [questions, setQuestions] = useState<DbQuestion[]>([]);
  const [testName, setTestName] = useState('');
  const [personName, setPersonName] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!token) { setErrorMsg('Link inválido.'); setStep('error'); return; }
    loadInvite();
  }, [token]);

  const loadInvite = async () => {
    // Validate token via edge function (no direct DB access for anon)
    const { data: inviteData, error: inviteErr } = await supabase.functions.invoke('validate-invite', {
      body: null,
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    // Use fetch directly since supabase.functions.invoke doesn't support query params well for GET
    const baseUrl = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1`;
    let inviteInfo: any = null;
    try {
      const resp = await fetch(`${baseUrl}/validate-invite?token=${token}`, {
        headers: { apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY },
      });
      inviteInfo = await resp.json();
      if (!resp.ok || inviteInfo.error) {
        setErrorMsg(inviteInfo.error || 'Link inválido.');
        setStep('error');
        return;
      }
    } catch {
      setErrorMsg('Erro ao validar link.');
      setStep('error');
      return;
    }

    setTestName(inviteInfo.testName || 'Diagnóstico');

    // Fetch questions (anon can read questions table)
    const { data: qs, error: qErr } = await supabase
      .from('questions')
      .select('sort_order, text, axes, type, options, option_scores, context')
      .eq('test_id', inviteInfo.testModuleId)
      .order('sort_order', { ascending: true });

    if (qErr || !qs || qs.length === 0) {
      setErrorMsg('Teste indisponível no momento.');
      setStep('error');
      return;
    }

    setQuestions(qs.map((q, i) => ({
      id: q.sort_order || i + 1,
      text: q.text,
      axes: q.axes || [],
      type: q.type || 'likert',
      options: q.options,
      option_scores: q.option_scores,
      context: q.context || null,
    })));

    setStep('intro');
  };

  const handleComplete = useCallback(async (answers: Answer[]) => {
    setStep('analyzing');
    window.scrollTo({ top: 0, behavior: 'smooth' });

    try {
      const { data, error } = await supabase.functions.invoke('submit-public-test', {
        body: {
          token,
          answers: answers.map(a => ({ questionId: a.questionId, value: a.value })),
        },
      });

      if (error || data?.error) {
        console.error('Submit error:', error || data?.error);
        setErrorMsg('Erro ao enviar respostas. Tente novamente.');
        setStep('error');
        return;
      }

      setStep('done');
    } catch (e) {
      console.error('Submit error:', e);
      setErrorMsg('Erro ao enviar respostas.');
      setStep('error');
    }
  }, [token]);

  return (
    <div className="min-h-screen bg-background">
      <AnimatePresence mode="wait">
        {step === 'loading' && (
          <div key="loading" className="min-h-screen flex items-center justify-center">
            <div className="animate-pulse text-muted-foreground text-sm">Carregando...</div>
          </div>
        )}

        {step === 'error' && (
          <motion.div
            key="error"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="min-h-screen flex items-center justify-center px-4"
          >
            <div className="text-center max-w-md space-y-4">
              <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mx-auto">
                <AlertTriangle className="w-8 h-8 text-red-500" />
              </div>
              <h2 className="text-xl font-serif text-foreground">{errorMsg}</h2>
              <p className="text-sm text-muted-foreground">
                Se você acredita que isso é um erro, entre em contato com sua profissional.
              </p>
            </div>
          </motion.div>
        )}

        {step === 'intro' && (
          <motion.div
            key="intro"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="min-h-screen flex items-center justify-center px-4"
          >
            <div className="text-center max-w-md space-y-6">
              <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                <Brain className="w-10 h-10 text-primary" />
              </div>
              <div className="space-y-2">
                <h1 className="text-2xl font-serif text-foreground">{testName}</h1>
                <p className="text-sm text-muted-foreground">
                  Sua profissional preparou este teste para você. Responda com sinceridade — não existe resposta certa ou errada.
                </p>
              </div>
              <div className="bg-card border rounded-xl p-4 text-left space-y-2">
                <p className="text-xs text-muted-foreground">📋 {questions.length} perguntas</p>
                <p className="text-xs text-muted-foreground">⏱️ Tempo estimado: {Math.ceil(questions.length * 0.5)} minutos</p>
                <p className="text-xs text-muted-foreground">🔒 Suas respostas são confidenciais</p>
              </div>
              <button
                onClick={() => setStep('questionnaire')}
                className="w-full py-3 px-6 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-colors"
              >
                Iniciar Teste
              </button>
            </div>
          </motion.div>
        )}

        {step === 'questionnaire' && questions.length > 0 && (
          <Questionnaire key="q" onComplete={handleComplete} questions={questions} />
        )}

        {step === 'analyzing' && <AnalyzingScreen key="a" />}

        {step === 'done' && (
          <motion.div
            key="done"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="min-h-screen flex items-center justify-center px-4"
          >
            <div className="text-center max-w-md space-y-4">
              <div className="w-20 h-20 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto">
                <CheckCircle className="w-10 h-10 text-emerald-500" />
              </div>
              <h2 className="text-2xl font-serif text-foreground">Teste Concluído!</h2>
              <p className="text-sm text-muted-foreground">
                Suas respostas foram enviadas com sucesso. Sua profissional analisará seus resultados e entrará em contato.
              </p>
              <div className="bg-card border rounded-xl p-4 mt-4">
                <p className="text-xs text-muted-foreground">
                  Você pode fechar esta página. Os resultados estarão disponíveis para sua profissional.
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
