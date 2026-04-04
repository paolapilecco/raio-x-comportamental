import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, User, Calendar, Layers, TrendingUp } from 'lucide-react';
import { patternDefinitions } from '@/data/patterns';
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
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [centralProfile, setCentralProfile] = useState<CentralProfile | null>(null);
  const [completedCount, setCompletedCount] = useState(0);
  const [totalModules, setTotalModules] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      try {
        const { data: cp } = await supabase
          .from('user_central_profile')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();

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

        const { data: sessions } = await supabase
          .from('diagnostic_sessions')
          .select('test_module_id')
          .eq('user_id', user.id)
          .not('completed_at', 'is', null)
          .not('test_module_id', 'is', null);

        const uniqueModules = new Set(sessions?.map(s => s.test_module_id) || []);
        setCompletedCount(uniqueModules.size);

        const { count } = await supabase
          .from('test_modules')
          .select('*', { count: 'exact', head: true })
          .eq('is_active', true);

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
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  const dominantKey = centralProfile?.dominant_patterns?.[0]?.key as PatternKey | undefined;
  const dominantDef = dominantKey ? patternDefinitions[dominantKey] : null;

  return (
    <div className="min-h-screen px-4 py-8 md:py-12">
      <div className="max-w-3xl mx-auto space-y-8">
        <motion.div {...fadeUp} transition={{ duration: 0.5 }} className="flex items-center gap-4">
          <button onClick={() => navigate('/dashboard')} className="text-muted-foreground/60 hover:text-foreground/80 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <p className="text-[10px] tracking-[0.3em] uppercase text-primary/50 font-semibold">Visão Pessoal</p>
            <h1 className="text-2xl md:text-3xl mt-1">Meu Perfil</h1>
          </div>
        </motion.div>

        {/* User Info */}
        <motion.div {...fadeUp} transition={{ delay: 0.05 }} className="bg-card/80 backdrop-blur-sm rounded-2xl border border-border/60 p-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-primary/[0.06] border border-primary/12 flex items-center justify-center">
              <User className="w-6 h-6 text-primary/50" />
            </div>
            <div>
              <h2 className="text-xl font-medium text-foreground/90">{profile?.name || 'Usuário'}</h2>
              <p className="text-[0.8rem] text-muted-foreground/60">{user?.email}</p>
              {profile?.birth_date && (
                <p className="text-[0.75rem] text-muted-foreground/45 flex items-center gap-1 mt-1">
                  <Calendar className="w-3 h-3" />
                  {new Date(profile.birth_date).toLocaleDateString('pt-BR')}
                  {profile.age != null && ` · ${profile.age} anos`}
                </p>
              )}
            </div>
          </div>
        </motion.div>

        {/* Progress */}
        <motion.div {...fadeUp} transition={{ delay: 0.1 }} className="bg-card/80 backdrop-blur-sm rounded-2xl border border-border/60 p-6">
          <div className="flex items-center gap-3 mb-5">
            <TrendingUp className="w-5 h-5 text-primary/60" />
            <h3 className="text-lg">Progresso</h3>
          </div>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl text-foreground/85">{centralProfile?.tests_completed || 0}</p>
              <p className="text-[0.7rem] text-muted-foreground/50 tracking-[0.1em] uppercase mt-1">Leituras</p>
            </div>
            <div>
              <p className="text-2xl text-foreground/85">{completedCount}/{totalModules}</p>
              <p className="text-[0.7rem] text-muted-foreground/50 tracking-[0.1em] uppercase mt-1">Módulos</p>
            </div>
            <div>
              <p className="text-2xl text-foreground/85">
                {centralProfile?.last_test_at
                  ? new Date(centralProfile.last_test_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
                  : '-'}
              </p>
              <p className="text-[0.7rem] text-muted-foreground/50 tracking-[0.1em] uppercase mt-1">Última</p>
            </div>
          </div>
        </motion.div>

        {/* Central Profile Summary */}
        {centralProfile && dominantDef && (
          <motion.div {...fadeUp} transition={{ delay: 0.15 }} className="bg-gradient-to-br from-primary/[0.04] to-primary/[0.08] rounded-2xl border border-primary/15 p-6">
            <div className="flex items-center gap-3 mb-4">
              <Layers className="w-5 h-5 text-primary/60" />
              <h3 className="text-lg">Perfil Comportamental</h3>
            </div>
            <div className="space-y-3">
              <div>
                <p className="text-[10px] tracking-[0.25em] uppercase text-muted-foreground/50 mb-1 font-medium">Padrão Dominante</p>
                <p className="text-base font-medium text-foreground/85">{dominantDef.label}</p>
              </div>
              {centralProfile.core_pain && (
                <div>
                  <p className="text-[10px] tracking-[0.25em] uppercase text-muted-foreground/50 mb-1 font-medium">Dor Central</p>
                  <p className="text-[0.82rem] text-foreground/70 leading-[1.6]">{centralProfile.core_pain}</p>
                </div>
              )}
              {centralProfile.key_unlock_area && (
                <div>
                  <p className="text-[10px] tracking-[0.25em] uppercase text-muted-foreground/50 mb-1 font-medium">Área-chave</p>
                  <p className="text-[0.82rem] text-foreground/70 leading-[1.6]">{centralProfile.key_unlock_area}</p>
                </div>
              )}
              <button
                onClick={() => navigate('/central-report')}
                className="mt-2 text-[0.82rem] text-primary/70 hover:text-primary hover:underline transition-colors"
              >
                Ver relatório central completo →
              </button>
            </div>
          </motion.div>
        )}

        {/* Actions */}
        <motion.div {...fadeUp} transition={{ delay: 0.2 }} className="flex flex-col sm:flex-row gap-4 justify-center pb-12">
          <button onClick={() => navigate('/tests')} className="px-10 py-[1rem] bg-primary text-primary-foreground rounded-2xl text-[0.9rem] font-semibold tracking-[0.02em] shadow-[0_8px_30px_-6px_hsl(var(--primary)/0.35)] hover:shadow-[0_12px_40px_-4px_hsl(var(--primary)/0.45)] hover:translate-y-[-1px] transition-all duration-300">
            Ver módulos
          </button>
          <button onClick={() => navigate('/history')} className="px-10 py-[1rem] border border-border/50 rounded-2xl text-[0.85rem] font-medium text-muted-foreground/70 hover:text-foreground/80 hover:border-border hover:bg-card/60 transition-all duration-300">
            Ver histórico
          </button>
        </motion.div>
      </div>
    </div>
  );
};

export default Profile;
