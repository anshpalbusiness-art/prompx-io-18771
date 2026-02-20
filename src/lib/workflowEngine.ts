// ═══════════════════════ AI Workflow Engine — Universal Agent Orchestration ═══════════════════════

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3002';

// ─── Types ───

export type ExecutionMode = 'ai' | 'integration' | 'hybrid';

export interface WorkflowNode {
    id: string;
    agentId: string;
    name: string;
    description: string;
    icon: string;
    systemPrompt: string;
    capabilities: string[];
    status: 'idle' | 'running' | 'completed' | 'failed' | 'skipped';
    input: Record<string, any>;
    output: Record<string, any> | null;
    error: string | null;
    // Integration support
    integrationId?: string;           // e.g., "web-search", "file-system"
    executionMode: ExecutionMode;      // 'ai' | 'integration' | 'hybrid'
    dataSource?: string;               // e.g., "duckduckgo", "filesystem", "ai-simulated"
    // Visual positioning
    position: { x: number; y: number };
    // Execution metadata
    startedAt: number | null;
    completedAt: number | null;
    duration: number | null;
}

export interface WorkflowEdge {
    id: string;
    source: string; // Node ID
    target: string; // Node ID
    label?: string; // e.g., "leads data", "order list"
}

export interface WorkflowDefinition {
    id: string;
    title: string;
    description: string;
    goal: string; // Original user input
    nodes: WorkflowNode[];
    edges: WorkflowEdge[];
    createdAt: number;
    updatedAt: number;
}

export type WorkflowStatus = 'idle' | 'planning' | 'ready' | 'executing' | 'paused' | 'completed' | 'failed';

export interface WorkflowExecution {
    workflowId: string;
    status: WorkflowStatus;
    currentNodeId: string | null;
    completedNodeIds: string[];
    failedNodeIds: string[];
    startedAt: number | null;
    completedAt: number | null;
    error: string | null;
}

// ─── Unique ID Generator ───
let _idCounter = 0;
export const wfUid = (): string => `wf_${Date.now()}_${++_idCounter}`;

// ─── Topological Sort for DAG Execution ───
export function topologicalSort(nodes: WorkflowNode[], edges: WorkflowEdge[]): string[] {
    const nodeIds = new Set(nodes.map(n => n.id));
    const inDegree: Record<string, number> = {};
    const adjacency: Record<string, string[]> = {};

    for (const id of nodeIds) {
        inDegree[id] = 0;
        adjacency[id] = [];
    }

    for (const edge of edges) {
        if (nodeIds.has(edge.source) && nodeIds.has(edge.target)) {
            adjacency[edge.source].push(edge.target);
            inDegree[edge.target]++;
        }
    }

    const queue: string[] = [];
    for (const id of nodeIds) {
        if (inDegree[id] === 0) queue.push(id);
    }

    const sorted: string[] = [];
    while (queue.length > 0) {
        const current = queue.shift()!;
        sorted.push(current);
        for (const neighbor of adjacency[current]) {
            inDegree[neighbor]--;
            if (inDegree[neighbor] === 0) queue.push(neighbor);
        }
    }

    return sorted;
}

// ─── Auto-Layout Algorithm (Layered DAG) ───
export function autoLayout(nodes: WorkflowNode[], edges: WorkflowEdge[]): WorkflowNode[] {
    const sorted = topologicalSort(nodes, edges);
    const nodeMap = new Map(nodes.map(n => [n.id, n]));
    const inEdges: Record<string, string[]> = {};

    for (const n of nodes) inEdges[n.id] = [];
    for (const e of edges) {
        if (inEdges[e.target]) inEdges[e.target].push(e.source);
    }

    // Assign layers
    const layers: Record<string, number> = {};
    for (const nodeId of sorted) {
        const parentLayers = inEdges[nodeId]?.map(pid => layers[pid] ?? 0) ?? [];
        layers[nodeId] = parentLayers.length > 0 ? Math.max(...parentLayers) + 1 : 0;
    }

    // Group by layer
    const layerGroups: Record<number, string[]> = {};
    for (const [nodeId, layer] of Object.entries(layers)) {
        if (!layerGroups[layer]) layerGroups[layer] = [];
        layerGroups[layer].push(nodeId);
    }

    // Position nodes
    const NODE_WIDTH = 240;
    const NODE_HEIGHT = 100;
    const H_GAP = 80;
    const V_GAP = 60;

    const maxLayer = Math.max(...Object.keys(layerGroups).map(Number), 0);

    for (let layer = 0; layer <= maxLayer; layer++) {
        const group = layerGroups[layer] || [];
        const totalWidth = group.length * NODE_WIDTH + (group.length - 1) * H_GAP;
        const startX = -totalWidth / 2 + NODE_WIDTH / 2;

        group.forEach((nodeId, i) => {
            const node = nodeMap.get(nodeId);
            if (node) {
                node.position = {
                    x: startX + i * (NODE_WIDTH + H_GAP),
                    y: layer * (NODE_HEIGHT + V_GAP),
                };
            }
        });
    }

    return nodes;
}

