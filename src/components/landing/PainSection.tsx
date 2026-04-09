import { motion } from 'framer-motion';

const PainSection = () => {
  const pains = [
    'Você sabe o que precisa fazer, mas simplesmente não consegue.',
    'Começa motivada e depois abandona — sempre.',
    'Se cobra demais, mas continua no mesmo lugar.',
    'Sente que tem algo te prendendo, mas não sabe o quê.',
    'Repete os mesmos padrões no amor, no trabalho, no dinheiro.',
    'Já tentou terapia, livros, cursos... e ainda se sente travada.',
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
            Isso te parece familiar?
          </p>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">
            O problema nunca foi falta de esforço.
          </h2>
          <p className="text-sm text-muted-foreground mt-4 max-w-lg mx-auto">
            Existe um padrão invisível controlando suas escolhas. Enquanto você 
            não vê ele, vai continuar repetindo — não importa o quanto tente.
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
          className="text-center text-sm text-accent/80 font-medium mt-10 max-w-md mx-auto"
        >
          Se você se identificou com pelo menos 2... o Raio-X vai mudar a forma como você se enxerga.
        </motion.p>
      </div>
    </section>
  );
};

export default PainSection;
