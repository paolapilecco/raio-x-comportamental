import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import {
  Brain, Zap, Shield, Heart, Lock, AlertTriangle,
  ArrowRight, Clock, CheckCircle2, X, Eye, Flame, Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';
import { TestCatalogSkeleton } from '@/components/skeletons/TestCatalogSkeleton';
import { AppLayout } from '@/components/AppLayout';

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

const iconMap: Record<string, any> = { brain: Brain, zap: Zap, shield: Shield, heart: Heart };

/* ── Behavioral copy per slug (curiosity/pain triggers) ── */
const behavioralHook: Record<string, string> = {
  'padrao-comportamental': 'Identifica o padrão que faz você repetir os mesmos erros sem perceber.',
  'execucao': 'Mostra por que você começa e não termina — e o que trava sua execução.',
  'emocoes': 'Revela como suas emoções sabotam suas decisões antes de você perceber.',
  'relacionamentos': 'Expõe o padrão que faz você repetir os mesmos conflitos em qualquer relação.',
  'autoimagem': 'Mostra a imagem distorcida que você tem de si — e como ela te limita.',
  'dinheiro': 'Revela o comportamento invisível que te impede de construir riqueza.',
  'padroes-ocultos': 'Desvenda os padrões que operam por baixo da sua consciência.',
  'proposito': 'Mostra por que você sente que algo está faltando — mesmo quando "tudo está bem".',
  'mapa-de-vida': 'Uma radiografia completa de onde você está travado em cada área da vida.',
};

const lockedTeasers: Record<string, string> = {
  'execucao': 'Você começa e para — aqui está o motivo real.',
  'emocoes': 'Você reage antes de pensar — esse teste mostra por quê.',
  'relacionamentos': 'Você repete os mesmos conflitos — aqui está o padrão.',
  'autoimagem': 'Você se enxerga de forma distorcida — esse teste revela como.',
  'dinheiro': 'Você se sabota financeiramente sem perceber — esse teste mostra o mecanismo.',
  'padroes-ocultos': 'Tem algo operando que você não vê — esse teste revela.',
  'proposito': 'Você sente que falta algo — esse teste mostra o que é.',
  'mapa-de-vida': 'Você não sabe onde está travado de verdade — esse teste mapeia tudo.',
};

const fadeUp = { initial: { opacity: 0, y: 15 }, animate: { opacity: 1, y: 0 } };

const TestCatalog = () => {
  const { user, profile, isPremium, isSuperAdmin, previewMode, togglePreviewMode } = useAuth();
  const realSuperAdmin = useAuth().role === 'super_admin';
  const navigate = useNavigate();
  const [modules, setModules] = useState<TestModule[]>([]);
  const [completedModules, setCompletedModules] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [upgradeModal, setUpgradeModal] = useState<TestModule | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: mods } = await supabase
          .from('test_modules').select('*').eq('is_active', true).order('sort_order');
        const allModules = (mods as TestModule[]) || [];
        const moduleIds = allModules.map(m => m.id);
        const { data: questionCounts } = await supabase
          .from('questions').select('test_id').in('test_id', moduleIds);
        const countMap: Record<string, number> = {};
        questionCounts?.forEach(q => { countMap[q.test_id] = (countMap[q.test_id] || 0) + 1; });
        const MIN_QUESTIONS = 10;
        const validModules = allModules.map(m => ({
          ...m,
          _actualQuestionCount: countMap[m.id] || 0,
          _isIncomplete: (countMap[m.id] || 0) < MIN_QUESTIONS,
        }));
        setModules(isSuperAdmin ? validModules : validModules.filter(m => !m._isIncomplete));
        if (user) {
          const { data: sessions } = await supabase
            .from('diagnostic_sessions').select('test_module_id')
            .eq('user_id', user.id).not('completed_at', 'is', null).not('test_module_id', 'is', null);
          if (sessions) setCompletedModules(new Set(sessions.map(s => s.test_module_id!)));
        }
      } catch (err) {
        console.error('Error loading test catalog:', err);
        toast.error('Erro ao carregar módulos.');
      } finally { setLoading(false); }
    };
    fetchData();
  }, [user, isSuperAdmin]);

  if (loading) return <TestCatalogSkeleton />;

  const showFull = isPremium || isSuperAdmin;
  const displayName = profile?.name?.split(' ')[0] || 'Usuário';

  /* ── Separate free vs locked ── */
  const freeModules = modules.filter(m => m.slug === 'padrao-comportamental' || showFull);
  const lockedModules = showFull ? [] : modules.filter(m => m.slug !== 'padrao-comportamental' && !m._isIncomplete);
  const incompleteModules = isSuperAdmin ? modules.filter(m => m._isIncomplete) : [];

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 md:px-8 py-6 sm:py-10 space-y-6">

        {/* ═══ HEADER ═══ */}
        <motion.section {...fadeUp} transition={{ duration: 0.5 }}>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground leading-tight">
            {displayName}, cada teste revela uma camada diferente.
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed mt-2 max-w-xl">
            Quanto mais você descobre, mais difícil fica fingir que não sabe.
          </p>
        </motion.section>

        {/* Preview mode */}
        {previewMode && (
          <motion.div {...fadeUp} className="bg-primary/5 border border-primary/20 rounded-2xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-sm">👁</span>
              <div>
                <p className="text-sm font-semibold text-foreground">Modo Pré-visualização</p>
                <p className="text-xs text-muted-foreground">Visão de usuário padrão</p>
              </div>
            </div>
            <button onClick={togglePreviewMode} className="text-xs font-medium px-4 py-2 rounded-xl bg-primary text-primary-foreground hover:brightness-90 transition-all active:scale-[0.97]">Sair</button>
          </motion.div>
        )}
        {realSuperAdmin && !previewMode && (
          <motion.div {...fadeUp}>
            <button onClick={togglePreviewMode} className="text-xs font-medium px-4 py-2 rounded-xl border border-border/30 text-muted-foreground/60 hover:text-foreground/80 hover:bg-card/60 transition-all">
              👁 Ver como usuário padrão
            </button>
          </motion.div>
        )}

        {/* ═══ FREE / ACCESSIBLE TESTS ═══ */}
        <div className="space-y-4">
          <p className="text-[0.6rem] uppercase tracking-[0.15em] text-muted-foreground font-semibold">
            {showFull ? 'Seus módulos de análise' : 'Liberado no seu plano'}
          </p>
          {freeModules.filter(m => !m._isIncomplete).map((mod, i) => (
            <TestCard
              key={mod.id}
              mod={mod}
              index={i}
              isCompleted={completedModules.has(mod.id)}
              isLocked={false}
              isSuperAdmin={isSuperAdmin}
              onStart={() => navigate(`/diagnostic/${mod.slug}`)}
            />
          ))}
        </div>

        {/* ═══ LOCKED TESTS — Desirable ═══ */}
        {lockedModules.length > 0 && (
          <div className="space-y-4 pt-2">
            <div className="flex items-center gap-3">
              <p className="text-[0.6rem] uppercase tracking-[0.15em] text-muted-foreground font-semibold">
                Próximo nível de análise
              </p>
              <div className="flex-1 h-px bg-border/20" />
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/8 border border-amber-500/15">
                <Lock className="w-3 h-3 text-amber-600/60" />
                <span className="text-[0.55rem] font-bold text-amber-600/70 uppercase tracking-wider">Bloqueado no seu plano</span>
              </div>
            </div>

            {lockedModules.map((mod, i) => (
              <TestCard
                key={mod.id}
                mod={mod}
                index={i}
                isCompleted={false}
                isLocked={true}
                isSuperAdmin={isSuperAdmin}
                onStart={() => setUpgradeModal(mod)}
              />
            ))}
          </div>
        )}

        {/* ═══ INCOMPLETE (super_admin only) ═══ */}
        {incompleteModules.length > 0 && (
          <div className="space-y-4 pt-2">
            <p className="text-[0.6rem] uppercase tracking-[0.15em] text-destructive/60 font-semibold">
              Incompletos (admin)
            </p>
            {incompleteModules.map((mod, i) => (
              <motion.div
                key={mod.id}
                {...fadeUp}
                transition={{ delay: 0.03 * i, duration: 0.4 }}
                className="bg-card/40 rounded-2xl border border-destructive/15 p-4 opacity-60"
              >
                <div className="flex items-center gap-3">
                  <AlertTriangle className="w-4 h-4 text-destructive/50 shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-foreground/70">{mod.name}</p>
                    <p className="text-xs text-destructive/50">{mod._actualQuestionCount || 0} perguntas (mín: 10)</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* ═══ UPGRADE MODAL ═══ */}
      <AnimatePresence>
        {upgradeModal && (
          <UpgradeModal mod={upgradeModal} onClose={() => setUpgradeModal(null)} onUpgrade={() => { setUpgradeModal(null); navigate('/checkout'); }} />
        )}
      </AnimatePresence>
    </AppLayout>
  );
};

/* ═══════════════════════════════════════════════════════════
   TEST CARD COMPONENT
   ═══════════════════════════════════════════════════════════ */
function TestCard({ mod, index, isCompleted, isLocked, onStart }: {
  mod: TestModule;
  index: number;
  isCompleted: boolean;
  isLocked: boolean;
  onStart: () => void;
}) {
  const Icon = iconMap[mod.icon] || Brain;
  const hookText = behavioralHook[mod.slug] || mod.description;
  const teaserText = lockedTeasers[mod.slug];

  return (
    <motion.div
      {...fadeUp}
      transition={{ delay: 0.03 * index, duration: 0.4 }}
      onClick={onStart}
      className={`group relative rounded-2xl border overflow-hidden transition-all duration-300 cursor-pointer ${
        isLocked
          ? 'bg-card/30 border-amber-500/12 hover:border-amber-500/25 hover:shadow-[0_8px_30px_-10px_hsl(var(--gold)/0.12)]'
          : 'bg-card border-border/30 hover:border-primary/20 hover:shadow-[0_8px_30px_-10px_hsl(var(--primary)/0.1)]'
      } hover:translate-y-[-1px] active:scale-[0.995]`}
    >
      {/* Locked overlay shimmer */}
      {isLocked && (
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-amber-500/[0.03] to-transparent animate-shimmer" />
        </div>
      )}

      <div className="p-5 sm:p-6">
        <div className="flex items-start gap-4">
          {/* Icon */}
          <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-all duration-300 ${
            isLocked
              ? 'bg-amber-500/[0.06] border border-amber-500/12'
              : isCompleted
                ? 'bg-green-500/[0.06] border border-green-500/15'
                : 'bg-primary/[0.05] border border-primary/10 group-hover:bg-primary/[0.08]'
          }`}>
            {isLocked
              ? <Lock className="w-5 h-5 text-amber-600/50" />
              : <Icon className={`w-5 h-5 transition-colors duration-300 ${isCompleted ? 'text-green-600/60' : 'text-primary/50 group-hover:text-primary/70'}`} />
            }
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className={`text-[0.95rem] font-semibold tracking-tight ${isLocked ? 'text-foreground/70' : 'text-foreground/90'}`}>
                {mod.name}
              </h3>
              {isCompleted && (
                <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-green-500/8 border border-green-500/12">
                  <CheckCircle2 className="w-3 h-3 text-green-600/60" />
                  <span className="text-[0.55rem] font-bold text-green-600/70 uppercase tracking-wider">Concluído</span>
                </div>
              )}
            </div>

            <p className={`text-[0.8rem] leading-relaxed ${isLocked ? 'text-muted-foreground/50' : 'text-muted-foreground/65'}`}>
              {hookText}
            </p>

            {/* Locked teaser — behavioral provocation */}
            {isLocked && teaserText && (
              <div className="mt-3 flex items-start gap-2 rounded-xl bg-amber-500/[0.04] border border-amber-500/10 px-3.5 py-2.5">
                <Eye className="w-3.5 h-3.5 text-amber-600/50 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-700/70 font-medium leading-relaxed italic">
                  "{teaserText}"
                </p>
              </div>
            )}

            {/* Meta info */}
            <div className="flex items-center gap-4 mt-3 text-[0.65rem] text-muted-foreground/40">
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                ~{Math.ceil(mod.question_count * 0.5)} min
              </span>
              <span>{mod.question_count} itens</span>
            </div>
          </div>

          {/* Action indicator */}
          <div className="shrink-0 self-center">
            {isLocked ? (
              <div className="w-9 h-9 rounded-xl bg-amber-500/[0.06] border border-amber-500/12 flex items-center justify-center group-hover:bg-amber-500/[0.1] transition-all">
                <Sparkles className="w-4 h-4 text-amber-600/50 group-hover:text-amber-600/70 transition-colors" />
              </div>
            ) : (
              <div className="w-9 h-9 rounded-xl bg-primary/[0.04] border border-primary/10 flex items-center justify-center group-hover:bg-primary/[0.08] transition-all">
                <ArrowRight className="w-4 h-4 text-primary/40 group-hover:text-primary/70 group-hover:translate-x-0.5 transition-all" />
              </div>
            )}
          </div>
        </div>

        {/* Locked CTA */}
        {isLocked && (
          <div className="mt-4 pt-3 border-t border-amber-500/8">
            <button
              onClick={(e) => { e.stopPropagation(); onStart(); }}
              className="w-full py-2.5 rounded-xl text-xs font-bold tracking-wide
                bg-gradient-to-r from-amber-600/90 via-amber-500/90 to-amber-600/90
                text-white/95 shadow-sm
                hover:brightness-110 hover:shadow-md active:scale-[0.98]
                transition-all duration-300 flex items-center justify-center gap-2"
            >
              <Eye className="w-3.5 h-3.5" />
              Ver o que está por trás desse padrão
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════
   UPGRADE MODAL — Psychological tension maintained
   ═══════════════════════════════════════════════════════════ */
function UpgradeModal({ mod, onClose, onUpgrade }: { mod: TestModule; onClose: () => void; onUpgrade: () => void }) {
  const teaser = lockedTeasers[mod.slug] || 'Esse teste revela o que você ainda não viu.';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        onClick={(e) => e.stopPropagation()}
        className="bg-card rounded-3xl border border-border/40 shadow-2xl max-w-md w-full overflow-hidden"
      >
        {/* Header gradient */}
        <div className="relative px-6 pt-8 pb-6 bg-gradient-to-b from-amber-500/[0.04] to-transparent">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-xl bg-secondary/50 flex items-center justify-center text-muted-foreground/50 hover:text-foreground hover:bg-secondary transition-all"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="w-14 h-14 rounded-2xl bg-amber-500/[0.08] border border-amber-500/15 flex items-center justify-center mb-4">
            <Lock className="w-6 h-6 text-amber-600/60" />
          </div>

          <h2 className="text-lg font-bold text-foreground tracking-tight">
            {mod.name}
          </h2>
          <p className="text-sm text-muted-foreground/70 mt-1.5 leading-relaxed">
            Você já viu parte do seu padrão. Aqui está o próximo nível — mas não no plano atual.
          </p>
        </div>

        {/* Behavioral provocation */}
        <div className="px-6 pb-4">
          <div className="rounded-xl bg-amber-500/[0.04] border border-amber-500/10 px-4 py-3.5">
            <div className="flex items-start gap-2.5">
              <Flame className="w-4 h-4 text-amber-600/60 shrink-0 mt-0.5" />
              <p className="text-sm text-foreground/75 font-medium leading-relaxed italic">
                "{teaser}"
              </p>
            </div>
          </div>
        </div>

        {/* What this test reveals */}
        <div className="px-6 pb-4">
          <p className="text-xs text-muted-foreground/50 uppercase tracking-wider font-semibold mb-2">O que esse teste revela</p>
          <p className="text-sm text-muted-foreground/70 leading-relaxed">
            {behavioralHook[mod.slug] || mod.description}
          </p>
        </div>

        {/* Consequence */}
        <div className="px-6 pb-6">
          <p className="text-xs text-destructive/50 font-semibold leading-relaxed text-center">
            Sem ver isso, você continua repetindo o mesmo padrão — achando que o problema é outro.
          </p>
        </div>

        {/* CTA */}
        <div className="px-6 pb-6 space-y-3">
          <button
            onClick={onUpgrade}
            className="w-full py-3.5 rounded-2xl text-sm font-bold tracking-wide
              bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600
              text-white shadow-[0_4px_18px_-4px_rgba(0,0,0,0.2)]
              hover:shadow-[0_8px_28px_-4px_rgba(0,0,0,0.25)] hover:brightness-110
              active:scale-[0.97] transition-all duration-300
              flex items-center justify-center gap-2"
          >
            Desbloquear esse nível de análise
          </button>
          <button
            onClick={onClose}
            className="w-full py-2.5 text-xs text-muted-foreground/40 hover:text-muted-foreground/60 transition-colors"
          >
            Continuar sem ver
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default TestCatalog;
