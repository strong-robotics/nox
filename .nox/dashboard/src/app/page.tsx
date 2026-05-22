"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import NeuralCore from "@/components/NeuralCore";
import MatrixRain from "@/components/MatrixRain";
import DataGrid from "@/app/components/DataGrid";

const fmtTime = (iso: string) => {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
};

// --- CONFIGURATION ---
const AGENTS = [
  { id: "architect", label: "ARCHITECT", model: "—", status: "INACTIVE", time: "", angle: 0, color: "#00FF41", gradFrom: "#00FF41", gradTo: "#008F11", icon: "architect" },
  { id: "designer", label: "DESIGNER", model: "Gemini Flash 3", status: "INACTIVE", time: "", angle: -90, color: "#00FF41", gradFrom: "#00FF41", gradTo: "#008F11", icon: "designer" },
  { id: "developer", label: "DEVELOPER", model: "Claude", status: "INACTIVE", time: "", angle: 90, color: "#00FF41", gradFrom: "#00FF41", gradTo: "#008F11", icon: "developer" },
  { id: "tester", label: "TESTER", model: "Gemini Flash 3", status: "INACTIVE", time: "", angle: 180, color: "#00FF41", gradFrom: "#00FF41", gradTo: "#008F11", icon: "tester" },
];

const RING_DIAMETER = 0.403;
const RING_THICKNESS = 0.004;
const DASH_DIAMETER = 0.533;
const ARROW_INNER = 0.142;
const ARROW_LEN = 0.045;

// --- COMPONENTS ---

