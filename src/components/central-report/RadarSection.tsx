import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer, Tooltip,
} from 'recharts';
import { Activity, BarChart3, Sparkles, ChevronDown } from 'lucide-react';
import { fadeUp } from './types';
import { NeuralMap } from './NeuralMap';

interface RadarSectionProps {
  scores: Record<string, number>;
  axisLabels: Record<string, string>;
  hasAccess: boolean;
}

function groupByIntensity(items: [string, number][], _axisLabels: Record<string, string>) {
  const alto = items.filter(([, v]) => v > 70);
  const moderado = items.filter(([, v]) => v >= 40 && v <= 70);
  const baixo = items.filter(([, v]) => v < 40);
  return { alto, moderado, baixo };
}

function IntensityGroup({ label, emoji, items, axisLabels, colorClass, hasAccess }: {
  label: string; emoji: string; items: [string, number][]; axisLabels: Record<string, string>; colorClass: string; hasAccess: boolean;
}) {
  if (items.length === 0) return null;
  return (
    <div>
      <p className={`text-xs font-semibold mb-1.5 flex items-center gap-1.5 ${colorClass}`}>
        {emoji} {label} <span className="text-muted-foreground font-normal">({items.length})</span>
      </p>
      <div className="flex flex-wrap gap-1.5">
        {items.map(([key, value]) => (
          <span key={key} className={`text-[11px] px-2 py-0.5 rounded-full border border-border bg-muted/30 text-muted-foreground ${!hasAccess ? 'filter blur-[3px]' : ''}`}>
            {axisLabels[key] || key}: {value}%
          </span>
        ))}
      </div>
    </div>
  );
}

export function RadarSection({ scores, axisLabels, hasAccess }: RadarSectionProps) {
  const [view, setView] = useState<'neural' | 'radar'>('neural');
  const [showAll, setShowAll] = useState(false);

  const sorted = Object.entries(scores).sort(([, a], [, b]) => b - a);
  const top5 = sorted.slice(0, 5);
  const remaining = sorted.slice(5);
  const radarData = top5.map(([key, value]) => ({
    axis: axisLabels[key] || key,
    value,
    fullMark: 100,
  }));

  const { alto, moderado, baixo } = groupByIntensity(remaining, axisLabels);

  return (
    <motion.div {...fadeUp} transition={{ delay: 0.15 }} className="bg-card rounded-xl border border-border p-6 md:p-8 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <Activity className="w-5 h-5 text-primary" />
          <h3 className="text-xl font-serif">Mapa de Funcionamento Global</h3>
        </div>
        <div className="flex items-center gap-1 bg-muted/50 rounded-full p-0.5">
          <button
            onClick={() => setView('neural')}
            className={`flex items-center gap-1 text-xs px-3 py-1.5 rounded-full transition-all ${view === 'neural' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
          >
            <Sparkles className="w-3 h-3" />
            Neural
          </button>
          <button
            onClick={() => setView('radar')}
            className={`flex items-center gap-1 text-xs px-3 py-1.5 rounded-full transition-all ${view === 'radar' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
          >
            <BarChart3 className="w-3 h-3" />
            Radar
          </button>
        </div>
      </div>
      <p className="text-xs text-muted-foreground mb-4">
        {view === 'neural'
          ? 'Rede neural interativa — cada cluster representa um eixo comportamental'
          : 'Os 5 padrões com maior intensidade no perfil'}
      </p>

      {view === 'neural' ? (
        <NeuralMap scores={scores} axisLabels={axisLabels} />
      ) : (
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
      )}

      {remaining.length > 0 && (
        <div className="mt-4 pt-4 border-t border-border">
          <button
            onClick={() => setShowAll(!showAll)}
            className="w-full flex items-center justify-between text-sm text-muted-foreground hover:text-foreground transition-colors py-1"
          >
            <span>Ver todos os eixos ({remaining.length})</span>
            <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${showAll ? 'rotate-180' : ''}`} />
          </button>

          {showAll && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              transition={{ duration: 0.25 }}
              className="mt-3 space-y-3"
            >
              <IntensityGroup label="Alto" emoji="🔴" items={alto} axisLabels={axisLabels} colorClass="text-red-400" hasAccess={hasAccess} />
              <IntensityGroup label="Moderado" emoji="🟡" items={moderado} axisLabels={axisLabels} colorClass="text-yellow-400" hasAccess={hasAccess} />
              <IntensityGroup label="Baixo" emoji="🟢" items={baixo} axisLabels={axisLabels} colorClass="text-green-400" hasAccess={hasAccess} />
            </motion.div>
          )}
        </div>
      )}
    </motion.div>
  );
}
