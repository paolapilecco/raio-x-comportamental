import { motion } from 'framer-motion';
import { Shield, ShieldAlert, ShieldCheck, AlertTriangle, Eye, Brain, Activity } from 'lucide-react';
import { InterpretiveInsight } from '@/types/diagnostic';

const fade = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
};

interface DiagnosticTrustLayerProps {
  interpretation?: InterpretiveInsight;
}

function getConfidenceConfig(level?: string, score?: number) {
  const s = score ?? 50;
  if (level === 'alta' || s >= 75) return {
    label: 'Alta confiabilidade',
    color: 'text-green-600',
    bg: 'bg-green-500',
    bgLight: 'bg-green-500/8',
    border: 'border-green-500/20',
    icon: ShieldCheck,
    message: 'Diagnóstico com alta confiabilidade baseado na consistência das suas respostas.',
  };
  if (level === 'media' || s >= 45) return {
    label: 'Confiabilidade moderada',
    color: 'text-yellow-600',
    bg: 'bg-yellow-500',
    bgLight: 'bg-yellow-500/8',
    border: 'border-yellow-500/20',
    icon: Shield,
    message: 'Algumas respostas apresentaram variação. O diagnóstico reflete tendências, não certezas absolutas.',
  };
  return {
    label: 'Confiabilidade baixa',
    color: 'text-destructive',
    bg: 'bg-destructive',
    bgLight: 'bg-destructive/8',
    border: 'border-destructive/20',
    icon: ShieldAlert,
    message: 'Detectamos inconsistências significativas nas respostas. Isso pode indicar autoengano ou dúvida interna.',
  };
}

function getResponsePatternFeedback(flags?: string[]): string[] {
  if (!flags || flags.length === 0) return [];
  const map: Record<string, string> = {
    acquiescence_bias: 'Você tende a concordar com as afirmações — suas respostas mostram baixa variação.',
    extreme_responding: 'Suas respostas vão de um extremo ao outro — isso pode indicar reatividade emocional.',
    low_variance: 'Você respondeu de forma muito uniforme — isso pode esconder nuances reais.',
    central_tendency: 'Você evitou posições extremas — pode estar se protegendo de se ver com clareza.',
    social_desirability: 'Você tende a responder de forma idealizada — o que você quer ser, não o que você é.',
    inconsistent_mirrors: 'Respostas em perguntas similares foram contraditórias — há conflito interno ativo.',
  };
  return flags.map(f => map[f] || '').filter(Boolean);
}

function getSelfDeceptionLevel(index: number) {
  if (index >= 70) return { label: 'Muito alto', color: 'text-destructive', message: 'Existe uma desconexão profunda entre como você se vê e como você realmente age.' };
  if (index >= 50) return { label: 'Elevado', color: 'text-yellow-600', message: 'Você se percebe de forma diferente do que seus comportamentos revelam.' };
  if (index >= 30) return { label: 'Moderado', color: 'text-muted-foreground', message: 'Há pequenas discrepâncias entre autopercepção e comportamento real.' };
  return { label: 'Baixo', color: 'text-green-600', message: 'Suas respostas são coerentes com seus padrões comportamentais.' };
}

