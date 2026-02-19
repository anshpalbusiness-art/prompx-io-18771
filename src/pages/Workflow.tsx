import { useEffect, useState, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import { User } from "@supabase/supabase-js";
import { useWorkflow } from "@/contexts/WorkflowContext";
import { WorkflowCanvas } from "@/components/workflow/WorkflowCanvas";
import { WorkflowToolbar } from "@/components/workflow/WorkflowToolbar";
import { WorkflowChat } from "@/components/workflow/WorkflowChat";
import { AgentDetailPanel } from "@/components/workflow/AgentDetailPanel";
import { WorkflowResults } from "@/components/workflow/WorkflowResults";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, Layers, Plus, FileText, CalendarClock } from "lucide-react";
import { buildTemplateWorkflow } from "@/lib/templateDefinitions";
import { ScheduleModal } from "@/components/workflow/ScheduleModal";
import { useCollaborativeWorkflow } from "@/hooks/useCollaborativeWorkflow";
import { CollaboratorCursors } from "@/components/workflow/CollaboratorCursors";
import { CollaboratorAvatars } from "@/components/workflow/CollaboratorAvatars";

const Workflow = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [showSidebar, setShowSidebar] = useState(true);
  const [showResults, setShowResults] = useState(false);
  const [showSchedule, setShowSchedule] = useState(false);
  const prevExecutionStatus = useRef<string | null>(null);
  const canvasContainerRef = useRef<HTMLDivElement>(null);

  const {
    state,
    activeWorkflow,
    selectedNode,
    createWorkflow,
    loadTemplate,
    runWorkflow,
    pauseWorkflow,
    deleteWorkflow,
    setActiveWorkflow,
    selectNode,
    resetWorkflow,
    // Edit mode
    isEditMode,
    toggleEditMode,
    moveNode,
    addNode,
    removeNode,
    updateNode,
    addEdge,
    removeEdge,
    duplicateNode,
    undo,
    redo,
    canUndo,
    canRedo,
  } = useWorkflow();

  const { peers, broadcastCursor, connectionStatus } = useCollaborativeWorkflow(state.activeWorkflowId);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if (!session) {
        navigate("/auth");
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (!session) {
        navigate("/auth");
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  // Auto-show results when workflow completes
  useEffect(() => {
    const currentStatus = state.execution?.status || null;
    if (
      prevExecutionStatus.current === 'executing' &&
      (currentStatus === 'completed' || currentStatus === 'failed')
    ) {
      setShowResults(true);
    }
    prevExecutionStatus.current = currentStatus;
  }, [state.execution?.status]);

  // Handle template selection from /templates (offline — no API call needed)
  useEffect(() => {
    const navState = location.state as { templateId?: string };
    if (navState?.templateId) {
      const definition = buildTemplateWorkflow(navState.templateId);
      if (definition) {
        loadTemplate(definition);
      }
      // Clear state so it doesn't re-trigger on refresh
      window.history.replaceState({}, document.title);
    }
  }, [location.state, loadTemplate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="animate-pulse-subtle">
          <div className="w-12 h-12 border-4 border-violet-500/20 border-t-violet-500 rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  const workflowList = Object.values(state.workflows).sort((a, b) => b.updatedAt - a.updatedAt);

  return (
    <Layout user={user} showHeader={false}>
      <div className="w-full h-screen flex overflow-hidden bg-black">
        {/* Left Sidebar — Saved Workflows */}
        <AnimatePresence>
          {showSidebar && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 260, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="h-full bg-zinc-950/95 border-r border-zinc-800/50 flex flex-col overflow-hidden"
            >
              {/* Sidebar Header */}
              <div className="p-4 border-b border-zinc-800/50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-violet-500/10 border border-violet-500/20">
                    <Layers className="w-3.5 h-3.5 text-violet-400" />
                  </div>
                  <span className="text-sm font-semibold text-zinc-200">Workflows</span>
                </div>
                <button
                  onClick={() => setShowSidebar(false)}
                  className="p-1 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/60 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
              </div>

              {/* Workflow List */}
              <div className="flex-1 overflow-y-auto p-2 space-y-1">
                {workflowList.length === 0 ? (
                  <div className="text-center py-8 px-4">
                    <div className="text-3xl mb-3">🔄</div>
                    <p className="text-xs text-zinc-500">No workflows yet.</p>
                    <p className="text-xs text-zinc-600 mt-1">Create one using the chat below.</p>
                  </div>
                ) : (
                  workflowList.map(wf => (
                    <button
                      key={wf.id}
                      onClick={() => setActiveWorkflow(wf.id)}
                      className={`w-full text-left p-3 rounded-xl transition-all duration-200 group ${state.activeWorkflowId === wf.id
                        ? 'bg-violet-500/10 border border-violet-500/20'
                        : 'hover:bg-zinc-900/60 border border-transparent'
                        }`}
                    >
                      <p className="text-xs font-medium text-zinc-300 truncate">
                        {wf.title}
                      </p>
                      <p className="text-[10px] text-zinc-600 mt-0.5 truncate">
                        {wf.nodes.length} agents · {new Date(wf.updatedAt).toLocaleDateString()}
                      </p>
                    </button>
                  ))
                )}
              </div>

              {/* New Workflow Button */}
              <div className="p-3 border-t border-zinc-800/50">
                <button
                  onClick={() => setActiveWorkflow(null)}
                  className="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-violet-600/10 border border-violet-500/20 text-violet-400 text-xs font-medium hover:bg-violet-600/20 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  New Workflow
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Sidebar Toggle (when collapsed) */}
        {!showSidebar && (
          <button
            onClick={() => setShowSidebar(true)}
            className="absolute left-2 top-1/2 -translate-y-1/2 z-20 p-2 bg-zinc-900/80 backdrop-blur-xl border border-zinc-800/50 rounded-xl text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/80 transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        )}

        {/* Main Content */}
        <div className="flex-1 flex flex-col min-w-0 relative">
          {/* Toolbar */}
          {activeWorkflow && (
            <WorkflowToolbar
              workflowId={state.activeWorkflowId}
              execution={state.execution}
              nodeCount={activeWorkflow.nodes.length}
              onRun={() => state.activeWorkflowId && runWorkflow(state.activeWorkflowId)}
              onPause={pauseWorkflow}
              onReset={() => state.activeWorkflowId && resetWorkflow(state.activeWorkflowId)}
              onDelete={() => {
                if (state.activeWorkflowId) {
                  deleteWorkflow(state.activeWorkflowId);
                }
              }}
              isEditMode={isEditMode}
              onToggleEditMode={toggleEditMode}
              onUndo={undo}
              onRedo={redo}
              canUndo={canUndo}
              canRedo={canRedo}
              activeWorkflow={activeWorkflow}
              collaboratorSlot={<CollaboratorAvatars peers={peers} connectionStatus={connectionStatus} />}
              onSchedule={() => setShowSchedule(true)}
              onViewResults={() => setShowResults(true)}
              showResultsButton={(state.execution?.status === 'completed' || state.execution?.status === 'failed') && !showResults}
            />
          )}

          {/* Canvas with Collaboration Overlay */}
          <div
            ref={canvasContainerRef}
            className="relative flex-1"
            onMouseMove={(e) => {
              if (!canvasContainerRef.current) return;
              const rect = canvasContainerRef.current.getBoundingClientRect();
              broadcastCursor(
                { x: e.clientX - rect.left, y: e.clientY - rect.top },
                state.selectedNodeId,
              );
            }}
            onMouseLeave={() => broadcastCursor(null, null)}
          >
            <WorkflowCanvas
              workflow={activeWorkflow}
              selectedNodeId={state.selectedNodeId}
              onNodeClick={(nodeId) => selectNode(
                state.selectedNodeId === nodeId ? null : nodeId
              )}
              isEditMode={isEditMode}
              onNodeDrag={moveNode}
              onRemoveNode={removeNode}
              onAddNode={addNode}
              onAddEdge={addEdge}
              onRemoveEdge={removeEdge}
              onDuplicateNode={duplicateNode}
              onUndo={undo}
              onRedo={redo}
            />
            <CollaboratorCursors peers={peers} />
          </div>

          {/* Chat Input */}
          <WorkflowChat
            onCreateWorkflow={async (goal: string, image?: string) => {
              await createWorkflow(goal);
            }}
            isPlanning={state.planningStatus === 'planning'}
            error={state.planningError}
            hasActiveWorkflow={!!activeWorkflow}
          />
        </div>

        {/* Right Panel — Agent Details */}
        <AnimatePresence>
          {selectedNode && (
            <AgentDetailPanel
              node={selectedNode}
              onClose={() => selectNode(null)}
              isEditMode={isEditMode}
              onUpdateNode={updateNode}
            />
          )}
        </AnimatePresence>

        {/* Results Overlay */}
        <AnimatePresence>
          {showResults && activeWorkflow && (
            <WorkflowResults
              workflow={activeWorkflow}
              execution={state.execution}
              onClose={() => setShowResults(false)}
              onNodeClick={(nodeId) => {
                setShowResults(false);
                selectNode(nodeId);
              }}
            />
          )}
        </AnimatePresence>

        {/* Schedule Modal */}
        {activeWorkflow && (
          <ScheduleModal
            open={showSchedule}
            onClose={() => setShowSchedule(false)}
            workflowId={activeWorkflow.id}
            workflowTitle={activeWorkflow.title}
          />
        )}
      </div>
    </Layout>
  );
};

export default Workflow;

