// ═══════════════════════ Shell Command Integration ═══════════════════════
// Execute real shell commands (git, npm, docker, etc.) via existing CLI endpoint.

import type { IntegrationAdapter, IntegrationResult, IntegrationStatus } from '../types';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3002';

export class ShellCommandAdapter implements IntegrationAdapter {
    id = 'shell-command';
    name = 'Shell Commands';
    icon = '⚡';
    description = 'Execute shell commands like git, npm, docker, and system utilities';
    category = 'shell' as const;
    requiresAuth = false;
    status: IntegrationStatus = 'connected';

    matchKeywords = [
        'shell', 'command', 'terminal', 'bash', 'cli',
        'git', 'npm', 'node', 'docker', 'deploy',
        'build', 'install', 'run', 'execute', 'script',
        'pip', 'python', 'curl', 'wget',
    ];

    isConnected(): boolean {
        return true;
    }

    async execute(input: Record<string, any>): Promise<IntegrationResult> {
        const command = input.command || input.cmd || input.script || '';
        const cwd = input.cwd || input.directory || undefined;

        if (!command) {
            return {
                success: false,
                data: {},
                source: 'shell',
                error: 'No command provided. Pass a "command" field.',
            };
        }

        try {
            const response = await fetch(`${API_BASE}/api/cli-exec`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ command, cwd }),
            });

            const data = await response.json();

            return {
                success: data.exitCode === 0,
                data: {
                    command,
                    stdout: data.stdout || '',
                    stderr: data.stderr || '',
                    exitCode: data.exitCode,
                },
                source: 'shell',
                rawResponse: data,
                error: data.exitCode !== 0 ? (data.stderr || `Command exited with code ${data.exitCode}`) : undefined,
            };
        } catch (err: any) {
            return {
                success: false,
                data: {},
                source: 'shell',
                error: err.message,
            };
        }
    }
}
