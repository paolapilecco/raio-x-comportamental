import { useEffect, useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/AppLayout';
import { useAxisLabels } from '@/hooks/useAxisLabels';
import { ArrowLeft, Users, GitCompareArrows } from 'lucide-react';
import {
  RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer, Legend,
} from 'recharts';

const fadeUp = { initial: { opacity: 0, y: 15 }, animate: { opacity: 1, y: 0 } };
const COLORS = ['hsl(var(--primary))', 'hsl(0,65%,52%)', 'hsl(152,45%,45%)'];

interface Person { id: string; name: string; is_active: boolean; }

export default function PatientComparison() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const axisLabels = useAxisLabels();
  const [persons, setPersons] = useState<Person[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [comparisonData, setComparisonData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    supabase.from('managed_persons').select('id, name, is_active')
      .eq('owner_id', user.id).eq('is_active', true).order('name')
      .then(({ data }) => { setPersons((data as Person[]) || []); setLoading(false); });
  }, [user]);

  useEffect(() => {
    if (selectedIds.length < 2) { setComparisonData([]); return; }
    loadComparison();
  }, [selectedIds]);

  const loadComparison = async () => {
    // Get latest result for each selected person
    const results: { name: string; scores: Record<string, number> }[] = [];

    for (const pid of selectedIds.slice(0, 3)) {
      const person = persons.find(p => p.id === pid);
      if (!person) continue;

      const { data: sessions } = await supabase
        .from('diagnostic_sessions')
        .select('id')
        .eq('user_id', user!.id)
        .eq('person_id', pid)
        .not('completed_at', 'is', null)
        .order('completed_at', { ascending: false })
        .limit(1);

      if (!sessions || sessions.length === 0) continue;

      const { data: result } = await supabase
        .from('diagnostic_results')
        .select('all_scores')
        .eq('session_id', sessions[0].id)
        .maybeSingle();

      if (result) {
        const scores: Record<string, number> = {};
        ((result.all_scores as any[]) || []).forEach((s: any) => { scores[s.key] = s.percentage; });
        results.push({ name: person.name, scores });
      }
    }

    // Build radar data
    if (results.length < 2) { setComparisonData([]); return; }
    const allKeys = new Set<string>();
    results.forEach(r => Object.keys(r.scores).forEach(k => allKeys.add(k)));

    // Top 6 axes by average
    const avgScores = [...allKeys].map(key => ({
      key,
      avg: results.reduce((sum, r) => sum + (r.scores[key] || 0), 0) / results.length,
    })).sort((a, b) => b.avg - a.avg).slice(0, 6);

    const radarData = avgScores.map(({ key }) => {
      const point: Record<string, any> = { axis: axisLabels[key] || key };
      results.forEach(r => { point[r.name] = r.scores[key] || 0; });
      return point;
    });

    setComparisonData(radarData);
  };

  const togglePerson = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : prev.length >= 3 ? prev : [...prev, id]
    );
  };

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 md:px-10 py-6 sm:py-10 space-y-6">
        <motion.div {...fadeUp} className="flex items-center gap-4">
          <button onClick={() => navigate('/painel-profissional')} className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl md:text-3xl font-serif flex items-center gap-3">
              <GitCompareArrows className="w-6 h-6 text-primary" />
              Comparar Pacientes
            </h1>
            <p className="text-sm text-muted-foreground mt-1">Selecione 2 ou 3 pacientes para comparar</p>
          </div>
        </motion.div>

        {/* Selection */}
        <motion.div {...fadeUp} transition={{ delay: 0.05 }} className="flex flex-wrap gap-2">
          {persons.map(p => (
            <button
              key={p.id}
              onClick={() => togglePerson(p.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all border ${
                selectedIds.includes(p.id)
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-card text-muted-foreground border-border hover:border-primary/30'
              }`}
            >
              {p.name}
            </button>
          ))}
        </motion.div>

        {selectedIds.length < 2 && (
          <div className="text-center py-12 bg-card border rounded-xl">
            <Users className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Selecione pelo menos 2 pacientes para comparar.</p>
          </div>
        )}

        {comparisonData.length > 0 && (
          <motion.div {...fadeUp} className="bg-card border rounded-xl p-6">
            <h3 className="text-lg font-serif mb-4">Comparação de Perfis</h3>
            <ResponsiveContainer width="100%" height={400}>
              <RadarChart data={comparisonData}>
                <PolarGrid stroke="hsl(var(--border))" />
                <PolarAngleAxis dataKey="axis" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                {selectedIds.map((id, i) => {
                  const person = persons.find(p => p.id === id);
                  if (!person) return null;
                  return (
                    <Radar key={id} name={person.name} dataKey={person.name}
                      stroke={COLORS[i % COLORS.length]} fill={COLORS[i % COLORS.length]}
                      fillOpacity={0.1} strokeWidth={2} />
                  );
                })}
                <Legend wrapperStyle={{ fontSize: 12 }} />
              </RadarChart>
            </ResponsiveContainer>
          </motion.div>
        )}
      </div>
    </AppLayout>
  );
}
