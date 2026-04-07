import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import {
  RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell,
} from 'recharts';
import { ArrowLeft, Calendar, TrendingUp, TrendingDown, Minus, RefreshCw, Filter, Download } from 'lucide-react';
import { toast } from 'sonner';
import { AppLayout } from '@/components/AppLayout';
import { DiagnosticHistorySkeleton } from '@/components/skeletons/DiagnosticHistorySkeleton';
import { generateDiagnosticPdf } from '@/lib/generatePdf';
import { usePatternDefinitions } from '@/hooks/usePatternDefinitions';
import { DiagnosticResult, IntensityLevel, PatternKey } from '@/types/diagnostic';

interface HistoryEntry {
  id: string;
  session_id: string;
  dominant_pattern: string;
  combined_title: string;
  intensity: string;
  profile_name: string;
  all_scores: any;
  created_at: string;
  test_module_id: string | null;
}

interface TestModule {
  id: string;
  slug: string;
  name: string;
}

const intensityLabel: Record<string, string> = { leve: 'Leve', moderado: 'Moderado', alto: 'Alto' };
const intensityValue: Record<string, number> = { leve: 1, moderado: 2, alto: 3 };

const fadeUp = { initial: { opacity: 0, y: 15 }, animate: { opacity: 1, y: 0 } };

