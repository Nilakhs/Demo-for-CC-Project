"""
GPU Node Scheduling Lab - FastAPI Backend Server
Problem 07: Pod Scheduling Using Taints and Tolerations

Serves the modern UI with high-performance real-time Kubernetes status,
auto-pilot scenario execution (S1-S8), step automation, workload management,
explainability engine, pod logs, cluster health/resources, export reporting,
and command logging.
"""

import json
import logging
import subprocess
import threading
import time
from collections import deque
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

from fastapi import FastAPI, HTTPException, Query, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

# ------------------------------------------------------------------ Configuration & Constants
CONTEXT = "kind-taints-lab"
NS = "gpu-lab"

CP = "taints-lab-control-plane"
GEN = "taints-lab-worker"
GPU = "taints-lab-worker2"
WORKERS = [GEN, GPU]

ROLE = {
    CP: "manager (control plane)",
    GEN: "🖥️ general-purpose node",
    GPU: "🎮 GPU node (reserved)",
}

ROLE_TYPE = {
    CP: "control-plane",
    GEN: "worker-general",
    GPU: "worker-gpu",
}

LAB_TAINT_KEYS = ["hardware", "maintenance", "gpu-fault"]
DEFAULT_VALUE = {"hardware": "gpu", "maintenance": "true", "gpu-fault": "true"}

WORKLOAD_CATALOG = [
    {
        "id": "website",
        "title": "🌐 Website (no toleration)",
        "file": "02-website.yaml",
        "description": "Ordinary NGINX website, 4 replicas. Must stay off the GPU node.",
        "app": "website",
        "color": "#2563eb",
    },
    {
        "id": "ml-toleration-only",
        "title": "🧠 ML job — toleration only",
        "file": "03-ml-training-toleration-only.yaml",
        "description": "Allowed on the GPU node, but not sent there (spreads over both workers).",
        "app": "ml-training",
        "color": "#7c3aed",
    },
    {
        "id": "ml-typo",
        "title": "⚠️ ML job — typo in toleration",
        "file": "04-ml-training-wrong-toleration.yaml",
        "description": "value 'gpus' instead of 'gpu' → does not match → kept off the GPU node.",
        "app": "ml-training-typo",
        "color": "#dc2626",
    },
    {
        "id": "ml-dedicated",
        "title": "🎯 ML job — toleration + nodeSelector",
        "file": "05-ml-training-dedicated.yaml",
        "description": "The correct setup: runs ONLY on the GPU node.",
        "app": "ml-training",
        "color": "#7c3aed",
    },
    {
        "id": "gpu-fault",
        "title": "💥 GPU-fault test Pods",
        "file": "06-gpu-fault-pods.yaml",
        "description": "3 Pods on the GPU node for the NoExecute test (no grace / 30 s grace / monitor).",
        "app": "gpu-fault-test",
        "color": "#db2777",
    },
]

ALLOWED_WORKLOAD_FILES = {w["file"] for w in WORKLOAD_CATALOG} | {"all", "all-workloads"}

# Resolve K8S manifests directory
K8S = Path(__file__).resolve().parent.parent.parent / "k8s"
if not K8S.exists():
    K8S = Path.cwd() / "CC_lab_evaluation_2" / "k8s"
    if not K8S.exists():
        K8S = Path.cwd() / "k8s"

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("taints-lab-backend")

# ------------------------------------------------------------------ In-Memory Command Log
log_lock = threading.Lock()
command_log: deque = deque(maxlen=30)


def record_log(label: str, command: str, returncode: int, output: str) -> Dict[str, Any]:
    entry = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "label": label,
        "command": command,
        "returncode": returncode,
        "output": output.strip(),
    }
    with log_lock:
        command_log.appendleft(entry)
    return entry


# ------------------------------------------------------------------ Kubectl Helpers
def kubectl(*args: str, timeout: int = 45) -> tuple[int, str]:
    cmd = ["kubectl", "--context", CONTEXT, *args]
    try:
        p = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
            timeout=timeout,
        )
        out = (p.stdout or "") + (p.stderr or "")
        return p.returncode, out.strip()
    except subprocess.TimeoutExpired:
        msg = f"Command timed out after {timeout}s: {' '.join(cmd)}"
        logger.error(msg)
        return -1, msg
    except Exception as e:
        msg = f"Command execution error: {str(e)}"
        logger.error(msg)
        return -1, msg


def kjson(*args: str) -> Optional[Dict[str, Any]]:
    code, out = kubectl(*args, "-o", "json")
    if code == 0:
        try:
            return json.loads(out)
        except Exception as e:
            logger.warning("Failed to decode JSON from kubectl %s: %s", " ".join(args), e)
            return None
    return None


def run_action(label: str, *args: str) -> tuple[int, str]:
    code, out = kubectl(*args)
    shown = " ".join(a.replace(str(K8S), "k8s").replace("\\", "/") for a in args)
    cmd_str = f"kubectl {shown}"
    record_log(label, cmd_str, code, out)
    return code, out


# ------------------------------------------------------------------ Formatting Helpers
def format_memory(mem_str: Optional[str]) -> str:
    """Format Kubernetes memory strings (e.g., 8057052Ki -> 7.7 GiB)."""
    if not mem_str:
        return "N/A"
    try:
        if mem_str.endswith("Ki"):
            ki = int(mem_str[:-2])
            gib = ki / (1024 * 1024)
            return f"{gib:.1f} GiB"
        elif mem_str.endswith("Mi"):
            mib = int(mem_str[:-2])
            return f"{mib / 1024:.1f} GiB" if mib >= 1024 else f"{mib} MiB"
        elif mem_str.endswith("Gi"):
            return f"{mem_str[:-2]} GiB"
        return mem_str
    except Exception:
        return str(mem_str)


