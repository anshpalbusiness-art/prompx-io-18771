// ═══════════════════════ CLI Agent Generator — Cursor-Like Engine ═══════════════════════
// Auto-detects environment:
//   Desktop App (Electron) → IPC → local execution (like Cursor)
//   Web Browser            → HTTP → proxy server

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3002';

// ─── Environment Detection ───

export function isDesktopApp(): boolean {
    return (
        typeof window !== 'undefined' &&
        'promptx' in window &&
        typeof (window as any).promptx?.cliExec === 'function'
    );
}

function getDesktop(): any {
    return (window as any).promptx;
}

export function getRuntimeMode(): 'desktop' | 'web' {
    return isDesktopApp() ? 'desktop' : 'web';
}

// ─── Types ───

export interface CLIBuildPlan {
    projectName: string;
    displayName: string;
    description: string;
    language: string;
    files: { filename: string; content: string }[];
    installCommand: string;
    testCommand: string;
    commands: { name: string; description: string }[];
}

export interface TerminalLine {
    id: string;
    type: 'command' | 'stdout' | 'stderr' | 'info' | 'success' | 'error';
    content: string;
    timestamp: number;
}

export interface ChatMessage {
    id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: number;
    status?: 'thinking' | 'building' | 'done' | 'error';
    attachments?: { name: string; type: string; url: string }[];
}

export interface FileEntry {
    name: string;
    path: string;
    isDirectory: boolean;
    size: number;
    modified: string | null;
    children?: FileEntry[];
}

export type CLILanguage = 'nodejs' | 'python' | 'go' | 'rust';

export const LANGUAGE_OPTIONS: { value: CLILanguage; label: string; icon: string }[] = [
    { value: 'nodejs', label: 'Node.js', icon: '🟢' },
    { value: 'python', label: 'Python', icon: '🐍' },
    { value: 'go', label: 'Go', icon: '🔵' },
    { value: 'rust', label: 'Rust', icon: '🦀' },
];

export const EXAMPLE_PROMPTS = [
    { label: 'AI Coding Agent', icon: '🤖', prompt: 'Build an AI coding agent CLI like Claude Code that can generate, edit, and refactor code with multi-language support' },
    { label: 'DevOps Toolkit', icon: '🛠️', prompt: 'Create a DevOps automation CLI with commands for deploying to AWS, monitoring logs, managing Docker containers, and running health checks' },
    { label: 'Data Pipeline', icon: '📊', prompt: 'Build a data pipeline CLI that can fetch, transform, validate, and export data from APIs, CSV files, and databases' },
    { label: 'API Testing', icon: '🧪', prompt: 'Create an API testing CLI that can run test suites, generate mock data, benchmark endpoints, and produce reports' },
];

// ─── Safe JSON parser (web mode) ───

async function safeJson<T>(res: Response, context: string): Promise<T> {
    const text = await res.text();
    try {
        return JSON.parse(text) as T;
    } catch {
        if (text.startsWith('<!') || text.startsWith('<html')) {
            throw new Error(`Proxy server not running on ${API_BASE}. Start: node proxy-server.js`);
        }
        throw new Error(`Invalid response from ${context}: ${text.substring(0, 100)}`);
    }
}

// ─── API Helpers ───

export async function checkProxyHealth(): Promise<boolean> {
    if (isDesktopApp()) return true;
    try {
        const res = await fetch(`${API_BASE}/api/cli-info`, { signal: AbortSignal.timeout(3000) });
        return res.ok;
    } catch { return false; }
}

export async function getWorkspaceInfo(): Promise<{ workspaceRoot: string; platform: string }> {
    if (isDesktopApp()) return getDesktop().cliInfo();
    const res = await fetch(`${API_BASE}/api/cli-info`);
    return safeJson(res, 'cli-info');
}

