import { motion } from 'framer-motion';

const PainSection = () => {
  const pains = [
    'Você sabe o que precisa fazer, mas não consegue executar.',
    'Começa com tudo e depois abandona — sem saber o porquê.',
    'Se cobra em excesso, mas não sai do lugar.',
    'Sente que algo te trava, mas não consegue nomear.',
    'Repete os mesmos ciclos nos relacionamentos, nas finanças, na carreira.',
  ];

  return (
    <section className="px-6 py-24 md:py-32 bg-background">
      <div className="max-w-3xl mx-auto">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-center mb-14"
        >
          <p className="text-[11px] font-medium text-accent uppercase tracking-[0.2em] mb-3">
            Você se reconhece?
          </p>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">
            O problema nunca foi falta de esforço.
          </h2>
          <p className="text-sm text-muted-foreground mt-4 max-w-lg mx-auto">
            O que te trava não está na superfície. Está nos padrões que você
            repete sem perceber — e que nenhum conselho genérico resolve.
          </p>
        </motion.div>

        <div className="space-y-3">
          {pains.map((pain, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -16 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08, duration: 0.4 }}
              className="flex items-start gap-4 p-4 rounded-xl border border-border/50 bg-card/50"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-destructive/60 mt-2 shrink-0" />
              <p className="text-sm text-foreground/80 leading-relaxed">{pain}</p>
            </motion.div>
          ))}
        </div>

        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-center text-sm text-muted-foreground mt-10 max-w-md mx-auto"
        >
          Se você marcou 2 ou mais, o Raio-X Mental foi feito pra você.
        </motion.p>
      </div>
    </section>
  );
};

export default PainSection;
