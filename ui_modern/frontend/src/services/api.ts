import type {
  ClusterStatusResponse,
  CommandLogEntry,
  K8sEvent,
  NodeInfo,
  PodInfo,
  TaintEffect,
} from '../types';
import { WORKLOAD_TEMPLATES } from '../data/workloads';
import { tolerates } from '../lib/k8s-rules';

const API_BASE = '/api';

// Realistic stateful mock simulation fallback
let mockNodes: NodeInfo[] = [
  {
    name: 'taints-lab-control-plane',
    role: 'manager (control plane)',
    ready: true,
    taints: [
      { key: 'node-role.kubernetes.io/control-plane', effect: 'NoSchedule' },
    ],
    labels: {
      'kubernetes.io/hostname': 'taints-lab-control-plane',
      'node-role.kubernetes.io/control-plane': '',
    },
  },
  {
    name: 'taints-lab-worker',
    role: '🖥️ general-purpose node',
    ready: true,
    taints: [],
    labels: {
      'kubernetes.io/hostname': 'taints-lab-worker',
    },
  },
  {
    name: 'taints-lab-worker2',
    role: '🎮 GPU node (reserved)',
    ready: true,
    taints: [
      { key: 'hardware', value: 'gpu', effect: 'NoSchedule' },
    ],
    labels: {
      'kubernetes.io/hostname': 'taints-lab-worker2',
      hardware: 'gpu',
    },
  },
];

let mockPods: PodInfo[] = [
  {
    name: 'website-7bc84b5f9c-2w7lq',
    app: 'website',
    namespace: 'gpu-lab',
    nodeName: 'taints-lab-worker',
    phase: 'Running',
    ready: '1/1',
    tier: 'web',
    restarts: 0,
    age: '12m',
    tolerations: [],
    nodeSelector: {},
  },
  {
    name: 'website-7bc84b5f9c-4r8mv',
    app: 'website',
    namespace: 'gpu-lab',
    nodeName: 'taints-lab-worker',
    phase: 'Running',
    ready: '1/1',
    tier: 'web',
    restarts: 0,
    age: '12m',
    tolerations: [],
    nodeSelector: {},
  },
  {
    name: 'website-7bc84b5f9c-9jx6t',
    app: 'website',
    namespace: 'gpu-lab',
    nodeName: 'taints-lab-worker',
    phase: 'Running',
    ready: '1/1',
    tier: 'web',
    restarts: 0,
    age: '12m',
    tolerations: [],
    nodeSelector: {},
  },
  {
    name: 'website-7bc84b5f9c-k9p02',
    app: 'website',
    namespace: 'gpu-lab',
    nodeName: 'taints-lab-worker',
    phase: 'Running',
    ready: '1/1',
    tier: 'web',
    restarts: 0,
    age: '12m',
    tolerations: [],
    nodeSelector: {},
  },
  {
    name: 'ml-training-559d87bbdf-8pztg',
    app: 'ml-training',
    namespace: 'gpu-lab',
    nodeName: 'taints-lab-worker2',
    phase: 'Running',
    ready: '1/1',
    tier: 'ml',
    restarts: 0,
    age: '8m',
    nodeSelector: { hardware: 'gpu' },
    tolerations: [
      { key: 'hardware', operator: 'Equal', value: 'gpu', effect: 'NoSchedule' },
    ],
  },
  {
    name: 'ml-training-559d87bbdf-lq91m',
    app: 'ml-training',
    namespace: 'gpu-lab',
    nodeName: 'taints-lab-worker2',
    phase: 'Running',
    ready: '1/1',
    tier: 'ml',
    restarts: 0,
    age: '8m',
    nodeSelector: { hardware: 'gpu' },
    tolerations: [
      { key: 'hardware', operator: 'Equal', value: 'gpu', effect: 'NoSchedule' },
    ],
  },
  {
    name: 'ml-training-559d87bbdf-v9k2x',
    app: 'ml-training',
    namespace: 'gpu-lab',
    nodeName: 'taints-lab-worker2',
    phase: 'Running',
    ready: '1/1',
    tier: 'ml',
    restarts: 0,
    age: '8m',
    nodeSelector: { hardware: 'gpu' },
    tolerations: [
      { key: 'hardware', operator: 'Equal', value: 'gpu', effect: 'NoSchedule' },
    ],
  },
];

