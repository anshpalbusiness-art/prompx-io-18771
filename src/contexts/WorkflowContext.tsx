import React, { createContext, useContext, useReducer, useCallback, useRef, ReactNode } from 'react';
import {
    WorkflowDefinition,
    WorkflowNode,
    WorkflowEdge,
    WorkflowExecution,
    WorkflowStatus,
    planWorkflow as planWorkflowAPI,
    executeWorkflow as executeWorkflowEngine,
    saveWorkflows,
    loadWorkflows,
    wfUid,
} from '@/lib/workflowEngine';
import { logWorkflowRun, type WorkflowRunRecord, type StepRecord } from '@/lib/analyticsStore';

// ─── State ───

const MAX_HISTORY = 30;

interface WorkflowState {
    workflows: Record<string, WorkflowDefinition>;
    activeWorkflowId: string | null;
    execution: WorkflowExecution | null;
    planningStatus: 'idle' | 'planning' | 'error';
    planningError: string | null;
    selectedNodeId: string | null;
    isEditMode: boolean;
    undoStack: WorkflowDefinition[];
    redoStack: WorkflowDefinition[];
}

type WorkflowAction =
    | { type: 'SET_WORKFLOWS'; workflows: Record<string, WorkflowDefinition> }
    | { type: 'ADD_WORKFLOW'; workflow: WorkflowDefinition }
    | { type: 'DELETE_WORKFLOW'; id: string }
    | { type: 'SET_ACTIVE'; id: string | null }
    | { type: 'SET_PLANNING_STATUS'; status: 'idle' | 'planning' | 'error'; error?: string }
    | { type: 'UPDATE_NODE'; workflowId: string; nodeId: string; updates: Partial<WorkflowNode> }
    | { type: 'SET_EXECUTION'; execution: WorkflowExecution | null }
    | { type: 'UPDATE_EXECUTION'; updates: Partial<WorkflowExecution> }
    | { type: 'SET_SELECTED_NODE'; nodeId: string | null }
    | { type: 'TOGGLE_EDIT_MODE' }
    | { type: 'MOVE_NODE'; workflowId: string; nodeId: string; position: { x: number; y: number } }
    | { type: 'ADD_NODE'; workflowId: string; node: WorkflowNode }
    | { type: 'REMOVE_NODE'; workflowId: string; nodeId: string }
    | { type: 'ADD_EDGE'; workflowId: string; edge: WorkflowEdge }
    | { type: 'REMOVE_EDGE'; workflowId: string; edgeId: string }
    | { type: 'UPDATE_WORKFLOW'; workflowId: string; updates: Partial<Pick<WorkflowDefinition, 'title' | 'description'>> }
    | { type: 'UNDO' }
    | { type: 'REDO' };

// Helper: push current active workflow to undo stack, clear redo
function pushUndo(state: WorkflowState): Pick<WorkflowState, 'undoStack' | 'redoStack'> {
    const wf = state.activeWorkflowId ? state.workflows[state.activeWorkflowId] : null;
    if (!wf || !state.isEditMode) return { undoStack: state.undoStack, redoStack: state.redoStack };
    const newStack = [...state.undoStack, JSON.parse(JSON.stringify(wf))];
    if (newStack.length > MAX_HISTORY) newStack.shift();
    return { undoStack: newStack, redoStack: [] };
}

