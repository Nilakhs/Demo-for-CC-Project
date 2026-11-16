import React from 'react';
import { sound } from '../lib/sound';
import {
  RotateCw,
  Server,
  Terminal,
  Activity,
  GraduationCap,
  Download,
  Volume2,
  VolumeX,
  Zap,
} from 'lucide-react';

interface HeaderProps {
  contextName: string;
  namespace: string;
  isLive: boolean;
  isRefreshing: boolean;
  refreshInterval: number;
  progressPercent: number;
  soundEnabled: boolean;
  onToggleSound: () => void;
  onRefreshIntervalChange: (val: number) => void;
  onManualRefresh: () => void;
  onOpenLogs?: () => void;
  onOpenVivaGuide?: () => void;
  onOpenAutoPilot?: () => void;
  onExportReport?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  contextName,
  namespace,
  isLive,
  isRefreshing,
  refreshInterval,
  progressPercent,
  soundEnabled,
  onToggleSound,
  onRefreshIntervalChange,
  onManualRefresh,
  onOpenLogs,
  onOpenVivaGuide,
  onOpenAutoPilot,
  onExportReport,
}) => {
  const radius = 10;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progressPercent / 100) * circumference;

  return (
    <header className="sticky top-0 z-40 w-full bg-[#000000]/70 backdrop-blur-2xl border-b border-white/[0.08] px-4 lg:px-8 py-3">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        {/* Left: Logo and Titles (Fixed, non-wrapping) */}
        <div className="flex items-center gap-3 shrink-0 min-w-0">
          <div className="relative group shrink-0">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-600 via-violet-600 to-emerald-400 p-[1.5px] shadow-[0_0_15px_rgba(6,182,212,0.4)]">
              <div className="w-full h-full bg-[#000000] rounded-[10px] flex items-center justify-center">
                <Server className="w-4 h-4 text-cyan-400 group-hover:scale-110 transition-transform duration-300" />
              </div>
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border border-[#000000] animate-pulse" />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-sm sm:text-base font-bold tracking-tight text-white whitespace-nowrap">
                Cosmos Kubernetes Studio
              </h1>
              <span className="hidden xl:inline-flex text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/[0.04] border border-white/10 text-slate-300 font-medium whitespace-nowrap">
                K8S Problem 07 · Taints & Tolerations
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-mono mt-0.5 flex items-center gap-1.5 truncate">
              <span className="text-cyan-400 font-medium">GPU Scheduling Lab</span>
              <span>•</span>
              <span className="truncate">Cloud Computing Lab Evaluation 2</span>
            </p>
          </div>
        </div>

        {/* Right: Controls Bar (Strictly flex-nowrap shrink-0) */}
        <div className="flex items-center flex-nowrap shrink-0 gap-2">
          {/* Combined Compact Cluster Pill: 🟢 kind-taints-lab · gpu-lab */}
          <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/[0.03] border border-white/10 text-xs font-mono shrink-0">
            <span className="relative flex h-2 w-2">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${isLive ? 'bg-emerald-400' : 'bg-amber-400'} opacity-75`}></span>
              <span className={`relative inline-flex rounded-full h-2 w-2 ${isLive ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
            </span>
            <span className="text-slate-200 font-medium">{contextName}</span>
            <span className="text-slate-600">·</span>
            <span className="text-violet-300 font-medium">{namespace}</span>
          </div>

          {/* ⚡ Auto-Pilot Presentation Mode */}
          {onOpenAutoPilot && (
            <button
              onClick={() => {
                onOpenAutoPilot();
                sound.playClick();
              }}
              className="tactile-btn flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-cyan-500/20 via-violet-500/20 to-cyan-500/20 hover:from-cyan-500/30 hover:to-violet-500/30 text-cyan-200 border border-cyan-500/40 text-xs font-mono font-bold shadow-[0_0_15px_rgba(6,182,212,0.25)] cursor-pointer shrink-0 whitespace-nowrap"
              title="Launch Auto-Pilot Academic Presentation Tour"
            >
              <Zap className="w-3.5 h-3.5 text-cyan-300 fill-current shrink-0 animate-pulse" />
              <span>Auto-Pilot</span>
            </button>
          )}

          {/* 🎓 Viva Guide Button */}
          {onOpenVivaGuide && (
            <button
              onClick={() => {
                onOpenVivaGuide();
                sound.playClick();
              }}
              className="tactile-btn flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-violet-500/10 hover:bg-violet-500/20 text-violet-300 border border-violet-500/30 text-xs font-mono font-semibold shadow-[0_0_12px_rgba(139,92,246,0.15)] cursor-pointer shrink-0 whitespace-nowrap"
              title="Open Professor Viva Defense Guide & Questions"
            >
              <GraduationCap className="w-3.5 h-3.5 text-violet-400 shrink-0" />
              <span>Viva Guide</span>
            </button>
          )}

          {/* 📥 Export Report Button */}
          {onExportReport && (
            <button
              onClick={() => {
                onExportReport();
                sound.playSuccess();
              }}
              className="tactile-btn flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] text-slate-200 border border-white/10 text-xs font-mono cursor-pointer shrink-0 whitespace-nowrap"
              title="Export formatted Markdown/JSON cluster report"
            >
              <Download className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
              <span className="hidden sm:inline">Export</span>
            </button>
          )}

          {/* 🔊 Sound Effects Toggle */}
          <button
            onClick={onToggleSound}
            className={`tactile-btn p-1.5 rounded-xl border text-xs cursor-pointer transition-colors shrink-0 ${
              soundEnabled
                ? 'bg-white/[0.04] text-cyan-400 border-cyan-500/30'
                : 'bg-white/[0.02] text-slate-500 border-white/10'
            }`}
            title={soundEnabled ? 'Mute sound effects' : 'Enable sound effects'}
          >
            {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
          </button>

          {/* Auto-Refresh Control with Circular Indicator */}
          <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-white/[0.03] border border-white/10 text-xs shrink-0">
            <div className="relative w-4 h-4 flex items-center justify-center shrink-0">
              <svg className="w-4 h-4 -rotate-90 transform" viewBox="0 0 24 24">
                <circle
                  cx="12"
                  cy="12"
                  r={radius}
                  className="stroke-slate-800"
                  strokeWidth="2.5"
                  fill="transparent"
                />
                <circle
                  cx="12"
                  cy="12"
                  r={radius}
                  className="stroke-cyan-400 transition-all duration-300"
                  strokeWidth="2.5"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  fill="transparent"
                />
              </svg>
              <Activity className="w-2 h-2 text-cyan-400 absolute" />
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <span className="font-mono text-cyan-300 font-bold w-4 text-right text-[11px]">{refreshInterval}s</span>
              <input
                type="range"
                min="2"
                max="15"
                step="1"
                value={refreshInterval}
                onChange={(e) => onRefreshIntervalChange(Number(e.target.value))}
                className="w-12 h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400 shrink-0"
                title={`Auto-refresh interval: ${refreshInterval}s`}
              />
            </div>
          </div>

          {/* Refresh Button */}
          <button
            onClick={() => {
              onManualRefresh();
              sound.playClick();
            }}
            disabled={isRefreshing}
            className="tactile-btn flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-xs font-mono font-medium shadow-[0_0_12px_rgba(6,182,212,0.15)] disabled:opacity-50 cursor-pointer shrink-0 whitespace-nowrap"
            title="Force immediate cluster state refresh"
          >
            <RotateCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-cyan-300' : ''}`} />
            <span>Sync</span>
          </button>

          {/* Command Logs trigger button */}
          {onOpenLogs && (
            <button
              onClick={() => {
                onOpenLogs();
                sound.playClick();
              }}
              className="tactile-btn flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] text-slate-300 border border-white/10 text-xs font-mono cursor-pointer shrink-0 whitespace-nowrap"
              title="View kubectl Command Logs"
            >
              <Terminal className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>Logs</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
