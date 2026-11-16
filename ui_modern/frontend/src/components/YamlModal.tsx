import React, { useState } from 'react';
import type { WorkloadDefinition } from '../types';
import { X, Copy, Check, FileCode } from 'lucide-react';

interface YamlModalProps {
  workload: WorkloadDefinition | null;
  onClose: () => void;
}

export const YamlModal: React.FC<YamlModalProps> = ({ workload, onClose }) => {
  const [copied, setCopied] = useState(false);

  if (!workload) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(workload.yaml);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const lines = workload.yaml.split('\n');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="glass-panel w-full max-w-3xl rounded-2xl border border-cyan-500/30 overflow-hidden shadow-2xl flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900/90 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
              <FileCode className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-100 font-mono">
                {workload.title}
              </h3>
              <span className="text-xs text-slate-400 font-mono">
                k8s/{workload.file}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="tactile-btn flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono border border-slate-700 cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400 font-semibold">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Copy YAML</span>
                </>
              )}
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 cursor-pointer transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Description Strip */}
        <div className="px-6 py-2.5 bg-slate-950/60 border-b border-slate-800/80 text-xs text-slate-400 font-mono flex items-center justify-between">
          <span>{workload.description}</span>
          <span className="text-cyan-400">{lines.length} lines</span>
        </div>

        {/* Code Content */}
        <div className="p-4 overflow-y-auto bg-[#04060a] font-mono text-xs text-slate-200 space-y-0.5 leading-relaxed">
          {lines.map((line, idx) => (
            <div key={idx} className="flex hover:bg-slate-900/60 transition-colors">
              <span className="w-10 text-right pr-4 text-slate-600 select-none flex-shrink-0">
                {idx + 1}
              </span>
              <span className={`whitespace-pre-wrap ${
                line.trim().startsWith('#')
                  ? 'text-slate-500 italic'
                  : line.includes('tolerations:') || line.includes('nodeSelector:') || line.includes('taint')
                  ? 'text-cyan-300 font-semibold'
                  : line.includes('hardware: gpu') || line.includes('hardware=gpu')
                  ? 'text-violet-300 font-semibold'
                  : 'text-slate-300'
              }`}>
                {line}
              </span>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-900/60 border-t border-slate-800 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
