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
    chamaAtencao: 'O que mais chama atenção no seu resultado',
    padraoRepetido: 'O padrão que mais se repete em você',
    comoAparece: 'Como isso aparece na sua rotina',
    gatilhos: 'O que geralmente dispara esse padrão',
    comoAtrapalha: 'Como isso te atrapalha',
    corrigirPrimeiro: 'Direção de ajuste',
    pararDeFazer: 'O que parar de fazer agora',
    acaoInicial: 'Próxima ação prática',
  };

  if (!slug) return base;

  if (slug.includes('execucao') || slug.includes('produtividade')) {
    return { ...base, header: 'Sua leitura de execução', chamaAtencao: 'Onde sua execução trava', padraoRepetido: 'Seu tipo de bloqueio', comoAparece: 'Como isso aparece nos seus projetos', gatilhos: 'O que ativa a procrastinação', comoAtrapalha: 'O que isso causa no seu trabalho', corrigirPrimeiro: 'O que precisa mudar na sua execução', pararDeFazer: 'O que parar de fazer agora', acaoInicial: 'Faça isso nos próximos 3 dias' };
  }
  if (slug.includes('emocional') || slug.includes('emocoes') || slug.includes('reatividade')) {
    return { ...base, header: 'Sua leitura emocional', chamaAtencao: 'O que domina suas reações', padraoRepetido: 'Seu tipo de reatividade', comoAparece: 'Situações onde você reage demais', gatilhos: 'O que dispara suas reações', comoAtrapalha: 'Onde você perde o controle', corrigirPrimeiro: 'O que precisa mudar nas suas reações', pararDeFazer: 'O que parar de fazer agora', acaoInicial: 'Pratique isso na próxima vez' };
  }
  if (slug.includes('relacionamento') || slug.includes('apego')) {
    return { ...base, header: 'Sua leitura relacional', chamaAtencao: 'Como você se conecta com os outros', padraoRepetido: 'Seu padrão nos relacionamentos', comoAparece: 'Onde os conflitos se repetem', gatilhos: 'O que ativa seu modo defensivo', comoAtrapalha: 'O que isso causa nos seus vínculos', corrigirPrimeiro: 'O que precisa mudar nos seus vínculos', pararDeFazer: 'O que parar de fazer agora', acaoInicial: 'Teste isso na próxima conversa difícil' };
  }
  if (slug.includes('autoimagem') || slug.includes('identidade')) {
    return { ...base, header: 'Sua leitura de autoimagem', chamaAtencao: 'Como você se enxerga', padraoRepetido: 'Sua distorção principal', comoAparece: 'Decisões que você evita por causa disso', gatilhos: 'O que ativa sua autocrítica', comoAtrapalha: 'Onde essa visão te limita', corrigirPrimeiro: 'O que precisa mudar na sua autoimagem', pararDeFazer: 'O que parar de fazer agora', acaoInicial: 'Desafie isso esta semana' };
  }
  if (slug.includes('dinheiro') || slug.includes('financ')) {
    return { ...base, header: 'Sua leitura financeira', chamaAtencao: 'Sua relação real com dinheiro', padraoRepetido: 'Seu perfil financeiro', comoAparece: 'Onde você perde dinheiro sem perceber', gatilhos: 'O que ativa seus impulsos financeiros', comoAtrapalha: 'Como isso afeta suas decisões', corrigirPrimeiro: 'O que precisa mudar na sua relação com dinheiro', pararDeFazer: 'O que parar de fazer agora', acaoInicial: 'Faça isso na próxima compra' };
  }
  if (slug.includes('oculto') || slug.includes('hidden')) {
    return { ...base, header: 'Seus padrões ocultos', chamaAtencao: 'O que você não vê em si', padraoRepetido: 'O mecanismo que opera por baixo', comoAparece: 'Onde você sabota sem perceber', gatilhos: 'O que ativa o padrão escondido', comoAtrapalha: 'As consequências invisíveis', corrigirPrimeiro: 'O que precisa mudar nos seus padrões ocultos', pararDeFazer: 'O que parar de fazer agora', acaoInicial: 'Observe isso nos próximos dias' };
  }
  if (slug.includes('proposito') || slug.includes('sentido')) {
    return { ...base, header: 'Sua leitura de propósito', chamaAtencao: 'Seu nível de conexão com direção', padraoRepetido: 'Seu tipo de desconexão', comoAparece: 'Sinais de que você está no piloto automático', gatilhos: 'O que ativa a sensação de vazio', comoAtrapalha: 'Onde a falta de rumo aparece', corrigirPrimeiro: 'O que precisa mudar na sua busca de propósito', pararDeFazer: 'O que parar de fazer agora', acaoInicial: 'Uma reflexão prática para esta semana' };
  }
  if (slug === 'mapa-de-vida') {
    return { ...base, header: 'Seu mapa de vida', chamaAtencao: 'Sua área mais desequilibrada', padraoRepetido: 'Onde você compensa e onde negligencia', comoAparece: 'Como isso aparece na sua rotina', gatilhos: 'O que te faz negligenciar certas áreas', comoAtrapalha: 'O que esse desequilíbrio causa', corrigirPrimeiro: 'Qual área priorizar e por quê', pararDeFazer: 'O que parar de fazer agora', acaoInicial: 'Uma ação para a área mais crítica esta semana' };
  }
  if (slug === 'padrao-comportamental') {
    return { ...base, header: 'Seu raio-x comportamental', chamaAtencao: 'Seu padrão dominante', padraoRepetido: 'Como o padrão funciona', comoAparece: 'Onde ele se ativa no dia a dia', comoAtrapalha: 'O que esse padrão causa na sua vida', corrigirPrimeiro: 'O comportamento que precisa mudar primeiro', pararDeFazer: 'O que parar de fazer agora', acaoInicial: 'Faça isso nos próximos 3 dias' };
  }

  return base;
}

