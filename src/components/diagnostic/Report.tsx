import { motion } from 'framer-motion';
import { DiagnosticResult, IntensityLevel } from '@/types/diagnostic';
import { Download, ChevronRight, Zap, Target, AlertTriangle, ArrowRight, XCircle, CheckCircle2, BarChart3, TrendingDown, TrendingUp, Minus, ArrowUpDown } from 'lucide-react';
import { generateDiagnosticPdf, PdfEvolutionData } from '@/lib/generatePdf';
import { trackEvent } from '@/lib/trackEvent';
import { generateLifeMapPdf } from '@/lib/generateLifeMapPdf';
import { useAuth } from '@/contexts/AuthContext';
import { useAxisLabels } from '@/hooks/useAxisLabels';
import { supabase } from '@/integrations/supabase/client';
import { useState, useEffect, memo } from 'react';
import LifeMapReport from './LifeMapReport';
import { ReportGamification } from './ReportGamification';

interface ReportProps {
  result: DiagnosticResult;
  onRestart: () => void;
  moduleSlug?: string;
}

interface TemplateSection {
  key: string;
  label: string;
  order: number;
  required: boolean;
  maxSentences: number;
}

const intensityConfig: Record<IntensityLevel, { label: string; color: string; bg: string; ring: string }> = {
  leve: { label: 'Leve', color: 'text-green-600', bg: 'bg-green-500', ring: 'ring-green-500/20' },
  moderado: { label: 'Moderado', color: 'text-yellow-600', bg: 'bg-yellow-500', ring: 'ring-yellow-500/20' },
  alto: { label: 'Alto', color: 'text-destructive', bg: 'bg-destructive', ring: 'ring-destructive/20' },
};

// Determine visual style for a section based on key patterns
function getSectionAccent(key: string): string | undefined {
  if (key.match(/diagnostico|chamaAtencao|dorCentral|corePain/i)) return 'destructive';
  if (key.match(/futureConsequence|consequencia/i)) return 'destructive';
  if (key.match(/direcao|corrigir|ajuste/i)) return 'primary';
  if (key.match(/acao|proximo|imediata/i)) return 'green';
  if (key.match(/gatilho|parar|oQue/i)) return 'destructive';
  return undefined;
}

// Check if a section key represents a list field
function isListSection(key: string): boolean {
  return /gatilho|parar|oQue|whatNot|mentalTrap/i.test(key);
}

// Get header title based on slug
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

const fade = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
};

