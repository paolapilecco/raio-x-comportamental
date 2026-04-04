import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';

const steps = [
  'Mapeando respostas...',
  'Identificando padrões dominantes...',
  'Cruzando eixos comportamentais...',
  'Calculando intensidades...',
  'Gerando relatório personalizado...',
];

const AnalyzingScreen = () => {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setStep((prev) => (prev < steps.length - 1 ? prev + 1 : prev));
    }, 1800);
    return () => clearInterval(interval);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen flex items-center justify-center px-6"
    >
      <div className="text-center space-y-8 max-w-sm">
        {/* Animated pulse ring */}
        <div className="relative w-16 h-16 mx-auto">
          <motion.div
            className="absolute inset-0 rounded-full border border-primary/20"
            animate={{ scale: [1, 1.6, 1.6], opacity: [0.4, 0, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeOut' }}
          />
          <motion.div
            className="absolute inset-0 rounded-full border border-primary/15"
            animate={{ scale: [1, 1.4, 1.4], opacity: [0.3, 0, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeOut', delay: 0.4 }}
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
          </div>
        </div>

        <div className="space-y-3">
          <h2 className="text-xl font-semibold tracking-tight text-foreground">Analisando seus padrões</h2>
          <motion.p
            key={step}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="text-sm text-muted-foreground"
          >
            {steps[step]}
          </motion.p>
        </div>

        {/* Progress dots */}
        <div className="flex items-center justify-center gap-2">
          {steps.map((_, i) => (
            <motion.div
              key={i}
              className="w-1.5 h-1.5 rounded-full"
              animate={{
                backgroundColor: i <= step ? 'hsl(var(--primary))' : 'hsl(var(--border))',
                scale: i === step ? 1.3 : 1,
              }}
              transition={{ duration: 0.3 }}
            />
          ))}
        </div>
      </div>
    </motion.div>
  );
};

export default AnalyzingScreen;
