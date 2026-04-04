import { useEffect, useState } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { ArrowRight, Brain, Target, Zap, CheckCircle2 } from 'lucide-react';

const Index = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const { scrollYProgress } = useScroll();
  const heroOpacity = useTransform(scrollYProgress, [0, 0.18], [1, 0]);
  const heroScale = useTransform(scrollYProgress, [0, 0.18], [1, 0.97]);
  const [activeTestimonial, setActiveTestimonial] = useState(0);

  useEffect(() => {
    if (!loading && user) {
      navigate('/dashboard', { replace: true });
    }
  }, [loading, user, navigate]);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveTestimonial(prev => (prev + 1) % 3);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleStart = () => {
    if (user) navigate('/dashboard');
    else navigate('/auth');
  };

  const scrollToHow = () => {
    document.getElementById('como-funciona')?.scrollIntoView({ behavior: 'smooth' });
  };

  const testimonials = [
    { text: 'Pela primeira vez entendi o que estava me travando de verdade.', role: 'Psicóloga Clínica', initials: 'MC' },
    { text: 'Usei com meus pacientes e o nível de precisão me surpreendeu.', role: 'Terapeuta Holístico', initials: 'RA' },
    { text: 'É como ter um mapa do que eu não conseguia ver sozinha.', role: 'Coach Executiva', initials: 'LP' },
  ];

  return (
    <div className="min-h-screen flex flex-col overflow-x-hidden">
      <a href="#main-content" className="skip-to-content">Pular para o conteúdo</a>

      {/* ── Navbar ── */}
      <motion.nav
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="fixed top-0 left-0 right-0 z-50 px-4 py-4"
      >
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="hsl(var(--primary-foreground))" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
                <path d="M2 12h20" />
              </svg>
            </div>
            <span className="font-display text-[0.85rem] font-semibold tracking-[-0.02em] text-foreground/90">
              Raio-X
            </span>
          </div>
          <button
            onClick={handleStart}
            className="px-5 py-2 rounded-full text-[0.78rem] font-medium bg-primary/[0.06] text-primary hover:bg-primary/[0.1] transition-colors duration-300 border border-primary/10"
          >
            Acessar plataforma
          </button>
        </div>
      </motion.nav>

      {/* ── Hero ── */}
      <motion.section
        id="main-content"
        aria-label="Página inicial"
        style={{ opacity: heroOpacity, scale: heroScale }}
        className="flex-1 flex items-center justify-center px-4 pt-28 pb-24 md:pt-36 md:pb-40 relative"
      >
        {/* Ambient background */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-[8%] right-[5%] w-[700px] h-[700px] rounded-full bg-gradient-to-br from-primary/[0.04] to-transparent blur-[120px]" />
          <div className="absolute bottom-[10%] left-[8%] w-[500px] h-[500px] rounded-full bg-gradient-to-tr from-accent/[0.05] to-transparent blur-[100px]" />
        </div>

        <div className="max-w-4xl w-full relative z-10">
          {/* Eyebrow */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1, duration: 0.5 }}
            className="flex justify-center mb-8"
          >
            <div className="inline-flex items-center gap-3 px-4 py-1.5 rounded-full border border-primary/8 bg-primary/[0.03]">
              <div className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
              <span className="font-display text-[10px] tracking-[0.3em] uppercase text-primary/70 font-medium">
                Plataforma de Diagnóstico Comportamental
              </span>
            </div>
          </motion.div>

          {/* Main heading */}
          <motion.div
            initial={{ opacity: 0, y: 25 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="text-center mb-8"
          >
            <h1 className="text-[3rem] md:text-[4.5rem] lg:text-[5.8rem] leading-[0.92]">
              Decodifique o que<br />
              <span className="italic text-primary">dirige você</span>
            </h1>
          </motion.div>

          {/* Subtitle */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.6 }}
            className="text-center max-w-xl mx-auto mb-12"
          >
            <p className="text-[1rem] md:text-[1.15rem] text-foreground/70 leading-[1.75] tracking-[-0.005em]">
              Uma leitura estruturada que revela os padrões invisíveis por trás das suas
              decisões, travas e repetições — com precisão clínica.
            </p>
          </motion.div>

          {/* CTA */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.5 }}
            className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16"
          >
            <button
              onClick={handleStart}
              className="group relative px-10 py-4 bg-primary text-primary-foreground rounded-full text-[0.95rem] font-semibold tracking-[-0.01em] transition-all duration-500 shadow-[0_4px_24px_-4px_hsl(var(--primary)/0.3)] hover:shadow-[0_8px_40px_-4px_hsl(var(--primary)/0.45)] hover:translate-y-[-2px] active:translate-y-[0px] flex items-center gap-3 overflow-hidden"
            >
              <span className="relative z-10">Iniciar minha leitura</span>
              <ArrowRight className="w-4 h-4 relative z-10 group-hover:translate-x-1 transition-transform duration-300" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/[0.08] to-white/[0.05] pointer-events-none" />
            </button>
            <button
              onClick={scrollToHow}
              className="px-6 py-4 rounded-full text-[0.82rem] font-medium text-muted-foreground hover:text-foreground transition-colors duration-300"
            >
              Como funciona ↓
            </button>
          </motion.div>

          {/* Social proof strip */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.85, duration: 0.6 }}
            className="flex flex-col items-center gap-5"
          >
            <div className="flex items-center gap-1">
              {[...Array(5)].map((_, i) => (
                <svg key={i} className="w-3.5 h-3.5 text-accent" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              ))}
            </div>
            <p className="text-[0.75rem] text-muted-foreground/50 font-display tracking-wide">
              Usado por psicólogos, coaches e terapeutas em +500 sessões
            </p>
          </motion.div>
        </div>
      </motion.section>

      {/* ── Authority strip ── */}
      <section className="px-4 py-16 border-y border-border/40">
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-center gap-8 md:gap-16">
            {[
              { value: '97%', label: 'Precisão na identificação de padrões' },
              { value: '8', label: 'Eixos comportamentais analisados' },
              { value: '3min', label: 'Para resultado completo' },
            ].map((stat, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.5 }}
                className="text-center"
              >
                <p className="font-display text-[2rem] md:text-[2.5rem] font-bold text-primary tracking-[-0.03em]">
                  {stat.value}
                </p>
                <p className="text-[0.72rem] text-muted-foreground/60 mt-1 tracking-wide font-display uppercase">
                  {stat.label}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Value proposition ── */}
      <section className="px-4 py-24 md:py-32">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <p className="font-display text-[10px] tracking-[0.35em] uppercase text-accent font-semibold mb-4">O que você descobre</p>
            <h2 className="text-3xl md:text-[3rem] tracking-[-0.03em]">
              Três camadas de<br /><span className="italic text-primary">compreensão</span>
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-5">
            {[
              {
                icon: Brain,
                number: '01',
                label: 'Leitura atual',
                title: 'Como sua mente está operando',
                text: 'Identifica o estado mental presente — não o que você deveria ser, mas como está funcionando agora.',
              },
              {
                icon: Target,
                number: '02',
                label: 'Padrão dominante',
                title: 'O que está dirigindo seus bloqueios',
                text: 'Revela o ciclo invisível de autossabotagem: gatilhos, armadilhas mentais e repetições.',
              },
              {
                icon: Zap,
                number: '03',
                label: 'Direção prática',
                title: 'Por onde começar a mudança',
                text: 'Indica qual área destravar primeiro para gerar efeito cascata na sua vida.',
              },
            ].map((card, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 25 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ delay: i * 0.1, duration: 0.5 }}
                className="group relative bg-card border border-border/50 rounded-2xl p-8 space-y-5 hover:border-primary/20 transition-all duration-500 hover:shadow-[0_12px_40px_-12px_hsl(var(--primary)/0.08)]"
              >
                <div className="flex items-center justify-between">
                  <div className="w-11 h-11 rounded-xl bg-primary/[0.06] flex items-center justify-center group-hover:bg-primary/[0.1] transition-colors duration-500">
                    <card.icon className="w-5 h-5 text-primary/60 group-hover:text-primary/80 transition-colors" />
                  </div>
                  <span className="font-display text-[0.65rem] text-muted-foreground/30 tracking-[0.2em] font-medium">
                    {card.number}
                  </span>
                </div>
                <div className="space-y-1">
                  <p className="font-display text-[0.65rem] tracking-[0.25em] uppercase text-accent/80 font-semibold">{card.label}</p>
                  <h3 className="text-[1.15rem] text-foreground tracking-[-0.02em]">{card.title}</h3>
                </div>
                <p className="text-[0.82rem] text-muted-foreground/65 leading-[1.75]">{card.text}</p>
                {/* Progress-like bar at bottom */}
                <div className="h-[2px] bg-border/50 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-primary/30 rounded-full"
                    initial={{ width: '0%' }}
                    whileInView={{ width: `${(i + 1) * 33}%` }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.5 + i * 0.15, duration: 0.8 }}
                  />
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section id="como-funciona" className="px-4 py-24 md:py-32 bg-primary/[0.02]">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16 space-y-4"
          >
            <p className="font-display text-[10px] tracking-[0.35em] uppercase text-accent font-semibold">Metodologia</p>
            <h2 className="text-3xl md:text-[3rem]">
              Processo de <span className="italic text-primary">leitura</span>
            </h2>
            <p className="text-[0.9rem] text-muted-foreground/65 max-w-md mx-auto leading-[1.7]">
              Um sistema estruturado em 3 etapas para revelar o que você não consegue ver sozinha.
            </p>
          </motion.div>

          <div className="relative">
            {/* Vertical connector */}
            <div className="hidden md:block absolute left-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-border/0 via-border/40 to-border/0 -translate-x-1/2" />

            <div className="space-y-8 md:space-y-0">
              {[
                {
                  step: '01',
                  title: 'Leitura Comportamental',
                  desc: 'Responda análises estruturadas que mapeiam como sua mente está operando agora — sem perguntas genéricas.',
                  detail: '~5 minutos · 8 eixos comportamentais',
                },
                {
                  step: '02',
                  title: 'Raio-X do Padrão',
                  desc: 'O sistema identifica seu padrão dominante, contradições internas, gatilhos e ciclo de autossabotagem.',
                  detail: 'Análise por IA · Precisão clínica',
                },
                {
                  step: '03',
                  title: 'Direção Clara',
                  desc: 'Receba um mapa preciso de onde está travada e qual é o primeiro movimento para destravar.',
                  detail: 'Relatório completo · Exportável em PDF',
                },
              ].map((item, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.12, duration: 0.5 }}
                  className={`flex flex-col md:flex-row items-center gap-6 md:gap-12 ${i % 2 === 1 ? 'md:flex-row-reverse' : ''}`}
                >
                  <div className="flex-1 text-center md:text-left space-y-3">
                    <div className="flex items-center gap-3 justify-center md:justify-start">
                      <span className="font-display text-[0.65rem] text-accent/80 tracking-[0.2em] font-semibold">{item.step}</span>
                      <div className="w-6 h-px bg-border/60" />
                    </div>
                    <h3 className="text-xl md:text-2xl text-foreground tracking-[-0.02em]">{item.title}</h3>
                    <p className="text-[0.85rem] text-muted-foreground/60 leading-[1.75] max-w-sm mx-auto md:mx-0">{item.desc}</p>
                    <p className="font-display text-[0.7rem] text-primary/50 tracking-wide">{item.detail}</p>
                  </div>

                  {/* Visual node */}
                  <div className="relative w-14 h-14 shrink-0">
                    <div className="absolute inset-0 rounded-full border-2 border-primary/15 flex items-center justify-center">
                      <div className="w-3 h-3 rounded-full bg-primary/30" />
                    </div>
                    {i < 2 && (
                      <div className="hidden md:block absolute top-full left-1/2 w-px h-8 bg-border/40 -translate-x-1/2" />
                    )}
                  </div>

                  <div className="flex-1" />
                </motion.div>
              ))}
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.4, duration: 0.5 }}
            className="text-center mt-16"
          >
            <button
              onClick={handleStart}
              className="group relative px-10 py-4 bg-primary text-primary-foreground rounded-full text-[0.95rem] font-semibold tracking-[-0.01em] transition-all duration-500 shadow-[0_4px_24px_-4px_hsl(var(--primary)/0.3)] hover:shadow-[0_8px_40px_-4px_hsl(var(--primary)/0.45)] hover:translate-y-[-2px] active:translate-y-[0px] flex items-center gap-3 overflow-hidden mx-auto"
            >
              <span className="relative z-10">Começar agora</span>
              <ArrowRight className="w-4 h-4 relative z-10 group-hover:translate-x-1 transition-transform duration-300" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/[0.08] to-white/[0.05] pointer-events-none" />
            </button>
          </motion.div>
        </div>
      </section>

      {/* ── Testimonials ── */}
      <section className="px-4 py-24 md:py-32">
        <div className="max-w-3xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="space-y-4 mb-12"
          >
            <p className="font-display text-[10px] tracking-[0.35em] uppercase text-accent font-semibold">Profissionais que usam</p>
            <h2 className="text-3xl md:text-[3rem]">
              Reconhecido por<br /><span className="italic text-primary">quem entende</span>
            </h2>
          </motion.div>

          <div className="relative h-[140px] flex items-center justify-center">
            {testimonials.map((t, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{
                  opacity: activeTestimonial === i ? 1 : 0,
                  y: activeTestimonial === i ? 0 : 10,
                  position: 'absolute' as const,
                }}
                transition={{ duration: 0.5 }}
                className="max-w-lg mx-auto space-y-4"
              >
                <p className="text-[1.1rem] md:text-[1.25rem] text-foreground/80 leading-[1.6] italic">
                  "{t.text}"
                </p>
                <div className="flex items-center justify-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/[0.08] flex items-center justify-center">
                    <span className="font-display text-[0.6rem] font-semibold text-primary/70">{t.initials}</span>
                  </div>
                  <span className="text-[0.75rem] text-muted-foreground/50 font-display">{t.role}</span>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Dots indicator */}
          <div className="flex justify-center gap-2 mt-6">
            {testimonials.map((_, i) => (
              <button
                key={i}
                onClick={() => setActiveTestimonial(i)}
                className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
                  activeTestimonial === i ? 'bg-primary w-6' : 'bg-border'
                }`}
                aria-label={`Depoimento ${i + 1}`}
              />
            ))}
          </div>
        </div>
      </section>

      {/* ── What you get ── */}
      <section className="px-4 py-24 md:py-32 bg-primary/[0.02]">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center mb-14 space-y-4"
          >
            <p className="font-display text-[10px] tracking-[0.35em] uppercase text-accent font-semibold">Seu relatório inclui</p>
            <h2 className="text-3xl md:text-[3rem]">
              Cada leitura é um<br /><span className="italic text-primary">diagnóstico completo</span>
            </h2>
          </motion.div>

          <div className="grid sm:grid-cols-2 gap-4">
            {[
              'Padrão dominante identificado com precisão',
              'Ciclo de autossabotagem mapeado',
              'Gatilhos e armadilhas mentais revelados',
              'Impacto em cada área da vida (carreira, saúde, relacionamentos)',
              'Estratégia de saída personalizada',
              'Relatório exportável em PDF',
              'Perfil central com evolução contínua',
              'Múltiplos módulos de análise (Premium)',
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -10 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05, duration: 0.4 }}
                className="flex items-start gap-3 p-4 rounded-xl hover:bg-card/80 transition-colors"
              >
                <CheckCircle2 className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                <span className="text-[0.85rem] text-foreground/70 leading-snug">{item}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="px-4 py-32 md:py-40">
        <div className="max-w-3xl mx-auto text-center space-y-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="space-y-5"
          >
            <h2 className="text-3xl md:text-[3.5rem] leading-[0.95]">
              Pronta para ver o que<br />
              <span className="italic text-primary">está por trás?</span>
            </h2>
            <p className="text-[0.95rem] text-muted-foreground/60 leading-[1.7] max-w-md mx-auto">
              A mudança começa quando você enxerga o padrão que estava invisível.
              Sua primeira leitura é gratuita.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2, duration: 0.5 }}
          >
            <button
              onClick={handleStart}
              className="group relative px-12 py-4 bg-primary text-primary-foreground rounded-full text-[1rem] font-semibold tracking-[-0.01em] transition-all duration-500 shadow-[0_4px_24px_-4px_hsl(var(--primary)/0.3)] hover:shadow-[0_12px_48px_-4px_hsl(var(--primary)/0.45)] hover:translate-y-[-2px] active:translate-y-[0px] flex items-center gap-3 overflow-hidden mx-auto"
            >
              <span className="relative z-10">Iniciar minha leitura gratuita</span>
              <ArrowRight className="w-4 h-4 relative z-10 group-hover:translate-x-1 transition-transform duration-300" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/[0.08] to-white/[0.05] pointer-events-none" />
            </button>
          </motion.div>

          <p className="text-[0.72rem] text-muted-foreground/40 font-display tracking-wide">
            Gratuito · Sem cartão de crédito · Resultados imediatos
          </p>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-border/30 px-4 py-8" role="contentinfo">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="hsl(var(--primary))" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
                <path d="M2 12h20" />
              </svg>
            </div>
            <span className="font-display text-[0.75rem] text-muted-foreground/50 font-medium">Raio-X Comportamental</span>
          </div>
          <p className="text-[0.7rem] text-muted-foreground/35 font-display">
            Diagnóstico comportamental de precisão · Evolução contínua
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
