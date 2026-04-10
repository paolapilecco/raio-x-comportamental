import { useState, useEffect } from 'react';
import { Save, ToggleRight, ToggleLeft, Plus, Lightbulb, AlertCircle, Sparkles, Loader2, RefreshCw, Check, X, Pencil, BookmarkPlus, ShieldCheck, ShieldAlert, BarChart3, Zap, PlayCircle } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { PROMPT_SECTIONS, PROMPT_TEMPLATES, type TestPrompt, type TestModule } from './promptConstants';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface PromptEditorProps {
  currentModule: TestModule;
  testPrompts: TestPrompt[];
  editedTexts: Record<string, string>;
  setEditedTexts: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  saving: string | null;
  onSavePrompt: (prompt: TestPrompt) => Promise<void>;
  onTogglePrompt: (prompt: TestPrompt) => Promise<void>;
  onCreatePrompt: (testId: string, section: typeof PROMPT_SECTIONS[0]) => Promise<void>;
}

interface QualityInfo {
  score: number;
  level: 'high' | 'medium' | 'low';
  issues: string[];
  retried: boolean;
}

interface AxisCoverageInfo {
  total: number;
  covered: number;
  uncovered: string[];
  percentage: number;
}

interface AIPreview {
  promptId: string;
  sectionType: string;
  content: string;
  editing: boolean;
  quality?: QualityInfo;
  axisCoverage?: AxisCoverageInfo;
  feedbackUsed?: boolean;
  crossValidated?: boolean;
}

