import { motion } from 'framer-motion';
import { ScanLine, ArrowRight } from 'lucide-react';

interface LandingHeroProps {
  onStart: () => void;
}

const LandingHero = ({ onStart }: LandingHeroProps) => {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-16 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[20%] left-[15%] w-[500px] h-[500px] rounded-full bg-primary/[0.03] blur-[100px]" />
        <div className="absolute bottom-[15%] right-[20%] w-[400px] h-[400px] rounded-full bg-accent/[0.03] blur-[100px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
        className="max-w-2xl w-full text-center space-y-10 relative z-10"
      >
        <div className="space-y-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="inline-flex items-center gap-2.5 px-5 py-2 rounded-full border border-primary/12 bg-primary/[0.03]"
          >
            <ScanLine className="w-3.5 h-3.5 text-primary/70" />
            <span className="text-[10px] tracking-[0.35em] uppercase text-primary/80 font-semibold">
              Raio-X Comportamental
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
          className="text-[0.95rem] md:text-[1.1rem] text-foreground/80 leading-[1.7] max-w-lg mx-auto"
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
            className="group relative px-10 py-[1rem] bg-primary text-primary-foreground rounded-2xl text-[1rem] font-semibold tracking-[0.02em] transition-all duration-300 shadow-[0_8px_30px_-6px_hsl(var(--primary)/0.35)] hover:shadow-[0_12px_40px_-4px_hsl(var(--primary)/0.45)] hover:translate-y-[-1px] active:translate-y-[0px] flex items-center gap-2.5 mx-auto overflow-hidden"
          >
            <span className="relative z-10">Iniciar leitura</span>
            <ArrowRight className="w-[1rem] h-[1rem] relative z-10 group-hover:translate-x-1 transition-transform duration-300" />
            <div className="absolute inset-0 bg-gradient-to-b from-white/[0.08] to-transparent pointer-events-none rounded-2xl" />
          </button>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9, duration: 0.5 }}
          className="text-xs text-muted-foreground/40"
        >
          Múltiplos módulos · Perfil Central · Evolução contínua
        </motion.p>
      </motion.div>
    </div>
  );
};

export default LandingHero;
