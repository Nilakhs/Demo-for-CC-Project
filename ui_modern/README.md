# Modern GPU Node Scheduling Dashboard (React + Vite + Tailwind + FastAPI)

A production-grade, responsive dashboard for **Problem 07: Pod Scheduling Using Taints and Tolerations** (`kind-taints-lab` Kubernetes cluster).

Built as an upgrade alongside the classic Streamlit dashboard, featuring micro-interactive animations, touch-sensitive tactile controls, live SVG telemetry rings, and full cluster introspection.

---

## 🌟 Key Features

1. **Cyber/Cloud Glassmorphic UI**:
   - Modern dark theme with glowing neon accents (`#00f0ff` cyan, `#8b5cf6` violet, `#10b981` emerald, `#f59e0b` amber, `#ef4444` crimson).
   - Translucent card styling with backdrop blur and responsive border lighting.

2. **Touch-Sensitive & Micro-Interactive Buttons**:
   - Spring-like active click/press depressions (`active:scale-95`).
   - Glowing hover state transitions and tactile feedback.
   - Live loading spinners during `kubectl` asynchronous actions.

3. **Live Telemetry & Teleport Countdown**:
   - Animated SVG circular countdown timer ring visualizing time remaining before the next auto-poll.
   - Configurable refresh interval slider (2s to 15s) and manual sync button.

4. **Cluster Node Cards & Pod Chips**:
   - Visual cards for **Manager (Control Plane)**, **General Worker**, **GPU Worker**, and **Pending Queue**.
   - Color-coded badges for taints: 🔴 `NoSchedule`, 🟠 `PreferNoSchedule`, 🟣 `NoExecute`.
   - Pod chips with live pulsing health dots (Green = Running, Pulsing Red = Terminating, Amber = Pending).
   - **Clicking any pod immediately opens the "Why is this Pod here?" evaluation drawer!**

5. **5 Full Feature Tabs**:
   - ▶️ **Guided Steps**: Interactive stepper for the 5 evaluation scenarios (Reserve GPU, Maintenance on/off, GPU Fault eviction, and Lab Reset).
   - 🚀 **Workloads Manager**: One-click deploy/delete for Website, ML Toleration-only, ML Typo, ML Dedicated, and Fault test pods, plus an interactive YAML viewer modal with copy-to-clipboard.
   - 🚫 **Taint Studio**: Visual taint builder and active taint management table with one-click removal.
   - 🔍 **"Why is this Pod here?" Inspector**: Compares any pod across all 3 nodes simultaneously with an itemized verdict (`🟢 ALLOWED`, `🟠 ALLOWED BUT AVOIDED`, `🔴 BLOCKED`).
   - 📜 **Live Events & Audit Log**: Filterable Kubernetes events table and terminal-style `kubectl` command execution log with exit codes and execution output.

---

## 🚀 How to Run

### Option 1: One-Click Batch Script
Double-click:
```powershell
.\start_modern_dashboard.bat
```
*(Automatically starts the FastAPI backend on port 8000, the Vite React frontend on port 5173, and opens your default browser at `http://localhost:5173`)*

### Option 2: Python Runner
From `CC_lab_evaluation_2`:
```powershell
& "C:\Users\nilak\AppData\Local\Python\pythoncore-3.11-64\python.exe" ui_modern/run_dashboard.py
```

### Option 3: Manual Startup
Terminal 1 (Backend):
```powershell
cd ui_modern/backend
& "C:\Users\nilak\AppData\Local\Python\pythoncore-3.11-64\python.exe" server.py
# Runs at http://127.0.0.1:8000 (API Docs at http://127.0.0.1:8000/docs)
```

Terminal 2 (Frontend):
```powershell
cd ui_modern/frontend
npm run dev
# Runs at http://localhost:5173
```
