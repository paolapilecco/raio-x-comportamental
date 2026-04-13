import { useState, useEffect, useMemo } from 'react';
import { Save, Plus, Trash2, ChevronDown, ChevronUp, RotateCcw, Copy, Sparkles, Loader2, Eye, EyeOff } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { TestModule } from './promptConstants';

// ═══════════════════════════════════════════════════════════════
// TYPES — 3-Act Storyboard + Composition Rules
// ═══════════════════════════════════════════════════════════════

type SlotFormat = 'prose' | 'list' | 'cards' | 'quote' | 'alert';

interface Slot {
  key: string;
  label: string;
  format: SlotFormat;
  maxSentences: number;
  instruction: string;
  example: string;
  enabled: boolean;
}

interface Act {
  id: 'espelho' | 'confronto' | 'direcao';
  title: string;
  subtitle: string;
  tone: string;
  slots: Slot[];
}

interface CompositionRules {
  maxTotalWords: number;
  proportions: { espelho: number; confronto: number; direcao: number };
  forbiddenTerms: string[];
  mandatoryElements: string[];
  narrativeVoice: string;
}

interface StoryboardTemplate {
  acts: Act[];
  rules: CompositionRules;
}

// ═══════════════════════════════════════════════════════════════
// DEFAULTS
// ═══════════════════════════════════════════════════════════════

const FORMAT_LABELS: Record<SlotFormat, { icon: string; label: string }> = {
  prose: { icon: '📝', label: 'Texto' },
  list: { icon: '📋', label: 'Lista' },
  cards: { icon: '📊', label: 'Cards' },
  quote: { icon: '💬', label: 'Citação' },
  alert: { icon: '⚠️', label: 'Alerta' },
};

const ACT_STYLES: Record<string, { accent: string; bg: string; border: string; icon: string }> = {
  espelho: { accent: 'text-violet-500', bg: 'bg-violet-500/5', border: 'border-violet-500/20', icon: '🪞' },
  confronto: { accent: 'text-amber-500', bg: 'bg-amber-500/5', border: 'border-amber-500/20', icon: '⚡' },
  direcao: { accent: 'text-emerald-500', bg: 'bg-emerald-500/5', border: 'border-emerald-500/20', icon: '🧭' },
};

