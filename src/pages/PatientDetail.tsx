import { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { AppLayout } from '@/components/AppLayout';
import { ArrowLeft, Calendar, Phone, FileText, Download, AlertTriangle, Activity, Clock, StickyNote, Bell } from 'lucide-react';
import { useAxisLabels } from '@/hooks/useAxisLabels';
import { usePersonGamification } from '@/hooks/usePersonGamification';
import { usePatternDefinitions } from '@/hooks/usePatternDefinitions';
import { generateDiagnosticPdf, PdfEvolutionData } from '@/lib/generatePdf';
import { generateLifeMapPdf } from '@/lib/generateLifeMapPdf';
import { generateEvolutionPdf } from '@/lib/generateEvolutionPdf';
import type { DiagnosticResult, IntensityLevel, PatternKey, PatternDefinition } from '@/types/diagnostic';
import type { PersonData, TestEntry, TestModule, Note, Reminder, InviteData } from '@/components/patient/types';
import { fadeUp } from '@/components/patient/types';
import { OverviewTab } from '@/components/patient/OverviewTab';
import { HistoryTab } from '@/components/patient/HistoryTab';
import { NotesTab } from '@/components/patient/NotesTab';
import { RemindersTab } from '@/components/patient/RemindersTab';

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
  const [invites, setInvites] = useState<InviteData[]>([]);

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
        owner_id: user!.id, person_id: personId!, test_module_id: testModuleId,
      }).select('token').single();

      if (error) { toast.error('Erro ao gerar link.'); return; }
      const link = `${window.location.origin}/t/${(data as any).token}`;
      await navigator.clipboard.writeText(link);
      setCopiedToken(testModuleId);
      toast.success('Link copiado para a área de transferência!');
      setTimeout(() => setCopiedToken(null), 3000);

      if (person?.phone) {
        const testModule = modules.find(m => m.id === testModuleId);
        supabase.functions.invoke('send-email', {
          body: {
            templateName: 'test-invite',
            to: person.phone,
            data: {
              patientName: person.name,
              professionalName: profile?.name || '',
              testName: testModule?.name || 'Diagnóstico',
              testLink: link,
            },
          },
        }).catch(() => {});
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
            <OverviewTab
              history={history}
              modules={modules}
              invites={invites}
              axisLabels={axisLabels}
              gamification={gamification}
              copiedToken={copiedToken}
              generatingLink={generatingLink}
              onGenerateLink={handleGenerateLink}
              onCopyExistingLink={handleCopyExistingLink}
            />
          )}
          {activeTab === 'history' && (
            <HistoryTab
              history={history}
              modules={modules}
              axisLabels={axisLabels}
              onDownloadPdf={handleDownloadPdf}
            />
          )}
          {activeTab === 'notes' && (
            <NotesTab
              notes={notes}
              newNote={newNote}
              savingNote={savingNote}
              onNewNoteChange={setNewNote}
              onAddNote={handleAddNote}
              onDeleteNote={handleDeleteNote}
            />
          )}
          {activeTab === 'reminders' && (
            <RemindersTab
              reminders={reminders}
              modules={modules}
              newReminderDate={newReminderDate}
              newReminderModule={newReminderModule}
              onReminderDateChange={setNewReminderDate}
              onReminderModuleChange={setNewReminderModule}
              onAddReminder={handleAddReminder}
              onCompleteReminder={handleCompleteReminder}
              onDeleteReminder={handleDeleteReminder}
            />
          )}
        </AnimatePresence>
      </div>
    </AppLayout>
  );
}
