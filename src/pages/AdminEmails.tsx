import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { AppLayout } from '@/components/AppLayout';
import {
  Mail, Send, Eye, RefreshCw, CheckCircle, XCircle, Clock,
  ChevronLeft, ChevronRight, Filter, Search, AlertTriangle,
  Edit3, Loader2, BarChart3,
} from 'lucide-react';

const fadeUp = { initial: { opacity: 0, y: 15 }, animate: { opacity: 1, y: 0 } };

interface EmailLog {
  id: string;
  template_name: string;
  recipient_email: string;
  status: string;
  resend_id: string | null;
  error_message: string | null;
  template_data: Record<string, any>;
  sent_by: string | null;
  created_at: string;
}

interface TemplateInfo {
  key: string;
  subject: string;
  preview: string;
}

interface Stats {
  total: number;
  sent: number;
  failed: number;
  pending: number;
}

const TEMPLATE_LABELS: Record<string, string> = {
  'welcome': '👋 Boas-vindas',
  'test-invite': '📋 Convite de Teste',
  'test-completed': '📊 Teste Concluído',
  'platform-invite': '🎉 Convite Plataforma',
  'retest-reminder': '⏰ Lembrete Reteste',
};

const TEMPLATE_FIELDS: Record<string, { key: string; label: string; placeholder: string }[]> = {
  'welcome': [
    { key: 'name', label: 'Nome', placeholder: 'Nome do usuário' },
    { key: 'appUrl', label: 'URL da App', placeholder: 'https://raio-x-comportamental.lovable.app' },
  ],
  'test-invite': [
    { key: 'patientName', label: 'Nome do Paciente', placeholder: 'Maria Silva' },
    { key: 'professionalName', label: 'Nome do Profissional', placeholder: 'Dra. Paola' },
    { key: 'testName', label: 'Nome do Teste', placeholder: 'Comportamento Base' },
    { key: 'testLink', label: 'Link do Teste', placeholder: 'https://...' },
  ],
  'test-completed': [
    { key: 'patientName', label: 'Nome do Paciente', placeholder: 'Maria Silva' },
    { key: 'testName', label: 'Nome do Teste', placeholder: 'Comportamento Base' },
    { key: 'dominantPattern', label: 'Padrão Dominante', placeholder: 'Autossabotagem' },
    { key: 'intensity', label: 'Intensidade', placeholder: 'alto' },
    { key: 'detailUrl', label: 'URL do Detalhe', placeholder: 'https://...' },
  ],
  'platform-invite': [
    { key: 'inviterName', label: 'Nome do Convidador', placeholder: 'Dra. Paola' },
    { key: 'inviteLink', label: 'Link do Convite', placeholder: 'https://...' },
  ],
  'retest-reminder': [
    { key: 'patientName', label: 'Nome do Paciente', placeholder: 'Maria Silva' },
    { key: 'detailUrl', label: 'URL do Paciente', placeholder: 'https://...' },
  ],
};

const STATUS_CONFIG: Record<string, { icon: typeof CheckCircle; color: string; label: string }> = {
  sent: { icon: CheckCircle, color: 'text-emerald-600 bg-emerald-50', label: 'Enviado' },
  failed: { icon: XCircle, color: 'text-red-600 bg-red-50', label: 'Falhou' },
  pending: { icon: Clock, color: 'text-amber-600 bg-amber-50', label: 'Pendente' },
};

