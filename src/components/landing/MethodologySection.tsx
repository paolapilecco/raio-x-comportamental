import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';

interface MethodologySectionProps {
  onStart: () => void;
}

const MethodologySection = ({ onStart }: MethodologySectionProps) => {
  const steps = [
    {
      step: '01',
      title: 'Leitura Comportamental',
      desc: 'Responda a uma análise estruturada que mapeia como sua mente opera — sem perguntas genéricas, sem horóscopo comportamental.',
      detail: '~5 minutos · 8 eixos neurológicos · Análise profunda',
    },
    {
      step: '02',
      title: 'Raio-X do Padrão',
      desc: 'O sistema cruza 8 eixos simultaneamente e identifica seu padrão dominante, contradições internas, gatilhos e o ciclo completo de autossabotagem.',
      detail: 'IA de precisão clínica · Cruzamento multieixo',
    },
    {
      step: '03',
      title: 'Mapa de Desbloqueio',
      desc: 'Você recebe um relatório com nome, mecanismo e direção de saída do padrão — não um genérico "seja mais positivo", mas a ação exata que move todas as peças.',
      detail: 'Relatório em PDF · Perfil Central com evolução',
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
            Metodologia
          </p>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">
            Processo de leitura em 3 etapas
          </h2>
          <p className="text-sm text-muted-foreground mt-4 max-w-lg mx-auto">
            Um sistema estruturado para revelar o que você não consegue ver sozinha —
            baseado em Níveis Neurológicos e análise de padrões.
          </p>
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
            className="inline-flex items-center gap-2 px-7 py-3.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity"
          >
            Começar minha leitura
            <ArrowRight className="w-4 h-4" />
          </button>
        </motion.div>
      </div>
    </section>
  );
};

export default MethodologySection;
