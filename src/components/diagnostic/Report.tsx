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
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
};

const Report = ({ result, onRestart }: ReportProps) => {
  const intensityInfo = intensityConfig[result.intensity];
  const { profile } = useAuth();

  const handleDownloadPdf = () => {
    generateDiagnosticPdf(result, profile?.name);
  };

  return (
    <div className="min-h-screen px-6 py-12 md:py-20">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <motion.div {...fadeUp} transition={{ duration: 0.4 }} className="text-center space-y-3">
          <p className="text-xs font-light text-muted-foreground uppercase tracking-wider">
            Sua leitura comportamental
          </p>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">
            {result.combinedTitle}
          </h1>
          <div className="flex items-center justify-center gap-2">
            <span className={`text-sm font-medium ${intensityInfo.class}`}>
              {intensityInfo.label}
            </span>
            <span className={`w-1.5 h-1.5 rounded-full ${intensityInfo.bgClass}`} />
          </div>
        </motion.div>

        {/* Profile Classification */}
        {result.interpretation?.behavioralProfile && (
          <ReportSection delay={0.04}>
            <div className="text-center space-y-3">
              <p className="text-xs font-light text-muted-foreground uppercase tracking-wider">Seu perfil hoje</p>
              <p className="text-xl font-semibold text-foreground">
                {result.interpretation.behavioralProfile.name}
              </p>
              <p className="text-sm text-muted-foreground leading-relaxed max-w-lg mx-auto">
                {result.interpretation.behavioralProfile.description}
              </p>
              <div className="flex flex-wrap items-center justify-center gap-1.5 pt-1">
                <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${
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
                  <span key={i} className="text-xs bg-secondary border border-border rounded-full px-2.5 py-0.5 text-muted-foreground">
                    {trait}
                  </span>
                ))}
              </div>
            </div>
          </ReportSection>
        )}

        {/* Blind Spot */}
        {result.interpretation?.blindSpot && (
          <ReportSection delay={0.08} icon={<EyeOff className="w-4 h-4 text-muted-foreground" />} title="Ponto cego">
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground leading-relaxed italic">
                {result.interpretation.blindSpot.perceivedProblem}
              </p>
              <div className="border-l-2 border-destructive/20 pl-4">
                <p className="text-sm text-foreground leading-relaxed font-medium">
                  {result.interpretation.blindSpot.realProblem}
                </p>
              </div>
            </div>
          </ReportSection>
        )}

        {/* Core Pain */}
        <ReportSection delay={0.1} icon={<Flame className="w-4 h-4 text-muted-foreground" />} title="O que realmente te trava">
          <div className="space-y-3">
            <p className="text-sm text-foreground/80 leading-relaxed">{result.corePain}</p>
            <div className="border-l-2 border-primary/20 pl-4">
              <p className="text-sm text-muted-foreground leading-relaxed">
                O padrão de <span className="font-medium text-foreground">{result.dominantPattern.label.toLowerCase()}</span> sustenta isso: {result.blockingPoint.charAt(0).toLowerCase() + result.blockingPoint.slice(1)}
              </p>
            </div>
            {result.interpretation && result.interpretation.selfDeceptionIndex >= 40 && (
              <div className="bg-destructive/[0.03] border border-destructive/10 rounded-lg px-4 py-3">
                <p className="text-sm text-foreground/70 leading-relaxed">
                  <span className="font-medium text-destructive/70">Atenção:</span> existe uma distância de {result.interpretation.behaviorVsPerceptionGap}% entre como você se vê e como realmente se comporta.
                </p>
              </div>
            )}
          </div>
        </ReportSection>

        {/* Critical Diagnosis */}
        <ReportSection delay={0.12}>
          <div className="border-l-2 border-destructive/20 pl-4">
            <p className="text-sm text-foreground font-medium leading-relaxed">{result.criticalDiagnosis}</p>
          </div>
        </ReportSection>

        {/* Key Unlock */}
        <ReportSection delay={0.14} icon={<Key className="w-4 h-4 text-muted-foreground" />} title="Por onde começar">
          <p className="text-sm text-foreground/80 leading-relaxed">{result.keyUnlockArea}</p>
          <p className="text-xs text-muted-foreground mt-2 font-light">
            {result.interpretation?.internalConflicts && result.interpretation.internalConflicts.length > 0
              ? `Corrigir isso reduz a tensão em ${result.interpretation.internalConflicts.length} ponto${result.interpretation.internalConflicts.length > 1 ? 's' : ''} de conflito interno.`
              : `Esse é o ponto que alimenta todos os outros. Mexa aqui primeiro.`
            }
          </p>
        </ReportSection>

        {/* Mental State */}
        <ReportSection delay={0.16} icon={<Brain className="w-4 h-4 text-muted-foreground" />} title="Como sua mente opera agora">
          <p className="text-sm text-muted-foreground leading-relaxed">{result.mentalState}</p>
        </ReportSection>

        {/* Cycle */}
        <ReportSection delay={0.2} icon={<Target className="w-4 h-4 text-muted-foreground" />} title="O ciclo que se repete">
          <div className="space-y-0">
            {result.selfSabotageCycle.map((step, i) => (
              <div key={i} className="flex items-stretch gap-3">
                <div className="flex flex-col items-center">
                  <div className="w-6 h-6 rounded bg-secondary border border-border flex items-center justify-center text-xs font-medium text-muted-foreground shrink-0">
                    {i + 1}
                  </div>
                  {i < result.selfSabotageCycle.length - 1 && (
                    <div className="w-px flex-1 bg-border my-0.5" />
                  )}
                </div>
                <div className="pb-3 pt-0.5">
                  <p className="text-sm text-muted-foreground leading-relaxed">{step}</p>
                </div>
              </div>
            ))}
            <div className="flex items-center gap-2 pt-2 border-t border-dashed border-border">
              <ArrowRight className="w-3 h-3 text-muted-foreground/30" />
              <p className="text-xs text-muted-foreground/40 italic font-light">E recomeça.</p>
            </div>
          </div>
        </ReportSection>

        {/* Triggers */}
        <ReportSection delay={0.24} icon={<AlertTriangle className="w-4 h-4 text-muted-foreground" />} title="O que ativa o padrão">
          <div className="space-y-1">
            {result.triggers.map((trigger, i) => (
              <div key={i} className="flex items-start gap-2 py-1">
                <span className="mt-2 w-1 h-1 rounded-full bg-muted-foreground/30 shrink-0" />
                <p className="text-sm text-muted-foreground leading-relaxed">{trigger}</p>
              </div>
            ))}
          </div>
        </ReportSection>

        {/* Mental Traps */}
        <ReportSection delay={0.28} icon={<Eye className="w-4 h-4 text-muted-foreground" />} title="As frases que te mantêm preso">
          <div className="space-y-2">
            {result.mentalTraps.map((trap, i) => (
              <div key={i} className="bg-secondary/50 border border-border rounded-lg px-4 py-3">
                <p className="text-sm text-muted-foreground italic leading-relaxed">{trap}</p>
              </div>
            ))}
          </div>
        </ReportSection>

        {/* Contradiction */}
        <ReportSection delay={0.32}>
          <p className="text-xs font-light text-muted-foreground/50 uppercase tracking-wider mb-2">A contradição</p>
          <p className="text-sm text-foreground/70 leading-relaxed">{result.contradiction}</p>
        </ReportSection>

        {/* Blocking Point */}
        <ReportSection delay={0.35} icon={<MapPin className="w-4 h-4 text-muted-foreground" />} title="Onde trava">
          <p className="text-sm text-foreground/80 leading-relaxed">{result.blockingPoint}</p>
        </ReportSection>

        {/* Life Impact */}
        <ReportSection delay={0.38} title="O custo real">
          <div className="space-y-3">
            {result.lifeImpact.map((item, i) => (
              <div key={i} className="border-l-2 border-border pl-4 py-1">
                <p className="text-xs font-light text-muted-foreground/50 uppercase tracking-wider mb-0.5">{item.pillar}</p>
                <p className="text-sm text-muted-foreground leading-relaxed">{item.impact}</p>
              </div>
            ))}
          </div>
        </ReportSection>

        {/* What NOT to do */}
        <ReportSection delay={0.42} icon={<XCircle className="w-4 h-4 text-muted-foreground" />} title="Pare de fazer isso">
          <div className="space-y-1.5">
            {result.whatNotToDo.map((item, i) => (
              <div key={i} className="flex items-start gap-2 py-1.5 bg-destructive/[0.02] border border-destructive/8 rounded-lg px-4">
                <span className="mt-0.5 text-destructive/50 font-medium text-xs shrink-0">✗</span>
                <p className="text-sm text-muted-foreground leading-relaxed">{item}</p>
              </div>
            ))}
          </div>
        </ReportSection>

        {/* Direction */}
        <ReportSection delay={0.46} icon={<Compass className="w-4 h-4 text-muted-foreground" />} title="A direção">
          <p className="text-sm text-foreground/80 leading-relaxed">{result.direction}</p>
        </ReportSection>

        {/* Exit Strategy */}
        <ReportSection delay={0.5} icon={<LifeBuoy className="w-4 h-4 text-muted-foreground" />} title="Saída prática">
          <div className="space-y-4">
            {result.exitStrategy.map((step) => (
              <div key={step.step} className="flex gap-3">
                <div className="w-6 h-6 rounded bg-secondary border border-border flex items-center justify-center text-xs font-medium text-muted-foreground shrink-0">
                  {step.step}
                </div>
                <div>
                  <h4 className="text-sm font-medium text-foreground">{step.title}</h4>
                  <p className="text-sm text-muted-foreground leading-relaxed mt-0.5">{step.action}</p>
                </div>
              </div>
            ))}
          </div>
        </ReportSection>

        {/* Intensity Map */}
        <ReportSection delay={0.54}>
          <p className="text-xs font-light text-muted-foreground/50 uppercase tracking-wider mb-3">Intensidade por eixo</p>
          <div className="space-y-2.5">
            {result.allScores.slice(0, 8).map((score) => (
              <div key={score.key} className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground font-light">{score.label}</span>
                  <span className="text-muted-foreground/50 font-light">{score.percentage}%</span>
                </div>
                <div className="h-[2px] rounded-full bg-border overflow-hidden">
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

        {/* Secondary Patterns */}
        {result.secondaryPatterns.length > 0 && (
          <ReportSection delay={0.58}>
            <p className="text-xs font-light text-muted-foreground/50 uppercase tracking-wider mb-3">Também presente</p>
            <div className="space-y-3">
              {result.secondaryPatterns.map((pattern) => (
                <div key={pattern.key} className="border-l-2 border-border pl-4 py-1">
                  <p className="text-sm font-medium text-foreground">{pattern.label}</p>
                  <p className="text-sm text-muted-foreground leading-relaxed mt-0.5">{pattern.description}</p>
                </div>
              ))}
            </div>
          </ReportSection>
        )}

        {/* Disclaimer */}
        <motion.div {...fadeUp} transition={{ delay: 0.7, duration: 0.4 }} className="text-center pt-4 border-t border-border">
          <p className="text-xs text-muted-foreground/40 font-light leading-relaxed max-w-md mx-auto">
            Leitura comportamental baseada em suas respostas. Não substitui avaliação profissional.
          </p>
        </motion.div>

        {/* Actions */}
        <motion.div {...fadeUp} transition={{ delay: 0.8, duration: 0.4 }} className="flex flex-col sm:flex-row items-center justify-center gap-3 pb-12">
          <button
            onClick={handleDownloadPdf}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
          >
            <Download className="w-4 h-4" />
            Baixar PDF
          </button>
          <button
            onClick={onRestart}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
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
      transition={{ delay, duration: 0.4 }}
      className="border border-border rounded-lg p-5 md:p-6 space-y-3 bg-card"
    >
      {title && (
        <div className="flex items-center gap-2">
          {icon}
          <h3 className="text-base font-medium text-foreground">{title}</h3>
        </div>
      )}
      {children}
    </motion.div>
  );
}

export default Report;
