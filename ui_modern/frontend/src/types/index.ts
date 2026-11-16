export type TaintEffect = 'NoSchedule' | 'PreferNoSchedule' | 'NoExecute';

export interface Taint {
  key: string;
  value?: string;
  effect: TaintEffect;
}

export interface Toleration {
  key?: string;
  operator?: 'Equal' | 'Exists';
  value?: string;
  effect?: TaintEffect;
  tolerationSeconds?: number;
}

export type PodPhase = 'Running' | 'Pending' | 'Terminating' | 'Failed' | 'Succeeded';

export interface PodInfo {
  name: string;
  app: string;
  namespace: string;
  nodeName: string | null;
  phase: PodPhase;
  deletionTimestamp?: string | null;
  tolerations?: Toleration[];
  nodeSelector?: Record<string, string>;
  tier?: string;
  case?: string;
  ready?: string;
  restarts?: number;
  age?: string;
}

export interface NodeInfo {
  name: string;
  role: string;
  ready: boolean;
  taints: Taint[];
  labels: Record<string, string>;
  pods?: PodInfo[];
}

export interface K8sEvent {
  id: string;
  lastTimestamp: string;
  type: 'Normal' | 'Warning' | string;
  reason: 'Scheduled' | 'FailedScheduling' | 'TaintManagerEviction' | 'Killing' | 'Pulled' | string;
  object: string;
  message: string;
}

export interface CommandLogEntry {
  id: string;
  label: string;
  command: string;
  exitCode: number;
  output: string;
  timestamp: string;
}

export interface ClusterStatusResponse {
  context: string;
  namespace: string;
  clusterConnected: boolean;
  nodes: NodeInfo[];
  pods: PodInfo[];
  events: K8sEvent[];
  gpuReserved: boolean;
  commandLogs?: CommandLogEntry[];
}

export interface WorkloadDefinition {
  id: string;
  title: string;
  file: string;
  app: string;
  badge: string;
  description: string;
  expectedBehavior: string;
  yaml: string;
}

export interface GuidedStep {
  id: number;
  title: string;
  badge: string;
  description: string;
  explanation: string;
  commands: string[];
  status?: 'idle' | 'running' | 'completed' | 'error';
}

export interface WhyEvaluation {
  nodeName: string;
  role: string;
  verdict: 'allowed' | 'avoided' | 'blocked';
  reasons: string[];
}
