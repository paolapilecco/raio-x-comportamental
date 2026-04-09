import { motion } from 'framer-motion';
import { User, Briefcase } from 'lucide-react';

const DualPersonaSection = () => {
  const personas = [
    {
      icon: User,
      label: 'Para você',
      title: 'Autoconhecimento de verdade',
      points: [
        'Descubra por que você trava sempre no mesmo ponto',
        'Entenda os gatilhos que ativam sua autossabotagem',
        'Receba a direção exata de onde começar a mudar',
        'Acompanhe sua evolução com retestes periódicos',
      ],
      cta: 'Pessoas que querem sair do piloto automático e entender o que realmente as impede de avançar.',
    },
    {
      icon: Briefcase,
      label: 'Para profissionais',
      title: 'Ferramenta clínica de precisão',
      points: [
        'Mapeie padrões dos seus pacientes em 5 minutos',
        'Relatórios prontos para sessão terapêutica',
        'Comparação evolutiva entre sessões',
        'Convide pacientes por link — sem cadastro necessário',
      ],
      cta: 'Psicólogos, terapeutas, coaches e profissionais de saúde mental que querem elevar o nível das suas sessões.',
    },
  ];

  return (
    <section className="px-6 py-24 md:py-32 bg-secondary/30">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-center mb-14"
        >
          <p className="text-[11px] font-medium text-accent uppercase tracking-[0.2em] mb-3">
            Para quem é
          </p>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">
            Duas personas. Uma ferramenta.
          </h2>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-6">
          {personas.map((persona, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.15, duration: 0.5 }}
              className="p-7 rounded-2xl border border-border/40 bg-card/60 space-y-5"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-accent/10 flex items-center justify-center">
                  <persona.icon className="w-4 h-4 text-accent" />
                </div>
                <span className="text-[10px] font-semibold text-accent uppercase tracking-[0.15em]">{persona.label}</span>
              </div>

              <h3 className="text-xl font-bold tracking-tight text-foreground">{persona.title}</h3>

              <ul className="space-y-2.5">
                {persona.points.map((point, j) => (
                  <li key={j} className="flex items-start gap-3">
                    <span className="w-1 h-1 rounded-full bg-accent/50 mt-2 shrink-0" />
                    <span className="text-sm text-muted-foreground leading-relaxed">{point}</span>
                  </li>
                ))}
              </ul>

              <p className="text-xs text-muted-foreground/60 leading-relaxed pt-2 border-t border-border/30">
                {persona.cta}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default DualPersonaSection;
