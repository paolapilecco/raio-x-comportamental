import { useState } from 'react';
import { Eye, X, ChevronLeft, ChevronRight, CheckCircle2 } from 'lucide-react';
import { } from '@/components/ui/button';
import { Question, defaultOptionsForType, defaultScoresForType } from './questionConstants';
import type { TestModule } from './promptConstants';

interface PreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  questions: Question[];
  currentModule: TestModule;
}

export const PreviewModal = ({ isOpen, onClose, questions, currentModule }: PreviewModalProps) => {
  const [previewIndex, setPreviewIndex] = useState(0);
  const [previewAnswers, setPreviewAnswers] = useState<Record<string, number>>({});

  if (!isOpen || questions.length === 0) return null;

  const q = questions[previewIndex];
  const opts = q.options || defaultOptionsForType[q.type] || defaultOptionsForType.likert;
  const scores = q.option_scores || defaultScoresForType[q.type] || defaultScoresForType.likert;
  const progress = (Object.keys(previewAnswers).length / questions.length) * 100;
  const currentAnswer = previewAnswers[q.id];
  const isLast = previewIndex === questions.length - 1;
  const allAnswered = Object.keys(previewAnswers).length === questions.length;

  const handleSelectOption = (optionIndex: number) => {
    setPreviewAnswers(prev => ({ ...prev, [q.id]: optionIndex + 1 }));
  };

  const handleNext = () => {
    if (currentAnswer === undefined) return;
    if (isLast) {
      // Mark all answered to show summary
      setPreviewAnswers(prev => ({ ...prev, [q.id]: currentAnswer }));
    } else {
      setPreviewIndex(previewIndex + 1);
    }
  };

  const handlePrevious = () => {
    setPreviewIndex(Math.max(0, previewIndex - 1));
  };

  const handleRestartSimulation = () => {
    setPreviewIndex(0);
    setPreviewAnswers({});
  };

  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border/20">
        <div className="flex items-center gap-3">
          <Eye className="w-5 h-5 text-primary" />
          <div>
            <h2 className="text-[0.9rem] font-bold text-foreground">Preview: {currentModule.name}</h2>
            <p className="text-[0.65rem] text-muted-foreground/60">Simulação — nenhum dado será salvo</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-2 rounded-lg hover:bg-secondary/50 transition-colors"
        >
          <X className="w-5 h-5 text-muted-foreground" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center px-6 py-8 overflow-auto">
        {!allAnswered ? (
          <div className="w-full max-w-lg space-y-10">
            {/* Progress */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs font-light text-muted-foreground tracking-wide">
                  Pergunta {previewIndex + 1} de {questions.length}
                </span>
                <span className="text-xs font-light text-muted-foreground/50">{Math.round(progress)}%</span>
              </div>
              <div className="h-[3px] rounded-full bg-border/60 overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            {/* Question */}
            <div className="text-center space-y-3 py-2">
              <p className="text-xl sm:text-2xl font-medium text-foreground leading-snug tracking-tight">
                {q.text}
              </p>
              <p className="text-xs font-light text-muted-foreground/50 uppercase tracking-widest">
                {q.type === 'frequency'
                  ? 'Com que frequência?'
                  : q.type === 'behavior_choice'
                  ? 'O que você faria?'
                  : 'Quanto você concorda?'}
              </p>
            </div>

            {/* Options */}
            <div className="space-y-3">
              {opts.map((opt, i) => {
                const value = i + 1;
                const isSelected = currentAnswer === value;
                return (
                  <button
                    key={i}
                    onClick={() => handleSelectOption(i)}
                    className={`w-full text-left px-5 py-4 rounded-2xl border transition-all duration-200 text-sm ${
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
                      >
                        {isSelected && <span className="w-2.5 h-2.5 rounded-full bg-primary" />}
                      </span>
                      <span className="leading-relaxed">{opt || `(Opção ${i + 1} — vazia)`}</span>
                      <span className="ml-auto text-[0.6rem] font-mono text-muted-foreground/30">
                        {scores[i] ?? 0}pts
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Navigation */}
            <div className="flex justify-between items-center pt-2">
              <button
                onClick={handlePrevious}
                disabled={previewIndex === 0}
                className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground disabled:opacity-20 transition-all"
              >
                <ChevronLeft className="w-4 h-4" /> Anterior
              </button>
              <button
                onClick={handleNext}
                disabled={currentAnswer === undefined}
                className={`flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-medium transition-all ${
                  currentAnswer !== undefined
                    ? 'bg-primary text-primary-foreground hover:brightness-90 shadow-sm'
                    : 'bg-muted text-muted-foreground/30 cursor-not-allowed'
                }`}
              >
                {isLast ? 'Ver Resumo' : 'Próxima'}
                {!isLast && <ChevronRight className="w-4 h-4" />}
              </button>
            </div>
          </div>
        ) : (
          /* Summary */
          <div className="w-full max-w-lg space-y-6">
            <div className="text-center space-y-2">
              <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
              <h3 className="text-xl font-bold text-foreground">Simulação Concluída!</h3>
              <p className="text-[0.8rem] text-muted-foreground/60">{questions.length} perguntas respondidas</p>
            </div>
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {questions.map((sq, i) => {
                const ans = previewAnswers[sq.id];
                const sqOpts = sq.options || defaultOptionsForType[sq.type] || defaultOptionsForType.likert;
                const sqScores = sq.option_scores || defaultScoresForType[sq.type] || defaultScoresForType.likert;
                return (
                  <div key={sq.id} className="p-3 rounded-xl border border-border/20 bg-card/30">
                    <p className="text-[0.75rem] text-foreground/80">
                      {i + 1}. {sq.text}
                    </p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="text-[0.65rem] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                        {sqOpts[ans - 1] || '?'}
                      </span>
                      <span className="text-[0.6rem] font-mono text-muted-foreground/40">
                        {sqScores[ans - 1] ?? 0}pts
                      </span>
                      {sq.axes.map(a => (
                        <span
                          key={a}
                          className="text-[0.55rem] px-1.5 py-0.5 rounded-full bg-muted/30 text-muted-foreground/50"
                        >
                          {a}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex gap-3 justify-center pt-2">
              <button
                onClick={handleRestartSimulation}
                className="px-5 py-2.5 rounded-xl border border-border/40 text-foreground text-[0.8rem] font-semibold hover:bg-secondary/60 transition-all"
              >
                Refazer Simulação
              </button>
              <button
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-[0.8rem] font-semibold hover:opacity-90 transition-all"
              >
                Fechar Preview
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
