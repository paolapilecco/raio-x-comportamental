import { motion } from 'framer-motion';
import { Check, Lock } from 'lucide-react';

const ChecklistSection = () => {
  const free = [
    'Padrão dominante identificado',
    'Ciclo de autossabotagem mapeado',
    'Gatilhos e armadilhas revelados',
    'Impacto por área da vida',
    'Relatório exportável em PDF',
  ];

  const premium = [
    'Perfil Central com evolução contínua',
    'Módulos avançados (Propósito, Dinheiro, Relacionamentos)',
    'Comparação evolutiva entre leituras',
    'Estratégia de saída personalizada por IA',
    'Gestão de pacientes para profissionais',
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
            O que você recebe
          </p>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">
            Diagnóstico completo. Sem meias-palavras.
          </h2>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="p-6 rounded-2xl border border-border/40 bg-card/60"
          >
            <p className="text-[10px] font-semibold text-foreground/40 uppercase tracking-[0.15em] mb-4">
              Gratuito
            </p>
            <div className="space-y-3">
              {free.map((item, i) => (
                <div key={i} className="flex items-center gap-3">
                  <Check className="w-3.5 h-3.5 text-accent/60 shrink-0" />
                  <span className="text-sm text-foreground/70">{item}</span>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="p-6 rounded-2xl border border-accent/20 bg-accent/5"
          >
            <p className="text-[10px] font-semibold text-accent uppercase tracking-[0.15em] mb-4">
              Premium
            </p>
            <div className="space-y-3">
              {premium.map((item, i) => (
                <div key={i} className="flex items-center gap-3">
                  <Lock className="w-3.5 h-3.5 text-accent/50 shrink-0" />
                  <span className="text-sm text-foreground/70">{item}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default ChecklistSection;
