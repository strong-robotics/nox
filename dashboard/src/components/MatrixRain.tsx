"use client";
import React, { useEffect, useRef } from 'react';

const MatrixRain = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set size to full screen
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const characters = "0123456789ABCDEF";
    const fontSize = 16;
    const columns = Math.floor(canvas.width / (fontSize * 2));
    const drops: number[] = [];
    const headChars: string[] = [];

    // Initialize drops
    for (let i = 0; i < columns; i++) {
      drops[i] = 1;
      headChars[i] = characters.charAt(Math.floor(Math.random() * characters.length));
    }

    const draw = () => {
      // Reset shadow before filling background so it doesn't affect the transparent rectangle
      ctx.shadowBlur = 0;
      ctx.fillStyle = "rgba(0, 0, 0, 0.11)"; // Faster clear for sharper trails
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.font = `${fontSize}px monospace`;

      for (let i = 0; i < drops.length; i++) {
        // 1. Recolor previous symbol (which was white) to green
        ctx.fillStyle = "#008F68"; // Slightly more expressive teal for the trail
        ctx.shadowBlur = 0;
        ctx.fillText(headChars[i], i * fontSize * 2, (drops[i] - 1) * fontSize);

        // 2. Generate new symbol for current drop head
        const headText = characters.charAt(Math.floor(Math.random() * characters.length));
        headChars[i] = headText;

        // 3. Draw current symbol (drop head) white with minimal glow
        ctx.fillStyle = "#FFFFFF";
        ctx.shadowBlur = 1; // Minimal radius for maximum clarity
        ctx.shadowColor = "#00FFBD";
        ctx.fillText(headText, i * fontSize * 2, drops[i] * fontSize);

        // Reset drop to top when hitting bottom
        if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) {
          ctx.fillStyle = "#008F68";
          ctx.shadowBlur = 0;
          ctx.fillText(headChars[i], i * fontSize * 2, drops[i] * fontSize);
          drops[i] = 0;
        }
        drops[i]++;
      }
    };

    const interval = setInterval(draw, 75);

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', handleResize);
    return () => {
      clearInterval(interval);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />;
};

export default MatrixRain;
