import { motion } from 'framer-motion';
import { DiagnosticResult, IntensityLevel } from '@/types/diagnostic';
import { Download, ChevronRight, Zap, Target, AlertTriangle, ArrowRight, XCircle, CheckCircle2, BarChart3 } from 'lucide-react';
import { generateDiagnosticPdf } from '@/lib/generatePdf';
import { generateLifeMapPdf } from '@/lib/generateLifeMapPdf';
import { useAuth } from '@/contexts/AuthContext';
import { useAxisLabels } from '@/hooks/useAxisLabels';
import LifeMapReport from './LifeMapReport';

interface ReportProps {
  result: DiagnosticResult;
  onRestart: () => void;
  moduleSlug?: string;
}

const intensityConfig: Record<IntensityLevel, { label: string; color: string; bg: string; ring: string }> = {
  leve: { label: 'Leve', color: 'text-green-600', bg: 'bg-green-500', ring: 'ring-green-500/20' },
  moderado: { label: 'Moderado', color: 'text-yellow-600', bg: 'bg-yellow-500', ring: 'ring-yellow-500/20' },
  alto: { label: 'Alto', color: 'text-destructive', bg: 'bg-destructive', ring: 'ring-destructive/20' },
};

interface SectionTitles {
  header: string;
  chamaAtencao: string;
  padraoRepetido: string;
  comoAparece: string;
  gatilhos: string;
  comoAtrapalha: string;
  corrigirPrimeiro: string;
  pararDeFazer: string;
  acaoInicial: string;
}

function getCategorySectionTitles(slug?: string): SectionTitles {
  const base: SectionTitles = {
    header: 'Sua leitura',
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

  if (slug.includes('execucao') || slug.includes('produtividade')) {
    return { ...base, header: 'Sua leitura de execução', chamaAtencao: 'Onde sua execução trava', padraoRepetido: 'Seu tipo de bloqueio', comoAparece: 'Como isso aparece nos projetos', gatilhos: 'O que ativa a procrastinação', comoAtrapalha: 'O que isso causa no trabalho', corrigirPrimeiro: 'O que precisa mudar na execução', pararDeFazer: 'O que parar de fazer', acaoInicial: 'Faça isso nos próximos 3 dias' };
  }
  if (slug.includes('emocional') || slug.includes('emocoes') || slug.includes('reatividade')) {
    return { ...base, header: 'Sua leitura emocional', chamaAtencao: 'O que domina suas reações', padraoRepetido: 'Seu tipo de reatividade', comoAparece: 'Situações de reação excessiva', gatilhos: 'O que dispara suas reações', comoAtrapalha: 'Onde você perde o controle', corrigirPrimeiro: 'O que mudar nas reações', pararDeFazer: 'O que parar de fazer', acaoInicial: 'Pratique isso na próxima vez' };
  }
  if (slug.includes('relacionamento') || slug.includes('apego')) {
    return { ...base, header: 'Sua leitura relacional', chamaAtencao: 'Como você se conecta', padraoRepetido: 'Seu padrão nos relacionamentos', comoAparece: 'Onde os conflitos se repetem', gatilhos: 'O que ativa o modo defensivo', comoAtrapalha: 'O que isso causa nos vínculos', corrigirPrimeiro: 'O que mudar nos vínculos', pararDeFazer: 'O que parar de fazer', acaoInicial: 'Teste isso na próxima conversa difícil' };
  }
  if (slug.includes('autoimagem') || slug.includes('identidade')) {
    return { ...base, header: 'Sua leitura de autoimagem', chamaAtencao: 'Como você se enxerga', padraoRepetido: 'Sua distorção principal', comoAparece: 'Decisões que você evita', gatilhos: 'O que ativa sua autocrítica', comoAtrapalha: 'Onde essa visão te limita', corrigirPrimeiro: 'O que mudar na autoimagem', pararDeFazer: 'O que parar de fazer', acaoInicial: 'Desafie isso esta semana' };
  }
  if (slug.includes('dinheiro') || slug.includes('financ')) {
    return { ...base, header: 'Sua leitura financeira', chamaAtencao: 'Sua relação real com dinheiro', padraoRepetido: 'Seu perfil financeiro', comoAparece: 'Onde perde dinheiro sem perceber', gatilhos: 'O que ativa impulsos financeiros', comoAtrapalha: 'Como afeta suas decisões', corrigirPrimeiro: 'O que mudar com dinheiro', pararDeFazer: 'O que parar de fazer', acaoInicial: 'Faça isso na próxima compra' };
  }
  if (slug.includes('oculto') || slug.includes('hidden')) {
    return { ...base, header: 'Seus padrões ocultos', chamaAtencao: 'O que você não vê em si', padraoRepetido: 'O mecanismo escondido', comoAparece: 'Onde você sabota sem perceber', gatilhos: 'O que ativa o padrão', comoAtrapalha: 'As consequências invisíveis', corrigirPrimeiro: 'O que mudar nos padrões ocultos', pararDeFazer: 'O que parar de fazer', acaoInicial: 'Observe isso nos próximos dias' };
  }
  if (slug.includes('proposito') || slug.includes('sentido')) {
    return { ...base, header: 'Sua leitura de propósito', chamaAtencao: 'Seu nível de conexão', padraoRepetido: 'Seu tipo de desconexão', comoAparece: 'Sinais de piloto automático', gatilhos: 'O que ativa a sensação de vazio', comoAtrapalha: 'Onde a falta de rumo aparece', corrigirPrimeiro: 'O que mudar na busca de propósito', pararDeFazer: 'O que parar de fazer', acaoInicial: 'Reflexão para esta semana' };
  }
  if (slug === 'mapa-de-vida') {
    return { ...base, header: 'Seu mapa de vida', chamaAtencao: 'Área mais desequilibrada', padraoRepetido: 'Onde compensa e negligencia', comoAparece: 'Como aparece na rotina', gatilhos: 'O que faz negligenciar', comoAtrapalha: 'O que o desequilíbrio causa', corrigirPrimeiro: 'Qual área priorizar', pararDeFazer: 'O que parar de fazer', acaoInicial: 'Ação para a área mais crítica' };
  }
  if (slug === 'padrao-comportamental') {
    return { ...base, header: 'Seu raio-x comportamental', chamaAtencao: 'Seu padrão dominante', padraoRepetido: 'Como o padrão funciona', comoAparece: 'Onde ele se ativa', comoAtrapalha: 'O que esse padrão causa', corrigirPrimeiro: 'O comportamento a mudar primeiro', pararDeFazer: 'O que parar de fazer', acaoInicial: 'Faça isso nos próximos 3 dias' };
  }

  return base;
}

const fade = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
};

