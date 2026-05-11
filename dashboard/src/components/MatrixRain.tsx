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
      ctx.fillStyle = "rgba(0, 0, 0, 0.1)"; // Ускорил очистку, чтобы убрать "призрачные" полоски
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.font = `${fontSize}px monospace`;

      for (let i = 0; i < drops.length; i++) {
        // 1. Перекрашиваем предыдущий символ (который был белым) в зеленый.
        // Используем ТОТ ЖЕ САМЫЙ символ, чтобы не было "каши" из наложенных друг на друга букв.
        ctx.fillStyle = "#00553B"; // Темно-бирюзовый для хвоста
        ctx.shadowBlur = 0;
        ctx.fillText(headChars[i], i * fontSize * 2, (drops[i] - 1) * fontSize);

        // 2. Генерируем новый символ для текущей головы капли
        const headText = characters.charAt(Math.floor(Math.random() * characters.length));
        headChars[i] = headText;

        // 3. Рисуем текущий символ (голову капли) белым с зеленым свечением
        ctx.fillStyle = "#FFFFFF";
        ctx.shadowBlur = 4; // Уменьшил радиус, чтобы не копилась "муть" в колонках
        ctx.shadowColor = "#00FFBD";
        ctx.fillText(headText, i * fontSize * 2, drops[i] * fontSize);

        // Сбрасываем каплю в начало при достижении низа
        if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) {
          // Превращаем последнюю белую голову в зеленую перед сбросом капли
          ctx.fillStyle = "#00553B"; // Темно-бирюзовый для конца хвоста
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
