import { useState, useCallback } from 'react';
import { AnimatePresence } from 'framer-motion';
import LandingHero from '@/components/diagnostic/LandingHero';
import Questionnaire from '@/components/diagnostic/Questionnaire';
import AnalyzingScreen from '@/components/diagnostic/AnalyzingScreen';
import Report from '@/components/diagnostic/Report';
import { Answer, DiagnosticResult, DiagnosticStep } from '@/types/diagnostic';
import { analyzeAnswers } from '@/lib/analysis';

const Index = () => {
  const [step, setStep] = useState<DiagnosticStep>('landing');
  const [result, setResult] = useState<DiagnosticResult | null>(null);

  const handleStart = useCallback(() => {
    setStep('questionnaire');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleComplete = useCallback((answers: Answer[]) => {
    setStep('analyzing');
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Simulate analysis time for UX
    setTimeout(() => {
      const analysisResult = analyzeAnswers(answers);
      setResult(analysisResult);
      setStep('report');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 2500);
  }, []);

  const handleRestart = useCallback(() => {
    setResult(null);
    setStep('landing');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <AnimatePresence mode="wait">
        {step === 'landing' && <LandingHero key="landing" onStart={handleStart} />}
        {step === 'questionnaire' && <Questionnaire key="questionnaire" onComplete={handleComplete} />}
        {step === 'analyzing' && <AnalyzingScreen key="analyzing" />}
        {step === 'report' && result && <Report key="report" result={result} onRestart={handleRestart} />}
      </AnimatePresence>
    </div>
  );
};

export default Index;
