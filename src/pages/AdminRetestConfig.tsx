import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2, Save, RefreshCw, Clock, Bell, Mail, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';

interface RetestConfig {
  id: string;
  retest_enabled: boolean;
  retest_days_threshold: number;
  dashboard_alert_enabled: boolean;
  email_reminder_enabled: boolean;
  email_subject: string;
  email_heading: string;
  email_body_intro: string;
  email_body_cta: string;
}

const DEFAULTS: Omit<RetestConfig, 'id'> = {
  retest_enabled: true,
  retest_days_threshold: 15,
  dashboard_alert_enabled: true,
  email_reminder_enabled: true,
  email_subject: 'Sua análise já está desatualizada',
  email_heading: 'Seu padrão continua ativo.',
  email_body_intro: 'Seu último resultado ainda define seu comportamento atual. Nada indica que isso mudou.',
  email_body_cta: 'Refaça sua análise e veja se você evoluiu ou só adiou.',
};

export default function AdminRetestConfig() {
  const { isSuperAdmin, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [config, setConfig] = useState<RetestConfig | null>(null);
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
        .from('retest_config')
        .select('*')
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      if (data) {
        setConfig(data as unknown as RetestConfig);
      } else {
        const { data: newConfig } = await supabase
          .from('retest_config')
          .insert({})
          .select()
          .single();
        if (newConfig) setConfig(newConfig as unknown as RetestConfig);
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
        .from('retest_config')
        .update({
          retest_enabled: config.retest_enabled,
          retest_days_threshold: config.retest_days_threshold,
          dashboard_alert_enabled: config.dashboard_alert_enabled,
          email_reminder_enabled: config.email_reminder_enabled,
          email_subject: config.email_subject,
          email_heading: config.email_heading,
          email_body_intro: config.email_body_intro,
          email_body_cta: config.email_body_cta,
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

  const Toggle = ({ value, onChange, label, description, icon: Icon }: { value: boolean; onChange: (v: boolean) => void; label: string; description: string; icon: any }) => (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <Icon className="w-5 h-5 text-primary/60" />
        <div>
          <h3 className="font-semibold text-foreground">{label}</h3>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
      </div>
      <button
        onClick={() => onChange(!value)}
        className={`relative w-12 h-6 rounded-full transition-colors ${value ? 'bg-primary' : 'bg-muted'}`}
      >
        <span className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform"
          style={{ left: value ? '26px' : '2px' }}
        />
      </button>
    </div>
  );

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
              <h1 className="text-2xl font-bold text-foreground">Ciclo de Reavaliação</h1>
              <p className="text-sm text-muted-foreground">Configure alertas, emails e janela de reteste</p>
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

        {/* Toggles */}
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="bg-card rounded-xl border border-border p-6 space-y-6">
          <Toggle value={config.retest_enabled} onChange={v => setConfig({ ...config, retest_enabled: v })} label="Sistema de Reteste" description="Ativa/desativa todo o ciclo de reavaliação" icon={Clock} />
          <Toggle value={config.dashboard_alert_enabled} onChange={v => setConfig({ ...config, dashboard_alert_enabled: v })} label="Alerta no Dashboard" description="Mostrar card de inatividade no painel do usuário" icon={Bell} />
          <Toggle value={config.email_reminder_enabled} onChange={v => setConfig({ ...config, email_reminder_enabled: v })} label="Email de Lembrete" description="Enviar email automático após período de inatividade" icon={Mail} />
        </motion.div>

        {/* Threshold */}
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.03 }} className="bg-card rounded-xl border border-border p-6 space-y-4">
          <h3 className="font-semibold text-foreground flex items-center gap-2">
            <Clock className="w-4 h-4 text-primary/60" />
            Janela de Inatividade
          </h3>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-foreground">Dias até alerta/email</label>
              <span className="text-sm font-mono text-primary">{config.retest_days_threshold} dias</span>
            </div>
            <input
              type="range" min="5" max="90" step="1"
              value={config.retest_days_threshold}
              onChange={e => setConfig({ ...config, retest_days_threshold: parseInt(e.target.value) })}
              className="w-full accent-primary"
            />
            <p className="text-xs text-muted-foreground">5 = agressivo · 90 = conservador</p>
          </div>
        </motion.div>

        {/* Email Content */}
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="bg-card rounded-xl border border-border p-6 space-y-5">
          <h3 className="font-semibold text-foreground flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-primary/60" />
            Conteúdo do Email
          </h3>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Assunto</label>
            <input
              type="text"
              value={config.email_subject}
              onChange={e => setConfig({ ...config, email_subject: e.target.value })}
              className="w-full px-4 py-2.5 rounded-lg bg-background border border-border text-sm text-foreground focus:ring-2 focus:ring-primary/50 outline-none"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Título do email</label>
            <input
              type="text"
              value={config.email_heading}
              onChange={e => setConfig({ ...config, email_heading: e.target.value })}
              className="w-full px-4 py-2.5 rounded-lg bg-background border border-border text-sm text-foreground focus:ring-2 focus:ring-primary/50 outline-none"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Corpo introdutório</label>
            <textarea
              value={config.email_body_intro}
              onChange={e => setConfig({ ...config, email_body_intro: e.target.value })}
              rows={3}
              className="w-full px-4 py-2.5 rounded-lg bg-background border border-border text-sm text-foreground focus:ring-2 focus:ring-primary/50 outline-none resize-none"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Chamada para ação (CTA)</label>
            <input
              type="text"
              value={config.email_body_cta}
              onChange={e => setConfig({ ...config, email_body_cta: e.target.value })}
              className="w-full px-4 py-2.5 rounded-lg bg-background border border-border text-sm text-foreground focus:ring-2 focus:ring-primary/50 outline-none"
            />
          </div>

          {/* Preview */}
          <div className="rounded-lg bg-muted/30 border border-border/50 p-4 space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Pré-visualização</p>
            <p className="text-sm font-semibold text-foreground">{config.email_heading}</p>
            <p className="text-sm text-muted-foreground">{config.email_body_intro}</p>
            <p className="text-sm text-foreground font-medium">{config.email_body_cta}</p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
