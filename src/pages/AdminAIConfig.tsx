import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Loader2, Save, RefreshCw, Brain, Sliders,
  Thermometer, FileText, MessageSquare, Layers, Cpu,
} from 'lucide-react';
import { toast } from 'sonner';

const AI_MODELS = [
  { value: 'google/gemini-3-flash-preview', label: 'Gemini 3 Flash (rápido)', description: 'Equilíbrio entre velocidade e qualidade' },
  { value: 'google/gemini-2.5-flash', label: 'Gemini 2.5 Flash', description: 'Bom custo-benefício, multimodal' },
  { value: 'google/gemini-2.5-flash-lite', label: 'Gemini 2.5 Flash Lite', description: 'Mais rápido e econômico' },
  { value: 'google/gemini-2.5-pro', label: 'Gemini 2.5 Pro', description: 'Máxima qualidade, mais lento' },
  { value: 'google/gemini-3.1-pro-preview', label: 'Gemini 3.1 Pro', description: 'Última geração, raciocínio avançado' },
  { value: 'openai/gpt-5', label: 'GPT-5', description: 'Alta precisão, mais caro' },
  { value: 'openai/gpt-5-mini', label: 'GPT-5 Mini', description: 'Bom desempenho, custo moderado' },
  { value: 'openai/gpt-5-nano', label: 'GPT-5 Nano', description: 'Rápido e econômico' },
  { value: 'openai/gpt-5.2', label: 'GPT-5.2', description: 'Último modelo OpenAI' },
];

interface AIConfig {
  id: string;
  ai_enabled: boolean;
  temperature: number;
  max_tokens: number;
  tone: string;
  depth_level: number;
  report_style: string;
  ai_model: string;
}

