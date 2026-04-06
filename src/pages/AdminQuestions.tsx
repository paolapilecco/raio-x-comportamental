import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft, Plus, Save, Trash2, Loader2, Edit3, X, ChevronDown, ChevronRight,
  GripVertical, Brain, Heart, Zap, DollarSign, Eye, Compass, Shield, Sparkles,
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

type QuestionType = 'likert' | 'behavior_choice' | 'frequency' | 'intensity';

const emptyQuestion: { text: string; type: QuestionType; axes: string[]; weight: number; sort_order: number; options: string[] | null } = {
  text: '', type: 'likert', axes: [''], weight: 1, sort_order: 0, options: null,
};

export default function AdminQuestions() {
  const { isSuperAdmin, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectedTestId = searchParams.get('test_id');

  const [modules, setModules] = useState<TestModule[]>([]);
  const [selectedTestId, setSelectedTestId] = useState<string>('');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState(emptyQuestion);

  useEffect(() => {
    if (authLoading) return;
    if (!isSuperAdmin) { navigate('/dashboard', { replace: true }); return; }
    fetchModules();
  }, [authLoading, isSuperAdmin]);

  useEffect(() => {
    if (selectedTestId) fetchQuestions();
  }, [selectedTestId]);

  const fetchModules = async () => {
    const { data } = await supabase.from('test_modules').select('id, slug, name, icon').order('sort_order');
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

  const cancelEdit = () => { setEditingId(null); setCreating(false); };

  const handleSave = async () => {
    if (!form.text.trim()) { toast.error('Texto da pergunta é obrigatório'); return; }
    const axes = form.axes.filter(a => a.trim());
    if (axes.length === 0) { toast.error('Pelo menos um eixo é obrigatório'); return; }

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

  const renderForm = () => (
    <div className="space-y-4 p-4 rounded-xl border border-border bg-card">
      <div>
        <label className="text-sm font-medium text-foreground mb-1 block">Texto da Afirmação</label>
        <textarea
          className="w-full px-3 py-2 rounded-lg bg-background border border-border text-foreground text-sm focus:ring-2 focus:ring-primary/50 outline-none resize-none"
          rows={2}
          value={form.text}
          onChange={e => setForm(f => ({ ...f, text: e.target.value }))}
          placeholder="Ex: Eu sinto desconforto ao lidar com dinheiro"
        />
      </div>

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
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-muted-foreground">
              {questions.length} perguntas em <span className="font-medium text-foreground">{selectedModule.name}</span>
            </p>
            <button
              onClick={startCreate}
              disabled={creating}
              className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium flex items-center gap-2 hover:bg-primary/90 disabled:opacity-50"
            >
              <Plus className="w-4 h-4" /> Nova Pergunta
            </button>
          </div>
        )}

        {creating && renderForm()}

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
        ) : (
          <div className="space-y-2 mt-4">
            {questions.map((q, index) => {
              const isEditing = editingId === q.id;
              return (
                <motion.div key={q.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.02 }}>
                  {isEditing ? renderForm() : (
                    <div className="p-3 rounded-xl border border-border bg-card hover:border-primary/30 transition-colors">
                      <div className="flex items-start gap-3">
                        <span className="text-xs font-mono text-muted-foreground mt-1 w-6 text-right">{q.sort_order}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-foreground">{q.text}</p>
                          <div className="flex gap-2 mt-1 flex-wrap">
                            <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">{typeLabels[q.type] || q.type}</span>
                            {q.axes.map(a => (
                              <span key={a} className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{a}</span>
                            ))}
                            {q.weight !== 1 && <span className="text-xs px-2 py-0.5 rounded-full bg-accent text-accent-foreground">peso: {q.weight}</span>}
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
