import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Brain, Save, ToggleLeft, ToggleRight, Plus, Trash2, Sparkles, FileText, Target, Lightbulb, Route } from 'lucide-react';
import { toast } from 'sonner';

interface AdminPrompt {
  id: string;
  context: string;
  label: string;
  prompt_text: string;
  is_active: boolean;
  updated_at: string;
}

const contextIcons: Record<string, any> = {
  test_analysis: Brain,
  report_generation: FileText,
  central_profile: Target,
  insight_generation: Lightbulb,
  exit_strategy: Route,
};

const contextDescriptions: Record<string, string> = {
  test_analysis: 'Prompt usado para analisar os resultados brutos dos testes e gerar diagnósticos comportamentais.',
  report_generation: 'Prompt usado para gerar relatórios detalhados e personalizados a partir dos padrões identificados.',
  central_profile: 'Prompt usado para consolidar múltiplos testes em um perfil comportamental unificado.',
  insight_generation: 'Prompt usado para identificar padrões ocultos, contradições e gerar recomendações práticas.',
  exit_strategy: 'Prompt usado para sugerir caminhos práticos de superação dos bloqueios identificados.',
};

const AdminPrompts = () => {
  const { isSuperAdmin, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [prompts, setPrompts] = useState<AdminPrompt[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [editedTexts, setEditedTexts] = useState<Record<string, string>>({});
  const [showNewForm, setShowNewForm] = useState(false);
  const [newPrompt, setNewPrompt] = useState({ context: '', label: '', prompt_text: '' });

  useEffect(() => {
    if (!authLoading && !isSuperAdmin) {
      navigate('/dashboard', { replace: true });
      return;
    }
    if (!authLoading && isSuperAdmin) {
      fetchPrompts();
    }
  }, [authLoading, isSuperAdmin]);

  const fetchPrompts = async () => {
    const { data, error } = await supabase
      .from('admin_prompts')
      .select('*')
      .order('created_at', { ascending: true });
    if (error) {
      toast.error('Erro ao carregar prompts');
      console.error(error);
    } else {
      setPrompts(data || []);
      const texts: Record<string, string> = {};
      (data || []).forEach((p: AdminPrompt) => { texts[p.id] = p.prompt_text; });
      setEditedTexts(texts);
    }
    setLoading(false);
  };

  const handleSave = async (prompt: AdminPrompt) => {
    const text = editedTexts[prompt.id];
    if (text === undefined || text === prompt.prompt_text) {
      toast.info('Nenhuma alteração detectada');
      return;
    }
    if (!text.trim()) {
      toast.error('O prompt não pode estar vazio');
      return;
    }
    setSaving(prompt.id);
    const { error } = await supabase
      .from('admin_prompts')
      .update({ prompt_text: text.trim() })
      .eq('id', prompt.id);
    if (error) {
      toast.error('Erro ao salvar');
    } else {
      toast.success('Prompt atualizado com sucesso');
      await fetchPrompts();
    }
    setSaving(null);
  };

  const handleToggle = async (prompt: AdminPrompt) => {
    const { error } = await supabase
      .from('admin_prompts')
      .update({ is_active: !prompt.is_active })
      .eq('id', prompt.id);
    if (error) {
      toast.error('Erro ao alterar status');
    } else {
      toast.success(prompt.is_active ? 'Prompt desativado' : 'Prompt ativado');
      await fetchPrompts();
    }
  };

  const handleDelete = async (prompt: AdminPrompt) => {
    if (!confirm(`Excluir prompt "${prompt.label}"? Esta ação é irreversível.`)) return;
    const { error } = await supabase.from('admin_prompts').delete().eq('id', prompt.id);
    if (error) {
      toast.error('Erro ao excluir');
    } else {
      toast.success('Prompt excluído');
      await fetchPrompts();
    }
  };

  const handleCreate = async () => {
    if (!newPrompt.context.trim() || !newPrompt.label.trim()) {
      toast.error('Contexto e label são obrigatórios');
      return;
    }
    const { error } = await supabase.from('admin_prompts').insert({
      context: newPrompt.context.trim(),
      label: newPrompt.label.trim(),
      prompt_text: newPrompt.prompt_text.trim(),
    });
    if (error) {
      toast.error(error.message.includes('duplicate') ? 'Contexto já existe' : 'Erro ao criar');
    } else {
      toast.success('Prompt criado');
      setNewPrompt({ context: '', label: '', prompt_text: '' });
      setShowNewForm(false);
      await fetchPrompts();
    }
  };

  const fadeUp = { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.4 } };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground px-4 py-8 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <motion.div {...fadeUp} className="space-y-2">
        <button onClick={() => navigate('/dashboard')} className="flex items-center gap-2 text-muted-foreground/60 hover:text-foreground/80 text-[0.8rem] transition-colors mb-4">
          <ArrowLeft className="w-4 h-4" /> Voltar ao Dashboard
        </button>
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-amber-500/10 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Central de Prompts e Inteligência</h1>
            <p className="text-[0.78rem] text-muted-foreground/60">Configure os prompts que controlam a IA da plataforma</p>
          </div>
        </div>
      </motion.div>

      {/* Prompts List */}
      {prompts.map((prompt, i) => {
        const Icon = contextIcons[prompt.context] || Brain;
        const desc = contextDescriptions[prompt.context] || 'Prompt personalizado.';
        const hasChanges = editedTexts[prompt.id] !== prompt.prompt_text;

        return (
          <motion.div
            key={prompt.id}
            {...fadeUp}
            transition={{ delay: 0.05 * i }}
            className={`bg-card/70 backdrop-blur-sm border rounded-2xl p-5 space-y-4 transition-colors ${
              prompt.is_active ? 'border-border/40' : 'border-border/20 opacity-60'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${prompt.is_active ? 'bg-primary/10' : 'bg-muted/30'}`}>
                  <Icon className={`w-4 h-4 ${prompt.is_active ? 'text-primary' : 'text-muted-foreground/40'}`} />
                </div>
                <div>
                  <h3 className="text-[0.9rem] font-semibold">{prompt.label}</h3>
                  <p className="text-[0.7rem] text-muted-foreground/50 font-mono">{prompt.context}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => handleToggle(prompt)} className="p-1.5 hover:bg-muted/30 rounded-lg transition-colors" title={prompt.is_active ? 'Desativar' : 'Ativar'}>
                  {prompt.is_active
                    ? <ToggleRight className="w-5 h-5 text-emerald-500" />
                    : <ToggleLeft className="w-5 h-5 text-muted-foreground/40" />
                  }
                </button>
                <button onClick={() => handleDelete(prompt)} className="p-1.5 hover:bg-red-500/10 rounded-lg transition-colors text-muted-foreground/40 hover:text-red-500" title="Excluir">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            <p className="text-[0.75rem] text-muted-foreground/50 leading-[1.6]">{desc}</p>

            <textarea
              value={editedTexts[prompt.id] ?? prompt.prompt_text}
              onChange={(e) => setEditedTexts(prev => ({ ...prev, [prompt.id]: e.target.value }))}
              className="w-full min-h-[120px] bg-background/60 border border-border/30 rounded-xl p-4 text-[0.82rem] leading-[1.7] text-foreground/80 resize-y focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30 transition-all font-mono"
              placeholder="Digite o prompt..."
            />

            <div className="flex items-center justify-between">
              <span className="text-[0.65rem] text-muted-foreground/30">
                Atualizado: {new Date(prompt.updated_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </span>
              <button
                onClick={() => handleSave(prompt)}
                disabled={!hasChanges || saving === prompt.id}
                className="flex items-center gap-2 px-5 py-2 bg-primary text-primary-foreground rounded-xl text-[0.78rem] font-semibold disabled:opacity-30 hover:opacity-90 transition-all"
              >
                <Save className="w-3.5 h-3.5" />
                {saving === prompt.id ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </motion.div>
        );
      })}

      {/* New Prompt Form */}
      {showNewForm ? (
        <motion.div {...fadeUp} className="bg-card/70 backdrop-blur-sm border border-primary/20 rounded-2xl p-5 space-y-4">
          <h3 className="text-[0.9rem] font-semibold">Novo Prompt</h3>
          <div className="grid grid-cols-2 gap-3">
            <input
              value={newPrompt.context}
              onChange={(e) => setNewPrompt(prev => ({ ...prev, context: e.target.value }))}
              placeholder="Contexto (ex: custom_analysis)"
              className="bg-background/60 border border-border/30 rounded-xl px-4 py-2.5 text-[0.82rem] focus:outline-none focus:ring-2 focus:ring-primary/20 font-mono"
            />
            <input
              value={newPrompt.label}
              onChange={(e) => setNewPrompt(prev => ({ ...prev, label: e.target.value }))}
              placeholder="Label (ex: Análise Customizada)"
              className="bg-background/60 border border-border/30 rounded-xl px-4 py-2.5 text-[0.82rem] focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <textarea
            value={newPrompt.prompt_text}
            onChange={(e) => setNewPrompt(prev => ({ ...prev, prompt_text: e.target.value }))}
            placeholder="Texto do prompt..."
            className="w-full min-h-[100px] bg-background/60 border border-border/30 rounded-xl p-4 text-[0.82rem] leading-[1.7] resize-y focus:outline-none focus:ring-2 focus:ring-primary/20 font-mono"
          />
          <div className="flex gap-3 justify-end">
            <button onClick={() => setShowNewForm(false)} className="px-4 py-2 text-[0.78rem] text-muted-foreground hover:text-foreground transition-colors">Cancelar</button>
            <button onClick={handleCreate} className="flex items-center gap-2 px-5 py-2 bg-primary text-primary-foreground rounded-xl text-[0.78rem] font-semibold hover:opacity-90 transition-all">
              <Plus className="w-3.5 h-3.5" /> Criar prompt
            </button>
          </div>
        </motion.div>
      ) : (
        <motion.div {...fadeUp} transition={{ delay: 0.3 }}>
          <button
            onClick={() => setShowNewForm(true)}
            className="w-full flex items-center justify-center gap-2 py-3.5 border border-dashed border-border/40 rounded-2xl text-[0.82rem] text-muted-foreground/50 hover:text-foreground/70 hover:border-border/60 transition-all"
          >
            <Plus className="w-4 h-4" /> Adicionar novo prompt
          </button>
        </motion.div>
      )}
    </div>
  );
};

export default AdminPrompts;
