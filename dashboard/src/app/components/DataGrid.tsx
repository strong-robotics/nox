"use client";

import React, { useEffect, useRef } from 'react';

const DataGrid: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

    interface Flicker {
      r: number;
      c: number;
      phase: number; // 0 to 1
      speed: number;
      maxOpacity: number;
    }
    interface GridCell {
      char: string;
      op: number;
      hue: number;
    }
    const activeFlickers = useRef<Flicker[]>([]);
    const grid = useRef<GridCell[]>([]);

    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      let width = window.innerWidth;
      let height = window.innerHeight;
      canvas.width = width;
      canvas.height = height;

      const fontSize = 18;
      const columns = Math.ceil(width / fontSize);
      const rowHeight = fontSize * 0.85;
      const rows = Math.ceil(height / rowHeight);
      
      const hexChars = "0123456789ABCDEF";
      grid.current = [];
      for (let i = 0; i < columns * rows; i++) {
        grid.current.push({
          char: hexChars[Math.floor(Math.random() * hexChars.length)],
          op: 0.04 + Math.random() * 0.11, // Varied base opacity
          hue: 140 + Math.random() * 40    // Varied green-cyan hue
        });
      }

      const draw = () => {
        ctx.shadowBlur = 0;
        ctx.fillStyle = 'rgb(0, 0, 0)';
        ctx.fillRect(0, 0, width, height);

        // 1. Grid texture
        ctx.strokeStyle = 'rgba(0, 255, 65, 0.02)';
        ctx.lineWidth = 0.5;
        for (let x = 0; x < width; x += 4) {
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, height);
          ctx.stroke();
        }

        // 2. Base Grid (with variation)
        ctx.font = `bold ${fontSize - 2}px "Courier New", monospace`;
        
        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < columns; c++) {
            const idx = (r % 40) * columns + (c % columns);
            const cell = grid.current[idx % grid.current.length];
            const x = c * fontSize;
            const y = r * rowHeight;
            
            ctx.shadowBlur = 0;
            // Use cell's individual hue and opacity
            ctx.fillStyle = `hsla(${cell.hue}, 100%, 50%, ${cell.op})`;
            ctx.fillText(cell.char, x + 2, y + rowHeight);
          }
        }

        // 3. Smooth Flickers
        activeFlickers.current.forEach((f) => {
          const x = f.c * fontSize;
          const y = f.r * rowHeight;
          const cell = grid.current[((f.r % 40) * columns + f.c) % grid.current.length];

          const currentOpacity = Math.sin(f.phase * Math.PI) * f.maxOpacity;

          ctx.shadowBlur = 12 * currentOpacity;
          ctx.shadowColor = 'rgba(0, 255, 65, 0.8)';
          ctx.fillStyle = `rgba(200, 255, 220, ${currentOpacity})`;
          ctx.fillText(cell.char, x + 2, y + rowHeight);

          f.phase += f.speed;
        });

        activeFlickers.current = activeFlickers.current.filter(f => f.phase < 1);

        // 4. Scanlines
        ctx.shadowBlur = 0;
        ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
        for (let y = 0; y < height; y += 2) {
          ctx.fillRect(0, y, width, 1);
        }
      };

      let animationId: number;
      const animate = () => {
        // 3. Flicker Spawn
        const spawnRate = 25; 
        for (let i = 0; i < spawnRate; i++) {
          if (Math.random() > 0.90) {
            const r = Math.floor(Math.random() * rows), c = Math.floor(Math.random() * columns);
            if (!activeFlickers.current.some(f => f.r === r && f.c === c)) {
              activeFlickers.current.push({
                r, c, phase: 0,
                speed: 0.005 + Math.random() * 0.02,
                maxOpacity: 0.15 + Math.random() * 0.8
              });
            }
          }
        }

        // 4. Character Mutation (The "Living Data" effect)
        const mutationRate = 400; 
        for (let i = 0; i < mutationRate; i++) {
          // Additional probability check to vary the "timing" of updates
          if (Math.random() > 0.85) { 
            const targetIdx = Math.floor(Math.random() * grid.current.length);
            if (grid.current[targetIdx]) {
              grid.current[targetIdx].char = hexChars[Math.floor(Math.random() * hexChars.length)];
              grid.current[targetIdx].op = 0.04 + Math.random() * 0.11;
              grid.current[targetIdx].hue = 140 + Math.random() * 40;
            }
          }
        }

        draw();
        animationId = requestAnimationFrame(animate);
      };

      const handleResize = () => {
        width = window.innerWidth;
        height = window.innerHeight;
        canvas.width = width;
        canvas.height = height;
      };

      window.addEventListener('resize', handleResize);
      animate();

      return () => {
        window.removeEventListener('resize', handleResize);
        cancelAnimationFrame(animationId);
      };
    }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none z-0"
      style={{ filter: 'blur(0.5px)' }}
    />
  );
};

export default DataGrid;
