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

const fade = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
};

const Report = ({ result, onRestart, moduleSlug }: ReportProps) => {
  const info = intensityConfig[result.intensity];
  const { profile } = useAuth();

  // Extract new-format fields with fallbacks to old fields
  const ai = (result as any);
  const resumo = ai.resumoPrincipal || result.criticalDiagnosis;
  const significado = ai.significadoPratico || result.corePain;
  const padrao = ai.padraoIdentificado || result.mechanism;
  const comoAparece = ai.comoAparece || result.mentalState;
  const gatilhos = ai.gatilhos || result.triggers;
  const impactoVida = ai.impactoVida || result.lifeImpact?.map((l: any) => ({ area: l.pillar, efeito: l.impact }));
  const direcao = ai.direcaoAjuste || result.keyUnlockArea;
  const oQueEvitar = ai.oQueEvitar || result.whatNotToDo;
  const proximo = ai.proximoPasso || (result.exitStrategy?.[0]?.action) || result.direction;

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

        {/* Header */}
        <motion.header {...fade} transition={{ duration: 0.4 }} className="mb-12">
          <p className="text-[10px] text-muted-foreground/40 uppercase tracking-[0.25em] font-light mb-3">
            Sua leitura
          </p>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-foreground leading-snug">
            {result.combinedTitle}
          </h1>
          <div className="flex items-center gap-2 mt-3">
            <span className={`w-2 h-2 rounded-full ${info.bg}`} />
            <span className={`text-xs font-medium ${info.color}`}>
              Intensidade {info.label.toLowerCase()}
            </span>
          </div>
        </motion.header>

        <div className="space-y-10">

          {/* 1. Resumo principal */}
          <Block num={1} title="Resumo principal" delay={0.05}>
            <Callout>
              <p className="text-sm text-foreground leading-[1.7]">{resumo}</p>
            </Callout>
          </Block>

          {/* Blind spot (if available) */}
          {result.interpretation?.blindSpot?.realProblem && (
            <motion.div {...fade} transition={{ delay: 0.07 }} className="mb-2">
              <div className="bg-secondary/30 border border-border/20 rounded-xl px-4 py-3">
                <p className="text-[10px] text-muted-foreground/50 uppercase tracking-widest mb-2">Ponto cego</p>
                <p className="text-xs text-muted-foreground italic mb-1.5">
                  O que você acredita: {result.interpretation.blindSpot.perceivedProblem}
                </p>
                <div className="flex items-start gap-1.5">
                  <ChevronRight className="w-3 h-3 text-destructive/50 mt-0.5 shrink-0" />
                  <p className="text-sm text-foreground leading-[1.7]">
                    {result.interpretation.blindSpot.realProblem}
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          {/* 2. O que isso significa na prática */}
          <Block num={2} title="O que isso significa na prática" delay={0.1}>
            <p className="text-sm text-foreground/80 leading-[1.7]">{significado}</p>
          </Block>

          {/* 3. Padrão identificado */}
          <Block num={3} title="Padrão identificado" delay={0.14}>
            {result.interpretation?.behavioralProfile && (
              <div className="bg-secondary/40 border border-border/30 rounded-xl px-4 py-3 mb-3">
                <p className="text-sm font-semibold text-foreground">
                  {result.interpretation.behavioralProfile.name}
                </p>
              </div>
            )}
            <p className="text-sm text-muted-foreground leading-[1.7]">{padrao}</p>
          </Block>

          {/* 4. Como isso aparece no dia a dia */}
          <Block num={4} title="Como aparece no dia a dia" delay={0.18}>
            <p className="text-sm text-muted-foreground leading-[1.7]">{comoAparece}</p>
            {result.selfSabotageCycle?.length > 0 && (
              <div className="mt-3 space-y-1">
                {result.selfSabotageCycle.map((step, i) => (
                  <div key={i} className="flex items-start gap-2 py-1">
                    <span className="w-4 h-4 rounded-full bg-secondary border border-border/40 flex items-center justify-center text-[9px] font-medium text-muted-foreground shrink-0 mt-0.5">
                      {i + 1}
                    </span>
                    <p className="text-xs text-muted-foreground leading-relaxed">{step}</p>
                  </div>
                ))}
              </div>
            )}
          </Block>

          {/* 5. Gatilhos principais */}
          {gatilhos?.length > 0 && (
            <Block num={5} title="Gatilhos principais" delay={0.22}>
              <ul className="space-y-1.5">
                {gatilhos.map((t: string, i: number) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="mt-2 w-1 h-1 rounded-full bg-destructive/40 shrink-0" />
                    <p className="text-sm text-muted-foreground leading-[1.7]">{t}</p>
                  </li>
                ))}
              </ul>
            </Block>
          )}

          {/* 6. Impacto nas áreas da vida */}
          {impactoVida?.length > 0 && (
            <Block num={6} title="Impacto nas áreas da vida" delay={0.26}>
              <div className="space-y-2">
                {impactoVida.map((item: any, i: number) => (
                  <div key={i} className="border-l-2 border-border/40 pl-3 py-1">
                    <p className="text-[10px] text-muted-foreground/50 uppercase tracking-widest">{item.area || item.pillar}</p>
                    <p className="text-sm text-muted-foreground leading-[1.7] mt-0.5">{item.efeito || item.impact}</p>
                  </div>
                ))}
              </div>
            </Block>
          )}

          {/* 7. Primeira direção de ajuste */}
          <Block num={7} title="Primeira direção de ajuste" delay={0.3}>
            <Callout color="primary">
              <p className="text-sm text-foreground leading-[1.7]">{direcao}</p>
            </Callout>
          </Block>

          {/* 8. O que evitar agora */}
          {oQueEvitar?.length > 0 && (
            <Block num={8} title="O que evitar agora" delay={0.34}>
              <div className="space-y-1.5">
                {oQueEvitar.map((item: string, i: number) => (
                  <div key={i} className="flex items-start gap-2 py-1">
                    <span className="text-destructive/50 text-xs mt-0.5 shrink-0">✗</span>
                    <p className="text-sm text-muted-foreground leading-[1.7]">{item}</p>
                  </div>
                ))}
              </div>
            </Block>
          )}

          {/* 9. Próximo passo simples */}
          <Block num={9} title="Próximo passo simples" delay={0.38}>
            <div className="bg-primary/[0.04] border border-primary/15 rounded-xl px-4 py-4">
              <p className="text-sm font-medium text-foreground leading-[1.7]">{proximo}</p>
            </div>
          </Block>

          {/* Intensity map */}
          <motion.div {...fade} transition={{ delay: 0.42 }}>
            <p className="text-[10px] text-muted-foreground/50 uppercase tracking-[0.2em] font-medium mb-4">
              Intensidade por eixo
            </p>
            <div className="space-y-3">
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
          </motion.div>
        </div>

        {/* Footer */}
        <div className="mt-14 space-y-5">
          <div className="w-8 h-px bg-border mx-auto" />
          <p className="text-[10px] text-muted-foreground/30 text-center font-light leading-relaxed max-w-sm mx-auto">
            Leitura comportamental baseada em suas respostas. Não substitui avaliação profissional.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pb-10">
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
          </div>
        </div>
      </div>
    </div>
  );
};

/* ── Sub-components ── */

function Block({ num, title, delay = 0, children }: { num: number; title: string; delay?: number; children: React.ReactNode }) {
  return (
    <motion.section {...fade} transition={{ delay, duration: 0.35 }}>
      <div className="flex items-center gap-2 mb-3">
        <span className="w-5 h-5 rounded-md bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary">
          {num}
        </span>
        <h2 className="text-sm font-semibold text-foreground tracking-tight">{title}</h2>
      </div>
      {children}
    </motion.section>
  );
}

function Callout({ color = 'destructive', children }: { color?: 'primary' | 'destructive'; children: React.ReactNode }) {
  const s = color === 'destructive'
    ? 'border-destructive/15 bg-destructive/[0.03]'
    : 'border-primary/15 bg-primary/[0.03]';
  return <div className={`border rounded-xl px-4 py-3 ${s}`}>{children}</div>;
}

export default Report;
