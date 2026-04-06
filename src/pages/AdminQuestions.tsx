import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft, Plus, Save, Trash2, Loader2, Edit3, X, CheckSquare, Square,
  Brain, Heart, Zap, DollarSign, Eye, Compass, Shield, Sparkles, AlertTriangle,
  BookOpen, CheckCircle2, XCircle,
} from 'lucide-react';
import { toast } from 'sonner';

interface Question {
  id: string;
  test_id: string;
  text: string;
  type: 'likert' | 'behavior_choice' | 'frequency' | 'intensity';
  axes: string[];
  weight: number;
  sort_order: number;
  options: string[] | null;
}

interface TestModule {
  id: string;
  slug: string;
  name: string;
  icon: string;
  description: string;
}

interface TestPrompt {
  id: string;
  prompt_type: string;
  title: string;
  content: string;
  is_active: boolean;
}

const iconMap: Record<string, any> = {
  brain: Brain, heart: Heart, zap: Zap, 'dollar-sign': DollarSign,
  eye: Eye, compass: Compass, shield: Shield,
};

const typeLabels: Record<string, string> = {
  likert: 'Likert (Concordância)',
  behavior_choice: 'Escolha Comportamental',
  frequency: 'Frequência',
  intensity: 'Intensidade',
};

const promptTypeLabels: Record<string, string> = {
  interpretation: 'Interpretação',
  diagnosis: 'Diagnóstico',
  profile: 'Perfil',
  core_pain: 'Dor Central',
  triggers: 'Gatilhos',
  direction: 'Direção',
  restrictions: 'Restrições',
};

type QuestionType = 'likert' | 'behavior_choice' | 'frequency' | 'intensity';

const emptyQuestion: { text: string; type: QuestionType; axes: string[]; weight: number; sort_order: number; options: string[] | null } = {
  text: '', type: 'likert', axes: [''], weight: 1, sort_order: 0, options: null,
};

// Extract key axes/themes from prompt content
function extractCriteriaFromPrompts(prompts: TestPrompt[]): { axes: string[]; themes: string[]; restrictions: string[] } {
  const axes: Set<string> = new Set();
  const themes: Set<string> = new Set();
  const restrictions: string[] = [];

  for (const p of prompts) {
    if (!p.content || !p.is_active) continue;

    // Extract axes mentioned in prompts (snake_case patterns)
    const axisMatches = p.content.match(/\b[a-z]+_[a-z_]+\b/g);
    if (axisMatches) axisMatches.forEach(a => axes.add(a));

    // Extract themes from key phrases
    const themePatterns = p.content.match(/(?:analis[ae]r?|identificar|avaliar|medir|detectar|mapear)\s+([^.,:;]+)/gi);
    if (themePatterns) themePatterns.forEach(t => {
      const clean = t.replace(/^(analisar?|identificar|avaliar|medir|detectar|mapear)\s+/i, '').trim();
      if (clean.length > 3 && clean.length < 80) themes.add(clean);
    });

    if (p.prompt_type === 'restrictions') {
      const lines = p.content.split('\n').filter(l => l.trim().startsWith('-') || l.trim().startsWith('•'));
      lines.forEach(l => restrictions.push(l.replace(/^[-•]\s*/, '').trim()));
    }
  }

  return { axes: Array.from(axes).slice(0, 15), themes: Array.from(themes).slice(0, 10), restrictions: restrictions.slice(0, 10) };
}

