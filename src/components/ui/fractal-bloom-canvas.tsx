import React, { useEffect, useRef } from 'react';

const FractalBloomCanvas = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    const mouse = { x: window.innerWidth / 2, y: window.innerHeight };
    let currentDepth = 0;
    const maxDepth = 9;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    const drawBranch = (x: number, y: number, angle: number, length: number, depth: number) => {
      if (depth > currentDepth) return;

      ctx.beginPath();
      ctx.moveTo(x, y);

      const endX = x + Math.cos(angle) * length;
      const endY = y + Math.sin(angle) * length;

      ctx.lineTo(endX, endY);

      const opacity = 1 - (depth / maxDepth);
      // Brand gold (#C6A969) = rgb(198, 169, 105)
      const r = Math.round(198 + (255 - 198) * (depth / maxDepth));
      const g = Math.round(169 + (245 - 169) * (depth / maxDepth));
      const b = Math.round(105 + (220 - 105) * (depth / maxDepth));
      ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${opacity * 0.6})`;
      ctx.lineWidth = Math.max(0.3, 1.2 - (depth / maxDepth) * 0.8);
      ctx.stroke();

      const distToMouse = Math.hypot(endX - mouse.x, endY - mouse.y);
      const mouseEffect = Math.max(0, 1 - distToMouse / (canvas.height / 2));
      const angleOffset = (Math.PI / 8) * mouseEffect;

      drawBranch(endX, endY, angle - (Math.PI / 10) - angleOffset, length * 0.8, depth + 1);
      drawBranch(endX, endY, angle + (Math.PI / 10) + angleOffset, length * 0.8, depth + 1);
    };

    const animate = () => {
      // Deep green-black fade: hsl(174, 33%, 8%)
      ctx.fillStyle = 'rgba(10, 27, 25, 0.2)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const startX = canvas.width / 2;
      const startY = canvas.height;
      const startLength = canvas.height / 5;

      drawBranch(startX, startY, -Math.PI / 2, startLength, 0);

      if (currentDepth < maxDepth) {
        currentDepth += 0.03;
      }

      animationFrameId = requestAnimationFrame(animate);
    };

    const handleMouseMove = (event: MouseEvent) => {
      mouse.x = event.clientX;
      mouse.y = event.clientY;
    };

    window.addEventListener('resize', resizeCanvas);
    window.addEventListener('mousemove', handleMouseMove);

    resizeCanvas();
    animate();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', resizeCanvas);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full"
      style={{ background: 'linear-gradient(180deg, hsl(174, 33%, 6%) 0%, hsl(174, 33%, 12%) 50%, hsl(174, 33%, 6%) 100%)' }}
    />
  );
};

export default FractalBloomCanvas;
