import { motion } from 'framer-motion';
import { DiagnosticResult, IntensityLevel } from '@/types/diagnostic';
import { Download, ChevronRight } from 'lucide-react';
import { generateDiagnosticPdf } from '@/lib/generatePdf';
import { generateLifeMapPdf } from '@/lib/generateLifeMapPdf';
import { useAuth } from '@/contexts/AuthContext';

interface ReportProps {
  result: DiagnosticResult;
  onRestart: () => void;
  moduleSlug?: string;
}

const intensityConfig: Record<IntensityLevel, { label: string; color: string; bg: string }> = {
  leve: { label: 'Leve', color: 'text-green-600', bg: 'bg-green-500' },
  moderado: { label: 'Moderado', color: 'text-yellow-600', bg: 'bg-yellow-500' },
  alto: { label: 'Alto', color: 'text-destructive', bg: 'bg-destructive' },
};

const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
};

const Report = ({ result, onRestart, moduleSlug }: ReportProps) => {
  const intensityInfo = intensityConfig[result.intensity];
  const { profile } = useAuth();

  const handleDownloadPdf = () => {
    if (moduleSlug === 'mapa-de-vida') {
      generateLifeMapPdf(result.allScores, profile?.name);
    } else {
      generateDiagnosticPdf(result, profile?.name);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-xl mx-auto px-5 md:px-8 py-12 md:py-20">

        {/* ── Header ── */}
        <motion.header {...fadeUp} transition={{ duration: 0.4 }} className="mb-14">
          <p className="text-[10px] text-muted-foreground/40 uppercase tracking-[0.25em] font-light mb-4">
            Sua leitura
          </p>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-foreground leading-snug">
            {result.combinedTitle}
          </h1>
          <div className="flex items-center gap-2 mt-3">
            <span className={`w-2 h-2 rounded-full ${intensityInfo.bg}`} />
            <span className={`text-xs font-medium ${intensityInfo.color}`}>
              Intensidade {intensityInfo.label.toLowerCase()}
            </span>
          </div>
        </motion.header>

        {/* ═══════════════════════════════════════ */}
        {/* BLOCO 1 — RESUMO */}
        {/* ═══════════════════════════════════════ */}
        <BlockHeader num={1} title="Resumo" delay={0.05} />

        {/* Profile badge */}
        {result.interpretation?.behavioralProfile && (
          <Section delay={0.08}>
            <div className="bg-secondary/40 border border-border/30 rounded-xl px-4 py-3">
              <p className="text-xs text-muted-foreground/60 mb-1">Perfil identificado</p>
              <p className="text-sm font-semibold text-foreground">
                {result.interpretation.behavioralProfile.name}
              </p>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                {result.interpretation.behavioralProfile.description}
              </p>
            </div>
          </Section>
        )}

        {/* Critical diagnosis — the "headline" */}
        <Section delay={0.1}>
          <CalloutBox color="destructive">
            <p className="text-sm text-foreground leading-[1.7]">{result.criticalDiagnosis}</p>
          </CalloutBox>
        </Section>

        {/* Blind Spot */}
        {result.interpretation?.blindSpot?.realProblem && (
          <Section delay={0.12}>
            <Label>Ponto cego</Label>
            <div className="mt-2 space-y-2">
              <p className="text-xs text-muted-foreground italic leading-relaxed">
                O que você acredita: {result.interpretation.blindSpot.perceivedProblem}
              </p>
              <div className="flex items-start gap-2">
                <ChevronRight className="w-3 h-3 text-destructive/50 mt-0.5 shrink-0" />
                <p className="text-sm text-foreground leading-[1.7]">
                  {result.interpretation.blindSpot.realProblem}
                </p>
              </div>
            </div>
          </Section>
        )}

        {/* Self-deception alert */}
        {result.interpretation && result.interpretation.selfDeceptionIndex >= 40 && (
          <Section delay={0.14}>
            <div className="bg-destructive/[0.04] border border-destructive/10 rounded-xl px-4 py-3">
              <p className="text-xs text-foreground/70 leading-relaxed">
                ⚠️ Existe uma distância de <span className="font-semibold">{result.interpretation.behaviorVsPerceptionGap}%</span> entre como você se vê e como realmente se comporta.
              </p>
            </div>
          </Section>
        )}

        <Divider />

        {/* ═══════════════════════════════════════ */}
        {/* BLOCO 2 — SEU PADRÃO */}
        {/* ═══════════════════════════════════════ */}
        <BlockHeader num={2} title="Seu padrão" delay={0.16} />

        {/* Core pain */}
        <Section delay={0.18}>
          <Label>O que te trava</Label>
          <p className="text-sm text-foreground/80 leading-[1.7] mt-2">{result.corePain}</p>
        </Section>

        {/* Mechanism — short */}
        <Section delay={0.2}>
          <Label>Como funciona</Label>
          <p className="text-sm text-muted-foreground leading-[1.7] mt-2">{result.mechanism}</p>
        </Section>

        {/* Cycle */}
        {result.selfSabotageCycle.length > 0 && (
          <Section delay={0.22}>
            <Label>O ciclo que se repete</Label>
            <div className="mt-3 space-y-0">
              {result.selfSabotageCycle.map((step, i) => (
                <div key={i} className="flex items-start gap-3 py-1.5">
                  <span className="w-5 h-5 rounded-full bg-secondary border border-border/40 flex items-center justify-center text-[10px] font-medium text-muted-foreground shrink-0 mt-0.5">
                    {i + 1}
                  </span>
                  <p className="text-sm text-muted-foreground leading-[1.7]">{step}</p>
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* Triggers */}
        {result.triggers.length > 0 && (
          <Section delay={0.24}>
            <Label>O que ativa isso</Label>
            <ul className="mt-2 space-y-1.5">
              {result.triggers.map((t, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="mt-2 w-1 h-1 rounded-full bg-muted-foreground/30 shrink-0" />
                  <p className="text-sm text-muted-foreground leading-[1.7]">{t}</p>
                </li>
              ))}
            </ul>
          </Section>
        )}

        {/* Mental traps — compact */}
        {result.mentalTraps.length > 0 && (
          <Section delay={0.26}>
            <Label>Frases que te prendem</Label>
            <div className="mt-2 flex flex-wrap gap-2">
              {result.mentalTraps.map((trap, i) => (
                <span key={i} className="text-xs italic bg-secondary/50 border border-border/20 rounded-lg px-3 py-2 text-muted-foreground leading-relaxed">
                  "{trap}"
                </span>
              ))}
            </div>
          </Section>
        )}

        {/* Contradiction — inline */}
        <Section delay={0.28}>
          <Label>Contradição</Label>
          <p className="text-sm text-foreground/70 leading-[1.7] mt-2">{result.contradiction}</p>
        </Section>

        <Divider />

        {/* ═══════════════════════════════════════ */}
        {/* BLOCO 3 — O QUE FAZER */}
        {/* ═══════════════════════════════════════ */}
        <BlockHeader num={3} title="O que fazer" delay={0.3} />

        {/* Key unlock */}
        <Section delay={0.32}>
          <CalloutBox color="primary">
            <p className="text-xs text-muted-foreground/60 mb-1">Comece por aqui</p>
            <p className="text-sm text-foreground leading-[1.7]">{result.keyUnlockArea}</p>
          </CalloutBox>
        </Section>

        {/* Exit strategy */}
        {result.exitStrategy.length > 0 && (
          <Section delay={0.34}>
            <Label>Passos práticos</Label>
            <div className="mt-3 space-y-3">
              {result.exitStrategy.map((step) => (
                <div key={step.step} className="flex gap-3">
                  <span className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-semibold text-primary shrink-0 mt-0.5">
                    {step.step}
                  </span>
                  <div>
                    <p className="text-sm font-medium text-foreground">{step.title}</p>
                    <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">{step.action}</p>
                  </div>
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* What NOT to do */}
        {result.whatNotToDo.length > 0 && (
          <Section delay={0.36}>
            <Label>Pare de fazer</Label>
            <div className="mt-2 space-y-1.5">
              {result.whatNotToDo.map((item, i) => (
                <div key={i} className="flex items-start gap-2 py-1">
                  <span className="text-destructive/50 text-xs mt-0.5 shrink-0">✗</span>
                  <p className="text-sm text-muted-foreground leading-[1.7]">{item}</p>
                </div>
              ))}
            </div>
          </Section>
        )}

        <Divider />

        {/* ═══════════════════════════════════════ */}
        {/* MAPA DE INTENSIDADE */}
        {/* ═══════════════════════════════════════ */}
        <Section delay={0.4}>
          <Label>Intensidade por eixo</Label>
          <div className="mt-4 space-y-3">
            {result.allScores.slice(0, 8).map((score) => {
              const barColor = score.percentage > 65 ? 'bg-destructive/70' : score.percentage >= 40 ? 'bg-yellow-500/70' : 'bg-green-500/70';
              return (
                <div key={score.key}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-muted-foreground">{score.label}</span>
                    <span className="text-muted-foreground/50 tabular-nums">{score.percentage}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-border/40 overflow-hidden">
                    <motion.div
                      className={`h-full rounded-full ${barColor}`}
                      initial={{ width: 0 }}
                      animate={{ width: `${score.percentage}%` }}
                      transition={{ duration: 0.6, delay: 0.5, ease: 'easeOut' }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </Section>

        {/* Secondary patterns — brief */}
        {result.secondaryPatterns.length > 0 && (
          <Section delay={0.44}>
            <Label>Também presente</Label>
            <div className="mt-2 space-y-2">
              {result.secondaryPatterns.map((p) => (
                <div key={p.key} className="border-l-2 border-border/40 pl-3">
                  <p className="text-sm font-medium text-foreground">{p.label}</p>
                  <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">{p.description}</p>
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* ── Footer ── */}
        <div className="mt-16 space-y-6">
          <div className="w-8 h-px bg-border mx-auto" />
          <p className="text-[10px] text-muted-foreground/30 text-center font-light leading-relaxed max-w-sm mx-auto">
            Leitura comportamental baseada em suas respostas. Não substitui avaliação profissional.
          </p>
          <motion.div {...fadeUp} transition={{ delay: 0.5, duration: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-3 pb-12"
          >
            <button
              onClick={handleDownloadPdf}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:brightness-90 transition-all active:scale-[0.97]"
            >
              <Download className="w-4 h-4" />
              Baixar PDF
            </button>
            <button
              onClick={onRestart}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors px-4 py-2 rounded-lg hover:bg-secondary/50"
            >
              Ir para o Dashboard
            </button>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

/* ── Sub-components ── */

function BlockHeader({ num, title, delay = 0 }: { num: number; title: string; delay?: number }) {
  return (
    <motion.div {...fadeUp} transition={{ delay, duration: 0.35 }} className="flex items-center gap-2.5 mb-6 mt-2">
      <span className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center text-[11px] font-bold text-primary">
        {num}
      </span>
      <h2 className="text-base font-semibold text-foreground tracking-tight">{title}</h2>
    </motion.div>
  );
}

function Section({ delay = 0, children }: { delay?: number; children: React.ReactNode }) {
  return (
    <motion.div {...fadeUp} transition={{ delay, duration: 0.35 }} className="mb-6">
      {children}
    </motion.div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] text-muted-foreground/50 uppercase tracking-[0.2em] font-medium">
      {children}
    </p>
  );
}

function CalloutBox({ color, children }: { color: 'primary' | 'destructive'; children: React.ReactNode }) {
  const styles = color === 'destructive'
    ? 'border-destructive/15 bg-destructive/[0.03]'
    : 'border-primary/15 bg-primary/[0.03]';
  return (
    <div className={`border rounded-xl px-4 py-3 ${styles}`}>
      {children}
    </div>
  );
}

function Divider() {
  return <div className="w-full h-px bg-border/40 my-10" />;
}

export default Report;
