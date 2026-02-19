// ═══════════════════════ Shopify Integration Adapter ═══════════════════════
import { supabase } from '../../../integrations/supabase/client';
import type { IntegrationAdapter, IntegrationResult } from '../types';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3002';
const STORAGE_PREFIX = 'promptx_shopify_';

// ── Seed demo data ──────────────────────────────────────────────────────────
function seedProducts(): any[] {
    const key = STORAGE_PREFIX + 'products';
    const existing = localStorage.getItem(key);
    if (existing) return JSON.parse(existing);

    const products = [
        {
            id: 'prod_1', title: 'Premium Wireless Headphones', vendor: 'AudioTech',
            product_type: 'Electronics', status: 'active',
            variants: [{ id: 'v1', price: '149.99', inventory_quantity: 85, sku: 'AH-WH-001' }],
            images: [{ src: 'https://placehold.co/400x400?text=Headphones' }],
            tags: 'wireless, audio, premium', created_at: '2026-01-10T10:00:00Z',
        },
        {
            id: 'prod_2', title: 'Organic Cotton T-Shirt', vendor: 'GreenWear',
            product_type: 'Apparel', status: 'active',
            variants: [
                { id: 'v2a', price: '34.99', inventory_quantity: 200, sku: 'GW-TS-S', title: 'Small' },
                { id: 'v2b', price: '34.99', inventory_quantity: 150, sku: 'GW-TS-M', title: 'Medium' },
                { id: 'v2c', price: '34.99', inventory_quantity: 90, sku: 'GW-TS-L', title: 'Large' },
            ],
            images: [{ src: 'https://placehold.co/400x400?text=T-Shirt' }],
            tags: 'organic, cotton, sustainable', created_at: '2026-01-15T14:00:00Z',
        },
        {
            id: 'prod_3', title: 'Smart Home Hub Pro', vendor: 'HomeConnect',
            product_type: 'Electronics', status: 'active',
            variants: [{ id: 'v3', price: '249.99', inventory_quantity: 42, sku: 'HC-SH-PRO' }],
            images: [{ src: 'https://placehold.co/400x400?text=SmartHub' }],
            tags: 'smart home, IoT, automation', created_at: '2026-02-01T09:00:00Z',
        },
        {
            id: 'prod_4', title: 'Artisan Coffee Blend', vendor: 'BeanMasters',
            product_type: 'Food & Beverage', status: 'active',
            variants: [
                { id: 'v4a', price: '18.99', inventory_quantity: 500, sku: 'BM-CB-250', title: '250g' },
                { id: 'v4b', price: '32.99', inventory_quantity: 300, sku: 'BM-CB-500', title: '500g' },
            ],
            images: [{ src: 'https://placehold.co/400x400?text=Coffee' }],
            tags: 'coffee, artisan, organic', created_at: '2026-02-05T11:00:00Z',
        },
    ];

    localStorage.setItem(key, JSON.stringify(products));
    return products;
}

function seedOrders(): any[] {
    const key = STORAGE_PREFIX + 'orders';
    const existing = localStorage.getItem(key);
    if (existing) return JSON.parse(existing);

    const orders = [
        {
            id: 'ord_1001', order_number: 1001, financial_status: 'paid', fulfillment_status: 'fulfilled',
            total_price: '184.98', currency: 'USD', created_at: '2026-02-10T08:30:00Z',
            customer: { first_name: 'Alice', last_name: 'Chen', email: 'alice@example.com' },
            line_items: [
                { product_id: 'prod_1', title: 'Premium Wireless Headphones', quantity: 1, price: '149.99' },
                { product_id: 'prod_4', title: 'Artisan Coffee Blend — 500g', quantity: 1, price: '32.99' },
            ],
        },
        {
            id: 'ord_1002', order_number: 1002, financial_status: 'paid', fulfillment_status: 'unfulfilled',
            total_price: '69.98', currency: 'USD', created_at: '2026-02-12T14:15:00Z',
            customer: { first_name: 'Bob', last_name: 'Smith', email: 'bob@example.com' },
            line_items: [
                { product_id: 'prod_2', title: 'Organic Cotton T-Shirt — Medium', quantity: 2, price: '34.99' },
            ],
        },
        {
            id: 'ord_1003', order_number: 1003, financial_status: 'pending', fulfillment_status: null,
            total_price: '249.99', currency: 'USD', created_at: '2026-02-14T16:45:00Z',
            customer: { first_name: 'Claire', last_name: 'Johnson', email: 'claire@example.com' },
            line_items: [
                { product_id: 'prod_3', title: 'Smart Home Hub Pro', quantity: 1, price: '249.99' },
            ],
        },
    ];

    localStorage.setItem(key, JSON.stringify(orders));
    return orders;
}

// ── Adapter ─────────────────────────────────────────────────────────────────
export class ShopifyAdapter implements IntegrationAdapter {
    id = 'shopify';
    name = 'Shopify';
    icon = '🛍️';
    description = 'Manage products, orders, and inventory from your Shopify store';
    category = 'commerce' as const;
    requiresAuth = true;
    status = 'connected' as const;

