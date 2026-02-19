// ═══════════════════════ CRM Integration ═══════════════════════
// Basic CRM with contacts and deals stored in localStorage.
// Expandable to Supabase/HubSpot in the future.

import type { IntegrationAdapter, IntegrationResult, IntegrationStatus } from '../types';

const CONTACTS_KEY = 'promptx_crm_contacts';
const DEALS_KEY = 'promptx_crm_deals';

interface Contact {
    id: string;
    name: string;
    email: string;
    phone?: string;
    company?: string;
    status: 'lead' | 'prospect' | 'customer' | 'churned';
    tags: string[];
    notes?: string;
    createdAt: string;
    updatedAt: string;
}

interface Deal {
    id: string;
    title: string;
    contactId: string;
    value: number;
    stage: 'prospecting' | 'qualification' | 'proposal' | 'negotiation' | 'closed-won' | 'closed-lost';
    probability: number;
    createdAt: string;
    updatedAt: string;
}

function getContacts(): Contact[] {
    try {
        const raw = localStorage.getItem(CONTACTS_KEY);
        if (raw) return JSON.parse(raw);
    } catch { }

    const seed: Contact[] = [
        { id: 'ct-1', name: 'Sarah Chen', email: 'sarah@acme.com', company: 'Acme Corp', phone: '+1-555-0101', status: 'customer', tags: ['enterprise', 'priority'], notes: 'Key account, 3-year contract', createdAt: '2025-01-15T10:00:00Z', updatedAt: '2025-12-01T14:30:00Z' },
        { id: 'ct-2', name: 'Mike Johnson', email: 'mike@partner.io', company: 'Partner Inc', phone: '+1-555-0202', status: 'prospect', tags: ['partnership', 'tech'], notes: 'Interested in API integration', createdAt: '2025-06-20T09:00:00Z', updatedAt: '2025-11-15T11:00:00Z' },
        { id: 'ct-3', name: 'Emily Davis', email: 'emily@startup.co', company: 'StartupCo', status: 'lead', tags: ['startup', 'saas'], createdAt: '2025-10-01T08:00:00Z', updatedAt: '2025-10-01T08:00:00Z' },
        { id: 'ct-4', name: 'James Wilson', email: 'james@bigcorp.com', company: 'BigCorp Industries', phone: '+1-555-0404', status: 'customer', tags: ['enterprise', 'renewal'], notes: 'Contract renewal in Q2', createdAt: '2024-03-10T10:00:00Z', updatedAt: '2025-09-20T16:00:00Z' },
        { id: 'ct-5', name: 'Lisa Park', email: 'lisa@designstudio.com', company: 'Design Studio', status: 'churned', tags: ['smb', 'design'], notes: 'Moved to competitor', createdAt: '2024-08-15T12:00:00Z', updatedAt: '2025-07-01T09:00:00Z' },
    ];
    localStorage.setItem(CONTACTS_KEY, JSON.stringify(seed));
    return seed;
}

function saveContacts(contacts: Contact[]) {
    localStorage.setItem(CONTACTS_KEY, JSON.stringify(contacts));
}

function getDeals(): Deal[] {
    try {
        const raw = localStorage.getItem(DEALS_KEY);
        if (raw) return JSON.parse(raw);
    } catch { }

    const seed: Deal[] = [
        { id: 'dl-1', title: 'Acme Enterprise License', contactId: 'ct-1', value: 48000, stage: 'closed-won', probability: 100, createdAt: '2025-01-20T10:00:00Z', updatedAt: '2025-03-15T14:00:00Z' },
        { id: 'dl-2', title: 'Partner API Integration', contactId: 'ct-2', value: 24000, stage: 'proposal', probability: 60, createdAt: '2025-08-01T09:00:00Z', updatedAt: '2025-11-20T11:00:00Z' },
        { id: 'dl-3', title: 'StartupCo Pilot Program', contactId: 'ct-3', value: 6000, stage: 'qualification', probability: 30, createdAt: '2025-10-05T08:00:00Z', updatedAt: '2025-10-15T10:00:00Z' },
        { id: 'dl-4', title: 'BigCorp Renewal + Expansion', contactId: 'ct-4', value: 72000, stage: 'negotiation', probability: 75, createdAt: '2025-09-01T10:00:00Z', updatedAt: '2025-12-01T16:00:00Z' },
    ];
    localStorage.setItem(DEALS_KEY, JSON.stringify(seed));
    return seed;
}

function saveDeals(deals: Deal[]) {
    localStorage.setItem(DEALS_KEY, JSON.stringify(deals));
}

export class CrmAdapter implements IntegrationAdapter {
    id = 'crm';
    name = 'CRM';
    icon = '🗂️';
    description = 'Manage contacts, leads, deals, and customer relationships';
    category = 'crm' as const;
    requiresAuth = false;
    status: IntegrationStatus = 'connected';

    matchKeywords = [
        'crm', 'contact', 'contacts', 'lead', 'leads', 'customer',
        'sales', 'deal', 'deals', 'pipeline', 'hubspot', 'salesforce',
        'prospect', 'relationship', 'client', 'account',
    ];

    isConnected(): boolean {
        return true;
    }

