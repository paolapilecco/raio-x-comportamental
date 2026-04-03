import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Brain, Save, ToggleLeft, ToggleRight, Sparkles, FileText, Target, Lightbulb, Route, ChevronDown, ChevronRight, Zap, Heart, Shield, DollarSign, Eye, Compass, Crosshair, AlertTriangle, ArrowUpRight, Ban, Settings, Sliders, PlayCircle, Loader2, CheckCircle2, History, Clock } from 'lucide-react';
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

interface GlobalAiConfig {
  id: string;
  ai_enabled: boolean;
  temperature: number;
  max_tokens: number;
  tone: string;
  depth_level: number;
  report_style: string;
}

interface TestAiConfig {
  id: string;
  test_id: string;
  use_global_defaults: boolean;
  ai_enabled: boolean;
  temperature: number;
  max_tokens: number;
  tone: string;
  depth_level: number;
  report_style: string;
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

const TONE_OPTIONS = ['empático e direto', 'clínico e técnico', 'casual e acolhedor', 'provocativo e desafiador', 'analítico e neutro'];
const STYLE_OPTIONS = ['narrativo', 'bullet-points', 'estruturado', 'misto', 'conversacional'];
const DEPTH_LABELS: Record<number, string> = { 1: 'Superficial', 2: 'Leve', 3: 'Moderado', 4: 'Profundo', 5: 'Máximo' };

const AdminPrompts = () => {
  const { user, isSuperAdmin, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [testPrompts, setTestPrompts] = useState<TestPrompt[]>([]);
  const [globalPrompts, setGlobalPrompts] = useState<AdminPrompt[]>([]);
  const [modules, setModules] = useState<TestModule[]>([]);
  const [globalAiConfig, setGlobalAiConfig] = useState<GlobalAiConfig | null>(null);
  const [testAiConfigs, setTestAiConfigs] = useState<TestAiConfig[]>([]);
  const [editedGlobalAi, setEditedGlobalAi] = useState<Partial<GlobalAiConfig>>({});
  const [editedTestAi, setEditedTestAi] = useState<Record<string, Partial<TestAiConfig>>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [editedTexts, setEditedTexts] = useState<Record<string, string>>({});
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({ global: true });
  // Preview state
  const [previewTestId, setPreviewTestId] = useState<string>('');
  const [previewScores, setPreviewScores] = useState<Record<string, number>>({});
  const [previewRunning, setPreviewRunning] = useState(false);
  const [previewResult, setPreviewResult] = useState<any>(null);

  useEffect(() => {
    if (!authLoading && !isSuperAdmin) { navigate('/dashboard', { replace: true }); return; }
    if (!authLoading && isSuperAdmin) fetchData();
  }, [authLoading, isSuperAdmin]);

  const fetchData = async () => {
    const [tpRes, gpRes, mRes, gaiRes, taiRes] = await Promise.all([
      supabase.from('test_prompts').select('*').order('created_at', { ascending: true }),
      supabase.from('admin_prompts').select('*').is('test_module_id', null).order('created_at', { ascending: true }),
      supabase.from('test_modules').select('id, slug, name, icon').eq('is_active', true).order('sort_order'),
      supabase.from('global_ai_config').select('*').limit(1).maybeSingle(),
      supabase.from('test_ai_config').select('*'),
    ]);

    const tp = (tpRes.data || []) as TestPrompt[];
    const gp = (gpRes.data || []) as AdminPrompt[];
    setTestPrompts(tp);
    setGlobalPrompts(gp);
    setModules((mRes.data || []) as TestModule[]);
    setGlobalAiConfig(gaiRes.data as GlobalAiConfig | null);
    setTestAiConfigs((taiRes.data || []) as TestAiConfig[]);
    setEditedGlobalAi(gaiRes.data ? { ...gaiRes.data } : {});
    const tai: Record<string, Partial<TestAiConfig>> = {};
    (taiRes.data || []).forEach((c: TestAiConfig) => { tai[c.test_id] = { ...c }; });
    setEditedTestAi(tai);

    const texts: Record<string, string> = {};
    tp.forEach(p => { texts[`tp_${p.id}`] = p.content; });
    gp.forEach(p => { texts[`gp_${p.id}`] = p.prompt_text; });
    setEditedTexts(texts);
    setLoading(false);
  };

  // ── Save handlers for prompts ──
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

  // ── AI Config save handlers ──
  const handleSaveGlobalAi = async () => {
    if (!globalAiConfig) return;
    setSaving('global_ai');
    const { id, ...fields } = editedGlobalAi as GlobalAiConfig;
    const { error } = await supabase.from('global_ai_config').update({
      ai_enabled: fields.ai_enabled,
      temperature: fields.temperature,
      max_tokens: fields.max_tokens,
      tone: fields.tone,
      depth_level: fields.depth_level,
      report_style: fields.report_style,
    }).eq('id', globalAiConfig.id);
    if (error) toast.error('Erro ao salvar config global');
    else { toast.success('Config global salva'); await fetchData(); }
    setSaving(null);
  };

  const handleSaveTestAi = async (testId: string) => {
    const edited = editedTestAi[testId];
    if (!edited) return;
    setSaving(`tai_${testId}`);
    const existing = testAiConfigs.find(c => c.test_id === testId);
    if (existing) {
      const { error } = await supabase.from('test_ai_config').update({
        use_global_defaults: edited.use_global_defaults,
        ai_enabled: edited.ai_enabled,
        temperature: edited.temperature,
        max_tokens: edited.max_tokens,
        tone: edited.tone,
        depth_level: edited.depth_level,
        report_style: edited.report_style,
      }).eq('id', existing.id);
      if (error) toast.error('Erro ao salvar');
      else { toast.success('Config salva'); await fetchData(); }
    } else {
      const { error } = await supabase.from('test_ai_config').insert({
        test_id: testId,
        use_global_defaults: edited.use_global_defaults ?? true,
        ai_enabled: edited.ai_enabled ?? true,
        temperature: edited.temperature ?? 0.7,
        max_tokens: edited.max_tokens ?? 2000,
        tone: edited.tone ?? 'empático e direto',
        depth_level: edited.depth_level ?? 3,
        report_style: edited.report_style ?? 'narrativo',
      });
      if (error) toast.error('Erro ao criar config');
      else { toast.success('Config criada'); await fetchData(); }
    }
    setSaving(null);
  };

  const updateTestAiField = (testId: string, field: string, value: any) => {
    setEditedTestAi(prev => ({
      ...prev,
      [testId]: { ...(prev[testId] || {}), test_id: testId, [field]: value },
    }));
  };

  const toggleSection = (key: string) => setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }));

  // ── Preview / Simulation ──
  const runPreview = async () => {
    if (!previewTestId) { toast.error('Selecione um teste'); return; }
    const mod = modules.find(m => m.id === previewTestId);
    if (!mod) return;

    // Build simulated scores from sliders
    const activePrompts = testPrompts.filter(p => p.test_id === previewTestId && p.is_active);
    if (activePrompts.length === 0) { toast.error('Nenhum prompt ativo para este teste'); return; }

    // Get axes from questions for this test
    const { data: questions } = await supabase.from('questions').select('axes').eq('test_id', previewTestId);
    const allAxes = new Set<string>();
    (questions || []).forEach((q: any) => (q.axes || []).forEach((a: string) => allAxes.add(a)));
    const axisKeys = Array.from(allAxes);

    if (axisKeys.length === 0) { toast.error('Teste sem eixos configurados'); return; }

    const scores = axisKeys.map(key => {
      const pct = previewScores[key] ?? 50;
      return { key, label: key, score: Math.round(pct * 5 / 100), maxScore: 5, percentage: pct };
    }).sort((a, b) => b.percentage - a.percentage);

    setPreviewRunning(true);
    setPreviewResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('analyze-test', {
        body: { test_module_id: previewTestId, scores, slug: mod.slug },
      });

      if (error) { toast.error('Erro na simulação'); console.error(error); setPreviewRunning(false); return; }
      if (data?.useFallback) { toast.warning('Sem prompts ativos — usaria fallback local'); setPreviewRunning(false); return; }
      if (data?.error) { toast.error(data.error); setPreviewRunning(false); return; }

      setPreviewResult(data?.analysis || data);
      toast.success('Simulação concluída');
    } catch (err) {
      console.error('Preview error:', err);
      toast.error('Erro inesperado na simulação');
    }
    setPreviewRunning(false);
  };

  const fadeUp = { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.4 } };

  // ── AI Config UI Component ──
  const renderAiConfigPanel = (
    config: Partial<GlobalAiConfig | TestAiConfig>,
    onChange: (field: string, value: any) => void,
    onSave: () => void,
    savingKey: string,
    isTest?: boolean,
    useGlobal?: boolean,
    onToggleGlobal?: (val: boolean) => void
  ) => {
    const disabled = isTest && useGlobal;
    return (
      <div className="space-y-4">
        {isTest && onToggleGlobal && (
          <div className="flex items-center justify-between p-3 rounded-xl border border-border/30 bg-card/40">
            <div>
              <p className="text-[0.8rem] font-semibold">Herdar configuração global</p>
              <p className="text-[0.65rem] text-muted-foreground/50">Usar os mesmos parâmetros da config padrão</p>
            </div>
            <button onClick={() => onToggleGlobal(!useGlobal)} className="p-1 hover:bg-muted/30 rounded-lg transition-colors">
              {useGlobal ? <ToggleRight className="w-5 h-5 text-emerald-500" /> : <ToggleLeft className="w-5 h-5 text-muted-foreground/40" />}
            </button>
          </div>
        )}

        <div className={`grid grid-cols-1 sm:grid-cols-2 gap-3 ${disabled ? 'opacity-30 pointer-events-none' : ''}`}>
          {/* AI Enabled */}
          <div className="p-3 rounded-xl border border-border/30 bg-card/40 space-y-1.5">
            <label className="text-[0.75rem] font-semibold text-foreground/80">IA Ativa</label>
            <button onClick={() => onChange('ai_enabled', !config.ai_enabled)} className="flex items-center gap-2">
              {config.ai_enabled ? <ToggleRight className="w-5 h-5 text-emerald-500" /> : <ToggleLeft className="w-5 h-5 text-muted-foreground/40" />}
              <span className="text-[0.7rem] text-muted-foreground/60">{config.ai_enabled ? 'Ativada' : 'Desativada'}</span>
            </button>
          </div>

          {/* Temperature */}
          <div className="p-3 rounded-xl border border-border/30 bg-card/40 space-y-1.5">
            <label className="text-[0.75rem] font-semibold text-foreground/80">Temperatura / Criatividade</label>
            <input
              type="range" min="0" max="1" step="0.05"
              value={config.temperature ?? 0.7}
              onChange={(e) => onChange('temperature', parseFloat(e.target.value))}
              className="w-full accent-primary h-1.5"
            />
            <p className="text-[0.65rem] text-muted-foreground/50 text-right">{(config.temperature ?? 0.7).toFixed(2)}</p>
          </div>

          {/* Max Tokens */}
          <div className="p-3 rounded-xl border border-border/30 bg-card/40 space-y-1.5">
            <label className="text-[0.75rem] font-semibold text-foreground/80">Tamanho Máximo da Resposta</label>
            <input
              type="number" min={500} max={8000} step={100}
              value={config.max_tokens ?? 2000}
              onChange={(e) => onChange('max_tokens', parseInt(e.target.value) || 2000)}
              className="w-full bg-background/50 border border-border/20 rounded-lg px-3 py-1.5 text-[0.78rem] focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
            <p className="text-[0.6rem] text-muted-foreground/40">tokens (500–8000)</p>
          </div>

          {/* Depth Level */}
          <div className="p-3 rounded-xl border border-border/30 bg-card/40 space-y-1.5">
            <label className="text-[0.75rem] font-semibold text-foreground/80">Nível de Profundidade</label>
            <input
              type="range" min="1" max="5" step="1"
              value={config.depth_level ?? 3}
              onChange={(e) => onChange('depth_level', parseInt(e.target.value))}
              className="w-full accent-primary h-1.5"
            />
            <p className="text-[0.65rem] text-muted-foreground/50 text-right">{DEPTH_LABELS[config.depth_level ?? 3]} ({config.depth_level ?? 3}/5)</p>
          </div>

          {/* Tone */}
          <div className="p-3 rounded-xl border border-border/30 bg-card/40 space-y-1.5">
            <label className="text-[0.75rem] font-semibold text-foreground/80">Tom da Resposta</label>
            <select
              value={config.tone ?? 'empático e direto'}
              onChange={(e) => onChange('tone', e.target.value)}
              className="w-full bg-background/50 border border-border/20 rounded-lg px-3 py-1.5 text-[0.78rem] focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              {TONE_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          {/* Report Style */}
          <div className="p-3 rounded-xl border border-border/30 bg-card/40 space-y-1.5">
            <label className="text-[0.75rem] font-semibold text-foreground/80">Estilo do Relatório</label>
            <select
              value={config.report_style ?? 'narrativo'}
              onChange={(e) => onChange('report_style', e.target.value)}
              className="w-full bg-background/50 border border-border/20 rounded-lg px-3 py-1.5 text-[0.78rem] focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              {STYLE_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>

        <div className="flex justify-end">
          <button onClick={onSave} disabled={saving === savingKey} className="flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-[0.75rem] font-semibold disabled:opacity-30 hover:opacity-90 transition-all">
            <Save className="w-3.5 h-3.5" /> {saving === savingKey ? 'Salvando...' : 'Salvar Configuração'}
          </button>
        </div>
      </div>
    );
  };

  // ── Prompt renderers (unchanged) ──
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
            <p className="text-[0.78rem] text-muted-foreground/60">Prompts · Configuração de IA · Por teste</p>
          </div>
        </div>
      </motion.div>

      {/* ── Pré-visualização / Simulação ── */}
      <motion.div {...fadeUp} transition={{ delay: 0.02 }} className="space-y-3">
        <button onClick={() => toggleSection('preview')} className="w-full flex items-center justify-between bg-card/70 backdrop-blur-sm border border-emerald-500/20 rounded-2xl px-5 py-4 hover:bg-card/90 transition-colors">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center"><PlayCircle className="w-4 h-4 text-emerald-500" /></div>
            <div className="text-left">
              <h2 className="text-[0.9rem] font-semibold">Pré-visualização de Resposta</h2>
              <p className="text-[0.7rem] text-muted-foreground/50">Simular resposta da IA antes de impactar o usuário</p>
            </div>
          </div>
          {expandedSections['preview'] ? <ChevronDown className="w-4 h-4 text-muted-foreground/40" /> : <ChevronRight className="w-4 h-4 text-muted-foreground/40" />}
        </button>

        {expandedSections['preview'] && (
          <div className="space-y-4 pl-2">
            {/* Test selector */}
            <div className="p-4 rounded-xl border border-border/30 bg-card/40 space-y-3">
              <label className="text-[0.8rem] font-semibold">Selecionar Teste</label>
              <select
                value={previewTestId}
                onChange={(e) => { setPreviewTestId(e.target.value); setPreviewResult(null); setPreviewScores({}); }}
                className="w-full bg-background/50 border border-border/20 rounded-lg px-3 py-2 text-[0.8rem] focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="">Escolha um teste...</option>
                {modules.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>

            {/* Active prompts summary */}
            {previewTestId && (() => {
              const activePrompts = testPrompts.filter(p => p.test_id === previewTestId && p.is_active);
              return (
                <div className="p-4 rounded-xl border border-border/30 bg-card/40 space-y-2">
                  <h4 className="text-[0.8rem] font-semibold flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                    Prompts Ativos ({activePrompts.length}/7)
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {PROMPT_FIELDS.map(f => {
                      const active = activePrompts.find(p => p.prompt_type === f.type);
                      return (
                        <span key={f.type} className={`text-[0.65rem] px-2 py-0.5 rounded-full font-medium ${
                          active ? 'bg-emerald-500/10 text-emerald-600' : 'bg-muted/30 text-muted-foreground/40 line-through'
                        }`}>{f.label.replace('Prompt de ', '').replace('Prompt ', '')}</span>
                      );
                    })}
                  </div>
                  {activePrompts.length === 0 && (
                    <p className="text-[0.7rem] text-amber-600">⚠ Sem prompts ativos. A simulação usará fallback local.</p>
                  )}
                </div>
              );
            })()}

            {/* Score sliders */}
            {previewTestId && (() => {
              const modPrompts = testPrompts.filter(p => p.test_id === previewTestId);
              // Get unique axes from prompts content or use defaults
              const axes = Array.from(new Set(
                testPrompts
                  .filter(p => p.test_id === previewTestId)
                  .flatMap(() => {
                    // We'll populate from questions on runPreview, show basic sliders
                    return Object.keys(previewScores).length > 0 ? Object.keys(previewScores) : [];
                  })
              ));

              return (
                <div className="p-4 rounded-xl border border-border/30 bg-card/40 space-y-3">
                  <h4 className="text-[0.8rem] font-semibold flex items-center gap-2">
                    <Sliders className="w-3.5 h-3.5 text-primary/70" />
                    Simular Scores por Eixo
                  </h4>
                  <p className="text-[0.65rem] text-muted-foreground/50">Ajuste os percentuais para simular diferentes cenários. Clique "Carregar Eixos" para buscar do banco.</p>
                  
                  <button
                    onClick={async () => {
                      const { data: questions } = await supabase.from('questions').select('axes').eq('test_id', previewTestId);
                      const allAxes = new Set<string>();
                      (questions || []).forEach((q: any) => (q.axes || []).forEach((a: string) => allAxes.add(a)));
                      const newScores: Record<string, number> = {};
                      allAxes.forEach(a => { newScores[a] = previewScores[a] ?? 50; });
                      setPreviewScores(newScores);
                      if (allAxes.size === 0) toast.warning('Nenhum eixo encontrado nas perguntas deste teste');
                      else toast.success(`${allAxes.size} eixos carregados`);
                    }}
                    className="px-3 py-1.5 text-[0.7rem] font-semibold bg-muted/40 hover:bg-muted/60 rounded-lg transition-colors"
                  >
                    Carregar Eixos
                  </button>

                  {Object.keys(previewScores).length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {Object.entries(previewScores).map(([axis, val]) => (
                        <div key={axis} className="space-y-1">
                          <div className="flex justify-between">
                            <span className="text-[0.7rem] font-medium text-foreground/70">{axis}</span>
                            <span className="text-[0.65rem] text-muted-foreground/50 font-mono">{val}%</span>
                          </div>
                          <input
                            type="range" min="0" max="100" step="5"
                            value={val}
                            onChange={(e) => setPreviewScores(prev => ({ ...prev, [axis]: parseInt(e.target.value) }))}
                            className="w-full accent-primary h-1.5"
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Run simulation */}
            {previewTestId && (
              <button
                onClick={runPreview}
                disabled={previewRunning}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-emerald-600 text-white rounded-xl text-[0.85rem] font-semibold disabled:opacity-40 hover:bg-emerald-700 transition-colors"
              >
                {previewRunning ? <Loader2 className="w-4 h-4 animate-spin" /> : <PlayCircle className="w-4 h-4" />}
                {previewRunning ? 'Gerando simulação...' : 'Simular Resposta da IA'}
              </button>
            )}

            {/* Preview result */}
            {previewResult && (
              <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/[0.03] space-y-3">
                <h4 className="text-[0.85rem] font-bold text-emerald-700 dark:text-emerald-400">Resultado da Simulação</h4>
                
                {previewResult.profileName && (
                  <div className="space-y-1">
                    <span className="text-[0.65rem] uppercase tracking-wider text-muted-foreground/40 font-semibold">Perfil</span>
                    <p className="text-[0.85rem] font-semibold">{previewResult.profileName}</p>
                  </div>
                )}
                {previewResult.mentalState && (
                  <div className="space-y-1">
                    <span className="text-[0.65rem] uppercase tracking-wider text-muted-foreground/40 font-semibold">Estado Mental</span>
                    <p className="text-[0.78rem] text-foreground/70">{previewResult.mentalState}</p>
                  </div>
                )}
                {previewResult.summary && (
                  <div className="space-y-1">
                    <span className="text-[0.65rem] uppercase tracking-wider text-muted-foreground/40 font-semibold">Resumo</span>
                    <p className="text-[0.75rem] text-foreground/60 leading-relaxed whitespace-pre-wrap">{previewResult.summary}</p>
                  </div>
                )}
                {previewResult.corePain && (
                  <div className="space-y-1">
                    <span className="text-[0.65rem] uppercase tracking-wider text-muted-foreground/40 font-semibold">Dor Central</span>
                    <p className="text-[0.75rem] text-foreground/60">{previewResult.corePain}</p>
                  </div>
                )}
                {previewResult.direction && (
                  <div className="space-y-1">
                    <span className="text-[0.65rem] uppercase tracking-wider text-muted-foreground/40 font-semibold">Direção</span>
                    <p className="text-[0.75rem] text-foreground/60">{previewResult.direction}</p>
                  </div>
                )}
                {previewResult.triggers?.length > 0 && (
                  <div className="space-y-1">
                    <span className="text-[0.65rem] uppercase tracking-wider text-muted-foreground/40 font-semibold">Gatilhos</span>
                    <ul className="list-disc list-inside text-[0.72rem] text-foreground/55 space-y-0.5">
                      {previewResult.triggers.map((t: string, i: number) => <li key={i}>{t}</li>)}
                    </ul>
                  </div>
                )}

                {/* Raw JSON toggle */}
                <details className="mt-2">
                  <summary className="text-[0.65rem] cursor-pointer text-muted-foreground/40 hover:text-muted-foreground/60">Ver JSON completo</summary>
                  <pre className="mt-2 p-3 bg-background/60 rounded-lg text-[0.65rem] overflow-x-auto max-h-80 text-foreground/50 font-mono leading-relaxed">
                    {JSON.stringify(previewResult, null, 2)}
                  </pre>
                </details>
              </div>
            )}
          </div>
        )}
      </motion.div>

      {/* ── IA / Configuração de Resposta (Global) ── */}
      <motion.div {...fadeUp} transition={{ delay: 0.03 }} className="space-y-3">
        <button onClick={() => toggleSection('ai_config')} className="w-full flex items-center justify-between bg-card/70 backdrop-blur-sm border border-border/40 rounded-2xl px-5 py-4 hover:bg-card/90 transition-colors">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-violet-500/10 flex items-center justify-center"><Sliders className="w-4 h-4 text-violet-500" /></div>
            <div className="text-left">
              <h2 className="text-[0.9rem] font-semibold">IA / Configuração de Resposta</h2>
              <p className="text-[0.7rem] text-muted-foreground/50">Configuração global · Herdada por todos os testes</p>
            </div>
          </div>
          {expandedSections['ai_config'] ? <ChevronDown className="w-4 h-4 text-muted-foreground/40" /> : <ChevronRight className="w-4 h-4 text-muted-foreground/40" />}
        </button>
        {expandedSections['ai_config'] && globalAiConfig && (
          <div className="pl-2">
            {renderAiConfigPanel(
              editedGlobalAi,
              (field, value) => setEditedGlobalAi(prev => ({ ...prev, [field]: value })),
              handleSaveGlobalAi,
              'global_ai'
            )}
          </div>
        )}
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

      {/* ── Per-Module: Prompts + AI Config ── */}
      {modules.map((mod, mi) => {
        const modPrompts = testPrompts.filter(p => p.test_id === mod.id);
        const ModIcon = iconMap[mod.icon] || Brain;
        const isExpanded = expandedSections[mod.id] ?? false;
        const byType: Record<string, TestPrompt> = {};
        modPrompts.forEach(p => { byType[p.prompt_type] = p; });
        const configuredCount = PROMPT_FIELDS.filter(f => byType[f.type]).length;
        const testAi = testAiConfigs.find(c => c.test_id === mod.id);
        const editedTai = editedTestAi[mod.id] || (testAi ? { ...testAi } : { test_id: mod.id, use_global_defaults: true, ai_enabled: true, temperature: 0.7, max_tokens: 2000, tone: 'empático e direto', depth_level: 3, report_style: 'narrativo' });

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
              <div className="space-y-4 pl-2">
                {/* AI Config for this test */}
                <div className="border border-violet-500/20 rounded-2xl p-4 bg-violet-500/[0.02] space-y-3">
                  <div className="flex items-center gap-2">
                    <Settings className="w-3.5 h-3.5 text-violet-500/60" />
                    <h3 className="text-[0.8rem] font-semibold text-violet-600 dark:text-violet-400">Config de IA deste teste</h3>
                  </div>
                  {renderAiConfigPanel(
                    editedTai,
                    (field, value) => updateTestAiField(mod.id, field, value),
                    () => handleSaveTestAi(mod.id),
                    `tai_${mod.id}`,
                    true,
                    editedTai.use_global_defaults ?? true,
                    (val) => updateTestAiField(mod.id, 'use_global_defaults', val)
                  )}
                </div>

                {/* Prompts */}
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