export function DiagnosticTrustLayer({ interpretation }: DiagnosticTrustLayerProps) {
  if (!interpretation) return null;

  const confidenceScore = interpretation.confidenceScore ?? interpretation.consistencyScore ?? 50;
  const confidenceLevel = interpretation.confidenceLevel;
  const config = getConfidenceConfig(confidenceLevel, confidenceScore);
  const ConfidenceIcon = config.icon;

  const selfDeceptionIndex = interpretation.selfDeceptionIndex ?? 0;
  const deception = getSelfDeceptionLevel(selfDeceptionIndex);

  const contradictions = interpretation.contradictions || [];
  const patternFeedback = getResponsePatternFeedback(interpretation.responsePatternFlags);

  const hasContent = confidenceScore > 0 || contradictions.length > 0 || selfDeceptionIndex > 0 || patternFeedback.length > 0;
  if (!hasContent) return null;

  return (
    <motion.section {...fade} transition={{ delay: 0.03, duration: 0.5 }} className="space-y-8">

      {/* ── Impact Statement ── */}
      <motion.div {...fade} transition={{ delay: 0.01, duration: 0.6 }}>
        <div className="text-center py-6">
          <p className="text-[10px] text-muted-foreground/30 uppercase tracking-[0.35em] font-light mb-4">
            Antes de prosseguir
          </p>
          <p className="text-lg md:text-xl font-serif font-semibold text-foreground leading-snug max-w-md mx-auto">
            Esse diagnóstico mostra quem você é quando ninguém está olhando.
          </p>
        </div>
      </motion.div>

      {/* ── Confidence Indicator ── */}
      <motion.div {...fade} transition={{ delay: 0.06, duration: 0.4 }}>
        <div className={`rounded-2xl border ${config.border} ${config.bgLight} px-6 py-6`}>
          <div className="flex items-center gap-3 mb-4">
            <ConfidenceIcon className={`w-5 h-5 ${config.color}`} />
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <p className={`text-sm font-semibold ${config.color}`}>{config.label}</p>
                <span className={`text-2xl font-serif font-bold tabular-nums ${config.color}`}>
                  {Math.round(confidenceScore)}%
                </span>
              </div>
            </div>
          </div>
          {/* Progress bar */}
          <div className="h-2 rounded-full bg-border/20 overflow-hidden mb-3">
            <motion.div
              className={`h-full rounded-full ${config.bg}`}
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(100, confidenceScore)}%` }}
              transition={{ duration: 0.8, delay: 0.3, ease: 'easeOut' }}
            />
          </div>
          <p className="text-[13px] text-muted-foreground/70 leading-relaxed">{config.message}</p>
        </div>
      </motion.div>

      {/* ── Self-Deception Index ── */}
      {selfDeceptionIndex > 0 && (
        <motion.div {...fade} transition={{ delay: 0.1, duration: 0.4 }}>
          <div className="rounded-2xl border border-border/20 bg-card/50 px-6 py-6">
            <div className="flex items-center gap-3 mb-4">
              <Eye className="w-4 h-4 text-muted-foreground/50" />
              <p className="text-[9px] text-muted-foreground/40 uppercase tracking-[0.25em] font-medium">Índice de autoengano</p>
            </div>
            <div className="flex items-end gap-3 mb-3">
              <span className={`text-3xl font-serif font-bold tabular-nums ${deception.color}`}>
                {selfDeceptionIndex}%
              </span>
              <span className={`text-xs font-medium ${deception.color} mb-1`}>{deception.label}</span>
            </div>
            <div className="h-1.5 rounded-full bg-border/20 overflow-hidden mb-4">
              <motion.div
                className={`h-full rounded-full ${selfDeceptionIndex >= 50 ? 'bg-destructive/60' : selfDeceptionIndex >= 30 ? 'bg-yellow-500/60' : 'bg-green-500/60'}`}
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(100, selfDeceptionIndex)}%` }}
                transition={{ duration: 0.7, delay: 0.4, ease: 'easeOut' }}
              />
            </div>
            <p className="text-[13px] text-muted-foreground/70 leading-relaxed">{deception.message}</p>
          </div>
        </motion.div>
      )}

      {/* ── Contradictions Detected ── */}
      {contradictions.length > 0 && (
        <motion.div {...fade} transition={{ delay: 0.14, duration: 0.4 }}>
          <div className="mb-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-yellow-600/60" />
              <p className="text-[9px] text-muted-foreground/40 uppercase tracking-[0.25em] font-medium">Inconsistências detectadas</p>
            </div>
          </div>
          <div className="space-y-3">
            {contradictions.slice(0, 3).map((c, i) => (
              <div key={i} className="rounded-xl border border-yellow-500/15 bg-yellow-500/[0.03] px-5 py-4">
                <p className="text-xs font-medium text-yellow-700 mb-1.5">{c.label}</p>
                <p className="text-[13px] text-muted-foreground/80 leading-relaxed">{c.description}</p>
                {c.evidence && (
                  <p className="text-[11px] text-muted-foreground/50 mt-2 italic">{c.evidence}</p>
                )}
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* ── Response Pattern Feedback ── */}
      {patternFeedback.length > 0 && (
        <motion.div {...fade} transition={{ delay: 0.18, duration: 0.4 }}>
          <div className="rounded-2xl border border-border/20 bg-card/50 px-6 py-6">
            <div className="flex items-center gap-2 mb-4">
              <Activity className="w-4 h-4 text-muted-foreground/50" />
              <p className="text-[9px] text-muted-foreground/40 uppercase tracking-[0.25em] font-medium">Padrão de resposta identificado</p>
            </div>
            <div className="space-y-3">
              {patternFeedback.map((feedback, i) => (
                <div key={i} className="flex items-start gap-3">
                  <Brain className="w-3.5 h-3.5 text-primary/40 mt-0.5 shrink-0" />
                  <p className="text-[13px] text-muted-foreground/80 leading-relaxed">{feedback}</p>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      )}

      {/* ── Separator ── */}
      <div className="flex items-center gap-4 py-2">
        <div className="flex-1 h-px bg-border/15" />
        <p className="text-[9px] text-muted-foreground/25 uppercase tracking-[0.3em] font-light">diagnóstico detalhado</p>
        <div className="flex-1 h-px bg-border/15" />
      </div>
    </motion.section>
  );
}
