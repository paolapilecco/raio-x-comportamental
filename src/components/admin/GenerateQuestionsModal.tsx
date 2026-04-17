import { useState, useCallback } from 'react';
import { Sparkles, Plus, AlertTriangle, Check, Edit3, Loader2, Wand2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Question, typeLabels, QuestionType } from './questionConstants';
import type { TestModule } from './promptConstants';

interface GeneratedQuestion {
  text: string;
  type: QuestionType;
  axes: string[];
  weight: number;
  options: string[] | null;
  option_scores: number[] | null;
  reverse?: boolean;
  reasoning?: string;
}

interface QualityMetrics {
  total: number;
  reverseCount: number;
  reversePercent: number;
  crossAxisCount: number;
  crossAxisPercent: number;
  coveredAxes: number;
  totalAxes: number;
  uncoveredAxes: string[];
}

interface ContextSummary {
  prompts: number;
  patterns: number;
  existingQuestions: number;
  otherQuestions: number;
  axes: string[];
}

interface GenerateQuestionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentModule: TestModule;
  questions: Question[];
  onQuestionsGenerated?: (questions: GeneratedQuestion[]) => void;
}

export const GenerateQuestionsModal = ({
  isOpen,
  onClose,
  currentModule,
  questions,
  onQuestionsGenerated,
}: GenerateQuestionsModalProps) => {
  // AI generation state
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiCount, setAiCount] = useState(10);
  const [aiPreview, setAiPreview] = useState<GeneratedQuestion[] | null>(null);
  const [aiSelected, setAiSelected] = useState<Set<number>>(new Set());
  const [_aiModuleDescription, _setAiModuleDescription] = useState('');
  const [aiQualityMetrics, setAiQualityMetrics] = useState<QualityMetrics | null>(null);
  const [aiExtraInstructions, setAiExtraInstructions] = useState('');
  const [aiContextSummary, setAiContextSummary] = useState<ContextSummary | null>(null);
  const [aiEditingIndex, setAiEditingIndex] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [suggestingInstructions, setSuggestingInstructions] = useState(false);

  if (!isOpen) return null;

  const fetchContextSummary = useCallback(async () => {
    try {
      const [promptsRes, patternRes, sameTestRes, otherTestRes] = await Promise.all([
        supabase.from('test_prompts').select('prompt_type').eq('test_id', currentModule.id).eq('is_active', true),
        supabase.from('pattern_definitions').select('pattern_key').eq('test_module_id', currentModule.id),
        supabase.from('questions').select('text, axes').eq('test_id', currentModule.id),
        supabase.from('questions').select('id').neq('test_id', currentModule.id),
      ]);

      const axesFromQuestions = new Set((sameTestRes.data || []).flatMap(q => q.axes || []));
      const axesFromPatterns = new Set((patternRes.data || []).map(p => p.pattern_key));
      const axes = Array.from(new Set([...axesFromQuestions, ...axesFromPatterns]));

      setAiContextSummary({
        prompts: promptsRes.data?.length || 0,
        patterns: patternRes.data?.length || 0,
        existingQuestions: sameTestRes.data?.length || 0,
        otherQuestions: otherTestRes.data?.length || 0,
        axes,
      });
    } catch (error) {
      console.error('Erro ao buscar contexto:', error);
    }
  }, [currentModule.id]);

  const handleAIGenerate = async () => {
    setAiGenerating(true);
    setAiPreview(null);
    setAiQualityMetrics(null);
    setAiEditingIndex(null);

    try {
      const [moduleRes, promptsRes, otherQuestionsRes, sameTestQuestionsRes, patternRes] = await Promise.all([
        supabase.from('test_modules').select('description').eq('id', currentModule.id).single(),
        supabase.from('test_prompts').select('prompt_type, content').eq('test_id', currentModule.id).eq('is_active', true),
        supabase.from('questions').select('text, test_id').neq('test_id', currentModule.id),
        supabase.from('questions').select('text, axes').eq('test_id', currentModule.id),
        supabase.from('pattern_definitions').select('pattern_key').eq('test_module_id', currentModule.id),
      ]);

      const desc = moduleRes.data?.description || currentModule.name;
      _setAiModuleDescription(desc);

      const promptsContext = (promptsRes.data || [])
        .map(p => `[${p.prompt_type?.toUpperCase()}]: ${p.content}`)
        .join('\n\n');

      const existingQuestionsFromOtherTests = (otherQuestionsRes.data || []).map(q => q.text);
      const existingQuestionsFromThisTest = (sameTestQuestionsRes.data || []).map(q => q.text);
      const axesFromQuestions = new Set((sameTestQuestionsRes.data || []).flatMap(q => q.axes || []));
      const axesFromPatterns = new Set((patternRes.data || []).map(p => p.pattern_key));
      const existingAxes = Array.from(new Set([...axesFromQuestions, ...axesFromPatterns]));

      const { data, error } = await supabase.functions.invoke('generate-questions', {
        body: {
          testName: currentModule.name,
          testDescription: desc,
          questionCount: aiCount,
          promptsContext,
          existingQuestionsFromOtherTests,
          existingQuestionsFromThisTest,
          existingAxes,
          testModuleId: currentModule.id,
          extraInstructions: aiExtraInstructions.trim() || undefined,
        },
      });

      if (error) throw error;
      if (data?.error) {
        toast.error(data.error);
        return;
      }

      if (data?.questions?.length > 0) {
        setAiPreview(data.questions);
        setAiSelected(new Set(data.questions.map((_: any, i: number) => i)));
        if (data.qualityMetrics) setAiQualityMetrics(data.qualityMetrics);
        toast.success(`${data.questions.length} perguntas geradas!`);
      } else {
        toast.error('Nenhuma pergunta gerada');
      }
    } catch (e: any) {
      console.error(e);
      toast.error('Erro ao gerar perguntas com IA');
    } finally {
      setAiGenerating(false);
    }
  };

  const handleSuggestInstructions = async () => {
    setSuggestingInstructions(true);
    try {
      const { data, error } = await supabase.functions.invoke('suggest-question-instructions', {
        body: { testModuleId: currentModule.id },
      });
      if (error) throw error;
      if (data?.error) {
        toast.error(data.error);
        return;
      }
      if (data?.instructions) {
        setAiExtraInstructions(data.instructions);
        toast.success('Instruções geradas com base no pipeline completo!');
      }
    } catch (e: any) {
      console.error(e);
      toast.error('Erro ao gerar instruções');
    } finally {
      setSuggestingInstructions(false);
    }
  };

  const handleAISave = async () => {
    if (!aiPreview || aiSelected.size === 0) return;
    setSaving(true);

    try {
      const selected = aiPreview.filter((_, i) => aiSelected.has(i));
      const rows = selected.map((q, i) => ({
        text: q.text,
        type: q.type,
        axes: q.axes,
        weight: q.weight,
        sort_order: i + 1,
        options: q.options,
        option_scores: q.option_scores,
        test_id: currentModule.id,
      }));

      // SUBSTITUI todas as perguntas existentes do módulo (não soma)
      const { error: deleteError } = await supabase
        .from('questions')
        .delete()
        .eq('test_id', currentModule.id);

      if (deleteError) {
        toast.error('Erro ao remover perguntas anteriores');
        return;
      }

      const { error } = await supabase.from('questions').insert(rows);
      if (error) {
        toast.error('Erro ao salvar perguntas');
      } else {
        toast.success(`${rows.length} perguntas substituíram as anteriores!`);
        setAiPreview(null);
        setAiSelected(new Set());
        onClose();
        onQuestionsGenerated?.(selected);
      }
    } catch (e: any) {
      console.error(e);
      toast.error('Erro ao salvar perguntas');
    } finally {
      setSaving(false);
    }
  };

  // Fetch context on mount
  if (!aiContextSummary) {
    fetchContextSummary();
  }

  return (
    <div className="p-5 rounded-2xl border border-violet-500/20 bg-violet-500/[0.03] space-y-4">
      <div className="flex items-center gap-2">
        <Sparkles className="w-5 h-5 text-violet-500" />
        <h3 className="text-[0.85rem] font-bold text-foreground">Gerar Perguntas com IA</h3>
      </div>

      {/* Context Summary — Pre-generation checklist */}
      {aiContextSummary && !aiPreview && (
        <div className="p-3 rounded-xl border border-border/20 bg-muted/10 space-y-2">
          <p className="text-[0.7rem] font-semibold text-foreground/70">🔍 Contexto que será enviado à IA</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <div className={`text-center p-2 rounded-lg ${aiContextSummary.prompts > 0 ? 'bg-emerald-500/10' : 'bg-destructive/10'}`}>
              <p className={`text-lg font-bold ${aiContextSummary.prompts > 0 ? 'text-emerald-600' : 'text-destructive'}`}>
                {aiContextSummary.prompts}
              </p>
              <p className="text-[0.6rem] text-muted-foreground/60">Prompts ativos</p>
            </div>
            <div className={`text-center p-2 rounded-lg ${aiContextSummary.patterns > 0 ? 'bg-emerald-500/10' : 'bg-amber-500/10'}`}>
              <p className={`text-lg font-bold ${aiContextSummary.patterns > 0 ? 'text-emerald-600' : 'text-amber-500'}`}>
                {aiContextSummary.patterns}
              </p>
              <p className="text-[0.6rem] text-muted-foreground/60">Padrões definidos</p>
            </div>
            <div className="text-center p-2 rounded-lg bg-muted/20">
              <p className="text-lg font-bold text-foreground/70">{aiContextSummary.existingQuestions}</p>
              <p className="text-[0.6rem] text-muted-foreground/60">Perguntas neste teste</p>
            </div>
            <div className="text-center p-2 rounded-lg bg-muted/20">
              <p className="text-lg font-bold text-foreground/70">{aiContextSummary.axes.length}</p>
              <p className="text-[0.6rem] text-muted-foreground/60">Eixos detectados</p>
            </div>
          </div>

          {aiContextSummary.prompts === 0 && (
            <div className="flex items-start gap-2 text-[0.65rem] text-destructive/80">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <span>
                <strong>Atenção:</strong> Nenhum prompt ativo encontrado. Crie os prompts primeiro na aba "Prompts" para que a IA gere perguntas alinhadas ao motor de análise.
              </span>
            </div>
          )}

          {aiContextSummary.patterns === 0 && (
            <div className="flex items-start gap-2 text-[0.65rem] text-amber-600/80">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <span>
                <strong>Aviso:</strong> Nenhum padrão definido. Defina padrões comportamentais na aba "Padrões" para melhor cobertura de análise.
              </span>
            </div>
          )}
        </div>
      )}

      {/* Configuration inputs (before generation) */}
      {!aiPreview && (
        <div className="space-y-3">
          <div>
            <label className="text-[0.7rem] font-semibold text-foreground/70 mb-1.5 block">
              Quantidade de perguntas
            </label>
            <input
              type="number"
              min={1}
              max={50}
              className="w-full px-3 py-2 rounded-lg bg-background/50 border border-border/20 text-foreground text-[0.8rem] focus:ring-2 focus:ring-violet-500/20"
              value={aiCount}
              onChange={e => setAiCount(parseInt(e.target.value) || 10)}
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[0.7rem] font-semibold text-foreground/70">
                Instruções adicionais <span className="font-normal text-muted-foreground/50">(opcional)</span>
              </label>
              <button
                type="button"
                onClick={handleSuggestInstructions}
                disabled={suggestingInstructions}
                className="text-[0.65rem] px-2 py-1 rounded-md bg-gradient-to-r from-amber-500/15 to-amber-600/15 text-amber-700 hover:from-amber-500/25 hover:to-amber-600/25 transition-all flex items-center gap-1 disabled:opacity-50 font-semibold border border-amber-500/20"
                title="Lê todo o pipeline (prompts, padrões, regras de saída) para gerar instruções precisas"
              >
                {suggestingInstructions ? (
                  <><Loader2 className="w-3 h-3 animate-spin" /> Lendo pipeline...</>
                ) : (
                  <><Wand2 className="w-3 h-3" /> Gerar instruções com IA</>
                )}
              </button>
            </div>
            <textarea
              className="w-full px-3 py-2 rounded-lg bg-background/50 border border-border/20 text-foreground text-[0.8rem] focus:ring-2 focus:ring-violet-500/20 outline-none resize-none leading-relaxed"
              rows={4}
              value={aiExtraInstructions}
              onChange={e => setAiExtraInstructions(e.target.value)}
              placeholder="Ex: Focar em comportamentos de procrastinação. Evitar perguntas muito complexas."
            />
          </div>

          <div className="flex items-start gap-2 p-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-600" />
            <p className="text-[0.65rem] text-amber-700/90 leading-relaxed">
              <strong>Atenção:</strong> ao confirmar, as {questions.length} perguntas existentes deste módulo serão <strong>substituídas</strong> pelas novas geradas.
            </p>
          </div>

          <button
            onClick={handleAIGenerate}
            disabled={aiGenerating || !aiContextSummary}
            className="w-full px-4 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-[0.8rem] font-semibold flex items-center justify-center gap-2 disabled:opacity-50 hover:opacity-90 transition-all"
          >
            {aiGenerating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Gerando...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" /> Gerar {aiCount} Pergunta{aiCount !== 1 ? 's' : ''}
              </>
            )}
          </button>
        </div>
      )}

      {/* Quality metrics (after generation) */}
      {aiPreview && aiQualityMetrics && (
        <div className="p-3 rounded-xl border border-border/20 bg-muted/10 space-y-2">
          <p className="text-[0.7rem] font-semibold text-foreground/70">📊 Qualidade das perguntas geradas</p>
          <div className="grid grid-cols-4 gap-2">
            <div className="text-center">
              <p className={`text-lg font-bold ${aiQualityMetrics.reversePercent >= 20 ? 'text-emerald-600' : 'text-amber-500'}`}>
                {aiQualityMetrics.reversePercent}%
              </p>
              <p className="text-[0.6rem] text-muted-foreground/60">
                Invertidas ({aiQualityMetrics.reverseCount}/{aiQualityMetrics.total})
              </p>
            </div>
            <div className="text-center">
              <p className={`text-lg font-bold ${aiQualityMetrics.crossAxisPercent >= 35 ? 'text-emerald-600' : 'text-amber-500'}`}>
                {aiQualityMetrics.crossAxisPercent}%
              </p>
              <p className="text-[0.6rem] text-muted-foreground/60">
                Cruzam 2 eixos ({aiQualityMetrics.crossAxisCount}/{aiQualityMetrics.total})
              </p>
            </div>
            <div className="text-center">
              <p className={`text-lg font-bold ${aiQualityMetrics.uncoveredAxes?.length === 0 ? 'text-emerald-600' : 'text-amber-500'}`}>
                {aiQualityMetrics.coveredAxes}/{aiQualityMetrics.totalAxes}
              </p>
              <p className="text-[0.6rem] text-muted-foreground/60">Eixos cobertos</p>
            </div>
          </div>

          {aiQualityMetrics.uncoveredAxes?.length > 0 && (
            <div className="flex items-start gap-2 text-[0.65rem] text-amber-600/80">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <span>
                Eixos sem cobertura: <strong>{aiQualityMetrics.uncoveredAxes.join(', ')}</strong>
              </span>
            </div>
          )}
        </div>
      )}

      {/* Preview list (after generation) */}
      {aiPreview && (
        <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
          {aiPreview.map((q, i) => (
            <div
              key={i}
              className={`flex items-start gap-3 p-3 rounded-xl border transition-all ${
                aiSelected.has(i) ? 'border-violet-500/40 bg-violet-500/[0.06]' : 'border-border/20 bg-card/20 hover:border-border/40'
              }`}
            >
              <div
                onClick={() => {
                  const next = new Set(aiSelected);
                  next.has(i) ? next.delete(i) : next.add(i);
                  setAiSelected(next);
                }}
                className={`mt-0.5 w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 cursor-pointer transition-colors ${
                  aiSelected.has(i) ? 'bg-violet-600 border-violet-600' : 'border-border/40'
                }`}
              >
                {aiSelected.has(i) && <Check className="w-3 h-3 text-white" />}
              </div>

              <div className="flex-1 min-w-0">
                {aiEditingIndex === i ? (
                  <div className="space-y-2">
                    <textarea
                      className="w-full px-2 py-1.5 rounded-lg bg-background/50 border border-violet-500/30 text-foreground text-[0.8rem] focus:ring-2 focus:ring-violet-500/20 outline-none resize-none"
                      rows={2}
                      value={q.text}
                      onChange={e => {
                        const updated = [...aiPreview];
                        updated[i] = { ...updated[i], text: e.target.value };
                        setAiPreview(updated);
                      }}
                    />
                    <button
                      onClick={() => setAiEditingIndex(null)}
                      className="text-[0.65rem] text-violet-600 hover:underline"
                    >
                      ✓ Concluir edição
                    </button>
                  </div>
                ) : (
                  <p
                    className="text-[0.8rem] text-foreground/80 cursor-pointer hover:text-foreground transition-colors"
                    onDoubleClick={() => setAiEditingIndex(i)}
                    title="Clique duplo para editar"
                  >
                    {q.text}
                  </p>
                )}

                {q.reasoning && aiEditingIndex !== i && (
                  <p className="text-[0.6rem] text-muted-foreground/50 mt-1 italic">💡 {q.reasoning}</p>
                )}

                <div className="flex gap-1.5 mt-1.5 flex-wrap items-center">
                  <span className="text-[0.6rem] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                    {typeLabels[q.type] || q.type}
                  </span>
                  {q.reverse && (
                    <span className="text-[0.6rem] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 font-medium">
                      ↔ Invertida
                    </span>
                  )}
                  {q.axes?.map((a: string) => (
                    <span key={a} className="text-[0.6rem] px-2 py-0.5 rounded-full bg-muted/40 text-muted-foreground/60">
                      {a}
                    </span>
                  ))}
                  {q.axes?.length! >= 2 && (
                    <span className="text-[0.6rem] px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-600 font-medium">
                      ✕ Cruzamento
                    </span>
                  )}
                  {q.weight > 1 && (
                    <span className="text-[0.6rem] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 font-medium">
                      ⚖ Peso {q.weight}
                    </span>
                  )}
                  <button
                    onClick={() => setAiEditingIndex(i)}
                    className="text-[0.55rem] px-1.5 py-0.5 rounded-full bg-muted/30 text-muted-foreground/50 hover:text-foreground hover:bg-muted/50 transition-colors ml-auto"
                  >
                    <Edit3 className="w-3 h-3 inline" /> Editar
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Action buttons */}
      {aiPreview && (
        <div className="flex gap-2 justify-end pt-2">
          <button
            onClick={() => {
              setAiPreview(null);
              setAiSelected(new Set());
              setAiQualityMetrics(null);
              setAiEditingIndex(null);
            }}
            className="px-4 py-2 rounded-lg text-[0.8rem] text-muted-foreground hover:text-foreground transition-colors"
          >
            Descartar
          </button>
          <button
            onClick={handleAIGenerate}
            disabled={aiGenerating}
            className="px-4 py-2 rounded-lg text-[0.8rem] text-violet-600 hover:bg-violet-500/10 transition-colors flex items-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5" /> Regenerar
          </button>
          <button
            onClick={handleAISave}
            disabled={aiSelected.size === 0 || saving}
            className="px-5 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-[0.8rem] font-semibold flex items-center gap-2 disabled:opacity-50 hover:opacity-90 transition-all"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Substituir por {aiSelected.size} pergunta{aiSelected.size !== 1 ? 's' : ''}
          </button>
        </div>
      )}
    </div>
  );
};
