import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { questions as defaultQuestions } from '@/data/questions';
import { Answer } from '@/types/diagnostic';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface QuestionItem {
  id: number;
  text: string;
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
  if (type === 'behavior_choice' && question.options && question.options.length >= 2) {
    return question.options;
  }
  if (type === 'frequency') return FREQUENCY_LABELS;
  return LIKERT_LABELS;
}

function getScaleLabel(type: string | undefined): string {
  switch (type) {
    case 'frequency': return 'Com que frequência?';
    case 'behavior_choice': return 'O que você faria?';
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
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-8" role="main" aria-label="Questionário">
      <div className="w-full max-w-xl space-y-8">
        {/* Progress */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-xs font-light text-muted-foreground" aria-live="polite">
              {currentIndex + 1} de {questions.length}
            </span>
            <span className="text-xs font-light text-muted-foreground/60">
              {Math.round(progress)}%
            </span>
          </div>
          <div className="h-[2px] rounded-full bg-border overflow-hidden" role="progressbar" aria-valuenow={Math.round(progress)} aria-valuemin={0} aria-valuemax={100}>
            <motion.div
              className="h-full rounded-full bg-primary"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
            />
          </div>
        </div>

        {/* Question */}
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={question.id}
            custom={direction}
            initial={{ opacity: 0, x: direction * 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: direction * -30 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="border border-border rounded-lg p-6 sm:p-8 bg-card"
          >
            <p className="text-base sm:text-lg font-medium text-foreground leading-relaxed tracking-tight" id={`question-${question.id}`}>
              {question.text}
            </p>

            <p className="mt-5 mb-3 text-xs font-light text-muted-foreground/60 uppercase tracking-wider">
              {getScaleLabel(question.type)}
            </p>

            <div className="space-y-2" role="radiogroup" aria-labelledby={`question-${question.id}`}>
              {responseLabels.map((label, index) => {
                const value = index + 1;
                const isSelected = currentAnswer === value;
                return (
                  <button
                    key={value}
                    onClick={() => handleSelect(value)}
                    role="radio"
                    aria-checked={isSelected}
                    className={`w-full text-left px-4 py-3 rounded-lg border transition-colors text-sm ${
                      isSelected
                        ? 'border-primary bg-primary/[0.04] text-foreground font-medium'
                        : 'border-border hover:border-primary/30 text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <span className="inline-flex items-center gap-3">
                      <span
                        className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                          isSelected ? 'border-primary' : 'border-border'
                        }`}
                        aria-hidden="true"
                      >
                        {isSelected && (
                          <motion.span
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="w-2 h-2 rounded-full bg-primary"
                          />
                        )}
                      </span>
                      {label}
                    </span>
                  </button>
                );
              })}
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Navigation */}
        <div className="flex justify-between items-center">
          <button
            onClick={handlePrev}
            disabled={currentIndex === 0}
            aria-label="Pergunta anterior"
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Anterior</span>
          </button>
          <button
            onClick={handleNext}
            disabled={!canGoNext}
            aria-label={isLast ? 'Ver resultado' : 'Próxima pergunta'}
            className={`flex items-center gap-1.5 px-5 py-2.5 rounded-lg text-sm font-medium transition-opacity ${
              canGoNext
                ? 'bg-primary text-primary-foreground hover:opacity-90'
                : 'bg-muted text-muted-foreground/40 cursor-not-allowed'
            }`}
          >
            {isLast ? 'Ver resultado' : 'Próxima'}
            {!isLast && <ChevronRight className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Questionnaire;
