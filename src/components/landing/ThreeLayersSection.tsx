import { motion } from 'framer-motion';
import { Brain, Target, Compass } from 'lucide-react';

const ThreeLayersSection = () => {
  const layers = [
    {
      icon: Brain,
      number: '01',
      title: 'Leitura Neural',
      subtitle: 'Como sua mente está operando agora',
      text: 'Mapeamos o estado mental real — não quem você deveria ser, mas como seu cérebro está funcionando neste momento. Sem achismo. Sem generalização.',
    },
    {
      icon: Target,
      number: '02',
      title: 'Padrão Dominante',
      subtitle: 'O mecanismo invisível que dirige seus bloqueios',
      text: 'Identificamos o ciclo exato de autossabotagem: o gatilho que ativa, a armadilha mental que prende, e a repetição que perpetua. Tudo com nome e sobrenome.',
    },
    {
      icon: Compass,
      number: '03',
      title: 'Direção de Desbloqueio',
      subtitle: 'A primeira ação que gera efeito cascata',
      text: 'Não é uma lista de conselhos. É a indicação precisa de qual área destravar primeiro para que todas as outras comecem a se mover.',
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
            O que você descobre
          </p>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">
            Três camadas de decodificação
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
