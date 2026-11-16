import React, { useState, useEffect, useRef } from 'react';
import type { PodInfo } from '../types';
import { api } from '../services/api';
import { sound } from '../lib/sound';
import {
  X,
  Terminal,
  Copy,
  Check,
  RotateCw,
  Search,
  Radio,
  Cpu,
} from 'lucide-react';

interface PodLogsModalProps {
  pod: PodInfo | null;
  onClose: () => void;
}

export const PodLogsModal: React.FC<PodLogsModalProps> = ({ pod, onClose }) => {
  const [logs, setLogs] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [autoTail, setAutoTail] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const logEndRef = useRef<HTMLDivElement>(null);

  const fetchLogs = async () => {
    if (!pod) return;
    setLoading(true);
    try {
      const data = await api.getPodLogs(pod.name);
      setLogs(data);
    } catch {
      // keep existing
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (pod) {
      fetchLogs();
      sound.playClick();
    }
  }, [pod]);

  useEffect(() => {
    if (autoTail && logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, autoTail]);

  // Periodic poll if autoTail is on
  useEffect(() => {
    if (!autoTail || !pod) return;
    const interval = setInterval(() => {
      fetchLogs();
    }, 4000);
    return () => clearInterval(interval);
  }, [autoTail, pod]);

  if (!pod) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(logs.join('\n'));
    setCopied(true);
    sound.playSuccess();
    setTimeout(() => setCopied(false), 2000);
  };

  const filteredLogs = searchQuery
    ? logs.filter((line) => line.toLowerCase().includes(searchQuery.toLowerCase()))
    : logs;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="glass-panel w-full max-w-4xl rounded-2xl border border-cyan-500/40 overflow-hidden shadow-2xl flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Terminal Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-6 py-4 bg-slate-900/95 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
              <Terminal className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-cyan-400 font-bold uppercase tracking-wider">
                  {pod.phase === 'Pending' || !pod.nodeName
                    ? 'Waiting for Pod to schedule...'
                    : 'Live Container Stream (stdout/stderr)'}
                </span>
                <span className="text-[10px] font-mono px-2 py-0.2 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                  {pod.app}
                </span>
                <span
                  className={`text-[10px] font-mono px-2 py-0.2 rounded-full border flex items-center gap-1 ${
                    pod.phase === 'Pending' || !pod.nodeName
                      ? 'bg-amber-950/70 border-amber-500/40 text-amber-300'
                      : 'bg-emerald-950/70 border-emerald-500/40 text-emerald-300'
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      pod.phase === 'Pending' || !pod.nodeName
                        ? 'bg-amber-400 animate-pulse'
                        : 'bg-emerald-400 animate-ping'
                    }`}
                  />
                  <span>{pod.phase}</span>
                </span>
              </div>
              <h3 className="text-sm font-bold text-slate-100 font-mono mt-0.5">
                {pod.name}
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            {/* Auto Tail Toggle */}
            <button
              onClick={() => setAutoTail(!autoTail)}
              className={`tactile-btn flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-mono transition-all cursor-pointer ${
                autoTail
                  ? 'bg-cyan-950/70 border-cyan-400 text-cyan-300 shadow-[0_0_10px_rgba(6,182,212,0.3)]'
                  : 'bg-slate-800 border-slate-700 text-slate-400'
              }`}
              title="Auto-scroll to latest log entries"
            >
              <Radio className={`w-3.5 h-3.5 ${autoTail ? 'animate-pulse text-cyan-400' : ''}`} />
              <span>Tail -f</span>
            </button>

            {/* Manual Refresh */}
            <button
              onClick={() => {
                fetchLogs();
                sound.playClick();
              }}
              disabled={loading}
              className="tactile-btn p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 cursor-pointer disabled:opacity-50"
              title="Refresh logs"
            >
              <RotateCw className={`w-4 h-4 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
            </button>

            {/* Copy Logs */}
            <button
              onClick={handleCopy}
              className="tactile-btn flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono border border-slate-700 cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400 font-semibold">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Copy</span>
                </>
              )}
            </button>

            {/* Close */}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 cursor-pointer transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Search & Metadata Bar */}
        <div className="px-6 py-2 bg-slate-950/80 border-b border-slate-800/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs font-mono text-slate-400">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <Cpu className="w-3.5 h-3.5 text-violet-400" />
              <span>Node: <strong className="text-slate-200">{pod.nodeName || 'Pending'}</strong></span>
            </span>
            <span>•</span>
            <span className="text-slate-400">Namespace: <strong className="text-slate-200">gpu-lab</strong></span>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search in log lines..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#04060a] border border-slate-800 rounded-lg pl-8 pr-2.5 py-1 text-xs font-mono text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500"
            />
          </div>
        </div>

        {/* Terminal Window Body */}
        <div className="p-4 overflow-y-auto bg-[#04060a] font-mono text-xs text-slate-200 space-y-1 flex-1 min-h-[300px]">
          {filteredLogs.length === 0 ? (
            <div className="py-12 text-center text-slate-500 font-mono">
              {loading
                ? 'Fetching container log buffer...'
                : pod.phase === 'Pending' || !pod.nodeName
                ? 'Waiting for Pod to schedule... No container logs available until the Pod is placed on a node.'
                : 'No logs recorded or matching query.'}
            </div>
          ) : (
            filteredLogs.map((line, idx) => {
              const isAlert = line.includes('[ALERT]') || line.includes('SIGTERM');
              const isWarning = line.includes('[WARN]') || line.includes('warning');
              const isEpoch = line.includes('epoch');
              const isGpu = line.includes('GPU');

              return (
                <div key={idx} className="flex hover:bg-slate-900/60 py-0.5 px-1 rounded transition-colors group">
                  <span className="w-10 text-right pr-4 text-slate-600 select-none flex-shrink-0 group-hover:text-slate-400">
                    {idx + 1}
                  </span>
                  <span
                    className={`whitespace-pre-wrap break-all ${
                      isAlert
                        ? 'text-rose-400 font-bold bg-rose-950/20 px-1 rounded'
                        : isWarning
                        ? 'text-amber-400'
                        : isEpoch
                        ? 'text-violet-300 font-medium'
                        : isGpu
                        ? 'text-emerald-300 font-medium'
                        : 'text-slate-300'
                    }`}
                  >
                    {line}
                  </span>
                </div>
              );
            })
          )}
          <div ref={logEndRef} />
        </div>

        {/* Terminal Footer */}
        <div className="px-6 py-2.5 bg-slate-900/90 border-t border-slate-800 flex items-center justify-between text-[11px] font-mono text-slate-400">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
            <span>Process Status: Active stdout piped via kubectl logs</span>
          </div>
          <span>{filteredLogs.length} lines logged</span>
        </div>
      </div>
    </div>
  );
};
