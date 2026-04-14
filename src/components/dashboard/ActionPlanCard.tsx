import { motion } from 'framer-motion';
import { CheckCircle2, Circle, Lock, Crown, Play, ChevronDown, ChevronUp, Eye, Zap, RotateCcw, AlertTriangle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import type { ActionPlanData, StrategicTask, TaskPhase } from '@/hooks/useActionPlan';
import { PHASE_META } from '@/hooks/useActionPlan';

interface ActionPlanCardProps {
  plan: ActionPlanData;
  behavioralMemory?: Record<string, unknown>;
}

const statusConfig = {
  not_started: { label: 'Não iniciada', color: 'text-muted-foreground', bg: 'bg-muted/30', icon: Circle },
  in_progress: { label: 'Em execução', color: 'text-amber-600', bg: 'bg-amber-500/10', icon: Play },
  completed: { label: 'Concluída', color: 'text-green-600', bg: 'bg-green-500/10', icon: CheckCircle2 },
};

const phaseIcons: Record<TaskPhase, typeof Eye> = {
  consciencia: Eye,
  interrupcao: Zap,
  consolidacao: RotateCcw,
};

const phaseColors: Record<TaskPhase, { badge: string; border: string }> = {
  consciencia: { badge: 'bg-blue-500/10 text-blue-600', border: 'border-l-blue-500/40' },
  interrupcao: { badge: 'bg-amber-500/10 text-amber-600', border: 'border-l-amber-500/40' },
  consolidacao: { badge: 'bg-emerald-500/10 text-emerald-600', border: 'border-l-emerald-500/40' },
};

function TaskCard({ task, index, locked, onToggle, onStatusChange }: {
  task: StrategicTask;
  index: number;
  locked: boolean;
  onToggle: (id: string, completed: boolean) => void;
  onStatusChange: (id: string, status: 'not_started' | 'in_progress' | 'completed') => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const config = statusConfig[task.status];
  const StatusIcon = config.icon;
  const phase = PHASE_META[task.fase];
  const PhaseIcon = phaseIcons[task.fase];
  const colors = phaseColors[task.fase];

  if (locked) {
    return (
      <div className={`border border-border/20 rounded-2xl p-5 relative overflow-hidden bg-secondary/10 border-l-4 ${colors.border}`}>
        <div className="flex items-start gap-4">
          <div className="w-8 h-8 rounded-xl bg-muted/30 flex items-center justify-center shrink-0 mt-0.5">
            <Lock className="w-4 h-4 text-muted-foreground/30" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className={`text-[0.55rem] font-bold uppercase tracking-[0.12em] px-2 py-0.5 rounded-md ${colors.badge}`}>
                {phase.icon} {phase.label}
              </span>
            </div>
            <p className="text-sm font-semibold text-muted-foreground/40">{task.titulo || 'Tarefa bloqueada'}</p>
            {task.padraoAlvo && (
              <p className="text-[0.6rem] text-muted-foreground/25 mt-1">Ataca: {task.padraoAlvo}</p>
            )}
          </div>
        </div>
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-background/40 to-background/70 flex items-center justify-end pr-5">
          <Lock className="w-4 h-4 text-muted-foreground/20" />
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1, duration: 0.3 }}
      className={`border rounded-2xl overflow-hidden transition-all duration-200 border-l-4 ${colors.border} ${
        task.status === 'completed' ? 'border-green-500/20 bg-green-500/[0.03]' :
        task.status === 'in_progress' ? 'border-amber-500/20 bg-amber-500/[0.03]' :
        'border-border/30 bg-card'
      }`}
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-5 py-4 flex items-start gap-4 text-left hover:bg-secondary/20 transition-colors"
      >
        <div className={`w-8 h-8 rounded-xl ${config.bg} flex items-center justify-center shrink-0 mt-0.5`}>
          <StatusIcon className={`w-4 h-4 ${config.color}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className={`text-[0.55rem] font-bold uppercase tracking-[0.12em] px-2 py-0.5 rounded-md ${colors.badge}`}>
              {phase.icon} {phase.label}
            </span>
            <span className={`text-[0.55rem] font-semibold uppercase tracking-[0.1em] ${config.color}`}>
              {config.label}
            </span>
          </div>
          <p className={`text-sm font-semibold leading-snug ${task.status === 'completed' ? 'text-muted-foreground line-through' : 'text-foreground'}`}>
            {task.titulo || `Tarefa ${index + 1}`}
          </p>
          {task.padraoAlvo && (
            <p className="text-[0.6rem] text-muted-foreground/50 mt-0.5 font-medium">
              Ataca: {task.padraoAlvo}
            </p>
          )}
          {task.objetivo && (
            <p className="text-xs text-muted-foreground/70 mt-1 leading-relaxed line-clamp-1">
              {task.objetivo}
            </p>
          )}
        </div>
        <div className="shrink-0 mt-1">
          {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground/40" /> : <ChevronDown className="w-4 h-4 text-muted-foreground/40" />}
        </div>
      </button>

      {expanded && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          transition={{ duration: 0.2 }}
          className="px-5 pb-5 space-y-4 border-t border-border/10"
        >
          {/* Phase role explanation */}
          <div className={`pt-4 rounded-xl px-4 py-3 ${colors.badge.replace('text-', 'bg-').split(' ')[0]}/5`}>
            <div className="flex items-center gap-2 mb-1">
              <PhaseIcon className={`w-3.5 h-3.5 ${colors.badge.split(' ')[1]}`} />
              <p className="text-[0.6rem] uppercase tracking-[0.15em] font-bold" style={{ color: 'inherit' }}>
                Fase: {phase.label}
              </p>
            </div>
            <p className="text-xs text-foreground/60 leading-relaxed">{phase.role}</p>
          </div>

          {task.porque && (
            <div>
              <p className="text-[0.6rem] uppercase tracking-[0.15em] text-muted-foreground/60 font-semibold mb-1.5">Por que essa tarefa existe</p>
              <p className="text-sm text-foreground/80 leading-relaxed">{task.porque}</p>
            </div>
          )}

          {task.comoExecutar && (
            <div>
              <p className="text-[0.6rem] uppercase tracking-[0.15em] text-muted-foreground/60 font-semibold mb-1.5">Como executar</p>
              <p className="text-sm text-foreground/80 leading-relaxed">{task.comoExecutar}</p>
            </div>
          )}

          {task.gatilho && task.acao && (
            <div className="rounded-xl border border-border/15 bg-secondary/20 px-4 py-3">
              <p className="text-xs text-muted-foreground/60 leading-relaxed">
                Quando <span className="font-semibold text-foreground">{task.gatilho}</span>
              </p>
              <p className="text-sm font-medium text-primary mt-1.5">
                → {task.acao}
              </p>
            </div>
          )}

          {task.criterio && (
            <div>
              <p className="text-[0.6rem] uppercase tracking-[0.15em] text-muted-foreground/60 font-semibold mb-1.5">Critério de conclusão</p>
              <p className="text-xs text-foreground/70 leading-relaxed">{task.criterio}</p>
            </div>
          )}

          <div className="flex gap-2 pt-2">
            {task.status === 'not_started' && (
              <button
                onClick={(e) => { e.stopPropagation(); onStatusChange(task.id, 'in_progress'); }}
                className="flex-1 py-2.5 rounded-xl text-xs font-semibold bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 transition-all active:scale-[0.97]"
              >
                Começar a executar
              </button>
            )}
            {task.status === 'in_progress' && (
              <button
                onClick={(e) => { e.stopPropagation(); onToggle(task.id, true); }}
                className="flex-1 py-2.5 rounded-xl text-xs font-semibold bg-green-500/10 text-green-600 hover:bg-green-500/20 transition-all active:scale-[0.97]"
              >
                Marcar como concluída
              </button>
            )}
            {task.status === 'completed' && (
              <button
                onClick={(e) => { e.stopPropagation(); onStatusChange(task.id, 'not_started'); }}
                className="flex-1 py-2.5 rounded-xl text-xs font-medium text-muted-foreground hover:bg-secondary/50 transition-all active:scale-[0.97]"
              >
                Reabrir tarefa
              </button>
            )}
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}

/**
 * Generates confrontational paywall copy based on behavioral memory.
 */
function getPaywallCopy(
  dominantPattern: string,
  behavioralMemory?: Record<string, unknown>,
  abandonmentDetected?: boolean
): { headline: string; subtext: string; pressure: string; consequence: string } {
  const mem = behavioralMemory || {};

  if (abandonmentDetected) {
    return {
      headline: `É exatamente nesse ponto que você sempre desiste.`,
      subtext: `Você começou a fase 1 e parou. O padrão de ${dominantPattern} se protege assim: te faz acreditar que "já entendeu" e que não precisa continuar.`,
      pressure: 'Se você parar aqui, nada muda. Você volta ao mesmo lugar — com a ilusão de que tentou.',
      consequence: 'Daqui 30 dias, o padrão estará mais forte. E você vai se perguntar por que nada mudou.',
    };
  }

  if (mem.starts_but_doesnt_finish) {
    return {
      headline: `Você sempre começa e não termina. Esse é o padrão de ${dominantPattern} operando.`,
      subtext: 'Uma fase isolada nunca foi suficiente pra você mudar. São 3 fases: perceber, interromper e substituir.',
      pressure: 'Quantas vezes você já disse "dessa vez vai ser diferente" e parou no meio?',
      consequence: 'Se você parar agora, isso confirma exatamente o padrão que o diagnóstico revelou.',
    };
  }

  if (mem.avoids_discomfort) {
    return {
      headline: `Seu cérebro vai te convencer a parar aqui. Ele sempre faz isso.`,
      subtext: `O padrão de ${dominantPattern} se protege fazendo você evitar o que é desconfortável. As fases 2 e 3 são exatamente isso: desconforto necessário.`,
      pressure: 'Ficar na fase 1 é confortável. Por isso mesmo não funciona sozinha.',
      consequence: 'Evitar as fases difíceis é o mecanismo que mantém o padrão intacto há anos.',
    };
  }

  if (mem.self_critical_loop) {
    return {
      headline: `Você vai se cobrar por não ter mudado. Mas sem as 3 fases, a mudança é impossível.`,
      subtext: `O padrão de ${dominantPattern} se alimenta da autocrítica sem ação. Libere as fases que atacam o ciclo inteiro.`,
      pressure: 'Saber o problema sem atacar em 3 frentes é autocrítica vazia — não é mudança.',
      consequence: 'Você já sabe o que está errado. A pergunta é: vai fazer algo diferente dessa vez?',
    };
  }

  return {
    headline: `Uma fase isolada nunca foi suficiente pra mudar o padrão de ${dominantPattern}.`,
    subtext: 'São 3 fases: perceber, interromper e substituir. Você só tem acesso à primeira. Se você não atacar o ciclo inteiro, ele se adapta e volta mais forte.',
    pressure: 'Se você parar aqui, nada muda. O padrão continua operando — exatamente como antes.',
    consequence: 'Cada dia sem atacar as 3 fases fortalece o circuito que te mantém preso.',
  };
}

export function ActionPlanCard({ plan, behavioralMemory }: ActionPlanCardProps) {
  const { days, stats, toggleDay, updateTaskStatus } = plan;
  const { isPremium, isSuperAdmin } = useAuth();
  const navigate = useNavigate();
  const showFull = isPremium || isSuperAdmin;

  if (days.length === 0) return null;

  const dominantPattern = days[0]?.padraoAlvo || 'seu padrão';
  const paywallCopy = getPaywallCopy(dominantPattern, behavioralMemory);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-4"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Processo de transformação</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            3 fases: Consciência → Interrupção → Consolidação
          </p>
        </div>
        {stats.all_completed && (
          <div className="px-3 py-1.5 rounded-full bg-green-500/10 text-green-600 text-xs font-semibold">
            Ciclo completo ✓
          </div>
        )}
      </div>

      {/* Phase indicators */}
      <div className="flex gap-1">
        {days.map((task) => (
          <div key={task.id} className="flex-1">
            <div className={`h-1.5 rounded-full ${
              task.status === 'completed' ? 'bg-green-500' :
              task.status === 'in_progress' ? 'bg-amber-500' :
              'bg-muted-foreground/15'
            }`} />
            <p className={`text-[0.5rem] mt-1 text-center font-semibold uppercase tracking-wider ${
              task.status === 'completed' ? 'text-green-600' :
              task.status === 'in_progress' ? 'text-amber-600' :
              'text-muted-foreground/40'
            }`}>
              {PHASE_META[task.fase]?.label || task.fase}
            </p>
          </div>
        ))}
      </div>

      {/* Task cards */}
      <div className="space-y-3">
        {days.map((task, i) => (
          <TaskCard
            key={task.id}
            task={task}
            index={i}
            locked={!showFull && i > 0}
            onToggle={toggleDay}
            onStatusChange={updateTaskStatus}
          />
        ))}
      </div>

      {/* Behavioral Paywall - confrontational and personalized */}
      {!showFull && days.length > 1 && (
        <div className="border border-destructive/20 bg-destructive/[0.03] rounded-2xl px-6 py-6 space-y-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
            <div className="space-y-2.5">
              <p className="text-[15px] text-foreground font-semibold leading-snug">
                {paywallCopy.headline}
              </p>
              <p className="text-sm text-foreground/70 font-medium leading-relaxed">
                {paywallCopy.subtext}
              </p>
            </div>
          </div>
          <div className="border-t border-destructive/10 pt-4 space-y-3">
            <p className="text-xs text-destructive/80 text-center font-semibold leading-relaxed">
              {paywallCopy.pressure}
            </p>
            <p className="text-[11px] text-muted-foreground/50 text-center">
              +32.847 pessoas já desbloquearam o processo completo
            </p>
            <button
              onClick={() => navigate('/premium')}
              className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-destructive text-destructive-foreground rounded-xl text-sm font-bold hover:brightness-90 transition-all duration-200 active:scale-[0.97] shadow-md"
            >
              <Crown className="w-4 h-4" />
              Desbloquear as 3 fases — R$9,99
            </button>
          </div>
        </div>
      )}
    </motion.div>
  );
}
