import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

const Index = () => {
  const navigate = useNavigate();
  const { user, profile } = useAuth();

  const handleStart = () => {
    if (user && profile) {
      navigate('/dashboard');
    } else if (user) {
      navigate('/onboarding');
    } else {
      navigate('/auth');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-16">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
        className="max-w-2xl w-full text-center space-y-8"
      >
        <div className="space-y-2">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="text-sm tracking-[0.25em] uppercase text-subtle font-medium"
          >
            Sistema de Raio-X Comportamental
          </motion.div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl leading-tight">
            Raio-X Comportamental
          </h1>
        </div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.6 }}
          className="text-lg md:text-xl text-subtle leading-relaxed max-w-xl mx-auto"
        >
          Uma análise estruturada que identifica os padrões invisíveis que estão dirigindo suas decisões, travas e repetições.
        </motion.p>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.6 }}
          className="text-muted-foreground leading-relaxed max-w-lg mx-auto text-sm"
        >
          Leituras comportamentais independentes que alimentam um perfil central unificado — sua evolução real, visível e contínua.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.5 }}
        >
          <button
            onClick={handleStart}
            className="mt-4 px-10 py-4 bg-primary text-primary-foreground rounded-lg text-base font-medium tracking-wide hover:opacity-90 transition-opacity duration-200"
          >
            {user ? 'Acessar dashboard' : 'Começar agora'}
          </button>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1, duration: 0.5 }}
          className="text-xs text-subtle pt-4"
        >
          Múltiplos módulos · Perfil Central · Leitura contínua
        </motion.p>
      </motion.div>
    </div>
  );
};

export default Index;
