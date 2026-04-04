import { ArrowRight } from 'lucide-react';

interface LandingHeroProps {
  onStart: () => void;
}

const LandingHero = ({ onStart }: LandingHeroProps) => {
  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-20">
      <div className="max-w-xl w-full text-center space-y-10">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest">
          Leitura Comportamental
        </p>

        <h1 className="text-4xl md:text-5xl font-semibold tracking-tight leading-[1.1]">
          Leitura Comportamental
        </h1>

        <p className="text-base text-muted-foreground leading-relaxed max-w-md mx-auto">
          Uma análise estruturada que identifica os padrões invisíveis que estão
          dirigindo suas decisões, travas e repetições.
        </p>

        <button
          onClick={onStart}
          className="inline-flex items-center gap-2 px-7 py-3.5 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:opacity-90 transition-opacity"
        >
          Iniciar leitura
          <ArrowRight className="w-4 h-4" />
        </button>

        <p className="text-xs text-muted-foreground/50">
          Múltiplos módulos · Perfil Central · Evolução contínua
        </p>
      </div>
    </div>
  );
};

export default LandingHero;
