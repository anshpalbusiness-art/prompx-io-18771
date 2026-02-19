// ═══════════════════════ Notification Integration ═══════════════════════
// In-app notifications via localStorage + browser Notification API.

import type { IntegrationAdapter, IntegrationResult, IntegrationStatus } from '../types';

const NOTIFICATIONS_KEY = 'promptx_notifications';

interface AppNotification {
    id: string;
    title: string;
    message: string;
    type: 'info' | 'success' | 'warning' | 'error';
    read: boolean;
    createdAt: string;
}

function getNotifications(): AppNotification[] {
    try {
        const raw = localStorage.getItem(NOTIFICATIONS_KEY);
        if (raw) return JSON.parse(raw);
    } catch { }
    return [];
}

function saveNotifications(n: AppNotification[]) {
    localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(n));
}

export class NotificationAdapter implements IntegrationAdapter {
    id = 'notification';
    name = 'Notifications';
    icon = '🔔';
    description = 'Send in-app and browser push notifications';
    category = 'notification' as const;
    requiresAuth = false;
    status: IntegrationStatus = 'connected';

    matchKeywords = [
        'notify', 'notification', 'alert', 'push', 'broadcast',
        'announce', 'reminder', 'warning', 'bell', 'toast',
    ];

    isConnected(): boolean {
        return true;
    }

    async execute(input: Record<string, any>): Promise<IntegrationResult> {
        const action = input.action || 'send';

        try {
            switch (action) {
                case 'list': return this.listNotifications();
                case 'clear': return this.clearNotifications();
                case 'send':
                default: return this.sendNotification(input);
            }
        } catch (err: any) {
            return { success: false, data: {}, source: 'notification', error: err.message };
        }
    }

    private sendNotification(input: Record<string, any>): IntegrationResult {
        const title = input.title || input.subject || 'Notification';
        const message = input.message || input.body || input.content || '';
        const type = input.type || 'info';

        const notification: AppNotification = {
            id: `notif-${Date.now()}`,
            title,
            message,
            type,
            read: false,
            createdAt: new Date().toISOString(),
        };

        const all = getNotifications();
        all.unshift(notification);
        if (all.length > 50) all.length = 50; // Cap at 50
        saveNotifications(all);

        // Try browser notification
        if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
            try { new Notification(title, { body: message }); } catch { }
        }

        return {
            success: true,
            data: { action: 'send', notification, totalNotifications: all.length },
            source: 'notification',
        };
    }

    private listNotifications(): IntegrationResult {
        const all = getNotifications();
        return {
            success: true,
            data: {
                action: 'list',
                notifications: all.slice(0, 20),
                total: all.length,
                unread: all.filter(n => !n.read).length,
            },
            source: 'notification',
        };
    }

    private clearNotifications(): IntegrationResult {
        const count = getNotifications().length;
        saveNotifications([]);
        return {
            success: true,
            data: { action: 'clear', clearedCount: count },
            source: 'notification',
        };
    }
}
