import { motion } from 'framer-motion';
import professionalImg from '@/assets/professional-scan.jpg';
import neuralImg from '@/assets/neural-pattern.jpg';

const ImageShowcaseSection = () => {
  return (
    <section className="px-6 py-24 md:py-32 bg-background overflow-hidden">
      <div className="max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-center mb-14"
        >
          <p className="text-[11px] font-medium text-accent uppercase tracking-[0.2em] mb-3">
            Profundidade e precisão
          </p>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">
            O que a observação comum não alcança.
          </h2>
          <p className="text-sm text-muted-foreground mt-4 max-w-lg mx-auto">
            Uma metodologia estruturada que cruza 8 eixos simultaneamente 
            para revelar o que está por trás das suas decisões.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-6">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="relative rounded-2xl overflow-hidden aspect-[4/3] group"
          >
            <img
              src={professionalImg}
              alt="Ambiente de trabalho de um profissional de saúde mental"
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              loading="lazy"
              width={1024}
              height={1024}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-6">
              <p className="text-[10px] font-semibold text-accent uppercase tracking-[0.15em] mb-1">
                Profundidade clínica
              </p>
              <p className="text-sm text-white/80 leading-relaxed">
                Construído com a mesma lógica que profissionais usam em sessão — 
                mas acessível em 5 minutos.
              </p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="relative rounded-2xl overflow-hidden aspect-[4/3] group"
          >
            <img
              src={neuralImg}
              alt="Relatório comportamental detalhado"
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              loading="lazy"
              width={1024}
              height={1024}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-6">
              <p className="text-[10px] font-semibold text-accent uppercase tracking-[0.15em] mb-1">
                Relatório completo
              </p>
              <p className="text-sm text-white/80 leading-relaxed">
                Padrão dominante, gatilhos, contradições e direção de saída — 
                tudo documentado com clareza cirúrgica.
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default ImageShowcaseSection;
