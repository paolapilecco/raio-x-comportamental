import { motion } from 'framer-motion';

const AnalyzingScreen = () => {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-center space-y-6"
      >
        <div className="relative w-16 h-16 mx-auto">
          <motion.div
            className="absolute inset-0 rounded-full border-2 border-primary/20"
          />
          <motion.div
            className="absolute inset-0 rounded-full border-2 border-transparent border-t-primary"
            animate={{ rotate: 360 }}
            transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
          />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl">Analisando seus padrões</h2>
          <p className="text-sm text-subtle">
            Cruzando dados comportamentais e gerando seu relatório...
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default AnalyzingScreen;