export async function requestBuildPlan(prompt: string, language: CLILanguage): Promise<CLIBuildPlan> {
    if (isDesktopApp()) {
        const result = await getDesktop().cliPlan(prompt, language);
        if (result.error) throw new Error(result.error);
        return result.plan;
    }
    let res: Response;
    try {
        res = await fetch(`${API_BASE}/api/cli-plan`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt, language }),
        });
    } catch (err: any) {
        throw new Error(`Cannot connect to proxy: ${err.message}`);
    }
    const data = await safeJson<any>(res, 'cli-plan');
    if (!res.ok) throw new Error(data.error || 'Failed to generate plan');
    return data.plan;
}

export async function execCommand(command: string, cwd?: string): Promise<{ stdout: string; stderr: string; exitCode: number }> {
    if (isDesktopApp()) return getDesktop().cliExec(command, cwd);
    let res: Response;
    try {
        res = await fetch(`${API_BASE}/api/cli-exec`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ command, cwd }),
        });
    } catch (err: any) {
        throw new Error(`Cannot connect to proxy: ${err.message}`);
    }
    return safeJson(res, 'cli-exec');
}

export async function writeProjectFile(filePath: string, content: string): Promise<{ success: boolean; path: string; size: number }> {
    if (isDesktopApp()) return getDesktop().cliWrite(filePath, content);
    let res: Response;
    try {
        res = await fetch(`${API_BASE}/api/cli-write`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ filePath, content }),
        });
    } catch (err: any) {
        throw new Error(`Cannot connect to proxy: ${err.message}`);
    }
    return safeJson(res, 'cli-write');
}

// ─── Filesystem Helpers ───

export async function readFile(filePath: string): Promise<{ content: string; path: string }> {
    if (isDesktopApp()) return getDesktop().fsRead(filePath);
    // Web mode: use proxy exec to cat the file
    const result = await execCommand(`cat "${filePath}"`);
    return { content: result.stdout, path: filePath };
}

export async function listDir(dirPath: string): Promise<{ items: FileEntry[] }> {
    if (isDesktopApp()) return getDesktop().fsList(dirPath);
    // Web mode: parse ls output
    const result = await execCommand(`ls -la "${dirPath}"`);
    const items: FileEntry[] = [];
    const lines = result.stdout.split('\n').filter(l => l.trim() && !l.startsWith('total'));
    for (const line of lines) {
        const parts = line.split(/\s+/);
        if (parts.length < 9) continue;
        const name = parts.slice(8).join(' ');
        if (name === '.' || name === '..' || name.startsWith('.')) continue;
        items.push({
            name,
            path: `${dirPath}/${name}`,
            isDirectory: line.startsWith('d'),
            size: parseInt(parts[4]) || 0,
            modified: null,
        });
    }
    return { items };
}

export async function loadProjectTree(projectPath: string): Promise<FileEntry[]> {
    const result = await listDir(projectPath);
    const entries: FileEntry[] = [];
    for (const item of result.items) {
        if (item.name === 'node_modules' || item.name === '.git' || item.name === '__pycache__') continue;
        if (item.isDirectory) {
            try {
                const children = await loadProjectTree(item.path);
                entries.push({ ...item, children });
            } catch {
                entries.push(item);
            }
        } else {
            entries.push(item);
        }
    }
    return entries;
}

// Reveal folder in Finder
export async function revealInFinder(folderPath: string): Promise<void> {
    if (isDesktopApp()) {
        await getDesktop().cliReveal(folderPath);
        return;
    }
    try { await execCommand(`open "${folderPath}"`); } catch { /* silent */ }
}

// ─── ID helper ───
let idCounter = 0;
export function uid(): string {
    return `${Date.now()}_${++idCounter}`;
}

// ─── Conversation Types ───

export interface ChatResponse {
    action: 'ask' | 'build';
    message: string;
    context?: string;
    plan?: CLIBuildPlan;
}

// ─── Multi-Turn Conversation API ───