function Icon({ kind }: { kind: string }) {
  const s = { width: 18, height: 18, stroke: "currentColor", strokeWidth: 1.5, fill: "none", strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  if (kind === "architect") return (
    <svg viewBox="0 0 24 24" {...s}>
      <rect x="9" y="3.5" width="6" height="5" rx="1" />
      <rect x="3" y="15.5" width="5" height="5" rx="1" />
      <rect x="9.5" y="15.5" width="5" height="5" rx="1" />
      <rect x="16" y="15.5" width="5" height="5" rx="1" />
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

function AgentStatusCard({ agent }: { agent: any }) {
  const [stopping, setStopping] = useState(false);
  const isActive = agent.status === "ACTIVE";
  const isWaiting = agent.status === "WAITING";
  const isLive = isActive || isWaiting;

  const statusColor = (isActive || isWaiting) ? "text-[#00FF41]" : "text-[#00FFBD]/30";
  const glowClass = isActive ? "matrix-glow" : "";

  return (
    <div className={`matrix-notched-new relative flex-1 h-[105px] min-h-[105px] overflow-hidden group bg-black/90 ${isActive ? 'shadow-[0_0_20px_rgba(0,255,65,0.15)]' : ''}`}>
      <div className="flex items-center gap-5 w-full h-full pl-4 pr-4 z-10 relative">
        {/* Inner Icon Box - Rounded per example */}
        <div className={`w-10 h-10 rounded-md border border-[#00FFBD]/40 flex items-center justify-center text-[#00FFBD] flex-shrink-0 bg-black/40 ${isActive ? 'shadow-[0_0_12px_rgba(0,255,65,0.25)]' : ''}`}>
          <Icon kind={agent.icon} />
        </div>

        <div className="flex flex-col gap-0.5 flex-1 min-w-0 z-10">
          <div className="flex justify-between items-start">
            <div className={`text-[13px] font-bold ${isLive ? 'text-white matrix-text-glow-white' : 'text-[#00FFBD] matrix-text-glow-teal'} leading-tight tracking-wide uppercase`}>{agent.label}</div>
            {isLive && (agent.agentId || agent.pid) && (
              <div className="text-[11px] font-mono text-[#00FFBD]/40">#{agent.agentId ?? agent.pid}</div>
            )}
          </div>
          <div className="text-[13px] text-[#00FFBD]/40 truncate">{agent.model || "—"}</div>
          <div className="text-[12px] text-[#00FFBD]/50 tracking-wider">[{agent.env || ""}]</div>
          <div className="flex items-center gap-2 mt-1">
            <div className={`w-1.5 h-1.5 rounded-full ${isActive || isWaiting ? 'bg-[#00FF41] animate-pulse shadow-[0_0_8px_#00FF41]' : 'bg-[#00FFBD]/10'}`} />
            <div className={`text-[12px] font-bold tracking-widest uppercase ${statusColor} ${isActive || isWaiting ? 'matrix-text-glow' : ''}`}>{stopping ? "STOPPING" : agent.status}</div>
          </div>
        </div>

        {/* Temporarily hidden per user request */}
        {/* {isLive && (agent.pid || agent.agentId) && (
          <button
            onClick={async () => {
              setStopping(true);
              await fetch("http://localhost:777/kill-agent", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ pid: agent.agentId ?? agent.pid, role: agent.id }),
              }).catch(() => { });
              setStopping(false);
            }}
            className="opacity-0 group-hover:opacity-100 transition-opacity w-6 h-6 flex items-center justify-center border border-red-900/50 hover:bg-red-950/30 text-red-500 mr-4"
          >
            <span className="text-[10px]">×</span>
          </button>
        )} */}
      </div>
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
  const coreContainerRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLDivElement>(null);

  const tileRefs = useRef<Record<string, { wrap: HTMLDivElement | null; card: HTMLDivElement | null; halo: HTMLDivElement | null }>>({});
  const arrowRefs = useRef<Record<string, { wrap: HTMLDivElement | null; line: HTMLDivElement | null; head: HTMLDivElement | null }>>({});

  const [fullState, setFullState] = useState<any>(null);
  const agentsRef = useRef<any[]>([]);

  useEffect(() => {
    setMounted(true);
    let ws: WebSocket | null = null;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    let dead = false;

    const connect = () => {
      if (dead) return;
      ws = new WebSocket("ws://localhost:777/ws");
      ws.onmessage = (e) => {
        const data = JSON.parse(e.data);
        if (data.state) setState(data.state);
        setFullState(data);
      };
      ws.onerror = () => { /* handled by onclose */ };
      ws.onclose = () => {
        if (!dead) retryTimer = setTimeout(connect, 3000);
      };
    };

    connect();
    fetch("http://localhost:777/start", { method: "POST" }).catch(() => { });
    return () => {
      dead = true;
      if (retryTimer) clearTimeout(retryTimer);
      ws?.close();
    };
  }, []);

  const AGENT_META: Record<string, any> = {
    architect: { label: "ARCHITECT", angle: 0, color: "#00FFBD", icon: "architect" },
    designer: { label: "DESIGNER", angle: -90, color: "#00FFBD", icon: "designer" },
    developer: { label: "DEVELOPER", angle: 90, color: "#00FFBD", icon: "developer" },
    tester: { label: "TESTER", angle: 180, color: "#00FFBD", icon: "tester" },
  };

  const resolveAgentStatus = (pipelineStatus: string, role: string): string => {
    if (pipelineStatus === "in_progress") return "ACTIVE";
    const liveAgents: any[] = fullState?.live_agents || [];
    const isAlive = liveAgents.some(
      (a: any) => a.role.toLowerCase() === role.toLowerCase() && a.alive
    );
    return isAlive ? "WAITING" : "INACTIVE";
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
      const envModel = (e: string | undefined) => {
        if (e === "antigravity") return "Gemini";
        if (e === "cursor") return "Claude";
        if (e === "codex_app") return "Codex";
        return null;
      };
      if (role === "architect") return envModel(env) ?? "Claude";
      if (role === "developer") {
        if (env === "codex") {
          const m = (fullState.codex_agents || []).find((a: any) => a.role === "developer")?.model;
          return m && m !== "unknown" ? m : "Codex";
        }
        return envModel(env) ?? "Codex";
      }
      if (role === "designer" || role === "tester") return envModel(env) ?? "Gemini";
      return "—";
    };

    const liveAgentsAll: any[] = fullState?.live_agents || [];
    return fullState.pipeline.map((p: any) => {
      const meta = AGENT_META[p.role.toLowerCase()] || { label: p.role.toUpperCase(), angle: 0, color: "#00FFBD", icon: "developer" };
      const liveAgent = liveAgentsAll.find(
        (a: any) => a.role.toLowerCase() === p.role.toLowerCase() && a.alive
      );
      const envLabel = (e: string | undefined) => {
        if (e === "cursor") return "Cursor";
        if (e === "antigravity") return "Antigravity";
        if (e === "codex") return "Codex";
        if (e === "codex_app") return "Codex.app";
        return null;
      };
      return {
        id: p.role,
        ...meta,
        status: resolvedStatus(p),
        model: resolveModel(p),
        env: envLabel(liveAgent?.env),
        time: p.started_at || "",
        pid: liveAgent?.pid ?? null,
        agentId: liveAgent?.kill_pid ?? null,
      };
    });
  }, [fullState]);

  useEffect(() => {
    agentsRef.current = currentAgents;
  }, [currentAgents]);

  const isActiveTask = !!(fullState?.current_task && fullState.current_task !== "None" && fullState.current_task !== "N/A") || currentAgents.some((a: any) => a.status === "ACTIVE");

  const currentTasks = useMemo(() => {
    if (!fullState || !fullState.tasks || !fullState.tasks.all_queued?.length) return [];
    return fullState.tasks.all_queued.map((t: any, i: number) => ({
      id: `0${i + 1}`,
      title: t.action || t,
      desc: t.stack ? `${t.stack} Stack` : "Queued",
      status: isActiveTask && i === 0 ? "IN PROGRESS" : "QUEUED",
      color: "#00FFBD"
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

      const orbitPeriod = 120;
      const dashDVal = stage * DASH_DIAMETER;
      const baseR = (dashDVal - 1.5) / 2;
      const orbitRot = (t * 360) / orbitPeriod;

      if (coreContainerRef.current) {
        coreContainerRef.current.style.transform = `translate(-50%, -50%) rotate(${-orbitRot.toFixed(2)}deg)`;
      }

      agentsRef.current.forEach((a: any) => {
        const refs = tileRefs.current[a.id];
        if (!refs || !refs.wrap) return;
        const currentAngleDeg = (a.angle + orbitRot) % 360;
        const ang = (currentAngleDeg * Math.PI) / 180;
        const r = baseR;
        const x = Math.cos(ang) * r;
        const y = Math.sin(ang) * r;
        refs.wrap.style.transform = `translate3d(calc(-50% + ${x.toFixed(2)}px), calc(-50% + ${y.toFixed(2)}px), 0)`;

        if (refs.card) {
          const s = 1 + Math.sin((t * 2 * Math.PI) / 8 + a.angle) * 0.015;
          refs.card.style.transform = `translate3d(-50%, -50%, 0) scale(${s.toFixed(4)})`;
        }
        if (refs.halo) {
          const op = 0.4 + Math.sin((t * 2 * Math.PI) / 6 + a.angle) * 0.1;
          refs.halo.style.opacity = String(Math.max(0, op));
        }

        const arrowRefsObj = arrowRefs.current[a.id];
        if (arrowRefsObj && arrowRefsObj.wrap) {
          arrowRefsObj.wrap.style.transform = `translate(-50%, -50%) rotate(${currentAngleDeg.toFixed(2)}deg)`;
        }
      });

      if (ringGradRef.current) {
        ringGradRef.current.style.transform = `rotate(${orbitRot.toFixed(2)}deg)`;
        ringGradRef.current.style.transformOrigin = "center center";
      }

      if (orbitDashedRef.current) orbitDashedRef.current.style.transform = `translate3d(-50%, -50%, 0) rotate(${(-(t * 360) / 300).toFixed(2)}deg)`;
      if (orbitDotsRef.current) orbitDotsRef.current.style.transform = `translate3d(-50%, -50%, 0) rotate(${(-(t * 360) / 300).toFixed(2)}deg)`;

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

  if (!mounted) return <main className="min-h-screen bg-black" />;

  return (
    <main className="relative w-full h-screen bg-black text-[#00FFBD] font-mono overflow-hidden">
      {/* <MatrixRain /> */}
      <DataGrid />

      {/* GLOBAL BACKGROUND ELEMENTS */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <div className="absolute inset-0 opacity-[0.03] bg-[linear-gradient(rgba(0,255,189,0.3)_1px,transparent_1px),linear-gradient(90deg,rgba(0,255,189,0.3)_1px,transparent_1px)] bg-[size:40px_40px]" />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black opacity-40" />
      </div>

      {/* SCANLINE EFFECT */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-50">
        <div className="w-full h-[2px] bg-[#00FFBD]/10 animate-scanline" />
      </div>

      <style dangerouslySetInnerHTML={{
        __html: `
        .orbit-dashed { position: absolute; left: 50%; top: 50%; border-radius: 50%; border: 1px dashed rgba(0, 255, 65, 0.2); will-change: transform; }
        .orbit-dot { position: absolute; left: 0; top: 0; width: 4px; height: 4px; margin: -2px 0 0 -2px; border-radius: 50%; background: rgba(0, 255, 65, 0.5); box-shadow: 0 0 5px #00FF41; }
        .tile-wrap { position: absolute; left: 50%; top: 50%; width: 0; height: 0; pointer-events: none; will-change: transform; }
        .tile-card { position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); display: flex; flex-direction: column; align-items: center; gap: 4px; will-change: transform; }
        .tile-halo { position: absolute; left: 50%; top: 15px; transform: translate(-50%, -50%); width: 60px; height: 60px; border-radius: 50%; filter: blur(10px); will-change: opacity; }
        .arrow-line { position: absolute; top: -0.5px; height: 1px; will-change: opacity; }
        .arrow-head { position: absolute; top: -3px; width: 0; height: 0; border-top: 3px solid transparent; border-bottom: 3px solid transparent; border-left: 5px solid; will-change: opacity; }
        .custom-scrollbar::-webkit-scrollbar { width: 2px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #00FFBD; }
        .matrix-text-glow { text-shadow: 0 0 8px #00FFBD; }
      `}} />

      {/* HEADER BLOCK */}
      <div className="absolute top-6 left-6 right-6 h-fit flex items-center gap-4 z-50">
        <div className="flex gap-4 w-full">
          {currentAgents.map((a: any) => (
            <AgentStatusCard key={a.id} agent={a} />
          ))}
        </div>
      </div>

      {/* LEFT SIDEBAR - TASK QUEUE */}
      <div className="absolute left-6 top-[140px] bottom-10 w-[320px] flex flex-col z-40">
        <div className="mb-2 px-2 text-[10px] font-bold text-[#00FFBD] uppercase tracking-[0.3em] matrix-text-glow">SYSTEM.QUEUE //</div>
        <div className="matrix-notched-new flex-1 overflow-hidden bg-black/90 flex flex-col">
          <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] z-10 p-5">
            {currentTasks.map((t: any, i: number) => (
              <div key={t.id} className={`p-4 flex flex-col gap-1 border-b border-[#00FFBD]/10`}>
                <div className="flex items-center gap-3">
                  <span className="text-[11px] text-[#00FFBD]/60 font-mono">{t.id}</span>
                  <span className={`text-[13px] font-bold tracking-wider text-white ${t.status === 'IN PROGRESS' ? 'matrix-text-glow' : ''}`}>{t.title}</span>
                </div>
                <div className="flex justify-between items-center ml-6">
                  <span className="text-[11px] text-[#00FFBD]/60 uppercase tracking-tighter">{t.desc}</span>
                  {t.status === 'IN PROGRESS' && <span className="text-[9px] animate-pulse text-[#00FFBD]">EXECUTING...</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* RIGHT SIDEBAR - CURRENT TASK & PROGRESS */}
      <div className="absolute right-6 top-[140px] bottom-10 w-[320px] flex flex-col z-40">
        <div className="mb-2 px-2 flex justify-between items-center">
          <div className="text-[10px] font-bold text-[#00FFBD] uppercase tracking-[0.3em] matrix-text-glow">CURRENT.PROCESS //</div>
          {isActiveTask && (
            <div className="flex items-center gap-2">
              <svg className="animate-spin h-3 w-3 text-[#00FFBD]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </div>
          )}
        </div>
        <div className="matrix-notched-new flex-1 overflow-hidden bg-black/90 flex flex-col">
          <div className="p-5 flex flex-col gap-6 z-10 flex-1">
            {(() => {
              const queued = fullState?.tasks?.all_queued || [];
              const activeTask = queued.length > 0 ? queued[0] : null;
              return (
                <div className="matrix-notched-new no-corners bg-[#00FFBD]/5" style={{ '--notch-size': '4px' } as any}>
                  <div className="p-4 z-10 relative">
                    <div className="text-[13px] font-bold text-white mb-2 leading-tight tracking-wide">
                      {activeTask?.action || (isActiveTask && fullState ? fullState.current_task : "NO ACTIVE PROCESS")}
                    </div>
                    <div className="text-[11px] leading-relaxed text-[#00FFBD] font-light">
                      {activeTask?.instructions || "System idling. Awaiting next command sequence..."}
                    </div>
                  </div>
                </div>
              );
            })()}

            <div className="flex-1 relative mt-4">
              <div className="flex flex-col gap-8 relative">
                {/* Connector Line */}
                <div className="absolute left-[13px] top-4 bottom-4 border-l border-[#00FFBD]/20" />

                {currentAgents.map((s: any, i: number) => (
                  <div key={s.id} className="flex items-center gap-4 relative">
                    <div className={`matrix-notched-new no-corners w-8 h-8 flex items-center justify-center text-[12px] font-bold z-10 transition-all border
                      ${s.status === 'ACTIVE'
                        ? 'bg-black/80 text-[#00FF41] border-[#00FF41] shadow-[0_0_15px_rgba(0,255,65,0.2)]'
                        : 'bg-black/80 text-[#00FFBD]/40 border-[#00FFBD]/20'}`}
                      style={{ '--notch-size': '4px' } as any}>
                      <span className="relative z-10">0{i + 1}</span>
                    </div>
                    <div className="flex flex-col z-10 flex-1">
                      <div className={`text-[13px] font-bold tracking-[0.2em] uppercase ${s.status === 'ACTIVE' ? 'text-white' : 'text-[#00FFBD]/30'}`}>
                        {s.label}
                      </div>
                      <div className={`text-[11px] uppercase tracking-widest mt-1 ${s.status === 'ACTIVE' ? 'text-[#00FF41] matrix-text-glow' : 'text-[#00FFBD]/10'}`}>
                        {s.status}
                      </div>
                    </div>
                    {s.status === 'ACTIVE' && (
                      <svg className="animate-spin h-4 w-4 text-[#00FF41] flex-shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CENTRAL AREA */}
      <div className="w-full h-full relative flex items-center justify-center">
        <div ref={stageRef} className="relative w-[min(900px,90vmin)] h-[min(900px,90vmin)]">

          <div
            ref={coreContainerRef}
            className="absolute left-1/2 top-1/2"
            style={{ width: ringD * 0.7, height: ringD * 0.7 }}
          >
            <NeuralCore
              size={ringD * 0.7}
              mode={
                state === "speaking" || currentAgents.some((a: any) => a.status === "ACTIVE")
                  ? "talking"
                  : state === "processing"
                    ? "thinking"
                    : "idle"
              }
            />
          </div>

          <div ref={orbitDashedRef} className="orbit-dashed" style={{ width: dashD, height: dashD }} />
          <div ref={orbitDotsRef} className="absolute left-1/2 top-1/2 w-0 h-0">
            {[0, 45, 90, 135, 180, 225, 270, 315].map(deg => (
              <span key={deg} className="orbit-dot" style={{ transform: `rotate(${deg}deg) translate(0, ${-dotR}px)` }} />
            ))}
          </div>

          {(() => {
            const R = (innerR + outerR) / 2; const SW = stroke; const VB = ringD + SW * 6; const C = VB / 2;
            const polar = (deg: number) => { const r = (deg * Math.PI) / 180; return [C + R * Math.cos(r), C + R * Math.sin(r)]; };
            const arcPath = (a0: number, a1: number) => { const [x0, y0] = polar(a0); const [x1, y1] = polar(a1); return `M ${x0.toFixed(2)} ${y0.toFixed(2)} A ${R} ${R} 0 0 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`; };
            return (
              <svg ref={ringGradRef} width={VB} height={VB} viewBox={`0 0 ${VB} ${VB}`} className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 overflow-visible pointer-events-none">
                <g>
                  {AGENTS.map(a => (
                    <g key={a.id + "-arc"}>
                      <path d={arcPath(a.angle - 30, a.angle + 30)} stroke="#00FF41" strokeWidth={SW * 3} strokeLinecap="round" fill="none" opacity="0.15" style={{ filter: 'blur(10px)' }} />
                      <path d={arcPath(a.angle - 30, a.angle + 30)} stroke="#00FF41" strokeWidth={SW} strokeLinecap="round" fill="none" />
                    </g>
                  ))}
                  {AGENTS.map(a => { const [cx, cy] = polar(a.angle); return <circle key={a.id + "-knot"} cx={cx} cy={cy} r={SW * 1.5} fill="#00FF41" className="animate-pulse" />; })}
                </g>
              </svg>
            );
          })()}

          {currentAgents.map((a: any) => (
            <div key={a.id + "-arrow"} ref={el => { if (el) arrowRefs.current[a.id] = { ...arrowRefs.current[a.id], wrap: el }; }} className="absolute left-1/2 top-1/2 w-0 h-0">
              <div className="arrow-line" style={{ left: arrowInner, width: arrowLen, background: 'linear-gradient(90deg, transparent, #00FF41)' }} />
              <div className="arrow-head" style={{ left: arrowInner - 5, borderLeftColor: '#00FF41' }} />
            </div>
          ))}

          {currentAgents.map((a: any) => {
            const ensureRef = () => { if (!tileRefs.current[a.id]) tileRefs.current[a.id] = { wrap: null, card: null, halo: null }; };
            return (
              <div key={a.id} ref={el => { ensureRef(); tileRefs.current[a.id].wrap = el; }} className="tile-wrap">
                <div ref={el => { ensureRef(); tileRefs.current[a.id].card = el; }} className="tile-card">
                  <div ref={el => { ensureRef(); tileRefs.current[a.id].halo = el; }} className="tile-halo" style={{ background: 'radial-gradient(closest-side, rgba(0, 255, 65, 0.4), transparent)' }} />
                  <div className="matrix-notched-new no-corners w-11 h-11 flex items-center justify-center shadow-[0_0_15px_rgba(0,255,65,0.1)] relative" style={{ '--notch-size': '6px' } as any}>
                    <div className="w-8 h-8 rounded-md border border-[#00FF41]/30 flex items-center justify-center text-[#00FF41] bg-black/40">
                      <Icon kind={a.icon} />
                    </div>
                  </div>
                  <span className="text-[9px] font-bold tracking-[0.2em] uppercase text-[#00FF41]/70">{a.label}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* FOOTER STATUS */}
      <div className="matrix-notched-new absolute bottom-[130px] left-1/2 -translate-x-1/2 h-[90px] w-fit min-w-[700px] bg-black/90 flex items-center justify-center z-50">
        <div className="w-full h-full px-12 flex items-center justify-between gap-12 z-10">
          {[
            { label: 'IN QUEUE', val: fullState ? (fullState.tasks?.queued || 0) : "--" },
            { label: 'COMPLETED', val: fullState ? (fullState.tasks?.completed || 0) : "--" },
            { label: 'TOTAL', val: fullState ? (fullState.tasks?.completed || 0) + (fullState.tasks?.queued || 0) : "--" }
          ].map(stat => (
            <div key={stat.label} className="flex items-center gap-4">
              <span className="text-2xl font-bold tracking-tighter matrix-text-glow">{stat.val}</span>
              <span className="text-[12px] font-bold text-[#00FFBD]/40 uppercase tracking-[0.3em]">{stat.label}</span>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
