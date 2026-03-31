import { motion } from 'framer-motion';
import { DiagnosticResult, IntensityLevel } from '@/types/diagnostic';

interface ReportProps {
  result: DiagnosticResult;
  onRestart: () => void;
}

const intensityConfig: Record<IntensityLevel, { label: string; class: string; bgClass: string }> = {
  leve: { label: 'Leve', class: 'intensity-low', bgClass: 'bg-intensity-low' },
  moderado: { label: 'Moderado', class: 'intensity-moderate', bgClass: 'bg-intensity-moderate' },
  alto: { label: 'Alto', class: 'intensity-high', bgClass: 'bg-intensity-high' },
};

const fadeUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
};

const Report = ({ result, onRestart }: ReportProps) => {
  const intensityInfo = intensityConfig[result.intensity];

  return (
    <div className="min-h-screen px-4 py-12 md:py-20">
      <div className="max-w-3xl mx-auto space-y-10">
        {/* Header */}
        <motion.div {...fadeUp} transition={{ duration: 0.6 }} className="text-center space-y-4">
          <p className="text-sm tracking-[0.25em] uppercase text-subtle font-medium">
            Seu Diagnóstico Comportamental
          </p>
          <h1 className="text-3xl md:text-4xl leading-tight">
            {result.combinedTitle}
          </h1>
          <div className="flex items-center justify-center gap-2 pt-2">
            <span className="text-sm text-subtle">Intensidade:</span>
            <span className={`text-sm font-semibold ${intensityInfo.class}`}>
              {intensityInfo.label}
            </span>
            <span className={`w-2.5 h-2.5 rounded-full ${intensityInfo.bgClass}`} />
          </div>
        </motion.div>

        {/* Summary */}
        <ReportSection title="Resumo do seu padrão" delay={0.1}>
          <p className="text-foreground/80 leading-relaxed">{result.summary}</p>
        </ReportSection>

        {/* Mechanism */}
        <ReportSection title="Como esse padrão opera" delay={0.2}>
          <p className="text-foreground/80 leading-relaxed">{result.mechanism}</p>
        </ReportSection>

        {/* Contradiction */}
        <ReportSection title="Contradição interna" delay={0.3}>
          <p className="text-foreground/80 leading-relaxed">{result.contradiction}</p>
        </ReportSection>

        {/* Impact */}
        <ReportSection title="Impacto prático na sua vida" delay={0.4}>
          <p className="text-foreground/80 leading-relaxed">{result.impact}</p>
        </ReportSection>

        {/* Secondary Patterns */}
        {result.secondaryPatterns.length > 0 && (
          <ReportSection title="Padrões secundários identificados" delay={0.5}>
            <div className="space-y-4">
              {result.secondaryPatterns.map((pattern) => (
                <div key={pattern.key} className="border border-border rounded-lg p-5">
                  <h4 className="font-sans font-semibold text-foreground mb-2">{pattern.label}</h4>
                  <p className="text-sm text-foreground/70 leading-relaxed">{pattern.description}</p>
                </div>
              ))}
            </div>
          </ReportSection>
        )}

        {/* Intensity Map */}
        <ReportSection title="Mapa de intensidade por eixo" delay={0.6}>
          <div className="space-y-3">
            {result.allScores.slice(0, 6).map((score) => (
              <div key={score.key} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-foreground/80">{score.label}</span>
                  <span className="text-subtle">{score.percentage}%</span>
                </div>
                <div className="h-2 rounded-full bg-border overflow-hidden">
                  <motion.div
                    className="h-full rounded-full bg-primary"
                    initial={{ width: 0 }}
                    animate={{ width: `${score.percentage}%` }}
                    transition={{ duration: 0.8, delay: 0.8, ease: 'easeOut' }}
                  />
                </div>
              </div>
            ))}
          </div>
        </ReportSection>

        {/* Direction */}
        <ReportSection title="Direção inicial de mudança" delay={0.7}>
          <div className="border-l-2 border-primary pl-5">
            <p className="text-foreground/90 leading-relaxed italic">{result.direction}</p>
          </div>
        </ReportSection>

        {/* Ethical Notice */}
        <motion.div
          {...fadeUp}
          transition={{ delay: 0.9, duration: 0.5 }}
          className="text-center pt-6 border-t border-border"
        >
          <p className="text-xs text-subtle leading-relaxed max-w-lg mx-auto">
            Este relatório oferece uma leitura comportamental baseada em suas respostas e não substitui avaliação psicológica ou clínica profissional.
          </p>
        </motion.div>

        {/* Restart */}
        <motion.div
          {...fadeUp}
          transition={{ delay: 1, duration: 0.5 }}
          className="text-center pb-12"
        >
          <button
            onClick={onRestart}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors underline underline-offset-4"
          >
            Refazer diagnóstico
          </button>
        </motion.div>
      </div>
    </div>
  );
};

function ReportSection({
  title,
  delay = 0,
  children,
}: {
  title: string;
  delay?: number;
  children: React.ReactNode;
}) {
  return (
    <motion.div
      {...fadeUp}
      transition={{ delay, duration: 0.5 }}
      className="bg-card rounded-xl border border-border p-6 md:p-8 shadow-sm space-y-4"
    >
      <h3 className="text-xl">{title}</h3>
      {children}
    </motion.div>
  );
}

export default Report;
