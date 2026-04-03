import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Brain, Save, ToggleLeft, ToggleRight, Plus, Trash2, Sparkles, FileText, Target, Lightbulb, Route, ChevronDown, ChevronRight, Zap, Heart, Shield, DollarSign, Eye, Compass, Crosshair, ListChecks, BookOpen } from 'lucide-react';
import { toast } from 'sonner';

interface AdminPrompt {
  id: string;
  context: string;
  label: string;
  prompt_text: string;
  is_active: boolean;
  updated_at: string;
  test_module_id: string | null;
}

interface TestModule {
  id: string;
  slug: string;
  name: string;
  icon: string;
}

const iconMap: Record<string, any> = {
  brain: Brain, zap: Zap, heart: Heart, shield: Shield,
  'dollar-sign': DollarSign, eye: Eye, compass: Compass,
  target: Target, sparkles: Sparkles,
};

// 6 structured fields per module in display order
const MODULE_FIELDS = [
  { context: 'module_analysis', label: 'Prompt Principal da IA', icon: Brain, description: 'Prompt usado para analisar os resultados brutos e gerar o diagnóstico.' },
  { context: 'module_objective', label: 'Objetivo do Teste', icon: Target, description: 'O que este teste se propõe a medir e identificar.' },
  { context: 'module_axes', label: 'Eixos Analisados', icon: ListChecks, description: 'Lista de eixos comportamentais avaliados neste módulo.' },
  { context: 'module_interpretation', label: 'Instruções de Interpretação', icon: BookOpen, description: 'Regras e diretrizes para interpretar os resultados.' },
  { context: 'module_report', label: 'Prompt de Relatório', icon: FileText, description: 'Prompt usado para gerar relatórios detalhados e personalizados.' },
  { context: 'module_core_pain', label: 'Prompt de Dor Central', icon: Crosshair, description: 'Prompt para identificar a dor central por trás dos padrões.' },
];

const GLOBAL_CONTEXT_META: Record<string, { icon: any; description: string }> = {
  test_analysis: { icon: Brain, description: 'Prompt base de análise aplicado a todos os testes.' },
  report_generation: { icon: FileText, description: 'Prompt base de geração de relatórios.' },
  central_profile: { icon: Target, description: 'Prompt para consolidação do perfil central.' },
  insight_generation: { icon: Lightbulb, description: 'Prompt para geração de insights comportamentais.' },
  exit_strategy: { icon: Route, description: 'Prompt para sugestão de estratégias de saída.' },
};

