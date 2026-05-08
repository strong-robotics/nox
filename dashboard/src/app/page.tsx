"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import NeuralCore from "@/components/NeuralCore";

// --- CONFIGURATION ---
const AGENTS = [
  { id: "architect", label: "ARCHITECT", model: "Gemini Flash 3", status: "ACTIVE", time: "02:14:32", angle: 0, color: "#FF5C5C", gradFrom: "#FF8E8E", gradTo: "#FF5C5C", icon: "architect" },
  { id: "designer", label: "DESIGNER", model: "Gemini Flash 3", status: "INACTIVE", time: "", angle: -90, color: "#FFB547", gradFrom: "#FFCC85", gradTo: "#FFB547", icon: "designer" },
  { id: "developer", label: "DEVELOPER", model: "Claude", status: "INACTIVE", time: "", angle: 90, color: "#7C5CFF", gradFrom: "#A08EFF", gradTo: "#7C5CFF", icon: "developer" },
  { id: "tester", label: "TESTER", model: "Gemini Flash 3", status: "INACTIVE", time: "", angle: 180, color: "#27D69E", gradFrom: "#3BE3AC", gradTo: "#27D69E", icon: "tester" },
];

const TASKS = [
  { id: "01", title: "Create a red cube button widget", desc: "Flutter Stack", status: "IN PROGRESS", time: "02:14:32", color: "#FF5C5C" },
  { id: "02", title: "Create a blue cube button widget", desc: "Flutter Stack", status: "QUEUED", time: "Queued", color: "#7C5CFF" },
  { id: "03", title: "Create a green cube button widget with counter", desc: "Flutter Stack", status: "QUEUED", time: "Queued", color: "#27D69E" },
  { id: "04", title: "Create a yellow cube button widget with icon", desc: "Flutter Stack", status: "QUEUED", time: "Queued", color: "#FFB547" },
  { id: "05", title: "Create a purple cube button that disables after 3 taps", desc: "Flutter Stack", status: "QUEUED", time: "Queued", color: "#A08EFF" },
];

const RING_DIAMETER = 0.403;
const RING_THICKNESS = 0.008;
const DASH_DIAMETER = 0.533;
const ARROW_INNER = 0.142;
const ARROW_LEN = 0.045;

// --- COMPONENTS ---

