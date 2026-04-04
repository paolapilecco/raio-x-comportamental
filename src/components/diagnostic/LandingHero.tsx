import { ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';

interface LandingHeroProps {
  onStart: () => void;
}

const LandingHero = ({ onStart }: LandingHeroProps) => {
  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-20">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="max-w-xl w-full text-center space-y-10"
      >
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="text-xs font-medium text-muted-foreground uppercase tracking-widest"
        >
          Leitura Comportamental
        </motion.p>

        <motion.h1
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="text-4xl md:text-5xl font-semibold tracking-tight leading-[1.1]"
        >
          Leitura Comportamental
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.45, duration: 0.5 }}
          className="text-base text-muted-foreground leading-relaxed max-w-md mx-auto"
        >
          Uma análise estruturada que identifica os padrões invisíveis que estão
          dirigindo suas decisões, travas e repetições.
        </motion.p>

        <motion.button
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.4 }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          onClick={onStart}
          className="inline-flex items-center gap-2 px-7 py-3.5 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:brightness-90 transition-all duration-200"
        >
          Iniciar leitura
          <ArrowRight className="w-4 h-4" />
        </motion.button>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.75, duration: 0.5 }}
          className="text-xs text-muted-foreground/50"
        >
          Múltiplos módulos · Perfil Central · Evolução contínua
        </motion.p>
      </motion.div>
    </div>
  );
};

export default LandingHero;
