import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus, Download, Calendar } from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import type { TestEntry, TestModule } from './types';
import { fadeUp, intensityLabel, COLORS } from './types';

interface HistoryTabProps {
  history: TestEntry[];
  modules: TestModule[];
  axisLabels: Record<string, string>;
  onDownloadPdf: (entry: TestEntry) => void;
}

export function HistoryTab({ history, modules, axisLabels, onDownloadPdf }: HistoryTabProps) {
  const evolutionData = useMemo(() => {
    if (history.length < 2) return [];
    const reversed = [...history].reverse();
    const allKeys = new Set<string>();
    reversed.forEach(e => ((e.all_scores as any[]) || []).forEach((s: any) => allKeys.add(s.key)));
    const topKeysArr = [...allKeys].slice(0, 5);
    return reversed.map((entry, i) => {
      const point: Record<string, any> = {
        date: new Date(entry.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }),
        index: i + 1,
      };
      ((entry.all_scores as any[]) || []).forEach((s: any) => {
        if (topKeysArr.includes(s.key)) point[axisLabels[s.key] || s.key] = s.percentage;
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

  return (
    <motion.div key="history" {...fadeUp} className="space-y-4">
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
                  <button onClick={() => onDownloadPdf(entry)} className="text-muted-foreground hover:text-primary transition-colors p-2">
                    <Download className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}