function Icon({ kind }: { kind: string }) {
  const s = { width: 20, height: 20, stroke: "#fff", strokeWidth: 2, fill: "none", strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
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

function AgentStatusCard({ agent }: { agent: typeof AGENTS[0] }) {
  const [stopping, setStopping] = useState(false);
  const isActive  = agent.status === "ACTIVE";
  const isWaiting = agent.status === "WAITING";
  const isLive    = isActive || isWaiting;
  const dotColor  = stopping ? "bg-red-400 animate-pulse" : isActive ? "bg-green-400" : isWaiting ? "bg-yellow-400 animate-pulse" : "bg-slate-300";
  const textColor = stopping ? "text-red-400" : isActive ? "text-green-500" : isWaiting ? "text-yellow-500" : "text-slate-400";
  const statusLabel = stopping ? "STOPPING" : agent.status;

  const handleStop = async () => {
    const agentId = (agent as any).agentId ?? (agent as any).pid;
    if (!agentId) return;
    setStopping(true);
    await fetch("http://localhost:777/kill-agent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pid: agentId, role: agent.id }),
    }).catch(() => {});
    setStopping(false);
  };

  return (
    <div className="bg-white rounded-xl p-5 flex-1 shadow-[0_4px_16px_rgba(0,0,0,0.06)] flex items-center gap-4 min-w-[220px]">
      <div className="w-12 h-12 rounded-lg flex items-center justify-center text-white flex-shrink-0" style={{ background: `linear-gradient(135deg, ${agent.gradFrom}, ${agent.gradTo})` }}>
        <Icon kind={agent.icon} />
      </div>
      <div className="flex flex-col gap-1 flex-1 min-w-0">
        <div className="flex flex-col">
          <div className="text-[12px] font-bold text-[#1a2b4b] tracking-wider uppercase">{agent.label}</div>
          <div className="text-[10px] text-[#52525b] font-medium">{agent.model}</div>
        </div>
        <div className="flex items-center gap-3 mt-1">
          <div className="flex items-center gap-1.5">
            <div className={`w-1.5 h-1.5 rounded-full ${dotColor} ${isWaiting ? 'animate-pulse' : ''}`} />
            <div className={`text-[9px] font-bold uppercase ${textColor}`}>{statusLabel}</div>
          </div>
          {isLive && ((agent as any).agentId || (agent as any).pid) && (
            <div className="text-[9px] font-mono text-slate-400">#{(agent as any).agentId ?? (agent as any).pid}</div>
          )}
        </div>
      </div>
      {isLive && ((agent as any).pid || (agent as any).agentId) && (
        <button
          onClick={handleStop}
          title="Stop agent"
          className="flex-shrink-0 w-6 h-6 rounded-md flex items-center justify-center bg-red-50 hover:bg-red-100 transition-colors"
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="#ef4444">
            <rect x="1" y="1" width="8" height="8" rx="1.5" />
          </svg>
        </button>
      )}
    </div>
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

  const [fullState, setFullState] = useState<any>(null);
  const agentsRef = useRef<any[]>([]);

  useEffect(() => {
    setMounted(true);
    const ws = new WebSocket("ws://localhost:777/ws");
    ws.onmessage = (e) => { 
      const data = JSON.parse(e.data); 
      if (data.state) setState(data.state);
      setFullState(data);
    };
    fetch("http://localhost:777/start", { method: "POST" }).catch(() => { });
    return () => ws.close();
  }, []);

  const AGENT_META: Record<string, any> = {
    architect: { label: "ARCHITECT", angle: 0, color: "#FF5C5C", gradFrom: "#FF8E8E", gradTo: "#FF5C5C", icon: "architect" },
    designer: { label: "DESIGNER", angle: -90, color: "#FFB547", gradFrom: "#FFCC85", gradTo: "#FFB547", icon: "designer" },
    developer: { label: "DEVELOPER", angle: 90, color: "#7C5CFF", gradFrom: "#A08EFF", gradTo: "#7C5CFF", icon: "developer" },
    tester: { label: "TESTER", angle: 180, color: "#27D69E", gradFrom: "#3BE3AC", gradTo: "#27D69E", icon: "tester" },
  };

  const resolveAgentStatus = (pipelineStatus: string, role: string): string => {
    if (pipelineStatus === "in_progress") return "ACTIVE";
    if (pipelineStatus === "completed")   return "DONE";
    if (pipelineStatus === "ready")       return "READY";
    if (pipelineStatus === "waiting") {
      const liveAgents: any[] = fullState?.live_agents || [];
      const isAlive = liveAgents.some(
        (a: any) => a.role.toLowerCase() === role.toLowerCase() && a.alive
      );
      return isAlive ? "WAITING" : "INACTIVE";
    }
    return "INACTIVE";
  };

  const currentAgents = useMemo(() => {
    if (!fullState || !fullState.pipeline || fullState.pipeline.length === 0) return AGENTS;
    const resolvedStatus = (p: any) => resolveAgentStatus(p.status, p.role);

    const resolveModel = (p: any): string => {
      const status = resolvedStatus(p);
      if (status === "INACTIVE") return "—";
      const role = p.role.toLowerCase();
      const liveAgents: any[] = fullState?.live_agents || [];
      const liveAgent = liveAgents.find(
        (a: any) => a.role.toLowerCase() === role && a.alive
      );
      const env = liveAgent?.env;
      if (role === "architect") return env === "antigravity" ? "Gemini" : "Claude";
      if (role === "developer") {
        if (env === "antigravity") return "Gemini";
        if (env === "cursor") return "Claude";
        if (env === "codex") {
          const m = (fullState.codex_agents || []).find((a: any) => a.role === "developer")?.model;
          return m && m !== "unknown" ? m : "Codex";
        }
        return "Codex";
      }
      if (role === "designer" || role === "tester") return env === "cursor" ? "Claude" : "Gemini";
      return "—";
    };

    const liveAgentsAll: any[] = fullState?.live_agents || [];
    return fullState.pipeline.map((p: any) => {
      const meta = AGENT_META[p.role.toLowerCase()] || { label: p.role.toUpperCase(), angle: 0, color: "#7C5CFF", gradFrom: "#A08EFF", gradTo: "#7C5CFF", icon: "developer" };
      const liveAgent = liveAgentsAll.find(
        (a: any) => a.role.toLowerCase() === p.role.toLowerCase() && a.alive
      );
      return {
        id: p.role,
        ...meta,
        status: resolvedStatus(p),
        model: resolveModel(p),
        time: p.started_at || "",
        pid: liveAgent?.pid ?? null,
        agentId: liveAgent?.kill_pid ?? null,
      };
    });
  }, [fullState]);

  useEffect(() => {
    agentsRef.current = currentAgents;
  }, [currentAgents]);

  const isActiveTask = !!(fullState?.current_task && fullState.current_task !== "None" && fullState.current_task !== "N/A");

  const currentTasks = useMemo(() => {
    if (!fullState || !fullState.tasks || !fullState.tasks.all_queued?.length) return TASKS;
    return fullState.tasks.all_queued.map((t: any, i: number) => ({
      id: `0${i + 1}`,
      title: t.action || t,
      desc: t.stack ? `${t.stack} Stack` : "Queued",
      status: isActiveTask && i === 0 ? "IN PROGRESS" : "QUEUED",
      color: isActiveTask && i === 0 ? "#FF5C5C" : "#7C5CFF"
    }));
  }, [fullState, isActiveTask]);

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
      const now = performance.now();
      const t = (now - start) / 1000;
      const stage = stageSizeRef.current;
      if (!stage) { raf = requestAnimationFrame(tick); return; }

      const orbitPeriod = 90;
      const dashSpeed = 240;
      const dashDVal = stage * DASH_DIAMETER;
      const baseR = (dashDVal - 1.5) / 2; // Center of the 1.5px dashed border
      const orbitRot = (t * 360) / orbitPeriod;

      // Tiles & Halos
      agentsRef.current.forEach((a: any) => {
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
          if (arrowRefsObj.line) arrowRefsObj.line.style.opacity = "0.4";
          if (arrowRefsObj.head) arrowRefsObj.head.style.opacity = "0.7";
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
  if (!mounted) return <main className="min-h-screen bg-[#F4F5F8]" />;

  return (
    <main className="relative w-full h-screen bg-[#F4F5F8] font-sans overflow-hidden">
      <style dangerouslySetInnerHTML={{
        __html: `
        .orbit-dashed { position: absolute; left: 50%; top: 50%; border-radius: 50%; border: 1.5px dashed #B8BCCF; opacity: 0.85; will-change: transform; }
        .orbit-dot { position: absolute; left: 0; top: 0; width: 7px; height: 7px; margin: -3.5px 0 0 -3.5px; border-radius: 50%; background: #C9CAE6; }
        .tile-wrap { position: absolute; left: 50%; top: 50%; width: 0; height: 0; pointer-events: none; will-change: transform; }
        .tile-card { position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); display: flex; flex-direction: column; align-items: center; gap: 6px; will-change: transform; }
        .tile-halo { position: absolute; left: 50%; top: 20px; transform: translate(-50%, -50%); width: 80px; height: 80px; border-radius: 50%; filter: blur(8px); will-change: opacity; }
        .tile { position: relative; z-index: 1; background: #fff; border-radius: 14px; padding: 8px; shadow: 0 18px 38px -18px rgba(43,47,74,0.28); }
        .arrow-line { position: absolute; top: -1px; height: 2px; border-radius: 2px; will-change: opacity; }
        .arrow-head { position: absolute; top: -5px; width: 0; height: 0; border-top: 5px solid transparent; border-bottom: 5px solid transparent; border-left: 7px solid; will-change: opacity; }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #E2E4F0; border-radius: 10px; }
      `}} />

      {/* HEADER BLOCK (Absolute) */}
      <div className="absolute top-6 left-6 right-6 h-fit flex items-center gap-4 z-50 pointer-events-none">
        <div className="flex gap-4 w-full pointer-events-auto">
          {currentAgents.map((a: any) => (
            <AgentStatusCard key={a.id} agent={a} />
          ))}
        </div>
      </div>

      {/* TASK QUEUE SIDEBAR */}
      <div className="absolute left-6 top-[152px] bottom-6 w-[340px] flex flex-col z-40">
        <div className="mb-2 ml-2 text-[12px] font-bold text-[#52525b] uppercase tracking-wider">TASK QUEUE</div>

        <div className="flex-1 overflow-hidden border-2 border-dashed border-[#B8BCCF]/80 rounded-xl flex flex-col bg-white/10">
          <div className="flex-1 overflow-y-auto p-2 custom-scrollbar">
            <div className="flex flex-col">
              {currentTasks.length > 0 ? currentTasks.map((t: any, i: number) => (
                <div key={t.id} className={`p-4 flex items-center ${i < currentTasks.length - 1 ? 'border-b border-dashed border-[#B8BCCF]' : ''}`}>
                  <div className="flex items-center gap-4 w-full">
                    <div className="text-lg font-bold text-[#3D7BFF] min-w-[28px]">{t.id}</div>
                    <div className="flex flex-col justify-center">
                      <div className="text-[13px] font-bold text-[#1a2b4b] leading-tight">{t.title}</div>
                      <div className="text-[11px] text-[#52525b] font-medium mt-0.5 leading-relaxed">{t.desc}</div>
                      {t.status === 'IN PROGRESS' && (
                        <div className="flex items-center gap-4 mt-2">
                          <div className="text-[9px] font-mono text-slate-400 font-bold uppercase">{t.time || "Active"}</div>
                          <div className="text-[9px] font-bold uppercase text-green-500">{t.status}</div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )) : (
                <div className="flex flex-col items-center justify-center h-full py-20 px-6 text-center opacity-40">
                  <div className="text-[11px] font-bold text-[#1a2b4b] uppercase tracking-[0.2em] mb-2">Idle System</div>
                  <div className="text-[10px] text-[#52525b] leading-relaxed">Eugene, I'm standing by. Add a task to the queue to begin.</div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT SIDEBAR - CURRENT TASK & PROGRESS */}
      <div className="absolute right-6 top-[152px] bottom-6 w-[340px] flex flex-col z-40">
        <div className="flex justify-between items-end mb-2 px-2">
          <div className="text-[12px] font-bold text-[#52525b] uppercase tracking-wider">CURRENT TASK</div>
        </div>

        <div className="flex-1 overflow-hidden border-2 border-dashed border-[#B8BCCF]/80 rounded-xl flex flex-col bg-white/10 p-5">
          {/* Main Task Highlight */}
          {(() => {
            const queued = fullState?.tasks?.all_queued || [];
            const activeTask = isActiveTask
              ? (queued.find((t: any) => t.action === fullState.current_task) || null)
              : null;
            return (
              <>
                <div className="bg-white/70 rounded-xl p-4 mb-4 border border-white/50 shadow-[0_2px_10px_rgba(0,0,0,0.02)] flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-lg ${isActiveTask ? "bg-blue-50 text-[#3D7BFF]" : "bg-slate-100 text-slate-400"}`}>
                    {isActiveTask ? "▶" : "—"}
                  </div>
                  <div className="flex flex-col">
                    <div className="text-[13px] font-bold text-[#1a2b4b] leading-tight">
                      {isActiveTask ? fullState.current_task : "No Active Task"}
                    </div>
                    <div className="text-[11px] text-[#52525b] mt-0.5">
                      {isActiveTask ? "Active Multi-Agent Stream" : "Idle"}
                    </div>
                  </div>
                </div>
                {isActiveTask && activeTask?.instructions && (
                  <div className="px-1 mb-6">
                    <div className="text-[12px] leading-relaxed text-[#52525b]">{activeTask.instructions}</div>
                  </div>
                )}
              </>
            );
          })()}

          <div className="mb-6 ml-1 text-[12px] font-bold text-[#52525b] uppercase tracking-wider">STEP PROGRESS</div>

          <div className="flex-1 relative">
            <div className="flex flex-col gap-9 relative">
              {/* Vertical Dashed Line - Ends at the last agent circle */}
              <div className="absolute left-[15px] top-4 bottom-4 border-l-[1.5px] border-dashed border-slate-300" />

              {currentAgents.map((s: any, i: number) => (
                <div key={s.id} className="flex items-center gap-4 relative">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-bold z-10 transition-all ${s.status === 'ACTIVE' ? 'text-white shadow-lg scale-110' : 'text-white'}`}
                    style={{
                      backgroundColor: s.color,
                      boxShadow: s.status === 'ACTIVE' ? `0 4px 10px ${s.color}33` : 'none',
                      opacity: s.status === 'COMPLETED' ? 0.6 : 1
                    }}
                  >
                    {i + 1}
                  </div>
                  <div className="flex-1 flex items-center justify-between min-w-0">
                    <div className="flex flex-col justify-center">
                      <div className={`text-[12px] font-bold tracking-wider leading-none ${s.status === 'ACTIVE' ? 'text-red-500' : 'text-[#1a2b4b]'}`}>
                        {s.label}
                      </div>
                      <div className="text-[11px] text-[#52525b] mt-1.5 leading-none">{s.status === 'ACTIVE' ? (s.desc || "Processing...") : s.status}</div>
                    </div>
                    {s.time && (
                      <div className="text-[10px] font-mono text-slate-400 font-bold ml-4">
                        {s.time}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* MAIN ORBIT AREA (Centered in Viewport) */}
      <div className="w-full h-full relative flex items-center justify-center">
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

          {currentAgents.map((a: any) => (
            <div key={a.id + "-arrow"} ref={el => { if (el) arrowRefs.current[a.id] = { ...arrowRefs.current[a.id], wrap: el }; }} className="absolute left-1/2 top-1/2 w-0 h-0 will-change-transform">
              <div ref={el => { if (el && arrowRefs.current[a.id]) arrowRefs.current[a.id].line = el; }} className="arrow-line" style={{ left: arrowInner, width: arrowLen, background: `linear-gradient(90deg, ${a.color}00, ${a.color}cc)` }} />
              <div ref={el => { if (el && arrowRefs.current[a.id]) arrowRefs.current[a.id].head = el; }} className="arrow-head" style={{ left: arrowInner - 7, borderLeftColor: a.color }} />
            </div>
          ))}

          {currentAgents.map((a: any) => {
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
        </div>
      </div>
      {/* SYSTEM FLOOR (BOTTOM STATUS) */}
      <div className="absolute bottom-6 left-[388px] right-[388px] h-[88px] bg-white rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.06)] z-40 flex items-center px-12 justify-between border border-white/50">

        {/* ACTIVE */}
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-[#3D7BFF] font-bold text-lg">
            {fullState ? (fullState.pipeline || []).filter((a:any) => a.status === 'in_progress').length : "--"}
          </div>
          <div className="text-[12px] font-bold text-[#1a2b4b] uppercase tracking-wider">ACTIVE</div>
        </div>

        {/* COMPLETED */}
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-[#3D7BFF] font-bold text-lg">
            {fullState ? (fullState.tasks?.completed || 0) : "--"}
          </div>
          <div className="text-[12px] font-bold text-[#1a2b4b] uppercase tracking-wider">COMPLETED</div>
        </div>

        {/* QUEUED */}
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-[#3D7BFF] font-bold text-lg">
            {fullState ? (fullState.tasks?.queued || 0) : "--"}
          </div>
          <div className="text-[12px] font-bold text-[#1a2b4b] uppercase tracking-wider">QUEUED</div>
        </div>

        {/* TOTAL */}
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-[#3D7BFF] font-bold text-lg">
            {fullState ? (fullState.tasks?.completed || 0) + (fullState.tasks?.queued || 0) : "--"}
          </div>
          <div className="text-[12px] font-bold text-[#1a2b4b] uppercase tracking-wider">TOTAL</div>
        </div>

      </div>
    </main>
  );
}
