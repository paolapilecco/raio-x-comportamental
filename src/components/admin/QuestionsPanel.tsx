import { useState, useEffect } from 'react';
import { Plus, Save, Trash2, Edit3, X, Loader2, Brain } from 'lucide-react';
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
}

const typeLabels: Record<string, string> = {
  likert: 'Likert (Concordância)',
  behavior_choice: 'Escolha Comportamental',
  frequency: 'Frequência',
  intensity: 'Intensidade',
};

type QuestionType = 'likert' | 'behavior_choice' | 'frequency' | 'intensity';

const emptyQuestion = {
  text: '', type: 'likert' as QuestionType, axes: [''], weight: 1, sort_order: 0, options: null as string[] | null,
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
    setForm({ text: q.text, type: q.type, axes: q.axes.length ? q.axes : [''], weight: q.weight, sort_order: q.sort_order, options: q.options });
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
      text: form.text.trim(), type: form.type, axes, weight: form.weight,
      sort_order: form.sort_order, options: form.type === 'behavior_choice' ? form.options : null,
      test_id: currentModule.id,
    };
    if (creating) {
      const { error } = await supabase.from('questions').insert(payload);
      if (error) toast.error('Erro ao criar pergunta');
      else { toast.success('Pergunta criada!'); setCreating(false); await fetchQuestions(); }
    } else if (editingId) {
      const { error } = await supabase.from('questions').update(payload).eq('id', editingId);
      if (error) toast.error('Erro ao atualizar');
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

  const renderForm = () => (
    <div className="space-y-4 p-4 rounded-xl border border-border/30 bg-card/40">
      <div>
        <label className="text-[0.75rem] font-semibold text-foreground/80 mb-1 block">Texto da Afirmação</label>
        <textarea
          className="w-full px-3 py-2 rounded-lg bg-background/50 border border-border/20 text-foreground text-[0.8rem] focus:ring-2 focus:ring-primary/20 outline-none resize-none"
          rows={2}
          value={form.text}
          onChange={e => setForm(f => ({ ...f, text: e.target.value }))}
          placeholder="Ex: Eu sinto desconforto ao lidar com dinheiro"
        />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div>
          <label className="text-[0.75rem] font-semibold text-foreground/80 mb-1 block">Tipo</label>
          <select
            className="w-full px-3 py-2 rounded-lg bg-background/50 border border-border/20 text-foreground text-[0.8rem]"
            value={form.type}
            onChange={e => {
              const t = e.target.value as QuestionType;
              setForm(f => ({ ...f, type: t, options: t === 'behavior_choice' ? (f.options || ['', '', '', '', '']) : null }));
            }}
          >
            {Object.entries(typeLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <div>
          <label className="text-[0.75rem] font-semibold text-foreground/80 mb-1 block">Peso</label>
          <input type="number" min={0.5} step={0.5} className="w-full px-3 py-2 rounded-lg bg-background/50 border border-border/20 text-foreground text-[0.8rem]" value={form.weight} onChange={e => setForm(f => ({ ...f, weight: parseFloat(e.target.value) || 1 }))} />
        </div>
        <div>
          <label className="text-[0.75rem] font-semibold text-foreground/80 mb-1 block">Ordem</label>
          <input type="number" className="w-full px-3 py-2 rounded-lg bg-background/50 border border-border/20 text-foreground text-[0.8rem]" value={form.sort_order} onChange={e => setForm(f => ({ ...f, sort_order: parseInt(e.target.value) || 0 }))} />
        </div>
      </div>
      <div>
        <label className="text-[0.75rem] font-semibold text-foreground/80 mb-1 block">Eixos</label>
        <div className="space-y-2">
          {form.axes.map((axis, i) => (
            <div key={i} className="flex gap-2">
              <input className="flex-1 px-3 py-2 rounded-lg bg-background/50 border border-border/20 text-foreground text-[0.8rem]" value={axis} onChange={e => updateAxes(i, e.target.value)} placeholder="Ex: discomfort_escape" />
              {form.axes.length > 1 && (
                <button onClick={() => removeAxis(i)} className="p-2 text-destructive hover:bg-destructive/10 rounded-lg"><X className="w-4 h-4" /></button>
              )}
            </div>
          ))}
          <button onClick={addAxis} className="text-[0.7rem] text-primary hover:underline">+ Adicionar eixo</button>
        </div>
      </div>
      {form.type === 'behavior_choice' && (
        <div>
          <label className="text-[0.75rem] font-semibold text-foreground/80 mb-1 block">Opções (5 respostas)</label>
          <div className="space-y-2">
            {(form.options || ['', '', '', '', '']).map((opt, i) => (
              <div key={i} className="flex gap-2 items-center">
                <span className="text-[0.7rem] text-muted-foreground/50 w-4">{i + 1}.</span>
                <input className="flex-1 px-3 py-2 rounded-lg bg-background/50 border border-border/20 text-foreground text-[0.8rem]" value={opt} onChange={e => updateOption(i, e.target.value)} placeholder={`Opção ${i + 1}`} />
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="flex gap-2 justify-end">
        <button onClick={cancelEdit} className="px-4 py-2 rounded-lg text-[0.8rem] text-muted-foreground hover:text-foreground">Cancelar</button>
        <button onClick={handleSave} disabled={saving} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-[0.8rem] font-semibold flex items-center gap-2 disabled:opacity-50">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {creating ? 'Criar' : 'Salvar'}
        </button>
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
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
            return isEditing ? (
              <div key={q.id}>{renderForm()}</div>
            ) : (
              <div key={q.id} className="p-3 rounded-xl border border-border/25 bg-card/30 hover:border-primary/20 transition-colors">
                <div className="flex items-start gap-3">
                  <span className="text-[0.65rem] font-mono text-muted-foreground/40 mt-1 w-6 text-right">{q.sort_order}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[0.8rem] text-foreground/80">{q.text}</p>
                    <div className="flex gap-1.5 mt-1.5 flex-wrap">
                      <span className="text-[0.6rem] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">{typeLabels[q.type] || q.type}</span>
                      {q.axes.map(a => (
                        <span key={a} className="text-[0.6rem] px-2 py-0.5 rounded-full bg-muted/40 text-muted-foreground/60">{a}</span>
                      ))}
                      {q.weight !== 1 && <span className="text-[0.6rem] px-2 py-0.5 rounded-full bg-accent/40 text-accent-foreground/60">peso: {q.weight}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => startEdit(q)} className="p-1.5 rounded-lg hover:bg-accent/50 transition-colors" title="Editar"><Edit3 className="w-3.5 h-3.5 text-muted-foreground/50" /></button>
                    <button onClick={() => handleDelete(q.id)} className="p-1.5 rounded-lg hover:bg-destructive/10 transition-colors" title="Excluir"><Trash2 className="w-3.5 h-3.5 text-destructive/60" /></button>
                  </div>
                </div>
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
