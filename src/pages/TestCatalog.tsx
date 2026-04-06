import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { Brain, Zap, Shield, Heart, LogOut, LayoutDashboard, User, CheckCircle2, Clock, Lock, Crown, AlertTriangle, ArrowRight, Layers } from 'lucide-react';
import { toast } from 'sonner';

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
  _actualQuestionCount?: number;
  _isIncomplete?: boolean;
}

const iconMap: Record<string, any> = {
  brain: Brain,
  zap: Zap,
  shield: Shield,
  heart: Heart,
};

const fadeUp = { initial: { opacity: 0, y: 15 }, animate: { opacity: 1, y: 0 } };

const TestCatalog = () => {
  const { user, profile, signOut, isPremium, isSuperAdmin, previewMode, togglePreviewMode } = useAuth();
  const realSuperAdmin = useAuth().role === 'super_admin';
  const navigate = useNavigate();
  const [modules, setModules] = useState<TestModule[]>([]);
  const [completedModules, setCompletedModules] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: mods } = await supabase
          .from('test_modules')
          .select('*')
          .eq('is_active', true)
          .order('sort_order');

        const allModules = (mods as TestModule[]) || [];

        const moduleIds = allModules.map(m => m.id);
        const { data: questionCounts } = await supabase
          .from('questions')
          .select('test_id')
          .in('test_id', moduleIds);

        const countMap: Record<string, number> = {};
        questionCounts?.forEach(q => {
          countMap[q.test_id] = (countMap[q.test_id] || 0) + 1;
        });

        const MIN_QUESTIONS = 10;
        const validModules = allModules.map(m => ({
          ...m,
          _actualQuestionCount: countMap[m.id] || 0,
          _isIncomplete: (countMap[m.id] || 0) < MIN_QUESTIONS,
        }));

        if (isSuperAdmin) {
          setModules(validModules);
        } else {
          setModules(validModules.filter(m => !m._isIncomplete));
        }

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
      } catch (err) {
        console.error('Error loading test catalog:', err);
        toast.error('Erro ao carregar módulos. Tente recarregar a página.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user, isSuperAdmin]);

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
  const progressPercent = modules.length > 0 ? (completedCount / modules.length) * 100 : 0;

  return (
    <div className="min-h-screen px-4 py-8 md:py-12 relative overflow-hidden">
      {/* Ambient background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[5%] left-[50%] w-[600px] h-[600px] rounded-full bg-primary/[0.03] blur-[140px]" />
        <div className="absolute bottom-[5%] right-[-5%] w-[400px] h-[400px] rounded-full bg-gold/[0.02] blur-[100px]" />
      </div>

      <div className="max-w-5xl mx-auto space-y-8 relative z-10">
        {/* Header */}
        <motion.div {...fadeUp} transition={{ duration: 0.5 }} className="flex items-center justify-between">
          <div>
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1, duration: 0.4 }}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-primary/10 bg-primary/[0.03] mb-3"
            >
              <Layers className="w-3 h-3 text-primary/50" />
              <span className="text-[9px] tracking-[0.35em] uppercase text-primary/60 font-semibold font-display">
                Módulos de Leitura
              </span>
            </motion.div>
            <h1 className="text-2xl md:text-3xl tracking-[-0.03em]">Olá, {profile?.name?.split(' ')[0]}</h1>
            <p className="text-[0.82rem] text-muted-foreground/55 mt-1.5 leading-[1.6]">
              Cada leitura alimenta seu Perfil Central unificado
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            <button onClick={() => navigate('/dashboard')} className="flex items-center gap-1.5 text-[0.72rem] text-muted-foreground/50 hover:text-foreground/80 transition-all duration-300 px-3 py-2 rounded-xl hover:bg-card/60 border border-transparent hover:border-border/30">
              <LayoutDashboard className="w-3.5 h-3.5" /> Painel
            </button>
            <button onClick={() => navigate('/profile')} className="flex items-center gap-1.5 text-[0.72rem] text-muted-foreground/50 hover:text-foreground/80 transition-all duration-300 px-3 py-2 rounded-xl hover:bg-card/60 border border-transparent hover:border-border/30">
              <User className="w-3.5 h-3.5" /> Perfil
            </button>
            <button onClick={async () => { await signOut(); navigate('/'); }} className="flex items-center gap-1.5 text-[0.72rem] text-muted-foreground/50 hover:text-foreground/80 transition-all duration-300 px-3 py-2 rounded-xl hover:bg-card/60 border border-transparent hover:border-border/30">
              <LogOut className="w-3.5 h-3.5" /> Sair
            </button>
          </div>
        </motion.div>

        {/* Progress Bar */}
        <motion.div {...fadeUp} transition={{ delay: 0.05 }} className="bg-card/60 backdrop-blur-xl rounded-2xl border border-border/40 p-6 shadow-[0_10px_40px_-15px_hsl(var(--primary)/0.06)]">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[0.82rem] font-medium text-foreground/75">Progresso geral</span>
            <span className="text-[0.72rem] text-muted-foreground/40 font-display font-medium">{completedCount}/{modules.length} módulos · {Math.round(progressPercent)}%</span>
          </div>
          <div className="w-full bg-muted/20 rounded-full h-1.5">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progressPercent}%` }}
              transition={{ delay: 0.4, duration: 1, ease: [0.22, 1, 0.36, 1] }}
              className="bg-gradient-to-r from-primary/60 to-primary rounded-full h-1.5"
            />
          </div>
        </motion.div>

        {/* Category Tabs */}
        <motion.div {...fadeUp} transition={{ delay: 0.1 }} className="flex flex-wrap gap-2">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-5 py-2.5 rounded-xl text-[0.75rem] font-medium transition-all duration-300 ${
                selectedCategory === cat
                  ? 'bg-primary text-primary-foreground shadow-[0_6px_20px_-6px_hsl(var(--primary)/0.4)]'
                  : 'bg-card/40 backdrop-blur-sm text-muted-foreground/55 hover:bg-card/70 hover:text-foreground/75 border border-border/30 hover:border-border/50'
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
            const isFreeTest = mod.slug === 'padrao-comportamental';
            const isIncomplete = mod._isIncomplete;
            const canAccess = !isIncomplete && (isSuperAdmin || isPremium || isFreeTest);

            return (
              <motion.div
                key={mod.id}
                {...fadeUp}
                transition={{ delay: 0.05 * (i + 1), duration: 0.4 }}
                className={`group bg-card/50 backdrop-blur-xl rounded-3xl border p-6 transition-all duration-500 relative overflow-hidden ${
                  isIncomplete
                    ? 'border-destructive/25 opacity-60 cursor-default'
                    : canAccess
                      ? 'border-border/35 hover:border-primary/25 cursor-pointer hover:shadow-[0_20px_60px_-15px_hsl(var(--primary)/0.1)] hover:translate-y-[-2px]'
                      : 'border-border/25 opacity-70 cursor-default'
                }`}
                onClick={() => canAccess && navigate(`/diagnostic/${mod.slug}`)}
              >
                {/* Hover glow */}
                {canAccess && !isIncomplete && (
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                )}

                {/* Status badges */}
                {isIncomplete && isSuperAdmin && (
                  <div className="absolute top-4 right-4 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-destructive/10 border border-destructive/20">
                    <AlertTriangle className="w-3 h-3 text-destructive/70" />
                    <span className="text-[0.6rem] font-bold text-destructive/80 tracking-[0.08em] uppercase font-display">Incompleto</span>
                  </div>
                )}
                {isCompleted && canAccess && !isIncomplete && (
                  <div className="absolute top-4 right-4 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/8 border border-primary/15">
                    <CheckCircle2 className="w-3 h-3 text-primary/60" />
                    <span className="text-[0.6rem] font-bold text-primary/60 tracking-[0.08em] uppercase font-display">Concluído</span>
                  </div>
                )}
                {!canAccess && !isIncomplete && (
                  <div className="absolute top-4 right-4 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gold/10 border border-gold/20">
                    <Crown className="w-3 h-3 text-gold/70" />
                    <span className="text-[0.6rem] font-bold text-gold/80 tracking-[0.08em] uppercase font-display">Premium</span>
                  </div>
                )}

                <div className="space-y-4 relative z-10">
                  <div className={`p-3 rounded-2xl w-fit transition-all duration-300 ${
                    isIncomplete
                      ? 'bg-destructive/[0.06] border border-destructive/10'
                      : canAccess
                        ? 'bg-primary/[0.05] border border-primary/10 group-hover:bg-primary/[0.08] group-hover:border-primary/15'
                        : 'bg-muted/20 border border-border/20'
                  }`}>
                    {isIncomplete
                      ? <AlertTriangle className="w-5 h-5 text-destructive/50" />
                      : canAccess
                        ? <Icon className="w-5 h-5 text-primary/50 group-hover:text-primary/70 transition-colors duration-300" />
                        : <Lock className="w-5 h-5 text-muted-foreground/35" />}
                  </div>

                  <div>
                    <h3 className="text-[0.95rem] font-medium text-foreground/85 mb-2 tracking-[-0.01em]">{mod.name}</h3>
                    {isIncomplete && isSuperAdmin ? (
                      <p className="text-[0.78rem] text-destructive/60 leading-[1.65]">
                        Estrutura incompleta ({mod._actualQuestionCount || 0} perguntas, mínimo: 10)
                      </p>
                    ) : (
                      <p className="text-[0.78rem] text-muted-foreground/55 leading-[1.65] line-clamp-3">{mod.description}</p>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-border/20">
                    <div className="flex items-center gap-3 text-[0.68rem] text-muted-foreground/40 font-display">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        ~{Math.ceil(mod.question_count * 0.5)} min
                      </span>
                      <span>{mod.question_count} itens</span>
                    </div>
                    {canAccess && !isIncomplete && (
                      <ArrowRight className="w-3.5 h-3.5 text-primary/30 group-hover:text-primary/60 group-hover:translate-x-1 transition-all duration-300" />
                    )}
                  </div>

                  {!canAccess && !isIncomplete && (
                    <p className="text-[0.7rem] text-gold/60 font-medium font-display">Requer assinatura Premium</p>
                  )}
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
