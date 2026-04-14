import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Target, TrendingUp, RotateCcw, PlayCircle } from 'lucide-react';
import type { ActionPlanData } from '@/hooks/useActionPlan';

type JourneyPhase = 'no_test' | 'test_done_no_plan' | 'plan_active' | 'plan_complete' | 'retest_available';

interface JourneyNextStepProps {
  hasCompletedTest: boolean;
  actionPlan: ActionPlanData;
  retestAvailable: boolean;
  latestModuleSlug?: string;
}

const phaseConfig: Record<JourneyPhase, { icon: any; title: string; subtitle: string; cta: string; route: string; accent: string }> = {
  no_test: {
    icon: PlayCircle,
    title: 'Comece sua jornada',
    subtitle: 'Faça sua primeira leitura comportamental para descobrir seus padrões.',
    cta: 'Fazer primeira leitura',
    route: '/tests',
    accent: 'primary',
  },
  test_done_no_plan: {
    icon: Target,
    title: 'Ative seu plano de ação',
    subtitle: 'Seu diagnóstico está pronto. Agora é hora de colocar as micro-ações em prática.',
    cta: 'Ver plano de ação',
    route: '/acompanhamento',
    accent: 'primary',
  },
  plan_active: {
    icon: Target,
    title: 'Continue executando',
    subtitle: 'Você está no meio do seu ciclo. Cada ação concluída enfraquece o padrão.',
    cta: 'Ver minhas ações',
    route: '/acompanhamento',
    accent: 'primary',
  },
  plan_complete: {
    icon: TrendingUp,
    title: 'Ciclo concluído!',
    subtitle: 'Parabéns! Seu ciclo terminou. Hora de medir sua evolução real.',
    cta: 'Iniciar reavaliação',
    route: '/tests',
    accent: 'green',
  },
  retest_available: {
    icon: RotateCcw,
    title: 'Hora da reavaliação',
    subtitle: 'Já se passaram 15 dias. Refaça o teste e veja o que realmente mudou.',
    cta: 'Refazer leitura',
    route: '/tests',
    accent: 'gold',
  },
};

function getPhase(props: JourneyNextStepProps): JourneyPhase {
  if (!props.hasCompletedTest) return 'no_test';
  if (props.retestAvailable) return 'retest_available';
  if (props.actionPlan.days.length === 0) return 'test_done_no_plan';
  if (props.actionPlan.stats.execution_rate >= 100) return 'plan_complete';
  return 'plan_active';
}

export function JourneyNextStep(props: JourneyNextStepProps) {
  const navigate = useNavigate();
  const phase = getPhase(props);
  const config = phaseConfig[phase];
  const Icon = config.icon;

  const accentColors: Record<string, { bg: string; text: string; border: string; btnBg: string; btnText: string }> = {
    primary: { bg: 'bg-primary/5', text: 'text-primary', border: 'border-primary/20', btnBg: 'bg-primary', btnText: 'text-primary-foreground' },
    green: { bg: 'bg-green-500/5', text: 'text-green-600', border: 'border-green-500/20', btnBg: 'bg-green-600', btnText: 'text-white' },
    gold: { bg: 'bg-amber-500/5', text: 'text-amber-600', border: 'border-amber-500/20', btnBg: 'bg-amber-600', btnText: 'text-white' },
  };
  const colors = accentColors[config.accent];

  // Progress info for plan_active
  const showProgress = phase === 'plan_active' && props.actionPlan.days.length > 0;
  const { stats } = props.actionPlan;

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
    >
      <div className={`rounded-2xl border ${colors.border} ${colors.bg} p-6 sm:p-8`}>
        <div className="flex flex-col sm:flex-row items-start gap-5">
          {/* Icon */}
          <div className={`w-12 h-12 rounded-2xl ${colors.bg} flex items-center justify-center shrink-0`}>
            <Icon className={`w-6 h-6 ${colors.text}`} />
          </div>

          {/* Content */}
          <div className="flex-1 space-y-3">
            <div>
              <p className="text-[0.65rem] uppercase tracking-[0.15em] text-muted-foreground font-semibold mb-1">
                Próximo passo
              </p>
              <h3 className="text-lg font-semibold text-foreground">{config.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed mt-1">{config.subtitle}</p>
            </div>

            {/* Progress bar for active plan */}
            {showProgress && (
              <div className="space-y-2">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{stats.completed_days} de {stats.total_days} ações concluídas</span>
                  <span className="font-semibold tabular-nums">{stats.execution_rate}%</span>
                </div>
                <div className="w-full h-2 rounded-full bg-muted/20 overflow-hidden">
                  <motion.div
                    className={`h-full rounded-full ${colors.btnBg}`}
                    initial={{ width: 0 }}
                    animate={{ width: `${stats.execution_rate}%` }}
                    transition={{ delay: 0.3, duration: 1, ease: [0.22, 1, 0.36, 1] }}
                  />
                </div>
                {stats.current_streak > 0 && (
                  <p className="text-xs text-muted-foreground">
                    🔥 {stats.current_streak} dias seguidos executando
                  </p>
                )}
              </div>
            )}

            <button
              onClick={() => navigate(config.route)}
              className={`inline-flex items-center gap-2 px-5 py-2.5 ${colors.btnBg} ${colors.btnText} rounded-xl text-sm font-medium hover:brightness-90 transition-all duration-200 active:scale-[0.97]`}
            >
              {config.cta}
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </motion.section>
  );
}