# ------------------------------------------------------------------ Matching & Explain Engine
def tolerates(tol: dict, taint: dict) -> bool:
    """Kubernetes rule: does one toleration tolerate one taint?"""
    if tol.get("effect") and tol["effect"] != taint.get("effect"):
        return False
    op = tol.get("operator", "Equal")
    if not tol.get("key"):
        return op == "Exists"
    if tol.get("key") != taint.get("key"):
        return False
    return True if op == "Exists" else tol.get("value", "") == taint.get("value", "")


def taint_str(t: dict) -> str:
    val = f"={t['value']}" if t.get("value") else ""
    return f"{t.get('key', '')}{val}:{t.get('effect', '')}"


def explain(pod: dict, node: dict) -> tuple[str, List[str]]:
    """Evaluates whether pod can be scheduled on node according to taints, tolerations, and nodeSelector."""
    tols = pod.get("spec", {}).get("tolerations", [])
    reasons: List[str] = []
    verdict = "allowed"

    # Evaluate taints
    for taint in node.get("spec", {}).get("taints", []):
        if any(tolerates(t, taint) for t in tols):
            reasons.append(f"✅ taint `{taint_str(taint)}` is tolerated")
        elif taint.get("effect") == "PreferNoSchedule":
            reasons.append(f"🟠 taint `{taint_str(taint)}` not tolerated — only a preference")
            if verdict == "allowed":
                verdict = "avoided"
        else:
            reasons.append(f"⛔ taint `{taint_str(taint)}` is NOT tolerated")
            verdict = "blocked"

    # Evaluate nodeSelector
    labels = node.get("metadata", {}).get("labels", {})
    for k, v in (pod.get("spec", {}).get("nodeSelector") or {}).items():
        if labels.get(k) == v:
            reasons.append(f"✅ nodeSelector `{k}={v}` matches")
        else:
            reasons.append(f"⛔ nodeSelector `{k}={v}` does not match this node")
            verdict = "blocked"

    if not reasons:
        reasons.append("✅ no taints and no nodeSelector — any Pod may run here")

    return verdict, reasons


# ------------------------------------------------------------------ Markdown Report Generator
def generate_markdown_report(counts: dict, nodes: list, pods: list, events: list, ts: str) -> str:
    md = [
        "# 🎮 GPU Node Scheduling Lab — Cluster Snapshot Report",
        f"**Generated at:** `{ts}`  ",
        f"**Cluster Context:** `{CONTEXT}` | **Namespace:** `{NS}`\n",
        "---",
        "## 📊 Summary Overview",
        "| Metric | Value |",
        "|---|---|",
        f"| **Total Cluster Nodes** | {counts.get('nodes_count', 0)} |",
        f"| **GPU Node Reserved (`hardware=gpu:NoSchedule`)** | {'🟢 Yes' if counts.get('gpu_reserved') else '⚪ No'} |",
        f"| **Pods Successfully Placed** | {counts.get('pods_placed_count', 0)} |",
        f"| **Pods Pending** | {counts.get('pods_pending_count', 0)} |\n",
        "---",
        "## 🖥️ Node Status & Hardware Topology",
        "| Node Name | Role | Ready | CPU | Memory | Kernel / Runtime | Active Taints | Placed Pods |",
        "|---|---|---|---|---|---|---|---|",
    ]

    for n in nodes:
        taints_str = ", ".join(f"`{taint_str(t)}`" for t in n.get("taints", [])) or "*None*"
        ready_icon = "✅ Ready" if n.get("is_ready") else "❌ NotReady"
        kernel_runtime = f"{n.get('kernel_version', 'N/A')} / {n.get('runtime', 'N/A')}"
        cpu = n.get("cpu_capacity", "N/A")
        mem = n.get("memory_capacity", "N/A")
        md.append(f"| `{n['name']}` | {n.get('role', '')} | {ready_icon} | {cpu} | {mem} | {kernel_runtime} | {taints_str} | {n.get('pod_count', 0)} |")

    md.extend([
        "",
        "---",
        f"## 📦 Workload Pods (`{NS}`)",
    ])

    if pods:
        md.append("| Pod Name | Application | Phase | Assigned Node | Tolerations | nodeSelector |")
        md.append("|---|---|---|---|---|---|")
        for p in pods:
            tols = ", ".join(f"`{t.get('key')}={t.get('value', '')}:{t.get('effect', '')}`" for t in p.get("user_tolerations", [])) or "*None*"
            sel = ", ".join(f"`{k}={v}`" for k, v in (p.get("nodeSelector") or {}).items()) or "*None*"
            node_str = f"`{p.get('node')}`" if p.get("node") else "⏳ *Pending*"
            md.append(f"| `{p['name']}` | `{p.get('app', '')}` | {p.get('phase', '')} | {node_str} | {tols} | {sel} |")
    else:
        md.append("*No pods currently running in namespace.*")

    md.extend([
        "",
        "---",
        "## 📜 Recent Scheduling & Lifecycle Events",
    ])

    if events:
        md.append("| Last Seen (UTC) | Reason | Object | Message |")
        md.append("|---|---|---|---|")
        for e in events[:15]:
            msg = e.get("message", "").replace("|", "-")
            md.append(f"| {e.get('last_seen', '')} | `{e.get('reason', '')}` | `{e.get('object', '')}` | {msg} |")
    else:
        md.append("*No recent events recorded in namespace.*")

    md.extend([
        "",
        "---",
        "*Report automatically generated by GPU Node Scheduling Lab Engine.*",
    ])

    return "\n".join(md)


