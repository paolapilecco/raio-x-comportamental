import { motion } from 'framer-motion';
import { Activity } from 'lucide-react';
import { fadeUp } from './types';

interface ScoreGlobalCardProps {
  globalScore: number;
  breakdown: {
    awareness: number;
    consistency: number;
    coverage: number;
    recency: number;
  };
  hasAccess: boolean;
}

export function ScoreGlobalCard({ globalScore, breakdown, hasAccess }: ScoreGlobalCardProps) {
  const blur = !hasAccess ? 'filter blur-[6px]' : '';
  const scoreColor = globalScore >= 70 ? 'hsl(var(--chart-2))' : globalScore >= 40 ? 'hsl(45, 90%, 55%)' : 'hsl(var(--destructive))';

  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const progress = (globalScore / 100) * circumference;

  const bars = [
    { label: 'Autoconsciência', value: breakdown.awareness, weight: '40%' },
    { label: 'Consistência', value: breakdown.consistency, weight: '25%' },
    { label: 'Cobertura', value: breakdown.coverage, weight: '20%' },
    { label: 'Atividade', value: breakdown.recency, weight: '15%' },
  ];

  return (
    <motion.div {...fadeUp} transition={{ delay: 0.02 }} className="bg-card rounded-xl border border-border p-6 shadow-sm">
      <div className="flex flex-col md:flex-row items-center gap-6">
        {/* Circular indicator */}
        <div className={`relative flex-shrink-0 ${blur}`}>
          <svg width="140" height="140" viewBox="0 0 140 140">
            <circle cx="70" cy="70" r={radius} fill="none" stroke="hsl(var(--muted))" strokeWidth="10" />
            <motion.circle
              cx="70" cy="70" r={radius} fill="none"
              stroke={scoreColor} strokeWidth="10" strokeLinecap="round"
              strokeDasharray={circumference}
              initial={{ strokeDashoffset: circumference }}
              animate={{ strokeDashoffset: circumference - progress }}
              transition={{ duration: 1.2, ease: 'easeOut' }}
              transform="rotate(-90 70 70)"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-serif font-bold" style={{ color: scoreColor }}>{globalScore}</span>
            <span className="text-[0.6rem] text-muted-foreground">de 100</span>
          </div>
        </div>

        {/* Breakdown */}
        <div className="flex-1 w-full space-y-3">
          <div className="flex items-center gap-2 mb-1">
            <Activity className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">Score Global de Evolução</h3>
          </div>
          {bars.map(bar => (
            <div key={bar.label} className={blur}>
              <div className="flex justify-between text-[0.7rem] mb-1">
                <span className="text-muted-foreground">{bar.label} <span className="opacity-50">({bar.weight})</span></span>
                <span className="font-medium text-foreground">{bar.value}%</span>
              </div>
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <motion.div
                  className="h-full rounded-full"
                  style={{ backgroundColor: scoreColor }}
                  initial={{ width: 0 }}
                  animate={{ width: `${bar.value}%` }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
