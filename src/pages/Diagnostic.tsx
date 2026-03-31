import { useState, useCallback } from 'react';
import { AnimatePresence } from 'framer-motion';
import Questionnaire from '@/components/diagnostic/Questionnaire';
import AnalyzingScreen from '@/components/diagnostic/AnalyzingScreen';
import Report from '@/components/diagnostic/Report';
import { Answer, DiagnosticResult } from '@/types/diagnostic';
import { analyzeAnswers } from '@/lib/analysis';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

type Step = 'questionnaire' | 'analyzing' | 'report';

const Diagnostic = () => {
  const [step, setStep] = useState<Step>('questionnaire');
  const [result, setResult] = useState<DiagnosticResult | null>(null);
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  const saveToDatabase = useCallback(async (answers: Answer[], analysisResult: DiagnosticResult) => {
    if (!user) return;

    try {
      // Create session
      const { data: session, error: sessionError } = await supabase
        .from('diagnostic_sessions')
        .insert({ user_id: user.id })
        .select()
        .single();

      if (sessionError || !session) throw sessionError;

      // Save answers
      const answerRows = answers.map(a => ({
        session_id: session.id,
        question_id: a.questionId,
        answer_value: a.value,
      }));

      await supabase.from('diagnostic_answers').insert(answerRows);

      // Save result
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
        life_impact: analysisResult.lifeImpact,
        exit_strategy: analysisResult.exitStrategy,
        all_scores: analysisResult.allScores,
        direction: analysisResult.direction,
        combined_title: analysisResult.combinedTitle,
      }]);

      // Mark session complete
      await supabase
        .from('diagnostic_sessions')
        .update({ completed_at: new Date().toISOString() })
        .eq('id', session.id);

    } catch (err) {
      console.error('Error saving diagnostic:', err);
      toast.error('Erro ao salvar diagnóstico, mas seu resultado está disponível.');
    }
  }, [user]);

  const handleComplete = useCallback((answers: Answer[]) => {
    setStep('analyzing');
    window.scrollTo({ top: 0, behavior: 'smooth' });

    setTimeout(() => {
      const analysisResult = analyzeAnswers(answers);
      setResult(analysisResult);
      setStep('report');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      saveToDatabase(answers, analysisResult);
    }, 2500);
  }, [saveToDatabase, profile]);

  const handleGoToDashboard = useCallback(() => {
    navigate('/dashboard');
  }, [navigate]);

  return (
    <div className="min-h-screen bg-background">
      <AnimatePresence mode="wait">
        {step === 'questionnaire' && <Questionnaire key="q" onComplete={handleComplete} />}
        {step === 'analyzing' && <AnalyzingScreen key="a" />}
        {step === 'report' && result && <Report key="r" result={result} onRestart={handleGoToDashboard} />}
      </AnimatePresence>
    </div>
  );
};

export default Diagnostic;
