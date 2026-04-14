import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Target, TrendingUp, RotateCcw, PlayCircle, Zap } from 'lucide-react';
import type { ActionPlanData } from '@/hooks/useActionPlan';

type JourneyPhase = 'no_test' | 'test_done_no_plan' | 'plan_not_started' | 'plan_in_progress' | 'plan_complete' | 'retest_available';

interface JourneyNextStepProps {
  hasCompletedTest: boolean;
  actionPlan: ActionPlanData;
  retestAvailable: boolean;
  latestModuleSlug?: string;
}

const phaseConfig: Record<JourneyPhase, { icon: any; title: string; subtitle: string; cta: string; route: string; accent: string }> = {
  no_test: {
    icon: PlayCircle,
    title: 'Descubra o que te trava',
    subtitle: 'Seu primeiro passo é entender o padrão que opera por baixo das suas decisões. Em 5 minutos, você vai saber o que nunca te disseram.',
    cta: 'Fazer minha primeira leitura',
    route: '/tests',
    accent: 'primary',
  },
  test_done_no_plan: {
    icon: Target,
    title: 'Seu diagnóstico está pronto. E agora?',
    subtitle: 'Saber o padrão sem agir é a forma mais comum de autossabotagem. Suas tarefas de transformação estão esperando.',
    cta: 'Começar a quebrar esse padrão agora',
    route: '/acompanhamento',
    accent: 'primary',
  },
  plan_not_started: {
    icon: Zap,
    title: 'O padrão ainda está intacto',
    subtitle: 'Você tem 3 tarefas desenhadas para atacar diretamente o que te trava. Nenhuma foi iniciada. O padrão agradece.',
    cta: 'Iniciar minha primeira tarefa',
    route: '/acompanhamento',
    accent: 'amber',
  },
  plan_in_progress: {
    icon: Target,
    title: 'Você já começou. Não pare agora.',
    subtitle: 'Cada tarefa concluída enfraquece o circuito neural que te mantém preso no mesmo lugar. Continue.',
    cta: 'Continuar minhas tarefas',
    route: '/acompanhamento',
    accent: 'primary',
  },
  plan_complete: {
    icon: TrendingUp,
    title: 'Você completou o ciclo. Hora da verdade.',
    subtitle: 'Suas 3 tarefas foram executadas. Agora vamos medir: o padrão enfraqueceu ou só se escondeu?',
    cta: 'Medir minha evolução real',
    route: '/tests',
    accent: 'green',
  },
  retest_available: {
    icon: RotateCcw,
    title: 'Seu padrão pode ter mudado. Ou não.',
    subtitle: 'Já se passaram 15 dias. Refaça a leitura e descubra se o que você fez realmente mudou algo — ou se foi só intenção.',
    cta: 'Refazer leitura e comparar',
    route: '/tests',
    accent: 'amber',
  },
};

function getPhase(props: JourneyNextStepProps): JourneyPhase {
  if (!props.hasCompletedTest) return 'no_test';
  if (props.retestAvailable) return 'retest_available';
  if (props.actionPlan.days.length === 0) return 'test_done_no_plan';
  if (props.actionPlan.stats.all_completed) return 'plan_complete';
  if (props.actionPlan.stats.has_in_progress) return 'plan_in_progress';
  if (!props.actionPlan.stats.has_started) return 'plan_not_started';
  return 'plan_in_progress';
}

export function JourneyNextStep(props: JourneyNextStepProps) {
  const navigate = useNavigate();
  const phase = getPhase(props);
  const config = phaseConfig[phase];
  const Icon = config.icon;

  const accentColors: Record<string, { bg: string; text: string; border: string; btnBg: string; btnText: string }> = {
    primary: { bg: 'bg-primary/5', text: 'text-primary', border: 'border-primary/20', btnBg: 'bg-primary', btnText: 'text-primary-foreground' },
    green: { bg: 'bg-green-500/5', text: 'text-green-600', border: 'border-green-500/20', btnBg: 'bg-green-600', btnText: 'text-white' },
    amber: { bg: 'bg-amber-500/5', text: 'text-amber-600', border: 'border-amber-500/20', btnBg: 'bg-amber-600', btnText: 'text-white' },
  };
  const colors = accentColors[config.accent];

  const { stats } = props.actionPlan;
  const showProgress = (phase === 'plan_in_progress' || phase === 'plan_not_started') && props.actionPlan.days.length > 0;

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
    >
      <div className={`rounded-2xl border ${colors.border} ${colors.bg} p-6 sm:p-8`}>
        <div className="flex flex-col sm:flex-row items-start gap-5">
          <div className={`w-12 h-12 rounded-2xl ${colors.bg} flex items-center justify-center shrink-0`}>
            <Icon className={`w-6 h-6 ${colors.text}`} />
          </div>

          <div className="flex-1 space-y-4">
            <div>
              <p className="text-[0.65rem] uppercase tracking-[0.15em] text-muted-foreground font-semibold mb-1">
                Próximo passo da jornada
              </p>
              <h3 className="text-lg font-semibold text-foreground">{config.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed mt-1">{config.subtitle}</p>
            </div>

            {showProgress && (
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  {props.actionPlan.days.map((task, i) => (
                    <div key={task.id} className="flex items-center gap-1.5">
                      <div className={`w-2 h-2 rounded-full ${
                        task.status === 'completed' ? 'bg-green-500' :
                        task.status === 'in_progress' ? 'bg-amber-500' :
                        'bg-muted-foreground/20'
                      }`} />
                      <span className="text-[0.6rem] text-muted-foreground">
                        {task.status === 'completed' ? '✓' : task.status === 'in_progress' ? '◎' : `T${i + 1}`}
                      </span>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  {stats.completed_days === 0 && !stats.has_in_progress && 'Nenhuma tarefa iniciada ainda'}
                  {stats.has_in_progress && !stats.all_completed && `${stats.completed_days} de ${stats.total_days} tarefas concluídas`}
                  {stats.completed_days > 0 && !stats.has_in_progress && !stats.all_completed && `${stats.completed_days} concluída${stats.completed_days > 1 ? 's' : ''}, ${stats.remaining_days} pendente${stats.remaining_days > 1 ? 's' : ''}`}
                </p>
              </div>
            )}

            <button
              onClick={() => navigate(config.route)}
              className={`inline-flex items-center gap-2 px-5 py-2.5 ${colors.btnBg} ${colors.btnText} rounded-xl text-sm font-semibold hover:brightness-90 transition-all duration-200 active:scale-[0.97]`}
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
