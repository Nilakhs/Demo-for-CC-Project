import React from 'react';
import { Server, Cpu, Layers, AlertCircle } from 'lucide-react';

interface MetricsStripProps {
  totalNodes: number;
  gpuReserved: boolean;
  placedPodsCount: number;
  pendingPodsCount: number;
}

export const TopMetricsStrip: React.FC<MetricsStripProps> = ({
  totalNodes,
  gpuReserved,
  placedPodsCount,
  pendingPodsCount,
}) => {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {/* 1. Total Nodes */}
      <div className="relative rounded-2xl bg-white/[0.02] hover:bg-white/[0.05] bg-gradient-to-b from-white/[0.03] to-transparent backdrop-blur-2xl border border-white/[0.08] hover:border-white/[0.18] p-5 transition-all duration-300 shadow-xl group">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[11px] font-mono uppercase tracking-widest text-slate-400">Total Nodes</span>
          <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 group-hover:scale-110 transition-transform">
            <Server className="w-4 h-4" />
          </div>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-extrabold font-mono text-white tracking-tight">
            {totalNodes}
          </span>
          <span className="text-xs text-slate-400 font-mono">
            (1 CP + {Math.max(0, totalNodes - 1)} Workers)
          </span>
        </div>
        <div className="mt-2 text-[11px] text-slate-400 font-mono flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          <span>Cluster online (kind-taints-lab)</span>
        </div>
      </div>

      {/* 2. GPU Node Reserved */}
      <div className={`relative rounded-2xl bg-white/[0.02] hover:bg-white/[0.05] bg-gradient-to-b from-white/[0.03] to-transparent backdrop-blur-2xl border p-5 transition-all duration-300 shadow-xl group ${
        gpuReserved
          ? 'border-violet-500/30 hover:border-violet-500/50 shadow-[0_0_25px_rgba(139,92,246,0.1)]'
          : 'border-amber-500/30 hover:border-amber-500/50'
      }`}>
        <div className="flex items-center justify-between mb-3">
          <span className="text-[11px] font-mono uppercase tracking-widest text-slate-400">GPU Reserved</span>
          <div className={`p-2 rounded-xl border group-hover:scale-110 transition-transform ${
            gpuReserved
              ? 'bg-violet-500/10 text-violet-400 border-violet-500/20'
              : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
          }`}>
            <Cpu className="w-4 h-4" />
          </div>
        </div>
        <div className="flex items-baseline gap-2">
          <span className={`text-3xl font-extrabold font-mono tracking-tight ${
            gpuReserved ? 'text-violet-300' : 'text-amber-400'
          }`}>
            {gpuReserved ? 'ACTIVE' : 'OPEN'}
          </span>
          <span className="text-xs font-mono text-slate-400">
            {gpuReserved ? 'hardware=gpu:NoSchedule' : 'No taint'}
          </span>
        </div>
        <div className="mt-2 text-[11px] font-mono flex items-center gap-1.5 text-slate-400">
          <span className={`w-1.5 h-1.5 rounded-full ${gpuReserved ? 'bg-violet-400' : 'bg-amber-400'}`} />
          <span>{gpuReserved ? 'Dedicated for ML training' : 'General workloads can schedule'}</span>
        </div>
      </div>

      {/* 3. Placed Pods */}
      <div className="relative rounded-2xl bg-white/[0.02] hover:bg-white/[0.05] bg-gradient-to-b from-white/[0.03] to-transparent backdrop-blur-2xl border border-white/[0.08] hover:border-white/[0.18] p-5 transition-all duration-300 shadow-xl group">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[11px] font-mono uppercase tracking-widest text-slate-400">Placed Pods</span>
          <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 group-hover:scale-110 transition-transform">
            <Layers className="w-4 h-4" />
          </div>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-extrabold font-mono text-white tracking-tight">
            {placedPodsCount}
          </span>
          <span className="text-xs text-slate-400 font-mono">active replicas</span>
        </div>
        <div className="mt-2 text-[11px] text-slate-400 font-mono flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
          <span>Bound to cluster worker nodes</span>
        </div>
      </div>

      {/* 4. Pending Queue */}
      <div className={`relative rounded-2xl bg-white/[0.02] hover:bg-white/[0.05] bg-gradient-to-b from-white/[0.03] to-transparent backdrop-blur-2xl border p-5 transition-all duration-300 shadow-xl group ${
        pendingPodsCount > 0
          ? 'border-amber-500/40 shadow-[0_0_25px_rgba(245,158,11,0.15)]'
          : 'border-white/[0.08] hover:border-white/[0.18]'
      }`}>
        <div className="flex items-center justify-between mb-3">
          <span className="text-[11px] font-mono uppercase tracking-widest text-slate-400">Pending Queue</span>
          <div className={`p-2 rounded-xl border group-hover:scale-110 transition-transform ${
            pendingPodsCount > 0
              ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
              : 'bg-white/[0.04] text-slate-400 border-white/10'
          }`}>
            <AlertCircle className="w-4 h-4" />
          </div>
        </div>
        <div className="flex items-baseline gap-2">
          <span className={`text-3xl font-extrabold font-mono tracking-tight ${
            pendingPodsCount > 0 ? 'text-amber-400' : 'text-slate-400'
          }`}>
            {pendingPodsCount}
          </span>
          <span className="text-xs text-slate-400 font-mono">unscheduled</span>
        </div>
        <div className="mt-2 text-[11px] font-mono flex items-center gap-1.5">
          {pendingPodsCount > 0 ? (
            <span className="text-amber-400 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
              <span>Pods blocked by taints/selectors</span>
            </span>
          ) : (
            <span className="text-slate-500 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-600" />
              <span>Queue is clear</span>
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
