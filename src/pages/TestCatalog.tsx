import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { Brain, Zap, Shield, Heart, LogOut, LayoutDashboard, User, CheckCircle2, Clock } from 'lucide-react';

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

const categoryColors: Record<string, string> = {
  'Execução & Produtividade': 'from-blue-500/10 to-blue-600/5 border-blue-500/20',
  'Emoções & Reatividade': 'from-rose-500/10 to-rose-600/5 border-rose-500/20',
  'Relacionamentos & Apego': 'from-pink-500/10 to-pink-600/5 border-pink-500/20',
  'Autoimagem & Identidade': 'from-violet-500/10 to-violet-600/5 border-violet-500/20',
  'Dinheiro & Decisão': 'from-amber-500/10 to-amber-600/5 border-amber-500/20',
  'Padrões Ocultos': 'from-emerald-500/10 to-emerald-600/5 border-emerald-500/20',
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
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
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
            <p className="text-sm text-muted-foreground">Olá, {profile?.name?.split(' ')[0]}</p>
            <h1 className="text-2xl md:text-3xl font-serif">Módulos de Análise</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Cada teste alimenta seu Perfil Central unificado
            </p>
          </div>
          <div className="flex items-center gap-3 flex-wrap justify-end">
            <button onClick={() => navigate('/dashboard')} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
              <LayoutDashboard className="w-4 h-4" /> Dashboard
            </button>
            <button onClick={() => navigate('/profile')} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
              <User className="w-4 h-4" /> Perfil
            </button>
            <button onClick={async () => { await signOut(); navigate('/'); }} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
              <LogOut className="w-4 h-4" /> Sair
            </button>
          </div>
        </motion.div>

        {/* Progress Bar */}
        <motion.div {...fadeUp} transition={{ delay: 0.05 }} className="bg-card rounded-xl border border-border p-5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-foreground">Progresso geral</span>
            <span className="text-sm text-muted-foreground">{completedCount}/{modules.length} módulos</span>
          </div>
          <div className="w-full bg-muted/50 rounded-full h-2">
            <div
              className="bg-primary rounded-full h-2 transition-all duration-700"
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
              className={`px-4 py-2 rounded-lg text-xs font-medium transition-all ${
                selectedCategory === cat
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground'
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
            const colorClass = categoryColors[mod.category] || 'from-primary/10 to-primary/5 border-primary/20';
            return (
              <motion.div
                key={mod.id}
                {...fadeUp}
                transition={{ delay: 0.05 * (i + 1), duration: 0.4 }}
                className={`bg-gradient-to-br ${colorClass} rounded-xl border p-5 shadow-sm hover:shadow-md transition-all cursor-pointer group relative`}
                onClick={() => navigate(`/diagnostic/${mod.slug}`)}
              >
                {isCompleted && (
                  <div className="absolute top-3 right-3">
                    <CheckCircle2 className="w-5 h-5 text-primary" />
                  </div>
                )}
                <div className="space-y-3">
                  <div className="p-2.5 rounded-lg bg-background/60 w-fit">
                    <Icon className="w-5 h-5 text-foreground/70" />
                  </div>
                  <div>
                    <h3 className="text-base font-medium text-foreground mb-1">{mod.name}</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">{mod.description}</p>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground pt-1">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      ~{Math.ceil(mod.question_count * 0.5)} min
                    </span>
                    <span>{mod.question_count} perguntas</span>
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
