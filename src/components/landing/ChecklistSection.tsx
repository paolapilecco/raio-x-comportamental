import { motion } from 'framer-motion';
import { Check, Lock } from 'lucide-react';

const ChecklistSection = () => {
  const free = [
    'Seu padrão dominante — com nome e explicação',
    'Ciclo de autossabotagem completo',
    'Gatilhos que ativam seus bloqueios',
    'Impacto em cada área da sua vida',
    'Relatório exportável em PDF',
  ];

  const premium = [
    'Módulos: Propósito, Dinheiro, Amor, Autoimagem',
    'Perfil Central — seu mapa completo de padrões',
    'Evolução: compare quem você era com quem está se tornando',
    'Estratégia de saída personalizada',
    'Faça com amigas — até 3 perfis no mesmo plano',
  ];

  return (
    <section className="px-6 py-24 md:py-32 bg-background">
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
            Tudo isso na sua primeira leitura.
          </h2>
          <p className="text-sm text-muted-foreground mt-3">De graça.</p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="p-6 rounded-2xl border border-border/40 bg-card/60"
          >
            <p className="text-[10px] font-semibold text-foreground/40 uppercase tracking-[0.15em] mb-4">
              Seu Raio-X gratuito inclui
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
              Desbloqueio Total — R$ 5,99/mês
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
