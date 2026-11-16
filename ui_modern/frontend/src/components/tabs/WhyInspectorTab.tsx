import React, { useState, useEffect } from 'react';
import type { NodeInfo, PodInfo } from '../../types';
import { explainWhy } from '../../lib/k8s-rules';
import {
  HelpCircle,
  Shield,
  Monitor,
  Cpu,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Tag,
} from 'lucide-react';

interface WhyInspectorTabProps {
  nodes: NodeInfo[];
  pods: PodInfo[];
  selectedPodName?: string | null;
  onSelectPodName?: (name: string) => void;
}

export const WhyInspectorTab: React.FC<WhyInspectorTabProps> = ({
  nodes,
  pods,
  selectedPodName,
  onSelectPodName,
}) => {
  const [currentPodName, setCurrentPodName] = useState<string>('');

  useEffect(() => {
    if (selectedPodName) {
      setCurrentPodName(selectedPodName);
    } else if (pods.length > 0 && !currentPodName) {
      setCurrentPodName(pods[0].name);
    }
  }, [selectedPodName, pods, currentPodName]);

  const activePod = pods.find((p) => p.name === currentPodName) || pods[0];

  const handlePodChange = (name: string) => {
    setCurrentPodName(name);
    if (onSelectPodName) {
      onSelectPodName(name);
    }
  };

  const getVerdictBadge = (verdict: 'allowed' | 'avoided' | 'blocked') => {
    switch (verdict) {
      case 'allowed':
        return (
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-950/70 border border-emerald-500/40 text-emerald-300 font-mono text-xs font-bold shadow-[0_0_12px_rgba(16,185,129,0.3)]">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>🟢 ALLOWED</span>
          </div>
        );
      case 'avoided':
        return (
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-950/70 border border-amber-500/40 text-amber-300 font-mono text-xs font-bold shadow-[0_0_12px_rgba(245,158,11,0.3)]">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <span>🟠 ALLOWED, BUT AVOIDED</span>
          </div>
        );
      case 'blocked':
        return (
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-rose-950/70 border border-rose-500/40 text-rose-300 font-mono text-xs font-bold shadow-[0_0_12px_rgba(244,63,94,0.3)]">
            <XCircle className="w-4 h-4 text-rose-400" />
            <span>🔴 BLOCKED</span>
          </div>
        );
    }
  };

  const getNodeIcon = (name: string) => {
    if (name.includes('control-plane')) {
      return <Shield className="w-5 h-5 text-indigo-400" />;
    }
    if (name.includes('worker2')) {
      return <Cpu className="w-5 h-5 text-violet-400" />;
    }
    return <Monitor className="w-5 h-5 text-cyan-400" />;
  };

  if (!pods || pods.length === 0) {
    return (
      <div className="rounded-2xl bg-slate-900/40 backdrop-blur-xl p-12 text-center border border-white/10 space-y-3">
        <HelpCircle className="w-12 h-12 text-slate-600 mx-auto" />
        <h3 className="text-base font-bold text-slate-300 font-mono">No Pods Currently in Cluster</h3>
        <p className="text-xs text-slate-500 font-mono max-w-md mx-auto">
          Deploy a workload from the Workloads tab or execute a guided evaluation step to inspect scheduling evaluations.
        </p>
      </div>
    );
  }

  // Filter non-system tolerations for clarity
  const relevantTolerations = (activePod?.tolerations || []).filter(
    (t) => !t.key?.startsWith('node.kubernetes.io/')
  );

  return (
    <div className="space-y-6">
      {/* Pod Selection Strip */}
      <div className="rounded-2xl bg-slate-900/40 backdrop-blur-xl p-5 border border-white/10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex-1 w-full md:w-auto">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-mono text-cyan-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
              <HelpCircle className="w-4 h-4" />
              <span>Select Pod to Inspect</span>
            </span>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <select
              value={activePod?.name || ''}
              onChange={(e) => handlePodChange(e.target.value)}
              className="bg-[#030712] border border-white/10 rounded-xl px-3 py-2 text-xs font-mono text-cyan-200 focus:outline-none focus:border-cyan-400 cursor-pointer min-w-[280px]"
            >
              {pods.map((p) => (
                <option key={p.name} value={p.name}>
                  {p.name} ({p.app} • {p.nodeName ? `on ${p.nodeName}` : 'PENDING'})
                </option>
              ))}
            </select>

            {/* Quick Pod Attributes */}
            <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
              <span className="text-slate-400">Placed on:</span>
              <span className={`px-2.5 py-0.5 rounded-lg font-bold border ${
                activePod?.nodeName
                  ? 'bg-emerald-950/60 text-emerald-300 border-emerald-500/40'
                  : 'bg-amber-950/60 text-amber-300 border-amber-500/40 animate-pulse'
              }`}>
                {activePod?.nodeName || 'Pending in Queue'}
              </span>

              <span className="text-slate-400 ml-2">Phase:</span>
              <span className="px-2.5 py-0.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-300">
                {activePod?.phase}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Pod Constraints Summary Box */}
      <div className="rounded-2xl bg-slate-900/40 backdrop-blur-xl p-5 border border-white/10 grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Tolerations */}
        <div>
          <div className="text-xs font-mono text-violet-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5" />
            <span>Pod Tolerations ({relevantTolerations.length})</span>
          </div>
          {relevantTolerations.length === 0 ? (
            <div className="text-xs text-slate-500 font-mono py-1">
              None (rejects any node with un-tolerated taints)
            </div>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {relevantTolerations.map((t, idx) => (
                <div
                  key={idx}
                  className="px-2.5 py-1 rounded-lg bg-violet-950/40 border border-violet-500/30 text-violet-300 font-mono text-xs flex items-center gap-1.5"
                >
                  <span>key: <strong>{t.key || '*'}</strong></span>
                  <span>op: <strong>{t.operator || 'Equal'}</strong></span>
                  {t.value && <span>val: <strong>{t.value}</strong></span>}
                  {t.effect && <span>eff: <strong>{t.effect}</strong></span>}
                  {t.tolerationSeconds && (
                    <span className="text-amber-300">({t.tolerationSeconds}s grace)</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* nodeSelector */}
        <div>
          <div className="text-xs font-mono text-cyan-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Tag className="w-3.5 h-3.5" />
            <span>Pod nodeSelector ({Object.keys(activePod?.nodeSelector || {}).length})</span>
          </div>
          {Object.keys(activePod?.nodeSelector || {}).length === 0 ? (
            <div className="text-xs text-slate-500 font-mono py-1">
              None (can bind to any worker if taints permit)
            </div>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {Object.entries(activePod?.nodeSelector || {}).map(([k, v], idx) => (
                <div
                  key={idx}
                  className="px-2.5 py-1 rounded-lg bg-cyan-950/40 border border-cyan-500/30 text-cyan-300 font-mono text-xs flex items-center gap-1"
                >
                  <span>{k} = <strong>{v}</strong></span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 3-Node Comparison Grid */}
      <div>
        <div className="text-xs font-mono text-slate-400 uppercase tracking-wider mb-3">
          Kubernetes Scheduler Verdict Matrix Across Cluster Nodes
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {nodes.map((node) => {
            const evalResult = explainWhy(activePod, node);
            const isActualPlacedNode = activePod.nodeName === node.name;

            return (
              <div
                key={node.name}
                className={`rounded-2xl p-5 border flex flex-col justify-between transition-all duration-300 ${
                  isActualPlacedNode
                    ? 'border-emerald-500/50 shadow-[0_0_20px_rgba(16,185,129,0.15)] bg-emerald-950/20'
                    : 'bg-slate-900/40 backdrop-blur-xl border-white/10'
                }`}
              >
                <div>
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                        {getNodeIcon(node.name)}
                      </div>
                      <div>
                        <span className="text-[10px] font-mono text-slate-400 uppercase block">
                          {node.role}
                        </span>
                        <h4 className="text-xs font-mono font-bold text-slate-100 truncate" title={node.name}>
                          {node.name}
                        </h4>
                      </div>
                    </div>

                    {isActualPlacedNode && (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-500/40 font-bold flex items-center gap-1">
                        <span>PLACED</span>
                      </span>
                    )}
                  </div>

                  {/* Verdict Badge */}
                  <div className="mb-4">
                    {getVerdictBadge(evalResult.verdict)}
                  </div>

                  {/* Reasons list */}
                  <div className="space-y-2 border-t border-slate-800/80 pt-3">
                    <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">
                      Evaluation Breakdown:
                    </div>
                    {evalResult.reasons.map((reason, rIdx) => (
                      <div
                        key={rIdx}
                        className="text-xs font-mono text-slate-300 leading-relaxed bg-[#04060a]/60 p-2 rounded-lg border border-slate-800/60"
                      >
                        {reason}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-800/60 text-[10px] font-mono text-slate-500">
                  Node taints: {node.taints.length} • Labels: {Object.keys(node.labels || {}).length}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Footnote */}
      <div className="p-3 rounded-lg bg-slate-900/40 border border-slate-800 text-[11px] font-mono text-slate-500">
        ℹ️ <strong>Note:</strong> Kubernetes automatically attaches default system tolerations to all pods (e.g. <code>node.kubernetes.io/not-ready:NoExecute</code> and <code>node.kubernetes.io/unreachable:NoExecute</code> with 300s tolerationSeconds). These standard platform tolerations are evaluated under the hood.
      </div>
    </div>
  );
};
