import React, { useState } from 'react';
import type { CommandLogEntry, K8sEvent } from '../../types';
import {
  Activity,
  Terminal,
  Search,
  CheckCircle2,
  XCircle,
  Copy,
} from 'lucide-react';

interface EventsAuditLogTabProps {
  events: K8sEvent[];
  logs: CommandLogEntry[];
}

export const EventsAuditLogTab: React.FC<EventsAuditLogTabProps> = ({ events, logs }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'Normal' | 'Warning'>('ALL');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const filteredEvents = events.filter((e) => {
    const matchesSearch =
      e.object.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.reason.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === 'ALL' || e.type === typeFilter;
    return matchesSearch && matchesType;
  });

  const getReasonBadge = (reason: string) => {
    switch (reason) {
      case 'Scheduled':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-950/70 border border-emerald-500/40 text-emerald-300">
            Scheduled
          </span>
        );
      case 'FailedScheduling':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-950/70 border border-amber-500/40 text-amber-300">
            FailedScheduling
          </span>
        );
      case 'TaintManagerEviction':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-purple-950/70 border border-purple-500/40 text-purple-300">
            TaintManagerEviction
          </span>
        );
      case 'Killing':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-rose-950/70 border border-rose-500/40 text-rose-300">
            Killing
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-300 border border-slate-700">
            {reason}
          </span>
        );
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-8">
      {/* 1. Live K8s Events Stream */}
      <div className="space-y-4">
        <div className="rounded-2xl bg-slate-900/40 backdrop-blur-xl p-5 border border-white/10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-white font-mono flex items-center gap-2">
              <Activity className="w-4 h-4 text-cyan-400" />
              <span>Kubernetes Scheduling Events</span>
              <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-cyan-950/80 text-cyan-300 border border-cyan-500/30">
                {filteredEvents.length} events
              </span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5 font-mono">
              Live audit stream captured from namespace <code>gpu-lab</code>
            </p>
          </div>

          {/* Search & Filters */}
          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            <div className="relative flex-1 md:w-60">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search pod or reason..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-[#030712] border border-white/10 rounded-xl pl-8 pr-3 py-1.5 text-xs font-mono text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div className="flex items-center gap-1 bg-[#030712] p-1 rounded-xl border border-white/10 text-xs font-mono">
              {(['ALL', 'Normal', 'Warning'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTypeFilter(t)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] cursor-pointer transition-all ${
                    typeFilter === t
                      ? 'bg-cyan-600/30 text-cyan-300 font-bold border border-cyan-500/40'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Events Table Container */}
        <div className="rounded-2xl bg-slate-900/40 backdrop-blur-xl border border-white/10 overflow-hidden">
          <div className="overflow-x-auto max-h-[380px]">
            <table className="w-full text-left border-collapse text-xs font-mono">
              <thead className="bg-[#04060a]/90 text-slate-400 uppercase text-[10px] tracking-wider sticky top-0 z-10 border-b border-slate-800">
                <tr>
                  <th className="py-2.5 px-4">Last Seen</th>
                  <th className="py-2.5 px-4">Type</th>
                  <th className="py-2.5 px-4">Reason</th>
                  <th className="py-2.5 px-4">Involved Object</th>
                  <th className="py-2.5 px-4">Message</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredEvents.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-500 font-mono">
                      No events matching query. Deploy workloads or trigger steps to see live events.
                    </td>
                  </tr>
                ) : (
                  filteredEvents.map((evt, idx) => (
                    <tr
                      key={evt.id || idx}
                      className="hover:bg-slate-800/30 transition-colors"
                    >
                      <td className="py-2.5 px-4 text-slate-400 whitespace-nowrap text-[11px]">
                        {evt.lastTimestamp ? new Date(evt.lastTimestamp).toLocaleTimeString() : 'Just now'}
                      </td>
                      <td className="py-2.5 px-4 whitespace-nowrap">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            evt.type === 'Warning'
                              ? 'bg-amber-950 text-amber-400 border border-amber-500/30'
                              : 'bg-slate-800 text-slate-300'
                          }`}
                        >
                          {evt.type}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 whitespace-nowrap">
                        {getReasonBadge(evt.reason)}
                      </td>
                      <td className="py-2.5 px-4 font-bold text-slate-200 whitespace-nowrap">
                        {evt.object}
                      </td>
                      <td className="py-2.5 px-4 text-slate-300 leading-relaxed max-w-md truncate hover:whitespace-normal">
                        {evt.message}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* 2. Terminal-Style Command Execution Audit Log */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-bold text-slate-100 font-mono">
              Underlying Kubectl Command Audit Log
            </h3>
          </div>
          <span className="text-xs text-slate-400 font-mono">
            {logs.length} executed operations
          </span>
        </div>

        <div className="rounded-xl border border-slate-800 bg-[#04060a] overflow-hidden shadow-2xl">
          {/* Terminal Window Header */}
          <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900/90 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-rose-500/80 inline-block" />
              <span className="w-3 h-3 rounded-full bg-amber-500/80 inline-block" />
              <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block" />
              <span className="text-xs font-mono text-slate-400 ml-2">bash - kubectl session</span>
            </div>
            <span className="text-[10px] font-mono text-slate-500">context: kind-taints-lab</span>
          </div>

          {/* Terminal Body */}
          <div className="p-4 space-y-4 max-h-[340px] overflow-y-auto font-mono text-xs">
            {logs.length === 0 ? (
              <div className="text-slate-600 text-center py-6">
                No commands executed in this session yet.
              </div>
            ) : (
              logs.map((entry) => (
                <div key={entry.id} className="space-y-1 group">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {entry.exitCode === 0 ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                      ) : (
                        <XCircle className="w-3.5 h-3.5 text-rose-400 flex-shrink-0" />
                      )}
                      <span className="text-slate-400 font-semibold">{entry.label}</span>
                      <span className="text-slate-600 text-[10px]">[{entry.timestamp}]</span>
                    </div>

                    <button
                      onClick={() => copyToClipboard(entry.command, entry.id)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 text-[10px] text-slate-400 hover:text-cyan-300 cursor-pointer"
                      title="Copy command"
                    >
                      <Copy className="w-3 h-3" />
                      <span>{copiedId === entry.id ? 'Copied!' : 'Copy'}</span>
                    </button>
                  </div>

                  <div className="bg-slate-900/40 p-2 rounded border border-slate-800/80 text-cyan-300">
                    <span className="text-slate-500 mr-2">$</span>
                    {entry.command}
                  </div>

                  {entry.output && (
                    <div className="text-slate-400 pl-4 border-l-2 border-slate-800 text-[11px] whitespace-pre-wrap">
                      {entry.output}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
