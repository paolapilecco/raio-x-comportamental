import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { ScanLine, Layers, Activity, Eye } from 'lucide-react';

const pillars = [
  { icon: ScanLine, label: 'Leitura profunda', desc: 'Análise dos padrões que operam abaixo da sua consciência' },
  { icon: Eye, label: 'Padrões invisíveis', desc: 'Identificação de ciclos que se repetem sem você perceber' },
  { icon: Layers, label: 'Perfil unificado', desc: 'Cada leitura refina um mapa único do seu funcionamento' },
  { icon: Activity, label: 'Evolução contínua', desc: 'Acompanhe mudanças reais ao longo do tempo' },
];

const Index = () => {
  const navigate = useNavigate();
  const { user, profile } = useAuth();

  const handleStart = () => {
    if (user && profile) navigate('/dashboard');
    else if (user) navigate('/onboarding');
    else navigate('/auth');
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Hero */}
      <section className="flex-1 flex items-center justify-center px-4 py-20 md:py-28 relative overflow-hidden">
        {/* Subtle background accents */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] rounded-full bg-primary/[0.03] blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] rounded-full bg-accent/[0.04] blur-3xl" />
        </div>

        <div className="max-w-3xl w-full text-center space-y-10 relative z-10">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1, duration: 0.8 }}
            className="space-y-1"
          >
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-primary/20 bg-primary/5 mb-6">
              <ScanLine className="w-3.5 h-3.5 text-primary" />
              <span className="text-xs tracking-[0.2em] uppercase text-primary font-medium">
                Raio-X Comportamental
              </span>
            </div>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.8 }}
            className="text-4xl md:text-5xl lg:text-[3.5rem] font-serif leading-[1.15] tracking-tight"
          >
            Seus padrões invisíveis<br />
            <span className="text-primary">revelados com precisão</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.6 }}
            className="text-base md:text-lg text-muted-foreground leading-relaxed max-w-xl mx-auto"
          >
            Uma análise estruturada que identifica os padrões que estão dirigindo
            suas decisões, travas e repetições — sem generalizações, sem achismos.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.5 }}
            className="flex flex-col sm:flex-row gap-4 justify-center items-center"
          >
            <button
              onClick={handleStart}
              className="px-10 py-4 bg-primary text-primary-foreground rounded-lg text-base font-medium tracking-wide hover:opacity-90 transition-all duration-200 shadow-lg shadow-primary/10"
            >
              {user ? 'Acessar meu painel' : 'Iniciar minha leitura'}
            </button>
            {!user && (
              <span className="text-xs text-muted-foreground">
                Gratuito · Sem cartão de crédito
              </span>
            )}
          </motion.div>
        </div>
      </section>

      {/* Pillars */}
      <section className="px-4 pb-20">
        <div className="max-w-4xl mx-auto">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {pillars.map((p, i) => (
              <motion.div
                key={p.label}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 + i * 0.1, duration: 0.5 }}
                className="bg-card border border-border rounded-xl p-5 space-y-3 hover:border-primary/20 transition-colors"
              >
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                  <p.icon className="w-4 h-4 text-primary" />
                </div>
                <h3 className="text-sm font-medium text-foreground">{p.label}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{p.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer tagline */}
      <motion.footer
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2, duration: 0.5 }}
        className="text-center pb-8 text-xs text-muted-foreground/60"
      >
        Sistema de Raio-X Comportamental · Análise profunda · Evolução contínua
      </motion.footer>
    </div>
  );
};

export default Index;
