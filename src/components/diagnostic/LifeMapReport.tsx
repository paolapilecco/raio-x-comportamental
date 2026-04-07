import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { DiagnosticResult } from '@/types/diagnostic';
import { Download, TrendingUp, TrendingDown, AlertTriangle, Calendar, CheckCircle2, BarChart3, ArrowRight } from 'lucide-react';
import { generateLifeMapPdf } from '@/lib/generateLifeMapPdf';
import { useAuth } from '@/contexts/AuthContext';
import { generateAreaActions } from '@/lib/lifeMapActions';
import { supabase } from '@/integrations/supabase/client';
import { LifeMapComparison } from './LifeMapComparison';

interface Props {
  result: DiagnosticResult;
  onRestart: () => void;
}

const fade = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
};

interface AreaScore {
  key: string;
  label: string;
  score: number;
  percentage: number;
}

function getAreaColor(pct: number) {
  if (pct >= 70) return { bar: 'bg-green-500/70', text: 'text-green-600', bg: 'bg-green-500/[0.06]', dot: 'bg-green-500', ring: 'ring-green-500/20' };
  if (pct >= 40) return { bar: 'bg-yellow-500/70', text: 'text-yellow-600', bg: 'bg-yellow-500/[0.06]', dot: 'bg-yellow-500', ring: 'ring-yellow-500/20' };
  return { bar: 'bg-destructive/70', text: 'text-destructive', bg: 'bg-destructive/[0.06]', dot: 'bg-destructive', ring: 'ring-destructive/20' };
}

function getPhaseLabel(avgPct: number): string {
  if (avgPct >= 75) return 'Fase de consolidação — sua vida tem uma base estável, mas há pontos que precisam de atenção antes de avançar.';
  if (avgPct >= 50) return 'Fase de ajuste — algumas áreas estão funcionando, mas o desequilíbrio entre elas gera desgaste e impede evolução real.';
  if (avgPct >= 30) return 'Fase de reconstrução — várias áreas precisam de atenção urgente. O foco agora é estabilizar o que está mais frágil.';
  return 'Fase crítica — o desequilíbrio é generalizado. Priorize 1-2 áreas e concentre toda energia nelas antes de expandir.';
}