const Report = ({ result, onRestart, moduleSlug }: ReportProps) => {
  const info = intensityConfig[result.intensity];
  const { profile, user } = useAuth();
  const axisLabels = useAxisLabels();
  const [templateSections, setTemplateSections] = useState<TemplateSection[]>([]);
  const [actionPlanItems, setActionPlanItems] = useState<{ id: string; day_number: number; action_text: string; completed: boolean }[]>([]);

  // Fetch template sections for this test module
  useEffect(() => {
    if (!moduleSlug || moduleSlug === 'mapa-de-vida') return;

    const fetchTemplate = async () => {
      const { data: modules } = await supabase
        .from('test_modules')
        .select('id')
        .eq('slug', moduleSlug)
        .limit(1);

      if (!modules?.[0]) return;

      const { data: templates } = await supabase
        .from('report_templates')
        .select('sections')
        .eq('test_id', modules[0].id)
        .limit(1);

      if (templates?.[0]?.sections) {
        const sections = templates[0].sections as unknown as TemplateSection[];
        if (Array.isArray(sections) && sections.length > 0) {
          setTemplateSections(sections.sort((a, b) => a.order - b.order));
        }
      }
    };

    fetchTemplate();
  }, [moduleSlug]);

  // Fetch action plan items for this result
  useEffect(() => {
    if (!user) return;
    const resultId = (result as any).id;
    if (!resultId) return;
    const fetchPlan = async () => {
      const { data } = await supabase
        .from('action_plan_tracking')
        .select('id, day_number, action_text, completed')
        .eq('diagnostic_result_id', resultId)
        .eq('user_id', user.id)
        .order('day_number');
      if (data) setActionPlanItems(data);
    };
    fetchPlan();
  }, [user, result]);

  // Track report_viewed event
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

  // Legacy field resolution (used for QuickRead and fallback)
  const corrigirPrimeiro = ai.corrigirPrimeiro || ai.direcaoAjuste || result.keyUnlockArea;
  const focoMudanca = ai.focoMudanca || result.keyUnlockArea || ai.blockingPoint || result.blockingPoint || corrigirPrimeiro;

  const handleDownloadPdf = async () => {
    if (moduleSlug === 'mapa-de-vida') {
      generateLifeMapPdf(result.allScores, profile?.name);
    } else {
      // Fetch action plan tracking if available
      let extras: PdfEvolutionData | undefined;
      if (user) {
        try {
          const { data: tracking } = await supabase
            .from('action_plan_tracking')
            .select('completed')
            .eq('user_id', user.id)
            .eq('diagnostic_result_id', (result as any).id || '');
          if (tracking && tracking.length > 0) {
            const completed = tracking.filter(t => t.completed).length;
            // Calculate streak
            const sortedDays = tracking.sort((a: any, b: any) => a.day_number - b.day_number);
            let streak = 0;
            for (let i = sortedDays.length - 1; i >= 0; i--) {
              if ((sortedDays[i] as any).completed) streak++;
              else break;
            }
            extras = {
              actionPlanStatus: {
                total_days: tracking.length,
                completed_days: completed,
                execution_rate: Math.round((completed / tracking.length) * 100),
                current_streak: streak,
              },
            };
          }
        } catch { /* ignore - extras remain undefined */ }
      }
      generateDiagnosticPdf(result, profile?.name, extras);
      if (user) trackEvent({ userId: user.id, event: 'pdf_downloaded', metadata: { moduleSlug } });
    }
  };

  // Resolve the value for a custom section key from the AI result
  const resolveValue = (key: string): string | string[] | null => {
    const v = ai[key];
    if (Array.isArray(v) && v.length > 0) return v;
    if (typeof v === 'string' && v.trim()) return v;
    return null;
  };

  // Check if we have custom template sections to render
  const hasCustomTemplate = templateSections.length >= 5;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-6 md:px-12 py-14 md:py-24">

        {/* ── Header ── */}
        <motion.header {...fade} transition={{ duration: 0.5 }} className="mb-12">
          <p className="text-[10px] text-muted-foreground/40 uppercase tracking-[0.3em] font-light mb-5">
            {headerTitle}
          </p>
          <h1 className="text-2xl md:text-[2rem] font-extrabold tracking-tight text-foreground leading-[1.2]">
            {result.combinedTitle}
          </h1>
          <div className="flex items-center gap-2.5 mt-5">
            <span className={`w-2.5 h-2.5 rounded-full ${info.bg} ring-4 ${info.ring}`} />
            <span className={`text-xs font-semibold ${info.color}`}>
              Intensidade {info.label.toLowerCase()}
            </span>
          </div>
        </motion.header>

        {/* ── Quick-read card ── */}
        <motion.div {...fade} transition={{ delay: 0.12, duration: 0.45 }} className="mb-16">
          <div className="rounded-2xl border border-border/30 overflow-hidden shadow-md">
            <div className="bg-secondary/50 px-6 py-4 border-b border-border/25">
              <p className="text-[10px] text-muted-foreground/60 uppercase tracking-[0.2em] font-semibold">
                Leitura rápida
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2">
              <QuickReadCell
                icon={<Zap className="w-3.5 h-3.5 text-primary/50" />}
                label="Padrão principal"
                value={result.interpretation?.behavioralProfile?.name || result.profileName || String(result.dominantPattern || '')}
                bold
              />
              <QuickReadCell
                icon={<span className={`w-2.5 h-2.5 rounded-full ${info.bg}`} />}
                label="Intensidade"
                value={info.label}
                colorClass={info.color}
                bold
              />
              <QuickReadCell
                icon={<AlertTriangle className="w-3.5 h-3.5 text-destructive/40" />}
                label="Ponto de travamento"
                value={ai.blockingPoint || result.blockingPoint || 'Não identificado'}
              />
              <QuickReadCell
                icon={<Target className="w-3.5 h-3.5 text-primary/40" />}
                label="Foco de mudança"
                value={focoMudanca || 'Não identificado'}
              />
            </div>
          </div>
        </motion.div>

        {/* ── Sections ── */}
        <div className="space-y-16">
          {hasCustomTemplate ? (
            /* ── Dynamic custom sections from template ── */
            <>
              {templateSections.map((section, idx) => {
                const value = resolveValue(section.key);
                if (!value && !section.required) return null;

                const accent = getSectionAccent(section.key);
                const isList = isListSection(section.key) || Array.isArray(value);
                const delay = 0.05 + idx * 0.04;

                // Special: impactoPorArea rendering
                if (section.key === 'impactoPorArea' || section.key === 'impactoDecisoes' || section.key === 'impactoReal' || section.key === 'impactoRelacoes' || section.key === 'impactoVinculos') {
                  const impacto = ai.impactoPorArea || ai.impactoVida?.map((l: any) => ({ area: l.area || l.pillar, efeito: l.efeito || l.impact })) || result.lifeImpact?.map((l: any) => ({ area: l.pillar, efeito: l.impact })) || [];
                  const textValue = typeof value === 'string' ? value : null;
                  
                  return (
                    <Section key={section.key} num={idx + 1} title={section.label} delay={delay} accent={accent}>
                      {impacto.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {impacto.map((item: any, i: number) => (
                            <div key={i} className="rounded-xl border border-border/40 bg-card px-4 py-3.5 shadow-sm">
                              <p className="text-[9px] text-muted-foreground/50 uppercase tracking-[0.15em] font-semibold mb-1.5">{item.area}</p>
                              <p className="text-sm text-foreground/85 leading-snug">{item.efeito}</p>
                            </div>
                          ))}
                        </div>
                      ) : textValue ? (
                        <p className="text-sm text-muted-foreground leading-[1.8]">{textValue}</p>
                      ) : null}
                    </Section>
                  );
                }

                // List sections (gatilhos, parar de fazer, etc.)
                if (isList && Array.isArray(value)) {
                  const isStop = /parar|oQue/i.test(section.key);
                  return (
                    <Section key={section.key} num={idx + 1} title={section.label} delay={delay} accent={accent}>
                      {isStop ? (
                        <div className="space-y-2">
                          {value.map((item: string, i: number) => (
                            <div key={i} className="flex items-start gap-3 py-1.5 px-3.5 rounded-lg bg-destructive/[0.03] border border-destructive/10">
                              <XCircle className="w-3.5 h-3.5 text-destructive/50 mt-0.5 shrink-0" />
                              <p className="text-sm text-muted-foreground leading-[1.7]">{item}</p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <ul className="space-y-2.5">
                          {value.map((item: string, i: number) => (
                            <li key={i} className="flex items-start gap-3">
                              <span className="mt-[7px] w-1.5 h-1.5 rounded-full bg-destructive/50 shrink-0" />
                              <p className="text-sm text-muted-foreground leading-[1.8]">{item}</p>
                            </li>
                          ))}
                        </ul>
                      )}
                    </Section>
                  );
                }

                // Action/direction sections
                if (/direcao|corrigir|ajuste/i.test(section.key)) {
                  return (
                    <Section key={section.key} num={idx + 1} title={section.label} delay={delay} accent="primary">
                      <CardBlock variant="primary">
                        <div className="flex items-start gap-3">
                          <ArrowRight className="w-4 h-4 text-primary/60 mt-0.5 shrink-0" />
                          <div>
                            <p className="text-[9px] text-primary/50 uppercase tracking-widest font-semibold mb-1.5">O que precisa mudar</p>
                            <p className="text-sm text-foreground leading-[1.8]">{typeof value === 'string' ? value : ''}</p>
                          </div>
                        </div>
                      </CardBlock>
                    </Section>
                  );
                }

                // Action immediate sections
                if (/acao|proximo|imediata/i.test(section.key)) {
                  const microAcoes: { acao: string; detalhe?: string }[] = Array.isArray(ai.microAcoes) ? ai.microAcoes : [];
                  return (
                    <Section key={section.key} num={idx + 1} title={section.label} delay={delay} accent="green">
                      {ai.mentalCommand && (
                        <div className="mb-4 rounded-xl border border-primary/20 bg-primary/[0.04] px-5 py-4">
                          <p className="text-[9px] text-primary/50 uppercase tracking-[0.2em] font-semibold mb-2">Repita antes de agir</p>
                          <p className="text-base font-semibold text-foreground italic leading-relaxed">"{ai.mentalCommand}"</p>
                        </div>
                      )}
                      {microAcoes.length > 0 ? (
                        <div className="space-y-3">
                          {microAcoes.map((item, i) => (
                            <div key={i} className="border border-green-500/20 bg-green-500/[0.04] rounded-xl px-5 py-4 shadow-sm">
                              <div className="flex items-start gap-3">
                                <span className="w-6 h-6 rounded-lg bg-green-500/15 flex items-center justify-center text-[11px] font-bold text-green-600 shrink-0 mt-0.5">{i + 1}</span>
                                <div className="flex-1">
                                  <p className="text-sm font-semibold text-foreground leading-[1.7]">{item.acao}</p>
                                  {item.detalhe && <p className="text-xs text-muted-foreground/70 mt-1 leading-relaxed">{item.detalhe}</p>}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <CardBlock variant="success">
                          <div className="flex items-start gap-3">
                            <CheckCircle2 className="w-4 h-4 text-green-600/60 mt-0.5 shrink-0" />
                            <div>
                              <p className="text-[9px] text-green-700/50 dark:text-green-400/50 uppercase tracking-widest font-semibold mb-1.5">Faça isso agora</p>
                              <p className="text-sm font-medium text-foreground leading-[1.8]">{typeof value === 'string' ? value : ''}</p>
                            </div>
                          </div>
                        </CardBlock>
                      )}
                    </Section>
                  );
                }

                // Diagnostic/alert sections
                if (/diagnostico|chamaAtencao|dorCentral|corePain/i.test(section.key)) {
                  return (
                    <Section key={section.key} num={idx + 1} title={section.label} delay={delay} accent="destructive">
                      <CardBlock variant="alert">
                        <p className="text-sm text-foreground leading-[1.8]">{typeof value === 'string' ? value : ''}</p>
                      </CardBlock>
                    </Section>
                  );
                }

                // Future consequence section
                if (/futureConsequence|consequencia/i.test(section.key)) {
                  return (
                    <Section key={section.key} num={idx + 1} title={section.label} delay={delay} accent="destructive">
                      <CardBlock variant="alert">
                        <div className="flex items-start gap-3">
                          <TrendingDown className="w-4 h-4 text-destructive/60 mt-0.5 shrink-0" />
                          <div>
                            <p className="text-[9px] text-destructive/50 uppercase tracking-widest font-semibold mb-1.5">Se nada mudar</p>
                            <p className="text-sm text-foreground leading-[1.8]">{typeof value === 'string' ? value : ''}</p>
                          </div>
                        </div>
                      </CardBlock>
                    </Section>
                  );
                }

                // Default text section
                return (
                  <Section key={section.key} num={idx + 1} title={section.label} delay={delay} accent={accent}>
                    <p className="text-sm text-muted-foreground leading-[1.8]">{typeof value === 'string' ? value : (value || 'Não identificado')}</p>
                  </Section>
                );
              })}

              {/* Evolution comparison (if available) */}
              <EvolutionComparisonSection ai={ai} delay={0.04 + templateSections.length * 0.04} />

              {/* Blind spot (always show if available) */}
              {result.interpretation?.blindSpot?.realProblem && (
                <motion.div {...fade} transition={{ delay: 0.07 }}>
                  <CardBlock variant="muted">
                    <p className="text-[10px] text-muted-foreground/50 uppercase tracking-widest font-semibold mb-2.5">Ponto cego</p>
                    <p className="text-xs text-muted-foreground/70 italic mb-2">
                      O que você acredita: {result.interpretation.blindSpot.perceivedProblem}
                    </p>
                    <div className="flex items-start gap-2">
                      <ChevronRight className="w-3.5 h-3.5 text-destructive/50 mt-0.5 shrink-0" />
                      <p className="text-sm text-foreground leading-[1.7]">{result.interpretation.blindSpot.realProblem}</p>
                    </div>
                  </CardBlock>
                </motion.div>
              )}

            </>
          ) : (
            /* ── Legacy 8-section fallback ── */
            <LegacySections result={result} moduleSlug={moduleSlug} ai={ai} />
          )}

          {/* ── 3 Ações para mudar esse padrão ── */}
          <ActionPreviewSection result={result} ai={ai} />

          {/* ── Intensity bars ── */}
          <motion.section {...fade} transition={{ delay: 0.42 }}>
            <div className="flex items-center gap-2.5 mb-5">
              <BarChart3 className="w-4 h-4 text-muted-foreground/40" />
              <p className="text-[10px] text-muted-foreground/50 uppercase tracking-[0.2em] font-semibold">
                Intensidade por eixo
              </p>
            </div>
            <div className="space-y-4 bg-card border border-border/40 rounded-2xl px-5 py-5 shadow-sm">
              {result.allScores.slice(0, 8).map((score) => {
                const pct = Math.min(100, score.percentage);
                const barColor = pct > 65 ? 'bg-destructive/70' : pct >= 40 ? 'bg-yellow-500/70' : 'bg-green-500/70';
                const textColor = pct > 65 ? 'text-destructive' : pct >= 40 ? 'text-yellow-600' : 'text-green-600';
                return (
                  <div key={score.key}>
                    <div className="flex justify-between text-xs mb-1.5">
                      <span className="text-muted-foreground font-medium">{axisLabels[score.key] || score.label || score.key}</span>
                      <span className={`tabular-nums font-semibold ${textColor}`}>{pct}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-border/30 overflow-hidden">
                      <motion.div
                        className={`h-full rounded-full ${barColor}`}
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.6, delay: 0.5, ease: 'easeOut' }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.section>
        </div>

        {/* ── Gamification ── */}
        <ReportGamification />

        {/* ── Footer ── */}
        <div className="mt-20 space-y-8">
          <div className="w-12 h-px bg-border/40 mx-auto" />
          <p className="text-[10px] text-muted-foreground/30 text-center font-light leading-relaxed max-w-sm mx-auto">
            Leitura comportamental baseada em suas respostas. Não substitui avaliação profissional.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pb-12">
            <button
              onClick={handleDownloadPdf}
              className="inline-flex items-center gap-2 px-7 py-4 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:brightness-90 transition-all active:scale-[0.97] shadow-md"
            >
              <Download className="w-4 h-4" />
              Baixar PDF
            </button>
            <button
              onClick={onRestart}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors px-6 py-3 rounded-lg hover:bg-secondary/50"
            >
              Ir para o Dashboard
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};


/* ── Legacy sections fallback ── */
function LegacySections({ result, moduleSlug, ai }: { result: DiagnosticResult; moduleSlug?: string; ai: any }) {
  const chamaAtencao = ai.chamaAtencao || ai.resumoPrincipal || result.criticalDiagnosis;
  const padraoRepetido = ai.padraoRepetido || ai.padraoIdentificado || result.mechanism;
  const comoAparece = ai.comoAparece || result.mentalState;
  const gatilhos = ai.gatilhos || result.triggers;
  const comoAtrapalha = ai.comoAtrapalha || ai.significadoPratico || result.corePain;
  const impactoPorArea: { area: string; efeito: string }[] = ai.impactoPorArea || ai.impactoVida?.map((l: any) => ({ area: l.area || l.pillar, efeito: l.efeito || l.impact })) || result.lifeImpact?.map((l: any) => ({ area: l.pillar, efeito: l.impact })) || [];
  const corrigirPrimeiro = ai.corrigirPrimeiro || ai.direcaoAjuste || result.keyUnlockArea;
  const pararDeFazer = ai.pararDeFazer || ai.oQueEvitar || result.whatNotToDo;
  const acaoInicialRaw = ai.acaoInicial || ai.proximoPasso || (result.exitStrategy?.[0]?.action) || result.direction;
  const microAcoes: { acao: string; detalhe?: string }[] = Array.isArray(ai.microAcoes) ? ai.microAcoes : [];
  const acaoInicial = typeof acaoInicialRaw === 'string' ? acaoInicialRaw : '';
  

  const sectionTitles = getLegacySectionTitles(moduleSlug);

  return (
    <>
      <Section num={1} title={sectionTitles.chamaAtencao} delay={0.05} accent="destructive">
        <CardBlock variant="alert">
          <p className="text-sm text-foreground leading-[1.8]">{chamaAtencao}</p>
        </CardBlock>
      </Section>

      {result.interpretation?.blindSpot?.realProblem && (
        <motion.div {...fade} transition={{ delay: 0.07 }} className="-mt-6">
          <CardBlock variant="muted">
            <p className="text-[10px] text-muted-foreground/50 uppercase tracking-widest font-semibold mb-2.5">Ponto cego</p>
            <p className="text-xs text-muted-foreground/70 italic mb-2">
              O que você acredita: {result.interpretation.blindSpot.perceivedProblem}
            </p>
            <div className="flex items-start gap-2">
              <ChevronRight className="w-3.5 h-3.5 text-destructive/50 mt-0.5 shrink-0" />
              <p className="text-sm text-foreground leading-[1.7]">{result.interpretation.blindSpot.realProblem}</p>
            </div>
          </CardBlock>
        </motion.div>
      )}

      <Section num={2} title={sectionTitles.padraoRepetido} delay={0.1}>
        {result.interpretation?.behavioralProfile && (
          <div className="bg-secondary/50 border border-border/40 rounded-xl px-4 py-3 mb-4">
            <p className="text-sm font-bold text-foreground">{result.interpretation.behavioralProfile.name}</p>
          </div>
        )}
        <p className="text-sm text-muted-foreground leading-[1.8]">{padraoRepetido}</p>
      </Section>

      <Section num={3} title={sectionTitles.comoAparece} delay={0.14}>
        <p className="text-sm text-muted-foreground leading-[1.8]">{comoAparece}</p>
        {result.selfSabotageCycle?.length > 0 && (
          <div className="mt-4 space-y-1.5">
            {result.selfSabotageCycle.map((step, i) => (
              <div key={i} className="flex items-start gap-3 py-1.5">
                <span className="w-5 h-5 rounded-full bg-secondary/80 border border-border/50 flex items-center justify-center text-[10px] font-bold text-muted-foreground shrink-0 mt-0.5">{i + 1}</span>
                <p className="text-sm text-muted-foreground leading-[1.7]">{step}</p>
              </div>
            ))}
          </div>
        )}
      </Section>

      {gatilhos?.length > 0 && (
        <Section num={4} title={sectionTitles.gatilhos} delay={0.18} accent="destructive">
          <ul className="space-y-2.5">
            {gatilhos.map((t: string, i: number) => (
              <li key={i} className="flex items-start gap-3">
                <span className="mt-[7px] w-1.5 h-1.5 rounded-full bg-destructive/50 shrink-0" />
                <p className="text-sm text-muted-foreground leading-[1.8]">{t}</p>
              </li>
            ))}
          </ul>
        </Section>
      )}

      <Section num={5} title={sectionTitles.comoAtrapalha} delay={0.22}>
        {impactoPorArea.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {impactoPorArea.map((item, i) => (
              <div key={i} className="rounded-xl border border-border/40 bg-card px-4 py-3.5 shadow-sm">
                <p className="text-[9px] text-muted-foreground/50 uppercase tracking-[0.15em] font-semibold mb-1.5">{item.area}</p>
                <p className="text-sm text-foreground/85 leading-snug">{item.efeito}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-foreground/80 leading-[1.8]">{comoAtrapalha}</p>
        )}
      </Section>

      {/* Future consequence — after diagnosis, before action */}
      {ai.futureConsequence && (
        <Section num={6} title="Se nada mudar nos próximos meses" delay={0.25} accent="destructive">
          <CardBlock variant="alert">
            <div className="flex items-start gap-3">
              <TrendingDown className="w-4 h-4 text-destructive/60 mt-0.5 shrink-0" />
              <div>
                <p className="text-[9px] text-destructive/50 uppercase tracking-widest font-semibold mb-1.5">Consequência futura</p>
                <p className="text-sm text-foreground leading-[1.8]">{ai.futureConsequence}</p>
              </div>
            </div>
          </CardBlock>
        </Section>
      )}

      {/* Evolution comparison — after futureConsequence, before action */}
      <EvolutionComparisonSection ai={ai} delay={0.255} />

      <Section num={ai.futureConsequence ? (ai.evolutionComparison ? 8 : 7) : 6} title={sectionTitles.corrigirPrimeiro} delay={0.26} accent="primary">
        <CardBlock variant="primary">
          <div className="flex items-start gap-3">
            <ArrowRight className="w-4 h-4 text-primary/60 mt-0.5 shrink-0" />
            <div>
              <p className="text-[9px] text-primary/50 uppercase tracking-widest font-semibold mb-1.5">O que precisa mudar</p>
              <p className="text-sm text-foreground leading-[1.8]">{corrigirPrimeiro}</p>
            </div>
          </div>
        </CardBlock>
      </Section>

      {pararDeFazer?.length > 0 && (
        <Section num={ai.futureConsequence ? (ai.evolutionComparison ? 9 : 8) : 7} title={sectionTitles.pararDeFazer} delay={0.3} accent="destructive">
          <div className="space-y-2">
            {pararDeFazer.map((item: string, i: number) => (
              <div key={i} className="flex items-start gap-3 py-1.5 px-3.5 rounded-lg bg-destructive/[0.03] border border-destructive/10">
                <XCircle className="w-3.5 h-3.5 text-destructive/50 mt-0.5 shrink-0" />
                <p className="text-sm text-muted-foreground leading-[1.7]">{item}</p>
              </div>
            ))}
          </div>
        </Section>
      )}

      <Section num={ai.futureConsequence ? (ai.evolutionComparison ? 10 : 9) : 8} title={sectionTitles.acaoInicial} delay={0.34} accent="green">
        {ai.mentalCommand && (
          <div className="mb-4 rounded-xl border border-primary/20 bg-primary/[0.04] px-5 py-4">
            <p className="text-[9px] text-primary/50 uppercase tracking-[0.2em] font-semibold mb-2">Repita antes de agir</p>
            <p className="text-base font-semibold text-foreground italic leading-relaxed">"{ai.mentalCommand}"</p>
          </div>
        )}
        {microAcoes.length > 0 ? (
          <div className="space-y-3">
            {microAcoes.map((item, i) => (
              <div key={i} className="border border-green-500/20 bg-green-500/[0.04] rounded-xl px-5 py-4 shadow-sm">
                <div className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-lg bg-green-500/15 flex items-center justify-center text-[11px] font-bold text-green-600 shrink-0 mt-0.5">{i + 1}</span>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-foreground leading-[1.7]">{item.acao}</p>
                    {item.detalhe && <p className="text-xs text-muted-foreground/70 mt-1 leading-relaxed">{item.detalhe}</p>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <CardBlock variant="success">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-4 h-4 text-green-600/60 mt-0.5 shrink-0" />
              <div>
                <p className="text-[9px] text-green-700/50 dark:text-green-400/50 uppercase tracking-widest font-semibold mb-1.5">Faça isso agora</p>
                <p className="text-sm font-medium text-foreground leading-[1.8]">{acaoInicial}</p>
              </div>
            </div>
          </CardBlock>
        )}
      </Section>

    </>
  );
}

/* ── Legacy section titles ── */
interface SectionTitles {
  chamaAtencao: string;
  padraoRepetido: string;
  comoAparece: string;
  gatilhos: string;
  comoAtrapalha: string;
  corrigirPrimeiro: string;
  pararDeFazer: string;
  acaoInicial: string;
}

function getLegacySectionTitles(slug?: string): SectionTitles {
  const base: SectionTitles = {
    chamaAtencao: 'O que mais chama atenção',
    padraoRepetido: 'O padrão que mais se repete',
    comoAparece: 'Como isso aparece na rotina',
    gatilhos: 'O que dispara esse padrão',
    comoAtrapalha: 'Como isso te atrapalha',
    corrigirPrimeiro: 'Direção de ajuste',
    pararDeFazer: 'O que parar de fazer',
    acaoInicial: 'Próxima ação prática',
  };
  if (!slug) return base;
  if (slug.includes('execucao') || slug.includes('produtividade')) return { ...base, chamaAtencao: 'Onde sua execução trava', padraoRepetido: 'Seu tipo de bloqueio', comoAparece: 'Como isso aparece nos projetos', gatilhos: 'O que ativa a procrastinação', comoAtrapalha: 'O que isso causa no trabalho', corrigirPrimeiro: 'O que precisa mudar na execução', acaoInicial: 'Faça isso nos próximos 3 dias' };
  if (slug.includes('emocional') || slug.includes('emocoes') || slug.includes('reatividade')) return { ...base, chamaAtencao: 'O que domina suas reações', padraoRepetido: 'Seu tipo de reatividade', comoAparece: 'Situações de reação excessiva', gatilhos: 'O que dispara suas reações', comoAtrapalha: 'Onde você perde o controle', corrigirPrimeiro: 'O que mudar nas reações', acaoInicial: 'Pratique isso na próxima vez' };
  if (slug.includes('relacionamento') || slug.includes('apego')) return { ...base, chamaAtencao: 'Como você se conecta', padraoRepetido: 'Seu padrão nos relacionamentos', comoAparece: 'Onde os conflitos se repetem', gatilhos: 'O que ativa o modo defensivo', comoAtrapalha: 'O que isso causa nos vínculos', corrigirPrimeiro: 'O que mudar nos vínculos', acaoInicial: 'Teste isso na próxima conversa difícil' };
  if (slug.includes('autoimagem') || slug.includes('identidade')) return { ...base, chamaAtencao: 'Como você se enxerga', padraoRepetido: 'Sua distorção principal', comoAparece: 'Decisões que você evita', gatilhos: 'O que ativa sua autocrítica', comoAtrapalha: 'Onde essa visão te limita', corrigirPrimeiro: 'O que mudar na autoimagem', acaoInicial: 'Desafie isso esta semana' };
  if (slug.includes('dinheiro') || slug.includes('financ')) return { ...base, chamaAtencao: 'Sua relação real com dinheiro', padraoRepetido: 'Seu perfil financeiro', comoAparece: 'Onde perde dinheiro sem perceber', gatilhos: 'O que ativa impulsos financeiros', comoAtrapalha: 'Como afeta suas decisões', corrigirPrimeiro: 'O que mudar com dinheiro', acaoInicial: 'Faça isso na próxima compra' };
  if (slug.includes('oculto') || slug.includes('hidden')) return { ...base, chamaAtencao: 'O que você não vê em si', padraoRepetido: 'O mecanismo escondido', comoAparece: 'Onde você sabota sem perceber', gatilhos: 'O que ativa o padrão', comoAtrapalha: 'As consequências invisíveis', corrigirPrimeiro: 'O que mudar nos padrões ocultos', acaoInicial: 'Observe isso nos próximos dias' };
  if (slug.includes('proposito') || slug.includes('sentido')) return { ...base, chamaAtencao: 'Seu nível de conexão', padraoRepetido: 'Seu tipo de desconexão', comoAparece: 'Sinais de piloto automático', gatilhos: 'O que ativa a sensação de vazio', comoAtrapalha: 'Onde a falta de rumo aparece', corrigirPrimeiro: 'O que mudar na busca de propósito', acaoInicial: 'Reflexão para esta semana' };
  if (slug === 'padrao-comportamental') return { ...base, chamaAtencao: 'Seu padrão dominante', padraoRepetido: 'Como o padrão funciona', comoAparece: 'Onde ele se ativa', comoAtrapalha: 'O que esse padrão causa', corrigirPrimeiro: 'O comportamento a mudar primeiro', acaoInicial: 'Faça isso nos próximos 3 dias' };
  return base;
}

/* ── Evolution Comparison Section ── */
function EvolutionComparisonSection({ ai, delay = 0.25 }: { ai: any; delay?: number }) {
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
    <motion.section {...fade} transition={{ delay, duration: 0.4 }}>
      <div className="flex items-center gap-3.5 mb-5">
        <span className="w-7 h-7 rounded-lg flex items-center justify-center text-[11px] font-bold bg-primary/10 text-primary">
          <ArrowUpDown className="w-4 h-4" />
        </span>
        <h2 className="text-[15px] md:text-base font-extrabold text-foreground tracking-tight">Comparação com diagnóstico anterior</h2>
      </div>
      <div className="pl-[42px] space-y-5">
        {/* Score comparison bar */}
        <div className="rounded-2xl border border-border/40 bg-card px-5 py-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="text-center flex-1">
              <p className="text-[9px] text-muted-foreground/50 uppercase tracking-widest font-semibold mb-1">Anterior</p>
              <p className="text-2xl font-bold text-muted-foreground">{evo.previous_score}%</p>
            </div>
            <div className="px-4">
              <span className={`text-lg font-bold ${scoreDelta < 0 ? 'text-green-600' : scoreDelta > 0 ? 'text-destructive' : 'text-muted-foreground'}`}>
                →
              </span>
            </div>
            <div className="text-center flex-1">
              <p className="text-[9px] text-muted-foreground/50 uppercase tracking-widest font-semibold mb-1">Atual</p>
              <p className={`text-2xl font-bold ${scoreDelta < 0 ? 'text-green-600' : scoreDelta > 0 ? 'text-destructive' : 'text-foreground'}`}>{evo.current_score}%</p>
            </div>
          </div>
          <div className="text-center">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
              scoreDirection === 'melhorou' ? 'bg-green-500/10 text-green-600' :
              scoreDirection === 'piorou' ? 'bg-destructive/10 text-destructive' :
              'bg-secondary text-muted-foreground'
            }`}>
              {scoreDirection === 'melhorou' && <TrendingDown className="w-3 h-3" />}
              {scoreDirection === 'piorou' && <TrendingUp className="w-3 h-3" />}
              {scoreDirection === 'estável' && <Minus className="w-3 h-3" />}
              Score {scoreDirection} ({scoreDelta > 0 ? '+' : ''}{scoreDelta}%)
            </span>
          </div>
        </div>

        {/* Improved axes */}
        {improved.length > 0 && (
          <div>
            <p className="text-[9px] text-green-600/70 uppercase tracking-widest font-semibold mb-3 flex items-center gap-1.5">
              <TrendingDown className="w-3 h-3" /> Eixos que melhoraram
            </p>
            <div className="space-y-2">
              {improved.map((axis: any) => (
                <div key={axis.key} className="flex items-center justify-between rounded-xl border border-green-500/20 bg-green-500/[0.04] px-4 py-3">
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

        {/* Worsened axes */}
        {worsened.length > 0 && (
          <div>
            <p className="text-[9px] text-destructive/70 uppercase tracking-widest font-semibold mb-3 flex items-center gap-1.5">
              <TrendingUp className="w-3 h-3" /> Eixos que pioraram
            </p>
            <div className="space-y-2">
              {worsened.map((axis: any) => (
                <div key={axis.key} className="flex items-center justify-between rounded-xl border border-destructive/20 bg-destructive/[0.04] px-4 py-3">
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

        {/* Unchanged axes */}
        {unchanged.length > 0 && (
          <div>
            <p className="text-[9px] text-muted-foreground/50 uppercase tracking-widest font-semibold mb-3 flex items-center gap-1.5">
              <Minus className="w-3 h-3" /> Sem alteração significativa
            </p>
            <div className="flex flex-wrap gap-2">
              {unchanged.map((axis: any) => (
                <span key={axis.key} className="text-xs px-3 py-1.5 rounded-lg border border-border/40 bg-secondary/50 text-muted-foreground font-medium">
                  {axis.label}: {axis.value}%
                </span>
              ))}
            </div>
          </div>
        )}

        {/* AI summary text */}
        {evo.summary_text && (
          <div className="rounded-2xl border border-border/30 bg-card px-5 py-4 shadow-sm">
            <p className="text-[9px] text-muted-foreground/50 uppercase tracking-widest font-semibold mb-2">Análise da evolução</p>
            <p className="text-sm text-muted-foreground leading-[1.8]">{evo.summary_text}</p>
          </div>
        )}
      </div>
    </motion.section>
  );
}

/* ── Sub-components ── */

function Section({ num, title, delay = 0, accent, children }: { num: number; title: string; delay?: number; accent?: string; children: React.ReactNode }) {
  const accentBg = accent === 'destructive' ? 'bg-destructive/10 text-destructive' 
    : accent === 'green' ? 'bg-green-500/10 text-green-600'
    : accent === 'primary' ? 'bg-primary/10 text-primary'
    : 'bg-primary/10 text-primary';

  return (
    <motion.section {...fade} transition={{ delay, duration: 0.4 }}>
      <div className="flex items-center gap-3.5 mb-5">
        <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-[11px] font-bold ${accentBg}`}>
          {num}
        </span>
        <h2 className="text-[15px] md:text-base font-extrabold text-foreground tracking-tight">{title}</h2>
      </div>
      <div className="pl-[42px]">
        {children}
      </div>
    </motion.section>
  );
}

function CardBlock({ variant = 'default', children }: { variant?: 'default' | 'alert' | 'primary' | 'success' | 'muted'; children: React.ReactNode }) {
  const styles = {
    default: 'border-border/40 bg-card shadow-sm',
    alert: 'border-destructive/15 bg-destructive/[0.03] shadow-sm',
    primary: 'border-primary/15 bg-primary/[0.03] shadow-sm',
    success: 'border-green-500/20 bg-green-500/[0.04] shadow-sm',
    muted: 'border-border/25 bg-secondary/20',
  };
  return <div className={`border rounded-2xl px-6 py-5 ${styles[variant]}`}>{children}</div>;
}

function QuickReadCell({ icon, label, value, bold, colorClass }: { icon: React.ReactNode; label: string; value: string; bold?: boolean; colorClass?: string }) {
  return (
    <div className="bg-background px-5 py-5 border-b border-r border-border/15 last:border-r-0 sm:[&:nth-child(odd):last-child]:col-span-2">
      <div className="flex items-center gap-1.5 mb-2">
        {icon}
        <p className="text-[9px] text-muted-foreground/45 uppercase tracking-widest">{label}</p>
      </div>
      <p className={`text-sm leading-relaxed break-words hyphens-auto ${bold ? 'font-bold' : 'font-medium'} ${colorClass || 'text-foreground'}`}>
        {value}
      </p>
    </div>
  );
}

export default memo(Report);
