# Cosmos Kubernetes Studio — GPU Node Scheduling Dashboard

Award-winning, luxury dark space themed React + Vite + Tailwind CSS dashboard for **Problem 07: Pod Scheduling Using Taints and Tolerations** (Cloud Computing Lab Evaluation 2).

## Tech Stack
- **Framework:** React 19 + TypeScript (Strict mode, `verbatimModuleSyntax: true`)
- **Build Tool:** Vite 8 (with proxy to backend at `http://localhost:8000`)
- **Cosmic Engine:** HTML5 Canvas particle system with multi-layered twinkling stars, celestial nebulae, and periodic meteor showers
- **Styling:** Tailwind CSS 3.4 with dark space aesthetic, glassmorphic panels, and neon glowing accents (emerald, cyan, violet, amber, crimson)
- **Icons:** Lucide-React
- **Haptics / Sound:** Native Web Audio API synthesizer for tactile sci-fi sound effects (zero external .mp3 dependencies)
- **State & Fallback:** Dual-mode architecture (Seamless real-time polling of FastAPI backend with intelligent, stateful local simulation fallback)

## Multi-View Spatial Navigation

Instead of an endless single-page scroll with cluttered micro-badges, Cosmos Studio is divided into 7 dedicated, focused views:

1. 🌌 **Observatory (Main Dashboard):**
   - Refined cosmic telemetry strip (Total Nodes, GPU Reserved Status, Placed Pods, Pending Queue).
   - 4 spatial node cards with cosmic depth:
     - **Control Plane (`taints-lab-control-plane`):** Protected by system taint.
     - **General Worker (`taints-lab-worker`):** Open to general web and standard jobs.
     - **Dedicated GPU Node (`taints-lab-worker2`):** Cosmic violet aura, `hardware=gpu` tag, ML training pod chips.
     - **Pending Queue:** Amber alert dock when workloads are unscheduled.
   - Pod chips with quick action buttons: View Logs (`>_`), Inspect Why (`?`).

2. 🚀 **Mission Steps (Guided Evaluation Stepper):**
   - Clean, dedicated timeline for the 5 evaluation steps + Lab Reset.
   - Live cluster impact telemetry dock at the top (Worker 1 status, Worker 2 status, Pending count) so you see immediate results when running steps!

3. 📦 **Workload Fleet:**
   - Grid of the 5 workloads (Website, ML Toleration Only, ML Typo, ML Dedicated, GPU Fault Pods).
   - Clean Deploy & Delete buttons + "View YAML" modal with line-numbered syntax view and copy button.

4. 🛡️ **Taint Studio (Policy Observatory):**
   - Visual taint inspector & policy builder for cluster worker nodes.
   - Live CLI command previews (`kubectl taint nodes ...`).

5. 🔍 **Decision Inspector ("Why is this Pod here?"):**
   - 3-node comparison grid showing verdict (`🟢 ALLOWED`, `🟠 ALLOWED BUT AVOIDED`, `🔴 BLOCKED`) with itemized reasons explaining exact taint and selector matching.

6. 🧭 **Scheduler Flow Simulator (Orbital Routing Engine):**
   - Interactive 2-phase scheduler animation showing how pods route through Filtering (Predicates) and Scoring (Priorities) into the winning node.

7. 📜 **Mission Audit (Events & Command Terminal):**
   - Real-time Kubernetes events timeline with type/search filters.
   - Raw `kubectl` command execution audit log with exit codes and stdout outputs.

## Evaluation & Presentation Modals
- 💻 **Live Pod Logs Modal (`PodLogsModal.tsx`):** Real-time container stdout/stderr stream with auto-tail (`tail -f`), log filtering, and copy features.
- 🎓 **Viva Defense Cheat Sheet Modal (`VivaGuideModal.tsx`):** Exam Q&A, PID 1 SIGTERM container engineering story (reducing eviction time from 32s to 1.2s), taint comparison matrix.
- 📥 **Export Report:** One-click Markdown evaluation report download.
- 📄 **YAML Manifest Viewer (`YamlModal.tsx`):** Formatted Kubernetes manifest viewer with line numbers and one-click copy.
- 🔍 **Scheduling Decision Modal (`WhyModal.tsx`):** Instant scheduling verdict breakdown on clicking any pod chip.

## Getting Started

### Development Mode
```bash
npm install
npm run dev
```
Dashboard will be available at `http://localhost:5173`.
Proxy is configured to forward API calls from `/api/*` to `http://localhost:8000/*`.

### Production Build
```bash
npm run build
```
Creates an optimized production bundle in the `dist/` directory with zero TypeScript or JSX errors.
