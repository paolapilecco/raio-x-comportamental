import { motion } from 'framer-motion';
import { DiagnosticResult } from '@/types/diagnostic';
import { Download, ChevronRight, TrendingUp, TrendingDown, AlertTriangle, Calendar } from 'lucide-react';
import { generateLifeMapPdf } from '@/lib/generateLifeMapPdf';
import { useAuth } from '@/contexts/AuthContext';

interface Props {
  result: DiagnosticResult;
  onRestart: () => void;
}

const fade = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
};

interface AreaScore {
  key: string;
  label: string;
  score: number;
  percentage: number;
}

function getAreaColor(pct: number): { bar: string; text: string; bg: string; dot: string } {
  if (pct >= 70) return { bar: 'bg-green-500/70', text: 'text-green-600', bg: 'bg-green-500/[0.06]', dot: 'bg-green-500' };
  if (pct >= 40) return { bar: 'bg-yellow-500/70', text: 'text-yellow-600', bg: 'bg-yellow-500/[0.06]', dot: 'bg-yellow-500' };
  return { bar: 'bg-destructive/70', text: 'text-destructive', bg: 'bg-destructive/[0.06]', dot: 'bg-destructive' };
}

function getPhaseLabel(avgPct: number): string {
  if (avgPct >= 75) return 'Fase de consolidação — sua vida tem uma base estável, mas há pontos que precisam de atenção antes de avançar.';
  if (avgPct >= 50) return 'Fase de ajuste — algumas áreas estão funcionando, mas o desequilíbrio entre elas gera desgaste e impede evolução real.';
  if (avgPct >= 30) return 'Fase de reconstrução — várias áreas precisam de atenção urgente. O foco agora é estabilizar o que está mais frágil.';
  return 'Fase crítica — o desequilíbrio é generalizado. Priorize 1-2 áreas e concentre toda energia nelas antes de expandir.';
}

