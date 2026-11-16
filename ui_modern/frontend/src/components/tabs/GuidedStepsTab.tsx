import React, { useState } from 'react';
import type { NodeInfo, PodInfo } from '../../types';
import { taintToString } from '../../lib/k8s-rules';
import { sound } from '../../lib/sound';
import {
  Play,
  RotateCcw,
  CheckCircle2,
  Terminal,
  ArrowRight,
  Flame,
  Wrench,
  Sparkles,
  Server,
  Cpu,
  Clock,
  Ban,
} from 'lucide-react';

interface GuidedStepsTabProps {
  onRunStep: (stepId: number) => Promise<void>;
  onResetLab: () => Promise<void>;
  isRunningAction: boolean;
  nodes?: NodeInfo[];
  pods?: PodInfo[];
}

export const GuidedStepsTab: React.FC<GuidedStepsTabProps> = ({
  onRunStep,
  onResetLab,
  isRunningAction,
  nodes = [],
  pods = [],
}) => {
  const [activeStepRunning, setActiveStepRunning] = useState<number | null>(null);
  const [completedSteps, setCompletedSteps] = useState<Record<number, boolean>>({});

  const worker1 = nodes.find((n) => n.name === 'taints-lab-worker');
  const worker2 = nodes.find((n) => n.name === 'taints-lab-worker2');
  const worker1Pods = pods.filter((p) => p.nodeName === 'taints-lab-worker');
  const worker2Pods = pods.filter((p) => p.nodeName === 'taints-lab-worker2');
  const pendingPods = pods.filter((p) => !p.nodeName || p.phase === 'Pending');

  const steps = [
    {
      id: 1,
      title: 'Reserve the GPU Node',
      badge: 'Step 1 • NoSchedule',
      tagColor: 'text-violet-400 bg-violet-950/60 border-violet-500/30',
      desc: 'Apply label hardware=gpu and taint hardware=gpu:NoSchedule on worker2',
      impact:
        'Standard workloads (Website) cannot schedule on worker2. Only workloads with matching toleration can enter.',
      commands: [
        'kubectl label nodes taints-lab-worker2 hardware=gpu --overwrite',
        'kubectl taint nodes taints-lab-worker2 hardware=gpu:NoSchedule --overwrite',
      ],
      icon: <Sparkles className="w-5 h-5 text-violet-400" />,
    },
    {
      id: 2,
      title: 'General Node Maintenance',
      badge: 'Step 2 • Draining Simulation',
      tagColor: 'text-amber-400 bg-amber-950/60 border-amber-500/30',
      desc: 'Taint maintenance=true:NoSchedule on taints-lab-worker',
      impact:
        'Simulates general node maintenance. Pods lacking toleration cannot schedule on worker or worker2 and become Pending.',
      commands: [
        'kubectl taint nodes taints-lab-worker maintenance=true:NoSchedule --overwrite',
      ],
      icon: <Wrench className="w-5 h-5 text-amber-400" />,
    },
    {
      id: 3,
      title: 'Maintenance Complete',
      badge: 'Step 3 • Recovery',
      tagColor: 'text-emerald-400 bg-emerald-950/60 border-emerald-500/30',
      desc: 'Remove maintenance taint from taints-lab-worker',
      impact:
        'General worker becomes available again. The scheduler immediately recovers and schedules all Pending pods!',
      commands: ['kubectl taint nodes taints-lab-worker maintenance-'],
      icon: <CheckCircle2 className="w-5 h-5 text-emerald-400" />,
    },
    {
      id: 4,
      title: 'GPU Fault Injection',
      badge: 'Step 4 • NoExecute Eviction',
      tagColor: 'text-rose-400 bg-rose-950/60 border-rose-500/30',
      desc: 'Taint gpu-fault=true:NoExecute on taints-lab-worker2',
      impact:
        'NoExecute evicts ALREADY RUNNING pods unless they have toleration! Watch pods enter Terminating state in real time.',
      commands: [
        'kubectl taint nodes taints-lab-worker2 gpu-fault=true:NoExecute --overwrite',
      ],
      icon: <Flame className="w-5 h-5 text-rose-400" />,
    },
    {
      id: 5,
      title: 'GPU Repaired',
      badge: 'Step 5 • Fault Cleared',
      tagColor: 'text-cyan-400 bg-cyan-950/60 border-cyan-500/30',
      desc: 'Remove gpu-fault taint from taints-lab-worker2',
      impact:
        'Restores GPU node to healthy reserved state (hardware=gpu:NoSchedule remains). ML workloads can run safely once more.',
      commands: ['kubectl taint nodes taints-lab-worker2 gpu-fault-'],
      icon: <CheckCircle2 className="w-5 h-5 text-cyan-400" />,
    },
  ];

  const handleRun = async (stepId: number) => {
    setActiveStepRunning(stepId);
    sound.playClick();
    try {
      await onRunStep(stepId);
      sound.playSuccess();
      setCompletedSteps((prev) => ({ ...prev, [stepId]: true }));
    } finally {
      setActiveStepRunning(null);
    }
  };

  const handleReset = async () => {
    setActiveStepRunning(99);
    sound.playWarning();
    try {
      await onResetLab();
      sound.playSuccess();
      setCompletedSteps({});
    } finally {
      setActiveStepRunning(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Real-time Telemetry Dock */}
      <div className="rounded-2xl bg-slate-900/40 backdrop-blur-xl border border-white/10 p-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-3 border-b border-white/5 pb-3">
          <div>
            <h3 className="text-sm font-bold text-white font-mono flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
              <span>Live Cluster Impact Telemetry</span>
            </h3>
            <p className="text-xs text-slate-400 font-mono">
              Watch nodes & pod counts update automatically as you execute each step below.
            </p>
          </div>

          <button
            onClick={handleReset}
            disabled={isRunningAction}
            className="tactile-btn flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-500/40 text-xs font-mono font-bold cursor-pointer disabled:opacity-50"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${activeStepRunning === 99 ? 'animate-spin' : ''}`} />
            <span>Reset Lab State</span>
          </button>
        </div>

        {/* 3 Status Modules */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* General Worker */}
          <div className="p-3 rounded-xl bg-[#030712]/60 border border-white/5">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-mono text-cyan-400 font-bold flex items-center gap-1.5">
                <Server className="w-3.5 h-3.5" />
                <span>taints-lab-worker</span>
              </span>
              <span className="text-xs font-mono font-extrabold text-white">
                {worker1Pods.length} Pods
              </span>
            </div>
            <div className="text-[11px] font-mono text-slate-400 truncate">
              {worker1?.taints && worker1.taints.length > 0 ? (
                <span className="text-amber-400 flex items-center gap-1">
                  <Ban className="w-3 h-3" />
                  {worker1.taints.map(taintToString).join(', ')}
                </span>
              ) : (
                <span className="text-emerald-400">Open (no taints)</span>
              )}
            </div>
          </div>

          {/* GPU Worker */}
          <div className="p-3 rounded-xl bg-[#030712]/60 border border-white/5">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-mono text-violet-400 font-bold flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5" />
                <span>taints-lab-worker2</span>
              </span>
              <span className="text-xs font-mono font-extrabold text-white">
                {worker2Pods.length} Pods
              </span>
            </div>
            <div className="text-[11px] font-mono text-slate-400 truncate">
              {worker2?.taints && worker2.taints.length > 0 ? (
                <span className="text-violet-300 flex items-center gap-1">
                  <Ban className="w-3 h-3 text-red-400" />
                  {worker2.taints.map(taintToString).join(', ')}
                </span>
              ) : (
                <span className="text-slate-500">Unreserved</span>
              )}
            </div>
          </div>

          {/* Pending Queue */}
          <div className={`p-3 rounded-xl border ${
            pendingPods.length > 0
              ? 'bg-amber-950/20 border-amber-500/40'
              : 'bg-[#030712]/60 border-white/5'
          }`}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-mono text-amber-400 font-bold flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                <span>Pending Queue</span>
              </span>
              <span className={`text-xs font-mono font-extrabold ${pendingPods.length > 0 ? 'text-amber-300' : 'text-slate-400'}`}>
                {pendingPods.length} Pods
              </span>
            </div>
            <div className="text-[11px] font-mono text-slate-400">
              {pendingPods.length > 0 ? (
                <span className="text-amber-400 font-semibold">Pods awaiting qualified node</span>
              ) : (
                <span className="text-emerald-400">All workloads scheduled</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Stepper Cards */}
      <div className="space-y-4">
        {steps.map((s) => {
          const isCurrentRunning = activeStepRunning === s.id;
          const isDone = completedSteps[s.id];

          return (
            <div
              key={s.id}
              className={`rounded-2xl p-5 border transition-all duration-300 ${
                isDone
                  ? 'bg-slate-900/60 border-emerald-500/40 shadow-[0_0_20px_rgba(16,185,129,0.1)]'
                  : 'bg-slate-900/40 backdrop-blur-xl border-white/10 hover:border-white/20'
              }`}
            >
              <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-5">
                {/* Left: Step details */}
                <div className="flex items-start gap-4 flex-1">
                  <div className="w-11 h-11 rounded-2xl bg-[#030712] border border-white/10 flex items-center justify-center flex-shrink-0 mt-0.5 shadow-md">
                    {s.icon}
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-bold text-white font-mono">
                        {s.id}. {s.title}
                      </span>
                      <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${s.tagColor}`}>
                        {s.badge}
                      </span>
                      {isDone && (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-500/40 flex items-center gap-1 font-bold">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Executed</span>
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-slate-300 font-medium leading-relaxed">
                      {s.desc}
                    </p>

                    <p className="text-[11px] text-slate-400 font-mono leading-relaxed">
                      💡 <span className="text-slate-300">{s.impact}</span>
                    </p>

                    {/* kubectl commands */}
                    <div className="pt-1 flex flex-wrap gap-2">
                      {s.commands.map((cmd, cIdx) => (
                        <div
                          key={cIdx}
                          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#02040a] border border-white/10 text-[11px] font-mono text-cyan-300"
                        >
                          <Terminal className="w-3 h-3 text-cyan-400 flex-shrink-0" />
                          <span className="truncate max-w-xl">{cmd}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Right: Run Button */}
                <div className="flex items-center gap-3 w-full lg:w-auto justify-end flex-shrink-0 pt-3 lg:pt-0 border-t lg:border-t-0 border-white/10">
                  <button
                    onClick={() => handleRun(s.id)}
                    disabled={isRunningAction}
                    className={`tactile-btn flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-mono text-xs font-bold transition-all cursor-pointer w-full sm:w-auto shadow-md ${
                      isDone
                        ? 'bg-slate-800 text-emerald-300 border border-emerald-500/40 hover:bg-slate-700'
                        : 'bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 border border-cyan-500/40 hover:shadow-[0_0_20px_rgba(6,182,212,0.3)]'
                    } disabled:opacity-50`}
                  >
                    <Play className={`w-3.5 h-3.5 ${isCurrentRunning ? 'animate-spin' : 'fill-current'}`} />
                    <span>{isCurrentRunning ? 'Executing...' : isDone ? 'Re-run Step' : 'Execute Step'}</span>
                    <ArrowRight className="w-3 h-3 opacity-60" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
