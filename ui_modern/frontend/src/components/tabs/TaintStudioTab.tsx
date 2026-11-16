import React, { useState, useEffect } from 'react';
import type { NodeInfo, TaintEffect } from '../../types';
import { taintToString, EFFECT_CONFIG } from '../../lib/k8s-rules';
import {
  Ban,
  Plus,
  Minus,
  Terminal,
  Server,
  Shield,
  Trash2,
  HelpCircle,
  CheckCircle2,
} from 'lucide-react';

interface TaintStudioTabProps {
  nodes: NodeInfo[];
  onAddTaint: (node: string, key: string, value: string, effect: TaintEffect) => Promise<void>;
  onRemoveTaint: (node: string, key: string, effect?: string) => Promise<void>;
  isRunningAction: boolean;
}

const DEFAULT_VALUES: Record<string, string> = {
  hardware: 'gpu',
  maintenance: 'true',
  'gpu-fault': 'true',
};

export const TaintStudioTab: React.FC<TaintStudioTabProps> = ({
  nodes,
  onAddTaint,
  onRemoveTaint,
  isRunningAction,
}) => {
  const [selectedNode, setSelectedNode] = useState<string>('taints-lab-worker2');
  const [selectedKey, setSelectedKey] = useState<string>('hardware');
  const [customKey, setCustomKey] = useState<string>('');
  const [value, setValue] = useState<string>('gpu');
  const [effect, setEffect] = useState<TaintEffect>('NoSchedule');
  const [isAdding, setIsAdding] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);

  // Update default value when key changes
  useEffect(() => {
    if (selectedKey !== 'custom' && DEFAULT_VALUES[selectedKey]) {
      setValue(DEFAULT_VALUES[selectedKey]);
    }
  }, [selectedKey]);

  const activeKey = selectedKey === 'custom' ? customKey : selectedKey;
  const commandAdd = `kubectl taint nodes ${selectedNode} ${activeKey}${value ? `=${value}` : ''}:${effect} --overwrite`;
  const commandRemove = `kubectl taint nodes ${selectedNode} ${activeKey}:${effect}-`;

  const currentNode = nodes.find((n) => n.name === selectedNode);
  const currentTaints = currentNode?.taints || [];

  const handleAdd = async () => {
    if (!activeKey) return;
    setIsAdding(true);
    try {
      await onAddTaint(selectedNode, activeKey, value, effect);
    } finally {
      setIsAdding(false);
    }
  };

  const handleRemove = async (tKey?: string, tEffect?: string) => {
    const k = tKey || activeKey;
    if (!k) return;
    setIsRemoving(true);
    try {
      await onRemoveTaint(selectedNode, k, tEffect || effect);
    } finally {
      setIsRemoving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Studio Banner */}
      <div className="rounded-2xl bg-slate-900/40 backdrop-blur-xl border border-white/10 p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-white font-mono flex items-center gap-2">
            <span>Taint Policy Studio</span>
            <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-red-950/80 text-red-300 border border-red-500/30">
              worker nodes
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-1 font-mono">
            Apply or purge node taints in real-time. Observe how the Kubernetes scheduler and eviction controller react.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Form: Taint Configurator (7 cols) */}
        <div className="lg:col-span-7 rounded-2xl bg-slate-900/40 backdrop-blur-xl border border-white/10 p-5 space-y-5">
          {/* 1. Target Node Selector */}
          <div>
            <label className="text-xs font-mono text-slate-400 uppercase tracking-wider block mb-2">
              1. Select Target Worker Node
            </label>
            <div className="grid grid-cols-2 gap-3">
              {[
                { name: 'taints-lab-worker', label: 'General Worker', role: '🖥️ general-purpose' },
                { name: 'taints-lab-worker2', label: 'GPU Worker', role: '🎮 reserved GPU' },
              ].map((worker) => (
                <button
                  key={worker.name}
                  onClick={() => setSelectedNode(worker.name)}
                  className={`tactile-btn p-3 rounded-xl border text-left cursor-pointer transition-all ${
                    selectedNode === worker.name
                      ? 'bg-cyan-950/40 border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.25)]'
                      : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-slate-100">{worker.label}</span>
                    <Server className={`w-3.5 h-3.5 ${selectedNode === worker.name ? 'text-cyan-400' : 'text-slate-500'}`} />
                  </div>
                  <span className="text-[11px] font-mono text-slate-400 block truncate">
                    {worker.name}
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono mt-1 block">
                    {worker.role}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* 2. Key Selector */}
          <div>
            <label className="text-xs font-mono text-slate-400 uppercase tracking-wider block mb-2">
              2. Taint Key
            </label>
            <div className="grid grid-cols-4 gap-2 mb-2">
              {['hardware', 'maintenance', 'gpu-fault', 'custom'].map((k) => (
                <button
                  key={k}
                  onClick={() => setSelectedKey(k)}
                  className={`tactile-btn py-1.5 px-2 rounded-lg font-mono text-xs border text-center cursor-pointer transition-all ${
                    selectedKey === k
                      ? 'bg-violet-950/60 border-violet-400 text-violet-300 font-bold shadow-[0_0_10px_rgba(139,92,246,0.25)]'
                      : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  {k}
                </button>
              ))}
            </div>

            {selectedKey === 'custom' && (
              <input
                type="text"
                placeholder="Enter custom taint key (e.g. dedicated)"
                value={customKey}
                onChange={(e) => setCustomKey(e.target.value)}
                className="w-full bg-[#04060a] border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-slate-100 placeholder-slate-600 focus:outline-none focus:border-violet-500"
              />
            )}
          </div>

          {/* 3. Taint Value */}
          <div>
            <label className="text-xs font-mono text-slate-400 uppercase tracking-wider block mb-2">
              3. Taint Value (optional)
            </label>
            <input
              type="text"
              placeholder="e.g. gpu, true (or leave blank)"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="w-full bg-[#04060a] border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-slate-100 placeholder-slate-600 focus:outline-none focus:border-cyan-500"
            />
          </div>

          {/* 4. Effect Selector */}
          <div>
            <label className="text-xs font-mono text-slate-400 uppercase tracking-wider block mb-2">
              4. Taint Effect
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {(['NoSchedule', 'PreferNoSchedule', 'NoExecute'] as TaintEffect[]).map((eff) => {
                const effStyle = EFFECT_CONFIG[eff];
                const isChosen = effect === eff;
                return (
                  <button
                    key={eff}
                    onClick={() => setEffect(eff)}
                    className={`tactile-btn p-2.5 rounded-lg border text-left cursor-pointer transition-all ${
                      isChosen
                        ? `${effStyle.bg} ${effStyle.border} ${effStyle.text} font-bold shadow-md`
                        : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 mb-1">
                      <Ban className="w-3.5 h-3.5" />
                      <span className="text-xs font-mono">{eff}</span>
                    </div>
                    <span className="text-[10px] text-slate-400 block font-sans">
                      {eff === 'NoSchedule' && 'Rejects new pods without toleration'}
                      {eff === 'PreferNoSchedule' && 'Soft preference (avoids node if possible)'}
                      {eff === 'NoExecute' && 'Evicts running pods + rejects new'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* CLI Preview Box */}
          <div className="p-3 rounded-lg bg-[#04060a] border border-slate-800/80 space-y-2">
            <div>
              <div className="flex items-center gap-1.5 text-[11px] font-mono text-slate-400 mb-0.5">
                <Terminal className="w-3.5 h-3.5 text-cyan-400" />
                <span>Command to Apply Taint:</span>
              </div>
              <code className="text-[11px] font-mono text-cyan-300 block break-all">
                {commandAdd}
              </code>
            </div>
            <div>
              <div className="flex items-center gap-1.5 text-[11px] font-mono text-slate-400 mb-0.5">
                <Terminal className="w-3.5 h-3.5 text-rose-400" />
                <span>Command to Remove Taint:</span>
              </div>
              <code className="text-[11px] font-mono text-rose-300 block break-all">
                {commandRemove}
              </code>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <button
              onClick={handleAdd}
              disabled={isRunningAction || !activeKey}
              className="tactile-btn flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 border border-cyan-500/40 text-xs font-mono font-bold shadow-[0_0_15px_rgba(6,182,212,0.25)] disabled:opacity-50 cursor-pointer"
            >
              <Plus className={`w-4 h-4 ${isAdding ? 'animate-spin' : ''}`} />
              <span>{isAdding ? 'Applying...' : 'Apply Taint'}</span>
            </button>

            <button
              onClick={() => handleRemove()}
              disabled={isRunningAction || !activeKey}
              className="tactile-btn flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/40 text-xs font-mono font-bold disabled:opacity-50 cursor-pointer"
            >
              <Minus className={`w-4 h-4 ${isRemoving ? 'animate-spin' : ''}`} />
              <span>{isRemoving ? 'Removing...' : 'Remove Taint'}</span>
            </button>
          </div>
        </div>

        {/* Right Panel: Current Node Taints Inspector (5 cols) */}
        <div className="lg:col-span-5 rounded-2xl bg-slate-900/40 backdrop-blur-xl border border-white/10 p-5 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-100 font-mono flex items-center gap-2">
                  <Shield className="w-4 h-4 text-cyan-400" />
                  <span>Active Taints on {selectedNode}</span>
                </h3>
                <span className="text-[11px] text-slate-400 font-mono">
                  {currentTaints.length} taint(s) currently guarding this node
                </span>
              </div>
            </div>

            <div className="space-y-2.5">
              {currentTaints.length === 0 ? (
                <div className="p-6 text-center rounded-xl bg-slate-900/30 border border-slate-800/80">
                  <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2 opacity-80" />
                  <p className="text-xs font-mono text-emerald-400 font-semibold">
                    No active taints
                  </p>
                  <p className="text-[11px] text-slate-500 font-mono mt-1">
                    This node is open to every pod with matching resource requirements and nodeSelectors.
                  </p>
                </div>
              ) : (
                currentTaints.map((t, idx) => {
                  const effectStyle = EFFECT_CONFIG[t.effect] || EFFECT_CONFIG.NoSchedule;
                  return (
                    <div
                      key={idx}
                      className={`p-3 rounded-xl border flex items-center justify-between gap-3 ${effectStyle.bg} ${effectStyle.border}`}
                    >
                      <div>
                        <div className="flex items-center gap-1.5 font-mono text-xs font-bold text-slate-100">
                          <Ban className={`w-3.5 h-3.5 ${effectStyle.text}`} />
                          <span>{taintToString(t)}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-1 text-[10px] font-mono text-slate-400">
                          <span>Key: <strong className="text-slate-300">{t.key}</strong></span>
                          <span>•</span>
                          <span>Effect: <strong className={effectStyle.text}>{t.effect}</strong></span>
                        </div>
                      </div>

                      <button
                        onClick={() => handleRemove(t.key, t.effect)}
                        disabled={isRunningAction}
                        className="tactile-btn p-1.5 rounded-lg bg-slate-900/80 hover:bg-rose-950 text-slate-400 hover:text-rose-300 border border-slate-700 hover:border-rose-500/40 text-xs cursor-pointer"
                        title="Remove this specific taint"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Quick tips */}
          <div className="p-3 rounded-lg bg-slate-900/50 border border-slate-800 text-[11px] text-slate-400 space-y-1 font-mono">
            <p className="text-slate-300 font-semibold flex items-center gap-1">
              <HelpCircle className="w-3.5 h-3.5 text-cyan-400" />
              <span>Kubernetes Rule Reminder</span>
            </p>
            <p>• <strong>NoSchedule:</strong> Blocks new pods; leaves existing pods running.</p>
            <p>• <strong>NoExecute:</strong> Immediately evicts running pods unless they have toleration.</p>
          </div>
        </div>
      </div>
    </div>
  );
};
