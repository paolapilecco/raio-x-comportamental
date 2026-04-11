import { motion } from 'framer-motion';
import { AlertTriangle, ArrowRight, BarChart3 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface InactivityModule {
  moduleId: string;
  moduleName: string;
  moduleSlug: string;
  daysSinceLastTest: number;
}

interface InactivityAlertCardProps {
  inactiveModules: InactivityModule[];
}

const fadeIn = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] },
};

export function InactivityAlertCard({ inactiveModules }: InactivityAlertCardProps) {
  const navigate = useNavigate();

  if (inactiveModules.length === 0) return null;

  return (
    <motion.section {...fadeIn} transition={{ ...fadeIn.transition, delay: 0.06 }}>
      <div className="bg-card rounded-2xl border border-destructive/20 shadow-[0_1px_3px_0_rgb(0_0_0/0.04)] p-6 sm:p-8">
        <div className="flex items-center gap-2.5 mb-4">
          <AlertTriangle className="w-4 h-4 text-destructive" />
          <h3 className="text-base font-semibold text-foreground">Alerta de Inatividade</h3>
        </div>

        <div className="space-y-4">
          {inactiveModules.map((mod) => (
            <div key={mod.moduleId} className="space-y-3">
              <div>
                <p className="text-sm font-medium text-foreground">{mod.moduleName}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Última análise há {mod.daysSinceLastTest} dias
                </p>
              </div>

              <div className="bg-destructive/5 rounded-xl p-4 border border-destructive/10">
                <p className="text-sm text-foreground leading-relaxed font-medium">
                  Seu padrão continua ativo.
                </p>
                <p className="text-sm text-muted-foreground leading-relaxed mt-1">
                  Nada indica que houve mudança.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => navigate(`/diagnostic/${mod.moduleSlug}`)}
                  className="inline-flex items-center gap-1.5 text-xs font-medium px-4 py-2 rounded-xl bg-primary text-primary-foreground hover:opacity-90 transition-opacity active:scale-[0.97]"
                >
                  Refazer análise
                  <ArrowRight className="w-3 h-3" />
                </button>
                <button
                  onClick={() => navigate('/history')}
                  className="inline-flex items-center gap-1.5 text-xs font-medium px-4 py-2 rounded-xl border border-border/40 hover:bg-secondary/50 transition-all active:scale-[0.97]"
                >
                  <BarChart3 className="w-3 h-3" />
                  Comparar evolução
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </motion.section>
  );
}