// ─── API: Plan Workflow via Grok-3 ───
export async function planWorkflow(goal: string): Promise<WorkflowDefinition> {
    const response = await fetch(`${API_BASE}/api/workflow-plan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ goal }),
    });

    if (!response.ok) {
        const err = await response.json().catch(() => ({ error: 'Network error' }));
        throw new Error(err.error || `Planning failed (${response.status})`);
    }

    const data = await response.json();
    const definition = data.workflow as WorkflowDefinition;

    // Assign positions via auto-layout
    definition.nodes = autoLayout(definition.nodes, definition.edges);
    definition.id = definition.id || wfUid();
    definition.createdAt = Date.now();
    definition.updatedAt = Date.now();

    return definition;
}

// ─── API: Execute Single Agent (Hybrid: Integration + AI) ───
export async function executeAgent(
    node: WorkflowNode,
    inputData: Record<string, any>,
): Promise<{ output: Record<string, any>; summary: string; dataSource: string }> {

    // Try real integration first if available
    if (node.integrationId && (node.executionMode === 'integration' || node.executionMode === 'hybrid')) {
        try {
            const integrationResult = await executeViaIntegration(node, inputData);
            if (integrationResult) {
                if (node.executionMode === 'hybrid') {
                    // Hybrid: use real data but pass through AI for formatting
                    return await executeViaAI(node, {
                        ...inputData,
                        _realData: integrationResult.data,
                        _dataSource: integrationResult.source,
                    }, integrationResult.source);
                }
                // Pure integration: return real data directly
                return {
                    output: integrationResult.data,
                    summary: `Completed via ${integrationResult.source} (live data)`,
                    dataSource: integrationResult.source,
                };
            }
        } catch (err) {
            console.warn(`Integration ${node.integrationId} failed, falling back to AI:`, err);
        }
    }

    // Fallback: pure AI execution
    return executeViaAI(node, inputData, 'ai-simulated');
}

// Built-in stub adapters for common integrations (used when no real adapter connected)
const STUB_ADAPTERS: Record<string, (input: Record<string, any>) => Promise<{ data: Record<string, any>; source: string }>> = {
    'web-search': async (input) => {
        // Simulate a web search using DuckDuckGo instant answers API
        const query = input.query || input.searchTerm || Object.values(input).find(v => typeof v === 'string') || 'AI workflow automation';
        try {
            const res = await fetch(`https://api.duckduckgo.com/?q=${encodeURIComponent(String(query))}&format=json&no_html=1&skip_disambig=1`);
            const data = await res.json();
            return {
                data: {
                    query: String(query),
                    abstract: data.Abstract || 'No summary available',
                    source: data.AbstractSource || 'DuckDuckGo',
                    url: data.AbstractURL || '',
                    relatedTopics: (data.RelatedTopics || []).slice(0, 5).map((t: any) => t.Text || t.Name || '').filter(Boolean),
                },
                source: 'web-search-live',
            };
        } catch {
            return {
                data: { query: String(query), results: 'Web search unavailable — simulated results', relatedTopics: ['AI automation', 'workflow tools', 'agent orchestration'] },
                source: 'web-search-simulated',
            };
        }
    },
    'email': async (input) => {
        // Stub: log email (no real sending)
        return {
            data: {
                status: 'logged',
                to: input.to || 'user@example.com',
                subject: input.subject || 'Workflow Notification',
                body: input.body || input.message || 'Workflow completed successfully.',
                note: 'Email logged (connect email integration for real sending)',
            },
            source: 'email-stub',
        };
    },
    'notification': async (input) => {
        return {
            data: {
                status: 'sent',
                message: input.message || 'Workflow completed.',
                channel: 'in-app',
                timestamp: new Date().toISOString(),
            },
            source: 'notification-stub',
        };
    },
};

