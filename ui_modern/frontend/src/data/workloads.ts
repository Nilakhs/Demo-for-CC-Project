import type { WorkloadDefinition } from '../types';

export const WORKLOAD_TEMPLATES: WorkloadDefinition[] = [
  {
    id: 'website',
    title: 'Website (NGINX)',
    file: '02-website.yaml',
    app: 'website',
    badge: 'Standard Workload',
    description: 'Ordinary NGINX website, 4 replicas. Has NO toleration and no nodeSelector.',
    expectedBehavior: 'Must NEVER be scheduled on the GPU node when reserved. Runs exclusively on general worker.',
    yaml: `# Ordinary workload: the company WEBSITE (NGINX web server).
# It has NO toleration, so it must never take the expensive GPU node.
# Used in S1 (before the GPU node is reserved), S2, S6 and S7.
apiVersion: apps/v1
kind: Deployment
metadata:
  name: website
  namespace: gpu-lab
  labels: {app: website, tier: web}
spec:
  replicas: 4
  selector:
    matchLabels: {app: website}
  template:
    metadata:
      labels: {app: website, tier: web}
    spec:
      containers:
      - name: nginx
        image: nginx:alpine
        ports:
        - containerPort: 80
        resources:
          requests: {cpu: 10m, memory: 16Mi}
          limits: {cpu: 100m, memory: 64Mi}
`,
  },
  {
    id: 'ml-training-toleration-only',
    title: 'ML Training (Toleration Only)',
    file: '03-ml-training-toleration-only.yaml',
    app: 'ml-training',
    badge: 'Toleration Only',
    description: 'ML job with toleration for hardware=gpu:NoSchedule, but lacks nodeSelector.',
    expectedBehavior: 'Allowed on the GPU node, but Kubernetes does not prioritize it there; replicas spread across both workers.',
    yaml: `# Special workload: an ML TRAINING job that should run on the GPU node.
# (Simulated: kind nodes have no real GPU. The container prints training
#  progress so its logs look like a job; the scheduling rules are real.)
#
# S3 - toleration ONLY (no nodeSelector).
# The toleration matches the GPU node's taint hardware=gpu:NoSchedule,
# so the job is ALLOWED on the GPU node - but nothing sends it there.
# Expected: the replicas spread over the general node AND the GPU node.
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ml-training
  namespace: gpu-lab
  labels: {app: ml-training, tier: ml}
spec:
  replicas: 4
  selector:
    matchLabels: {app: ml-training}
  template:
    metadata:
      labels: {app: ml-training, tier: ml}
    spec:
      tolerations:
      - key: "hardware"
        operator: "Equal"
        value: "gpu"
        effect: "NoSchedule"
      containers:
      - name: trainer
        image: python:3.12-alpine
        command: ["python", "-u", "-c"]
        args:
        - |
          import math, os, signal, sys, time
          node = os.environ.get("NODE_NAME", "?")
          def stop(sig, frame):       # Kubernetes sends SIGTERM before stopping a Pod
              print("SIGTERM received - saving checkpoint and exiting", flush=True)
              sys.exit(0)
          signal.signal(signal.SIGTERM, stop)
          print(f"[simulated] ML training job started on node {node}")
          loss = 2.5
          for epoch in range(1, 100000):
              s = sum(math.sqrt(i) for i in range(20000))   # small CPU work
              loss = loss * 0.97
              print(f"epoch {epoch:5d}  loss {loss:.4f}  node {node}")
              time.sleep(5)
        env:
        - name: NODE_NAME
          valueFrom: {fieldRef: {fieldPath: spec.nodeName}}
        resources:
          requests: {cpu: 20m, memory: 32Mi}
          limits: {cpu: 200m, memory: 128Mi}
`,
  },
  {
    id: 'ml-training-typo',
    title: "ML Training (Typo 'gpus')",
    file: '04-ml-training-wrong-toleration.yaml',
    app: 'ml-training-typo',
    badge: 'Misconfigured',
    description: "Toleration contains value 'gpus' instead of 'gpu' with operator Equal.",
    expectedBehavior: "Fails exact match check against hardware=gpu:NoSchedule; completely blocked from the GPU node.",
    yaml: `# S4 - a MISCONFIGURED ML job: the toleration has a typo in its value
# ("gpus" instead of "gpu"). With operator Equal, key + value + effect must
# all match the taint hardware=gpu:NoSchedule , so this does NOT tolerate it.
# Expected: the job is kept OFF the GPU node (runs on the general node only).
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ml-training-typo
  namespace: gpu-lab
  labels: {app: ml-training-typo, tier: ml}
spec:
  replicas: 4
  selector:
    matchLabels: {app: ml-training-typo}
  template:
    metadata:
      labels: {app: ml-training-typo, tier: ml}
    spec:
      tolerations:
      - key: "hardware"
        operator: "Equal"
        value: "gpus"
        effect: "NoSchedule"
      containers:
      - name: trainer
        image: python:3.12-alpine
        command: ["python", "-u", "-c"]
        args:
        - |
          import os, signal, sys, time
          signal.signal(signal.SIGTERM, lambda s, f: sys.exit(0))   # stop at once on SIGTERM
          print("[simulated] ML training job (typo toleration) on node", os.environ.get("NODE_NAME"))
          while True:
              time.sleep(5)
        env:
        - name: NODE_NAME
          valueFrom: {fieldRef: {fieldPath: spec.nodeName}}
        resources:
          requests: {cpu: 20m, memory: 32Mi}
          limits: {cpu: 200m, memory: 128Mi}
`,
  },
  {
    id: 'ml-training-dedicated',
    title: 'ML Dedicated (Toleration + nodeSelector)',
    file: '05-ml-training-dedicated.yaml',
    app: 'ml-training',
    badge: 'Recommended Pattern',
    description: 'Golden standard: nodeSelector hardware: gpu ensures affinity, while toleration allows passage.',
    expectedBehavior: 'All replicas schedule strictly on taints-lab-worker2 (GPU node).',
    yaml: `# S5 - the CORRECT setup for a reserved GPU node:
#   toleration   -> the job may pass the GPU node's taint  hardware=gpu:NoSchedule
#   nodeSelector -> the job may run ONLY on nodes labelled  hardware=gpu
# Deployed together with the website (02-website.yaml).
# Expected: all ML replicas on the GPU node; all website replicas on the general node.
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ml-training
  namespace: gpu-lab
  labels: {app: ml-training, tier: ml}
spec:
  replicas: 3
  selector:
    matchLabels: {app: ml-training}
  template:
    metadata:
      labels: {app: ml-training, tier: ml}
    spec:
      nodeSelector:
        hardware: gpu
      tolerations:
      - key: "hardware"
        operator: "Equal"
        value: "gpu"
        effect: "NoSchedule"
      containers:
      - name: trainer
        image: python:3.12-alpine
        command: ["python", "-u", "-c"]
        args:
        - |
          import math, os, signal, sys, time
          node = os.environ.get("NODE_NAME", "?")
          def stop(sig, frame):       # Kubernetes sends SIGTERM before stopping a Pod
              print("SIGTERM received - saving checkpoint and exiting", flush=True)
              sys.exit(0)
          signal.signal(signal.SIGTERM, stop)
          print(f"[simulated] ML training job started on node {node}")
          loss = 2.5
          for epoch in range(1, 100000):
              s = sum(math.sqrt(i) for i in range(20000))   # small CPU work
              loss = loss * 0.97
              print(f"epoch {epoch:5d}  loss {loss:.4f}  node {node}")
              time.sleep(5)
        env:
        - name: NODE_NAME
          valueFrom: {fieldRef: {fieldPath: spec.nodeName}}
        resources:
          requests: {cpu: 20m, memory: 32Mi}
          limits: {cpu: 200m, memory: 128Mi}
`,
  },
  {
    id: 'gpu-fault-pods',
    title: 'GPU Fault Pods (3 Bare Pods)',
    file: '06-gpu-fault-pods.yaml',
    app: 'gpu-fault-test',
    badge: 'NoExecute Test',
    description: '3 bare pods on GPU node testing NoExecute eviction dynamics (no-grace, 30s-grace, monitor).',
    expectedBehavior: 'When gpu-fault=true:NoExecute is added: no-grace evicts immediately, grace-30s evicts after 30s, monitor stays forever.',
    yaml: `# S8 - NoExecute: the GPU node develops a fault and the admin drains it with
#   kubectl taint nodes taints-lab-worker2 gpu-fault=true:NoExecute
# NoExecute also removes Pods that are ALREADY running there.
#
# Three bare Pods (not Deployments, so an evicted Pod is not re-created and the
# timeline stays clear). All three run on the GPU node before the fault.
apiVersion: v1
kind: Pod
metadata:
  name: ml-job-no-grace
  namespace: gpu-lab
  labels: {app: gpu-fault-test, case: no-grace, tier: ml}
spec:
  nodeSelector: {hardware: gpu}
  tolerations:
  - {key: "hardware", operator: "Equal", value: "gpu", effect: "NoSchedule"}
  containers:
  - name: trainer
    image: python:3.12-alpine
    command: ["python", "-u", "-c"]
    args:
    - |
      import signal, sys, time
      signal.signal(signal.SIGTERM, lambda s, f: (print("SIGTERM - job stopped"), sys.exit(0)))
      print("[simulated] ML job running (no fault toleration)")
      while True:
          time.sleep(5)
    resources:
      requests: {cpu: 20m, memory: 32Mi}
      limits: {cpu: 200m, memory: 128Mi}
---
apiVersion: v1
kind: Pod
metadata:
  name: ml-job-grace-30s
  namespace: gpu-lab
  labels: {app: gpu-fault-test, case: grace-30s, tier: ml}
spec:
  nodeSelector: {hardware: gpu}
  tolerations:
  - {key: "hardware", operator: "Equal", value: "gpu", effect: "NoSchedule"}
  - {key: "gpu-fault", operator: "Equal", value: "true", effect: "NoExecute", tolerationSeconds: 30}
  containers:
  - name: trainer
    image: python:3.12-alpine
    command: ["python", "-u", "-c"]
    args:
    - |
      import signal, sys, time
      signal.signal(signal.SIGTERM, lambda s, f: (print("SIGTERM - checkpoint saved, job stopped"), sys.exit(0)))
      print("[simulated] ML job running (30 s grace to save a checkpoint)")
      while True:
          time.sleep(5)
    resources:
      requests: {cpu: 20m, memory: 32Mi}
      limits: {cpu: 200m, memory: 128Mi}
---
apiVersion: v1
kind: Pod
metadata:
  name: gpu-monitor
  namespace: gpu-lab
  labels: {app: gpu-fault-test, case: monitor, tier: system}
spec:
  nodeSelector: {hardware: gpu}
  tolerations:
  - {key: "hardware", operator: "Equal", value: "gpu", effect: "NoSchedule"}
  - {key: "gpu-fault", operator: "Exists", effect: "NoExecute"}
  containers:
  - name: monitor
    image: python:3.12-alpine
    command: ["python", "-u", "-c"]
    args:
    - |
      import signal, sys, time
      signal.signal(signal.SIGTERM, lambda s, f: sys.exit(0))
      while True:
          print("[simulated] GPU health check: reporting node status")
          time.sleep(10)
    resources:
      requests: {cpu: 10m, memory: 16Mi}
      limits: {cpu: 100m, memory: 64Mi}
`,
  },
];
