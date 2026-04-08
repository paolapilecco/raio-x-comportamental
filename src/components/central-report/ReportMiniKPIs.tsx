import { motion } from 'framer-motion';
import { Brain, Zap, Shield, ClipboardList } from 'lucide-react';
import { fadeUp } from './types';

interface ReportMiniKPIsProps {
  testsCompleted: number;
  conflictsCount: number;
  riskLevel: string;
  riskColor: string;
  dominantLabel: string;
  hasAccess: boolean;
}

export function ReportMiniKPIs({ testsCompleted, conflictsCount, riskLevel, riskColor, dominantLabel, hasAccess }: ReportMiniKPIsProps) {
  const blur = !hasAccess ? 'filter blur-[4px]' : '';

  return (
    <motion.div {...fadeUp} transition={{ delay: 0.05 }} className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <div className="bg-card rounded-xl border border-border p-4 shadow-sm text-center">
        <ClipboardList className="w-5 h-5 text-primary mx-auto mb-1.5" />
        <p className="text-2xl font-serif font-bold text-foreground">{testsCompleted}</p>
        <p className="text-[0.65rem] text-muted-foreground mt-0.5">Leituras</p>
      </div>
      <div className="bg-card rounded-xl border border-border p-4 shadow-sm text-center">
        <Brain className="w-5 h-5 text-primary mx-auto mb-1.5" />
        <p className={`text-sm font-serif font-bold text-foreground truncate ${blur}`}>{dominantLabel}</p>
        <p className="text-[0.65rem] text-muted-foreground mt-0.5">Padrão Dominante</p>
      </div>
      <div className="bg-card rounded-xl border border-border p-4 shadow-sm text-center">
        <Zap className="w-5 h-5 text-destructive mx-auto mb-1.5" />
        <p className={`text-2xl font-serif font-bold text-foreground ${blur}`}>{conflictsCount}</p>
        <p className="text-[0.65rem] text-muted-foreground mt-0.5">Conflitos</p>
      </div>
      <div className="bg-card rounded-xl border border-border p-4 shadow-sm text-center">
        <Shield className="w-5 h-5 text-primary mx-auto mb-1.5" />
        <p className={`text-lg font-serif font-bold ${riskColor} ${blur}`}>{riskLevel}</p>
        <p className="text-[0.65rem] text-muted-foreground mt-0.5">Risco</p>
      </div>
    </motion.div>
  );
}
