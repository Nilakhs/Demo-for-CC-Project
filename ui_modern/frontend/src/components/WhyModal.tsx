import React from 'react';
import type { NodeInfo, PodInfo } from '../types';
import { explainWhy } from '../lib/k8s-rules';
import {
  X,
  HelpCircle,
  Shield,
  Monitor,
  Cpu,
  CheckCircle2,
  AlertTriangle,
  XCircle,
} from 'lucide-react';

interface WhyModalProps {
  pod: PodInfo | null;
  nodes: NodeInfo[];
  onClose: () => void;
}

export const WhyModal: React.FC<WhyModalProps> = ({ pod, nodes, onClose }) => {
  if (!pod) return null;

  const relevantTolerations = (pod.tolerations || []).filter(
    (t) => !t.key?.startsWith('node.kubernetes.io/')
  );

  const getVerdictBadge = (verdict: 'allowed' | 'avoided' | 'blocked') => {
    switch (verdict) {
      case 'allowed':
        return (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 font-mono text-xs font-bold shadow-[0_0_10px_rgba(16,185,129,0.25)]">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>🟢 ALLOWED</span>
          </div>
        );
      case 'avoided':
        return (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-950/80 border border-amber-500/40 text-amber-300 font-mono text-xs font-bold shadow-[0_0_10px_rgba(245,158,11,0.25)]">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
            <span>🟠 ALLOWED, BUT AVOIDED</span>
          </div>
        );
      case 'blocked':
        return (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-rose-950/80 border border-rose-500/40 text-rose-300 font-mono text-xs font-bold shadow-[0_0_10px_rgba(244,63,94,0.25)]">
            <XCircle className="w-3.5 h-3.5 text-rose-400" />
            <span>🔴 BLOCKED</span>
          </div>
        );
    }
  };

  const getNodeIcon = (name: string) => {
    if (name.includes('control-plane')) {
      return <Shield className="w-4 h-4 text-indigo-400" />;
    }
    if (name.includes('worker2')) {
      return <Cpu className="w-4 h-4 text-violet-400" />;
    }
    return <Monitor className="w-4 h-4 text-cyan-400" />;
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="glass-panel w-full max-w-4xl rounded-2xl border border-cyan-500/40 overflow-hidden shadow-2xl flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900/90 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
              <HelpCircle className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-cyan-400 font-bold uppercase tracking-wider">
                  Scheduling Verdict Inspector
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                  {pod.app}
                </span>
              </div>
              <h3 className="text-base font-bold text-slate-100 font-mono">
                Why is {pod.name} {pod.nodeName ? `on ${pod.nodeName}` : 'Pending'}?
              </h3>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 cursor-pointer transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Pod Attributes Strip */}
        <div className="px-6 py-3 bg-slate-950/70 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
          <div className="flex items-center gap-2">
            <span className="text-slate-400">Current Placement:</span>
            <span
              className={`px-2.5 py-0.5 rounded font-bold border ${
                pod.nodeName
                  ? 'bg-emerald-950 text-emerald-300 border-emerald-500/40'
                  : 'bg-amber-950 text-amber-300 border-amber-500/40 animate-pulse'
              }`}
            >
              {pod.nodeName ? `Node: ${pod.nodeName}` : '⏳ Pending Queue (No Node Qualified)'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-400">Phase:</span>
            <span className="text-slate-200 font-semibold">{pod.phase}</span>
          </div>
        </div>

        {/* Pod Specs (Tolerations & Selectors) */}
        <div className="px-6 py-3 bg-slate-900/40 border-b border-slate-800/80 grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-mono">
          <div>
            <span className="text-violet-400 font-semibold block mb-1">
              Custom Tolerations ({relevantTolerations.length}):
            </span>
            {relevantTolerations.length === 0 ? (
              <span className="text-slate-500">None (intolerant to node taints)</span>
            ) : (
              <div className="flex flex-wrap gap-1">
                {relevantTolerations.map((t, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-0.5 rounded bg-violet-950/60 border border-violet-500/30 text-violet-300 text-[11px]"
                  >
                    {t.key}{t.value ? `=${t.value}` : ''}:{t.effect || 'All'}
                    {t.tolerationSeconds && ` (${t.tolerationSeconds}s)`}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div>
            <span className="text-cyan-400 font-semibold block mb-1">
              nodeSelector Constraints:
            </span>
            {Object.keys(pod.nodeSelector || {}).length === 0 ? (
              <span className="text-slate-500">None (no node affinity constraint)</span>
            ) : (
              <div className="flex flex-wrap gap-1">
                {Object.entries(pod.nodeSelector || {}).map(([k, v], idx) => (
                  <span
                    key={idx}
                    className="px-2 py-0.5 rounded bg-cyan-950/60 border border-cyan-500/30 text-cyan-300 text-[11px]"
                  >
                    {k}: {v}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 3 Nodes Comparison Cards */}
        <div className="p-6 overflow-y-auto space-y-4">
          <div className="text-xs font-mono text-slate-400 uppercase tracking-wider">
            Evaluation Breakdown Across All 3 Cluster Nodes:
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {nodes.map((node) => {
              const evalResult = explainWhy(pod, node);
              const isActualNode = pod.nodeName === node.name;

              return (
                <div
                  key={node.name}
                  className={`rounded-xl p-4 border flex flex-col justify-between ${
                    isActualNode
                      ? 'bg-emerald-950/20 border-emerald-500/60 shadow-[0_0_20px_rgba(16,185,129,0.2)]'
                      : 'bg-slate-900/60 border-slate-800'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1.5">
                        {getNodeIcon(node.name)}
                        <span className="font-mono text-xs font-bold text-slate-200 truncate max-w-[140px]">
                          {node.name}
                        </span>
                      </div>
                      {isActualNode && (
                        <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-emerald-900 text-emerald-300 border border-emerald-500/40">
                          SCHEDULED
                        </span>
                      )}
                    </div>

                    <div className="mb-3">
                      {getVerdictBadge(evalResult.verdict)}
                    </div>

                    <div className="space-y-1.5 pt-2 border-t border-slate-800">
                      {evalResult.reasons.map((r, rIdx) => (
                        <div
                          key={rIdx}
                          className="text-[11px] font-mono text-slate-300 leading-snug p-1.5 rounded bg-[#04060a]/70 border border-slate-800/80"
                        >
                          {r}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 bg-slate-900/80 border-t border-slate-800 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 border border-cyan-500/40 text-xs font-mono font-semibold cursor-pointer"
          >
            Close Inspector
          </button>
        </div>
      </div>
    </div>
  );
};
