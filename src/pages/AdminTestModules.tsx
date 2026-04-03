import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Plus, Save, Trash2, GripVertical, ToggleLeft, ToggleRight,
  Loader2, Brain, Heart, Zap, DollarSign, Eye, Compass, Shield, Edit3, X,
} from 'lucide-react';
import { toast } from 'sonner';

interface TestModule {
  id: string;
  slug: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  question_count: number;
  is_active: boolean;
  sort_order: number;
}

const iconOptions = [
  { value: 'brain', label: 'Cérebro', Icon: Brain },
  { value: 'heart', label: 'Coração', Icon: Heart },
  { value: 'zap', label: 'Raio', Icon: Zap },
  { value: 'dollar-sign', label: 'Dinheiro', Icon: DollarSign },
  { value: 'eye', label: 'Olho', Icon: Eye },
  { value: 'compass', label: 'Bússola', Icon: Compass },
  { value: 'shield', label: 'Escudo', Icon: Shield },
];

const iconMap: Record<string, any> = {
  brain: Brain, heart: Heart, zap: Zap, 'dollar-sign': DollarSign,
  eye: Eye, compass: Compass, shield: Shield,
};

const emptyModule: Omit<TestModule, 'id'> = {
  slug: '', name: '', description: '', icon: 'brain',
  category: 'behavioral', question_count: 0, is_active: true, sort_order: 0,
};

