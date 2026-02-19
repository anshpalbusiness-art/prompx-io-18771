// ═══════════════════════ Database Integration ═══════════════════════
// JSON-based local data store with key-value tables in localStorage.
// Supports query, insert, update, delete, and list-tables operations.

import type { IntegrationAdapter, IntegrationResult, IntegrationStatus } from '../types';

const DB_PREFIX = 'promptx_db_';

function getTable(name: string): Record<string, any>[] {
    try {
        const raw = localStorage.getItem(DB_PREFIX + name);
        if (raw) return JSON.parse(raw);
    } catch { }
    return [];
}

function saveTable(name: string, data: Record<string, any>[]) {
    localStorage.setItem(DB_PREFIX + name, JSON.stringify(data));
}

function listTables(): string[] {
    const tables: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(DB_PREFIX)) {
            tables.push(key.slice(DB_PREFIX.length));
        }
    }
    return tables;
}

export class DatabaseAdapter implements IntegrationAdapter {
    id = 'database';
    name = 'Database';
    icon = '🗃️';
    description = 'Store, query, and manage structured data in local tables';
    category = 'database' as const;
    requiresAuth = false;
    status: IntegrationStatus = 'connected';

    matchKeywords = [
        'database', 'db', 'query', 'table', 'record', 'data store',
        'sql', 'insert', 'select', 'storage', 'persist',
        'collection', 'document', 'crud',
    ];

    isConnected(): boolean {
        return true;
    }

    async execute(input: Record<string, any>): Promise<IntegrationResult> {
        const action = input.action || 'list-tables';

        try {
            switch (action) {
                case 'query': return this.query(input);
                case 'insert': return this.insert(input);
                case 'update': return this.update(input);
                case 'delete': return this.deleteRecord(input);
                case 'create-table': return this.createTable(input);
                case 'list-tables':
                default: return this.listAllTables();
            }
        } catch (err: any) {
            return { success: false, data: {}, source: 'database', error: err.message };
        }
    }

    private listAllTables(): IntegrationResult {
        const tables = listTables();
        const tableInfo = tables.map(t => ({
            name: t,
            rowCount: getTable(t).length,
        }));

        return {
            success: true,
            data: { action: 'list-tables', tables: tableInfo, count: tables.length },
            source: 'database',
        };
    }

    private createTable(input: Record<string, any>): IntegrationResult {
        const name = input.table || input.name;
        if (!name) return { success: false, data: {}, source: 'database', error: 'No table name provided' };

        const existing = getTable(name);
        if (existing.length === 0) {
            saveTable(name, []);
        }

        return {
            success: true,
            data: { action: 'create-table', table: name, exists: existing.length > 0 },
            source: 'database',
        };
    }

    private query(input: Record<string, any>): IntegrationResult {
        const table = input.table || input.collection;
        if (!table) return { success: false, data: {}, source: 'database', error: 'No table name provided' };

        let rows = getTable(table);
        const where = input.where || input.filter;
        const limit = input.limit || 100;

        // Simple filter: { field: value }
        if (where && typeof where === 'object') {
            rows = rows.filter(row =>
                Object.entries(where).every(([key, val]) => row[key] === val)
            );
        }

        // Text search
        if (input.search) {
            const q = input.search.toLowerCase();
            rows = rows.filter(row =>
                Object.values(row).some(v =>
                    String(v).toLowerCase().includes(q)
                )
            );
        }

        return {
            success: true,
            data: { action: 'query', table, rows: rows.slice(0, limit), total: rows.length },
            source: 'database',
        };
    }

    private insert(input: Record<string, any>): IntegrationResult {
        const table = input.table || input.collection;
        if (!table) return { success: false, data: {}, source: 'database', error: 'No table name provided' };

        const record = input.record || input.data || input.row;
        if (!record) return { success: false, data: {}, source: 'database', error: 'No record data provided' };

        const rows = getTable(table);
        const newRecord = {
            _id: `row-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            ...record,
            _createdAt: new Date().toISOString(),
        };
        rows.push(newRecord);
        saveTable(table, rows);

        return {
            success: true,
            data: { action: 'insert', table, record: newRecord, totalRows: rows.length },
            source: 'database',
        };
    }

    private update(input: Record<string, any>): IntegrationResult {
        const table = input.table || input.collection;
        if (!table) return { success: false, data: {}, source: 'database', error: 'No table name provided' };

        const id = input.id || input._id;
        const updates = input.updates || input.set || input.data;
        if (!id || !updates) return { success: false, data: {}, source: 'database', error: 'Provide id and updates' };

        const rows = getTable(table);
        const idx = rows.findIndex(r => r._id === id);
        if (idx === -1) return { success: false, data: {}, source: 'database', error: `Record ${id} not found in ${table}` };

        rows[idx] = { ...rows[idx], ...updates, _updatedAt: new Date().toISOString() };
        saveTable(table, rows);

        return {
            success: true,
            data: { action: 'update', table, record: rows[idx] },
            source: 'database',
        };
    }

    private deleteRecord(input: Record<string, any>): IntegrationResult {
        const table = input.table || input.collection;
        if (!table) return { success: false, data: {}, source: 'database', error: 'No table name provided' };

        const id = input.id || input._id;
        if (!id) return { success: false, data: {}, source: 'database', error: 'No record id provided' };

        const rows = getTable(table);
        const idx = rows.findIndex(r => r._id === id);
        if (idx === -1) return { success: false, data: {}, source: 'database', error: `Record ${id} not found` };

        const deleted = rows.splice(idx, 1)[0];
        saveTable(table, rows);

        return {
            success: true,
            data: { action: 'delete', table, deletedId: deleted._id, remainingRows: rows.length },
            source: 'database',
        };
    }
}
