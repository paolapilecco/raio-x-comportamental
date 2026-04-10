import { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { AppLayout } from '@/components/AppLayout';
import {
  ArrowLeft, Calendar, Phone, FileText, TrendingUp, TrendingDown, Minus,
  Plus, Trash2, Save, Clock, AlertTriangle, Download, StickyNote, Bell, Activity,
  Link2, Copy, Check, Send,
} from 'lucide-react';
import {
  RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer, Legend,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts';
import { useAxisLabels } from '@/hooks/useAxisLabels';
import { usePersonGamification } from '@/hooks/usePersonGamification';
import { usePatternDefinitions } from '@/hooks/usePatternDefinitions';
import { generateDiagnosticPdf } from '@/lib/generatePdf';
import { generateLifeMapPdf } from '@/lib/generateLifeMapPdf';
import { generateEvolutionPdf } from '@/lib/generateEvolutionPdf';
import type { DiagnosticResult, IntensityLevel, PatternKey, PatternDefinition } from '@/types/diagnostic';

const fadeUp = { initial: { opacity: 0, y: 15 }, animate: { opacity: 1, y: 0 } };
const intensityLabel: Record<string, string> = { leve: 'Leve', moderado: 'Moderado', alto: 'Alto' };
const COLORS = ['hsl(var(--primary))', 'hsl(0,65%,52%)', 'hsl(38,72%,50%)', 'hsl(152,45%,45%)', 'hsl(270,50%,55%)'];

interface PersonData {
  id: string; name: string; cpf: string; phone: string | null;
  birth_date: string; age: number | null; is_active: boolean; created_at: string;
}

interface TestEntry {
  id: string; session_id: string; dominant_pattern: string; combined_title: string;
  intensity: string; profile_name: string; all_scores: any; created_at: string;
  test_module_id: string | null; state_summary: string;
}

interface Note {
  id: string; content: string; session_id: string | null; created_at: string; updated_at: string;
}

interface Reminder {
  id: string; test_module_id: string | null; remind_at: string; status: string;
}

interface TestModule { id: string; slug: string; name: string; }

export default function PatientDetail() {
  const { personId } = useParams<{ personId: string }>();
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const axisLabels = useAxisLabels();
  const { data: patternDefinitions } = usePatternDefinitions();
  const gamification = usePersonGamification(user?.id, personId);

  const [person, setPerson] = useState<PersonData | null>(null);
  const [history, setHistory] = useState<TestEntry[]>([]);
  const [modules, setModules] = useState<TestModule[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'history' | 'notes' | 'reminders'>('overview');
  const [newNote, setNewNote] = useState('');
  const [savingNote, setSavingNote] = useState(false);
  const [newReminderDate, setNewReminderDate] = useState('');
  const [newReminderModule, setNewReminderModule] = useState('');
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [generatingLink, setGeneratingLink] = useState<string | null>(null);
  const [invites, setInvites] = useState<{ id: string; token: string; test_module_id: string; status: string; expires_at: string }[]>([]);

  useEffect(() => {
    if (!user || !personId) return;
    loadAll();
  }, [user, personId]);

  const loadAll = async () => {
    setLoading(true);
    const [personRes, modulesRes] = await Promise.all([
      supabase.from('managed_persons').select('*').eq('id', personId!).eq('owner_id', user!.id).maybeSingle(),
      supabase.from('test_modules').select('id, slug, name').eq('is_active', true),
    ]);

    if (!personRes.data) { toast.error('Paciente não encontrado.'); navigate('/pessoas'); return; }
    setPerson(personRes.data as PersonData);
    setModules((modulesRes.data as TestModule[]) || []);

    // Fetch sessions for this person
    const { data: sessions } = await supabase
      .from('diagnostic_sessions')
      .select('id, completed_at, test_module_id')
      .eq('user_id', user!.id)
      .eq('person_id', personId!)
      .not('completed_at', 'is', null)
      .order('completed_at', { ascending: false });

    if (sessions && sessions.length > 0) {
      const { data: results } = await supabase
        .from('diagnostic_results')
        .select('*')
        .in('session_id', sessions.map(s => s.id));

      const enriched = (results || []).map(r => {
        const session = sessions.find(s => s.id === r.session_id);
        return { ...r, test_module_id: session?.test_module_id || null };
      }).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setHistory(enriched as TestEntry[]);
    }

    // Notes & reminders
    const [notesRes, remindersRes, invitesRes] = await Promise.all([
      supabase.from('professional_notes').select('*').eq('person_id', personId!).eq('owner_id', user!.id).order('created_at', { ascending: false }),
      supabase.from('retest_reminders').select('*').eq('person_id', personId!).eq('owner_id', user!.id).order('remind_at', { ascending: true }),
      supabase.from('test_invites' as any).select('id, token, test_module_id, status, expires_at').eq('person_id', personId!).eq('owner_id', user!.id).order('created_at', { ascending: false }),
    ]);
    setNotes((notesRes.data as Note[]) || []);
    setReminders((remindersRes.data as Reminder[]) || []);
    setInvites((invitesRes.data as any[]) || []);
    setLoading(false);
  };

  // Evolution data
  const evolutionData = useMemo(() => {
    if (history.length < 2) return [];
    const reversed = [...history].reverse();
    const allKeys = new Set<string>();
    reversed.forEach(e => ((e.all_scores as any[]) || []).forEach((s: any) => allKeys.add(s.key)));
    const topKeys = [...allKeys].slice(0, 5);

    return reversed.map((entry, i) => {
      const point: Record<string, any> = {
        date: new Date(entry.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }),
        index: i + 1,
      };
      ((entry.all_scores as any[]) || []).forEach((s: any) => {
        if (topKeys.includes(s.key)) point[axisLabels[s.key] || s.key] = s.percentage;
      });
      return point;
    });
  }, [history, axisLabels]);

  const topKeys = useMemo(() => {
    if (history.length === 0) return [];
    const latest = history[0];
    return ((latest.all_scores as any[]) || [])
      .sort((a: any, b: any) => b.percentage - a.percentage)
      .slice(0, 5)
      .map((s: any) => s.key);
  }, [history]);

  // Progress indicators
  const progressData = useMemo(() => {
    if (history.length < 2) return [];
    const latest = history[0];
    const oldest = history[history.length - 1];
    return ((latest.all_scores as any[]) || []).map((s: any) => {
      const oldScore = ((oldest.all_scores as any[]) || []).find((o: any) => o.key === s.key);
      const diff = s.percentage - (oldScore?.percentage || 0);
      return { key: s.key, label: axisLabels[s.key] || s.key, current: s.percentage, diff };
    }).sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff));
  }, [history, axisLabels]);

  // Critical alerts
  const criticalPatterns = useMemo(() => {
    if (history.length === 0) return [];
    const latest = history[0];
    return ((latest.all_scores as any[]) || [])
      .filter((s: any) => s.percentage >= 70)
      .sort((a: any, b: any) => b.percentage - a.percentage);
  }, [history]);

  const handleAddNote = async () => {
    if (!newNote.trim()) return;
    setSavingNote(true);
    const { error } = await supabase.from('professional_notes').insert({
      owner_id: user!.id, person_id: personId!, content: newNote.trim(),
    });
    if (error) toast.error('Erro ao salvar nota.');
    else { toast.success('Nota adicionada!'); setNewNote(''); await loadAll(); }
    setSavingNote(false);
  };

  const handleDeleteNote = async (noteId: string) => {
    const { error } = await supabase.from('professional_notes').delete().eq('id', noteId);
    if (error) toast.error('Erro ao excluir nota.');
    else { toast.success('Nota removida.'); await loadAll(); }
  };

  const handleAddReminder = async () => {
    if (!newReminderDate) { toast.error('Selecione uma data'); return; }
    const { error } = await supabase.from('retest_reminders').insert({
      owner_id: user!.id, person_id: personId!,
      test_module_id: newReminderModule || null, remind_at: newReminderDate,
    });
    if (error) toast.error('Erro ao criar lembrete.');
    else { toast.success('Lembrete criado!'); setNewReminderDate(''); setNewReminderModule(''); await loadAll(); }
  };

  const handleCompleteReminder = async (id: string) => {
    await supabase.from('retest_reminders').update({ status: 'completed' }).eq('id', id);
    toast.success('Lembrete concluído!');
    await loadAll();
  };

  const handleDeleteReminder = async (id: string) => {
    await supabase.from('retest_reminders').delete().eq('id', id);
    toast.success('Lembrete removido.');
    await loadAll();
  };

  const handleGenerateLink = async (testModuleId: string) => {
    setGeneratingLink(testModuleId);
    try {
      const { data, error } = await supabase.from('test_invites' as any).insert({
        owner_id: user!.id,
        person_id: personId!,
        test_module_id: testModuleId,
      }).select('token').single();

      if (error) { toast.error('Erro ao gerar link.'); return; }
      const link = `${window.location.origin}/t/${(data as any).token}`;
      await navigator.clipboard.writeText(link);
      setCopiedToken(testModuleId);
      toast.success('Link copiado para a área de transferência!');
      setTimeout(() => setCopiedToken(null), 3000);

      // Send test invite email to patient if they have a phone (used as contact)
      if (person?.phone) {
        const testModule = modules.find(m => m.id === testModuleId);
        supabase.functions.invoke('send-email', {
          body: {
            templateName: 'test-invite',
            to: person.phone, // phone field may store email for contact
            data: {
              patientName: person.name,
              professionalName: profile?.name || '',
              testName: testModule?.name || 'Diagnóstico',
              testLink: link,
            },
          },
        }).catch(() => {}); // non-blocking
      }

      await loadAll();
    } catch { toast.error('Erro ao gerar link.'); }
    finally { setGeneratingLink(null); }
  };

  const handleCopyExistingLink = async (token: string, moduleId: string) => {
    const link = `${window.location.origin}/t/${token}`;
    await navigator.clipboard.writeText(link);
    setCopiedToken(moduleId);
    toast.success('Link copiado!');
    setTimeout(() => setCopiedToken(null), 3000);
  };

  const handleDownloadPdf = async (entry: TestEntry) => {
    try {
      const { data: fullResult } = await supabase.from('diagnostic_results').select('*').eq('id', entry.id).maybeSingle();
      if (!fullResult) { toast.error('Erro ao carregar resultado.'); return; }

      const entryModule = modules.find(m => m.id === entry.test_module_id);
      if (entryModule?.slug === 'mapa-de-vida') {
        const prevEntry = history.find(h => h.test_module_id === entry.test_module_id && h.created_at < entry.created_at);
        generateLifeMapPdf(
          (fullResult.all_scores as any[]) || [], person?.name,
          prevEntry ? (prevEntry.all_scores as any[]) : undefined,
          new Date(entry.created_at).toLocaleDateString('pt-BR'),
          prevEntry ? new Date(prevEntry.created_at).toLocaleDateString('pt-BR') : undefined,
        );
        toast.success('PDF gerado!');
        return;
      }

      const dominantDef = patternDefinitions?.[fullResult.dominant_pattern as PatternKey];
      const secondaryDefs = (fullResult.secondary_patterns || []).map((k: string) => patternDefinitions?.[k as PatternKey]).filter(Boolean);
      const diagResult: DiagnosticResult = {
        dominantPattern: dominantDef!, secondaryPatterns: secondaryDefs as PatternDefinition[],
        intensity: fullResult.intensity as IntensityLevel,
        allScores: (fullResult.all_scores as any[]) || [],
        summary: fullResult.state_summary, mechanism: fullResult.mechanism,
        contradiction: fullResult.contradiction, impact: fullResult.impact || dominantDef?.impact || '',
        direction: fullResult.direction, combinedTitle: fullResult.combined_title,
        profileName: fullResult.profile_name, mentalState: fullResult.mental_state,
        triggers: fullResult.triggers || [], mentalTraps: fullResult.traps || [],
        selfSabotageCycle: fullResult.self_sabotage_cycle || [],
        blockingPoint: fullResult.blocking_point,
        lifeImpact: (fullResult.life_impact as any[]) || [],
        exitStrategy: (fullResult.exit_strategy as any[]) || [],
        corePain: fullResult.core_pain || dominantDef?.corePain || '',
        keyUnlockArea: fullResult.key_unlock_area || dominantDef?.keyUnlockArea || '',
        criticalDiagnosis: fullResult.critical_diagnosis || dominantDef?.criticalDiagnosis || '',
        whatNotToDo: fullResult.what_not_to_do || dominantDef?.whatNotToDo || [],
      };
      generateDiagnosticPdf(diagResult, person?.name);
      toast.success('PDF gerado!');
    } catch { toast.error('Erro ao gerar PDF.'); }
  };

  // Radar data for latest result
  const radarData = useMemo(() => {
    if (history.length === 0) return [];
    const latest = history[0];
    const prev = history.length > 1 ? history[1] : null;
    return ((latest.all_scores as any[]) || [])
      .sort((a: any, b: any) => b.percentage - a.percentage)
      .slice(0, 6)
      .map((s: any) => {
        const prevScore = prev ? ((prev.all_scores as any[]) || []).find((p: any) => p.key === s.key) : null;
        return { axis: axisLabels[s.key] || s.key, atual: s.percentage, anterior: prevScore?.percentage || 0 };
      });
  }, [history, axisLabels]);

  const tabs = [
    { key: 'overview' as const, label: 'Visão Geral', icon: Activity },
    { key: 'history' as const, label: 'Histórico', icon: Clock },
    { key: 'notes' as const, label: 'Notas', icon: StickyNote },
    { key: 'reminders' as const, label: 'Lembretes', icon: Bell },
  ];

  if (loading) {
    return (
      <AppLayout>
        <div className="max-w-5xl mx-auto px-6 py-10 space-y-6">
          {[1, 2, 3].map(i => <div key={i} className="h-40 bg-card rounded-xl border animate-pulse" />)}
        </div>
      </AppLayout>
    );
  }

  if (!person) return null;

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 md:px-10 py-6 sm:py-10 space-y-6">
        {/* Header */}
        <motion.div {...fadeUp} className="flex items-start gap-4">
          <button onClick={() => navigate('/pessoas')} className="text-muted-foreground hover:text-foreground mt-1">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl md:text-3xl font-serif">{person.name}</h1>
              <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                person.is_active ? 'bg-emerald-500/10 text-emerald-600' : 'bg-muted text-muted-foreground'
              }`}>
                {person.is_active ? 'Ativo' : 'Inativo'}
              </span>
            </div>
            <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground flex-wrap">
              <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> {person.age} anos</span>
              {person.phone && <span className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5" /> {person.phone}</span>}
              <span className="flex items-center gap-1.5"><FileText className="w-3.5 h-3.5" /> {history.length} teste(s)</span>
            </div>
          </div>
          {!gamification.loading && gamification.totalTests > 0 && (
            <button
              onClick={() => { generateEvolutionPdf(gamification, person.name); toast.success('PDF de evolução gerado!'); }}
              className="flex items-center gap-2 px-4 py-2 border border-border rounded-lg text-sm text-muted-foreground hover:bg-muted/30 shrink-0"
            >
              <Download className="w-4 h-4" /> Evolução PDF
            </button>
          )}
        </motion.div>

        {/* Critical Alerts */}
        {criticalPatterns.length > 0 && (
          <motion.div {...fadeUp} transition={{ delay: 0.05 }} className="bg-red-500/5 border border-red-500/20 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-4 h-4 text-red-500" />
              <span className="text-sm font-semibold text-red-600">Padrões em nível crítico</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {criticalPatterns.map((s: any) => (
                <span key={s.key} className="text-xs bg-red-500/10 text-red-600 px-3 py-1.5 rounded-full font-medium">
                  {axisLabels[s.key] || s.key}: {s.percentage}%
                </span>
              ))}
            </div>
          </motion.div>
        )}

        {/* Tabs */}
        <motion.div {...fadeUp} transition={{ delay: 0.1 }} className="flex gap-1 bg-muted/30 rounded-xl p-1">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab.key ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </motion.div>

        {/* Tab Content */}
        <AnimatePresence mode="wait">
          {activeTab === 'overview' && (
             <motion.div key="overview" {...fadeUp} className="space-y-6">
              {/* Gamification Section */}
              {!gamification.loading && gamification.totalTests > 0 && (
                <div className="space-y-4">
                  {/* Score Global + Retest Cycle */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Score Global */}
                    <div className="bg-card border rounded-xl p-5 flex items-center gap-5">
                      <div className="relative w-20 h-20 flex-shrink-0">
                        <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
                          <circle cx="40" cy="40" r="34" fill="none" stroke="hsl(var(--border))" strokeWidth="6" />
                          <circle cx="40" cy="40" r="34" fill="none" stroke="hsl(var(--primary))" strokeWidth="6"
                            strokeDasharray={`${2 * Math.PI * 34}`}
                            strokeDashoffset={`${2 * Math.PI * 34 * (1 - gamification.globalScore / 100)}`}
                            strokeLinecap="round" className="transition-all duration-700"
                          />
                        </svg>
                        <span className="absolute inset-0 flex items-center justify-center text-lg font-bold text-foreground">
                          {gamification.globalScore}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-foreground">Score Global</p>
                        <p className="text-xs text-muted-foreground mt-1">Autoconsciência × Consistência</p>
                        <div className="flex gap-2 mt-2 flex-wrap">
                          <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full">🧠 {gamification.scoreBreakdown.awareness}%</span>
                          <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full">🔥 {gamification.scoreBreakdown.consistency}%</span>
                          <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full">📊 {gamification.scoreBreakdown.coverage}%</span>
                        </div>
                      </div>
                    </div>

                    {/* Retest Cycle */}
                    <div className="bg-card border rounded-xl p-5 flex items-center gap-5">
                      <div className="relative w-20 h-20 flex-shrink-0">
                        <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
                          <circle cx="40" cy="40" r="34" fill="none" stroke="hsl(var(--border))" strokeWidth="6" />
                          <circle cx="40" cy="40" r="34" fill="none"
                            stroke={gamification.retestAvailable ? 'hsl(152,45%,42%)' : 'hsl(var(--primary))'}
                            strokeWidth="6"
                            strokeDasharray={`${2 * Math.PI * 34}`}
                            strokeDashoffset={`${2 * Math.PI * 34 * (1 - gamification.retestProgressPercent / 100)}`}
                            strokeLinecap="round" className="transition-all duration-700"
                          />
                        </svg>
                        <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-foreground">
                          {gamification.retestAvailable ? '✓' : `${gamification.daysUntilRetest}d`}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-foreground">Ciclo de Reteste</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {gamification.retestAvailable
                            ? 'Reteste disponível!'
                            : `${gamification.daysUntilRetest} dias restantes`}
                        </p>
                        {gamification.lastTestDate && (
                          <p className="text-[10px] text-muted-foreground/60 mt-1">
                            Último: {gamification.lastTestDate.toLocaleDateString('pt-BR')}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Streak, Nível, XP, Badges */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="bg-card border rounded-xl p-4 text-center">
                      <p className="text-2xl font-bold text-foreground">{gamification.currentStreak}</p>
                      <p className="text-xs text-muted-foreground mt-1">🔥 Streak (semanas)</p>
                    </div>
                    <div className="bg-card border rounded-xl p-4 text-center">
                      <p className="text-2xl font-bold text-foreground">{gamification.level}</p>
                      <p className="text-xs text-muted-foreground mt-1">📊 {gamification.levelName}</p>
                    </div>
                    <div className="bg-card border rounded-xl p-4 text-center">
                      <p className="text-2xl font-bold text-foreground">{gamification.totalXP}</p>
                      <p className="text-xs text-muted-foreground mt-1">⚡ XP Total</p>
                    </div>
                    <div className="bg-card border rounded-xl p-4 text-center">
                      <p className="text-2xl font-bold text-foreground">{gamification.unlockedBadges}/{gamification.badges.length}</p>
                      <p className="text-xs text-muted-foreground mt-1">🏆 Conquistas</p>
                    </div>
                  </div>

                  {/* Badges list */}
                  {gamification.badges.length > 0 && (
                    <div className="bg-card border rounded-xl p-5">
                      <h3 className="text-sm font-semibold text-foreground mb-3">Conquistas do Paciente</h3>
                      <div className="flex flex-wrap gap-2">
                        {gamification.badges.map(badge => (
                          <span key={badge.id} className={`text-xs px-3 py-1.5 rounded-full flex items-center gap-1.5 ${
                            badge.unlocked ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground opacity-50'
                          }`}>
                            {badge.emoji} {badge.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Score Comparisons */}
                  {gamification.scoreComparisons.length > 0 && (
                    <div className="bg-card border rounded-xl p-5">
                      <h3 className="text-sm font-semibold text-foreground mb-3">Comparação entre Últimos Testes</h3>
                      <div className="space-y-2">
                        {gamification.scoreComparisons.slice(0, 6).map(sc => (
                          <div key={sc.key} className="flex items-center gap-3">
                            <span className="text-xs text-muted-foreground w-28 truncate text-right">{sc.label}</span>
                            <div className="flex-1 h-2 rounded-full bg-secondary/50 overflow-hidden">
                              <div className="h-full rounded-full transition-all" style={{
                                width: `${sc.current}%`,
                                backgroundColor: sc.current >= 70 ? 'hsl(0,65%,52%)' : sc.current >= 40 ? 'hsl(38,72%,50%)' : 'hsl(152,45%,42%)',
                              }} />
                            </div>
                            <div className="flex items-center gap-1 w-14 justify-end">
                              {sc.delta > 0 ? <TrendingUp className="w-3 h-3 text-red-500" /> : sc.delta < 0 ? <TrendingDown className="w-3 h-3 text-emerald-600" /> : <Minus className="w-3 h-3 text-muted-foreground" />}
                              <span className={`text-xs font-semibold ${sc.delta > 0 ? 'text-red-500' : sc.delta < 0 ? 'text-emerald-600' : 'text-muted-foreground'}`}>
                                {sc.delta > 0 ? '+' : ''}{sc.delta}%
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* KPIs */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-card border rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-foreground">{history.length}</p>
                  <p className="text-xs text-muted-foreground mt-1">Testes realizados</p>
                </div>
                <div className="bg-card border rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-foreground">
                    {new Set(history.map(h => h.test_module_id).filter(Boolean)).size}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">Categorias</p>
                </div>
                <div className="bg-card border rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-foreground">{history[0]?.intensity ? intensityLabel[history[0].intensity] : '—'}</p>
                  <p className="text-xs text-muted-foreground mt-1">Intensidade atual</p>
                </div>
                <div className="bg-card border rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-foreground">{notes.length}</p>
                  <p className="text-xs text-muted-foreground mt-1">Notas</p>
                </div>
              </div>

              {/* Radar */}
              {radarData.length > 0 && (
                <div className="bg-card border rounded-xl p-6">
                  <h3 className="text-lg font-serif mb-4">Mapa Comportamental Atual</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <RadarChart data={radarData}>
                      <PolarGrid stroke="hsl(var(--border))" />
                      <PolarAngleAxis dataKey="axis" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                      <Radar name="Atual" dataKey="atual" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.15} strokeWidth={2} />
                      {history.length > 1 && (
                        <Radar name="Anterior" dataKey="anterior" stroke="hsl(var(--muted-foreground))" fill="none" strokeWidth={1.5} strokeDasharray="5 5" />
                      )}
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Evolution Chart */}
              {evolutionData.length > 0 && (
                <div className="bg-card border rounded-xl p-6">
                  <h3 className="text-lg font-serif mb-4">Evolução ao Longo do Tempo</h3>
                  <ResponsiveContainer width="100%" height={280}>
                    <LineChart data={evolutionData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} width={30} />
                      <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: 12 }} />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      {topKeys.map((key, i) => (
                        <Line key={key} type="monotone" dataKey={axisLabels[key] || key} stroke={COLORS[i % COLORS.length]} strokeWidth={2} dot={{ r: 3 }} connectNulls />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Progress Indicators */}
              {progressData.length > 0 && (
                <div className="bg-card border rounded-xl p-6">
                  <h3 className="text-lg font-serif mb-4">Progresso Geral</h3>
                  <p className="text-xs text-muted-foreground mb-4">
                    Comparação entre o primeiro e o último teste
                  </p>
                  <div className="space-y-3">
                    {progressData.map(item => (
                      <div key={item.key} className="flex items-center gap-3">
                        <span className="text-xs text-muted-foreground w-32 truncate text-right">{item.label}</span>
                        <div className="flex-1 h-2.5 rounded-full bg-secondary/50 overflow-hidden">
                          <div className="h-full rounded-full transition-all" style={{
                            width: `${item.current}%`,
                            backgroundColor: item.current >= 70 ? 'hsl(0,65%,52%)' : item.current >= 40 ? 'hsl(38,72%,50%)' : 'hsl(152,45%,42%)',
                          }} />
                        </div>
                        <div className="flex items-center gap-1 w-16 justify-end">
                          {item.diff > 0 ? <TrendingUp className="w-3 h-3 text-red-500" /> : item.diff < 0 ? <TrendingDown className="w-3 h-3 text-emerald-600" /> : <Minus className="w-3 h-3 text-muted-foreground" />}
                          <span className={`text-xs font-semibold ${item.diff > 0 ? 'text-red-500' : item.diff < 0 ? 'text-emerald-600' : 'text-muted-foreground'}`}>
                            {item.diff > 0 ? '+' : ''}{item.diff}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Test Catalog - Send Link */}
              <div className="bg-card border rounded-xl p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Send className="w-4 h-4 text-primary" />
                  <h3 className="text-sm font-semibold text-foreground">Enviar Teste para Paciente</h3>
                </div>
                <p className="text-xs text-muted-foreground mb-4">
                  Gere um link único para a paciente responder sem precisar de cadastro. O link expira em 7 dias e só pode ser usado uma vez.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {modules.map(mod => {
                    const pendingInvite = invites.find(inv => inv.test_module_id === mod.id && inv.status === 'pending' && new Date(inv.expires_at) > new Date());
                    const isGenerating = generatingLink === mod.id;
                    const isCopied = copiedToken === mod.id;

                    return (
                      <div key={mod.id} className="flex items-center justify-between gap-2 p-3 border rounded-lg bg-background">
                        <span className="text-xs font-medium text-foreground truncate flex-1">{mod.name}</span>
                        {pendingInvite ? (
                          <button
                            onClick={() => handleCopyExistingLink(pendingInvite.token, mod.id)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all shrink-0 ${
                              isCopied
                                ? 'bg-emerald-500/10 text-emerald-600'
                                : 'bg-primary/10 text-primary hover:bg-primary/20'
                            }`}
                          >
                            {isCopied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                            {isCopied ? 'Copiado!' : 'Copiar Link'}
                          </button>
                        ) : (
                          <button
                            onClick={() => handleGenerateLink(mod.id)}
                            disabled={isGenerating}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-all shrink-0 disabled:opacity-50"
                          >
                            {isGenerating ? (
                              <div className="w-3 h-3 border border-primary-foreground border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <Link2 className="w-3 h-3" />
                            )}
                            Gerar Link
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {history.length === 0 && (
                <div className="text-center py-12 bg-card border rounded-xl">
                  <Activity className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-muted-foreground text-sm">Nenhum teste realizado ainda.</p>
                  <p className="text-xs text-muted-foreground mt-1">Use os links acima para enviar testes à paciente.</p>
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'history' && (
            <motion.div key="history" {...fadeUp} className="space-y-4">
              {/* Evolution Timeline Chart */}
              {evolutionData.length > 0 && (
                <div className="bg-card border rounded-xl p-6">
                  <h3 className="text-lg font-serif mb-1">Evolução Temporal dos Scores</h3>
                  <p className="text-xs text-muted-foreground mb-4">Variação dos principais padrões ao longo dos testes realizados</p>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={evolutionData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} width={30} />
                      <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: 12 }} />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      {topKeys.map((key, i) => (
                        <Line key={key} type="monotone" dataKey={axisLabels[key] || key} stroke={COLORS[i % COLORS.length]} strokeWidth={2} dot={{ r: 4 }} connectNulls activeDot={{ r: 6 }} />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Progress comparison */}
              {progressData.length > 0 && (
                <div className="bg-card border rounded-xl p-6">
                  <h3 className="text-lg font-serif mb-1">Variação Acumulada</h3>
                  <p className="text-xs text-muted-foreground mb-4">Diferença entre o primeiro e o último teste</p>
                  <div className="space-y-3">
                    {progressData.map(item => (
                      <div key={item.key} className="flex items-center gap-3">
                        <span className="text-xs text-muted-foreground w-32 truncate text-right">{item.label}</span>
                        <div className="flex-1 h-2.5 rounded-full bg-secondary/50 overflow-hidden">
                          <div className="h-full rounded-full transition-all" style={{
                            width: `${item.current}%`,
                            backgroundColor: item.current >= 70 ? 'hsl(0,65%,52%)' : item.current >= 40 ? 'hsl(38,72%,50%)' : 'hsl(152,45%,42%)',
                          }} />
                        </div>
                        <div className="flex items-center gap-1 w-16 justify-end">
                          {item.diff > 0 ? <TrendingUp className="w-3 h-3 text-red-500" /> : item.diff < 0 ? <TrendingDown className="w-3 h-3 text-emerald-600" /> : <Minus className="w-3 h-3 text-muted-foreground" />}
                          <span className={`text-xs font-semibold ${item.diff > 0 ? 'text-red-500' : item.diff < 0 ? 'text-emerald-600' : 'text-muted-foreground'}`}>
                            {item.diff > 0 ? '+' : ''}{item.diff}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Test list */}
              {history.length === 0 ? (
                <div className="text-center py-12 bg-card border rounded-xl">
                  <p className="text-muted-foreground text-sm">Nenhum teste realizado.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <h3 className="text-lg font-serif">Todos os Testes</h3>
                  {history.map((entry, i) => {
                    const mod = modules.find(m => m.id === entry.test_module_id);
                    return (
                      <motion.div key={entry.id} {...fadeUp} transition={{ delay: i * 0.03 }} className="bg-card border rounded-xl p-5">
                        <div className="flex items-start justify-between">
                          <div className="space-y-1 flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              {mod && <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">{mod.name}</span>}
                              <span className={`text-xs px-2 py-0.5 rounded-full ${
                                entry.intensity === 'alto' ? 'bg-red-500/10 text-red-600' :
                                entry.intensity === 'moderado' ? 'bg-amber-500/10 text-amber-600' :
                                'bg-emerald-500/10 text-emerald-600'
                              }`}>{intensityLabel[entry.intensity]}</span>
                            </div>
                            <p className="text-sm font-medium text-foreground">{entry.combined_title}</p>
                            <p className="text-xs text-muted-foreground">{entry.profile_name}</p>
                            <p className="text-xs text-muted-foreground/60 mt-1">
                              <Calendar className="w-3 h-3 inline mr-1" />
                              {new Date(entry.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
                            </p>
                          </div>
                          <button onClick={() => handleDownloadPdf(entry)} className="text-muted-foreground hover:text-primary transition-colors p-2">
                            <Download className="w-4 h-4" />
                          </button>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'notes' && (
            <motion.div key="notes" {...fadeUp} className="space-y-4">
              {/* Add note */}
              <div className="bg-card border rounded-xl p-5 space-y-3">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Plus className="w-4 h-4 text-primary" /> Nova Nota
                </h3>
                <textarea
                  value={newNote} onChange={e => setNewNote(e.target.value)}
                  placeholder="Adicione observações sobre este paciente..."
                  className="w-full h-24 rounded-lg border border-border/40 bg-background/60 px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
                  maxLength={2000}
                />
                <button onClick={handleAddNote} disabled={savingNote || !newNote.trim()} className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50 flex items-center gap-2">
                  <Save className="w-3.5 h-3.5" /> {savingNote ? 'Salvando...' : 'Salvar nota'}
                </button>
              </div>

              {notes.length === 0 ? (
                <div className="text-center py-8 bg-card border rounded-xl">
                  <StickyNote className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Nenhuma nota ainda.</p>
                </div>
              ) : notes.map(note => (
                <div key={note.id} className="bg-card border rounded-xl p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <p className="text-sm text-foreground whitespace-pre-wrap">{note.content}</p>
                      <p className="text-xs text-muted-foreground mt-2">
                        {new Date(note.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    <button onClick={() => handleDeleteNote(note.id)} className="text-muted-foreground hover:text-red-500 transition-colors p-1">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </motion.div>
          )}

          {activeTab === 'reminders' && (
            <motion.div key="reminders" {...fadeUp} className="space-y-4">
              {/* Add reminder */}
              <div className="bg-card border rounded-xl p-5 space-y-3">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Bell className="w-4 h-4 text-primary" /> Novo Lembrete de Reteste
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Teste (opcional)</label>
                    <select value={newReminderModule} onChange={e => setNewReminderModule(e.target.value)}
                      className="w-full h-10 rounded-lg border border-border/40 bg-background/60 px-3 text-sm">
                      <option value="">Qualquer teste</option>
                      {modules.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Data do lembrete</label>
                    <input type="date" value={newReminderDate} onChange={e => setNewReminderDate(e.target.value)}
                      min={new Date().toISOString().split('T')[0]}
                      className="w-full h-10 rounded-lg border border-border/40 bg-background/60 px-3 text-sm" />
                  </div>
                  <div className="flex items-end">
                    <button onClick={handleAddReminder} className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 w-full h-10">
                      Criar
                    </button>
                  </div>
                </div>
              </div>

              {reminders.length === 0 ? (
                <div className="text-center py-8 bg-card border rounded-xl">
                  <Bell className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Nenhum lembrete agendado.</p>
                </div>
              ) : reminders.map(r => {
                const mod = modules.find(m => m.id === r.test_module_id);
                const isPast = new Date(r.remind_at) < new Date();
                return (
                  <div key={r.id} className={`bg-card border rounded-xl p-5 flex items-center justify-between ${
                    r.status === 'completed' ? 'opacity-50' : isPast ? 'border-amber-500/30' : ''
                  }`}>
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-foreground">
                        {mod?.name || 'Qualquer teste'}
                        {isPast && r.status === 'pending' && <span className="ml-2 text-xs text-amber-600">⚠ Atrasado</span>}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(r.remind_at + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {r.status === 'pending' && (
                        <button onClick={() => handleCompleteReminder(r.id)} className="text-xs bg-emerald-500/10 text-emerald-600 px-3 py-1.5 rounded-lg hover:bg-emerald-500/20">
                          ✓ Concluído
                        </button>
                      )}
                      <button onClick={() => handleDeleteReminder(r.id)} className="text-muted-foreground hover:text-red-500 p-1">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </AppLayout>
  );
}
