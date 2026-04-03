import { motion } from 'framer-motion';
import { DiagnosticResult, IntensityLevel } from '@/types/diagnostic';
import { AlertTriangle, Brain, Target, Shield, ArrowRight, Zap, Eye, Compass, LifeBuoy, MapPin, Download, XCircle, Crosshair, Flame, Key, UserCheck } from 'lucide-react';
import { generateDiagnosticPdf } from '@/lib/generatePdf';
import { useAuth } from '@/contexts/AuthContext';

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
  const { profile } = useAuth();

  const handleDownloadPdf = () => {
    generateDiagnosticPdf(result, profile?.name);
  };

  return (
    <div className="min-h-screen px-4 py-12 md:py-20">
      <div className="max-w-3xl mx-auto space-y-8">
        {/* Header */}
        <motion.div {...fadeUp} transition={{ duration: 0.6 }} className="text-center space-y-5">
          <p className="text-[10px] tracking-[0.35em] uppercase text-primary/60 font-semibold">
            Seu Diagnóstico Comportamental
          </p>
          <h1 className="text-3xl md:text-[2.8rem] leading-[1.05] tracking-[-0.03em]">
            {result.combinedTitle}
          </h1>
          <div className="flex items-center justify-center gap-2.5 pt-2">
            <span className="text-[0.8rem] text-muted-foreground/50">Intensidade:</span>
            <span className={`text-[0.8rem] font-semibold ${intensityInfo.class}`}>
              {intensityInfo.label}
            </span>
            <span className={`w-2 h-2 rounded-full ${intensityInfo.bgClass}`} />
          </div>
        </motion.div>

        {/* Profile Name */}
        <ReportSection title="Seu perfil comportamental" delay={0.05} icon={<Shield className="w-5 h-5 text-primary/60" />}>
          <div className="text-center py-4">
            <p className="text-2xl md:text-3xl text-foreground/90">
              {result.profileName}
            </p>
            <p className="text-[0.82rem] text-muted-foreground/50 mt-2 italic">Este é o nome que define como seu padrão opera no dia a dia.</p>
          </div>
        </ReportSection>

        {/* Critical Diagnosis */}
        <ReportSection title="Diagnóstico crítico" delay={0.08} icon={<Crosshair className="w-5 h-5 text-primary/60" />}>
          <div className="border-l-2 border-destructive/30 pl-5">
            <p className="text-foreground/80 leading-[1.75] font-medium text-[0.9rem]">{result.criticalDiagnosis}</p>
          </div>
        </ReportSection>

        {/* Core Pain — Enhanced */}
        <ReportSection title="Dor Central" delay={0.1} icon={<Flame className="w-5 h-5 text-destructive/60" />}>
          <div className="space-y-5">
            {/* Main problem */}
            <div className="border-l-2 border-destructive/30 pl-5">
              <p className="text-[0.7rem] tracking-[0.2em] uppercase text-destructive/50 font-semibold mb-1.5">O problema principal</p>
              <p className="text-foreground/80 leading-[1.75] text-[0.9rem] font-medium">{result.corePain}</p>
            </div>

            {/* Blocking pattern */}
            <div className="border-l-2 border-primary/30 pl-5">
              <p className="text-[0.7rem] tracking-[0.2em] uppercase text-primary/50 font-semibold mb-1.5">Padrão que causa o travamento</p>
              <p className="text-foreground/70 leading-[1.75] text-[0.9rem]">
                {result.dominantPattern.label}: {result.blockingPoint}
              </p>
            </div>

            {/* Sustaining behavior */}
            <div className="border-l-2 border-muted-foreground/20 pl-5">
              <p className="text-[0.7rem] tracking-[0.2em] uppercase text-muted-foreground/50 font-semibold mb-1.5">Comportamento que sustenta o ciclo</p>
              <p className="text-foreground/70 leading-[1.75] text-[0.9rem]">
                {result.selfSabotageCycle.length > 0
                  ? result.selfSabotageCycle[result.selfSabotageCycle.length - 1]
                  : result.mechanism}
              </p>
            </div>

            {/* Self-deception alert if present */}
            {result.interpretation && result.interpretation.selfDeceptionIndex >= 40 && (
              <div className="bg-destructive/[0.05] border border-destructive/15 rounded-xl p-4 mt-2">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-4 h-4 text-destructive/60" />
                  <p className="text-[0.75rem] font-semibold text-destructive/70">
                    Índice de autoengano: {result.interpretation.selfDeceptionIndex}%
                  </p>
                </div>
                <p className="text-[0.82rem] text-foreground/60 leading-[1.7]">
                  Existe uma divergência de {result.interpretation.behaviorVsPerceptionGap}% entre como você se percebe e como realmente se comporta. Isso indica pontos cegos que impedem mudanças reais.
                </p>
              </div>
            )}
          </div>
        </ReportSection>

        {/* Key Unlock Area */}
        <ReportSection title="Área-chave de destravamento" delay={0.12} icon={<Key className="w-5 h-5 text-primary/60" />}>
          <div className="bg-primary/[0.04] border border-primary/12 rounded-xl p-5">
            <p className="text-foreground/80 leading-[1.75] text-[0.9rem]">{result.keyUnlockArea}</p>
          </div>
        </ReportSection>

        {/* Mental State */}
        <ReportSection title="Seu estado mental atual" delay={0.15} icon={<Brain className="w-5 h-5 text-primary/60" />}>
          <p className="text-foreground/70 leading-[1.75] text-[0.9rem]">{result.mentalState}</p>
        </ReportSection>

        {/* Summary */}
        <ReportSection title="Resumo do seu padrão" delay={0.18}>
          <p className="text-foreground/70 leading-[1.75] text-[0.9rem]">{result.summary}</p>
        </ReportSection>

        {/* Mechanism */}
        <ReportSection title="Mecanismo principal" delay={0.2} icon={<Zap className="w-5 h-5 text-primary/60" />}>
          <p className="text-foreground/70 leading-[1.75] text-[0.9rem]">{result.mechanism}</p>
        </ReportSection>

        {/* Triggers */}
        <ReportSection title="Gatilhos identificados" delay={0.25} icon={<AlertTriangle className="w-5 h-5 text-primary/60" />}>
          <div className="space-y-2">
            {result.triggers.map((trigger, i) => (
              <div key={i} className="flex items-start gap-3 py-2">
                <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-primary/50 shrink-0" />
                <p className="text-foreground/70 text-[0.85rem] leading-[1.7]">{trigger}</p>
              </div>
            ))}
          </div>
        </ReportSection>

        {/* Mental Traps */}
        <ReportSection title="Armadilhas mentais" delay={0.3} icon={<Eye className="w-5 h-5 text-primary/60" />}>
          <p className="text-[0.75rem] text-muted-foreground/45 mb-4">Frases que seu padrão usa para se manter ativo:</p>
          <div className="space-y-2.5">
            {result.mentalTraps.map((trap, i) => (
              <div key={i} className="bg-muted/20 border border-border/40 rounded-xl px-5 py-3">
                <p className="text-foreground/75 text-[0.85rem] italic leading-[1.7]">{trap}</p>
              </div>
            ))}
          </div>
        </ReportSection>

        {/* Self-sabotage Cycle */}
        <ReportSection title="Ciclo de autossabotagem" delay={0.35} icon={<Target className="w-5 h-5 text-primary/60" />}>
          <p className="text-[0.75rem] text-muted-foreground/45 mb-4">Veja como o ciclo se repete no seu funcionamento:</p>
          <div className="space-y-0">
            {result.selfSabotageCycle.map((step, i) => (
              <div key={i} className="flex items-stretch gap-4">
                <div className="flex flex-col items-center">
                  <div className="w-8 h-8 rounded-xl bg-primary/[0.06] border border-primary/15 flex items-center justify-center text-[0.7rem] font-semibold text-primary/70 shrink-0">
                    {i + 1}
                  </div>
                  {i < result.selfSabotageCycle.length - 1 && (
                    <div className="w-px flex-1 bg-border/40 my-1" />
                  )}
                </div>
                <div className="pb-5">
                  <p className="text-foreground/70 text-[0.85rem] leading-[1.7] pt-1.5">{step}</p>
                </div>
              </div>
            ))}
            <div className="flex items-center gap-3 mt-2 pt-3 border-t border-dashed border-border/40">
              <ArrowRight className="w-3.5 h-3.5 text-primary/40" />
              <p className="text-[0.75rem] text-muted-foreground/40 italic">O ciclo se reinicia — cada repetição reforça o padrão.</p>
            </div>
          </div>
        </ReportSection>

        {/* Blocking Point */}
        <ReportSection title="Ponto exato de travamento" delay={0.4} icon={<MapPin className="w-5 h-5 text-primary/60" />}>
          <div className="border-l-2 border-primary/30 pl-5">
            <p className="text-foreground/80 leading-[1.75] text-[0.9rem]">{result.blockingPoint}</p>
          </div>
        </ReportSection>

        {/* Contradiction */}
        <ReportSection title="Contradição interna" delay={0.45}>
          <p className="text-foreground/70 leading-[1.75] text-[0.9rem]">{result.contradiction}</p>
        </ReportSection>

        {/* Life Pillar Impact */}
        <ReportSection title="Impacto nos pilares da sua vida" delay={0.5}>
          <div className="space-y-4">
            {result.lifeImpact.map((item, i) => (
              <div key={i} className="border border-border/50 rounded-xl p-5">
                <h4 className="font-sans font-semibold text-foreground/60 mb-1.5 text-[0.7rem] tracking-[0.2em] uppercase">{item.pillar}</h4>
                <p className="text-[0.85rem] text-foreground/65 leading-[1.7]">{item.impact}</p>
              </div>
            ))}
          </div>
        </ReportSection>

        {/* Secondary Patterns */}
        {result.secondaryPatterns.length > 0 && (
          <ReportSection title="Padrões secundários identificados" delay={0.55}>
            <div className="space-y-4">
              {result.secondaryPatterns.map((pattern) => (
                <div key={pattern.key} className="border border-border/50 rounded-xl p-5">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-sans font-semibold text-foreground/80 text-[0.9rem]">{pattern.label}</h4>
                    <span className="text-[0.75rem] text-muted-foreground/40 italic">{pattern.profileName}</span>
                  </div>
                  <p className="text-[0.85rem] text-foreground/65 leading-[1.7]">{pattern.description}</p>
                </div>
              ))}
            </div>
          </ReportSection>
        )}

        {/* Intensity Map */}
        <ReportSection title="Mapa de intensidade por eixo" delay={0.6}>
          <div className="space-y-3">
            {result.allScores.slice(0, 8).map((score) => (
              <div key={score.key} className="space-y-1.5">
                <div className="flex justify-between text-[0.82rem]">
                  <span className="text-foreground/70">{score.label}</span>
                  <span className="text-muted-foreground/45">{score.percentage}%</span>
                </div>
                <div className="h-[3px] rounded-full bg-border/40 overflow-hidden">
                  <motion.div
                    className="h-full rounded-full bg-primary/70"
                    initial={{ width: 0 }}
                    animate={{ width: `${score.percentage}%` }}
                    transition={{ duration: 0.8, delay: 0.8, ease: 'easeOut' }}
                  />
                </div>
              </div>
            ))}
          </div>
        </ReportSection>

        {/* What NOT to do */}
        <ReportSection title="O que NÃO fazer" delay={0.62} icon={<XCircle className="w-5 h-5 text-destructive/60" />}>
          <p className="text-[0.75rem] text-muted-foreground/45 mb-4">Comportamentos que parecem produtivos mas reforçam o padrão:</p>
          <div className="space-y-2">
            {result.whatNotToDo.map((item, i) => (
              <div key={i} className="flex items-start gap-3 py-2 bg-destructive/[0.04] border border-destructive/10 rounded-xl px-4">
                <span className="mt-0.5 text-destructive/60 font-bold text-[0.82rem] shrink-0">✗</span>
                <p className="text-foreground/70 text-[0.85rem] leading-[1.7]">{item}</p>
              </div>
            ))}
          </div>
        </ReportSection>

        {/* Direction */}
        <ReportSection title="Direção inicial de mudança" delay={0.67} icon={<Compass className="w-5 h-5 text-primary/60" />}>
          <div className="border-l-2 border-primary/30 pl-5">
            <p className="text-foreground/80 leading-[1.75] italic text-[0.9rem]">{result.direction}</p>
          </div>
        </ReportSection>

        {/* Exit Strategy */}
        <ReportSection title="Estrutura prática de saída do ciclo" delay={0.7} icon={<LifeBuoy className="w-5 h-5 text-primary/60" />}>
          <p className="text-[0.75rem] text-muted-foreground/45 mb-5">Siga esses passos na ordem — cada um prepara o terreno para o próximo:</p>
          <div className="space-y-5">
            {result.exitStrategy.map((step) => (
              <div key={step.step} className="flex gap-4">
                <div className="w-10 h-10 rounded-xl bg-primary/[0.06] border border-primary/12 flex items-center justify-center text-[0.8rem] font-bold text-primary/60 shrink-0">
                  {step.step}
                </div>
                <div className="space-y-1">
                  <h4 className="font-sans font-semibold text-foreground/80 text-[0.85rem]">{step.title}</h4>
                  <p className="text-[0.85rem] text-foreground/60 leading-[1.7]">{step.action}</p>
                </div>
              </div>
            ))}
          </div>
        </ReportSection>

        {/* Ethical Notice */}
        <motion.div
          {...fadeUp}
          transition={{ delay: 0.9, duration: 0.5 }}
          className="text-center pt-6 border-t border-border/30"
        >
          <p className="text-[0.75rem] text-muted-foreground/40 leading-[1.7] max-w-lg mx-auto">
            Este relatório oferece uma leitura comportamental baseada em suas respostas e não substitui avaliação psicológica ou clínica profissional.
          </p>
        </motion.div>

        {/* Actions */}
        <motion.div
          {...fadeUp}
          transition={{ delay: 1, duration: 0.5 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4 pb-12"
        >
          <button
            onClick={handleDownloadPdf}
            className="inline-flex items-center gap-2.5 px-8 py-[1rem] rounded-2xl bg-primary text-primary-foreground text-[0.9rem] font-semibold tracking-[0.02em] shadow-[0_8px_30px_-6px_hsl(var(--primary)/0.35)] hover:shadow-[0_12px_40px_-4px_hsl(var(--primary)/0.45)] hover:translate-y-[-1px] transition-all duration-300"
          >
            <Download className="w-4 h-4" />
            Baixar PDF do Relatório
          </button>
          <button
            onClick={onRestart}
            className="text-[0.82rem] text-muted-foreground/50 hover:text-foreground/70 transition-colors underline underline-offset-4"
          >
            Ir para o Dashboard
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
      className="bg-card/80 backdrop-blur-sm rounded-2xl border border-border/60 p-6 md:p-8 space-y-4"
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
