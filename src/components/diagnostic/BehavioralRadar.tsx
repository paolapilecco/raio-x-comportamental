import { motion } from 'framer-motion';
import { memo, useMemo } from 'react';
import { ShieldCheck } from 'lucide-react';
import { getBehavioralAxisLabel } from '@/lib/axisLabelsBehavioral';

export interface RadarScore {
  key: string;
  label?: string;
  percentage: number;
}

interface BehavioralRadarProps {
  scores: RadarScore[];
  /** Limit number of axes drawn (8 looks best) */
  maxAxes?: number;
}

/**
 * Premium clinical-style radar chart for behavioral axes.
 * - No raw numbers shown — uses qualitative bands (Equilibrado / Em Atenção / Crítico)
 * - PT-BR labels via getBehavioralAxisLabel
 * - Three concentric intensity zones with semantic tints
 * - Credibility seal to reinforce authority
 */
const BehavioralRadarComponent = ({ scores, maxAxes = 8 }: BehavioralRadarProps) => {
  const axes = useMemo(() => scores.slice(0, maxAxes), [scores, maxAxes]);

  // SVG geometry
  const size = 360;
  const cx = size / 2;
  const cy = size / 2;
  const radius = 130;
  const n = axes.length;

  // Generate axis points (start from top, clockwise)
  const angleFor = (i: number) => -Math.PI / 2 + (i * 2 * Math.PI) / n;

  const polygonPoints = useMemo(() => {
    if (n === 0) return '';
    return axes
      .map((s, i) => {
        const a = angleFor(i);
        const r = (Math.min(100, Math.max(0, s.percentage)) / 100) * radius;
        return `${cx + Math.cos(a) * r},${cy + Math.sin(a) * r}`;
      })
      .join(' ');
  }, [axes, n]);

  const labelFor = (s: RadarScore) => getBehavioralAxisLabel(s.key, s.label);

  const intensityFor = (pct: number): { label: string; color: string } => {
    if (pct > 65) return { label: 'Crítico', color: 'hsl(var(--destructive))' };
    if (pct >= 40) return { label: 'Em atenção', color: 'hsl(45 75% 50%)' };
    return { label: 'Equilibrado', color: 'hsl(140 50% 40%)' };
  };

  if (n === 0) return null;

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
      className="space-y-8"
    >
      {/* Header with credibility seal */}
      <div className="flex flex-col items-center text-center space-y-4">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-primary/15 bg-primary/[0.03]">
          <ShieldCheck className="w-3.5 h-3.5 text-primary" strokeWidth={2.2} />
          <span className="text-[10px] uppercase tracking-[0.22em] font-medium text-primary/80">
            Mapa Comportamental
          </span>
        </div>
        <p className="text-[11px] text-muted-foreground/60 max-w-md leading-relaxed">
          Distribuição relativa dos seus padrões comportamentais identificados pela análise.
        </p>
      </div>

      {/* Radar */}
      <div className="bg-gradient-to-b from-card/40 to-card/10 border border-border/30 rounded-3xl px-4 py-8 sm:px-8">
        <div className="mx-auto" style={{ maxWidth: size + 80 }}>
          <svg
            viewBox={`0 0 ${size} ${size}`}
            className="w-full h-auto"
            role="img"
            aria-label="Radar comportamental"
          >
            <defs>
              <radialGradient id="radarFill" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.35" />
                <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0.08" />
              </radialGradient>
              <radialGradient id="zoneCritical" cx="50%" cy="50%" r="50%">
                <stop offset="65%" stopColor="hsl(var(--destructive))" stopOpacity="0" />
                <stop offset="100%" stopColor="hsl(var(--destructive))" stopOpacity="0.06" />
              </radialGradient>
            </defs>

            {/* Intensity zones (background) */}
            <circle cx={cx} cy={cy} r={radius} fill="url(#zoneCritical)" />

            {/* Concentric grid (4 rings) */}
            {[0.25, 0.5, 0.75, 1].map((r, idx) => (
              <circle
                key={idx}
                cx={cx}
                cy={cy}
                r={radius * r}
                fill="none"
                stroke="hsl(var(--border))"
                strokeOpacity={idx === 1 ? 0.35 : 0.18}
                strokeWidth={idx === 1 ? 0.7 : 0.5}
                strokeDasharray={idx === 1 ? '2 3' : undefined}
              />
            ))}

            {/* Axis spokes */}
            {axes.map((_, i) => {
              const a = angleFor(i);
              return (
                <line
                  key={i}
                  x1={cx}
                  y1={cy}
                  x2={cx + Math.cos(a) * radius}
                  y2={cy + Math.sin(a) * radius}
                  stroke="hsl(var(--border))"
                  strokeOpacity={0.22}
                  strokeWidth={0.5}
                />
              );
            })}

            {/* Data polygon */}
            <motion.polygon
              points={polygonPoints}
              fill="url(#radarFill)"
              stroke="hsl(var(--primary))"
              strokeWidth={1.2}
              strokeOpacity={0.7}
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.3, ease: 'easeOut' }}
              style={{ transformOrigin: `${cx}px ${cy}px` }}
            />

            {/* Data points */}
            {axes.map((s, i) => {
              const a = angleFor(i);
              const r = (Math.min(100, Math.max(0, s.percentage)) / 100) * radius;
              const x = cx + Math.cos(a) * r;
              const y = cy + Math.sin(a) * r;
              const intensity = intensityFor(s.percentage);
              return (
                <motion.circle
                  key={s.key}
                  cx={x}
                  cy={y}
                  r={3.2}
                  fill={intensity.color}
                  stroke="hsl(var(--background))"
                  strokeWidth={1.2}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.4, delay: 0.6 + i * 0.05 }}
                />
              );
            })}

            {/* Axis labels */}
            {axes.map((s, i) => {
              const a = angleFor(i);
              const lr = radius + 22;
              const x = cx + Math.cos(a) * lr;
              const y = cy + Math.sin(a) * lr;
              const anchor =
                Math.abs(Math.cos(a)) < 0.2
                  ? 'middle'
                  : Math.cos(a) > 0
                    ? 'start'
                    : 'end';
              const label = labelFor(s);
              // Wrap long labels onto 2 lines
              const words = label.split(' ');
              const isLong = label.length > 14 && words.length >= 2;
              const mid = Math.ceil(words.length / 2);
              const line1 = isLong ? words.slice(0, mid).join(' ') : label;
              const line2 = isLong ? words.slice(mid).join(' ') : '';
              return (
                <motion.g
                  key={`lbl-${s.key}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3, delay: 0.8 + i * 0.04 }}
                >
                  <text
                    x={x}
                    y={isLong ? y - 4 : y + 3}
                    textAnchor={anchor}
                    className="fill-foreground/75"
                    style={{ fontSize: '10px', fontWeight: 500, letterSpacing: '0.01em' }}
                  >
                    {line1}
                  </text>
                  {isLong && (
                    <text
                      x={x}
                      y={y + 8}
                      textAnchor={anchor}
                      className="fill-foreground/75"
                      style={{ fontSize: '10px', fontWeight: 500, letterSpacing: '0.01em' }}
                    >
                      {line2}
                    </text>
                  )}
                </motion.g>
              );
            })}
          </svg>
        </div>

        {/* Qualitative legend */}
        <div className="mt-2 flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
          {[
            { label: 'Equilibrado', color: 'hsl(140 50% 40%)' },
            { label: 'Em atenção', color: 'hsl(45 75% 50%)' },
            { label: 'Crítico', color: 'hsl(var(--destructive))' },
          ].map((zone) => (
            <div key={zone.label} className="flex items-center gap-2">
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{ background: zone.color }}
              />
              <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground/70 font-medium">
                {zone.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </motion.section>
  );
};

export const BehavioralRadar = memo(BehavioralRadarComponent);