# ------------------------------------------------------------------ Pydantic Models
class GuidedStepRequest(BaseModel):
    step: int = Field(..., description="Guided step number: 1=Reserve GPU, 2=Maint On, 3=Maint Off, 4=GPU Fault, 5=GPU Repaired, 0=Reset")


class WorkloadRequest(BaseModel):
    action: str = Field(..., description="'deploy' or 'delete'")
    file: str = Field(..., description="Manifest filename or 'all'")


class TaintRequest(BaseModel):
    action: str = Field(..., description="'add' or 'remove'")
    node: str = Field(..., description="Worker node name (taints-lab-worker or taints-lab-worker2)")
    key: str = Field(..., description="Taint key")
    value: Optional[str] = Field(default="", description="Taint value")
    effect: Optional[str] = Field(default="NoSchedule", description="Taint effect (NoSchedule, PreferNoSchedule, NoExecute)")


class ScenarioRequest(BaseModel):
    scenario: str = Field(..., description="Scenario ID: S1, S2, S3, S4, S5, S6, S6b, S7, S7b, S8, reset")


# ------------------------------------------------------------------ FastAPI App Setup
app = FastAPI(
    title="GPU Node Scheduling Dashboard API",
    description="Backend API for Kubernetes Taints and Tolerations Lab",
    version="2.2.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ------------------------------------------------------------------ Endpoints
@app.get("/health")
@app.get("/api/health")
def health_check():
    return {
        "status": "ok",
        "cluster": CONTEXT,
        "namespace": NS,
        "manifests_dir": str(K8S),
        "manifests_exist": K8S.exists(),
    }


@app.get("/api/workloads")
def get_workload_catalog():
    """Returns the catalog of predefined lab workloads."""
    return WORKLOAD_CATALOG


@app.get("/api/status")
def get_status():
    """
    Returns full cluster status:
    - nodes: list of nodes with roles, taints, labels, ready condition, pod count, pod summaries,
             and exact hardware specs (cpu_capacity, memory_capacity, os_image, kernel_version, runtime).
    - pods: list of pods in gpu-lab with phase, node, tolerations, and nodeSelector
    - counts: node count, gpu_reserved flag, placed pods count, pending pods count
    - events: recent scheduling and taint eviction events
    - connected: boolean indicating if cluster is reachable
    """
    raw_nodes = kjson("get", "nodes")
    if raw_nodes is None:
        return {
            "connected": False,
            "counts": {
                "nodes_count": 0,
                "gpu_reserved": False,
                "pods_placed_count": 0,
                "pods_pending_count": 0,
            },
            "nodes": [],
            "pods": [],
            "events": [],
        }

    nodes_dict = {n["metadata"]["name"]: n for n in raw_nodes.get("items", [])}

    raw_pods = kjson("get", "pods", "-n", NS)
    pod_items = raw_pods.get("items", []) if raw_pods else []

    # Process pods
    pods_list: List[Dict[str, Any]] = []
    placed_pods: List[Dict[str, Any]] = []
    pending_pods: List[Dict[str, Any]] = []

    for p in pod_items:
        meta = p.get("metadata", {})
        spec = p.get("spec", {})
        status_info = p.get("status", {})
        node_name = spec.get("nodeName")
        labels = meta.get("labels", {})
        is_terminating = bool(meta.get("deletionTimestamp"))
        phase = "terminating" if is_terminating else status_info.get("phase", "Unknown")

        # Container ready status
        c_statuses = status_info.get("containerStatuses", [])
        ready = len(c_statuses) > 0 and all(c.get("ready", False) for c in c_statuses)
        if not ready:
            ready = any(
                cond.get("type") == "Ready" and cond.get("status") == "True"
                for cond in status_info.get("conditions", [])
            )

        tols = spec.get("tolerations", [])
        user_tols = [t for t in tols if not t.get("key", "").startswith("node.kubernetes.io/")]

        pod_obj = {
            "name": meta.get("name"),
            "namespace": meta.get("namespace", NS),
            "app": labels.get("app", ""),
            "tier": labels.get("tier", ""),
            "case": labels.get("case", ""),
            "phase": phase,
            "node": node_name,
            "ready": ready,
            "tolerations": tols,
            "user_tolerations": user_tols,
            "nodeSelector": spec.get("nodeSelector") or {},
            "creationTimestamp": meta.get("creationTimestamp"),
            "deletionTimestamp": meta.get("deletionTimestamp"),
            "is_terminating": is_terminating,
        }
        pods_list.append(pod_obj)
        if node_name:
            placed_pods.append(pod_obj)
        else:
            pending_pods.append(pod_obj)

    # Process nodes
    nodes_list: List[Dict[str, Any]] = []
    ordered_names = [CP, GEN, GPU] + [k for k in nodes_dict.keys() if k not in (CP, GEN, GPU)]

    for name in ordered_names:
        if name not in nodes_dict:
            continue
        n = nodes_dict[name]
        n_meta = n.get("metadata", {})
        n_spec = n.get("spec", {})
        n_status = n.get("status", {})
        n_labels = n_meta.get("labels", {})

        taints = n_spec.get("taints", [])
        hardware_label = n_labels.get("hardware")
        is_ready = any(
            cond.get("type") == "Ready" and cond.get("status") == "True"
            for cond in n_status.get("conditions", [])
        )

        node_placed_pods = [p for p in placed_pods if p.get("node") == name]
        node_placed_pods.sort(key=lambda x: x["name"])

        # Node hardware info & runtime
        node_info = n_status.get("nodeInfo", {})
        capacity = n_status.get("capacity", {})
        allocatable = n_status.get("allocatable", {})

        raw_cpu = capacity.get("cpu", "8")
        cpu_capacity_str = f"{raw_cpu} cores" if not str(raw_cpu).endswith("cores") else str(raw_cpu)
        mem_capacity_str = format_memory(capacity.get("memory"))

        raw_kernel = node_info.get("kernelVersion", "N/A")
        clean_kernel = raw_kernel.replace("-microsoft-standard-WSL2", "-WSL2") if "WSL2" in raw_kernel else raw_kernel
        raw_os = node_info.get("osImage", "Debian GNU/Linux 13")
        runtime_str = node_info.get("containerRuntimeVersion", "containerd://2.3.4")

        nodes_list.append({
            "name": name,
            "role": ROLE.get(name, "worker"),
            "role_type": ROLE_TYPE.get(name, "worker"),
            "taints": taints,
            "labels": n_labels,
            "hardware": hardware_label,
            "is_ready": is_ready,
            "pod_count": len(node_placed_pods),
            "pods": node_placed_pods,
            "creationTimestamp": n_meta.get("creationTimestamp"),
            # Hardware specs matching requirements
            "cpu_capacity": cpu_capacity_str,
            "memory_capacity": mem_capacity_str,
            "os_image": raw_os,
            "kernel_version": clean_kernel,
            "runtime": runtime_str,
            # Extra detail fields
            "raw_cpu_cores": raw_cpu,
            "raw_kernel_version": raw_kernel,
            "container_runtime": runtime_str,
            "cpu_allocatable": allocatable.get("cpu", "N/A"),
            "memory_allocatable": allocatable.get("memory", "N/A"),
            "kubelet_version": node_info.get("kubeletVersion", "N/A"),
            "architecture": node_info.get("architecture", "amd64"),
        })

    # Counts
    gpu_node = nodes_dict.get(GPU, {})
    gpu_taints = gpu_node.get("spec", {}).get("taints", [])
    gpu_reserved = any(t.get("key") == "hardware" for t in gpu_taints)

    counts = {
        "nodes_count": len(nodes_list),
        "gpu_reserved": gpu_reserved,
        "pods_placed_count": len(placed_pods),
        "pods_pending_count": len(pending_pods),
    }

    # Events
    raw_events = kjson("get", "events", "-n", NS)
    event_items = raw_events.get("items", []) if raw_events else []
    events_list: List[Dict[str, Any]] = []

    for e in event_items:
        reason = e.get("reason", "")
        last_seen = e.get("lastTimestamp") or e.get("eventTime") or e.get("metadata", {}).get("creationTimestamp") or ""
        events_list.append({
            "last_seen": last_seen,
            "type": e.get("type", "Normal"),
            "reason": reason,
            "object": e.get("involvedObject", {}).get("name", ""),
            "message": (e.get("message") or "")[:200],
        })

    events_list.sort(key=lambda x: x["last_seen"], reverse=True)

    return {
        "connected": True,
        "counts": counts,
        "nodes": nodes_list,
        "pods": pods_list,
        "events": events_list[:50],
    }


@app.get("/api/cluster-details")
def get_cluster_details():
    """
    Returns enhanced cluster health, node resources, and infrastructure statistics.
    """
    status_resp = get_status()
    if not status_resp.get("connected"):
        return {
            "connected": False,
            "cluster_status": "Unreachable",
            "message": f"Cluster '{CONTEXT}' is unreachable.",
        }

    nodes = status_resp.get("nodes", [])
    all_ready = all(n.get("is_ready", False) for n in nodes)

    total_cpu = 0
    for n in nodes:
        try:
            total_cpu += int(n.get("raw_cpu_cores", 0))
        except (ValueError, TypeError):
            pass

    return {
        "connected": True,
        "cluster": CONTEXT,
        "namespace": NS,
        "cluster_status": "Healthy" if all_ready else "Degraded",
        "nodes_count": len(nodes),
        "total_cpu_cores": total_cpu,
        "nodes": nodes,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


@app.get("/api/pod-logs/{pod_name}")
def get_pod_logs(pod_name: str, tail: int = Query(default=80, ge=1, le=500)):
    """
    Fetches real-time stdout/stderr logs from the specified pod in namespace gpu-lab.
    Safely handles Pending, initializing, terminating, or non-existent pods without 500 errors.
    """
    ts = datetime.now(timezone.utc).isoformat()
    raw_pods = kjson("get", "pods", "-n", NS)
    pod_items = raw_pods.get("items", []) if raw_pods else []
    pod = next((p for p in pod_items if p.get("metadata", {}).get("name") == pod_name), None)

    if not pod:
        return {
            "pod": pod_name,
            "logs": f"Pod '{pod_name}' was not found in namespace '{NS}'.",
            "timestamp": ts,
            "success": False,
        }

    status_info = pod.get("status", {})
    phase = status_info.get("phase", "Unknown")

    if phase == "Pending":
        waiting_reasons = []
        for cs in status_info.get("containerStatuses", []):
            waiting = cs.get("state", {}).get("waiting", {})
            if waiting:
                reason = waiting.get("reason", "Waiting")
                message = waiting.get("message", "")
                waiting_reasons.append(f"• Container '{cs.get('name')}': {reason} - {message}")
        
        detail_msg = "\n".join(waiting_reasons) if waiting_reasons else "• Waiting for Kubernetes scheduler to assign an eligible node."
        return {
            "pod": pod_name,
            "logs": f"⏳ Pod '{pod_name}' is currently PENDING.\nContainers have not started yet.\n\nStatus Details:\n{detail_msg}",
            "timestamp": ts,
            "success": False,
        }

    code, out = kubectl("logs", "-n", NS, pod_name, f"--tail={tail}", timeout=10)

    if code != 0:
        clean_out = out.strip()
        if "ContainerCreating" in clean_out or "PodInitializing" in clean_out:
            clean_msg = f"⏳ Container is still creating/initializing:\n{clean_out}"
        elif "NotFound" in clean_out:
            clean_msg = f"Pod '{pod_name}' is no longer available."
        else:
            clean_msg = f"Logs not yet available:\n{clean_out}"

        return {
            "pod": pod_name,
            "logs": clean_msg,
            "timestamp": ts,
            "success": False,
        }

    return {
        "pod": pod_name,
        "logs": out if out.strip() else "(Pod is running but has not output any logs yet)",
        "timestamp": ts,
        "success": True,
    }


@app.get("/api/export")
def export_cluster_report():
    """
    Exports the current cluster snapshot: nodes, taints, placed pods, pending pods,
    recent events, and a formatted GitHub-ready Markdown report table.
    """
    status_resp = get_status()
    ts = datetime.now(timezone.utc).isoformat()

    counts = status_resp.get("counts", {})
    nodes = status_resp.get("nodes", [])
    pods = status_resp.get("pods", [])
    events = status_resp.get("events", [])

    markdown_report = generate_markdown_report(counts, nodes, pods, events, ts)

    return {
        "timestamp": ts,
        "counts": counts,
        "nodes": nodes,
        "pods": pods,
        "events": events,
        "markdown_report": markdown_report,
    }


@app.post("/api/action/run-scenario")
def run_scenario(payload: ScenarioRequest):
    """
    Auto-Pilot Scenario Runner API:
    Executes the exact kubectl sequence for S1 through S8 from scripts/run_experiment.py.
    Supported: S1, S2, S3, S4, S5, S6, S6b, S7, S7b, S8, reset.
    Returns: { "scenario": str, "success": bool, "summary": str, "commands": list, "snapshot": dict }
    """
    sc = payload.scenario.strip().upper()
    executed_commands = []

    def run_cmd(label: str, *args: str):
        c, o = run_action(label, *args)
        executed_commands.append({"label": label, "cmd": " ".join(args), "code": c, "output": o})
        return c, o

    # Helper: Ensure namespace gpu-lab exists
    ns_file = K8S / "01-namespace.yaml"
    if ns_file.is_file():
        kubectl("apply", "-f", str(ns_file))

    # Helper: Clean existing deployments/pods
    def clean_existing_workloads():
        run_cmd("cleanup workloads", "delete", "deployment,pod", "-n", NS, "--all", "--ignore-not-found", "--wait=false")

    if sc == "S1":
        # S1: Baseline (GPU node not reserved yet; website spreads everywhere)
        for k in LAB_TAINT_KEYS:
            kubectl("taint", "nodes", GPU, f"{k}-")
            kubectl("taint", "nodes", GPU, f"{k}:NoSchedule-")
            kubectl("taint", "nodes", GPU, f"{k}:PreferNoSchedule-")
            kubectl("taint", "nodes", GEN, f"{k}-")
        kubectl("label", "nodes", GPU, "hardware-")
        clean_existing_workloads()
        run_cmd("S1 deploy website", "apply", "-f", str(K8S / "02-website.yaml"))
        summary = "S1 Baseline: Deployed website before reserving the GPU node. Because neither worker has taints, pods spread evenly across both general-purpose and GPU nodes (2 on worker, 2 on worker2)."

    elif sc == "S2":
        # S2: Website without toleration (kept off the GPU node)
        run_cmd("S2 label GPU", "label", "nodes", GPU, "hardware=gpu", "--overwrite")
        run_cmd("S2 taint GPU", "taint", "nodes", GPU, "hardware=gpu:NoSchedule", "--overwrite")
        kubectl("taint", "nodes", GEN, "maintenance-")
        clean_existing_workloads()
        run_cmd("S2 deploy website", "apply", "-f", str(K8S / "02-website.yaml"))
        summary = "S2 Website without Toleration: GPU node is reserved with hardware=gpu:NoSchedule. The website pods lack a matching toleration, so all 4 replicas schedule exclusively on the general worker node (0 on GPU node)."

    elif sc == "S3":
        # S3: ML job toleration only (allowed on GPU, but not forced)
        run_cmd("S3 label GPU", "label", "nodes", GPU, "hardware=gpu", "--overwrite")
        run_cmd("S3 taint GPU", "taint", "nodes", GPU, "hardware=gpu:NoSchedule", "--overwrite")
        kubectl("taint", "nodes", GEN, "maintenance-")
        clean_existing_workloads()
        run_cmd("S3 deploy ML job", "apply", "-f", str(K8S / "03-ml-training-toleration-only.yaml"))
        summary = "S3 Toleration Only: The ML training job tolerates hardware=gpu:NoSchedule but lacks a nodeSelector. The taint no longer repels it from the GPU node, but nothing forces it there either, so replicas distribute across both workers."

    elif sc == "S4":
        # S4: ML job with typo in toleration (gpus instead of gpu)
        run_cmd("S4 label GPU", "label", "nodes", GPU, "hardware=gpu", "--overwrite")
        run_cmd("S4 taint GPU", "taint", "nodes", GPU, "hardware=gpu:NoSchedule", "--overwrite")
        kubectl("taint", "nodes", GEN, "maintenance-")
        clean_existing_workloads()
        run_cmd("S4 deploy ML typo", "apply", "-f", str(K8S / "04-ml-training-wrong-toleration.yaml"))
        summary = "S4 Typo in Toleration: Toleration specifies key 'hardware' and value 'gpus' instead of 'gpu'. Because Equal operator requires exact match of key, value, and effect, the taint is NOT tolerated and all 4 pods are kept off the GPU node."

    elif sc == "S5":
        # S5: Dedicated GPU node (ML dedicated + website)
        run_cmd("S5 label GPU", "label", "nodes", GPU, "hardware=gpu", "--overwrite")
        run_cmd("S5 taint GPU", "taint", "nodes", GPU, "hardware=gpu:NoSchedule", "--overwrite")
        kubectl("taint", "nodes", GEN, "maintenance-")
        clean_existing_workloads()
        run_cmd("S5 deploy website", "apply", "-f", str(K8S / "02-website.yaml"))
        run_cmd("S5 deploy dedicated ML", "apply", "-f", str(K8S / "05-ml-training-dedicated.yaml"))
        summary = "S5 Dedicated GPU Node: Production configuration combining toleration (allows GPU node) and nodeSelector hardware=gpu (restricts only to GPU node). ML pods run exclusively on the GPU node (3 replicas), while website pods run on the general worker (4 replicas)."

    elif sc == "S6":
        # S6: General node maintenance (website has nowhere to go -> Pending)
        run_cmd("S6 taint GPU", "taint", "nodes", GPU, "hardware=gpu:NoSchedule", "--overwrite")
        run_cmd("S6 maintenance taint", "taint", "nodes", GEN, "maintenance=true:NoSchedule", "--overwrite")
        clean_existing_workloads()
        run_cmd("S6 deploy website", "apply", "-f", str(K8S / "02-website.yaml"))
        summary = "S6 General Maintenance: General-purpose worker is tainted with maintenance=true:NoSchedule. Since website pods tolerate neither maintenance nor the GPU taint, all 4 pods are rejected by all nodes and remain in Pending status."

    elif sc == "S6B":
        # S6b: Maintenance finished -> Pending pods recover
        run_cmd("S6b remove maintenance", "taint", "nodes", GEN, "maintenance-")
        summary = "S6b Maintenance Cleared: Maintenance taint removed from general worker. The Kubernetes scheduler immediately re-evaluates the Pending website pods and schedules them on the newly available general worker."

    elif sc == "S7":
        # S7: Soft taint (PreferNoSchedule) -> GPU node avoided if possible
        kubectl("taint", "nodes", GPU, "hardware:NoSchedule-")
        run_cmd("S7 soft taint GPU", "taint", "nodes", GPU, "hardware=gpu:PreferNoSchedule", "--overwrite")
        run_cmd("S7 label GPU", "label", "nodes", GPU, "hardware=gpu", "--overwrite")
        kubectl("taint", "nodes", GEN, "maintenance-")
        clean_existing_workloads()
        run_cmd("S7 deploy website", "apply", "-f", str(K8S / "02-website.yaml"))
        summary = "S7 Soft Taint (PreferNoSchedule): GPU node is tainted with PreferNoSchedule. The scheduler treats this as a preference rather than a hard barrier; all 4 website replicas are scheduled on the general node while capacity exists."

    elif sc == "S7B":
        # S7b: Soft taint spillover under maintenance / load
        run_cmd("S7b soft taint GPU", "taint", "nodes", GPU, "hardware=gpu:PreferNoSchedule", "--overwrite")
        run_cmd("S7b maintenance taint", "taint", "nodes", GEN, "maintenance=true:NoSchedule", "--overwrite")
        run_cmd("S7b scale website", "scale", "deployment/website", "-n", NS, "--replicas=6")
        summary = "S7b Soft Taint Spillover: General node placed under hard maintenance. Because PreferNoSchedule is only a preference, Kubernetes permits website pods to overflow onto the GPU node rather than leaving them Pending."

    elif sc == "S8":
        # S8: GPU fault NoExecute -> Eviction of running pods
        run_cmd("S8 label GPU", "label", "nodes", GPU, "hardware=gpu", "--overwrite")
        run_cmd("S8 taint GPU", "taint", "nodes", GPU, "hardware=gpu:NoSchedule", "--overwrite")
        kubectl("taint", "nodes", GEN, "maintenance-")
        clean_existing_workloads()
        run_cmd("S8 deploy fault test pods", "apply", "-f", str(K8S / "06-gpu-fault-pods.yaml"))
        run_cmd("S8 NoExecute fault taint", "taint", "nodes", GPU, "gpu-fault=true:NoExecute", "--overwrite")
        summary = "S8 NoExecute Eviction: Applied gpu-fault=true:NoExecute on GPU node. Running pods without toleration (ml-job-no-grace) are evicted immediately; pods with tolerationSeconds (ml-job-grace-30s) are evicted after 30s grace; monitoring pods with full toleration remain running."

    elif sc in ("RESET", "0"):
        # Reset lab
        for w in WORKERS:
            for k in LAB_TAINT_KEYS:
                kubectl("taint", "nodes", w, f"{k}-")
                kubectl("taint", "nodes", w, f"{k}:PreferNoSchedule-")
                kubectl("taint", "nodes", w, f"{k}:NoSchedule-")
                kubectl("taint", "nodes", w, f"{k}:NoExecute-")
        run_cmd("reset label", "label", "nodes", GPU, "hardware-")
        clean_existing_workloads()
        summary = "Lab Reset: Cleared all lab taints, hardware labels, and workload objects. Cluster returned to clean baseline state."

    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unknown scenario '{payload.scenario}'. Supported scenarios: S1, S2, S3, S4, S5, S6, S6b, S7, S7b, S8, reset",
        )

    # Allow brief moment for initial k8s scheduling state
    time.sleep(1.0)
    current_snapshot = get_status()

    return {
        "scenario": payload.scenario,
        "success": True,
        "summary": summary,
        "commands": executed_commands,
        "snapshot": current_snapshot,
    }


@app.post("/api/action/guided-step")
def run_guided_step(payload: GuidedStepRequest):
    """
    Executes a predefined guided step:
    1 = Reserve GPU node (label hardware=gpu + taint hardware=gpu:NoSchedule)
    2 = Maintenance on (taint worker maintenance=true:NoSchedule)
    3 = Maintenance off (remove worker maintenance taint)
    4 = GPU fault (taint worker2 gpu-fault=true:NoExecute)
    5 = GPU repaired (remove worker2 gpu-fault taint)
    0 = Reset lab (clear all lab taints and labels)
    """
    step = payload.step
    executed = []

    if step == 1:
        c1, o1 = run_action("label", "label", "nodes", GPU, "hardware=gpu", "--overwrite")
        c2, o2 = run_action("taint", "taint", "nodes", GPU, "hardware=gpu:NoSchedule", "--overwrite")
        executed.extend([{"cmd": "label hardware=gpu", "code": c1, "output": o1},
                         {"cmd": "taint hardware=gpu:NoSchedule", "code": c2, "output": o2}])
        msg = f"Step 1 executed: Reserved GPU node {GPU}"

    elif step == 2:
        c, o = run_action("maintenance on", "taint", "nodes", GEN, "maintenance=true:NoSchedule", "--overwrite")
        executed.append({"cmd": "taint maintenance=true:NoSchedule", "code": c, "output": o})
        msg = f"Step 2 executed: General node {GEN} placed into maintenance"

    elif step == 3:
        c, o = run_action("maintenance off", "taint", "nodes", GEN, "maintenance-")
        executed.append({"cmd": "taint maintenance-", "code": c, "output": o})
        msg = f"Step 3 executed: General node {GEN} maintenance finished"

    elif step == 4:
        c, o = run_action("gpu fault", "taint", "nodes", GPU, "gpu-fault=true:NoExecute", "--overwrite")
        executed.append({"cmd": "taint gpu-fault=true:NoExecute", "code": c, "output": o})
        msg = f"Step 4 executed: GPU fault simulated with NoExecute on {GPU}"

    elif step == 5:
        c, o = run_action("gpu repaired", "taint", "nodes", GPU, "gpu-fault-")
        executed.append({"cmd": "taint gpu-fault-", "code": c, "output": o})
        msg = f"Step 5 executed: GPU repaired; NoExecute taint removed from {GPU}"

    elif step == 0:
        for w in WORKERS:
            for k in LAB_TAINT_KEYS:
                kubectl("taint", "nodes", w, f"{k}-")
        c, o = run_action("reset", "label", "nodes", GPU, "hardware-")
        executed.append({"cmd": "reset lab taints and label", "code": c, "output": o})
        msg = "Lab reset: removed all lab taints and hardware label"

    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid step {step}. Valid steps: 0, 1, 2, 3, 4, 5",
        )

    return {"success": True, "step": step, "message": msg, "executed": executed}


