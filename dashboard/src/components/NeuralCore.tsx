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

const COLORS = ["#7082FF", "#B066FE", "#50E3C2", "#4ade80", "#fb923c"];
const GRID_SIZE = 24;

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

    const initSnake = (): Snake => {
      const angle = Math.random() * Math.PI * 2;
      const r = Math.random() * (size / 2 - GRID_SIZE * 2);
      const startX = Math.round((size / 2 + Math.cos(angle) * r) / GRID_SIZE) * GRID_SIZE;
      const startY = Math.round((size / 2 + Math.sin(angle) * r) / GRID_SIZE) * GRID_SIZE;

      const dirs = [{ x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 }];
      const initialDir = dirs[Math.floor(Math.random() * dirs.length)];

      const maxTail = (3 + Math.floor(Math.random() * 4)) + 1; // Corrected: Points needed for 3 to 6 segments

      return {
        points: [{ x: startX, y: startY }],
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        currentDir: initialDir,
        progress: 1,
        speed: (mode === "talking" ? 0.08 : mode === "thinking" ? 0.04 : 0.06) * (0.8 + Math.random() * 0.4),
        maxTail,
        life: 0,
        maxLife: 480 + Math.random() * 120, // 8 to 10 seconds
        isTurning: false,
      };
    };

    const drawGrid = () => {
      ctx.save();

      // 1. Clock-like Peripheral Ticks
      ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
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
        grad.addColorStop(0, "rgba(255, 255, 255, 0)");
        grad.addColorStop(1, "rgba(255, 255, 255, 0.15)");

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
          const fade = 1 - progress; // Fade as it goes deeper
          pGrad.addColorStop(0, `rgba(255, 255, 255, ${0.8 * fade})`);
          pGrad.addColorStop(1, "rgba(255, 255, 255, 0)");

          ctx.strokeStyle = pGrad;
          ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
        }
      });
      // 0. Outer Glass Rim Effect (Reference-style)
      // Layer 1: Soft Outer Halo
      const haloGrad = ctx.createRadialGradient(size/2, size/2, outerR - 15, size/2, size/2, outerR);
      haloGrad.addColorStop(0, "rgba(0, 163, 255, 0)");
      haloGrad.addColorStop(0.8, "rgba(0, 163, 255, 0.35)");
      haloGrad.addColorStop(1, "rgba(0, 163, 255, 0.1)");
      ctx.strokeStyle = haloGrad;
      ctx.lineWidth = 15;
      ctx.beginPath(); ctx.arc(size/2, size/2, outerR - 7.5, 0, Math.PI * 2); ctx.stroke();

      // Layer 2: Concentric Razor Rings at the very edge
      [0.985, 0.992, 1.0].forEach((rMult, idx) => {
        ctx.beginPath();
        ctx.strokeStyle = idx === 1 ? "rgba(255, 255, 255, 0.3)" : "rgba(100, 200, 255, 0.15)";
        ctx.lineWidth = idx === 1 ? 0.7 : 0.4;
        ctx.arc(size/2, size/2, (size / 2) * rMult - 1, 0, Math.PI * 2);
        ctx.stroke();
      });

      // 3. Tunnel Rim Contour (Inner)
      ctx.beginPath();
      ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
      ctx.lineWidth = 0.5;
      ctx.arc(size/2, size/2, (size / 2) * 0.8, 0, Math.PI * 2);
      ctx.stroke();

      // 2. Primary Main Grid (Clipped to Tunnel - 0.8)
      ctx.save();
      ctx.beginPath();
      ctx.arc(size/2, size/2, (size / 2) * 0.8, 0, Math.PI * 2);
      ctx.clip();

      ctx.beginPath();
      ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
      ctx.lineWidth = 0.5;
      for (let x = GRID_SIZE; x < size; x += GRID_SIZE) {
        ctx.moveTo(x, 0); ctx.lineTo(x, size);
      }
      for (let y = GRID_SIZE; y < size; y += GRID_SIZE) {
        ctx.moveTo(0, y); ctx.lineTo(size, y);
      }
      ctx.stroke();
      ctx.restore();

      // 4. Secondary Tunnel Rim (0.65)
      ctx.beginPath();
      ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
      ctx.lineWidth = 0.4;
      ctx.arc(size/2, size/2, (size / 2) * 0.65, 0, Math.PI * 2);
      ctx.stroke();

      // 5. Secondary Micro Grid & Dots (Clipped Deeper - 0.65)
      ctx.save();
      ctx.beginPath();
      ctx.arc(size/2, size/2, (size / 2) * 0.65, 0, Math.PI * 2);
      ctx.clip();

      const SMALL_GRID = GRID_SIZE / 2;
      ctx.beginPath();
      ctx.strokeStyle = "rgba(255, 255, 255, 0.09)";
      ctx.lineWidth = 0.3;
      for (let x = SMALL_GRID; x < size; x += SMALL_GRID) {
        ctx.moveTo(x, 0); ctx.lineTo(x, size);
      }
      for (let y = SMALL_GRID; y < size; y += SMALL_GRID) {
        ctx.moveTo(0, y); ctx.lineTo(size, y);
      }
      ctx.stroke();

      // Dots (Clipped to deepest zone)
      ctx.fillStyle = "rgba(255, 255, 255, 0.24)";
      for (let x = GRID_SIZE; x < size; x += GRID_SIZE) {
        for (let y = GRID_SIZE; y < size; y += GRID_SIZE) {
          const dx = x - size / 2;
          const dy = y - size / 2;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist > 20 && dist < (size / 2) * 0.65) {
            ctx.beginPath(); ctx.arc(x, y, 0.8, 0, Math.PI * 2); ctx.fill();
          }
        }
      }
      ctx.restore();
    };

    lastTimeRef.current = 0; // Important: Reset for new loop

    const animate = (now: number) => {
      if (lastTimeRef.current === 0) {
        lastTimeRef.current = now;
        frameRef.current = requestAnimationFrame(animate);
        return;
      }

      const rawDelta = (now - lastTimeRef.current) / 16.66;
      const dt = Math.min(rawDelta, 2.0);
      lastTimeRef.current = now;

      ctx.clearRect(0, 0, size, size);

      // 1. Ambient Light (Background atmosphere) - MUST BE FIRST
      const breathing = Math.sin(now / 700) * 0.2;
      const shimmer = Math.sin(now / 30) * 0.03;
      const coreOpacity = 0.35 + breathing * 0.15 + shimmer;
      const radiusPulse = size / 2 * (1.1 + breathing * 0.2);

      const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
      grad.addColorStop(0, "rgba(0, 0, 0, 0.7)"); 
      grad.addColorStop(1, `rgba(65, 105, 225, ${coreOpacity * 0.5})`); 
      ctx.fillStyle = grad; ctx.fillRect(0, 0, size, size);

      // 3. Grid & Clock Ticks
      drawGrid();

      // Spawn Ray Pulses every 5s
      if (now - lastRayPulseTimeRef.current > 5000) {
        rayPulsesRef.current.push(0);
        lastRayPulseTimeRef.current = now;
      }

      // Update Ray Pulses
      rayPulsesRef.current = rayPulsesRef.current
        .map(p => p + 0.015 * dt)
        .filter(p => p < 1);

      // Update Cooldowns based on time
      for (const key in cooldownsRef.current) {
        if (cooldownsRef.current[key] > 0) cooldownsRef.current[key] -= dt;
      }

      const targetCount = 8;
      if (snakesRef.current.length < targetCount && Math.random() < 0.15) {
        snakesRef.current.push(initSnake());
      }

      // 1. Update Phase
      snakesRef.current.forEach((snake, sIdx) => {
        snake.life += dt;
        snake.progress += snake.speed * dt;

        if (snake.progress >= 1) {
          const currentPos = snake.points[snake.points.length - 1];
          const nodeKey = `${currentPos.x},${currentPos.y}`;

          // Check for collision WITH COOLDOWN
          if ((cooldownsRef.current[nodeKey] || 0) <= 0) {
            snakesRef.current.forEach((other, oIdx) => {
              if (sIdx !== oIdx) {
                const isOccupied = other.points.some(p => p.x === currentPos.x && p.y === currentPos.y);
                if (isOccupied) {
                  pulsesRef.current.push({ x: currentPos.x, y: currentPos.y, alpha: 1.0 });
                  cooldownsRef.current[nodeKey] = 120; // ~2 sec cooldown
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

      // 2. Draw Phase
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

          // Layer 1: Soft Outer Glow (Colored)
          ctx.beginPath();
          ctx.lineWidth = 6.0;
          ctx.strokeStyle = snake.color;
          ctx.globalAlpha = segmentAlpha * 0.25;
          ctx.moveTo(p1.x, p1.y); ctx.lineTo(x2, y2); ctx.stroke();

          // Layer 2: Vibrant Inner Aura (Colored)
          ctx.beginPath();
          ctx.lineWidth = 2.5;
          ctx.strokeStyle = snake.color;
          ctx.globalAlpha = segmentAlpha * 0.7;
          ctx.moveTo(p1.x, p1.y); ctx.lineTo(x2, y2); ctx.stroke();

          // Layer 3: Razor White Core (The Blade)
          ctx.beginPath();
          ctx.lineWidth = 1.0;
          ctx.strokeStyle = "#ffffff";
          ctx.globalAlpha = segmentAlpha * 1.0;
          ctx.moveTo(p1.x, p1.y); ctx.lineTo(x2, y2); ctx.stroke();
        }
        ctx.restore();

        const head = snake.points[snake.points.length - 1];
        const prev = snake.points[snake.points.length - 2] || head;
        const hx = prev.x + (head.x - prev.x) * snake.progress;
        const hy = prev.y + (head.y - prev.y) * snake.progress;

        ctx.save();
        // Head Glow
        const headGlow = ctx.createRadialGradient(hx, hy, 0, hx, hy, 6);
        headGlow.addColorStop(0, snake.color); headGlow.addColorStop(1, "transparent");
        ctx.fillStyle = headGlow; ctx.globalAlpha = 0.4;
        ctx.beginPath(); ctx.arc(hx, hy, 6, 0, Math.PI * 2); ctx.fill();

        const headGrad = ctx.createRadialGradient(hx, hy, 0, hx, hy, 3);
        headGrad.addColorStop(0, snake.color); headGrad.addColorStop(1, "transparent");
        ctx.fillStyle = headGrad; ctx.globalAlpha = 0.8;
        ctx.beginPath(); ctx.arc(hx, hy, 3, 0, Math.PI * 2); ctx.fill();

        ctx.fillStyle = "#fff"; ctx.globalAlpha = 1;
        ctx.beginPath(); ctx.arc(hx, hy, 1.2, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      });
      ctx.restore();

      pulsesRef.current.forEach((pulse) => {
        const dx = pulse.x - size / 2;
        const dy = pulse.y - size / 2;
        if (Math.sqrt(dx * dx + dy * dy) < 15) return; // Dead-zone for center glow

        ctx.save();

        // Layer 1: Concentrated Aura
        ctx.beginPath();
        const pGrad = ctx.createRadialGradient(pulse.x, pulse.y, 0, pulse.x, pulse.y, 7);
        pGrad.addColorStop(0, "rgba(255, 255, 255, 1.0)");
        pGrad.addColorStop(1, "rgba(255, 255, 255, 0)");
        ctx.fillStyle = pGrad; ctx.globalAlpha = pulse.alpha * 0.5;
        ctx.arc(pulse.x, pulse.y, 7, 0, Math.PI * 2); ctx.fill();

        // Layer 2: Inner Spark
        const sparkGrad = ctx.createRadialGradient(pulse.x, pulse.y, 0, pulse.x, pulse.y, 3.5);
        sparkGrad.addColorStop(0, "rgba(255, 255, 255, 1.0)");
        sparkGrad.addColorStop(1, "rgba(255, 255, 255, 0)");
        ctx.fillStyle = sparkGrad; ctx.globalAlpha = pulse.alpha;
        ctx.beginPath(); ctx.arc(pulse.x, pulse.y, 3.5, 0, Math.PI * 2); ctx.fill();

        // Layer 3: Razor Core (Max Intensity)
        const coreGrad = ctx.createRadialGradient(pulse.x, pulse.y, 0, pulse.x, pulse.y, 1.2);
        coreGrad.addColorStop(0, "rgba(255, 255, 255, 1.0)");
        coreGrad.addColorStop(1, "rgba(255, 255, 255, 0)");
        ctx.fillStyle = coreGrad; ctx.globalAlpha = pulse.alpha;
        ctx.beginPath(); ctx.arc(pulse.x, pulse.y, 1.2, 0, Math.PI * 2); ctx.fill();

        ctx.restore();
        pulse.alpha -= 0.14 * dt; // Even snappier for a "high-energy" feel
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
        background: "radial-gradient(circle at 50% 45%, #6d5a9a 0%, #2d1b4e 100%)",
        border: "1px solid rgba(255, 255, 255, 0.3)",
        boxShadow: `
          inset 0 0 2px rgba(255, 255, 255, 1),
          inset 0 0 10px rgba(255, 255, 255, 0.4),
          inset 0 0 25px rgba(45, 0, 247, 0.8),
          inset 0 0 60px rgba(0, 0, 0, 0.4), 
          0 10px 40px rgba(45, 0, 247, 0.15)
        `,
        overflow: "hidden"
      }}
    >
      {/* Glossy Overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0) 50%, rgba(255,255,255,0) 100%)",
          zIndex: 10
        }}
      />
      <canvas ref={canvasRef} style={{ width: "100%", height: "100%", filter: "contrast(1.2) saturate(1.3)" }} />
    </div>
  );
}
