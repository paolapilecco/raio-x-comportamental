import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { questions as defaultQuestions } from '@/data/questions';
import { Answer } from '@/types/diagnostic';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface QuestionItem {
  id: number;
  text: string;
  context?: string | null;
  type?: string;
  options?: string[] | null;
}

interface QuestionnaireProps {
  onComplete: (answers: Answer[]) => void;
  questions?: QuestionItem[];
}

const LIKERT_LABELS = [
  'Discordo totalmente',
  'Discordo',
  'Neutro',
  'Concordo',
  'Concordo totalmente',
];

const FREQUENCY_LABELS = [
  'Nunca',
  'Raramente',
  'Às vezes',
  'Frequentemente',
  'Sempre',
];

function getResponseLabels(question: QuestionItem): string[] {
  const type = question.type || 'likert';
  // If the question has custom options configured, always use them
  if (question.options && question.options.length >= 2) {
    return question.options;
  }
  if (type === 'frequency') return FREQUENCY_LABELS;
  return LIKERT_LABELS;
}

function getScaleLabel(type: string | undefined): string {
  switch (type) {
    case 'frequency': return 'Com que frequência?';
    case 'behavior_choice': return 'O que você faria?';
    case 'intensity': return 'Avalie de 0 a 10';
    default: return 'Quanto você concorda?';
  }
}

const Questionnaire = ({ onComplete, questions: questionsProp }: QuestionnaireProps) => {
  const questions: QuestionItem[] = questionsProp || defaultQuestions;
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [direction, setDirection] = useState(1);

  const question = questions[currentIndex];
  const progress = ((Object.keys(answers).length) / questions.length) * 100;
  const responseLabels = getResponseLabels(question);
  const currentAnswer = answers[question.id];
  const canGoNext = currentAnswer !== undefined;
  const isLast = currentIndex === questions.length - 1;

  const handleSelect = (value: number) => {
    setAnswers((prev) => ({ ...prev, [question.id]: value }));
  };

  const handleNext = () => {
    if (!canGoNext) return;
    if (isLast) {
      const allAnswers: Answer[] = questions.map((q) => ({
        questionId: q.id,
        value: answers[q.id],
      }));
      onComplete(allAnswers);
    } else {
      setDirection(1);
      setCurrentIndex((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setDirection(-1);
      setCurrentIndex((prev) => prev - 1);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-12" role="main" aria-label="Questionário">
      <div className="w-full max-w-lg space-y-10">

        {/* Progress */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-xs font-light text-muted-foreground tracking-wide" aria-live="polite">
              Pergunta {currentIndex + 1} de {questions.length}
            </span>
            <span className="text-xs font-light text-muted-foreground/50">
              {Math.round(progress)}%
            </span>
          </div>
          <div className="h-[3px] rounded-full bg-border/60 overflow-hidden" role="progressbar" aria-valuenow={Math.round(progress)} aria-valuemin={0} aria-valuemax={100}>
            <motion.div
              className="h-full rounded-full bg-primary"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
            />
          </div>
        </div>

        {/* Question card */}
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={question.id}
            custom={direction}
            initial={{ opacity: 0, y: direction * 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: direction * -12 }}
            transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="space-y-8"
          >
            {/* Question text — centered, prominent */}
            <div className="text-center space-y-3 py-2">
              <p
                className="text-xl sm:text-2xl font-medium text-foreground leading-snug tracking-tight"
                id={`question-${question.id}`}
              >
                {question.text}
              </p>
              {question.context && (
                <p className="text-sm text-muted-foreground/70 italic leading-relaxed max-w-md mx-auto">
                  {question.context}
                </p>
              )}
              <p className="text-xs font-light text-muted-foreground/50 uppercase tracking-widest">
                {getScaleLabel(question.type)}
              </p>
            </div>

            {/* Response options */}
            <div className="space-y-3" role="radiogroup" aria-labelledby={`question-${question.id}`}>
              {responseLabels.map((label, index) => {
                const value = index + 1;
                const isSelected = currentAnswer === value;
                return (
                  <motion.button
                    key={value}
                    onClick={() => handleSelect(value)}
                    role="radio"
                    aria-checked={isSelected}
                    whileTap={{ scale: 0.98 }}
                    className={`w-full text-left px-5 py-4 rounded-2xl border transition-all duration-200 ease-out text-sm ${
                      isSelected
                        ? 'border-primary bg-primary/[0.06] text-foreground font-medium shadow-sm'
                        : 'border-border/40 hover:border-primary/20 hover:bg-secondary/30 text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <span className="inline-flex items-center gap-4">
                      <span
                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all duration-200 ${
                          isSelected ? 'border-primary bg-primary/10' : 'border-border/60'
                        }`}
                        aria-hidden="true"
                      >
                        {isSelected && (
                          <motion.span
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                            className="w-2.5 h-2.5 rounded-full bg-primary"
                          />
                        )}
                      </span>
                      <span className="leading-relaxed">{label}</span>
                    </span>
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Navigation */}
        <div className="flex justify-between items-center pt-2">
          <button
            onClick={handlePrev}
            disabled={currentIndex === 0}
            aria-label="Pergunta anterior"
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground disabled:opacity-20 disabled:cursor-not-allowed transition-all duration-200"
          >
            <ChevronLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Anterior</span>
          </button>

          <motion.button
            onClick={handleNext}
            disabled={!canGoNext}
            aria-label={isLast ? 'Ver resultado' : 'Próxima pergunta'}
            whileTap={canGoNext ? { scale: 0.97 } : {}}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
              canGoNext
                ? 'bg-primary text-primary-foreground hover:brightness-90 shadow-sm'
                : 'bg-muted text-muted-foreground/30 cursor-not-allowed'
            }`}
          >
            {isLast ? 'Ver resultado' : 'Próxima'}
            {!isLast && <ChevronRight className="w-4 h-4" />}
          </motion.button>
        </div>
      </div>
    </div>
  );
};

export default Questionnaire;
