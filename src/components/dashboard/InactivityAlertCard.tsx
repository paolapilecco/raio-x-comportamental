import { motion } from 'framer-motion';
import { AlertTriangle, ArrowRight, BarChart3, Skull } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { trackEvent } from '@/lib/trackEvent';

interface InactivityModule {
  moduleId: string;
  moduleName: string;
  moduleSlug: string;
  daysSinceLastTest: number;
}

interface InactivityAlertCardProps {
  inactiveModules: InactivityModule[];
  userId?: string;
}

const fadeIn = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] },
};

function getInactivityMessage(days: number): { title: string; body: string } {
  if (days >= 30) {
    return {
      title: 'Você sumiu. Seu padrão não.',
      body: `Há ${days} dias sem medir. O cérebro te convenceu que mudou — mas sem reteste, isso é só ilusão. O padrão continua operando no automático.`,
    };
  }
  if (days >= 21) {
    return {
      title: 'Isso confirma o padrão que você viu no diagnóstico.',
      body: `Você parou exatamente no ponto que sempre para. Já são ${days} dias sem voltar. Sem medir, você continua no mesmo ciclo.`,
    };
  }
  return {
    title: 'Seu padrão continua ativo. Nada indica mudança.',
    body: `Última análise há ${days} dias. Se você não voltar agora, nunca vai saber se mudou.`,
  };
}

export function InactivityAlertCard({ inactiveModules, userId }: InactivityAlertCardProps) {
  const navigate = useNavigate();

  useEffect(() => {
    if (inactiveModules.length > 0 && userId) {
      trackEvent({ userId, event: 'retest_alert_viewed', metadata: { modules: inactiveModules.map(m => m.moduleSlug) } });
    }
  }, [inactiveModules.length, userId]);

  if (inactiveModules.length === 0) return null;

  return (
    <motion.section {...fadeIn} transition={{ ...fadeIn.transition, delay: 0.06 }}>
      <div className="bg-card rounded-2xl border border-destructive/20 shadow-[0_1px_3px_0_rgb(0_0_0/0.04)] p-6 sm:p-8">
        <div className="flex items-center gap-2.5 mb-4">
          <Skull className="w-4 h-4 text-destructive" />
          <h3 className="text-base font-semibold text-foreground">Padrão sem medição</h3>
        </div>

        <div className="space-y-4">
          {inactiveModules.map((mod) => {
            const msg = getInactivityMessage(mod.daysSinceLastTest);
            return (
              <div key={mod.moduleId} className="space-y-3">
                <div>
                  <p className="text-sm font-medium text-foreground">{mod.moduleName}</p>
                </div>

                <div className="bg-destructive/5 rounded-xl p-4 border border-destructive/10">
                  <p className="text-sm text-foreground leading-relaxed font-semibold">
                    {msg.title}
                  </p>
                  <p className="text-xs text-muted-foreground leading-relaxed mt-1.5">
                    {msg.body}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => navigate(`/diagnostic/${mod.moduleSlug}?origin=dashboard_alert`)}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold px-4 py-2.5 rounded-xl bg-destructive text-destructive-foreground hover:brightness-90 transition-all active:scale-[0.97]"
                  >
                    Encarar o reteste agora
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
            );
          })}
        </div>
      </div>
    </motion.section>
  );
}
