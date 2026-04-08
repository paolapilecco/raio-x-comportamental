import React, { useEffect, useRef, useCallback, useState, useMemo } from 'react';
import { ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';

interface NeuralMapProps {
  scores: Record<string, number>;
  axisLabels: Record<string, string>;
}

function scoreColorRgb(score: number): [number, number, number] {
  if (score <= 40) return [34, 197, 94];
  if (score <= 70) return [234, 179, 8];
  return [239, 68, 68];
}

export function NeuralMap({ scores, axisLabels }: NeuralMapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animRef = useRef<number>(0);
  const mouseRef = useRef({ x: 0, y: 0 });
  const depthRef = useRef(0);

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

    const resize = () => {
      const rect = container.getBoundingClientRect();
      canvas.width = rect.width * window.devicePixelRatio;
      canvas.height = rect.height * window.devicePixelRatio;
      ctx.setTransform(window.devicePixelRatio, 0, 0, window.devicePixelRatio, 0, 0);
      mouseRef.current = { x: rect.width / 2, y: rect.height };
    };

    const drawBranch = (
      x: number, y: number, angle: number, length: number, depth: number,
      w: number, h: number, axisIdx: number
    ) => {
      if (depth > depthRef.current) return;

      const endX = x + Math.cos(angle) * length;
      const endY = y + Math.sin(angle) * length;

      // Color based on which axis "owns" this branch depth
      const axis = sortedTop5[axisIdx];
      const [r, g, b] = axis ? scoreColorRgb(axis[1]) : [198, 169, 105];
      const opacity = (1 - depth / maxDepth) * 0.85;

      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(endX, endY);
      ctx.strokeStyle = `rgba(${r},${g},${b},${opacity})`;
      ctx.lineWidth = Math.max(0.5, (1 - depth / maxDepth) * 1.5);
      ctx.stroke();

      // Bloom dots at tips of deeper branches
      if (depth >= maxDepth - 2 && depth <= depthRef.current) {
        ctx.beginPath();
        ctx.arc(endX, endY, 1.5, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${r},${g},${b},${opacity * 0.6})`;
        ctx.fill();
      }

      const distToMouse = Math.hypot(endX - mouseRef.current.x, endY - mouseRef.current.y);
      const mouseEffect = Math.max(0, 1 - distToMouse / (h / 2));
      const angleOffset = (Math.PI / 8) * mouseEffect;

      // Alternate axis colors between left and right branches
      const leftAxis = (axisIdx + 1) % sortedTop5.length;
      const rightAxis = (axisIdx + 2) % sortedTop5.length;

      drawBranch(endX, endY, angle - (Math.PI / 10) - angleOffset, length * 0.78, depth + 1, w, h, depth < 3 ? leftAxis : axisIdx);
      drawBranch(endX, endY, angle + (Math.PI / 10) + angleOffset, length * 0.78, depth + 1, w, h, depth < 3 ? rightAxis : axisIdx);
    };

    const animate = () => {
      const rect = container.getBoundingClientRect();
      const w = rect.width, h = rect.height;

      ctx.setTransform(window.devicePixelRatio, 0, 0, window.devicePixelRatio, 0, 0);
      ctx.fillStyle = 'rgba(15, 23, 20, 0.25)';
      ctx.fillRect(0, 0, w, h);

      const startX = w / 2;
      const startY = h;
      const startLength = h / 4.5;

      drawBranch(startX, startY, -Math.PI / 2, startLength, 0, w, h, 0);

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
    // Place labels in an arc above the tree
    return sortedTop5.map(([key, score], i) => {
      const spread = sortedTop5.length - 1 || 1;
      const left = 10 + (i / spread) * 80; // distribute 10%-90% horizontally
      const top = i % 2 === 0 ? 6 : 14; // stagger vertically
      const colorClass = score > 70 ? 'text-red-400' : score >= 40 ? 'text-yellow-400' : 'text-green-400';

      return (
        <div
          key={key}
          className="absolute pointer-events-none text-center"
          style={{ left: `${left}%`, top: `${top}%`, transform: 'translate(-50%, 0)' }}
        >
          <div className={`text-xs font-bold ${colorClass} drop-shadow-[0_1px_4px_rgba(0,0,0,0.9)]`}>
            {axisLabels[key] || key}
          </div>
          <div className="text-[11px] font-semibold text-white/50">
            {score}%
          </div>
        </div>
      );
    });
  }, [sortedTop5, axisLabels]);

  return (
    <div ref={containerRef} className="relative w-full h-[420px] rounded-xl overflow-hidden bg-[#0f1714] cursor-crosshair select-none">
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />

      {labelElements}

      {/* Legend */}
      <div className="absolute bottom-3 left-3 flex gap-3 text-[10px] text-white/60 z-10">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500 inline-block" />Baixo</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-500 inline-block" />Moderado</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500 inline-block" />Alto</span>
      </div>
      <div className="absolute bottom-3 right-3 text-[10px] text-white/30 z-10">
        Mova o mouse para interagir
      </div>
    </div>
  );
}
