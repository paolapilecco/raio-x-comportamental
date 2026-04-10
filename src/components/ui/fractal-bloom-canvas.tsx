import { useEffect, useRef } from 'react';

const FractalBloomCanvas = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    const mouse = { x: 0, y: 0 };
    let currentDepth = 0;
    const maxDepth = 9;
    let w = 0;
    let h = 0;

    const resizeCanvas = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      mouse.x = w / 2;
      mouse.y = h;
    };

    const drawBranch = (x: number, y: number, angle: number, length: number, depth: number) => {
      if (depth > currentDepth) return;

      ctx.beginPath();
      ctx.moveTo(x, y);

      const endX = x + Math.cos(angle) * length;
      const endY = y + Math.sin(angle) * length;

      ctx.lineTo(endX, endY);

      const opacity = 1 - (depth / maxDepth);
      const r = Math.round(198 + (255 - 198) * (depth / maxDepth));
      const g = Math.round(169 + (245 - 169) * (depth / maxDepth));
      const b = Math.round(105 + (220 - 105) * (depth / maxDepth));
      ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${opacity * 0.6})`;
      ctx.lineWidth = Math.max(0.3, 1.2 - (depth / maxDepth) * 0.8);
      ctx.stroke();

      const distToMouse = Math.hypot(endX - mouse.x, endY - mouse.y);
      const mouseEffect = Math.max(0, 1 - distToMouse / (h / 2));
      const angleOffset = (Math.PI / 8) * mouseEffect;

      drawBranch(endX, endY, angle - (Math.PI / 10) - angleOffset, length * 0.8, depth + 1);
      drawBranch(endX, endY, angle + (Math.PI / 10) + angleOffset, length * 0.8, depth + 1);
    };

    const animate = () => {
      ctx.fillStyle = 'rgba(10, 27, 25, 0.2)';
      ctx.fillRect(0, 0, w, h);

      const startX = w / 2;
      const startY = h;
      // Smaller tree on mobile so it fits the viewport
      const startLength = Math.min(h / 4.5, w / 3);

      drawBranch(startX, startY, -Math.PI / 2, startLength, 0);

      // Radial fade-out no centro para não competir com o texto
      const gradient = ctx.createRadialGradient(w / 2, h * 0.45, 0, w / 2, h * 0.45, h * 0.4);
      gradient.addColorStop(0, 'rgba(10, 27, 25, 0.7)');
      gradient.addColorStop(1, 'rgba(10, 27, 25, 0)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, w, h);

      if (currentDepth < maxDepth) {
        currentDepth += 0.03;
      }

      animationFrameId = requestAnimationFrame(animate);
    };

    const handleMouseMove = (event: MouseEvent) => {
      mouse.x = event.clientX;
      mouse.y = event.clientY;
    };

    const handleTouchMove = (event: TouchEvent) => {
      if (event.touches.length > 0) {
        mouse.x = event.touches[0].clientX;
        mouse.y = event.touches[0].clientY;
      }
    };

    window.addEventListener('resize', resizeCanvas);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('touchmove', handleTouchMove, { passive: true });

    resizeCanvas();
    animate();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', resizeCanvas);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('touchmove', handleTouchMove);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0"
      style={{ background: 'linear-gradient(180deg, hsl(174, 33%, 6%) 0%, hsl(174, 33%, 12%) 50%, hsl(174, 33%, 6%) 100%)' }}
    />
  );
};

export default FractalBloomCanvas;
