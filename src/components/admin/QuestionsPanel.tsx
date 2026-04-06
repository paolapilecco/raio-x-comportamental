import { useState, useEffect, useMemo } from 'react';
import { Plus, Save, Trash2, Edit3, X, Loader2, Brain, Copy, ChevronDown, ChevronRight, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { TestModule } from './promptConstants';

interface Question {
  id: string;
  test_id: string;
  text: string;
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
  text: '', type: 'likert' as QuestionType, axes: [''], weight: 1, sort_order: 0,
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

  useEffect(() => {
    fetchQuestions();
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
    setForm({
      text: q.text, type: q.type,
      axes: q.axes.length ? q.axes : [''],
      weight: q.weight, sort_order: q.sort_order,
      options: q.options || defaultOptionsForType[q.type] || null,
    });
    setShowOptionsEditor(!!q.options || q.type === 'behavior_choice');
  };

  const startCreate = () => {
    setCreating(true);
    setEditingId(null);
    const defaultOpts = defaultOptionsForType['likert'];
    setForm({ ...emptyQuestion, sort_order: questions.length + 1, options: defaultOpts });
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
    const payload = {
      text: form.text.trim(), type: form.type, axes, weight: form.weight,
      sort_order: form.sort_order, options: finalOptions,
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
    else { toast.success('Pergunta excluída!'); await fetchQuestions(); }
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
    setForm(f => ({ ...f, options: opts }));
  };

  const removeOption = (i: number) => {
    const opts = (form.options || []).filter((_, idx) => idx !== i);
    setForm(f => ({ ...f, options: opts.length > 0 ? opts : null }));
  };

  const handleTypeChange = (newType: QuestionType) => {
    const defaults = defaultOptionsForType[newType];
    setForm(f => ({ ...f, type: newType, options: defaults }));
    setShowOptionsEditor(newType === 'behavior_choice');
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
                    onClick={() => setForm(f => ({ ...f, options: [...(defaultOptionsForType[f.type] || [])] }))}
                    className="text-[0.65rem] text-primary/60 hover:text-primary transition-colors"
                  >
                    Restaurar padrão
                  </button>
                </div>
              )}

              <div className="space-y-2">
                {(form.options || defaultOptionsForType[form.type] || []).map((opt, i) => (
                  <div key={i} className="flex gap-2 items-center group">
                    <span className="text-[0.7rem] text-muted-foreground/40 w-5 text-right font-mono">{i + 1}.</span>
                    <input
                      className="flex-1 px-3 py-2 rounded-lg bg-background/50 border border-border/20 text-foreground text-[0.8rem] focus:ring-2 focus:ring-primary/20"
                      value={opt}
                      onChange={e => updateOption(i, e.target.value)}
                      placeholder={`Opção ${i + 1}`}
                    />
                    {(form.options || []).length > 2 && (
                      <button onClick={() => removeOption(i)} className="p-1.5 text-destructive/40 hover:text-destructive hover:bg-destructive/10 rounded-lg opacity-0 group-hover:opacity-100 transition-all">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <button onClick={addOption} className="text-[0.7rem] text-primary hover:underline">+ Adicionar opção</button>
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

      <div className="flex items-center justify-between">
        <p className="text-[0.8rem] text-muted-foreground/60">
          <span className="font-semibold text-foreground">{questions.length}</span> perguntas configuradas
        </p>
        <button onClick={startCreate} disabled={creating} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-[0.8rem] font-semibold hover:opacity-90 disabled:opacity-50 transition-all">
          <Plus className="w-4 h-4" /> Nova Pergunta
        </button>
      </div>

      {creating && renderForm()}

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary/40" /></div>
      ) : (
        <div className="space-y-2">
          {questions.map((q) => {
            const isEditing = editingId === q.id;
            const isExpanded = expandedQuestionId === q.id;
            const qValidation = validateQuestion(q.text, q.type);
            const hasQIssues = qValidation.errors.length > 0 || qValidation.warnings.length > 0;
            return isEditing ? (
              <div key={q.id}>{renderForm()}</div>
            ) : (
              <div key={q.id} className={`rounded-xl border bg-card/30 hover:border-primary/20 transition-colors overflow-hidden ${
                qValidation.errors.length > 0 ? 'border-destructive/30' : hasQIssues ? 'border-amber-500/25' : 'border-border/25'
              }`}>
                <div className="flex items-start gap-3 p-3">
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

                {/* Expanded options preview */}
                {isExpanded && q.options && q.options.length > 0 && (
                  <div className="px-4 pb-3 pt-0 ml-9 border-t border-border/10">
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {q.options.map((opt, i) => (
                        <span key={i} className="text-[0.65rem] px-2.5 py-1 rounded-lg bg-muted/30 text-foreground/60 border border-border/15">
                          {i + 1}. {opt || <span className="italic text-muted-foreground/30">(vazio)</span>}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          {questions.length === 0 && !creating && (
            <div className="text-center py-12 text-muted-foreground/40">
              <Brain className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-[0.8rem]">Nenhuma pergunta cadastrada</p>
              <p className="text-[0.7rem] mt-1">Clique em "Nova Pergunta" para começar</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default QuestionsPanel;
