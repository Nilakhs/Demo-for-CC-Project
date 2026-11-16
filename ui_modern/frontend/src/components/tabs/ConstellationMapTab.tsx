import React, { useState, useEffect, useRef } from 'react';
import type { NodeInfo, PodInfo } from '../../types';
import { sound } from '../../lib/sound';
import {
  Play,
  Pause,
  Terminal,
  HelpCircle,
  Info,
} from 'lucide-react';

interface ConstellationMapTabProps {
  nodes: NodeInfo[];
  pods: PodInfo[];
  onSelectPod: (pod: PodInfo) => void;
  onViewLogs?: (pod: PodInfo) => void;
}

export const ConstellationMapTab: React.FC<ConstellationMapTabProps> = ({
  nodes,
  pods,
  onSelectPod,
  onViewLogs,
}) => {
  const [isRotating, setIsRotating] = useState(true);
  const [speedMultiplier, setSpeedMultiplier] = useState<number>(1);
  const [filterType, setFilterType] = useState<'all' | 'website' | 'ml' | 'pending'>('all');
  const [hoveredPod, setHoveredPod] = useState<PodInfo | null>(null);
  const [rotationAngle, setRotationAngle] = useState(0);

  const requestRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);

  // Animation loop for orbital motion
  useEffect(() => {
    if (!isRotating) {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      return;
    }

    const animate = (time: number) => {
      if (lastTimeRef.current !== null) {
        const delta = (time - lastTimeRef.current) / 1000;
        setRotationAngle((prev) => (prev + delta * 20 * speedMultiplier) % 360);
      }
      lastTimeRef.current = time;
      requestRef.current = requestAnimationFrame(animate);
    };

    requestRef.current = requestAnimationFrame(animate);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      lastTimeRef.current = null;
    };
  }, [isRotating, speedMultiplier]);

  const controlPlane = nodes.find((n) => n.name === 'taints-lab-control-plane');
  const generalWorker = nodes.find((n) => n.name === 'taints-lab-worker');
  const gpuWorker = nodes.find((n) => n.name === 'taints-lab-worker2');

  const placedPods = pods.filter((p) => p.nodeName);
  const pendingPods = pods.filter((p) => !p.nodeName || p.phase === 'Pending');

  const controlPlanePods = placedPods.filter((p) => p.nodeName === controlPlane?.name);
  const generalPods = placedPods.filter((p) => p.nodeName === generalWorker?.name);
  const gpuPods = placedPods.filter((p) => p.nodeName === gpuWorker?.name);

  // Filter pods for display
  const shouldShowPod = (pod: PodInfo) => {
    if (filterType === 'all') return true;
    if (filterType === 'website') return pod.app === 'website';
    if (filterType === 'ml') return pod.app.startsWith('ml-') || pod.app === 'gpu-fault-test';
    if (filterType === 'pending') return !pod.nodeName || pod.phase === 'Pending';
    return true;
  };

  // Center coordinate of space map
  const cx = 450;
  const cy = 310;

  // Station positions on orbital rings
  // General worker station fixed at angle 210 deg, GPU worker fixed at 30 deg
  const rGeneral = 180;
  const radGeneralStation = (210 * Math.PI) / 180;
  const generalStationX = cx + rGeneral * Math.cos(radGeneralStation);
  const generalStationY = cy + rGeneral * Math.sin(radGeneralStation);

  const rGpu = 275;
  const radGpuStation = (35 * Math.PI) / 180;
  const gpuStationX = cx + rGpu * Math.cos(radGpuStation);
  const gpuStationY = cy + rGpu * Math.sin(radGpuStation);

  return (
    <div className="space-y-6">
      {/* Top Controls & Telemetry Bar */}
      <div className="rounded-2xl bg-white/[0.02] bg-gradient-to-b from-white/[0.03] to-transparent backdrop-blur-2xl border border-white/[0.08] p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-violet-400 animate-pulse" />
            <h2 className="text-sm font-bold text-white font-mono flex items-center gap-2">
              <span>Cosmic Topology & Pod Constellation Map</span>
            </h2>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-violet-950/60 border border-violet-500/40 text-violet-300">
              Interactive 2D Orbital Map
            </span>
          </div>
          <p className="text-xs text-slate-400 font-mono mt-1">
            Visualizes Kubernetes nodes as celestial stations and deployed Pods as orbital satellites governed by taints & toleration shields.
          </p>
        </div>

        {/* Action buttons & filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Orbital Motion Toggle */}
          <button
            onClick={() => {
              setIsRotating(!isRotating);
              sound.playClick();
            }}
            className={`tactile-btn flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-mono font-medium transition-all cursor-pointer ${
              isRotating
                ? 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30'
                : 'bg-white/[0.03] text-slate-400 border-white/10'
            }`}
          >
            {isRotating ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            <span>{isRotating ? 'Pause Orbit' : 'Resume Orbit'}</span>
          </button>

          {/* Speed multiplier */}
          <div className="flex items-center gap-1 bg-white/[0.03] border border-white/10 rounded-xl p-0.5 text-[11px] font-mono">
            {[0.5, 1, 2].map((sp) => (
              <button
                key={sp}
                onClick={() => {
                  setSpeedMultiplier(sp);
                  sound.playClick();
                }}
                className={`px-2 py-1 rounded-lg transition-colors cursor-pointer ${
                  speedMultiplier === sp
                    ? 'bg-white/10 text-white font-bold'
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                {sp}x
              </button>
            ))}
          </div>

          {/* Workload Filter */}
          <div className="flex items-center gap-1 bg-white/[0.03] border border-white/10 rounded-xl p-0.5 text-[11px] font-mono">
            {(
              [
                { id: 'all', label: 'All Fleet' },
                { id: 'website', label: 'Web Only' },
                { id: 'ml', label: 'ML Only' },
                { id: 'pending', label: 'Pending' },
              ] as const
            ).map((f) => (
              <button
                key={f.id}
                onClick={() => {
                  setFilterType(f.id);
                  sound.playTabSwitch();
                }}
                className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                  filterType === f.id
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Interactive Celestial Canvas Map */}
      <div className="relative w-full rounded-2xl bg-black/60 backdrop-blur-2xl border border-white/[0.08] overflow-hidden shadow-2xl min-h-[580px] flex items-center justify-center p-2">
        <svg
          viewBox="0 0 900 620"
          className="w-full h-auto max-h-[680px] select-none"
        >
          <defs>
            {/* Glow filters */}
            <filter id="glow-cyan" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="6" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
            <filter id="glow-violet" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="7" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
            <filter id="glow-amber" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="5" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>

            {/* Radial gradients for celestial bodies */}
            <radialGradient id="grad-control-plane" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#818cf8" stopOpacity="0.9" />
              <stop offset="60%" stopColor="#4338ca" stopOpacity="0.7" />
              <stop offset="100%" stopColor="#1e1b4b" stopOpacity="0.2" />
            </radialGradient>

            <radialGradient id="grad-general-worker" cx="40%" cy="40%" r="60%">
              <stop offset="0%" stopColor="#67e8f9" stopOpacity="0.9" />
              <stop offset="65%" stopColor="#0891b2" stopOpacity="0.7" />
              <stop offset="100%" stopColor="#083344" stopOpacity="0.3" />
            </radialGradient>

            <radialGradient id="grad-gpu-worker" cx="35%" cy="35%" r="65%">
              <stop offset="0%" stopColor="#e879f9" stopOpacity="0.95" />
              <stop offset="45%" stopColor="#a855f7" stopOpacity="0.8" />
              <stop offset="80%" stopColor="#6b21a8" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#2e1065" stopOpacity="0.25" />
            </radialGradient>

            {/* Linear patterns */}
            <linearGradient id="orbit-grad-cyan" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.4" />
              <stop offset="50%" stopColor="#06b6d4" stopOpacity="0.1" />
              <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.3" />
            </linearGradient>

            <linearGradient id="orbit-grad-violet" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.45" />
              <stop offset="50%" stopColor="#8b5cf6" stopOpacity="0.1" />
              <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.35" />
            </linearGradient>
          </defs>

          {/* Deep Space Background Grid Lines */}
          <g stroke="rgba(255,255,255,0.03)" strokeWidth="1">
            <line x1="0" y1={cy} x2="900" y2={cy} strokeDasharray="4 8" />
            <line x1={cx} y1="0" x2={cx} y2="620" strokeDasharray="4 8" />
          </g>

          {/* 1. ORBITAL RINGS */}
          {/* General Worker Orbit */}
          <circle
            cx={cx}
            cy={cy}
            r={rGeneral}
            fill="none"
            stroke="url(#orbit-grad-cyan)"
            strokeWidth="1.5"
            strokeDasharray="6 8"
          />
          <text
            x={cx - rGeneral + 12}
            y={cy - 8}
            className="text-[10px] font-mono fill-cyan-500/50 uppercase tracking-widest"
          >
            Tier 1: General Compute Orbit
          </text>

          {/* GPU Worker Orbit */}
          <circle
            cx={cx}
            cy={cy}
            r={rGpu}
            fill="none"
            stroke="url(#orbit-grad-violet)"
            strokeWidth="1.5"
            strokeDasharray="8 10"
          />
          <text
            x={cx + rGpu - 160}
            y={cy + rGpu - 15}
            className="text-[10px] font-mono fill-violet-400/50 uppercase tracking-widest"
          >
            Tier 2: Dedicated GPU Ring
          </text>

          {/* 2. PENDING PODS DOCK (Upper Right Outpost) */}
          <g transform="translate(710, 30)">
            {/* Dock Box */}
            <rect
              x="0"
              y="0"
              width="170"
              height="200"
              rx="16"
              fill="rgba(15, 10, 5, 0.65)"
              stroke={pendingPods.length > 0 ? "rgba(245, 158, 11, 0.4)" : "rgba(255, 255, 255, 0.08)"}
              strokeWidth="1.5"
              strokeDasharray={pendingPods.length > 0 ? "4 4" : "none"}
              className="backdrop-blur-xl"
            />
            {/* Dock Header */}
            <g transform="translate(14, 24)">
              <circle
                cx="6"
                cy="6"
                r="4"
                fill={pendingPods.length > 0 ? "#f59e0b" : "#64748b"}
                className={pendingPods.length > 0 ? "animate-ping" : ""}
              />
              <text x="18" y="10" className="text-[11px] font-mono font-bold fill-amber-300">
                PENDING DOCK
              </text>
              <text x="18" y="24" className="text-[9px] font-mono fill-slate-400">
                {pendingPods.length} Unsatisfied Pods
              </text>
            </g>

            {/* Drifting Pending Pods */}
            {pendingPods.map((pod, idx) => {
              const isShown = shouldShowPod(pod);
              if (!isShown) return null;
              const py = 60 + idx * 30;
              const isHovered = hoveredPod?.name === pod.name;

              return (
                <g
                  key={pod.name}
                  transform={`translate(14, ${py})`}
                  className="cursor-pointer transition-all duration-200"
                  onMouseEnter={() => setHoveredPod(pod)}
                  onMouseLeave={() => setHoveredPod(null)}
                  onClick={() => onSelectPod(pod)}
                >
                  <rect
                    x="0"
                    y="0"
                    width="142"
                    height="24"
                    rx="6"
                    fill={isHovered ? "rgba(245, 158, 11, 0.25)" : "rgba(245, 158, 11, 0.1)"}
                    stroke={isHovered ? "rgba(245, 158, 11, 0.8)" : "rgba(245, 158, 11, 0.3)"}
                    strokeWidth="1"
                  />
                  <circle cx="12" cy="12" r="3" fill="#f59e0b" className="animate-pulse" />
                  <text
                    x="22"
                    y="15"
                    className="text-[9px] font-mono fill-amber-200 font-semibold truncate"
                  >
                    {pod.name.length > 18 ? `${pod.name.substring(0, 16)}…` : pod.name}
                  </text>
                </g>
              );
            })}
          </g>

          {/* 3. CENTRAL COMMAND STATION (Control Plane) */}
          <g transform={`translate(${cx}, ${cy})`}>
            {/* Defensive Force Shield Ring */}
            <circle
              r="48"
              fill="url(#grad-control-plane)"
              stroke="rgba(129, 140, 248, 0.5)"
              strokeWidth="2"
              strokeDasharray="5 5"
              className="animate-spin-slow"
              style={{ animationDuration: '40s' }}
            />
            {/* Pulsing Radar Sweep */}
            <circle
              r="42"
              fill="none"
              stroke="rgba(99, 102, 241, 0.4)"
              strokeWidth="1"
            />
            {/* Station Core */}
            <circle
              r="24"
              fill="#1e1b4b"
              stroke="#6366f1"
              strokeWidth="2"
              filter="url(#glow-violet)"
            />
            {/* Center Label */}
            <text
              textAnchor="middle"
              y="-56"
              className="text-[11px] font-mono font-bold fill-indigo-200 tracking-wider"
            >
              CONTROL PLANE
            </text>
            <text
              textAnchor="middle"
              y="-69"
              className="text-[9px] font-mono fill-indigo-400 font-semibold uppercase"
            >
              Manager Core
            </text>
            <text
              textAnchor="middle"
              y="60"
              className="text-[9px] font-mono fill-indigo-300"
            >
              node-role: control-plane
            </text>

            {/* Orbiting system satellites / pods */}
            {controlPlanePods.map((pod, i) => {
              if (!shouldShowPod(pod)) return null;
              const angle = (i * (360 / Math.max(1, controlPlanePods.length)) + rotationAngle * 0.7) * (Math.PI / 180);
              const px = 68 * Math.cos(angle);
              const py = 68 * Math.sin(angle);
              return (
                <g
                  key={pod.name}
                  transform={`translate(${px}, ${py})`}
                  className="cursor-pointer"
                  onMouseEnter={() => setHoveredPod(pod)}
                  onMouseLeave={() => setHoveredPod(null)}
                  onClick={() => onSelectPod(pod)}
                >
                  <circle r="7" fill="#4338ca" stroke="#818cf8" strokeWidth="1.5" />
                  <circle r="3" fill="#a5b4fc" />
                </g>
              );
            })}
          </g>

          {/* 4. STATION ALPHA (General Worker Node) */}
          <g transform={`translate(${generalStationX}, ${generalStationY})`}>
            {/* Atmospheric Aura */}
            <circle
              r="52"
              fill="none"
              stroke="rgba(6, 182, 212, 0.25)"
              strokeWidth="1.5"
              strokeDasharray="4 6"
            />
            {/* Planet Body */}
            <circle
              r="34"
              fill="url(#grad-general-worker)"
              stroke="#22d3ee"
              strokeWidth="2"
              filter="url(#glow-cyan)"
            />

            {/* Station Title */}
            <text
              textAnchor="middle"
              y="-42"
              className="text-[11px] font-mono font-bold fill-cyan-200"
            >
              STATION ALPHA
            </text>
            <text
              textAnchor="middle"
              y="-54"
              className="text-[9px] font-mono fill-cyan-400 uppercase tracking-widest font-semibold"
            >
              General Worker
            </text>

            {/* Active Taint Pill */}
            {generalWorker?.taints && generalWorker.taints.length > 0 && (
              <g transform="translate(0, 46)">
                <rect
                  x="-55"
                  y="0"
                  width="110"
                  height="18"
                  rx="9"
                  fill="#7f1d1d"
                  stroke="#ef4444"
                  strokeWidth="1"
                />
                <text
                  textAnchor="middle"
                  y="12"
                  className="text-[8px] font-mono font-bold fill-red-200"
                >
                  {generalWorker.taints[0].key}:{generalWorker.taints[0].effect}
                </text>
              </g>
            )}

            {/* Orbiting Pod Satellites for General Worker */}
            {generalPods.map((pod, i) => {
              if (!shouldShowPod(pod)) return null;
              // Compute pod satellite orbit around Station Alpha
              const podOrbitRadius = 65 + (i % 2) * 14;
              const podAngle =
                (i * (360 / Math.max(1, generalPods.length)) + rotationAngle * 1.2) * (Math.PI / 180);
              const satX = podOrbitRadius * Math.cos(podAngle);
              const satY = podOrbitRadius * Math.sin(podAngle);
              const isHovered = hoveredPod?.name === pod.name;

              return (
                <g
                  key={pod.name}
                  transform={`translate(${satX}, ${satY})`}
                  className="cursor-pointer transition-transform duration-150"
                  onMouseEnter={() => setHoveredPod(pod)}
                  onMouseLeave={() => setHoveredPod(null)}
                  onClick={() => onSelectPod(pod)}
                >
                  {/* Pod Orbit Path hint */}
                  <circle
                    r={podOrbitRadius}
                    cx={-satX}
                    cy={-satY}
                    fill="none"
                    stroke="rgba(6, 182, 212, 0.08)"
                    strokeWidth="0.8"
                  />

                  {/* Satellite Body: Solar wings & cockpit */}
                  <line x1="-12" y1="0" x2="12" y2="0" stroke="#0284c7" strokeWidth="2" />
                  <rect
                    x="-5"
                    y="-5"
                    width="10"
                    height="10"
                    rx="3"
                    fill={isHovered ? "#38bdf8" : "#0369a1"}
                    stroke="#38bdf8"
                    strokeWidth={isHovered ? "2" : "1"}
                  />
                  <circle r="2" fill="#e0f2fe" />

                  {/* Tiny label on hover */}
                  {isHovered && (
                    <text
                      y="-10"
                      textAnchor="middle"
                      className="text-[8px] font-mono fill-cyan-200 font-bold"
                    >
                      {pod.app}
                    </text>
                  )}
                </g>
              );
            })}
          </g>

          {/* 5. STATION OMEGA (Dedicated GPU Worker Node) */}
          <g transform={`translate(${gpuStationX}, ${gpuStationY})`}>
            {/* Saturn-like Planetary Ring System */}
            <ellipse
              rx="62"
              ry="18"
              fill="none"
              stroke="rgba(192, 132, 252, 0.4)"
              strokeWidth="3"
              transform="rotate(-20)"
            />
            <ellipse
              rx="74"
              ry="22"
              fill="none"
              stroke="rgba(192, 132, 252, 0.2)"
              strokeWidth="1.5"
              strokeDasharray="4 4"
              transform="rotate(-20)"
            />

            {/* Planet Body */}
            <circle
              r="38"
              fill="url(#grad-gpu-worker)"
              stroke="#c084fc"
              strokeWidth="2.5"
              filter="url(#glow-violet)"
            />

            {/* Station Title */}
            <text
              textAnchor="middle"
              y="-48"
              className="text-[11px] font-mono font-bold fill-violet-200"
            >
              STATION OMEGA
            </text>
            <text
              textAnchor="middle"
              y="-60"
              className="text-[9px] font-mono fill-violet-400 uppercase tracking-widest font-semibold"
            >
              Dedicated GPU Cluster
            </text>

            {/* Active Taint Pill */}
            {gpuWorker?.taints && gpuWorker.taints.length > 0 && (
              <g transform="translate(0, 48)">
                <rect
                  x="-65"
                  y="0"
                  width="130"
                  height="18"
                  rx="9"
                  fill="#581c87"
                  stroke="#a855f7"
                  strokeWidth="1"
                />
                <text
                  textAnchor="middle"
                  y="12"
                  className="text-[8px] font-mono font-bold fill-violet-200"
                >
                  {gpuWorker.taints[0].key}:{gpuWorker.taints[0].effect}
                </text>
              </g>
            )}

            {/* Orbiting ML Training Pod Vessels */}
            {gpuPods.map((pod, i) => {
              if (!shouldShowPod(pod)) return null;
              const podOrbitRadius = 82 + (i % 2) * 16;
              const podAngle =
                (i * (360 / Math.max(1, gpuPods.length)) - rotationAngle * 0.9) * (Math.PI / 180);
              const satX = podOrbitRadius * Math.cos(podAngle);
              const satY = podOrbitRadius * Math.sin(podAngle);
              const isHovered = hoveredPod?.name === pod.name;

              return (
                <g
                  key={pod.name}
                  transform={`translate(${satX}, ${satY})`}
                  className="cursor-pointer transition-transform duration-150"
                  onMouseEnter={() => setHoveredPod(pod)}
                  onMouseLeave={() => setHoveredPod(null)}
                  onClick={() => onSelectPod(pod)}
                >
                  {/* Sleek spacecraft triangle for ML Pods */}
                  <polygon
                    points="0,-8 7,7 -7,7"
                    fill={isHovered ? "#f472b6" : "#c084fc"}
                    stroke={isHovered ? "#ffffff" : "#a855f7"}
                    strokeWidth={isHovered ? "2" : "1"}
                  />
                  {/* Thruster exhaust dot */}
                  <circle cy="8" r="1.5" fill="#38bdf8" className="animate-ping" />

                  {/* Tiny label on hover */}
                  {isHovered && (
                    <text
                      y="-12"
                      textAnchor="middle"
                      className="text-[8px] font-mono fill-fuchsia-200 font-bold"
                    >
                      {pod.name.substring(0, 12)}
                    </text>
                  )}
                </g>
              );
            })}
          </g>
        </svg>

        {/* Floating Pod Inspector HUD Card (Bottom Left) */}
        {hoveredPod ? (
          <div className="absolute bottom-4 left-4 z-20 w-80 rounded-xl bg-slate-950/90 backdrop-blur-2xl border border-white/20 p-4 shadow-2xl animate-in fade-in duration-150">
            <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-2 mb-2">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs font-mono font-bold text-white truncate">
                  {hoveredPod.name}
                </span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/10 text-cyan-300">
                {hoveredPod.app}
              </span>
            </div>

            <div className="space-y-1.5 text-[11px] font-mono text-slate-300">
              <div className="flex justify-between">
                <span className="text-slate-500">Host Station:</span>
                <span className="text-cyan-300 font-semibold">{hoveredPod.nodeName || 'Unassigned (Pending)'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Phase:</span>
                <span className="text-emerald-300 font-semibold">{hoveredPod.phase}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">NodeSelector:</span>
                <span className="text-violet-300">
                  {hoveredPod.nodeSelector && Object.keys(hoveredPod.nodeSelector).length > 0
                    ? JSON.stringify(hoveredPod.nodeSelector)
                    : 'None (Any Node)'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Tolerations:</span>
                <span className="text-amber-300 font-semibold">
                  {hoveredPod.tolerations && hoveredPod.tolerations.length > 0
                    ? `${hoveredPod.tolerations[0].key}=${hoveredPod.tolerations[0].value || '*'}`
                    : 'None'}
                </span>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-2 mt-3 pt-2 border-t border-white/10">
              <button
                onClick={() => onSelectPod(hoveredPod)}
                className="flex-1 flex items-center justify-center gap-1 py-1 px-2 rounded-lg bg-white/10 hover:bg-white/20 text-white text-[10px] font-mono cursor-pointer"
              >
                <HelpCircle className="w-3 h-3 text-cyan-400" />
                <span>Why Here?</span>
              </button>
              {onViewLogs && (
                <button
                  onClick={() => onViewLogs(hoveredPod)}
                  className="flex-1 flex items-center justify-center gap-1 py-1 px-2 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-[10px] font-mono cursor-pointer"
                >
                  <Terminal className="w-3 h-3 text-emerald-400" />
                  <span>View Logs</span>
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="absolute bottom-4 left-4 z-10 text-[11px] font-mono text-slate-400 bg-black/60 backdrop-blur-xl border border-white/10 px-3 py-1.5 rounded-xl flex items-center gap-2">
            <Info className="w-3.5 h-3.5 text-cyan-400" />
            <span>Hover over any satellite vessel or station to inspect placement physics.</span>
          </div>
        )}

        {/* Legend Overlay (Bottom Right) */}
        <div className="absolute bottom-4 right-4 z-10 rounded-xl bg-black/60 backdrop-blur-xl border border-white/10 p-3 space-y-1.5 text-[10px] font-mono text-slate-300">
          <div className="text-slate-500 uppercase tracking-widest text-[9px] mb-1 font-bold">
            Constellation Legend
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
            <span>Website Pods ({generalPods.filter((p) => p.app === 'website').length})</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-violet-400" />
            <span>Dedicated ML Pods ({gpuPods.length})</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
            <span>Pending Asteroid Dock ({pendingPods.length})</span>
          </div>
        </div>
      </div>
    </div>
  );
};
