import { useMemo } from 'react';
import {
  Copy,
  Edit3,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Brain,
  Square,
  CheckSquare,
} from 'lucide-react';
import {
  Question,
  typeLabels,
  defaultScoresForType,
  validateQuestion,
} from './questionConstants';

interface AuditResults {
  errorCount: number;
  warnCount: number;
  issues: Array<{
    id: string;
    text: string;
    type: string;
    problems: string[];
  }>;
  total: number;
  clean: number;
}

interface QuestionsListPanelProps {
  questions: Question[];
  loading: boolean;
  saving: boolean;
  selectedIds: Set<string>;
  expandedQuestionId: string | null;
  onSelectId: (id: string) => void;
  onSelectAll: () => void;
  onDuplicate: (question: Question) => void;
  onEdit: (question: Question) => void;
  onDelete: (id: string) => void;
  onBulkDelete: () => void;
  onExpandQuestion: (id: string | null) => void;
  onShowPreview: () => void;
  onShowAIPanel: () => void;
  onShowCreateForm: () => void;
  isCreating: boolean;
  showAIPanel: boolean;
}

export const QuestionsListPanel = ({
  questions,
  loading,
  saving,
  selectedIds,
  expandedQuestionId,
  onSelectId,
  onSelectAll,
  onDuplicate,
  onEdit,
  onDelete,
  onBulkDelete,
  onExpandQuestion,
  onShowPreview,
  onShowAIPanel,
  onShowCreateForm,
  isCreating,
  showAIPanel,
}: QuestionsListPanelProps) => {
  // Audit existing questions against standards
  const auditResults = useMemo<AuditResults | null>(() => {
    if (loading || questions.length === 0) return null;
    let errorCount = 0;
    let warnCount = 0;
    const issues: Array<{
      id: string;
      text: string;
      type: string;
      problems: string[];
    }> = [];
    questions.forEach(q => {
      const v = validateQuestion(q.text, q.type);
      const allProblems = [...v.errors, ...v.warnings];
      if (v.errors.length) errorCount += v.errors.length;
      if (v.warnings.length) warnCount += v.warnings.length;
      if (allProblems.length > 0)
        issues.push({ id: q.id, text: q.text, type: q.type, problems: allProblems });
    });
    return {
      errorCount,
      warnCount,
      issues,
      total: questions.length,
      clean: questions.length - issues.length,
    };
  }, [questions, loading]);

  return (
    <div className="space-y-4">
      {/* Standards banner */}
      <div className="p-3 rounded-xl border border-border/20 bg-muted/10">
        <p className="text-[0.7rem] text-muted-foreground/60 leading-relaxed">
          <span className="font-semibold text-foreground/70">📋 Padrão:</span> Likert com
          afirmações (sem "?"). Evite perguntas abertas e linguagem genérica. Garanta coerência
          entre texto e tipo de resposta.
        </p>
      </div>

      {/* Audit summary */}
      {auditResults && auditResults.issues.length > 0 && (
        <div className="p-3 rounded-xl border border-amber-500/20 bg-amber-500/[0.03] space-y-2">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            <span className="text-[0.75rem] font-semibold text-amber-700 dark:text-amber-400">
              {auditResults.issues.length} de {auditResults.total} perguntas com observações
            </span>
          </div>
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {auditResults.issues.slice(0, 5).map(issue => (
              <div
                key={issue.id}
                className="text-[0.65rem] text-amber-600/70 flex items-start gap-1.5"
              >
                <span className="shrink-0">•</span>
                <span>
                  <strong>"{issue.text.slice(0, 50)}..."</strong> — {issue.problems[0]}
                </span>
              </div>
            ))}
            {auditResults.issues.length > 5 && (
              <p className="text-[0.65rem] text-amber-500/50 italic">
                ...e mais {auditResults.issues.length - 5} perguntas
              </p>
            )}
          </div>
        </div>
      )}

      {auditResults && auditResults.issues.length === 0 && questions.length > 0 && (
        <div className="flex items-center gap-2 p-3 rounded-xl border border-emerald-500/20 bg-emerald-500/[0.03]">
          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          <span className="text-[0.75rem] font-semibold text-emerald-700 dark:text-emerald-400">
            Todas as {questions.length} perguntas seguem o padrão ✓
          </span>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-3">
          <p className="text-[0.8rem] text-muted-foreground/60">
            <span className="font-semibold text-foreground">{questions.length}</span> perguntas
            configuradas
          </p>
          {selectedIds.size > 0 && (
            <button
              onClick={onBulkDelete}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-destructive text-destructive-foreground text-[0.75rem] font-semibold hover:bg-destructive/90 disabled:opacity-50 transition-all"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Excluir {selectedIds.size} selecionada(s)
            </button>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={onShowPreview}
            disabled={questions.length === 0}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-border/40 bg-background text-foreground text-[0.8rem] font-semibold hover:bg-secondary/60 disabled:opacity-50 transition-all"
          >
            Visualizar Leitura
          </button>
          <button
            onClick={onShowAIPanel}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-[0.8rem] font-semibold hover:opacity-90 transition-all shadow-sm"
          >
            Gerar com IA
          </button>
          <button
            onClick={onShowCreateForm}
            disabled={isCreating}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-[0.8rem] font-semibold hover:opacity-90 disabled:opacity-50 transition-all"
          >
            Nova Pergunta
          </button>
        </div>
      </div>

      {/* Questions list */}
      {!isCreating && !showAIPanel && (
        <div className="space-y-2">
          {questions.map(q => {
            const qValidation = validateQuestion(q.text, q.type);
            const hasQIssues =
              qValidation.errors.length > 0 || qValidation.warnings.length > 0;
            const isSelected = selectedIds.has(q.id);
            const isExpanded = expandedQuestionId === q.id;

            return (
              <div
                key={q.id}
                className={`rounded-xl border bg-card/30 hover:border-primary/20 transition-colors overflow-hidden ${
                  isSelected
                    ? 'border-primary/40 bg-primary/[0.03]'
                    : qValidation.errors.length > 0
                    ? 'border-destructive/30'
                    : hasQIssues
                    ? 'border-amber-500/25'
                    : 'border-border/25'
                }`}
              >
                <div className="flex items-start gap-3 p-3">
                  <button
                    onClick={() => onSelectId(q.id)}
                    className="p-0.5 rounded hover:bg-accent/50 transition-colors mt-0.5 shrink-0"
                  >
                    {isSelected ? (
                      <CheckSquare className="w-4 h-4 text-primary" />
                    ) : (
                      <Square className="w-4 h-4 text-muted-foreground/30" />
                    )}
                  </button>
                  <span className="text-[0.65rem] font-mono text-muted-foreground/40 mt-1 w-6 text-right">
                    {q.sort_order}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-2">
                      <p className="text-[0.8rem] text-foreground/80 flex-1">{q.text}</p>
                      {hasQIssues && (
                        <AlertTriangle
                          className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${
                            qValidation.errors.length > 0
                              ? 'text-destructive/60'
                              : 'text-amber-500/60'
                          }`}
                        />
                      )}
                    </div>
                    <div className="flex gap-1.5 mt-1.5 flex-wrap">
                      <span className="text-[0.6rem] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                        {typeLabels[q.type] || q.type}
                      </span>
                      {q.axes.map(a => (
                        <span
                          key={a}
                          className="text-[0.6rem] px-2 py-0.5 rounded-full bg-muted/40 text-muted-foreground/60"
                        >
                          {a}
                        </span>
                      ))}
                      {q.weight !== 1 && (
                        <span className="text-[0.6rem] px-2 py-0.5 rounded-full bg-accent/40 text-accent-foreground/60">
                          peso: {q.weight}
                        </span>
                      )}
                      {q.options && q.options.length > 0 && (
                        <button
                          onClick={() =>
                            onExpandQuestion(isExpanded ? null : q.id)
                          }
                          className="text-[0.6rem] px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-600 font-medium hover:bg-indigo-500/20 transition-colors cursor-pointer"
                        >
                          {q.options.length} opções {isExpanded ? '▲' : '▼'}
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-0.5">
                    <button
                      onClick={() => onDuplicate(q)}
                      disabled={saving}
                      className="p-1.5 rounded-lg hover:bg-accent/50 transition-colors"
                      title="Duplicar"
                    >
                      <Copy className="w-3.5 h-3.5 text-muted-foreground/50" />
                    </button>
                    <button
                      onClick={() => onEdit(q)}
                      className="p-1.5 rounded-lg hover:bg-accent/50 transition-colors"
                      title="Editar"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-muted-foreground/50" />
                    </button>
                    <button
                      onClick={() => onDelete(q.id)}
                      className="p-1.5 rounded-lg hover:bg-destructive/10 transition-colors"
                      title="Excluir"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-destructive/60" />
                    </button>
                  </div>
                </div>

                {/* Expanded options preview with scores */}
                {isExpanded && q.options && q.options.length > 0 && (
                  <div className="px-4 pb-3 pt-0 ml-9 border-t border-border/10">
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {q.options.map((opt, i) => {
                        const score =
                          (q.option_scores || defaultScoresForType[q.type] || [])[i];
                        return (
                          <span
                            key={i}
                            className="text-[0.65rem] px-2.5 py-1 rounded-lg bg-muted/30 text-foreground/60 border border-border/15 flex items-center gap-1.5"
                          >
                            <span>
                              {i + 1}. {opt || <span className="italic text-muted-foreground/30">(vazio)</span>}
                            </span>
                            <span className="font-mono text-primary/70 bg-primary/5 px-1 rounded">
                              {score ?? '?'}pts
                            </span>
                          </span>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {questions.length === 0 && !isCreating && !showAIPanel && (
            <div className="text-center py-12 text-muted-foreground/40">
              <Brain className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-[0.8rem]">Nenhuma pergunta cadastrada</p>
              <p className="text-[0.7rem] mt-1">
                Clique em "Nova Pergunta" ou "Gerar com IA" para começar
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
