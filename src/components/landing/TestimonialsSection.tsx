import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

const TestimonialsSection = () => {
  const [active, setActive] = useState(0);

  const testimonials = [
    {
      text: 'Pela primeira vez entendi o que estava me travando. Não era falta de esforço — era um padrão que eu repetia sem perceber há 15 anos.',
      name: 'M.C.',
      role: 'Psicóloga Clínica · CRP 06/xxxxx',
    },
    {
      text: 'Usei com meus pacientes e o nível de precisão me surpreendeu. Em 5 minutos tive mais clareza do que em 3 sessões de anamnese.',
      name: 'R.A.',
      role: 'Terapeuta Holístico · 12 anos de prática',
    },
    {
      text: 'É como ter um mapa do que eu não conseguia ver sozinha. O relatório foi tão preciso que minha terapeuta pediu para usar também.',
      name: 'L.P.',
      role: 'Coach Executiva · ICF ACC',
    },
    {
      text: 'Finalmente uma ferramenta que não simplifica o ser humano. A análise multieixo é o que faltava no mercado.',
      name: 'D.S.',
      role: 'Psicanalista · SBPSP',
    },
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setActive(prev => (prev + 1) % testimonials.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [testimonials.length]);

  return (
    <section className="px-6 py-24 md:py-32 bg-background">
      <div className="max-w-2xl mx-auto text-center">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
        >
          <p className="text-[11px] font-medium text-accent uppercase tracking-[0.2em] mb-3">
            Validado por quem entende
          </p>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground mb-12">
            A precisão que profissionais reconhecem
          </h2>
        </motion.div>

        <div className="relative h-[140px] flex items-center justify-center">
          {testimonials.map((t, i) => (
            <motion.div
              key={i}
              initial={false}
              animate={{
                opacity: active === i ? 1 : 0,
                y: active === i ? 0 : 10,
              }}
              transition={{ duration: 0.5 }}
              className="absolute max-w-lg mx-auto space-y-4"
              style={{ pointerEvents: active === i ? 'auto' : 'none' }}
            >
              <p className="text-base md:text-lg text-foreground/80 leading-relaxed italic">
                "{t.text}"
              </p>
              <div>
                <p className="text-xs font-semibold text-foreground/60">{t.name}</p>
                <p className="text-[11px] text-muted-foreground/50">{t.role}</p>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="flex justify-center gap-1.5 mt-6">
          {testimonials.map((_, i) => (
            <button
              key={i}
              onClick={() => setActive(i)}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                active === i ? 'bg-accent w-5' : 'bg-border w-1.5'
              }`}
              aria-label={`Depoimento ${i + 1}`}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export default TestimonialsSection;
