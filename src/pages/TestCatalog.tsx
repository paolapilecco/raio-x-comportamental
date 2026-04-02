import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { Brain, Zap, Shield, Heart, LogOut, LayoutDashboard } from 'lucide-react';

interface TestModule {
  id: string;
  slug: string;
  name: string;
  description: string;
  category: string;
  icon: string;
  question_count: number;
  is_active: boolean;
  sort_order: number;
}

const iconMap: Record<string, any> = {
  brain: Brain,
  zap: Zap,
  shield: Shield,
  heart: Heart,
};

const fadeUp = {
  initial: { opacity: 0, y: 15 },
  animate: { opacity: 1, y: 0 },
};

const TestCatalog = () => {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [modules, setModules] = useState<TestModule[]>([]);
  const [completedModules, setCompletedModules] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const { data: mods } = await supabase
        .from('test_modules')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');

      setModules((mods as TestModule[]) || []);

      if (user) {
        const { data: sessions } = await supabase
          .from('diagnostic_sessions')
          .select('test_module_id')
          .eq('user_id', user.id)
          .not('completed_at', 'is', null)
          .not('test_module_id', 'is', null);

        if (sessions) {
          setCompletedModules(new Set(sessions.map(s => s.test_module_id!)));
        }
      }

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

  return (
    <div className="min-h-screen px-4 py-8 md:py-12">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <motion.div {...fadeUp} transition={{ duration: 0.5 }} className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Olá, {profile?.name?.split(' ')[0]}</p>
            <h1 className="text-2xl md:text-3xl font-serif">Módulos de Análise</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Cada teste alimenta seu Perfil Central unificado
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/dashboard')} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
              <LayoutDashboard className="w-4 h-4" /> Dashboard
            </button>
            <button onClick={async () => { await signOut(); navigate('/'); }} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
              <LogOut className="w-4 h-4" /> Sair
            </button>
          </div>
        </motion.div>

        {/* Module Grid */}
        <div className="grid sm:grid-cols-2 gap-6">
          {modules.map((mod, i) => {
            const Icon = iconMap[mod.icon] || Brain;
            const isCompleted = completedModules.has(mod.id);
            return (
              <motion.div
                key={mod.id}
                {...fadeUp}
                transition={{ delay: 0.05 * (i + 1), duration: 0.5 }}
                className="bg-card rounded-xl border border-border p-6 shadow-sm hover:border-primary/40 transition-all cursor-pointer group"
                onClick={() => navigate(`/diagnostic/${mod.slug}`)}
              >
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-lg bg-primary/5 text-primary group-hover:bg-primary/10 transition-colors">
                    <Icon className="w-6 h-6" />
                  </div>
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-medium text-foreground">{mod.name}</h3>
                      {isCompleted && (
                        <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
                          Concluído
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">{mod.description}</p>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span>{mod.question_count} perguntas</span>
                      <span>~{Math.ceil(mod.question_count * 0.5)} min</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}

          {/* Coming Soon placeholder */}
          <motion.div
            {...fadeUp}
            transition={{ delay: 0.15, duration: 0.5 }}
            className="bg-card/50 rounded-xl border border-dashed border-border p-6 flex items-center justify-center"
          >
            <div className="text-center space-y-2">
              <Zap className="w-6 h-6 text-muted-foreground/40 mx-auto" />
              <p className="text-sm text-muted-foreground/60">Novos módulos em breve</p>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default TestCatalog;
