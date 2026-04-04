import { motion } from 'framer-motion';
import { DiagnosticResult, IntensityLevel } from '@/types/diagnostic';
import { AlertTriangle, Brain, Target, ArrowRight, Eye, Compass, LifeBuoy, Download, XCircle, Flame, Key, EyeOff, MapPin } from 'lucide-react';
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
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
};

const Report = ({ result, onRestart }: ReportProps) => {
  const intensityInfo = intensityConfig[result.intensity];
  const { profile } = useAuth();

  const handleDownloadPdf = () => {
    generateDiagnosticPdf(result, profile?.name);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Document container */}
      <div className="max-w-2xl mx-auto px-6 md:px-10 py-16 md:py-24">

        {/* — Cover / Header — */}
        <motion.header {...fadeUp} transition={{ duration: 0.5 }} className="text-center mb-20">
          <p className="text-[11px] text-muted-foreground/50 uppercase tracking-[0.2em] font-light mb-6">
            Leitura Comportamental
          </p>
          <h1 className="text-3xl md:text-4xl font-semibold tracking-tight leading-tight text-foreground">
            {result.combinedTitle}
          </h1>
          <div className="flex items-center justify-center gap-3 mt-5">
            <span className={`text-sm font-medium ${intensityInfo.class}`}>
              {intensityInfo.label}
            </span>
            <span className={`w-1.5 h-1.5 rounded-full ${intensityInfo.bgClass}`} />
          </div>
          <div className="w-12 h-px bg-border mx-auto mt-8" />
        </motion.header>

        {/* — Sections — */}
        <div className="space-y-16">

          {/* Profile Classification */}
          {result.interpretation?.behavioralProfile && (
            <ReportSection delay={0.04}>
              <div className="text-center space-y-4">
                <SectionLabel>Seu perfil hoje</SectionLabel>
                <p className="text-2xl font-semibold text-foreground">
                  {result.interpretation.behavioralProfile.name}
                </p>
                <p className="text-sm text-muted-foreground leading-[1.8] max-w-lg mx-auto">
                  {result.interpretation.behavioralProfile.description}
                </p>
                <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                  <span className={`text-xs font-medium px-3 py-1 rounded-full ${
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
                    <span key={i} className="text-xs bg-secondary/60 border border-border/30 rounded-full px-3 py-1 text-muted-foreground">
                      {trait}
                    </span>
                  ))}
                </div>
              </div>
            </ReportSection>
          )}

          {/* Blind Spot */}
          {result.interpretation?.blindSpot && (
            <ReportSection delay={0.08} icon={<EyeOff className="w-4 h-4" />} title="Ponto cego">
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground leading-[1.8] italic">
                  {result.interpretation.blindSpot.perceivedProblem}
                </p>
                <div className="border-l-2 border-destructive/20 pl-5">
                  <p className="text-sm text-foreground leading-[1.8] font-medium">
                    {result.interpretation.blindSpot.realProblem}
                  </p>
                </div>
              </div>
            </ReportSection>
          )}

          {/* Core Pain */}
          <ReportSection delay={0.1} icon={<Flame className="w-4 h-4" />} title="O que realmente te trava">
            <div className="space-y-5">
              <p className="text-sm text-foreground/80 leading-[1.8]">{result.corePain}</p>
              <div className="border-l-2 border-primary/20 pl-5">
                <p className="text-sm text-muted-foreground leading-[1.8]">
                  O padrão de <span className="font-medium text-foreground">{result.dominantPattern.label.toLowerCase()}</span> sustenta isso: {result.blockingPoint.charAt(0).toLowerCase() + result.blockingPoint.slice(1)}
                </p>
              </div>
              {result.interpretation && result.interpretation.selfDeceptionIndex >= 40 && (
                <div className="bg-destructive/[0.03] border border-destructive/10 rounded-2xl px-5 py-4">
                  <p className="text-sm text-foreground/70 leading-[1.8]">
                    <span className="font-medium text-destructive/70">Atenção:</span> existe uma distância de {result.interpretation.behaviorVsPerceptionGap}% entre como você se vê e como realmente se comporta.
                  </p>
                </div>
              )}
            </div>
          </ReportSection>

          {/* Critical Diagnosis */}
          <ReportSection delay={0.12}>
            <div className="border-l-2 border-destructive/20 pl-5">
              <p className="text-sm text-foreground font-medium leading-[1.8]">{result.criticalDiagnosis}</p>
            </div>
          </ReportSection>

          {/* Key Unlock */}
          <ReportSection delay={0.14} icon={<Key className="w-4 h-4" />} title="Por onde começar">
            <p className="text-sm text-foreground/80 leading-[1.8]">{result.keyUnlockArea}</p>
            <p className="text-xs text-muted-foreground/60 mt-3 font-light leading-relaxed">
              {result.interpretation?.internalConflicts && result.interpretation.internalConflicts.length > 0
                ? `Corrigir isso reduz a tensão em ${result.interpretation.internalConflicts.length} ponto${result.interpretation.internalConflicts.length > 1 ? 's' : ''} de conflito interno.`
                : `Esse é o ponto que alimenta todos os outros. Mexa aqui primeiro.`
              }
            </p>
          </ReportSection>

          {/* Mental State */}
          <ReportSection delay={0.16} icon={<Brain className="w-4 h-4" />} title="Como sua mente opera agora">
            <p className="text-sm text-muted-foreground leading-[1.8]">{result.mentalState}</p>
          </ReportSection>

          {/* Cycle */}
          <ReportSection delay={0.2} icon={<Target className="w-4 h-4" />} title="O ciclo que se repete">
            <div className="space-y-0">
              {result.selfSabotageCycle.map((step, i) => (
                <div key={i} className="flex items-stretch gap-4">
                  <div className="flex flex-col items-center">
                    <div className="w-7 h-7 rounded-xl bg-secondary/80 border border-border/30 flex items-center justify-center text-xs font-medium text-muted-foreground shrink-0">
                      {i + 1}
                    </div>
                    {i < result.selfSabotageCycle.length - 1 && (
                      <div className="w-px flex-1 bg-border/50 my-1" />
                    )}
                  </div>
                  <div className="pb-4 pt-1">
                    <p className="text-sm text-muted-foreground leading-[1.8]">{step}</p>
                  </div>
                </div>
              ))}
              <div className="flex items-center gap-3 pt-3 border-t border-dashed border-border/40 ml-11">
                <ArrowRight className="w-3 h-3 text-muted-foreground/25" />
                <p className="text-xs text-muted-foreground/35 italic font-light">E recomeça.</p>
              </div>
            </div>
          </ReportSection>

          {/* Triggers */}
          <ReportSection delay={0.24} icon={<AlertTriangle className="w-4 h-4" />} title="O que ativa o padrão">
            <div className="space-y-2">
              {result.triggers.map((trigger, i) => (
                <div key={i} className="flex items-start gap-3 py-1.5">
                  <span className="mt-2.5 w-1 h-1 rounded-full bg-muted-foreground/25 shrink-0" />
                  <p className="text-sm text-muted-foreground leading-[1.8]">{trigger}</p>
                </div>
              ))}
            </div>
          </ReportSection>

          {/* Mental Traps */}
          <ReportSection delay={0.28} icon={<Eye className="w-4 h-4" />} title="As frases que te mantêm preso">
            <div className="space-y-3">
              {result.mentalTraps.map((trap, i) => (
                <div key={i} className="bg-secondary/30 border border-border/20 rounded-2xl px-5 py-4">
                  <p className="text-sm text-muted-foreground italic leading-[1.8]">{trap}</p>
                </div>
              ))}
            </div>
          </ReportSection>

          {/* Contradiction */}
          <ReportSection delay={0.32}>
            <SectionLabel>A contradição</SectionLabel>
            <p className="text-sm text-foreground/70 leading-[1.8] mt-3">{result.contradiction}</p>
          </ReportSection>

          {/* Blocking Point */}
          <ReportSection delay={0.35} icon={<MapPin className="w-4 h-4" />} title="Onde trava">
            <p className="text-sm text-foreground/80 leading-[1.8]">{result.blockingPoint}</p>
          </ReportSection>

          {/* Life Impact */}
          <ReportSection delay={0.38} title="O custo real">
            <div className="space-y-5">
              {result.lifeImpact.map((item, i) => (
                <div key={i} className="border-l-2 border-border/50 pl-5 py-1">
                  <p className="text-[11px] text-muted-foreground/50 uppercase tracking-[0.15em] font-light mb-1.5">{item.pillar}</p>
                  <p className="text-sm text-muted-foreground leading-[1.8]">{item.impact}</p>
                </div>
              ))}
            </div>
          </ReportSection>

          {/* What NOT to do */}
          <ReportSection delay={0.42} icon={<XCircle className="w-4 h-4" />} title="Pare de fazer isso">
            <div className="space-y-2.5">
              {result.whatNotToDo.map((item, i) => (
                <div key={i} className="flex items-start gap-3 py-3 bg-destructive/[0.02] border border-destructive/[0.06] rounded-2xl px-5">
                  <span className="mt-0.5 text-destructive/40 font-medium text-xs shrink-0">✗</span>
                  <p className="text-sm text-muted-foreground leading-[1.8]">{item}</p>
                </div>
              ))}
            </div>
          </ReportSection>

          {/* Direction */}
          <ReportSection delay={0.46} icon={<Compass className="w-4 h-4" />} title="A direção">
            <p className="text-sm text-foreground/80 leading-[1.8]">{result.direction}</p>
          </ReportSection>

          {/* Exit Strategy */}
          <ReportSection delay={0.5} icon={<LifeBuoy className="w-4 h-4" />} title="Saída prática">
            <div className="space-y-5">
              {result.exitStrategy.map((step) => (
                <div key={step.step} className="flex gap-4">
                  <div className="w-7 h-7 rounded-xl bg-primary/10 flex items-center justify-center text-xs font-medium text-primary shrink-0">
                    {step.step}
                  </div>
                  <div className="pt-0.5">
                    <h4 className="text-sm font-medium text-foreground">{step.title}</h4>
                    <p className="text-sm text-muted-foreground leading-[1.8] mt-1">{step.action}</p>
                  </div>
                </div>
              ))}
            </div>
          </ReportSection>

          {/* Intensity Map */}
          <ReportSection delay={0.54}>
            <SectionLabel>Intensidade por eixo</SectionLabel>
            <div className="space-y-4 mt-5">
              {result.allScores.slice(0, 8).map((score) => (
                <div key={score.key} className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground font-light">{score.label}</span>
                    <span className="text-muted-foreground/40 font-light tabular-nums">{score.percentage}%</span>
                  </div>
                  <div className="h-[3px] rounded-full bg-border/50 overflow-hidden">
                    <motion.div
                      className="h-full rounded-full bg-primary/50"
                      initial={{ width: 0 }}
                      animate={{ width: `${score.percentage}%` }}
                      transition={{ duration: 0.8, delay: 0.6, ease: 'easeOut' }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </ReportSection>

          {/* Secondary Patterns */}
          {result.secondaryPatterns.length > 0 && (
            <ReportSection delay={0.58}>
              <SectionLabel>Também presente</SectionLabel>
              <div className="space-y-5 mt-4">
                {result.secondaryPatterns.map((pattern) => (
                  <div key={pattern.key} className="border-l-2 border-border/50 pl-5 py-1">
                    <p className="text-sm font-medium text-foreground">{pattern.label}</p>
                    <p className="text-sm text-muted-foreground leading-[1.8] mt-1">{pattern.description}</p>
                  </div>
                ))}
              </div>
            </ReportSection>
          )}
        </div>

        {/* — Footer — */}
        <div className="mt-20 space-y-8">
          <div className="w-12 h-px bg-border mx-auto" />

          <motion.p {...fadeUp} transition={{ delay: 0.7, duration: 0.4 }}
            className="text-xs text-muted-foreground/35 font-light leading-relaxed max-w-md mx-auto text-center"
          >
            Leitura comportamental baseada em suas respostas. Não substitui avaliação profissional.
          </motion.p>

          <motion.div {...fadeUp} transition={{ delay: 0.8, duration: 0.4 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 pb-16"
          >
            <button
              onClick={handleDownloadPdf}
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:brightness-90 transition-all duration-200 active:scale-[0.97]"
            >
              <Download className="w-4 h-4" />
              Baixar PDF
            </button>
            <button
              onClick={onRestart}
              className="text-sm text-muted-foreground hover:text-foreground transition-all duration-200 px-4 py-2 rounded-xl hover:bg-secondary/50"
            >
              Ir para o Dashboard
            </button>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

/* — Sub-components — */

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] text-muted-foreground/50 uppercase tracking-[0.2em] font-light">
      {children}
    </p>
  );
}

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
    <motion.section
      {...fadeUp}
      transition={{ delay, duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="space-y-4"
    >
      {title && (
        <div className="flex items-center gap-2.5">
          {icon && <span className="text-muted-foreground/50">{icon}</span>}
          <h2 className="text-lg font-semibold text-foreground tracking-tight">{title}</h2>
        </div>
      )}
      {children}
    </motion.section>
  );
}

export default Report;
