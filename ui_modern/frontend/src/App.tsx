import React, { useState, useEffect, useCallback, useRef } from 'react';
import type {
  ClusterStatusResponse,
  PodInfo,
  TaintEffect,
  WorkloadDefinition,
} from './types';
import { api } from './services/api';
import { sound } from './lib/sound';
import { exportMarkdownReport } from './lib/export';
import { SpaceCanvas } from './components/SpaceCanvas';
import { Header } from './components/Header';
import { TopMetricsStrip } from './components/TopMetricsStrip';
import { ClusterGrid } from './components/ClusterGrid';
import { GuidedStepsTab } from './components/tabs/GuidedStepsTab';
import { WorkloadsTab } from './components/tabs/WorkloadsTab';
import { TaintStudioTab } from './components/tabs/TaintStudioTab';
import { WhyInspectorTab } from './components/tabs/WhyInspectorTab';
import { SchedulerFlowTab } from './components/tabs/SchedulerFlowTab';
import { EventsAuditLogTab } from './components/tabs/EventsAuditLogTab';
import { ConstellationMapTab } from './components/tabs/ConstellationMapTab';
import { YamlModal } from './components/YamlModal';
import { WhyModal } from './components/WhyModal';
import { PodLogsModal } from './components/PodLogsModal';
import { VivaGuideModal } from './components/VivaGuideModal';
import { AutoPilotModal } from './components/AutoPilotModal';
import { TalkingPointsBanner } from './components/TalkingPointsBanner';
import {
  Compass,
  Play,
  Rocket,
  Ban,
  HelpCircle,
  Activity,
  CheckCircle2,
  AlertCircle,
  Info,
  X,
  Eye,
  Orbit,
} from 'lucide-react';

type TabKey =
  | 'observatory'
  | 'constellation'
  | 'steps'
  | 'workloads'
  | 'taint'
  | 'why'
  | 'scheduler'
  | 'events';

