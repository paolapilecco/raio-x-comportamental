import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import FractalBloomCanvas from '@/components/ui/fractal-bloom-canvas';
import heroBrainImg from '@/assets/hero-brain.jpg';

interface HeroSectionProps {
  onStart: () => void;
  onScrollToHow: () => void;
}

const HeroSection = ({ onStart, onScrollToHow }: HeroSectionProps) => {
  const [liveCount, setLiveCount] = useState(() => {
    const stored = localStorage.getItem('rxm_live_count');
    const lastVisit = localStorage.getItem('rxm_last_visit');
    const now = Date.now();
    const base = stored ? parseInt(stored, 10) : 2800;
    // Incrementa entre 1-4 a cada visita, com intervalo mínimo de 30s
    if (!lastVisit || now - parseInt(lastVisit, 10) > 30000) {
      const increment = Math.floor(Math.random() * 4) + 1;
      const newCount = base + increment;
      localStorage.setItem('rxm_live_count', String(newCount));
      localStorage.setItem('rxm_last_visit', String(now));
      return newCount;
    }
    return base;
  });

  useEffect(() => {
    // Incremento sutil a cada 15-45s enquanto a página está aberta
    const interval = setInterval(() => {
      setLiveCount(prev => {
        const next = prev + 1;
        localStorage.setItem('rxm_live_count', String(next));
        return next;
      });
    }, (Math.random() * 30000) + 15000);
    return () => clearInterval(interval);
  }, []);

  const formattedCount = liveCount.toLocaleString('pt-BR');

  const fadeUp = {
    hidden: { opacity: 0, y: 24 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: {
        delay: i * 0.2 + 1.8,
        duration: 0.8,
        ease: [0.25, 0.46, 0.45, 0.94],
      },
    }),
  };

  return (
    <section
      id="main-content"
      aria-label="Página inicial"
      className="relative min-h-screen flex items-center justify-center overflow-hidden"
    >
      <FractalBloomCanvas />

      <div className="absolute inset-0 pointer-events-none opacity-[0.08] mix-blend-screen">
        <img src={heroBrainImg} alt="" aria-hidden="true" className="w-full h-full object-cover" width={1920} height={1080} />
      </div>

      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-black/40 pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/70 pointer-events-none" />

      <div className="relative z-10 max-w-3xl w-full text-center px-6 py-32 mx-auto" style={{ textShadow: '0 0 20px rgba(0,0,0,0.8), 0 0 40px rgba(0,0,0,0.5)' }}>
        <motion.div
          custom={0}
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/10 bg-white/5 backdrop-blur-sm mb-8"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
          <span className="text-[11px] font-medium text-white/70 uppercase tracking-[0.2em]">
            +{formattedCount} reprogramações emocionais realizadas
          </span>
        </motion.div>

        <motion.h1
          custom={1}
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          className="text-[2.75rem] md:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.05] text-white mb-6"
        >
          Descubra o que está{' '}
          <span className="bg-gradient-to-r from-[hsl(41,45%,59%)] to-[hsl(41,55%,72%)] bg-clip-text text-transparent">
            te sabotando
          </span>{' '}
          sem você perceber.
        </motion.h1>

        <motion.p
          custom={2}
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          className="text-[15px] md:text-lg text-white/70 leading-relaxed max-w-xl mx-auto mb-10"
        >
          Em 5 minutos você vai entender por que trava, repete os mesmos erros
          e não consegue sair do lugar — mesmo sabendo exatamente o que precisa fazer.
        </motion.p>

        <motion.div
          custom={3}
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          className="flex flex-col sm:flex-row gap-3 justify-center items-center mb-8"
        >
          <button
            onClick={onStart}
            className="group inline-flex items-center gap-2.5 px-8 py-4 bg-gradient-to-r from-[hsl(41,50%,45%)] via-[hsl(41,55%,55%)] to-[hsl(41,50%,45%)] text-white rounded-xl text-sm font-semibold shadow-[0_0_40px_rgba(198,169,105,0.2)] hover:shadow-[0_0_60px_rgba(198,169,105,0.35)] transition-all duration-500 hover:scale-[1.02] active:scale-[0.98]"
          >
            Fazer meu Raio-X gratuito
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
          </button>
          <button
            onClick={onScrollToHow}
            className="text-sm text-white/40 hover:text-white/70 transition-colors py-3 px-4"
          >
            Como funciona ↓
          </button>
        </motion.div>

        <motion.div
          custom={4}
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          className="space-y-2"
        >
          <p className="text-[11px] text-white/30 tracking-wide">
            100% gratuito · Sem cartão · Resultado na hora
          </p>
        </motion.div>
      </div>
    </section>
  );
};

export default HeroSection;
