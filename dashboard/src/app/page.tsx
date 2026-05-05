"use client";

import React, { useEffect, useRef, useState, useMemo } from "react";
import NeuralCore from "@/components/NeuralCore";

// --- CONFIGURATION ---
const AGENTS = [
  { id: "architect", label: "ARCHITECT", angle: -90, color: "#3D7BFF", gradFrom: "#5A93FF", gradTo: "#2B5FE0", icon: "architect" },
  { id: "developer", label: "DEVELOPER", angle: 0, color: "#7C5CFF", gradFrom: "#9277FF", gradTo: "#5E3FE5", icon: "developer" },
  { id: "tester", label: "TESTER", angle: 90, color: "#27D69E", gradFrom: "#3BE3AC", gradTo: "#15B884", icon: "tester" },
  { id: "designer", label: "DESIGNER", angle: 180, color: "#FFA53D", gradFrom: "#FFC066", gradTo: "#F08A2E", icon: "designer" },
];

const RING_DIAMETER = 0.403;
const RING_THICKNESS = 0.008;
const DASH_DIAMETER = 0.533;
const TILE_RADIUS = DASH_DIAMETER / 2;
const NODE_RADIUS = 0.228;
const ARROW_INNER = 0.145;
const ARROW_LEN = 0.055;

// --- COMPONENTS ---

