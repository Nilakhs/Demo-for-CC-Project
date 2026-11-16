import type { NodeInfo, PodInfo, Taint, Toleration, WhyEvaluation } from '../types';

export const APP_COLORS: Record<string, { bg: string; border: string; text: string; glow: string; hex: string }> = {
  'website': {
    bg: 'bg-blue-950/40',
    border: 'border-blue-500/50',
    text: 'text-blue-400',
    glow: 'shadow-[0_0_12px_rgba(59,130,246,0.3)]',
    hex: '#3b82f6',
  },
  'ml-training': {
    bg: 'bg-purple-950/40',
    border: 'border-purple-500/50',
    text: 'text-purple-400',
    glow: 'shadow-[0_0_12px_rgba(168,85,247,0.3)]',
    hex: '#8b5cf6',
  },
  'ml-training-typo': {
    bg: 'bg-rose-950/40',
    border: 'border-rose-500/50',
    text: 'text-rose-400',
    glow: 'shadow-[0_0_12px_rgba(244,63,94,0.3)]',
    hex: '#f43f5e',
  },
  'gpu-fault-test': {
    bg: 'bg-pink-950/40',
    border: 'border-pink-500/50',
    text: 'text-pink-400',
    glow: 'shadow-[0_0_12px_rgba(236,72,153,0.3)]',
    hex: '#ec4899',
  },
};

export const EFFECT_CONFIG = {
  NoSchedule: {
    bg: 'bg-red-500/15',
    border: 'border-red-500/30',
    text: 'text-red-400',
    badge: 'bg-red-950/60 border-red-500/40 text-red-300',
    hex: '#ef4444',
  },
  PreferNoSchedule: {
    bg: 'bg-amber-500/15',
    border: 'border-amber-500/30',
    text: 'text-amber-400',
    badge: 'bg-amber-950/60 border-amber-500/40 text-amber-300',
    hex: '#f59e0b',
  },
  NoExecute: {
    bg: 'bg-violet-500/15',
    border: 'border-violet-500/30',
    text: 'text-violet-400',
    badge: 'bg-violet-950/60 border-violet-500/40 text-violet-300',
    hex: '#8b5cf6',
  },
};

export function taintToString(t: Taint): string {
  const val = t.value !== undefined && t.value !== null && t.value !== '' ? `=${t.value}` : '';
  return `${t.key}${val}:${t.effect}`;
}

export function tolerates(tol: Toleration, taint: Taint): boolean {
  if (tol.effect && tol.effect !== taint.effect) {
    return false;
  }
  const op = tol.operator || 'Equal';
  if (!tol.key) {
    return op === 'Exists';
  }
  if (tol.key !== taint.key) {
    return false;
  }
  if (op === 'Exists') {
    return true;
  }
  return (tol.value ?? '') === (taint.value ?? '');
}

export function explainWhy(pod: PodInfo, node: NodeInfo): WhyEvaluation {
  const tols = pod.tolerations || [];
  const reasons: string[] = [];
  let verdict: 'allowed' | 'avoided' | 'blocked' = 'allowed';

  for (const taint of node.taints || []) {
    const isTolerated = tols.some((t) => tolerates(t, taint));
    const tStr = taintToString(taint);

    if (isTolerated) {
      reasons.push(`✅ taint \`${tStr}\` is tolerated by Pod`);
    } else if (taint.effect === 'PreferNoSchedule') {
      reasons.push(`🟠 taint \`${tStr}\` is not tolerated — only a soft preference`);
      if (verdict === 'allowed') {
        verdict = 'avoided';
      }
    } else {
      reasons.push(`⛔ taint \`${tStr}\` is NOT tolerated`);
      verdict = 'blocked';
    }
  }

  const podSelector = pod.nodeSelector || {};
  for (const [k, v] of Object.entries(podSelector)) {
    if (node.labels && node.labels[k] === v) {
      reasons.push(`✅ nodeSelector \`${k}=${v}\` matches node label`);
    } else {
      reasons.push(`⛔ nodeSelector \`${k}=${v}\` does not match this node`);
      verdict = 'blocked';
    }
  }

  if (reasons.length === 0) {
    reasons.push('✅ no taints and no nodeSelector — any Pod may run here');
  }

  return {
    nodeName: node.name,
    role: node.role,
    verdict,
    reasons,
  };
}
