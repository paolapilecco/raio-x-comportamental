import { motion } from 'framer-motion';
import { parseActionString } from '@/lib/buildActionPreview';
import { DiagnosticResult, IntensityLevel } from '@/types/diagnostic';
import { Download, ChevronRight, ArrowRight, XCircle, CheckCircle2, TrendingDown, TrendingUp, Minus, Lock, Crown, Target, Zap, Shield } from 'lucide-react';
import { generateDiagnosticPdf, PdfEvolutionData } from '@/lib/generatePdf';
import { trackEvent } from '@/lib/trackEvent';
import { generateLifeMapPdf } from '@/lib/generateLifeMapPdf';
import { useAuth } from '@/contexts/AuthContext';
import { useAxisLabels } from '@/hooks/useAxisLabels';
import { supabase } from '@/integrations/supabase/client';
import { useState, useEffect, memo } from 'react';
import LifeMapReport from './LifeMapReport';
import { ReportGamification } from './ReportGamification';
import { DiagnosticTrustLayer } from './DiagnosticTrustLayer';
import { ActionBridge } from './ActionBridge';
import { BehavioralRadar } from './BehavioralRadar';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

interface ReportProps {
  result: DiagnosticResult;
  onRestart: () => void;
  moduleSlug?: string;
}

interface StoryboardSlot {
  key: string;
  label: string;
  format: 'prose' | 'list' | 'cards' | 'quote' | 'alert';
  maxSentences: number;
  enabled: boolean;
}

interface StoryboardAct {
  id: 'espelho' | 'confronto' | 'direcao';
  title: string;
  slots: StoryboardSlot[];
}

interface StoryboardTemplate {
  acts: StoryboardAct[];
}

interface TarefaEstrategica {
  titulo: string;
  fase: 'consciencia' | 'interrupcao' | 'consolidacao';
  padraoAlvo: string;
  objetivo: string;
  porque: string;
  comoExecutar: string;
  criterio: string;
  gatilho: string;
  acao: string;
}

const intensityConfig: Record<IntensityLevel, { label: string; color: string; bg: string; ring: string }> = {
  leve: { label: 'Leve', color: 'text-green-600', bg: 'bg-green-500', ring: 'ring-green-500/20' },
  moderado: { label: 'Moderado', color: 'text-yellow-600', bg: 'bg-yellow-500', ring: 'ring-yellow-500/20' },
  alto: { label: 'Alto', color: 'text-destructive', bg: 'bg-destructive', ring: 'ring-destructive/20' },
};

const fade = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
};

const FASE_CONFIG: Record<string, { label: string; icon: typeof Target; color: string; bg: string; border: string }> = {
  consciencia: { label: 'Consciência', icon: Target, color: 'text-blue-600', bg: 'bg-blue-500/[0.05]', border: 'border-blue-500/15' },
  interrupcao: { label: 'Interrupção', icon: Zap, color: 'text-amber-600', bg: 'bg-amber-500/[0.05]', border: 'border-amber-500/15' },
  consolidacao: { label: 'Consolidação', icon: Shield, color: 'text-green-600', bg: 'bg-green-500/[0.05]', border: 'border-green-500/15' },
};

function getHeaderTitle(slug?: string): string {
  if (!slug) return 'Sua leitura';
  if (slug.includes('execucao') || slug.includes('produtividade')) return 'Sua leitura de execução';
  if (slug.includes('emocional') || slug.includes('emocoes') || slug.includes('reatividade')) return 'Sua leitura emocional';
  if (slug.includes('relacionamento') || slug.includes('apego')) return 'Sua leitura relacional';
  if (slug.includes('autoimagem') || slug.includes('identidade')) return 'Sua leitura de autoimagem';
  if (slug.includes('dinheiro') || slug.includes('financ')) return 'Sua leitura financeira';
  if (slug.includes('oculto') || slug.includes('hidden')) return 'Seus padrões ocultos';
  if (slug.includes('proposito') || slug.includes('sentido')) return 'Sua leitura de propósito';
  if (slug === 'mapa-de-vida') return 'Seu mapa de vida';
  if (slug === 'padrao-comportamental') return 'Seu raio-x comportamental';
  return 'Sua leitura';
}

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════