@app.post("/api/action/workload")
def run_workload_action(payload: WorkloadRequest):
    """
    Deploys or deletes a workload manifest from k8s directory.
    Supports: 02-website.yaml, 03-ml-training-toleration-only.yaml,
              04-ml-training-wrong-toleration.yaml, 05-ml-training-dedicated.yaml,
              06-gpu-fault-pods.yaml, or 'all'.
    """
    action = payload.action.strip().lower()
    filename = payload.file.strip()

    if action not in ("deploy", "delete"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid action '{action}'. Must be 'deploy' or 'delete'.",
        )

    if filename not in ALLOWED_WORKLOAD_FILES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid workload file '{filename}'. Allowed files: {sorted(list(ALLOWED_WORKLOAD_FILES))}",
        )

    if action == "delete" and filename in ("all", "all-workloads"):
        code, out = run_action("delete namespace", "delete", "namespace", NS, "--wait=false")
        return {
            "success": code == 0,
            "action": "delete",
            "file": "all",
            "message": f"Triggered deletion of namespace {NS}",
            "returncode": code,
            "output": out,
        }

    manifest_path = K8S / filename
    if not manifest_path.is_file():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Manifest file '{filename}' not found in {K8S}",
        )

    if action == "deploy":
        ns_path = K8S / "01-namespace.yaml"
        if ns_path.is_file():
            kubectl("apply", "-f", str(ns_path))

        code, out = run_action(f"deploy {filename}", "apply", "-f", str(manifest_path))
        return {
            "success": code == 0,
            "action": "deploy",
            "file": filename,
            "message": f"Applied {filename}",
            "returncode": code,
            "output": out,
        }

    else:  # delete
        code, out = run_action(
            f"delete {filename}",
            "delete",
            "-f",
            str(manifest_path),
            "--ignore-not-found",
            "--wait=false",
        )
        return {
            "success": code == 0,
            "action": "delete",
            "file": filename,
            "message": f"Deleted resources from {filename}",
            "returncode": code,
            "output": out,
        }


