import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';

interface LandingHeroProps {
  onStart: () => void;
}

const LandingHero = ({ onStart }: LandingHeroProps) => {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-16 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[15%] right-[5%] w-[600px] h-[600px] rounded-full bg-gradient-to-br from-primary/[0.04] to-transparent blur-[120px]" />
        <div className="absolute bottom-[10%] left-[10%] w-[400px] h-[400px] rounded-full bg-gradient-to-tr from-accent/[0.05] to-transparent blur-[100px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        className="max-w-2xl w-full text-center space-y-10 relative z-10"
      >
        <div className="space-y-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="inline-flex items-center gap-3 px-4 py-1.5 rounded-full border border-primary/8 bg-primary/[0.03]"
          >
            <div className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
            <span className="font-display text-[10px] tracking-[0.3em] uppercase text-primary/70 font-medium">
              Leitura Comportamental
            </span>
          </motion.div>

          <h1 className="text-[2.8rem] md:text-[3.5rem] lg:text-[4.2rem] leading-[0.95] tracking-[-0.04em]">
            Leitura<br />
            <span className="italic text-primary">Comportamental</span>
          </h1>
        </div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.6 }}
          className="text-[0.95rem] md:text-[1.1rem] text-foreground/70 leading-[1.75] max-w-lg mx-auto"
        >
          Uma análise estruturada que identifica os padrões invisíveis que estão
          dirigindo suas decisões, travas e repetições.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7, duration: 0.5 }}
        >
          <button
            onClick={onStart}
            className="group relative px-10 py-4 bg-primary text-primary-foreground rounded-full text-[0.95rem] font-semibold tracking-[-0.01em] transition-all duration-500 shadow-[0_4px_24px_-4px_hsl(var(--primary)/0.3)] hover:shadow-[0_8px_40px_-4px_hsl(var(--primary)/0.45)] hover:translate-y-[-2px] active:translate-y-[0px] flex items-center gap-3 mx-auto overflow-hidden"
          >
            <span className="relative z-10">Iniciar leitura</span>
            <ArrowRight className="w-4 h-4 relative z-10 group-hover:translate-x-1 transition-transform duration-300" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/[0.08] to-white/[0.05] pointer-events-none" />
          </button>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9, duration: 0.5 }}
          className="text-[0.7rem] text-muted-foreground/40 font-display tracking-wide"
        >
          Múltiplos módulos · Perfil Central · Evolução contínua
        </motion.p>
      </motion.div>
    </div>
  );
};

export default LandingHero;
