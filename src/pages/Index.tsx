import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { ArrowRight, Check } from 'lucide-react';

const Index = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
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
    <div className="min-h-screen flex flex-col">
      <a href="#main-content" className="skip-to-content">Pular para o conteúdo</a>

      {/* ── Navbar ── */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-sm">
        <div className="max-w-5xl mx-auto flex items-center justify-between px-6 h-14">
          <span className="text-sm font-semibold tracking-tight text-foreground">
            Raio-X
          </span>
          <button
            onClick={handleStart}
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            Entrar
          </button>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section
        id="main-content"
        aria-label="Página inicial"
        className="flex-1 flex items-center justify-center px-6 pt-32 pb-24 md:pt-40 md:pb-32"
      >
        <div className="max-w-2xl w-full text-center">
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
            className="text-xs font-medium text-muted-foreground uppercase tracking-widest mb-6"
          >
            Diagnóstico Comportamental
          </motion.p>

          <motion.h1
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.5 }}
            className="text-4xl md:text-5xl lg:text-6xl font-semibold tracking-tight leading-[1.08] mb-6"
          >
            Entenda os padrões que dirigem suas decisões
          </motion.h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.4 }}
            className="text-base md:text-lg text-muted-foreground leading-relaxed max-w-lg mx-auto mb-10"
          >
            Uma análise estruturada que revela os padrões invisíveis por trás das suas travas, repetições e decisões.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35, duration: 0.4 }}
            className="flex flex-col sm:flex-row gap-3 justify-center items-center mb-12"
          >
            <button
              onClick={handleStart}
              className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
            >
              Iniciar leitura
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={scrollToHow}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors py-3 px-4"
            >
              Como funciona
            </button>
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.4 }}
            className="text-xs text-muted-foreground/60"
          >
            Usado por psicólogos, coaches e terapeutas em +500 sessões
          </motion.p>
        </div>
      </section>

      {/* ── Stats ── */}
      <section className="px-6 py-16 border-y border-border/50">
        <div className="max-w-3xl mx-auto flex flex-col md:flex-row items-center justify-center gap-12 md:gap-20">
          {[
            { value: '97%', label: 'Precisão na identificação' },
            { value: '8', label: 'Eixos analisados' },
            { value: '3min', label: 'Resultado completo' },
          ].map((stat, i) => (
            <div key={i} className="text-center">
              <p className="text-3xl font-semibold tracking-tight text-foreground">{stat.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features ── */}
      <section className="px-6 py-24 md:py-32">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest mb-3">O que você descobre</p>
            <h2 className="text-3xl md:text-4xl font-semibold tracking-tight">
              Três camadas de compreensão
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                number: '01',
                title: 'Leitura atual',
                subtitle: 'Como sua mente está operando',
                text: 'Identifica o estado mental presente — não o que você deveria ser, mas como está funcionando agora.',
              },
              {
                number: '02',
                title: 'Padrão dominante',
                subtitle: 'O que está dirigindo seus bloqueios',
                text: 'Revela o ciclo invisível de autossabotagem: gatilhos, armadilhas mentais e repetições.',
              },
              {
                number: '03',
                title: 'Direção prática',
                subtitle: 'Por onde começar a mudança',
                text: 'Indica qual área destravar primeiro para gerar efeito cascata na sua vida.',
              },
            ].map((card, i) => (
              <div key={i} className="space-y-4">
                <span className="text-xs font-medium text-muted-foreground/50">{card.number}</span>
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">{card.title}</p>
                  <h3 className="text-lg font-semibold tracking-tight text-foreground">{card.subtitle}</h3>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">{card.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section id="como-funciona" className="px-6 py-24 md:py-32 bg-secondary/50">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest mb-3">Metodologia</p>
            <h2 className="text-3xl md:text-4xl font-semibold tracking-tight">Processo de leitura</h2>
            <p className="text-sm text-muted-foreground mt-4 max-w-md mx-auto">
              Um sistema estruturado em 3 etapas para revelar o que você não consegue ver sozinha.
            </p>
          </div>

          <div className="space-y-12">
            {[
              {
                step: '01',
                title: 'Leitura Comportamental',
                desc: 'Responda análises estruturadas que mapeiam como sua mente está operando — sem perguntas genéricas.',
                detail: '~5 minutos · 8 eixos',
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
                detail: 'Relatório completo · PDF',
              },
            ].map((item, i) => (
              <div key={i} className="flex gap-6">
                <div className="flex flex-col items-center">
                  <div className="w-8 h-8 rounded-full bg-foreground text-background flex items-center justify-center text-xs font-semibold shrink-0">
                    {item.step}
                  </div>
                  {i < 2 && <div className="w-px flex-1 bg-border mt-2" />}
                </div>
                <div className="pb-8">
                  <h3 className="text-base font-semibold text-foreground mb-1">{item.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-2">{item.desc}</p>
                  <p className="text-xs text-muted-foreground/60">{item.detail}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="text-center mt-12">
            <button
              onClick={handleStart}
              className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
            >
              Começar agora
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>

      {/* ── Testimonials ── */}
      <section className="px-6 py-24 md:py-32">
        <div className="max-w-2xl mx-auto text-center">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest mb-3">Profissionais que usam</p>
          <h2 className="text-3xl md:text-4xl font-semibold tracking-tight mb-12">
            Reconhecido por quem entende
          </h2>

          <div className="relative h-[120px] flex items-center justify-center">
            {testimonials.map((t, i) => (
              <motion.div
                key={i}
                initial={false}
                animate={{
                  opacity: activeTestimonial === i ? 1 : 0,
                  y: activeTestimonial === i ? 0 : 8,
                }}
                transition={{ duration: 0.4 }}
                className="absolute max-w-lg mx-auto space-y-4"
                style={{ pointerEvents: activeTestimonial === i ? 'auto' : 'none' }}
              >
                <p className="text-lg text-foreground/80 leading-relaxed">
                  "{t.text}"
                </p>
                <p className="text-xs text-muted-foreground">{t.role}</p>
              </motion.div>
            ))}
          </div>

          <div className="flex justify-center gap-1.5 mt-6">
            {testimonials.map((_, i) => (
              <button
                key={i}
                onClick={() => setActiveTestimonial(i)}
                className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
                  activeTestimonial === i ? 'bg-foreground w-4' : 'bg-border'
                }`}
                aria-label={`Depoimento ${i + 1}`}
              />
            ))}
          </div>
        </div>
      </section>

      {/* ── Checklist ── */}
      <section className="px-6 py-24 md:py-32 bg-secondary/50">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest mb-3">Seu relatório inclui</p>
            <h2 className="text-3xl md:text-4xl font-semibold tracking-tight">
              Diagnóstico completo
            </h2>
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            {[
              'Padrão dominante identificado',
              'Ciclo de autossabotagem mapeado',
              'Gatilhos e armadilhas revelados',
              'Impacto por área da vida',
              'Estratégia de saída personalizada',
              'Relatório exportável em PDF',
              'Perfil central com evolução',
              'Múltiplos módulos (Premium)',
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3 py-2">
                <Check className="w-4 h-4 text-foreground/40 shrink-0" />
                <span className="text-sm text-foreground/70">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="px-6 py-32 md:py-40">
        <div className="max-w-2xl mx-auto text-center space-y-6">
          <h2 className="text-3xl md:text-4xl font-semibold tracking-tight">
            Pronta para ver o que está por trás?
          </h2>
          <p className="text-base text-muted-foreground max-w-md mx-auto">
            A mudança começa quando você enxerga o padrão que estava invisível.
            Sua primeira leitura é gratuita.
          </p>
          <button
            onClick={handleStart}
            className="inline-flex items-center gap-2 px-8 py-3.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
          >
            Iniciar minha leitura gratuita
            <ArrowRight className="w-4 h-4" />
          </button>
          <p className="text-xs text-muted-foreground/50">
            Gratuito · Sem cartão · Resultados imediatos
          </p>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-border/50 px-6 py-6" role="contentinfo">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
          <span className="text-sm font-medium text-foreground/60">Raio-X Comportamental</span>
          <p className="text-xs text-muted-foreground/40">
            Diagnóstico comportamental de precisão
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
