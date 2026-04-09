import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

const TestimonialsSection = () => {
  const [active, setActive] = useState(0);

  const testimonials = [
    {
      text: 'Pela primeira vez entendi por que eu trava sempre no mesmo ponto. Li o resultado e chorei — era exatamente o que eu sentia mas nunca consegui explicar.',
      name: 'Mariana C.',
      role: '32 anos · São Paulo',
    },
    {
      text: 'Fiz achando que seria mais um teste genérico. Quando li "Paralisia por hipercontrole" eu congelei. Era eu. Inteira. Nunca me senti tão vista.',
      name: 'Renata A.',
      role: '28 anos · Belo Horizonte',
    },
    {
      text: 'Mandei pra minha melhor amiga e ela respondeu "como eles sabem disso?". Fizemos juntas e não paramos de conversar sobre o resultado.',
      name: 'Letícia P.',
      role: '35 anos · Curitiba',
    },
    {
      text: 'Já fiz terapia por 3 anos. Em 5 minutos o Raio-X nomeou algo que eu levei meses pra entender em sessão. Impressionante.',
      name: 'Daniela S.',
      role: '41 anos · Rio de Janeiro',
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
            O que elas disseram
          </p>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground mb-12">
            "Nunca me senti tão vista."
          </h2>
        </motion.div>

        <div className="relative h-[160px] flex items-center justify-center">
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
