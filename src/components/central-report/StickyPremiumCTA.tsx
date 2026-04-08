import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Eye, Crown } from 'lucide-react';

interface StickyPremiumCTAProps {
  hasAccess: boolean;
  patternsCount: number;
  conflictsCount: number;
}

export function StickyPremiumCTA({ hasAccess, patternsCount, conflictsCount }: StickyPremiumCTAProps) {
  const navigate = useNavigate();
  if (hasAccess) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5, duration: 0.5 }}
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-card/95 backdrop-blur-xl border border-amber-500/30 rounded-2xl px-6 py-4 shadow-[0_20px_60px_-15px_hsl(var(--primary)/0.25)] flex items-center gap-4 max-w-lg"
    >
      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shrink-0 shadow-lg">
        <Eye className="w-5 h-5 text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground">
          {patternsCount} padrões · {conflictsCount} conflito{conflictsCount !== 1 ? 's' : ''} detectado{conflictsCount !== 1 ? 's' : ''}
        </p>
        <p className="text-xs text-muted-foreground">Desbloqueie para ler a análise completa</p>
      </div>
      <button
        onClick={() => navigate('/checkout')}
        className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 text-white rounded-xl text-xs font-semibold hover:opacity-90 transition-all flex items-center gap-1.5 shrink-0 shadow-[0_6px_20px_-4px_rgba(217,160,32,0.4)]"
      >
        <Crown className="w-3.5 h-3.5" /> Desbloquear
      </button>
    </motion.div>
  );
}
