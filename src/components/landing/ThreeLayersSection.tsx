import { motion } from 'framer-motion';
import { Eye, Fingerprint, Compass } from 'lucide-react';

const ThreeLayersSection = () => {
  const layers = [
    {
      icon: Eye,
      number: '01',
      title: 'Sua mente agora',
      subtitle: 'Como você está funcionando de verdade',
      text: 'Não é quem você gostaria de ser. É como sua mente está operando hoje — os filtros, as travas, os atalhos mentais que você nem percebe.',
    },
    {
      icon: Fingerprint,
      number: '02',
      title: 'Seu padrão oculto',
      subtitle: 'O ciclo que você repete sem saber',
      text: 'Aquele comportamento que sempre volta. O gatilho que ativa. A armadilha que prende. O ciclo completo — finalmente visível, com nome e explicação.',
    },
    {
      icon: Compass,
      number: '03',
      title: 'Sua saída',
      subtitle: 'A primeira ação que muda tudo',
      text: 'Não é uma lista de conselhos. É a indicação exata de onde começar — o primeiro movimento que desbloqueia todo o resto.',
    },
  ];

  return (
    <section className="px-6 py-24 md:py-32 bg-secondary/30">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <p className="text-[11px] font-medium text-accent uppercase tracking-[0.2em] mb-3">
            O que você vai descobrir
          </p>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">
            Três revelações em 5 minutos.
          </h2>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8">
          {layers.map((layer, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.15, duration: 0.5 }}
              className="space-y-4 p-6 rounded-2xl border border-border/40 bg-card/60 hover:border-accent/30 transition-colors duration-300"
            >
              <div className="flex items-center justify-between">
                <layer.icon className="w-5 h-5 text-accent/70" />
                <span className="text-[10px] font-medium text-muted-foreground/40">{layer.number}</span>
              </div>
              <div>
                <p className="text-[10px] font-semibold text-accent uppercase tracking-[0.15em] mb-1">{layer.title}</p>
                <h3 className="text-base font-semibold tracking-tight text-foreground leading-snug">{layer.subtitle}</h3>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">{layer.text}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ThreeLayersSection;
