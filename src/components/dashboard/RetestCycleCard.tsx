import { motion } from 'framer-motion';
import { CalendarClock, ArrowDownRight, ArrowUpRight, Minus, TrendingDown, TrendingUp, Eye, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { RetestCycleData } from '@/hooks/useRetestCycle';

interface RetestCycleCardProps {
  retest: RetestCycleData;
  planCompleted?: boolean;
}

const fadeIn = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] },
};

export function RetestCycleCard({ retest, planCompleted = false }: RetestCycleCardProps) {
  const navigate = useNavigate();

  if (retest.loading || !retest.lastTestDate) return null;

  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const progress = (retest.progressPercent / 100) * circumference;

  const getStatusMessage = () => {
    if (retest.retestAvailable && planCompleted) {
      return 'Se você não medir agora, vai acreditar que mudou — mesmo não tendo mudado. O cérebro se adapta e engana você. Só o reteste mostra a verdade.';
    }
    if (retest.retestAvailable && !planCompleted) {
      return 'O tempo passou e o plano não foi concluído. Seu padrão continua operando — e agora está mais forte. Sem medir, você nunca vai saber o que mudou e o que só se escondeu.';
    }
    if (planCompleted) {
      return 'Seu cérebro já está te dizendo que mudou. Não confie. O padrão se adapta e finge ter ido embora. Sem o reteste, você continua no mesmo ciclo achando que saiu dele.';
    }
    return 'Complete as 3 fases e aguarde o período de prática. Sem executar e sem medir, nada muda — você só acumula autoconhecimento inútil.';
  };

  const getCtaLabel = () => {
    if (retest.retestAvailable && planCompleted) return 'Encarar o reteste agora';
    if (retest.retestAvailable) return 'Refazer leitura e ver a verdade';
    return '';
  };

  return (
    <motion.section {...fadeIn} transition={{ ...fadeIn.transition, delay: 0.07 }}>
      <div className="bg-card rounded-2xl border border-border/30 shadow-[0_1px_3px_0_rgb(0_0_0/0.04)] p-6 sm:p-8">
        <div className="flex items-center gap-2.5 mb-2">
          {retest.retestAvailable ? (
            <AlertTriangle className="w-4 h-4 text-amber-600" />
          ) : (
            <CalendarClock className="w-4 h-4 text-primary" />
          )}
          <h3 className="text-base font-semibold text-foreground">
            {retest.retestAvailable ? 'Reavaliação disponível' : 'Ciclo de Evolução'}
          </h3>
        </div>
        <p className="text-xs text-muted-foreground mb-5 leading-relaxed">
          {getStatusMessage()}
        </p>

        <div className="flex flex-col md:flex-row gap-6 md:gap-8">
          {/* Countdown ring */}
          <div className="flex flex-col items-center gap-3 shrink-0">
            <div className="relative w-24 h-24">
              <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                <circle cx="50" cy="50" r={radius} fill="none" stroke="hsl(var(--muted)/0.15)" strokeWidth="6" />
                <motion.circle
                  cx="50" cy="50" r={radius} fill="none"
                  stroke={retest.retestAvailable ? 'hsl(38, 72%, 50%)' : 'hsl(var(--primary))'}
                  strokeWidth="6" strokeLinecap="round"
                  strokeDasharray={circumference}
                  initial={{ strokeDashoffset: circumference }}
                  animate={{ strokeDashoffset: circumference - progress }}
                  transition={{ duration: 1, ease: 'easeOut' }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                {retest.retestAvailable ? (
                  <Eye className="w-5 h-5 text-amber-600" />
                ) : (
                  <>
                    <span className="text-xl font-bold tabular-nums text-foreground">{retest.daysUntilRetest}</span>
                    <span className="text-[0.5rem] uppercase tracking-wider text-muted-foreground">dias</span>
                  </>
                )}
              </div>
            </div>
            {retest.retestAvailable ? (
              <div className="space-y-2 text-center">
                <p className="text-[0.6rem] text-amber-600/80 font-semibold">
                  Você vai encarar a verdade ou fugir dela?
                </p>
                <button
                  onClick={() => navigate('/tests')}
                  className="text-xs font-bold px-5 py-2.5 rounded-xl bg-amber-600 text-white hover:brightness-90 transition-all active:scale-[0.97] shadow-md"
                >
                  {getCtaLabel()}
                </button>
              </div>
            ) : (
              <p className="text-[0.65rem] text-muted-foreground text-center">
                Último teste: {retest.lastTestDate.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
              </p>
            )}
          </div>

          {/* Score comparison */}
          {retest.scoreComparisons.length > 0 && (
            <div className="flex-1 min-w-0 space-y-3">
              <div className="flex items-center gap-2 mb-2">
                {retest.hasImproved ? (
                  <TrendingDown className="w-4 h-4 text-green-500" />
                ) : (
                  <TrendingUp className="w-4 h-4 text-orange-500" />
                )}
                <p className="text-xs text-muted-foreground">
                  {retest.improvementCount > 0 && (
                    <span className="text-green-500 font-medium">{retest.improvementCount} padrão{retest.improvementCount > 1 ? 'ões enfraqueceram' : ' enfraqueceu'}</span>
                  )}
                  {retest.improvementCount > 0 && retest.worsenedCount > 0 && ' · '}
                  {retest.worsenedCount > 0 && (
                    <span className="text-orange-500 font-medium">{retest.worsenedCount} se intensific{retest.worsenedCount > 1 ? 'aram' : 'ou'}</span>
                  )}
                  {retest.improvementCount === 0 && retest.worsenedCount === 0 && (
                    <span className="text-muted-foreground">O padrão se manteve — sem mudança real detectada</span>
                  )}
                </p>
              </div>
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {retest.scoreComparisons.slice(0, 6).map(comp => (
                  <div key={comp.key} className="flex items-center gap-2">
                    <span className="text-[0.65rem] text-muted-foreground truncate w-32 shrink-0">{comp.label}</span>
                    <div className="flex-1 h-1.5 bg-muted/20 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${comp.current}%`,
                          backgroundColor: comp.delta < -3 ? 'hsl(152, 45%, 42%)' : comp.delta > 3 ? 'hsl(0, 65%, 52%)' : 'hsl(var(--primary)/0.5)',
                        }}
                      />
                    </div>
                    <div className="flex items-center gap-0.5 w-14 justify-end shrink-0">
                      {comp.delta < -3 ? (
                        <ArrowDownRight className="w-3 h-3 text-green-500" />
                      ) : comp.delta > 3 ? (
                        <ArrowUpRight className="w-3 h-3 text-red-500" />
                      ) : (
                        <Minus className="w-3 h-3 text-muted-foreground/40" />
                      )}
                      <span className={`text-[0.6rem] tabular-nums font-medium ${
                        comp.delta < -3 ? 'text-green-500' : comp.delta > 3 ? 'text-red-500' : 'text-muted-foreground/50'
                      }`}>
                        {comp.delta > 0 ? '+' : ''}{comp.delta}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* No comparison yet */}
          {retest.scoreComparisons.length === 0 && (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-xs text-muted-foreground text-center leading-relaxed">
                Após a reavaliação, você verá aqui o que realmente mudou — e o que o seu cérebro apenas disfarçou.
              </p>
            </div>
          )}
        </div>
      </div>
    </motion.section>
  );
}