// Execute via a real integration adapter (or built-in stub)
async function executeViaIntegration(
    node: WorkflowNode,
    inputData: Record<string, any>,
): Promise<{ data: Record<string, any>; source: string } | null> {
    const flatInput = {
        ...inputData,
        ...(inputData._parentOutputs
            ? (Object.values(inputData._parentOutputs) as Record<string, any>[]).reduce(
                (acc, o) => ({ ...acc, ...(o || {}) }), {} as Record<string, any>
            )
            : {}),
    };

    // Try real integration adapter first
    try {
        const { integrationRegistry } = await import('./integrations/registry');
        const adapter = integrationRegistry.get(node.integrationId!);
        if (adapter && adapter.isConnected()) {
            const result = await adapter.execute(flatInput);
            if (!result.success) throw new Error(result.error || 'Integration execution failed');
            return { data: result.data, source: result.source };
        }
    } catch (err) {
        // Fall through to stubs
    }

    // Try built-in stub adapter
    const stub = node.integrationId ? STUB_ADAPTERS[node.integrationId] : null;
    if (stub) {
        return stub(flatInput);
    }

    // No adapter available
    return null;
}

// Execute via AI (Grok-3) — with timeout and retry
async function executeViaAI(
    node: WorkflowNode,
    inputData: Record<string, any>,
    dataSource: string,
): Promise<{ output: Record<string, any>; summary: string; dataSource: string }> {
    const TIMEOUT_MS = 60_000; // 60 seconds per agent
    const MAX_RETRIES = 1;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

        try {
            const response = await fetch(`${API_BASE}/api/agent-execute`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                signal: controller.signal,
                body: JSON.stringify({
                    agentId: node.agentId,
                    agentName: node.name,
                    systemPrompt: node.systemPrompt,
                    capabilities: node.capabilities,
                    input: inputData,
                }),
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                const err = await response.json().catch(() => ({ error: 'Agent execution failed' }));
                throw new Error(err.error || `Agent ${node.name} failed (${response.status})`);
            }

            const result = await response.json();
            return { ...result, dataSource };
        } catch (err: any) {
            clearTimeout(timeoutId);
            if (err.name === 'AbortError') {
                if (attempt < MAX_RETRIES) {
                    console.warn(`⏳ Agent "${node.name}" timed out, retrying...`);
                    continue;
                }
                throw new Error(`Agent "${node.name}" timed out after ${TIMEOUT_MS / 1000}s`);
            }
            if (attempt < MAX_RETRIES && (err.message?.includes('fetch') || err.message?.includes('network'))) {
                console.warn(`🔄 Agent "${node.name}" network error, retrying...`);
                await new Promise(r => setTimeout(r, 1000)); // wait 1s before retry
                continue;
            }
            throw err;
        }
    }

    // Should not reach here, but just in case
    throw new Error(`Agent "${node.name}" failed after ${MAX_RETRIES + 1} attempts`);
}