const DiagnosticHistory = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [modules, setModules] = useState<TestModule[]>([]);
  const [selectedModule, setSelectedModule] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const patternDefinitions = usePatternDefinitions();

  useEffect(() => {
    if (!user) return;

    const fetchHistory = async () => {
      try {
        const [sessionsRes, modulesRes] = await Promise.all([
          supabase
            .from('diagnostic_sessions')
            .select('id, completed_at, test_module_id')
            .eq('user_id', user.id)
            .not('completed_at', 'is', null)
            .order('completed_at', { ascending: false }),
          supabase.from('test_modules').select('id, slug, name').eq('is_active', true),
        ]);

        if (sessionsRes.error) {
          console.error('Error fetching sessions:', sessionsRes.error);
          toast.error('Erro ao carregar sessões.');
        }
        if (modulesRes.error) {
          console.error('Error fetching modules:', modulesRes.error);
          toast.error('Erro ao carregar módulos.');
        }

        setModules((modulesRes.data as TestModule[]) || []);

        const sessions = sessionsRes.data || [];
        if (sessions.length === 0) { setLoading(false); return; }

        const { data: results, error: resErr } = await supabase
          .from('diagnostic_results')
          .select('*')
          .in('session_id', sessions.map(s => s.id));

        if (resErr) {
          console.error('Error fetching results:', resErr);
          toast.error('Erro ao carregar resultados.');
        }

        // Merge test_module_id into results
        const enriched = (results || []).map(r => {
          const session = sessions.find(s => s.id === r.session_id);
          return { ...r, test_module_id: session?.test_module_id || null };
        });

        setHistory(enriched);
      } catch (err) {
        console.error('Error loading history:', err);
        toast.error('Erro ao carregar histórico.');
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, [user]);

  const filtered = selectedModule === 'all'
    ? history
    : history.filter(h => h.test_module_id === selectedModule);

  const latest = filtered[0];
  const previous = filtered.length > 1 ? filtered[1] : null;

  // Per-area evolution data
  const evolutionData = latest && previous
    ? ((latest.all_scores as any[]) || []).map((s: any) => {
        const prevScore = ((previous.all_scores as any[]) || []).find((ps: any) => ps.key === s.key);
        const prev = prevScore?.percentage || 0;
        const curr = s.percentage;
        const diff = curr - prev;
        return {
          area: s.label || s.key,
          antes: prev,
          depois: curr,
          diff,
        };
      }).sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff))
    : [];

  const radarData = latest
    ? ((latest.all_scores as any[]) || []).map((s: any) => {
        const prevScore = previous ? ((previous.all_scores as any[]) || []).find((ps: any) => ps.key === s.key) : null;
        return {
          axis: s.label || s.key,
          atual: s.percentage,
          anterior: prevScore?.percentage || 0,
        };
      })
    : [];

  const getIntensityTrend = () => {
    if (!latest || !previous) return null;
    const curr = intensityValue[latest.intensity] || 0;
    const prev = intensityValue[previous.intensity] || 0;
    if (curr < prev) return 'improved';
    if (curr > prev) return 'worsened';
    return 'stable';
  };

  const trend = getIntensityTrend();

  // Unique modules that have results
  const modulesWithResults = modules.filter(m => history.some(h => h.test_module_id === m.id));

  if (loading) {
    return <DiagnosticHistorySkeleton />;
  }

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 md:px-10 py-6 sm:py-10 space-y-6 sm:space-y-8">
        {/* Header */}
        <motion.div {...fadeUp} transition={{ duration: 0.4 }} className="flex items-center gap-4">
          <button onClick={() => navigate('/dashboard')} className="text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-foreground">Evolução</h1>
            <p className="text-sm text-muted-foreground mt-1">Compare seus resultados ao longo do tempo</p>
          </div>
        </motion.div>

        {/* Module filter */}
        {modulesWithResults.length > 0 && (
          <motion.div {...fadeUp} transition={{ delay: 0.05 }} className="flex items-center gap-2 flex-wrap">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <button
              onClick={() => setSelectedModule('all')}
              className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-all ${
                selectedModule === 'all' ? 'bg-primary text-primary-foreground' : 'bg-secondary/50 text-muted-foreground hover:bg-secondary'
              }`}
            >
              Todos
            </button>
            {modulesWithResults.map(m => (
              <button
                key={m.id}
                onClick={() => setSelectedModule(m.id)}
                className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-all ${
                  selectedModule === m.id ? 'bg-primary text-primary-foreground' : 'bg-secondary/50 text-muted-foreground hover:bg-secondary'
                }`}
              >
                {m.name}
              </button>
            ))}
          </motion.div>
        )}

        {filtered.length === 0 ? (
          <motion.div {...fadeUp} transition={{ delay: 0.1 }} className="text-center py-16">
            <p className="text-muted-foreground text-sm">Nenhuma leitura realizada ainda.</p>
            <button
              onClick={() => navigate('/dashboard')}
              className="mt-4 px-6 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:brightness-90 transition-all"
            >
              Iniciar primeira leitura
            </button>
          </motion.div>
        ) : (
          <>
            {/* Comparison radar */}
            {previous && (
              <motion.div {...fadeUp} transition={{ delay: 0.05 }} className="bg-card rounded-2xl border border-border/30 p-6 md:p-8">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-foreground">Antes vs Depois</h3>
                  <div className="flex items-center gap-3">
                    {trend === 'improved' && (
                      <span className="flex items-center gap-1.5 text-xs text-emerald-600">
                        <TrendingDown className="w-3.5 h-3.5" /> Intensidade reduziu
                      </span>
                    )}
                    {trend === 'worsened' && (
                      <span className="flex items-center gap-1.5 text-xs text-red-500">
                        <TrendingUp className="w-3.5 h-3.5" /> Intensidade aumentou
                      </span>
                    )}
                    {trend === 'stable' && (
                      <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Minus className="w-3.5 h-3.5" /> Estável
                      </span>
                    )}
                  </div>
                </div>

                {/* Radar chart */}
                <ResponsiveContainer width="100%" height={300}>
                  <RadarChart data={radarData}>
                    <PolarGrid stroke="hsl(var(--border))" />
                    <PolarAngleAxis dataKey="axis" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                    <Radar name="Atual" dataKey="atual" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.15} strokeWidth={2} />
                    <Radar name="Anterior" dataKey="anterior" stroke="hsl(var(--muted-foreground))" fill="hsl(var(--muted-foreground))" fillOpacity={0.05} strokeWidth={1.5} strokeDasharray="5 5" />
                    <Legend />
                  </RadarChart>
                </ResponsiveContainer>
              </motion.div>
            )}

            {/* Per-area evolution bars */}
            {previous && evolutionData.length > 0 && (
              <motion.div {...fadeUp} transition={{ delay: 0.1 }} className="bg-card rounded-2xl border border-border/30 p-6 md:p-8">
                <h3 className="text-lg font-semibold text-foreground mb-2">Evolução por Área</h3>
                <p className="text-xs text-muted-foreground mb-6">
                  Variação entre a leitura anterior ({new Date(previous.created_at).toLocaleDateString('pt-BR')}) e a atual ({new Date(latest.created_at).toLocaleDateString('pt-BR')})
                </p>
                <div className="space-y-3">
                  {evolutionData.map((item, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground w-28 truncate text-right">{item.area}</span>
                      <div className="flex-1 flex items-center gap-2">
                        <div className="flex-1 h-2.5 rounded-full bg-secondary/60 relative overflow-hidden">
                          {/* Previous (faded) */}
                          <div
                            className="absolute inset-y-0 left-0 rounded-full bg-muted-foreground/20"
                            style={{ width: `${item.antes}%` }}
                          />
                          {/* Current */}
                          <div
                            className="absolute inset-y-0 left-0 rounded-full transition-all duration-500"
                            style={{
                              width: `${item.depois}%`,
                              backgroundColor: item.diff > 0
                                ? (item.depois > 60 ? 'hsl(0, 65%, 52%)' : 'hsl(var(--primary))')
                                : item.diff < 0
                                  ? 'hsl(152, 45%, 42%)'
                                  : 'hsl(var(--muted-foreground))',
                            }}
                          />
                        </div>
                        <span className={`text-xs font-semibold w-12 text-right ${
                          item.diff > 0 ? 'text-red-500' : item.diff < 0 ? 'text-emerald-600' : 'text-muted-foreground'
                        }`}>
                          {item.diff > 0 ? `+${item.diff}` : item.diff}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Single result info (no comparison yet) */}
            {!previous && filtered.length === 1 && (
              <motion.div {...fadeUp} transition={{ delay: 0.05 }} className="bg-card rounded-2xl border border-border/30 p-6 md:p-8 text-center">
                <RefreshCw className="w-8 h-8 text-muted-foreground/30 mx-auto mb-4" />
                <h3 className="text-base font-semibold text-foreground mb-2">Primeira leitura registrada</h3>
                <p className="text-sm text-muted-foreground max-w-md mx-auto leading-relaxed mb-4">
                  Refaça esta leitura após um período para ver sua evolução — antes vs depois, área por área.
                </p>
                <div className="bg-secondary/30 rounded-xl p-4 max-w-sm mx-auto">
                  <p className="text-xs text-muted-foreground font-medium mb-1">Perfil atual</p>
                  <p className="text-sm font-semibold text-foreground">{latest.profile_name}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {intensityLabel[latest.intensity]} · {new Date(latest.created_at).toLocaleDateString('pt-BR')}
                  </p>
                </div>
              </motion.div>
            )}

            {/* All entries */}
            <motion.div {...fadeUp} transition={{ delay: 0.15 }} className="space-y-4">
              <h3 className="text-lg font-semibold text-foreground">Todas as Leituras</h3>
              {filtered.map((entry, i) => {
                const moduleName = modules.find(m => m.id === entry.test_module_id)?.name;
                return (
                  <div key={entry.id} className="bg-card rounded-2xl border border-border/30 p-5 flex items-center justify-between hover:border-primary/15 transition-colors">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-foreground text-sm">{entry.combined_title}</span>
                        {i === 0 && <span className="text-[10px] tracking-wider uppercase bg-primary/10 text-primary px-2 py-0.5 rounded-full font-semibold">Mais recente</span>}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(entry.created_at).toLocaleDateString('pt-BR')}
                        </span>
                        <span>{intensityLabel[entry.intensity] || entry.intensity}</span>
                        {moduleName && <span className="text-primary/60">{moduleName}</span>}
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground/50 italic hidden sm:block">{entry.profile_name}</span>
                  </div>
                );
              })}
            </motion.div>

            {/* CTA */}
            <motion.div {...fadeUp} transition={{ delay: 0.2 }} className="text-center pb-8">
              <button
                onClick={() => navigate('/dashboard')}
                className="px-8 py-3 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:brightness-90 transition-all active:scale-[0.97]"
              >
                Refazer uma leitura
              </button>
            </motion.div>
          </>
        )}
      </div>
    </AppLayout>
  );
};

export default DiagnosticHistory;
