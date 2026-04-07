import { useState, useEffect, useMemo, useCallback } from 'react';
import { Plus, Save, Trash2, Edit3, X, Loader2, Brain, Copy, ChevronDown, ChevronRight, AlertTriangle, CheckCircle2, Sparkles, Check, Eye, ChevronLeft, Square, CheckSquare } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { TestModule } from './promptConstants';

interface Question {
  id: string;
  test_id: string;
  text: string;
  context: string | null;
  type: 'likert' | 'behavior_choice' | 'frequency' | 'intensity';
  axes: string[];
  weight: number;
  sort_order: number;
  options: string[] | null;
  option_scores: number[] | null;
}

const typeLabels: Record<string, string> = {
  likert: 'Likert (Concordância)',
  behavior_choice: 'Escolha Comportamental',
  frequency: 'Frequência',
  intensity: 'Intensidade',
};

const typeDescriptions: Record<string, string> = {
  likert: 'Afirmação com escala de 1 a 5 (Discordo totalmente → Concordo totalmente)',
  behavior_choice: 'Cenário com opções de resposta personalizadas',
  frequency: 'Pergunta de comportamento com escala temporal (Nunca → Sempre)',
  intensity: 'Pergunta com escala de intensidade (Nenhuma → Extrema)',
};

const defaultOptionsForType: Record<string, string[]> = {
  likert: ['Discordo totalmente', 'Discordo', 'Neutro', 'Concordo', 'Concordo totalmente'],
  frequency: ['Nunca', 'Raramente', 'Às vezes', 'Frequentemente', 'Sempre'],
  intensity: ['Nenhuma', 'Leve', 'Moderada', 'Alta', 'Extrema'],
  behavior_choice: ['', '', '', ''],
};

const defaultScoresForType: Record<string, number[]> = {
  likert: [0, 25, 50, 75, 100],
  frequency: [0, 25, 50, 75, 100],
  intensity: [0, 25, 50, 75, 100],
  behavior_choice: [0, 33, 66, 100],
};

const GENERIC_TERMS = [
  'melhorar', 'equilibrio', 'equilíbrio', 'buscar', 'tentar', 'procurar',
  'se sentir bem', 'ser feliz', 'ter sucesso', 'zona de conforto',
];

type QuestionType = 'likert' | 'behavior_choice' | 'frequency' | 'intensity';

/** Validate question text against quality standards */
function validateQuestion(text: string, type: QuestionType): { warnings: string[]; errors: string[] } {
  const warnings: string[] = [];
  const errors: string[] = [];
  const trimmed = text.trim();
  if (!trimmed) return { warnings, errors };

  // Likert must be an affirmation — no question marks
  if (type === 'likert' && trimmed.includes('?')) {
    errors.push('Likert deve ser uma AFIRMAÇÃO (sem interrogação). Ex: "Eu começo tarefas mas não termino"');
  }

  // Frequency should be a question
  if (type === 'frequency' && !trimmed.includes('?')) {
    warnings.push('Frequência geralmente usa pergunta. Ex: "Com que frequência você adia decisões?"');
  }

  // Detect open-ended patterns
  if (/^(por que|como você|o que você|qual|explique|descreva)/i.test(trimmed)) {
    errors.push('Evite perguntas abertas (por que, como, o que). Use afirmações ou cenários.');
  }

  // Detect generic / self-help language
  const foundGeneric = GENERIC_TERMS.filter(t => trimmed.toLowerCase().includes(t));
  if (foundGeneric.length > 0) {
    warnings.push(`Linguagem genérica detectada: "${foundGeneric.join('", "')}". Seja mais específico.`);
  }

  // Too short
  if (trimmed.length < 15) {
    warnings.push('Texto muito curto. Afirmações precisam de contexto suficiente para análise.');
  }

  return { warnings, errors };
}

const emptyQuestion = {
  text: '', context: '' as string, type: 'likert' as QuestionType, axes: [''], weight: 1, sort_order: 0,
  options: null as string[] | null, option_scores: null as number[] | null,
};

interface QuestionsPanelProps {
  currentModule: TestModule;
}

