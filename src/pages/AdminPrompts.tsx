import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Brain, Save, ToggleLeft, ToggleRight, Sparkles, FileText, Target, Lightbulb, Route, ChevronDown, ChevronRight, Zap, Heart, Shield, DollarSign, Eye, Compass, Crosshair, AlertTriangle, ArrowUpRight, Ban } from 'lucide-react';
import { toast } from 'sonner';

interface TestPrompt {
  id: string;
  test_id: string;
  prompt_type: string;
  title: string;
  content: string;
  is_active: boolean;
  updated_at: string;
  updated_by: string | null;
}

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

const PROMPT_FIELDS = [
  { type: 'interpretation', label: 'Prompt Base de Interpretação', icon: Brain, description: 'Instruções base para interpretar as respostas do usuário.', rows: 4 },
  { type: 'diagnosis', label: 'Prompt do Diagnóstico Final', icon: FileText, description: 'Prompt para gerar o diagnóstico final com base nos scores.', rows: 4 },
  { type: 'profile', label: 'Prompt de Identificação de Perfil', icon: Target, description: 'Prompt para identificar o perfil comportamental dominante.', rows: 4 },
  { type: 'core_pain', label: 'Prompt de Dor Central', icon: Crosshair, description: 'Prompt para identificar a dor central por trás dos padrões.', rows: 3 },
  { type: 'triggers', label: 'Prompt de Gatilhos e Armadilhas', icon: AlertTriangle, description: 'Mapear gatilhos que ativam padrões e armadilhas que os mantêm.', rows: 3 },
  { type: 'direction', label: 'Prompt de Direção Prática', icon: ArrowUpRight, description: 'Sugerir ações práticas e caminhos de transformação.', rows: 3 },
  { type: 'restrictions', label: 'Regras Negativas / Restrições', icon: Ban, description: 'O que a IA NÃO deve fazer ao gerar resultados.', rows: 3 },
];

const GLOBAL_META: Record<string, { icon: any; description: string }> = {
  test_analysis: { icon: Brain, description: 'Prompt base de análise aplicado a todos os testes.' },
  report_generation: { icon: FileText, description: 'Prompt base de geração de relatórios.' },
  central_profile: { icon: Target, description: 'Prompt para consolidação do perfil central.' },
  insight_generation: { icon: Lightbulb, description: 'Prompt para geração de insights comportamentais.' },
  exit_strategy: { icon: Route, description: 'Prompt para estratégias de saída.' },
};

