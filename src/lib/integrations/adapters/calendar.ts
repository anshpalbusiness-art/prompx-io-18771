// ═══════════════════════ Calendar Integration ═══════════════════════
// Local calendar with event management. Persisted to localStorage.

import type { IntegrationAdapter, IntegrationResult, IntegrationStatus } from '../types';

const EVENTS_KEY = 'promptx_calendar_events';

interface CalendarEvent {
    id: string;
    title: string;
    description?: string;
    startTime: string;
    endTime: string;
    location?: string;
    attendees?: string[];
    status: 'confirmed' | 'tentative' | 'cancelled';
    createdAt: string;
}

function getEvents(): CalendarEvent[] {
    try {
        const raw = localStorage.getItem(EVENTS_KEY);
        if (raw) return JSON.parse(raw);
    } catch { }

    const now = Date.now();
    const seed: CalendarEvent[] = [
        { id: 'ev-1', title: 'Team Standup', description: 'Daily standup meeting', startTime: new Date(now + 3600000).toISOString(), endTime: new Date(now + 5400000).toISOString(), location: 'Zoom', attendees: ['team@company.com'], status: 'confirmed', createdAt: new Date(now - 86400000).toISOString() },
        { id: 'ev-2', title: 'Product Review', description: 'Review Q1 product roadmap and feature priorities', startTime: new Date(now + 86400000).toISOString(), endTime: new Date(now + 90000000).toISOString(), location: 'Conference Room A', attendees: ['sarah@acme.com', 'mike@partner.io'], status: 'confirmed', createdAt: new Date(now - 172800000).toISOString() },
        { id: 'ev-3', title: 'Client Call - BigCorp', description: 'Discuss contract renewal terms', startTime: new Date(now + 172800000).toISOString(), endTime: new Date(now + 176400000).toISOString(), location: 'Google Meet', attendees: ['james@bigcorp.com'], status: 'tentative', createdAt: new Date(now - 259200000).toISOString() },
        { id: 'ev-4', title: 'Team Building', description: 'Friday team building event', startTime: new Date(now + 345600000).toISOString(), endTime: new Date(now + 356400000).toISOString(), location: 'Office Lounge', status: 'confirmed', createdAt: new Date(now - 604800000).toISOString() },
    ];
    localStorage.setItem(EVENTS_KEY, JSON.stringify(seed));
    return seed;
}

function saveEvents(events: CalendarEvent[]) {
    localStorage.setItem(EVENTS_KEY, JSON.stringify(events));
}

export class CalendarAdapter implements IntegrationAdapter {
    id = 'calendar';
    name = 'Calendar';
    icon = '📅';
    description = 'Manage events, meetings, and schedules';
    category = 'calendar' as const;
    requiresAuth = false;
    status: IntegrationStatus = 'connected';

    matchKeywords = [
        'calendar', 'event', 'schedule', 'meeting', 'appointment',
        'reminder', 'booking', 'agenda', 'availability',
        'google calendar', 'outlook calendar',
    ];

    isConnected(): boolean {
        return true;
    }

    async execute(input: Record<string, any>): Promise<IntegrationResult> {
        const action = input.action || 'list-events';

        try {
            switch (action) {
                case 'create-event': return this.createEvent(input);
                case 'delete-event': return this.deleteEvent(input);
                case 'update-event': return this.updateEvent(input);
                case 'list-events':
                default: return this.listEvents(input);
            }
        } catch (err: any) {
            return { success: false, data: {}, source: 'calendar', error: err.message };
        }
    }

    private listEvents(input: Record<string, any>): IntegrationResult {
        const events = getEvents();
        const upcoming = events
            .filter(e => e.status !== 'cancelled' && new Date(e.startTime) >= new Date(Date.now() - 3600000))
            .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

        const limit = input.limit || 10;

        return {
            success: true,
            data: {
                action: 'list-events',
                events: upcoming.slice(0, limit).map(e => ({
                    id: e.id, title: e.title, startTime: e.startTime, endTime: e.endTime,
                    location: e.location, attendees: e.attendees, status: e.status,
                })),
                total: upcoming.length,
                nextEvent: upcoming[0] ? { title: upcoming[0].title, startTime: upcoming[0].startTime } : null,
            },
            source: 'calendar',
        };
    }

    private createEvent(input: Record<string, any>): IntegrationResult {
        const events = getEvents();
        const newEvent: CalendarEvent = {
            id: `ev-${Date.now()}`,
            title: input.title || 'New Event',
            description: input.description,
            startTime: input.startTime || new Date(Date.now() + 3600000).toISOString(),
            endTime: input.endTime || new Date(Date.now() + 7200000).toISOString(),
            location: input.location,
            attendees: input.attendees || [],
            status: 'confirmed',
            createdAt: new Date().toISOString(),
        };
        events.push(newEvent);
        saveEvents(events);

        return {
            success: true,
            data: { action: 'create-event', event: newEvent },
            source: 'calendar',
        };
    }

    private deleteEvent(input: Record<string, any>): IntegrationResult {
        const events = getEvents();
        const idx = events.findIndex(e => e.id === input.id || e.id === input.eventId);
        if (idx === -1) return { success: false, data: {}, source: 'calendar', error: 'Event not found' };

        const deleted = events[idx];
        events[idx] = { ...deleted, status: 'cancelled' };
        saveEvents(events);

        return {
            success: true,
            data: { action: 'delete-event', event: { id: deleted.id, title: deleted.title, status: 'cancelled' } },
            source: 'calendar',
        };
    }

    private updateEvent(input: Record<string, any>): IntegrationResult {
        const events = getEvents();
        const idx = events.findIndex(e => e.id === input.id || e.id === input.eventId);
        if (idx === -1) return { success: false, data: {}, source: 'calendar', error: 'Event not found' };

        const updated = { ...events[idx] };
        if (input.title) updated.title = input.title;
        if (input.description) updated.description = input.description;
        if (input.startTime) updated.startTime = input.startTime;
        if (input.endTime) updated.endTime = input.endTime;
        if (input.location) updated.location = input.location;
        if (input.attendees) updated.attendees = input.attendees;
        events[idx] = updated;
        saveEvents(events);

        return {
            success: true,
            data: { action: 'update-event', event: updated },
            source: 'calendar',
        };
    }
}
