import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, User, Calendar, Brain, Layers, TrendingUp } from 'lucide-react';
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
      setLoading(false);
    };

    fetchData();
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const dominantKey = centralProfile?.dominant_patterns?.[0]?.key as PatternKey | undefined;
  const dominantDef = dominantKey ? patternDefinitions[dominantKey] : null;

  return (
    <div className="min-h-screen px-4 py-8 md:py-12">
      <div className="max-w-3xl mx-auto space-y-8">
        <motion.div {...fadeUp} transition={{ duration: 0.5 }} className="flex items-center gap-4">
          <button onClick={() => navigate('/dashboard')} className="text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-2xl md:text-3xl font-serif">Meu Perfil</h1>
        </motion.div>

        {/* User Info */}
        <motion.div {...fadeUp} transition={{ delay: 0.05 }} className="bg-card rounded-xl border border-border p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="w-7 h-7 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-medium text-foreground">{profile?.name || 'Usuário'}</h2>
              <p className="text-sm text-muted-foreground">{user?.email}</p>
              {profile?.birth_date && (
                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                  <Calendar className="w-3 h-3" />
                  {new Date(profile.birth_date).toLocaleDateString('pt-BR')}
                  {profile.age != null && ` · ${profile.age} anos`}
                </p>
              )}
            </div>
          </div>
        </motion.div>

        {/* Progress */}
        <motion.div {...fadeUp} transition={{ delay: 0.1 }} className="bg-card rounded-xl border border-border p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <TrendingUp className="w-5 h-5 text-primary" />
            <h3 className="text-lg font-serif">Progresso</h3>
          </div>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-serif text-foreground">{centralProfile?.tests_completed || 0}</p>
              <p className="text-xs text-muted-foreground">Testes feitos</p>
            </div>
            <div>
              <p className="text-2xl font-serif text-foreground">{completedCount}/{totalModules}</p>
              <p className="text-xs text-muted-foreground">Módulos</p>
            </div>
            <div>
              <p className="text-2xl font-serif text-foreground">
                {centralProfile?.last_test_at
                  ? new Date(centralProfile.last_test_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
                  : '-'}
              </p>
              <p className="text-xs text-muted-foreground">Último teste</p>
            </div>
          </div>
        </motion.div>

        {/* Central Profile Summary */}
        {centralProfile && dominantDef && (
          <motion.div {...fadeUp} transition={{ delay: 0.15 }} className="bg-gradient-to-br from-primary/5 to-primary/10 rounded-xl border border-primary/20 p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <Layers className="w-5 h-5 text-primary" />
              <h3 className="text-lg font-serif">Perfil Comportamental</h3>
            </div>
            <div className="space-y-3">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Padrão Dominante</p>
                <p className="text-base font-medium text-foreground">{dominantDef.label}</p>
              </div>
              {centralProfile.core_pain && (
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Dor Central</p>
                  <p className="text-sm text-foreground/80">{centralProfile.core_pain}</p>
                </div>
              )}
              {centralProfile.key_unlock_area && (
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Área-chave</p>
                  <p className="text-sm text-foreground/80">{centralProfile.key_unlock_area}</p>
                </div>
              )}
              <button
                onClick={() => navigate('/central-report')}
                className="mt-2 text-sm text-primary hover:underline"
              >
                Ver relatório central completo →
              </button>
            </div>
          </motion.div>
        )}

        {/* Actions */}
        <motion.div {...fadeUp} transition={{ delay: 0.2 }} className="flex flex-col sm:flex-row gap-4 justify-center pb-12">
          <button onClick={() => navigate('/tests')} className="px-8 py-3 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity">
            Ver módulos
          </button>
          <button onClick={() => navigate('/history')} className="px-8 py-3 border border-border rounded-lg text-sm font-medium text-foreground hover:bg-muted/50 transition-colors">
            Ver histórico
          </button>
        </motion.div>
      </div>
    </div>
  );
};

export default Profile;
