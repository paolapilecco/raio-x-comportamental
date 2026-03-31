import { motion } from 'framer-motion';
import { DiagnosticResult, IntensityLevel } from '@/types/diagnostic';
import { AlertTriangle, Brain, Target, Shield, ArrowRight, Zap, Eye, Compass, LifeBuoy, MapPin } from 'lucide-react';

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
      <div className="max-w-3xl mx-auto space-y-8">
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

        {/* Profile Name */}
        <ReportSection title="Seu perfil comportamental" delay={0.05} icon={<Shield className="w-5 h-5 text-primary" />}>
          <div className="text-center py-4">
            <p className="text-2xl md:text-3xl font-serif text-foreground">
              {result.profileName}
            </p>
            <p className="text-sm text-subtle mt-2 italic">Este é o nome que define como seu padrão opera no dia a dia.</p>
          </div>
        </ReportSection>

        {/* Mental State */}
        <ReportSection title="Seu estado mental atual" delay={0.1} icon={<Brain className="w-5 h-5 text-primary" />}>
          <p className="text-foreground/80 leading-relaxed">{result.mentalState}</p>
        </ReportSection>

        {/* Summary */}
        <ReportSection title="Resumo do seu padrão" delay={0.15}>
          <p className="text-foreground/80 leading-relaxed">{result.summary}</p>
        </ReportSection>

        {/* Mechanism */}
        <ReportSection title="Mecanismo principal" delay={0.2} icon={<Zap className="w-5 h-5 text-primary" />}>
          <p className="text-foreground/80 leading-relaxed">{result.mechanism}</p>
        </ReportSection>

        {/* Triggers */}
        <ReportSection title="Gatilhos identificados" delay={0.25} icon={<AlertTriangle className="w-5 h-5 text-primary" />}>
          <div className="space-y-2">
            {result.triggers.map((trigger, i) => (
              <div key={i} className="flex items-start gap-3 py-2">
                <span className="mt-1.5 w-2 h-2 rounded-full bg-primary/60 shrink-0" />
                <p className="text-foreground/80 text-sm leading-relaxed">{trigger}</p>
              </div>
            ))}
          </div>
        </ReportSection>

        {/* Mental Traps */}
        <ReportSection title="Armadilhas mentais" delay={0.3} icon={<Eye className="w-5 h-5 text-primary" />}>
          <p className="text-xs text-subtle mb-4">Frases que seu padrão usa para se manter ativo:</p>
          <div className="space-y-3">
            {result.mentalTraps.map((trap, i) => (
              <div key={i} className="bg-muted/30 border border-border rounded-lg px-5 py-3">
                <p className="text-foreground/90 text-sm italic leading-relaxed">{trap}</p>
              </div>
            ))}
          </div>
        </ReportSection>

        {/* Self-sabotage Cycle */}
        <ReportSection title="Ciclo de autossabotagem" delay={0.35} icon={<Target className="w-5 h-5 text-primary" />}>
          <p className="text-xs text-subtle mb-4">Veja como o ciclo se repete no seu funcionamento:</p>
          <div className="space-y-0">
            {result.selfSabotageCycle.map((step, i) => (
              <div key={i} className="flex items-stretch gap-4">
                <div className="flex flex-col items-center">
                  <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center text-xs font-semibold text-primary shrink-0">
                    {i + 1}
                  </div>
                  {i < result.selfSabotageCycle.length - 1 && (
                    <div className="w-px flex-1 bg-border my-1" />
                  )}
                </div>
                <div className="pb-5">
                  <p className="text-foreground/80 text-sm leading-relaxed pt-1.5">{step}</p>
                </div>
              </div>
            ))}
            <div className="flex items-center gap-3 mt-2 pt-3 border-t border-dashed border-border">
              <ArrowRight className="w-4 h-4 text-primary/60" />
              <p className="text-xs text-subtle italic">O ciclo se reinicia — cada repetição reforça o padrão.</p>
            </div>
          </div>
        </ReportSection>

        {/* Blocking Point */}
        <ReportSection title="Ponto exato de travamento" delay={0.4} icon={<MapPin className="w-5 h-5 text-primary" />}>
          <div className="border-l-2 border-primary pl-5">
            <p className="text-foreground/90 leading-relaxed">{result.blockingPoint}</p>
          </div>
        </ReportSection>

        {/* Contradiction */}
        <ReportSection title="Contradição interna" delay={0.45}>
          <p className="text-foreground/80 leading-relaxed">{result.contradiction}</p>
        </ReportSection>

        {/* Life Pillar Impact */}
        <ReportSection title="Impacto nos pilares da sua vida" delay={0.5}>
          <div className="space-y-4">
            {result.lifeImpact.map((item, i) => (
              <div key={i} className="border border-border rounded-lg p-5">
                <h4 className="font-sans font-semibold text-foreground mb-1.5 text-sm tracking-wide uppercase">{item.pillar}</h4>
                <p className="text-sm text-foreground/70 leading-relaxed">{item.impact}</p>
              </div>
            ))}
          </div>
        </ReportSection>

        {/* Secondary Patterns */}
        {result.secondaryPatterns.length > 0 && (
          <ReportSection title="Padrões secundários identificados" delay={0.55}>
            <div className="space-y-4">
              {result.secondaryPatterns.map((pattern) => (
                <div key={pattern.key} className="border border-border rounded-lg p-5">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-sans font-semibold text-foreground">{pattern.label}</h4>
                    <span className="text-xs text-subtle italic">{pattern.profileName}</span>
                  </div>
                  <p className="text-sm text-foreground/70 leading-relaxed">{pattern.description}</p>
                </div>
              ))}
            </div>
          </ReportSection>
        )}

        {/* Intensity Map */}
        <ReportSection title="Mapa de intensidade por eixo" delay={0.6}>
          <div className="space-y-3">
            {result.allScores.slice(0, 8).map((score) => (
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
        <ReportSection title="Direção inicial de mudança" delay={0.65} icon={<Compass className="w-5 h-5 text-primary" />}>
          <div className="border-l-2 border-primary pl-5">
            <p className="text-foreground/90 leading-relaxed italic">{result.direction}</p>
          </div>
        </ReportSection>

        {/* Exit Strategy */}
        <ReportSection title="Estrutura prática de saída do ciclo" delay={0.7} icon={<LifeBuoy className="w-5 h-5 text-primary" />}>
          <p className="text-xs text-subtle mb-5">Siga esses passos na ordem — cada um prepara o terreno para o próximo:</p>
          <div className="space-y-5">
            {result.exitStrategy.map((step) => (
              <div key={step.step} className="flex gap-4">
                <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-sm font-bold text-primary shrink-0">
                  {step.step}
                </div>
                <div className="space-y-1">
                  <h4 className="font-sans font-semibold text-foreground text-sm">{step.title}</h4>
                  <p className="text-sm text-foreground/70 leading-relaxed">{step.action}</p>
                </div>
              </div>
            ))}
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
  icon,
  children,
}: {
  title: string;
  delay?: number;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <motion.div
      {...fadeUp}
      transition={{ delay, duration: 0.5 }}
      className="bg-card rounded-xl border border-border p-6 md:p-8 shadow-sm space-y-4"
    >
      <div className="flex items-center gap-3">
        {icon}
        <h3 className="text-xl">{title}</h3>
      </div>
      {children}
    </motion.div>
  );
}

export default Report;