@app.post("/api/action/taint")
def run_taint_action(payload: TaintRequest):
    """
    Adds or removes a taint on a worker node.
    Safeguard: strictly prohibited on control-plane.
    """
    action = payload.action.strip().lower()
    node = payload.node.strip()
    key = payload.key.strip()
    value = payload.value.strip() if payload.value else ""
    effect = payload.effect.strip() if payload.effect else "NoSchedule"

    if node not in WORKERS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot modify taints on '{node}'. Safety policy strictly prohibits modifying {CP}. Allowed worker nodes: {WORKERS}",
        )

    if not key:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Taint key cannot be empty.",
        )

    if action == "add":
        if effect not in ("NoSchedule", "PreferNoSchedule", "NoExecute"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid taint effect '{effect}'. Must be NoSchedule, PreferNoSchedule, or NoExecute.",
            )
        taint_spec = f"{key}={value}:{effect}" if value else f"{key}:{effect}"
        code, out = run_action("add taint", "taint", "nodes", node, taint_spec, "--overwrite")
        return {
            "success": code == 0,
            "action": "add",
            "node": node,
            "taint": taint_spec,
            "returncode": code,
            "output": out,
        }

    elif action == "remove":
        taint_spec = f"{key}:{effect}-" if effect else f"{key}-"
        code, out = run_action("remove taint", "taint", "nodes", node, taint_spec)
        return {
            "success": code == 0,
            "action": "remove",
            "node": node,
            "taint": taint_spec,
            "returncode": code,
            "output": out,
        }

    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid action '{action}'. Must be 'add' or 'remove'.",
        )


