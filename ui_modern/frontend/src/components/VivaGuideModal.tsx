import React, { useState } from 'react';
import { sound } from '../lib/sound';
import {
  X,
  GraduationCap,
  Zap,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';

interface VivaGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const VivaGuideModal: React.FC<VivaGuideModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'matrix' | 'effects' | 'sigterm' | 'viva'>('viva');
  const [expandedFaq, setExpandedFaq] = useState<number | null>(0);

  if (!isOpen) return null;

  const faqs = [
    {
      q: 'Q1: Why does a Pod with toleration alone NOT guarantee it will run on the GPU node?',
      a: `A toleration is an "ALLOW" permission, not a "FORCE" directive!
- Taint on GPU Node: hardware=gpu:NoSchedule says "nobody is allowed here unless they tolerate hardware=gpu".
- Toleration in Pod spec: says "I am permitted to run on nodes with hardware=gpu:NoSchedule".
- Kubernetes scheduler still considers the general worker node completely valid (since it has no taints). Therefore, Kubernetes spreads replicas evenly across BOTH workers.
- The Solution: To force a workload strictly onto the GPU node, you MUST combine toleration WITH nodeSelector (e.g. nodeSelector: { hardware: "gpu" }).`,
    },
    {
      q: 'Q2: What is the operational difference between NoSchedule and NoExecute?',
      a: `The fundamental difference is how they treat EXISTING, currently running Pods:
1. NoSchedule: Affects ONLY newly arriving Pods during the scheduling filter phase. Pods that are already running on the node remain untouched and continue executing normally.
2. NoExecute: Affects BOTH new and already running Pods. If a node is tainted with NoExecute (e.g., during hardware failure), the TaintManager controller immediately evicts running Pods that lack a matching toleration!
- Bonus: NoExecute tolerations can specify tolerationSeconds (e.g., 30s) giving the workload a countdown grace window to save checkpoints before termination.`,
    },
    {
      q: 'Q3: How does Kubernetes handle PreferNoSchedule when no other nodes are available?',
      a: `PreferNoSchedule is a "soft" preference evaluated in the scoring (prioritization) phase of the scheduler, NOT a hard predicate in the filtering phase:
- The scheduler tries its best to avoid placing pods on a PreferNoSchedule node by penalizing its scheduling score.
- However, if all other nodes are saturated, tainted, or unavailable, Kubernetes WILL schedule the pod on the PreferNoSchedule node rather than leaving it in Pending state!`,
    },
    {
      q: 'Q4: Why did your container take over 30 seconds to terminate during eviction, and how did you fix it?',
      a: `The "PID 1 SIGTERM Handling" problem in Docker / Linux containers:
- When a process runs as PID 1 in a Linux PID namespace (common with standard python -c scripts), the kernel treats it as the init system. By default, Linux does NOT attach the default SIGTERM handler to PID 1!
- When Kubernetes evicts a pod, kubelet sends SIGTERM. Because Python had no explicit signal handler, the signal was silently discarded. Kubelet waited the full terminationGracePeriodSeconds (30s) before issuing a SIGKILL!
- Our Fix: We added signal.signal(signal.SIGTERM, lambda s, f: sys.exit(0)) inside the Python container code. Now, when kubelet sends SIGTERM, the process catches it, flushes checkpoints, and exits in < 1.2 seconds!`,
    },
    {
      q: 'Q5: What happens if there is a typo in a toleration (e.g., value "gpus" instead of "gpu")?',
      a: `Kubernetes toleration matching with operator Equal is an exact string comparison across three fields:
1. key must match exactly ("hardware" == "hardware")
2. operator must match ("Equal")
3. value must match exactly ("gpus" != "gpu" ❌)
4. effect must match ("NoSchedule" == "NoSchedule")
Because "gpus" does not equal "gpu", the toleration evaluation returns FALSE. The scheduler treats the pod as having NO toleration and blocks it from the GPU node completely.`,
    },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="glass-panel w-full max-w-4xl rounded-2xl border border-violet-500/40 overflow-hidden shadow-2xl flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900/95 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-violet-500/10 border border-violet-500/30 text-violet-400">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-100 font-mono">
                  Viva Defense Guide & Architectural Cheat Sheet
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-violet-950/80 text-violet-300 border border-violet-500/40 font-semibold">
                  Problem 07
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                Cloud Computing Lab Evaluation 2 • Bullet-proof answers for professors & evaluators
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 cursor-pointer transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 px-6 py-2.5 bg-slate-950/80 border-b border-slate-800/80 overflow-x-auto text-xs font-mono">
          {[
            { id: 'viva' as const, label: '❓ 5 Top Viva Questions', color: 'text-emerald-400' },
            { id: 'sigterm' as const, label: '⚡ PID 1 SIGTERM Story', color: 'text-amber-400' },
            { id: 'matrix' as const, label: '⚖️ Taints vs Selectors', color: 'text-cyan-400' },
            { id: 'effects' as const, label: '🚫 The 3 Taint Effects', color: 'text-rose-400' },
            { id: 'overview' as const, label: '🎯 Lab Architecture', color: 'text-violet-400' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                sound.playClick();
              }}
              className={`tactile-btn px-3 py-1.5 rounded-lg whitespace-nowrap cursor-pointer transition-all ${
                activeTab === tab.id
                  ? 'bg-slate-800 text-white font-bold border border-slate-700 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Modal Content */}
        <div className="p-6 overflow-y-auto space-y-6 font-mono text-xs text-slate-300 flex-1 leading-relaxed">
          {/* TAB 1: 5 TOP VIVA QUESTIONS */}
          {activeTab === 'viva' && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-xl bg-emerald-950/20 border border-emerald-500/30 text-emerald-300 text-xs">
                💡 <strong>Evaluator Tip:</strong> Evaluators commonly test whether you understand that <em>tolerations repel, they do not attract</em>. Review these five core answers:
              </div>

              <div className="space-y-3">
                {faqs.map((faq, idx) => {
                  const isOpen = expandedFaq === idx;
                  return (
                    <div
                      key={idx}
                      className="rounded-xl border border-slate-800 bg-[#04060a] overflow-hidden transition-all"
                    >
                      <button
                        onClick={() => {
                          setExpandedFaq(isOpen ? null : idx);
                          sound.playClick();
                        }}
                        className="w-full text-left p-4 flex items-center justify-between gap-3 cursor-pointer hover:bg-slate-900/60"
                      >
                        <span className="font-bold text-slate-100 text-xs">
                          {faq.q}
                        </span>
                        {isOpen ? (
                          <ChevronDown className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-slate-500 flex-shrink-0" />
                        )}
                      </button>

                      {isOpen && (
                        <div className="px-4 pb-4 pt-1 border-t border-slate-800/80 text-slate-300 whitespace-pre-line text-xs bg-slate-950/40">
                          {faq.a}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 2: PID 1 SIGTERM STORY */}
          {activeTab === 'sigterm' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-amber-950/20 border border-amber-500/30 text-amber-300">
                <h4 className="font-bold text-sm mb-1 flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-400" />
                  <span>The Real-World Container Engineering Triumph</span>
                </h4>
                <p className="text-xs text-slate-300">
                  How fixing PID 1 signal trapping turned a sluggish 32-second hanging eviction into a razor-sharp 1.2-second clean exit!
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl border border-rose-500/30 bg-rose-950/10 space-y-2">
                  <span className="text-xs font-bold text-rose-400 uppercase tracking-wider block">
                    ❌ The Problem: Unhandled SIGTERM
                  </span>
                  <p className="text-[11px] text-slate-400">
                    A basic container running <code>python script.py</code> runs as PID 1 in its container namespace. The Linux kernel will NOT dispatch default signals (like SIGTERM) to PID 1 unless the application explicitly installs a handler.
                  </p>
                  <p className="text-[11px] text-rose-300 font-semibold">
                    Result: When NoExecute taint kicked in, Kubelet sent SIGTERM, Python ignored it, and Kubelet was forced to wait the entire 30s grace timeout before brute-force SIGKILL!
                  </p>
                </div>

                <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-950/10 space-y-2">
                  <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider block">
                    ✅ The Solution: Explicit Signal Hook
                  </span>
                  <p className="text-[11px] text-slate-400">
                    We registered a Python signal handler:
                  </p>
                  <div className="bg-[#04060a] p-2.5 rounded border border-slate-800 text-[11px] text-cyan-300">
                    <code>
                      import signal, sys<br />
                      def stop(sig, frame):<br />
                      &nbsp;&nbsp;print("Checkpoint saved!")<br />
                      &nbsp;&nbsp;sys.exit(0)<br />
                      signal.signal(signal.SIGTERM, stop)
                    </code>
                  </div>
                  <p className="text-[11px] text-emerald-300 font-semibold">
                    Result: Immediate graceful exit in 1.2 seconds, zero hung pods, clean real-time NoExecute eviction demonstrations!
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: TAINT VS SELECTOR MATRIX */}
          {activeTab === 'matrix' && (
            <div className="space-y-4">
              <p className="text-xs text-slate-400">
                Understanding the distinct roles of Taints, Tolerations, and NodeSelectors:
              </p>

              <div className="overflow-x-auto rounded-xl border border-slate-800">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-slate-900 text-slate-300 uppercase text-[10px] tracking-wider border-b border-slate-800">
                    <tr>
                      <th className="p-3">Mechanism</th>
                      <th className="p-3">Applied On</th>
                      <th className="p-3">Behavior</th>
                      <th className="p-3">Analogy</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80">
                    <tr>
                      <td className="p-3 font-bold text-rose-400">Taint</td>
                      <td className="p-3 text-slate-400">Node</td>
                      <td className="p-3 text-slate-300">Repels pods that do not have a matching toleration</td>
                      <td className="p-3 text-slate-400">"VIP security guard at the door"</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-bold text-violet-400">Toleration</td>
                      <td className="p-3 text-slate-400">Pod</td>
                      <td className="p-3 text-slate-300">Allows a pod to enter tainted nodes (does NOT force it)</td>
                      <td className="p-3 text-slate-400">"VIP badge"</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-bold text-cyan-400">nodeSelector</td>
                      <td className="p-3 text-slate-400">Pod</td>
                      <td className="p-3 text-slate-300">Hard requirement: pod MUST run on node with matching label</td>
                      <td className="p-3 text-slate-400">"Room assignment key"</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="p-3 rounded-lg bg-cyan-950/20 border border-cyan-500/30 text-cyan-300 text-xs">
                💡 <strong>The Golden Formula:</strong> Dedicated GPU Workload = <code>Toleration</code> (pass the taint) + <code>nodeSelector</code> (bind to the node).
              </div>
            </div>
          )}

          {/* TAB 4: THE 3 TAINT EFFECTS */}
          {activeTab === 'effects' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl border border-rose-500/40 bg-rose-950/15 space-y-2">
                  <span className="text-xs font-bold text-rose-400 font-mono uppercase block">
                    NoSchedule
                  </span>
                  <p className="text-[11px] text-slate-300">
                    <strong>Rule:</strong> Hard filter in scheduling phase.
                  </p>
                  <p className="text-[11px] text-slate-400">
                    New pods without toleration cannot be scheduled. Existing running pods are completely unaffected.
                  </p>
                </div>

                <div className="p-4 rounded-xl border border-amber-500/40 bg-amber-950/15 space-y-2">
                  <span className="text-xs font-bold text-amber-400 font-mono uppercase block">
                    PreferNoSchedule
                  </span>
                  <p className="text-[11px] text-slate-300">
                    <strong>Rule:</strong> Soft preference in scoring phase.
                  </p>
                  <p className="text-[11px] text-slate-400">
                    The scheduler avoids the node if alternatives exist. If all other nodes are full or blocked, the pod WILL be placed here.
                  </p>
                </div>

                <div className="p-4 rounded-xl border border-purple-500/40 bg-purple-950/15 space-y-2">
                  <span className="text-xs font-bold text-purple-400 font-mono uppercase block">
                    NoExecute
                  </span>
                  <p className="text-[11px] text-slate-300">
                    <strong>Rule:</strong> Eviction + Scheduling block.
                  </p>
                  <p className="text-[11px] text-slate-400">
                    Running pods without toleration are evicted immediately. Pods can specify <code>tolerationSeconds</code> to delay eviction.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: LAB ARCHITECTURE */}
          {activeTab === 'overview' && (
            <div className="space-y-3">
              <h4 className="text-sm font-bold text-slate-100">Lab Cluster Topology (kind-taints-lab)</h4>
              <p className="text-xs text-slate-400">
                1 Control Plane Node + 2 Worker Nodes:
              </p>
              <ul className="space-y-2 text-xs">
                <li className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                  <strong className="text-indigo-400">taints-lab-control-plane:</strong> Manager node with system taint <code>node-role.kubernetes.io/control-plane:NoSchedule</code>.
                </li>
                <li className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                  <strong className="text-cyan-400">taints-lab-worker:</strong> Standard general-purpose worker node for web traffic and default pods.
                </li>
                <li className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                  <strong className="text-violet-400">taints-lab-worker2:</strong> High-value simulated GPU node with label <code>hardware=gpu</code> and taint <code>hardware=gpu:NoSchedule</code>.
                </li>
              </ul>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-900/90 border-t border-slate-800 flex items-center justify-between text-xs font-mono">
          <span className="text-slate-500">Problem 07 Evaluation Defense Pack</span>
          <button
            onClick={onClose}
            className="tactile-btn px-4 py-1.5 rounded-lg bg-violet-600/20 hover:bg-violet-600/30 text-violet-300 border border-violet-500/40 cursor-pointer font-bold"
          >
            Close Guide
          </button>
        </div>
      </div>
    </div>
  );
};
