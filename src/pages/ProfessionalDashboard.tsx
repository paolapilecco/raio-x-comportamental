import { useEffect, useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/AppLayout';
import { useAxisLabels } from '@/hooks/useAxisLabels';
import {
  Users, Activity, AlertTriangle, Bell, TrendingUp, TrendingDown, Minus,
  FileText, ArrowRight, Download, UserCheck, UserX, Calendar, RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';

const fadeUp = { initial: { opacity: 0, y: 15 }, animate: { opacity: 1, y: 0 } };

const RETEST_INTERVAL_DAYS = 15;

interface PersonSummary {
  id: string; name: string; is_active: boolean; age: number | null;
  testCount: number; latestIntensity: string | null; latestDate: string | null;
  criticalCount: number; hasPendingReminder: boolean;
  daysSinceLastTest: number | null; retestAvailable: boolean;
}

export default function ProfessionalDashboard() {
  const { user, planType, isSuperAdmin } = useAuth();
  const navigate = useNavigate();
  const axisLabels = useAxisLabels();
  const [persons, setPersons] = useState<PersonSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalTests, setTotalTests] = useState(0);
  const [pendingReminders, setPendingReminders] = useState(0);

  useEffect(() => {
    if (!user) return;
    loadDashboard();
  }, [user]);

  const loadDashboard = async () => {
    setLoading(true);

    // Fetch persons
    const { data: personsData } = await supabase
      .from('managed_persons')
      .select('*')
      .eq('owner_id', user!.id)
      .order('is_active', { ascending: false })
      .order('name');

    if (!personsData) { setLoading(false); return; }

    // Fetch all sessions for this user
    const { data: sessions } = await supabase
      .from('diagnostic_sessions')
      .select('id, person_id, completed_at, test_module_id')
      .eq('user_id', user!.id)
      .not('completed_at', 'is', null);

    const completedSessions = sessions || [];

    // Fetch results
    let allResults: any[] = [];
    if (completedSessions.length > 0) {
      const { data: results } = await supabase
        .from('diagnostic_results')
        .select('session_id, intensity, all_scores, created_at')
        .in('session_id', completedSessions.map(s => s.id));
      allResults = results || [];
    }

    // Fetch reminders
    const { data: remindersData } = await supabase
      .from('retest_reminders')
      .select('person_id, status')
      .eq('owner_id', user!.id)
      .eq('status', 'pending');

    const pendingByPerson = new Set((remindersData || []).map(r => r.person_id));
    setPendingReminders(remindersData?.length || 0);

    // Build summary
    const summaries: PersonSummary[] = personsData.map((p: any) => {
      const personSessions = completedSessions.filter(s => s.person_id === p.id);
      const personResults = allResults
        .filter(r => personSessions.some(s => s.id === r.session_id))
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      const latest = personResults[0];
      const criticalCount = latest
        ? ((latest.all_scores as any[]) || []).filter((s: any) => s.percentage >= 70).length
        : 0;

      const daysSinceLastTest = latest
        ? Math.floor((Date.now() - new Date(latest.created_at).getTime()) / 86400000)
        : null;

      return {
        id: p.id, name: p.name, is_active: p.is_active, age: p.age,
        testCount: personResults.length,
        latestIntensity: latest?.intensity || null,
        latestDate: latest?.created_at || null,
        criticalCount,
        hasPendingReminder: pendingByPerson.has(p.id),
        daysSinceLastTest,
        retestAvailable: daysSinceLastTest !== null && daysSinceLastTest >= RETEST_INTERVAL_DAYS,
      };
    });

    setPersons(summaries);
    setTotalTests(allResults.length);
    setLoading(false);
  };

  const activePersons = persons.filter(p => p.is_active);
  const inactivePersons = persons.filter(p => !p.is_active);
  const criticalPersons = persons.filter(p => p.criticalCount > 0 && p.is_active);
  const retestPersons = persons.filter(p => p.retestAvailable && p.is_active);
  const intensityLabel: Record<string, string> = { leve: 'Leve', moderado: 'Moderado', alto: 'Alto' };
  const intensityLabel: Record<string, string> = { leve: 'Leve', moderado: 'Moderado', alto: 'Alto' };

  const handleExportCSV = () => {
    const header = 'Nome,Status,Idade,Testes,Intensidade Atual,Última Data,Padrões Críticos\n';
    const rows = persons.map(p =>
      `"${p.name}",${p.is_active ? 'Ativo' : 'Inativo'},${p.age || ''},${p.testCount},${p.latestIntensity ? intensityLabel[p.latestIntensity] : ''},${p.latestDate ? new Date(p.latestDate).toLocaleDateString('pt-BR') : ''},${p.criticalCount}`
    ).join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `pacientes_${new Date().toISOString().split('T')[0]}.csv`;
    a.click(); URL.revokeObjectURL(url);
    toast.success('CSV exportado!');
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="max-w-5xl mx-auto px-6 py-10 space-y-6">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-24 bg-card rounded-xl border animate-pulse" />)}
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 md:px-10 py-6 sm:py-10 space-y-6">
        {/* Header */}
        <motion.div {...fadeUp} className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-serif flex items-center gap-3">
              <Activity className="w-6 h-6 text-primary" />
              Painel Profissional
            </h1>
            <p className="text-sm text-muted-foreground mt-1">Visão geral dos seus pacientes</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={() => navigate('/comparar-pacientes')} className="flex items-center gap-2 px-4 py-2 border border-border rounded-lg text-sm text-muted-foreground hover:bg-muted/30">
              <Users className="w-4 h-4" /> Comparar
            </button>
            <button onClick={handleExportCSV} className="flex items-center gap-2 px-4 py-2 border border-border rounded-lg text-sm text-muted-foreground hover:bg-muted/30">
              <Download className="w-4 h-4" /> Exportar CSV
            </button>
          </div>
        </motion.div>

        {/* KPIs */}
        <motion.div {...fadeUp} transition={{ delay: 0.05 }} className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-card border rounded-xl p-4 text-center">
            <Users className="w-5 h-5 text-primary mx-auto mb-1" />
            <p className="text-2xl font-bold">{activePersons.length}</p>
            <p className="text-xs text-muted-foreground">Pacientes ativos</p>
          </div>
          <div className="bg-card border rounded-xl p-4 text-center">
            <FileText className="w-5 h-5 text-primary mx-auto mb-1" />
            <p className="text-2xl font-bold">{totalTests}</p>
            <p className="text-xs text-muted-foreground">Testes realizados</p>
          </div>
          <div className="bg-card border rounded-xl p-4 text-center">
            <AlertTriangle className="w-5 h-5 text-red-500 mx-auto mb-1" />
            <p className="text-2xl font-bold text-red-600">{criticalPersons.length}</p>
            <p className="text-xs text-muted-foreground">Atenção crítica</p>
          </div>
          <div className="bg-card border rounded-xl p-4 text-center">
            <Bell className="w-5 h-5 text-amber-500 mx-auto mb-1" />
            <p className="text-2xl font-bold text-amber-600">{pendingReminders}</p>
            <p className="text-xs text-muted-foreground">Retestes pendentes</p>
          </div>
        </motion.div>

        {/* Critical alerts */}
        {criticalPersons.length > 0 && (
          <motion.div {...fadeUp} transition={{ delay: 0.1 }} className="bg-red-500/5 border border-red-500/20 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-red-600 flex items-center gap-2 mb-3">
              <AlertTriangle className="w-4 h-4" /> Pacientes que precisam de atenção
            </h3>
            <div className="space-y-2">
              {criticalPersons.map(p => (
                <button key={p.id} onClick={() => navigate(`/paciente/${p.id}`)}
                  className="w-full text-left flex items-center justify-between p-3 rounded-lg bg-red-500/5 hover:bg-red-500/10 transition-colors">
                  <div>
                    <span className="text-sm font-medium text-foreground">{p.name}</span>
                    <span className="text-xs text-red-500 ml-2">{p.criticalCount} padrão(ões) ≥70%</span>
                  </div>
                  <ArrowRight className="w-4 h-4 text-muted-foreground" />
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {/* Patient list */}
        <motion.div {...fadeUp} transition={{ delay: 0.15 }}>
          <h3 className="text-lg font-serif mb-3">Pacientes</h3>
          <div className="space-y-2">
            {activePersons.map((p, i) => (
              <motion.button
                key={p.id} {...fadeUp} transition={{ delay: 0.15 + i * 0.02 }}
                onClick={() => navigate(`/paciente/${p.id}`)}
                className="w-full text-left bg-card border rounded-xl p-4 hover:border-primary/20 transition-all flex items-center justify-between"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <UserCheck className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-foreground truncate">{p.name}</p>
                      {p.hasPendingReminder && <Bell className="w-3 h-3 text-amber-500" />}
                      {p.criticalCount > 0 && <AlertTriangle className="w-3 h-3 text-red-500" />}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span>{p.testCount} teste(s)</span>
                      {p.latestIntensity && <span className={p.latestIntensity === 'alto' ? 'text-red-500' : ''}>{intensityLabel[p.latestIntensity]}</span>}
                      {p.latestDate && <span>{new Date(p.latestDate).toLocaleDateString('pt-BR')}</span>}
                    </div>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" />
              </motion.button>
            ))}

            {inactivePersons.length > 0 && (
              <>
                <p className="text-xs text-muted-foreground mt-4 mb-2">Inativos</p>
                {inactivePersons.map(p => (
                  <button key={p.id} onClick={() => navigate(`/paciente/${p.id}`)}
                    className="w-full text-left bg-card border rounded-xl p-4 opacity-50 hover:opacity-70 transition-all flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <UserX className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium text-foreground">{p.name}</p>
                        <p className="text-xs text-muted-foreground">{p.testCount} teste(s)</p>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-muted-foreground" />
                  </button>
                ))}
              </>
            )}
          </div>
        </motion.div>

        {persons.length === 0 && (
          <div className="text-center py-12">
            <Users className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">Nenhum paciente cadastrado.</p>
            <button onClick={() => navigate('/pessoas')} className="mt-3 px-5 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90">
              Cadastrar paciente
            </button>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