const fade = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
};

const Report = ({ result, onRestart, moduleSlug }: ReportProps) => {
  const info = intensityConfig[result.intensity];
  const { profile } = useAuth();

  // Category-specific section titles
  const sectionTitles = getCategorySectionTitles(moduleSlug);

  // Extract new-format fields with fallbacks
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
      <div className="max-w-xl mx-auto px-5 md:px-8 py-12 md:py-20">

        {/* Header */}
        <motion.header {...fade} transition={{ duration: 0.4 }} className="mb-12">
          <p className="text-[10px] text-muted-foreground/40 uppercase tracking-[0.25em] font-light mb-3">
            {sectionTitles.header}
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

        {/* Quick-read card */}
        <motion.div {...fade} transition={{ delay: 0.15, duration: 0.4 }} className="mb-12">
          <div className="border border-border/30 rounded-2xl overflow-hidden">
            <div className="bg-secondary/40 px-5 py-3">
              <p className="text-[10px] text-muted-foreground/50 uppercase tracking-[0.2em] font-medium">
                Leitura rápida
              </p>
            </div>
            <div className="grid grid-cols-2 gap-px bg-border/20">
              <div className="bg-background px-4 py-3.5">
                <p className="text-[9px] text-muted-foreground/40 uppercase tracking-widest mb-1">Padrão principal</p>
                <p className="text-sm font-semibold text-foreground leading-snug">
                  {result.interpretation?.behavioralProfile?.name || result.profileName || String(result.dominantPattern || '')}
                </p>
              </div>
              <div className="bg-background px-4 py-3.5">
                <p className="text-[9px] text-muted-foreground/40 uppercase tracking-widest mb-1">Intensidade</p>
                <div className="flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${info.bg}`} />
                  <p className={`text-sm font-semibold ${info.color}`}>{info.label}</p>
                </div>
              </div>
              <div className="bg-background px-4 py-3.5">
                <p className="text-[9px] text-muted-foreground/40 uppercase tracking-widest mb-1">Ponto de travamento</p>
                <p className="text-xs text-foreground/80 leading-snug">
                  {ai.blockingPoint || result.blockingPoint || 'Não identificado'}
                </p>
              </div>
              <div className="bg-background px-4 py-3.5">
                <p className="text-[9px] text-muted-foreground/40 uppercase tracking-widest mb-1">Foco de mudança</p>
                <p className="text-xs text-foreground/80 leading-snug">
                  {corrigirPrimeiro ? (corrigirPrimeiro.length > 80 ? corrigirPrimeiro.slice(0, 77) + '…' : corrigirPrimeiro) : 'Não identificado'}
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        <div className="space-y-10">

          {/* 1. O que mais chama atenção */}
          <Block num={1} title={sectionTitles.chamaAtencao} delay={0.05}>
            <Callout>
              <p className="text-sm text-foreground leading-[1.7]">{chamaAtencao}</p>
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

          {/* 2. O padrão que mais se repete */}
          <Block num={2} title={sectionTitles.padraoRepetido} delay={0.1}>
            {result.interpretation?.behavioralProfile && (
              <div className="bg-secondary/40 border border-border/30 rounded-xl px-4 py-3 mb-3">
                <p className="text-sm font-semibold text-foreground">
                  {result.interpretation.behavioralProfile.name}
                </p>
              </div>
            )}
            <p className="text-sm text-muted-foreground leading-[1.7]">{padraoRepetido}</p>
          </Block>

          {/* 3. Como isso aparece na sua rotina */}
          <Block num={3} title={sectionTitles.comoAparece} delay={0.14}>
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

          {/* 4. O que geralmente dispara esse padrão */}
          {gatilhos?.length > 0 && (
            <Block num={4} title={sectionTitles.gatilhos} delay={0.18}>
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

          {/* 5. Como isso te atrapalha — por área */}
          <Block num={5} title={sectionTitles.comoAtrapalha} delay={0.22}>
            {impactoPorArea.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {impactoPorArea.map((item, i) => (
                  <div key={i} className="border border-border/30 rounded-xl px-3.5 py-2.5">
                    <p className="text-[9px] text-muted-foreground/50 uppercase tracking-widest mb-0.5">{item.area}</p>
                    <p className="text-xs text-foreground/80 leading-snug">{item.efeito}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-foreground/80 leading-[1.7]">{comoAtrapalha}</p>
            )}
          </Block>

          {/* 6. Direção de ajuste */}
          <Block num={6} title={sectionTitles.corrigirPrimeiro} delay={0.26}>
            <div className="border border-primary/15 bg-primary/[0.03] rounded-xl px-4 py-3">
              <p className="text-[9px] text-muted-foreground/50 uppercase tracking-widest mb-1.5">O que precisa mudar</p>
              <p className="text-sm text-foreground leading-[1.7]">{corrigirPrimeiro}</p>
            </div>
          </Block>

          {/* 7. O que parar de fazer agora */}
          {pararDeFazer?.length > 0 && (
            <Block num={7} title={sectionTitles.pararDeFazer} delay={0.3}>
              <div className="space-y-1.5">
                {pararDeFazer.map((item: string, i: number) => (
                  <div key={i} className="flex items-start gap-2 py-1">
                    <span className="text-destructive/50 text-xs mt-0.5 shrink-0">✗</span>
                    <p className="text-sm text-muted-foreground leading-[1.7]">{item}</p>
                  </div>
                ))}
              </div>
            </Block>
          )}

          {/* 8. Próxima ação prática */}
          <Block num={8} title={sectionTitles.acaoInicial} delay={0.34}>
            <div className="bg-green-500/[0.06] border border-green-500/20 rounded-xl px-4 py-4">
              <p className="text-[9px] text-green-700/60 dark:text-green-400/60 uppercase tracking-widest mb-1.5">Faça isso agora</p>
              <p className="text-sm font-medium text-foreground leading-[1.7]">{acaoInicial}</p>
            </div>
          </Block>

          {/* Intensity map */}
          <motion.div {...fade} transition={{ delay: 0.42 }}>
            <p className="text-[10px] text-muted-foreground/50 uppercase tracking-[0.2em] font-medium mb-4">
              Intensidade por eixo
            </p>
            <div className="space-y-3">
              {result.allScores.slice(0, 8).map((score) => {
                const pct = Math.min(100, score.percentage);
                const barColor = pct > 65 ? 'bg-destructive/70' : pct >= 40 ? 'bg-yellow-500/70' : 'bg-green-500/70';
                return (
                  <div key={score.key}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-muted-foreground">{score.label}</span>
                      <span className="text-muted-foreground/50 tabular-nums">{pct}%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-border/40 overflow-hidden">
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