const DEFAULT_TEMPLATE: StoryboardTemplate = {
  acts: [
    {
      id: 'espelho',
      title: 'ATO 1 — Espelho',
      subtitle: 'Mostrar quem você realmente é',
      tone: 'Revelador e preciso — o leitor deve se reconhecer imediatamente',
      slots: [
        { key: 'leituraRapida', label: 'Leitura Rápida', format: 'prose', maxSentences: 3, instruction: 'Resumo executivo do diagnóstico. Deve ser compreensível por leigos e capturar a essência do relatório inteiro em 2-3 frases.', example: '', enabled: true },
        { key: 'chamaAtencao', label: 'O que mais chama atenção', format: 'alert', maxSentences: 2, instruction: 'Insight mais impactante — algo que cause reconhecimento imediato. Deve revelar algo que a pessoa NÃO sabe sobre si.', example: '', enabled: true },
        { key: 'padraoRepetido', label: 'O padrão que se repete', format: 'prose', maxSentences: 3, instruction: 'Mecanismo exato do ciclo — como se instala, não apenas o nome. Mostrar a engrenagem, não o rótulo.', example: '', enabled: true },
        { key: 'comoAparece', label: 'Como aparece na rotina', format: 'prose', maxSentences: 2, instruction: '2 situações CONCRETAS e observáveis na rotina. Não generalizações.', example: '', enabled: true },
      ],
    },
    {
      id: 'confronto',
      title: 'ATO 2 — Confronto',
      subtitle: 'Mostrar o custo real do padrão',
      tone: 'Provocativo e incômodo — desconforto que motiva mudança',
      slots: [
        { key: 'triggers', label: 'Gatilhos principais', format: 'list', maxSentences: 1, instruction: 'Gatilhos concretos e específicos — situações reais, não emoções vagas.', example: '', enabled: true },
        { key: 'lifeImpact', label: 'Impacto por área', format: 'cards', maxSentences: 1, instruction: 'Consequências concretas em áreas específicas da vida.', example: '', enabled: true },
        { key: 'futureConsequence', label: 'Se nada mudar', format: 'alert', maxSentences: 3, instruction: 'Consequência real projetada no futuro se o padrão continuar. Deve gerar urgência sem ser catastrofista.', example: '', enabled: true },
        { key: 'whatNotToDo', label: 'O que parar de fazer', format: 'list', maxSentences: 1, instruction: 'Comportamentos específicos para abandonar imediatamente.', example: '', enabled: true },
      ],
    },
    {
      id: 'direcao',
      title: 'ATO 3 — Direção',
      subtitle: 'Mostrar a saída concreta',
      tone: 'Construtivo e acessível — esperança com passos claros',
      slots: [
        { key: 'direction', label: 'Direção de ajuste', format: 'prose', maxSentences: 2, instruction: 'A mudança central que precisa acontecer — uma direção, não uma lista.', example: '', enabled: true },
        { key: 'mentalCommand', label: 'Comando mental', format: 'quote', maxSentences: 1, instruction: 'Frase curta e poderosa para repetir antes de agir. Deve ser memorável.', example: '', enabled: true },
        { key: 'focoMudanca', label: 'Próximo passo prático', format: 'prose', maxSentences: 2, instruction: 'Ação concreta, específica e realizável nos próximos 3 dias.', example: '', enabled: true },
      ],
    },
  ],
  rules: {
    maxTotalWords: 800,
    proportions: { espelho: 35, confronto: 35, direcao: 30 },
    forbiddenTerms: [
      'busque equilíbrio', 'tenha consciência', 'acredite em si',
      'saia da zona de conforto', 'pratique autoconhecimento',
      'talvez', 'pode ser que', 'tente melhorar',
      'respire fundo', 'observe seus padrões',
    ],
    mandatoryElements: ['profileName', 'microAcoes', 'combinedTitle'],
    narrativeVoice: 'Direto, preciso e revelador. Sem psicologuês, sem autoajuda, sem amenizar. Cada frase traz informação nova.',
  },
};

// ═══════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════

interface Props {
  currentModule: TestModule;
}

