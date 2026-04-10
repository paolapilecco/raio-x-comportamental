import { useState, useEffect } from 'react';
import { Save, Plus, Trash2, ChevronDown, ChevronUp, RotateCcw, Copy, Sparkles, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { TestModule } from './promptConstants';

interface ReportSection {
  key: string;
  slug: string;
  label: string;
  maxSentences: number;
  required: boolean;
  order: number;
  aiInstructions: string;
}

const DEFAULT_SECTIONS: ReportSection[] = [
  { key: 'chamaAtencao', slug: 'chama-atencao', label: 'O que mais chama atenção', maxSentences: 2, required: true, order: 1, aiInstructions: '' },
  { key: 'padraoRepetido', slug: 'padrao-repetido', label: 'Padrão que se repete', maxSentences: 2, required: true, order: 2, aiInstructions: '' },
  { key: 'comoAparece', slug: 'como-aparece', label: 'Como aparece na rotina', maxSentences: 2, required: true, order: 3, aiInstructions: '' },
  { key: 'gatilhos', slug: 'gatilhos', label: 'Gatilhos principais', maxSentences: 1, required: true, order: 4, aiInstructions: '' },
  { key: 'impactoPorArea', slug: 'impacto-por-area', label: 'Impacto por área', maxSentences: 1, required: true, order: 5, aiInstructions: '' },
  { key: 'corrigirPrimeiro', slug: 'corrigir-primeiro', label: 'Direção de ajuste', maxSentences: 2, required: true, order: 6, aiInstructions: '' },
  { key: 'pararDeFazer', slug: 'parar-de-fazer', label: 'O que parar de fazer', maxSentences: 1, required: false, order: 7, aiInstructions: '' },
  { key: 'acaoInicial', slug: 'acao-inicial', label: 'Próxima ação prática', maxSentences: 2, required: true, order: 8, aiInstructions: '' },
];

interface Props {
  currentModule: TestModule;
}

const ReportTemplatePanel = ({ currentModule }: Props) => {
  const [sections, setSections] = useState<ReportSection[]>([]);
  const [templateId, setTemplateId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [spreading, setSpreading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [emotionalArchitecture, setEmotionalArchitecture] = useState('');

  useEffect(() => {
    fetchTemplate();
  }, [currentModule.id]);

  const fetchTemplate = async () => {
    setLoading(true);
    const { data, error: _fetchError } = await supabase
      .from('report_templates')
      .select('*')
      .eq('test_id', currentModule.id)
      .maybeSingle();

    if (data) {
      setTemplateId(data.id);
      const rules = (data.output_rules as any) || {};
      setEmotionalArchitecture(rules.emotionalArchitecture || '');
      const parsed = (data.sections as any[]) || [];
      if (parsed.length > 0) {
        setSections(parsed.map((s: any, i: number) => ({
          key: s.key || `section_${i}`,
          slug: s.slug || s.key?.replace(/([A-Z])/g, '-$1').toLowerCase().replace(/^-/, '') || `section-${i}`,
          label: s.label || '',
          maxSentences: s.maxSentences ?? 2,
          required: s.required ?? true,
          order: s.order ?? i + 1,
          aiInstructions: s.aiInstructions || '',
        })));
      } else {
        setSections([...DEFAULT_SECTIONS]);
      }
    } else {
      setSections([...DEFAULT_SECTIONS]);
      setTemplateId(null);
      setEmotionalArchitecture('');
    }
    setLoading(false);
  };

  const handleSave = async () => {
    setSaving(true);
    const ordered = sections.map((s, i) => ({ ...s, order: i + 1 }));
    const outputRules = { emotionalArchitecture };

    if (templateId) {
      const { error } = await supabase
        .from('report_templates')
        .update({ sections: ordered as any, output_rules: outputRules as any, updated_at: new Date().toISOString() })
        .eq('id', templateId);
      if (error) toast.error('Erro ao salvar template');
      else toast.success('Template salvo');
    } else {
    const { data: insertData, error: insertError } = await supabase
      .from('report_templates')
      .insert({ test_id: currentModule.id, sections: ordered as any, output_rules: outputRules as any })
      .select()
      .single();
      if (insertError) toast.error('Erro ao criar template');
      else if (insertData) { setTemplateId(insertData.id); toast.success('Template criado'); }
    }
    setSaving(false);
  };

  const handleReset = () => {
    setSections([...DEFAULT_SECTIONS]);
    toast.info('Template restaurado ao padrão');
  };

  const handleSpreadToAll = async () => {
    if (!confirm('Isso vai replicar este template para TODOS os outros testes. Testes que já possuem template próprio serão sobrescritos. Continuar?')) return;
    setSpreading(true);
    try {
      const ordered = sections.map((s, i) => ({ ...s, order: i + 1 }));

      // First save current template
      await handleSave();

      // Get all test modules except current
      const { data: modules, error: modErr } = await supabase
        .from('test_modules')
        .select('id')
        .neq('id', currentModule.id);

      if (modErr || !modules) throw modErr;

      let updated = 0;
      for (const mod of modules) {
        const { data: existing } = await supabase
          .from('report_templates')
          .select('id')
          .eq('test_id', mod.id)
          .maybeSingle();

        if (existing) {
          await supabase
            .from('report_templates')
            .update({ sections: ordered as any, updated_at: new Date().toISOString() })
            .eq('id', existing.id);
        } else {
          await supabase
            .from('report_templates')
            .insert({ test_id: mod.id, sections: ordered as any });
        }
        updated++;
      }

      toast.success(`Template replicado para ${updated} teste(s)`);
    } catch (e) {
      toast.error('Erro ao replicar template');
    }
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
          existingSections: sections,
        },
      });

      if (error) throw error;
      if (data?.error) { toast.error(data.error); return; }
      if (data?.sections?.length > 0) {
        setSections(data.sections);
        toast.success(`Template gerado com ${data.sections.length} seções!`);
      } else {
        toast.error('Nenhuma seção gerada');
      }
    } catch (e) {
      console.error(e);
      toast.error('Erro ao gerar template com IA');
    } finally {
      setAiGenerating(false);
    }
  };

  const moveSection = (index: number, direction: 'up' | 'down') => {
    const target = direction === 'up' ? index - 1 : index + 1;
    if (target < 0 || target >= sections.length) return;
    const updated = [...sections];
    [updated[index], updated[target]] = [updated[target], updated[index]];
    setSections(updated);
  };

  const updateSection = (index: number, field: keyof ReportSection, value: any) => {
    setSections(prev => prev.map((s, i) => i === index ? { ...s, [field]: value } : s));
  };

  const removeSection = (index: number) => {
    setSections(prev => prev.filter((_, i) => i !== index));
  };

  const addSection = () => {
    const ts = Date.now();
    setSections(prev => [...prev, {
      key: `custom_${ts}`,
      slug: `custom-${ts}`,
      label: 'Nova seção',
      maxSentences: 2,
      required: false,
      order: prev.length + 1,
      aiInstructions: '',
    }]);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-sm text-muted-foreground/50">Carregando template...</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-foreground">Template do Relatório</h3>
          <p className="text-[0.75rem] text-muted-foreground/60 mt-0.5">
            Defina a estrutura do relatório: ordem, nomes, tamanho e obrigatoriedade de cada bloco.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleAIGenerate}
            disabled={aiGenerating}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[0.75rem] font-medium bg-gradient-to-r from-violet-600 to-indigo-600 text-white hover:opacity-90 transition-all disabled:opacity-50"
          >
            {aiGenerating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
            {aiGenerating ? 'Gerando...' : 'Preencher com IA'}
          </button>
          <button
            onClick={handleSpreadToAll}
            disabled={spreading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[0.75rem] text-muted-foreground hover:text-foreground border border-border/30 hover:bg-accent/50 transition-all disabled:opacity-50"
          >
            <Copy className="w-3 h-3" />
            {spreading ? 'Replicando...' : 'Tornar padrão para todos'}
          </button>
          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[0.75rem] text-muted-foreground hover:text-foreground border border-border/30 hover:bg-secondary/50 transition-all"
          >
            <RotateCcw className="w-3 h-3" />
            Restaurar padrão
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-[0.75rem] font-medium bg-primary text-primary-foreground hover:brightness-90 transition-all disabled:opacity-50"
          >
            <Save className="w-3 h-3" />
            {saving ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>

      {/* Sections list */}
      <div className="space-y-2">
        {sections.map((section, index) => (
          <div
            key={section.key}
            className="border border-border/30 rounded-xl bg-card/60 px-4 py-3 flex items-start gap-3 group"
          >
            {/* Reorder */}
            <div className="flex flex-col gap-0.5 pt-1">
              <button
                onClick={() => moveSection(index, 'up')}
                disabled={index === 0}
                className="text-muted-foreground/30 hover:text-foreground disabled:opacity-20 transition-colors"
              >
                <ChevronUp className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => moveSection(index, 'down')}
                disabled={index === sections.length - 1}
                className="text-muted-foreground/30 hover:text-foreground disabled:opacity-20 transition-colors"
              >
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Order number */}
            <span className="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary shrink-0 mt-0.5">
              {index + 1}
            </span>

            {/* Content */}
            {/* Content */}
            <div className="flex-1 min-w-0 space-y-2">
              <div className="flex items-center gap-3 flex-wrap">
                {/* Label */}
                <input
                  type="text"
                  value={section.label}
                  onChange={(e) => updateSection(index, 'label', e.target.value)}
                  className="flex-1 min-w-[200px] text-sm font-medium bg-transparent border-b border-transparent hover:border-border/40 focus:border-primary/40 focus:outline-none transition-colors text-foreground"
                  placeholder="Nome da seção"
                />

                {/* Key */}
                <span className="text-[0.6rem] font-mono text-muted-foreground/30 hidden sm:inline">
                  {section.key}
                </span>
              </div>

              <div className="flex items-center gap-4 flex-wrap">
                {/* Slug */}
                <div className="flex items-center gap-1.5">
                  <label className="text-[0.65rem] text-muted-foreground/50">Slug:</label>
                  <input
                    type="text"
                    value={section.slug}
                    onChange={(e) => updateSection(index, 'slug', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
                    className="text-[0.75rem] w-[140px] bg-secondary/30 border border-border/20 rounded-md px-2 py-0.5 text-foreground font-mono"
                    placeholder="slug-da-secao"
                  />
                </div>

                {/* Max sentences */}
                <div className="flex items-center gap-1.5">
                  <label className="text-[0.65rem] text-muted-foreground/50">Máx. frases:</label>
                  <select
                    value={section.maxSentences}
                    onChange={(e) => updateSection(index, 'maxSentences', Number(e.target.value))}
                    className="text-[0.75rem] bg-secondary/30 border border-border/20 rounded-md px-2 py-0.5 text-foreground"
                  >
                    {[1, 2, 3, 4, 5].map(n => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                  </select>
                </div>

                {/* Required toggle */}
                <button
                  onClick={() => updateSection(index, 'required', !section.required)}
                  className={`text-[0.7rem] px-2.5 py-0.5 rounded-full font-medium transition-colors ${
                    section.required
                      ? 'bg-primary/10 text-primary'
                      : 'bg-muted/30 text-muted-foreground/50'
                  }`}
                >
                  {section.required ? 'Obrigatório' : 'Opcional'}
                </button>
              </div>

              {/* AI Instructions */}
              <div className="pt-1">
                <label className="text-[0.65rem] text-muted-foreground/50 block mb-1">Instruções para IA:</label>
                <textarea
                  value={section.aiInstructions}
                  onChange={(e) => updateSection(index, 'aiInstructions', e.target.value)}
                  rows={2}
                  className="w-full text-[0.75rem] bg-secondary/20 border border-border/20 rounded-md px-2.5 py-1.5 text-foreground placeholder:text-muted-foreground/30 resize-none focus:outline-none focus:border-primary/40 transition-colors"
                  placeholder="Ex: Seja direto, use no máximo 1 exemplo concreto, evite jargão técnico..."
                />
              </div>
            </div>

            {/* Remove */}
            <button
              onClick={() => removeSection(index)}
              className="text-muted-foreground/20 hover:text-destructive transition-colors opacity-0 group-hover:opacity-100 mt-1"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>

      {/* Add section */}
      <button
        onClick={addSection}
        className="w-full py-3 border border-dashed border-border/40 rounded-xl text-[0.75rem] text-muted-foreground/50 hover:text-foreground hover:border-primary/30 hover:bg-primary/[0.02] transition-all flex items-center justify-center gap-2"
      >
        <Plus className="w-3.5 h-3.5" />
        Adicionar seção
      </button>

      {/* Summary */}
      <div className="bg-secondary/20 rounded-xl px-4 py-3 text-[0.7rem] text-muted-foreground/50 space-y-1">
        <p><strong className="text-foreground/60">{sections.length}</strong> seções · <strong className="text-foreground/60">{sections.filter(s => s.required).length}</strong> obrigatórias · <strong className="text-foreground/60">{sections.filter(s => !s.required).length}</strong> opcionais</p>
        <p>Este template define a estrutura visual do relatório e é usado pelo motor de geração para validar e formatar a saída da IA.</p>
      </div>
    </div>
  );
};

export default ReportTemplatePanel;
