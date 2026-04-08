import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, User, Calendar, Layers, TrendingUp, ArrowRight, Crown, Fingerprint, BarChart3, Activity, Award } from 'lucide-react';
import { useBadges } from '@/hooks/useBadges';
import { useGamification } from '@/hooks/useGamification';
import { BadgeUnlockCelebration } from '@/components/gamification/BadgeUnlockCelebration';
import { toast } from 'sonner';
import { usePatternDefinitions } from '@/hooks/usePatternDefinitions';
import { ProfileSkeleton } from '@/components/skeletons/ProfileSkeleton';
import type { PatternKey } from '@/types/diagnostic';

interface CentralProfile {
  dominant_patterns: { key: string; score: number }[];
  aggregated_scores: Record<string, number>;
  tests_completed: number;
  mental_state: string | null;
  core_pain: string | null;
  key_unlock_area: string | null;
  profile_name: string | null;
  last_test_at: string | null;
}

const fadeUp = { initial: { opacity: 0, y: 15 }, animate: { opacity: 1, y: 0 } };

const Profile = () => {
  const { user, profile, isPremium } = useAuth();
  const navigate = useNavigate();
  const { data: patternDefinitions } = usePatternDefinitions();
  const [centralProfile, setCentralProfile] = useState<CentralProfile | null>(null);
  const [completedCount, setCompletedCount] = useState(0);
  const [totalModules, setTotalModules] = useState(0);
  const [loading, setLoading] = useState(true);
  const badgesData = useBadges(user?.id);
  const gamification = useGamification(user?.id);

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      try {
        const { data: cp, error: cpErr } = await supabase
          .from('user_central_profile')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();

        if (cpErr) {
          console.error('Error fetching central profile:', cpErr);
          toast.error('Erro ao carregar dados do perfil.');
        }

        if (cp) {
          setCentralProfile({
            dominant_patterns: (cp.dominant_patterns as unknown as { key: string; score: number }[]) || [],
            aggregated_scores: (cp.aggregated_scores as unknown as Record<string, number>) || {},
            tests_completed: cp.tests_completed,
            mental_state: cp.mental_state,
            core_pain: cp.core_pain,
            key_unlock_area: cp.key_unlock_area,
            profile_name: cp.profile_name,
            last_test_at: cp.last_test_at,
          });
        }

        const { data: sessions, error: sessErr } = await supabase
          .from('diagnostic_sessions')
          .select('test_module_id')
          .eq('user_id', user.id)
          .not('completed_at', 'is', null)
          .not('test_module_id', 'is', null);

        if (sessErr) {
          console.error('Error fetching sessions:', sessErr);
          toast.error('Erro ao carregar sessões concluídas.');
        }

        const uniqueModules = new Set(sessions?.map(s => s.test_module_id) || []);
        setCompletedCount(uniqueModules.size);

        const { count, error: countErr } = await supabase
          .from('test_modules')
          .select('*', { count: 'exact', head: true })
          .eq('is_active', true);

        if (countErr) {
          console.error('Error fetching module count:', countErr);
        }

        setTotalModules(count || 0);
      } catch (err) {
        console.error('Error loading profile data:', err);
        toast.error('Erro ao carregar perfil. Tente novamente.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  if (loading) {
    return <ProfileSkeleton />;
  }

  const dominantKey = centralProfile?.dominant_patterns?.[0]?.key as PatternKey | undefined;
  const dominantDef = dominantKey ? patternDefinitions?.[dominantKey] : null;
  const progressPercent = totalModules > 0 ? (completedCount / totalModules) * 100 : 0;

  return (
    <div className="min-h-screen px-4 py-8 md:py-12 relative overflow-hidden">
      <BadgeUnlockCelebration badges={badgesData.badges} loading={badgesData.loading} />
      {/* Ambient background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[5%] right-[0%] w-[500px] h-[500px] rounded-full bg-primary/[0.03] blur-[120px]" />
        <div className="absolute bottom-[10%] left-[-5%] w-[400px] h-[400px] rounded-full bg-gold/[0.02] blur-[100px]" />
      </div>

      <div className="max-w-3xl mx-auto space-y-8 relative z-10">
        {/* Header */}
        <motion.div {...fadeUp} transition={{ duration: 0.5 }} className="flex items-center gap-4">
          <button onClick={() => navigate('/dashboard')} className="w-10 h-10 rounded-xl border border-border/40 bg-card/60 backdrop-blur-sm flex items-center justify-center text-muted-foreground/60 hover:text-foreground/80 hover:border-primary/20 transition-all duration-300">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <p className="text-[10px] tracking-[0.35em] uppercase text-primary/50 font-semibold font-display">Visão Pessoal</p>
            <h1 className="text-2xl md:text-3xl mt-1 tracking-[-0.03em]">Meu Perfil</h1>
          </div>
        </motion.div>

        {/* User Card */}
        <motion.div {...fadeUp} transition={{ delay: 0.05 }} className="bg-card/60 backdrop-blur-xl rounded-3xl border border-border/40 p-7 shadow-[0_20px_60px_-15px_hsl(var(--primary)/0.06)]">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/[0.04] border border-primary/15 flex items-center justify-center">
              <Fingerprint className="w-7 h-7 text-primary/50" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-1">
                <h2 className="text-xl tracking-[-0.02em] text-foreground/90">{profile?.name || 'Usuário'}</h2>
                {isPremium && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-gold/10 border border-gold/20">
                    <Crown className="w-2.5 h-2.5 text-gold" />
                    <span className="text-[0.6rem] font-bold tracking-[0.1em] uppercase text-gold">Premium</span>
                  </span>
                )}
              </div>
              <p className="text-[0.8rem] text-muted-foreground/50">{user?.email}</p>
              {profile?.birth_date && (
                <p className="text-[0.72rem] text-muted-foreground/40 flex items-center gap-1.5 mt-1.5">
                  <Calendar className="w-3 h-3" />
                  {new Date(profile.birth_date).toLocaleDateString('pt-BR')}
                  {profile.age != null && ` · ${profile.age} anos`}
                </p>
              )}
            </div>
          </div>
        </motion.div>

        {/* Stats Grid */}
        <motion.div {...fadeUp} transition={{ delay: 0.1 }} className="grid grid-cols-3 gap-2 sm:gap-4">
          {[
            { value: centralProfile?.tests_completed || 0, label: 'Leituras', icon: BarChart3 },
            { value: `${completedCount}/${totalModules}`, label: 'Módulos', icon: Layers },
            {
              value: centralProfile?.last_test_at
                ? new Date(centralProfile.last_test_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
                : '—',
              label: 'Última',
              icon: Activity,
            },
          ].map((stat, i) => {
            const StatIcon = stat.icon;
            return (
              <div
                key={stat.label}
                className="bg-card/60 backdrop-blur-sm rounded-2xl border border-border/40 p-3 sm:p-5 text-center"
              >
                <StatIcon className="w-4 h-4 text-primary/40 mx-auto mb-2 sm:mb-3" />
                <p className="text-lg sm:text-xl text-foreground/85 tracking-[-0.02em]">{stat.value}</p>
                <p className="text-[0.6rem] sm:text-[0.65rem] text-muted-foreground/45 tracking-[0.12em] uppercase mt-1 sm:mt-1.5 font-display font-medium">{stat.label}</p>
              </div>
            );
          })}
        </motion.div>

        {/* Gamification Level */}
        {!gamification.loading && gamification.totalTests > 0 && (
          <motion.div {...fadeUp} transition={{ delay: 0.12 }} className="bg-card/60 backdrop-blur-sm rounded-2xl border border-border/40 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <Award className="w-4 h-4 text-primary/50" />
                <span className="text-[0.82rem] font-medium text-foreground/75">Nível de Autoconsciência</span>
              </div>
              <span className="text-xs font-bold text-primary">{gamification.levelName}</span>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <div className="w-full bg-muted/20 rounded-full h-2">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${gamification.levelProgress}%` }}
                    transition={{ delay: 0.6, duration: 1, ease: [0.22, 1, 0.36, 1] }}
                    className="bg-gradient-to-r from-primary/60 to-primary rounded-full h-2"
                  />
                </div>
              </div>
              <span className="text-sm font-bold text-foreground/80 tabular-nums">{gamification.totalXP} XP</span>
            </div>
            <p className="text-[0.6rem] text-muted-foreground/50 mt-2">
              {gamification.xpToNextLevel > 0
                ? `${gamification.xpToNextLevel} XP para alcançar o próximo nível`
                : 'Nível máximo alcançado!'}
            </p>
          </motion.div>
        )}

        {/* Conquistas / Badges */}
        {!badgesData.loading && (
          <motion.div {...fadeUp} transition={{ delay: 0.15 }} className="bg-card/60 backdrop-blur-sm rounded-2xl border border-border/40 p-6">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2.5">
                <Award className="w-4 h-4 text-gold/60" />
                <span className="text-[0.82rem] font-medium text-foreground/75">Conquistas</span>
              </div>
              <span className="text-[0.72rem] text-muted-foreground/40 font-display font-medium">
                {badgesData.unlockedCount}/{badgesData.totalCount}
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {badgesData.badges.map((badge) => (
                <div
                  key={badge.id}
                  className={`rounded-xl border p-3.5 text-center transition-all duration-300 ${
                    badge.unlocked
                      ? 'bg-primary/[0.04] border-primary/15 shadow-[0_2px_8px_-2px_hsl(var(--primary)/0.1)]'
                      : 'bg-muted/10 border-border/20 opacity-45 grayscale'
                  }`}
                >
                  <span className="text-2xl block mb-2">{badge.emoji}</span>
                  <p className={`text-[0.72rem] font-semibold leading-tight ${
                    badge.unlocked ? 'text-foreground/80' : 'text-muted-foreground/50'
                  }`}>
                    {badge.name}
                  </p>
                  <p className={`text-[0.58rem] mt-1 leading-snug ${
                    badge.unlocked ? 'text-muted-foreground/60' : 'text-muted-foreground/30'
                  }`}>
                    {badge.description}
                  </p>
                  {badge.unlocked && badge.unlockedAt && (
                    <p className="text-[0.52rem] text-primary/50 mt-1.5 font-display">
                      {new Date(badge.unlockedAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        )}
        {/* Progress */}
        <motion.div {...fadeUp} transition={{ delay: 0.15 }} className="bg-card/60 backdrop-blur-sm rounded-2xl border border-border/40 p-6">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2.5">
              <TrendingUp className="w-4 h-4 text-primary/50" />
              <span className="text-[0.82rem] font-medium text-foreground/75">Progresso Geral</span>
            </div>
            <span className="text-[0.72rem] text-muted-foreground/40 font-display font-medium">{Math.round(progressPercent)}%</span>
          </div>
          <div className="w-full bg-muted/20 rounded-full h-1.5">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progressPercent}%` }}
              transition={{ delay: 0.5, duration: 1, ease: [0.22, 1, 0.36, 1] }}
              className="bg-gradient-to-r from-primary/60 to-primary rounded-full h-1.5"
            />
          </div>
        </motion.div>

        {/* Central Profile Summary */}
        {centralProfile && dominantDef && (
          <motion.div {...fadeUp} transition={{ delay: 0.2 }} className="bg-gradient-to-br from-primary/[0.03] to-gold/[0.02] rounded-3xl border border-primary/12 p-7 shadow-[0_20px_60px_-15px_hsl(var(--primary)/0.06)]">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Layers className="w-4 h-4 text-primary/60" />
              </div>
              <h3 className="text-lg tracking-[-0.02em]">Perfil Comportamental</h3>
            </div>
            <div className="space-y-4">
              <div className="bg-background/40 rounded-2xl p-4 border border-border/20">
                <p className="text-[9px] tracking-[0.3em] uppercase text-muted-foreground/45 mb-1.5 font-display font-semibold">Padrão Dominante</p>
                <p className="text-base font-medium text-foreground/85 tracking-[-0.01em]">{dominantDef.label}</p>
              </div>
              {centralProfile.core_pain && (
                <div className="bg-background/40 rounded-2xl p-4 border border-border/20">
                  <p className="text-[9px] tracking-[0.3em] uppercase text-muted-foreground/45 mb-1.5 font-display font-semibold">Dor Central</p>
                  <p className="text-[0.82rem] text-foreground/70 leading-[1.65]">{centralProfile.core_pain}</p>
                </div>
              )}
              {centralProfile.key_unlock_area && (
                <div className="bg-background/40 rounded-2xl p-4 border border-border/20">
                  <p className="text-[9px] tracking-[0.3em] uppercase text-muted-foreground/45 mb-1.5 font-display font-semibold">Área-chave de Desbloqueio</p>
                  <p className="text-[0.82rem] text-foreground/70 leading-[1.65]">{centralProfile.key_unlock_area}</p>
                </div>
              )}
              <button
                onClick={() => navigate('/central-report')}
                className="group flex items-center gap-2 text-[0.82rem] text-primary/70 hover:text-primary transition-colors mt-2"
              >
                Ver relatório central completo
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform duration-300" />
              </button>
            </div>
          </motion.div>
        )}

        {/* Actions */}
        <motion.div {...fadeUp} transition={{ delay: 0.25 }} className="flex flex-col sm:flex-row gap-4 justify-center pb-12">
          <button
            onClick={() => navigate('/tests')}
            className="group px-10 py-4 bg-primary text-primary-foreground rounded-2xl text-[0.9rem] font-semibold tracking-[-0.01em] shadow-[0_8px_30px_-6px_hsl(var(--primary)/0.35)] hover:shadow-[0_12px_40px_-4px_hsl(var(--primary)/0.45)] hover:translate-y-[-1px] transition-all duration-500 flex items-center justify-center gap-2.5 relative overflow-hidden"
          >
            <span className="relative z-10">Ver módulos</span>
            <ArrowRight className="w-4 h-4 relative z-10 group-hover:translate-x-1 transition-transform duration-300" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/[0.08] to-white/[0.05] pointer-events-none" />
          </button>
          <button
            onClick={() => navigate('/history')}
            className="px-10 py-4 border border-border/40 bg-card/40 backdrop-blur-sm rounded-2xl text-[0.85rem] font-medium text-muted-foreground/70 hover:text-foreground/80 hover:border-primary/20 hover:bg-card/60 transition-all duration-300"
          >
            Ver histórico
          </button>
        </motion.div>
      </div>
    </div>
  );
};

export default Profile;