function Icon({ kind }: { kind: string }) {
  const s = { width: 18, height: 18, stroke: "#fff", strokeWidth: 2, fill: "none", strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  if (kind === "architect") return (
    <svg viewBox="0 0 24 24" {...s}>
      <rect x="9" y="3.5" width="6" height="5" rx="1.2" />
      <rect x="3" y="15.5" width="5" height="5" rx="1.2" />
      <rect x="9.5" y="15.5" width="5" height="5" rx="1.2" />
      <rect x="16" y="15.5" width="5" height="5" rx="1.2" />
      <path d="M12 8.5v3M5.5 15.5v-1.5h13V15.5M12 14v1.5" />
    </svg>
  );
  if (kind === "developer") return (
    <svg viewBox="0 0 24 24" {...s}>
      <path d="M9 8l-4 4 4 4M15 8l4 4-4 4M13.5 6.5l-3 11" />
    </svg>
  );
  if (kind === "tester") return (
    <svg viewBox="0 0 24 24" {...s}>
      <path d="M12 3.2l7 2.4v6c0 4.2-2.8 7.7-7 9.2-4.2-1.5-7-5-7-9.2v-6l7-2.4z" />
      <path d="M8.5 12.2l2.7 2.6 4.5-4.6" />
    </svg>
  );
  if (kind === "designer") return (
    <svg viewBox="0 0 24 24" {...s}>
      <path d="M14.5 4.2l5.3 5.3-9.3 9.3-5.6 1.4 1.4-5.6 8.2-10.4z" />
      <path d="M13 6l5 5" />
      <path d="M8.5 17.5l-2-2" />
    </svg>
  );
  return null;
}


function NoxBrainIcon({ state }: { state: string }) {
  const isPulse = state === "listening" || state === "processing";
  const isSpeak = state === "speaking";
  return (
    <svg viewBox="0 0 48 48" width="44" height="44" fill="none" stroke={isSpeak ? "#3D7BFF" : "#5340B8"} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className={`transition-all duration-500 ${isSpeak ? 'scale-110 drop-shadow-[0_0_10px_rgba(61,123,255,0.5)]' : 'scale-100'}`}>
      <path d="M22 10c-3 0-5 2-5 4.5 0 .4.05.8.13 1.16C15.3 16.4 14 18 14 20c0 1 .3 1.9.8 2.6-.5.7-.8 1.6-.8 2.6 0 1.6.85 3 2.1 3.7-.07.4-.1.8-.1 1.2 0 2.5 2 4.5 4.5 4.5 1 0 1.9-.32 2.6-.86V10.86A4.46 4.46 0 0 0 22 10Z" />
      <path d="M26 10c3 0 5 2 5 4.5 0 .4-.05.8-.13 1.16C32.7 16.4 34 18 34 20c0 1-.3 1.9-.8 2.6.5.7.8 1.6.8 2.6 0 1.6-.85 3-2.1 3.7.07.4.1.8.1 1.2 0 2.5-2 4.5-4.5 4.5-1 0-1.9-.32-2.6-.86V10.86A4.46 4.46 0 0 1 26 10Z" />
      <path d="M19 18.5h2M27 18.5h2M19 25h3M26 25h3M21 31h6" opacity={isSpeak ? 1 : 0.6} />
    </svg>
  );
}



export default function NoxDashboard() {
  const [mounted, setMounted] = useState(false);
  const [state, setState] = useState("idle");
  const [stageSize, setStageSize] = useState(800);
  const stageSizeRef = useRef(800);
  const stageRef = useRef<HTMLDivElement>(null);
  const ringGradRef = useRef<SVGSVGElement>(null);
  const orbitDashedRef = useRef<HTMLDivElement>(null);
  const orbitDotsRef = useRef<HTMLDivElement>(null);
  const brainRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLDivElement>(null);

  const tileRefs = useRef<Record<string, { wrap: HTMLDivElement | null; card: HTMLDivElement | null; halo: HTMLDivElement | null }>>({});
  const arrowRefs = useRef<Record<string, { wrap: HTMLDivElement | null; line: HTMLDivElement | null; head: HTMLDivElement | null }>>({});

  useEffect(() => {
    setMounted(true);
    const ws = new WebSocket("ws://localhost:777/ws");
    ws.onmessage = (e) => { const data = JSON.parse(e.data); if (data.state) setState(data.state); };
    fetch("http://localhost:777/start", { method: "POST" }).catch(() => { });
    return () => ws.close();
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const update = () => {
      if (stageRef.current) {
        const r = stageRef.current.getBoundingClientRect();
        const s = Math.min(r.width, r.height);
        setStageSize(s);
        stageSizeRef.current = s;
      }
    };
    update(); window.addEventListener("resize", update); return () => window.removeEventListener("resize", update);
  }, [mounted]);

  useEffect(() => {
    if (!mounted) return;
    let raf: number;
    const start = performance.now();
    const tick = () => {
      const t = (performance.now() - start) / 1000;
      const stage = stageSizeRef.current;
      if (!stage) { raf = requestAnimationFrame(tick); return; }

      const orbitPeriod = 90;
      const dashSpeed = 240;
      const dashDVal = stage * DASH_DIAMETER;
      const baseR = (dashDVal - 1.5) / 2; // Center of the 1.5px dashed border
      const nodeRadiusVal = stage * NODE_RADIUS;
      const orbitRot = (t * 360) / orbitPeriod;

      // Tiles & Halos
      AGENTS.forEach((a) => {
        const refs = tileRefs.current[a.id];
        if (!refs || !refs.wrap) return;
        const phase = (a.angle * Math.PI) / 180;
        const currentAngleDeg = (a.angle + orbitRot) % 360;
        const ang = (currentAngleDeg * Math.PI) / 180;
        const r = baseR;
        const x = Math.cos(ang) * r;
        const y = Math.sin(ang) * r;
        refs.wrap.style.transform = `translate3d(calc(-50% + ${x.toFixed(2)}px), calc(-50% + ${y.toFixed(2)}px), 0)`;

        if (refs.card) {
          const s = 1 + Math.sin((t * 2 * Math.PI) / 5 + phase) * 0.018;
          refs.card.style.transform = `translate3d(-50%, -50%, 0) scale(${s.toFixed(4)})`;
        }
        if (refs.halo) {
          const op = 0.55 + Math.sin((t * 2 * Math.PI) / 4 + phase) * 0.12;
          refs.halo.style.opacity = String(Math.max(0, op));
        }

        // Update Arrow Rotation
        const arrowRefsObj = arrowRefs.current[a.id];
        if (arrowRefsObj && arrowRefsObj.wrap) {
          arrowRefsObj.wrap.style.transform = `translate(-50%, -50%) rotate(${currentAngleDeg.toFixed(2)}deg)`;
          const op = String(0.5 + Math.sin((t * 2 * Math.PI) / 3 + phase) * 0.25);
          if (arrowRefsObj.line) arrowRefsObj.line.style.opacity = op;
          if (arrowRefsObj.head) arrowRefsObj.head.style.opacity = op;
        }
      });

      // Ring Rotation
      if (ringGradRef.current) {
        ringGradRef.current.style.transform = `translate(-50%, -50%) rotate(${orbitRot.toFixed(2)}deg)`;
      }

      // Dashed Orbit
      const dashAngle = (-(t * 360) / dashSpeed).toFixed(2);
      if (orbitDashedRef.current) orbitDashedRef.current.style.transform = `translate3d(-50%, -50%, 0) rotate(${dashAngle}deg)`;
      if (orbitDotsRef.current) orbitDotsRef.current.style.transform = `translate3d(-50%, -50%, 0) rotate(${dashAngle}deg)`;

      // Brain & Title
      if (brainRef.current) brainRef.current.style.transform = `scale(${(1 + Math.sin((t * 2 * Math.PI) / 7) * 0.025).toFixed(4)})`;
      if (titleRef.current) titleRef.current.style.opacity = String(0.85 + Math.sin((t * 2 * Math.PI) / 5) * 0.08);

      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick); return () => cancelAnimationFrame(raf);
  }, [stageSize]);

  const ringD = stageSize * RING_DIAMETER;
  const dashD = stageSize * DASH_DIAMETER;
  const dotR = (dashD - 1.5) / 2;
  const stroke = stageSize * RING_THICKNESS;
  const innerR = ringD / 2 - stroke;
  const outerR = ringD / 2;
  const arrowInner = stageSize * ARROW_INNER;
  const arrowLen = stageSize * ARROW_LEN;
  const nodeR = stageSize * NODE_RADIUS;

  if (!mounted) return <main className="min-h-screen bg-[#F4F5FA]" />;

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F4F5FA] overflow-hidden font-sans">
      <style dangerouslySetInnerHTML={{
        __html: `
        .orbit-dashed { position: absolute; left: 50%; top: 50%; border-radius: 50%; border: 1.5px dashed #C9CAE6; opacity: 0.85; will-change: transform; }
        .orbit-dot { position: absolute; left: 0; top: 0; width: 7px; height: 7px; margin: -3.5px 0 0 -3.5px; border-radius: 50%; background: #C9CAE6; }
        .tile-wrap { position: absolute; left: 50%; top: 50%; width: 0; height: 0; pointer-events: none; will-change: transform; }
        .tile-card { position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); display: flex; flex-direction: column; align-items: center; gap: 10px; will-change: transform; }
        .tile-halo { position: absolute; left: 50%; top: 20px; transform: translate(-50%, -50%); width: 80px; height: 80px; border-radius: 50%; filter: blur(8px); will-change: opacity; }
        .tile { position: relative; z-index: 1; background: #fff; border-radius: 14px; padding: 8px; shadow: 0 18px 38px -18px rgba(43,47,74,0.28); }
        .arrow-line { position: absolute; top: -1px; height: 2px; border-radius: 2px; will-change: opacity; }
        .arrow-head { position: absolute; top: -5px; width: 0; height: 0; border-top: 5px solid transparent; border-bottom: 5px solid transparent; border-left: 7px solid; will-change: opacity; }
      `}} />

      <div className="relative w-screen h-screen flex items-center justify-center bg-[radial-gradient(ellipse_at_50%_45%,_#ffffff_0%,_#F4F5FA_60%,_#ECEDF6_100%)]">
        <div ref={stageRef} className="relative w-[min(960px,96vmin)] h-[min(960px,96vmin)]">

          <NeuralCore
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
            size={ringD * 0.61}
            mode={state === "speaking" ? "talking" : state === "processing" ? "thinking" : "idle"}
          />

          <div ref={orbitDashedRef} className="orbit-dashed" style={{ width: dashD, height: dashD }} />
          <div ref={orbitDotsRef} className="absolute left-1/2 top-1/2 w-0 h-0 will-change-transform">
            {[30, 60, 120, 150, 210, 240, 300, 330].map((deg) => (
              <span key={deg} className="orbit-dot" style={{ transform: `rotate(${deg}deg) translate(0, ${-dotR}px)` }} />
            ))}
          </div>

          {(() => {
            const R = (innerR + outerR) / 2; const SW = stroke; const VB = ringD + SW * 4; const C = VB / 2;
            const polar = (deg: number) => { const r = (deg * Math.PI) / 180; return [C + R * Math.cos(r), C + R * Math.sin(r)]; };
            const arcPath = (a0: number, a1: number) => { const [x0, y0] = polar(a0); const [x1, y1] = polar(a1); return `M ${x0.toFixed(2)} ${y0.toFixed(2)} A ${R} ${R} 0 0 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`; };
            return (
              <svg ref={ringGradRef} width={VB} height={VB} viewBox={`0 0 ${VB} ${VB}`} style={{ position: "absolute", left: "50%", top: "50%", transform: "translate(-50%, -50%)", overflow: "visible", willChange: "transform" }}>
                <g>
                  {AGENTS.map((a) => (
                    <g key={a.id + "-arc"}>
                      <path d={arcPath(a.angle - 36, a.angle + 36)} stroke={a.color} strokeWidth={SW * 2.2} strokeLinecap="round" fill="none" opacity="0.28" style={{ filter: `blur(${(SW * 0.9).toFixed(1)}px)` }} />
                      <path d={arcPath(a.angle - 36, a.angle + 36)} stroke={a.color} strokeWidth={SW} strokeLinecap="round" fill="none" />
                    </g>
                  ))}
                  {AGENTS.map((a) => { const [cx, cy] = polar(a.angle); return <circle key={a.id + "-knot"} cx={cx} cy={cy} r={SW * 0.95} fill="#fff" stroke={a.color} strokeWidth={SW * 0.55} />; })}
                </g>
              </svg>
            );
          })()}

          {AGENTS.map((a) => (
            <div key={a.id + "-arrow"} ref={el => { if (el) arrowRefs.current[a.id] = { ...arrowRefs.current[a.id], wrap: el }; }} className="absolute left-1/2 top-1/2 w-0 h-0 will-change-transform">
              <div ref={el => { if (el && arrowRefs.current[a.id]) arrowRefs.current[a.id].line = el; }} className="arrow-line" style={{ left: arrowInner, width: arrowLen, background: `linear-gradient(90deg, ${a.color}00, ${a.color}cc)` }} />
              <div ref={el => { if (el && arrowRefs.current[a.id]) arrowRefs.current[a.id].head = el; }} className="arrow-head" style={{ left: arrowInner - 7, borderLeftColor: a.color }} />
            </div>
          ))}

          {AGENTS.map((a) => {
            const ensureRef = () => { if (!tileRefs.current[a.id]) tileRefs.current[a.id] = { wrap: null, card: null, halo: null }; };
            return (
              <div key={a.id} ref={el => { ensureRef(); tileRefs.current[a.id].wrap = el; }} className="tile-wrap">
                <div ref={el => { ensureRef(); tileRefs.current[a.id].card = el; }} className="tile-card" style={{ gap: '6px' }}>
                  <div ref={el => { ensureRef(); tileRefs.current[a.id].halo = el; }} className="tile-halo" style={{ background: `radial-gradient(closest-side, ${a.color}55, ${a.color}00 70%)` }} />
                  <div className="relative z-10 bg-white rounded-[12px] p-[6px] shadow-[0_18px_38px_-18px_rgba(43,47,74,0.28),0_4px_10px_-4px_rgba(43,47,74,0.10)]">
                    <div className="w-[38px] h-[38px] rounded-[10px] flex items-center justify-center text-white" style={{ background: `linear-gradient(180deg, ${a.gradFrom}, ${a.gradTo})`, boxShadow: `0 10px 24px -8px ${a.color}99, inset 0 1px 0 rgba(255,255,255,0.25)` }}>
                      <Icon kind={a.icon} />
                    </div>
                  </div>
                  <div className="text-[10px] tracking-[0.05em] font-semibold text-[#2B2F4A] whitespace-nowrap uppercase">{a.label}</div>
                </div>
              </div>
            );
          })}

          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-center w-[240px] z-20">
            {/* Center is now empty as requested */}
          </div>
        </div>
      </div>
    </main>
  );
}
