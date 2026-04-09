import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import FractalBloomCanvas from '@/components/ui/fractal-bloom-canvas';
import heroBrainImg from '@/assets/hero-brain.jpg';

interface HeroSectionProps {
  onStart: () => void;
  onScrollToHow: () => void;
}

const HeroSection = ({ onStart, onScrollToHow }: HeroSectionProps) => {
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

      {/* Subtle brain image overlay */}
      <div className="absolute inset-0 pointer-events-none opacity-15 mix-blend-screen">
        <img
          src={heroBrainImg}
          alt=""
          aria-hidden="true"
          className="w-full h-full object-cover"
          width={1920}
          height={1080}
        />
      </div>

      {/* Gradient overlays */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/30 pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/70 pointer-events-none" />

      <div className="relative z-10 max-w-3xl w-full text-center px-6 py-32">
        <motion.div
          custom={0}
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/10 bg-white/5 backdrop-blur-sm mb-8"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
          <span className="text-[11px] font-medium text-white/70 uppercase tracking-[0.2em]">
            Diagnóstico Comportamental de Precisão
          </span>
        </motion.div>

        <motion.h1
          custom={1}
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          className="text-[2.75rem] md:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.05] text-white mb-6"
        >
          Você não está travada.{' '}
          <span className="block mt-1">
            Você está{' '}
            <span className="bg-gradient-to-r from-[hsl(41,45%,59%)] to-[hsl(41,55%,72%)] bg-clip-text text-transparent">
              repetindo um padrão.
            </span>
          </span>
        </motion.h1>

        <motion.p
          custom={2}
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          className="text-base md:text-lg text-white/60 leading-relaxed max-w-xl mx-auto mb-10"
        >
          O Raio-X Mental decodifica os mecanismos invisíveis que dirigem suas decisões,
          bloqueios e repetições — em 5 minutos, com precisão clínica.
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
            Iniciar minha leitura gratuita
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
          <p className="text-[11px] text-white/25 tracking-wide">
            Gratuito para sempre · Sem cartão · Resultado imediato
          </p>
          <p className="text-[10px] text-white/15">
            +2.800 padrões já mapeados por profissionais de saúde mental
          </p>
        </motion.div>
      </div>
    </section>
  );
};

export default HeroSection;
