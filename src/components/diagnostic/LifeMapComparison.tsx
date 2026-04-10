import { motion } from 'framer-motion';
import { Minus, ArrowUpRight, ArrowDownRight } from 'lucide-react';

interface AreaComparison {
  key: string;
  label: string;
  previous: number;
  current: number;
  diff: number;
}

interface Props {
  comparisons: AreaComparison[];
  previousDate: string;
}

const fade = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
};

function getDiffColor(diff: number) {
  if (diff > 0) return { text: 'text-green-600', bg: 'bg-green-500/[0.06]', icon: ArrowUpRight };
  if (diff < 0) return { text: 'text-destructive', bg: 'bg-destructive/[0.06]', icon: ArrowDownRight };
  return { text: 'text-muted-foreground', bg: 'bg-secondary/40', icon: Minus };
}

export function LifeMapComparison({ comparisons, previousDate }: Props) {
  const improved = comparisons.filter(c => c.diff > 0);
  const worsened = comparisons.filter(c => c.diff < 0);
  const stable = comparisons.filter(c => c.diff === 0);
  const stillFragile = comparisons.filter(c => c.current < 70 && c.previous < 70);

  const avgDiff = comparisons.length > 0
    ? Math.round(comparisons.reduce((s, c) => s + c.diff, 0) / comparisons.length)
    : 0;

  const formattedDate = new Date(previousDate).toLocaleDateString('pt-BR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  return (
    <motion.section {...fade} transition={{ delay: 0.45 }} className="mb-12">
      <div className="flex items-center gap-2 mb-1">
        <span className="w-5 h-5 rounded-md bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary">
          ⟳
        </span>
        <h2 className="text-sm font-semibold text-foreground tracking-tight">
          Comparação com sua avaliação anterior
        </h2>
      </div>
      <p className="text-[10px] text-muted-foreground/50 mb-4">
        Última avaliação em {formattedDate}
      </p>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-2 mb-5">
        <div className="border border-green-500/20 bg-green-500/[0.04] rounded-xl px-3 py-3 text-center">
          <p className="text-lg font-bold text-green-600">{improved.length}</p>
          <p className="text-[9px] text-muted-foreground/60 uppercase tracking-widest">Melhoraram</p>
        </div>
        <div className="border border-border/30 bg-secondary/30 rounded-xl px-3 py-3 text-center">
          <p className="text-lg font-bold text-muted-foreground">{stable.length}</p>
          <p className="text-[9px] text-muted-foreground/60 uppercase tracking-widest">Estáveis</p>
        </div>
        <div className="border border-destructive/20 bg-destructive/[0.04] rounded-xl px-3 py-3 text-center">
          <p className="text-lg font-bold text-destructive">{worsened.length}</p>
          <p className="text-[9px] text-muted-foreground/60 uppercase tracking-widest">Caíram</p>
        </div>
      </div>

      {/* Average change */}
      <div className="border border-border/30 rounded-xl px-4 py-3 mb-5">
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">Variação média geral</p>
          <span className={`text-sm font-semibold tabular-nums ${avgDiff > 0 ? 'text-green-600' : avgDiff < 0 ? 'text-destructive' : 'text-muted-foreground'}`}>
            {avgDiff > 0 ? '+' : ''}{avgDiff}pts
          </span>
        </div>
      </div>

      {/* Per-area comparison */}
      <div className="space-y-2">
        {comparisons
          .sort((a, b) => b.diff - a.diff)
          .map((area) => {
            const color = getDiffColor(area.diff);
            const Icon = color.icon;
            return (
              <div key={area.key} className={`flex items-center gap-3 ${color.bg} border border-border/20 rounded-xl px-4 py-3`}>
                <Icon className={`w-4 h-4 ${color.text} shrink-0`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{area.label}</p>
                  <p className="text-[10px] text-muted-foreground/60 tabular-nums">
                    {area.previous}% → {area.current}%
                  </p>
                </div>
                <span className={`text-sm font-semibold ${color.text} tabular-nums`}>
                  {area.diff > 0 ? '+' : ''}{area.diff}pts
                </span>
              </div>
            );
          })}
      </div>

      {/* Still fragile areas */}
      {stillFragile.length > 0 && (
        <div className="mt-5 border border-amber-500/20 bg-amber-500/[0.04] rounded-xl px-4 py-3">
          <p className="text-[9px] text-amber-600 uppercase tracking-widest font-medium mb-2">
            Áreas que continuam frágeis
          </p>
          <div className="space-y-1">
            {stillFragile.map((area) => (
              <div key={area.key} className="flex items-center justify-between">
                <p className="text-xs text-foreground/80">{area.label}</p>
                <span className="text-[10px] text-muted-foreground/60 tabular-nums">
                  {area.previous}% → {area.current}%
                </span>
              </div>
            ))}
          </div>
          <p className="text-[10px] text-muted-foreground/50 mt-2 leading-relaxed">
            Essas áreas precisam de mais tempo e atenção. Revise as ações do plano e ajuste o que não funcionou.
          </p>
        </div>
      )}

      {/* Improved areas highlight */}
      {improved.length > 0 && (
        <div className="mt-4 border border-green-500/15 bg-green-500/[0.03] rounded-xl px-4 py-3">
          <p className="text-[9px] text-green-600 uppercase tracking-widest font-medium mb-1">
            Progresso real
          </p>
          <p className="text-xs text-foreground/70 leading-relaxed">
            {improved.length === 1
              ? `A área ${improved[0].label} subiu ${improved[0].diff} pontos. Isso mostra que suas ações estão funcionando.`
              : `${improved.length} áreas melhoraram. Destaque para ${improved[0].label} (+${improved[0].diff}pts). Continue com o que está dando certo.`}
          </p>
        </div>
      )}
    </motion.section>
  );
}
