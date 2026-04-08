import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { Compass, ChevronDown, ChevronUp } from 'lucide-react';
import { fadeUp, type HistoryEntry } from './types';

interface TimelineSectionProps {
  history: HistoryEntry[];
  axisLabels: Record<string, string>;
}

const COLORS = [
  'hsl(var(--primary))',
  'hsl(0, 65%, 52%)',
  'hsl(38, 72%, 50%)',
  'hsl(152, 45%, 45%)',
  'hsl(270, 50%, 55%)',
  'hsl(200, 60%, 50%)',
  'hsl(330, 50%, 50%)',
  'hsl(60, 60%, 45%)',
];

export function TimelineSection({ history, axisLabels }: TimelineSectionProps) {
  const [showAll, setShowAll] = useState(false);

  if (history.length <= 1) return null;

  // Determine top 3 axes by latest scores
  const latestScores: Record<string, number> = {};
  const latestEntry = history[history.length - 1];
  latestEntry.all_scores.forEach(s => { latestScores[s.key] = s.percentage; });

  const allKeys = Object.keys(latestScores);
  const sortedKeys = [...allKeys].sort((a, b) => (latestScores[b] || 0) - (latestScores[a] || 0));
  const displayKeys = showAll ? sortedKeys : sortedKeys.slice(0, 3);

  const timelineData = history.map((entry, i) => {
    const point: Record<string, any> = {
      date: new Date(entry.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }),
      index: i + 1,
    };
    entry.all_scores.forEach(s => { point[axisLabels[s.key] || s.key] = s.percentage; });
    return point;
  });

  return (
    <motion.div {...fadeUp} transition={{ delay: 0.3 }} className="bg-card rounded-xl border border-border p-6 md:p-8 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <Compass className="w-5 h-5 text-primary" />
          <h3 className="text-xl font-serif">Evolução ao Longo do Tempo</h3>
        </div>
        <span className="text-xs text-muted-foreground bg-muted/50 px-2.5 py-1 rounded-full">
          {showAll ? `${sortedKeys.length} eixos` : 'Top 3 eixos'}
        </span>
      </div>
      <p className="text-xs text-muted-foreground mb-4">Cada ponto representa uma leitura realizada</p>

      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={timelineData}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
          <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} width={32} />
          <Tooltip
            contentStyle={{
              backgroundColor: 'hsl(var(--card))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '8px',
              fontSize: '12px',
            }}
          />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          {displayKeys.map((key, i) => (
            <Line
              key={key}
              type="monotone"
              dataKey={axisLabels[key] || key}
              stroke={COLORS[i % COLORS.length]}
              strokeWidth={2.5}
              dot={{ r: 4 }}
              connectNulls
            />
          ))}
        </LineChart>
      </ResponsiveContainer>

      {sortedKeys.length > 3 && (
        <button
          onClick={() => setShowAll(!showAll)}
          className="mt-4 text-xs text-primary hover:underline flex items-center gap-1 mx-auto"
        >
          {showAll ? (
            <><ChevronUp className="w-3.5 h-3.5" /> Mostrar apenas Top 3</>
          ) : (
            <><ChevronDown className="w-3.5 h-3.5" /> Ver todos os {sortedKeys.length} eixos</>
          )}
        </button>
      )}
    </motion.div>
  );
}
