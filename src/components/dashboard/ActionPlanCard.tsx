import { motion } from 'framer-motion';
import { CheckCircle2, Circle, Lock, Crown, Play, ChevronDown, ChevronUp } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import type { ActionPlanData, StrategicTask } from '@/hooks/useActionPlan';

interface ActionPlanCardProps {
  plan: ActionPlanData;
}

const statusConfig = {
  not_started: { label: 'Não iniciada', color: 'text-muted-foreground', bg: 'bg-muted/30', icon: Circle },
  in_progress: { label: 'Em execução', color: 'text-amber-600', bg: 'bg-amber-500/10', icon: Play },
  completed: { label: 'Concluída', color: 'text-green-600', bg: 'bg-green-500/10', icon: CheckCircle2 },
};

function TaskCard({ task, index, locked, onToggle, onStatusChange }: {
  task: StrategicTask;
  index: number;
  locked: boolean;
  onToggle: (id: string, completed: boolean) => void;
  onStatusChange: (id: string, status: 'not_started' | 'in_progress' | 'completed') => void;
}) {
  const [expanded, setExpanded] = useState(false);

  if (locked) {
    return (
      <div className="border border-border/20 rounded-2xl p-5 relative overflow-hidden bg-secondary/10">
        <div className="flex items-start gap-4">
          <div className="w-8 h-8 rounded-xl bg-muted/30 flex items-center justify-center shrink-0 mt-0.5">
            <Lock className="w-4 h-4 text-muted-foreground/30" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-muted-foreground/40">Tarefa {index + 1}</p>
            <p className="text-xs text-muted-foreground/25 mt-1 line-clamp-1">{task.titulo || 'Tarefa estratégica bloqueada'}</p>
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
      className={`border rounded-2xl overflow-hidden transition-all duration-200 ${
        task.status === 'completed' ? 'border-green-500/20 bg-green-500/[0.03]' :
        task.status === 'in_progress' ? 'border-amber-500/20 bg-amber-500/[0.03]' :
        'border-border/30 bg-card'
      }`}
    >
      {/* Task header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-5 py-4 flex items-start gap-4 text-left hover:bg-secondary/20 transition-colors"
      >
        <div className={`w-8 h-8 rounded-xl ${config.bg} flex items-center justify-center shrink-0 mt-0.5`}>
          <StatusIcon className={`w-4 h-4 ${config.color}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-[0.6rem] font-semibold uppercase tracking-[0.1em] ${config.color}`}>
              {config.label}
            </span>
          </div>
          <p className={`text-sm font-semibold leading-snug ${task.status === 'completed' ? 'text-muted-foreground line-through' : 'text-foreground'}`}>
            {task.titulo || `Tarefa ${index + 1}`}
          </p>
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

      {/* Expanded details */}
      {expanded && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          transition={{ duration: 0.2 }}
          className="px-5 pb-5 space-y-4 border-t border-border/10"
        >
          {/* Why this task exists */}
          {task.porque && (
            <div className="pt-4">
              <p className="text-[0.6rem] uppercase tracking-[0.15em] text-muted-foreground/60 font-semibold mb-1.5">Por que essa tarefa existe</p>
              <p className="text-sm text-foreground/80 leading-relaxed">{task.porque}</p>
            </div>
          )}

          {/* How to execute */}
          {task.comoExecutar && (
            <div>
              <p className="text-[0.6rem] uppercase tracking-[0.15em] text-muted-foreground/60 font-semibold mb-1.5">Como executar</p>
              <p className="text-sm text-foreground/80 leading-relaxed">{task.comoExecutar}</p>
            </div>
          )}

          {/* Trigger → Action */}
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

          {/* Completion criteria */}
          {task.criterio && (
            <div>
              <p className="text-[0.6rem] uppercase tracking-[0.15em] text-muted-foreground/60 font-semibold mb-1.5">Critério de conclusão</p>
              <p className="text-xs text-foreground/70 leading-relaxed">{task.criterio}</p>
            </div>
          )}

          {/* Status actions */}
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

export function ActionPlanCard({ plan }: ActionPlanCardProps) {
  const { days, stats, toggleDay, updateTaskStatus } = plan;
  const { isPremium, isSuperAdmin } = useAuth();
  const navigate = useNavigate();
  const showFull = isPremium || isSuperAdmin;

  if (days.length === 0) return null;

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
          <h3 className="text-lg font-semibold text-foreground">Suas tarefas de transformação</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {stats.completed_days} de {stats.total_days} concluídas
          </p>
        </div>
        {stats.all_completed && (
          <div className="px-3 py-1.5 rounded-full bg-green-500/10 text-green-600 text-xs font-semibold">
            Ciclo completo ✓
          </div>
        )}
      </div>

      {/* Progress */}
      <div className="w-full h-2 rounded-full bg-secondary/60 overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${
            stats.execution_rate >= 100 ? 'bg-green-500' :
            stats.execution_rate > 0 ? 'bg-primary' : 'bg-muted-foreground/20'
          }`}
          initial={{ width: 0 }}
          animate={{ width: `${stats.execution_rate}%` }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        />
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

      {/* Paywall for locked tasks */}
      {!showFull && days.length > 1 && (
        <div className="border border-destructive/15 bg-destructive/[0.02] rounded-2xl px-6 py-6 space-y-4">
          <div className="space-y-2 text-center">
            <p className="text-[15px] text-foreground font-semibold leading-snug">
              Você já sabe o que está errado.
            </p>
            <p className="text-sm text-foreground/70 font-medium">
              Mas uma tarefa sozinha não quebra o padrão.
            </p>
            <p className="text-sm text-destructive font-semibold">
              São 3 frentes. Você só tem acesso a 1.
            </p>
          </div>
          <p className="text-[11px] text-muted-foreground/50 text-center">
            +32.847 mulheres já estão executando as 3 tarefas completas
          </p>
          <div className="border-t border-destructive/8 pt-4">
            <p className="text-xs text-destructive/70 text-center font-medium leading-relaxed mb-3">
              Se você não atacar o padrão por inteiro, ele se adapta e volta mais forte.
            </p>
            <button
              onClick={() => navigate('/premium')}
              className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-destructive text-destructive-foreground rounded-xl text-sm font-bold hover:brightness-90 transition-all duration-200 active:scale-[0.97] shadow-md"
            >
              <Crown className="w-4 h-4" />
              Desbloquear as 3 tarefas — R$9,99
            </button>
          </div>
        </div>
      )}
    </motion.div>
  );
}