    matchKeywords = [
        'shopify', 'product', 'products', 'order', 'orders', 'inventory', 'stock',
        'e-commerce', 'ecommerce', 'store', 'shop', 'catalog', 'sku', 'variant',
        'fulfillment', 'shipping', 'price', 'pricing',
    ];

    isConnected(): boolean { return true; }

    async execute(input: Record<string, any>): Promise<IntegrationResult> {
        const action = input.action || 'list-products';

        // Check for Real Connection
        const { data: { user } } = await supabase.auth.getUser();
        let realToken = null;
        let shopDomain = null;

        if (user) {
            const { data } = await supabase.from('user_integrations')
                .select('access_token, metadata')
                .eq('user_id', user.id)
                .eq('provider', 'shopify')
                .single();

            if (data?.access_token) {
                realToken = data.access_token;
                // @ts-ignore
                shopDomain = data.metadata?.shop;
            }
        }

        // If Real Token exists, use Proxy
        if (realToken && shopDomain) {
            try {
                return await this.executeReal(action, input, realToken, shopDomain);
            } catch (err: any) {
                console.warn('Real Shopify API failed, falling back to simulation:', err);
                // Fallthrough to simulation
            }
        }

        // Simulation Mode
        try {
            switch (action) {
                case 'list-products': return this.listProducts(input);
                case 'get-product': return this.getProduct(input);
                case 'get-orders': return this.getOrders(input);
                case 'update-inventory': return this.updateInventory(input);
                default:
                    return { success: false, data: {}, source: 'shopify', error: `Unknown action: ${action}` };
            }
        } catch (err: any) {
            return { success: false, data: {}, source: 'shopify', error: err.message };
        }
    }

    // ── Real API Execution ─────────────────────────────────────────────────
    private async executeReal(action: string, input: any, token: string, shop: string): Promise<IntegrationResult> {
        let path = '';
        let method = 'GET';
        let body = undefined;

        switch (action) {
            case 'list-products': path = 'products.json'; break;
            case 'get-orders': path = 'orders.json?status=any'; break;
            // Add other mappings as needed
            default: throw new Error('Action not supported in Real Mode yet');
        }

        const response = await fetch(`${API_BASE}/api/proxy/shopify`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ shop, token, path, method, body })
        });

        const result = await response.json();
        if (result.error) throw new Error(result.error);

        return {
            success: true,
            source: 'shopify (live)',
            data: result
        };
    }

    // ── Actions ─────────────────────────────────────────────────────────────

    private listProducts(input: Record<string, any>): IntegrationResult {
        const products = seedProducts();
        const type = input.product_type || input.type;
        const status = input.status;

        let filtered = products;
        if (type) filtered = filtered.filter((p: any) => p.product_type.toLowerCase() === type.toLowerCase());
        if (status) filtered = filtered.filter((p: any) => p.status === status);

        const summary = filtered.map((p: any) => ({
            id: p.id, title: p.title, vendor: p.vendor, type: p.product_type,
            price: p.variants[0]?.price, totalStock: p.variants.reduce((s: number, v: any) => s + v.inventory_quantity, 0),
        }));

        return {
            success: true, source: 'shopify',
            data: { products: summary, total: summary.length, action: 'list-products' },
        };
    }

    private getProduct(input: Record<string, any>): IntegrationResult {
        const products = seedProducts();
        const product = products.find((p: any) => p.id === input.id || p.title.toLowerCase().includes((input.title || '').toLowerCase()));
        if (!product) return { success: false, data: {}, source: 'shopify', error: 'Product not found' };
        return { success: true, source: 'shopify', data: { product } };
    }

    private getOrders(input: Record<string, any>): IntegrationResult {
        const orders = seedOrders();
        const status = input.fulfillment_status || input.status;

        let filtered = orders;
        if (status) filtered = filtered.filter((o: any) => o.fulfillment_status === status);

        const totalRevenue = filtered.reduce((sum: number, o: any) => sum + parseFloat(o.total_price), 0);

        return {
            success: true, source: 'shopify',
            data: {
                orders: filtered, total: filtered.length,
                totalRevenue: totalRevenue.toFixed(2), currency: 'USD',
                action: 'get-orders',
            },
        };
    }

    private updateInventory(input: Record<string, any>): IntegrationResult {
        const products = seedProducts();
        const { product_id, variant_id, quantity } = input;

        const product = products.find((p: any) => p.id === product_id);
        if (!product) return { success: false, data: {}, source: 'shopify', error: 'Product not found' };

        const variant = product.variants.find((v: any) => v.id === (variant_id || product.variants[0].id));
        if (!variant) return { success: false, data: {}, source: 'shopify', error: 'Variant not found' };

        const oldQuantity = variant.inventory_quantity;
        variant.inventory_quantity = typeof quantity === 'number' ? quantity : oldQuantity;
        localStorage.setItem(STORAGE_PREFIX + 'products', JSON.stringify(products));

        return {
            success: true, source: 'shopify',
            data: {
                product_id, variant_id: variant.id,
                oldQuantity, newQuantity: variant.inventory_quantity,
                action: 'update-inventory',
            },
        };
    }
}
