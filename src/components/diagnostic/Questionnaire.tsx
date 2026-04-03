import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { questions as defaultQuestions } from '@/data/questions';
import { Answer } from '@/types/diagnostic';
import { ChevronLeft, ChevronRight } from 'lucide-react';

type QuestionType = 'likert' | 'behavior_choice' | 'frequency' | 'intensity';

interface QuestionItem {
  id: number;
  text: string;
  type?: QuestionType;
  options?: string[];
}

interface QuestionnaireProps {
  onComplete: (answers: Answer[]) => void;
  questions?: QuestionItem[];
}

const labelsByType: Record<QuestionType, string[]> = {
  likert: [
    'Discordo totalmente',
    'Discordo',
    'Neutro',
    'Concordo',
    'Concordo totalmente',
  ],
  frequency: [
    'Nunca',
    'Raramente',
    'Às vezes',
    'Frequentemente',
    'Sempre',
  ],
  intensity: [
    'Muito baixo',
    'Baixo',
    'Médio',
    'Alto',
    'Muito alto',
  ],
  behavior_choice: [
    'Opção A',
    'Opção B',
    'Opção C',
    'Opção D',
    'Opção E',
  ],
};

const typeHeaders: Record<QuestionType, string> = {
  likert: 'Quanto você concorda?',
  frequency: 'Com que frequência isso acontece?',
  intensity: 'Qual a intensidade?',
  behavior_choice: 'Qual comportamento mais se aproxima do seu?',
};

const Questionnaire = ({ onComplete, questions: questionsProp }: QuestionnaireProps) => {
  const questions: QuestionItem[] = questionsProp || defaultQuestions;
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [direction, setDirection] = useState(1);

  const question = questions[currentIndex];
  const questionType: QuestionType = question.type || 'likert';
  const labels = labelsByType[questionType];
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
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-[10px] tracking-[0.3em] uppercase text-primary/60 font-semibold">
              Leitura {currentIndex + 1} de {questions.length}
            </span>
            <span className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground/50 font-medium">
              {Math.round(progress)}% concluído
            </span>
          </div>
          <div className="h-[3px] rounded-full bg-border/60 overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-primary/80"
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
            className="bg-card/80 backdrop-blur-sm rounded-2xl p-8 border border-border/60 shadow-sm"
          >
            <p className="text-[1.1rem] md:text-[1.2rem] leading-[1.65] font-medium text-foreground/90 tracking-[-0.01em]">
              {question.text}
            </p>

            <p className="mt-4 mb-2 text-[0.72rem] tracking-[0.15em] uppercase text-muted-foreground/50 font-semibold">
              {typeHeaders[questionType]}
            </p>

            <div className="mt-4 space-y-2.5">
              {labels.map((label, index) => {
                const value = index + 1;
                const isSelected = currentAnswer === value;
                return (
                  <button
                    key={value}
                    onClick={() => handleSelect(value)}
                    className={`w-full text-left px-5 py-3.5 rounded-xl border transition-all duration-200 text-[0.85rem] ${
                      isSelected
                        ? 'border-primary/40 bg-primary/[0.05] text-foreground font-medium'
                        : 'border-border/50 hover:border-primary/20 text-muted-foreground/70 hover:text-foreground/80'
                    }`}
                  >
                    <span className="inline-flex items-center gap-3.5">
                      <span
                        className={`w-[18px] h-[18px] rounded-full border-2 flex items-center justify-center transition-all ${
                          isSelected ? 'border-primary' : 'border-border/60'
                        }`}
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
            className="flex items-center gap-1.5 text-[0.82rem] text-muted-foreground/60 hover:text-foreground/80 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            Anterior
          </button>
          <button
            onClick={handleNext}
            disabled={!canGoNext}
            className={`flex items-center gap-1.5 px-7 py-3 rounded-xl text-[0.85rem] font-semibold tracking-[0.02em] transition-all duration-300 ${
              canGoNext
                ? 'bg-primary text-primary-foreground shadow-[0_6px_24px_-4px_hsl(var(--primary)/0.3)] hover:shadow-[0_8px_30px_-4px_hsl(var(--primary)/0.4)] hover:translate-y-[-1px]'
                : 'bg-muted/50 text-muted-foreground/40 cursor-not-allowed'
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