const ReportTemplatePanel = ({ currentModule }: Props) => {
  const [template, setTemplate] = useState<StoryboardTemplate>(structuredClone(DEFAULT_TEMPLATE));
  const [templateId, setTemplateId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [spreading, setSpreading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [expandedSlot, setExpandedSlot] = useState<string | null>(null);
  const [showRules, setShowRules] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);

  // ── Coverage Score ──
  const coverage = useMemo(() => {
    const allSlots = template.acts.flatMap(a => a.slots.filter(s => s.enabled));
    const total = allSlots.length;
    const withInstructions = allSlots.filter(s => s.instruction.trim().length > 10).length;
    const withExamples = allSlots.filter(s => s.example.trim().length > 10).length;
    const withTone = template.acts.filter(a => a.tone.trim().length > 10).length;
    const hasForbidden = template.rules.forbiddenTerms.length >= 3;
    const hasVoice = template.rules.narrativeVoice.trim().length > 20;

    const score = Math.round(
      (total > 0 ? (withInstructions / total) * 35 : 0) +
      (total > 0 ? (withExamples / total) * 25 : 0) +
      (withTone / 3) * 20 +
      (hasForbidden ? 10 : 0) +
      (hasVoice ? 10 : 0)
    );

    return { total, withInstructions, withExamples, score };
  }, [template]);

  // ── Load/Save ──
  useEffect(() => { fetchTemplate(); }, [currentModule.id]);

  const fetchTemplate = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('report_templates')
      .select('*')
      .eq('test_id', currentModule.id)
      .maybeSingle();

    if (data) {
      setTemplateId(data.id);
      const sections = data.sections as any;
      const rules = (data.output_rules as any) || {};

      // Check if it's already the new format (has 'acts')
      if (sections?.acts && Array.isArray(sections.acts)) {
        setTemplate({
          acts: sections.acts.map((act: any) => ({
            ...act,
            slots: (act.slots || []).map((s: any) => ({
              key: s.key || '',
              label: s.label || '',
              format: s.format || 'prose',
              maxSentences: s.maxSentences ?? 2,
              instruction: s.instruction || '',
              example: s.example || '',
              enabled: s.enabled !== false,
            })),
          })),
          rules: {
            maxTotalWords: sections.rules?.maxTotalWords || rules.maxTotalWords || 800,
            proportions: sections.rules?.proportions || rules.proportions || { espelho: 35, confronto: 35, direcao: 30 },
            forbiddenTerms: sections.rules?.forbiddenTerms || rules.forbiddenLanguage || DEFAULT_TEMPLATE.rules.forbiddenTerms,
            mandatoryElements: sections.rules?.mandatoryElements || DEFAULT_TEMPLATE.rules.mandatoryElements,
            narrativeVoice: sections.rules?.narrativeVoice || rules.tone || DEFAULT_TEMPLATE.rules.narrativeVoice,
          },
        });
      } else {
        // Legacy format — migrate to 3-act storyboard
        setTemplate(structuredClone(DEFAULT_TEMPLATE));
      }
    } else {
      setTemplate(structuredClone(DEFAULT_TEMPLATE));
      setTemplateId(null);
    }
    setLoading(false);
  };

  const handleSave = async () => {
    setSaving(true);
    const payload = {
      sections: { acts: template.acts, rules: template.rules } as any,
      output_rules: {
        forbiddenLanguage: template.rules.forbiddenTerms,
        tone: template.rules.narrativeVoice,
        maxTotalWords: template.rules.maxTotalWords,
        proportions: template.rules.proportions,
      } as any,
      updated_at: new Date().toISOString(),
    };

    if (templateId) {
      const { error } = await supabase.from('report_templates').update(payload).eq('id', templateId);
      if (error) toast.error('Erro ao salvar template');
      else toast.success('Template salvo!');
    } else {
      const { data, error } = await supabase.from('report_templates').insert({ test_id: currentModule.id, ...payload }).select().single();
      if (error) toast.error('Erro ao criar template');
      else if (data) { setTemplateId(data.id); toast.success('Template criado!'); }
    }
    setSaving(false);
  };

  const handleReset = () => {
    setTemplate(structuredClone(DEFAULT_TEMPLATE));
    toast.info('Template restaurado ao padrão');
  };

  const handleSpreadToAll = async () => {
    if (!confirm('Replicar este template para TODOS os testes? Templates existentes serão sobrescritos.')) return;
    setSpreading(true);
    try {
      await handleSave();
      const payload = {
        sections: { acts: template.acts, rules: template.rules } as any,
        output_rules: {
          forbiddenLanguage: template.rules.forbiddenTerms,
          tone: template.rules.narrativeVoice,
          maxTotalWords: template.rules.maxTotalWords,
          proportions: template.rules.proportions,
        } as any,
        updated_at: new Date().toISOString(),
      };
      const { data: modules } = await supabase.from('test_modules').select('id').neq('id', currentModule.id);
      if (!modules) throw new Error('No modules');
      let updated = 0;
      for (const mod of modules) {
        const { data: existing } = await supabase.from('report_templates').select('id').eq('test_id', mod.id).maybeSingle();
        if (existing) {
          await supabase.from('report_templates').update(payload).eq('id', existing.id);
        } else {
          await supabase.from('report_templates').insert({ test_id: mod.id, ...payload });
        }
        updated++;
      }
      toast.success(`Template replicado para ${updated} teste(s)`);
    } catch { toast.error('Erro ao replicar'); }
    setSpreading(false);
  };

  const handleAIGenerate = async () => {
    setAiGenerating(true);
    try {
      const [moduleRes, promptsRes, questionsRes] = await Promise.all([
        supabase.from('test_modules').select('description').eq('id', currentModule.id).single(),
        supabase.from('test_prompts').select('prompt_type, content').eq('test_id', currentModule.id).eq('is_active', true),
        supabase.from('questions').select('text, type, axes').eq('test_id', currentModule.id).order('sort_order'),
      ]);
      const { data, error } = await supabase.functions.invoke('generate-template', {
        body: {
          testName: currentModule.name,
          testDescription: moduleRes.data?.description || '',
          prompts: promptsRes.data || [],
          questions: questionsRes.data || [],
          existingSections: template.acts.flatMap(a => a.slots),
          format: 'storyboard',
        },
      });
      if (error) throw error;
      if (data?.sections?.length > 0) {
        // AI returns flat sections — distribute into acts
        const newTemplate = structuredClone(template);
        data.sections.forEach((s: any) => {
          for (const act of newTemplate.acts) {
            const slot = act.slots.find(sl => sl.key === s.key);
            if (slot) {
              slot.instruction = s.aiInstructions || s.instruction || slot.instruction;
              slot.example = s.exampleOutput || s.example || slot.example;
            }
          }
        });
        setTemplate(newTemplate);
        toast.success('Instruções preenchidas com IA!');
      }
    } catch { toast.error('Erro ao gerar com IA'); }
    setAiGenerating(false);
  };

  // ── Slot Operations ──
  const updateSlot = (actId: string, slotKey: string, field: keyof Slot, value: any) => {
    setTemplate(prev => ({
      ...prev,
      acts: prev.acts.map(a => a.id === actId ? {
        ...a,
        slots: a.slots.map(s => s.key === slotKey ? { ...s, [field]: value } : s),
      } : a),
    }));
  };

  const removeSlot = (actId: string, slotKey: string) => {
    setTemplate(prev => ({
      ...prev,
      acts: prev.acts.map(a => a.id === actId ? {
        ...a,
        slots: a.slots.filter(s => s.key !== slotKey),
      } : a),
    }));
  };

  const addSlot = (actId: string) => {
    const ts = Date.now();
    setTemplate(prev => ({
      ...prev,
      acts: prev.acts.map(a => a.id === actId ? {
        ...a,
        slots: [...a.slots, {
          key: `custom_${ts}`,
          label: 'Nova seção',
          format: 'prose' as SlotFormat,
          maxSentences: 2,
          instruction: '',
          example: '',
          enabled: true,
        }],
      } : a),
    }));
  };

  const moveSlot = (actId: string, index: number, direction: 'up' | 'down') => {
    setTemplate(prev => ({
      ...prev,
      acts: prev.acts.map(a => {
        if (a.id !== actId) return a;
        const target = direction === 'up' ? index - 1 : index + 1;
        if (target < 0 || target >= a.slots.length) return a;
        const slots = [...a.slots];
        [slots[index], slots[target]] = [slots[target], slots[index]];
        return { ...a, slots };
      }),
    }));
  };

  const updateActTone = (actId: string, tone: string) => {
    setTemplate(prev => ({
      ...prev,
      acts: prev.acts.map(a => a.id === actId ? { ...a, tone } : a),
    }));
  };

  if (loading) {
    return <div className="flex items-center justify-center py-12"><p className="text-sm text-muted-foreground/50">Carregando template...</p></div>;
  }

  // ═══════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h3 className="text-base font-semibold text-foreground">Storyboard do Relatório</h3>
          <p className="text-[0.75rem] text-muted-foreground/60 mt-0.5">
            3 atos narrativos · Slots configuráveis · Regras de composição
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={() => setPreviewMode(!previewMode)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[0.75rem] font-medium border border-border/30 hover:bg-accent/50 transition-all">
            {previewMode ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
            {previewMode ? 'Editar' : 'Preview'}
          </button>
          <button onClick={handleAIGenerate} disabled={aiGenerating} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[0.75rem] font-medium bg-gradient-to-r from-violet-600 to-indigo-600 text-white hover:opacity-90 transition-all disabled:opacity-50">
            {aiGenerating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
            {aiGenerating ? 'Gerando...' : 'IA'}
          </button>
          <button onClick={handleSpreadToAll} disabled={spreading} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[0.75rem] text-muted-foreground hover:text-foreground border border-border/30 hover:bg-accent/50 transition-all disabled:opacity-50">
            <Copy className="w-3 h-3" />
            {spreading ? 'Replicando...' : 'Padrão'}
          </button>
          <button onClick={handleReset} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[0.75rem] text-muted-foreground hover:text-foreground border border-border/30 hover:bg-secondary/50 transition-all">
            <RotateCcw className="w-3 h-3" />
            Reset
          </button>
          <button onClick={handleSave} disabled={saving} className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-[0.75rem] font-medium bg-primary text-primary-foreground hover:brightness-90 transition-all disabled:opacity-50">
            <Save className="w-3 h-3" />
            {saving ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>

      {/* ── Coverage Score ── */}
      <div className="flex items-center gap-4 px-4 py-3 rounded-xl border border-border/20 bg-card/40">
        <div className="flex items-center gap-2">
          <span className={`text-lg font-bold ${coverage.score >= 70 ? 'text-emerald-500' : coverage.score >= 40 ? 'text-amber-500' : 'text-red-500'}`}>
            {coverage.score}%
          </span>
          <span className="text-[0.7rem] text-muted-foreground/50">cobertura</span>
        </div>
        <div className="flex-1 h-1.5 bg-secondary/30 rounded-full overflow-hidden">
          <div className={`h-full rounded-full transition-all ${coverage.score >= 70 ? 'bg-emerald-500' : coverage.score >= 40 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${coverage.score}%` }} />
        </div>
        <div className="flex gap-4 text-[0.65rem] text-muted-foreground/50">
          <span>{coverage.total} slots</span>
          <span>{coverage.withInstructions} instruções</span>
          <span>{coverage.withExamples} exemplos</span>
        </div>
      </div>

      {/* ── Preview Mode ── */}
      {previewMode ? (
        <StoryboardPreview template={template} />
      ) : (
        <>
          {/* ── 3 Acts ── */}
          {template.acts.map((act) => {
            const style = ACT_STYLES[act.id];
            return (
              <div key={act.id} className={`rounded-2xl border ${style.border} ${style.bg} overflow-hidden`}>
                {/* Act Header */}
                <div className="px-5 py-4 border-b border-border/10">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{style.icon}</span>
                      <div>
                        <h4 className={`text-sm font-bold ${style.accent}`}>{act.title}</h4>
                        <p className="text-[0.7rem] text-muted-foreground/50">{act.subtitle}</p>
                      </div>
                    </div>
                    <span className="text-[0.65rem] font-mono text-muted-foreground/30">
                      {template.rules.proportions[act.id]}% do relatório
                    </span>
                  </div>
                  <div className="mt-3">
                    <label className="text-[0.6rem] text-muted-foreground/40 uppercase tracking-wider">Tom deste ato:</label>
                    <input
                      type="text"
                      value={act.tone}
                      onChange={(e) => updateActTone(act.id, e.target.value)}
                      className="w-full mt-1 text-[0.78rem] bg-transparent border-b border-border/20 focus:border-primary/40 focus:outline-none transition-colors text-foreground/80 pb-1"
                      placeholder="Descreva o tom emocional deste ato..."
                    />
                  </div>
                </div>

                {/* Slots */}
                <div className="px-4 py-3 space-y-2">
                  {act.slots.map((slot, idx) => (
                    <SlotEditor
                      key={slot.key}
                      slot={slot}
                      actId={act.id}
                      index={idx}
                      totalSlots={act.slots.length}
                      isExpanded={expandedSlot === `${act.id}_${slot.key}`}
                      onToggleExpand={() => setExpandedSlot(expandedSlot === `${act.id}_${slot.key}` ? null : `${act.id}_${slot.key}`)}
                      onUpdate={(field, value) => updateSlot(act.id, slot.key, field, value)}
                      onRemove={() => removeSlot(act.id, slot.key)}
                      onMove={(dir) => moveSlot(act.id, idx, dir)}
                    />
                  ))}

                  <button
                    onClick={() => addSlot(act.id)}
                    className="w-full py-2 border border-dashed border-border/30 rounded-lg text-[0.7rem] text-muted-foreground/40 hover:text-foreground hover:border-primary/30 transition-all flex items-center justify-center gap-1.5"
                  >
                    <Plus className="w-3 h-3" /> Adicionar slot
                  </button>
                </div>
              </div>
            );
          })}

          {/* ── Composition Rules ── */}
          <div className="rounded-2xl border border-border/20 bg-card/40 overflow-hidden">
            <button
              onClick={() => setShowRules(!showRules)}
              className="w-full px-5 py-4 flex items-center justify-between hover:bg-accent/30 transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="text-xl">📐</span>
                <div className="text-left">
                  <h4 className="text-sm font-bold text-foreground">Regras de Composição</h4>
                  <p className="text-[0.7rem] text-muted-foreground/50">Limites, proporções e linguagem proibida</p>
                </div>
              </div>
              {showRules ? <ChevronUp className="w-4 h-4 text-muted-foreground/30" /> : <ChevronDown className="w-4 h-4 text-muted-foreground/30" />}
            </button>

            {showRules && (
              <div className="px-5 pb-5 space-y-5 border-t border-border/10">
                {/* Max Words */}
                <div className="pt-4">
                  <label className="text-[0.7rem] font-medium text-foreground/70 block mb-1.5">Máximo de palavras total</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min={400}
                      max={1500}
                      step={50}
                      value={template.rules.maxTotalWords}
                      onChange={(e) => setTemplate(prev => ({ ...prev, rules: { ...prev.rules, maxTotalWords: Number(e.target.value) } }))}
                      className="flex-1 accent-primary"
                    />
                    <span className="text-sm font-mono font-bold text-foreground w-16 text-right">{template.rules.maxTotalWords}</span>
                  </div>
                </div>

                {/* Proportions */}
                <div>
                  <label className="text-[0.7rem] font-medium text-foreground/70 block mb-2">Proporção por ato</label>
                  <div className="grid grid-cols-3 gap-3">
                    {(['espelho', 'confronto', 'direcao'] as const).map(actId => {
                      const actStyle = ACT_STYLES[actId];
                      return (
                        <div key={actId} className="text-center">
                          <span className={`text-[0.65rem] font-medium ${actStyle.accent}`}>
                            {actId === 'espelho' ? 'Espelho' : actId === 'confronto' ? 'Confronto' : 'Direção'}
                          </span>
                          <input
                            type="number"
                            min={10}
                            max={60}
                            value={template.rules.proportions[actId]}
                            onChange={(e) => setTemplate(prev => ({
                              ...prev,
                              rules: { ...prev.rules, proportions: { ...prev.rules.proportions, [actId]: Number(e.target.value) } },
                            }))}
                            className="w-full mt-1 text-center text-sm bg-secondary/30 border border-border/20 rounded-lg py-1.5 text-foreground font-mono"
                          />
                          <span className="text-[0.6rem] text-muted-foreground/40">%</span>
                        </div>
                      );
                    })}
                  </div>
                  {Math.abs(Object.values(template.rules.proportions).reduce((a, b) => a + b, 0) - 100) > 1 && (
                    <p className="text-[0.65rem] text-destructive mt-1">⚠ A soma deve ser 100% (atual: {Object.values(template.rules.proportions).reduce((a, b) => a + b, 0)}%)</p>
                  )}
                </div>

                {/* Narrative Voice */}
                <div>
                  <label className="text-[0.7rem] font-medium text-foreground/70 block mb-1.5">Voz narrativa</label>
                  <textarea
                    value={template.rules.narrativeVoice}
                    onChange={(e) => setTemplate(prev => ({ ...prev, rules: { ...prev.rules, narrativeVoice: e.target.value } }))}
                    rows={2}
                    className="w-full text-[0.78rem] bg-secondary/20 border border-border/20 rounded-lg px-3 py-2 text-foreground placeholder:text-muted-foreground/30 resize-none focus:outline-none focus:border-primary/40"
                    placeholder="Descreva o estilo de escrita..."
                  />
                </div>

                {/* Forbidden Terms */}
                <div>
                  <label className="text-[0.7rem] font-medium text-foreground/70 block mb-1.5">
                    Linguagem proibida <span className="text-muted-foreground/40 font-normal">({template.rules.forbiddenTerms.length} termos)</span>
                  </label>
                  <textarea
                    value={template.rules.forbiddenTerms.join('\n')}
                    onChange={(e) => setTemplate(prev => ({
                      ...prev,
                      rules: { ...prev.rules, forbiddenTerms: e.target.value.split('\n').filter(t => t.trim()) },
                    }))}
                    rows={4}
                    className="w-full text-[0.75rem] bg-destructive/[0.02] border border-destructive/10 rounded-lg px-3 py-2 text-foreground placeholder:text-muted-foreground/30 resize-none focus:outline-none focus:border-destructive/30 font-mono"
                    placeholder="Um termo por linha..."
                  />
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* ── Save Footer ── */}
      <div className="flex items-center justify-between pt-2">
        <p className="text-[0.68rem] text-muted-foreground/40">
          {template.acts.reduce((sum, a) => sum + a.slots.filter(s => s.enabled).length, 0)} slots ativos ·
          3 atos · máx {template.rules.maxTotalWords} palavras
        </p>
        <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold bg-primary text-primary-foreground hover:brightness-90 transition-all disabled:opacity-50 shadow-lg">
          <Save className="w-4 h-4" />
          {saving ? 'Salvando...' : 'Salvar Storyboard'}
        </button>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
// SLOT EDITOR
// ═══════════════════════════════════════════════════════════════

function SlotEditor({
  slot, actId: _actId, index, totalSlots, isExpanded, onToggleExpand, onUpdate, onRemove, onMove,
}: {
  slot: Slot; actId: string; index: number; totalSlots: number; isExpanded: boolean;
  onToggleExpand: () => void; onUpdate: (field: keyof Slot, value: any) => void;
  onRemove: () => void; onMove: (dir: 'up' | 'down') => void;
}) {
  const fmt = FORMAT_LABELS[slot.format];

  return (
    <div className={`rounded-xl border transition-all ${slot.enabled ? 'border-border/25 bg-card/60' : 'border-border/10 bg-muted/10 opacity-50'}`}>
      {/* Row */}
      <div className="flex items-center gap-2 px-3 py-2.5">
        {/* Reorder */}
        <div className="flex flex-col gap-0">
          <button onClick={() => onMove('up')} disabled={index === 0} className="text-muted-foreground/20 hover:text-foreground disabled:opacity-20"><ChevronUp className="w-3 h-3" /></button>
          <button onClick={() => onMove('down')} disabled={index === totalSlots - 1} className="text-muted-foreground/20 hover:text-foreground disabled:opacity-20"><ChevronDown className="w-3 h-3" /></button>
        </div>

        {/* Format badge */}
        <span className="text-[0.65rem] px-2 py-0.5 rounded-md bg-secondary/40 text-muted-foreground/60 shrink-0">
          {fmt.icon} {fmt.label}
        </span>

        {/* Label */}
        <input
          type="text"
          value={slot.label}
          onChange={(e) => onUpdate('label', e.target.value)}
          className="flex-1 text-[0.82rem] font-medium bg-transparent border-none focus:outline-none text-foreground"
          placeholder="Nome do slot"
        />

        {/* Max */}
        <select
          value={slot.maxSentences}
          onChange={(e) => onUpdate('maxSentences', Number(e.target.value))}
          className="text-[0.7rem] bg-secondary/30 border border-border/20 rounded-md px-1.5 py-0.5 text-foreground"
        >
          {[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{n}f</option>)}
        </select>

        {/* Format */}
        <select
          value={slot.format}
          onChange={(e) => onUpdate('format', e.target.value)}
          className="text-[0.7rem] bg-secondary/30 border border-border/20 rounded-md px-1.5 py-0.5 text-foreground"
        >
          {Object.entries(FORMAT_LABELS).map(([val, { label }]) => <option key={val} value={val}>{label}</option>)}
        </select>

        {/* Toggle enable */}
        <button onClick={() => onUpdate('enabled', !slot.enabled)} className="text-muted-foreground/30 hover:text-foreground">
          {slot.enabled ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
        </button>

        {/* Expand */}
        <button onClick={onToggleExpand} className="text-muted-foreground/30 hover:text-foreground">
          {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>

        {/* Remove */}
        <button onClick={onRemove} className="text-muted-foreground/15 hover:text-destructive">
          <Trash2 className="w-3 h-3" />
        </button>
      </div>

      {/* Expanded */}
      {isExpanded && slot.enabled && (
        <div className="px-4 pb-3 space-y-3 border-t border-border/10 pt-3">
          <div>
            <label className="text-[0.6rem] text-muted-foreground/40 uppercase tracking-wider block mb-1">Instrução para IA</label>
            <textarea
              value={slot.instruction}
              onChange={(e) => onUpdate('instruction', e.target.value)}
              rows={2}
              className="w-full text-[0.78rem] bg-secondary/20 border border-border/20 rounded-lg px-3 py-2 text-foreground placeholder:text-muted-foreground/30 resize-none focus:outline-none focus:border-primary/40"
              placeholder="O que a IA deve escrever neste slot..."
            />
          </div>
          <div>
            <label className="text-[0.6rem] text-muted-foreground/40 uppercase tracking-wider block mb-1">Exemplo de saída ideal</label>
            <textarea
              value={slot.example}
              onChange={(e) => onUpdate('example', e.target.value)}
              rows={2}
              className="w-full text-[0.78rem] bg-violet-500/[0.03] border border-violet-500/15 rounded-lg px-3 py-2 text-foreground placeholder:text-muted-foreground/30 resize-none focus:outline-none focus:border-violet-500/30"
              placeholder="Como deveria ser a saída ideal..."
            />
          </div>
          <div className="text-[0.6rem] text-muted-foreground/30 font-mono">key: {slot.key}</div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// STORYBOARD PREVIEW
// ═══════════════════════════════════════════════════════════════

function StoryboardPreview({ template }: { template: StoryboardTemplate }) {
  return (
    <div className="max-w-lg mx-auto space-y-8 py-4">
      <p className="text-[0.65rem] text-muted-foreground/30 text-center uppercase tracking-widest">Preview do Relatório</p>

      {template.acts.map(act => {
        const style = ACT_STYLES[act.id];
        const enabledSlots = act.slots.filter(s => s.enabled);
        if (enabledSlots.length === 0) return null;

        return (
          <div key={act.id} className="space-y-4">
            <div className="flex items-center gap-2">
              <span className={`w-1 h-6 rounded-full ${style.border.replace('border-', 'bg-')}`} />
              <span className={`text-[0.65rem] font-bold uppercase tracking-wider ${style.accent}`}>{act.title}</span>
            </div>

            {enabledSlots.map(slot => {
              const fmt = FORMAT_LABELS[slot.format];
              return (
                <div key={slot.key} className="rounded-xl border border-border/15 bg-card/30 px-5 py-4">
                  <p className="text-[0.6rem] text-muted-foreground/30 uppercase tracking-wider mb-2">{slot.label}</p>
                  <div className="flex items-center gap-2">
                    <span className="text-[0.65rem] text-muted-foreground/20">{fmt.icon}</span>
                    <div className="flex-1 space-y-1.5">
                      {slot.format === 'prose' && (
                        <>
                          <div className="h-2.5 bg-muted/20 rounded-full w-full" />
                          <div className="h-2.5 bg-muted/15 rounded-full w-3/4" />
                          {slot.maxSentences > 2 && <div className="h-2.5 bg-muted/10 rounded-full w-1/2" />}
                        </>
                      )}
                      {slot.format === 'list' && (
                        <div className="space-y-1.5">
                          {[1, 2, 3].map(i => (
                            <div key={i} className="flex items-center gap-2">
                              <span className="w-1 h-1 rounded-full bg-muted-foreground/20" />
                              <div className="h-2 bg-muted/15 rounded-full flex-1" style={{ width: `${90 - i * 10}%` }} />
                            </div>
                          ))}
                        </div>
                      )}
                      {slot.format === 'cards' && (
                        <div className="grid grid-cols-2 gap-2">
                          {[1, 2, 3, 4].map(i => (
                            <div key={i} className="rounded-lg border border-border/10 bg-secondary/10 px-3 py-2.5">
                              <div className="h-1.5 bg-muted/20 rounded-full w-2/3 mb-1.5" />
                              <div className="h-1.5 bg-muted/10 rounded-full w-full" />
                            </div>
                          ))}
                        </div>
                      )}
                      {slot.format === 'quote' && (
                        <div className="border-l-2 border-primary/20 pl-3">
                          <div className="h-2.5 bg-primary/10 rounded-full w-4/5" />
                        </div>
                      )}
                      {slot.format === 'alert' && (
                        <div className="rounded-lg border border-destructive/10 bg-destructive/[0.02] px-3 py-2.5">
                          <div className="h-2 bg-destructive/10 rounded-full w-full mb-1.5" />
                          <div className="h-2 bg-destructive/5 rounded-full w-2/3" />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        );
      })}

      <div className="text-center pt-4">
        <p className="text-[0.6rem] text-muted-foreground/25">
          Máx {template.rules.maxTotalWords} palavras · {template.rules.forbiddenTerms.length} termos proibidos
        </p>
      </div>
    </div>
  );
}

export default ReportTemplatePanel;