// ─── Orchestrator: Execute Entire Workflow ───
export async function executeWorkflow(
    definition: WorkflowDefinition,
    onNodeUpdate: (nodeId: string, updates: Partial<WorkflowNode>) => void,
    onStatusChange: (status: WorkflowStatus) => void,
    abortSignal?: AbortSignal,
): Promise<{ success: boolean; error?: string }> {
    const sorted = topologicalSort(definition.nodes, definition.edges);
    const nodeMap = new Map(definition.nodes.map(n => [n.id, n]));
    const outputs: Record<string, Record<string, any>> = {};

    // Build parent map for input aggregation
    const parentMap: Record<string, string[]> = {};
    for (const n of definition.nodes) parentMap[n.id] = [];
    for (const e of definition.edges) {
        if (parentMap[e.target]) parentMap[e.target].push(e.source);
    }

    onStatusChange('executing');

    // Track start times locally — node.startedAt from the definition is always null
    const nodeStartTimes: Record<string, number> = {};

    for (const nodeId of sorted) {
        if (abortSignal?.aborted) {
            onStatusChange('paused');
            return { success: false, error: 'Workflow paused by user' };
        }

        const node = nodeMap.get(nodeId);
        if (!node) continue;

        // Aggregate inputs from parent nodes
        const parentOutputs: Record<string, any> = {};
        for (const parentId of parentMap[nodeId]) {
            if (outputs[parentId]) {
                parentOutputs[parentId] = outputs[parentId];
            }
        }

        const inputData = {
            ...node.input,
            _parentOutputs: parentOutputs,
            _workflowGoal: definition.goal,
        };

        // Mark node as running
        const startTime = Date.now();
        nodeStartTimes[nodeId] = startTime;
        onNodeUpdate(nodeId, {
            status: 'running',
            startedAt: startTime,
            input: inputData,
        });

        try {
            const result = await executeAgent(node, inputData);
            outputs[nodeId] = result.output;

            const completedAt = Date.now();
            onNodeUpdate(nodeId, {
                status: 'completed',
                output: result.output,
                dataSource: result.dataSource,
                completedAt,
                duration: completedAt - startTime,
            });
        } catch (err: any) {
            onNodeUpdate(nodeId, {
                status: 'failed',
                error: err.message,
                completedAt: Date.now(),
                duration: Date.now() - startTime,
            });

            onStatusChange('failed');
            return { success: false, error: `Agent "${node.name}" failed: ${err.message}` };
        }
    }

    onStatusChange('completed');
    return { success: true };
}

// ─── Persistence (localStorage as fallback) ───
const STORAGE_KEY = 'promptx_workflows';

export function saveWorkflows(workflows: Record<string, WorkflowDefinition>): void {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(workflows));
    } catch (e) {
        console.error('Failed to save workflows:', e);
    }
}

export function loadWorkflows(): Record<string, WorkflowDefinition> {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        return saved ? JSON.parse(saved) : {};
    } catch (e) {
        console.error('Failed to load workflows:', e);
        return {};
    }
}

// ─── Cloud Persistence (via server API → Supabase) ───

/** Convert a Supabase saved_workflow row into a WorkflowDefinition */
function rowToDefinition(row: any): WorkflowDefinition {
    const steps = row.steps || {};
    return {
        id: row.id,
        title: row.name,
        description: row.description || '',
        goal: '',
        nodes: (steps.nodes || []).map((n: any) => ({ ...n, position: n.position || { x: 0, y: 0 } })),
        edges: steps.edges || [],
        createdAt: new Date(row.created_at).getTime(),
        updatedAt: new Date(row.updated_at).getTime(),
    };
}

/** Load all workflows from cloud for the given user */
export async function loadWorkflowsFromCloud(
    userId: string,
): Promise<Record<string, WorkflowDefinition>> {
    try {
        const res = await fetch(`${API_BASE}/api/workflows?userId=${encodeURIComponent(userId)}`);
        const data = await res.json();
        if (data.error) throw new Error(data.error);

        const result: Record<string, WorkflowDefinition> = {};
        for (const row of data.workflows || []) {
            result[row.id] = rowToDefinition(row);
        }
        return result;
    } catch (err) {
        console.error('[Cloud] Load failed, falling back to localStorage:', err);
        return loadWorkflows(); // fallback
    }
}

/** Save (create or update) a single workflow to the cloud */
export async function saveWorkflowToCloud(
    userId: string,
    definition: WorkflowDefinition,
    cloudId?: string, // Supabase UUID if updating
): Promise<string | null> {
    try {
        const res = await fetch(`${API_BASE}/api/workflows`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                id: cloudId || undefined,
                userId,
                name: definition.title || 'Untitled Workflow',
                description: definition.description || '',
                nodes: definition.nodes,
                edges: definition.edges,
            }),
        });
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        return data.workflow?.id || null;
    } catch (err) {
        console.error('[Cloud] Save failed:', err);
        return null;
    }
}

/** Delete a workflow from the cloud */
export async function deleteWorkflowFromCloud(
    userId: string,
    cloudId: string,
): Promise<boolean> {
    try {
        const res = await fetch(
            `${API_BASE}/api/workflows/${cloudId}?userId=${encodeURIComponent(userId)}`,
            { method: 'DELETE' },
        );
        const data = await res.json();
        return !!data.ok;
    } catch (err) {
        console.error('[Cloud] Delete failed:', err);
        return false;
    }
}
