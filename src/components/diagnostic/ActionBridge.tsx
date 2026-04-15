import { motion } from 'framer-motion';
import { Zap, ArrowRight, Flame } from 'lucide-react';

const fade = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
};

interface ActionBridgeProps {
  patternLabel: string;
  onStartAction: () => void;
}

export function ActionBridge({ patternLabel, onStartAction }: ActionBridgeProps) {
  return (
    <motion.section {...fade} transition={{ delay: 0.45, duration: 0.5 }} className="space-y-8 py-4">

      {/* ── Separator ── */}
      <div className="flex items-center gap-4">
        <div className="flex-1 h-px bg-border/15" />
        <Zap className="w-4 h-4 text-primary/30" />
        <div className="flex-1 h-px bg-border/15" />
      </div>

      {/* ── Bridge Question ── */}
      <motion.div {...fade} transition={{ delay: 0.5, duration: 0.5 }} className="text-center space-y-4">
        <p className="text-lg md:text-xl font-serif font-semibold text-foreground leading-snug max-w-md mx-auto">
          Agora que você viu isso com clareza, a pergunta é:
        </p>
        <p className="text-base md:text-lg font-serif text-primary font-semibold">
          Você vai continuar repetindo ou vai fazer diferente?
        </p>
      </motion.div>

      {/* ── Action Connection ── */}
      <motion.div {...fade} transition={{ delay: 0.55, duration: 0.4 }}>
        <div className="rounded-2xl border border-primary/15 bg-primary/[0.03] px-6 py-6 space-y-4">
          <div className="flex items-start gap-3">
            <ArrowRight className="w-4 h-4 text-primary/50 mt-0.5 shrink-0" />
            <p className="text-[15px] text-foreground/80 leading-relaxed">
              As próximas ações foram criadas com base exatamente no padrão <span className="font-semibold text-foreground">{patternLabel}</span> que você acabou de ver.
            </p>
          </div>
        </div>
      </motion.div>

      {/* ── Urgency Warning ── */}
      <motion.div {...fade} transition={{ delay: 0.6, duration: 0.4 }}>
        <div className="flex items-center justify-center gap-2 py-2">
          <Flame className="w-4 h-4 text-destructive/50" />
          <p className="text-[13px] text-muted-foreground/60 italic">
            Se você sair daqui sem agir, esse padrão continua ativo.
          </p>
        </div>
      </motion.div>

      {/* ── CTA ── */}
      <motion.div
        {...fade}
        transition={{ delay: 0.65, duration: 0.4 }}
        className="flex justify-center"
      >
        <button
          onClick={onStartAction}
          className="group inline-flex items-center gap-3 px-8 py-4 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:brightness-90 transition-all active:scale-[0.97] shadow-lg shadow-primary/20"
        >
          <Zap className="w-4 h-4 group-hover:animate-pulse" />
          Começar a mudança agora
          <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
        </button>
      </motion.div>
    </motion.section>
  );
}