export default function AdminAIConfig() {
  const { isSuperAdmin, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [config, setConfig] = useState<AIConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!isSuperAdmin) { navigate('/dashboard', { replace: true }); return; }
    fetchConfig();
  }, [authLoading, isSuperAdmin]);

  const fetchConfig = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('global_ai_config')
        .select('*')
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setConfig(data as unknown as AIConfig);
      } else {
        const { data: newConfig } = await supabase
          .from('global_ai_config')
          .insert({})
          .select()
          .single();
        if (newConfig) setConfig(newConfig as unknown as AIConfig);
      }
    } catch {
      toast.error('Erro ao carregar configuração');
    }
    setLoading(false);
  };

  const handleSave = async () => {
    if (!config) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('global_ai_config')
        .update({
          ai_enabled: config.ai_enabled,
          temperature: config.temperature,
          max_tokens: config.max_tokens,
          tone: config.tone,
          depth_level: config.depth_level,
          report_style: config.report_style,
          ai_model: config.ai_model,
        } as any)
        .eq('id', config.id);

      if (error) throw error;
      toast.success('Configuração salva com sucesso!');
    } catch {
      toast.error('Erro ao salvar configuração');
    }
    setSaving(false);
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!config) return null;

  const selectedModel = AI_MODELS.find(m => m.value === config.ai_model);

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/admin/dashboard')} className="p-2 rounded-lg hover:bg-accent transition-colors">
              <ArrowLeft className="w-5 h-5 text-foreground" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Configuração de IA</h1>
              <p className="text-sm text-muted-foreground">Ajuste parâmetros globais da IA</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={fetchConfig} className="p-2 rounded-lg hover:bg-accent transition-colors">
              <RefreshCw className="w-4 h-4 text-muted-foreground" />
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </div>

        {/* Toggle */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card rounded-xl border border-border p-6"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Brain className="w-5 h-5 text-primary/60" />
              <div>
                <h3 className="font-semibold text-foreground">IA Ativada</h3>
                <p className="text-xs text-muted-foreground">Habilitar análise por IA nos relatórios</p>
              </div>
            </div>
            <button
              onClick={() => setConfig({ ...config, ai_enabled: !config.ai_enabled })}
              className={`relative w-12 h-6 rounded-full transition-colors ${config.ai_enabled ? 'bg-primary' : 'bg-muted'}`}
            >
              <span className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform"
                style={{ left: config.ai_enabled ? '26px' : '2px' }}
              />
            </button>
          </div>
        </motion.div>

        {/* Model Selection */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.03 }}
          className="bg-card rounded-xl border border-border p-6 space-y-4"
        >
          <h3 className="font-semibold text-foreground flex items-center gap-2">
            <Cpu className="w-4 h-4 text-primary/60" />
            Modelo de IA
          </h3>
          <p className="text-xs text-muted-foreground">
            Modelo ativo: <span className="font-mono text-primary">{selectedModel?.label || config.ai_model}</span>
            {selectedModel && <span className="ml-2">— {selectedModel.description}</span>}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {AI_MODELS.map(model => (
              <button
                key={model.value}
                onClick={() => setConfig({ ...config, ai_model: model.value })}
                className={`text-left px-4 py-3 rounded-lg text-sm transition-all border ${
                  config.ai_model === model.value
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border text-muted-foreground hover:border-primary/30'
                }`}
              >
                <div className="font-medium">{model.label}</div>
                <div className="text-xs opacity-70 mt-0.5">{model.description}</div>
              </button>
            ))}
          </div>
        </motion.div>

        {/* Parameters */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="bg-card rounded-xl border border-border p-6 space-y-6"
        >
          <h3 className="font-semibold text-foreground flex items-center gap-2">
            <Sliders className="w-4 h-4 text-primary/60" />
            Parâmetros
          </h3>

          {/* Temperature */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-foreground flex items-center gap-2">
                <Thermometer className="w-4 h-4 text-muted-foreground" />
                Temperatura
              </label>
              <span className="text-sm font-mono text-primary">{config.temperature}</span>
            </div>
            <input
              type="range" min="0" max="2" step="0.1"
              value={config.temperature}
              onChange={e => setConfig({ ...config, temperature: parseFloat(e.target.value) })}
              className="w-full accent-primary"
            />
            <p className="text-xs text-muted-foreground">0 = Mais preciso · 2 = Mais criativo</p>
          </div>

          {/* Max Tokens */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-foreground flex items-center gap-2">
                <FileText className="w-4 h-4 text-muted-foreground" />
                Máx. Tokens
              </label>
              <span className="text-sm font-mono text-primary">{config.max_tokens}</span>
            </div>
            <input
              type="range" min="500" max="8000" step="100"
              value={config.max_tokens}
              onChange={e => setConfig({ ...config, max_tokens: parseInt(e.target.value) })}
              className="w-full accent-primary"
            />
            <p className="text-xs text-muted-foreground">Tamanho máximo da resposta da IA</p>
          </div>

          {/* Depth Level */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-foreground flex items-center gap-2">
                <Layers className="w-4 h-4 text-muted-foreground" />
                Nível de Profundidade
              </label>
              <span className="text-sm font-mono text-primary">{config.depth_level}</span>
            </div>
            <input
              type="range" min="1" max="5" step="1"
              value={config.depth_level}
              onChange={e => setConfig({ ...config, depth_level: parseInt(e.target.value) })}
              className="w-full accent-primary"
            />
            <p className="text-xs text-muted-foreground">1 = Superficial · 5 = Análise profunda</p>
          </div>

          {/* Tone */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-muted-foreground" />
              Tom da Resposta
            </label>
            <input
              type="text"
              value={config.tone}
              onChange={e => setConfig({ ...config, tone: e.target.value })}
              className="w-full px-4 py-2.5 rounded-lg bg-background border border-border text-sm text-foreground focus:ring-2 focus:ring-primary/50 outline-none"
              placeholder="Ex: empático e direto"
            />
          </div>

          {/* Report Style */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Estilo do Relatório</label>
            <div className="grid grid-cols-3 gap-2">
              {['narrativo', 'analítico', 'objetivo'].map(style => (
                <button
                  key={style}
                  onClick={() => setConfig({ ...config, report_style: style })}
                  className={`px-3 py-2 rounded-lg text-sm font-medium capitalize transition-all border ${
                    config.report_style === style
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border text-muted-foreground hover:border-primary/30'
                  }`}
                >
                  {style}
                </button>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
