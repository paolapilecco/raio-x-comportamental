import { useState, useCallback, useEffect, useRef } from 'react';
import { AnimatePresence } from 'framer-motion';
import Questionnaire from '@/components/diagnostic/Questionnaire';
import AnalyzingScreen from '@/components/diagnostic/AnalyzingScreen';
import Report from '@/components/diagnostic/Report';
import { Answer, DiagnosticResult } from '@/types/diagnostic';
import { analyzeAnswers } from '@/lib/analysis';
import { analyzePurposeAnswers } from '@/lib/purposeAnalysis';
import { analyzeGenericTest } from '@/lib/genericAnalysis';
import { getTestEngine } from '@/lib/testEngineRegistry';
import { updateCentralProfile } from '@/lib/centralProfile';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';

type Step = 'loading' | 'questionnaire' | 'analyzing' | 'report';

const PURPOSE_SLUG = 'proposito-sentido';
const BEHAVIORAL_SLUG = 'padrao-comportamental';

interface DbQuestion {
  id: number;
  text: string;
  axes: string[];
  type?: 'likert' | 'behavior_choice' | 'frequency' | 'intensity';
}

const Diagnostic = () => {
  const [step, setStep] = useState<Step>('loading');
  const [result, setResult] = useState<DiagnosticResult | null>(null);
  const [moduleId, setModuleId] = useState<string | null>(null);
  const [dbQuestions, setDbQuestions] = useState<DbQuestion[]>([]);
  const { user, isPremium, isSuperAdmin } = useAuth();
  const navigate = useNavigate();
  const { moduleSlug } = useParams();

  const slug = moduleSlug || BEHAVIORAL_SLUG;
  const isFreeTest = slug === BEHAVIORAL_SLUG;
  const canAccessTest = isSuperAdmin || isPremium || isFreeTest;

  useEffect(() => {
    if (!canAccessTest) {
      toast.error('Este teste requer o plano Premium');
      navigate('/tests');
    }
  }, [canAccessTest, navigate]);

  useEffect(() => {
    const fetchModuleAndQuestions = async () => {
      const { data: mod } = await supabase
        .from('test_modules')
        .select('id')
        .eq('slug', slug)
        .maybeSingle();

      if (!mod) {
        toast.error('Teste não encontrado');
        navigate('/tests');
        return;
      }

      setModuleId(mod.id);

      const { data: questions, error } = await supabase
        .from('questions')
        .select('sort_order, text, axes, type')
        .eq('test_id', mod.id)
        .order('sort_order', { ascending: true });

      if (error || !questions || questions.length === 0) {
        if (isSuperAdmin) {
          toast.error('Este teste ainda não possui estrutura completa de perguntas');
        } else {
          toast.error('Teste indisponível no momento');
        }
        navigate('/tests');
        return;
      }

      // Minimum question threshold
      const MIN_QUESTIONS = 10;
      if (questions.length < MIN_QUESTIONS) {
        if (isSuperAdmin) {
          toast.error(`Este teste possui apenas ${questions.length} perguntas (mínimo: ${MIN_QUESTIONS}). Estrutura incompleta.`);
        } else {
          toast.error('Teste indisponível no momento');
        }
        navigate('/tests');
        return;
      }

      // Integrity check: ensure all questions have axes
      const missingAxes = questions.filter(q => !q.axes || q.axes.length === 0);
      if (missingAxes.length > 0) {
        console.warn(`[Diagnostic] ${missingAxes.length} questions without axes in module "${slug}"`);
        if (missingAxes.length > questions.length * 0.5) {
          if (isSuperAdmin) {
            toast.error(`Mais de 50% das perguntas sem eixos configurados. Teste bloqueado.`);
          } else {
            toast.error('Teste indisponível no momento');
          }
          navigate('/tests');
          return;
        }
      }

      // Integrity check: detect duplicate question texts
      const texts = questions.map(q => q.text);
      const uniqueTexts = new Set(texts);
      if (uniqueTexts.size !== texts.length) {
        console.warn(`[Diagnostic] ${texts.length - uniqueTexts.size} duplicate questions detected in module "${slug}"`);
      }

      setDbQuestions(questions.map((q, i) => ({
        id: q.sort_order || i + 1,
        text: q.text,
        axes: q.axes || [],
        type: (q as any).type || 'likert',
      })));
      setStep('questionnaire');
    };

    fetchModuleAndQuestions();
  }, [slug, navigate]);

  const saveToDatabase = useCallback(async (answers: Answer[], analysisResult: DiagnosticResult) => {
    if (!user) return;
    try {
      const sessionInsert: any = { user_id: user.id };
      if (moduleId) sessionInsert.test_module_id = moduleId;

      const { data: session, error: sessionError } = await supabase
        .from('diagnostic_sessions')
        .insert(sessionInsert)
        .select()
        .single();

      if (sessionError || !session) throw sessionError;

      const answerRows = answers.map(a => ({
        session_id: session.id,
        question_id: a.questionId,
        answer_value: a.value,
      }));

      await supabase.from('diagnostic_answers').insert(answerRows);

      await supabase.from('diagnostic_results').insert([{
        session_id: session.id,
        dominant_pattern: analysisResult.dominantPattern.key,
        secondary_patterns: analysisResult.secondaryPatterns.map(p => p.key),
        intensity: analysisResult.intensity,
        profile_name: analysisResult.profileName,
        mental_state: analysisResult.mentalState,
        state_summary: analysisResult.summary,
        mechanism: analysisResult.mechanism,
        triggers: analysisResult.triggers,
        traps: analysisResult.mentalTraps,
        self_sabotage_cycle: analysisResult.selfSabotageCycle,
        blocking_point: analysisResult.blockingPoint,
        contradiction: analysisResult.contradiction,
        life_impact: JSON.parse(JSON.stringify(analysisResult.lifeImpact)),
        exit_strategy: JSON.parse(JSON.stringify(analysisResult.exitStrategy)),
        all_scores: JSON.parse(JSON.stringify(analysisResult.allScores)),
        direction: analysisResult.direction,
        combined_title: analysisResult.combinedTitle,
      }]);

      await supabase
        .from('diagnostic_sessions')
        .update({ completed_at: new Date().toISOString() })
        .eq('id', session.id);

      await updateCentralProfile(user.id);
    } catch (err) {
      console.error('Error saving diagnostic:', err);
      toast.error('Erro ao salvar diagnóstico, mas seu resultado está disponível.');
    }
  }, [user, moduleId]);

  const runAnalysis = useCallback((answers: Answer[]): DiagnosticResult => {
    // 1. Purpose test has its own dedicated engine
    if (slug === PURPOSE_SLUG) {
      const r = analyzePurposeAnswers(answers);
      return {
        dominantPattern: { ...r.dominantPattern, key: r.dominantPattern.key as any },
        secondaryPatterns: r.secondaryPatterns.map(p => ({ ...p, key: p.key as any })),
        intensity: r.intensity,
        allScores: r.allScores as any,
        summary: r.summary,
        mechanism: r.mechanism,
        contradiction: r.contradiction,
        impact: r.impact,
        direction: r.direction,
        combinedTitle: r.combinedTitle,
        profileName: r.profileName,
        mentalState: r.mentalState,
        triggers: r.triggers,
        mentalTraps: r.mentalTraps,
        selfSabotageCycle: r.selfSabotageCycle,
        blockingPoint: r.blockingPoint,
        lifeImpact: r.lifeImpact,
        exitStrategy: r.exitStrategy,
        corePain: r.corePain,
        keyUnlockArea: r.keyUnlockArea,
        criticalDiagnosis: r.criticalDiagnosis,
        whatNotToDo: r.whatNotToDo,
      };
    }

    // 2. Check for module-specific engine (premium tests)
    const engine = getTestEngine(slug);
    if (engine) {
      return analyzeGenericTest(answers, dbQuestions, engine.axes, engine.definitions);
    }

    // 3. Default behavioral test engine
    return analyzeAnswers(answers);
  }, [slug, dbQuestions]);

  const handleComplete = useCallback((answers: Answer[]) => {
    setStep('analyzing');
    window.scrollTo({ top: 0, behavior: 'smooth' });

    setTimeout(() => {
      const analysisResult = runAnalysis(answers);
      setResult(analysisResult);
      setStep('report');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      saveToDatabase(answers, analysisResult);
    }, 2500);
  }, [saveToDatabase, runAnalysis]);

  const handleGoToDashboard = useCallback(() => {
    navigate('/dashboard');
  }, [navigate]);

  return (
    <div className="min-h-screen bg-background">
      <AnimatePresence mode="wait">
        {step === 'loading' && (
          <div key="loading" className="min-h-screen flex items-center justify-center">
            <div className="animate-pulse text-muted-foreground text-sm tracking-wide">Carregando perguntas...</div>
          </div>
        )}
        {step === 'questionnaire' && dbQuestions.length > 0 && (
          <Questionnaire
            key="q"
            onComplete={handleComplete}
            questions={dbQuestions}
          />
        )}
        {step === 'analyzing' && <AnalyzingScreen key="a" />}
        {step === 'report' && result && <Report key="r" result={result} onRestart={handleGoToDashboard} />}
      </AnimatePresence>
    </div>
  );
};

export default Diagnostic;