function workflowReducer(state: WorkflowState, action: WorkflowAction): WorkflowState {
    switch (action.type) {
        case 'SET_WORKFLOWS':
            return { ...state, workflows: action.workflows };

        case 'ADD_WORKFLOW': {
            const newWorkflows = { ...state.workflows, [action.workflow.id]: action.workflow };
            saveWorkflows(newWorkflows);
            return { ...state, workflows: newWorkflows, activeWorkflowId: action.workflow.id };
        }

        case 'DELETE_WORKFLOW': {
            const { [action.id]: _, ...rest } = state.workflows;
            saveWorkflows(rest);
            return {
                ...state,
                workflows: rest,
                activeWorkflowId: state.activeWorkflowId === action.id ? null : state.activeWorkflowId,
            };
        }

        case 'SET_ACTIVE':
            return { ...state, activeWorkflowId: action.id, selectedNodeId: null, isEditMode: false };

        case 'SET_PLANNING_STATUS':
            return { ...state, planningStatus: action.status, planningError: action.error || null };

        case 'UPDATE_NODE': {
            const wf = state.workflows[action.workflowId];
            if (!wf) return state;
            const updatedNodes = wf.nodes.map(n =>
                n.id === action.nodeId ? { ...n, ...action.updates } : n
            );
            const updatedWf = { ...wf, nodes: updatedNodes, updatedAt: Date.now() };
            const newWorkflows = { ...state.workflows, [action.workflowId]: updatedWf };
            return { ...state, workflows: newWorkflows };
        }

        case 'SET_EXECUTION':
            return { ...state, execution: action.execution };

        case 'UPDATE_EXECUTION':
            if (!state.execution) return state;
            return { ...state, execution: { ...state.execution, ...action.updates } };

        case 'SET_SELECTED_NODE':
            return { ...state, selectedNodeId: action.nodeId };

        case 'TOGGLE_EDIT_MODE':
            return { ...state, isEditMode: !state.isEditMode, undoStack: [], redoStack: [] };

        case 'MOVE_NODE': {
            const wf = state.workflows[action.workflowId];
            if (!wf) return state;
            const hist = pushUndo(state);
            const movedNodes = wf.nodes.map(n =>
                n.id === action.nodeId ? { ...n, position: action.position } : n
            );
            const movedWf = { ...wf, nodes: movedNodes, updatedAt: Date.now() };
            const newWorkflows = { ...state.workflows, [action.workflowId]: movedWf };
            saveWorkflows(newWorkflows);
            return { ...state, workflows: newWorkflows, ...hist };
        }

        case 'ADD_NODE': {
            const wf = state.workflows[action.workflowId];
            if (!wf) return state;
            const hist = pushUndo(state);
            const addedWf = {
                ...wf,
                nodes: [...wf.nodes, action.node],
                updatedAt: Date.now(),
            };
            const newWorkflows = { ...state.workflows, [action.workflowId]: addedWf };
            saveWorkflows(newWorkflows);
            return { ...state, workflows: newWorkflows, ...hist };
        }

        case 'REMOVE_NODE': {
            const wf = state.workflows[action.workflowId];
            if (!wf) return state;
            const hist = pushUndo(state);
            const removedWf = {
                ...wf,
                nodes: wf.nodes.filter(n => n.id !== action.nodeId),
                edges: wf.edges.filter(e => e.source !== action.nodeId && e.target !== action.nodeId),
                updatedAt: Date.now(),
            };
            const newWorkflows = { ...state.workflows, [action.workflowId]: removedWf };
            saveWorkflows(newWorkflows);
            return {
                ...state,
                workflows: newWorkflows,
                selectedNodeId: state.selectedNodeId === action.nodeId ? null : state.selectedNodeId,
                ...hist,
            };
        }

        case 'ADD_EDGE': {
            const wf = state.workflows[action.workflowId];
            if (!wf) return state;
            // Prevent duplicate edges
            const exists = wf.edges.some(e => e.source === action.edge.source && e.target === action.edge.target);
            if (exists) return state;
            const hist = pushUndo(state);
            const edgedWf = {
                ...wf,
                edges: [...wf.edges, action.edge],
                updatedAt: Date.now(),
            };
            const newWorkflows = { ...state.workflows, [action.workflowId]: edgedWf };
            saveWorkflows(newWorkflows);
            return { ...state, workflows: newWorkflows, ...hist };
        }

        case 'REMOVE_EDGE': {
            const wf = state.workflows[action.workflowId];
            if (!wf) return state;
            const hist = pushUndo(state);
            const unedgedWf = {
                ...wf,
                edges: wf.edges.filter(e => e.id !== action.edgeId),
                updatedAt: Date.now(),
            };
            const newWorkflows = { ...state.workflows, [action.workflowId]: unedgedWf };
            saveWorkflows(newWorkflows);
            return { ...state, workflows: newWorkflows, ...hist };
        }

        case 'UPDATE_WORKFLOW': {
            const wf = state.workflows[action.workflowId];
            if (!wf) return state;
            const hist = pushUndo(state);
            const updWf = { ...wf, ...action.updates, updatedAt: Date.now() };
            const newWorkflows = { ...state.workflows, [action.workflowId]: updWf };
            saveWorkflows(newWorkflows);
            return { ...state, workflows: newWorkflows, ...hist };
        }

        case 'UNDO': {
            if (state.undoStack.length === 0 || !state.activeWorkflowId) return state;
            const currentWf = state.workflows[state.activeWorkflowId];
            if (!currentWf) return state;
            const newUndo = [...state.undoStack];
            const prev = newUndo.pop()!;
            const newRedo = [...state.redoStack, JSON.parse(JSON.stringify(currentWf))];
            const newWorkflows = { ...state.workflows, [state.activeWorkflowId]: prev };
            saveWorkflows(newWorkflows);
            return { ...state, workflows: newWorkflows, undoStack: newUndo, redoStack: newRedo };
        }

        case 'REDO': {
            if (state.redoStack.length === 0 || !state.activeWorkflowId) return state;
            const currentWf = state.workflows[state.activeWorkflowId];
            if (!currentWf) return state;
            const newRedo = [...state.redoStack];
            const next = newRedo.pop()!;
            const newUndo = [...state.undoStack, JSON.parse(JSON.stringify(currentWf))];
            const newWorkflows = { ...state.workflows, [state.activeWorkflowId]: next };
            saveWorkflows(newWorkflows);
            return { ...state, workflows: newWorkflows, undoStack: newUndo, redoStack: newRedo };
        }

        default:
            return state;
    }
}

