import { motion } from 'framer-motion';

const SocialProofBar = () => {
  const stats = [
    { value: '2.847', label: 'Padrões já mapeados' },
    { value: '8', label: 'Eixos neurológicos' },
    { value: '97%', label: 'Taxa de precisão' },
    { value: '< 5min', label: 'Para resultado completo' },
  ];

  return (
    <section className="px-6 py-14 border-y border-border/30 bg-background">
      <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12">
        {stats.map((stat, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.1, duration: 0.5 }}
            className="text-center"
          >
            <p className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">{stat.value}</p>
            <p className="text-[11px] text-muted-foreground mt-1 tracking-wide">{stat.label}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
};

export default SocialProofBar;
