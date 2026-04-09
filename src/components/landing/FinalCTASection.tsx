import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';

interface FinalCTASectionProps {
  onStart: () => void;
}

const FinalCTASection = ({ onStart }: FinalCTASectionProps) => {
  return (
    <section className="px-6 py-32 md:py-40 bg-background">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="max-w-2xl mx-auto text-center space-y-7"
      >
        <p className="text-[11px] font-medium text-accent uppercase tracking-[0.2em]">
          Sua primeira leitura
        </p>

        <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight text-foreground leading-[1.1]">
          O padrão vai continuar se repetindo.{' '}
          <span className="text-muted-foreground">A não ser que você veja ele.</span>
        </h2>

        <p className="text-base text-muted-foreground max-w-md mx-auto leading-relaxed">
          5 minutos para decodificar o que anos de tentativa não resolveram.
          Sua primeira leitura é gratuita e imediata.
        </p>

        <button
          onClick={onStart}
          className="group inline-flex items-center gap-2.5 px-8 py-4 bg-gradient-to-r from-[hsl(41,50%,45%)] via-[hsl(41,55%,55%)] to-[hsl(41,50%,45%)] text-white rounded-xl text-sm font-semibold shadow-[0_0_40px_rgba(198,169,105,0.15)] hover:shadow-[0_0_60px_rgba(198,169,105,0.3)] transition-all duration-500 hover:scale-[1.02] active:scale-[0.98]"
        >
          Iniciar meu Raio-X gratuito
          <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
        </button>

        <p className="text-[11px] text-muted-foreground/40 tracking-wide">
          Gratuito · Sem cartão · Resultado em 5 minutos
        </p>
      </motion.div>
    </section>
  );
};

export default FinalCTASection;