export const App: React.FC = () => {
  // Cluster state
  const [clusterData, setClusterData] = useState<ClusterStatusResponse>({
    context: 'kind-taints-lab',
    namespace: 'gpu-lab',
    clusterConnected: true,
    nodes: [],
    pods: [],
    events: [],
    gpuReserved: true,
    commandLogs: [],
  });

  const [activeTab, setActiveTab] = useState<TabKey>('observatory');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState<number>(3);
  const [progressPercent, setProgressPercent] = useState<number>(100);
  const [isRunningAction, setIsRunningAction] = useState<boolean>(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(sound.isEnabled());

  // Modals state
  const [activePodForModal, setActivePodForModal] = useState<PodInfo | null>(null);
  const [activePodForLogs, setActivePodForLogs] = useState<PodInfo | null>(null);
  const [isVivaGuideOpen, setIsVivaGuideOpen] = useState<boolean>(false);
  const [isAutoPilotOpen, setIsAutoPilotOpen] = useState<boolean>(false);
  const [selectedPodForTab, setSelectedPodForTab] = useState<string | null>(null);
  const [selectedWorkloadYaml, setSelectedWorkloadYaml] = useState<WorkloadDefinition | null>(null);

  // Notifications
  const [toast, setToast] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);

  const showToast = (type: 'success' | 'error' | 'info', message: string) => {
    setToast({ type, message });
    setTimeout(() => {
      setToast((cur) => (cur?.message === message ? null : cur));
    }, 3500);
  };

  const handleToggleSound = () => {
    const next = sound.toggle();
    setSoundEnabled(next);
  };

  // Fetch cluster data
  const loadData = useCallback(async (isManual = false) => {
    if (isManual) setIsRefreshing(true);
    try {
      const data = await api.getClusterStatus();
      setClusterData(data);
    } catch (err) {
      console.error('Failed to fetch cluster status:', err);
    } finally {
      if (isManual) setIsRefreshing(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Auto-refresh countdown loop
  const timerRef = useRef<number | null>(null);
  useEffect(() => {
    const startTime = Date.now();
    const duration = refreshInterval * 1000;

    const interval = window.setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, duration - elapsed);
      const pct = (remaining / duration) * 100;
      setProgressPercent(pct);

      if (elapsed >= duration) {
        window.clearInterval(interval);
        loadData();
      }
    }, 100);

    timerRef.current = interval;
    return () => window.clearInterval(interval);
  }, [refreshInterval, clusterData, loadData]);

  // Handle running guided steps
  const handleRunStep = async (stepId: number) => {
    setIsRunningAction(true);
    sound.playClick();
    try {
      const res = await api.runStep(stepId);
      sound.playSuccess();
      showToast('success', res.output || `Step ${stepId} executed.`);
      await loadData();
    } catch {
      sound.playWarning();
      showToast('error', `Failed to run step ${stepId}.`);
    } finally {
      setIsRunningAction(false);
    }
  };

  // Handle resetting lab
  const handleResetLab = async () => {
    setIsRunningAction(true);
    sound.playClick();
    try {
      const res = await api.resetLab();
      sound.playSuccess();
      showToast('info', res.output || 'Cluster lab state reset.');
      await loadData();
    } catch {
      sound.playWarning();
      showToast('error', 'Failed to reset lab state.');
    } finally {
      setIsRunningAction(false);
    }
  };

  // Handle deploying workload
  const handleDeployWorkload = async (file: string) => {
    setIsRunningAction(true);
    sound.playClick();
    try {
      const res = await api.deployWorkload(file);
      sound.playSuccess();
      showToast('success', res.output || `Deployed ${file}`);
      await loadData();
    } catch {
      sound.playWarning();
      showToast('error', `Failed to deploy ${file}`);
    } finally {
      setIsRunningAction(false);
    }
  };

  // Handle deleting workload
  const handleDeleteWorkload = async (file: string) => {
    setIsRunningAction(true);
    sound.playClick();
    try {
      const res = await api.deleteWorkload(file);
      sound.playClick();
      showToast('info', res.output || `Deleted ${file}`);
      await loadData();
    } catch {
      sound.playWarning();
      showToast('error', `Failed to delete ${file}`);
    } finally {
      setIsRunningAction(false);
    }
  };

  // Handle delete all workloads
  const handleDeleteAllWorkloads = async () => {
    setIsRunningAction(true);
    sound.playWarning();
    try {
      const res = await api.deleteAllWorkloads();
      sound.playSuccess();
      showToast('info', res.output || 'All workloads deleted.');
      await loadData();
    } catch {
      sound.playWarning();
      showToast('error', 'Failed to delete all workloads.');
    } finally {
      setIsRunningAction(false);
    }
  };

  // Handle adding taint
  const handleAddTaint = async (
    node: string,
    key: string,
    val: string,
    eff: TaintEffect
  ) => {
    setIsRunningAction(true);
    sound.playClick();
    try {
      const res = await api.addTaint(node, key, val, eff);
      sound.playSuccess();
      showToast('success', res.output || `Applied taint to ${node}`);
      await loadData();
    } catch {
      showToast('error', `Failed to add taint.`);
    } finally {
      setIsRunningAction(false);
    }
  };

  // Handle removing taint
  const handleRemoveTaint = async (node: string, key: string, eff?: string) => {
    setIsRunningAction(true);
    sound.playClick();
    try {
      const res = await api.removeTaint(node, key, eff);
      sound.playClick();
      showToast('info', res.output || `Removed taint from ${node}`);
      await loadData();
    } catch {
      sound.playWarning();
      showToast('error', `Failed to remove taint.`);
    } finally {
      setIsRunningAction(false);
    }
  };

  // When pod is clicked in cluster cards, open Why modal or navigate to tab
  const handlePodClick = (pod: PodInfo) => {
    sound.playClick();
    setActivePodForModal(pod);
    setSelectedPodForTab(pod.name);
  };

  const handleOpenPodLogs = (pod: PodInfo) => {
    sound.playClick();
    setActivePodForLogs(pod);
  };

  const handleExportReport = () => {
    exportMarkdownReport(clusterData);
    sound.playSuccess();
    showToast('success', 'Lab evaluation report downloaded.');
  };

  const handleTabChange = (key: TabKey) => {
    setActiveTab(key);
    sound.playTabSwitch();
  };

  const placedPods = clusterData.pods.filter((p) => p.nodeName && p.phase !== 'Pending');
  const pendingPods = clusterData.pods.filter((p) => !p.nodeName || p.phase === 'Pending');

  const gpuNode = clusterData.nodes.find((n) => n.name === 'taints-lab-worker2');
  const gpuTaintEffect = gpuNode?.taints.find((t) => t.key === 'hardware')?.effect;

  const navigationTabs = [
    {
      id: 'observatory' as TabKey,
      label: 'Observatory',
      icon: <Eye className="w-4 h-4" />,
    },
    {
      id: 'constellation' as TabKey,
      label: 'Constellation Map',
      icon: <Orbit className="w-4 h-4" />,
    },
    {
      id: 'steps' as TabKey,
      label: 'Mission Steps',
      icon: <Play className="w-4 h-4 fill-current" />,
    },
    {
      id: 'workloads' as TabKey,
      label: 'Workload Fleet',
      icon: <Rocket className="w-4 h-4" />,
    },
    {
      id: 'taint' as TabKey,
      label: 'Taint Studio',
      icon: <Ban className="w-4 h-4" />,
    },
    {
      id: 'why' as TabKey,
      label: 'Decision Inspector',
      icon: <HelpCircle className="w-4 h-4" />,
    },
    {
      id: 'scheduler' as TabKey,
      label: 'Scheduler Flow',
      icon: <Compass className="w-4 h-4" />,
    },
    {
      id: 'events' as TabKey,
      label: 'Mission Audit',
      icon: <Activity className="w-4 h-4" />,
    },
  ];

  return (
    <div className="min-h-screen bg-[#000000] text-slate-100 flex flex-col relative selection:bg-cyan-500/30 selection:text-cyan-200 overflow-x-hidden">
      {/* Dynamic Celestial Starfield & Meteor Shower Canvas */}
      <SpaceCanvas />

      {/* Main Header */}
      <div className="relative z-40">
        <Header
          contextName={clusterData.context}
          namespace={clusterData.namespace}
          isLive={clusterData.clusterConnected}
          isRefreshing={isRefreshing}
          refreshInterval={refreshInterval}
          progressPercent={progressPercent}
          soundEnabled={soundEnabled}
          onToggleSound={handleToggleSound}
          onRefreshIntervalChange={setRefreshInterval}
          onManualRefresh={() => loadData(true)}
          onOpenLogs={() => handleTabChange('events')}
          onOpenVivaGuide={() => setIsVivaGuideOpen(true)}
          onOpenAutoPilot={() => setIsAutoPilotOpen(true)}
          onExportReport={handleExportReport}
        />

        {/* Spatial Multi-View Navigation Bar */}
        <nav className="w-full bg-black/60 backdrop-blur-2xl border-b border-white/[0.08] px-4 lg:px-8 py-2.5">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-3 overflow-x-auto no-scrollbar">
            <div className="flex items-center gap-1.5 sm:gap-2">
              {navigationTabs.map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => handleTabChange(tab.id)}
                    className={`tactile-btn flex items-center gap-2 px-3.5 py-2 rounded-xl font-mono text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                      isActive
                        ? 'bg-white/10 text-white border border-white/20 shadow-[0_0_15px_rgba(255,255,255,0.1)]'
                        : 'text-slate-400 border border-transparent hover:text-slate-200 hover:bg-white/5'
                    }`}
                  >
                    <span className={isActive ? 'text-cyan-400' : 'text-slate-500'}>
                      {tab.icon}
                    </span>
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Quick Context Indicator */}
            <div className="hidden xl:flex items-center gap-2 text-xs font-mono text-slate-400">
              <span>Cluster:</span>
              <span className="text-cyan-300 font-bold">{clusterData.context}</span>
            </div>
          </div>
        </nav>
      </div>

      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 animate-in fade-in slide-in-from-bottom-5 duration-200">
          <div
            className={`flex items-center gap-2.5 px-4 py-3 rounded-2xl shadow-2xl border text-xs font-mono backdrop-blur-xl ${
              toast.type === 'success'
                ? 'bg-emerald-950/90 border-emerald-500/50 text-emerald-300 shadow-[0_0_20px_rgba(16,185,129,0.3)]'
                : toast.type === 'error'
                ? 'bg-rose-950/90 border-rose-500/50 text-rose-300 shadow-[0_0_20px_rgba(244,63,94,0.3)]'
                : 'bg-cyan-950/90 border-cyan-500/50 text-cyan-300 shadow-[0_0_20px_rgba(6,182,212,0.3)]'
            }`}
          >
            {toast.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
            {toast.type === 'error' && <AlertCircle className="w-4 h-4 text-rose-400" />}
            {toast.type === 'info' && <Info className="w-4 h-4 text-cyan-400" />}
            <span>{toast.message}</span>
            <button
              onClick={() => setToast(null)}
              className="ml-2 text-slate-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Main Spatial Viewport */}
      <main className="relative z-10 flex-1 max-w-7xl w-full mx-auto px-4 lg:px-8 py-8">
        {/* VIEW 1: OBSERVATORY (Clean Cluster Dashboard) */}
        {activeTab === 'observatory' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            {/* Story / Architecture Summary Bar */}
            <div className="rounded-2xl bg-white/[0.02] bg-gradient-to-b from-white/[0.03] to-transparent backdrop-blur-2xl border border-white/[0.08] hover:border-white/[0.15] p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 transition-all duration-300">
              <div>
                <h2 className="text-sm font-bold text-white font-mono flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                  <span>Problem 07 Architecture: Dedicated GPU Node Isolation</span>
                </h2>
                <p className="text-xs text-slate-400 font-mono mt-1 leading-relaxed max-w-4xl">
                  Node <code className="text-violet-300 font-bold">taints-lab-worker2</code> is reserved for ML training via taint <code className="text-red-300 font-bold">hardware=gpu:NoSchedule</code>. Standard workloads like <code className="text-blue-300 font-bold">website</code> are repelled and scheduled exclusively on <code className="text-cyan-300 font-bold">taints-lab-worker</code>.
                </p>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="text-[11px] font-mono px-3 py-1 rounded-xl bg-white/[0.04] border border-white/[0.08] text-cyan-300">
                  3-Node Kind Cluster
                </span>
              </div>
            </div>

            {/* Top Metrics Cards */}
            <TopMetricsStrip
              totalNodes={clusterData.nodes.length}
              gpuReserved={clusterData.gpuReserved}
              gpuTaintEffect={gpuTaintEffect}
              placedPodsCount={placedPods.length}
              pendingPodsCount={pendingPods.length}
            />

            {/* 4 Cluster Node Observatory Cards */}
            <ClusterGrid
              nodes={clusterData.nodes}
              pods={clusterData.pods}
              gpuReserved={clusterData.gpuReserved}
              onSelectPod={handlePodClick}
              onViewLogs={handleOpenPodLogs}
            />
          </div>
        )}

        {/* VIEW 2: COSMIC TOPOLOGY & POD CONSTELLATION MAP */}
        {activeTab === 'constellation' && (
          <div className="animate-in fade-in duration-300">
            <ConstellationMapTab
              nodes={clusterData.nodes}
              pods={clusterData.pods}
              onSelectPod={handlePodClick}
              onViewLogs={handleOpenPodLogs}
            />
          </div>
        )}

        {/* VIEW 2: MISSION STEPS (Guided Evaluation Timeline) */}
        {activeTab === 'steps' && (
          <div className="animate-in fade-in duration-300">
            <GuidedStepsTab
              onRunStep={handleRunStep}
              onResetLab={handleResetLab}
              isRunningAction={isRunningAction}
              nodes={clusterData.nodes}
              pods={clusterData.pods}
            />
          </div>
        )}

        {/* VIEW 3: WORKLOAD FLEET */}
        {activeTab === 'workloads' && (
          <div className="animate-in fade-in duration-300">
            <WorkloadsTab
              onDeploy={handleDeployWorkload}
              onDelete={handleDeleteWorkload}
              onDeleteAll={handleDeleteAllWorkloads}
              onViewYaml={(w) => {
                sound.playClick();
                setSelectedWorkloadYaml(w);
              }}
              isRunningAction={isRunningAction}
            />
          </div>
        )}

        {/* VIEW 4: TAINT STUDIO */}
        {activeTab === 'taint' && (
          <div className="animate-in fade-in duration-300">
            <TaintStudioTab
              nodes={clusterData.nodes}
              onAddTaint={handleAddTaint}
              onRemoveTaint={handleRemoveTaint}
              isRunningAction={isRunningAction}
            />
          </div>
        )}

        {/* VIEW 5: DECISION INSPECTOR */}
        {activeTab === 'why' && (
          <div className="animate-in fade-in duration-300">
            <WhyInspectorTab
              nodes={clusterData.nodes}
              pods={clusterData.pods}
              selectedPodName={selectedPodForTab}
              onSelectPodName={setSelectedPodForTab}
            />
          </div>
        )}

        {/* VIEW 6: SCHEDULER FLOW SIMULATOR */}
        {activeTab === 'scheduler' && (
          <div className="animate-in fade-in duration-300">
            <SchedulerFlowTab nodes={clusterData.nodes} />
          </div>
        )}

        {/* VIEW 7: MISSION AUDIT (Events & Kubectl Terminal) */}
        {activeTab === 'events' && (
          <div className="animate-in fade-in duration-300">
            <EventsAuditLogTab
              events={clusterData.events}
              logs={clusterData.commandLogs || []}
            />
          </div>
        )}

        {/* Real-Time Evaluator Talking Points Banner */}
        <div className="mt-8">
          <TalkingPointsBanner
            nodes={clusterData.nodes}
            pods={clusterData.pods}
            onOpenAutoPilot={() => setIsAutoPilotOpen(true)}
            onOpenVivaGuide={() => setIsVivaGuideOpen(true)}
          />
        </div>
      </main>

      {/* Minimal Celestial Footer */}
      <footer className="relative z-10 w-full border-t border-white/[0.08] bg-black/60 backdrop-blur-2xl py-5 px-4 text-center text-xs font-mono text-slate-500 mt-16">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>Problem 07: Pod Scheduling Using Taints & Tolerations • Cloud Computing Lab Evaluation 2</span>
          <span className="text-slate-400">Context: <code className="text-cyan-400">{clusterData.context}</code> • Namespace: <code className="text-violet-400">{clusterData.namespace}</code></span>
        </div>
      </footer>

      {/* Modals */}
      <YamlModal
        workload={selectedWorkloadYaml}
        onClose={() => setSelectedWorkloadYaml(null)}
      />

      <WhyModal
        pod={activePodForModal}
        nodes={clusterData.nodes}
        onClose={() => setActivePodForModal(null)}
      />

      <PodLogsModal
        pod={activePodForLogs}
        onClose={() => setActivePodForLogs(null)}
      />

      <VivaGuideModal
        isOpen={isVivaGuideOpen}
        onClose={() => setIsVivaGuideOpen(false)}
      />

      <AutoPilotModal
        isOpen={isAutoPilotOpen}
        onClose={() => setIsAutoPilotOpen(false)}
        onRunStep={handleRunStep}
        onDeployWorkload={handleDeployWorkload}
        onDeleteAllWorkloads={handleDeleteAllWorkloads}
        onResetLab={handleResetLab}
      />
    </div>
  );
};

export default App;
