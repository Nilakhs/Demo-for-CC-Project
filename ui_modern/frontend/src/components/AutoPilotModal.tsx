import React, { useState, useEffect, useRef } from 'react';
import { sound } from '../lib/sound';
import {
  Play,
  Pause,
  SkipForward,
  SkipBack,
  RotateCw,
  X,
  Volume2,
  Sparkles,
  Zap,
  GraduationCap,
  HelpCircle,
  Cpu,
  CheckCircle2,
} from 'lucide-react';

export interface AutoPilotAct {
  actNumber: number;
  title: string;
  badge: string;
  scenarioSubtitle: string;
  actionDescription: string;
  whatToSay: string;
  underTheHood: string;
  vivaQuestion: string;
  vivaAnswer: string;
  runAction: () => Promise<void>;
}

interface AutoPilotModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRunStep: (stepId: number) => Promise<void>;
  onDeployWorkload: (file: string) => Promise<void>;
  onDeleteAllWorkloads: () => Promise<void>;
  onResetLab: () => Promise<void>;
}

export const AutoPilotModal: React.FC<AutoPilotModalProps> = ({
  isOpen,
  onClose,
  onRunStep,
  onDeployWorkload,
  onDeleteAllWorkloads,
  onResetLab,
}) => {
  const [currentActIndex, setCurrentActIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState(15);
  const [durationPerStep, setDurationPerStep] = useState(15);
  const [isExecuting, setIsExecuting] = useState(false);
  const [executedActs, setExecutedActs] = useState<number[]>([]);

  const acts: AutoPilotAct[] = [
    {
      actNumber: 1,
      title: 'Default Scheduling: Pods Scatter Anywhere',
      badge: 'Baseline Behavior',
      scenarioSubtitle: 'No Taints on Workers · Default Kube-Scheduler Scoring',
      actionDescription: 'Deploying Website (4 replicas) with zero taints on worker nodes.',
      whatToSay:
        'With no taint, Kubernetes places the website anywhere — even on the expensive GPU node. The manager node gets nothing because it has a built-in control-plane taint.',
      underTheHood:
        'Kube-scheduler Filter Phase passes both worker nodes (no untolerated taints). Score Phase calculates least requested priority, spreading 2 pods on worker and 2 on worker2.',
      vivaQuestion: 'Why did no pods land on the control-plane node?',
      vivaAnswer:
        'The control plane has a default system taint: node-role.kubernetes.io/control-plane:NoSchedule which rejects all standard workloads lacking that specific toleration.',
      runAction: async () => {
        await onDeleteAllWorkloads();
        await onResetLab();
        await onDeployWorkload('01-website.yaml');
      },
    },
    {
      actNumber: 2,
      title: 'Reserve the GPU Node with NoSchedule',
      badge: 'Step 1: Hard Gate',
      scenarioSubtitle: 'Taint: hardware=gpu:NoSchedule · Label: hardware=gpu',
      actionDescription: 'Applying hardware=gpu:NoSchedule taint to worker2, then redeploying website.',
      whatToSay:
        'NoSchedule only blocks NEW pods. Notice how existing pods remain running. Once we redeploy the website, all 4 blue pods land strictly on the general worker because they lack the GPU toleration.',
      underTheHood:
        'The scheduler filters out worker2 for the website deployment because the Pod spec contains no matching toleration for taint key="hardware" value="gpu" effect="NoSchedule".',
      vivaQuestion: 'Does the NoSchedule taint evict pods that are already running on the node?',
      vivaAnswer:
        'No. NoSchedule is purely a placement constraint during scheduling. Running pods are unaffected. Only NoExecute causes eviction of running pods.',
      runAction: async () => {
        await onRunStep(1);
        await onDeployWorkload('01-website.yaml');
      },
    },
    {
      actNumber: 3,
      title: 'Viva Trap: A Pass is NOT an Address',
      badge: 'Toleration Only',
      scenarioSubtitle: 'ML Job with Toleration hardware=gpu, NO nodeSelector',
      actionDescription: 'Deploying ML training pods with toleration only (no nodeSelector).',
      whatToSay:
        'A common viva trap! A toleration only permits access — it does NOT force placement onto the GPU node. Since both nodes are now allowed, Kubernetes balances pods across both machines.',
      underTheHood:
        'Worker has no taints (allowed). Worker2 has hardware=gpu taint which is tolerated (allowed). Both nodes pass the filter stage, so the scheduler balances replicas across both.',
      vivaQuestion: 'If a pod tolerates the GPU taint, why does it still land on the non-GPU worker?',
      vivaAnswer:
        'Tolerations are passive permissions, not affinities or constraints. To force scheduling to the GPU node, a nodeSelector or nodeAffinity is required alongside the toleration.',
      runAction: async () => {
        await onDeployWorkload('02-ml-training-toleration-only.yaml');
      },
    },
    {
      actNumber: 4,
      title: 'The Golden Architecture: Dedicated GPU Node',
      badge: 'Core Evaluation Result',
      scenarioSubtitle: 'Toleration hardware=gpu + nodeSelector hardware=gpu',
      actionDescription: 'Deploying ML Job with Toleration + nodeSelector hardware=gpu.',
      whatToSay:
        'This is the core result: Pass plus Address! The taint keeps the website out; the nodeSelector pins the ML training jobs in. The GPU node is now 100% dedicated to machine learning.',
      underTheHood:
        'Taint acts as the repellent shield (protecting GPU from website); nodeSelector acts as the magnet (drawing ML jobs exclusively to worker2). Perfect mutual isolation.',
      vivaQuestion: 'What would happen if an engineer misspelled the toleration key as "gpus"?',
      vivaAnswer:
        'Taints and tolerations require exact string matching. If there is a typo (like "gpus"), the toleration fails, and the pod is rejected from the GPU node.',
      runAction: async () => {
        await onDeployWorkload('03-ml-training-dedicated.yaml');
      },
    },
    {
      actNumber: 5,
      title: 'Maintenance Mode & Pending Queue',
      badge: 'Zero-Tolerance Backlog',
      scenarioSubtitle: 'Worker Tainted maintenance=true:NoSchedule',
      actionDescription: 'Simulating general node maintenance with untolerated taint.',
      whatToSay:
        'Every node now has a taint that the website cannot tolerate. Instead of crashing, the pods enter the Pending state with FailedScheduling. As soon as maintenance completes, Kubernetes places them automatically.',
      underTheHood:
        'Scheduler filters evaluate all 3 nodes: control-plane (tainted), worker (maintenance taint), worker2 (gpu taint). 0/3 nodes available. Pod stays in the scheduling queue in etcd.',
      vivaQuestion: 'Do pods in the Pending state consume CPU or RAM on the cluster nodes?',
      vivaAnswer:
        'No. Pending pods only exist as metadata in the kube-apiserver etcd database. No containers are created by containerd until a pod binds to a node.',
      runAction: async () => {
        await onRunStep(2);
      },
    },
    {
      actNumber: 6,
      title: 'GPU Fault Injection & Graceful Eviction (NoExecute)',
      badge: 'NoExecute vs Grace',
      scenarioSubtitle: 'Taint: gpu-fault=true:NoExecute · Eviction Mechanics',
      actionDescription: 'Injecting NoExecute fault; observing immediate vs 30s grace vs monitor pod.',
      whatToSay:
        'NoExecute actively purges running pods. Watch ml-job-no-grace get evicted in 1.5 seconds thanks to proper PID 1 signal forwarding, ml-job-grace-30s gets 30 seconds to checkpoint, while gpu-monitor stays alive permanently.',
      underTheHood:
        'TaintManager controller immediately detects the NoExecute taint on worker2. Pods without toleration get deletionTimestamp instantly. Pods with tolerationSeconds get a timer.',
      vivaQuestion: 'Why did our container take only 1.5 seconds to terminate instead of 30 seconds?',
      vivaAnswer:
        'Our container entrypoint shell script uses "exec" and forwards SIGTERM directly to the Python process (PID 1). Without this, containers ignore SIGTERM and wait for Docker/Kubernetes SIGKILL after 30 seconds.',
      runAction: async () => {
        await onDeployWorkload('05-gpu-fault-test-pods.yaml');
        await onRunStep(4);
      },
    },
  ];

  const currentAct = acts[currentActIndex];

  // Auto-play timer
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isOpen || !isPlaying) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    timerRef.current = window.setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          handleNextAct();
          return durationPerStep;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isOpen, isPlaying, currentActIndex, durationPerStep]);

  // Execute current act
  const handleExecuteAct = async () => {
    setIsExecuting(true);
    sound.playClick();
    try {
      await currentAct.runAction();
      sound.playSuccess();
      if (!executedActs.includes(currentAct.actNumber)) {
        setExecutedActs((prev) => [...prev, currentAct.actNumber]);
      }
    } catch (err) {
      sound.playWarning();
      console.error(err);
    } finally {
      setIsExecuting(false);
    }
  };

  const handleNextAct = () => {
    if (currentActIndex < acts.length - 1) {
      setCurrentActIndex((prev) => prev + 1);
      setSecondsRemaining(durationPerStep);
      sound.playTabSwitch();
    } else {
      setIsPlaying(false);
    }
  };

  const handlePrevAct = () => {
    if (currentActIndex > 0) {
      setCurrentActIndex((prev) => prev - 1);
      setSecondsRemaining(durationPerStep);
      sound.playTabSwitch();
    }
  };

  const handleSelectAct = (index: number) => {
    setCurrentActIndex(index);
    setSecondsRemaining(durationPerStep);
    sound.playClick();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-2xl animate-in fade-in duration-200">
      <div className="relative w-full max-w-5xl rounded-3xl bg-[#030712]/95 border border-cyan-500/30 shadow-[0_0_50px_rgba(6,182,212,0.15)] flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
              <Zap className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white font-mono">
                  Auto-Pilot Presentation Mode
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-950/80 border border-cyan-500/40 text-cyan-300 font-semibold">
                  LIVE DEMO TOUR
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono">
                Automated 6-Act Academic Defense Flow with Real-Time Cluster Execution & Verbatim Examiner Script
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Countdown Badge */}
            {isPlaying && (
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-cyan-950/60 border border-cyan-500/40 text-xs font-mono text-cyan-300">
                <RotateCw className="w-3.5 h-3.5 animate-spin" />
                <span>Next in {secondsRemaining}s</span>
              </div>
            )}

            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Acts Stepper Ribbon */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-white/[0.06] bg-black/40 overflow-x-auto no-scrollbar gap-2">
          {acts.map((act, idx) => {
            const isCurrent = currentActIndex === idx;
            const isDone = executedActs.includes(act.actNumber);

            return (
              <button
                key={act.actNumber}
                onClick={() => handleSelectAct(idx)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl font-mono text-xs transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                  isCurrent
                    ? 'bg-cyan-500/20 text-cyan-200 border border-cyan-500/40 shadow-[0_0_12px_rgba(6,182,212,0.2)] font-bold'
                    : isDone
                    ? 'bg-emerald-950/40 text-emerald-300 border border-emerald-500/20'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent'
                }`}
              >
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
                  isCurrent ? 'bg-cyan-400 text-black font-bold' : isDone ? 'bg-emerald-500 text-black font-bold' : 'bg-slate-800 text-slate-400'
                }`}>
                  {isDone ? '✓' : act.actNumber}
                </span>
                <span>Act {act.actNumber}</span>
              </button>
            );
          })}
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Act Title Banner */}
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-4 rounded-2xl bg-white/[0.02] border border-white/10">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-cyan-400 font-bold uppercase tracking-widest">
                  Act {currentAct.actNumber} of {acts.length}
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/10 text-slate-300">
                  {currentAct.badge}
                </span>
              </div>
              <h3 className="text-lg font-bold text-white font-mono mt-0.5">
                {currentAct.title}
              </h3>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                {currentAct.scenarioSubtitle}
              </p>
            </div>

            {/* Execute Button */}
            <button
              onClick={handleExecuteAct}
              disabled={isExecuting}
              className="tactile-btn flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-violet-600 hover:from-cyan-500 hover:to-violet-500 text-white font-mono text-xs font-bold shadow-[0_0_20px_rgba(6,182,212,0.3)] disabled:opacity-50 cursor-pointer shrink-0"
            >
              {isExecuting ? (
                <>
                  <RotateCw className="w-4 h-4 animate-spin" />
                  <span>Executing Cluster Action...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-cyan-200" />
                  <span>Execute Act {currentAct.actNumber} on Cluster</span>
                </>
              )}
            </button>
          </div>

          {/* 3 Core Presentation Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Card 1: What to Say to Examiner */}
            <div className="rounded-2xl bg-gradient-to-b from-cyan-950/30 to-black/40 border border-cyan-500/30 p-5 flex flex-col justify-between shadow-lg">
              <div>
                <div className="flex items-center gap-2 text-cyan-300 text-xs font-mono font-bold uppercase tracking-wider mb-2">
                  <Volume2 className="w-4 h-4 text-cyan-400" />
                  <span>What to Say to Professor</span>
                </div>
                <div className="p-3.5 rounded-xl bg-cyan-950/40 border border-cyan-500/20 text-xs font-mono text-slate-200 leading-relaxed italic">
                  "{currentAct.whatToSay}"
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-cyan-500/20 text-[10px] font-mono text-cyan-400">
                Action: {currentAct.actionDescription}
              </div>
            </div>

            {/* Card 2: Under the Hood K8s Mechanics */}
            <div className="rounded-2xl bg-gradient-to-b from-violet-950/30 to-black/40 border border-violet-500/30 p-5 flex flex-col justify-between shadow-lg">
              <div>
                <div className="flex items-center gap-2 text-violet-300 text-xs font-mono font-bold uppercase tracking-wider mb-2">
                  <Cpu className="w-4 h-4 text-violet-400" />
                  <span>Under the Hood (K8s Scheduler)</span>
                </div>
                <div className="p-3.5 rounded-xl bg-violet-950/40 border border-violet-500/20 text-xs font-mono text-slate-200 leading-relaxed">
                  {currentAct.underTheHood}
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-violet-500/20 text-[10px] font-mono text-violet-400">
                Status: {executedActs.includes(currentAct.actNumber) ? 'Executed & Placed' : 'Ready to Run'}
              </div>
            </div>

            {/* Card 3: Predicted Viva Question & Answer */}
            <div className="rounded-2xl bg-gradient-to-b from-amber-950/30 to-black/40 border border-amber-500/30 p-5 flex flex-col justify-between shadow-lg">
              <div>
                <div className="flex items-center gap-2 text-amber-300 text-xs font-mono font-bold uppercase tracking-wider mb-2">
                  <GraduationCap className="w-4 h-4 text-amber-400" />
                  <span>Likely Viva Question & Answer</span>
                </div>
                <div className="p-3 rounded-xl bg-amber-950/30 border border-amber-500/20 mb-2">
                  <div className="text-[11px] font-mono font-bold text-amber-200 flex items-start gap-1.5">
                    <HelpCircle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                    <span>{currentAct.vivaQuestion}</span>
                  </div>
                </div>
                <p className="text-xs font-mono text-slate-300 leading-relaxed">
                  {currentAct.vivaAnswer}
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-amber-500/20 text-[10px] font-mono text-amber-400 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Examiner-Verified Answer</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Playback Controls */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-white/10 bg-black/60">
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrevAct}
              disabled={currentActIndex === 0}
              className="tactile-btn flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/10 text-slate-200 border border-white/10 text-xs font-mono disabled:opacity-40 cursor-pointer"
            >
              <SkipBack className="w-3.5 h-3.5" />
              <span>Previous Act</span>
            </button>

            <button
              onClick={() => {
                setIsPlaying(!isPlaying);
                sound.playClick();
              }}
              className={`tactile-btn flex items-center gap-2 px-4 py-1.5 rounded-xl border text-xs font-mono font-semibold cursor-pointer ${
                isPlaying
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                  : 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
              }`}
            >
              {isPlaying ? (
                <>
                  <Pause className="w-3.5 h-3.5" />
                  <span>Pause Tour</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Auto-Play Tour</span>
                </>
              )}
            </button>

            <button
              onClick={handleNextAct}
              disabled={currentActIndex === acts.length - 1}
              className="tactile-btn flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/10 text-slate-200 border border-white/10 text-xs font-mono disabled:opacity-40 cursor-pointer"
            >
              <span>Next Act</span>
              <SkipForward className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Tour Speed Settings */}
          <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
            <span>Interval:</span>
            {[10, 15, 30].map((dur) => (
              <button
                key={dur}
                onClick={() => {
                  setDurationPerStep(dur);
                  setSecondsRemaining(dur);
                  sound.playClick();
                }}
                className={`px-2.5 py-1 rounded-lg border cursor-pointer ${
                  durationPerStep === dur
                    ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 font-bold'
                    : 'bg-white/[0.02] text-slate-400 border-white/10 hover:text-white'
                }`}
              >
                {dur}s
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
