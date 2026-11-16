import React, { useState } from 'react';
import type { NodeInfo } from '../../types';
import { sound } from '../../lib/sound';
import {
  Play,
  CheckCircle2,
  XCircle,
  Cpu,
  Shield,
  Monitor,
  Filter,
  Trophy,
} from 'lucide-react';

interface SchedulerFlowTabProps {
  nodes: NodeInfo[];
}

interface ScenarioOption {
  id: string;
  title: string;
  type: string;
  tolerations: { key?: string; operator?: string; value?: string; effect?: string }[];
  nodeSelector: Record<string, string>;
  description: string;
}

const SCENARIOS: ScenarioOption[] = [
  {
    id: 'website',
    title: 'Website (NGINX)',
    type: 'No Toleration / No Selector',
    tolerations: [],
    nodeSelector: {},
    description: 'Standard HTTP service. Has no tolerations and no nodeSelectors. Must stay off GPU node.',
  },
  {
    id: 'ml-toleration-only',
    title: 'ML Job (Toleration Only)',
    type: 'Toleration Only',
    tolerations: [{ key: 'hardware', operator: 'Equal', value: 'gpu', effect: 'NoSchedule' }],
    nodeSelector: {},
    description: 'Tolerates GPU taint, but lacks nodeSelector. Permitted on GPU node, but not bound to it.',
  },
  {
    id: 'ml-dedicated',
    title: 'ML Job (Dedicated)',
    type: 'Toleration + nodeSelector',
    tolerations: [{ key: 'hardware', operator: 'Equal', value: 'gpu', effect: 'NoSchedule' }],
    nodeSelector: { hardware: 'gpu' },
    description: 'The golden pattern: Toleration passes the taint, nodeSelector binds exclusively to GPU node.',
  },
  {
    id: 'ml-typo',
    title: "ML Job (Typo: 'gpus')",
    type: 'Misconfigured Toleration',
    tolerations: [{ key: 'hardware', operator: 'Equal', value: 'gpus', effect: 'NoSchedule' }],
    nodeSelector: {},
    description: "Typo in toleration value ('gpus' != 'gpu'). Fails exact match and is repelled by worker2.",
  },
];

