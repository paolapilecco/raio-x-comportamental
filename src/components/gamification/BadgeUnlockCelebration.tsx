import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Badge } from '@/hooks/useBadges';

interface ConfettiParticle {
  id: number;
  x: number;
  y: number;
  rotation: number;
  scale: number;
  color: string;
  delay: number;
}

const COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--gold))',
  'hsl(152, 45%, 42%)',
  'hsl(280, 60%, 55%)',
  'hsl(45, 90%, 55%)',
  'hsl(340, 70%, 55%)',
];

function generateParticles(count: number): ConfettiParticle[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: -10 - Math.random() * 20,
    rotation: Math.random() * 720 - 360,
    scale: 0.5 + Math.random() * 0.8,
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    delay: Math.random() * 0.5,
  }));
}

const STORAGE_KEY = 'seen_badges';

function getSeenBadges(): Set<string> {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? new Set(JSON.parse(stored)) : new Set();
  } catch {
    return new Set();
  }
}

function markBadgesSeen(ids: string[]) {
  const seen = getSeenBadges();
  ids.forEach(id => seen.add(id));
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...seen]));
}

interface BadgeUnlockCelebrationProps {
  badges: Badge[];
  loading: boolean;
}

export function BadgeUnlockCelebration({ badges, loading }: BadgeUnlockCelebrationProps) {
  const [newBadge, setNewBadge] = useState<Badge | null>(null);
  const [particles, setParticles] = useState<ConfettiParticle[]>([]);
  const [queue, setQueue] = useState<Badge[]>([]);

  useEffect(() => {
    if (loading || badges.length === 0) return;

    const seen = getSeenBadges();
    const newlyUnlocked = badges.filter(b => b.unlocked && !seen.has(b.id));

    if (newlyUnlocked.length > 0) {
      // Mark all as seen immediately
      markBadgesSeen(newlyUnlocked.map(b => b.id));
      setQueue(newlyUnlocked);
    } else {
      // First visit: mark all currently unlocked as seen silently
      const unlocked = badges.filter(b => b.unlocked);
      if (unlocked.length > 0) {
        markBadgesSeen(unlocked.map(b => b.id));
      }
    }
  }, [badges, loading]);

  useEffect(() => {
    if (queue.length > 0 && !newBadge) {
      const [next, ...rest] = queue;
      setNewBadge(next);
      setParticles(generateParticles(40));
      setQueue(rest);
    }
  }, [queue, newBadge]);

  const dismiss = useCallback(() => {
    setNewBadge(null);
    setParticles([]);
  }, []);

  // Auto-dismiss after 4 seconds
  useEffect(() => {
    if (!newBadge) return;
    const timer = setTimeout(dismiss, 4000);
    return () => clearTimeout(timer);
  }, [newBadge, dismiss]);

  return (
    <AnimatePresence>
      {newBadge && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm"
            onClick={dismiss}
          />

          {/* Confetti */}
          <div className="fixed inset-0 z-[101] pointer-events-none overflow-hidden">
            {particles.map(p => (
              <motion.div
                key={p.id}
                className="absolute w-2 h-3 rounded-sm"
                style={{ left: `${p.x}%`, backgroundColor: p.color }}
                initial={{ y: `${p.y}vh`, rotate: 0, opacity: 1 }}
                animate={{
                  y: '110vh',
                  rotate: p.rotation,
                  opacity: [1, 1, 0.8, 0],
                }}
                transition={{
                  duration: 2.5 + Math.random(),
                  delay: p.delay,
                  ease: [0.2, 0, 0.8, 1],
                }}
              />
            ))}
          </div>

          {/* Badge card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.7, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -20 }}
            transition={{ type: 'spring', damping: 15, stiffness: 200 }}
            className="fixed z-[102] inset-0 flex items-center justify-center pointer-events-none"
          >
            <div
              className="bg-card border border-primary/20 rounded-3xl p-8 text-center shadow-[0_30px_80px_-15px_hsl(var(--primary)/0.3)] max-w-xs pointer-events-auto"
              onClick={dismiss}
            >
              <motion.div
                initial={{ scale: 0, rotate: -30 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', delay: 0.2, damping: 10, stiffness: 200 }}
                className="text-6xl mb-4"
              >
                {newBadge.emoji}
              </motion.div>
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-[0.6rem] tracking-[0.3em] uppercase text-primary/60 font-semibold mb-2"
              >
                Conquista Desbloqueada!
              </motion.p>
              <motion.h3
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="text-xl font-semibold text-foreground mb-1.5"
              >
                {newBadge.name}
              </motion.h3>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="text-sm text-muted-foreground"
              >
                {newBadge.description}
              </motion.p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