export async function sendChatMessage(
    messages: { role: string; content: string }[],
    language: CLILanguage,
    sessionId: string,
): Promise<ChatResponse> {
    // Desktop IPC — only if cliChat method exists (requires app restart after update)
    if (isDesktopApp() && typeof getDesktop().cliChat === 'function') {
        const result = await getDesktop().cliChat(messages, language, sessionId);
        if (result.error) throw new Error(result.error);
        return result.result as ChatResponse;
    }
    // Web/Proxy mode (also fallback when Electron app hasn't been restarted)
    let res: Response;
    try {
        res = await fetch(`${API_BASE}/api/cli-chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ messages, language, sessionId }),
        });
    } catch (err: any) {
        throw new Error(
            `Proxy server not running on ${API_BASE}. Start: node proxy-server.js`
        );
    }
    const data = await safeJson<any>(res, 'cli-chat');
    if (!res.ok) throw new Error(data.error || 'Chat request failed');
    return data.result as ChatResponse;
}

// ─── Build Executor (from plan) ───

export interface BuildExecutorCallbacks {
    onTerminal: (line: TerminalLine) => void;
    onChat: (msg: ChatMessage) => void;
    onComplete: (projectPath: string) => void;
    onError: (error: string) => void;
}

export async function executeBuildFromPlan(
    plan: CLIBuildPlan,
    language: CLILanguage,
    callbacks: BuildExecutorCallbacks,
): Promise<void> {
    const { onTerminal, onChat, onComplete, onError } = callbacks;
    const desktop = isDesktopApp();

    const termLine = (type: TerminalLine['type'], content: string) => {
        onTerminal({ id: uid(), type, content, timestamp: Date.now() });
    };

    const chatMsg = (content: string, status?: ChatMessage['status']): ChatMessage => {
        const msg: ChatMessage = { id: uid(), role: 'assistant', content, timestamp: Date.now(), status };
        onChat(msg);
        return msg;
    };

    try {
        // Step 0: Connectivity
        if (desktop) {
            termLine('info', '🖥️  Running in PromptX Desktop — direct terminal access');
        } else {
            termLine('info', '🔌 Connecting to proxy server...');
            const healthy = await checkProxyHealth();
            if (!healthy) throw new Error('Proxy server not running! Run: node proxy-server.js');
        }

        const info = await getWorkspaceInfo();
        termLine('success', `✅ Connected (${info.platform}${desktop ? ' — Desktop' : ''})`);
        termLine('info', `📂 Workspace: ${info.workspaceRoot}`);

        // Step 1: Show plan summary
        termLine('success', `✅ Plan: ${plan.projectName} (${plan.files.length} files)`);

        // Step 2: Create project directory
        const projectDir = plan.projectName;
        const fullProjectPath = `${info.workspaceRoot}/${projectDir}`;
        termLine('command', `$ mkdir -p ${fullProjectPath}`);
        await execCommand(`mkdir -p ${projectDir}`);
        termLine('success', `📂 Created: ${fullProjectPath}/`);

        // Step 3: Write files
        chatMsg(`Writing ${plan.files.length} files...`, 'building');
        for (const file of plan.files) {
            const filePath = `${projectDir}/${file.filename}`;
            termLine('command', `$ write → ${file.filename}`);
            try {
                const result = await writeProjectFile(filePath, file.content);
                termLine('stdout', `  ✅ ${file.filename} (${result.size} bytes)`);
            } catch (err: any) {
                termLine('error', `  ❌ ${file.filename} — ${err.message}`);
            }
        }
        termLine('success', `📝 ${plan.files.length} files written`);

        // Step 4: Install dependencies
        if (plan.installCommand) {
            chatMsg('Installing dependencies...', 'building');
            termLine('command', `$ cd ${projectDir} && ${plan.installCommand}`);
            try {
                const r = await execCommand(plan.installCommand, projectDir);
                if (r.stdout) {
                    const lines = r.stdout.trim().split('\n');
                    termLine('stdout', lines.slice(-6).join('\n'));
                }
                termLine(r.exitCode === 0 ? 'success' : 'error',
                    r.exitCode === 0 ? '✅ Dependencies installed' : `⚠️ Install exit code: ${r.exitCode}`);
            } catch (err: any) {
                termLine('error', `❌ Install failed: ${err.message}`);
            }
        }

        // Step 5: Make executable + test
        const entryFile = plan.files.find(f => /^index\.(js|py|go|rs)$/.test(f.filename));
        const entryName = entryFile ? entryFile.filename : (language === 'python' ? 'index.py' : 'index.js');
        const runCmdMap: Record<string, string> = {
            nodejs: `node ${entryName} --help`,
            python: `python3 ${entryName} --help`,
            go: `go run ${entryName} --help`,
            rust: `cargo run -- --help`,
        };
        const runCmd = runCmdMap[language] || `node ${entryName} --help`;

        if (language === 'nodejs') {
            await execCommand(`chmod +x ${projectDir}/${entryName}`).catch(() => { });
        } else if (language === 'python') {
            await execCommand(`chmod +x ${projectDir}/${entryName}`).catch(() => { });
        }
        if (plan.testCommand) {
            chatMsg('Running test...', 'building');
            termLine('command', `$ ${plan.testCommand}`);
            try {
                const t = await execCommand(plan.testCommand, projectDir);
                if (t.stdout) termLine('stdout', t.stdout.substring(0, 800));
                termLine(t.exitCode === 0 ? 'success' : 'stderr',
                    t.exitCode === 0 ? '✅ Test passed!' : (t.stderr?.substring(0, 300) || 'Test failed'));
            } catch (err: any) {
                termLine('stderr', `Test error: ${err.message}`);
            }
        }

        // Step 6: Done!
        termLine('info', '');
        termLine('success', `🎉 Build complete! ${fullProjectPath}`);
        termLine('info', `   cd ${fullProjectPath} && ${runCmd}`);

        chatMsg(
            `**${plan.displayName}** is ready! 🎉\n\n` +
            `📂 \`${fullProjectPath}\`\n\n` +
            `\`\`\`bash\ncd ${fullProjectPath}\n${runCmd}\n\`\`\``,
            'done'
        );

        onComplete(fullProjectPath);

        try {
            await revealInFinder(fullProjectPath);
            termLine('info', '📂 Opened in Finder');
        } catch { /* silent */ }

    } catch (err: any) {
        termLine('error', `❌ ${err.message}`);
        chatMsg(`Build failed: ${err.message}`, 'error');
        onError(err.message);
    }
}

