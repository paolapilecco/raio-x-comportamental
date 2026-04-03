import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Brain, Save, ToggleLeft, ToggleRight, Sparkles, FileText, Target, Lightbulb, Route, ChevronDown, ChevronRight, Zap, Heart, Shield, DollarSign, Eye, Compass, Crosshair, AlertTriangle, ArrowUpRight, Ban, Settings, Sliders, PlayCircle, Loader2, CheckCircle2, History, Clock, Plus, GitCompare } from 'lucide-react';
import { toast } from 'sonner';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

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

const PROMPT_SECTIONS = [
  { type: 'interpretation', label: 'Interpretação', shortLabel: 'Interpret.', icon: Brain, color: 'text-blue-500', bgColor: 'bg-blue-500/10', borderColor: 'border-blue-500/20', description: 'Instruções base para interpretar as respostas do usuário. Define como a IA deve ler e cruzar os dados dos eixos.', defaultTitle: 'Prompt Base de Interpretação', rows: 6 },
  { type: 'diagnosis', label: 'Diagnóstico', shortLabel: 'Diagnóst.', icon: FileText, color: 'text-indigo-500', bgColor: 'bg-indigo-500/10', borderColor: 'border-indigo-500/20', description: 'Prompt para gerar o diagnóstico final com base nos scores. Deve ser direto, específico e sem generalidades.', defaultTitle: 'Prompt do Diagnóstico Final', rows: 6 },
  { type: 'profile', label: 'Perfil', shortLabel: 'Perfil', icon: Target, color: 'text-purple-500', bgColor: 'bg-purple-500/10', borderColor: 'border-purple-500/20', description: 'Prompt para identificar o perfil comportamental dominante. Deve gerar um nome criativo e descritivo.', defaultTitle: 'Prompt de Identificação de Perfil', rows: 5 },
  { type: 'core_pain', label: 'Dor Central', shortLabel: 'Dor', icon: Crosshair, color: 'text-rose-500', bgColor: 'bg-rose-500/10', borderColor: 'border-rose-500/20', description: 'Prompt para identificar a dor central por trás dos padrões. Deve ser específico — nunca genérico.', defaultTitle: 'Prompt de Dor Central', rows: 5 },
  { type: 'triggers', label: 'Gatilhos', shortLabel: 'Gatilhos', icon: AlertTriangle, color: 'text-amber-500', bgColor: 'bg-amber-500/10', borderColor: 'border-amber-500/20', description: 'Mapear gatilhos que ativam padrões e armadilhas mentais que os mantêm ativos.', defaultTitle: 'Prompt de Gatilhos e Armadilhas', rows: 5 },
  { type: 'direction', label: 'Direção', shortLabel: 'Direção', icon: ArrowUpRight, color: 'text-emerald-500', bgColor: 'bg-emerald-500/10', borderColor: 'border-emerald-500/20', description: 'Sugerir ações práticas e caminhos de transformação. Deve ser concreto e com prazos.', defaultTitle: 'Prompt de Direção Prática', rows: 5 },
  { type: 'restrictions', label: 'Restrições', shortLabel: 'Restrições', icon: Ban, color: 'text-red-500', bgColor: 'bg-red-500/10', borderColor: 'border-red-500/20', description: 'O que a IA NÃO deve fazer ao gerar resultados. Regras negativas obrigatórias.', defaultTitle: 'Regras Negativas / Restrições', rows: 5 },
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
  const [selectedModule, setSelectedModule] = useState<string>('');
  // Preview state
  const [previewTestId, setPreviewTestId] = useState<string>('');
  const [previewScores, setPreviewScores] = useState<Record<string, number>>({});
  const [previewRunning, setPreviewRunning] = useState(false);
  const [previewResult, setPreviewResult] = useState<any>(null);
  const [previewSentData, setPreviewSentData] = useState<{ scores: any[]; dominant: any; contradictions: string[] } | null>(null);
  const [refineLevel, setRefineLevel] = useState(0);
  const [resultHistory, setResultHistory] = useState<{ level: number; result: any }[]>([]);
  const [showComparison, setShowComparison] = useState(false);
  // History state
  const [historyTestId, setHistoryTestId] = useState<string>('');
  const [historyEntries, setHistoryEntries] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [expandedHistoryId, setExpandedHistoryId] = useState<string | null>(null);

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
    const mods = (mRes.data || []) as TestModule[];
    setModules(mods);
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

    if (!selectedModule && mods.length > 0) setSelectedModule(mods[0].id);
    setLoading(false);
  };

  // ── Save handlers ──
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

  const handleCreatePrompt = async (testId: string, section: typeof PROMPT_SECTIONS[0]) => {
    setSaving(`create_${section.type}`);
    const { error } = await supabase.from('test_prompts').insert({
      test_id: testId,
      prompt_type: section.type as any,
      title: section.defaultTitle,
      content: '',
      is_active: true,
      updated_by: user?.id,
    });
    if (error) toast.error('Erro ao criar prompt');
    else { toast.success(`${section.label} criado`); await fetchData(); }
    setSaving(null);
  };

  // ── AI Config save handlers ──
  const handleSaveGlobalAi = async () => {
    if (!globalAiConfig) return;
    setSaving('global_ai');
    const { id, ...fields } = editedGlobalAi as GlobalAiConfig;
    const { error } = await supabase.from('global_ai_config').update({
      ai_enabled: fields.ai_enabled, temperature: fields.temperature, max_tokens: fields.max_tokens,
      tone: fields.tone, depth_level: fields.depth_level, report_style: fields.report_style,
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
    const payload = {
      use_global_defaults: edited.use_global_defaults, ai_enabled: edited.ai_enabled,
      temperature: edited.temperature, max_tokens: edited.max_tokens, tone: edited.tone,
      depth_level: edited.depth_level, report_style: edited.report_style,
    };
    if (existing) {
      const { error } = await supabase.from('test_ai_config').update(payload).eq('id', existing.id);
      if (error) toast.error('Erro ao salvar');
      else { toast.success('Config salva'); await fetchData(); }
    } else {
      const { error } = await supabase.from('test_ai_config').insert({
        test_id: testId, use_global_defaults: edited.use_global_defaults ?? true, ai_enabled: edited.ai_enabled ?? true,
        temperature: edited.temperature ?? 0.7, max_tokens: edited.max_tokens ?? 2000,
        tone: edited.tone ?? 'empático e direto', depth_level: edited.depth_level ?? 3, report_style: edited.report_style ?? 'narrativo',
      });
      if (error) toast.error('Erro ao criar config');
      else { toast.success('Config criada'); await fetchData(); }
    }
    setSaving(null);
  };

  const updateTestAiField = (testId: string, field: string, value: any) => {
    setEditedTestAi(prev => ({ ...prev, [testId]: { ...(prev[testId] || {}), test_id: testId, [field]: value } }));
  };

  const toggleSection = (key: string) => setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }));

  // ── Preview ──
  const runPreview = async () => {
    if (!previewTestId) { toast.error('Selecione um teste'); return; }
    const mod = modules.find(m => m.id === previewTestId);
    if (!mod) return;
    const activePrompts = testPrompts.filter(p => p.test_id === previewTestId && p.is_active);
    if (activePrompts.length === 0) { toast.error('Nenhum prompt ativo para este teste'); return; }
    const { data: questions } = await supabase.from('questions').select('axes').eq('test_id', previewTestId);
    const allAxes = new Set<string>();
    (questions || []).forEach((q: any) => (q.axes || []).forEach((a: string) => allAxes.add(a)));
    const axisKeys = Array.from(allAxes);
    if (axisKeys.length === 0) { toast.error('Teste sem eixos configurados'); return; }
    const scores = axisKeys.map(key => {
      const pct = previewScores[key] ?? 50;
      return { key, label: key, score: Math.round(pct * 5 / 100), maxScore: 5, percentage: pct };
    }).sort((a, b) => b.percentage - a.percentage);
    // Detect contradictions for display
    const detectContradictions = (s: any[]) => {
      const m: Record<string, number> = {};
      s.forEach(x => { m[x.key] = x.percentage; });
      const c: string[] = [];
      if ((m['excessive_self_criticism'] ?? 0) >= 60 && (m['validation_dependency'] ?? 0) >= 60) c.push('Autocrítica alta + Dependência de validação');
      if ((m['paralyzing_perfectionism'] ?? 0) >= 60 && (m['unstable_execution'] ?? 0) >= 60) c.push('Perfeccionismo + Execução instável');
      if ((m['discomfort_escape'] ?? 0) >= 60 && (m['functional_overload'] ?? 0) >= 60) c.push('Fuga do desconforto + Sobrecarga funcional');
      if ((m['excessive_self_criticism'] ?? 0) >= 60 && (m['low_routine_sustenance'] ?? 0) >= 60) c.push('Autocrítica alta + Baixa sustentação de rotina');
      if ((m['emotional_self_sabotage'] ?? 0) >= 60 && (m['validation_dependency'] ?? 0) >= 60) c.push('Autossabotagem emocional + Dependência de validação');
      return c;
    };
    setPreviewSentData({ scores, dominant: scores[0], contradictions: detectContradictions(scores) });
    setRefineLevel(0);
    setPreviewRunning(true);
    setPreviewResult(null);
    setResultHistory([]);
    setShowComparison(false);
    try {
      const { data, error } = await supabase.functions.invoke('analyze-test', {
        body: { test_module_id: previewTestId, scores, slug: mod.slug, refine_level: refineLevel },
      });
      if (error) { toast.error('Erro na simulação'); setPreviewRunning(false); return; }
      if (data?.useFallback) { toast.warning('Sem prompts ativos — usaria fallback local'); setPreviewRunning(false); return; }
      if (data?.error) { toast.error(data.error); setPreviewRunning(false); return; }
      const analysis = data?.analysis || data;
      setPreviewResult(analysis);
      setResultHistory([{ level: 0, result: analysis }]);
      toast.success('Simulação concluída');
    } catch { toast.error('Erro inesperado na simulação'); }
    setPreviewRunning(false);
  };

  const fetchHistory = async (testId: string) => {
    setHistoryLoading(true);
    const { data, error } = await supabase.from('prompt_history').select('*').eq('test_id', testId).order('changed_at', { ascending: false }).limit(50);
    if (error) toast.error('Erro ao carregar histórico');
    setHistoryEntries((data || []) as any[]);
    setHistoryLoading(false);
  };

  const fadeUp = { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.4 } };

  // ── AI Config Panel ──
  const renderAiConfigPanel = (
    config: Partial<GlobalAiConfig | TestAiConfig>, onChange: (field: string, value: any) => void,
    onSave: () => void, savingKey: string, isTest?: boolean, useGlobal?: boolean, onToggleGlobal?: (val: boolean) => void
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
          <div className="p-3 rounded-xl border border-border/30 bg-card/40 space-y-1.5">
            <label className="text-[0.75rem] font-semibold text-foreground/80">IA Ativa</label>
            <button onClick={() => onChange('ai_enabled', !config.ai_enabled)} className="flex items-center gap-2">
              {config.ai_enabled ? <ToggleRight className="w-5 h-5 text-emerald-500" /> : <ToggleLeft className="w-5 h-5 text-muted-foreground/40" />}
              <span className="text-[0.7rem] text-muted-foreground/60">{config.ai_enabled ? 'Ativada' : 'Desativada'}</span>
            </button>
          </div>
          <div className="p-3 rounded-xl border border-border/30 bg-card/40 space-y-1.5">
            <label className="text-[0.75rem] font-semibold text-foreground/80">Temperatura / Criatividade</label>
            <input type="range" min="0" max="1" step="0.05" value={config.temperature ?? 0.7} onChange={(e) => onChange('temperature', parseFloat(e.target.value))} className="w-full accent-primary h-1.5" />
            <p className="text-[0.65rem] text-muted-foreground/50 text-right">{(config.temperature ?? 0.7).toFixed(2)}</p>
          </div>
          <div className="p-3 rounded-xl border border-border/30 bg-card/40 space-y-1.5">
            <label className="text-[0.75rem] font-semibold text-foreground/80">Tamanho Máximo</label>
            <input type="number" min={500} max={8000} step={100} value={config.max_tokens ?? 2000} onChange={(e) => onChange('max_tokens', parseInt(e.target.value) || 2000)} className="w-full bg-background/50 border border-border/20 rounded-lg px-3 py-1.5 text-[0.78rem] focus:outline-none focus:ring-2 focus:ring-primary/20" />
            <p className="text-[0.6rem] text-muted-foreground/40">tokens (500–8000)</p>
          </div>
          <div className="p-3 rounded-xl border border-border/30 bg-card/40 space-y-1.5">
            <label className="text-[0.75rem] font-semibold text-foreground/80">Profundidade</label>
            <input type="range" min="1" max="5" step="1" value={config.depth_level ?? 3} onChange={(e) => onChange('depth_level', parseInt(e.target.value))} className="w-full accent-primary h-1.5" />
            <p className="text-[0.65rem] text-muted-foreground/50 text-right">{DEPTH_LABELS[config.depth_level ?? 3]} ({config.depth_level ?? 3}/5)</p>
          </div>
          <div className="p-3 rounded-xl border border-border/30 bg-card/40 space-y-1.5">
            <label className="text-[0.75rem] font-semibold text-foreground/80">Tom</label>
            <select value={config.tone ?? 'empático e direto'} onChange={(e) => onChange('tone', e.target.value)} className="w-full bg-background/50 border border-border/20 rounded-lg px-3 py-1.5 text-[0.78rem] focus:outline-none focus:ring-2 focus:ring-primary/20">
              {TONE_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="p-3 rounded-xl border border-border/30 bg-card/40 space-y-1.5">
            <label className="text-[0.75rem] font-semibold text-foreground/80">Estilo</label>
            <select value={config.report_style ?? 'narrativo'} onChange={(e) => onChange('report_style', e.target.value)} className="w-full bg-background/50 border border-border/20 rounded-lg px-3 py-1.5 text-[0.78rem] focus:outline-none focus:ring-2 focus:ring-primary/20">
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

  if (authLoading || loading) {
    return <div className="min-h-screen flex items-center justify-center bg-background"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  }

  const currentModule = modules.find(m => m.id === selectedModule);
  const currentPrompts = testPrompts.filter(p => p.test_id === selectedModule);
  const byType: Record<string, TestPrompt> = {};
  currentPrompts.forEach(p => { byType[p.prompt_type] = p; });
  const configuredCount = PROMPT_SECTIONS.filter(s => byType[s.type]).length;
  const testAi = testAiConfigs.find(c => c.test_id === selectedModule);
  const editedTai = editedTestAi[selectedModule] || (testAi ? { ...testAi } : { test_id: selectedModule, use_global_defaults: true, ai_enabled: true, temperature: 0.7, max_tokens: 2000, tone: 'empático e direto', depth_level: 3, report_style: 'narrativo' });

  return (
    <div className="min-h-screen bg-background text-foreground px-4 py-8 max-w-5xl mx-auto space-y-6">
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
            <p className="text-[0.78rem] text-muted-foreground/60">Sistema modular · 7 seções por teste · Controle fino da IA</p>
          </div>
        </div>
      </motion.div>

      {/* ── Test Selector ── */}
      <motion.div {...fadeUp} transition={{ delay: 0.02 }}>
        <div className="flex items-center gap-3 flex-wrap">
          {modules.map((mod) => {
            const ModIcon = iconMap[mod.icon] || Brain;
            const modPrompts = testPrompts.filter(p => p.test_id === mod.id);
            const count = PROMPT_SECTIONS.filter(s => modPrompts.find(p => p.prompt_type === s.type)).length;
            const isSelected = selectedModule === mod.id;
            return (
              <button
                key={mod.id}
                onClick={() => setSelectedModule(mod.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-[0.8rem] font-medium transition-all ${
                  isSelected
                    ? 'bg-primary/10 border-primary/30 text-primary shadow-sm'
                    : 'bg-card/60 border-border/30 text-foreground/60 hover:bg-card/90'
                }`}
              >
                <ModIcon className="w-4 h-4" />
                <span>{mod.name}</span>
                <span className={`text-[0.6rem] px-1.5 py-0.5 rounded-full font-mono ${
                  count === 7 ? 'bg-emerald-500/10 text-emerald-600' : 'bg-amber-500/10 text-amber-600'
                }`}>{count}/7</span>
              </button>
            );
          })}
        </div>
      </motion.div>

      {/* ── Module Prompt Sections (Tabs) ── */}
      {currentModule && (
        <motion.div {...fadeUp} transition={{ delay: 0.04 }} className="space-y-4">
          {/* Status bar */}
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold">{currentModule.name}</h2>
              <span className="text-[0.65rem] font-mono text-muted-foreground/40">{currentModule.slug}</span>
            </div>
            <div className="flex items-center gap-1.5">
              {PROMPT_SECTIONS.map(s => {
                const exists = !!byType[s.type];
                const SIcon = s.icon;
                return (
                  <div key={s.type} title={`${s.label}: ${exists ? 'Configurado' : 'Pendente'}`}
                    className={`w-7 h-7 rounded-lg flex items-center justify-center ${exists ? s.bgColor : 'bg-muted/20'}`}>
                    <SIcon className={`w-3 h-3 ${exists ? s.color : 'text-muted-foreground/25'}`} />
                  </div>
                );
              })}
            </div>
          </div>

          <Tabs defaultValue="interpretation" className="w-full">
            <TabsList className="w-full flex flex-wrap h-auto gap-1 bg-muted/30 p-1.5 rounded-xl">
              {PROMPT_SECTIONS.map(s => {
                const exists = !!byType[s.type];
                const SIcon = s.icon;
                return (
                  <TabsTrigger key={s.type} value={s.type} className="flex items-center gap-1.5 text-[0.72rem] px-3 py-2 data-[state=active]:shadow-sm">
                    <SIcon className={`w-3 h-3 ${exists ? s.color : 'text-muted-foreground/40'}`} />
                    <span className="hidden sm:inline">{s.label}</span>
                    <span className="sm:hidden">{s.shortLabel}</span>
                    {!exists && <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />}
                  </TabsTrigger>
                );
              })}
            </TabsList>

            {PROMPT_SECTIONS.map(section => {
              const prompt = byType[section.type];
              const SIcon = section.icon;
              return (
                <TabsContent key={section.type} value={section.type} className="mt-4">
                  <div className={`rounded-2xl border ${section.borderColor} overflow-hidden`}>
                    {/* Section header */}
                    <div className={`flex items-center gap-3 px-5 py-4 ${section.bgColor}`}>
                      <SIcon className={`w-5 h-5 ${section.color}`} />
                      <div className="flex-1">
                        <h3 className="text-[0.9rem] font-semibold">{section.label}</h3>
                        <p className="text-[0.7rem] text-muted-foreground/60 mt-0.5">{section.description}</p>
                      </div>
                      {prompt && (
                        <button onClick={() => handleToggleTestPrompt(prompt)} className="p-1.5 hover:bg-background/30 rounded-lg transition-colors" title={prompt.is_active ? 'Desativar' : 'Ativar'}>
                          {prompt.is_active ? <ToggleRight className="w-5 h-5 text-emerald-500" /> : <ToggleLeft className="w-5 h-5 text-muted-foreground/40" />}
                        </button>
                      )}
                    </div>

                    {/* Content */}
                    <div className="p-5">
                      {prompt ? (
                        <div className={`space-y-4 ${!prompt.is_active ? 'opacity-40' : ''}`}>
                          <textarea
                            value={editedTexts[`tp_${prompt.id}`] ?? prompt.content}
                            onChange={(e) => setEditedTexts(prev => ({ ...prev, [`tp_${prompt.id}`]: e.target.value }))}
                            rows={section.rows}
                            placeholder={`Escreva o prompt de ${section.label.toLowerCase()} aqui...\n\nSeja específico. Evite generalidades.`}
                            className={`w-full border rounded-xl p-4 text-[0.8rem] leading-[1.8] resize-y focus:outline-none focus:ring-2 transition-all font-mono ${
                              section.type === 'restrictions'
                                ? 'bg-red-500/[0.02] border-red-500/15 text-red-900/70 dark:text-red-300/70 focus:ring-red-500/20 placeholder:text-red-400/30'
                                : 'bg-background/50 border-border/20 text-foreground/80 focus:ring-primary/20 placeholder:text-muted-foreground/30'
                            }`}
                          />
                          <div className="flex items-center justify-between">
                            <span className="text-[0.65rem] text-muted-foreground/30">
                              Última edição: {new Date(prompt.updated_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </span>
                            <button
                              onClick={() => handleSaveTestPrompt(prompt)}
                              disabled={(editedTexts[`tp_${prompt.id}`] ?? prompt.content) === prompt.content || saving === prompt.id}
                              className="flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-[0.75rem] font-semibold disabled:opacity-20 hover:opacity-90 transition-all"
                            >
                              <Save className="w-3.5 h-3.5" /> {saving === prompt.id ? 'Salvando...' : 'Salvar'}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center py-10 space-y-3">
                          <div className={`w-12 h-12 rounded-2xl ${section.bgColor} flex items-center justify-center`}>
                            <SIcon className={`w-6 h-6 ${section.color} opacity-40`} />
                          </div>
                          <p className="text-[0.85rem] font-medium text-muted-foreground/50">Prompt de {section.label} não configurado</p>
                          <p className="text-[0.7rem] text-muted-foreground/35 max-w-md text-center">{section.description}</p>
                          <button
                            onClick={() => handleCreatePrompt(selectedModule, section)}
                            disabled={saving === `create_${section.type}`}
                            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-[0.8rem] font-semibold transition-all ${section.bgColor} ${section.color} hover:opacity-80 disabled:opacity-30`}
                          >
                            <Plus className="w-4 h-4" />
                            {saving === `create_${section.type}` ? 'Criando...' : `Criar Prompt de ${section.label}`}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </TabsContent>
              );
            })}
          </Tabs>

          {/* AI Config for this test */}
          <div className="border border-violet-500/20 rounded-2xl p-5 bg-violet-500/[0.02] space-y-3">
            <div className="flex items-center gap-2">
              <Settings className="w-4 h-4 text-violet-500/60" />
              <h3 className="text-[0.85rem] font-semibold text-violet-600 dark:text-violet-400">Configuração de IA — {currentModule.name}</h3>
            </div>
            {renderAiConfigPanel(
              editedTai,
              (field, value) => updateTestAiField(selectedModule, field, value),
              () => handleSaveTestAi(selectedModule),
              `tai_${selectedModule}`, true,
              editedTai.use_global_defaults ?? true,
              (val) => updateTestAiField(selectedModule, 'use_global_defaults', val)
            )}
          </div>
        </motion.div>
      )}

      {/* ── Preview ── */}
      <motion.div {...fadeUp} transition={{ delay: 0.06 }} className="space-y-3">
        <button onClick={() => toggleSection('preview')} className="w-full flex items-center justify-between bg-card/70 backdrop-blur-sm border border-emerald-500/20 rounded-2xl px-5 py-4 hover:bg-card/90 transition-colors">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center"><PlayCircle className="w-4 h-4 text-emerald-500" /></div>
            <div className="text-left">
              <h2 className="text-[0.9rem] font-semibold">Pré-visualização de Resposta</h2>
              <p className="text-[0.7rem] text-muted-foreground/50">Simular resposta da IA com os prompts atuais</p>
            </div>
          </div>
          {expandedSections['preview'] ? <ChevronDown className="w-4 h-4 text-muted-foreground/40" /> : <ChevronRight className="w-4 h-4 text-muted-foreground/40" />}
        </button>
        {expandedSections['preview'] && (
          <div className="space-y-4 pl-2">
            <div className="p-4 rounded-xl border border-border/30 bg-card/40 space-y-3">
              <label className="text-[0.8rem] font-semibold">Selecionar Teste</label>
              <select value={previewTestId} onChange={(e) => { setPreviewTestId(e.target.value); setPreviewResult(null); setPreviewScores({}); }} className="w-full bg-background/50 border border-border/20 rounded-lg px-3 py-2 text-[0.8rem] focus:outline-none focus:ring-2 focus:ring-primary/20">
                <option value="">Escolha um teste...</option>
                {modules.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>
            {previewTestId && (() => {
              const activePrompts = testPrompts.filter(p => p.test_id === previewTestId && p.is_active);
              return (
                <div className="p-4 rounded-xl border border-border/30 bg-card/40 space-y-2">
                  <h4 className="text-[0.8rem] font-semibold flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />Prompts Ativos ({activePrompts.length}/7)
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {PROMPT_SECTIONS.map(s => {
                      const active = activePrompts.find(p => p.prompt_type === s.type);
                      return <span key={s.type} className={`text-[0.65rem] px-2 py-0.5 rounded-full font-medium ${active ? 'bg-emerald-500/10 text-emerald-600' : 'bg-muted/30 text-muted-foreground/40 line-through'}`}>{s.label}</span>;
                    })}
                  </div>
                </div>
              );
            })()}
            {previewTestId && (
              <div className="p-4 rounded-xl border border-border/30 bg-card/40 space-y-3">
                <h4 className="text-[0.8rem] font-semibold flex items-center gap-2"><Sliders className="w-3.5 h-3.5 text-primary/70" />Simular Scores</h4>
                <button onClick={async () => {
                  const { data: questions } = await supabase.from('questions').select('axes').eq('test_id', previewTestId);
                  const allAxes = new Set<string>();
                  (questions || []).forEach((q: any) => (q.axes || []).forEach((a: string) => allAxes.add(a)));
                  const newScores: Record<string, number> = {};
                  allAxes.forEach(a => { newScores[a] = previewScores[a] ?? 50; });
                  setPreviewScores(newScores);
                  if (allAxes.size === 0) toast.warning('Nenhum eixo encontrado');
                  else toast.success(`${allAxes.size} eixos carregados`);
                }} className="px-3 py-1.5 text-[0.7rem] font-semibold bg-muted/40 hover:bg-muted/60 rounded-lg transition-colors">Carregar Eixos</button>
                {Object.keys(previewScores).length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {Object.entries(previewScores).map(([axis, val]) => (
                      <div key={axis} className="space-y-1">
                        <div className="flex justify-between"><span className="text-[0.7rem] font-medium text-foreground/70">{axis}</span><span className="text-[0.65rem] text-muted-foreground/50 font-mono">{val}%</span></div>
                        <input type="range" min="0" max="100" step="5" value={val} onChange={(e) => setPreviewScores(prev => ({ ...prev, [axis]: parseInt(e.target.value) }))} className="w-full accent-primary h-1.5" />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            {previewTestId && (
              <button onClick={runPreview} disabled={previewRunning} className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-emerald-600 text-white rounded-xl text-[0.85rem] font-semibold disabled:opacity-40 hover:bg-emerald-700 transition-colors">
                {previewRunning ? <Loader2 className="w-4 h-4 animate-spin" /> : <PlayCircle className="w-4 h-4" />}
                {previewRunning ? 'Gerando...' : 'Simular Resposta da IA'}
              </button>
            )}
            {/* Dados utilizados pela IA */}
            {previewResult && previewSentData && (
              <div className="rounded-2xl border border-sky-500/25 bg-sky-500/[0.02] overflow-hidden">
                <div className="px-5 py-3 bg-sky-500/[0.05] border-b border-sky-500/15 flex items-center gap-2">
                  <Eye className="w-4 h-4 text-sky-500" />
                  <h4 className="text-[0.85rem] font-bold text-sky-700 dark:text-sky-400">Dados utilizados pela IA</h4>
                </div>
                <div className="p-5 space-y-4">
                  {/* Scores por eixo */}
                  <div className="space-y-2">
                    <h5 className="text-[0.72rem] font-bold uppercase tracking-wider text-sky-600/70">Valores dos Eixos</h5>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                      {previewSentData.scores.map((s: any) => (
                        <div key={s.key} className="flex items-center gap-2 text-[0.72rem]">
                          <div className="flex-1 flex items-center gap-2">
                            <span className="text-foreground/60 font-medium truncate">{s.label}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <div className="w-16 h-1.5 rounded-full bg-muted/30 overflow-hidden">
                              <div className={`h-full rounded-full ${s.percentage >= 75 ? 'bg-red-500' : s.percentage >= 50 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${s.percentage}%` }} />
                            </div>
                            <span className="font-mono text-muted-foreground/50 w-8 text-right">{s.percentage}%</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Padrão dominante */}
                  <div className="space-y-1.5">
                    <h5 className="text-[0.72rem] font-bold uppercase tracking-wider text-sky-600/70">Padrão Dominante</h5>
                    <div className="flex items-center gap-2 p-2.5 rounded-lg bg-muted/15 border border-border/15">
                      <span className="text-[0.8rem] font-semibold text-foreground/70">{previewSentData.dominant.label}</span>
                      <span className={`text-[0.65rem] px-2 py-0.5 rounded-full font-medium ${previewSentData.dominant.percentage >= 75 ? 'bg-red-500/10 text-red-600' : previewSentData.dominant.percentage >= 50 ? 'bg-amber-500/10 text-amber-600' : 'bg-emerald-500/10 text-emerald-600'}`}>
                        {previewSentData.dominant.percentage >= 75 ? 'ALTA' : previewSentData.dominant.percentage >= 50 ? 'MODERADA' : 'LEVE'}
                      </span>
                    </div>
                  </div>

                  {/* Conflitos */}
                  <div className="space-y-1.5">
                    <h5 className="text-[0.72rem] font-bold uppercase tracking-wider text-sky-600/70">Conflitos Identificados</h5>
                    {previewSentData.contradictions.length > 0 ? (
                      <div className="space-y-1">
                        {previewSentData.contradictions.map((c: string, i: number) => (
                          <div key={i} className="flex items-start gap-2 p-2 rounded-lg bg-amber-500/[0.04] border border-amber-500/15 text-[0.72rem]">
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                            <span className="text-foreground/60">{c}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[0.72rem] text-muted-foreground/40 italic">Nenhum conflito extremo detectado nos scores atuais.</p>
                    )}
                  </div>
                </div>
              </div>
            )}
            {previewResult && (() => {
              // ── Quality check ──
              const GENERIC_PHRASES = ['tenha mais foco', 'acredite em si', 'saia da zona de conforto', 'você precisa melhorar', 'busque equilíbrio', 'tente se organizar', 'seja mais disciplinado', 'confie no processo'];
              const allText = [previewResult.criticalDiagnosis, previewResult.corePain, previewResult.summary, previewResult.mechanism, previewResult.contradiction, previewResult.direction, previewResult.firstAction, previewResult.keyUnlockArea].filter(Boolean).join(' ').toLowerCase();
              const issues: string[] = [];
              const hasCause = /porque|raiz|causa|origem|sustenta|alimenta|mantém/.test(allText);
              const hasConflict = /mas |porém|contradição|conflito|ao mesmo tempo|enquanto/.test(allText);
              const hasDirection = /primeiro passo|nos próximos|ação|começar por|parar de|específic/.test(allText);
              const genericFound = GENERIC_PHRASES.filter(p => allText.includes(p));
              if (!hasCause) issues.push('Sem causa clara identificada');
              if (!hasConflict) issues.push('Sem conflito ou contradição');
              if (!hasDirection) issues.push('Sem direção prática específica');
              if (genericFound.length > 0) issues.push(`Frases genéricas: "${genericFound.join('", "')}"`);
              if (!previewResult.blindSpot?.realProblem) issues.push('Ponto cego vazio ou ausente');
              if ((previewResult.whatNotToDo?.length ?? 0) === 0) issues.push('Sem restrições (o que não fazer)');
              const qualityScore = Math.max(0, 100 - issues.length * 18);

              const blocks: { key: string; label: string; color: string; borderColor: string; render: () => React.ReactNode }[] = [
                { key: 'criticalDiagnosis', label: 'Diagnóstico Crítico', color: 'text-red-600 dark:text-red-400', borderColor: 'border-red-500/20', render: () => <p className="text-[0.78rem] text-foreground/70 leading-relaxed">{previewResult.criticalDiagnosis}</p> },
                { key: 'corePain', label: 'Dor Central', color: 'text-rose-600 dark:text-rose-400', borderColor: 'border-rose-500/20', render: () => <p className="text-[0.78rem] text-foreground/70 leading-relaxed">{previewResult.corePain}</p> },
                { key: 'profileName', label: 'Perfil', color: 'text-purple-600 dark:text-purple-400', borderColor: 'border-purple-500/20', render: () => (
                  <div className="space-y-1">
                    <p className="text-[0.9rem] font-bold">{previewResult.profileName}</p>
                    {previewResult.mentalState && <p className="text-[0.72rem] text-muted-foreground/60 italic">{previewResult.mentalState}</p>}
                    {previewResult.combinedTitle && <p className="text-[0.7rem] text-muted-foreground/50">{previewResult.combinedTitle}</p>}
                  </div>
                )},
                { key: 'summary', label: 'Funcionamento do Padrão', color: 'text-blue-600 dark:text-blue-400', borderColor: 'border-blue-500/20', render: () => (
                  <div className="space-y-2">
                    <p className="text-[0.78rem] text-foreground/70 leading-relaxed whitespace-pre-wrap">{previewResult.summary}</p>
                    {previewResult.mechanism && <p className="text-[0.75rem] text-foreground/60 leading-relaxed border-l-2 border-blue-500/20 pl-3 italic">{previewResult.mechanism}</p>}
                  </div>
                )},
                { key: 'contradiction', label: 'Contradição Interna', color: 'text-amber-600 dark:text-amber-400', borderColor: 'border-amber-500/20', render: () => <p className="text-[0.78rem] text-foreground/70 leading-relaxed">{previewResult.contradiction}</p> },
                { key: 'blindSpot', label: 'Ponto Cego', color: 'text-orange-600 dark:text-orange-400', borderColor: 'border-orange-500/20', render: () => (
                  previewResult.blindSpot && typeof previewResult.blindSpot === 'object' ? (
                    <div className="space-y-2">
                      <div className="p-2.5 rounded-lg bg-muted/20"><span className="text-[0.65rem] uppercase tracking-wider text-muted-foreground/40 font-semibold">O que você acredita</span><p className="text-[0.75rem] text-foreground/60 italic mt-1">{previewResult.blindSpot.perceivedProblem}</p></div>
                      <div className="p-2.5 rounded-lg bg-orange-500/[0.05] border border-orange-500/10"><span className="text-[0.65rem] uppercase tracking-wider text-orange-600/60 font-semibold">O que realmente acontece</span><p className="text-[0.75rem] text-foreground/70 font-medium mt-1">{previewResult.blindSpot.realProblem}</p></div>
                    </div>
                  ) : <p className="text-[0.78rem] text-foreground/70">{String(previewResult.blindSpot)}</p>
                )},
                { key: 'impact', label: 'Impacto', color: 'text-indigo-600 dark:text-indigo-400', borderColor: 'border-indigo-500/20', render: () => (
                  <div className="space-y-2">
                    <p className="text-[0.78rem] text-foreground/70 leading-relaxed">{previewResult.impact}</p>
                    {previewResult.lifeImpact?.length > 0 && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 mt-2">
                        {previewResult.lifeImpact.map((li: any, i: number) => (
                          <div key={i} className="text-[0.7rem] p-2 rounded-lg bg-muted/15 border border-border/15">
                            <span className="font-semibold text-foreground/60">{li.pillar}:</span> <span className="text-foreground/50">{li.impact}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )},
                { key: 'keyUnlockArea', label: 'Área-chave de Destravamento', color: 'text-emerald-600 dark:text-emerald-400', borderColor: 'border-emerald-500/20', render: () => (
                  <div className="space-y-1">
                    <p className="text-[0.78rem] text-foreground/70 leading-relaxed font-medium">{previewResult.keyUnlockArea}</p>
                    {previewResult.blockingPoint && <p className="text-[0.72rem] text-muted-foreground/50 mt-1">Ponto de bloqueio: {previewResult.blockingPoint}</p>}
                  </div>
                )},
                { key: 'whatNotToDo', label: 'O que NÃO fazer', color: 'text-red-500 dark:text-red-400', borderColor: 'border-red-500/20', render: () => (
                  previewResult.whatNotToDo?.length > 0 ? (
                    <ul className="space-y-1">{previewResult.whatNotToDo.map((item: string, i: number) => <li key={i} className="text-[0.75rem] text-foreground/60 flex gap-2"><span className="text-red-500/60 shrink-0">✕</span>{item}</li>)}</ul>
                  ) : null
                )},
                { key: 'firstAction', label: 'Primeira Ação', color: 'text-teal-600 dark:text-teal-400', borderColor: 'border-teal-500/20', render: () => <p className="text-[0.78rem] text-foreground/70 leading-relaxed font-medium">{previewResult.firstAction || previewResult.direction}</p> },
              ];

              return (
                <>
                  <div className="px-5 py-4 bg-emerald-500/[0.05] border-b border-emerald-500/15 flex items-start justify-between gap-3">
                    <div>
                      <h4 className="text-[0.9rem] font-bold text-emerald-700 dark:text-emerald-400">Resultado da Simulação</h4>
                      <p className="text-[0.68rem] text-muted-foreground/50 mt-0.5">{blocks.filter(b => previewResult[b.key]).length} blocos gerados</p>
                    </div>
                    <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[0.7rem] font-semibold ${
                      qualityScore >= 80 ? 'bg-emerald-500/10 text-emerald-600' : qualityScore >= 50 ? 'bg-amber-500/10 text-amber-600' : 'bg-red-500/10 text-red-600'
                    }`}>
                      {qualityScore >= 80 ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
                      Qualidade: {qualityScore}%
                    </div>
                  </div>
                  {issues.length > 0 && (
                    <div className={`mx-5 mt-4 p-4 rounded-xl border ${qualityScore < 50 ? 'border-red-500/25 bg-red-500/[0.04]' : 'border-amber-500/25 bg-amber-500/[0.04]'}`}>
                      <div className="flex items-center gap-2 mb-2">
                        <AlertTriangle className={`w-4 h-4 ${qualityScore < 50 ? 'text-red-500' : 'text-amber-500'}`} />
                        <h5 className={`text-[0.8rem] font-bold ${qualityScore < 50 ? 'text-red-600 dark:text-red-400' : 'text-amber-600 dark:text-amber-400'}`}>
                          {qualityScore < 50 ? 'Resposta com baixo nível de especificidade' : 'Resposta pode ser mais específica'}
                        </h5>
                      </div>
                      <ul className="space-y-1">
                        {issues.map((issue, i) => (
                          <li key={i} className="flex items-start gap-2 text-[0.72rem] text-foreground/60">
                            <span className={`shrink-0 mt-0.5 ${qualityScore < 50 ? 'text-red-500/60' : 'text-amber-500/60'}`}>•</span>
                            {issue}
                          </li>
                        ))}
                      </ul>
                      <p className="text-[0.65rem] text-muted-foreground/40 mt-2 italic">Revise os prompts deste teste para melhorar a especificidade.</p>
                    </div>
                  )}
                  {/* Refine & Compare buttons */}
                  <div className="px-5 pt-2 flex items-center gap-3 flex-wrap">
                    <button
                      onClick={() => {
                        const nextLevel = Math.min(refineLevel + 1, 3);
                        setRefineLevel(nextLevel);
                        if (previewSentData) {
                          setPreviewRunning(true);
                          const mod = modules.find(m => m.id === previewTestId);
                          if (mod) {
                            supabase.functions.invoke('analyze-test', {
                              body: { test_module_id: previewTestId, scores: previewSentData.scores, slug: mod.slug, refine_level: nextLevel },
                            }).then(({ data, error }) => {
                              if (error || data?.useFallback || data?.error) {
                                toast.error(data?.error || 'Erro ao refinar');
                              } else {
                                const analysis = data?.analysis || data;
                                setResultHistory(prev => [...prev, { level: nextLevel, result: analysis }]);
                                setPreviewResult(analysis);
                                toast.success(`Refinamento nível ${nextLevel} concluído`);
                              }
                              setPreviewRunning(false);
                            });
                          }
                        }
                      }}
                      disabled={previewRunning || refineLevel >= 3}
                      className="flex items-center gap-2 px-4 py-2.5 bg-amber-600 text-white rounded-xl text-[0.78rem] font-semibold disabled:opacity-30 hover:bg-amber-700 transition-all"
                    >
                      {previewRunning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                      {previewRunning ? 'Refinando...' : 'Refinar Resposta'}
                    </button>
                    {resultHistory.length >= 2 && (
                      <button
                        onClick={() => setShowComparison(prev => !prev)}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-[0.78rem] font-semibold transition-all ${showComparison ? 'bg-primary text-primary-foreground' : 'bg-muted/40 text-foreground/70 hover:bg-muted/60'}`}
                      >
                        <GitCompare className="w-4 h-4" />
                        {showComparison ? 'Ocultar Comparação' : 'Comparar Respostas'}
                      </button>
                    )}
                    {refineLevel > 0 && (
                      <span className="text-[0.68rem] text-amber-600 font-medium">
                        Nível de refinamento: {refineLevel}/3
                      </span>
                    )}
                    {refineLevel >= 3 && (
                      <span className="text-[0.62rem] text-muted-foreground/40 italic">Nível máximo atingido</span>
                    )}
                  </div>
                  {/* Comparison View */}
                  {showComparison && resultHistory.length >= 2 && (
                    <div className="px-5 pt-4">
                      <div className="rounded-xl border border-primary/20 bg-primary/[0.02] p-4 space-y-4">
                        <div className="flex items-center gap-2 mb-2">
                          <GitCompare className="w-4 h-4 text-primary" />
                          <h5 className="text-[0.85rem] font-bold text-foreground/80">Comparação de Respostas</h5>
                        </div>
                        {(() => {
                          const compareFields: { key: string; label: string }[] = [
                            { key: 'criticalDiagnosis', label: 'Diagnóstico Crítico' },
                            { key: 'corePain', label: 'Dor Central' },
                            { key: 'profileName', label: 'Perfil' },
                            { key: 'summary', label: 'Funcionamento do Padrão' },
                            { key: 'contradiction', label: 'Contradição Interna' },
                            { key: 'keyUnlockArea', label: 'Área-chave de Destravamento' },
                            { key: 'direction', label: 'Direção' },
                            { key: 'firstAction', label: 'Primeira Ação' },
                          ];
                          const prev = resultHistory[resultHistory.length - 2];
                          const curr = resultHistory[resultHistory.length - 1];
                          return (
                            <div className="space-y-3">
                              <div className="grid grid-cols-2 gap-3 mb-3">
                                <div className="text-center p-2 rounded-lg bg-muted/20 border border-border/20">
                                  <span className="text-[0.65rem] text-muted-foreground/50 uppercase tracking-wider font-semibold">
                                    {prev.level === 0 ? 'Original' : `Nível ${prev.level}`}
                                  </span>
                                </div>
                                <div className="text-center p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                                  <span className="text-[0.65rem] text-emerald-600 uppercase tracking-wider font-semibold">
                                    {curr.level === 0 ? 'Original' : `Nível ${curr.level}`}
                                  </span>
                                </div>
                              </div>
                              {compareFields.map(field => {
                                const prevVal = typeof prev.result[field.key] === 'string' ? prev.result[field.key] : JSON.stringify(prev.result[field.key]);
                                const currVal = typeof curr.result[field.key] === 'string' ? curr.result[field.key] : JSON.stringify(curr.result[field.key]);
                                if (!prevVal && !currVal) return null;
                                const changed = prevVal !== currVal;
                                return (
                                  <div key={field.key} className={`rounded-lg border p-3 space-y-2 ${changed ? 'border-amber-500/25 bg-amber-500/[0.02]' : 'border-border/15 bg-card/20'}`}>
                                    <div className="flex items-center gap-2">
                                      <h6 className="text-[0.72rem] font-bold text-foreground/70 uppercase tracking-wider">{field.label}</h6>
                                      {changed && <span className="text-[0.58rem] px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-600 font-semibold">alterado</span>}
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                      <div className="p-2 rounded-lg bg-muted/10 border border-border/10">
                                        <p className="text-[0.7rem] text-foreground/50 leading-relaxed">{prevVal || '—'}</p>
                                      </div>
                                      <div className={`p-2 rounded-lg border ${changed ? 'bg-emerald-500/[0.03] border-emerald-500/15' : 'bg-muted/10 border-border/10'}`}>
                                        <p className={`text-[0.7rem] leading-relaxed ${changed ? 'text-foreground/70 font-medium' : 'text-foreground/50'}`}>{currVal || '—'}</p>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  )}
                  </div>
                  <div className="p-5 space-y-4">
                    {blocks.map(block => {
                      if (!previewResult[block.key]) return null;
                      const content = block.render();
                      if (!content) return null;
                      return (
                        <div key={block.key} className={`border-l-3 ${block.borderColor} pl-4 space-y-1.5`} style={{ borderLeftWidth: '3px' }}>
                          <h5 className={`text-[0.75rem] font-bold uppercase tracking-wider ${block.color}`}>{block.label}</h5>
                          {content}
                        </div>
                      );
                    })}
                    <details className="mt-4 pt-3 border-t border-border/15">
                      <summary className="text-[0.65rem] cursor-pointer text-muted-foreground/40 hover:text-muted-foreground/60">Ver JSON completo</summary>
                      <pre className="mt-2 p-3 bg-background/60 rounded-lg text-[0.65rem] overflow-x-auto max-h-80 text-foreground/50 font-mono leading-relaxed">{JSON.stringify(previewResult, null, 2)}</pre>
                    </details>
                  </div>
                </div>
              );
            })()}
          </div>
        )}
      </motion.div>

      {/* ── Global AI Config ── */}
      <motion.div {...fadeUp} transition={{ delay: 0.08 }} className="space-y-3">
        <button onClick={() => toggleSection('ai_config')} className="w-full flex items-center justify-between bg-card/70 backdrop-blur-sm border border-border/40 rounded-2xl px-5 py-4 hover:bg-card/90 transition-colors">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-violet-500/10 flex items-center justify-center"><Sliders className="w-4 h-4 text-violet-500" /></div>
            <div className="text-left">
              <h2 className="text-[0.9rem] font-semibold">Configuração Global de IA</h2>
              <p className="text-[0.7rem] text-muted-foreground/50">Padrão herdado por todos os testes</p>
            </div>
          </div>
          {expandedSections['ai_config'] ? <ChevronDown className="w-4 h-4 text-muted-foreground/40" /> : <ChevronRight className="w-4 h-4 text-muted-foreground/40" />}
        </button>
        {expandedSections['ai_config'] && globalAiConfig && (
          <div className="pl-2">{renderAiConfigPanel(editedGlobalAi, (f, v) => setEditedGlobalAi(prev => ({ ...prev, [f]: v })), handleSaveGlobalAi, 'global_ai')}</div>
        )}
      </motion.div>

      {/* ── Global Prompts ── */}
      <motion.div {...fadeUp} transition={{ delay: 0.1 }} className="space-y-3">
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
            {globalPrompts.map(p => {
              const meta = GLOBAL_META[p.context] || { icon: Brain, description: 'Prompt personalizado.' };
              const Icon = meta.icon;
              const key = `gp_${p.id}`;
              const hasChanges = editedTexts[key] !== p.prompt_text;
              return (
                <div key={p.id} className={`border rounded-xl p-4 space-y-2.5 transition-colors ${p.is_active ? 'border-border/30 bg-card/40' : 'border-border/15 bg-card/20 opacity-50'}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Icon className={`w-3.5 h-3.5 shrink-0 ${p.is_active ? 'text-primary/70' : 'text-muted-foreground/30'}`} />
                      <div><h4 className="text-[0.8rem] font-semibold leading-tight">{p.label}</h4><p className="text-[0.65rem] text-muted-foreground/40">{meta.description}</p></div>
                    </div>
                    <button onClick={() => handleToggleGlobal(p)} className="p-1 hover:bg-muted/30 rounded-lg transition-colors">
                      {p.is_active ? <ToggleRight className="w-4 h-4 text-emerald-500" /> : <ToggleLeft className="w-4 h-4 text-muted-foreground/30" />}
                    </button>
                  </div>
                  <textarea value={editedTexts[key] ?? p.prompt_text} onChange={(e) => setEditedTexts(prev => ({ ...prev, [key]: e.target.value }))} rows={4} className="w-full bg-background/50 border border-border/20 rounded-lg p-3 text-[0.78rem] leading-[1.7] text-foreground/80 resize-y focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-mono" />
                  <div className="flex items-center justify-between">
                    <span className="text-[0.6rem] text-muted-foreground/25">{new Date(p.updated_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                    <button onClick={() => handleSaveGlobal(p)} disabled={!hasChanges || saving === p.id} className="flex items-center gap-1.5 px-3.5 py-1.5 bg-primary text-primary-foreground rounded-lg text-[0.7rem] font-semibold disabled:opacity-20 hover:opacity-90 transition-all">
                      <Save className="w-3 h-3" /> {saving === p.id ? '...' : 'Salvar'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </motion.div>

      {/* ── History ── */}
      <motion.div {...fadeUp} transition={{ delay: 0.12 }} className="space-y-3">
        <button onClick={() => toggleSection('history')} className="w-full flex items-center justify-between bg-card/70 backdrop-blur-sm border border-border/40 rounded-2xl px-5 py-4 hover:bg-card/90 transition-colors">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-orange-500/10 flex items-center justify-center"><History className="w-4 h-4 text-orange-500" /></div>
            <div className="text-left">
              <h2 className="text-[0.9rem] font-semibold">Histórico de Alterações</h2>
              <p className="text-[0.7rem] text-muted-foreground/50">Auditoria de mudanças nos prompts</p>
            </div>
          </div>
          {expandedSections['history'] ? <ChevronDown className="w-4 h-4 text-muted-foreground/40" /> : <ChevronRight className="w-4 h-4 text-muted-foreground/40" />}
        </button>
        {expandedSections['history'] && (
          <div className="space-y-3 pl-2">
            <div className="flex items-center gap-2">
              <select value={historyTestId} onChange={(e) => { setHistoryTestId(e.target.value); if (e.target.value) fetchHistory(e.target.value); else setHistoryEntries([]); }} className="flex-1 bg-background/50 border border-border/20 rounded-lg px-3 py-2 text-[0.8rem] focus:outline-none focus:ring-2 focus:ring-primary/20">
                <option value="">Selecione um teste...</option>
                {modules.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
              {historyTestId && <button onClick={() => fetchHistory(historyTestId)} className="px-3 py-2 text-[0.7rem] font-semibold bg-muted/40 hover:bg-muted/60 rounded-lg transition-colors">Atualizar</button>}
            </div>
            {historyLoading && <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground/40" /></div>}
            {!historyLoading && historyTestId && historyEntries.length === 0 && <p className="text-[0.75rem] text-muted-foreground/40 text-center py-4">Nenhuma alteração registrada.</p>}
            {historyEntries.map((entry) => (
              <div key={entry.id} className="border border-border/25 rounded-xl p-3 space-y-2 bg-card/30">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="w-3 h-3 text-muted-foreground/40" />
                    <span className="text-[0.7rem] font-semibold text-foreground/70">{PROMPT_SECTIONS.find(s => s.type === entry.prompt_type)?.label || entry.prompt_type}</span>
                  </div>
                  <span className="text-[0.6rem] text-muted-foreground/40">{new Date(entry.changed_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <button onClick={() => setExpandedHistoryId(expandedHistoryId === entry.id ? null : entry.id)} className="text-[0.65rem] text-primary/60 hover:text-primary/80 transition-colors">
                  {expandedHistoryId === entry.id ? 'Ocultar diff' : 'Ver alterações'}
                </button>
                {expandedHistoryId === entry.id && (
                  <div className="space-y-2 mt-1">
                    <div className="p-2 rounded-lg bg-red-500/[0.04] border border-red-500/10">
                      <span className="text-[0.6rem] uppercase tracking-wider text-red-500/50 font-semibold">Antes</span>
                      <p className="text-[0.7rem] text-foreground/50 font-mono whitespace-pre-wrap mt-1 max-h-32 overflow-y-auto">{entry.old_content || '(vazio)'}</p>
                    </div>
                    <div className="p-2 rounded-lg bg-emerald-500/[0.04] border border-emerald-500/10">
                      <span className="text-[0.6rem] uppercase tracking-wider text-emerald-500/50 font-semibold">Depois</span>
                      <p className="text-[0.7rem] text-foreground/50 font-mono whitespace-pre-wrap mt-1 max-h-32 overflow-y-auto">{entry.new_content || '(vazio)'}</p>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default AdminPrompts;
