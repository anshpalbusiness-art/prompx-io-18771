// ═══════════════════════ File System Integration ═══════════════════════
// Read/write/list files via the existing CLI endpoints. No auth needed.

import type { IntegrationAdapter, IntegrationResult, IntegrationStatus } from '../types';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3002';

export class FileSystemAdapter implements IntegrationAdapter {
    id = 'file-system';
    name = 'File System';
    icon = '📁';
    description = 'Read, write, and list local files and directories';
    category = 'filesystem' as const;
    requiresAuth = false;
    status: IntegrationStatus = 'connected';

    matchKeywords = [
        'file', 'directory', 'folder', 'read file', 'write file',
        'save', 'load', 'filesystem', 'disk', 'storage',
        'csv', 'json', 'txt', 'document', 'list files',
    ];

    isConnected(): boolean {
        return true;
    }

    async execute(input: Record<string, any>): Promise<IntegrationResult> {
        const action = input.action || 'list'; // list | read | write
        const filePath = input.path || input.filePath || input.file || '.';
        const content = input.content || input.data || '';

        try {
            if (action === 'write') {
                const response = await fetch(`${API_BASE}/api/cli-write`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ filePath, content: typeof content === 'string' ? content : JSON.stringify(content, null, 2) }),
                });
                const data = await response.json();
                if (!response.ok) throw new Error(data.error || 'Write failed');
                return {
                    success: true,
                    data: { action: 'write', path: data.path, size: data.size },
                    source: 'filesystem',
                };
            }

            if (action === 'read') {
                const response = await fetch(`${API_BASE}/api/cli-exec`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ command: `cat "${filePath}"` }),
                });
                const data = await response.json();
                if (data.exitCode !== 0) throw new Error(data.stderr || 'Read failed');
                return {
                    success: true,
                    data: { action: 'read', path: filePath, content: data.stdout, lines: data.stdout.split('\n').length },
                    source: 'filesystem',
                };
            }

            // Default: list
            const response = await fetch(`${API_BASE}/api/cli-exec`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ command: `ls -la "${filePath}"` }),
            });
            const data = await response.json();
            if (data.exitCode !== 0) throw new Error(data.stderr || 'List failed');

            const entries = data.stdout.split('\n').filter((l: string) => l.trim()).slice(1); // skip "total" line
            return {
                success: true,
                data: { action: 'list', path: filePath, entries, count: entries.length },
                source: 'filesystem',
            };
        } catch (err: any) {
            return {
                success: false,
                data: {},
                source: 'filesystem',
                error: err.message,
            };
        }
    }
}