// ─── Legacy Build Orchestrator (one-shot) ───

export interface BuildCallbacks {
    onChat: (msg: ChatMessage) => void;
    onTerminal: (line: TerminalLine) => void;
    onPlanReady: (plan: CLIBuildPlan) => void;
    onComplete: (projectPath: string) => void;
    onError: (error: string) => void;
}

export async function runBuild(
    prompt: string,
    language: CLILanguage,
    callbacks: BuildCallbacks,
): Promise<void> {
    const { onChat, onTerminal, onPlanReady, onComplete, onError } = callbacks;
    const desktop = isDesktopApp();

    const chatMsg = (content: string, status?: ChatMessage['status']): ChatMessage => {
        const msg: ChatMessage = { id: uid(), role: 'assistant', content, timestamp: Date.now(), status };
        onChat(msg);
        return msg;
    };

    const termLine = (type: TerminalLine['type'], content: string) => {
        onTerminal({ id: uid(), type, content, timestamp: Date.now() });
    };

    try {
        // Step 0: Health check
        if (desktop) {
            termLine('info', '🖥️  Running in PromptX Desktop — direct terminal access');
        } else {
            termLine('info', '🔌 Connecting to proxy server...');
            const healthy = await checkProxyHealth();
            if (!healthy) {
                throw new Error(
                    'Proxy server not running!\n\n' +
                    'Run: node proxy-server.js\n\n' +
                    'Or install the PromptX Desktop App for direct local access.'
                );
            }
        }

        const info = await getWorkspaceInfo();
        termLine('success', `✅ Connected (${info.platform}${desktop ? ' — Desktop' : ''})`);
        termLine('info', `📂 Workspace: ${info.workspaceRoot}`);

        // Step 1: Planning
        chatMsg("I'll build that! Let me design the architecture...", 'thinking');
        termLine('info', '⏳ Calling AI to design CLI architecture...');

        const plan = await requestBuildPlan(prompt, language);
        onPlanReady(plan);

        chatMsg(
            `Architecture ready!\n\n` +
            `📦 **${plan.displayName}** (\`${plan.projectName}\`)\n` +
            `${plan.description}\n\n` +
            `Commands: ${plan.commands.map(c => `\`${c.name}\``).join(', ')}\n` +
            `Files: ${plan.files.length} files\n\n` +
            `Building now — watch the terminal ↓`,
            'building'
        );
        termLine('success', `✅ Plan: ${plan.projectName} (${plan.files.length} files)`);

        // Step 2: Create project
        const projectDir = plan.projectName;
        const fullProjectPath = `${info.workspaceRoot}/${projectDir}`;
        termLine('command', `$ mkdir -p ${fullProjectPath}`);
        await execCommand(`mkdir -p ${projectDir}`);
        termLine('success', `📂 Created: ${fullProjectPath}/`);

        // Step 3: Write files
        chatMsg(`Writing ${plan.files.length} files...`, 'building');
        for (const file of plan.files) {
            const filePath = `${projectDir}/${file.filename}`;
            termLine('command', `$ write → ${file.filename}`);
            try {
                const result = await writeProjectFile(filePath, file.content);
                termLine('stdout', `  ✅ ${file.filename} (${result.size} bytes)`);
            } catch (err: any) {
                termLine('error', `  ❌ ${file.filename} — ${err.message}`);
            }
        }
        termLine('success', `📝 ${plan.files.length} files written`);

        // Step 4: Install dependencies
        if (plan.installCommand) {
            chatMsg(`Installing dependencies...`, 'building');
            termLine('command', `$ cd ${projectDir} && ${plan.installCommand}`);
            try {
                const r = await execCommand(plan.installCommand, projectDir);
                if (r.stdout) {
                    const lines = r.stdout.trim().split('\n');
                    termLine('stdout', lines.slice(-6).join('\n'));
                }
                termLine(r.exitCode === 0 ? 'success' : 'error',
                    r.exitCode === 0 ? '✅ Dependencies installed' : `⚠️ Install exit code: ${r.exitCode}`);
            } catch (err: any) {
                termLine('error', `❌ Install failed: ${err.message}`);
            }
        }

        // Step 5: Make executable + test
        if (language === 'nodejs') {
            await execCommand(`chmod +x ${projectDir}/index.js`).catch(() => { });
        }
        if (plan.testCommand) {
            chatMsg('Running test...', 'building');
            termLine('command', `$ ${plan.testCommand}`);
            try {
                const t = await execCommand(plan.testCommand, projectDir);
                if (t.stdout) termLine('stdout', t.stdout.substring(0, 800));
                termLine(t.exitCode === 0 ? 'success' : 'stderr',
                    t.exitCode === 0 ? '✅ Test passed!' : (t.stderr?.substring(0, 300) || 'Test failed'));
            } catch (err: any) {
                termLine('stderr', `Test error: ${err.message}`);
            }
        }

        // Step 6: Done!
        termLine('info', '');
        termLine('success', `🎉 Build complete! ${fullProjectPath}`);
        termLine('info', `   cd ${fullProjectPath} && node index.js --help`);

        chatMsg(
            `**${plan.displayName}** is ready! 🎉\n\n` +
            `📂 \`${fullProjectPath}\`\n\n` +
            `\`\`\`bash\ncd ${fullProjectPath}\nnode index.js --help\n\`\`\``,
            'done'
        );

        onComplete(fullProjectPath);

        try {
            await revealInFinder(fullProjectPath);
            termLine('info', '📂 Opened in Finder');
        } catch { /* silent */ }

    } catch (err: any) {
        termLine('error', `❌ ${err.message}`);
        chatMsg(`Build failed: ${err.message}`, 'error');
        onError(err.message);
    }
}