// ─── Context ───

interface WorkflowContextType {
    state: WorkflowState;
    activeWorkflow: WorkflowDefinition | null;
    selectedNode: WorkflowNode | null;

    // Core actions
    createWorkflow: (goal: string) => Promise<WorkflowDefinition>;
    loadTemplate: (definition: WorkflowDefinition) => void;
    runWorkflow: (id: string) => Promise<void>;
    pauseWorkflow: () => void;
    deleteWorkflow: (id: string) => void;
    setActiveWorkflow: (id: string | null) => void;
    selectNode: (nodeId: string | null) => void;
    resetWorkflow: (id: string) => void;

    // Edit mode actions
    isEditMode: boolean;
    toggleEditMode: () => void;
    moveNode: (nodeId: string, position: { x: number; y: number }) => void;
    addNode: (position?: { x: number; y: number }) => void;
    removeNode: (nodeId: string) => void;
    updateNode: (nodeId: string, updates: Partial<WorkflowNode>) => void;
    addEdge: (sourceId: string, targetId: string, label?: string) => void;
    removeEdge: (edgeId: string) => void;
    updateWorkflowMeta: (updates: Partial<Pick<WorkflowDefinition, 'title' | 'description'>>) => void;
    duplicateNode: (nodeId: string) => void;
    undo: () => void;
    redo: () => void;
    canUndo: boolean;
    canRedo: boolean;
}

const WorkflowContext = createContext<WorkflowContextType | undefined>(undefined);

// ─── Provider ───