const Report = ({ result, onRestart, moduleSlug }: ReportProps) => {
  const info = intensityConfig[result.intensity];
  const { profile } = useAuth();

  if (moduleSlug === 'mapa-de-vida') {
    return <LifeMapReport result={result} onRestart={onRestart} />;
  }

  const sectionTitles = getCategorySectionTitles(moduleSlug);

  const ai = (result as any);
  const chamaAtencao = ai.chamaAtencao || ai.resumoPrincipal || result.criticalDiagnosis;
  const padraoRepetido = ai.padraoRepetido || ai.padraoIdentificado || result.mechanism;
  const comoAparece = ai.comoAparece || result.mentalState;
  const gatilhos = ai.gatilhos || result.triggers;
  const comoAtrapalha = ai.comoAtrapalha || ai.significadoPratico || result.corePain;
  const impactoPorArea: { area: string; efeito: string }[] = ai.impactoPorArea || ai.impactoVida?.map((l: any) => ({ area: l.area || l.pillar, efeito: l.efeito || l.impact })) || result.lifeImpact?.map((l: any) => ({ area: l.pillar, efeito: l.impact })) || [];
  const corrigirPrimeiro = ai.corrigirPrimeiro || ai.direcaoAjuste || result.keyUnlockArea;
  const pararDeFazer = ai.pararDeFazer || ai.oQueEvitar || result.whatNotToDo;
  const acaoInicial = ai.acaoInicial || ai.proximoPasso || (result.exitStrategy?.[0]?.action) || result.direction;

  const handleDownloadPdf = () => {
    if (moduleSlug === 'mapa-de-vida') {
      generateLifeMapPdf(result.allScores, profile?.name);
    } else {
      generateDiagnosticPdf(result, profile?.name);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-6 md:px-12 py-14 md:py-24">

        {/* ── Header ── */}
        <motion.header {...fade} transition={{ duration: 0.5 }} className="mb-12">
          <p className="text-[10px] text-muted-foreground/40 uppercase tracking-[0.3em] font-light mb-5">
            {sectionTitles.header}
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
                value={corrigirPrimeiro || 'Não identificado'}
              />
            </div>
          </div>
        </motion.div>

        {/* ── Sections ── */}
        <div className="space-y-16">

          {/* 1. O que mais chama atenção */}
          <Section num={1} title={sectionTitles.chamaAtencao} delay={0.05} accent="destructive">
            <CardBlock variant="alert">
              <p className="text-sm text-foreground leading-[1.8]">{chamaAtencao}</p>
            </CardBlock>
          </Section>

          {/* Blind spot */}
          {result.interpretation?.blindSpot?.realProblem && (
            <motion.div {...fade} transition={{ delay: 0.07 }} className="-mt-6">
              <CardBlock variant="muted">
                <p className="text-[10px] text-muted-foreground/50 uppercase tracking-widest font-semibold mb-2.5">Ponto cego</p>
                <p className="text-xs text-muted-foreground/70 italic mb-2">
                  O que você acredita: {result.interpretation.blindSpot.perceivedProblem}
                </p>
                <div className="flex items-start gap-2">
                  <ChevronRight className="w-3.5 h-3.5 text-destructive/50 mt-0.5 shrink-0" />
                  <p className="text-sm text-foreground leading-[1.7]">
                    {result.interpretation.blindSpot.realProblem}
                  </p>
                </div>
              </CardBlock>
            </motion.div>
          )}

          {/* 2. Padrão que se repete */}
          <Section num={2} title={sectionTitles.padraoRepetido} delay={0.1}>
            {result.interpretation?.behavioralProfile && (
              <div className="bg-secondary/50 border border-border/40 rounded-xl px-4 py-3 mb-4">
                <p className="text-sm font-bold text-foreground">
                  {result.interpretation.behavioralProfile.name}
                </p>
              </div>
            )}
            <p className="text-sm text-muted-foreground leading-[1.8]">{padraoRepetido}</p>
          </Section>

          {/* 3. Como aparece na rotina */}
          <Section num={3} title={sectionTitles.comoAparece} delay={0.14}>
            <p className="text-sm text-muted-foreground leading-[1.8]">{comoAparece}</p>
            {result.selfSabotageCycle?.length > 0 && (
              <div className="mt-4 space-y-1.5">
                {result.selfSabotageCycle.map((step, i) => (
                  <div key={i} className="flex items-start gap-3 py-1.5">
                    <span className="w-5 h-5 rounded-full bg-secondary/80 border border-border/50 flex items-center justify-center text-[10px] font-bold text-muted-foreground shrink-0 mt-0.5">
                      {i + 1}
                    </span>
                    <p className="text-sm text-muted-foreground leading-[1.7]">{step}</p>
                  </div>
                ))}
              </div>
            )}
          </Section>

          {/* 4. Gatilhos */}
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

          {/* 5. Impacto por área */}
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

          {/* 6. Direção de ajuste */}
          <Section num={6} title={sectionTitles.corrigirPrimeiro} delay={0.26} accent="primary">
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

          {/* 7. O que parar de fazer */}
          {pararDeFazer?.length > 0 && (
            <Section num={7} title={sectionTitles.pararDeFazer} delay={0.3} accent="destructive">
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

          {/* 8. Próxima ação prática */}
          <Section num={8} title={sectionTitles.acaoInicial} delay={0.34} accent="green">
            {/* Mental Command */}
            {(ai.mentalCommand) && (
              <div className="mb-4 rounded-xl border border-primary/20 bg-primary/[0.04] px-5 py-4">
                <p className="text-[9px] text-primary/50 uppercase tracking-[0.2em] font-semibold mb-2">
                  Repita antes de agir
                </p>
                <p className="text-base font-semibold text-foreground italic leading-relaxed">
                  "{ai.mentalCommand}"
                </p>
              </div>
            )}
            <CardBlock variant="success">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-4 h-4 text-green-600/60 mt-0.5 shrink-0" />
                <div>
                  <p className="text-[9px] text-green-700/50 dark:text-green-400/50 uppercase tracking-widest font-semibold mb-1.5">Faça isso agora</p>
                  <p className="text-sm font-medium text-foreground leading-[1.8]">{acaoInicial}</p>
                </div>
              </div>
            </CardBlock>
          </Section>

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
                      <span className="text-muted-foreground font-medium">{score.label}</span>
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

export default Report;