    async execute(input: Record<string, any>): Promise<IntegrationResult> {
        const action = input.action || 'list-contacts';

        try {
            switch (action) {
                case 'add-contact': return this.addContact(input);
                case 'update-contact': return this.updateContact(input);
                case 'search': return this.searchContacts(input);
                case 'list-deals': return this.listDeals(input);
                case 'add-deal': return this.addDeal(input);
                case 'list-contacts':
                default: return this.listContacts(input);
            }
        } catch (err: any) {
            return { success: false, data: {}, source: 'crm', error: err.message };
        }
    }

    private listContacts(input: Record<string, any>): IntegrationResult {
        const contacts = getContacts();
        const status = input.status;
        const filtered = status ? contacts.filter(c => c.status === status) : contacts;

        return {
            success: true,
            data: {
                action: 'list-contacts',
                contacts: filtered.map(c => ({ id: c.id, name: c.name, email: c.email, company: c.company, status: c.status, tags: c.tags })),
                total: filtered.length,
                byStatus: {
                    lead: contacts.filter(c => c.status === 'lead').length,
                    prospect: contacts.filter(c => c.status === 'prospect').length,
                    customer: contacts.filter(c => c.status === 'customer').length,
                    churned: contacts.filter(c => c.status === 'churned').length,
                },
            },
            source: 'crm',
        };
    }

    private addContact(input: Record<string, any>): IntegrationResult {
        const contacts = getContacts();
        const newContact: Contact = {
            id: `ct-${Date.now()}`,
            name: input.name || 'Unknown',
            email: input.email || '',
            phone: input.phone,
            company: input.company,
            status: input.status || 'lead',
            tags: input.tags || [],
            notes: input.notes,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };
        contacts.push(newContact);
        saveContacts(contacts);

        return {
            success: true,
            data: { action: 'add-contact', contact: newContact },
            source: 'crm',
        };
    }

    private updateContact(input: Record<string, any>): IntegrationResult {
        const contacts = getContacts();
        const idx = contacts.findIndex(c => c.id === input.id || c.email === input.email);
        if (idx === -1) return { success: false, data: {}, source: 'crm', error: 'Contact not found' };

        const updated = { ...contacts[idx] };
        if (input.name) updated.name = input.name;
        if (input.status) updated.status = input.status;
        if (input.phone) updated.phone = input.phone;
        if (input.company) updated.company = input.company;
        if (input.notes) updated.notes = input.notes;
        if (input.tags) updated.tags = input.tags;
        updated.updatedAt = new Date().toISOString();
        contacts[idx] = updated;
        saveContacts(contacts);

        return {
            success: true,
            data: { action: 'update-contact', contact: updated },
            source: 'crm',
        };
    }

    private searchContacts(input: Record<string, any>): IntegrationResult {
        const query = (input.query || input.search || input.keyword || '').toLowerCase();
        const contacts = getContacts();
        const results = contacts.filter(c =>
            c.name.toLowerCase().includes(query) ||
            c.email.toLowerCase().includes(query) ||
            (c.company || '').toLowerCase().includes(query) ||
            c.tags.some(t => t.toLowerCase().includes(query))
        );

        return {
            success: true,
            data: { action: 'search', query, results: results.map(c => ({ id: c.id, name: c.name, email: c.email, company: c.company, status: c.status })), count: results.length },
            source: 'crm',
        };
    }

    private listDeals(input: Record<string, any>): IntegrationResult {
        const deals = getDeals();
        const contacts = getContacts();
        const stage = input.stage;
        const filtered = stage ? deals.filter(d => d.stage === stage) : deals;

        const enriched = filtered.map(d => {
            const contact = contacts.find(c => c.id === d.contactId);
            return { ...d, contactName: contact?.name || 'Unknown', contactEmail: contact?.email };
        });

        const totalValue = deals.reduce((sum, d) => sum + d.value, 0);
        const weightedValue = deals.reduce((sum, d) => sum + d.value * d.probability / 100, 0);

        return {
            success: true,
            data: {
                action: 'list-deals',
                deals: enriched,
                total: filtered.length,
                pipelineValue: totalValue,
                weightedValue: Math.round(weightedValue),
                byStage: {
                    prospecting: deals.filter(d => d.stage === 'prospecting').length,
                    qualification: deals.filter(d => d.stage === 'qualification').length,
                    proposal: deals.filter(d => d.stage === 'proposal').length,
                    negotiation: deals.filter(d => d.stage === 'negotiation').length,
                    'closed-won': deals.filter(d => d.stage === 'closed-won').length,
                    'closed-lost': deals.filter(d => d.stage === 'closed-lost').length,
                },
            },
            source: 'crm',
        };
    }

    private addDeal(input: Record<string, any>): IntegrationResult {
        const deals = getDeals();
        const newDeal: Deal = {
            id: `dl-${Date.now()}`,
            title: input.title || 'New Deal',
            contactId: input.contactId || '',
            value: input.value || 0,
            stage: input.stage || 'prospecting',
            probability: input.probability || 10,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };
        deals.push(newDeal);
        saveDeals(deals);

        return {
            success: true,
            data: { action: 'add-deal', deal: newDeal },
            source: 'crm',
        };
    }
}