export const SchedulerFlowTab: React.FC<SchedulerFlowTabProps> = ({ nodes }) => {
  const [selectedScenarioId, setSelectedScenarioId] = useState<string>('ml-dedicated');
  const [simulationStep, setSimulationStep] = useState<number>(0);
  const [isSimulating, setIsSimulating] = useState(false);

  const scenario = SCENARIOS.find((s) => s.id === selectedScenarioId) || SCENARIOS[0];

  const handleSelectScenario = (id: string) => {
    setSelectedScenarioId(id);
    setSimulationStep(0);
    sound.playClick();
  };

  const handleRunSimulation = () => {
    setIsSimulating(true);
    setSimulationStep(1);
    sound.playTabSwitch();

    setTimeout(() => {
      setSimulationStep(2);
      sound.playClick();
    }, 900);

    setTimeout(() => {
      setSimulationStep(3);
      sound.playSuccess();
      setIsSimulating(false);
    }, 1800);
  };

  // Evaluation logic for simulation
  const evaluateControlPlane = () => ({
    passed: false,
    reason: 'Rejected by Predicate: untolerated taint node-role.kubernetes.io/control-plane:NoSchedule',
  });

  const evaluateGeneralWorker = () => {
    const workerNode = nodes.find((n) => n.name === 'taints-lab-worker');
    const hasMaintenance = (workerNode?.taints || []).some((t) => t.key === 'maintenance');
    const requiresGpu = scenario.nodeSelector['hardware'] === 'gpu';

    if (hasMaintenance) {
      return {
        passed: false,
        reason: 'Rejected by Predicate: node has untolerated taint maintenance=true:NoSchedule',
      };
    }
    if (requiresGpu) {
      return {
        passed: false,
        reason: 'Rejected by Predicate: node lacks required label hardware=gpu (nodeSelector mismatch)',
      };
    }
    return {
      passed: true,
      reason: 'Passed Filtering: no blocking taints and satisfies nodeSelectors',
    };
  };

  const evaluateGpuWorker = () => {
    const gpuNode = nodes.find((n) => n.name === 'taints-lab-worker2');
    const isGpuTainted = (gpuNode?.taints || []).some((t) => t.key === 'hardware');
    const toleratesGpu = scenario.tolerations.some(
      (t) => t.key === 'hardware' && t.value === 'gpu' && t.effect === 'NoSchedule'
    );

    if (isGpuTainted && !toleratesGpu) {
      return {
        passed: false,
        reason:
          scenario.id === 'ml-typo'
            ? "Rejected by Predicate: toleration typo 'hardware=gpus' does not match taint 'hardware=gpu:NoSchedule'"
            : 'Rejected by Predicate: untolerated taint hardware=gpu:NoSchedule',
      };
    }

    return {
      passed: true,
      reason: 'Passed Filtering: tolerates hardware=gpu:NoSchedule and matches nodeSelector',
    };
  };

  const cpResult = evaluateControlPlane();
  const workerResult = evaluateGeneralWorker();
  const gpuResult = evaluateGpuWorker();

  const getWinner = () => {
    if (scenario.id === 'ml-dedicated') {
      return {
        node: 'taints-lab-worker2',
        title: 'GPU Worker (taints-lab-worker2)',
        reason: 'Only node satisfying BOTH the toleration AND the nodeSelector {hardware: "gpu"}.',
      };
    }
    if (scenario.id === 'website') {
      return {
        node: 'taints-lab-worker',
        title: 'General Worker (taints-lab-worker)',
        reason: 'GPU worker repelled by taint; General worker accepts website freely.',
      };
    }
    if (scenario.id === 'ml-typo') {
      return {
        node: 'taints-lab-worker',
        title: 'General Worker (taints-lab-worker)',
        reason: 'Typo failed GPU taint match; General worker is the only eligible host.',
      };
    }
    // Toleration only
    return {
      node: 'taints-lab-worker / worker2',
      title: 'Spread across BOTH Workers (taints-lab-worker & worker2)',
      reason: 'Both nodes passed filtering! Scheduler scores them equally and balances replicas.',
    };
  };

  const winner = getWinner();

  return (
    <div className="space-y-6">
      {/* Intro Banner */}
      <div className="glass-panel p-4 rounded-xl border border-cyan-500/20 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
            <span>Kubernetes 2-Phase Scheduler Flow Simulator</span>
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-cyan-950/80 text-cyan-300 border border-cyan-500/40">
              Filtering & Scoring Engine
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-1 font-mono">
            Visualize how <code>kube-scheduler</code> inspects pod tolerations & nodeSelectors across every node in the cluster.
          </p>
        </div>

        <button
          onClick={handleRunSimulation}
          disabled={isSimulating}
          className="tactile-btn flex items-center gap-2 px-5 py-2.5 rounded-xl bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 border border-cyan-500/40 text-xs font-mono font-bold shadow-[0_0_20px_rgba(6,182,212,0.3)] disabled:opacity-50 cursor-pointer flex-shrink-0"
        >
          <Play className={`w-4 h-4 ${isSimulating ? 'animate-spin' : 'fill-current'}`} />
          <span>{isSimulating ? 'Simulating...' : 'Simulate Scheduling'}</span>
        </button>
      </div>

      {/* Step 1: Workload Selection Cards */}
      <div className="space-y-2">
        <label className="text-xs font-mono text-slate-400 uppercase tracking-wider block">
          1. Select Workload Spec to Schedule
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {SCENARIOS.map((item) => {
            const isSelected = selectedScenarioId === item.id;
            return (
              <div
                key={item.id}
                onClick={() => handleSelectScenario(item.id)}
                className={`tactile-btn p-3.5 rounded-xl border cursor-pointer transition-all ${
                  isSelected
                    ? 'bg-cyan-950/40 border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.25)]'
                    : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <h4 className="text-xs font-bold text-slate-100 font-mono truncate">{item.title}</h4>
                  <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 border border-slate-700">
                    {item.type}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 font-mono line-clamp-2 mt-1">
                  {item.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Simulation Flow Visualization */}
      <div className="glass-panel p-5 rounded-xl border border-slate-800 space-y-6">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-bold text-slate-100 font-mono">
              Simulation Pipeline for: <span className="text-cyan-300">{scenario.title}</span>
            </h3>
          </div>
          <span className="text-xs font-mono text-slate-400">
            {simulationStep === 0 && 'Ready to trace'}
            {simulationStep === 1 && 'Phase 1: Predicate Filtering...'}
            {simulationStep === 2 && 'Phase 2: Node Prioritization & Scoring...'}
            {simulationStep === 3 && 'Placement Decision Locked'}
          </span>
        </div>

        {/* Phase 1: Filtering Nodes */}
        <div className={`space-y-3 transition-opacity duration-300 ${simulationStep >= 1 ? 'opacity-100' : 'opacity-40'}`}>
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-cyan-950 border border-cyan-500/40 text-cyan-300 font-mono text-xs flex items-center justify-center font-bold">
              1
            </span>
            <span className="text-xs font-mono font-bold text-slate-200 uppercase tracking-wider">
              Phase 1: Filtering (Predicates) — Elimination of Unqualified Nodes
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Control Plane */}
            <div className={`p-3.5 rounded-xl border ${
              cpResult.passed ? 'bg-emerald-950/20 border-emerald-500/40' : 'bg-rose-950/20 border-rose-500/40'
            }`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5 font-mono text-xs font-bold text-slate-200">
                  <Shield className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Control Plane</span>
                </div>
                {cpResult.passed ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                ) : (
                  <XCircle className="w-4 h-4 text-rose-400" />
                )}
              </div>
              <p className="text-[11px] font-mono text-slate-400 leading-snug">
                {cpResult.reason}
              </p>
            </div>

            {/* General Worker */}
            <div className={`p-3.5 rounded-xl border ${
              workerResult.passed ? 'bg-emerald-950/20 border-emerald-500/40' : 'bg-rose-950/20 border-rose-500/40'
            }`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5 font-mono text-xs font-bold text-slate-200">
                  <Monitor className="w-3.5 h-3.5 text-cyan-400" />
                  <span>General Worker</span>
                </div>
                {workerResult.passed ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                ) : (
                  <XCircle className="w-4 h-4 text-rose-400" />
                )}
              </div>
              <p className="text-[11px] font-mono text-slate-400 leading-snug">
                {workerResult.reason}
              </p>
            </div>

            {/* GPU Worker */}
            <div className={`p-3.5 rounded-xl border ${
              gpuResult.passed ? 'bg-emerald-950/20 border-emerald-500/40' : 'bg-rose-950/20 border-rose-500/40'
            }`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5 font-mono text-xs font-bold text-slate-200">
                  <Cpu className="w-3.5 h-3.5 text-violet-400" />
                  <span>GPU Worker</span>
                </div>
                {gpuResult.passed ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                ) : (
                  <XCircle className="w-4 h-4 text-rose-400" />
                )}
              </div>
              <p className="text-[11px] font-mono text-slate-400 leading-snug">
                {gpuResult.reason}
              </p>
            </div>
          </div>
        </div>

        {/* Phase 2: Scoring & Placement */}
        <div className={`space-y-3 transition-opacity duration-300 ${simulationStep >= 2 ? 'opacity-100' : 'opacity-40'}`}>
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-violet-950 border border-violet-500/40 text-violet-300 font-mono text-xs flex items-center justify-center font-bold">
              2
            </span>
            <span className="text-xs font-mono font-bold text-slate-200 uppercase tracking-wider">
              Phase 2: Scoring & Priorities — Choosing the Best Qualified Node
            </span>
          </div>

          <div className="p-4 rounded-xl bg-[#04060a] border border-slate-800 text-xs font-mono text-slate-300 space-y-2">
            <p>
              • <strong>Candidate Nodes:</strong>{' '}
              {[workerResult.passed && 'taints-lab-worker', gpuResult.passed && 'taints-lab-worker2']
                .filter(Boolean)
                .join(', ') || 'None (Pod remains Pending)'}
            </p>
            <p>
              • <strong>Scoring Strategy:</strong> LeastRequestedPriority (spreading replicas) + NodeAffinityPriority.
            </p>
          </div>
        </div>

        {/* Winner Banner */}
        {simulationStep >= 3 && (
          <div className="p-5 rounded-xl bg-gradient-to-r from-emerald-950/40 via-cyan-950/30 to-violet-950/40 border border-emerald-500/50 shadow-[0_0_25px_rgba(16,185,129,0.25)] flex flex-col md:flex-row items-start md:items-center justify-between gap-4 animate-in zoom-in-95 duration-300">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400">
                <Trophy className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] font-mono text-emerald-400 font-bold uppercase tracking-wider">
                  Scheduling Decision Complete
                </span>
                <h4 className="text-base font-bold text-white font-mono">
                  {winner.title}
                </h4>
                <p className="text-xs text-slate-300 font-mono mt-0.5">
                  {winner.reason}
                </p>
              </div>
            </div>

            <div className="px-3 py-1.5 rounded-lg bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 font-mono text-xs font-bold flex-shrink-0">
              Placed & Bound
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