export function WorkflowProvider({ children }: { children: ReactNode }) {
    const [state, dispatch] = useReducer(workflowReducer, {
        workflows: loadWorkflows(),
        activeWorkflowId: null,
        execution: null,
        planningStatus: 'idle',
        planningError: null,
        selectedNodeId: null,
        isEditMode: false,
        undoStack: [],
        redoStack: [],
    });

    const abortControllerRef = useRef<AbortController | null>(null);
    // Use a ref to always have the latest workflows available in async callbacks
    const workflowsRef = useRef(state.workflows);
    workflowsRef.current = state.workflows;

    const activeWorkflow = state.activeWorkflowId
        ? state.workflows[state.activeWorkflowId] || null
        : null;

    const selectedNode = activeWorkflow && state.selectedNodeId
        ? activeWorkflow.nodes.find(n => n.id === state.selectedNodeId) || null
        : null;

    // ─── Create Workflow from Goal ───
    const createWorkflow = useCallback(async (goal: string): Promise<WorkflowDefinition> => {
        dispatch({ type: 'SET_PLANNING_STATUS', status: 'planning' });
        try {
            const definition = await planWorkflowAPI(goal);
            dispatch({ type: 'ADD_WORKFLOW', workflow: definition });
            dispatch({ type: 'SET_PLANNING_STATUS', status: 'idle' });
            return definition;
        } catch (err: any) {
            dispatch({ type: 'SET_PLANNING_STATUS', status: 'error', error: err.message });
            throw err;
        }
    }, []);

    // ─── Load a pre-built template (no API call) ───
    const loadTemplate = useCallback((definition: WorkflowDefinition) => {
        dispatch({ type: 'ADD_WORKFLOW', workflow: definition });
    }, []);

    // ─── Run Workflow ───
    const runWorkflow = useCallback(async (id: string) => {
        const workflow = workflowsRef.current[id];
        if (!workflow) return;

        // Exit edit mode when running
        if (state.isEditMode) dispatch({ type: 'TOGGLE_EDIT_MODE' });

        // Reset all nodes to idle
        for (const node of workflow.nodes) {
            dispatch({ type: 'UPDATE_NODE', workflowId: id, nodeId: node.id, updates: { status: 'idle', output: null, error: null, startedAt: null, completedAt: null, duration: null } });
        }

        const abortController = new AbortController();
        abortControllerRef.current = abortController;

        // Use mutable arrays to track progress — avoids stale closure
        const completedNodeIds: string[] = [];
        const failedNodeIds: string[] = [];

        const execution: WorkflowExecution = {
            workflowId: id,
            status: 'executing',
            currentNodeId: null,
            completedNodeIds: [],
            failedNodeIds: [],
            startedAt: Date.now(),
            completedAt: null,
            error: null,
        };

        dispatch({ type: 'SET_EXECUTION', execution });

        // Track step-level metrics for analytics
        const stepMetrics: StepRecord[] = [];
        const nodeStartTimes: Record<string, number> = {};

        const onNodeUpdate = (nodeId: string, updates: Partial<WorkflowNode>) => {
            dispatch({ type: 'UPDATE_NODE', workflowId: id, nodeId, updates });
            if (updates.status === 'running') {
                nodeStartTimes[nodeId] = Date.now();
                dispatch({ type: 'UPDATE_EXECUTION', updates: { currentNodeId: nodeId } });
            }
            if (updates.status === 'completed') {
                completedNodeIds.push(nodeId);
                const node = workflow.nodes.find(n => n.id === nodeId);
                stepMetrics.push({
                    nodeId,
                    agentName: node?.name || nodeId,
                    status: 'completed',
                    durationMs: Date.now() - (nodeStartTimes[nodeId] || Date.now()),
                    dataSource: updates.dataSource,
                });
                dispatch({
                    type: 'UPDATE_EXECUTION', updates: {
                        completedNodeIds: [...completedNodeIds],
                    }
                });
            }
            if (updates.status === 'failed') {
                failedNodeIds.push(nodeId);
                const node = workflow.nodes.find(n => n.id === nodeId);
                stepMetrics.push({
                    nodeId,
                    agentName: node?.name || nodeId,
                    status: 'failed',
                    durationMs: Date.now() - (nodeStartTimes[nodeId] || Date.now()),
                });
                dispatch({
                    type: 'UPDATE_EXECUTION', updates: {
                        failedNodeIds: [...failedNodeIds],
                    }
                });
            }
        };

        const onStatusChange = (status: WorkflowStatus) => {
            dispatch({
                type: 'UPDATE_EXECUTION', updates: {
                    status,
                    completedAt: status === 'completed' || status === 'failed' ? Date.now() : null,
                }
            });
        };

        const runStartedAt = Date.now();
        // Use ref to get the latest workflow definition
        const latestWf = workflowsRef.current[id] || workflow;
        await executeWorkflowEngine(latestWf, onNodeUpdate, onStatusChange, abortController.signal);

        // Log analytics
        const runCompletedAt = Date.now();
        const completedCount = stepMetrics.filter(s => s.status === 'completed').length;
        const failedCount = stepMetrics.filter(s => s.status === 'failed').length;
        const runRecord: WorkflowRunRecord = {
            id: wfUid(),
            workflowId: id,
            workflowTitle: workflow.title,
            status: failedCount > 0 ? 'failed' : 'completed',
            startedAt: runStartedAt,
            completedAt: runCompletedAt,
            durationMs: runCompletedAt - runStartedAt,
            totalNodes: workflow.nodes.length,
            completedNodes: completedCount,
            failedNodes: failedCount,
            steps: stepMetrics,
        };
        logWorkflowRun(runRecord);

        saveWorkflows(workflowsRef.current);
    }, [state.isEditMode]);

    // ─── Pause ───
    const pauseWorkflow = useCallback(() => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            abortControllerRef.current = null;
        }
    }, []);

    // ─── Delete ───
    const deleteWorkflow = useCallback((id: string) => {
        dispatch({ type: 'DELETE_WORKFLOW', id });
    }, []);

    // ─── Set Active ───
    const setActiveWorkflow = useCallback((id: string | null) => {
        dispatch({ type: 'SET_ACTIVE', id });
    }, []);

    // ─── Select Node ───
    const selectNode = useCallback((nodeId: string | null) => {
        dispatch({ type: 'SET_SELECTED_NODE', nodeId });
    }, []);

    // ─── Reset Workflow ───
    const resetWorkflow = useCallback((id: string) => {
        const workflow = state.workflows[id];
        if (!workflow) return;
        for (const node of workflow.nodes) {
            dispatch({
                type: 'UPDATE_NODE', workflowId: id, nodeId: node.id, updates: {
                    status: 'idle',
                    output: null,
                    error: null,
                    startedAt: null,
                    completedAt: null,
                    duration: null,
                }
            });
        }
        dispatch({ type: 'SET_EXECUTION', execution: null });
    }, [state.workflows]);

    // ─── Edit Mode ───
    const toggleEditMode = useCallback(() => {
        dispatch({ type: 'TOGGLE_EDIT_MODE' });
    }, []);

    const moveNode = useCallback((nodeId: string, position: { x: number; y: number }) => {
        if (!state.activeWorkflowId) return;
        dispatch({ type: 'MOVE_NODE', workflowId: state.activeWorkflowId, nodeId, position });
    }, [state.activeWorkflowId]);

    const addNode = useCallback((position?: { x: number; y: number }) => {
        if (!state.activeWorkflowId) return;
        const wf = state.workflows[state.activeWorkflowId];
        if (!wf) return;

        // Position below the last node
        const lastNode = wf.nodes[wf.nodes.length - 1];
        const pos = position || {
            x: lastNode ? lastNode.position.x : 0,
            y: lastNode ? lastNode.position.y + 160 : 0,
        };

        const nodeNum = wf.nodes.length + 1;
        const newNode: WorkflowNode = {
            id: `node_${wfUid()}`,
            agentId: `custom-agent-${wfUid()}`,
            name: `Custom Agent ${nodeNum}`,
            description: 'A custom agent — click to configure',
            icon: '🤖',
            systemPrompt: 'You are a custom AI agent. Describe your role and task here.',
            capabilities: ['custom'],
            status: 'idle',
            input: {},
            output: null,
            error: null,
            integrationId: undefined,
            executionMode: 'ai',
            dataSource: undefined,
            position: pos,
            startedAt: null,
            completedAt: null,
            duration: null,
        };

        dispatch({ type: 'ADD_NODE', workflowId: state.activeWorkflowId, node: newNode });
        dispatch({ type: 'SET_SELECTED_NODE', nodeId: newNode.id });
    }, [state.activeWorkflowId, state.workflows]);

    const removeNode = useCallback((nodeId: string) => {
        if (!state.activeWorkflowId) return;
        dispatch({ type: 'REMOVE_NODE', workflowId: state.activeWorkflowId, nodeId });
    }, [state.activeWorkflowId]);

    const updateNode = useCallback((nodeId: string, updates: Partial<WorkflowNode>) => {
        if (!state.activeWorkflowId) return;
        dispatch({ type: 'UPDATE_NODE', workflowId: state.activeWorkflowId, nodeId, updates });
    }, [state.activeWorkflowId]);

    const addEdge = useCallback((sourceId: string, targetId: string, label?: string) => {
        if (!state.activeWorkflowId) return;
        if (sourceId === targetId) return;
        const edge: WorkflowEdge = {
            id: `edge_${wfUid()}`,
            source: sourceId,
            target: targetId,
            label: label || 'data',
        };
        dispatch({ type: 'ADD_EDGE', workflowId: state.activeWorkflowId, edge });
    }, [state.activeWorkflowId]);

    const removeEdge = useCallback((edgeId: string) => {
        if (!state.activeWorkflowId) return;
        dispatch({ type: 'REMOVE_EDGE', workflowId: state.activeWorkflowId, edgeId });
    }, [state.activeWorkflowId]);

    const duplicateNode = useCallback((nodeId: string) => {
        if (!state.activeWorkflowId) return;
        const wf = state.workflows[state.activeWorkflowId];
        if (!wf) return;
        const src = wf.nodes.find(n => n.id === nodeId);
        if (!src) return;
        const clone: WorkflowNode = {
            ...JSON.parse(JSON.stringify(src)),
            id: `node_${wfUid()}`,
            agentId: `custom-agent-${wfUid()}`,
            name: `${src.name} (copy)`,
            status: 'idle',
            output: null,
            error: null,
            startedAt: null,
            completedAt: null,
            duration: null,
            position: { x: src.position.x + 40, y: src.position.y + 80 },
        };
        dispatch({ type: 'ADD_NODE', workflowId: state.activeWorkflowId, node: clone });
        dispatch({ type: 'SET_SELECTED_NODE', nodeId: clone.id });
    }, [state.activeWorkflowId, state.workflows]);

    const undo = useCallback(() => {
        dispatch({ type: 'UNDO' });
    }, []);

    const redo = useCallback(() => {
        dispatch({ type: 'REDO' });
    }, []);

    const updateWorkflowMeta = useCallback((updates: Partial<Pick<WorkflowDefinition, 'title' | 'description'>>) => {
        if (!state.activeWorkflowId) return;
        dispatch({ type: 'UPDATE_WORKFLOW', workflowId: state.activeWorkflowId, updates });
    }, [state.activeWorkflowId]);

    return (
        <WorkflowContext.Provider value={{
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
            isEditMode: state.isEditMode,
            toggleEditMode,
            moveNode,
            addNode,
            removeNode,
            updateNode,
            addEdge,
            removeEdge,
            updateWorkflowMeta,
            duplicateNode,
            undo,
            redo,
            canUndo: state.undoStack.length > 0,
            canRedo: state.redoStack.length > 0,
        }}>
            {children}
        </WorkflowContext.Provider>
    );
}

export const useWorkflow = () => {
    const context = useContext(WorkflowContext);
    if (!context) {
        throw new Error('useWorkflow must be used within WorkflowProvider');
    }
    return context;
};