@app.get("/api/yaml/{filename}")
def get_manifest_yaml(filename: str):
    """Returns raw YAML manifest content from the k8s directory."""
    clean_name = Path(filename).name
    target = K8S / clean_name

    if not target.is_file() or clean_name != filename:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Manifest '{filename}' not found in {K8S}",
        )

    try:
        content = target.read_text(encoding="utf-8")
        return {"filename": clean_name, "content": content}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error reading '{filename}': {str(e)}",
        )


@app.get("/api/explain/{pod_name}")
def explain_pod(pod_name: str):
    """
    Evaluates and explains scheduling compatibility of the specified pod
    across all nodes (control-plane, worker, worker2) using exact taints/tolerations/nodeSelector matching.
    """
    raw_pods = kjson("get", "pods", "-n", NS)
    if not raw_pods or "items" not in raw_pods:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Pod '{pod_name}' not found. No pods in namespace '{NS}'.",
        )

    pod = next((p for p in raw_pods["items"] if p.get("metadata", {}).get("name") == pod_name), None)
    if not pod:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Pod '{pod_name}' not found in namespace '{NS}'.",
        )

    raw_nodes = kjson("get", "nodes")
    if not raw_nodes or "items" not in raw_nodes:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Cannot fetch cluster nodes.",
        )

    nodes = {n["metadata"]["name"]: n for n in raw_nodes.get("items", [])}

    p_meta = pod.get("metadata", {})
    p_spec = pod.get("spec", {})
    p_labels = p_meta.get("labels", {})

    all_tols = p_spec.get("tolerations", [])
    user_tols = [t for t in all_tols if not t.get("key", "").startswith("node.kubernetes.io/")]

    evaluations = []
    target_nodes = [CP, GEN, GPU] + [name for name in nodes.keys() if name not in (CP, GEN, GPU)]

    for name in target_nodes:
        node_obj = nodes.get(name)
        if not node_obj:
            continue
        verdict, reasons = explain(pod, node_obj)
        badge = {
            "allowed": "🟢 ALLOWED",
            "avoided": "🟠 ALLOWED, BUT AVOIDED",
            "blocked": "🔴 BLOCKED",
        }.get(verdict, verdict.upper())

        evaluations.append({
            "node": name,
            "role": ROLE.get(name, "worker"),
            "role_type": ROLE_TYPE.get(name, "worker"),
            "verdict": verdict,
            "status_badge": badge,
            "reasons": reasons,
        })

    is_terminating = bool(p_meta.get("deletionTimestamp"))
    phase = "terminating" if is_terminating else pod.get("status", {}).get("phase", "Unknown")

    return {
        "pod_name": pod_name,
        "placed_node": p_spec.get("nodeName") or "Pending",
        "app": p_labels.get("app", ""),
        "tier": p_labels.get("tier", ""),
        "phase": phase,
        "tolerations": user_tols,
        "all_tolerations": all_tols,
        "nodeSelector": p_spec.get("nodeSelector") or {},
        "evaluations": evaluations,
    }


@app.get("/api/logs")
def get_command_logs(limit: int = Query(default=30, ge=1, le=100)):
    """Returns the buffer of executed kubectl commands, newest first."""
    with log_lock:
        logs = list(command_log)[:limit]
    return logs


# ------------------------------------------------------------------ Server Runner
if __name__ == "__main__":
    import uvicorn

    logger.info("Starting GPU Node Scheduling API on http://0.0.0.0:8000 (context=%s)", CONTEXT)
    uvicorn.run("server:app", host="0.0.0.0", port=8000, reload=True)