export default function AdminTestModules() {
  const { isSuperAdmin, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [modules, setModules] = useState<TestModule[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState(emptyModule);

  useEffect(() => {
    if (authLoading) return;
    if (!isSuperAdmin) { navigate('/dashboard', { replace: true }); return; }
    fetchModules();
  }, [authLoading, isSuperAdmin]);

  const fetchModules = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('test_modules')
      .select('*')
      .order('sort_order', { ascending: true });
    if (error) { toast.error('Erro ao carregar módulos'); console.error(error); }
    else setModules(data || []);
    setLoading(false);
  };

  const startEdit = (mod: TestModule) => {
    setEditingId(mod.id);
    setCreating(false);
    setForm({
      slug: mod.slug, name: mod.name, description: mod.description,
      icon: mod.icon, category: mod.category, question_count: mod.question_count,
      is_active: mod.is_active, sort_order: mod.sort_order,
    });
  };

  const startCreate = () => {
    setCreating(true);
    setEditingId(null);
    setForm({ ...emptyModule, sort_order: modules.length });
  };

  const cancelEdit = () => { setEditingId(null); setCreating(false); };

  const handleSave = async () => {
    if (!form.name.trim() || !form.slug.trim()) {
      toast.error('Nome e slug são obrigatórios');
      return;
    }
    setSaving(true);
    if (creating) {
      const { error } = await supabase.from('test_modules').insert({
        slug: form.slug.trim().toLowerCase().replace(/\s+/g, '-'),
        name: form.name.trim(),
        description: form.description.trim(),
        icon: form.icon,
        category: form.category,
        question_count: form.question_count,
        is_active: form.is_active,
        sort_order: form.sort_order,
      });
      if (error) { toast.error('Erro ao criar módulo'); console.error(error); }
      else { toast.success('Módulo criado!'); setCreating(false); await fetchModules(); }
    } else if (editingId) {
      const { error } = await supabase.from('test_modules').update({
        slug: form.slug.trim().toLowerCase().replace(/\s+/g, '-'),
        name: form.name.trim(),
        description: form.description.trim(),
        icon: form.icon,
        category: form.category,
        question_count: form.question_count,
        is_active: form.is_active,
        sort_order: form.sort_order,
      }).eq('id', editingId);
      if (error) { toast.error('Erro ao atualizar módulo'); console.error(error); }
      else { toast.success('Módulo atualizado!'); setEditingId(null); await fetchModules(); }
    }
    setSaving(false);
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Tem certeza que deseja excluir "${name}"? Esta ação não pode ser desfeita.`)) return;
    const { error } = await supabase.from('test_modules').delete().eq('id', id);
    if (error) { toast.error('Erro ao excluir módulo'); console.error(error); }
    else { toast.success('Módulo excluído!'); await fetchModules(); }
  };

  const toggleActive = async (mod: TestModule) => {
    const { error } = await supabase.from('test_modules')
      .update({ is_active: !mod.is_active })
      .eq('id', mod.id);
    if (error) toast.error('Erro ao alterar status');
    else {
      toast.success(mod.is_active ? 'Módulo desativado' : 'Módulo ativado');
      await fetchModules();
    }
  };

  const moveModule = async (index: number, direction: -1 | 1) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= modules.length) return;
    const updates = [
      { id: modules[index].id, sort_order: modules[targetIndex].sort_order },
      { id: modules[targetIndex].id, sort_order: modules[index].sort_order },
    ];
    for (const u of updates) {
      await supabase.from('test_modules').update({ sort_order: u.sort_order }).eq('id', u.id);
    }
    await fetchModules();
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const renderForm = () => (
    <div className="space-y-4 p-4 rounded-xl border border-border bg-card">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium text-foreground mb-1 block">Nome</label>
          <input
            className="w-full px-3 py-2 rounded-lg bg-background border border-border text-foreground text-sm focus:ring-2 focus:ring-primary/50 outline-none"
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            placeholder="Ex: Padrão Emocional"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-foreground mb-1 block">Slug</label>
          <input
            className="w-full px-3 py-2 rounded-lg bg-background border border-border text-foreground text-sm focus:ring-2 focus:ring-primary/50 outline-none"
            value={form.slug}
            onChange={e => setForm(f => ({ ...f, slug: e.target.value }))}
            placeholder="Ex: padrao-emocional"
          />
        </div>
      </div>
      <div>
        <label className="text-sm font-medium text-foreground mb-1 block">Descrição</label>
        <textarea
          className="w-full px-3 py-2 rounded-lg bg-background border border-border text-foreground text-sm focus:ring-2 focus:ring-primary/50 outline-none resize-none"
          rows={2}
          value={form.description}
          onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
          placeholder="Descrição do módulo de teste..."
        />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="text-sm font-medium text-foreground mb-1 block">Ícone</label>
          <div className="flex gap-2 flex-wrap">
            {iconOptions.map(({ value, label, Icon }) => (
              <button
                key={value}
                onClick={() => setForm(f => ({ ...f, icon: value }))}
                className={`p-2 rounded-lg border transition-colors ${form.icon === value ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:border-primary/50'}`}
                title={label}
              >
                <Icon className="w-4 h-4" />
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="text-sm font-medium text-foreground mb-1 block">Categoria</label>
          <select
            className="w-full px-3 py-2 rounded-lg bg-background border border-border text-foreground text-sm"
            value={form.category}
            onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
          >
            <option value="behavioral">Comportamental</option>
            <option value="emotional">Emocional</option>
            <option value="cognitive">Cognitivo</option>
            <option value="relational">Relacional</option>
          </select>
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
      <div className="flex items-center gap-4">
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <button onClick={() => setForm(f => ({ ...f, is_active: !f.is_active }))}>
            {form.is_active ? <ToggleRight className="w-6 h-6 text-emerald-500" /> : <ToggleLeft className="w-6 h-6 text-muted-foreground" />}
          </button>
          <span className="text-foreground">{form.is_active ? 'Ativo' : 'Inativo'}</span>
        </label>
      </div>
      <div className="flex gap-2 justify-end">
        <button onClick={cancelEdit} className="px-4 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground transition-colors">
          Cancelar
        </button>
        <button onClick={handleSave} disabled={saving} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium flex items-center gap-2 disabled:opacity-50">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {creating ? 'Criar Módulo' : 'Salvar Alterações'}
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
            <h1 className="text-2xl font-bold text-foreground">Módulos de Teste</h1>
            <p className="text-sm text-muted-foreground">Gerenciar módulos de teste comportamental</p>
          </div>
        </div>

        <div className="flex justify-end mb-4">
          <button
            onClick={startCreate}
            disabled={creating}
            className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium flex items-center gap-2 hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            <Plus className="w-4 h-4" /> Novo Módulo
          </button>
        </div>

        {creating && renderForm()}

        <div className="space-y-3 mt-4">
          {modules.map((mod, index) => {
            const ModIcon = iconMap[mod.icon] || Brain;
            const isEditing = editingId === mod.id;

            return (
              <motion.div
                key={mod.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                {isEditing ? renderForm() : (
                  <div className={`p-4 rounded-xl border transition-colors ${mod.is_active ? 'border-border bg-card' : 'border-border/50 bg-card/50 opacity-60'}`}>
                    <div className="flex items-center gap-3">
                      <div className="flex flex-col gap-1">
                        <button onClick={() => moveModule(index, -1)} disabled={index === 0} className="text-muted-foreground hover:text-foreground disabled:opacity-20 transition-colors">
                          <GripVertical className="w-4 h-4 rotate-180" />
                        </button>
                        <button onClick={() => moveModule(index, 1)} disabled={index === modules.length - 1} className="text-muted-foreground hover:text-foreground disabled:opacity-20 transition-colors">
                          <GripVertical className="w-4 h-4" />
                        </button>
                      </div>

                      <div className={`p-2 rounded-lg ${mod.is_active ? 'bg-primary/10' : 'bg-muted'}`}>
                        <ModIcon className={`w-5 h-5 ${mod.is_active ? 'text-primary' : 'text-muted-foreground'}`} />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-foreground text-sm">{mod.name}</h3>
                          <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{mod.slug}</span>
                        </div>
                        <p className="text-xs text-muted-foreground truncate">{mod.description}</p>
                        <p className="text-xs text-muted-foreground mt-1">{mod.question_count} perguntas · Ordem: {mod.sort_order}</p>
                      </div>

                      <div className="flex items-center gap-2">
                        <button onClick={() => toggleActive(mod)} title={mod.is_active ? 'Desativar' : 'Ativar'}>
                          {mod.is_active
                            ? <ToggleRight className="w-6 h-6 text-emerald-500" />
                            : <ToggleLeft className="w-6 h-6 text-muted-foreground" />
                          }
                        </button>
                        <button onClick={() => startEdit(mod)} className="p-2 rounded-lg hover:bg-accent transition-colors" title="Editar">
                          <Edit3 className="w-4 h-4 text-muted-foreground" />
                        </button>
                        <button onClick={() => handleDelete(mod.id, mod.name)} className="p-2 rounded-lg hover:bg-destructive/10 transition-colors" title="Excluir">
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            );
          })}

          {modules.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <Brain className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>Nenhum módulo de teste cadastrado</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