// Validate question against criteria
function validateQuestion(q: { text: string; type: string; axes: string[]; weight: number }, criteria: ReturnType<typeof extractCriteriaFromPrompts>): { valid: boolean; warnings: string[] } {
  const warnings: string[] = [];

  if (q.text.length < 10) warnings.push('Texto muito curto (mínimo 10 caracteres)');
  if (q.text.length > 300) warnings.push('Texto muito longo (máximo 300 caracteres)');

  // Likert should be statements, not questions
  if (q.type === 'likert' && q.text.includes('?')) warnings.push('Likert deve usar afirmações, não perguntas');

  // Frequency should be questions
  if (q.type === 'frequency' && !q.text.includes('?') && !q.text.toLowerCase().includes('frequência')) warnings.push('Frequência geralmente usa perguntas com "?"');

  // Check if axes match prompt criteria
  if (criteria.axes.length > 0) {
    const hasRelevantAxis = q.axes.some(a => criteria.axes.some(ca => a.includes(ca) || ca.includes(a)));
    if (!hasRelevantAxis && q.axes[0] !== '' && q.axes[0] !== 'geral') {
      warnings.push('Eixo(s) não encontrado(s) nos prompts do diagnóstico');
    }
  }

  // Generic question detection
  const genericTerms = ['melhorar', 'equilíbrio', 'zona de conforto', 'ser feliz', 'sucesso'];
  if (genericTerms.some(t => q.text.toLowerCase().includes(t))) warnings.push('Evite linguagem genérica e motivacional');

  // Open question detection
  if (/^(por que|como|o que|explique)/i.test(q.text.trim())) warnings.push('Perguntas abertas não são permitidas');

  return { valid: warnings.length === 0, warnings };
}

