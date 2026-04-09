import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';

interface MethodologySectionProps {
  onStart: () => void;
}

const MethodologySection = ({ onStart }: MethodologySectionProps) => {
  const steps = [
    {
      step: '01',
      title: 'Responda com honestidade',
      desc: 'São perguntas sobre como você realmente funciona — não o que você gostaria de ser. Sem certo ou errado. Sem julgamento.',
      detail: '~5 minutos · 100% sigiloso',
    },
    {
      step: '02',
      title: 'Seu padrão é revelado',
      desc: 'O sistema cruza suas respostas em 8 áreas da vida e identifica o padrão invisível que está dirigindo tudo — com nome, mecanismo e gatilhos.',
      detail: 'Resultado imediato · Análise personalizada',
    },
    {
      step: '03',
      title: 'Você sabe por onde começar',
      desc: 'Receba a direção exata: qual área destravar primeiro, o que evitar e o primeiro passo que gera efeito cascata na sua vida.',
      detail: 'Relatório completo · Exportável em PDF',
    },
  ];

  return (
    <section id="como-funciona" className="px-6 py-24 md:py-32 bg-background">
      <div className="max-w-3xl mx-auto">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <p className="text-[11px] font-medium text-accent uppercase tracking-[0.2em] mb-3">
            Como funciona
          </p>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">
            3 passos. 5 minutos. Clareza total.
          </h2>
        </motion.div>

        <div className="space-y-8">
          {steps.map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -12 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.12, duration: 0.5 }}
              className="flex gap-6"
            >
              <div className="flex flex-col items-center">
                <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold shrink-0 shadow-lg shadow-primary/20">
                  {item.step}
                </div>
                {i < 2 && <div className="w-px flex-1 bg-border mt-2" />}
              </div>
              <div className="pb-6">
                <h3 className="text-base font-bold text-foreground mb-1">{item.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed mb-2">{item.desc}</p>
                <p className="text-[11px] text-muted-foreground/50 tracking-wide">{item.detail}</p>
              </div>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-center mt-12"
        >
          <button
            onClick={onStart}
            className="group inline-flex items-center gap-2 px-7 py-3.5 bg-gradient-to-r from-[hsl(41,50%,45%)] via-[hsl(41,55%,55%)] to-[hsl(41,50%,45%)] text-white rounded-xl text-sm font-semibold shadow-[0_0_30px_rgba(198,169,105,0.15)] hover:shadow-[0_0_50px_rgba(198,169,105,0.25)] transition-all duration-500 hover:scale-[1.02]"
          >
            Quero descobrir meu padrão
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
          </button>
        </motion.div>
      </div>
    </section>
  );
};

export default MethodologySection;
