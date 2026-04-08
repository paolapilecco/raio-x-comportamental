import { motion } from 'framer-motion';
import { Zap } from 'lucide-react';
import { CONFLICT_PAIR_DESCRIPTIONS } from '@/lib/conflictDetection';
import type { PatternKey } from '@/types/diagnostic';
import { fadeUp } from './types';

interface ConflictsSectionProps {
  conflicts: [PatternKey, PatternKey][];
  patternDefinitions: Record<string, any> | undefined;
  hasAccess: boolean;
}

export function ConflictsSection({ conflicts, patternDefinitions, hasAccess }: ConflictsSectionProps) {
  if (conflicts.length === 0) return null;

  return (
    <motion.div {...fadeUp} transition={{ delay: 0.2 }} className="bg-card rounded-xl border border-destructive/20 p-6 md:p-8 shadow-sm">
      <div className="flex items-center gap-3 mb-4">
        <Zap className="w-5 h-5 text-destructive" />
        <h3 className="text-xl font-serif">Contradições Internas</h3>
        <span className="text-xs px-2 py-0.5 rounded-full bg-destructive/10 text-destructive font-medium">{conflicts.length}</span>
      </div>
      <div className="space-y-3">
        {conflicts.map(([a, b], i) => {
          const pairKey = `${a}+${b}`;
          const desc = CONFLICT_PAIR_DESCRIPTIONS[pairKey] || 'Conflito entre padrões opostos detectado.';
          return (
            <div key={i} className="bg-destructive/5 border border-destructive/10 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-1.5">
                <span className={`text-sm font-medium text-foreground ${!hasAccess ? 'filter blur-[3px]' : ''}`}>
                  {patternDefinitions?.[a]?.label} × {patternDefinitions?.[b]?.label}
                </span>
              </div>
              <p className={`text-sm text-foreground/70 ${!hasAccess ? 'filter blur-[5px]' : ''}`}>{desc}</p>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}
