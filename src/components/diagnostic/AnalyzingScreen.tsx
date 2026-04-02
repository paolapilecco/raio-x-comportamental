import { motion } from 'framer-motion';
import { ScanLine } from 'lucide-react';

const AnalyzingScreen = () => {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-center space-y-8"
      >
        <div className="relative w-20 h-20 mx-auto">
          <motion.div
            className="absolute inset-0 rounded-full border border-primary/15"
          />
          <motion.div
            className="absolute inset-0 rounded-full border border-transparent border-t-primary/60"
            animate={{ rotate: 360 }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <ScanLine className="w-5 h-5 text-primary/50" />
          </div>
        </div>
        <div className="space-y-3">
          <h2 className="text-2xl md:text-3xl">Analisando seus padrões</h2>
          <p className="text-[0.85rem] text-muted-foreground/60 leading-[1.7] max-w-sm mx-auto">
            Cruzando dados comportamentais e gerando seu relatório de leitura...
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default AnalyzingScreen;
