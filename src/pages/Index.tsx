import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { ScanLine, Crosshair, Eye, Compass, ArrowRight } from 'lucide-react';

const features = [
  { icon: Crosshair, text: 'Identifica seu padrão dominante' },
  { icon: Eye, text: 'Revela seus gatilhos e armadilhas' },
  { icon: Compass, text: 'Mostra por onde começar a mudança' },
];

const Index = () => {
  const navigate = useNavigate();
  const { user, profile } = useAuth();

  const handleStart = () => {
    if (user && profile) navigate('/dashboard');
    else if (user) navigate('/onboarding');
    else navigate('/auth');
  };

  const scrollToHow = () => {
    document.getElementById('como-funciona')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Hero */}
      <section className="flex-1 flex items-center justify-center px-4 pt-16 pb-24 md:pt-24 md:pb-32 relative overflow-hidden">
        {/* Background effects */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-[15%] left-[10%] w-[600px] h-[600px] rounded-full bg-primary/[0.03] blur-[100px]" />
          <div className="absolute bottom-[10%] right-[15%] w-[500px] h-[500px] rounded-full bg-accent/[0.04] blur-[100px]" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] rounded-full bg-primary/[0.02] blur-[80px]" />
        </div>

        <div className="max-w-3xl w-full relative z-10 space-y-12">
          {/* Micro label */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center"
          >
            <div className="inline-flex items-center gap-2.5 px-5 py-2 rounded-full border border-primary/12 bg-primary/[0.03]">
              <ScanLine className="w-3.5 h-3.5 text-primary/70" />
              <span className="text-[10px] tracking-[0.35em] uppercase text-primary/80 font-semibold">
                Sistema de Leitura Comportamental
              </span>
            </div>
          </motion.div>

          {/* Title */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.7 }}
            className="text-center"
          >
            <h1 className="text-[3.2rem] md:text-[4.5rem] lg:text-[5.5rem] leading-[0.95] tracking-[-0.04em]">
              Raio-X<br />
              <span className="italic text-primary">Comportamental</span>
            </h1>
          </motion.div>

          {/* Subtitle */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.35, duration: 0.6 }}
            className="text-center space-y-6 max-w-2xl mx-auto"
          >
            <p className="text-[1.15rem] md:text-[1.3rem] text-foreground/85 leading-[1.65] font-normal tracking-[-0.01em]">
              Você não está travada por acaso.<br />
              <span className="text-muted-foreground">
                Existe um padrão invisível operando por trás<br className="hidden sm:block" />
                das suas decisões, travas e repetições.
              </span>
            </p>

            <p className="text-[0.9rem] text-muted-foreground/70 leading-[1.8] max-w-lg mx-auto">
              Uma plataforma de autoanálise que identifica como sua mente está funcionando hoje,
              revela seu padrão dominante e mostra onde agir primeiro para destravar sua vida.
            </p>
          </motion.div>

          {/* 3 Features */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.55, duration: 0.5 }}
            className="flex flex-col sm:flex-row gap-4 sm:gap-6 justify-center items-center sm:items-stretch max-w-2xl mx-auto"
          >
            {features.map((f, i) => (
              <div
                key={i}
                className="flex items-center gap-3.5 px-5 py-4 bg-card/80 border border-border/60 rounded-xl w-full sm:w-auto sm:flex-1 backdrop-blur-sm"
              >
                <div className="w-8 h-8 rounded-lg bg-primary/8 flex items-center justify-center shrink-0">
                  <f.icon className="w-4 h-4 text-primary/70" />
                </div>
                <span className="text-[0.82rem] text-foreground/70 leading-snug tracking-[-0.005em]">{f.text}</span>
              </div>
            ))}
          </motion.div>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7, duration: 0.5 }}
            className="flex flex-col sm:flex-row gap-4 justify-center items-center"
          >
            <button
              onClick={handleStart}
              className="group px-10 py-4 bg-primary text-primary-foreground rounded-xl text-base font-medium tracking-wide hover:opacity-90 transition-all duration-200 shadow-lg shadow-primary/15 flex items-center gap-2"
            >
              Iniciar análise
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </button>
            <button
              onClick={scrollToHow}
              className="px-8 py-4 border border-border rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:border-foreground/20 transition-all duration-200"
            >
              Ver como funciona
            </button>
          </motion.div>

          {/* Trust line */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.9, duration: 0.5 }}
            className="text-center text-xs text-muted-foreground/50"
          >
            Gratuito · Sem cartão de crédito · Resultados imediatos
          </motion.p>
        </div>
      </section>

      {/* How it works (scroll target) */}
      <section id="como-funciona" className="px-4 pb-24">
        <div className="max-w-3xl mx-auto text-center space-y-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-50px' }}
            transition={{ duration: 0.6 }}
            className="space-y-4"
          >
            <p className="text-[10px] tracking-[0.3em] uppercase text-primary/60 font-semibold">Metodologia</p>
            <h2 className="text-3xl md:text-4xl">Como funciona</h2>
            <p className="text-[0.9rem] text-muted-foreground/70 max-w-md mx-auto leading-[1.7]">
              Um sistema em 3 etapas que revela o que você não consegue ver sozinha.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                step: '01',
                title: 'Leitura Comportamental',
                desc: 'Responda a análises estruturadas que mapeiam como sua mente está operando agora — sem perguntas genéricas.',
              },
              {
                step: '02',
                title: 'Raio-X do Padrão',
                desc: 'O sistema identifica seu padrão dominante, contradições internas, gatilhos e o ciclo de autossabotagem ativo.',
              },
              {
                step: '03',
                title: 'Direção Clara',
                desc: 'Você recebe um mapa preciso de onde está travada e qual é o primeiro movimento para destravar sua vida.',
              },
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.5 }}
                className="bg-card/80 backdrop-blur-sm border border-border/60 rounded-xl p-7 text-left space-y-3 hover:border-primary/15 transition-colors"
              >
                <span className="text-[10px] font-mono text-primary/50 tracking-[0.2em]">{item.step}</span>
                <h3 className="text-lg text-foreground tracking-[-0.02em]">{item.title}</h3>
                <p className="text-[0.82rem] text-muted-foreground/70 leading-[1.75]">{item.desc}</p>
              </motion.div>
            ))}
          </div>

          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3, duration: 0.5 }}
          >
            <button
              onClick={handleStart}
              className="px-10 py-4 bg-primary text-primary-foreground rounded-xl text-base font-medium tracking-wide hover:opacity-90 transition-all duration-200 shadow-lg shadow-primary/10"
            >
              Iniciar minha análise
            </button>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="text-center pb-8 text-xs text-muted-foreground/40">
        Raio-X Comportamental · Análise profunda · Evolução contínua
      </footer>
    </div>
  );
};

export default Index;
