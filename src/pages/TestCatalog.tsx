import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { Brain, Zap, Shield, Heart, LogOut, LayoutDashboard, User, CheckCircle2, Clock, Lock, Crown } from 'lucide-react';

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

const fadeUp = { initial: { opacity: 0, y: 15 }, animate: { opacity: 1, y: 0 } };

const TestCatalog = () => {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [modules, setModules] = useState<TestModule[]>([]);
  const [completedModules, setCompletedModules] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

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
        <div className="w-8 h-8 border border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  const categories = ['all', ...Array.from(new Set(modules.map(m => m.category)))];
  const filtered = selectedCategory === 'all' ? modules : modules.filter(m => m.category === selectedCategory);
  const completedCount = modules.filter(m => completedModules.has(m.id)).length;

  return (
    <div className="min-h-screen px-4 py-8 md:py-12">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Header */}
        <motion.div {...fadeUp} transition={{ duration: 0.5 }} className="flex items-center justify-between">
          <div>
            <p className="text-[10px] tracking-[0.3em] uppercase text-primary/50 font-semibold">Módulos de Leitura</p>
            <h1 className="text-2xl md:text-3xl mt-1">Olá, {profile?.name?.split(' ')[0]}</h1>
            <p className="text-[0.82rem] text-muted-foreground/60 mt-1 leading-[1.6]">
              Cada leitura alimenta seu Perfil Central unificado
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap justify-end">
            <button onClick={() => navigate('/dashboard')} className="flex items-center gap-1.5 text-[0.75rem] text-muted-foreground/60 hover:text-foreground/80 transition-colors px-2.5 py-1.5 rounded-lg hover:bg-card/60">
              <LayoutDashboard className="w-3.5 h-3.5" /> Painel
            </button>
            <button onClick={() => navigate('/profile')} className="flex items-center gap-1.5 text-[0.75rem] text-muted-foreground/60 hover:text-foreground/80 transition-colors px-2.5 py-1.5 rounded-lg hover:bg-card/60">
              <User className="w-3.5 h-3.5" /> Perfil
            </button>
            <button onClick={async () => { await signOut(); navigate('/'); }} className="flex items-center gap-1.5 text-[0.75rem] text-muted-foreground/60 hover:text-foreground/80 transition-colors px-2.5 py-1.5 rounded-lg hover:bg-card/60">
              <LogOut className="w-3.5 h-3.5" /> Sair
            </button>
          </div>
        </motion.div>

        {/* Progress Bar */}
        <motion.div {...fadeUp} transition={{ delay: 0.05 }} className="bg-card/80 backdrop-blur-sm rounded-2xl border border-border/60 p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[0.8rem] font-medium text-foreground/80">Progresso geral</span>
            <span className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground/50 font-medium">{completedCount}/{modules.length} módulos</span>
          </div>
          <div className="w-full bg-muted/30 rounded-full h-[3px]">
            <div
              className="bg-primary/70 rounded-full h-[3px] transition-all duration-700"
              style={{ width: `${modules.length > 0 ? (completedCount / modules.length) * 100 : 0}%` }}
            />
          </div>
        </motion.div>

        {/* Category Tabs */}
        <motion.div {...fadeUp} transition={{ delay: 0.1 }} className="flex flex-wrap gap-2">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2 rounded-xl text-[0.75rem] font-medium transition-all duration-200 ${
                selectedCategory === cat
                  ? 'bg-primary text-primary-foreground shadow-[0_4px_16px_-4px_hsl(var(--primary)/0.3)]'
                  : 'bg-card/60 text-muted-foreground/60 hover:bg-card hover:text-foreground/80 border border-border/40'
              }`}
            >
              {cat === 'all' ? 'Todos' : cat}
            </button>
          ))}
        </motion.div>

        {/* Module Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((mod, i) => {
            const Icon = iconMap[mod.icon] || Brain;
            const isCompleted = completedModules.has(mod.id);
            return (
              <motion.div
                key={mod.id}
                {...fadeUp}
                transition={{ delay: 0.05 * (i + 1), duration: 0.4 }}
                className="bg-card/70 backdrop-blur-sm rounded-2xl border border-border/50 p-5 hover:border-primary/20 transition-all duration-300 cursor-pointer group relative"
                onClick={() => navigate(`/diagnostic/${mod.slug}`)}
              >
                {isCompleted && (
                  <div className="absolute top-3 right-3">
                    <CheckCircle2 className="w-4.5 h-4.5 text-primary/60" />
                  </div>
                )}
                <div className="space-y-4">
                  <div className="p-2.5 rounded-xl bg-primary/[0.04] border border-primary/10 w-fit">
                    <Icon className="w-5 h-5 text-primary/50" />
                  </div>
                  <div>
                    <h3 className="text-[0.95rem] font-medium text-foreground/85 mb-1.5 tracking-[-0.01em]">{mod.name}</h3>
                    <p className="text-[0.78rem] text-muted-foreground/60 leading-[1.65] line-clamp-3">{mod.description}</p>
                  </div>
                  <div className="flex items-center gap-3 text-[0.7rem] text-muted-foreground/45 pt-1">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      ~{Math.ceil(mod.question_count * 0.5)} min
                    </span>
                    <span>{mod.question_count} itens</span>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default TestCatalog;