const QuestionsPanel = ({ currentModule }: QuestionsPanelProps) => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState(emptyQuestion);
  const [showOptionsEditor, setShowOptionsEditor] = useState(false);
  const [expandedQuestionId, setExpandedQuestionId] = useState<string | null>(null);

  // AI generation state
  const [showAIPanel, setShowAIPanel] = useState(false);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiCount, setAiCount] = useState(10);
  const [aiPreview, setAiPreview] = useState<any[] | null>(null);
  const [aiSelected, setAiSelected] = useState<Set<number>>(new Set());
  const [aiModuleDescription, setAiModuleDescription] = useState('');
  const [aiQualityMetrics, setAiQualityMetrics] = useState<any>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [previewIndex, setPreviewIndex] = useState(0);
  const [previewAnswers, setPreviewAnswers] = useState<Record<string, number>>({});
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);

  useEffect(() => {
    fetchQuestions();
    supabase.from('test_modules').select('description').eq('id', currentModule.id).single()
      .then(({ data }) => { if (data?.description) setAiModuleDescription(data.description); });
  }, [currentModule.id]);

  const fetchQuestions = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('questions')
      .select('*')
      .eq('test_id', currentModule.id)
      .order('sort_order');
    if (error) toast.error('Erro ao carregar perguntas');
    else setQuestions(data || []);
    setLoading(false);
  };

  const startEdit = (q: Question) => {
    setEditingId(q.id);
    setCreating(false);
    const opts = q.options || defaultOptionsForType[q.type] || null;
    const scores = q.option_scores || defaultScoresForType[q.type] || null;
    setForm({
      text: q.text, context: q.context || '', type: q.type,
      axes: q.axes.length ? q.axes : [''],
      weight: q.weight, sort_order: q.sort_order,
      options: opts,
      option_scores: scores ? [...scores] : null,
    });
    setShowOptionsEditor(!!q.options || q.type === 'behavior_choice');
  };

  const startCreate = () => {
    setCreating(true);
    setEditingId(null);
    const defaultOpts = defaultOptionsForType['likert'];
    const defaultScores = defaultScoresForType['likert'];
    setForm({ ...emptyQuestion, sort_order: questions.length + 1, options: defaultOpts, option_scores: [...defaultScores] });
    setShowOptionsEditor(false);
  };

  const cancelEdit = () => { setEditingId(null); setCreating(false); setShowOptionsEditor(false); };

  const handleDuplicate = async (q: Question) => {
    setSaving(true);
    const payload = {
      text: `${q.text} (cópia)`,
      type: q.type,
      axes: q.axes,
      weight: q.weight,
      sort_order: q.sort_order + 1,
      options: q.options,
      option_scores: q.option_scores,
      test_id: currentModule.id,
    };
    const { error } = await supabase.from('questions').insert(payload);
    if (error) toast.error('Erro ao duplicar');
    else { toast.success('Pergunta duplicada!'); await fetchQuestions(); }
    setSaving(false);
  };

  const handleSave = async () => {
    if (!form.text.trim()) { toast.error('Texto da pergunta é obrigatório'); return; }
    const axes = form.axes.filter(a => a.trim());
    if (axes.length === 0) { toast.error('Pelo menos um eixo é obrigatório'); return; }

    // Validate options for behavior_choice
    if (form.type === 'behavior_choice') {
      const validOpts = (form.options || []).filter(o => o.trim());
      if (validOpts.length < 2) { toast.error('Escolha comportamental precisa de pelo menos 2 opções preenchidas'); return; }
    }

    setSaving(true);
    const finalOptions = form.options && form.options.some(o => o.trim()) ? form.options : null;
    const finalScores = form.option_scores && form.option_scores.length > 0 ? form.option_scores : null;
    const payload = {
      text: form.text.trim(), type: form.type, axes, weight: form.weight,
      sort_order: form.sort_order, options: finalOptions,
      option_scores: finalScores,
      context: form.context?.trim() || null,
      test_id: currentModule.id,
    };
    if (creating) {
      const { error } = await supabase.from('questions').insert(payload);
      if (error) toast.error('Erro ao criar pergunta');
      else { toast.success('Pergunta criada!'); setCreating(false); setShowOptionsEditor(false); await fetchQuestions(); }
    } else if (editingId) {
      const { error } = await supabase.from('questions').update(payload).eq('id', editingId);
      if (error) toast.error('Erro ao atualizar');
      else { toast.success('Pergunta atualizada!'); setEditingId(null); setShowOptionsEditor(false); await fetchQuestions(); }
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir esta pergunta?')) return;
    const { error } = await supabase.from('questions').delete().eq('id', id);
    if (error) toast.error('Erro ao excluir');
    else { toast.success('Pergunta excluída!'); setSelectedIds(prev => { const n = new Set(prev); n.delete(id); return n; }); await fetchQuestions(); }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`Excluir ${selectedIds.size} pergunta(s) selecionada(s)?`)) return;
    setBulkDeleting(true);
    const { error } = await supabase.from('questions').delete().in('id', Array.from(selectedIds));
    if (error) toast.error('Erro ao excluir perguntas');
    else { toast.success(`${selectedIds.size} pergunta(s) excluída(s)!`); setSelectedIds(new Set()); await fetchQuestions(); }
    setBulkDeleting(false);
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === questions.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(questions.map(q => q.id)));
  };

  const updateAxes = (index: number, value: string) => {
    const newAxes = [...form.axes];
    newAxes[index] = value;
    setForm(f => ({ ...f, axes: newAxes }));
  };

  const addAxis = () => setForm(f => ({ ...f, axes: [...f.axes, ''] }));
  const removeAxis = (i: number) => setForm(f => ({ ...f, axes: f.axes.filter((_, idx) => idx !== i) }));

  const updateOption = (index: number, value: string) => {
    const opts = [...(form.options || defaultOptionsForType[form.type] || ['', '', '', '', ''])];
    opts[index] = value;
    setForm(f => ({ ...f, options: opts }));
  };

  const addOption = () => {
    const opts = [...(form.options || []), ''];
    const scores = [...(form.option_scores || []), 0];
    setForm(f => ({ ...f, options: opts, option_scores: scores }));
  };

  const removeOption = (i: number) => {
    const opts = (form.options || []).filter((_, idx) => idx !== i);
    const scores = (form.option_scores || []).filter((_, idx) => idx !== i);
    setForm(f => ({ ...f, options: opts.length > 0 ? opts : null, option_scores: scores.length > 0 ? scores : null }));
  };

  const updateScore = (index: number, value: number) => {
    const scores = [...(form.option_scores || defaultScoresForType[form.type] || [])];
    scores[index] = Math.max(0, Math.min(100, value));
    setForm(f => ({ ...f, option_scores: scores }));
  };

  const handleTypeChange = (newType: QuestionType) => {
    const defaults = defaultOptionsForType[newType];
    const scores = defaultScoresForType[newType];
    setForm(f => ({ ...f, type: newType, options: defaults, option_scores: [...scores] }));
    setShowOptionsEditor(newType === 'behavior_choice');
  };

  const handleAIGenerate = async () => {
    setAiGenerating(true);
    setAiPreview(null);
    setAiQualityMetrics(null);
    try {
      // Fetch test description, prompts, existing questions from other AND same test, plus pattern definitions
      const [moduleRes, promptsRes, otherQuestionsRes, sameTestQuestionsRes, patternRes] = await Promise.all([
        supabase.from('test_modules').select('description').eq('id', currentModule.id).single(),
        supabase.from('test_prompts').select('prompt_type, content').eq('test_id', currentModule.id).eq('is_active', true),
        supabase.from('questions').select('text, test_id').neq('test_id', currentModule.id),
        supabase.from('questions').select('text, axes').eq('test_id', currentModule.id),
        supabase.from('pattern_definitions').select('pattern_key').eq('test_module_id', currentModule.id),
      ]);

      const desc = moduleRes.data?.description || currentModule.name;
      setAiModuleDescription(desc);

      // Build prompts context string
      const promptsContext = (promptsRes.data || [])
        .map(p => `[${p.prompt_type?.toUpperCase()}]: ${p.content}`)
        .join('\n\n');

      // Collect existing question texts from other tests for deduplication
      const existingQuestionsFromOtherTests = (otherQuestionsRes.data || []).map(q => q.text);

      // Collect existing question texts from THIS test for internal deduplication
      const existingQuestionsFromThisTest = (sameTestQuestionsRes.data || []).map(q => q.text);

      // Collect all axes used in this test + pattern keys as required axes
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
        },
      });
      if (error) throw error;
      if (data?.error) { toast.error(data.error); return; }
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

  const handleAISave = async () => {
    if (!aiPreview || aiSelected.size === 0) return;
    setSaving(true);
    const startOrder = questions.length + 1;
    const selected = aiPreview.filter((_, i) => aiSelected.has(i));
    const rows = selected.map((q, i) => ({
      text: q.text,
      type: q.type,
      axes: q.axes,
      weight: q.weight,
      sort_order: startOrder + i,
      options: q.options,
      option_scores: q.option_scores,
      test_id: currentModule.id,
    }));
    const { error } = await supabase.from('questions').insert(rows);
    if (error) {
      toast.error('Erro ao salvar perguntas');
    } else {
      toast.success(`${rows.length} perguntas adicionadas!`);
      setAiPreview(null);
      setAiSelected(new Set());
      setShowAIPanel(false);
      await fetchQuestions();
    }
    setSaving(false);
  };

  const renderForm = () => {
    const currentDefaults = defaultOptionsForType[form.type];
    const isCustomOptions = form.options && currentDefaults &&
      JSON.stringify(form.options) !== JSON.stringify(currentDefaults);

    const validation = validateQuestion(form.text, form.type);
    const hasIssues = validation.errors.length > 0 || validation.warnings.length > 0;

    return (
      <div className="space-y-4 p-5 rounded-2xl border border-primary/20 bg-primary/[0.02]">
        {/* Question text */}
        <div>
          <label className="text-[0.75rem] font-semibold text-foreground/80 mb-1.5 block">Texto da Afirmação</label>
          <textarea
            className={`w-full px-3 py-2.5 rounded-xl bg-background/50 border text-foreground text-[0.8rem] focus:ring-2 focus:ring-primary/20 outline-none resize-none leading-relaxed ${
              validation.errors.length > 0 ? 'border-destructive/40' : 'border-border/30'
            }`}
            rows={2}
            value={form.text}
            onChange={e => setForm(f => ({ ...f, text: e.target.value }))}
            placeholder={form.type === 'likert' ? 'Ex: Eu começo tarefas mas não termino' : form.type === 'frequency' ? 'Ex: Com que frequência você adia decisões importantes?' : 'Ex: Quando alguém critica seu trabalho, você...'}
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
            Contexto / Observação <span className="font-normal text-muted-foreground/50">(opcional)</span>
          </label>
          <textarea
            className="w-full px-3 py-2.5 rounded-xl bg-background/50 border border-border/30 text-foreground text-[0.8rem] focus:ring-2 focus:ring-primary/20 outline-none resize-none leading-relaxed"
            rows={3}
            maxLength={400}
            value={form.context || ''}
            onChange={e => setForm(f => ({ ...f, context: e.target.value }))}
            placeholder="Ex: Considere situações dos últimos 6 meses ao responder esta pergunta."
          />
          <div className="flex justify-between mt-1">
            <p className="text-[0.65rem] text-muted-foreground/50">
              Texto exibido ao usuário antes de responder, para dar contexto ou orientação.
            </p>
            <span className={`text-[0.65rem] ${(form.context?.length || 0) > 350 ? 'text-orange-400' : 'text-muted-foreground/50'}`}>
              {form.context?.length || 0}/400
            </span>
          </div>
        </div>

        {/* Type + Weight + Order */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="text-[0.75rem] font-semibold text-foreground/80 mb-1.5 block">Tipo de Pergunta</label>
            <select
              className="w-full px-3 py-2.5 rounded-xl bg-background/50 border border-border/30 text-foreground text-[0.8rem] focus:ring-2 focus:ring-primary/20"
              value={form.type}
              onChange={e => handleTypeChange(e.target.value as QuestionType)}
            >
              {Object.entries(typeLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <p className="text-[0.65rem] text-muted-foreground/50 mt-1">{typeDescriptions[form.type]}</p>
          </div>
          <div>
            <label className="text-[0.75rem] font-semibold text-foreground/80 mb-1.5 block">Peso</label>
            <input type="number" min={0.5} step={0.5} className="w-full px-3 py-2.5 rounded-xl bg-background/50 border border-border/30 text-foreground text-[0.8rem] focus:ring-2 focus:ring-primary/20" value={form.weight} onChange={e => setForm(f => ({ ...f, weight: parseFloat(e.target.value) || 1 }))} />
            <p className="text-[0.65rem] text-muted-foreground/50 mt-1">Multiplicador de pontuação</p>
          </div>
          <div>
            <label className="text-[0.75rem] font-semibold text-foreground/80 mb-1.5 block">Ordem</label>
            <input type="number" className="w-full px-3 py-2.5 rounded-xl bg-background/50 border border-border/30 text-foreground text-[0.8rem] focus:ring-2 focus:ring-primary/20" value={form.sort_order} onChange={e => setForm(f => ({ ...f, sort_order: parseInt(e.target.value) || 0 }))} />
            <p className="text-[0.65rem] text-muted-foreground/50 mt-1">Posição na sequência</p>
          </div>
        </div>

        {/* Axes */}
        <div>
          <label className="text-[0.75rem] font-semibold text-foreground/80 mb-1.5 block">Eixos Relacionados</label>
          <div className="space-y-2">
            {form.axes.map((axis, i) => (
              <div key={i} className="flex gap-2">
                <input className="flex-1 px-3 py-2 rounded-lg bg-background/50 border border-border/20 text-foreground text-[0.8rem] focus:ring-2 focus:ring-primary/20" value={axis} onChange={e => updateAxes(i, e.target.value)} placeholder="Ex: foco, disciplina, impulsividade" />
                {form.axes.length > 1 && (
                  <button onClick={() => removeAxis(i)} className="p-2 text-destructive/60 hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors"><X className="w-4 h-4" /></button>
                )}
              </div>
            ))}
            <button onClick={addAxis} className="text-[0.7rem] text-primary hover:underline">+ Adicionar eixo</button>
          </div>
        </div>

        {/* Response Options — always available */}
        <div className="border border-border/20 rounded-xl overflow-hidden">
          <button
            onClick={() => setShowOptionsEditor(!showOptionsEditor)}
            className="w-full flex items-center justify-between px-4 py-3 bg-muted/20 hover:bg-muted/30 transition-colors"
          >
            <div className="flex items-center gap-2">
              {showOptionsEditor ? <ChevronDown className="w-3.5 h-3.5 text-muted-foreground/50" /> : <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/50" />}
              <span className="text-[0.75rem] font-semibold text-foreground/80">Opções de Resposta</span>
              {isCustomOptions && <span className="text-[0.6rem] px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 font-medium">Personalizado</span>}
              {!isCustomOptions && form.options && <span className="text-[0.6rem] px-1.5 py-0.5 rounded-full bg-muted/40 text-muted-foreground/60 font-medium">Padrão</span>}
            </div>
            <span className="text-[0.65rem] text-muted-foreground/40">{(form.options || []).length} opções</span>
          </button>

          {showOptionsEditor && (
            <div className="p-4 space-y-3 border-t border-border/15">
              {form.type !== 'behavior_choice' && (
                <div className="flex items-center justify-between">
                  <p className="text-[0.68rem] text-muted-foreground/50">
                    Respostas padrão para tipo "{typeLabels[form.type]}". Edite para personalizar.
                  </p>
                  <button
                    onClick={() => setForm(f => ({ ...f, options: [...(defaultOptionsForType[f.type] || [])], option_scores: [...(defaultScoresForType[f.type] || [])] }))}
                    className="text-[0.65rem] text-primary/60 hover:text-primary transition-colors"
                  >
                    Restaurar padrão
                  </button>
                </div>
              )}

              {/* Header */}
              <div className="flex gap-2 items-center px-1">
                <span className="w-5" />
                <span className="flex-1 text-[0.65rem] font-semibold text-muted-foreground/50 uppercase tracking-wider">Texto da Resposta</span>
                <span className="w-20 text-center text-[0.65rem] font-semibold text-muted-foreground/50 uppercase tracking-wider">Pontos</span>
                <span className="w-8" />
              </div>

              <div className="space-y-2">
                {(form.options || defaultOptionsForType[form.type] || []).map((opt, i) => {
                  const score = (form.option_scores || defaultScoresForType[form.type] || [])[i] ?? 0;
                  return (
                    <div key={i} className="flex gap-2 items-center group">
                      <span className="text-[0.7rem] text-muted-foreground/40 w-5 text-right font-mono">{i + 1}.</span>
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
                        <button onClick={() => removeOption(i)} className="p-1.5 text-destructive/40 hover:text-destructive hover:bg-destructive/10 rounded-lg opacity-0 group-hover:opacity-100 transition-all w-8 flex items-center justify-center">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {(form.options || []).length <= 2 && <span className="w-8" />}
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center justify-between">
                <button onClick={addOption} className="text-[0.7rem] text-primary hover:underline">+ Adicionar opção</button>
                <p className="text-[0.6rem] text-muted-foreground/40">Pontos: 0 (mínimo) a 100 (máximo)</p>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2 justify-end pt-1">
          <button onClick={cancelEdit} className="px-4 py-2 rounded-lg text-[0.8rem] text-muted-foreground hover:text-foreground transition-colors">Cancelar</button>
          <button onClick={handleSave} disabled={saving} className="px-5 py-2 rounded-xl bg-primary text-primary-foreground text-[0.8rem] font-semibold flex items-center gap-2 disabled:opacity-50 hover:opacity-90 transition-all">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {creating ? 'Criar Pergunta' : 'Salvar Alterações'}
          </button>
        </div>
      </div>
    );
  };

  // Audit existing questions against standards
  const auditResults = useMemo(() => {
    if (loading || questions.length === 0) return null;
    let errorCount = 0;
    let warnCount = 0;
    const issues: { id: string; text: string; type: string; problems: string[] }[] = [];
    questions.forEach(q => {
      const v = validateQuestion(q.text, q.type);
      const allProblems = [...v.errors, ...v.warnings];
      if (v.errors.length) errorCount += v.errors.length;
      if (v.warnings.length) warnCount += v.warnings.length;
      if (allProblems.length > 0) issues.push({ id: q.id, text: q.text, type: q.type, problems: allProblems });
    });
    return { errorCount, warnCount, issues, total: questions.length, clean: questions.length - issues.length };
  }, [questions, loading]);

  return (
    <div className="space-y-4">
      {/* Standards banner */}
      <div className="p-3 rounded-xl border border-border/20 bg-muted/10">
        <p className="text-[0.7rem] text-muted-foreground/60 leading-relaxed">
          <span className="font-semibold text-foreground/70">📋 Padrão:</span> Likert com afirmações (sem "?"). Evite perguntas abertas e linguagem genérica. Garanta coerência entre texto e tipo de resposta.
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
              <div key={issue.id} className="text-[0.65rem] text-amber-600/70 flex items-start gap-1.5">
                <span className="shrink-0">•</span>
                <span><strong>"{issue.text.slice(0, 50)}..."</strong> — {issue.problems[0]}</span>
              </div>
            ))}
            {auditResults.issues.length > 5 && (
              <p className="text-[0.65rem] text-amber-500/50 italic">...e mais {auditResults.issues.length - 5} perguntas</p>
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

      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-3">
          <p className="text-[0.8rem] text-muted-foreground/60">
            <span className="font-semibold text-foreground">{questions.length}</span> perguntas configuradas
          </p>
          {selectedIds.size > 0 && (
            <button
              onClick={handleBulkDelete}
              disabled={bulkDeleting}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-destructive text-destructive-foreground text-[0.75rem] font-semibold hover:bg-destructive/90 disabled:opacity-50 transition-all"
            >
              {bulkDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
              Excluir {selectedIds.size} selecionada(s)
            </button>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => { setShowPreview(true); setPreviewIndex(0); setPreviewAnswers({}); }}
            disabled={questions.length === 0}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-border/40 bg-background text-foreground text-[0.8rem] font-semibold hover:bg-secondary/60 disabled:opacity-50 transition-all"
          >
            <Eye className="w-4 h-4" /> Visualizar Leitura
          </button>
          <button
            onClick={() => { setShowAIPanel(!showAIPanel); setAiPreview(null); setAiSelected(new Set()); }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-[0.8rem] font-semibold hover:opacity-90 transition-all shadow-sm"
          >
            <Sparkles className="w-4 h-4" /> Gerar com IA
          </button>
          <button onClick={startCreate} disabled={creating} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-[0.8rem] font-semibold hover:opacity-90 disabled:opacity-50 transition-all">
            <Plus className="w-4 h-4" /> Nova Pergunta
          </button>
        </div>
      </div>

      {/* Test Preview Modal */}
      {showPreview && questions.length > 0 && (() => {
        const q = questions[previewIndex];
        const opts = q.options || defaultOptionsForType[q.type] || defaultOptionsForType.likert;
        const scores = q.option_scores || defaultScoresForType[q.type] || defaultScoresForType.likert;
        const progress = (Object.keys(previewAnswers).length / questions.length) * 100;
        const currentAnswer = previewAnswers[q.id];
        const isLast = previewIndex === questions.length - 1;
        const allAnswered = Object.keys(previewAnswers).length === questions.length;

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
              <button onClick={() => setShowPreview(false)} className="p-2 rounded-lg hover:bg-secondary/50 transition-colors">
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
                      <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${progress}%` }} />
                    </div>
                  </div>

                  {/* Question */}
                  <div className="text-center space-y-3 py-2">
                    <p className="text-xl sm:text-2xl font-medium text-foreground leading-snug tracking-tight">{q.text}</p>
                    <p className="text-xs font-light text-muted-foreground/50 uppercase tracking-widest">
                      {q.type === 'frequency' ? 'Com que frequência?' : q.type === 'behavior_choice' ? 'O que você faria?' : 'Quanto você concorda?'}
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
                          onClick={() => setPreviewAnswers(prev => ({ ...prev, [q.id]: value }))}
                          className={`w-full text-left px-5 py-4 rounded-2xl border transition-all duration-200 text-sm ${
                            isSelected
                              ? 'border-primary bg-primary/[0.06] text-foreground font-medium shadow-sm'
                              : 'border-border/40 hover:border-primary/20 hover:bg-secondary/30 text-muted-foreground hover:text-foreground'
                          }`}
                        >
                          <span className="inline-flex items-center gap-4">
                            <span className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all duration-200 ${
                              isSelected ? 'border-primary bg-primary/10' : 'border-border/60'
                            }`}>
                              {isSelected && <span className="w-2.5 h-2.5 rounded-full bg-primary" />}
                            </span>
                            <span className="leading-relaxed">{opt || `(Opção ${i + 1} — vazia)`}</span>
                            <span className="ml-auto text-[0.6rem] font-mono text-muted-foreground/30">{scores[i] ?? 0}pts</span>
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Navigation */}
                  <div className="flex justify-between items-center pt-2">
                    <button
                      onClick={() => setPreviewIndex(Math.max(0, previewIndex - 1))}
                      disabled={previewIndex === 0}
                      className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground disabled:opacity-20 transition-all"
                    >
                      <ChevronLeft className="w-4 h-4" /> Anterior
                    </button>
                    <button
                      onClick={() => {
                        if (currentAnswer === undefined) return;
                        if (isLast) {
                          // Mark all answered to show summary
                          setPreviewAnswers(prev => ({ ...prev, [q.id]: currentAnswer }));
                        } else {
                          setPreviewIndex(previewIndex + 1);
                        }
                      }}
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
                          <p className="text-[0.75rem] text-foreground/80">{i + 1}. {sq.text}</p>
                          <div className="flex items-center gap-2 mt-1.5">
                            <span className="text-[0.65rem] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                              {sqOpts[ans - 1] || '?'}
                            </span>
                            <span className="text-[0.6rem] font-mono text-muted-foreground/40">{sqScores[ans - 1] ?? 0}pts</span>
                            {sq.axes.map(a => (
                              <span key={a} className="text-[0.55rem] px-1.5 py-0.5 rounded-full bg-muted/30 text-muted-foreground/50">{a}</span>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex gap-3 justify-center pt-2">
                    <button
                      onClick={() => { setPreviewIndex(0); setPreviewAnswers({}); }}
                      className="px-5 py-2.5 rounded-xl border border-border/40 text-foreground text-[0.8rem] font-semibold hover:bg-secondary/60 transition-all"
                    >
                      Refazer Simulação
                    </button>
                    <button
                      onClick={() => setShowPreview(false)}
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
      })()}

      {/* AI Generation Panel */}
      {showAIPanel && (
        <div className="p-5 rounded-2xl border border-violet-500/20 bg-violet-500/[0.03] space-y-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-violet-500" />
            <h3 className="text-[0.85rem] font-bold text-foreground">Gerar Perguntas com IA</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-[0.75rem] font-semibold text-foreground/80 mb-1.5 block">Nome do Diagnóstico</label>
              <input className="w-full px-3 py-2.5 rounded-xl bg-background/50 border border-border/30 text-foreground text-[0.8rem]" value={currentModule.name} readOnly />
            </div>
            <div>
              <label className="text-[0.75rem] font-semibold text-foreground/80 mb-1.5 block">Bloco de Perguntas</label>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { value: 10, label: '10', desc: 'Rápido' },
                  { value: 15, label: '15', desc: 'Padrão' },
                  { value: 20, label: '20', desc: 'Completo' },
                  { value: 25, label: '25', desc: 'Profundo' },
                ].map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setAiCount(opt.value)}
                    className={`flex flex-col items-center gap-0.5 px-3 py-2.5 rounded-xl border text-center transition-all ${
                      aiCount === opt.value
                        ? 'bg-primary text-primary-foreground border-primary shadow-md scale-105'
                        : 'bg-background/50 border-border/30 text-foreground/70 hover:border-primary/50'
                    }`}
                  >
                    <span className="text-lg font-bold">{opt.label}</span>
                    <span className="text-[0.6rem] opacity-70">{opt.desc}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div>
            <label className="text-[0.75rem] font-semibold text-foreground/80 mb-1.5 block">Objetivo do Diagnóstico</label>
            <p className="px-3 py-2.5 rounded-xl bg-background/50 border border-border/30 text-foreground/70 text-[0.8rem] min-h-[60px]">{aiModuleDescription || 'Clique em "Gerar" para carregar a descrição'}</p>
          </div>

          {!aiPreview && (
            <button
              onClick={handleAIGenerate}
              disabled={aiGenerating}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-[0.8rem] font-semibold hover:opacity-90 disabled:opacity-50 transition-all"
            >
              {aiGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              {aiGenerating ? 'Gerando...' : `Gerar ${aiCount} Perguntas`}
            </button>
          )}

          {/* AI Preview */}
          {aiPreview && aiPreview.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-[0.8rem] font-semibold text-foreground">
                  {aiPreview.length} perguntas geradas — selecione as que deseja adicionar
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setAiSelected(aiSelected.size === aiPreview.length ? new Set() : new Set(aiPreview.map((_, i) => i)))}
                    className="text-[0.7rem] text-violet-600 hover:underline"
                  >
                    {aiSelected.size === aiPreview.length ? 'Desmarcar todas' : 'Selecionar todas'}
                  </button>
                </div>
              </div>

              {/* Quality Metrics Banner */}
              {aiQualityMetrics && (
                <div className="p-3 rounded-xl border border-border/20 bg-muted/10 space-y-2">
                  <p className="text-[0.7rem] font-semibold text-foreground/70">📊 Métricas de Qualidade</p>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="text-center">
                      <p className={`text-lg font-bold ${aiQualityMetrics.reversePercent >= 20 ? 'text-emerald-600' : 'text-amber-500'}`}>
                        {aiQualityMetrics.reversePercent}%
                      </p>
                      <p className="text-[0.6rem] text-muted-foreground/60">Invertidas ({aiQualityMetrics.reverseCount}/{aiQualityMetrics.total})</p>
                    </div>
                    <div className="text-center">
                      <p className={`text-lg font-bold ${aiQualityMetrics.crossAxisPercent >= 35 ? 'text-emerald-600' : 'text-amber-500'}`}>
                        {aiQualityMetrics.crossAxisPercent}%
                      </p>
                      <p className="text-[0.6rem] text-muted-foreground/60">Cruzam 2 eixos ({aiQualityMetrics.crossAxisCount}/{aiQualityMetrics.total})</p>
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
                      <span>Eixos sem cobertura: <strong>{aiQualityMetrics.uncoveredAxes.join(', ')}</strong></span>
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-1.5 max-h-[400px] overflow-y-auto pr-1">
                {aiPreview.map((q, i) => (
                  <div
                    key={i}
                    onClick={() => {
                      const next = new Set(aiSelected);
                      next.has(i) ? next.delete(i) : next.add(i);
                      setAiSelected(next);
                    }}
                    className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                      aiSelected.has(i) ? 'border-violet-500/40 bg-violet-500/[0.06]' : 'border-border/20 bg-card/20 hover:border-border/40'
                    }`}
                  >
                    <div className={`mt-0.5 w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-colors ${
                      aiSelected.has(i) ? 'bg-violet-600 border-violet-600' : 'border-border/40'
                    }`}>
                      {aiSelected.has(i) && <Check className="w-3 h-3 text-white" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[0.8rem] text-foreground/80">{q.text}</p>
                      <div className="flex gap-1.5 mt-1.5 flex-wrap">
                        <span className="text-[0.6rem] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">{typeLabels[q.type] || q.type}</span>
                        {q.reverse && (
                          <span className="text-[0.6rem] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 font-medium">↔ Invertida</span>
                        )}
                        {q.axes?.map((a: string) => (
                          <span key={a} className="text-[0.6rem] px-2 py-0.5 rounded-full bg-muted/40 text-muted-foreground/60">{a}</span>
                        ))}
                        {q.axes?.length >= 2 && (
                          <span className="text-[0.6rem] px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-600 font-medium">✕ Cruzamento</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <button onClick={() => { setAiPreview(null); setAiSelected(new Set()); setAiQualityMetrics(null); }} className="px-4 py-2 rounded-lg text-[0.8rem] text-muted-foreground hover:text-foreground transition-colors">Descartar</button>
                <button onClick={handleAIGenerate} disabled={aiGenerating} className="px-4 py-2 rounded-lg text-[0.8rem] text-violet-600 hover:bg-violet-500/10 transition-colors flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" /> Regenerar
                </button>
                <button
                  onClick={handleAISave}
                  disabled={aiSelected.size === 0 || saving}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-[0.8rem] font-semibold flex items-center gap-2 disabled:opacity-50 hover:opacity-90 transition-all"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  Adicionar {aiSelected.size} pergunta{aiSelected.size !== 1 ? 's' : ''}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {creating && renderForm()}

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary/40" /></div>
      ) : (
        <div className="space-y-2">
          {/* Select all header */}
          {questions.length > 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5">
              <button onClick={toggleSelectAll} className="p-0.5 rounded hover:bg-accent/50 transition-colors">
                {selectedIds.size === questions.length ? (
                  <CheckSquare className="w-4 h-4 text-primary" />
                ) : (
                  <Square className="w-4 h-4 text-muted-foreground/40" />
                )}
              </button>
              <span className="text-[0.7rem] text-muted-foreground/50">
                {selectedIds.size > 0 ? `${selectedIds.size} selecionada(s)` : 'Selecionar todas'}
              </span>
            </div>
          )}
          {questions.map((q) => {
            const isEditing = editingId === q.id;
            const isExpanded = expandedQuestionId === q.id;
            const qValidation = validateQuestion(q.text, q.type);
            const hasQIssues = qValidation.errors.length > 0 || qValidation.warnings.length > 0;
            const isSelected = selectedIds.has(q.id);
            return isEditing ? (
              <div key={q.id}>{renderForm()}</div>
            ) : (
              <div key={q.id} className={`rounded-xl border bg-card/30 hover:border-primary/20 transition-colors overflow-hidden ${
                isSelected ? 'border-primary/40 bg-primary/[0.03]' : qValidation.errors.length > 0 ? 'border-destructive/30' : hasQIssues ? 'border-amber-500/25' : 'border-border/25'
              }`}>
                <div className="flex items-start gap-3 p-3">
                  <button onClick={() => toggleSelect(q.id)} className="p-0.5 rounded hover:bg-accent/50 transition-colors mt-0.5 shrink-0">
                    {isSelected ? (
                      <CheckSquare className="w-4 h-4 text-primary" />
                    ) : (
                      <Square className="w-4 h-4 text-muted-foreground/30" />
                    )}
                  </button>
                  <span className="text-[0.65rem] font-mono text-muted-foreground/40 mt-1 w-6 text-right">{q.sort_order}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-2">
                      <p className="text-[0.8rem] text-foreground/80 flex-1">{q.text}</p>
                      {hasQIssues && <AlertTriangle className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${qValidation.errors.length > 0 ? 'text-destructive/60' : 'text-amber-500/60'}`} />}
                    </div>
                    <div className="flex gap-1.5 mt-1.5 flex-wrap">
                      <span className="text-[0.6rem] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">{typeLabels[q.type] || q.type}</span>
                      {q.axes.map(a => (
                        <span key={a} className="text-[0.6rem] px-2 py-0.5 rounded-full bg-muted/40 text-muted-foreground/60">{a}</span>
                      ))}
                      {q.weight !== 1 && <span className="text-[0.6rem] px-2 py-0.5 rounded-full bg-accent/40 text-accent-foreground/60">peso: {q.weight}</span>}
                      {q.options && q.options.length > 0 && (
                        <button
                          onClick={() => setExpandedQuestionId(isExpanded ? null : q.id)}
                          className="text-[0.6rem] px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-600 font-medium hover:bg-indigo-500/20 transition-colors cursor-pointer"
                        >
                          {q.options.length} opções {isExpanded ? '▲' : '▼'}
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-0.5">
                    <button onClick={() => handleDuplicate(q)} disabled={saving} className="p-1.5 rounded-lg hover:bg-accent/50 transition-colors" title="Duplicar">
                      <Copy className="w-3.5 h-3.5 text-muted-foreground/50" />
                    </button>
                    <button onClick={() => startEdit(q)} className="p-1.5 rounded-lg hover:bg-accent/50 transition-colors" title="Editar">
                      <Edit3 className="w-3.5 h-3.5 text-muted-foreground/50" />
                    </button>
                    <button onClick={() => handleDelete(q.id)} className="p-1.5 rounded-lg hover:bg-destructive/10 transition-colors" title="Excluir">
                      <Trash2 className="w-3.5 h-3.5 text-destructive/60" />
                    </button>
                  </div>
                </div>

                {/* Expanded options preview with scores */}
                {isExpanded && q.options && q.options.length > 0 && (
                  <div className="px-4 pb-3 pt-0 ml-9 border-t border-border/10">
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {q.options.map((opt, i) => {
                        const score = (q.option_scores || defaultScoresForType[q.type] || [])[i];
                        return (
                          <span key={i} className="text-[0.65rem] px-2.5 py-1 rounded-lg bg-muted/30 text-foreground/60 border border-border/15 flex items-center gap-1.5">
                            <span>{i + 1}. {opt || <span className="italic text-muted-foreground/30">(vazio)</span>}</span>
                            <span className="font-mono text-primary/70 bg-primary/5 px-1 rounded">{score ?? '?'}pts</span>
                          </span>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          {questions.length === 0 && !creating && !showAIPanel && (
            <div className="text-center py-12 text-muted-foreground/40">
              <Brain className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-[0.8rem]">Nenhuma pergunta cadastrada</p>
              <p className="text-[0.7rem] mt-1">Clique em "Nova Pergunta" ou "Gerar com IA" para começar</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default QuestionsPanel;