const LifeMapReport = ({ result, onRestart }: Props) => {
  const { profile, user } = useAuth();
  const ai = result as any;

  const [previousScores, setPreviousScores] = useState<{ scores: any[]; date: string } | null>(null);

  useEffect(() => {
    if (!user?.id) return;
    const fetchPrevious = async () => {
      try {
        const { data: mod } = await supabase
          .from('test_modules')
          .select('id')
          .eq('slug', 'mapa-de-vida')
          .single();
        if (!mod) return;

        const { data: sessions } = await supabase
          .from('diagnostic_sessions')
          .select('id, completed_at')
          .eq('user_id', user.id)
          .eq('test_module_id', mod.id)
          .not('completed_at', 'is', null)
          .order('completed_at', { ascending: false })
          .limit(2);

        if (!sessions || sessions.length < 2) return;

        const prevSession = sessions[1];
        const { data: prevResult } = await supabase
          .from('diagnostic_results')
          .select('all_scores, created_at')
          .eq('session_id', prevSession.id)
          .single();

        if (prevResult?.all_scores) {
          setPreviousScores({
            scores: prevResult.all_scores as any[],
            date: prevResult.created_at,
          });
        }
      } catch (err) {
        console.warn('[LifeMap] Could not fetch previous results:', err);
      }
    };
    fetchPrevious();
  }, [user?.id]);

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

  const maxArea = sorted[0];
  const minArea = sorted[sorted.length - 1];
  const gap = maxArea && minArea ? maxArea.percentage - minArea.percentage : 0;

  const visaoGeral = ai.chamaAtencao || ai.resumoPrincipal || result.criticalDiagnosis || '';
  const oQueRevela = ai.comoAtrapalha || ai.significadoPratico || getPhaseLabel(avgPct);
  const acaoInicial = ai.acaoInicial || ai.proximoPasso || result.direction || '';

  const areasNeedingAction = sorted.filter(a => a.percentage < 70);
  const actionPlanByArea = areasNeedingAction.map(area => ({
    area: area.label,
    percentage: area.percentage,
    actions: (ai.planoAcaoPorArea?.find((p: any) => p.area === area.label)?.acoes as string[])
      || generateAreaActions(area.key, area.percentage),
  }));

  const handleDownloadPdf = () => {
    generateLifeMapPdf(result.allScores, profile?.name);
  };

  const avgColor = getAreaColor(avgPct);

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-xl mx-auto px-5 md:px-8 py-12 md:py-20">

        {/* ── Header ── */}
        <motion.header {...fade} transition={{ duration: 0.5 }} className="mb-10">
          <p className="text-[10px] text-muted-foreground/40 uppercase tracking-[0.3em] font-light mb-4">
            Seu mapa de vida
          </p>
          <h1 className="text-[1.65rem] md:text-3xl font-bold tracking-tight text-foreground leading-[1.25]">
            {result.combinedTitle || 'Visão geral da sua vida hoje'}
          </h1>
          <div className="flex items-center gap-3 mt-4">
            <div className="flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full ${avgColor.dot} ring-4 ${avgColor.ring}`} />
              <span className={`text-sm font-bold ${avgColor.text}`}>{avgPct}%</span>
              <span className="text-xs text-muted-foreground/50">média geral</span>
            </div>
            {gap > 30 && (
              <span className="flex items-center gap-1.5 text-[10px] font-semibold text-amber-600 bg-amber-500/10 px-2.5 py-1 rounded-full">
                <AlertTriangle className="w-3 h-3" />
                Desequilíbrio de {gap}pts
              </span>
            )}
          </div>
        </motion.header>

        <div className="space-y-14">

          {/* 1. Visão geral — bars */}
          <SectionBlock num={1} title="Visão geral da sua vida" delay={0.08}>
            <div className="bg-card border border-border/40 rounded-2xl px-5 py-5 shadow-sm space-y-4">
              {sorted.map((area) => {
                const color = getAreaColor(area.percentage);
                return (
                  <div key={area.key}>
                    <div className="flex justify-between text-xs mb-1.5">
                      <span className="text-muted-foreground font-medium">{area.label}</span>
                      <span className={`tabular-nums font-bold ${color.text}`}>{area.percentage}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-border/30 overflow-hidden">
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
              <p className="text-sm text-muted-foreground leading-[1.8] mt-5">{visaoGeral}</p>
            )}
          </SectionBlock>

          {/* 2. Áreas mais fortes */}
          {strongest.length > 0 && (
            <SectionBlock num={2} title="Áreas mais fortes" delay={0.14} accent="green">
              <div className="space-y-2.5">
                {strongest.map((area) => (
                  <div key={area.key} className="flex items-center gap-3 bg-green-500/[0.05] border border-green-500/15 rounded-xl px-4 py-3.5">
                    <TrendingUp className="w-4 h-4 text-green-600 shrink-0" />
                    <p className="text-sm font-semibold text-foreground flex-1">{area.label}</p>
                    <span className="text-sm font-bold text-green-600 tabular-nums">{area.percentage}%</span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground/50 mt-3.5 leading-relaxed">
                Essas áreas são seus pontos de apoio. Não negligencie o que já funciona.
              </p>
            </SectionBlock>
          )}

          {/* 3. Áreas mais frágeis */}
          {weakest.length > 0 && (
            <SectionBlock num={3} title="Áreas mais frágeis" delay={0.18} accent="destructive">
              <div className="space-y-2.5">
                {weakest.map((area) => {
                  const color = getAreaColor(area.percentage);
                  return (
                    <div key={area.key} className={`flex items-center gap-3 ${color.bg} border border-destructive/15 rounded-xl px-4 py-3.5`}>
                      <TrendingDown className="w-4 h-4 text-destructive shrink-0" />
                      <p className="text-sm font-semibold text-foreground flex-1">{area.label}</p>
                      <span className={`text-sm font-bold ${color.text} tabular-nums`}>{area.percentage}%</span>
                    </div>
                  );
                })}
              </div>
              <p className="text-xs text-muted-foreground/50 mt-3.5 leading-relaxed">
                Essas áreas pedem atenção agora. Priorize a que mais impacta seu dia a dia.
              </p>
            </SectionBlock>
          )}

          {/* 4. Desequilíbrio */}
          <SectionBlock num={4} title="O que está desequilibrado" delay={0.22} accent="amber">
            <div className="border border-amber-500/20 bg-amber-500/[0.04] rounded-xl px-5 py-4">
              {gap > 30 ? (
                <>
                  <p className="text-sm text-foreground leading-[1.8]">
                    A diferença entre <strong>{maxArea?.label}</strong> ({maxArea?.percentage}%) e <strong>{minArea?.label}</strong> ({minArea?.percentage}%) é de <strong>{gap} pontos</strong>.
                  </p>
                  <p className="text-xs text-muted-foreground/60 mt-2.5 leading-relaxed">
                    Isso indica energia concentrada em poucas áreas, gerando cansaço mesmo com progresso.
                  </p>
                </>
              ) : (
                <p className="text-sm text-foreground leading-[1.8]">
                  Suas áreas estão relativamente equilibradas (diferença de {gap} pontos). O desafio é elevar as que estão abaixo de 70%.
                </p>
              )}
            </div>
          </SectionBlock>

          {/* 5. Fase atual */}
          <SectionBlock num={5} title="Sua fase atual" delay={0.26}>
            <div className="border border-border/40 bg-card rounded-xl px-5 py-4 shadow-sm">
              <p className="text-sm text-foreground leading-[1.8]">{oQueRevela}</p>
            </div>
          </SectionBlock>

          {/* 6. Plano de ação */}
          <SectionBlock num={6} title="Plano de ação por área" delay={0.3} accent="primary">
            <p className="text-xs text-muted-foreground/50 mb-5 leading-relaxed">
              {areasNeedingAction.length > 0
                ? `${areasNeedingAction.length} área${areasNeedingAction.length > 1 ? 's' : ''} abaixo de 70% — cada uma com 3 ações para os próximos 60 dias.`
                : 'Todas as áreas estão acima de 70%. Continue mantendo o equilíbrio.'}
            </p>
            {actionPlanByArea.length > 0 ? (
              <div className="space-y-4">
                {actionPlanByArea.map((item, i) => {
                  const color = getAreaColor(item.percentage);
                  return (
                    <div key={i} className="border border-border/40 rounded-xl overflow-hidden shadow-sm">
                      <div className={`flex items-center justify-between px-5 py-3 ${color.bg} border-b border-border/20`}>
                        <p className="text-xs font-bold text-foreground">{item.area}</p>
                        <span className={`text-[10px] font-bold ${color.text} tabular-nums`}>{item.percentage}%</span>
                      </div>
                      <div className="px-5 py-4 space-y-3 bg-card">
                        {item.actions.slice(0, 3).map((action, j) => (
                          <div key={j} className="flex items-start gap-3">
                            <CheckCircle2 className="w-4 h-4 text-primary/40 mt-0.5 shrink-0" />
                            <p className="text-sm text-foreground/80 leading-[1.7]">{action}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                {acaoInicial || 'Continue mantendo as áreas equilibradas e observe novas necessidades.'}
              </p>
            )}
          </SectionBlock>

          {/* Comparison */}
          {previousScores && (() => {
            const comparisons = areas.map(area => {
              const prev = (previousScores.scores as any[]).find(
                (s: any) => s.key === area.key
              );
              const prevPct = prev ? Math.min(100, prev.percentage || 0) : 0;
              return {
                key: area.key,
                label: area.label,
                previous: prevPct,
                current: area.percentage,
                diff: area.percentage - prevPct,
              };
            });
            return (
              <LifeMapComparison
                comparisons={comparisons}
                previousDate={previousScores.date}
              />
            );
          })()}

          {/* 7. Revisão em 60 dias */}
          <SectionBlock num={7} title="Revisão em 60 dias" delay={0.36}>
            <div className="bg-primary/[0.04] border border-primary/15 rounded-xl px-5 py-4">
              <div className="flex items-start gap-3">
                <Calendar className="w-5 h-5 text-primary/50 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-foreground mb-1.5">
                    Refaça em {new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' })}
                  </p>
                  <p className="text-xs text-muted-foreground/60 leading-relaxed">
                    Compare seus resultados e veja quais áreas evoluíram.
                  </p>
                </div>
              </div>
            </div>
          </SectionBlock>
        </div>

        {/* ── Footer ── */}
        <div className="mt-16 space-y-6">
          <div className="w-10 h-px bg-border/50 mx-auto" />
          <p className="text-[10px] text-muted-foreground/30 text-center font-light leading-relaxed max-w-sm mx-auto">
            Análise baseada em suas respostas. Não substitui orientação profissional.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pb-10">
            <button
              onClick={handleDownloadPdf}
              className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:brightness-90 transition-all active:scale-[0.97] shadow-sm"
            >
              <Download className="w-4 h-4" />
              Baixar PDF
            </button>
            <button
              onClick={onRestart}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors px-5 py-2.5 rounded-lg hover:bg-secondary/50"
            >
              Ir para o Dashboard
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

function SectionBlock({ num, title, delay = 0, accent, children }: { num: number; title: string; delay?: number; accent?: string; children: React.ReactNode }) {
  const accentBg = accent === 'destructive' ? 'bg-destructive/10 text-destructive'
    : accent === 'green' ? 'bg-green-500/10 text-green-600'
    : accent === 'amber' ? 'bg-amber-500/10 text-amber-600'
    : accent === 'primary' ? 'bg-primary/10 text-primary'
    : 'bg-primary/10 text-primary';

  return (
    <motion.section {...fade} transition={{ delay, duration: 0.4 }}>
      <div className="flex items-center gap-3 mb-4">
        <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-bold ${accentBg}`}>
          {num}
        </span>
        <h2 className="text-base font-bold text-foreground tracking-tight">{title}</h2>
      </div>
      {children}
    </motion.section>
  );
}

export default LifeMapReport;
