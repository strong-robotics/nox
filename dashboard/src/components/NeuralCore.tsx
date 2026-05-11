"use client";

import React, { useEffect, useRef } from "react";

/**
 * NeuralCore - A premium, minimal AI core visualization.
 * Strictly 2D grid-based signal routing with intelligent behavior.
 */

type Mode = "idle" | "talking" | "thinking";

interface Point {
  x: number;
  y: number;
}

interface Direction {
  x: number;
  y: number;
}

interface Snake {
  points: Point[];
  color: string;
  currentDir: Direction;
  progress: number;
  speed: number;
  maxTail: number;
  life: number;
  maxLife: number;
  isTurning: boolean;
}

interface IntersectionPulse {
  x: number;
  y: number;
  alpha: number;
}

interface NeuralCoreProps {
  size?: number;
  mode?: Mode;
  className?: string;
}

const COLORS = ["#00FF41", "#008F11", "#003B00", "#0D0208"];
const GRID_SIZE = 14;

export default function NeuralCore({ size = 400, mode = "idle", className = "" }: NeuralCoreProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const snakesRef = useRef<Snake[]>([]);
  const pulsesRef = useRef<IntersectionPulse[]>([]);
  const cooldownsRef = useRef<Record<string, number>>({});
  const rayPulsesRef = useRef<number[]>([]);
  const lastRayPulseTimeRef = useRef(0);
  const lastTimeRef = useRef<number>(performance.now());
  const frameRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.scale(dpr, dpr);

    const BULGE = 1.0;
    const warp = (x: number, y: number): [number, number] => {
      const dx = x - size / 2, dy = y - size / 2;
      const r = Math.sqrt(dx * dx + dy * dy);
      const R = size / 2;
      if (r < 0.01 || R < 0.01) return [x, y];
      let t = r / R;
      if (t > 1) t = 1;
      const k = Math.sin((t * Math.PI) / 2);
      const f = ((1 - BULGE) * t + BULGE * k) / t;
      return [size / 2 + dx * f, size / 2 + dy * f];
    };

    const strokeWarped = (pts: [number, number][]) => {
      ctx.beginPath();
      for (let i = 0; i < pts.length; i++) {
        const [wx, wy] = warp(pts[i][0], pts[i][1]);
        if (i === 0) ctx.moveTo(wx, wy);
        else ctx.lineTo(wx, wy);
      }
      ctx.stroke();
    };

    const strokeWarpedSegment = (ax: number, ay: number, bx: number, by: number, steps: number) => {
      const pts: [number, number][] = [];
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        pts.push([ax + (bx - ax) * t, ay + (by - ay) * t]);
      }
      strokeWarped(pts);
    };


    const initSnake = (): Snake => {
      const angle = Math.random() * Math.PI * 2;
      const r = Math.random() * (size / 2 - GRID_SIZE * 2);
      const startX = size / 2 + Math.round((Math.cos(angle) * r) / GRID_SIZE) * GRID_SIZE;
      const startY = size / 2 + Math.round((Math.sin(angle) * r) / GRID_SIZE) * GRID_SIZE;

      const dirs = [{ x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 }];
      const initialDir = dirs[Math.floor(Math.random() * dirs.length)];

      const maxTail = (3 + Math.floor(Math.random() * 4)) + 1;

      return {
        points: [{ x: startX, y: startY }],
        color: COLORS[Math.floor(Math.random() * (COLORS.length - 1))], // Avoid the darkest color
        currentDir: initialDir,
        progress: 1,
        speed: (mode === "talking" ? 0.08 : mode === "thinking" ? 0.04 : 0.06) * (0.8 + Math.random() * 0.4),
        maxTail,
        life: 0,
        maxLife: 480 + Math.random() * 120,
        isTurning: false,
      };
    };

    const drawGrid = () => {
      ctx.save();

      // 1. Clock-like Peripheral Ticks
      ctx.strokeStyle = "rgba(0, 255, 65, 0.15)";
      ctx.lineWidth = 0.5;
      const tickCount = 30;
      const innerR = (size / 2) * 0.48;
      const outerR = (size / 2) * 0.98;
      for (let i = 0; i < tickCount; i++) {
        const angle = (i * (360 / tickCount) * Math.PI) / 180;
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);

        const x1 = size / 2 + cos * innerR;
        const y1 = size / 2 + sin * innerR;
        const x2 = size / 2 + cos * outerR;
        const y2 = size / 2 + sin * outerR;

        const grad = ctx.createLinearGradient(x1, y1, x2, y2);
        grad.addColorStop(0, "rgba(0, 255, 65, 0)");
        grad.addColorStop(1, "rgba(0, 255, 65, 0.2)");

        ctx.strokeStyle = grad;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }

      // 4. Ray Pulses (Energy Intake Effect)
      rayPulsesRef.current.forEach(progress => {
        const currentR = outerR - (outerR - innerR) * progress;
        const pulseLen = (outerR - innerR) * 0.15;

        ctx.lineWidth = 1.2;
        for (let i = 0; i < tickCount; i++) {
          const angle = (i * (360 / tickCount) * Math.PI) / 180;
          const cos = Math.cos(angle);
          const sin = Math.sin(angle);

          const x1 = size / 2 + cos * currentR;
          const y1 = size / 2 + sin * currentR;
          const x2 = size / 2 + cos * Math.max(innerR, currentR - pulseLen);
          const y2 = size / 2 + sin * Math.max(innerR, currentR - pulseLen);

          const pGrad = ctx.createLinearGradient(x1, y1, x2, y2);
          const fade = 1 - progress;
          pGrad.addColorStop(0, `rgba(0, 255, 65, ${0.8 * fade})`);
          pGrad.addColorStop(1, "rgba(0, 255, 65, 0)");

          ctx.strokeStyle = pGrad;
          ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
        }
      });
      // 0. Outer Glass Rim Effect
      const haloGrad = ctx.createRadialGradient(size/2, size/2, outerR - 15, size/2, size/2, outerR);
      haloGrad.addColorStop(0, "rgba(0, 255, 65, 0)");
      haloGrad.addColorStop(0.8, "rgba(0, 255, 65, 0.15)");
      haloGrad.addColorStop(1, "rgba(0, 255, 65, 0.05)");
      ctx.strokeStyle = haloGrad;
      ctx.lineWidth = 15;
      ctx.beginPath(); ctx.arc(size/2, size/2, outerR - 7.5, 0, Math.PI * 2); ctx.stroke();

      // Layer 2: Concentric Razor Rings
      [0.985, 0.992, 1.0].forEach((rMult, idx) => {
        // 0. Эффект "дыхания" центрального ядра (статичное облако с пульсацией яркости)
        const time = Date.now() * 0.001;
        ctx.save();
        ctx.translate(canvas.width / 2 / dpr, canvas.height / 2 / dpr);
        
        const breathe = (Math.sin(time * 0.8) + 1) / 2; // Значение от 0 до 1
        const opacity = 0.08 + (breathe * 0.10); // Плавно меняем яркость от 0.08 до 0.18
        const radius = size * 0.45;
        
        const fog = ctx.createRadialGradient(0, 0, 0, 0, 0, radius);
        fog.addColorStop(0, `rgba(0, 255, 189, ${opacity})`);
        fog.addColorStop(0.5, `rgba(0, 255, 189, ${opacity * 0.5})`);
        fog.addColorStop(1, 'rgba(0, 0, 0, 0)');
        
        ctx.fillStyle = fog;
        ctx.beginPath();
        ctx.arc(0, 0, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        ctx.beginPath();
        ctx.strokeStyle = idx === 1 ? "rgba(0, 255, 65, 0.4)" : "rgba(0, 255, 65, 0.1)";
        ctx.lineWidth = idx === 1 ? 0.7 : 0.4;
        ctx.arc(size/2, size/2, (size / 2) * rMult - 1, 0, Math.PI * 2);
        ctx.stroke();
      });

      // 3. Tunnel Rim Contour (Inner)
      ctx.beginPath();
      ctx.strokeStyle = "rgba(0, 255, 65, 0.1)";
      ctx.lineWidth = 0.5;
      ctx.arc(size/2, size/2, (size / 2) * 0.8, 0, Math.PI * 2);
      ctx.stroke();

      // 2. Primary Main Grid
      ctx.save();
      ctx.beginPath();
      ctx.arc(size/2, size/2, (size / 2) * 0.98, 0, Math.PI * 2);
      ctx.clip();
      ctx.strokeStyle = "rgba(0, 255, 65, 0.15)";
      ctx.lineWidth = 1.0;
      const SUB = 32;
      const startX = (size/2) - Math.floor((size/2 + GRID_SIZE * 2) / GRID_SIZE) * GRID_SIZE;
      const startY = (size/2) - Math.floor((size/2 + GRID_SIZE * 2) / GRID_SIZE) * GRID_SIZE;
      const endX = size + GRID_SIZE * 2;
      const endY = size + GRID_SIZE * 2;
      for (let x = startX; x <= endX; x += GRID_SIZE) {
        strokeWarpedSegment(x, -GRID_SIZE, x, size + GRID_SIZE, SUB);
      }
      for (let y = startY; y <= endY; y += GRID_SIZE) {
        strokeWarpedSegment(-GRID_SIZE, y, size + GRID_SIZE, y, SUB);
      }
      ctx.restore();
    };

    lastTimeRef.current = 0;

    const animate = (now: number) => {
      if (lastTimeRef.current === 0) {
        lastTimeRef.current = now;
        frameRef.current = requestAnimationFrame(animate);
        return;
      }

      const rawDelta = (now - lastTimeRef.current) / 16.66;
      const dt_stable = Math.min(rawDelta, 2.0);
      lastTimeRef.current = now;

      const targetSpeed = mode === "talking" ? 1.0 : mode === "thinking" ? 0.6 : 0.15;
      if (!(window as any).noxSpeed) (window as any).noxSpeed = targetSpeed;
      (window as any).noxSpeed += (targetSpeed - (window as any).noxSpeed) * 0.1;
      const speedMult = (window as any).noxSpeed;
      const dt_snakes = dt_stable * speedMult;

      ctx.clearRect(0, 0, size, size);

      // 1. Ambient Light
      const breathing = Math.sin(now / 700) * 0.2;
      const shimmer = Math.sin(now / 30) * 0.03;
      const coreOpacity = 0.35 + breathing * 0.15 + shimmer;
      
      const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
      grad.addColorStop(0, "rgba(0, 0, 0, 0.9)"); 
      grad.addColorStop(1, `rgba(0, 59, 0, ${coreOpacity * 0.3})`); 
      ctx.fillStyle = grad; ctx.fillRect(0, 0, size, size);

      drawGrid();

      if (now - lastRayPulseTimeRef.current > 5000) {
        rayPulsesRef.current.push(0);
        lastRayPulseTimeRef.current = now;
      }

      rayPulsesRef.current = rayPulsesRef.current
        .map(p => p + 0.015 * dt_stable)
        .filter(p => p < 1);

      for (const key in cooldownsRef.current) {
        if (cooldownsRef.current[key] > 0) cooldownsRef.current[key] -= dt_snakes;
      }

      const targetCount = 12;
      if (snakesRef.current.length < targetCount && Math.random() < 0.15) {
        snakesRef.current.push(initSnake());
      }

      snakesRef.current.forEach((snake, sIdx) => {
        snake.life += dt_snakes;
        snake.progress += snake.speed * dt_snakes;

        if (snake.progress >= 1) {
          const currentPos = snake.points[snake.points.length - 1];
          const nodeKey = `${currentPos.x},${currentPos.y}`;

          if ((cooldownsRef.current[nodeKey] || 0) <= 0) {
            snakesRef.current.forEach((other, oIdx) => {
              if (sIdx !== oIdx) {
                const isOccupied = other.points.some(p => p.x === currentPos.x && p.y === currentPos.y);
                if (isOccupied) {
                  pulsesRef.current.push({ x: currentPos.x, y: currentPos.y, alpha: 1.0 });
                  cooldownsRef.current[nodeKey] = 120;
                }
              }
            });
          }

          const dirs = [{ x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 }];
          const validDirs = dirs.filter((d) => {
            if (d.x === -snake.currentDir.x && d.y === -snake.currentDir.y) return false;
            const nx = currentPos.x + d.x * GRID_SIZE;
            const ny = currentPos.y + d.y * GRID_SIZE;
            const dist = Math.sqrt(Math.pow(nx - size / 2, 2) + Math.pow(ny - size / 2, 2));
            return dist < size / 2 - 15;
          });

          if (validDirs.length > 0) {
            const turnChance = mode === "thinking" ? 0.1 : mode === "talking" ? 0.45 : 0.3;
            const canGoStraight = validDirs.some((d) => d.x === snake.currentDir.x && d.y === snake.currentDir.y);
            const nextDir = (canGoStraight && Math.random() > turnChance)
              ? snake.currentDir
              : validDirs[Math.floor(Math.random() * validDirs.length)];

            snake.isTurning = nextDir.x !== snake.currentDir.x || nextDir.y !== snake.currentDir.y;
            snake.currentDir = nextDir;
            snake.points.push({ x: currentPos.x + nextDir.x * GRID_SIZE, y: currentPos.y + nextDir.y * GRID_SIZE });
            if (snake.points.length > snake.maxTail) snake.points.shift();
            snake.progress = 0;
          } else {
            snake.life = snake.maxLife;
          }
        }
      });

      snakesRef.current.forEach((snake) => {
        ctx.save();
        ctx.lineCap = "round";
        ctx.lineJoin = "round";

        const fadeIn = Math.min(1, snake.life / 50);
        const fadeOut = Math.max(0, Math.min(1, (snake.maxLife - snake.life) / 150));
        const lifeAlpha = fadeIn * fadeOut;

        for (let i = 0; i < snake.points.length - 1; i++) {
          const p1 = snake.points[i];
          const p2 = snake.points[i + 1];
          let x2 = p1.x + (p2.x - p1.x) * (i === snake.points.length - 2 ? snake.progress : 1);
          let y2 = p1.y + (p2.y - p1.y) * (i === snake.points.length - 2 ? snake.progress : 1);

          const segmentAlpha = (0.2 + 0.8 * (i / snake.points.length)) * lifeAlpha;

          ctx.lineWidth = 5.0; // Было 4.0
          ctx.strokeStyle = snake.color;
          ctx.globalAlpha = segmentAlpha * 0.3; // Было 0.2
          strokeWarpedSegment(p1.x, p1.y, x2, y2, 10);

          ctx.lineWidth = 2.5; // Было 1.5
          ctx.strokeStyle = snake.color;
          ctx.globalAlpha = segmentAlpha * 0.8; // Было 0.6
          strokeWarpedSegment(p1.x, p1.y, x2, y2, 10);

          ctx.lineWidth = 1.8; // Было 0.8
          ctx.strokeStyle = "#ffffff";
          ctx.globalAlpha = segmentAlpha * 1.0; // Было 0.9
          strokeWarpedSegment(p1.x, p1.y, x2, y2, 10);
        }
        ctx.restore();

        const head = snake.points[snake.points.length - 1];
        const prev = snake.points[snake.points.length - 2] || head;
        const rawHx = prev.x + (head.x - prev.x) * snake.progress;
        const rawHy = prev.y + (head.y - prev.y) * snake.progress;
        const [hx, hy] = warp(rawHx, rawHy);

        ctx.save();
        const headGlow = ctx.createRadialGradient(hx, hy, 0, hx, hy, 7);
        headGlow.addColorStop(0, snake.color); headGlow.addColorStop(1, "transparent");
        ctx.fillStyle = headGlow; ctx.globalAlpha = 0.5;
        ctx.beginPath(); ctx.arc(hx, hy, 7, 0, Math.PI * 2); ctx.fill();

        ctx.fillStyle = "#fff"; ctx.globalAlpha = 1;
        ctx.beginPath(); ctx.arc(hx, hy, 1.8, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      });

      pulsesRef.current.forEach((pulse) => {
        const dx = pulse.x - size / 2;
        const dy = pulse.y - size / 2;
        if (Math.sqrt(dx * dx + dy * dy) < 15) return;

        const [px, py] = warp(pulse.x, pulse.y);

        ctx.save();
        ctx.beginPath();
        const pGrad = ctx.createRadialGradient(px, py, 0, px, py, 6);
        pGrad.addColorStop(0, "rgba(0, 255, 65, 0.8)");
        pGrad.addColorStop(1, "rgba(0, 255, 65, 0)");
        ctx.fillStyle = pGrad; ctx.globalAlpha = pulse.alpha * 0.4;
        ctx.arc(px, py, 6, 0, Math.PI * 2); ctx.fill();

        ctx.fillStyle = "#fff"; ctx.globalAlpha = pulse.alpha;
        ctx.beginPath(); ctx.arc(px, py, 1.0, 0, Math.PI * 2); ctx.fill();

        ctx.restore();
        pulse.alpha -= 0.1 * dt_snakes;
      });
      pulsesRef.current = pulsesRef.current.filter(p => p.alpha > 0);

      snakesRef.current = snakesRef.current.filter((s) => s.life < s.maxLife);
      frameRef.current = requestAnimationFrame(animate);
    };

    frameRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameRef.current);
  }, [size, mode]);

  return (
    <div
      className={`relative rounded-full ${className}`}
      style={{
        width: size,
        height: size,
        background: "radial-gradient(circle at 50% 50%, rgba(0, 26, 0, 0.7) 0%, rgba(0, 0, 0, 0.7) 100%)",
        border: "1px solid rgba(0, 255, 65, 0.3)",
        boxShadow: `
          inset 0 0 15px rgba(0, 255, 65, 0.2),
          0 0 20px rgba(0, 255, 65, 0.1)
        `,
        overflow: "hidden"
      }}
    >
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "linear-gradient(135deg, rgba(0, 255, 65, 0.05) 0%, transparent 50%, transparent 100%)",
          zIndex: 10
        }}
      />
      <canvas ref={canvasRef} style={{ width: "100%", height: "100%" }} />
    </div>
  );
}
