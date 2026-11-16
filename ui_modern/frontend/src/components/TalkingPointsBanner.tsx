import React, { useState } from 'react';
import type { NodeInfo, PodInfo } from '../types';
import { sound } from '../lib/sound';
import {
  Mic,
  ChevronUp,
  ChevronDown,
  Sparkles,
  HelpCircle,
  GraduationCap,
  Zap,
} from 'lucide-react';

interface TalkingPointsBannerProps {
  nodes: NodeInfo[];
  pods: PodInfo[];
  onOpenAutoPilot: () => void;
  onOpenVivaGuide: () => void;
}

export const TalkingPointsBanner: React.FC<TalkingPointsBannerProps> = ({
  nodes,
  pods,
  onOpenAutoPilot,
  onOpenVivaGuide,
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(false);

  const generalWorker = nodes.find((n) => n.name === 'taints-lab-worker');
  const gpuWorker = nodes.find((n) => n.name === 'taints-lab-worker2');

  const placedPods = pods.filter((p) => p.nodeName);
  const pendingPods = pods.filter((p) => !p.nodeName || p.phase === 'Pending');

  const generalPods = placedPods.filter((p) => p.nodeName === generalWorker?.name);
  const gpuPods = placedPods.filter((p) => p.nodeName === gpuWorker?.name);

  // Dynamic state detection
  const hasNoExecute = gpuWorker?.taints.some((t) => t.effect === 'NoExecute');
  const hasMaintenance = generalWorker?.taints.some((t) => t.key === 'maintenance');
  const hasGpuTaint = gpuWorker?.taints.some((t) => t.key === 'hardware');
  const hasGpuLabel = gpuWorker?.labels['hardware'] === 'gpu';

  const hasDedicatedMl = gpuPods.some((p) => p.app === 'ml-training' || p.app === 'ml-training-dedicated');
  const hasTolOnlyMl = pods.some((p) => p.app === 'ml-training-toleration-only');
  const hasWebsiteOnGpu = gpuPods.some((p) => p.app === 'website');

  let stateTitle = 'Baseline Cluster';
  let badgeText = 'Default Kube-Scheduler';
  let badgeColor = 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40';
  let talkingPoint =
    'With no taints on the GPU node, the Kubernetes scheduler spreads ordinary website workloads across all available nodes, wasting expensive GPU capacity.';
  let mechanics =
    'Filter phase passes all nodes (no untolerated taints). Score phase uses LeastRequestedPriority to balance replicas evenly.';
  let vivaQuestion = 'How does the default scheduler decide which node gets a pod?';
  let vivaAnswer =
    'First it runs predicates/filters to eliminate incompatible nodes, then calculates priority scores to find the node with the highest available resource balance.';

  if (hasNoExecute) {
    stateTitle = 'GPU Fault Active (NoExecute)';
    badgeText = 'Active TaintManager Eviction';
    badgeColor = 'bg-rose-500/20 text-rose-300 border-rose-500/40';
    talkingPoint =
      'NoExecute actively purges running pods! ml-job-no-grace is evicted in 1.5s thanks to proper PID 1 signal forwarding, ml-job-grace-30s gets 30s to checkpoint, while gpu-monitor stays alive permanently because it tolerates NoExecute.';
    mechanics =
      'The TaintManager controller in kube-controller-manager detects the NoExecute taint on worker2 and evicts pods asynchronously without going through the scheduler.';
    vivaQuestion = 'Why did our container terminate in 1.5 seconds instead of 30 seconds?';
    vivaAnswer =
      'Our entrypoint script forwards SIGTERM directly to the Python training process (PID 1). Without this, containers ignore SIGTERM and wait for Docker/K8s SIGKILL after 30 seconds.';
  } else if (hasMaintenance || pendingPods.length > 0) {
    stateTitle = 'General Maintenance (Pending Backlog)';
    badgeText = `${pendingPods.length} Unsatisfied Pods`;
    badgeColor = 'bg-amber-500/20 text-amber-300 border-amber-500/40';
    talkingPoint =
      `General worker is in maintenance (NoSchedule). Since both worker nodes now repel the website pods, kube-scheduler holds them in the Pending queue (${pendingPods.length} pods waiting). No compute resources are wasted.`;
    mechanics =
      'Scheduler filter returns 0/3 nodes available. Pods remain in the scheduling queue in etcd until a node change event triggers re-evaluation.';
    vivaQuestion = 'Do pods in the Pending state consume CPU or RAM on the cluster?';
    vivaAnswer =
      'No. Pending pods only exist as JSON metadata in the kube-apiserver etcd database. Containerd does not spawn containers until a pod binds to a node.';
  } else if (hasGpuTaint && hasGpuLabel && hasDedicatedMl && !hasWebsiteOnGpu) {
    stateTitle = 'Dedicated GPU Isolation';
    badgeText = '100% Dedicated ML Isolation';
    badgeColor = 'bg-violet-500/20 text-violet-300 border-violet-500/40';
    talkingPoint =
      'Dedicated GPU isolation achieved! Taint hardware=gpu:NoSchedule repels general website traffic, while nodeSelector hardware=gpu strictly pins ML training jobs to worker2. Neither workload can cross boundaries.';
    mechanics =
      'Taint acts as the repellent shield (protecting GPU from website); nodeSelector acts as the magnet (drawing ML jobs exclusively to worker2). Perfect mutual isolation.';
    vivaQuestion = 'Why are both a taint AND a nodeSelector needed for dedicated nodes?';
    vivaAnswer =
      'A taint only repels unwanted pods; it does NOT force allowed pods to run there. The nodeSelector is required to attract and constrain the ML workload to the GPU node.';
  } else if (hasTolOnlyMl) {
    stateTitle = 'Toleration-Only Spread';
    badgeText = 'A Pass is NOT an Address';
    badgeColor = 'bg-fuchsia-500/20 text-fuchsia-300 border-fuchsia-500/40';
    talkingPoint =
      'The ML job with toleration-only is distributed across BOTH worker nodes. This proves that a toleration only permits scheduling; it does not steer traffic. To achieve dedicated isolation, nodeSelector is required.';
    mechanics =
      'Both worker and worker2 pass the filter stage (toleration satisfies taint on worker2; worker has no taints). The scheduler scores both equally and spreads replicas.';
    vivaQuestion = 'If a pod tolerates the GPU taint, why does it still land on the non-GPU worker?';
    vivaAnswer =
      'Tolerations are passive permissions, not affinities. The scheduler sees both nodes as valid candidates and applies load balancing across them.';
  } else if (hasGpuTaint && !hasWebsiteOnGpu && generalPods.length > 0) {
    stateTitle = 'GPU Reserved (Website Shielded)';
    badgeText = 'NoSchedule Enforced';
    badgeColor = 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
    talkingPoint =
      'Worker2 is shielded by hardware=gpu:NoSchedule. All 4 website pods are placed exclusively on the general worker node because they lack the required toleration.';
    mechanics =
      'The scheduler filters out worker2 for the website deployment because the Pod spec contains no matching toleration for taint key="hardware" value="gpu".';
    vivaQuestion = 'Does the NoSchedule taint evict pods that are already running on the node?';
    vivaAnswer =
      'No. NoSchedule is purely an admission filter at schedule time. Pre-existing pods remain running unless NoExecute is applied.';
  }

  return (
    <div className="w-full rounded-2xl bg-white/[0.02] bg-gradient-to-b from-white/[0.04] to-black/40 backdrop-blur-2xl border border-white/[0.1] shadow-2xl transition-all duration-300 overflow-hidden">
      {/* Header bar / Collapsed view */}
      <div className="px-5 py-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="p-1.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 shrink-0">
            <Mic className="w-4 h-4 animate-pulse" />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-white whitespace-nowrap">
                Live Evaluator Script
              </span>
              <span className={`text-[10px] font-mono px-2 py-0.2 rounded-full border font-semibold truncate ${badgeColor}`}>
                {badgeText}
              </span>
            </div>
            {/* Collapsed brief preview */}
            {!isExpanded && (
              <p className="text-[11px] text-slate-300 font-mono mt-0.5 truncate max-w-2xl italic">
                "{talkingPoint}"
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Quick Auto-Pilot trigger */}
          <button
            onClick={() => {
              onOpenAutoPilot();
              sound.playClick();
            }}
            className="tactile-btn hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-[11px] font-mono font-semibold cursor-pointer"
            title="Launch Automated Presentation Tour"
          >
            <Zap className="w-3.5 h-3.5 text-cyan-400" />
            <span>Auto-Pilot Tour</span>
          </button>

          {/* Quick Viva Guide trigger */}
          <button
            onClick={() => {
              onOpenVivaGuide();
              sound.playClick();
            }}
            className="tactile-btn hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-violet-500/10 hover:bg-violet-500/20 text-violet-300 border border-violet-500/30 text-[11px] font-mono font-semibold cursor-pointer"
            title="Open Viva Questions & Answers"
          >
            <GraduationCap className="w-3.5 h-3.5 text-violet-400" />
            <span>Viva Guide</span>
          </button>

          {/* Expand / Collapse toggle */}
          <button
            onClick={() => {
              setIsExpanded(!isExpanded);
              sound.playClick();
            }}
            className="tactile-btn flex items-center gap-1 px-2.5 py-1 rounded-xl bg-white/[0.04] hover:bg-white/10 text-slate-300 border border-white/10 text-[11px] font-mono cursor-pointer"
          >
            <span>{isExpanded ? 'Collapse' : 'Explain to Professor'}</span>
            {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Expanded Breakdown */}
      {isExpanded && (
        <div className="px-5 pb-5 pt-2 border-t border-white/[0.06] animate-in fade-in duration-200 grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Card 1: What to Say */}
          <div className="p-4 rounded-xl bg-white/[0.02] border border-cyan-500/20 space-y-2">
            <div className="text-[11px] font-mono font-bold text-cyan-300 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              <span>Say This Now to Examiner</span>
            </div>
            <p className="text-xs font-mono text-slate-200 leading-relaxed italic">
              "{talkingPoint}"
            </p>
            <div className="text-[9px] font-mono text-cyan-400 uppercase tracking-widest pt-1">
              Active State: {stateTitle}
            </div>
          </div>

          {/* Card 2: Scheduler Mechanics */}
          <div className="p-4 rounded-xl bg-white/[0.02] border border-violet-500/20 space-y-2">
            <div className="text-[11px] font-mono font-bold text-violet-300 flex items-center gap-1.5">
              <span>⚙️</span>
              <span>Kube-Scheduler Mechanics</span>
            </div>
            <p className="text-xs font-mono text-slate-300 leading-relaxed">
              {mechanics}
            </p>
            <div className="text-[9px] font-mono text-violet-400 uppercase tracking-widest pt-1">
              Filter Predicates & Priorities
            </div>
          </div>

          {/* Card 3: Examiner Question & Answer */}
          <div className="p-4 rounded-xl bg-white/[0.02] border border-amber-500/20 space-y-2">
            <div className="text-[11px] font-mono font-bold text-amber-300 flex items-center gap-1.5">
              <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
              <span>Likely Question on this Screen</span>
            </div>
            <p className="text-[11px] font-mono font-bold text-amber-200">
              "{vivaQuestion}"
            </p>
            <p className="text-xs font-mono text-slate-300 leading-relaxed">
              {vivaAnswer}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
