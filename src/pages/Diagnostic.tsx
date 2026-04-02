import { useState, useCallback, useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import Questionnaire from '@/components/diagnostic/Questionnaire';
import AnalyzingScreen from '@/components/diagnostic/AnalyzingScreen';
import Report from '@/components/diagnostic/Report';
import { Answer, DiagnosticResult } from '@/types/diagnostic';
import { analyzeAnswers } from '@/lib/analysis';
import { updateCentralProfile } from '@/lib/centralProfile';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';

type Step = 'questionnaire' | 'analyzing' | 'report';

const Diagnostic = () => {
  const [step, setStep] = useState<Step>('questionnaire');
  const [result, setResult] = useState<DiagnosticResult | null>(null);
  const [moduleId, setModuleId] = useState<string | null>(null);
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const { moduleSlug } = useParams();

  useEffect(() => {
    // Resolve module ID from slug
    const fetchModule = async () => {
      if (!moduleSlug) return;
      const { data } = await supabase
        .from('test_modules')
        .select('id')
        .eq('slug', moduleSlug)
        .maybeSingle();
      if (data) setModuleId(data.id);
    };
    fetchModule();
  }, [moduleSlug]);

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

      // Update central profile with aggregated data
      await updateCentralProfile(user.id);

    } catch (err) {
      console.error('Error saving diagnostic:', err);
      toast.error('Erro ao salvar diagnóstico, mas seu resultado está disponível.');
    }
  }, [user, moduleId]);

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
  }, [saveToDatabase]);

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
