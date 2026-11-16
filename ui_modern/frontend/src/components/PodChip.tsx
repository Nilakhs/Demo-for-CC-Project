import React from 'react';
import type { PodInfo } from '../types';
import { APP_COLORS } from '../lib/k8s-rules';
import { HelpCircle, Terminal } from 'lucide-react';

interface PodChipProps {
  pod: PodInfo;
  onClick: (pod: PodInfo) => void;
  onViewLogs?: (pod: PodInfo) => void;
}

export const PodChip: React.FC<PodChipProps> = ({ pod, onClick, onViewLogs }) => {
  const appStyle = APP_COLORS[pod.app] || {
    bg: 'bg-slate-900/60',
    border: 'border-slate-700',
    text: 'text-slate-300',
    glow: '',
    hex: '#94a3b8',
  };

  const isTerminating = Boolean(pod.deletionTimestamp) || pod.phase === 'Terminating';
  const isPending = !pod.nodeName || pod.phase === 'Pending';
  const isRunning = !isTerminating && !isPending && pod.phase === 'Running';

  const hasTolerations = (pod.tolerations || []).length > 0;
  const hasSelector = Object.keys(pod.nodeSelector || {}).length > 0;

  const handleLogsClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onViewLogs) {
      onViewLogs(pod);
    }
  };

  return (
    <div
      onClick={() => onClick(pod)}
      className={`tactile-btn group relative flex flex-col justify-between p-2.5 rounded-lg border cursor-pointer transition-all duration-200 select-none ${
        appStyle.bg
      } ${appStyle.border} ${appStyle.glow} hover:border-cyan-400 hover:scale-[1.01] hover:shadow-[0_0_15px_rgba(6,182,212,0.25)]`}
      title="Click to inspect scheduling verdict: 'Why is this Pod here?'"
    >
      {/* Top row: Name & Phase Indicator */}
      <div className="flex items-center justify-between gap-1.5 mb-1.5">
        <div className="flex items-center gap-1.5 overflow-hidden">
          {/* Phase Dot */}
          <span className="relative flex h-2 w-2 flex-shrink-0">
            {isRunning && (
              <>
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </>
            )}
            {isTerminating && (
              <>
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-500 opacity-80"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-600"></span>
              </>
            )}
            {isPending && (
              <>
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
              </>
            )}
          </span>

          <span className="font-mono text-xs font-semibold text-slate-100 truncate tracking-tight group-hover:text-cyan-300 transition-colors">
            {pod.name}
          </span>
        </div>

        <div className="flex items-center gap-1 flex-shrink-0">
          {/* Pod Logs Button */}
          {onViewLogs && (
            <button
              onClick={handleLogsClick}
              className="p-1 rounded bg-slate-900/80 hover:bg-cyan-950 text-slate-400 hover:text-cyan-300 border border-slate-700/80 hover:border-cyan-500/40 transition-colors"
              title="Stream Pod Logs (kubectl logs)"
            >
              <Terminal className="w-3 h-3" />
            </button>
          )}

          {/* Quick Inspector Trigger Icon */}
          <span className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded text-cyan-300 hover:bg-cyan-500/20">
            <HelpCircle className="w-3.5 h-3.5" />
          </span>
        </div>
      </div>

      {/* Sub row: App tag, phase badge, and badges for toleration/selector */}
      <div className="flex flex-wrap items-center justify-between gap-1 text-[10px] font-mono mt-0.5">
        <div className="flex items-center gap-1">
          <span
            className="px-1.5 py-0.2 rounded font-medium border"
            style={{
              backgroundColor: `${appStyle.hex}15`,
              borderColor: `${appStyle.hex}40`,
              color: appStyle.hex,
            }}
          >
            {pod.app}
          </span>

          {pod.ready && (
            <span className="text-slate-400 bg-slate-900/60 px-1 py-0.2 rounded border border-slate-800">
              {pod.ready}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1">
          {hasSelector && (
            <span className="text-cyan-300 bg-cyan-950/70 border border-cyan-500/40 px-1 py-0.2 rounded text-[9px]" title="Has nodeSelector constraint">
              🎯 selector
            </span>
          )}

          {hasTolerations && (
            <span className="text-violet-300 bg-violet-950/70 border border-violet-500/40 px-1 py-0.2 rounded text-[9px]" title="Has custom tolerations">
              🛡️ tol
            </span>
          )}

          <span
            className={`px-1.5 py-0.2 rounded uppercase font-semibold ${
              isRunning
                ? 'text-emerald-400 bg-emerald-950/50 border border-emerald-500/30'
                : isTerminating
                ? 'text-rose-400 bg-rose-950/50 border border-rose-500/30 animate-pulse'
                : 'text-amber-400 bg-amber-950/50 border border-amber-500/30'
            }`}
          >
            {isTerminating ? 'Terminating' : pod.phase}
          </span>
        </div>
      </div>
    </div>
  );
};
