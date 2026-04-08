import { motion } from 'framer-motion';
import { AlertTriangle } from 'lucide-react';
import { fadeUp } from './types';

interface AreaInfo {
  area: string;
  score: number;
}

interface CriticalAreasSectionProps {
  lifeAreas: AreaInfo[];
  hasAccess: boolean;
}

export function CriticalAreasSection({ lifeAreas, hasAccess }: CriticalAreasSectionProps) {
  const blur = !hasAccess ? 'filter blur-[3px]' : '';

  return (
    <motion.div {...fadeUp} transition={{ delay: 0.25 }} className="bg-card rounded-xl border border-border p-6 md:p-8 shadow-sm">
      <div className="flex items-center gap-3 mb-4">
        <AlertTriangle className="w-5 h-5 text-primary" />
        <h3 className="text-xl font-serif">Áreas Críticas da Vida</h3>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {lifeAreas.map((area, i) => {
          const level = area.score >= 60 ? 'critical' : area.score >= 40 ? 'warning' : 'ok';
          const config = {
            critical: { bg: 'bg-red-500/8 border-red-500/20', text: 'text-red-500', label: 'Crítico' },
            warning: { bg: 'bg-yellow-500/8 border-yellow-500/20', text: 'text-yellow-500', label: 'Atenção' },
            ok: { bg: 'bg-green-500/8 border-green-500/20', text: 'text-green-500', label: 'OK' },
          }[level];

          return (
            <div key={i} className={`rounded-lg border p-4 ${config.bg}`}>
              <div className="flex items-center justify-between mb-2">
                <span className={`text-sm font-medium text-foreground ${blur}`}>{area.area}</span>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${config.text} bg-current/10`}>
                  {config.label}
                </span>
              </div>
              <div className="w-full bg-muted/30 rounded-full h-1.5">
                <div
                  className={`rounded-full h-1.5 transition-all duration-500 ${level === 'critical' ? 'bg-red-500' : level === 'warning' ? 'bg-yellow-500' : 'bg-green-500'}`}
                  style={{ width: `${area.score}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}