let mockEvents: K8sEvent[] = [
  {
    id: 'evt-1',
    lastTimestamp: new Date(Date.now() - 480000).toISOString(),
    type: 'Normal',
    reason: 'Scheduled',
    object: 'pod/ml-training-559d87bbdf-8pztg',
    message: 'Successfully assigned gpu-lab/ml-training-559d87bbdf-8pztg to taints-lab-worker2',
  },
  {
    id: 'evt-2',
    lastTimestamp: new Date(Date.now() - 720000).toISOString(),
    type: 'Normal',
    reason: 'Scheduled',
    object: 'pod/website-7bc84b5f9c-2w7lq',
    message: 'Successfully assigned gpu-lab/website-7bc84b5f9c-2w7lq to taints-lab-worker',
  },
  {
    id: 'evt-3',
    lastTimestamp: new Date(Date.now() - 900000).toISOString(),
    type: 'Normal',
    reason: 'Pulled',
    object: 'pod/website-7bc84b5f9c-2w7lq',
    message: 'Container image "nginx:alpine" already present on machine',
  },
];

let mockLogs: CommandLogEntry[] = [
  {
    id: 'cmd-init-1',
    label: 'Reserve GPU Node',
    command: 'kubectl --context kind-taints-lab taint nodes taints-lab-worker2 hardware=gpu:NoSchedule --overwrite',
    exitCode: 0,
    output: 'node/taints-lab-worker2 modified',
    timestamp: new Date().toLocaleTimeString(),
  },
  {
    id: 'cmd-init-2',
    label: 'Label GPU Node',
    command: 'kubectl --context kind-taints-lab label nodes taints-lab-worker2 hardware=gpu --overwrite',
    exitCode: 0,
    output: 'node/taints-lab-worker2 labeled',
    timestamp: new Date().toLocaleTimeString(),
  },
];

