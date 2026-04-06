import React, { useState, useCallback, useMemo } from 'react';
import { PlayCircle, ChevronDown, ChevronRight, Sliders, CheckCircle2, AlertTriangle, Loader2, Eye, Sparkles, GitCompare, FileCode, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { PROMPT_SECTIONS, type TestPrompt, type TestModule } from './promptConstants';

interface SimulationPanelProps {
  modules: TestModule[];
  testPrompts: TestPrompt[];
  expanded: boolean;
  onToggle: () => void;
}

/** Generate dynamic presets from real axis names */
const generateDynamicPresets = (axes: string[]) => {
  if (axes.length === 0) return [];
  const presets: { label: string; icon: string; description: string; scores: Record<string, number> }[] = [];

  // Preset 1: First axis dominant
  const p1: Record<string, number> = {};
  axes.forEach((a, i) => { p1[a] = i === 0 ? 90 : Math.max(15, 70 - i * 12); });
  presets.push({ label: `Alto ${axes[0].replace(/_/g, ' ')}`, icon: '📊', description: `Dominância no eixo "${axes[0]}"`, scores: p1 });

  // Preset 2: Balanced high
  const p2: Record<string, number> = {};
  axes.forEach(a => { p2[a] = 60 + Math.floor(Math.random() * 20); });
  presets.push({ label: 'Perfil Elevado Geral', icon: '🔥', description: 'Todos os eixos com scores altos', scores: p2 });

  // Preset 3: Balanced low (functional)
  const p3: Record<string, number> = {};
  axes.forEach(a => { p3[a] = 10 + Math.floor(Math.random() * 20); });
  presets.push({ label: 'Perfil Funcional', icon: '🎯', description: 'Todos os eixos com scores baixos', scores: p3 });

  // Preset 4: Contradictory — first vs second axis
  if (axes.length >= 2) {
    const p4: Record<string, number> = {};
    axes.forEach((a, i) => {
      if (i === 0) p4[a] = 85;
      else if (i === 1) p4[a] = 80;
      else p4[a] = 25 + Math.floor(Math.random() * 15);
    });
    presets.push({ label: 'Perfil Contraditório', icon: '🔀', description: `Conflito entre "${axes[0]}" e "${axes[1]}"`, scores: p4 });
  }

  // Preset 5: Last axis dominant
  if (axes.length >= 3) {
    const p5: Record<string, number> = {};
    axes.forEach((a, i) => { p5[a] = i === axes.length - 1 ? 85 : 20 + Math.floor(Math.random() * 15); });
    presets.push({ label: `Alto ${axes[axes.length - 1].replace(/_/g, ' ')}`, icon: '🛡️', description: `Dominância no eixo "${axes[axes.length - 1]}"`, scores: p5 });
  }

  return presets;
};

const SimulationPanel = ({ modules, testPrompts, expanded, onToggle }: SimulationPanelProps) => {
  const [previewTestId, setPreviewTestId] = useState('');
  const [previewScores, setPreviewScores] = useState<Record<string, number>>({});
  const [previewRunning, setPreviewRunning] = useState(false);
  const [previewResult, setPreviewResult] = useState<any>(null);
  const [previewSentData, setPreviewSentData] = useState<{ scores: any[]; dominant: any; contradictions: string[] } | null>(null);
  const [refineLevel, setRefineLevel] = useState(0);
  const [resultHistory, setResultHistory] = useState<{ level: number; result: any }[]>([]);
  const [showComparison, setShowComparison] = useState(false);
  const [dynamicPresets, setDynamicPresets] = useState<{ label: string; icon: string; description: string; scores: Record<string, number> }[]>([]);
  const [loadedAxes, setLoadedAxes] = useState<string[]>([]);
  const [showPromptPreview, setShowPromptPreview] = useState(false);

  // Build the final system prompt preview (mirrors edge function logic)
  const assembledPrompt = useMemo(() => {
    if (!previewTestId) return '';
    const activePrompts = testPrompts.filter(p => p.test_id === previewTestId && p.is_active);
    if (activePrompts.length === 0) return '';

    const promptMap: Record<string, string> = {};
    activePrompts.forEach(p => { promptMap[p.prompt_type] = p.content; });

    const sections: string[] = [];
    sections.push(`# PAPEL\nVocê é um analista comportamental de alto nível. Sua função é INTERPRETAR — não descrever, não resumir, não motivar.\nVocê recebe dados reais de uma leitura comportamental e deve gerar um diagnóstico estruturado usando APENAS os dados fornecidos.`);

    const sectionMap: Record<string, string> = {
      interpretation: '# INSTRUÇÕES DE INTERPRETAÇÃO',
      diagnosis: '# DIAGNÓSTICO FINAL',
      profile: '# IDENTIFICAÇÃO DE PERFIL',
      core_pain: '# DOR CENTRAL',
      triggers: '# GATILHOS E ARMADILHAS',
      direction: '# DIREÇÃO PRÁTICA',
      restrictions: '# RESTRIÇÕES OBRIGATÓRIAS',
    };

    Object.entries(sectionMap).forEach(([type, header]) => {
      if (promptMap[type]) {
        sections.push(`${header}\n${promptMap[type]}`);
      }
    });

    sections.push(`# REGRAS INVIOLÁVEIS\n[Regras de especificidade, formato JSON e proibições — sempre incluídas automaticamente]`);

    return sections.join('\n\n---\n\n');
  }, [previewTestId, testPrompts]);

  // Detect empty active prompts
  const emptyActivePrompts = useMemo(() => {
    if (!previewTestId) return [];
    return testPrompts
      .filter(p => p.test_id === previewTestId && p.is_active && !p.content.trim())
      .map(p => PROMPT_SECTIONS.find(s => s.type === p.prompt_type)?.label || p.prompt_type);
  }, [previewTestId, testPrompts]);

  const loadAxes = useCallback(async (testId: string) => {
    const { data: questions } = await supabase.from('questions').select('axes').eq('test_id', testId);
    const allAxes = new Set<string>();
    (questions || []).forEach((q: any) => (q.axes || []).forEach((a: string) => allAxes.add(a)));
    const axisKeys = Array.from(allAxes);
    setLoadedAxes(axisKeys);
    setDynamicPresets(generateDynamicPresets(axisKeys));
    const newScores: Record<string, number> = {};
    axisKeys.forEach(a => { newScores[a] = previewScores[a] ?? 50; });
    setPreviewScores(newScores);
    return axisKeys;
  }, [previewScores]);

  const handleSelectTest = async (testId: string) => {
    setPreviewTestId(testId);
    setPreviewResult(null);
    setPreviewScores({});
    setPreviewSentData(null);
    setDynamicPresets([]);
    setLoadedAxes([]);
    if (testId) {
      await loadAxes(testId);
    }
  };

  const detectContradictions = (scores: any[]) => {
    const m: Record<string, number> = {};
    scores.forEach(x => { m[x.key] = x.percentage; });
    const c: string[] = [];
    // Generic contradiction: any two axes both above 70%
    const highAxes = scores.filter(s => s.percentage >= 70);
    for (let i = 0; i < highAxes.length; i++) {
      for (let j = i + 1; j < highAxes.length && c.length < 5; j++) {
        c.push(`${highAxes[i].label} (${highAxes[i].percentage}%) + ${highAxes[j].label} (${highAxes[j].percentage}%)`);
      }
    }
    return c;
  };

  const runPreview = async () => {
    if (!previewTestId) { toast.error('Selecione um diagnóstico'); return; }
    const mod = modules.find(m => m.id === previewTestId);
    if (!mod) return;
    const activePrompts = testPrompts.filter(p => p.test_id === previewTestId && p.is_active);
    if (activePrompts.length === 0) { toast.error('Nenhum prompt ativo para este teste'); return; }

    let axisKeys = loadedAxes;
    if (axisKeys.length === 0) {
      axisKeys = await loadAxes(previewTestId);
    }
    if (axisKeys.length === 0) { toast.error('Diagnóstico sem eixos configurados'); return; }

    const scores = axisKeys.map(key => {
      const pct = previewScores[key] ?? 50;
      return { key, label: key, score: Math.round(pct * 5 / 100), maxScore: 5, percentage: pct };
    }).sort((a, b) => b.percentage - a.percentage);

    setPreviewSentData({ scores, dominant: scores[0], contradictions: detectContradictions(scores) });
    setRefineLevel(0);
    setPreviewRunning(true);
    setPreviewResult(null);
    setResultHistory([]);
    setShowComparison(false);

    try {
      const { data, error } = await supabase.functions.invoke('analyze-test', {
        body: { test_module_id: previewTestId, scores, slug: mod.slug, refine_level: 0 },
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

  const handleRefine = async () => {
    const nextLevel = Math.min(refineLevel + 1, 3);
    setRefineLevel(nextLevel);
    if (!previewSentData) return;
    setPreviewRunning(true);
    const mod = modules.find(m => m.id === previewTestId);
    if (!mod) return;
    try {
      const { data, error } = await supabase.functions.invoke('analyze-test', {
        body: { test_module_id: previewTestId, scores: previewSentData.scores, slug: mod.slug, refine_level: nextLevel },
      });
      if (error || data?.useFallback || data?.error) {
        toast.error(data?.error || 'Erro ao refinar');
      } else {
        const analysis = data?.analysis || data;
        setResultHistory(prev => [...prev, { level: nextLevel, result: analysis }]);
        setPreviewResult(analysis);
        toast.success(`Refinamento nível ${nextLevel} concluído`);
      }
    } catch { toast.error('Erro inesperado'); }
    setPreviewRunning(false);
  };

  return (
    <div className="space-y-3">
      <button onClick={onToggle} className="w-full flex items-center justify-between bg-card/70 backdrop-blur-sm border border-emerald-500/20 rounded-2xl px-5 py-4 hover:bg-card/90 transition-colors">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center"><PlayCircle className="w-4 h-4 text-emerald-500" /></div>
          <div className="text-left">
            <h2 className="text-[0.9rem] font-semibold">Pré-visualização de Resposta</h2>
            <p className="text-[0.7rem] text-muted-foreground/50">Simular resposta da IA com os prompts atuais</p>
          </div>
        </div>
        {expanded ? <ChevronDown className="w-4 h-4 text-muted-foreground/40" /> : <ChevronRight className="w-4 h-4 text-muted-foreground/40" />}
      </button>

      {expanded && (
        <div className="space-y-4 pl-2">
          {/* Test selector */}
          <div className="p-4 rounded-xl border border-border/30 bg-card/40 space-y-3">
            <label className="text-[0.8rem] font-semibold">Selecionar Diagnóstico</label>
            <select value={previewTestId} onChange={(e) => handleSelectTest(e.target.value)} className="w-full bg-background/50 border border-border/20 rounded-lg px-3 py-2 text-[0.8rem] focus:outline-none focus:ring-2 focus:ring-primary/20">
              <option value="">Escolha um diagnóstico...</option>
              {modules.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>

          {/* Active prompts status */}
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

          {/* Scores & Dynamic Presets */}
          {previewTestId && (
            <div className="p-4 rounded-xl border border-border/30 bg-card/40 space-y-3">
              <h4 className="text-[0.8rem] font-semibold flex items-center gap-2"><Sliders className="w-3.5 h-3.5 text-primary/70" />Simular Scores</h4>
              
              {loadedAxes.length === 0 && (
                <p className="text-[0.72rem] text-muted-foreground/50 italic">Carregando eixos do diagnóstico...</p>
              )}

              {/* Dynamic Presets */}
              {dynamicPresets.length > 0 && (
                <div className="space-y-1.5">
                  <label className="text-[0.72rem] font-semibold text-foreground/60">Presets Dinâmicos (baseados nos eixos reais)</label>
                  <div className="flex flex-wrap gap-1.5">
                    {dynamicPresets.map(preset => (
                      <button
                        key={preset.label}
                        onClick={() => {
                          const newScores: Record<string, number> = {};
                          loadedAxes.forEach(a => { newScores[a] = preset.scores[a] ?? 30; });
                          setPreviewScores(newScores);
                          toast.success(`Preset "${preset.label}" aplicado`);
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border/25 bg-card/30 hover:bg-primary/10 hover:border-primary/30 text-[0.7rem] font-medium transition-all"
                        title={preset.description}
                      >
                        <span>{preset.icon}</span>
                        <span className="truncate max-w-[120px]">{preset.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Score sliders */}
              {Object.keys(previewScores).length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {Object.entries(previewScores).map(([axis, val]) => (
                    <div key={axis} className="space-y-1">
                      <div className="flex justify-between"><span className="text-[0.7rem] font-medium text-foreground/70">{axis.replace(/_/g, ' ')}</span><span className="text-[0.65rem] text-muted-foreground/50 font-mono">{val}%</span></div>
                      <input type="range" min="0" max="100" step="5" value={val} onChange={(e) => setPreviewScores(prev => ({ ...prev, [axis]: parseInt(e.target.value) }))} className="w-full accent-primary h-1.5" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Empty prompt warning */}
          {previewTestId && emptyActivePrompts.length > 0 && (
            <div className="flex items-start gap-2 p-3 rounded-xl border border-red-500/25 bg-red-500/[0.05]">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-[0.78rem] font-semibold text-red-600 dark:text-red-400">Prompts vazios detectados</p>
                <p className="text-[0.68rem] text-red-500/60">
                  As seguintes seções estão ativas mas sem conteúdo: <strong>{emptyActivePrompts.join(', ')}</strong>. 
                  A IA não receberá instruções para essas seções.
                </p>
              </div>
            </div>
          )}

          {/* Prompt Preview */}
          {previewTestId && assembledPrompt && (
            <div className="space-y-2">
              <button
                onClick={() => setShowPromptPreview(prev => !prev)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-indigo-500/20 bg-indigo-500/[0.03] hover:bg-indigo-500/[0.08] text-[0.8rem] font-semibold text-indigo-600 dark:text-indigo-400 transition-all w-full"
              >
                <FileCode className="w-4 h-4" />
                <span className="flex-1 text-left">{showPromptPreview ? 'Ocultar Preview do Prompt Final' : 'Ver Preview do Prompt Final'}</span>
                <span className="text-[0.65rem] font-mono text-indigo-500/50">{assembledPrompt.length} chars</span>
              </button>
              {showPromptPreview && (
                <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/[0.02] overflow-hidden">
                  <div className="px-4 py-3 bg-indigo-500/[0.05] border-b border-indigo-500/15 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileCode className="w-4 h-4 text-indigo-500" />
                      <h4 className="text-[0.8rem] font-bold text-indigo-700 dark:text-indigo-400">System Prompt Final</h4>
                    </div>
                    <span className="text-[0.65rem] text-muted-foreground/40">Exatamente o que será enviado à IA</span>
                  </div>
                  <pre className="p-4 text-[0.72rem] font-mono text-foreground/70 leading-relaxed whitespace-pre-wrap max-h-96 overflow-y-auto">{assembledPrompt}</pre>
                </div>
              )}
            </div>
          )}

          {/* Run button */}
          {previewTestId && (
            <button onClick={runPreview} disabled={previewRunning} className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-emerald-600 text-white rounded-xl text-[0.85rem] font-semibold disabled:opacity-40 hover:bg-emerald-700 transition-colors">
              {previewRunning ? <Loader2 className="w-4 h-4 animate-spin" /> : <PlayCircle className="w-4 h-4" />}
              {previewRunning ? 'Gerando...' : 'Simular Resposta da IA'}
            </button>
          )}

          {/* Sent data */}
          {previewResult && previewSentData && (
            <div className="rounded-2xl border border-sky-500/25 bg-sky-500/[0.02] overflow-hidden">
              <div className="px-5 py-3 bg-sky-500/[0.05] border-b border-sky-500/15 flex items-center gap-2">
                <Eye className="w-4 h-4 text-sky-500" />
                <h4 className="text-[0.85rem] font-bold text-sky-700 dark:text-sky-400">Dados utilizados pela IA</h4>
              </div>
              <div className="p-5 space-y-4">
                <div className="space-y-2">
                  <h5 className="text-[0.72rem] font-bold uppercase tracking-wider text-sky-600/70">Valores dos Eixos</h5>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {previewSentData.scores.map((s: any) => (
                      <div key={s.key} className="flex items-center gap-2 text-[0.72rem]">
                        <span className="text-foreground/60 font-medium truncate flex-1">{s.label.replace(/_/g, ' ')}</span>
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
                <div className="space-y-1.5">
                  <h5 className="text-[0.72rem] font-bold uppercase tracking-wider text-sky-600/70">Padrão Dominante</h5>
                  <div className="flex items-center gap-2 p-2.5 rounded-lg bg-muted/15 border border-border/15">
                    <span className="text-[0.8rem] font-semibold text-foreground/70">{previewSentData.dominant.label.replace(/_/g, ' ')}</span>
                    <span className={`text-[0.65rem] px-2 py-0.5 rounded-full font-medium ${previewSentData.dominant.percentage >= 75 ? 'bg-red-500/10 text-red-600' : previewSentData.dominant.percentage >= 50 ? 'bg-amber-500/10 text-amber-600' : 'bg-emerald-500/10 text-emerald-600'}`}>
                      {previewSentData.dominant.percentage >= 75 ? 'ALTA' : previewSentData.dominant.percentage >= 50 ? 'MODERADA' : 'LEVE'}
                    </span>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <h5 className="text-[0.72rem] font-bold uppercase tracking-wider text-sky-600/70">Conflitos Identificados</h5>
                  {previewSentData.contradictions.length > 0 ? (
                    <div className="space-y-1">
                      {previewSentData.contradictions.map((c, i) => (
                        <div key={i} className="flex items-start gap-2 p-2 rounded-lg bg-amber-500/[0.04] border border-amber-500/15 text-[0.72rem]">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                          <span className="text-foreground/60">{c}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[0.72rem] text-muted-foreground/40 italic">Nenhum conflito extremo detectado.</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Result */}
          {previewResult && <SimulationResult
            previewResult={previewResult}
            previewRunning={previewRunning}
            refineLevel={refineLevel}
            resultHistory={resultHistory}
            showComparison={showComparison}
            setShowComparison={setShowComparison}
            onRefine={handleRefine}
          />}
        </div>
      )}
    </div>
  );
};

// Result sub-component
const SimulationResult = ({
  previewResult, previewRunning, refineLevel, resultHistory, showComparison, setShowComparison, onRefine,
}: {
  previewResult: any;
  previewRunning: boolean;
  refineLevel: number;
  resultHistory: { level: number; result: any }[];
  showComparison: boolean;
  setShowComparison: (fn: (prev: boolean) => boolean) => void;
  onRefine: () => void;
}) => {
  const GENERIC_PHRASES = ['tenha mais foco', 'acredite em si', 'saia da zona de conforto', 'você precisa melhorar', 'busque equilíbrio', 'tente se organizar', 'seja mais disciplinado', 'confie no processo'];
  const allText = [previewResult.criticalDiagnosis, previewResult.corePain, previewResult.summary, previewResult.mechanism, previewResult.contradiction, previewResult.direction, previewResult.firstAction, previewResult.keyUnlockArea].filter(Boolean).join(' ').toLowerCase();
  const issues: string[] = [];
  if (!/porque|raiz|causa|origem|sustenta|alimenta|mantém/.test(allText)) issues.push('Sem causa clara identificada');
  if (!/mas |porém|contradição|conflito|ao mesmo tempo|enquanto/.test(allText)) issues.push('Sem conflito ou contradição');
  if (!/primeiro passo|nos próximos|ação|começar por|parar de|específic/.test(allText)) issues.push('Sem direção prática específica');
  const genericFound = GENERIC_PHRASES.filter(p => allText.includes(p));
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

  const compareFields = [
    { key: 'criticalDiagnosis', label: 'Diagnóstico Crítico' },
    { key: 'corePain', label: 'Dor Central' },
    { key: 'profileName', label: 'Perfil' },
    { key: 'summary', label: 'Funcionamento do Padrão' },
    { key: 'contradiction', label: 'Contradição Interna' },
    { key: 'keyUnlockArea', label: 'Área-chave de Destravamento' },
    { key: 'direction', label: 'Direção' },
    { key: 'firstAction', label: 'Primeira Ação' },
  ];

  return (
    <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/[0.02] overflow-hidden">
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
        </div>
      )}

      {/* Refine & Compare */}
      <div className="px-5 pt-2 flex items-center gap-3 flex-wrap">
        <button onClick={onRefine} disabled={previewRunning || refineLevel >= 3}
          className="flex items-center gap-2 px-4 py-2.5 bg-amber-600 text-white rounded-xl text-[0.78rem] font-semibold disabled:opacity-30 hover:bg-amber-700 transition-all">
          {previewRunning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          {previewRunning ? 'Refinando...' : 'Refinar Resposta'}
        </button>
        {resultHistory.length >= 2 && (
          <button onClick={() => setShowComparison(prev => !prev)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-[0.78rem] font-semibold transition-all ${showComparison ? 'bg-primary text-primary-foreground' : 'bg-muted/40 text-foreground/70 hover:bg-muted/60'}`}>
            <GitCompare className="w-4 h-4" />
            {showComparison ? 'Ocultar Comparação' : 'Comparar Respostas'}
          </button>
        )}
        {refineLevel > 0 && <span className="text-[0.68rem] text-amber-600 font-medium">Nível de refinamento: {refineLevel}/3</span>}
        {refineLevel >= 3 && <span className="text-[0.62rem] text-muted-foreground/40 italic">Nível máximo atingido</span>}
      </div>

      {/* Comparison */}
      {showComparison && resultHistory.length >= 2 && (() => {
        const prev = resultHistory[resultHistory.length - 2];
        const curr = resultHistory[resultHistory.length - 1];
        return (
          <div className="px-5 pt-4">
            <div className="rounded-xl border border-primary/20 bg-primary/[0.02] p-4 space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <GitCompare className="w-4 h-4 text-primary" />
                <h5 className="text-[0.85rem] font-bold text-foreground/80">Comparação de Respostas</h5>
              </div>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div className="text-center p-2 rounded-lg bg-muted/20 border border-border/20">
                  <span className="text-[0.65rem] text-muted-foreground/50 uppercase tracking-wider font-semibold">{prev.level === 0 ? 'Original' : `Nível ${prev.level}`}</span>
                </div>
                <div className="text-center p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                  <span className="text-[0.65rem] text-emerald-600 uppercase tracking-wider font-semibold">{curr.level === 0 ? 'Original' : `Nível ${curr.level}`}</span>
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
          </div>
        );
      })()}

      {/* Result blocks */}
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
};

export default SimulationPanel;