const LifeMapReport = ({ result, onRestart }: Props) => {
  const { profile } = useAuth();
  const ai = result as any;

  const areas: AreaScore[] = (result.allScores || []).map(s => ({
    key: s.key,
    label: s.label,
    score: s.score,
    percentage: Math.min(100, s.percentage),
  }));

  const sorted = [...areas].sort((a, b) => b.percentage - a.percentage);
  const strongest = sorted.filter(a => a.percentage >= 70).slice(0, 3);
  const weakest = sorted.filter(a => a.percentage < 50).sort((a, b) => a.percentage - b.percentage).slice(0, 3);
  const avgPct = areas.length > 0 ? Math.round(areas.reduce((s, a) => s + a.percentage, 0) / areas.length) : 0;

  // Gap between highest and lowest
  const maxArea = sorted[0];
  const minArea = sorted[sorted.length - 1];
  const gap = maxArea && minArea ? maxArea.percentage - minArea.percentage : 0;

  // AI-generated content with fallbacks
  const visaoGeral = ai.chamaAtencao || ai.resumoPrincipal || result.criticalDiagnosis || '';
  const oQueRevela = ai.comoAtrapalha || ai.significadoPratico || getPhaseLabel(avgPct);
  const planoAcao: { area: string; acao: string }[] = ai.planoAcaoPorArea || 
    ai.impactoPorArea?.map((i: any) => ({ area: i.area, acao: i.efeito })) ||
    result.lifeImpact?.map(l => ({ area: l.pillar, acao: l.impact })) || [];
  const acaoInicial = ai.acaoInicial || ai.proximoPasso || result.direction || '';

  const handleDownloadPdf = () => {
    generateLifeMapPdf(result.allScores, profile?.name);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-xl mx-auto px-5 md:px-8 py-12 md:py-20">

        {/* Header */}
        <motion.header {...fade} transition={{ duration: 0.4 }} className="mb-12">
          <p className="text-[10px] text-muted-foreground/40 uppercase tracking-[0.25em] font-light mb-3">
            Seu mapa de vida
          </p>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-foreground leading-snug">
            {result.combinedTitle || 'Visão geral da sua vida hoje'}
          </h1>
          <div className="flex items-center gap-3 mt-3">
            <span className="text-xs text-muted-foreground/60">Média geral:</span>
            <span className={`text-sm font-semibold ${avgPct >= 70 ? 'text-green-600' : avgPct >= 40 ? 'text-yellow-600' : 'text-destructive'}`}>
              {avgPct}%
            </span>
            {gap > 30 && (
              <span className="flex items-center gap-1 text-[10px] text-amber-600 bg-amber-500/10 px-2 py-0.5 rounded-full">
                <AlertTriangle className="w-3 h-3" />
                Desequilíbrio de {gap}pts
              </span>
            )}
          </div>
        </motion.header>

        {/* 1. Visão geral — all areas as bars */}
        <motion.section {...fade} transition={{ delay: 0.1 }} className="mb-12">
          <SectionHeader num={1} title="Visão geral da sua vida hoje" />
          <div className="space-y-3 mt-4">
            {sorted.map((area) => {
              const color = getAreaColor(area.percentage);
              return (
                <div key={area.key}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-muted-foreground">{area.label}</span>
                    <span className={`tabular-nums font-medium ${color.text}`}>{area.percentage}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-border/40 overflow-hidden">
                    <motion.div
                      className={`h-full rounded-full ${color.bar}`}
                      initial={{ width: 0 }}
                      animate={{ width: `${area.percentage}%` }}
                      transition={{ duration: 0.6, delay: 0.15, ease: 'easeOut' }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          {visaoGeral && (
            <p className="text-sm text-muted-foreground leading-[1.7] mt-4">{visaoGeral}</p>
          )}
        </motion.section>

        {/* 2. Áreas mais fortes */}
        {strongest.length > 0 && (
          <motion.section {...fade} transition={{ delay: 0.15 }} className="mb-10">
            <SectionHeader num={2} title="Áreas mais fortes" />
            <div className="space-y-2 mt-4">
              {strongest.map((area) => (
                <div key={area.key} className="flex items-center gap-3 bg-green-500/[0.04] border border-green-500/15 rounded-xl px-4 py-3">
                  <TrendingUp className="w-4 h-4 text-green-600 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{area.label}</p>
                  </div>
                  <span className="text-sm font-semibold text-green-600 tabular-nums">{area.percentage}%</span>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground/60 mt-3 leading-relaxed">
              Essas áreas são seus pontos de apoio. Não negligencie o que já funciona.
            </p>
          </motion.section>
        )}

        {/* 3. Áreas mais frágeis */}
        {weakest.length > 0 && (
          <motion.section {...fade} transition={{ delay: 0.2 }} className="mb-10">
            <SectionHeader num={3} title="Áreas mais frágeis" />
            <div className="space-y-2 mt-4">
              {weakest.map((area) => {
                const color = getAreaColor(area.percentage);
                return (
                  <div key={area.key} className={`flex items-center gap-3 ${color.bg} border border-destructive/15 rounded-xl px-4 py-3`}>
                    <TrendingDown className="w-4 h-4 text-destructive shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">{area.label}</p>
                    </div>
                    <span className={`text-sm font-semibold ${color.text} tabular-nums`}>{area.percentage}%</span>
                  </div>
                );
              })}
            </div>
            <p className="text-xs text-muted-foreground/60 mt-3 leading-relaxed">
              Essas áreas pedem atenção agora. Priorize a que mais impacta seu dia a dia.
            </p>
          </motion.section>
        )}

        {/* 4. O que está mais desequilibrado */}
        <motion.section {...fade} transition={{ delay: 0.25 }} className="mb-10">
          <SectionHeader num={4} title="O que está mais desequilibrado" />
          <div className="border border-amber-500/20 bg-amber-500/[0.04] rounded-xl px-4 py-4 mt-4">
            {gap > 30 ? (
              <>
                <p className="text-sm text-foreground leading-[1.7]">
                  A diferença entre sua área mais forte ({maxArea?.label}, {maxArea?.percentage}%) e mais frágil ({minArea?.label}, {minArea?.percentage}%) é de <strong>{gap} pontos</strong>.
                </p>
                <p className="text-xs text-muted-foreground/70 mt-2 leading-relaxed">
                  Isso indica que você investe muita energia em algumas áreas e negligencia outras. O resultado é cansaço mesmo quando há progresso.
                </p>
              </>
            ) : (
              <p className="text-sm text-foreground leading-[1.7]">
                Suas áreas estão relativamente equilibradas (diferença de {gap} pontos). O desafio é elevar as que estão abaixo de 70% sem perder o que já funciona.
              </p>
            )}
          </div>
        </motion.section>

        {/* 5. O que isso revela sobre sua fase atual */}
        <motion.section {...fade} transition={{ delay: 0.3 }} className="mb-10">
          <SectionHeader num={5} title="O que isso revela sobre sua fase atual" />
          <div className="border border-border/30 rounded-xl px-4 py-4 mt-4">
            <p className="text-sm text-foreground leading-[1.7]">{oQueRevela}</p>
          </div>
        </motion.section>

        {/* 6. Plano de ação por área */}
        <motion.section {...fade} transition={{ delay: 0.35 }} className="mb-10">
          <SectionHeader num={6} title="Plano de ação por área" />
          {planoAcao.length > 0 ? (
            <div className="space-y-2 mt-4">
              {planoAcao.map((item, i) => (
                <div key={i} className="border border-border/30 rounded-xl px-4 py-3">
                  <p className="text-[9px] text-muted-foreground/50 uppercase tracking-widest mb-1">{item.area}</p>
                  <div className="flex items-start gap-2">
                    <ChevronRight className="w-3 h-3 text-primary/50 mt-1 shrink-0" />
                    <p className="text-sm text-foreground/80 leading-snug">{item.acao}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : weakest.length > 0 ? (
            <div className="space-y-2 mt-4">
              {weakest.map((area) => (
                <div key={area.key} className="border border-border/30 rounded-xl px-4 py-3">
                  <p className="text-[9px] text-muted-foreground/50 uppercase tracking-widest mb-1">{area.label}</p>
                  <div className="flex items-start gap-2">
                    <ChevronRight className="w-3 h-3 text-primary/50 mt-1 shrink-0" />
                    <p className="text-sm text-foreground/80 leading-snug">
                      Dedique 15 minutos por dia a essa área nos próximos 7 dias. Escolha uma ação simples e repita.
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground mt-4">
              {acaoInicial || 'Continue mantendo as áreas equilibradas e observe onde surgem novas necessidades.'}
            </p>
          )}
        </motion.section>

        {/* 7. Revisão em 60 dias */}
        <motion.section {...fade} transition={{ delay: 0.4 }} className="mb-10">
          <SectionHeader num={7} title="Revisão em 60 dias" />
          <div className="bg-primary/[0.04] border border-primary/15 rounded-xl px-4 py-4 mt-4">
            <div className="flex items-start gap-3">
              <Calendar className="w-5 h-5 text-primary/60 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-foreground mb-1">
                  Refaça este teste em {new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' })}
                </p>
                <p className="text-xs text-muted-foreground/70 leading-relaxed">
                  Você poderá comparar os resultados e ver visualmente quais áreas evoluíram. O PDF de comparação mostrará seu progresso real.
                </p>
              </div>
            </div>
          </div>
        </motion.section>

        {/* Footer */}
        <div className="mt-14 space-y-5">
          <div className="w-8 h-px bg-border mx-auto" />
          <p className="text-[10px] text-muted-foreground/30 text-center font-light leading-relaxed max-w-sm mx-auto">
            Análise baseada em suas respostas. Não substitui orientação profissional.
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

function SectionHeader({ num, title }: { num: number; title: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-5 h-5 rounded-md bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary">
        {num}
      </span>
      <h2 className="text-sm font-semibold text-foreground tracking-tight">{title}</h2>
    </div>
  );
}

export default LifeMapReport;