const AdminPrompts = () => {
  const { user, isSuperAdmin, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [testPrompts, setTestPrompts] = useState<TestPrompt[]>([]);
  const [globalPrompts, setGlobalPrompts] = useState<AdminPrompt[]>([]);
  const [modules, setModules] = useState<TestModule[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [editedTexts, setEditedTexts] = useState<Record<string, string>>({});
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({ global: true });

  useEffect(() => {
    if (!authLoading && !isSuperAdmin) { navigate('/dashboard', { replace: true }); return; }
    if (!authLoading && isSuperAdmin) fetchData();
  }, [authLoading, isSuperAdmin]);

  const fetchData = async () => {
    const [tpRes, gpRes, mRes] = await Promise.all([
      supabase.from('test_prompts').select('*').order('created_at', { ascending: true }),
      supabase.from('admin_prompts').select('*').is('test_module_id', null).order('created_at', { ascending: true }),
      supabase.from('test_modules').select('id, slug, name, icon').eq('is_active', true).order('sort_order'),
    ]);
    if (tpRes.error) toast.error('Erro ao carregar prompts de teste');
    if (gpRes.error) toast.error('Erro ao carregar prompts globais');
    if (mRes.error) toast.error('Erro ao carregar módulos');

    const tp = (tpRes.data || []) as TestPrompt[];
    const gp = (gpRes.data || []) as AdminPrompt[];
    setTestPrompts(tp);
    setGlobalPrompts(gp);
    setModules((mRes.data || []) as TestModule[]);

    const texts: Record<string, string> = {};
    tp.forEach(p => { texts[`tp_${p.id}`] = p.content; });
    gp.forEach(p => { texts[`gp_${p.id}`] = p.prompt_text; });
    setEditedTexts(texts);
    setLoading(false);
  };

  const handleSaveTestPrompt = async (prompt: TestPrompt) => {
    const key = `tp_${prompt.id}`;
    const text = editedTexts[key];
    if (text === undefined || text === prompt.content) { toast.info('Sem alterações'); return; }
    if (!text.trim()) { toast.error('Prompt vazio'); return; }
    setSaving(prompt.id);
    const { error } = await supabase.from('test_prompts').update({ content: text.trim(), updated_by: user?.id }).eq('id', prompt.id);
    if (error) toast.error('Erro ao salvar');
    else { toast.success('Salvo'); await fetchData(); }
    setSaving(null);
  };

  const handleSaveGlobal = async (prompt: AdminPrompt) => {
    const key = `gp_${prompt.id}`;
    const text = editedTexts[key];
    if (text === undefined || text === prompt.prompt_text) { toast.info('Sem alterações'); return; }
    if (!text.trim()) { toast.error('Prompt vazio'); return; }
    setSaving(prompt.id);
    const { error } = await supabase.from('admin_prompts').update({ prompt_text: text.trim() }).eq('id', prompt.id);
    if (error) toast.error('Erro ao salvar');
    else { toast.success('Salvo'); await fetchData(); }
    setSaving(null);
  };

  const handleToggleTestPrompt = async (prompt: TestPrompt) => {
    const { error } = await supabase.from('test_prompts').update({ is_active: !prompt.is_active, updated_by: user?.id }).eq('id', prompt.id);
    if (error) toast.error('Erro');
    else { toast.success(prompt.is_active ? 'Desativado' : 'Ativado'); await fetchData(); }
  };

  const handleToggleGlobal = async (prompt: AdminPrompt) => {
    const { error } = await supabase.from('admin_prompts').update({ is_active: !prompt.is_active }).eq('id', prompt.id);
    if (error) toast.error('Erro');
    else { toast.success(prompt.is_active ? 'Desativado' : 'Ativado'); await fetchData(); }
  };

  const toggleSection = (key: string) => setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }));
  const fadeUp = { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.4 } };

  const renderTestPromptField = (prompt: TestPrompt, meta: { icon: any; description: string; rows: number }) => {
    const Icon = meta.icon;
    const key = `tp_${prompt.id}`;
    const hasChanges = editedTexts[key] !== prompt.content;
    const isRestriction = prompt.prompt_type === 'restrictions';
    return (
      <div key={prompt.id} className={`border rounded-xl p-4 space-y-2.5 transition-colors ${
        isRestriction
          ? (prompt.is_active ? 'border-red-500/20 bg-red-500/[0.03]' : 'border-border/15 bg-card/20 opacity-50')
          : (prompt.is_active ? 'border-border/30 bg-card/40' : 'border-border/15 bg-card/20 opacity-50')
      }`}>
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <Icon className={`w-3.5 h-3.5 shrink-0 ${isRestriction ? 'text-red-500/60' : (prompt.is_active ? 'text-primary/70' : 'text-muted-foreground/30')}`} />
            <div>
              <h4 className="text-[0.8rem] font-semibold leading-tight">{prompt.title}</h4>
              <p className="text-[0.65rem] text-muted-foreground/40">{meta.description}</p>
            </div>
          </div>
          <button onClick={() => handleToggleTestPrompt(prompt)} className="p-1 hover:bg-muted/30 rounded-lg transition-colors">
            {prompt.is_active ? <ToggleRight className="w-4 h-4 text-emerald-500" /> : <ToggleLeft className="w-4 h-4 text-muted-foreground/30" />}
          </button>
        </div>
        <textarea
          value={editedTexts[key] ?? prompt.content}
          onChange={(e) => setEditedTexts(prev => ({ ...prev, [key]: e.target.value }))}
          rows={meta.rows}
          className={`w-full border rounded-lg p-3 text-[0.78rem] leading-[1.7] resize-y focus:outline-none focus:ring-2 transition-all font-mono ${
            isRestriction
              ? 'bg-red-500/[0.02] border-red-500/10 text-red-900/70 dark:text-red-300/70 focus:ring-red-500/20'
              : 'bg-background/50 border-border/20 text-foreground/80 focus:ring-primary/20'
          }`}
        />
        <div className="flex items-center justify-between">
          <span className="text-[0.6rem] text-muted-foreground/25">
            {new Date(prompt.updated_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
          </span>
          <button onClick={() => handleSaveTestPrompt(prompt)} disabled={!hasChanges || saving === prompt.id} className="flex items-center gap-1.5 px-3.5 py-1.5 bg-primary text-primary-foreground rounded-lg text-[0.7rem] font-semibold disabled:opacity-20 hover:opacity-90 transition-all">
            <Save className="w-3 h-3" /> {saving === prompt.id ? '...' : 'Salvar'}
          </button>
        </div>
      </div>
    );
  };

  const renderGlobalField = (prompt: AdminPrompt, meta: { icon: any; description: string }) => {
    const Icon = meta.icon;
    const key = `gp_${prompt.id}`;
    const hasChanges = editedTexts[key] !== prompt.prompt_text;
    return (
      <div key={prompt.id} className={`border rounded-xl p-4 space-y-2.5 transition-colors ${prompt.is_active ? 'border-border/30 bg-card/40' : 'border-border/15 bg-card/20 opacity-50'}`}>
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <Icon className={`w-3.5 h-3.5 shrink-0 ${prompt.is_active ? 'text-primary/70' : 'text-muted-foreground/30'}`} />
            <div>
              <h4 className="text-[0.8rem] font-semibold leading-tight">{prompt.label}</h4>
              <p className="text-[0.65rem] text-muted-foreground/40">{meta.description}</p>
            </div>
          </div>
          <button onClick={() => handleToggleGlobal(prompt)} className="p-1 hover:bg-muted/30 rounded-lg transition-colors">
            {prompt.is_active ? <ToggleRight className="w-4 h-4 text-emerald-500" /> : <ToggleLeft className="w-4 h-4 text-muted-foreground/30" />}
          </button>
        </div>
        <textarea
          value={editedTexts[key] ?? prompt.prompt_text}
          onChange={(e) => setEditedTexts(prev => ({ ...prev, [key]: e.target.value }))}
          rows={4}
          className="w-full bg-background/50 border border-border/20 rounded-lg p-3 text-[0.78rem] leading-[1.7] text-foreground/80 resize-y focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-mono"
        />
        <div className="flex items-center justify-between">
          <span className="text-[0.6rem] text-muted-foreground/25">
            {new Date(prompt.updated_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
          </span>
          <button onClick={() => handleSaveGlobal(prompt)} disabled={!hasChanges || saving === prompt.id} className="flex items-center gap-1.5 px-3.5 py-1.5 bg-primary text-primary-foreground rounded-lg text-[0.7rem] font-semibold disabled:opacity-20 hover:opacity-90 transition-all">
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
            <p className="text-[0.78rem] text-muted-foreground/60">7 prompts por teste · Tabela dedicada test_prompts</p>
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
              <p className="text-[0.7rem] text-muted-foreground/50">{globalPrompts.length} prompts · Plataforma inteira</p>
            </div>
          </div>
          {expandedSections['global'] ? <ChevronDown className="w-4 h-4 text-muted-foreground/40" /> : <ChevronRight className="w-4 h-4 text-muted-foreground/40" />}
        </button>
        {expandedSections['global'] && (
          <div className="space-y-3 pl-2">
            {globalPrompts.map(p => renderGlobalField(p, GLOBAL_META[p.context] || { icon: Brain, description: 'Prompt personalizado.' }))}
          </div>
        )}
      </motion.div>

      {/* ── Per-Module: 7 prompts from test_prompts ── */}
      {modules.map((mod, mi) => {
        const modPrompts = testPrompts.filter(p => p.test_id === mod.id);
        const ModIcon = iconMap[mod.icon] || Brain;
        const isExpanded = expandedSections[mod.id] ?? false;
        const byType: Record<string, TestPrompt> = {};
        modPrompts.forEach(p => { byType[p.prompt_type] = p; });
        const configuredCount = PROMPT_FIELDS.filter(f => byType[f.type]).length;

        return (
          <motion.div key={mod.id} {...fadeUp} transition={{ delay: 0.08 + 0.03 * mi }} className="space-y-3">
            <button onClick={() => toggleSection(mod.id)} className="w-full flex items-center justify-between bg-card/70 backdrop-blur-sm border border-border/40 rounded-2xl px-5 py-4 hover:bg-card/90 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                  <ModIcon className="w-4 h-4 text-primary" />
                </div>
                <div className="text-left">
                  <h2 className="text-[0.9rem] font-semibold">{mod.name}</h2>
                  <p className="text-[0.7rem] text-muted-foreground/50">{configuredCount}/7 prompts · <span className="font-mono">{mod.slug}</span></p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {configuredCount === 7
                  ? <span className="text-[0.6rem] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 font-medium">Completo</span>
                  : <span className="text-[0.6rem] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 font-medium">{7 - configuredCount} faltando</span>
                }
                {isExpanded ? <ChevronDown className="w-4 h-4 text-muted-foreground/40" /> : <ChevronRight className="w-4 h-4 text-muted-foreground/40" />}
              </div>
            </button>

            {isExpanded && (
              <div className="space-y-3 pl-2">
                {PROMPT_FIELDS.map((field) => {
                  const prompt = byType[field.type];
                  if (!prompt) {
                    return (
                      <div key={field.type} className="border border-dashed border-border/25 rounded-xl p-4 flex items-center gap-3 opacity-40">
                        <field.icon className="w-3.5 h-3.5 text-muted-foreground/30" />
                        <div>
                          <p className="text-[0.78rem] font-medium text-muted-foreground/50">{field.label}</p>
                          <p className="text-[0.65rem] text-muted-foreground/30">Não configurado</p>
                        </div>
                      </div>
                    );
                  }
                  return renderTestPromptField(prompt, { icon: field.icon, description: field.description, rows: field.rows });
                })}
              </div>
            )}
          </motion.div>
        );
      })}
    </div>
  );
};

export default AdminPrompts;
