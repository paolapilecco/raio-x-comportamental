import { useState, useEffect } from 'react';
import { Save, RotateCcw, Plus, X, Copy, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { TestModule } from './promptConstants';

interface OutputRules {
  tone: string;
  simplicityLevel: number;
  maxSentencesPerBlock: number;
  maxTotalBlocks: number;
  repetitionProhibited: boolean;
  requiredBlocks: string[];
  forbiddenLanguage: string[];
}

const DEFAULT_RULES: OutputRules = {
  tone: 'direto e acessível',
  simplicityLevel: 4,
  maxSentencesPerBlock: 2,
  maxTotalBlocks: 9,
  repetitionProhibited: true,
  requiredBlocks: ['chamaAtencao', 'padraoRepetido', 'corrigirPrimeiro', 'acaoInicial'],
  forbiddenLanguage: ['zona de conforto', 'acredite em si', 'saia da caixa', 'busque equilíbrio', 'tenha mais foco'],
};

const TONE_OPTIONS = [
  'direto e acessível',
  'empático e simples',
  'clínico e objetivo',
  'provocativo e claro',
  'acolhedor e prático',
];

const SIMPLICITY_LABELS: Record<number, string> = {
  1: 'Técnico',
  2: 'Semi-técnico',
  3: 'Moderado',
  4: 'Simples',
  5: 'Ultra-simples',
};

interface Props {
  currentModule: TestModule;
}

const OutputRulesPanel = ({ currentModule }: Props) => {
  const [rules, setRules] = useState<OutputRules>({ ...DEFAULT_RULES });
  const [templateId, setTemplateId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [spreading, setSpreading] = useState<string | null>(null);
  const [newForbidden, setNewForbidden] = useState('');
  const [newRequired, setNewRequired] = useState('');

  useEffect(() => {
    fetchRules();
  }, [currentModule.id]);

  const fetchRules = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('report_templates')
      .select('id, output_rules')
      .eq('test_id', currentModule.id)
      .maybeSingle();

    if (data) {
      setTemplateId(data.id);
      const raw = data.output_rules as Record<string, any> | null;
      if (raw && Object.keys(raw).length > 0) {
        setRules({
          tone: raw.tone ?? DEFAULT_RULES.tone,
          simplicityLevel: raw.simplicityLevel ?? DEFAULT_RULES.simplicityLevel,
          maxSentencesPerBlock: raw.maxSentencesPerBlock ?? DEFAULT_RULES.maxSentencesPerBlock,
          maxTotalBlocks: raw.maxTotalBlocks ?? DEFAULT_RULES.maxTotalBlocks,
          repetitionProhibited: raw.repetitionProhibited ?? DEFAULT_RULES.repetitionProhibited,
          requiredBlocks: raw.requiredBlocks ?? DEFAULT_RULES.requiredBlocks,
          forbiddenLanguage: raw.forbiddenLanguage ?? DEFAULT_RULES.forbiddenLanguage,
        });
      } else {
        setRules({ ...DEFAULT_RULES });
      }
    } else {
      setTemplateId(null);
      setRules({ ...DEFAULT_RULES });
    }
    setLoading(false);
  };

  const handleSave = async () => {
    setSaving(true);
    if (templateId) {
      const { error } = await supabase
        .from('report_templates')
        .update({ output_rules: rules as any, updated_at: new Date().toISOString() })
        .eq('id', templateId);
      if (error) toast.error('Erro ao salvar regras');
      else toast.success('Regras de saída salvas');
    } else {
      const { data, error } = await supabase
        .from('report_templates')
        .insert({ test_id: currentModule.id, output_rules: rules as any })
        .select()
        .single();
      if (error) toast.error('Erro ao criar regras');
      else { setTemplateId(data.id); toast.success('Regras de saída criadas'); }
    }
    setSaving(false);
  };

  const handleReset = () => {
    setRules({ ...DEFAULT_RULES });
    toast.info('Regras restauradas ao padrão');
  };

  const spreadFieldToAll = async (field: 'all' | 'requiredBlocks' | 'forbiddenLanguage') => {
    const label = field === 'all' ? 'regras de saída' : field === 'requiredBlocks' ? 'blocos obrigatórios' : 'linguagem proibida';
    if (!confirm(`Replicar ${label} para TODOS os outros testes? Testes com configuração própria serão sobrescritos.`)) return;
    setSpreading(field);
    try {
      await handleSave();

      const { data: modules } = await supabase
        .from('test_modules')
        .select('id')
        .neq('id', currentModule.id);

      if (!modules) throw new Error('Falha ao buscar testes');

      for (const mod of modules) {
        const { data: existing } = await supabase
          .from('report_templates')
          .select('id, output_rules')
          .eq('test_id', mod.id)
          .maybeSingle();

        let newRules: any;
        if (field === 'all') {
          newRules = { ...rules };
        } else {
          const current = (existing?.output_rules as Record<string, any>) || {};
          newRules = { ...current, [field]: rules[field] };
        }

        if (existing) {
          await supabase
            .from('report_templates')
            .update({ output_rules: newRules, updated_at: new Date().toISOString() })
            .eq('id', existing.id);
        } else {
          await supabase
            .from('report_templates')
            .insert({ test_id: mod.id, output_rules: newRules });
        }
      }

      toast.success(`${label.charAt(0).toUpperCase() + label.slice(1)} replicado(s) para ${modules.length} teste(s)`);
    } catch {
      toast.error('Erro ao replicar');
    }
    setSpreading(null);
  };

  const addForbiddenWord = () => {
    const term = newForbidden.trim().toLowerCase();
    if (!term || rules.forbiddenLanguage.includes(term)) return;
    setRules(prev => ({ ...prev, forbiddenLanguage: [...prev.forbiddenLanguage, term] }));
    setNewForbidden('');
  };

  const removeForbidden = (index: number) => {
    setRules(prev => ({ ...prev, forbiddenLanguage: prev.forbiddenLanguage.filter((_, i) => i !== index) }));
  };

  const addRequiredBlock = () => {
    const block = newRequired.trim();
    if (!block || rules.requiredBlocks.includes(block)) return;
    setRules(prev => ({ ...prev, requiredBlocks: [...prev.requiredBlocks, block] }));
    setNewRequired('');
  };

  const removeRequired = (index: number) => {
    setRules(prev => ({ ...prev, requiredBlocks: prev.requiredBlocks.filter((_, i) => i !== index) }));
  };

  const SpreadButton = ({ field, label }: { field: 'all' | 'requiredBlocks' | 'forbiddenLanguage'; label: string }) => (
    <button
      onClick={() => spreadFieldToAll(field)}
      disabled={spreading !== null}
      className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[0.65rem] text-muted-foreground hover:text-foreground border border-border/30 hover:bg-accent/50 transition-all disabled:opacity-50"
    >
      <Copy className="w-3 h-3" />
      {spreading === field ? 'Replicando...' : label}
    </button>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-sm text-muted-foreground/50">Carregando regras...</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h3 className="text-base font-semibold text-foreground">Regras de Saída</h3>
          <p className="text-[0.75rem] text-muted-foreground/60 mt-0.5">
            Controle tom, simplicidade, tamanho e linguagem dos relatórios gerados.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <SpreadButton field="all" label="Replicar tudo para todos" />
          <button onClick={handleReset} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[0.75rem] text-muted-foreground hover:text-foreground border border-border/30 hover:bg-secondary/50 transition-all">
            <RotateCcw className="w-3 h-3" /> Restaurar padrão
          </button>
          <button onClick={handleSave} disabled={saving} className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-[0.75rem] font-medium bg-primary text-primary-foreground hover:brightness-90 transition-all disabled:opacity-50">
            <Save className="w-3 h-3" /> {saving ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Tom */}
        <div className="border border-border/30 rounded-xl bg-card/60 p-4 space-y-2">
          <label className="text-[0.75rem] font-semibold text-foreground/80">Tom da linguagem</label>
          <select
            value={rules.tone}
            onChange={e => setRules(prev => ({ ...prev, tone: e.target.value }))}
            className="w-full text-sm bg-secondary/30 border border-border/20 rounded-lg px-3 py-2 text-foreground"
          >
            {TONE_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>

        {/* Simplicidade */}
        <div className="border border-border/30 rounded-xl bg-card/60 p-4 space-y-2">
          <label className="text-[0.75rem] font-semibold text-foreground/80">
            Nível de simplicidade: <span className="text-primary">{SIMPLICITY_LABELS[rules.simplicityLevel]}</span>
          </label>
          <input
            type="range"
            min={1}
            max={5}
            value={rules.simplicityLevel}
            onChange={e => setRules(prev => ({ ...prev, simplicityLevel: Number(e.target.value) }))}
            className="w-full accent-primary"
          />
          <div className="flex justify-between text-[0.6rem] text-muted-foreground/40">
            <span>Técnico</span><span>Ultra-simples</span>
          </div>
        </div>

        {/* Limite por bloco */}
        <div className="border border-border/30 rounded-xl bg-card/60 p-4 space-y-2">
          <label className="text-[0.75rem] font-semibold text-foreground/80">Máx. frases por bloco</label>
          <select
            value={rules.maxSentencesPerBlock}
            onChange={e => setRules(prev => ({ ...prev, maxSentencesPerBlock: Number(e.target.value) }))}
            className="w-full text-sm bg-secondary/30 border border-border/20 rounded-lg px-3 py-2 text-foreground"
          >
            {[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{n} {n === 1 ? 'frase' : 'frases'}</option>)}
          </select>
        </div>

        {/* Total de blocos */}
        <div className="border border-border/30 rounded-xl bg-card/60 p-4 space-y-2">
          <label className="text-[0.75rem] font-semibold text-foreground/80">Máx. blocos no relatório</label>
          <select
            value={rules.maxTotalBlocks}
            onChange={e => setRules(prev => ({ ...prev, maxTotalBlocks: Number(e.target.value) }))}
            className="w-full text-sm bg-secondary/30 border border-border/20 rounded-lg px-3 py-2 text-foreground"
          >
            {[5, 6, 7, 8, 9, 10, 12].map(n => <option key={n} value={n}>{n} blocos</option>)}
          </select>
        </div>

        {/* Repetição */}
        <div className="border border-border/30 rounded-xl bg-card/60 p-4 space-y-2 md:col-span-2">
          <div className="flex items-center justify-between">
            <label className="text-[0.75rem] font-semibold text-foreground/80">Proibir repetição semântica entre blocos</label>
            <button
              onClick={() => setRules(prev => ({ ...prev, repetitionProhibited: !prev.repetitionProhibited }))}
              className={`w-10 h-5 rounded-full transition-colors relative ${rules.repetitionProhibited ? 'bg-primary' : 'bg-muted/50'}`}
            >
              <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${rules.repetitionProhibited ? 'left-5' : 'left-0.5'}`} />
            </button>
          </div>
          <p className="text-[0.65rem] text-muted-foreground/50">
            Quando ativado, o sistema valida automaticamente se blocos diferentes dizem a mesma coisa com palavras distintas.
          </p>
        </div>
      </div>

      {/* Blocos obrigatórios */}
      <div className="border border-border/30 rounded-xl bg-card/60 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-[0.75rem] font-semibold text-foreground/80">Blocos obrigatórios</label>
          <SpreadButton field="requiredBlocks" label="Replicar para todos" />
        </div>
        <div className="flex flex-wrap gap-2">
          {rules.requiredBlocks.map((block, i) => (
            <span key={i} className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-primary/10 text-primary text-[0.7rem] font-medium">
              {block}
              <button onClick={() => removeRequired(i)} className="hover:text-destructive transition-colors"><X className="w-3 h-3" /></button>
            </span>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={newRequired}
            onChange={e => setNewRequired(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addRequiredBlock()}
            placeholder="Nome do bloco (key)"
            className="flex-1 text-sm bg-secondary/30 border border-border/20 rounded-lg px-3 py-1.5 text-foreground placeholder:text-muted-foreground/30"
          />
          <button onClick={addRequiredBlock} className="p-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors">
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Linguagem proibida */}
      <div className="border border-border/30 rounded-xl bg-card/60 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-[0.75rem] font-semibold text-foreground/80">Linguagem proibida</label>
          <SpreadButton field="forbiddenLanguage" label="Replicar para todos" />
        </div>
        <p className="text-[0.65rem] text-muted-foreground/50">
          Termos e expressões que nunca devem aparecer nos relatórios gerados.
        </p>
        <div className="flex flex-wrap gap-2">
          {rules.forbiddenLanguage.map((term, i) => (
            <span key={i} className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-destructive/10 text-destructive text-[0.7rem] font-medium">
              "{term}"
              <button onClick={() => removeForbidden(i)} className="hover:text-foreground transition-colors"><X className="w-3 h-3" /></button>
            </span>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={newForbidden}
            onChange={e => setNewForbidden(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addForbiddenWord()}
            placeholder="Ex: acredite em si"
            className="flex-1 text-sm bg-secondary/30 border border-border/20 rounded-lg px-3 py-1.5 text-foreground placeholder:text-muted-foreground/30"
          />
          <button onClick={addForbiddenWord} className="p-1.5 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors">
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Summary */}
      <div className="bg-secondary/20 rounded-xl px-4 py-3 text-[0.7rem] text-muted-foreground/50 space-y-1">
        <p>
          <strong className="text-foreground/60">Tom:</strong> {rules.tone} · 
          <strong className="text-foreground/60"> Simplicidade:</strong> {SIMPLICITY_LABELS[rules.simplicityLevel]} · 
          <strong className="text-foreground/60"> Limite:</strong> {rules.maxSentencesPerBlock} frases/bloco · 
          <strong className="text-foreground/60"> Anti-repetição:</strong> {rules.repetitionProhibited ? 'ativa' : 'inativa'}
        </p>
        <p>{rules.forbiddenLanguage.length} termos proibidos · {rules.requiredBlocks.length} blocos obrigatórios</p>
      </div>
    </div>
  );
};

export default OutputRulesPanel;
