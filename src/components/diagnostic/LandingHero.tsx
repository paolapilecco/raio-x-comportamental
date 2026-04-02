import { motion } from 'framer-motion';
import { ScanLine } from 'lucide-react';

interface LandingHeroProps {
  onStart: () => void;
}

const LandingHero = ({ onStart }: LandingHeroProps) => {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-16 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/3 left-1/3 w-[400px] h-[400px] rounded-full bg-primary/[0.03] blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
        className="max-w-2xl w-full text-center space-y-8 relative z-10"
      >
        <div className="space-y-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-primary/20 bg-primary/5"
          >
            <ScanLine className="w-3.5 h-3.5 text-primary" />
            <span className="text-xs tracking-[0.2em] uppercase text-primary font-medium">
              Raio-X Comportamental
            </span>
          </motion.div>

          <h1 className="text-4xl md:text-5xl lg:text-6xl font-serif leading-tight">
            Leitura Comportamental
          </h1>
        </div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.6 }}
          className="text-base md:text-lg text-muted-foreground leading-relaxed max-w-xl mx-auto"
        >
          Uma análise estruturada que identifica os padrões invisíveis que estão
          dirigindo suas decisões, travas e repetições.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.5 }}
        >
          <button
            onClick={onStart}
            className="mt-2 px-10 py-4 bg-primary text-primary-foreground rounded-lg text-base font-medium tracking-wide hover:opacity-90 transition-all duration-200 shadow-lg shadow-primary/10"
          >
            Iniciar leitura
          </button>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1, duration: 0.5 }}
          className="text-xs text-muted-foreground/50 pt-4"
        >
          Múltiplos módulos · Perfil Central · Evolução contínua
        </motion.p>
      </motion.div>
    </div>
  );
};

export default LandingHero;
