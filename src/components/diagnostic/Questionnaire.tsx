import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { questions } from '@/data/questions';
import { Answer } from '@/types/diagnostic';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface QuestionnaireProps {
  onComplete: (answers: Answer[]) => void;
}

const scaleLabels = [
  'Discordo totalmente',
  'Discordo',
  'Neutro',
  'Concordo',
  'Concordo totalmente',
];

const Questionnaire = ({ onComplete }: QuestionnaireProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [direction, setDirection] = useState(1);

  const question = questions[currentIndex];
  const progress = ((Object.keys(answers).length) / questions.length) * 100;
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
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-8">
      <div className="w-full max-w-xl space-y-8">
        {/* Progress */}
        <div className="space-y-2">
          <div className="flex justify-between items-center text-xs text-subtle">
            <span>Pergunta {currentIndex + 1} de {questions.length}</span>
            <span>{Math.round(progress)}% concluído</span>
          </div>
          <div className="h-1 rounded-full bg-border overflow-hidden">
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
            initial={{ opacity: 0, x: direction * 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: direction * -40 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="bg-card rounded-xl p-8 border border-border shadow-sm"
          >
            <p className="text-lg md:text-xl leading-relaxed font-medium text-foreground">
              {question.text}
            </p>

            <div className="mt-8 space-y-3">
              {scaleLabels.map((label, index) => {
                const value = index + 1;
                const isSelected = currentAnswer === value;
                return (
                  <button
                    key={value}
                    onClick={() => handleSelect(value)}
                    className={`w-full text-left px-5 py-3.5 rounded-lg border transition-all duration-200 text-sm ${
                      isSelected
                        ? 'border-primary bg-primary/5 text-foreground font-medium'
                        : 'border-border hover:border-primary/30 text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <span className="inline-flex items-center gap-3">
                      <span
                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                          isSelected ? 'border-primary' : 'border-border'
                        }`}
                      >
                        {isSelected && (
                          <motion.span
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="w-2.5 h-2.5 rounded-full bg-primary"
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
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            Anterior
          </button>
          <button
            onClick={handleNext}
            disabled={!canGoNext}
            className={`flex items-center gap-1 px-6 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
              canGoNext
                ? 'bg-primary text-primary-foreground hover:opacity-90'
                : 'bg-muted text-muted-foreground cursor-not-allowed'
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