export default function AdminQuestions() {
  const { isSuperAdmin, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectedTestId = searchParams.get('test_id');

  const [modules, setModules] = useState<TestModule[]>([]);
  const [selectedTestId, setSelectedTestId] = useState<string>('');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [prompts, setPrompts] = useState<TestPrompt[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState(emptyQuestion);
  const [suggesting, setSuggesting] = useState(false);
  const [suggestion, setSuggestion] = useState<{ reasoning?: { type_reason?: string; axes_reason?: string; weight_reason?: string } } | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);
  const [showCriteria, setShowCriteria] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!isSuperAdmin) { navigate('/dashboard', { replace: true }); return; }
    fetchModules();
  }, [authLoading, isSuperAdmin]);

  useEffect(() => {
    if (selectedTestId) {
      fetchQuestions();
      fetchPrompts();
      setSelectedIds(new Set());
    }
  }, [selectedTestId]);

  const fetchModules = async () => {
    const { data } = await supabase.from('test_modules').select('id, slug, name, icon, description').order('sort_order');
    if (data && data.length > 0) {
      setModules(data);
      setSelectedTestId(preselectedTestId || data[0].id);
    }
    setLoading(false);
  };

  const fetchQuestions = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('questions')
      .select('*')
      .eq('test_id', selectedTestId)
      .order('sort_order');
    if (error) toast.error('Erro ao carregar perguntas');
    else setQuestions(data || []);
    setLoading(false);
  };

  const fetchPrompts = async () => {
    const { data } = await supabase
      .from('test_prompts')
      .select('id, prompt_type, title, content, is_active')
      .eq('test_id', selectedTestId);
    setPrompts(data || []);
  };

  const criteria = extractCriteriaFromPrompts(prompts);

  const startEdit = (q: Question) => {
    setEditingId(q.id);
    setCreating(false);
    setForm({
      text: q.text, type: q.type, axes: q.axes.length ? q.axes : [''],
      weight: q.weight, sort_order: q.sort_order, options: q.options,
    });
  };

  const startCreate = () => {
    setCreating(true);
    setEditingId(null);
    setForm({ ...emptyQuestion, sort_order: questions.length + 1 });
  };

  const cancelEdit = () => { setEditingId(null); setCreating(false); setSuggestion(null); };

  const handleSuggestWithAI = async () => {
    if (!form.text.trim() || form.text.trim().length < 5) {
      toast.error('Digite pelo menos 5 caracteres para sugerir');
      return;
    }
    setSuggesting(true);
    setSuggestion(null);
    try {
      const { data, error } = await supabase.functions.invoke('suggest-question-config', {
        body: { questionText: form.text.trim(), testName: selectedModule?.name || '' },
      });
      if (error) throw error;
      if (data?.suggestion) {
        setSuggestion(data.suggestion);
        toast.success('Sugestão gerada! Revise e aceite abaixo.');
      } else {
        toast.error('Não foi possível gerar sugestão');
      }
    } catch (err: any) {
      console.error(err);
      toast.error('Erro ao gerar sugestão com IA');
    } finally {
      setSuggesting(false);
    }
  };

  const applySuggestion = () => {
    if (!suggestion) return;
    const s = suggestion as any;
    setForm(f => ({
      ...f,
      type: s.type || f.type,
      axes: s.axes?.length ? s.axes : f.axes,
      weight: s.weight || f.weight,
      options: s.type === 'behavior_choice' ? (s.options || f.options) : null,
    }));
    setSuggestion(null);
    toast.success('Sugestão aplicada! Ajuste se necessário.');
  };

  const formValidation = validateQuestion(form, criteria);

  const handleSave = async () => {
    if (!form.text.trim()) { toast.error('Texto da pergunta é obrigatório'); return; }
    const axes = form.axes.filter(a => a.trim());
    if (axes.length === 0) { toast.error('Pelo menos um eixo é obrigatório'); return; }

    if (formValidation.warnings.length > 0) {
      const proceed = confirm(`⚠️ Avisos de critério:\n\n${formValidation.warnings.map(w => `• ${w}`).join('\n')}\n\nDeseja salvar mesmo assim?`);
      if (!proceed) return;
    }

    setSaving(true);
    const payload = {
      text: form.text.trim(),
      type: form.type,
      axes,
      weight: form.weight,
      sort_order: form.sort_order,
      options: form.type === 'behavior_choice' ? form.options : null,
      test_id: selectedTestId,
    };

    if (creating) {
      const { error } = await supabase.from('questions').insert(payload);
      if (error) { toast.error('Erro ao criar pergunta'); console.error(error); }
      else { toast.success('Pergunta criada!'); setCreating(false); await fetchQuestions(); }
    } else if (editingId) {
      const { error } = await supabase.from('questions').update(payload).eq('id', editingId);
      if (error) { toast.error('Erro ao atualizar'); console.error(error); }
      else { toast.success('Pergunta atualizada!'); setEditingId(null); await fetchQuestions(); }
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
    setDeleting(true);
    const { error } = await supabase.from('questions').delete().in('id', Array.from(selectedIds));
    if (error) { toast.error('Erro ao excluir perguntas'); }
    else { toast.success(`${selectedIds.size} pergunta(s) excluída(s)!`); setSelectedIds(new Set()); await fetchQuestions(); }
    setDeleting(false);
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
    const opts = [...(form.options || ['', '', '', '', ''])];
    opts[index] = value;
    setForm(f => ({ ...f, options: opts }));
  };

  if (authLoading || (loading && !modules.length)) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const selectedModule = modules.find(m => m.id === selectedTestId);
  const hasPrompts = prompts.some(p => p.is_active && p.content.trim());

  const renderCriteriaPanel = () => {
    if (!showCriteria) return null;
    return (
      <motion.div
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: 'auto' }}
        exit={{ opacity: 0, height: 0 }}
        className="mb-4 p-4 rounded-xl border-2 border-amber-500/30 bg-amber-500/5"
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-amber-500" />
            Critérios Baseados nos Prompts
          </h3>
          <button onClick={() => setShowCriteria(false)} className="p-1 hover:bg-accent rounded">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        {!hasPrompts ? (
          <div className="text-sm text-amber-600 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            Nenhum prompt ativo encontrado para este diagnóstico. Configure os prompts primeiro para ter critérios rigorosos.
          </div>
        ) : (
          <div className="space-y-3">
            {criteria.axes.length > 0 && (
              <div>
                <span className="text-xs font-medium text-foreground">Eixos detectados nos prompts:</span>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {criteria.axes.map(a => (
                    <span key={a} className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-mono">{a}</span>
                  ))}
                </div>
              </div>
            )}
            {criteria.themes.length > 0 && (
              <div>
                <span className="text-xs font-medium text-foreground">Temas a serem cobertos:</span>
                <ul className="mt-1 space-y-0.5">
                  {criteria.themes.map((t, i) => (
                    <li key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
                      <CheckCircle2 className="w-3 h-3 mt-0.5 text-green-500 shrink-0" />
                      {t}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {criteria.restrictions.length > 0 && (
              <div>
                <span className="text-xs font-medium text-destructive">Restrições:</span>
                <ul className="mt-1 space-y-0.5">
                  {criteria.restrictions.map((r, i) => (
                    <li key={i} className="text-xs text-destructive/80 flex items-start gap-1.5">
                      <XCircle className="w-3 h-3 mt-0.5 shrink-0" />
                      {r}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="pt-2 border-t border-border">
              <span className="text-xs font-medium text-foreground">Prompts ativos:</span>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {prompts.filter(p => p.is_active && p.content.trim()).map(p => (
                  <span key={p.id} className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                    {promptTypeLabels[p.prompt_type] || p.prompt_type}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}
      </motion.div>
    );
  };

  const renderForm = () => (
    <div className="space-y-4 p-4 rounded-xl border border-border bg-card">
      {/* Validation warnings */}
      {form.text.trim().length >= 5 && formValidation.warnings.length > 0 && (
        <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 space-y-1">
          {formValidation.warnings.map((w, i) => (
            <p key={i} className="text-xs text-amber-600 flex items-center gap-1.5">
              <AlertTriangle className="w-3 h-3 shrink-0" /> {w}
            </p>
          ))}
        </div>
      )}

      <div>
        <label className="text-sm font-medium text-foreground mb-1 block">Texto da Afirmação</label>
        <textarea
          className="w-full px-3 py-2 rounded-lg bg-background border border-border text-foreground text-sm focus:ring-2 focus:ring-primary/50 outline-none resize-none"
          rows={2}
          value={form.text}
          onChange={e => setForm(f => ({ ...f, text: e.target.value }))}
          placeholder="Ex: Eu sinto desconforto ao lidar com dinheiro"
        />
        <button
          onClick={handleSuggestWithAI}
          disabled={suggesting || form.text.trim().length < 5}
          className="mt-2 px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 bg-accent text-accent-foreground hover:bg-accent/80 disabled:opacity-50 transition-colors"
        >
          {suggesting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
          Sugerir Configuração com IA
        </button>
      </div>

      {suggestion && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-3 rounded-xl border-2 border-primary/30 bg-primary/5 space-y-3"
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-primary flex items-center gap-1.5">
              <Sparkles className="w-4 h-4" /> Sugestão da IA
            </span>
            <button onClick={() => setSuggestion(null)} className="p-1 hover:bg-primary/10 rounded">
              <X className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            <div>
              <span className="font-medium text-foreground">Tipo:</span>{' '}
              <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary">{typeLabels[(suggestion as any).type] || (suggestion as any).type}</span>
              {suggestion.reasoning?.type_reason && (
                <p className="text-muted-foreground mt-1 italic">{suggestion.reasoning.type_reason}</p>
              )}
            </div>
            <div>
              <span className="font-medium text-foreground">Eixos:</span>{' '}
              {((suggestion as any).axes || []).map((a: string) => (
                <span key={a} className="inline-block px-2 py-0.5 rounded-full bg-muted text-muted-foreground mr-1">{a}</span>
              ))}
              {suggestion.reasoning?.axes_reason && (
                <p className="text-muted-foreground mt-1 italic">{suggestion.reasoning.axes_reason}</p>
              )}
            </div>
            <div>
              <span className="font-medium text-foreground">Peso:</span>{' '}
              <span className="px-2 py-0.5 rounded-full bg-accent text-accent-foreground">{(suggestion as any).weight}</span>
              {suggestion.reasoning?.weight_reason && (
                <p className="text-muted-foreground mt-1 italic">{suggestion.reasoning.weight_reason}</p>
              )}
            </div>
          </div>

          {(suggestion as any).type === 'behavior_choice' && (suggestion as any).options && (
            <div className="text-xs">
              <span className="font-medium text-foreground">Opções sugeridas:</span>
              <ol className="list-decimal list-inside mt-1 text-muted-foreground space-y-0.5">
                {(suggestion as any).options.map((opt: string, i: number) => (
                  <li key={i}>{opt}</li>
                ))}
              </ol>
            </div>
          )}

          <div className="flex gap-2 justify-end">
            <button onClick={() => setSuggestion(null)} className="px-3 py-1.5 rounded-lg text-xs text-muted-foreground hover:text-foreground">
              Ignorar
            </button>
            <button onClick={applySuggestion} className="px-3 py-1.5 rounded-lg text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90">
              Aplicar Sugestão
            </button>
          </div>
        </motion.div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="text-sm font-medium text-foreground mb-1 block">Tipo</label>
          <select
            className="w-full px-3 py-2 rounded-lg bg-background border border-border text-foreground text-sm"
            value={form.type}
            onChange={e => {
              const t = e.target.value as Question['type'];
              setForm(f => ({
                ...f, type: t,
                options: t === 'behavior_choice' ? (f.options || ['', '', '', '', '']) : null,
              }));
            }}
          >
            {Object.entries(typeLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <div>
          <label className="text-sm font-medium text-foreground mb-1 block">Peso</label>
          <input
            type="number"
            min={0.5}
            step={0.5}
            className="w-full px-3 py-2 rounded-lg bg-background border border-border text-foreground text-sm"
            value={form.weight}
            onChange={e => setForm(f => ({ ...f, weight: parseFloat(e.target.value) || 1 }))}
          />
        </div>
        <div>
          <label className="text-sm font-medium text-foreground mb-1 block">Ordem</label>
          <input
            type="number"
            className="w-full px-3 py-2 rounded-lg bg-background border border-border text-foreground text-sm"
            value={form.sort_order}
            onChange={e => setForm(f => ({ ...f, sort_order: parseInt(e.target.value) || 0 }))}
          />
        </div>
      </div>

      <div>
        <label className="text-sm font-medium text-foreground mb-1 block">Eixos</label>
        {criteria.axes.length > 0 && (
          <div className="mb-2">
            <span className="text-xs text-muted-foreground">Eixos sugeridos (clique para usar):</span>
            <div className="flex flex-wrap gap-1 mt-1">
              {criteria.axes.slice(0, 8).map(a => (
                <button
                  key={a}
                  type="button"
                  onClick={() => {
                    const emptyIdx = form.axes.findIndex(ax => !ax.trim());
                    if (emptyIdx >= 0) updateAxes(emptyIdx, a);
                    else setForm(f => ({ ...f, axes: [...f.axes, a] }));
                  }}
                  className="text-xs px-2 py-0.5 rounded-full bg-primary/5 text-primary hover:bg-primary/15 transition-colors font-mono"
                >
                  {a}
                </button>
              ))}
            </div>
          </div>
        )}
        <div className="space-y-2">
          {form.axes.map((axis, i) => (
            <div key={i} className="flex gap-2">
              <input
                className="flex-1 px-3 py-2 rounded-lg bg-background border border-border text-foreground text-sm"
                value={axis}
                onChange={e => updateAxes(i, e.target.value)}
                placeholder="Ex: discomfort_escape"
              />
              {form.axes.length > 1 && (
                <button onClick={() => removeAxis(i)} className="p-2 text-destructive hover:bg-destructive/10 rounded-lg">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
          <button onClick={addAxis} className="text-xs text-primary hover:underline">+ Adicionar eixo</button>
        </div>
      </div>

      {form.type === 'behavior_choice' && (
        <div>
          <label className="text-sm font-medium text-foreground mb-1 block">Opções (5 respostas progressivas)</label>
          <div className="space-y-2">
            {(form.options || ['', '', '', '', '']).map((opt, i) => (
              <div key={i} className="flex gap-2 items-center">
                <span className="text-xs text-muted-foreground w-4">{i + 1}.</span>
                <input
                  className="flex-1 px-3 py-2 rounded-lg bg-background border border-border text-foreground text-sm"
                  value={opt}
                  onChange={e => updateOption(i, e.target.value)}
                  placeholder={`Opção ${i + 1}`}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-2 justify-end">
        <button onClick={cancelEdit} className="px-4 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground">
          Cancelar
        </button>
        <button onClick={handleSave} disabled={saving} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium flex items-center gap-2 disabled:opacity-50">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {creating ? 'Criar' : 'Salvar'}
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate('/admin/prompts')} className="p-2 rounded-lg hover:bg-accent transition-colors">
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Perguntas dos Diagnósticos</h1>
            <p className="text-sm text-muted-foreground">Gerenciar perguntas por módulo de leitura</p>
          </div>
        </div>

        {/* Module selector */}
        <div className="flex gap-2 flex-wrap mb-6">
          {modules.map(mod => {
            const ModIcon = iconMap[mod.icon] || Brain;
            return (
              <button
                key={mod.id}
                onClick={() => { setSelectedTestId(mod.id); cancelEdit(); }}
                className={`px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors border ${
                  selectedTestId === mod.id
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border text-muted-foreground hover:border-primary/50'
                }`}
              >
                <ModIcon className="w-4 h-4" />
                {mod.name}
              </button>
            );
          })}
        </div>

        {selectedModule && (
          <>
            {/* Criteria toggle + actions bar */}
            <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
              <div className="flex items-center gap-3">
                <p className="text-sm text-muted-foreground">
                  {questions.length} perguntas em <span className="font-medium text-foreground">{selectedModule.name}</span>
                </p>
                <button
                  onClick={() => setShowCriteria(!showCriteria)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors border ${
                    showCriteria ? 'border-amber-500/50 bg-amber-500/10 text-amber-600' : 'border-border text-muted-foreground hover:border-amber-500/30'
                  }`}
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  Critérios
                </button>
              </div>
              <div className="flex items-center gap-2">
                {selectedIds.size > 0 && (
                  <button
                    onClick={handleBulkDelete}
                    disabled={deleting}
                    className="px-3 py-2 rounded-lg bg-destructive text-destructive-foreground text-sm font-medium flex items-center gap-2 hover:bg-destructive/90 disabled:opacity-50"
                  >
                    {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                    Excluir {selectedIds.size} selecionada(s)
                  </button>
                )}
                <button
                  onClick={startCreate}
                  disabled={creating}
                  className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium flex items-center gap-2 hover:bg-primary/90 disabled:opacity-50"
                >
                  <Plus className="w-4 h-4" /> Nova Pergunta
                </button>
              </div>
            </div>

            {renderCriteriaPanel()}
          </>
        )}

        {creating && renderForm()}

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
        ) : (
          <div className="space-y-2 mt-4">
            {/* Select all header */}
            {questions.length > 0 && (
              <div className="flex items-center gap-2 px-3 py-1.5">
                <button onClick={toggleSelectAll} className="p-0.5 rounded hover:bg-accent transition-colors">
                  {selectedIds.size === questions.length ? (
                    <CheckSquare className="w-4 h-4 text-primary" />
                  ) : (
                    <Square className="w-4 h-4 text-muted-foreground" />
                  )}
                </button>
                <span className="text-xs text-muted-foreground">
                  {selectedIds.size > 0 ? `${selectedIds.size} selecionada(s)` : 'Selecionar todas'}
                </span>
              </div>
            )}

            {questions.map((q, index) => {
              const isEditing = editingId === q.id;
              const isSelected = selectedIds.has(q.id);
              const qValidation = validateQuestion(q, criteria);
              return (
                <motion.div key={q.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.02 }}>
                  {isEditing ? renderForm() : (
                    <div className={`p-3 rounded-xl border transition-colors ${
                      isSelected ? 'border-primary/50 bg-primary/5' : 'border-border bg-card hover:border-primary/30'
                    }`}>
                      <div className="flex items-start gap-3">
                        <button onClick={() => toggleSelect(q.id)} className="p-0.5 rounded hover:bg-accent transition-colors mt-0.5">
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-primary" />
                          ) : (
                            <Square className="w-4 h-4 text-muted-foreground" />
                          )}
                        </button>
                        <span className="text-xs font-mono text-muted-foreground mt-1 w-6 text-right">{q.sort_order}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-foreground">{q.text}</p>
                          <div className="flex gap-2 mt-1 flex-wrap items-center">
                            <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">{typeLabels[q.type] || q.type}</span>
                            {q.axes.map(a => (
                              <span key={a} className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{a}</span>
                            ))}
                            {q.weight !== 1 && <span className="text-xs px-2 py-0.5 rounded-full bg-accent text-accent-foreground">peso: {q.weight}</span>}
                            {!qValidation.valid && (
                              <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3" /> {qValidation.warnings.length} aviso(s)
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <button onClick={() => startEdit(q)} className="p-1.5 rounded-lg hover:bg-accent" title="Editar">
                            <Edit3 className="w-3.5 h-3.5 text-muted-foreground" />
                          </button>
                          <button onClick={() => handleDelete(q.id)} className="p-1.5 rounded-lg hover:bg-destructive/10" title="Excluir">
                            <Trash2 className="w-3.5 h-3.5 text-destructive" />
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </motion.div>
              );
            })}
            {questions.length === 0 && !creating && (
              <div className="text-center py-12 text-muted-foreground">
                <Brain className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>Nenhuma pergunta cadastrada para este módulo</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
