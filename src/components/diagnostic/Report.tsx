import { motion } from 'framer-motion';
import { DiagnosticResult, IntensityLevel } from '@/types/diagnostic';
import { AlertTriangle, Brain, Target, ArrowRight, Eye, Compass, LifeBuoy, Download, XCircle, Flame, Key, UserCheck, EyeOff, MapPin } from 'lucide-react';
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
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header — clean, no noise */}
        <motion.div {...fadeUp} transition={{ duration: 0.6 }} className="text-center space-y-4">
          <p className="text-[10px] tracking-[0.35em] uppercase text-primary/50 font-semibold">
            Sua leitura comportamental
          </p>
          <h1 className="text-3xl md:text-[2.8rem] leading-[1.05] tracking-[-0.03em]">
            {result.combinedTitle}
          </h1>
          <div className="flex items-center justify-center gap-2.5">
            <span className={`text-[0.8rem] font-semibold ${intensityInfo.class}`}>
              {intensityInfo.label}
            </span>
            <span className={`w-2 h-2 rounded-full ${intensityInfo.bgClass}`} />
          </div>
        </motion.div>

        {/* Profile Classification — the hook */}
        {result.interpretation?.behavioralProfile && (
          <ReportSection delay={0.04}>
            <div className="text-center py-3 space-y-3">
              <p className="text-[0.75rem] text-muted-foreground/40 uppercase tracking-[0.2em]">Seu perfil hoje</p>
              <p className="text-2xl md:text-3xl font-semibold text-foreground/90">
                {result.interpretation.behavioralProfile.name}
              </p>
              <p className="text-foreground/60 leading-[1.8] text-[0.9rem] max-w-xl mx-auto">
                {result.interpretation.behavioralProfile.description}
              </p>
              <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                <span className={`text-[0.75rem] font-semibold px-3 py-0.5 rounded-full ${
                  result.interpretation.behavioralProfile.riskLevel === 'critical' ? 'bg-destructive/10 text-destructive' :
                  result.interpretation.behavioralProfile.riskLevel === 'high' ? 'bg-orange-500/10 text-orange-600' :
                  result.interpretation.behavioralProfile.riskLevel === 'moderate' ? 'bg-yellow-500/10 text-yellow-600' :
                  'bg-green-500/10 text-green-600'
                }`}>
                  {result.interpretation.behavioralProfile.riskLevel === 'critical' ? 'Risco crítico' :
                   result.interpretation.behavioralProfile.riskLevel === 'high' ? 'Risco alto' :
                   result.interpretation.behavioralProfile.riskLevel === 'moderate' ? 'Risco moderado' : 'Risco baixo'}
                </span>
                {result.interpretation.behavioralProfile.dominantTraits.map((trait, i) => (
                  <span key={i} className="text-[0.72rem] bg-primary/[0.05] border border-primary/10 rounded-full px-2.5 py-0.5 text-foreground/50">
                    {trait}
                  </span>
                ))}
              </div>
            </div>
          </ReportSection>
        )}

        {/* Blind Spot — maximum impact */}
        {result.interpretation?.blindSpot && (
          <ReportSection delay={0.08} icon={<EyeOff className="w-5 h-5 text-destructive/50" />} title="Ponto cego">
            <div className="space-y-3">
              <p className="text-foreground/60 leading-[1.8] text-[0.9rem] italic">
                {result.interpretation.blindSpot.perceivedProblem}
              </p>
              <div className="border-l-2 border-destructive/30 pl-5 py-2">
                <p className="text-foreground/85 leading-[1.8] text-[0.9rem] font-medium">
                  {result.interpretation.blindSpot.realProblem}
                </p>
              </div>
            </div>
          </ReportSection>
        )}

        {/* Core Pain — direct, no subsection labels */}
        <ReportSection delay={0.1} icon={<Flame className="w-5 h-5 text-destructive/50" />} title="O que realmente te trava">
          <div className="space-y-4">
            <p className="text-foreground/80 leading-[1.8] text-[0.9rem]">{result.corePain}</p>
            <div className="border-l-2 border-primary/25 pl-5">
              <p className="text-foreground/65 leading-[1.8] text-[0.88rem]">
                O padrão de <span className="font-medium text-foreground/80">{result.dominantPattern.label.toLowerCase()}</span> é o que sustenta isso: {result.blockingPoint.charAt(0).toLowerCase() + result.blockingPoint.slice(1)}
              </p>
            </div>

            {result.interpretation && result.interpretation.selfDeceptionIndex >= 40 && (
              <div className="bg-destructive/[0.04] border border-destructive/12 rounded-xl px-5 py-4">
                <p className="text-[0.85rem] text-foreground/65 leading-[1.8]">
                  <span className="font-semibold text-destructive/70">Atenção:</span> existe uma distância de {result.interpretation.behaviorVsPerceptionGap}% entre como você se vê e como realmente se comporta. Isso significa que parte do problema está invisível para você.
                </p>
              </div>
            )}
          </div>
        </ReportSection>

        {/* Critical Diagnosis — short, sharp */}
        <ReportSection delay={0.12}>
          <div className="border-l-2 border-destructive/25 pl-5">
            <p className="text-foreground/80 leading-[1.8] text-[0.9rem] font-medium">{result.criticalDiagnosis}</p>
          </div>
        </ReportSection>

        {/* Key Unlock — what to fix first */}
        <ReportSection delay={0.14} icon={<Key className="w-5 h-5 text-primary/50" />} title="Por onde começar">
          <p className="text-foreground/80 leading-[1.8] text-[0.9rem]">{result.keyUnlockArea}</p>
          <p className="text-foreground/50 leading-[1.8] text-[0.82rem] mt-2">
            {result.interpretation?.internalConflicts && result.interpretation.internalConflicts.length > 0
              ? `Corrigir isso reduz a tensão em ${result.interpretation.internalConflicts.length} ponto${result.interpretation.internalConflicts.length > 1 ? 's' : ''} de conflito interno simultâneo${result.interpretation.internalConflicts.length > 1 ? 's' : ''}.`
              : `Esse é o ponto que alimenta todos os outros. Mexa aqui primeiro.`
            }
          </p>
        </ReportSection>

        {/* How your mind works right now */}
        <ReportSection delay={0.16} icon={<Brain className="w-5 h-5 text-primary/50" />} title="Como sua mente opera agora">
          <p className="text-foreground/65 leading-[1.8] text-[0.9rem]">{result.mentalState}</p>
        </ReportSection>

        {/* The cycle — visual, clean */}
        <ReportSection delay={0.2} icon={<Target className="w-5 h-5 text-primary/50" />} title="O ciclo que se repete">
          <div className="space-y-0">
            {result.selfSabotageCycle.map((step, i) => (
              <div key={i} className="flex items-stretch gap-3.5">
                <div className="flex flex-col items-center">
                  <div className="w-7 h-7 rounded-lg bg-primary/[0.06] border border-primary/12 flex items-center justify-center text-[0.65rem] font-bold text-primary/60 shrink-0">
                    {i + 1}
                  </div>
                  {i < result.selfSabotageCycle.length - 1 && (
                    <div className="w-px flex-1 bg-border/30 my-0.5" />
                  )}
                </div>
                <div className="pb-4">
                  <p className="text-foreground/65 text-[0.85rem] leading-[1.75] pt-1">{step}</p>
                </div>
              </div>
            ))}
            <div className="flex items-center gap-2.5 pt-2 border-t border-dashed border-border/30">
              <ArrowRight className="w-3 h-3 text-primary/30" />
              <p className="text-[0.72rem] text-muted-foreground/35 italic">E recomeça.</p>
            </div>
          </div>
        </ReportSection>

        {/* Triggers — no header fluff */}
        <ReportSection delay={0.24} icon={<AlertTriangle className="w-5 h-5 text-primary/50" />} title="O que ativa o padrão">
          <div className="space-y-1.5">
            {result.triggers.map((trigger, i) => (
              <div key={i} className="flex items-start gap-2.5 py-1.5">
                <span className="mt-2 w-1 h-1 rounded-full bg-primary/40 shrink-0" />
                <p className="text-foreground/65 text-[0.85rem] leading-[1.75]">{trigger}</p>
              </div>
            ))}
          </div>
        </ReportSection>

        {/* Mental traps — conversational */}
        <ReportSection delay={0.28} icon={<Eye className="w-5 h-5 text-primary/50" />} title="As frases que te mantêm preso">
          <div className="space-y-2">
            {result.mentalTraps.map((trap, i) => (
              <div key={i} className="bg-muted/15 border border-border/30 rounded-xl px-5 py-3">
                <p className="text-foreground/70 text-[0.85rem] italic leading-[1.75]">{trap}</p>
              </div>
            ))}
          </div>
        </ReportSection>

        {/* Contradiction */}
        <ReportSection delay={0.32}>
          <p className="text-[0.72rem] text-muted-foreground/35 uppercase tracking-[0.2em] mb-2">A contradição</p>
          <p className="text-foreground/70 leading-[1.8] text-[0.9rem]">{result.contradiction}</p>
        </ReportSection>

        {/* Where exactly it breaks */}
        <ReportSection delay={0.35} icon={<MapPin className="w-5 h-5 text-primary/50" />} title="Onde trava">
          <p className="text-foreground/75 leading-[1.8] text-[0.9rem]">{result.blockingPoint}</p>
        </ReportSection>

        {/* Life impact — compact */}
        <ReportSection delay={0.38} title="O custo real">
          <div className="space-y-3">
            {result.lifeImpact.map((item, i) => (
              <div key={i} className="border-l-2 border-border/40 pl-4 py-1">
                <p className="text-[0.72rem] text-muted-foreground/40 uppercase tracking-[0.15em] mb-0.5">{item.pillar}</p>
                <p className="text-[0.85rem] text-foreground/60 leading-[1.75]">{item.impact}</p>
              </div>
            ))}
          </div>
        </ReportSection>

        {/* What NOT to do */}
        <ReportSection delay={0.42} icon={<XCircle className="w-5 h-5 text-destructive/50" />} title="Pare de fazer isso">
          <div className="space-y-1.5">
            {result.whatNotToDo.map((item, i) => (
              <div key={i} className="flex items-start gap-2.5 py-1.5 bg-destructive/[0.03] border border-destructive/8 rounded-lg px-4">
                <span className="mt-0.5 text-destructive/50 font-bold text-[0.8rem] shrink-0">✗</span>
                <p className="text-foreground/65 text-[0.85rem] leading-[1.75]">{item}</p>
              </div>
            ))}
          </div>
        </ReportSection>

        {/* Direction — the way out */}
        <ReportSection delay={0.46} icon={<Compass className="w-5 h-5 text-primary/50" />} title="A direção">
          <p className="text-foreground/75 leading-[1.8] text-[0.9rem]">{result.direction}</p>
        </ReportSection>

        {/* Exit strategy — practical */}
        <ReportSection delay={0.5} icon={<LifeBuoy className="w-5 h-5 text-primary/50" />} title="Saída prática">
          <div className="space-y-4">
            {result.exitStrategy.map((step) => (
              <div key={step.step} className="flex gap-3.5">
                <div className="w-8 h-8 rounded-lg bg-primary/[0.06] border border-primary/10 flex items-center justify-center text-[0.75rem] font-bold text-primary/50 shrink-0">
                  {step.step}
                </div>
                <div className="space-y-0.5">
                  <h4 className="font-sans font-semibold text-foreground/75 text-[0.85rem]">{step.title}</h4>
                  <p className="text-[0.82rem] text-foreground/55 leading-[1.75]">{step.action}</p>
                </div>
              </div>
            ))}
          </div>
        </ReportSection>

        {/* Intensity map — subtle */}
        <ReportSection delay={0.54}>
          <p className="text-[0.72rem] text-muted-foreground/35 uppercase tracking-[0.2em] mb-3">Intensidade por eixo</p>
          <div className="space-y-2.5">
            {result.allScores.slice(0, 8).map((score) => (
              <div key={score.key} className="space-y-1">
                <div className="flex justify-between text-[0.8rem]">
                  <span className="text-foreground/60">{score.label}</span>
                  <span className="text-muted-foreground/40">{score.percentage}%</span>
                </div>
                <div className="h-[2px] rounded-full bg-border/30 overflow-hidden">
                  <motion.div
                    className="h-full rounded-full bg-primary/60"
                    initial={{ width: 0 }}
                    animate={{ width: `${score.percentage}%` }}
                    transition={{ duration: 0.8, delay: 0.6, ease: 'easeOut' }}
                  />
                </div>
              </div>
            ))}
          </div>
        </ReportSection>

        {/* Secondary patterns — only if exist */}
        {result.secondaryPatterns.length > 0 && (
          <ReportSection delay={0.58}>
            <p className="text-[0.72rem] text-muted-foreground/35 uppercase tracking-[0.2em] mb-3">Também presente</p>
            <div className="space-y-3">
              {result.secondaryPatterns.map((pattern) => (
                <div key={pattern.key} className="border-l-2 border-border/40 pl-4 py-1">
                  <p className="font-semibold text-foreground/70 text-[0.88rem]">{pattern.label}</p>
                  <p className="text-[0.82rem] text-foreground/50 leading-[1.75] mt-0.5">{pattern.description}</p>
                </div>
              ))}
            </div>
          </ReportSection>
        )}

        {/* Disclaimer — minimal */}
        <motion.div
          {...fadeUp}
          transition={{ delay: 0.7, duration: 0.5 }}
          className="text-center pt-4 border-t border-border/20"
        >
          <p className="text-[0.72rem] text-muted-foreground/30 leading-[1.7] max-w-md mx-auto">
            Leitura comportamental baseada em suas respostas. Não substitui avaliação profissional.
          </p>
        </motion.div>

        {/* Actions */}
        <motion.div
          {...fadeUp}
          transition={{ delay: 0.8, duration: 0.5 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4 pb-12"
        >
          <button
            onClick={handleDownloadPdf}
            className="inline-flex items-center gap-2.5 px-8 py-[1rem] rounded-2xl bg-primary text-primary-foreground text-[0.9rem] font-semibold tracking-[0.02em] shadow-[0_8px_30px_-6px_hsl(var(--primary)/0.35)] hover:shadow-[0_12px_40px_-4px_hsl(var(--primary)/0.45)] hover:translate-y-[-1px] transition-all duration-300"
          >
            <Download className="w-4 h-4" />
            Baixar PDF
          </button>
          <button
            onClick={onRestart}
            className="text-[0.82rem] text-muted-foreground/40 hover:text-foreground/60 transition-colors underline underline-offset-4"
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
  title?: string;
  delay?: number;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <motion.div
      {...fadeUp}
      transition={{ delay, duration: 0.5 }}
      className="bg-card/70 backdrop-blur-sm rounded-2xl border border-border/40 p-6 md:p-8 space-y-3"
    >
      {title && (
        <div className="flex items-center gap-2.5">
          {icon}
          <h3 className="text-lg font-semibold text-foreground/80">{title}</h3>
        </div>
      )}
      {children}
    </motion.div>
  );
}

export default Report;