export default function AdminEmails() {
  const { isSuperAdmin, loading: authLoading, user } = useAuth();
  const navigate = useNavigate();

  // Tabs
  const [activeTab, setActiveTab] = useState<'logs' | 'templates' | 'send'>('logs');

  // Logs state
  const [logs, setLogs] = useState<EmailLog[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 0, sent: 0, failed: 0, pending: 0 });
  const [logsCount, setLogsCount] = useState(0);
  const [logsPage, setLogsPage] = useState(0);
  const [logsLoading, setLogsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [templateFilter, setTemplateFilter] = useState('all');

  // Templates state
  const [templates, setTemplates] = useState<TemplateInfo[]>([]);
  const [previewHtml, setPreviewHtml] = useState('');
  const [previewSubject, setPreviewSubject] = useState('');
  const [previewTemplate, setPreviewTemplate] = useState('');

  // Manual send state
  const [sendTemplate, setSendTemplate] = useState('welcome');
  const [sendTo, setSendTo] = useState('');
  const [sendData, setSendData] = useState<Record<string, string>>({});
  const [sending, setSending] = useState(false);
  const [sendPreviewHtml, setSendPreviewHtml] = useState('');

  const LIMIT = 20;

  useEffect(() => {
    if (authLoading) return;
    if (!isSuperAdmin) { navigate('/dashboard', { replace: true }); return; }
    fetchLogs();
    fetchTemplates();
  }, [authLoading, isSuperAdmin]);

  useEffect(() => {
    if (!isSuperAdmin) return;
    fetchLogs();
  }, [logsPage, statusFilter, templateFilter]);

  const fetchLogs = async () => {
    setLogsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-email', {
        body: {
          action: 'get-logs',
          data: { limit: LIMIT, offset: logsPage * LIMIT, statusFilter, templateFilter },
        },
      });
      if (!error && data) {
        setLogs(data.logs || []);
        setLogsCount(data.count || 0);
        setStats(data.stats || { total: 0, sent: 0, failed: 0, pending: 0 });
      }
    } catch { toast.error('Erro ao carregar logs'); }
    setLogsLoading(false);
  };

  const fetchTemplates = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('send-email', {
        body: { action: 'list-templates' },
      });
      if (!error && data?.templates) setTemplates(data.templates);
    } catch {}
  };

  const handlePreview = async (templateKey: string, customData?: Record<string, string>) => {
    try {
      const { data, error } = await supabase.functions.invoke('send-email', {
        body: { action: 'preview', templateName: templateKey, data: customData || {} },
      });
      if (!error && data) {
        setPreviewHtml(data.html);
        setPreviewSubject(data.subject);
        setPreviewTemplate(templateKey);
      }
    } catch {}
  };

  const handleSend = async () => {
    if (!sendTo || !sendTo.includes('@')) { toast.error('Email inválido'); return; }
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-email', {
        body: {
          templateName: sendTemplate,
          to: sendTo,
          data: { ...sendData, _sentBy: user?.id },
        },
      });
      if (error) { toast.error('Erro ao enviar email'); }
      else {
        toast.success('Email enviado com sucesso!');
        setSendTo('');
        setSendData({});
        fetchLogs();
      }
    } catch { toast.error('Erro ao enviar email'); }
    setSending(false);
  };

  const handleSendPreview = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('send-email', {
        body: { action: 'preview', templateName: sendTemplate, data: sendData },
      });
      if (!error && data) setSendPreviewHtml(data.html);
    } catch {}
  };

  useEffect(() => { setSendData({}); setSendPreviewHtml(''); }, [sendTemplate]);

  const totalPages = Math.ceil(logsCount / LIMIT);

  if (authLoading) return null;

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* Header */}
        <motion.div {...fadeUp} className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-serif font-bold text-foreground flex items-center gap-3">
              <Mail className="w-6 h-6 text-primary" /> Central de Emails
            </h1>
            <p className="text-sm text-muted-foreground mt-1">Logs, templates e envio manual</p>
          </div>
          <button onClick={fetchLogs} className="p-2.5 rounded-xl bg-card border border-border hover:bg-muted transition-colors">
            <RefreshCw className="w-4 h-4 text-muted-foreground" />
          </button>
        </motion.div>

        {/* Stats */}
        <motion.div {...fadeUp} transition={{ delay: 0.05 }} className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Total', value: stats.total, icon: BarChart3, color: 'text-primary' },
            { label: 'Enviados', value: stats.sent, icon: CheckCircle, color: 'text-emerald-600' },
            { label: 'Falhas', value: stats.failed, icon: XCircle, color: 'text-red-500' },
            { label: 'Pendentes', value: stats.pending, icon: Clock, color: 'text-amber-500' },
          ].map((s) => (
            <div key={s.label} className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
              <s.icon className={`w-5 h-5 ${s.color}`} />
              <div>
                <p className="text-xs text-muted-foreground">{s.label}</p>
                <p className="text-xl font-bold text-foreground">{s.value}</p>
              </div>
            </div>
          ))}
        </motion.div>

        {/* Tabs */}
        <motion.div {...fadeUp} transition={{ delay: 0.1 }} className="flex gap-1 bg-muted/50 p-1 rounded-xl w-fit">
          {(['logs', 'templates', 'send'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab === 'logs' ? '📋 Logs' : tab === 'templates' ? '🎨 Templates' : '✉️ Envio Manual'}
            </button>
          ))}
        </motion.div>

        {/* ─── LOGS TAB ─── */}
        {activeTab === 'logs' && (
          <motion.div {...fadeUp} className="space-y-4">
            {/* Filters */}
            <div className="flex flex-wrap gap-3">
              <select
                value={statusFilter}
                onChange={e => { setStatusFilter(e.target.value); setLogsPage(0); }}
                className="px-3 py-2 rounded-lg bg-card border border-border text-sm text-foreground"
              >
                <option value="all">Todos os status</option>
                <option value="sent">Enviados</option>
                <option value="failed">Falhas</option>
                <option value="pending">Pendentes</option>
              </select>
              <select
                value={templateFilter}
                onChange={e => { setTemplateFilter(e.target.value); setLogsPage(0); }}
                className="px-3 py-2 rounded-lg bg-card border border-border text-sm text-foreground"
              >
                <option value="all">Todos os templates</option>
                {Object.entries(TEMPLATE_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>

            {/* Table */}
            {logsLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : logs.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Mail className="w-10 h-10 mx-auto mb-3 opacity-40" />
                <p>Nenhum email encontrado</p>
              </div>
            ) : (
              <div className="bg-card border border-border rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/30">
                        <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Template</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Destinatário</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Status</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Data</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Erro</th>
                      </tr>
                    </thead>
                    <tbody>
                      {logs.map((log) => {
                        const sc = STATUS_CONFIG[log.status] || STATUS_CONFIG.pending;
                        const Icon = sc.icon;
                        return (
                          <tr key={log.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                            <td className="px-4 py-3 font-medium">
                              {TEMPLATE_LABELS[log.template_name] || log.template_name}
                            </td>
                            <td className="px-4 py-3 text-muted-foreground">{log.recipient_email}</td>
                            <td className="px-4 py-3">
                              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${sc.color}`}>
                                <Icon className="w-3 h-3" /> {sc.label}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-muted-foreground text-xs">
                              {new Date(log.created_at).toLocaleString('pt-BR')}
                            </td>
                            <td className="px-4 py-3 text-xs text-red-500 max-w-[200px] truncate">
                              {log.error_message || '—'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between px-4 py-3 border-t border-border">
                    <p className="text-xs text-muted-foreground">
                      Página {logsPage + 1} de {totalPages} ({logsCount} registros)
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setLogsPage(p => Math.max(0, p - 1))}
                        disabled={logsPage === 0}
                        className="p-1.5 rounded-lg border border-border hover:bg-muted disabled:opacity-30"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setLogsPage(p => Math.min(totalPages - 1, p + 1))}
                        disabled={logsPage >= totalPages - 1}
                        className="p-1.5 rounded-lg border border-border hover:bg-muted disabled:opacity-30"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        )}

        {/* ─── TEMPLATES TAB ─── */}
        {activeTab === 'templates' && (
          <motion.div {...fadeUp} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(TEMPLATE_LABELS).map(([key, label]) => (
                <div key={key} className="bg-card border border-border rounded-xl p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-foreground">{label}</h3>
                    <button
                      onClick={() => handlePreview(key)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 transition-colors"
                    >
                      <Eye className="w-3.5 h-3.5" /> Visualizar
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Campos: {(TEMPLATE_FIELDS[key] || []).map(f => f.label).join(', ')}
                  </p>
                </div>
              ))}
            </div>

            {/* Preview Modal */}
            <AnimatePresence>
              {previewHtml && (
                <motion.div
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
                  onClick={() => { setPreviewHtml(''); setPreviewTemplate(''); }}
                >
                  <motion.div
                    initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.95, opacity: 0 }}
                    className="bg-card rounded-2xl border border-border max-w-2xl w-full max-h-[85vh] overflow-hidden flex flex-col"
                    onClick={e => e.stopPropagation()}
                  >
                    <div className="p-4 border-b border-border flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold text-foreground">
                          {TEMPLATE_LABELS[previewTemplate] || previewTemplate}
                        </h3>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Assunto: {previewSubject}
                        </p>
                      </div>
                      <button
                        onClick={() => { setPreviewHtml(''); setPreviewTemplate(''); }}
                        className="text-muted-foreground hover:text-foreground text-sm"
                      >
                        ✕
                      </button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-1">
                      <iframe
                        srcDoc={previewHtml}
                        className="w-full h-[600px] border-0 rounded-lg"
                        title="Email Preview"
                        sandbox="allow-same-origin"
                      />
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}

        {/* ─── SEND TAB ─── */}
        {activeTab === 'send' && (
          <motion.div {...fadeUp} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Form */}
            <div className="bg-card border border-border rounded-xl p-6 space-y-5">
              <h3 className="font-semibold text-foreground flex items-center gap-2">
                <Send className="w-4 h-4 text-primary" /> Enviar Email Manual
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Template</label>
                  <select
                    value={sendTemplate}
                    onChange={e => setSendTemplate(e.target.value)}
                    className="w-full mt-1 px-3 py-2.5 rounded-lg bg-background border border-border text-sm"
                  >
                    {Object.entries(TEMPLATE_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Destinatário</label>
                  <input
                    type="email"
                    value={sendTo}
                    onChange={e => setSendTo(e.target.value)}
                    placeholder="email@exemplo.com"
                    className="w-full mt-1 px-3 py-2.5 rounded-lg bg-background border border-border text-sm"
                  />
                </div>

                {/* Dynamic fields */}
                {(TEMPLATE_FIELDS[sendTemplate] || []).map(field => (
                  <div key={field.key}>
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{field.label}</label>
                    <input
                      type="text"
                      value={sendData[field.key] || ''}
                      onChange={e => setSendData(prev => ({ ...prev, [field.key]: e.target.value }))}
                      placeholder={field.placeholder}
                      className="w-full mt-1 px-3 py-2.5 rounded-lg bg-background border border-border text-sm"
                    />
                  </div>
                ))}
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleSendPreview}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-border text-sm font-medium hover:bg-muted transition-colors"
                >
                  <Eye className="w-4 h-4" /> Pré-visualizar
                </button>
                <button
                  onClick={handleSend}
                  disabled={sending || !sendTo}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-colors"
                >
                  {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  {sending ? 'Enviando...' : 'Enviar'}
                </button>
              </div>
            </div>

            {/* Live Preview */}
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="p-4 border-b border-border">
                <h3 className="font-semibold text-foreground text-sm">Pré-visualização</h3>
              </div>
              {sendPreviewHtml ? (
                <iframe
                  srcDoc={sendPreviewHtml}
                  className="w-full h-[500px] border-0"
                  title="Send Preview"
                  sandbox="allow-same-origin"
                />
              ) : (
                <div className="flex items-center justify-center h-[500px] text-muted-foreground text-sm">
                  <div className="text-center space-y-2">
                    <Eye className="w-8 h-8 mx-auto opacity-30" />
                    <p>Clique em "Pré-visualizar" para ver o email</p>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </div>
    </AppLayout>
  );
}
