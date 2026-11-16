import React, { useState } from 'react';
import { WORKLOAD_TEMPLATES } from '../../data/workloads';
import type { WorkloadDefinition } from '../../types';
import { sound } from '../../lib/sound';
import {
  Rocket,
  Trash2,
  FileCode,
  AlertOctagon,
  Cpu,
  Layers,
  Flame,
} from 'lucide-react';

interface WorkloadsTabProps {
  onDeploy: (file: string) => Promise<void>;
  onDelete: (file: string) => Promise<void>;
  onDeleteAll: () => Promise<void>;
  onViewYaml: (workload: WorkloadDefinition) => void;
  isRunningAction: boolean;
}

export const WorkloadsTab: React.FC<WorkloadsTabProps> = ({
  onDeploy,
  onDelete,
  onDeleteAll,
  onViewYaml,
  isRunningAction,
}) => {
  const [loadingAction, setLoadingAction] = useState<string | null>(null);

  const handleDeploy = async (file: string) => {
    setLoadingAction(`deploy-${file}`);
    sound.playClick();
    try {
      await onDeploy(file);
      sound.playSuccess();
    } finally {
      setLoadingAction(null);
    }
  };

  const handleDelete = async (file: string) => {
    setLoadingAction(`delete-${file}`);
    sound.playClick();
    try {
      await onDelete(file);
      sound.playClick();
    } finally {
      setLoadingAction(null);
    }
  };

  const handleDeleteAll = async () => {
    setLoadingAction('delete-all');
    sound.playWarning();
    try {
      await onDeleteAll();
      sound.playSuccess();
    } finally {
      setLoadingAction(null);
    }
  };

  const getWorkloadIcon = (id: string) => {
    switch (id) {
      case 'website':
        return <Layers className="w-5 h-5 text-blue-400" />;
      case 'ml-training-dedicated':
        return <Cpu className="w-5 h-5 text-emerald-400" />;
      case 'gpu-fault-pods':
        return <Flame className="w-5 h-5 text-pink-400" />;
      case 'ml-training-typo':
        return <AlertOctagon className="w-5 h-5 text-rose-400" />;
      default:
        return <Cpu className="w-5 h-5 text-purple-400" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header action bar */}
      <div className="rounded-2xl bg-slate-900/40 backdrop-blur-xl border border-white/10 p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-white font-mono flex items-center gap-2">
            <span>Workload Fleet Management</span>
            <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-violet-950/80 text-violet-300 border border-violet-500/30">
              namespace: gpu-lab
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-1 font-mono">
            Deploy standard web applications, tolerant ML training models, misconfigured tests, or fault-injection probe pods.
          </p>
        </div>

        <button
          onClick={handleDeleteAll}
          disabled={isRunningAction}
          className="tactile-btn flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-500/40 text-xs font-mono font-bold cursor-pointer disabled:opacity-50 flex-shrink-0"
          title="Delete all pods and deployments in namespace gpu-lab"
        >
          <Trash2 className={`w-3.5 h-3.5 ${loadingAction === 'delete-all' ? 'animate-spin' : ''}`} />
          <span>Purge All Workloads</span>
        </button>
      </div>

      {/* Workload Cards Grid */}
      <div className="grid grid-cols-1 gap-4">
        {WORKLOAD_TEMPLATES.map((w) => {
          const isDeploying = loadingAction === `deploy-${w.file}`;
          const isDeleting = loadingAction === `delete-${w.file}`;

          return (
            <div
              key={w.id}
              className="rounded-2xl bg-slate-900/40 backdrop-blur-xl border border-white/10 hover:border-white/20 p-5 transition-all duration-300 shadow-lg"
            >
              <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                {/* Left: Metadata */}
                <div className="flex items-start gap-4 flex-1">
                  <div className="w-11 h-11 rounded-2xl bg-[#030712] border border-white/10 flex items-center justify-center flex-shrink-0 mt-0.5 shadow-md">
                    {getWorkloadIcon(w.id)}
                  </div>

                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm font-bold text-white font-mono">
                        {w.title}
                      </h3>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-cyan-300 border border-cyan-500/30">
                        k8s/{w.file}
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800/80 text-slate-400 border border-slate-700">
                        {w.badge}
                      </span>
                    </div>

                    <p className="text-xs text-slate-300 leading-relaxed">
                      {w.description}
                    </p>

                    <p className="text-[11px] text-slate-400 font-mono">
                      🎯 <span className="text-slate-300 font-medium">Expected Scheduling:</span> {w.expectedBehavior}
                    </p>
                  </div>
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-2.5 w-full lg:w-auto justify-end flex-shrink-0 pt-3 lg:pt-0 border-t lg:border-t-0 border-white/10">
                  {/* View YAML button */}
                  <button
                    onClick={() => {
                      sound.playClick();
                      onViewYaml(w);
                    }}
                    className="tactile-btn flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-mono cursor-pointer"
                    title="Inspect manifest YAML"
                  >
                    <FileCode className="w-3.5 h-3.5 text-cyan-400" />
                    <span>YAML</span>
                  </button>

                  {/* Deploy button */}
                  <button
                    onClick={() => handleDeploy(w.file)}
                    disabled={isRunningAction}
                    className="tactile-btn flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 text-xs font-mono font-bold shadow-[0_0_15px_rgba(16,185,129,0.2)] hover:shadow-[0_0_20px_rgba(16,185,129,0.35)] disabled:opacity-50 cursor-pointer"
                  >
                    <Rocket className={`w-3.5 h-3.5 ${isDeploying ? 'animate-bounce' : ''}`} />
                    <span>{isDeploying ? 'Deploying...' : 'Deploy'}</span>
                  </button>

                  {/* Delete button */}
                  <button
                    onClick={() => handleDelete(w.file)}
                    disabled={isRunningAction}
                    className="tactile-btn flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/40 text-xs font-mono disabled:opacity-50 cursor-pointer"
                  >
                    <Trash2 className={`w-3.5 h-3.5 ${isDeleting ? 'animate-spin' : ''}`} />
                    <span>{isDeleting ? 'Deleting...' : 'Delete'}</span>
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
