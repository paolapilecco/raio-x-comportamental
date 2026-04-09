import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { useGamification } from '@/hooks/useGamification';
import { useBadges } from '@/hooks/useBadges';
import { Flame, Trophy, Sparkles, Lock, ArrowRight } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { useNavigate } from 'react-router-dom';

const fade = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
};

export function ReportGamification() {
  const { user } = useAuth();
  const gamification = useGamification(user?.id);
  const badgesData = useBadges(user?.id);
  const navigate = useNavigate();

  if (gamification.loading || badgesData.loading) return null;

  const unlockedBadges = badgesData.badges.filter(b => b.unlocked);
  const lockedBadges = badgesData.badges.filter(b => !b.unlocked);

  return (
    <motion.div {...fade} transition={{ delay: 0.5, duration: 0.5 }} className="mt-16 space-y-6">
      {/* Divider */}
      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-border/30" />
        <Sparkles className="w-4 h-4 text-primary/40" />
        <p className="text-[10px] text-muted-foreground/50 uppercase tracking-[0.25em] font-semibold">
          Sua evolução
        </p>
        <div className="h-px flex-1 bg-border/30" />
      </div>

      {/* Level + Streak row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Level Card */}
        <div className="rounded-2xl border border-primary/15 bg-primary/[0.03] p-5">
          <div className="flex items-center gap-2 mb-3">
            <Trophy className="w-4 h-4 text-primary/60" />
            <p className="text-[9px] text-primary/50 uppercase tracking-[0.2em] font-semibold">
              Nível de autoconsciência
            </p>
          </div>
          <div className="flex items-baseline gap-2 mb-2">
            <span className="text-2xl font-extrabold text-foreground">{gamification.level}</span>
            <span className="text-sm font-semibold text-primary/70">{gamification.levelName}</span>
          </div>
          <Progress value={gamification.levelProgress} className="h-2 mb-1.5" />
          <p className="text-[10px] text-muted-foreground/50">
            {gamification.xpToNextLevel > 0
              ? `${gamification.totalXP} XP — faltam ${gamification.xpToNextLevel} para o próximo nível`
              : `${gamification.totalXP} XP — nível máximo!`}
          </p>
        </div>

        {/* Streak Card */}
        <div className="rounded-2xl border border-orange-500/15 bg-orange-500/[0.03] p-5">
          <div className="flex items-center gap-2 mb-3">
            <Flame className="w-4 h-4 text-orange-500/60" />
            <p className="text-[9px] text-orange-600/50 dark:text-orange-400/50 uppercase tracking-[0.2em] font-semibold">
              Streak de consciência
            </p>
          </div>
          <div className="flex items-baseline gap-2 mb-2">
            <span className="text-2xl font-extrabold text-foreground">{gamification.currentStreak}</span>
            <span className="text-sm text-muted-foreground/60">
              {gamification.currentStreak === 1 ? 'semana' : 'semanas'} seguidas
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className={`h-2 flex-1 rounded-full transition-colors ${
                  i < gamification.currentStreak
                    ? 'bg-orange-500/70'
                    : 'bg-border/30'
                }`}
              />
            ))}
          </div>
          <p className="text-[10px] text-muted-foreground/50 mt-1.5">
            Recorde: {gamification.longestStreak} {gamification.longestStreak === 1 ? 'semana' : 'semanas'}
          </p>
        </div>
      </div>

      {/* Badges */}
      <div className="rounded-2xl border border-border/30 bg-card p-5">
        <div className="flex items-center justify-between mb-4">
          <p className="text-[10px] text-muted-foreground/50 uppercase tracking-[0.2em] font-semibold">
            Conquistas ({badgesData.unlockedCount}/{badgesData.totalCount})
          </p>
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
          {unlockedBadges.map(badge => (
            <motion.div
              key={badge.id}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.3 }}
              className="flex flex-col items-center text-center p-3 rounded-xl bg-primary/[0.04] border border-primary/10"
            >
              <span className="text-2xl mb-1.5">{badge.emoji}</span>
              <p className="text-[10px] font-semibold text-foreground leading-tight">{badge.name}</p>
            </motion.div>
          ))}
          {lockedBadges.slice(0, 4 - unlockedBadges.length % 4 === 4 ? 0 : 4 - unlockedBadges.length % 4).map(badge => (
            <div
              key={badge.id}
              className="flex flex-col items-center text-center p-3 rounded-xl bg-muted/30 border border-border/20 opacity-40"
            >
              <Lock className="w-5 h-5 text-muted-foreground/40 mb-1.5" />
              <p className="text-[10px] font-medium text-muted-foreground/50 leading-tight">{badge.name}</p>
            </div>
          ))}
        </div>
      </div>

      {/* CTA to continue */}
      <motion.div {...fade} transition={{ delay: 0.7 }}>
        <button
          onClick={() => navigate('/dashboard')}
          className="w-full flex items-center justify-center gap-2 py-4 rounded-xl border border-primary/20 bg-primary/[0.04] text-sm font-semibold text-primary hover:bg-primary/[0.08] transition-colors"
        >
          Continue sua jornada — {gamification.uniqueModules} de {gamification.uniqueModules + (badgesData.totalCount > 0 ? 1 : 0)} módulos completos
          <ArrowRight className="w-4 h-4" />
        </button>
      </motion.div>
    </motion.div>
  );
}
