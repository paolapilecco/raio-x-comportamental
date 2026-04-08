import React, { useEffect, useRef, useCallback } from 'react';

interface NeuralMapProps {
  scores: Record<string, number>;
  axisLabels: Record<string, string>;
}

interface NeuronData {
  x: number; y: number; z: number;
  baseX: number; baseY: number; baseZ: number;
  radius: number;
  activation: number;
  neighbors: number[];
  clusterIdx: number;
}

interface PulseData {
  startIdx: number; endIdx: number;
  progress: number; speed: number;
}

// Color by score intensity: green -> yellow -> red
function scoreColor(score: number, activation: number): string {
  const alpha = 0.25 + activation * 0.75;
  if (score <= 40) return `rgba(34,197,94,${alpha})`;   // green
  if (score <= 70) return `rgba(234,179,8,${alpha})`;   // yellow
  return `rgba(239,68,68,${alpha})`;                     // red
}

function labelColor(score: number): string {
  if (score <= 40) return 'rgba(34,197,94,0.9)';
  if (score <= 70) return 'rgba(234,179,8,0.9)';
  return 'rgba(239,68,68,0.9)';
}

export function NeuralMap({ scores, axisLabels }: NeuralMapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animRef = useRef<number>(0);
  const mouseRef = useRef({ x: 0, y: 0, inside: false });
  const dataRef = useRef<{ neurons: NeuronData[]; pulses: PulseData[]; clusters: { key: string; label: string; score: number; cx: number; cy: number; cz: number }[] }>({ neurons: [], pulses: [], clusters: [] });
  const timeRef = useRef(0);

  const init = useCallback((w: number, h: number) => {
    const sorted = Object.entries(scores).sort(([, a], [, b]) => b - a).slice(0, 7);
    if (sorted.length === 0) return;

    const clusters: typeof dataRef.current.clusters = [];
    const neurons: NeuronData[] = [];
    const baseRadius = Math.min(w, h) * 0.3;

    sorted.forEach(([key, score], i) => {
      const angle = (i / sorted.length) * Math.PI * 2 - Math.PI / 2;
      const dist = baseRadius * 0.55;
      const cx = Math.cos(angle) * dist;
      const cy = Math.sin(angle) * dist;
      const cz = (Math.random() - 0.5) * 60;

      clusters.push({ key, label: axisLabels[key] || key, score, cx, cy, cz });

      // More neurons for higher scores
      const count = Math.floor(20 + (score / 100) * 30);
      const spread = 25 + (score / 100) * 25;

      for (let j = 0; j < count; j++) {
        const phi = Math.acos(-1 + (2 * j) / count);
        const theta = Math.sqrt(count * Math.PI) * phi;
        const x = cx + spread * Math.cos(theta) * Math.sin(phi);
        const y = cy + spread * Math.sin(phi) * Math.sin(theta);
        const z = cz + spread * Math.cos(phi) * 0.5;

        neurons.push({
          x, y, z, baseX: x, baseY: y, baseZ: z,
          radius: 1 + (score / 100) * 1.5,
          activation: 0,
          neighbors: [],
          clusterIdx: i,
        });
      }
    });

    // Build neighbor connections
    neurons.forEach((n, i) => {
      neurons.forEach((o, j) => {
        if (i !== j) {
          const d = Math.hypot(n.baseX - o.baseX, n.baseY - o.baseY, n.baseZ - o.baseZ);
          if (d < 35) n.neighbors.push(j);
        }
      });
    });

    dataRef.current = { neurons, pulses: [], clusters };
  }, [scores, axisLabels]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d')!;
    const perspective = 350;

    const resize = () => {
      const rect = container.getBoundingClientRect();
      canvas.width = rect.width * window.devicePixelRatio;
      canvas.height = rect.height * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
      init(rect.width, rect.height);
    };

    const project = (x: number, y: number, z: number, w: number, h: number, rotX: number, rotY: number) => {
      const cosY = Math.cos(rotY), sinY = Math.sin(rotY);
      const cosX = Math.cos(rotX), sinX = Math.sin(rotX);
      const x1 = x * cosY - z * sinY;
      const z1 = z * cosY + x * sinY;
      const y1 = y * cosX - z1 * sinX;
      const z2 = z1 * cosX + y * sinX;
      const scale = perspective / (perspective + z2);
      return { x: x1 * scale + w / 2, y: y1 * scale + h / 2, scale };
    };

    const animate = () => {
      const rect = container.getBoundingClientRect();
      const w = rect.width, h = rect.height;
      timeRef.current += 0.005;

      // Compute rotation
      let rotX: number, rotY: number;
      if (mouseRef.current.inside) {
        rotY = (mouseRef.current.x - w / 2) * 0.0008;
        rotX = (mouseRef.current.y - h / 2) * 0.0008;
      } else {
        rotY = Math.sin(timeRef.current) * 0.15;
        rotX = Math.cos(timeRef.current * 0.7) * 0.08;
      }

      // Clear with theme-aware dark
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
      ctx.fillStyle = 'rgba(15, 23, 20, 0.18)';
      ctx.fillRect(0, 0, w, h);

      const { neurons, pulses, clusters } = dataRef.current;

      // Random fire
      if (Math.random() > 0.97 && neurons.length > 0) {
        const idx = Math.floor(Math.random() * neurons.length);
        const n = neurons[idx];
        if (n.activation < 0.5) {
          n.activation = 1;
          n.neighbors.forEach(ni => {
            pulses.push({ startIdx: idx, endIdx: ni, progress: 0, speed: 0.04 + Math.random() * 0.02 });
          });
        }
      }

      // Draw connections (faint lines)
      neurons.forEach((n, i) => {
        const p1 = project(n.x, n.y, n.z, w, h, rotX, rotY);
        n.neighbors.forEach(ni => {
          if (ni > i) {
            const o = neurons[ni];
            const p2 = project(o.x, o.y, o.z, w, h, rotX, rotY);
            const alpha = 0.03 + Math.max(n.activation, o.activation) * 0.12;
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle = `rgba(198,169,105,${alpha})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        });
      });

      // Draw neurons
      neurons.forEach(n => {
        n.activation = Math.max(0, n.activation - 0.008);
        n.x += (n.baseX - n.x) * 0.02;
        n.y += (n.baseY - n.y) * 0.02;

        const p = project(n.x, n.y, n.z, w, h, rotX, rotY);
        const cluster = clusters[n.clusterIdx];
        ctx.beginPath();
        ctx.arc(p.x, p.y, n.radius * p.scale, 0, Math.PI * 2);
        ctx.fillStyle = scoreColor(cluster.score, n.activation);
        ctx.fill();
      });

      // Draw pulses
      dataRef.current.pulses = pulses.filter(pulse => {
        pulse.progress += pulse.speed;
        if (pulse.progress >= 1) {
          const end = neurons[pulse.endIdx];
          end.activation = Math.min(1, end.activation + 0.4);
          return false;
        }
        const s = neurons[pulse.startIdx];
        const e = neurons[pulse.endIdx];
        const px = s.x + (e.x - s.x) * pulse.progress;
        const py = s.y + (e.y - s.y) * pulse.progress;
        const pz = s.z + (e.z - s.z) * pulse.progress;
        const p = project(px, py, pz, w, h, rotX, rotY);
        ctx.beginPath();
        ctx.arc(p.x, p.y, 2 * p.scale, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(198,169,105,${1 - pulse.progress})`;
        ctx.shadowColor = 'rgba(198,169,105,0.6)';
        ctx.shadowBlur = 8;
        ctx.fill();
        ctx.shadowBlur = 0;
        return true;
      });

      // Draw cluster labels
      clusters.forEach(c => {
        const p = project(c.cx, c.cy - 35, c.cz, w, h, rotX, rotY);
        ctx.font = `600 ${Math.max(10, 11 * p.scale)}px system-ui, sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillStyle = labelColor(c.score);
        ctx.fillText(c.label, p.x, p.y);

        // Score below
        const p2 = project(c.cx, c.cy - 22, c.cz, w, h, rotX, rotY);
        ctx.font = `500 ${Math.max(9, 10 * p2.scale)}px system-ui, sans-serif`;
        ctx.fillStyle = 'rgba(250,250,249,0.5)';
        ctx.fillText(`${c.score}%`, p2.x, p2.y);
      });

      animRef.current = requestAnimationFrame(animate);
    };

    const onMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      mouseRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top, inside: true };
    };
    const onMouseLeave = () => { mouseRef.current.inside = false; };

    const onTouch = (e: TouchEvent) => {
      const rect = container.getBoundingClientRect();
      const t = e.touches[0];
      if (t) mouseRef.current = { x: t.clientX - rect.left, y: t.clientY - rect.top, inside: true };
    };

    container.addEventListener('mousemove', onMouseMove);
    container.addEventListener('mouseleave', onMouseLeave);
    container.addEventListener('touchmove', onTouch, { passive: true });
    container.addEventListener('touchend', onMouseLeave);
    window.addEventListener('resize', resize);

    resize();
    animate();

    return () => {
      cancelAnimationFrame(animRef.current);
      container.removeEventListener('mousemove', onMouseMove);
      container.removeEventListener('mouseleave', onMouseLeave);
      container.removeEventListener('touchmove', onTouch);
      container.removeEventListener('touchend', onMouseLeave);
      window.removeEventListener('resize', resize);
    };
  }, [init]);

  return (
    <div ref={containerRef} className="relative w-full h-[400px] rounded-xl overflow-hidden bg-[#0f1714] cursor-crosshair">
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
      {/* Legend */}
      <div className="absolute bottom-3 left-3 flex gap-3 text-[10px] text-muted-foreground/70">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500 inline-block" />Baixo</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-500 inline-block" />Moderado</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500 inline-block" />Alto</span>
      </div>
      <div className="absolute bottom-3 right-3 text-[10px] text-muted-foreground/40">
        Mova o mouse para explorar
      </div>
    </div>
  );
}
