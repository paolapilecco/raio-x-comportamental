import { useState } from 'react';
import { Save, X, ChevronDown, ChevronRight, AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react';
import {
  QuestionType,
  typeLabels,
  typeDescriptions,
  defaultOptionsForType,
  defaultScoresForType,
  validate} from './questionConstants';

interface FormData {
  text: string;
  context: string;
  type: QuestionType;
  axes: string[];
  weight: number;
  sort_order: number;
  options: string[] | null;
  option_scores: number[] | null;
}

interface QuestionEditorPanelProps {
  isCreating: boolean;
  isEditing: boolean;
  editingQuestionId: string | null;
  form: FormData;
  saving: boolean;
  currentModule: { id: string; name: string };
  onFormChange: (form: FormData) => void;
  onSave: () => void;
  onCancel: () => void;
}

export const QuestionEditorPanel = ({
  isCreating,
  isEditing,
  editingQuestionId: _editingQuestionId,
  form,
  saving,
  currentModule: _currentModule,
  onFormChange,
  onSave,
  onCancel,
}: QuestionEditorPanelProps) => {
  if (!isCreating && !isEditing) return null;

  // Local state for options editor visibility
  const [showOptionsEditor, setShowOptionsEditor] = useState(
    isCreating || form.type === 'behavior_choice'
  );

  const updateAxes = (index: number, value: string) => {
    const newAxes = [...form.axes];
    newAxes[index] = value;
    onFormChange({ ...form, axes: newAxes });
  };

  const addAxis = () => {
    onFormChange({ ...form, axes: [...form.axes, ''] });
  };

  const removeAxis = (i: number) => {
    onFormChange({ ...form, axes: form.axes.filter((_, idx) => idx !== i) });
  };

  const updateOption = (index: number, value: string) => {
    const opts = [...(form.options || defaultOptionsForType[form.type] || ['', '', '', '', ''])];
    opts[index] = value;
    onFormChange({ ...form, options: opts });
  };

  const addOption = () => {
    const opts = [...(form.options || []), ''];
    const scores = [...(form.option_scores || []), 0];
    onFormChange({ ...form, options: opts, option_scores: scores });
  };

  const removeOption = (i: number) => {
    const opts = (form.options || []).filter((_, idx) => idx !== i);
    const scores = (form.option_scores || []).filter((_, idx) => idx !== i);
    onFormChange({
      ...form,
      options: opts.length > 0 ? opts : null,
      option_scores: scores.length > 0 ? scores : null,
    });
  };

  const updateScore = (index: number, value: number) => {
    const scores = [...(form.option_scores || defaultScoresForType[form.type] || [])];
    scores[index] = Math.max(0, Math.min(100, value));
    onFormChange({ ...form, option_scores: scores });
  };

  const handleTypeChange = (newType: QuestionType) => {
    const defaults = defaultOptionsForType[newType];
    const scores = defaultScoresForType[newType];
    onFormChange({
      ...form,
      type: newType,
      options: defaults,
      option_scores: [...scores],
    });
    setShowOptionsEditor(newType === 'behavior_choice');
  };

  const currentDefaults = defaultOptionsForType[form.type];
  const isCustomOptions =
    form.options &&
    currentDefaults &&
    JSON.stringify(form.options) !== JSON.stringify(currentDefaults);

  const validation = validateQuestion(form.text, form.type);
  const hasIssues = validation.errors.length > 0 || validation.warnings.length > 0;

  return (
    <div className="space-y-4 p-5 rounded-2xl border border-primary/20 bg-primary/[0.02]">
      {/* Question text */}
      <div>
        <label className="text-[0.75rem] font-semibold text-foreground/80 mb-1.5 block">
          Texto da Afirmação
        </label>
        <textarea
          className={`w-full px-3 py-2.5 rounded-xl bg-background/50 border text-foreground text-[0.8rem] focus:ring-2 focus:ring-primary/20 outline-none resize-none leading-relaxed ${
            validation.errors.length > 0 ? 'border-destructive/40' : 'border-border/30'
          }`}
          rows={2}
          value={form.text}
          onChange={e => onFormChange({ ...form, text: e.target.value })}
          placeholder={
            form.type === 'likert'
              ? 'Ex: Eu começo tarefas mas não termino'
              : form.type === 'frequency'
              ? 'Ex: Com que frequência você adia decisões importantes?'
              : 'Ex: Quando alguém critica seu trabalho, você...'
          }
        />
        {/* Inline validation feedback */}
        {hasIssues && form.text.trim() && (
          <div className="mt-2 space-y-1.5">
            {validation.errors.map((err, i) => (
              <div key={`e${i}`} className="flex items-start gap-2 text-[0.7rem] text-destructive/80">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <span>{err}</span>
              </div>
            ))}
            {validation.warnings.map((warn, i) => (
              <div key={`w${i}`} className="flex items-start gap-2 text-[0.7rem] text-amber-600/80">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <span>{warn}</span>
              </div>
            ))}
          </div>
        )}
        {form.text.trim() && !hasIssues && (
          <div className="flex items-center gap-1.5 mt-2 text-[0.68rem] text-emerald-600/70">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Formato válido</span>
          </div>
        )}
      </div>

      {/* Context (optional) */}
      <div>
        <label className="text-[0.75rem] font-semibold text-foreground/80 mb-1.5 block">
          Contexto / Observação{' '}
          <span className="font-normal text-muted-foreground/50">(opcional)</span>
        </label>
        <textarea
          className="w-full px-3 py-2.5 rounded-xl bg-background/50 border border-border/30 text-foreground text-[0.8rem] focus:ring-2 focus:ring-primary/20 outline-none resize-none leading-relaxed"
          rows={3}
          maxLength={400}
          value={form.context || ''}
          onChange={e => onFormChange({ ...form, context: e.target.value })}
          placeholder="Ex: Considere situações dos últimos 6 meses ao responder esta pergunta."
        />
        <div className="flex justify-between mt-1">
          <p className="text-[0.65rem] text-muted-foreground/50">
            Texto exibido ao usuário antes de responder, para dar contexto ou orientação.
          </p>
          <span
            className={`text-[0.65rem] ${
              (form.context?.length || 0) > 350 ? 'text-orange-400' : 'text-muted-foreground/50'
            }`}
          >
            {form.context?.length || 0}/400
          </span>
        </div>
      </div>

      {/* Type + Weight + Order */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div>
          <label className="text-[0.75rem] font-semibold text-foreground/80 mb-1.5 block">
            Tipo de Pergunta
          </label>
          <select
            className="w-full px-3 py-2.5 rounded-xl bg-background/50 border border-border/30 text-foreground text-[0.8rem] focus:ring-2 focus:ring-primary/20"
            value={form.type}
            onChange={e => handleTypeChange(e.target.value as QuestionType)}
          >
            {Object.entries(typeLabels).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
          <p className="text-[0.65rem] text-muted-foreground/50 mt-1">
            {typeDescriptions[form.type]}
          </p>
        </div>
        <div>
          <label className="text-[0.75rem] font-semibold text-foreground/80 mb-1.5 block">
            Peso
          </label>
          <input
            type="number"
            min={0.5}
            step={0.5}
            className="w-full px-3 py-2.5 rounded-xl bg-background/50 border border-border/30 text-foreground text-[0.8rem] focus:ring-2 focus:ring-primary/20"
            value={form.weight}
            onChange={e => onFormChange({ ...form, weight: parseFloat(e.target.value) || 1 })}
          />
          <p className="text-[0.65rem] text-muted-foreground/50 mt-1">
            Multiplicador de pontuação
          </p>
        </div>
        <div>
          <label className="text-[0.75rem] font-semibold text-foreground/80 mb-1.5 block">
            Ordem
          </label>
          <input
            type="number"
            className="w-full px-3 py-2.5 rounded-xl bg-background/50 border border-border/30 text-foreground text-[0.8rem] focus:ring-2 focus:ring-primary/20"
            value={form.sort_order}
            onChange={e => onFormChange({ ...form, sort_order: parseInt(e.target.value) || 0 })}
          />
          <p className="text-[0.65rem] text-muted-foreground/50 mt-1">
            Posição na sequência
          </p>
        </div>
      </div>

      {/* Axes */}
      <div>
        <label className="text-[0.75rem] font-semibold text-foreground/80 mb-1.5 block">
          Eixos Relacionados
        </label>
        <div className="space-y-2">
          {form.axes.map((axis, i) => (
            <div key={i} className="flex gap-2">
              <input
                className="flex-1 px-3 py-2 rounded-lg bg-background/50 border border-border/20 text-foreground text-[0.8rem] focus:ring-2 focus:ring-primary/20"
                value={axis}
                onChange={e => updateAxes(i, e.target.value)}
                placeholder="Ex: foco, disciplina, impulsividade"
              />
              {form.axes.length > 1 && (
                <button
                  onClick={() => removeAxis(i)}
                  className="p-2 text-destructive/60 hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
          <button
            onClick={addAxis}
            className="text-[0.7rem] text-primary hover:underline"
          >
            + Adicionar eixo
          </button>
        </div>
      </div>

      {/* Response Options — always available */}
      <div className="border border-border/20 rounded-xl overflow-hidden">
        <button
          onClick={() => setShowOptionsEditor(!showOptionsEditor)}
          className="w-full flex items-center justify-between px-4 py-3 bg-muted/20 hover:bg-muted/30 transition-colors"
        >
          <div className="flex items-center gap-2">
            {showOptionsEditor ? (
              <ChevronDown className="w-3.5 h-3.5 text-muted-foreground/50" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/50" />
            )}
            <span className="text-[0.75rem] font-semibold text-foreground/80">
              Opções de Resposta
            </span>
            {isCustomOptions && (
              <span className="text-[0.6rem] px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 font-medium">
                Personalizado
              </span>
            )}
            {!isCustomOptions && form.options && (
              <span className="text-[0.6rem] px-1.5 py-0.5 rounded-full bg-muted/40 text-muted-foreground/60 font-medium">
                Padrão
              </span>
            )}
          </div>
          <span className="text-[0.65rem] text-muted-foreground/40">
            {(form.options || []).length} opções
          </span>
        </button>

        {showOptionsEditor && (
          <div className="p-4 space-y-3 border-t border-border/15">
            {form.type !== 'behavior_choice' && (
              <div className="flex items-center justify-between">
                <p className="text-[0.68rem] text-muted-foreground/50">
                  Respostas padrão para tipo "{typeLabels[form.type]}". Edite para personalizar.
                </p>
                <button
                  onClick={() =>
                    onFormChange({
                      ...form,
                      options: [...(defaultOptionsForType[form.type] || [])],
                      option_scores: [...(defaultScoresForType[form.type] || [])],
                    })
                  }
                  className="text-[0.65rem] text-primary/60 hover:text-primary transition-colors"
                >
                  Restaurar padrão
                </button>
              </div>
            )}

            {/* Header */}
            <div className="flex gap-2 items-center px-1">
              <span className="w-5" />
              <span className="flex-1 text-[0.65rem] font-semibold text-muted-foreground/50 uppercase tracking-wider">
                Texto da Resposta
              </span>
              <span className="w-20 text-center text-[0.65rem] font-semibold text-muted-foreground/50 uppercase tracking-wider">
                Pontos
              </span>
              <span className="w-8" />
            </div>

            <div className="space-y-2">
              {(form.options || defaultOptionsForType[form.type] || []).map((opt, i) => {
                const score =
                  (form.option_scores || defaultScoresForType[form.type] || [])[i] ?? 0;
                return (
                  <div key={i} className="flex gap-2 items-center group">
                    <span className="text-[0.7rem] text-muted-foreground/40 w-5 text-right font-mono">
                      {i + 1}.
                    </span>
                    <input
                      className="flex-1 px-3 py-2 rounded-lg bg-background/50 border border-border/20 text-foreground text-[0.8rem] focus:ring-2 focus:ring-primary/20"
                      value={opt}
                      onChange={e => updateOption(i, e.target.value)}
                      placeholder={`Opção ${i + 1}`}
                    />
                    <input
                      type="number"
                      min={0}
                      max={100}
                      className="w-20 px-2 py-2 rounded-lg bg-background/50 border border-border/20 text-foreground text-[0.8rem] text-center font-mono focus:ring-2 focus:ring-primary/20"
                      value={score}
                      onChange={e => updateScore(i, parseInt(e.target.value) || 0)}
                    />
                    {(form.options || []).length > 2 && (
                      <button
                        onClick={() => removeOption(i)}
                        className="p-1.5 text-destructive/40 hover:text-destructive hover:bg-destructive/10 rounded-lg opacity-0 group-hover:opacity-100 transition-all w-8 flex items-center justify-center"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {(form.options || []).length <= 2 && <span className="w-8" />}
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-between">
              <button onClick={addOption} className="text-[0.7rem] text-primary hover:underline">
                + Adicionar opção
              </button>
              <p className="text-[0.6rem] text-muted-foreground/40">
                Pontos: 0 (mínimo) a 100 (máximo)
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-2 justify-end pt-1">
        <button
          onClick={onCancel}
          className="px-4 py-2 rounded-lg text-[0.8rem] text-muted-foreground hover:text-foreground transition-colors"
        >
          Cancelar
        </button>
        <button
          onClick={onSave}
          disabled={saving}
          className="px-5 py-2 rounded-xl bg-primary text-primary-foreground text-[0.8rem] font-semibold flex items-center gap-2 disabled:opacity-50 hover:opacity-90 transition-all"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {isCreating ? 'Criar Pergunta' : 'Salvar Alterações'}
        </button>
      </div>
    </div>
  );
};
