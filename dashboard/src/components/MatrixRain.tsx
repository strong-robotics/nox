"use client";
import React, { useEffect, useRef } from 'react';

const MatrixRain = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Устанавливаем размер на весь экран
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const characters = "0123456789ABCDEF";
    const fontSize = 16;
    const columns = Math.floor(canvas.width / (fontSize * 2));
    const drops: number[] = [];
    const headChars: string[] = [];

    // Инициализируем капли
    for (let i = 0; i < columns; i++) {
      drops[i] = 1;
      headChars[i] = characters.charAt(Math.floor(Math.random() * characters.length));
    }

    const draw = () => {
      // Сбрасываем тень перед заливкой фона, чтобы она не влияла на прозрачный прямоугольник
      ctx.shadowBlur = 0;
      ctx.fillStyle = "rgba(0, 0, 0, 0.2)"; // Ускорил очистку для более коротких и четких шлейфов
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.font = `${fontSize}px monospace`;

      for (let i = 0; i < drops.length; i++) {
        // 1. Перекрашиваем предыдущий символ (который был белым) в зеленый.
        ctx.fillStyle = "#008F68"; // Чуть более выразительный бирюзовый для шлейфа
        ctx.shadowBlur = 0;
        ctx.fillText(headChars[i], i * fontSize * 2, (drops[i] - 1) * fontSize);

        // 2. Генерируем новый символ для текущей головы капли
        const headText = characters.charAt(Math.floor(Math.random() * characters.length));
        headChars[i] = headText;

        // 3. Рисуем текущий символ (голову капли) белым с минимальным свечением
        ctx.fillStyle = "#FFFFFF";
        ctx.shadowBlur = 1; // Минимальный радиус для максимальной четкости
        ctx.shadowColor = "#00FFBD";
        ctx.fillText(headText, i * fontSize * 2, drops[i] * fontSize);

        // Сбрасываем каплю в начало при достижении низа
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
