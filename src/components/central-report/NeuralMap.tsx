import React, { useEffect, useRef, useMemo } from 'react';

interface NeuralMapProps {
  scores: Record<string, number>;
  axisLabels: Record<string, string>;
}

function scoreColorRgb(score: number): [number, number, number] {
  if (score <= 40) return [34, 197, 94];   // green
  if (score <= 70) return [234, 179, 8];   // yellow
  return [100, 180, 255];                   // light blue
}

function scoreGlowColor(score: number): string {
  if (score <= 40) return 'rgba(34,197,94,';
  if (score <= 70) return 'rgba(234,179,8,';
  return 'rgba(100,180,255,';
}

interface Particle {
  x: number; y: number; vx: number; vy: number;
  life: number; maxLife: number; r: number; g: number; b: number; size: number;
}

export function NeuralMap({ scores, axisLabels }: NeuralMapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animRef = useRef<number>(0);
  const mouseRef = useRef({ x: 0, y: 0 });
  const depthRef = useRef(0);
  const timeRef = useRef(0);
  const particlesRef = useRef<Particle[]>([]);

  const sortedTop5 = useMemo(() => {
    return Object.entries(scores).sort(([, a], [, b]) => b - a).slice(0, 5);
  }, [scores]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d')!;
    const maxDepth = 9;
    depthRef.current = 0;
    timeRef.current = 0;
    particlesRef.current = [];

    const resize = () => {
      const rect = container.getBoundingClientRect();
      canvas.width = rect.width * window.devicePixelRatio;
      canvas.height = rect.height * window.devicePixelRatio;
      ctx.setTransform(window.devicePixelRatio, 0, 0, window.devicePixelRatio, 0, 0);
      mouseRef.current = { x: rect.width / 2, y: rect.height };
    };

    const spawnParticle = (x: number, y: number, r: number, g: number, b: number) => {
      if (particlesRef.current.length > 120) return;
      particlesRef.current.push({
        x, y,
        vx: (Math.random() - 0.5) * 0.4,
        vy: -Math.random() * 0.6 - 0.2,
        life: 0,
        maxLife: 60 + Math.random() * 80,
        r, g, b,
        size: Math.random() * 2 + 0.5,
      });
    };

    const updateParticles = (ctx: CanvasRenderingContext2D) => {
      const alive: Particle[] = [];
      for (const p of particlesRef.current) {
        p.x += p.vx;
        p.y += p.vy;
        p.life++;
        if (p.life >= p.maxLife) continue;

        const alpha = (1 - p.life / p.maxLife) * 0.6;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${p.r},${p.g},${p.b},${alpha})`;
        ctx.fill();
        alive.push(p);
      }
      particlesRef.current = alive;
    };

    const drawBranch = (
      x: number, y: number, angle: number, length: number, depth: number,
      w: number, h: number, axisIdx: number, time: number
    ) => {
      if (depth > depthRef.current) return;

      // Subtle organic sway
      const sway = Math.sin(time * 0.8 + depth * 0.7 + axisIdx) * 0.02;
      const finalAngle = angle + sway;

      const endX = x + Math.cos(finalAngle) * length;
      const endY = y + Math.sin(finalAngle) * length;

      const axis = sortedTop5[axisIdx];
      const [r, g, b] = axis ? scoreColorRgb(axis[1]) : [198, 169, 105];
      const progress = depth / maxDepth;
      const opacity = (1 - progress) * 0.9;

      // Branch: dark base with colored edges (bioluminescent trunk)
      const branchWidth = Math.max(0.3, (1 - progress) * 3);

      // Dark core
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(endX, endY);
      ctx.strokeStyle = `rgba(20,35,30,${opacity * 0.9})`;
      ctx.lineWidth = branchWidth + 1;
      ctx.stroke();

      // Colored outer glow on the branch
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(endX, endY);
      const branchGlow = `rgba(${r},${g},${b},${opacity * 0.35})`;
      ctx.strokeStyle = branchGlow;
      ctx.lineWidth = branchWidth + 3;
      ctx.stroke();

      // Bright colored line
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(endX, endY);
      ctx.strokeStyle = `rgba(${r},${g},${b},${opacity * 0.7})`;
      ctx.lineWidth = branchWidth * 0.6;
      ctx.stroke();

      // Bioluminescent tips — glowing orbs at branch ends
      if (depth >= maxDepth - 3 && depth <= depthRef.current) {
        const pulse = 0.6 + Math.sin(time * 2 + depth + axisIdx * 1.5) * 0.4;
        const tipRadius = (3 - (depth - (maxDepth - 3))) * 1.2 * pulse;

        // Outer glow
        const grad = ctx.createRadialGradient(endX, endY, 0, endX, endY, tipRadius * 4);
        grad.addColorStop(0, `rgba(${r},${g},${b},${0.3 * pulse})`);
        grad.addColorStop(0.5, `rgba(${r},${g},${b},${0.08 * pulse})`);
        grad.addColorStop(1, `rgba(${r},${g},${b},0)`);
        ctx.beginPath();
        ctx.arc(endX, endY, tipRadius * 4, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();

        // Bright core
        ctx.beginPath();
        ctx.arc(endX, endY, tipRadius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${Math.min(255, r + 80)},${Math.min(255, g + 80)},${Math.min(255, b + 80)},${0.9 * pulse})`;
        ctx.fill();

        // Spawn floating particles from tips
        if (Math.random() < 0.03 * pulse) {
          spawnParticle(endX, endY, r, g, b);
        }
      }

      // Pulsing energy along branches (traveling light)
      if (depth >= 2 && depth <= depthRef.current) {
        const pulsePos = (time * 1.5 + depth * 0.3) % 1;
        const px = x + (endX - x) * pulsePos;
        const py = y + (endY - y) * pulsePos;
        ctx.beginPath();
        ctx.arc(px, py, 1.2, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${Math.min(255, r + 100)},${Math.min(255, g + 100)},${Math.min(255, b + 100)},${0.5 * (1 - progress)})`;
        ctx.fill();
      }

      const distToMouse = Math.hypot(endX - mouseRef.current.x, endY - mouseRef.current.y);
      const mouseEffect = Math.max(0, 1 - distToMouse / (h / 2));
      const angleOffset = (Math.PI / 8) * mouseEffect;

      const leftAxis = (axisIdx + 1) % sortedTop5.length;
      const rightAxis = (axisIdx + 2) % sortedTop5.length;

      drawBranch(endX, endY, finalAngle - (Math.PI / 10) - angleOffset, length * 0.78, depth + 1, w, h, depth < 3 ? leftAxis : axisIdx, time);
      drawBranch(endX, endY, finalAngle + (Math.PI / 10) + angleOffset, length * 0.78, depth + 1, w, h, depth < 3 ? rightAxis : axisIdx, time);
    };

    const animate = () => {
      const rect = container.getBoundingClientRect();
      const w = rect.width, h = rect.height;
      timeRef.current += 0.016;

      ctx.setTransform(window.devicePixelRatio, 0, 0, window.devicePixelRatio, 0, 0);

      // Deep dark background with slight vignette feel
      ctx.fillStyle = '#070d0b';
      ctx.fillRect(0, 0, w, h);

      // Subtle ambient glow at base
      const baseGrad = ctx.createRadialGradient(w / 2, h, 0, w / 2, h, h * 0.6);
      baseGrad.addColorStop(0, 'rgba(31,61,58,0.15)');
      baseGrad.addColorStop(1, 'rgba(7,13,11,0)');
      ctx.fillStyle = baseGrad;
      ctx.fillRect(0, 0, w, h);

      const startX = w / 2;
      const startY = h;
      const startLength = h / 4.5;

      drawBranch(startX, startY, -Math.PI / 2, startLength, 0, w, h, 0, timeRef.current);

      // Draw floating particles
      updateParticles(ctx);

      if (depthRef.current < maxDepth) {
        depthRef.current += 0.025;
      }

      animRef.current = requestAnimationFrame(animate);
    };

    const onMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      mouseRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };

    const onTouch = (e: TouchEvent) => {
      const rect = container.getBoundingClientRect();
      const t = e.touches[0];
      if (t) mouseRef.current = { x: t.clientX - rect.left, y: t.clientY - rect.top };
    };

    container.addEventListener('mousemove', onMouseMove);
    container.addEventListener('touchmove', onTouch, { passive: true });
    window.addEventListener('resize', resize);

    resize();
    animate();

    return () => {
      cancelAnimationFrame(animRef.current);
      container.removeEventListener('mousemove', onMouseMove);
      container.removeEventListener('touchmove', onTouch);
      window.removeEventListener('resize', resize);
    };
  }, [sortedTop5]);

  // HTML labels positioned around the tree
  const labelElements = useMemo(() => {
    return sortedTop5.map(([key, score], i) => {
      const spread = sortedTop5.length - 1 || 1;
      const left = 10 + (i / spread) * 80;
      const top = i % 2 === 0 ? 5 : 13;
      const [r, g, b] = scoreColorRgb(score);

      return (
        <div
          key={key}
          className="absolute pointer-events-none text-center"
          style={{ left: `${left}%`, top: `${top}%`, transform: 'translate(-50%, 0)' }}
        >
          <div
            className="text-xs font-bold"
            style={{
              color: `rgb(${r},${g},${b})`,
              textShadow: `0 0 8px rgba(${r},${g},${b},0.6), 0 1px 4px rgba(0,0,0,0.9)`,
            }}
          >
            {axisLabels[key] || key}
          </div>
          <div className="text-[11px] font-semibold text-white/40">
            {score}%
          </div>
        </div>
      );
    });
  }, [sortedTop5, axisLabels]);

  return (
    <div ref={containerRef} className="relative w-full h-[420px] rounded-xl overflow-hidden bg-[#070d0b] cursor-crosshair select-none">
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />

      {labelElements}

      {/* Legend */}
      <div className="absolute bottom-3 left-3 flex gap-3 text-[10px] text-white/50 z-10">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500/80 inline-block" style={{ boxShadow: '0 0 4px rgba(34,197,94,0.5)' }} />Baixo</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-500/80 inline-block" style={{ boxShadow: '0 0 4px rgba(234,179,8,0.5)' }} />Moderado</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: 'rgba(100,180,255,0.8)', boxShadow: '0 0 4px rgba(100,180,255,0.5)' }} />Alto</span>
      </div>
      <div className="absolute bottom-3 right-3 text-[10px] text-white/20 z-10">
        Mova o mouse para interagir
      </div>
    </div>
  );
}
