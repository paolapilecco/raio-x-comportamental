import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Target, RotateCcw, PlayCircle, Zap, Clock, Eye, ShieldCheck, AlertTriangle } from 'lucide-react';
import type { ActionPlanData } from '@/hooks/useActionPlan';
import type { RetestCycleData } from '@/hooks/useRetestCycle';

type JourneyPhase =
  | 'no_test'
  | 'test_done_no_plan'
  | 'plan_not_started'
  | 'plan_in_progress'
  | 'plan_complete_waiting'
  | 'retest_available'
  | 'retest_available_no_plan';

interface JourneyNextStepProps {
  hasCompletedTest: boolean;
  actionPlan: ActionPlanData;
  retestCycle: RetestCycleData;
  latestModuleSlug?: string;
  behavioralMemory?: Record<string, unknown>;
}

const phaseConfig: Record<JourneyPhase, { icon: any; title: string; subtitle: string; cta: string; route: string; accent: string }> = {
  no_test: {
    icon: PlayCircle,
    title: 'Você ainda não sabe o que te trava.',
    subtitle: 'Seu padrão opera no automático. Ele decide por você enquanto você acha que está no controle. Em 5 minutos, você vai ver o que nunca te disseram.',
    cta: 'Descobrir meu padrão agora',
    route: '/tests',
    accent: 'primary',
  },
  test_done_no_plan: {
    icon: Target,
    title: 'Saber não muda nada. Executar muda.',
    subtitle: 'Você já viu o padrão. Agora ele precisa ser atacado em 3 fases — ou continua operando exatamente como antes. Cada dia sem ação é um dia que o padrão se fortalece.',
    cta: 'Começar a quebrar esse padrão agora',
    route: '/acompanhamento',
    accent: 'primary',
  },
  plan_not_started: {
    icon: AlertTriangle,
    title: 'O padrão continua intacto. Você não começou.',
    subtitle: 'Você tem 3 fases desenhadas para atacar diretamente o que te trava. Nenhuma foi iniciada. Enquanto você espera, o circuito neural que te mantém preso se fortalece.',
    cta: 'Iniciar agora — antes que você desista',
    route: '/acompanhamento',
    accent: 'amber',
  },
  plan_in_progress: {
    icon: Zap,
    title: 'Não pare agora. Seu cérebro quer que você pare.',
    subtitle: 'O desconforto que você sente é o padrão se defendendo. Cada fase concluída enfraquece o circuito que te mantém preso no mesmo lugar. Desistir aqui é confirmar o padrão.',
    cta: 'Continuar quebrando o ciclo',
    route: '/acompanhamento',
    accent: 'primary',
  },
  plan_complete_waiting: {
    icon: Clock,
    title: 'Processo executado. Agora vem a parte mais difícil: esperar.',
    subtitle: 'Seu cérebro vai te dizer que já mudou. Não confie. Mudança real precisa de tempo para se consolidar. Em breve, vamos medir se o padrão realmente enfraqueceu — ou só se escondeu.',
    cta: 'Ver meu progresso',
    route: '/acompanhamento',
    accent: 'green',
  },
  retest_available: {
    icon: Eye,
    title: 'Se você não medir agora, vai acreditar que mudou… mesmo não tendo mudado.',
    subtitle: 'Você executou o plano e o tempo passou. Mas o cérebro se adapta e engana você. Só o reteste mostra a verdade: o padrão enfraqueceu ou apenas se disfarçou?',
    cta: 'Medir minha evolução real',
    route: '/tests',
    accent: 'amber',
  },
  retest_available_no_plan: {
    icon: RotateCcw,
    title: 'Sem medir, você não sabe se mudou. E provavelmente não mudou.',
    subtitle: 'Já se passaram 15 dias. Seu padrão pode ter se adaptado — ou você apenas se acostumou com ele. Refaça a leitura e descubra a verdade.',
    cta: 'Encarar o reteste agora',
    route: '/tests',
    accent: 'amber',
  },
};

