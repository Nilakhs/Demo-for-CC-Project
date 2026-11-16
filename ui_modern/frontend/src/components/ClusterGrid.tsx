import React from 'react';
import type { NodeInfo, PodInfo, Taint } from '../types';
import { PodChip } from './PodChip';
import { taintToString, EFFECT_CONFIG } from '../lib/k8s-rules';
import {
  Shield,
  Monitor,
  Cpu,
  Clock,
  Tag,
  Ban,
  CheckCircle2,
  AlertCircle,
  Layers,
} from 'lucide-react';

interface ClusterGridProps {
  nodes: NodeInfo[];
  pods: PodInfo[];
  onSelectPod: (pod: PodInfo) => void;
  onViewLogs?: (pod: PodInfo) => void;
}

export const ClusterGrid: React.FC<ClusterGridProps> = ({ nodes, pods, onSelectPod, onViewLogs }) => {
  const controlPlane = nodes.find((n) => n.name === 'taints-lab-control-plane');
  const generalWorker = nodes.find((n) => n.name === 'taints-lab-worker');
  const gpuWorker = nodes.find((n) => n.name === 'taints-lab-worker2');

  const placedPods = pods.filter((p) => p.nodeName);
  const pendingPods = pods.filter((p) => !p.nodeName || p.phase === 'Pending');

  const getPodsForNode = (nodeName: string) => {
    return placedPods.filter((p) => p.nodeName === nodeName);
  };

  const generalPods = getPodsForNode(generalWorker?.name || '');
  const gpuPods = getPodsForNode(gpuWorker?.name || '');
  const controlPlanePods = getPodsForNode(controlPlane?.name || '');

  // Hardware allocation metrics
  const generalCpuPct = Math.min(95, 12 + generalPods.length * 16);
  const generalCpuCores = ((8 * generalCpuPct) / 100).toFixed(1);
  const generalMemPct = Math.min(92, 18 + generalPods.length * 14);
  const generalMemGiB = ((7.7 * generalMemPct) / 100).toFixed(1);

  const gpuCpuPct = Math.min(98, 10 + gpuPods.length * 22);
  const gpuCpuCores = ((8 * gpuCpuPct) / 100).toFixed(1);
  const gpuMemPct = Math.min(95, 20 + gpuPods.length * 19);
  const gpuMemGiB = ((7.7 * gpuMemPct) / 100).toFixed(1);
  const gpuAllocPct = Math.min(100, Math.round((gpuPods.length / 3) * 100));

  const pendingCpuReq = (pendingPods.length * 0.5).toFixed(1);
  const pendingMemReq = (pendingPods.length * 512).toFixed(0);

  const renderTaints = (taints: Taint[]) => {
    if (!taints || taints.length === 0) {
      return (
        <div className="flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-950/30 border border-emerald-500/20 px-2.5 py-1 rounded-lg font-mono">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          <span>No taints — open to all</span>
        </div>
      );
    }

    return (
      <div className="flex flex-wrap gap-1.5">
        {taints.map((t, idx) => {
          const effectStyle = EFFECT_CONFIG[t.effect] || EFFECT_CONFIG.NoSchedule;
          return (
            <span
              key={idx}
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono border ${effectStyle.badge}`}
              title={`Taint: ${taintToString(t)}`}
            >
              <Ban className="w-3 h-3 text-red-400" />
              <span className="font-semibold">{taintToString(t)}</span>
            </span>
          );
        })}
      </div>
    );
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
      {/* 1. Control Plane Node (overflow-hidden prevents manager badge clipping) */}
      <div className="rounded-2xl overflow-hidden bg-white/[0.02] hover:bg-white/[0.05] bg-gradient-to-b from-white/[0.03] to-transparent backdrop-blur-2xl border border-white/[0.08] hover:border-indigo-500/40 p-5 flex flex-col justify-between transition-all duration-300 shadow-xl">
        <div>
          {/* Header: min-w-0 flex-1 truncate ensures long node name never pushes Manager badge out */}
          <div className="flex items-center justify-between gap-2 mb-3 min-w-0">
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 shrink-0">
                <Shield className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-[10px] font-mono text-indigo-400 uppercase tracking-widest block font-bold truncate">
                  Control Plane
                </span>
                <h3 className="text-xs sm:text-sm font-mono font-bold text-slate-100 truncate" title={controlPlane?.name}>
                  {controlPlane?.name || 'taints-lab-control-plane'}
                </h3>
              </div>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/[0.04] border border-white/10 text-slate-400 shrink-0 whitespace-nowrap">
              Manager
            </span>
          </div>

          {/* Active Taints */}
          <div className="mb-3">
            <div className="text-[10px] font-mono text-slate-500 uppercase tracking-widest mb-1.5">
              Active Taints
            </div>
            {renderTaints(controlPlane?.taints || [])}
          </div>

          {/* Labels */}
          <div className="mb-3">
            <div className="text-[10px] font-mono text-slate-500 uppercase tracking-widest mb-1">
              Role
            </div>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-white/[0.04] text-slate-300 border border-white/10 inline-block truncate max-w-full">
              node-role: control-plane
            </span>
          </div>

          {/* Hardware Telemetry Bar */}
          <div className="mb-4 p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-2">
            <div className="flex items-center justify-between text-[10px] font-mono">
              <span className="flex items-center gap-1.5 text-slate-300 font-semibold">
                <Cpu className="w-3 h-3 text-indigo-400" />
                <span>8 vCPUs · 7.7 GiB RAM</span>
              </span>
              <span className="text-slate-500 text-[9px]">containerd 2.3.4</span>
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[9px] font-mono">
                <span className="text-slate-500">CPU Usage</span>
                <span className="text-indigo-300 font-semibold">15% (1.2 / 8 Cores)</span>
              </div>
              <div className="w-full h-1 bg-white/[0.05] rounded-full overflow-hidden">
                <div className="h-full bg-indigo-500 rounded-full" style={{ width: '15%' }} />
              </div>
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[9px] font-mono">
                <span className="text-slate-500">RAM Allocation</span>
                <span className="text-indigo-300 font-semibold">23% (1.8 / 7.7 GiB)</span>
              </div>
              <div className="w-full h-1 bg-white/[0.05] rounded-full overflow-hidden">
                <div className="h-full bg-indigo-400 rounded-full" style={{ width: '23%' }} />
              </div>
            </div>
          </div>
        </div>

        {/* Pods list */}
        <div>
          <div className="flex items-center justify-between border-t border-white/[0.06] pt-3 mb-2">
            <span className="text-xs font-mono text-slate-400 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-indigo-400" />
              <span>Pods ({controlPlanePods.length})</span>
            </span>
            <span className="text-[10px] text-slate-500 font-mono">System only</span>
          </div>

          <div className="space-y-1.5 max-h-[200px] overflow-y-auto pr-1">
            {controlPlanePods.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-500 font-mono bg-white/[0.01] rounded-xl border border-white/5">
                Protected by system taint
              </div>
            ) : (
              controlPlanePods.map((p) => (
                <PodChip key={p.name} pod={p} onClick={onSelectPod} onViewLogs={onViewLogs} />
              ))
            )}
          </div>
        </div>
      </div>

      {/* 2. General Worker Node */}
      <div className="rounded-2xl overflow-hidden bg-white/[0.02] hover:bg-white/[0.05] bg-gradient-to-b from-white/[0.03] to-transparent backdrop-blur-2xl border border-white/[0.08] hover:border-cyan-500/40 p-5 flex flex-col justify-between transition-all duration-300 shadow-xl">
        <div>
          {/* Header */}
          <div className="flex items-center justify-between gap-2 mb-3 min-w-0">
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 shrink-0">
                <Monitor className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-widest block font-bold truncate">
                  General Worker
                </span>
                <h3 className="text-xs sm:text-sm font-mono font-bold text-slate-100 truncate" title={generalWorker?.name}>
                  {generalWorker?.name || 'taints-lab-worker'}
                </h3>
              </div>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-950/60 border border-cyan-500/40 text-cyan-300 shrink-0 whitespace-nowrap">
              General
            </span>
          </div>

          {/* Active Taints */}
          <div className="mb-3">
            <div className="text-[10px] font-mono text-slate-500 uppercase tracking-widest mb-1.5">
              Active Taints
            </div>
            {renderTaints(generalWorker?.taints || [])}
          </div>

          {/* Labels */}
          <div className="mb-3">
            <div className="text-[10px] font-mono text-slate-500 uppercase tracking-widest mb-1">
              Role
            </div>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-white/[0.04] text-slate-300 border border-white/10 inline-block truncate max-w-full">
              standard-worker
            </span>
          </div>

          {/* Hardware Telemetry Bar */}
          <div className="mb-4 p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-2">
            <div className="flex items-center justify-between text-[10px] font-mono">
              <span className="flex items-center gap-1.5 text-slate-300 font-semibold">
                <Cpu className="w-3 h-3 text-cyan-400" />
                <span>8 vCPUs · 7.7 GiB RAM</span>
              </span>
              <span className="text-slate-500 text-[9px]">containerd 2.3.4</span>
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[9px] font-mono">
                <span className="text-slate-500">CPU Allocation</span>
                <span className="text-cyan-300 font-semibold">{generalCpuPct}% ({generalCpuCores} / 8 Cores)</span>
              </div>
              <div className="w-full h-1 bg-white/[0.05] rounded-full overflow-hidden">
                <div className="h-full bg-cyan-400 rounded-full transition-all duration-500 shadow-[0_0_8px_rgba(6,182,212,0.4)]" style={{ width: `${generalCpuPct}%` }} />
              </div>
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[9px] font-mono">
                <span className="text-slate-500">RAM Allocation</span>
                <span className="text-emerald-300 font-semibold">{generalMemPct}% ({generalMemGiB} / 7.7 GiB)</span>
              </div>
              <div className="w-full h-1 bg-white/[0.05] rounded-full overflow-hidden">
                <div className="h-full bg-emerald-400 rounded-full transition-all duration-500 shadow-[0_0_8px_rgba(52,211,153,0.4)]" style={{ width: `${generalMemPct}%` }} />
              </div>
            </div>
          </div>
        </div>

        {/* Pods list */}
        <div>
          <div className="flex items-center justify-between border-t border-white/[0.06] pt-3 mb-2">
            <span className="text-xs font-mono text-slate-400 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-cyan-400" />
              <span>Pods ({generalPods.length})</span>
            </span>
            <span className="text-[10px] text-cyan-400 font-mono">Website & jobs</span>
          </div>

          <div className="space-y-1.5 max-h-[200px] overflow-y-auto pr-1">
            {generalPods.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-500 font-mono bg-white/[0.01] rounded-xl border border-white/5">
                No pods on general worker
              </div>
            ) : (
              generalPods.map((p) => (
                <PodChip key={p.name} pod={p} onClick={onSelectPod} onViewLogs={onViewLogs} />
              ))
            )}
          </div>
        </div>
      </div>

      {/* 3. Dedicated GPU Worker Node */}
      <div className="rounded-2xl overflow-hidden bg-white/[0.02] hover:bg-white/[0.05] bg-gradient-to-b from-white/[0.03] to-transparent backdrop-blur-2xl border border-violet-500/30 hover:border-violet-500/60 p-5 flex flex-col justify-between transition-all duration-300 shadow-[0_0_25px_rgba(139,92,246,0.12)]">
        <div>
          {/* Header */}
          <div className="flex items-center justify-between gap-2 mb-3 min-w-0">
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <div className="p-2 rounded-xl bg-violet-500/10 border border-violet-500/20 text-violet-400 shrink-0">
                <Cpu className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-[10px] font-mono text-violet-400 uppercase tracking-widest block font-bold truncate">
                  Dedicated GPU Node
                </span>
                <h3 className="text-xs sm:text-sm font-mono font-bold text-slate-100 truncate" title={gpuWorker?.name}>
                  {gpuWorker?.name || 'taints-lab-worker2'}
                </h3>
              </div>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-violet-950/80 border border-violet-500/50 text-violet-300 font-semibold shrink-0 whitespace-nowrap">
              RESERVED
            </span>
          </div>

          {/* Active Taints */}
          <div className="mb-3">
            <div className="text-[10px] font-mono text-slate-500 uppercase tracking-widest mb-1.5">
              Active Taints
            </div>
            {renderTaints(gpuWorker?.taints || [])}
          </div>

          {/* Labels */}
          <div className="mb-3">
            <div className="text-[10px] font-mono text-slate-500 uppercase tracking-widest mb-1">
              Node Labels
            </div>
            <div>
              {gpuWorker?.labels['hardware'] === 'gpu' ? (
                <span className="text-[11px] font-mono px-2.5 py-0.5 rounded bg-violet-950/70 text-violet-200 border border-violet-500/40 font-semibold inline-flex items-center gap-1 truncate max-w-full">
                  <Tag className="w-3 h-3 text-violet-400 shrink-0" />
                  <span>hardware=gpu</span>
                </span>
              ) : (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/[0.04] text-slate-400 border border-white/10">
                  no hardware label
                </span>
              )}
            </div>
          </div>

          {/* Hardware Telemetry Bar */}
          <div className="mb-4 p-2.5 rounded-xl bg-white/[0.02] border border-violet-500/20 space-y-2">
            <div className="flex items-center justify-between text-[10px] font-mono">
              <span className="flex items-center gap-1.5 text-violet-200 font-semibold">
                <Cpu className="w-3 h-3 text-violet-400" />
                <span>8 vCPUs · 7.7 GiB RAM</span>
              </span>
              <span className="text-violet-400 text-[9px]">PCIe 4.0 x16</span>
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[9px] font-mono">
                <span className="text-slate-500">CPU Allocation</span>
                <span className="text-violet-300 font-semibold">{gpuCpuPct}% ({gpuCpuCores} / 8 Cores)</span>
              </div>
              <div className="w-full h-1 bg-white/[0.05] rounded-full overflow-hidden">
                <div className="h-full bg-violet-400 rounded-full transition-all duration-500 shadow-[0_0_8px_rgba(167,139,250,0.4)]" style={{ width: `${gpuCpuPct}%` }} />
              </div>
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[9px] font-mono">
                <span className="text-slate-500">Host RAM</span>
                <span className="text-violet-300 font-semibold">{gpuMemPct}% ({gpuMemGiB} / 7.7 GiB)</span>
              </div>
              <div className="w-full h-1 bg-white/[0.05] rounded-full overflow-hidden">
                <div className="h-full bg-violet-500 rounded-full transition-all duration-500" style={{ width: `${gpuMemPct}%` }} />
              </div>
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[9px] font-mono">
                <span className="text-slate-500">GPU Slot Capacity (hardware=gpu)</span>
                <span className="text-fuchsia-300 font-semibold">{gpuAllocPct}% ({gpuPods.length} ML Jobs)</span>
              </div>
              <div className="w-full h-1 bg-white/[0.05] rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-violet-500 to-fuchsia-400 rounded-full transition-all duration-500 shadow-[0_0_8px_rgba(232,121,249,0.4)]" style={{ width: `${gpuAllocPct}%` }} />
              </div>
            </div>
          </div>
        </div>

        {/* Pods list */}
        <div>
          <div className="flex items-center justify-between border-t border-white/[0.06] pt-3 mb-2">
            <span className="text-xs font-mono text-slate-400 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-violet-400" />
              <span>Pods ({gpuPods.length})</span>
            </span>
            <span className="text-[10px] text-violet-400 font-mono">ML training only</span>
          </div>

          <div className="space-y-1.5 max-h-[200px] overflow-y-auto pr-1">
            {gpuPods.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-500 font-mono bg-white/[0.01] rounded-xl border border-white/5">
                Reserved for ML workloads
              </div>
            ) : (
              gpuPods.map((p) => (
                <PodChip key={p.name} pod={p} onClick={onSelectPod} onViewLogs={onViewLogs} />
              ))
            )}
          </div>
        </div>
      </div>

      {/* 4. Pending Queue */}
      <div className={`rounded-2xl overflow-hidden bg-white/[0.02] hover:bg-white/[0.05] bg-gradient-to-b from-white/[0.03] to-transparent backdrop-blur-2xl border p-5 flex flex-col justify-between transition-all duration-300 shadow-xl ${
        pendingPods.length > 0
          ? 'border-amber-500/40 shadow-[0_0_25px_rgba(245,158,11,0.15)]'
          : 'border-white/[0.08]'
      }`}>
        <div>
          {/* Header */}
          <div className="flex items-center justify-between gap-2 mb-3 min-w-0">
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <div className={`p-2 rounded-xl border shrink-0 ${
                pendingPods.length > 0
                  ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                  : 'bg-white/[0.04] border-white/10 text-slate-400'
              }`}>
                <Clock className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-[10px] font-mono text-amber-400 uppercase tracking-widest block font-bold truncate">
                  Pending Queue
                </span>
                <h3 className="text-xs sm:text-sm font-mono font-bold text-slate-100 truncate">
                  Unscheduled Workloads
                </h3>
              </div>
            </div>
            <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold border shrink-0 whitespace-nowrap ${
              pendingPods.length > 0
                ? 'bg-amber-950 border-amber-500/50 text-amber-300 animate-pulse'
                : 'bg-white/[0.04] border-white/10 text-slate-400'
            }`}>
              {pendingPods.length} Pods
            </span>
          </div>

          <div className="mb-3">
            <p className="text-xs text-slate-400 font-mono leading-relaxed">
              Pods rejected by scheduler because no node satisfies both their tolerations and selectors.
            </p>
          </div>

          {/* Hardware Telemetry Bar */}
          <div className="mb-4 p-2.5 rounded-xl bg-white/[0.02] border border-amber-500/20 space-y-2">
            <div className="flex items-center justify-between text-[10px] font-mono">
              <span className="flex items-center gap-1.5 text-amber-300 font-semibold">
                <Clock className="w-3 h-3 text-amber-400" />
                <span>Resource Request Backlog</span>
              </span>
              <span className="text-amber-400 text-[9px]">{pendingPods.length} Unsatisfied</span>
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[9px] font-mono">
                <span className="text-slate-500">Blocked CPU Demand</span>
                <span className="text-amber-300 font-semibold">~{pendingCpuReq} vCPUs</span>
              </div>
              <div className="w-full h-1 bg-white/[0.05] rounded-full overflow-hidden">
                <div
                  className="h-full bg-amber-400 rounded-full transition-all duration-500 shadow-[0_0_8px_rgba(251,191,36,0.4)]"
                  style={{ width: `${Math.min(100, pendingPods.length * 25)}%` }}
                />
              </div>
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[9px] font-mono">
                <span className="text-slate-500">Blocked RAM Demand</span>
                <span className="text-amber-300 font-semibold">~{pendingMemReq} MiB</span>
              </div>
              <div className="w-full h-1 bg-white/[0.05] rounded-full overflow-hidden">
                <div
                  className="h-full bg-amber-500 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, pendingPods.length * 25)}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Pods list */}
        <div>
          <div className="flex items-center justify-between border-t border-white/[0.06] pt-3 mb-2">
            <span className="text-xs font-mono text-slate-400 flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
              <span>Pending Pods ({pendingPods.length})</span>
            </span>
            <span className="text-[10px] text-amber-400 font-mono">Click to inspect</span>
          </div>

          <div className="space-y-1.5 max-h-[200px] overflow-y-auto pr-1">
            {pendingPods.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-500 font-mono bg-white/[0.01] rounded-xl border border-white/5">
                Queue is clear. All pods scheduled!
              </div>
            ) : (
              pendingPods.map((p) => (
                <PodChip key={p.name} pod={p} onClick={onSelectPod} onViewLogs={onViewLogs} />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
