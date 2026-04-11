import { motion } from 'framer-motion';
import { CheckCircle2, Circle, Flame, Target } from 'lucide-react';
import type { ActionPlanData } from '@/hooks/useActionPlan';

interface ActionPlanCardProps {
  plan: ActionPlanData;
}

export function ActionPlanCard({ plan }: ActionPlanCardProps) {
  const { days, stats, toggleDay } = plan;

  if (days.length === 0) return null;

  const progressColor = stats.execution_rate >= 70 ? 'bg-green-500' :
    stats.execution_rate >= 40 ? 'bg-primary' : 'bg-muted-foreground/30';

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="bg-card rounded-2xl border border-border/30 shadow-[0_1px_3px_0_rgb(0_0_0/0.04)] overflow-hidden"
    >
      {/* Header */}
      <div className="px-6 py-5 border-b border-border/20">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
              <Target className="w-[18px] h-[18px] text-primary" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-foreground">Plano de Ação</h3>
              <p className="text-[0.65rem] text-muted-foreground">15 dias de acompanhamento</p>
            </div>
          </div>
          {stats.current_streak > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-orange-500/10">
              <Flame className="w-3.5 h-3.5 text-orange-500" />
              <span className="text-xs font-semibold text-orange-500 tabular-nums">{stats.current_streak}</span>
            </div>
          )}
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3 mb-3">
          <div className="text-center">
            <p className="text-lg font-bold text-foreground tabular-nums">{stats.completed_days}</p>
            <p className="text-[0.6rem] text-muted-foreground">concluídos</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-foreground tabular-nums">{stats.remaining_days}</p>
            <p className="text-[0.6rem] text-muted-foreground">restantes</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-primary tabular-nums">{stats.execution_rate}%</p>
            <p className="text-[0.6rem] text-muted-foreground">execução</p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="w-full h-2 rounded-full bg-secondary/60 overflow-hidden">
          <motion.div
            className={`h-full rounded-full ${progressColor}`}
            initial={{ width: 0 }}
            animate={{ width: `${stats.execution_rate}%` }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          />
        </div>
      </div>

      {/* Day list */}
      <div className="px-4 py-3 max-h-[320px] overflow-y-auto">
        <div className="space-y-1">
          {days.map((day) => (
            <button
              key={day.id}
              onClick={() => toggleDay(day.id, !day.completed)}
              className={`w-full flex items-start gap-3 px-3 py-3 rounded-xl text-left transition-all duration-200 hover:bg-secondary/30 active:scale-[0.99] ${
                day.completed ? 'opacity-60' : ''
              }`}
            >
              <div className="mt-0.5 shrink-0">
                {day.completed ? (
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                ) : (
                  <Circle className="w-5 h-5 text-muted-foreground/30" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-[0.65rem] font-semibold text-muted-foreground/60 uppercase tracking-wider">
                    Dia {day.day_number}
                  </span>
                </div>
                <p className={`text-sm leading-relaxed ${day.completed ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                  {day.action_text}
                </p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