function recordMockLog(label: string, command: string, exitCode = 0, output = 'success') {
  mockLogs.unshift({
    id: `cmd-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    label,
    command,
    exitCode,
    output,
    timestamp: new Date().toLocaleTimeString(),
  });
  if (mockLogs.length > 50) mockLogs.pop();
}

function recomputeMockPodPlacement() {
  const workerNode = mockNodes.find((n) => n.name === 'taints-lab-worker');
  const gpuNode = mockNodes.find((n) => n.name === 'taints-lab-worker2');

  mockPods = mockPods.map((pod) => {
    // If pod is already terminating, don't change
    if (pod.phase === 'Terminating') return pod;

    // Check GPU node
    const satisfiesGpuTaints = (gpuNode?.taints || []).every((taint) =>
      (pod.tolerations || []).some((t) => tolerates(t, taint))
    );
    const matchesGpuSelector = Object.entries(pod.nodeSelector || {}).every(
      ([k, v]) => gpuNode?.labels[k] === v
    );

    // Check Worker node
    const satisfiesWorkerTaints = (workerNode?.taints || []).every((taint) =>
      (pod.tolerations || []).some((t) => tolerates(t, taint))
    );
    const matchesWorkerSelector = Object.entries(pod.nodeSelector || {}).every(
      ([k, v]) => workerNode?.labels[k] === v
    );

    // If pod requires GPU (nodeSelector hardware: gpu)
    if (pod.nodeSelector?.hardware === 'gpu') {
      if (matchesGpuSelector && satisfiesGpuTaints) {
        return { ...pod, nodeName: 'taints-lab-worker2', phase: 'Running' };
      }
      return { ...pod, nodeName: null, phase: 'Pending' };
    }

    // Workload without nodeSelector
    if (satisfiesWorkerTaints && matchesWorkerSelector) {
      return { ...pod, nodeName: 'taints-lab-worker', phase: 'Running' };
    } else if (satisfiesGpuTaints && matchesGpuSelector) {
      return { ...pod, nodeName: 'taints-lab-worker2', phase: 'Running' };
    } else {
      return { ...pod, nodeName: null, phase: 'Pending' };
    }
  });
}

export const api = {
  async getClusterStatus(): Promise<ClusterStatusResponse> {
    try {
      const res = await fetch(`${API_BASE}/cluster`, {
        signal: AbortSignal.timeout(2000),
      });
      if (res.ok) {
        const data = await res.json();
        return {
          context: data.context || 'kind-taints-lab',
          namespace: data.namespace || 'gpu-lab',
          clusterConnected: data.clusterConnected ?? true,
          nodes: data.nodes || [],
          pods: data.pods || [],
          events: data.events || [],
          gpuReserved: data.gpuReserved ?? false,
          commandLogs: data.commandLogs || [],
        };
      }
    } catch {
      // Backend not running yet or unreachable, use mock state
    }

    // Return current mock state
    const gpuNode = mockNodes.find((n) => n.name === 'taints-lab-worker2');
    const isGpuReserved = (gpuNode?.taints || []).some((t) => t.key === 'hardware');

    return {
      context: 'kind-taints-lab',
      namespace: 'gpu-lab',
      clusterConnected: true,
      nodes: JSON.parse(JSON.stringify(mockNodes)),
      pods: JSON.parse(JSON.stringify(mockPods)),
      events: JSON.parse(JSON.stringify(mockEvents)),
      gpuReserved: isGpuReserved,
      commandLogs: JSON.parse(JSON.stringify(mockLogs)),
    };
  },

  async runStep(stepId: number): Promise<{ success: boolean; output: string }> {
    try {
      const res = await fetch(`${API_BASE}/steps/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ step: stepId }),
      });
      if (res.ok) {
        return await res.json();
      }
    } catch {
      // fallback mock execution
    }

    const gpuNode = mockNodes.find((n) => n.name === 'taints-lab-worker2')!;
    const workerNode = mockNodes.find((n) => n.name === 'taints-lab-worker')!;

    switch (stepId) {
      case 1: // Reserve GPU Node
        gpuNode.labels['hardware'] = 'gpu';
        if (!gpuNode.taints.some((t) => t.key === 'hardware')) {
          gpuNode.taints.push({ key: 'hardware', value: 'gpu', effect: 'NoSchedule' });
        }
        recordMockLog(
          'Step 1: Reserve GPU Node',
          'kubectl taint nodes taints-lab-worker2 hardware=gpu:NoSchedule --overwrite && kubectl label nodes taints-lab-worker2 hardware=gpu --overwrite',
          0,
          'node/taints-lab-worker2 labeled & tainted'
        );
        break;

      case 2: // General node into maintenance
        if (!workerNode.taints.some((t) => t.key === 'maintenance')) {
          workerNode.taints.push({ key: 'maintenance', value: 'true', effect: 'NoSchedule' });
        }
        recordMockLog(
          'Step 2: General Node Maintenance',
          'kubectl taint nodes taints-lab-worker maintenance=true:NoSchedule --overwrite',
          0,
          'node/taints-lab-worker tainted (Pods without tolerations become Pending)'
        );
        mockEvents.unshift({
          id: `evt-${Date.now()}`,
          lastTimestamp: new Date().toISOString(),
          type: 'Warning',
          reason: 'FailedScheduling',
          object: 'pod/website-...',
          message: '0/3 nodes are available: 1 node has untolerated taint {maintenance: true}, 1 node has untolerated taint {hardware: gpu}, 1 node has untolerated taint {node-role.kubernetes.io/control-plane}.',
        });
        break;

      case 3: // Maintenance finished
        workerNode.taints = workerNode.taints.filter((t) => t.key !== 'maintenance');
        recordMockLog(
          'Step 3: Maintenance Complete',
          'kubectl taint nodes taints-lab-worker maintenance-',
          0,
          'node/taints-lab-worker untainted'
        );
        mockEvents.unshift({
          id: `evt-${Date.now()}`,
          lastTimestamp: new Date().toISOString(),
          type: 'Normal',
          reason: 'Scheduled',
          object: 'pod/website-...',
          message: 'Successfully assigned gpu-lab/website-... to taints-lab-worker',
        });
        break;

      case 4: // GPU Fault (NoExecute)
        if (!gpuNode.taints.some((t) => t.key === 'gpu-fault')) {
          gpuNode.taints.push({ key: 'gpu-fault', value: 'true', effect: 'NoExecute' });
        }
        recordMockLog(
          'Step 4: GPU Fault Injection (NoExecute)',
          'kubectl taint nodes taints-lab-worker2 gpu-fault=true:NoExecute --overwrite',
          0,
          'node/taints-lab-worker2 tainted with NoExecute'
        );

        // Immediate eviction of pods without toleration
        mockPods.forEach((p) => {
          if (p.nodeName === 'taints-lab-worker2') {
            const tol = p.tolerations?.find((t) => t.key === 'gpu-fault');
            if (!tol) {
              p.phase = 'Terminating';
              p.deletionTimestamp = new Date().toISOString();
              mockEvents.unshift({
                id: `evt-${Date.now()}-${p.name}`,
                lastTimestamp: new Date().toISOString(),
                type: 'Normal',
                reason: 'TaintManagerEviction',
                object: `pod/${p.name}`,
                message: 'Marking for deletion Pod due to NoExecute taint on node taints-lab-worker2',
              });
            } else if (tol.tolerationSeconds) {
              // Simulating grace period eviction after timer
              setTimeout(() => {
                p.phase = 'Terminating';
                p.deletionTimestamp = new Date().toISOString();
              }, 5000);
            }
          }
        });
        break;

      case 5: // GPU Repaired
        gpuNode.taints = gpuNode.taints.filter((t) => t.key !== 'gpu-fault');
        recordMockLog(
          'Step 5: GPU Repaired',
          'kubectl taint nodes taints-lab-worker2 gpu-fault-',
          0,
          'node/taints-lab-worker2 fault taint removed'
        );
        break;
    }

    recomputeMockPodPlacement();
    return { success: true, output: `Step ${stepId} executed successfully.` };
  },

  async resetLab(): Promise<{ success: boolean; output: string }> {
    try {
      const res = await fetch(`${API_BASE}/steps/reset`, { method: 'POST' });
      if (res.ok) return await res.json();
    } catch {
      // fallback
    }

    // Clear worker taints
    const w1 = mockNodes.find((n) => n.name === 'taints-lab-worker');
    if (w1) w1.taints = [];

    const w2 = mockNodes.find((n) => n.name === 'taints-lab-worker2');
    if (w2) {
      w2.taints = [];
      delete w2.labels['hardware'];
    }

    recordMockLog(
      'Reset Lab',
      'kubectl taint nodes taints-lab-worker hardware- maintenance- gpu-fault- ; kubectl taint nodes taints-lab-worker2 hardware- maintenance- gpu-fault- ; kubectl label nodes taints-lab-worker2 hardware-',
      0,
      'Lab reset completed: all lab taints and labels removed.'
    );

    recomputeMockPodPlacement();
    return { success: true, output: 'Lab reset complete.' };
  },

  async deployWorkload(file: string): Promise<{ success: boolean; output: string }> {
    try {
      const res = await fetch(`${API_BASE}/workloads/deploy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workload: file }),
      });
      if (res.ok) return await res.json();
    } catch {
      // fallback
    }

    const template = WORKLOAD_TEMPLATES.find((w) => w.file === file);
    if (template) {
      if (template.id === 'gpu-fault-pods') {
        // Deploy the 3 test pods
        const podsToAdd: PodInfo[] = [
          {
            name: 'ml-job-no-grace',
            app: 'gpu-fault-test',
            namespace: 'gpu-lab',
            nodeName: 'taints-lab-worker2',
            phase: 'Running',
            ready: '1/1',
            tier: 'ml',
            case: 'no-grace',
            nodeSelector: { hardware: 'gpu' },
            tolerations: [
              { key: 'hardware', operator: 'Equal', value: 'gpu', effect: 'NoSchedule' },
            ],
          },
          {
            name: 'ml-job-grace-30s',
            app: 'gpu-fault-test',
            namespace: 'gpu-lab',
            nodeName: 'taints-lab-worker2',
            phase: 'Running',
            ready: '1/1',
            tier: 'ml',
            case: 'grace-30s',
            nodeSelector: { hardware: 'gpu' },
            tolerations: [
              { key: 'hardware', operator: 'Equal', value: 'gpu', effect: 'NoSchedule' },
              { key: 'gpu-fault', operator: 'Equal', value: 'true', effect: 'NoExecute', tolerationSeconds: 30 },
            ],
          },
          {
            name: 'gpu-monitor',
            app: 'gpu-fault-test',
            namespace: 'gpu-lab',
            nodeName: 'taints-lab-worker2',
            phase: 'Running',
            ready: '1/1',
            tier: 'system',
            case: 'monitor',
            nodeSelector: { hardware: 'gpu' },
            tolerations: [
              { key: 'hardware', operator: 'Equal', value: 'gpu', effect: 'NoSchedule' },
              { key: 'gpu-fault', operator: 'Exists', effect: 'NoExecute' },
            ],
          },
        ];
        mockPods = mockPods.filter((p) => p.app !== 'gpu-fault-test').concat(podsToAdd);
      } else {
        const count = template.id === 'ml-training-dedicated' ? 3 : 4;
        const newPods: PodInfo[] = [];
        for (let i = 0; i < count; i++) {
          const rand = Math.random().toString(36).substring(2, 7);
          const isDedicated = template.id === 'ml-training-dedicated';
          const isTypo = template.id === 'ml-training-typo';
          const isTolOnly = template.id === 'ml-training-toleration-only';

          newPods.push({
            name: `${template.app}-${rand}`,
            app: template.app,
            namespace: 'gpu-lab',
            nodeName: isDedicated ? 'taints-lab-worker2' : 'taints-lab-worker',
            phase: 'Running',
            ready: '1/1',
            tier: template.app === 'website' ? 'web' : 'ml',
            nodeSelector: isDedicated ? { hardware: 'gpu' } : {},
            tolerations: isTypo
              ? [{ key: 'hardware', operator: 'Equal', value: 'gpus', effect: 'NoSchedule' }]
              : isTolOnly || isDedicated
              ? [{ key: 'hardware', operator: 'Equal', value: 'gpu', effect: 'NoSchedule' }]
              : [],
          });
        }
        mockPods = mockPods.filter((p) => p.app !== template.app).concat(newPods);
      }

      recordMockLog(
        `Deploy ${template.title}`,
        `kubectl apply -f k8s/${file}`,
        0,
        `deployment.apps/${template.id} created`
      );
      recomputeMockPodPlacement();
    }

    return { success: true, output: `Deployed ${file}` };
  },

  async deleteWorkload(file: string): Promise<{ success: boolean; output: string }> {
    try {
      const res = await fetch(`${API_BASE}/workloads/delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workload: file }),
      });
      if (res.ok) return await res.json();
    } catch {
      // fallback
    }

    const template = WORKLOAD_TEMPLATES.find((w) => w.file === file);
    if (template) {
      mockPods = mockPods.filter((p) => p.app !== template.app);
      recordMockLog(
        `Delete ${template.title}`,
        `kubectl delete -f k8s/${file} --ignore-not-found --wait=false`,
        0,
        `workload ${file} deleted`
      );
    }
    return { success: true, output: `Deleted ${file}` };
  },

  async deleteAllWorkloads(): Promise<{ success: boolean; output: string }> {
    try {
      const res = await fetch(`${API_BASE}/workloads/delete-all`, { method: 'POST' });
      if (res.ok) return await res.json();
    } catch {
      // fallback
    }

    mockPods = [];
    recordMockLog(
      'Delete All Workloads',
      'kubectl delete namespace gpu-lab --wait=false',
      0,
      'namespace "gpu-lab" marked for deletion'
    );
    return { success: true, output: 'All workloads deleted.' };
  },

  async addTaint(
    nodeName: string,
    key: string,
    value: string,
    effect: TaintEffect
  ): Promise<{ success: boolean; output: string }> {
    try {
      const res = await fetch(`${API_BASE}/taints`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ node: nodeName, key, value, effect, action: 'add' }),
      });
      if (res.ok) return await res.json();
    } catch {
      // fallback
    }

    const node = mockNodes.find((n) => n.name === nodeName);
    if (node) {
      node.taints = node.taints.filter((t) => !(t.key === key && t.effect === effect));
      node.taints.push({ key, value: value || undefined, effect });
      const valStr = value ? `=${value}` : '';
      recordMockLog(
        'Add Taint',
        `kubectl taint nodes ${nodeName} ${key}${valStr}:${effect} --overwrite`,
        0,
        `node/${nodeName} tainted`
      );
      recomputeMockPodPlacement();
    }

    return { success: true, output: `Added taint to ${nodeName}` };
  },

  async removeTaint(
    nodeName: string,
    key: string,
    effect?: string
  ): Promise<{ success: boolean; output: string }> {
    try {
      const res = await fetch(`${API_BASE}/taints`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ node: nodeName, key, effect, action: 'remove' }),
      });
      if (res.ok) return await res.json();
    } catch {
      // fallback
    }

    const node = mockNodes.find((n) => n.name === nodeName);
    if (node) {
      node.taints = node.taints.filter((t) => t.key !== key);
      recordMockLog(
        'Remove Taint',
        `kubectl taint nodes ${nodeName} ${key}${effect ? `:${effect}-` : '-'}`,
        0,
        `node/${nodeName} untainted`
      );
      recomputeMockPodPlacement();
    }

    return { success: true, output: `Removed taint from ${nodeName}` };
  },

  async getPodLogs(podName: string): Promise<string[]> {
    try {
      const res = await fetch(`${API_BASE}/pod-logs/${podName}`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.logs)) return data.logs;
        if (typeof data.logs === 'string') return data.logs.split('\n');
      }
    } catch {
      // fallback
    }

    const pod = mockPods.find((p) => p.name === podName);
    const node = pod?.nodeName || 'unknown-node';
    const time = new Date().toISOString().substring(11, 19);

    if (podName.includes('website')) {
      return [
        `[${time}] 2026/11/16 15:20:01 [notice] 1#1: using the "epoll" event method`,
        `[${time}] 2026/11/16 15:20:01 [notice] 1#1: nginx/1.27.0 (alpine-slim)`,
        `[${time}] 2026/11/16 15:20:01 [notice] 1#1: built by gcc 13.2.1 20240309`,
        `[${time}] 2026/11/16 15:20:01 [notice] 1#1: OS: Linux 6.6.137+`,
        `[${time}] 2026/11/16 15:20:01 [notice] 1#1: start worker processes`,
        `[${time}] 10.244.1.1 - - [16/Nov/2026:15:20:10 +0000] "GET / HTTP/1.1" 200 615 "-" "kube-probe/1.30" "-"`,
        `[${time}] 10.244.1.1 - - [16/Nov/2026:15:20:20 +0000] "GET / HTTP/1.1" 200 615 "-" "curl/8.5.0" "-"`,
        `[${time}] 10.244.1.1 - - [16/Nov/2026:15:20:30 +0000] "GET /status HTTP/1.1" 200 48 "-" "prometheus" "-"`,
      ];
    }

    if (podName.includes('ml-training-typo')) {
      return [
        `[${time}] [simulated] ML training job (typo toleration) on node ${node}`,
        `[${time}] [WARN] Toleration 'hardware=gpus:NoSchedule' does not match taint 'hardware=gpu:NoSchedule'`,
        `[${time}] [INFO] Fallback scheduled on general node: ${node}`,
        `[${time}] worker loop running... active pid=1, memory=32Mi, cpu=20m`,
        `[${time}] worker loop running... active pid=1, memory=32Mi, cpu=20m`,
      ];
    }

    if (podName.includes('ml-job-no-grace')) {
      return [
        `[${time}] [simulated] ML job running (no fault toleration)`,
        `[${time}] training step 1... loss=1.8492`,
        `[${time}] training step 2... loss=1.8104`,
        `[${time}] [ALERT] SIGTERM received from Kubernetes kubelet (taint gpu-fault=true:NoExecute applied)`,
        `[${time}] SIGTERM - job stopped immediately (PID 1 signal handler exited with code 0 in 1.1s)`,
      ];
    }

    if (podName.includes('ml-job-grace-30s')) {
      return [
        `[${time}] [simulated] ML job running (30 s grace to save a checkpoint)`,
        `[${time}] training step 1... loss=1.8492`,
        `[${time}] [ALERT] SIGTERM received from Kubernetes kubelet (30s toleration window active)`,
        `[${time}] [CHECKPOINT] Saving model weights to /data/checkpoints/epoch_42.pt ...`,
        `[${time}] [CHECKPOINT] Verification hash: SHA256(7f8a...9c) OK.`,
        `[${time}] SIGTERM - checkpoint saved, job stopped cleanly`,
      ];
    }

    if (podName.includes('gpu-monitor')) {
      return [
        `[${time}] [simulated] GPU health check: reporting node status`,
        `[${time}] GPU 0: NVIDIA A100-SXM4-80GB (PCIe Bus 0000:01:00.0)`,
        `[${time}] GPU Core Temp: 39°C | Memory Temp: 44°C | VRAM: 1420MiB / 81920MiB`,
        `[${time}] Toleration check: operator 'Exists' matches taint 'gpu-fault:NoExecute'`,
        `[${time}] Status: Monitoring daemon remains active and reporting node metrics.`,
      ];
    }

    // Default ML Training logs
    return [
      `[${time}] [simulated] ML training job started on node ${node}`,
      `[${time}] Initial loss = 2.5000 | Target model architecture: ResNet50-simulated`,
      `[${time}] epoch     1  loss 2.4250  node ${node}`,
      `[${time}] epoch     2  loss 2.3523  node ${node}`,
      `[${time}] epoch     3  loss 2.2817  node ${node}`,
      `[${time}] epoch     4  loss 2.2132  node ${node}`,
      `[${time}] epoch     5  loss 2.1468  node ${node}`,
      `[${time}] epoch     6  loss 2.0824  node ${node}`,
      `[${time}] epoch     7  loss 2.0199  node ${node}`,
      `[${time}] epoch     8  loss 1.9593  node ${node}`,
    ];
  },
};
