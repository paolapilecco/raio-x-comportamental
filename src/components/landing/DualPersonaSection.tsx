import { motion } from 'framer-motion';

const DualPersonaSection = () => {
  const transformations = [
    {
      before: '"Eu sempre estrago tudo quando as coisas começam a dar certo."',
      after: 'Padrão identificado: Autossabotagem por medo de visibilidade. Gatilho: sucesso iminente.',
    },
    {
      before: '"Eu sei o que preciso fazer, mas fico paralisada."',
      after: 'Padrão identificado: Paralisia por hipercontrole. Gatilho: medo de errar.',
    },
    {
      before: '"Sempre atraio o mesmo tipo de pessoa nos relacionamentos."',
      after: 'Padrão identificado: Repetição compensatória. Gatilho: necessidade de validação.',
    },
  ];

  return (
    <section className="px-6 py-24 md:py-32 bg-secondary/30">
      <div className="max-w-3xl mx-auto">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-center mb-14"
        >
          <p className="text-[11px] font-medium text-accent uppercase tracking-[0.2em] mb-3">
            Exemplos reais
          </p>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">
            De "não sei o que tenho" para clareza total.
          </h2>
          <p className="text-sm text-muted-foreground mt-4 max-w-lg mx-auto">
            Veja como o Raio-X transforma sensações vagas em diagnósticos precisos.
          </p>
        </motion.div>

        <div className="space-y-5">
          {transformations.map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.12, duration: 0.5 }}
              className="p-6 rounded-2xl border border-border/40 bg-card/60 space-y-4"
            >
              <div className="flex items-start gap-3">
                <span className="text-[10px] font-bold text-destructive/60 uppercase tracking-wider mt-0.5 shrink-0">Antes</span>
                <p className="text-sm text-foreground/60 italic leading-relaxed">{item.before}</p>
              </div>
              <div className="w-full h-px bg-border/30" />
              <div className="flex items-start gap-3">
                <span className="text-[10px] font-bold text-accent uppercase tracking-wider mt-0.5 shrink-0">Depois</span>
                <p className="text-sm text-foreground font-medium leading-relaxed">{item.after}</p>
              </div>
            </motion.div>
          ))}
        </div>

        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-center text-xs text-muted-foreground/50 mt-8"
        >
          Cada pessoa recebe um diagnóstico único — baseado nas suas respostas reais.
        </motion.p>
      </div>
    </section>
  );
};

export default DualPersonaSection;
