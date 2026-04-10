import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { TestModule } from './promptConstants';
import { Question, emptyQuestion, defaultOptionsForType, defaultScoresForType } from './questionConstants';
import { QuestionEditorPanel } from './QuestionEditorPanel';
import { QuestionsListPanel } from './QuestionsListPanel';
import { PreviewModal } from './PreviewModal';
import { GenerateQuestionsModal } from './GenerateQuestionsModal';

interface FormData {
  text: string;
  context: string;
  type: 'likert' | 'behavior_choice' | 'frequency' | 'intensity';
  axes: string[];
  weight: number;
  sort_order: number;
  options: string[] | null;
  option_scores: number[] | null;
}

interface QuestionsPanelProps {
  currentModule: TestModule;
}

const QuestionsPanel = ({ currentModule }: QuestionsPanelProps) => {
  // Questions state
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<FormData>(emptyQuestion as FormData);

  // UI state
  const [showAIPanel, setShowAIPanel] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [, setPreviewIndex] = useState(0);
  const [, setPreviewAnswers] = useState<Record<string, number>>({});
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [expandedQuestionId, setExpandedQuestionId] = useState<string | null>(null);

  // Load questions on mount
  useEffect(() => {
    fetchQuestions();
  }, [currentModule.id]);

  const fetchQuestions = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('questions')
        .select('*')
        .eq('test_id', currentModule.id)
        .order('sort_order');
      if (error) toast.error('Erro ao carregar perguntas');
      else setQuestions(data || []);
    } catch (e) {
      toast.error('Erro ao carregar perguntas');
    } finally {
      setLoading(false);
    }
  };

  const startCreate = () => {
    setCreating(true);
    setEditingId(null);
    const defaultOpts = defaultOptionsForType['likert'];
    const defaultScores = defaultScoresForType['likert'];
    setForm({
      ...(emptyQuestion as FormData),
      sort_order: questions.length + 1,
      options: defaultOpts,
      option_scores: [...defaultScores],
    });
  };

  const startEdit = (q: Question) => {
    setEditingId(q.id);
    setCreating(false);
    const opts = q.options || defaultOptionsForType[q.type] || null;
    const scores = q.option_scores || defaultScoresForType[q.type] || null;
    setForm({
      text: q.text,
      context: q.context || '',
      type: q.type,
      axes: q.axes.length ? q.axes : [''],
      weight: q.weight,
      sort_order: q.sort_order,
      options: opts,
      option_scores: scores ? [...scores] : null,
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setCreating(false);
  };

  const handleSave = async () => {
    if (!form.text.trim()) {
      toast.error('Texto da pergunta é obrigatório');
      return;
    }

    const axes = form.axes.filter(a => a.trim());
    if (axes.length === 0) {
      toast.error('Pelo menos um eixo é obrigatório');
      return;
    }

    // Validate options for behavior_choice
    if (form.type === 'behavior_choice') {
      const validOpts = (form.options || []).filter(o => o.trim());
      if (validOpts.length < 2) {
        toast.error('Escolha comportamental precisa de pelo menos 2 opções preenchidas');
        return;
      }
    }

    setSaving(true);
    try {
      const finalOptions = form.options && form.options.some(o => o.trim()) ? form.options : null;
      const finalScores = form.option_scores && form.option_scores.length > 0 ? form.option_scores : null;
      const payload = {
        text: form.text.trim(),
        type: form.type,
        axes,
        weight: form.weight,
        sort_order: form.sort_order,
        options: finalOptions,
        option_scores: finalScores,
        context: form.context?.trim() || null,
        test_id: currentModule.id,
      };

      if (creating) {
        const { error } = await supabase.from('questions').insert(payload);
        if (error) toast.error('Erro ao criar pergunta');
        else {
          toast.success('Pergunta criada!');
          setCreating(false);
          await fetchQuestions();
        }
      } else if (editingId) {
        const { error } = await supabase.from('questions').update(payload).eq('id', editingId);
        if (error) toast.error('Erro ao atualizar');
        else {
          toast.success('Pergunta atualizada!');
          setEditingId(null);
          await fetchQuestions();
        }
      }
    } catch (e) {
      toast.error('Erro ao salvar pergunta');
    } finally {
      setSaving(false);
    }
  };

  const handleDuplicate = async (q: Question) => {
    setSaving(true);
    try {
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
      else {
        toast.success('Pergunta duplicada!');
        await fetchQuestions();
      }
    } catch (e) {
      toast.error('Erro ao duplicar pergunta');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir esta pergunta?')) return;

    try {
      const { error } = await supabase.from('questions').delete().eq('id', id);
      if (error) toast.error('Erro ao excluir');
      else {
        toast.success('Pergunta excluída!');
        setSelectedIds(prev => {
          const n = new Set(prev);
          n.delete(id);
          return n;
        });
        await fetchQuestions();
      }
    } catch (e) {
      toast.error('Erro ao excluir pergunta');
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`Excluir ${selectedIds.size} pergunta(s) selecionada(s)?`)) return;

    try {
      const { error } = await supabase.from('questions').delete().in('id', Array.from(selectedIds));
      if (error) toast.error('Erro ao excluir perguntas');
      else {
        toast.success(`${selectedIds.size} pergunta(s) excluída(s)!`);
        setSelectedIds(new Set());
        await fetchQuestions();
      }
    } catch (e) {
      toast.error('Erro ao excluir perguntas');
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === questions.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(questions.map(q => q.id)));
  };

  return (
    <div className="space-y-4">
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-primary/40" />
        </div>
      ) : (
        <>
          {/* Editor Panel */}
          {(creating || editingId) && (
            <QuestionEditorPanel
              isCreating={creating}
              isEditing={!!editingId}
              editingQuestionId={editingId}
              form={form}
              saving={saving}
              currentModule={currentModule}
              onFormChange={setForm}
              onSave={handleSave}
              onCancel={cancelEdit}
            />
          )}

          {/* AI Generation Panel */}
          {showAIPanel && (
            <GenerateQuestionsModal
              isOpen={showAIPanel}
              onClose={() => setShowAIPanel(false)}
              currentModule={currentModule}
              questions={questions}
              onQuestionsGenerated={() => {
                setShowAIPanel(false);
                fetchQuestions();
              }}
            />
          )}

          {/* Questions List Panel */}
          <QuestionsListPanel
            questions={questions}
            loading={loading}
            saving={saving}
            selectedIds={selectedIds}
            expandedQuestionId={expandedQuestionId}
            onSelectId={toggleSelect}
            onSelectAll={toggleSelectAll}
            onDuplicate={handleDuplicate}
            onEdit={startEdit}
            onDelete={handleDelete}
            onBulkDelete={handleBulkDelete}
            onExpandQuestion={setExpandedQuestionId}
            onShowPreview={() => {
              setShowPreview(true);
              setPreviewIndex(0);
              setPreviewAnswers({});
            }}
            onShowAIPanel={() => setShowAIPanel(!showAIPanel)}
            onShowCreateForm={startCreate}
            isCreating={creating}
            showAIPanel={showAIPanel}
          />

          {/* Preview Modal */}
          <PreviewModal
            isOpen={showPreview}
            onClose={() => setShowPreview(false)}
            questions={questions}
            currentModule={currentModule}
          />
        </>
      )}
    </div>
  );
};

export default QuestionsPanel;
