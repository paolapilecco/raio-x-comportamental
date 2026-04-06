import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Brain, Sparkles, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import PromptEditor from '@/components/admin/PromptEditor';
import AIConfigPanel from '@/components/admin/AIConfigPanel';
import SimulationPanel from '@/components/admin/SimulationPanel';
import HistoryPanel from '@/components/admin/HistoryPanel';
import {
  iconMap, PROMPT_SECTIONS,
  type TestPrompt, type TestModule, type GlobalAiConfig, type TestAiConfig,
} from '@/components/admin/promptConstants';

const AdminPrompts = () => {
  const { user, isSuperAdmin, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [testPrompts, setTestPrompts] = useState<TestPrompt[]>([]);
  const [modules, setModules] = useState<TestModule[]>([]);
  const [globalAiConfig, setGlobalAiConfig] = useState<GlobalAiConfig | null>(null);
  const [testAiConfigs, setTestAiConfigs] = useState<TestAiConfig[]>([]);
  const [editedGlobalAi, setEditedGlobalAi] = useState<Partial<GlobalAiConfig>>({});
  const [editedTestAi, setEditedTestAi] = useState<Record<string, Partial<TestAiConfig>>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [editedTexts, setEditedTexts] = useState<Record<string, string>>({});
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const [selectedModule, setSelectedModule] = useState<string>('');

  useEffect(() => {
    if (authLoading) return;
    if (!isSuperAdmin) { navigate('/dashboard', { replace: true }); return; }
    fetchData();
  }, [authLoading, isSuperAdmin]);

  const fetchData = async () => {
    const [tpRes, mRes, gaiRes, taiRes] = await Promise.all([
      supabase.from('test_prompts').select('*').order('created_at', { ascending: true }),
      supabase.from('test_modules').select('id, slug, name, icon').eq('is_active', true).order('sort_order'),
      supabase.from('global_ai_config').select('*').limit(1).maybeSingle(),
      supabase.from('test_ai_config').select('*'),
    ]);

    const tp = (tpRes.data || []) as TestPrompt[];
    setTestPrompts(tp);
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

  const handleToggleTestPrompt = async (prompt: TestPrompt) => {
    const { error } = await supabase.from('test_prompts').update({ is_active: !prompt.is_active, updated_by: user?.id }).eq('id', prompt.id);
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

  const handleSaveGlobalAi = async () => {
    if (!globalAiConfig) return;
    setSaving('global_ai');
    const { id, ...fields } = editedGlobalAi as GlobalAiConfig;
    const { error } = await supabase.from('global_ai_config').update({
      ai_enabled: fields.ai_enabled, ai_model: fields.ai_model, temperature: fields.temperature, max_tokens: fields.max_tokens,
      tone: fields.tone, depth_level: fields.depth_level, report_style: fields.report_style,
    } as any).eq('id', globalAiConfig.id);
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

  const fadeUp = { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.4 } };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary/60" />
          <p className="text-[0.85rem] text-muted-foreground/60">Carregando Central de Prompts...</p>
        </div>
      </div>
    );
  }

  const currentModule = modules.find(m => m.id === selectedModule);
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

      {/* Test Selector */}
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

      {/* Prompt Editor */}
      {currentModule && (
        <motion.div {...fadeUp} transition={{ delay: 0.04 }}>
          <PromptEditor
            currentModule={currentModule}
            testPrompts={testPrompts}
            editedTexts={editedTexts}
            setEditedTexts={setEditedTexts}
            saving={saving}
            onSavePrompt={handleSaveTestPrompt}
            onTogglePrompt={handleToggleTestPrompt}
            onCreatePrompt={handleCreatePrompt}
          />
        </motion.div>
      )}

      {/* AI Config */}
      <motion.div {...fadeUp} transition={{ delay: 0.06 }}>
        <AIConfigPanel
          globalAiConfig={globalAiConfig}
          editedGlobalAi={editedGlobalAi}
          setEditedGlobalAi={setEditedGlobalAi}
          onSaveGlobalAi={handleSaveGlobalAi}
          currentModule={currentModule}
          editedTai={editedTai}
          onUpdateTestAiField={(field, value) => updateTestAiField(selectedModule, field, value)}
          onSaveTestAi={() => handleSaveTestAi(selectedModule)}
          saving={saving}
          selectedModule={selectedModule}
          expandedGlobal={expandedSections['ai_config'] ?? false}
          onToggleGlobal={() => toggleSection('ai_config')}
        />
      </motion.div>

      {/* Simulation */}
      <motion.div {...fadeUp} transition={{ delay: 0.08 }}>
        <SimulationPanel
          modules={modules}
          testPrompts={testPrompts}
          expanded={expandedSections['preview'] ?? false}
          onToggle={() => toggleSection('preview')}
        />
      </motion.div>

      {/* History */}
      <motion.div {...fadeUp} transition={{ delay: 0.12 }}>
        <HistoryPanel
          modules={modules}
          expanded={expandedSections['history'] ?? false}
          onToggle={() => toggleSection('history')}
        />
      </motion.div>
    </div>
  );
};

export default AdminPrompts;