const AdminPrompts = () => {
  const { isSuperAdmin, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [prompts, setPrompts] = useState<AdminPrompt[]>([]);
  const [modules, setModules] = useState<TestModule[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [editedTexts, setEditedTexts] = useState<Record<string, string>>({});
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({ global: true });
  const [showNewForm, setShowNewForm] = useState(false);
  const [newPrompt, setNewPrompt] = useState({ context: '', label: '', prompt_text: '', test_module_id: '' });

  useEffect(() => {
    if (!authLoading && !isSuperAdmin) {
      navigate('/dashboard', { replace: true });
      return;
    }
    if (!authLoading && isSuperAdmin) fetchData();
  }, [authLoading, isSuperAdmin]);

  const fetchData = async () => {
    const [pRes, mRes] = await Promise.all([
      supabase.from('admin_prompts').select('*').order('created_at', { ascending: true }),
      supabase.from('test_modules').select('id, slug, name, icon').eq('is_active', true).order('sort_order'),
    ]);
    if (pRes.error) { toast.error('Erro ao carregar prompts'); console.error(pRes.error); }
    if (mRes.error) { toast.error('Erro ao carregar módulos'); console.error(mRes.error); }
    const p = (pRes.data || []) as AdminPrompt[];
    setPrompts(p);
    setModules((mRes.data || []) as TestModule[]);
    const texts: Record<string, string> = {};
    p.forEach(pr => { texts[pr.id] = pr.prompt_text; });
    setEditedTexts(texts);
    setLoading(false);
  };

  const handleSave = async (prompt: AdminPrompt) => {
    const text = editedTexts[prompt.id];
    if (text === undefined || text === prompt.prompt_text) { toast.info('Sem alterações'); return; }
    if (!text.trim()) { toast.error('Prompt vazio'); return; }
    setSaving(prompt.id);
    const { error } = await supabase.from('admin_prompts').update({ prompt_text: text.trim() }).eq('id', prompt.id);
    if (error) toast.error('Erro ao salvar');
    else { toast.success('Salvo'); await fetchData(); }
    setSaving(null);
  };

  const handleToggle = async (prompt: AdminPrompt) => {
    const { error } = await supabase.from('admin_prompts').update({ is_active: !prompt.is_active }).eq('id', prompt.id);
    if (error) toast.error('Erro');
    else { toast.success(prompt.is_active ? 'Desativado' : 'Ativado'); await fetchData(); }
  };

  const handleDelete = async (prompt: AdminPrompt) => {
    if (!confirm(`Excluir "${prompt.label}"?`)) return;
    const { error } = await supabase.from('admin_prompts').delete().eq('id', prompt.id);
    if (error) toast.error('Erro');
    else { toast.success('Excluído'); await fetchData(); }
  };

  const handleCreate = async () => {
    if (!newPrompt.context.trim() || !newPrompt.label.trim()) { toast.error('Campos obrigatórios'); return; }
    const insert: any = { context: newPrompt.context.trim(), label: newPrompt.label.trim(), prompt_text: newPrompt.prompt_text.trim() };
    if (newPrompt.test_module_id) insert.test_module_id = newPrompt.test_module_id;
    const { error } = await supabase.from('admin_prompts').insert(insert);
    if (error) toast.error(error.message.includes('duplicate') ? 'Já existe' : 'Erro');
    else { toast.success('Criado'); setNewPrompt({ context: '', label: '', prompt_text: '', test_module_id: '' }); setShowNewForm(false); await fetchData(); }
  };

  const toggleSection = (key: string) => setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }));

  const globalPrompts = prompts.filter(p => !p.test_module_id);
  const fadeUp = { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.4 } };

  const renderField = (prompt: AdminPrompt, fieldMeta: { icon: any; description: string }, isSmall?: boolean) => {
    const Icon = fieldMeta.icon;
    const hasChanges = editedTexts[prompt.id] !== prompt.prompt_text;
    return (
      <div key={prompt.id} className={`border rounded-xl p-4 space-y-2.5 transition-colors ${prompt.is_active ? 'border-border/30 bg-card/40' : 'border-border/15 bg-card/20 opacity-50'}`}>
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <Icon className={`w-3.5 h-3.5 shrink-0 ${prompt.is_active ? 'text-primary/70' : 'text-muted-foreground/30'}`} />
            <div>
              <h4 className="text-[0.8rem] font-semibold leading-tight">{prompt.label}</h4>
              <p className="text-[0.65rem] text-muted-foreground/40">{fieldMeta.description}</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => handleToggle(prompt)} className="p-1 hover:bg-muted/30 rounded-lg transition-colors">
              {prompt.is_active ? <ToggleRight className="w-4 h-4 text-emerald-500" /> : <ToggleLeft className="w-4 h-4 text-muted-foreground/30" />}
            </button>
          </div>
        </div>
        <textarea
          value={editedTexts[prompt.id] ?? prompt.prompt_text}
          onChange={(e) => setEditedTexts(prev => ({ ...prev, [prompt.id]: e.target.value }))}
          rows={isSmall ? 2 : 4}
          className="w-full bg-background/50 border border-border/20 rounded-lg p-3 text-[0.78rem] leading-[1.7] text-foreground/80 resize-y focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-mono"
        />
        <div className="flex items-center justify-between">
          <span className="text-[0.6rem] text-muted-foreground/25">{new Date(prompt.updated_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
          <button onClick={() => handleSave(prompt)} disabled={!hasChanges || saving === prompt.id} className="flex items-center gap-1.5 px-3.5 py-1.5 bg-primary text-primary-foreground rounded-lg text-[0.7rem] font-semibold disabled:opacity-20 hover:opacity-90 transition-all">
            <Save className="w-3 h-3" /> {saving === prompt.id ? '...' : 'Salvar'}
          </button>
        </div>
      </div>
    );
  };

  if (authLoading || loading) {
    return <div className="min-h-screen flex items-center justify-center bg-background"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;
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
            <p className="text-[0.78rem] text-muted-foreground/60">Configure prompts globais e a estrutura de cada teste</p>
          </div>
        </div>
      </motion.div>

      {/* ── Global Prompts ── */}
      <motion.div {...fadeUp} transition={{ delay: 0.05 }} className="space-y-3">
        <button onClick={() => toggleSection('global')} className="w-full flex items-center justify-between bg-card/70 backdrop-blur-sm border border-border/40 rounded-2xl px-5 py-4 hover:bg-card/90 transition-colors">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center"><Sparkles className="w-4 h-4 text-primary" /></div>
            <div className="text-left">
              <h2 className="text-[0.9rem] font-semibold">Prompts Globais</h2>
              <p className="text-[0.7rem] text-muted-foreground/50">{globalPrompts.length} prompts · Aplicados a toda a plataforma</p>
            </div>
          </div>
          {expandedSections['global'] ? <ChevronDown className="w-4 h-4 text-muted-foreground/40" /> : <ChevronRight className="w-4 h-4 text-muted-foreground/40" />}
        </button>
        {expandedSections['global'] && (
          <div className="space-y-3 pl-2">
            {globalPrompts.map(p => {
              const meta = GLOBAL_CONTEXT_META[p.context] || { icon: Brain, description: 'Prompt personalizado.' };
              return renderField(p, meta);
            })}
          </div>
        )}
      </motion.div>

      {/* ── Per-Module Structured Sections ── */}
      {modules.map((mod, mi) => {
        const modulePrompts = prompts.filter(p => p.test_module_id === mod.id);
        const ModIcon = iconMap[mod.icon] || Brain;
        const isExpanded = expandedSections[mod.id] ?? false;

        // Map prompts by context for structured rendering
        const promptsByContext: Record<string, AdminPrompt> = {};
        modulePrompts.forEach(p => { promptsByContext[p.context] = p; });

        return (
          <motion.div key={mod.id} {...fadeUp} transition={{ delay: 0.08 + 0.03 * mi }} className="space-y-3">
            <button onClick={() => toggleSection(mod.id)} className="w-full flex items-center justify-between bg-card/70 backdrop-blur-sm border border-border/40 rounded-2xl px-5 py-4 hover:bg-card/90 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                  <ModIcon className="w-4 h-4 text-primary" />
                </div>
                <div className="text-left">
                  <h2 className="text-[0.9rem] font-semibold">{mod.name}</h2>
                  <p className="text-[0.7rem] text-muted-foreground/50">
                    {modulePrompts.length} campos · <span className="font-mono">{mod.slug}</span>
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {modulePrompts.length < 6 && (
                  <span className="text-[0.6rem] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 font-medium">
                    {6 - modulePrompts.length} faltando
                  </span>
                )}
                {isExpanded ? <ChevronDown className="w-4 h-4 text-muted-foreground/40" /> : <ChevronRight className="w-4 h-4 text-muted-foreground/40" />}
              </div>
            </button>

            {isExpanded && (
              <div className="space-y-3 pl-2">
                {/* Render fields in structured order */}
                {MODULE_FIELDS.map((field, fi) => {
                  const prompt = promptsByContext[field.context];
                  if (!prompt) {
                    return (
                      <div key={field.context} className="border border-dashed border-border/25 rounded-xl p-4 flex items-center gap-3 opacity-40">
                        <field.icon className="w-3.5 h-3.5 text-muted-foreground/30" />
                        <div>
                          <p className="text-[0.78rem] font-medium text-muted-foreground/50">{field.label}</p>
                          <p className="text-[0.65rem] text-muted-foreground/30">Não configurado</p>
                        </div>
                      </div>
                    );
                  }
                  const isSmall = field.context === 'module_axes';
                  return renderField(prompt, { icon: field.icon, description: field.description }, isSmall);
                })}

                {/* Any extra custom prompts not in the standard 6 */}
                {modulePrompts
                  .filter(p => !MODULE_FIELDS.some(f => f.context === p.context))
                  .map(p => renderField(p, { icon: Brain, description: 'Prompt personalizado.' }))}
              </div>
            )}
          </motion.div>
        );
      })}

      {/* ── New Prompt ── */}
      {showNewForm ? (
        <motion.div {...fadeUp} className="bg-card/70 backdrop-blur-sm border border-primary/20 rounded-2xl p-5 space-y-4">
          <h3 className="text-[0.9rem] font-semibold">Novo Prompt</h3>
          <div className="grid grid-cols-2 gap-3">
            <select value={newPrompt.context} onChange={(e) => setNewPrompt(prev => ({ ...prev, context: e.target.value }))} className="bg-background/60 border border-border/30 rounded-xl px-4 py-2.5 text-[0.82rem] focus:outline-none focus:ring-2 focus:ring-primary/20">
              <option value="">Tipo de campo</option>
              {MODULE_FIELDS.map(f => <option key={f.context} value={f.context}>{f.label}</option>)}
              <option value="custom">Personalizado</option>
            </select>
            <input value={newPrompt.label} onChange={(e) => setNewPrompt(prev => ({ ...prev, label: e.target.value }))} placeholder="Label" className="bg-background/60 border border-border/30 rounded-xl px-4 py-2.5 text-[0.82rem] focus:outline-none focus:ring-2 focus:ring-primary/20" />
          </div>
          <select value={newPrompt.test_module_id} onChange={(e) => setNewPrompt(prev => ({ ...prev, test_module_id: e.target.value }))} className="w-full bg-background/60 border border-border/30 rounded-xl px-4 py-2.5 text-[0.82rem] focus:outline-none focus:ring-2 focus:ring-primary/20">
            <option value="">Global (sem módulo)</option>
            {modules.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
          <textarea value={newPrompt.prompt_text} onChange={(e) => setNewPrompt(prev => ({ ...prev, prompt_text: e.target.value }))} placeholder="Conteúdo..." className="w-full min-h-[100px] bg-background/60 border border-border/30 rounded-xl p-4 text-[0.82rem] leading-[1.7] resize-y focus:outline-none focus:ring-2 focus:ring-primary/20 font-mono" />
          <div className="flex gap-3 justify-end">
            <button onClick={() => setShowNewForm(false)} className="px-4 py-2 text-[0.78rem] text-muted-foreground hover:text-foreground transition-colors">Cancelar</button>
            <button onClick={handleCreate} className="flex items-center gap-2 px-5 py-2 bg-primary text-primary-foreground rounded-xl text-[0.78rem] font-semibold hover:opacity-90 transition-all"><Plus className="w-3.5 h-3.5" /> Criar</button>
          </div>
        </motion.div>
      ) : (
        <motion.div {...fadeUp} transition={{ delay: 0.5 }}>
          <button onClick={() => setShowNewForm(true)} className="w-full flex items-center justify-center gap-2 py-3.5 border border-dashed border-border/40 rounded-2xl text-[0.82rem] text-muted-foreground/50 hover:text-foreground/70 hover:border-border/60 transition-all">
            <Plus className="w-4 h-4" /> Adicionar novo prompt
          </button>
        </motion.div>
      )}
    </div>
  );
};

export default AdminPrompts;
