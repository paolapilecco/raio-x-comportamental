import { motion } from 'framer-motion';
import {
  RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer, Tooltip,
} from 'recharts';
import { Activity } from 'lucide-react';
import { fadeUp } from './types';

interface RadarSectionProps {
  scores: Record<string, number>;
  axisLabels: Record<string, string>;
  hasAccess: boolean;
}

export function RadarSection({ scores, axisLabels, hasAccess }: RadarSectionProps) {
  // Show only TOP 5 axes for readability
  const sorted = Object.entries(scores).sort(([, a], [, b]) => b - a);
  const top5 = sorted.slice(0, 5);
  const radarData = top5.map(([key, value]) => ({
    axis: axisLabels[key] || key,
    value,
    fullMark: 100,
  }));

  return (
    <motion.div {...fadeUp} transition={{ delay: 0.15 }} className="bg-card rounded-xl border border-border p-6 md:p-8 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <Activity className="w-5 h-5 text-primary" />
          <h3 className="text-xl font-serif">Mapa de Funcionamento Global</h3>
        </div>
        <span className="text-xs text-muted-foreground bg-muted/50 px-2.5 py-1 rounded-full">Top 5 eixos</span>
      </div>
      <p className="text-xs text-muted-foreground mb-4">Os 5 padrões com maior intensidade no perfil</p>
      <ResponsiveContainer width="100%" height={350}>
        <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="72%">
          <PolarGrid stroke="hsl(var(--border))" />
          <PolarAngleAxis
            dataKey="axis"
            tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))', fontWeight: 500 }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'hsl(var(--card))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '8px',
              fontSize: '12px',
            }}
            formatter={(value: number) => [`${value}%`, 'Intensidade']}
          />
          <Radar
            name="Score Global"
            dataKey="value"
            stroke="hsl(var(--primary))"
            fill="hsl(var(--primary))"
            fillOpacity={0.2}
            strokeWidth={2.5}
            dot={{ r: 4, fill: 'hsl(var(--primary))', strokeWidth: 0 }}
          />
        </RadarChart>
      </ResponsiveContainer>

      {/* Remaining axes as small list */}
      {sorted.length > 5 && (
        <div className="mt-4 pt-4 border-t border-border">
          <p className="text-xs text-muted-foreground mb-2">Demais eixos:</p>
          <div className="flex flex-wrap gap-2">
            {sorted.slice(5).map(([key, value]) => (
              <span key={key} className={`text-xs px-2.5 py-1 rounded-full border border-border bg-muted/30 text-muted-foreground ${!hasAccess ? 'filter blur-[3px]' : ''}`}>
                {axisLabels[key] || key}: {value}%
              </span>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}
