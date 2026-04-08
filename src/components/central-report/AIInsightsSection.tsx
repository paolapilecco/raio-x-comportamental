import { motion } from 'framer-motion';
import { Brain, Eye, Target, Lightbulb, Sparkles, Zap } from 'lucide-react';
import { fadeUp, type AIInsights } from './types';

interface AIInsightsSectionProps {
  aiInsights: AIInsights | null;
  insightsLoading: boolean;
  hasAccess: boolean;
  onGenerate: () => void;
}

export function AIInsightsSection({ aiInsights, insightsLoading, hasAccess, onGenerate }: AIInsightsSectionProps) {
  return (
    <motion.div {...fadeUp} transition={{ delay: 0.35 }} className={`bg-gradient-to-br from-primary/5 via-primary/10 to-accent/5 rounded-xl border border-primary/20 p-6 md:p-8 shadow-sm ${!hasAccess ? 'filter blur-[6px]' : ''}`}>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Sparkles className="w-5 h-5 text-primary" />
          <h3 className="text-xl font-serif">Insights com IA</h3>
        </div>
        {!aiInsights && (
          <button onClick={onGenerate} disabled={insightsLoading} className="px-5 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2">
            {insightsLoading ? (<><div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />Analisando...</>) : (<><Sparkles className="w-4 h-4" />Gerar Análise</>)}
          </button>
        )}
      </div>

      {!aiInsights && !insightsLoading && <p className="text-sm text-muted-foreground">A IA analisará o histórico para gerar interpretações e recomendações.</p>}
      {insightsLoading && <div className="space-y-4 animate-pulse"><div className="h-4 bg-muted/50 rounded w-full" /><div className="h-4 bg-muted/50 rounded w-5/6" /><div className="h-4 bg-muted/50 rounded w-4/6" /></div>}

      {aiInsights && (
        <div className="space-y-6">
          <div>
            <div className="flex items-center gap-2 mb-3"><Brain className="w-4 h-4 text-primary" /><p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Interpretação Personalizada</p></div>
            <div className="text-sm text-foreground/80 leading-relaxed whitespace-pre-line">{aiInsights.interpretacao_personalizada}</div>
          </div>
          {aiInsights.padroes_invisiveis.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3"><Eye className="w-4 h-4 text-primary" /><p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Padrões Invisíveis</p></div>
              <div className="space-y-2">{aiInsights.padroes_invisiveis.map((p, i) => (<div key={i} className="flex items-start gap-3 bg-background/50 border border-border rounded-lg p-3"><span className="mt-0.5 w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center text-xs text-primary font-medium shrink-0">{i + 1}</span><p className="text-sm text-foreground/80">{p}</p></div>))}</div>
            </div>
          )}
          {aiInsights.contradicoes_profundas.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3"><Target className="w-4 h-4 text-destructive" /><p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Contradições Profundas</p></div>
              <div className="space-y-2">{aiInsights.contradicoes_profundas.map((c, i) => (<div key={i} className="flex items-start gap-3 bg-destructive/5 border border-destructive/10 rounded-lg p-3"><Zap className="w-4 h-4 text-destructive mt-0.5 shrink-0" /><p className="text-sm text-foreground/80">{c}</p></div>))}</div>
            </div>
          )}
          {aiInsights.recomendacoes_praticas.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3"><Lightbulb className="w-4 h-4 text-primary" /><p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Recomendações Práticas</p></div>
              <div className="space-y-2">{aiInsights.recomendacoes_praticas.map((r, i) => (<div key={i} className="flex items-start gap-3 bg-primary/5 border border-primary/10 rounded-lg p-3"><span className="mt-0.5 w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center text-xs text-primary font-medium shrink-0">✓</span><p className="text-sm text-foreground/80">{r}</p></div>))}</div>
            </div>
          )}
          <button onClick={onGenerate} disabled={insightsLoading} className="text-sm text-primary hover:underline flex items-center gap-1"><Sparkles className="w-3 h-3" />Gerar nova análise</button>
        </div>
      )}
    </motion.div>
  );
}