const Report = ({ result, onRestart, moduleSlug }: ReportProps) => {
  const info = intensityConfig[result.intensity];
  const { profile, user } = useAuth();
  const axisLabels = useAxisLabels();
  const [storyboard, setStoryboard] = useState<StoryboardTemplate | null>(null);

  useEffect(() => {
    if (!moduleSlug || moduleSlug === 'mapa-de-vida') return;
    const fetchTemplate = async () => {
      const { data: modules } = await supabase.from('test_modules').select('id').eq('slug', moduleSlug).limit(1);
      if (!modules?.[0]) return;
      const { data: templates } = await supabase.from('report_templates').select('sections').eq('test_id', modules[0].id).limit(1);
      if (templates?.[0]?.sections) {
        const raw = templates[0].sections as any;
        if (raw?.acts && Array.isArray(raw.acts)) {
          setStoryboard({
            acts: raw.acts.map((a: any) => ({
              id: a.id,
              title: a.title,
              slots: (a.slots || []).filter((s: any) => s.enabled !== false).map((s: any) => ({
                key: s.key,
                label: s.label || s.key,
                format: s.format || 'prose',
                maxSentences: s.maxSentences ?? 2,
                enabled: s.enabled !== false,
              })),
            })),
          });
        }
      }
    };
    fetchTemplate();
  }, [moduleSlug]);

  useEffect(() => {
    if (user) {
      trackEvent({ userId: user.id, event: 'report_viewed', metadata: { moduleSlug } });
    }
  }, [user, moduleSlug]);

  if (moduleSlug === 'mapa-de-vida') {
    return <LifeMapReport result={result} onRestart={onRestart} />;
  }

  const headerTitle = getHeaderTitle(moduleSlug);
  const ai = (result as any);
  const profileName = result.interpretation?.behavioralProfile?.name || result.profileName || String(result.dominantPattern || '');
  const dominantAxisLabel = result.allScores?.[0]?.label || result.allScores?.[0]?.key || '';

  const handleDownloadPdf = async () => {
    if (moduleSlug === 'mapa-de-vida') {
      generateLifeMapPdf(result.allScores, profile?.name);
    } else {
      let extras: PdfEvolutionData | undefined;
      if (user) {
        try {
          const { data: tracking } = await supabase
            .from('action_plan_tracking')
            .select('action_text, day_number, completed')
            .eq('user_id', user.id)
            .eq('diagnostic_result_id', (result as any).id || '')
            .order('day_number');
          if (tracking && tracking.length > 0) {
            const completed = tracking.filter(t => t.completed).length;
            const sortedDays = [...tracking].sort((a: any, b: any) => a.day_number - b.day_number);
            let streak = 0;
            for (let i = sortedDays.length - 1; i >= 0; i--) {
              if ((sortedDays[i] as any).completed) streak++;
              else break;
            }
            const seen = new Set<string>();
            const uniqueTexts: string[] = [];
            for (const row of tracking) {
              if (!seen.has(row.action_text) && uniqueTexts.length < 3) {
                seen.add(row.action_text);
                uniqueTexts.push(row.action_text);
              }
            }
            extras = {
              actionPlanStatus: {
                total_days: tracking.length,
                completed_days: completed,
                execution_rate: Math.round((completed / tracking.length) * 100),
                current_streak: streak,
              },
              actionTexts: uniqueTexts,
            };
          }
        } catch { /* ignore */ }
      }
      generateDiagnosticPdf(result, profile?.name, extras);
      if (user) trackEvent({ userId: user.id, event: 'pdf_downloaded', metadata: { moduleSlug } });
    }
  };

  // ── Value resolver ──
  const resolveValue = (key: string): string | string[] | null => {
    const v = ai[key];
    if (Array.isArray(v) && v.length > 0) return v;
    if (typeof v === 'string' && v.trim()) return v;
    return null;
  };

  const hasStoryboard = storyboard && storyboard.acts.length > 0 && storyboard.acts.some(a => a.slots.length > 0);

  // Get diagnostic core if available
  const diagnosticCore = ai.diagnosticCore;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-6 md:px-10 py-16 md:py-28">

        {/* ── Header ── */}
        <motion.header {...fade} transition={{ duration: 0.6 }} className="mb-16">
          <p className="text-[10px] text-muted-foreground/35 uppercase tracking-[0.35em] font-light mb-6">
            {headerTitle}
          </p>
          <h1 className="text-2xl md:text-[2.2rem] font-serif font-bold tracking-tight text-foreground leading-[1.15] mb-6">
            {result.combinedTitle}
          </h1>
          <div className="flex items-center gap-3">
            <span className={`w-2 h-2 rounded-full ${info.bg}`} />
            <span className={`text-[11px] font-medium ${info.color} tracking-wide`}>
              Intensidade {info.label.toLowerCase()}
            </span>
          </div>
        </motion.header>

        {/* ── Diagnostic Trust Layer ── */}
        <DiagnosticTrustLayer interpretation={result.interpretation} />

        {/* ── Profile Identity ── */}
        <motion.div {...fade} transition={{ delay: 0.1, duration: 0.5 }} className="mb-20">
          <div className="border-l-[3px] border-primary/30 pl-6">
            <p className="text-[9px] text-muted-foreground/40 uppercase tracking-[0.3em] font-medium mb-3">O padrão identificado</p>
            <p className="text-lg md:text-xl font-serif font-semibold text-foreground leading-snug">{profileName}</p>
          </div>
        </motion.div>

        {/* ── Diagnostic Core Summary (when available) ── */}
        {diagnosticCore && (
          <DiagnosticCoreSummary core={diagnosticCore} />
        )}

        {/* ── 3-Act Narrative ── */}
        <div className="space-y-20">
          {hasStoryboard ? (
            <>
              {storyboard!.acts.map((act, actIdx) => {
                const enabledSlots = act.slots.filter(s => s.enabled);
                if (enabledSlots.length === 0) return null;

                return enabledSlots.map((slot, slotIdx) => {
                  const value = resolveValue(slot.key);
                  const globalDelay = 0.05 + (actIdx * 0.1) + (slotIdx * 0.04);

                  return (
                    <RenderSlot
                      key={slot.key}
                      slot={slot}
                      actId={act.id}
                      value={value}
                      ai={ai}
                      result={result}
                      delay={globalDelay}
                    />
                  );
                });
              })}

              <EvolutionComparisonSection ai={ai} />
            </>
          ) : (
            <LegacySections result={result} moduleSlug={moduleSlug} ai={ai} />
          )}

          {/* ── Strategic Tasks (tarefasEstrategicas) ── */}
          <TarefasEstrategicasSection ai={ai} result={result} dominantAxisLabel={dominantAxisLabel} profileName={profileName} />

          {/* ── Legacy Actions (backward compat) ── */}
          <ActionPreviewSection result={result} ai={ai} dominantAxisLabel={dominantAxisLabel} profileName={profileName} />

          {/* Behavioral Radar (premium clinical visual) */}
          <BehavioralRadar scores={result.allScores} />
        </div>
        {/* ── Action Bridge ── */}
        <ActionBridge
          patternLabel={dominantAxisLabel || profileName}
          onStartAction={onRestart}
        />

        <ReportGamification />

        {/* ── Footer ── */}
        <div className="mt-24 space-y-10">
          <div className="w-8 h-px bg-border/30 mx-auto" />
          <p className="text-[10px] text-muted-foreground/25 text-center font-light leading-relaxed max-w-xs mx-auto">
            Leitura comportamental baseada em suas respostas. Não substitui avaliação profissional.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pb-16">
            <button onClick={handleDownloadPdf} className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:brightness-90 transition-all active:scale-[0.97] shadow-sm">
              <Download className="w-4 h-4" /> Baixar PDF
            </button>
            <button onClick={onRestart} className="text-sm text-muted-foreground/60 hover:text-foreground transition-colors px-6 py-3 rounded-lg hover:bg-secondary/30">
              Ir para o Dashboard
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
// DIAGNOSTIC CORE SUMMARY
// ═══════════════════════════════════════════════════════════════

function DiagnosticCoreSummary({ core }: { core: any }) {
  if (!core) return null;

  return (
    <motion.div {...fade} transition={{ delay: 0.12, duration: 0.5 }} className="mb-20 space-y-5">
      {/* Main conflict */}
      {core.mainConflict && (
        <div className="rounded-2xl border border-destructive/10 bg-destructive/[0.02] px-6 py-5">
          <p className="text-[9px] text-destructive/40 uppercase tracking-[0.25em] font-medium mb-3">Conflito principal</p>
          <p className="text-[15px] text-foreground leading-[1.85]">{core.mainConflict}</p>
        </div>
      )}

      {/* Maintenance pattern */}
      {core.maintenancePattern && (
        <div className="rounded-2xl border border-border/20 bg-card/50 px-6 py-5">
          <p className="text-[9px] text-muted-foreground/40 uppercase tracking-[0.25em] font-medium mb-3">Padrão de manutenção</p>
          <p className="text-[15px] text-muted-foreground leading-[1.85]">{core.maintenancePattern}</p>
        </div>
      )}

      {/* Emotional reaction + decision making in grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {core.emotionalReactionStyle && (
          <div className="rounded-xl border border-border/25 bg-card/50 px-5 py-4">
            <p className="text-[9px] text-muted-foreground/40 uppercase tracking-[0.2em] font-medium mb-2">Reação emocional</p>
            <p className="text-sm text-foreground/80 leading-relaxed">{core.emotionalReactionStyle}</p>
          </div>
        )}
        {core.decisionMakingStyle && (
          <div className="rounded-xl border border-border/25 bg-card/50 px-5 py-4">
            <p className="text-[9px] text-muted-foreground/40 uppercase tracking-[0.2em] font-medium mb-2">Tomada de decisão</p>
            <p className="text-sm text-foreground/80 leading-relaxed">{core.decisionMakingStyle}</p>
          </div>
        )}
      </div>

      {/* Self-sabotage tendency */}
      {core.selfSabotageTendency && (
        <div className="rounded-2xl border border-amber-500/10 bg-amber-500/[0.02] px-6 py-5">
          <p className="text-[9px] text-amber-600/40 uppercase tracking-[0.25em] font-medium mb-3">Tendência de autossabotagem</p>
          <p className="text-[15px] text-foreground leading-[1.85]">{core.selfSabotageTendency}</p>
        </div>
      )}

      {/* Temperament + hidden motivation */}
      {(core.temperamentReading || core.hiddenMotivation) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {core.temperamentReading && (
            <div className="rounded-xl border border-border/25 bg-card/50 px-5 py-4">
              <p className="text-[9px] text-muted-foreground/40 uppercase tracking-[0.2em] font-medium mb-2">Leitura de temperamento</p>
              <p className="text-sm text-foreground/80 leading-relaxed">{core.temperamentReading}</p>
            </div>
          )}
          {core.hiddenMotivation && (
            <div className="rounded-xl border border-border/25 bg-card/50 px-5 py-4">
              <p className="text-[9px] text-muted-foreground/40 uppercase tracking-[0.2em] font-medium mb-2">Motivação oculta</p>
              <p className="text-sm text-foreground/80 leading-relaxed">{core.hiddenMotivation}</p>
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════════
// TAREFAS ESTRATÉGICAS (new 2-layer system)
// ═══════════════════════════════════════════════════════════════

function TarefasEstrategicasSection({ ai, result: _tarefaResult, dominantAxisLabel, profileName }: { ai: any; result: DiagnosticResult; dominantAxisLabel: string; profileName: string }) {
  const { isPremium, isSuperAdmin } = useAuth();
  const tarefas: TarefaEstrategica[] = Array.isArray(ai.tarefasEstrategicas) ? ai.tarefasEstrategicas : [];

  if (tarefas.length === 0) return null;

  const showFull = isPremium || isSuperAdmin;

  return (
    <motion.section {...fade} transition={{ delay: 0.36, duration: 0.4 }}>
      <div className="mb-6">
        <h2 className="text-lg md:text-xl font-serif font-semibold text-foreground tracking-tight">Plano estratégico de mudança</h2>
      </div>

      {(profileName || dominantAxisLabel) && (
        <div className="mb-5 rounded-xl border border-border/15 bg-secondary/20 px-5 py-4">
          <p className="text-[13px] text-muted-foreground/70 leading-relaxed italic">
            Estas ações foram derivadas diretamente do padrão <span className="font-semibold text-foreground not-italic">{profileName}</span>
            {dominantAxisLabel && <> e do eixo <span className="font-semibold text-foreground not-italic">{dominantAxisLabel}</span></>}.
          </p>
        </div>
      )}

      <div className="space-y-4">
        {tarefas.slice(0, 3).map((tarefa, i) => {
          const isLocked = !showFull && i > 0;
          const faseConfig = FASE_CONFIG[tarefa.fase] || FASE_CONFIG.consciencia;
          const FaseIcon = faseConfig.icon;

          return (
            <motion.div
              key={i}
              {...fade}
              transition={{ delay: 0.38 + (i * 0.08), duration: 0.4 }}
              className={`rounded-2xl border overflow-hidden relative ${isLocked ? 'border-border/20 bg-secondary/10' : faseConfig.border + ' ' + faseConfig.bg}`}
            >
              {/* Fase header */}
              <div className={`px-6 py-3 border-b ${isLocked ? 'border-border/10' : faseConfig.border}`}>
                <div className="flex items-center gap-2">
                  <FaseIcon className={`w-3.5 h-3.5 ${isLocked ? 'text-muted-foreground/30' : faseConfig.color}`} />
                  <span className={`text-[10px] uppercase tracking-[0.2em] font-semibold ${isLocked ? 'text-muted-foreground/30' : faseConfig.color}`}>
                    Fase {i + 1} — {faseConfig.label}
                  </span>
                </div>
              </div>

              {/* Content */}
              <div className="px-6 py-5 space-y-4">
                {/* Title + pattern */}
                <div>
                  <h3 className={`text-base font-semibold leading-snug ${isLocked ? 'text-muted-foreground/25' : 'text-foreground'}`}>
                    {isLocked ? tarefa.titulo.slice(0, 15) + '...' : tarefa.titulo}
                  </h3>
                  {!isLocked && tarefa.padraoAlvo && (
                    <p className="text-[11px] text-muted-foreground/50 mt-1">Ataca: {tarefa.padraoAlvo}</p>
                  )}
                </div>

                {!isLocked ? (
                  <>
                    {/* Objetivo */}
                    {tarefa.objetivo && (
                      <div>
                        <p className="text-[9px] text-muted-foreground/40 uppercase tracking-[0.2em] font-medium mb-1.5">Objetivo</p>
                        <p className="text-[15px] text-foreground leading-[1.85]">{tarefa.objetivo}</p>
                      </div>
                    )}

                    {/* Porque */}
                    {tarefa.porque && (
                      <div>
                        <p className="text-[9px] text-muted-foreground/40 uppercase tracking-[0.2em] font-medium mb-1.5">Por que essa tarefa existe</p>
                        <p className="text-sm text-muted-foreground leading-relaxed">{tarefa.porque}</p>
                      </div>
                    )}

                    {/* Como executar */}
                    {tarefa.comoExecutar && (
                      <div>
                        <p className="text-[9px] text-muted-foreground/40 uppercase tracking-[0.2em] font-medium mb-1.5">Como executar</p>
                        <p className="text-sm text-foreground/80 leading-relaxed">{tarefa.comoExecutar}</p>
                      </div>
                    )}

                    {/* Gatilho → Ação */}
                    <div className="rounded-xl border border-border/15 bg-card/50 px-5 py-4">
                      {tarefa.gatilho && (
                        <p className="text-xs text-muted-foreground/60 mb-1.5 leading-relaxed">
                          Quando <span className="font-semibold text-foreground">{tarefa.gatilho}</span>
                        </p>
                      )}
                      <p className="text-[15px] font-medium text-foreground leading-[1.8]">
                        → {tarefa.acao}
                      </p>
                    </div>

                    {/* Critério */}
                    {tarefa.criterio && (
                      <div className="flex items-start gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-green-600/40 mt-0.5 shrink-0" />
                        <p className="text-xs text-muted-foreground/60 leading-relaxed">
                          Critério: {tarefa.criterio}
                        </p>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="py-4">
                    <p className="text-sm text-muted-foreground/20 leading-relaxed">
                      {tarefa.objetivo?.slice(0, 40)}...
                    </p>
                  </div>
                )}
              </div>

              {/* Lock overlay */}
              {isLocked && (
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/30 to-background/70 flex items-end justify-center pb-5">
                  <Lock className="w-4 h-4 text-muted-foreground/30" />
                </div>
              )}
            </motion.div>
          );
        })}

        {/* Paywall CTA */}
        {!showFull && tarefas.length > 1 && (
          <motion.div {...fade} transition={{ delay: 0.6, duration: 0.4 }}>
            <div className="border border-destructive/15 bg-destructive/[0.02] rounded-2xl px-6 py-6 space-y-5">
              <div className="space-y-2 text-center">
                <p className="text-[15px] text-foreground font-semibold leading-snug">A Fase 1 mostra o padrão.</p>
                <p className="text-sm text-foreground/70 font-medium">As Fases 2 e 3 quebram o ciclo e instalam o novo comportamento.</p>
                <p className="text-sm text-destructive font-semibold">Sem as 3 fases, a mudança não se sustenta.</p>
              </div>
              <p className="text-[11px] text-muted-foreground/50 text-center">+32.847 mulheres já estão executando o plano completo</p>
              <div className="border-t border-destructive/8 pt-5">
                <p className="text-xs text-destructive/70 text-center font-medium leading-relaxed mb-4">
                  Se você parar na consciência, vai continuar sabendo o que está errado — e fazendo igual.
                </p>
                <button onClick={() => window.location.href = '/premium'} className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-destructive text-destructive-foreground rounded-xl text-sm font-semibold hover:brightness-90 transition-all duration-200 active:scale-[0.97] shadow-sm">
                  <Crown className="w-4 h-4" /> Desbloquear plano completo — R$9,99
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </motion.section>
  );
}

// ═══════════════════════════════════════════════════════════════
// SLOT RENDERER — maps format to visual component
// ═══════════════════════════════════════════════════════════════

function RenderSlot({ slot, actId, value, ai, result: _result, delay }: {
  slot: StoryboardSlot; actId: string; value: string | string[] | null;
  ai: any; result: DiagnosticResult; delay: number;
}) {
  if (slot.key === 'lifeImpact' || slot.key === 'impactoPorArea') {
    const impacto = ai.impactoPorArea || ai.impactoVida?.map((l: any) => ({ area: l.area || l.pillar, efeito: l.efeito || l.impact })) || _result.lifeImpact?.map((l: any) => ({ area: l.pillar, efeito: l.impact })) || [];
    if (impacto.length === 0 && !value) return null;
    return (
      <Section title={slot.label} delay={delay} accent={actId === 'confronto' ? 'destructive' : undefined}>
        {impacto.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {impacto.map((item: any, i: number) => (
              <div key={i} className="rounded-xl border border-border/25 bg-card/50 px-5 py-4">
                <p className="text-[9px] text-muted-foreground/40 uppercase tracking-[0.2em] font-medium mb-2">{item.area}</p>
                <p className="text-sm text-foreground/80 leading-relaxed">{item.efeito || item.impact}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-[15px] text-muted-foreground leading-[1.85]">{typeof value === 'string' ? value : ''}</p>
        )}
      </Section>
    );
  }

  if (!value && slot.key !== 'mentalCommand') return null;

  const accentMap: Record<string, string | undefined> = {
    espelho: undefined,
    confronto: 'destructive',
    direcao: 'primary',
  };
  const accent = accentMap[actId];

  if (slot.format === 'quote') {
    const cmd = ai.mentalCommand || (typeof value === 'string' ? value : null);
    if (!cmd) return null;
    return (
      <motion.div {...fade} transition={{ delay, duration: 0.4 }}>
        <div className="rounded-xl border border-primary/15 bg-primary/[0.02] px-6 py-5">
          <p className="text-[9px] text-primary/40 uppercase tracking-[0.25em] font-medium mb-3">Repita antes de agir</p>
          <p className="text-base font-medium text-foreground italic leading-relaxed">"{cmd}"</p>
        </div>
      </motion.div>
    );
  }

  if (slot.format === 'alert') {
    return (
      <Section title={slot.label} delay={delay} accent="destructive">
        <CardBlock variant="alert">
          <p className="text-[15px] text-foreground leading-[1.85]">{typeof value === 'string' ? value : ''}</p>
        </CardBlock>
      </Section>
    );
  }

  if (slot.format === 'list' || Array.isArray(value)) {
    const items = Array.isArray(value) ? value : [];
    if (items.length === 0) return null;
    const isStop = /parar|whatNot/i.test(slot.key);
    return (
      <Section title={slot.label} delay={delay} accent={accent}>
        {isStop ? (
          <div className="space-y-2.5">
            {items.map((item: string, i: number) => (
              <div key={i} className="flex items-start gap-3 py-2 px-4 rounded-lg bg-destructive/[0.02] border border-destructive/8">
                <XCircle className="w-3.5 h-3.5 text-destructive/40 mt-0.5 shrink-0" />
                <p className="text-[15px] text-muted-foreground leading-[1.8]">{item}</p>
              </div>
            ))}
          </div>
        ) : (
          <ul className="space-y-3">
            {items.map((item: string, i: number) => (
              <li key={i} className="flex items-start gap-3">
                <span className="mt-[9px] w-1 h-1 rounded-full bg-destructive/40 shrink-0" />
                <p className="text-[15px] text-muted-foreground leading-[1.85]">{item}</p>
              </li>
            ))}
          </ul>
        )}
      </Section>
    );
  }

  if (slot.format === 'cards') {
    const cards = Array.isArray(value)
      ? (value as any[]).map((item: any) => ({
          pillar: item.pillar || item.area || item.label || '',
          impact: item.impact || item.efeito || item.text || '',
        })).filter(c => c.pillar && c.impact)
      : [];
    if (cards.length === 0) {
      return (
        <Section title={slot.label} delay={delay} accent={accent}>
          <p className="text-[15px] text-muted-foreground leading-[1.85]">{typeof value === 'string' ? value : ''}</p>
        </Section>
      );
    }
    return (
      <Section title={slot.label} delay={delay} accent={accent}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {cards.map((c, i) => (
            <div key={i} className="rounded-xl border border-border/25 bg-card/50 px-5 py-4">
              <p className="text-[9px] text-muted-foreground/40 uppercase tracking-[0.2em] font-medium mb-2">{c.pillar}</p>
              <p className="text-sm text-foreground/85 leading-relaxed">{c.impact}</p>
            </div>
          ))}
        </div>
      </Section>
    );
  }

  if (actId === 'direcao' && /direction|direcao|ajuste|corrigir/i.test(slot.key)) {
    return (
      <Section title={slot.label} delay={delay} accent="primary">
        <CardBlock variant="primary">
          <div className="flex items-start gap-3">
            <ArrowRight className="w-4 h-4 text-primary/50 mt-0.5 shrink-0" />
            <p className="text-[15px] text-foreground leading-[1.85]">{typeof value === 'string' ? value : ''}</p>
          </div>
        </CardBlock>
      </Section>
    );
  }

  if (actId === 'direcao' && /foco|proximo|acao/i.test(slot.key)) {
    return (
      <Section title={slot.label} delay={delay} accent="green">
        <CardBlock variant="success">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-4 h-4 text-green-600/50 mt-0.5 shrink-0" />
            <p className="text-[15px] font-medium text-foreground leading-[1.85]">{typeof value === 'string' ? value : ''}</p>
          </div>
        </CardBlock>
      </Section>
    );
  }

  return (
    <Section title={slot.label} delay={delay} accent={actId === 'espelho' ? undefined : accent}>
      <p className="text-[15px] text-muted-foreground leading-[1.85]">{typeof value === 'string' ? value : ''}</p>
    </Section>
  );
}

// ═══════════════════════════════════════════════════════════════
// LEGACY SECTIONS (backwards compatibility)
// ═══════════════════════════════════════════════════════════════

function LegacySections({ result, moduleSlug: _moduleSlug, ai }: { result: DiagnosticResult; moduleSlug?: string; ai: any }) {
  const chamaAtencao = ai.chamaAtencao || ai.resumoPrincipal || result.criticalDiagnosis;
  const padraoRepetido = ai.padraoRepetido || ai.padraoIdentificado || result.mechanism;
  const comoAparece = ai.comoAparece || result.mentalState;
  const gatilhos = ai.gatilhos || result.triggers;
  const comoAtrapalha = ai.comoAtrapalha || ai.significadoPratico || result.corePain;
  const impactoPorArea: { area: string; efeito: string }[] = ai.impactoPorArea || ai.impactoVida?.map((l: any) => ({ area: l.area || l.pillar, efeito: l.efeito || l.impact })) || result.lifeImpact?.map((l: any) => ({ area: l.pillar, efeito: l.impact })) || [];
  const corrigirPrimeiro = ai.corrigirPrimeiro || ai.direcaoAjuste || result.keyUnlockArea;
  const pararDeFazer = ai.pararDeFazer || ai.oQueEvitar || result.whatNotToDo;
  const microAcoes: { gatilho?: string; acao: string }[] = Array.isArray(ai.microAcoes) ? ai.microAcoes : [];
  const acaoInicialRaw = ai.acaoInicial || ai.proximoPasso || (result.exitStrategy?.[0]?.action) || result.direction;
  const acaoInicial = typeof acaoInicialRaw === 'string' ? acaoInicialRaw : '';
  const focoMudanca = ai.focoMudanca || result.keyUnlockArea || ai.blockingPoint || result.blockingPoint || corrigirPrimeiro;

  return (
    <>
      {/* ACT 1: Espelho */}
      <Section title="O que seu resultado revela" delay={0.05} accent="destructive">
        <CardBlock variant="alert">
          <p className="text-[15px] text-foreground leading-[1.85]">{chamaAtencao}</p>
        </CardBlock>
      </Section>

      {result.interpretation?.blindSpot?.realProblem && (
        <motion.div {...fade} transition={{ delay: 0.07 }} className="-mt-8">
          <CardBlock variant="muted">
            <p className="text-[9px] text-muted-foreground/40 uppercase tracking-[0.2em] font-medium mb-3">Ponto cego</p>
            <p className="text-xs text-muted-foreground/60 italic mb-2.5">O que você acredita: {result.interpretation.blindSpot.perceivedProblem}</p>
            <div className="flex items-start gap-2">
              <ChevronRight className="w-3.5 h-3.5 text-destructive/40 mt-0.5 shrink-0" />
              <p className="text-[15px] text-foreground leading-[1.8]">{result.interpretation.blindSpot.realProblem}</p>
            </div>
          </CardBlock>
        </motion.div>
      )}

      <Section title="O padrão que te define" delay={0.1}>
        {result.interpretation?.behavioralProfile && (
          <div className="border-l-2 border-primary/20 pl-5 mb-5">
            <p className="text-base font-semibold text-foreground">{result.interpretation.behavioralProfile.name}</p>
          </div>
        )}
        <p className="text-[15px] text-muted-foreground leading-[1.85]">{padraoRepetido}</p>
      </Section>

      <Section title="Como isso vive em você" delay={0.14}>
        <p className="text-[15px] text-muted-foreground leading-[1.85]">{comoAparece}</p>
        {result.selfSabotageCycle?.length > 0 && (
          <div className="mt-6 space-y-2">
            {result.selfSabotageCycle.map((step, i) => (
              <div key={i} className="flex items-start gap-3 py-2">
                <span className="mt-[9px] w-1.5 h-1.5 rounded-full bg-muted-foreground/25 shrink-0" />
                <p className="text-[15px] text-muted-foreground leading-[1.8]">{step}</p>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* ACT 2: Confronto */}
      {gatilhos?.length > 0 && (
        <Section title="O que ativa esse ciclo" delay={0.18} accent="destructive">
          <ul className="space-y-3">
            {gatilhos.map((t: string, i: number) => (
              <li key={i} className="flex items-start gap-3">
                <span className="mt-[9px] w-1 h-1 rounded-full bg-destructive/40 shrink-0" />
                <p className="text-[15px] text-muted-foreground leading-[1.85]">{t}</p>
              </li>
            ))}
          </ul>
        </Section>
      )}

      <Section title="O custo real desse padrão" delay={0.22}>
        {impactoPorArea.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {impactoPorArea.map((item, i) => (
              <div key={i} className="rounded-xl border border-border/25 bg-card/50 px-5 py-4">
                <p className="text-[9px] text-muted-foreground/40 uppercase tracking-[0.2em] font-medium mb-2">{item.area}</p>
                <p className="text-sm text-foreground/80 leading-relaxed">{item.efeito}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-[15px] text-foreground/75 leading-[1.85]">{comoAtrapalha}</p>
        )}
      </Section>

      {ai.futureConsequence && (
        <Section title="Se nada mudar" delay={0.25} accent="destructive">
          <CardBlock variant="alert">
            <div className="flex items-start gap-3">
              <TrendingDown className="w-4 h-4 text-destructive/50 mt-0.5 shrink-0" />
              <p className="text-[15px] text-foreground leading-[1.85]">{ai.futureConsequence}</p>
            </div>
          </CardBlock>
        </Section>
      )}

      <EvolutionComparisonSection ai={ai} />

      {/* ACT 3: Direção */}
      <Section title="A mudança que importa" delay={0.26} accent="primary">
        <CardBlock variant="primary">
          <div className="flex items-start gap-3">
            <ArrowRight className="w-4 h-4 text-primary/50 mt-0.5 shrink-0" />
            <p className="text-[15px] text-foreground leading-[1.85]">{corrigirPrimeiro}</p>
          </div>
        </CardBlock>
      </Section>

      {pararDeFazer?.length > 0 && (
        <Section title="O que abandonar agora" delay={0.3} accent="destructive">
          <div className="space-y-2.5">
            {pararDeFazer.map((item: string, i: number) => (
              <div key={i} className="flex items-start gap-3 py-2 px-4 rounded-lg bg-destructive/[0.02] border border-destructive/8">
                <XCircle className="w-3.5 h-3.5 text-destructive/40 mt-0.5 shrink-0" />
                <p className="text-[15px] text-muted-foreground leading-[1.8]">{item}</p>
              </div>
            ))}
          </div>
        </Section>
      )}

      <Section title="Seu próximo passo" delay={0.34} accent="green">
        {ai.mentalCommand && (
          <div className="mb-5 rounded-xl border border-primary/15 bg-primary/[0.02] px-6 py-5">
            <p className="text-[9px] text-primary/40 uppercase tracking-[0.25em] font-medium mb-3">Repita antes de agir</p>
            <p className="text-base font-medium text-foreground italic leading-relaxed">"{ai.mentalCommand}"</p>
          </div>
        )}
        {microAcoes.length > 0 ? (
          <div className="space-y-3">
            {microAcoes.map((item: any, i: number) => (
              <div key={i} className="border border-green-500/15 bg-green-500/[0.03] rounded-xl px-6 py-5">
                <div className="flex items-start gap-3">
                  <span className="mt-[9px] w-1.5 h-1.5 rounded-full bg-green-500/50 shrink-0" />
                  <div className="flex-1">
                    {item.gatilho && <p className="text-xs text-muted-foreground/60 mb-1.5 leading-relaxed">Quando {item.gatilho} →</p>}
                    <p className="text-[15px] font-medium text-foreground leading-[1.8]">{item.acao}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <CardBlock variant="success">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-4 h-4 text-green-600/50 mt-0.5 shrink-0" />
              <p className="text-[15px] font-medium text-foreground leading-[1.85]">{acaoInicial || focoMudanca}</p>
            </div>
          </CardBlock>
        )}
      </Section>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════
// EVOLUTION COMPARISON
// ═══════════════════════════════════════════════════════════════

function EvolutionComparisonSection({ ai }: { ai: any }) {
  const evo = ai.evolutionComparison;
  if (!evo) return null;

  const improved = evo.improved_axes || [];
  const worsened = evo.worsened_axes || [];
  const unchanged = evo.unchanged_axes || [];
  const hasData = improved.length > 0 || worsened.length > 0 || unchanged.length > 0;
  if (!hasData) return null;

  const scoreDelta = evo.current_score - evo.previous_score;
  const scoreDirection = scoreDelta < 0 ? 'melhorou' : scoreDelta > 0 ? 'piorou' : 'estável';

  return (
    <motion.section {...fade} transition={{ delay: 0.25, duration: 0.4 }}>
      <div className="mb-6">
        <h2 className="text-lg md:text-xl font-serif font-semibold text-foreground tracking-tight">Comparação com diagnóstico anterior</h2>
      </div>
      <div className="space-y-5">
        <div className="rounded-2xl border border-border/20 bg-card/50 px-6 py-6">
          <div className="flex items-center justify-between mb-5">
            <div className="text-center flex-1">
              <p className="text-[9px] text-muted-foreground/40 uppercase tracking-[0.2em] font-medium mb-1">Anterior</p>
              <p className="text-2xl font-serif font-bold text-muted-foreground">{evo.previous_score}%</p>
            </div>
            <div className="px-4">
              <span className={`text-lg font-light ${scoreDelta < 0 ? 'text-green-600' : scoreDelta > 0 ? 'text-destructive' : 'text-muted-foreground'}`}>→</span>
            </div>
            <div className="text-center flex-1">
              <p className="text-[9px] text-muted-foreground/40 uppercase tracking-[0.2em] font-medium mb-1">Atual</p>
              <p className={`text-2xl font-serif font-bold ${scoreDelta < 0 ? 'text-green-600' : scoreDelta > 0 ? 'text-destructive' : 'text-foreground'}`}>{evo.current_score}%</p>
            </div>
          </div>
          <div className="text-center">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${
              scoreDirection === 'melhorou' ? 'bg-green-500/8 text-green-600' :
              scoreDirection === 'piorou' ? 'bg-destructive/8 text-destructive' :
              'bg-secondary/50 text-muted-foreground'
            }`}>
              {scoreDirection === 'melhorou' && <TrendingDown className="w-3 h-3" />}
              {scoreDirection === 'piorou' && <TrendingUp className="w-3 h-3" />}
              {scoreDirection === 'estável' && <Minus className="w-3 h-3" />}
              Score {scoreDirection} ({scoreDelta > 0 ? '+' : ''}{scoreDelta}%)
            </span>
          </div>
        </div>

        {improved.length > 0 && (
          <div>
            <p className="text-[9px] text-green-600/60 uppercase tracking-[0.2em] font-medium mb-3 flex items-center gap-1.5"><TrendingDown className="w-3 h-3" /> Eixos que melhoraram</p>
            <div className="space-y-2">
              {improved.map((axis: any) => (
                <div key={axis.key} className="flex items-center justify-between rounded-xl border border-green-500/15 bg-green-500/[0.03] px-5 py-3">
                  <span className="text-sm font-medium text-foreground">{axis.label}</span>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-muted-foreground">{axis.previous}%</span>
                    <span className="text-green-600">→ {axis.current}%</span>
                    <span className="text-green-600 font-semibold">({axis.delta}%)</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {worsened.length > 0 && (
          <div>
            <p className="text-[9px] text-destructive/60 uppercase tracking-[0.2em] font-medium mb-3 flex items-center gap-1.5"><TrendingUp className="w-3 h-3" /> Eixos que pioraram</p>
            <div className="space-y-2">
              {worsened.map((axis: any) => (
                <div key={axis.key} className="flex items-center justify-between rounded-xl border border-destructive/15 bg-destructive/[0.03] px-5 py-3">
                  <span className="text-sm font-medium text-foreground">{axis.label}</span>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-muted-foreground">{axis.previous}%</span>
                    <span className="text-destructive">→ {axis.current}%</span>
                    <span className="text-destructive font-semibold">(+{axis.delta}%)</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {unchanged.length > 0 && (
          <div>
            <p className="text-[9px] text-muted-foreground/40 uppercase tracking-[0.2em] font-medium mb-3 flex items-center gap-1.5"><Minus className="w-3 h-3" /> Sem alteração significativa</p>
            <div className="flex flex-wrap gap-2">
              {unchanged.map((axis: any) => (
                <span key={axis.key} className="text-xs px-3 py-1.5 rounded-lg border border-border/25 bg-secondary/30 text-muted-foreground font-medium">{axis.label}: {axis.value}%</span>
              ))}
            </div>
          </div>
        )}

        {evo.summary_text && (
          <div className="rounded-2xl border border-border/20 bg-card/50 px-6 py-5">
            <p className="text-[9px] text-muted-foreground/40 uppercase tracking-[0.2em] font-medium mb-2.5">Análise da evolução</p>
            <p className="text-[15px] text-muted-foreground leading-[1.85]">{evo.summary_text}</p>
          </div>
        )}
      </div>
    </motion.section>
  );
}

// ═══════════════════════════════════════════════════════════════
// LEGACY ACTION PREVIEW (backward compat — hidden when tarefasEstrategicas exist)
// ═══════════════════════════════════════════════════════════════

function ActionPreviewSection({ result, ai, dominantAxisLabel, profileName }: { result: DiagnosticResult; ai: any; dominantAxisLabel: string; profileName: string }) {
  const { user, isPremium, isSuperAdmin } = useAuth();
  const [actions, setActions] = useState<{ trigger: string; action: string }[]>([]);

  // Don't render if tarefasEstrategicas exist
  const hasTarefas = Array.isArray(ai.tarefasEstrategicas) && ai.tarefasEstrategicas.length > 0;
  
  useEffect(() => {
    if (hasTarefas) return; // Skip fetch if new system is active
    const resultId = (result as any).id;
    if (!user || !resultId) return;
    const fetchActions = async () => {
      const { data } = await supabase
        .from('action_plan_tracking')
        .select('action_text, day_number')
        .eq('diagnostic_result_id', resultId)
        .eq('user_id', user.id)
        .order('day_number');
      if (data && data.length > 0) {
        const seen = new Set<string>();
        const unique: { trigger: string; action: string }[] = [];
        for (const row of data) {
          if (!seen.has(row.action_text) && unique.length < 3) {
            seen.add(row.action_text);
            unique.push(parseActionString(row.action_text));
          }
        }
        setActions(unique);
      }
    };
    fetchActions();
  }, [(result as any).id, user?.id, hasTarefas]);

  if (hasTarefas || actions.length === 0) return null;
  const showFull = isPremium || isSuperAdmin;

  return (
    <motion.section {...fade} transition={{ delay: 0.38, duration: 0.4 }}>
      <div className="mb-6">
        <h2 className="text-lg md:text-xl font-serif font-semibold text-foreground tracking-tight">Ações para começar a mudar esse padrão</h2>
      </div>
      {(profileName || dominantAxisLabel) && (
        <div className="mb-5 rounded-xl border border-border/15 bg-secondary/20 px-5 py-4">
          <p className="text-[13px] text-muted-foreground/70 leading-relaxed italic">
            Estas ações foram desenhadas com base no padrão <span className="font-semibold text-foreground not-italic">{profileName}</span>
            {dominantAxisLabel && <> e no eixo <span className="font-semibold text-foreground not-italic">{dominantAxisLabel}</span>, que concentra sua maior intensidade</>}.
          </p>
        </div>
      )}
      <div className="space-y-3">
        {actions.slice(0, 3).map((action, i) => {
          const isLocked = !showFull && i > 0;
          return (
            <div key={i} className={`border rounded-xl px-6 py-5 relative overflow-hidden ${isLocked ? 'border-border/20 bg-secondary/20' : 'border-green-500/15 bg-green-500/[0.03]'}`}>
              <div className="flex items-start gap-3">
                <span className={`mt-[9px] w-1.5 h-1.5 rounded-full shrink-0 ${isLocked ? 'bg-muted-foreground/20' : 'bg-green-500/50'}`} />
                <div className="flex-1">
                  <p className={`text-xs font-medium leading-relaxed ${isLocked ? 'text-muted-foreground/30' : 'text-muted-foreground/60'}`}>
                    Quando <span className={`font-semibold ${isLocked ? 'text-muted-foreground/40' : 'text-foreground'}`}>{isLocked ? action.trigger.slice(0, 25) + '...' : action.trigger}</span>
                  </p>
                  <p className={`text-[15px] font-medium leading-[1.8] mt-1.5 ${isLocked ? 'text-muted-foreground/20' : 'text-green-700 dark:text-green-400'}`}>
                    → {isLocked ? action.action.slice(0, 30) + '...' : action.action}
                  </p>
                </div>
              </div>
              {isLocked && (
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-background/50 to-background/80 flex items-center justify-end pr-4">
                  <Lock className="w-4 h-4 text-muted-foreground/30" />
                </div>
              )}
            </div>
          );
        })}
        {!showFull && (
          <div className="mt-6 border border-destructive/15 bg-destructive/[0.02] rounded-2xl px-6 py-6 space-y-5">
            <div className="space-y-2 text-center">
              <p className="text-[15px] text-foreground font-semibold leading-snug">Você já sabe o que está errado.</p>
              <p className="text-sm text-foreground/70 font-medium">Mas continua fazendo igual.</p>
              <p className="text-sm text-destructive font-semibold">Sem execução, nada muda.</p>
            </div>
            <p className="text-[11px] text-muted-foreground/50 text-center">+32.847 mulheres já estão executando esse plano</p>
            <div className="border-t border-destructive/8 pt-5">
              <p className="text-xs text-destructive/70 text-center font-medium leading-relaxed mb-4">Se você não fizer isso, daqui 30 dias você ainda vai estar no mesmo padrão.</p>
              <button onClick={() => window.location.href = '/premium'} className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-destructive text-destructive-foreground rounded-xl text-sm font-semibold hover:brightness-90 transition-all duration-200 active:scale-[0.97] shadow-sm">
                <Crown className="w-4 h-4" /> Desbloquear acompanhamento — R$9,99
              </button>
            </div>
          </div>
        )}
      </div>

      {showFull && (
        <motion.div {...fade} transition={{ delay: 0.5, duration: 0.4 }} className="mt-8 rounded-2xl border border-primary/20 bg-primary/5 p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <ArrowRight className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-foreground">Próximo passo da sua jornada</h3>
              <p className="text-sm text-muted-foreground">Saber o padrão é só o começo. Executar é o que transforma.</p>
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <button
              onClick={() => window.location.href = '/acompanhamento'}
              className="flex items-center justify-center gap-2 px-5 py-3 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:brightness-90 transition-all active:scale-[0.97]"
            >
              <CheckCircle2 className="w-4 h-4" />
              Ir para o Plano de Ação
            </button>
            <button
              onClick={() => window.location.href = '/dashboard'}
              className="flex items-center justify-center gap-2 px-5 py-3 border border-border/40 rounded-xl text-sm font-medium hover:bg-secondary/50 transition-all active:scale-[0.97]"
            >
              Ver meu progresso
            </button>
          </div>
        </motion.div>
      )}
    </motion.section>
  );
}

// ═══════════════════════════════════════════════════════════════
// SUB-COMPONENTS
// ═══════════════════════════════════════════════════════════════

function Section({ title, delay = 0, accent, children }: { title: string; delay?: number; accent?: string; children: React.ReactNode }) {
  const accentClass = accent === 'destructive' ? 'bg-destructive/40'
    : accent === 'green' ? 'bg-green-500/40'
    : accent === 'primary' ? 'bg-primary/40'
    : 'bg-primary/20';

  return (
    <motion.section {...fade} transition={{ delay, duration: 0.4 }}>
      <div className="flex items-center gap-3 mb-6">
        <span className={`w-1 h-5 rounded-full ${accentClass}`} />
        <h2 className="text-lg md:text-xl font-serif font-semibold text-foreground tracking-tight">{title}</h2>
      </div>
      <div className="pl-4">{children}</div>
    </motion.section>
  );
}

function CardBlock({ variant = 'default', children }: { variant?: 'default' | 'alert' | 'primary' | 'success' | 'muted'; children: React.ReactNode }) {
  const styles = {
    default: 'border-border/25 bg-card/50',
    alert: 'border-destructive/10 bg-destructive/[0.02]',
    primary: 'border-primary/10 bg-primary/[0.02]',
    success: 'border-green-500/15 bg-green-500/[0.03]',
    muted: 'border-border/15 bg-secondary/15',
  };
  return <div className={`border rounded-2xl px-6 py-5 ${styles[variant]}`}>{children}</div>;
}

export default memo(Report);