function getPhase(props: JourneyNextStepProps): JourneyPhase {
  const { hasCompletedTest, actionPlan, retestCycle } = props;
  if (!hasCompletedTest) return 'no_test';
  const planCompleted = actionPlan.stats.all_completed;
  const retestReady = retestCycle.retestAvailable;
  if (planCompleted && retestReady) return 'retest_available';
  if (retestReady && !planCompleted) return 'retest_available_no_plan';
  if (planCompleted && !retestReady) return 'plan_complete_waiting';
  if (actionPlan.days.length === 0) return 'test_done_no_plan';
  if (!actionPlan.stats.has_started) return 'plan_not_started';
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
  const showCountdown = phase === 'plan_complete_waiting' && props.retestCycle.daysUntilRetest > 0;

  const stageLabels: Record<JourneyPhase, string> = {
    no_test: 'Etapa 1 — Diagnóstico',
    test_done_no_plan: 'Etapa 2 — Plano de Ação',
    plan_not_started: 'Etapa 2 — Plano de Ação',
    plan_in_progress: 'Etapa 2 — Execução',
    plan_complete_waiting: 'Etapa 3 — Período de Prática',
    retest_available: 'Etapa 4 — Reavaliação',
    retest_available_no_plan: 'Etapa 4 — Reavaliação',
  };

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
    >
      <div className={`rounded-2xl border ${colors.border} ${colors.bg} p-6 sm:p-8`}>
        {/* Journey stage breadcrumb */}
        <div className="flex items-center gap-1.5 mb-4">
          {['Diagnóstico', 'Plano', 'Prática', 'Reavaliação'].map((label, i) => {
            const stageIndex = phase === 'no_test' ? 0 :
              ['test_done_no_plan', 'plan_not_started', 'plan_in_progress'].includes(phase) ? 1 :
              phase === 'plan_complete_waiting' ? 2 : 3;
            const isActive = i === stageIndex;
            const isDone = i < stageIndex;
            return (
              <div key={label} className="flex items-center gap-1.5">
                {i > 0 && <div className={`w-4 h-px ${isDone ? 'bg-green-500' : 'bg-muted-foreground/15'}`} />}
                <div className={`flex items-center gap-1 px-2 py-0.5 rounded-md text-[0.5rem] font-bold uppercase tracking-wider ${
                  isActive ? `${colors.bg} ${colors.text} ring-1 ring-current/20` :
                  isDone ? 'bg-green-500/10 text-green-600' :
                  'text-muted-foreground/30'
                }`}>
                  {isDone && <ShieldCheck className="w-2.5 h-2.5" />}
                  {label}
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex flex-col sm:flex-row items-start gap-5">
          <div className={`w-12 h-12 rounded-2xl ${colors.bg} flex items-center justify-center shrink-0`}>
            <Icon className={`w-6 h-6 ${colors.text}`} />
          </div>

          <div className="flex-1 space-y-4">
            <div>
              <p className={`text-[0.65rem] uppercase tracking-[0.15em] font-semibold mb-1 ${colors.text}`}>
                {stageLabels[phase]}
              </p>
              <h3 className="text-lg font-semibold text-foreground">{config.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed mt-1">{config.subtitle}</p>
            </div>

            {/* Task phase progress */}
            {showProgress && (
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  {props.actionPlan.days.map((task) => (
                    <div key={task.id} className="flex items-center gap-1.5">
                      <div className={`w-2 h-2 rounded-full ${
                        task.status === 'completed' ? 'bg-green-500' :
                        task.status === 'in_progress' ? 'bg-amber-500' :
                        'bg-muted-foreground/20'
                      }`} />
                      <span className="text-[0.6rem] text-muted-foreground">
                        {task.fase === 'consciencia' ? '👁️' : task.fase === 'interrupcao' ? '⚡' : '🔄'}
                      </span>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  {stats.completed_days === 0 && !stats.has_in_progress && 'Nenhuma fase iniciada — o padrão agradece.'}
                  {stats.has_in_progress && !stats.all_completed && `${stats.completed_days} de ${stats.total_days} fases concluídas — não pare agora.`}
                  {stats.completed_days > 0 && !stats.has_in_progress && !stats.all_completed && `${stats.completed_days} concluída${stats.completed_days > 1 ? 's' : ''}, ${stats.remaining_days} pendente${stats.remaining_days > 1 ? 's' : ''} — o ciclo precisa ser completo.`}
                </p>
              </div>
            )}

            {/* Countdown to retest */}
            {showCountdown && (
              <div className="flex items-center gap-3 bg-green-500/5 rounded-xl px-4 py-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-green-500/10">
                  <span className="text-lg font-bold text-green-600">{props.retestCycle.daysUntilRetest}</span>
                </div>
                <div>
                  <p className="text-xs font-semibold text-green-600">dias para a reavaliação</p>
                  <p className="text-[0.6rem] text-muted-foreground">Seu cérebro vai dizer que já mudou. Não confie. Espere a medição.</p>
                </div>
              </div>
            )}

            {/* Evolution preview for retest */}
            {(phase === 'retest_available' || phase === 'retest_available_no_plan') && props.retestCycle.scoreComparisons.length > 0 && (
              <div className="bg-secondary/30 rounded-xl px-4 py-3 space-y-1.5">
                <p className="text-[0.6rem] uppercase tracking-wider text-muted-foreground font-semibold">Última evolução registrada</p>
                <div className="flex items-center gap-3 text-xs">
                  {props.retestCycle.improvementCount > 0 && (
                    <span className="text-green-600 font-medium">{props.retestCycle.improvementCount} eixo{props.retestCycle.improvementCount > 1 ? 's' : ''} enfraqueceu</span>
                  )}
                  {props.retestCycle.worsenedCount > 0 && (
                    <span className="text-red-500 font-medium">{props.retestCycle.worsenedCount} se intensificou</span>
                  )}
                </div>
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