const QualityBadge = ({ quality }: { quality?: QualityInfo }) => {
  if (!quality) return null;
  const config = {
    high: { label: 'Alta qualidade', icon: ShieldCheck, cls: 'text-emerald-600 bg-emerald-500/10 border-emerald-500/20' },
    medium: { label: 'Qualidade moderada', icon: ShieldAlert, cls: 'text-amber-600 bg-amber-500/10 border-amber-500/20' },
    low: { label: 'Qualidade baixa', icon: ShieldAlert, cls: 'text-red-600 bg-red-500/10 border-red-500/20' },
  }[quality.level];
  const Icon = config.icon;
  return (
    <div className="space-y-1.5">
      <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[0.68rem] font-medium border ${config.cls}`}>
        <Icon className="w-3.5 h-3.5" />
        {config.label} ({quality.score}/100)
        {quality.retried && <span className="text-[0.6rem] opacity-60">(auto-refinado)</span>}
      </div>
      {quality.issues.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {quality.issues.map((issue, i) => (
            <span key={i} className="text-[0.62rem] px-2 py-0.5 rounded-md bg-muted/40 text-muted-foreground/70">{issue}</span>
          ))}
        </div>
      )}
    </div>
  );
};

// ── MELHORIA 4: Axis Coverage Badge ──
const AxisCoverageBadge = ({ coverage }: { coverage?: AxisCoverageInfo }) => {
  if (!coverage || coverage.total === 0) return null;
  const pct = coverage.percentage;
  const color = pct >= 80 ? 'emerald' : pct >= 50 ? 'amber' : 'red';
  return (
    <div className="space-y-1.5">
      <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[0.68rem] font-medium border bg-${color}-500/10 text-${color}-600 border-${color}-500/20`}>
        <BarChart3 className="w-3.5 h-3.5" />
        Cobertura de eixos: {coverage.covered}/{coverage.total} ({pct}%)
      </div>
      {coverage.uncovered.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {coverage.uncovered.map((axis, i) => (
            <span key={i} className="text-[0.62rem] px-2 py-0.5 rounded-md bg-red-500/10 text-red-500/80 border border-red-500/15">
              ⚠ {axis.replace(/_/g, ' ')}
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

// ── MELHORIA 4: Global Axis Coverage Panel ──
const AxisCoveragePanel = ({ currentModule, testPrompts, axes }: { currentModule: TestModule; testPrompts: TestPrompt[]; axes: string[] }) => {
  if (axes.length === 0) return null;

  const activePrompts = testPrompts.filter(p => p.test_id === currentModule.id && p.is_active);
  const axisMap: Record<string, string[]> = {};
  axes.forEach(a => { axisMap[a] = []; });

  activePrompts.forEach(p => {
    const lower = p.content?.toLowerCase() || '';
    axes.forEach(a => {
      if (lower.includes(a.toLowerCase())) {
        axisMap[a].push(p.prompt_type);
      }
    });
  });

  const covered = axes.filter(a => axisMap[a].length > 0);
  const uncovered = axes.filter(a => axisMap[a].length === 0);
  const pct = Math.round((covered.length / axes.length) * 100);

  return (
    <div className={`rounded-xl border p-4 space-y-3 ${pct >= 80 ? 'border-emerald-500/20 bg-emerald-500/[0.02]' : pct >= 50 ? 'border-amber-500/20 bg-amber-500/[0.02]' : 'border-red-500/20 bg-red-500/[0.02]'}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart3 className={`w-4 h-4 ${pct >= 80 ? 'text-emerald-500' : pct >= 50 ? 'text-amber-500' : 'text-red-500'}`} />
          <h4 className="text-[0.8rem] font-semibold">Cobertura de Eixos nos Prompts</h4>
        </div>
        <span className={`text-[0.75rem] font-bold ${pct >= 80 ? 'text-emerald-600' : pct >= 50 ? 'text-amber-600' : 'text-red-600'}`}>
          {covered.length}/{axes.length} ({pct}%)
        </span>
      </div>

      <div className="w-full h-2 rounded-full bg-muted/30 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${pct >= 80 ? 'bg-emerald-500' : pct >= 50 ? 'bg-amber-500' : 'bg-red-500'}`}
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
        {axes.map(axis => {
          const refs = axisMap[axis];
          const isCovered = refs.length > 0;
          return (
            <div key={axis} className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[0.68rem] ${isCovered ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400' : 'bg-red-500/10 text-red-600 dark:text-red-400'}`}>
              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isCovered ? 'bg-emerald-500' : 'bg-red-500'}`} />
              <span className="truncate font-medium">{axis.replace(/_/g, ' ')}</span>
              {isCovered && <span className="text-[0.58rem] opacity-60 ml-auto shrink-0">{refs.length}x</span>}
            </div>
          );
        })}
      </div>

      {uncovered.length > 0 && (
        <p className="text-[0.68rem] text-red-500/70">
          ⚠ {uncovered.length} eixo(s) não mencionado(s) em nenhum prompt. Considere gerar novamente os prompts para cobrir todos os eixos.
        </p>
      )}
    </div>
  );
};

const PromptEditor = ({
  currentModule, testPrompts, editedTexts, setEditedTexts,
  saving, onSavePrompt, onTogglePrompt, onCreatePrompt,
}: PromptEditorProps) => {
  const { user } = useAuth();
  const [generatingAI, setGeneratingAI] = useState<string | null>(null);
  const [aiPreview, setAiPreview] = useState<AIPreview | null>(null);
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [moduleAxes, setModuleAxes] = useState<string[]>([]);
  // MELHORIA 5: Quick calibration state
  const [calibrating, setCalibrating] = useState<string | null>(null);
  const [calibrationResult, setCalibrationResult] = useState<{ sectionType: string; result: any } | null>(null);

  const currentPrompts = testPrompts.filter(p => p.test_id === currentModule.id);
  const byType: Record<string, TestPrompt> = {};
  currentPrompts.forEach(p => { byType[p.prompt_type] = p; });

  // Load axes for coverage panel
  useEffect(() => {
    const loadAxes = async () => {
      const { data } = await supabase.from('questions').select('axes').eq('test_id', currentModule.id);
      const allAxes = new Set<string>();
      (data || []).forEach((q: any) => (q.axes || []).forEach((a: string) => allAxes.add(a)));
      setModuleAxes(Array.from(allAxes));
    };
    loadAxes();
  }, [currentModule.id]);

  const logGeneration = async (sectionType: string, content: string, action: string) => {
    try {
      await supabase.from('prompt_generation_history' as any).insert({
        test_id: currentModule.id,
        section_type: sectionType,
        generated_content: content,
        action,
        generated_by: user?.id || null,
      });
    } catch (e) {
      console.error('Failed to log generation:', e);
    }
  };

  const applyTemplate = (promptId: string, sectionType: string) => {
    const template = PROMPT_TEMPLATES[sectionType];
    if (!template) { toast.info('Nenhum template disponível para esta seção'); return; }
    setEditedTexts(prev => ({ ...prev, [`tp_${promptId}`]: template }));
    toast.success('Template aplicado — edite conforme necessário');
  };

  const callAI = async (sectionType: string): Promise<{ prompt: string; quality?: QualityInfo; axisCoverage?: AxisCoverageInfo; feedbackUsed?: boolean; crossValidated?: boolean } | null> => {
    const { data, error } = await supabase.functions.invoke('generate-prompt', {
      body: { testId: currentModule.id, sectionType },
    });
    if (error) throw error;
    if (data?.error) { toast.error(data.error); return null; }
    return data?.prompt ? { prompt: data.prompt, quality: data.quality, axisCoverage: data.axisCoverage, feedbackUsed: data.feedbackUsed, crossValidated: data.crossValidated } : null;
  };

  const generateWithAI = async (promptId: string, sectionType: string) => {
    setGeneratingAI(sectionType);
    try {
      const result = await callAI(sectionType);
      if (result) {
        setAiPreview({ promptId, sectionType, content: result.prompt, editing: false, quality: result.quality, axisCoverage: result.axisCoverage, feedbackUsed: result.feedbackUsed, crossValidated: result.crossValidated });
        await logGeneration(sectionType, result.prompt, result.quality?.retried ? 'generated_retried' : 'generated');
        if (result.quality?.level === 'medium') {
          toast.info('Prompt gerado com qualidade moderada — revise os pontos indicados');
        }
        if (result.feedbackUsed) {
          toast.info('🔄 Referência de edições anteriores foi utilizada', { duration: 3000 });
        }
      }
    } catch (e: any) {
      console.error('AI prompt generation error:', e);
      toast.error('Erro ao gerar prompt com IA');
    } finally {
      setGeneratingAI(null);
    }
  };

  const regenerateAI = async () => {
    if (!aiPreview) return;
    setGeneratingAI(aiPreview.sectionType);
    try {
      const result = await callAI(aiPreview.sectionType);
      if (result) {
        setAiPreview(prev => prev ? { ...prev, content: result.prompt, editing: false, quality: result.quality, axisCoverage: result.axisCoverage } : null);
        await logGeneration(aiPreview.sectionType, result.prompt, 'regenerated');
        toast.success('Nova versão gerada');
      }
    } catch (e: any) {
      console.error('AI regeneration error:', e);
      toast.error('Erro ao regenerar prompt');
    } finally {
      setGeneratingAI(null);
    }
  };

  const acceptAIPrompt = async () => {
    if (!aiPreview) return;
    setEditedTexts(prev => ({ ...prev, [`tp_${aiPreview.promptId}`]: aiPreview.content }));
    await logGeneration(aiPreview.sectionType, aiPreview.content, 'accepted');
    setAiPreview(null);
    toast.success('Prompt aceito — revise e salve quando quiser');
  };

  const saveAsTemplate = async () => {
    if (!aiPreview) return;
    setSavingTemplate(true);
    try {
      const { data: existing } = await supabase
        .from('report_templates')
        .select('id, output_rules')
        .eq('test_id', currentModule.id)
        .maybeSingle();

      const currentRules = (existing?.output_rules as any) || {};
      const updatedRules = {
        ...currentRules,
        promptTemplates: {
          ...(currentRules.promptTemplates || {}),
          [aiPreview.sectionType]: aiPreview.content,
        },
      };

      if (existing) {
        await supabase.from('report_templates').update({ output_rules: updatedRules }).eq('id', existing.id);
      } else {
        await supabase.from('report_templates').insert({ test_id: currentModule.id, output_rules: updatedRules, sections: [] });
      }

      await logGeneration(aiPreview.sectionType, aiPreview.content, 'saved_as_template');
      toast.success(`Salvo como template base de "${PROMPT_SECTIONS.find(s => s.type === aiPreview.sectionType)?.label}"`);
    } catch (e) {
      console.error('Save template error:', e);
      toast.error('Erro ao salvar como template');
    } finally {
      setSavingTemplate(false);
    }
  };

  const discardAIPrompt = () => {
    setAiPreview(null);
  };

  // ── MELHORIA 5: Quick Calibration — run simulation with fake data to test prompt ──
  const runCalibration = async (sectionType: string) => {
    setCalibrating(sectionType);
    setCalibrationResult(null);
    try {
      // Generate fake scores for all axes
      const fakeScores = moduleAxes.map((axis, i) => ({
        key: axis,
        label: axis,
        score: Math.round((70 + (i % 3) * 10 - i * 5) * 5 / 100),
        maxScore: 5,
        percentage: Math.max(20, Math.min(95, 70 + (i % 3) * 10 - i * 5)),
      })).sort((a, b) => b.percentage - a.percentage);

      const { data, error } = await supabase.functions.invoke('analyze-test', {
        body: {
          test_module_id: currentModule.id,
          scores: fakeScores,
          slug: currentModule.slug,
          refine_level: 0,
        },
      });

      if (error || data?.error) {
        toast.error(data?.error || 'Erro na calibração');
      } else {
        const analysis = data?.analysis || data;
        setCalibrationResult({ sectionType, result: analysis });
        toast.success('Calibração concluída — veja o resultado abaixo');
      }
    } catch (e) {
      console.error('Calibration error:', e);
      toast.error('Erro inesperado na calibração');
    } finally {
      setCalibrating(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* MELHORIA 4: Axis Coverage Panel */}
      <AxisCoveragePanel currentModule={currentModule} testPrompts={testPrompts} axes={moduleAxes} />

      {/* Status bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-1">
        <div className="flex items-center gap-2 min-w-0">
          <h2 className="text-base sm:text-lg font-semibold truncate">{currentModule.name}</h2>
          <span className="text-[0.65rem] font-mono text-muted-foreground/40 hidden sm:inline">{currentModule.slug}</span>
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
            const prompt = byType[s.type];
            const isEmpty = exists && prompt.is_active && !(editedTexts[`tp_${prompt.id}`] ?? prompt.content).trim();
            const SIcon = s.icon;
            return (
              <TabsTrigger key={s.type} value={s.type} className="flex items-center gap-1.5 text-[0.72rem] px-3 py-2 data-[state=active]:shadow-sm">
                <SIcon className={`w-3 h-3 ${exists ? s.color : 'text-muted-foreground/40'}`} />
                <span className="hidden sm:inline">{s.label}</span>
                <span className="sm:hidden">{s.shortLabel}</span>
                {!exists && <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />}
                {isEmpty && <span className="relative flex h-3 w-3" title="Prompt ativo mas vazio!"><AlertCircle className="w-3 h-3 text-red-500 animate-pulse" /></span>}
              </TabsTrigger>
            );
          })}
        </TabsList>

        {PROMPT_SECTIONS.map(section => {
          const prompt = byType[section.type];
          const SIcon = section.icon;
          const showPreview = aiPreview && aiPreview.sectionType === section.type;
          const showCalibration = calibrationResult && calibrationResult.sectionType === section.type;
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
                    <button onClick={() => onTogglePrompt(prompt)} className="p-1.5 hover:bg-background/30 rounded-lg transition-colors" title={prompt.is_active ? 'Desativar' : 'Ativar'}>
                      {prompt.is_active ? <ToggleRight className="w-5 h-5 text-emerald-500" /> : <ToggleLeft className="w-5 h-5 text-muted-foreground/40" />}
                    </button>
                  )}
                </div>

                {/* Content */}
                <div className="p-5">
                  {/* AI Preview */}
                  {showPreview && (
                    <div className="mb-4 rounded-xl border-2 border-primary/30 bg-primary/[0.03] overflow-hidden">
                      <div className="flex items-center gap-2 px-4 py-3 bg-primary/10 border-b border-primary/20">
                        <Sparkles className="w-4 h-4 text-primary" />
                        <span className="text-[0.8rem] font-semibold text-primary">Pré-visualização — Prompt gerado pela IA</span>
                        <div className="flex-1" />
                        {/* Feedback & cross-validation badges */}
                        {aiPreview.feedbackUsed && (
                          <span className="text-[0.6rem] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 border border-blue-500/20">🔄 Feedback</span>
                        )}
                        {aiPreview.crossValidated && (
                          <span className="text-[0.6rem] px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-600 border border-violet-500/20">✓ Validado</span>
                        )}
                        {aiPreview.editing ? (
                          <span className="text-[0.65rem] text-muted-foreground/60">Editando...</span>
                        ) : (
                          <button
                            onClick={() => setAiPreview(prev => prev ? { ...prev, editing: true } : null)}
                            className="flex items-center gap-1 px-2 py-1 rounded-md text-[0.65rem] font-medium text-muted-foreground hover:bg-background/50 transition-colors"
                            title="Editar antes de aceitar"
                          >
                            <Pencil className="w-3 h-3" />
                            Editar
                          </button>
                        )}
                      </div>
                      {/* Quality badge + Axis Coverage */}
                      <div className="px-4 pt-3 flex flex-wrap gap-3">
                        {aiPreview.quality && <QualityBadge quality={aiPreview.quality} />}
                        {aiPreview.axisCoverage && <AxisCoverageBadge coverage={aiPreview.axisCoverage} />}
                      </div>
                      <div className="p-4">
                        {aiPreview.editing ? (
                          <textarea
                            value={aiPreview.content}
                            onChange={(e) => setAiPreview(prev => prev ? { ...prev, content: e.target.value } : null)}
                            rows={Math.max(8, aiPreview.content.split('\n').length)}
                            className="w-full border rounded-xl p-4 text-[0.8rem] leading-[1.8] resize-y focus:outline-none focus:ring-2 focus:ring-primary/20 font-mono bg-background/50 border-border/20 text-foreground/80"
                          />
                        ) : (
                          <pre className="whitespace-pre-wrap text-[0.78rem] leading-[1.8] text-foreground/70 font-mono max-h-[400px] overflow-y-auto">
                            {aiPreview.content}
                          </pre>
                        )}
                      </div>
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 px-4 py-3 bg-muted/20 border-t border-primary/10">
                        <button
                          onClick={acceptAIPrompt}
                          className="flex items-center justify-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-[0.75rem] font-semibold hover:opacity-90 transition-all"
                        >
                          <Check className="w-3.5 h-3.5" />
                          Aceitar
                        </button>
                        <button
                          onClick={saveAsTemplate}
                          disabled={savingTemplate}
                          className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-[0.75rem] font-semibold border border-amber-500/30 text-amber-600 hover:bg-amber-500/10 transition-all disabled:opacity-50"
                          title="Salvar este prompt como template base para esta seção neste teste"
                        >
                          {savingTemplate ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <BookmarkPlus className="w-3.5 h-3.5" />}
                          {savingTemplate ? 'Salvando...' : 'Salvar como template'}
                        </button>
                        <button
                          onClick={regenerateAI}
                          disabled={generatingAI === aiPreview.sectionType}
                          className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-[0.75rem] font-semibold border border-primary/30 text-primary hover:bg-primary/10 transition-all disabled:opacity-50"
                        >
                          {generatingAI === aiPreview.sectionType ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                          {generatingAI === aiPreview.sectionType ? 'Regenerando...' : 'Regenerar'}
                        </button>
                        <button
                          onClick={discardAIPrompt}
                          className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-[0.75rem] font-medium text-muted-foreground hover:bg-muted/30 transition-all"
                        >
                          <X className="w-3.5 h-3.5" />
                          Descartar
                        </button>
                      </div>
                    </div>
                  )}

                  {prompt ? (() => {
                    const currentContent = (editedTexts[`tp_${prompt.id}`] ?? prompt.content).trim();
                    const isEmptyAndActive = prompt.is_active && !currentContent;
                    return (
                    <div className={`space-y-4 ${!prompt.is_active ? 'opacity-40' : ''}`}>
                      {isEmptyAndActive && (
                        <div className="flex items-center gap-2 p-3 rounded-xl border border-red-500/25 bg-red-500/[0.05]">
                          <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                          <div>
                            <p className="text-[0.78rem] font-semibold text-red-600 dark:text-red-400">Prompt vazio</p>
                            <p className="text-[0.68rem] text-red-500/60">Este prompt está ativo mas sem conteúdo. A IA não terá instruções para esta seção. Use o template sugerido ou escreva suas instruções.</p>
                          </div>
                        </div>
                      )}
                      {/* Action buttons - above editor */}
                      <div className="flex items-center justify-end gap-2">
                        {/* MELHORIA 5: Quick Calibration */}
                        {prompt.is_active && currentContent && moduleAxes.length > 0 && (
                          <button
                            onClick={() => runCalibration(section.type)}
                            disabled={calibrating === section.type}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[0.7rem] font-medium border border-emerald-500/30 bg-emerald-500/5 text-emerald-600 hover:bg-emerald-500/15 transition-all disabled:opacity-40"
                            title="Testar como a IA responde com este prompt usando dados simulados"
                          >
                            {calibrating === section.type ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <PlayCircle className="w-3.5 h-3.5" />}
                            {calibrating === section.type ? 'Calibrando...' : 'Calibrar'}
                          </button>
                        )}
                        <button
                          onClick={() => generateWithAI(prompt.id, section.type)}
                          disabled={generatingAI === section.type}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[0.7rem] font-medium border border-[hsl(var(--accent))]/30 bg-gradient-to-r from-[hsl(var(--accent))]/5 to-[hsl(var(--accent))]/10 text-[hsl(var(--accent-foreground))]/70 hover:from-[hsl(var(--accent))]/10 hover:to-[hsl(var(--accent))]/20 hover:border-[hsl(var(--accent))]/50 transition-all duration-300 disabled:opacity-40 shadow-sm"
                          title="Gerar prompt automaticamente com IA baseado no contexto do teste"
                        >
                          {generatingAI === section.type ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5 opacity-70" />}
                          {generatingAI === section.type ? 'Gerando...' : 'Gerar com IA'}
                        </button>
                      </div>
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
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                          <span className="text-[0.6rem] sm:text-[0.65rem] text-muted-foreground/30">
                            Última edição: {new Date(prompt.updated_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </span>
                          {PROMPT_TEMPLATES[section.type] && (
                            <button
                              onClick={() => applyTemplate(prompt.id, section.type)}
                              className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[0.68rem] font-medium bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 transition-colors"
                              title="Aplicar template sugerido como ponto de partida"
                            >
                              <Lightbulb className="w-3 h-3" />
                              Usar Template
                            </button>
                          )}
                        </div>
                        <button
                          onClick={() => onSavePrompt(prompt)}
                          disabled={(editedTexts[`tp_${prompt.id}`] ?? prompt.content) === prompt.content || saving === prompt.id}
                          className="flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-[0.75rem] font-semibold disabled:opacity-20 hover:opacity-90 transition-all w-full sm:w-auto justify-center"
                        >
                          <Save className="w-3.5 h-3.5" /> {saving === prompt.id ? 'Salvando...' : 'Salvar'}
                        </button>
                      </div>

                      {/* MELHORIA 5: Calibration Result */}
                      {showCalibration && calibrationResult.result && (
                        <div className="mt-4 rounded-xl border border-emerald-500/25 bg-emerald-500/[0.02] overflow-hidden">
                          <div className="flex items-center justify-between px-4 py-3 bg-emerald-500/[0.05] border-b border-emerald-500/15">
                            <div className="flex items-center gap-2">
                              <Zap className="w-4 h-4 text-emerald-500" />
                              <h5 className="text-[0.8rem] font-bold text-emerald-700 dark:text-emerald-400">Resultado da Calibração</h5>
                            </div>
                            <button onClick={() => setCalibrationResult(null)} className="text-muted-foreground/40 hover:text-muted-foreground/70">
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                          <div className="p-4 space-y-3">
                            <p className="text-[0.68rem] text-muted-foreground/50 italic">Resultado gerado com dados simulados — avalie se o tom, especificidade e estrutura estão adequados.</p>
                            {calibrationResult.result.profileName && (
                              <div className="p-3 rounded-lg bg-muted/15 border border-border/15">
                                <span className="text-[0.65rem] uppercase tracking-wider text-muted-foreground/40 font-semibold">Perfil</span>
                                <p className="text-[0.82rem] font-bold mt-1">{calibrationResult.result.profileName}</p>
                                {calibrationResult.result.mentalState && <p className="text-[0.72rem] text-muted-foreground/60 italic">{calibrationResult.result.mentalState}</p>}
                              </div>
                            )}
                            {calibrationResult.result.criticalDiagnosis && (
                              <div className="p-3 rounded-lg bg-muted/15 border border-border/15">
                                <span className="text-[0.65rem] uppercase tracking-wider text-muted-foreground/40 font-semibold">Diagnóstico</span>
                                <p className="text-[0.75rem] text-foreground/70 mt-1 leading-relaxed">{calibrationResult.result.criticalDiagnosis}</p>
                              </div>
                            )}
                            {calibrationResult.result.corePain && (
                              <div className="p-3 rounded-lg bg-muted/15 border border-border/15">
                                <span className="text-[0.65rem] uppercase tracking-wider text-muted-foreground/40 font-semibold">Dor Central</span>
                                <p className="text-[0.75rem] text-foreground/70 mt-1 leading-relaxed">{calibrationResult.result.corePain}</p>
                              </div>
                            )}
                            {calibrationResult.result.direction && (
                              <div className="p-3 rounded-lg bg-muted/15 border border-border/15">
                                <span className="text-[0.65rem] uppercase tracking-wider text-muted-foreground/40 font-semibold">Direção</span>
                                <p className="text-[0.75rem] text-foreground/70 mt-1 leading-relaxed">{calibrationResult.result.direction}</p>
                              </div>
                            )}
                            <details className="pt-2">
                              <summary className="text-[0.65rem] cursor-pointer text-muted-foreground/40 hover:text-muted-foreground/60">Ver JSON completo</summary>
                              <pre className="mt-2 p-3 rounded-lg bg-muted/10 text-[0.65rem] font-mono text-foreground/50 overflow-x-auto max-h-48">
                                {JSON.stringify(calibrationResult.result, null, 2)}
                              </pre>
                            </details>
                          </div>
                        </div>
                      )}
                    </div>
                    );
                  })() : (
                    <div className="flex flex-col items-center justify-center py-10 space-y-3">
                      <div className={`w-12 h-12 rounded-2xl ${section.bgColor} flex items-center justify-center`}>
                        <SIcon className={`w-6 h-6 ${section.color} opacity-40`} />
                      </div>
                      <p className="text-[0.85rem] font-medium text-muted-foreground/50">Prompt de {section.label} não configurado</p>
                      <p className="text-[0.7rem] text-muted-foreground/35 max-w-md text-center">{section.description}</p>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => onCreatePrompt(currentModule.id, section)}
                          disabled={saving === `create_${section.type}`}
                          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-[0.8rem] font-semibold transition-all ${section.bgColor} ${section.color} hover:opacity-80 disabled:opacity-30`}
                        >
                          <Plus className="w-4 h-4" />
                          {saving === `create_${section.type}` ? 'Criando...' : `Criar Prompt`}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
};

export default PromptEditor;
