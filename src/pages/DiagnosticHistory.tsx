import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer, Legend } from 'recharts';
import { ArrowLeft, Calendar, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { patternDefinitions } from '@/data/patterns';
import type { PatternKey } from '@/types/diagnostic';

interface HistoryEntry {
  id: string;
  session_id: string;
  dominant_pattern: string;
  combined_title: string;
  intensity: string;
  profile_name: string;
  all_scores: any;
  created_at: string;
}

const intensityLabel: Record<string, string> = { leve: 'Leve', moderado: 'Moderado', alto: 'Alto' };
const intensityValue: Record<string, number> = { leve: 1, moderado: 2, alto: 3 };

const radarAxisLabels: Record<string, string> = {
  unstable_execution: 'Execução',
  emotional_self_sabotage: 'Autossabotagem',
  functional_overload: 'Sobrecarga',
  discomfort_escape: 'Fuga',
  paralyzing_perfectionism: 'Perfeccionismo',
  validation_dependency: 'Validação',
  excessive_self_criticism: 'Autocrítica',
  low_routine_sustenance: 'Rotina',
};

const fadeUp = { initial: { opacity: 0, y: 15 }, animate: { opacity: 1, y: 0 } };

const DiagnosticHistory = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchHistory = async () => {
      const { data: sessions } = await supabase
        .from('diagnostic_sessions')
        .select('id, completed_at')
        .eq('user_id', user.id)
        .not('completed_at', 'is', null)
        .order('completed_at', { ascending: false });

      if (!sessions || sessions.length === 0) {
        setLoading(false);
        return;
      }

      const { data: results } = await supabase
        .from('diagnostic_results')
        .select('*')
        .in('session_id', sessions.map(s => s.id));

      setHistory(results || []);
      setLoading(false);
    };

    fetchHistory();
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const latest = history[0];
  const previous = history.length > 1 ? history[1] : null;

  // Comparison radar data
  const comparisonData = latest ? ((latest.all_scores as any[]) || []).map((s: any) => {
    const prevScore = previous ? ((previous.all_scores as any[]) || []).find((ps: any) => ps.key === s.key) : null;
    return {
      axis: radarAxisLabels[s.key] || s.label,
      atual: s.percentage,
      anterior: prevScore?.percentage || 0,
    };
  }) : [];

  const getIntensityTrend = () => {
    if (!latest || !previous) return null;
    const curr = intensityValue[latest.intensity] || 0;
    const prev = intensityValue[previous.intensity] || 0;
    if (curr < prev) return 'improved';
    if (curr > prev) return 'worsened';
    return 'stable';
  };

  const trend = getIntensityTrend();

  return (
    <div className="min-h-screen px-4 py-8 md:py-12">
      <div className="max-w-4xl mx-auto space-y-8">
        <motion.div {...fadeUp} transition={{ duration: 0.5 }} className="flex items-center gap-4">
          <button onClick={() => navigate('/dashboard')} className="text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-2xl md:text-3xl">Histórico de Diagnósticos</h1>
        </motion.div>

        {history.length === 0 ? (
          <motion.div {...fadeUp} transition={{ delay: 0.1 }} className="text-center py-16">
            <p className="text-muted-foreground">Nenhum diagnóstico realizado ainda.</p>
          </motion.div>
        ) : (
          <>
            {/* Evolution Comparison */}
            {previous && (
              <motion.div {...fadeUp} transition={{ delay: 0.05, duration: 0.5 }} className="bg-card rounded-xl border border-border p-6 md:p-8 shadow-sm">
                <h3 className="text-xl mb-2">Comparação de Evolução</h3>
                <div className="flex items-center gap-3 mb-6">
                  {trend === 'improved' && (
                    <div className="flex items-center gap-2 text-sm">
                      <TrendingDown className="w-4 h-4 text-primary" />
                      <span className="text-primary">Intensidade reduziu</span>
                    </div>
                  )}
                  {trend === 'worsened' && (
                    <div className="flex items-center gap-2 text-sm">
                      <TrendingUp className="w-4 h-4 text-red-500" />
                      <span className="text-red-500">Intensidade aumentou</span>
                    </div>
                  )}
                  {trend === 'stable' && (
                    <div className="flex items-center gap-2 text-sm">
                      <Minus className="w-4 h-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Intensidade estável</span>
                    </div>
                  )}
                  {latest.dominant_pattern !== previous.dominant_pattern && (
                    <span className="text-xs bg-accent/10 text-accent px-2 py-1 rounded">
                      Padrão dominante mudou
                    </span>
                  )}
                </div>
                <ResponsiveContainer width="100%" height={300}>
                  <RadarChart data={comparisonData}>
                    <PolarGrid stroke="hsl(var(--border))" />
                    <PolarAngleAxis dataKey="axis" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                    <Radar name="Atual" dataKey="atual" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.15} strokeWidth={2} />
                    <Radar name="Anterior" dataKey="anterior" stroke="hsl(var(--accent))" fill="hsl(var(--accent))" fillOpacity={0.1} strokeWidth={2} strokeDasharray="5 5" />
                    <Legend />
                  </RadarChart>
                </ResponsiveContainer>
              </motion.div>
            )}

            {/* History List */}
            <motion.div {...fadeUp} transition={{ delay: 0.1, duration: 0.5 }} className="space-y-4">
              <h3 className="text-xl">Todos os Diagnósticos</h3>
              {history.map((entry, i) => (
                <div key={entry.id} className="bg-card rounded-xl border border-border p-5 shadow-sm flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-foreground">{entry.combined_title}</span>
                      {i === 0 && <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">Mais recente</span>}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-subtle">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(entry.created_at).toLocaleDateString('pt-BR')}
                      </span>
                      <span>Intensidade: {intensityLabel[entry.intensity] || entry.intensity}</span>
                    </div>
                  </div>
                  <span className="text-xs text-subtle italic hidden sm:block">{entry.profile_name}</span>
                </div>
              ))}
            </motion.div>
          </>
        )}

        <motion.div {...fadeUp} transition={{ delay: 0.2 }} className="text-center pb-12">
          <button
            onClick={() => navigate('/diagnostic')}
            className="px-8 py-3 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
          >
            Refazer diagnóstico
          </button>
        </motion.div>
      </div>
    </div>
  );
};

export default DiagnosticHistory;
