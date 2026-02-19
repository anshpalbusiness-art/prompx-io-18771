// ═══════════════════════ Email Integration ═══════════════════════
// Send, list, and read emails. Uses proxy endpoint for SMTP sending.
// Falls back to simulated inbox for list/read operations.

import type { IntegrationAdapter, IntegrationResult, IntegrationStatus } from '../types';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3002';

// Simulated inbox for demo (persisted to localStorage)
const INBOX_KEY = 'promptx_email_inbox';

interface EmailMessage {
    id: string;
    from: string;
    to: string;
    subject: string;
    body: string;
    date: string;
    read: boolean;
}

function getInbox(): EmailMessage[] {
    try {
        const raw = localStorage.getItem(INBOX_KEY);
        if (raw) return JSON.parse(raw);
    } catch { }

    // Seed with demo data
    const seed: EmailMessage[] = [
        {
            id: 'em-1', from: 'sarah@acme.com', to: 'me@company.com',
            subject: 'Q1 Report Ready', body: 'Hi, the Q1 sales report is finalized. Revenue is up 23% QoQ. Please review and share with the team.',
            date: new Date(Date.now() - 3600000).toISOString(), read: false,
        },
        {
            id: 'em-2', from: 'mike@partner.io', to: 'me@company.com',
            subject: 'Partnership Proposal', body: 'We would like to explore a strategic partnership. Available for a call this week?',
            date: new Date(Date.now() - 7200000).toISOString(), read: false,
        },
        {
            id: 'em-3', from: 'noreply@github.com', to: 'me@company.com',
            subject: '[GitHub] Pull Request #142 merged', body: 'Your PR "Fix authentication flow" has been merged into main.',
            date: new Date(Date.now() - 14400000).toISOString(), read: true,
        },
        {
            id: 'em-4', from: 'hr@company.com', to: 'me@company.com',
            subject: 'Team Building Event - Friday', body: 'Reminder: Team building event this Friday at 3 PM. Please RSVP.',
            date: new Date(Date.now() - 28800000).toISOString(), read: true,
        },
    ];
    localStorage.setItem(INBOX_KEY, JSON.stringify(seed));
    return seed;
}

function saveInbox(inbox: EmailMessage[]) {
    localStorage.setItem(INBOX_KEY, JSON.stringify(inbox));
}

export class EmailAdapter implements IntegrationAdapter {
    id = 'email';
    name = 'Email';
    icon = '📧';
    description = 'Send, read, and manage emails via SMTP';
    category = 'communication' as const;
    requiresAuth = false;
    status: IntegrationStatus = 'connected';

    matchKeywords = [
        'email', 'mail', 'send email', 'inbox', 'smtp',
        'gmail', 'outlook', 'compose', 'reply', 'forward',
        'message', 'correspondence', 'newsletter',
    ];

    isConnected(): boolean {
        return true;
    }

    async execute(input: Record<string, any>): Promise<IntegrationResult> {
        const action = input.action || 'list';

        try {
            if (action === 'send') {
                return await this.sendEmail(input);
            }
            if (action === 'read') {
                return this.readEmail(input);
            }
            // Default: list inbox
            return this.listInbox(input);
        } catch (err: any) {
            return {
                success: false, data: {}, source: 'email',
                error: err.message,
            };
        }
    }

    private async sendEmail(input: Record<string, any>): Promise<IntegrationResult> {
        const to = input.to || input.recipient || input.email;
        const subject = input.subject || 'No Subject';
        const body = input.body || input.content || input.message || '';

        if (!to) {
            return { success: false, data: {}, source: 'email', error: 'No recipient specified. Pass a "to" field.' };
        }

        try {
            const response = await fetch(`${API_BASE}/api/integration/send-email`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ to, subject, body }),
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Send failed');

            // Add to sent items
            const inbox = getInbox();
            inbox.unshift({
                id: `em-sent-${Date.now()}`,
                from: 'me@company.com',
                to,
                subject,
                body,
                date: new Date().toISOString(),
                read: true,
            });
            saveInbox(inbox);

            return {
                success: true,
                data: { action: 'send', to, subject, messageId: data.messageId || `msg-${Date.now()}`, status: 'sent' },
                source: 'email',
            };
        } catch {
            // Fallback: simulate sending
            const inbox = getInbox();
            const msgId = `em-sent-${Date.now()}`;
            inbox.unshift({
                id: msgId, from: 'me@company.com', to, subject, body,
                date: new Date().toISOString(), read: true,
            });
            saveInbox(inbox);

            return {
                success: true,
                data: { action: 'send', to, subject, messageId: msgId, status: 'sent (simulated)' },
                source: 'email-local',
            };
        }
    }

    private readEmail(input: Record<string, any>): IntegrationResult {
        const emailId = input.id || input.emailId || input.messageId;
        const inbox = getInbox();

        if (emailId) {
            const email = inbox.find(e => e.id === emailId);
            if (!email) return { success: false, data: {}, source: 'email', error: `Email ${emailId} not found` };
            email.read = true;
            saveInbox(inbox);
            return { success: true, data: { action: 'read', email }, source: 'email' };
        }

        // Read first unread
        const unread = inbox.find(e => !e.read);
        if (unread) {
            unread.read = true;
            saveInbox(inbox);
            return { success: true, data: { action: 'read', email: unread }, source: 'email' };
        }

        return { success: true, data: { action: 'read', email: inbox[0] || null, message: 'No unread emails' }, source: 'email' };
    }

    private listInbox(input: Record<string, any>): IntegrationResult {
        const inbox = getInbox();
        const limit = input.limit || 10;
        const filter = input.filter || 'all'; // all | unread | sent

        let filtered = inbox;
        if (filter === 'unread') filtered = inbox.filter(e => !e.read);
        if (filter === 'sent') filtered = inbox.filter(e => e.from === 'me@company.com');

        const emails = filtered.slice(0, limit);
        return {
            success: true,
            data: {
                action: 'list',
                emails: emails.map(e => ({ id: e.id, from: e.from, subject: e.subject, date: e.date, read: e.read })),
                total: filtered.length,
                unreadCount: inbox.filter(e => !e.read).length,
            },
            source: 'email',
        };
    }
}
