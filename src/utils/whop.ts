export const WHOP_CONFIG = {
    apiKey: import.meta.env.VITE_WHOP_API_KEY || '',
    products: {
        pro: {
            monthly: import.meta.env.VITE_WHOP_PRO_MONTHLY_ID || '',
            yearly: import.meta.env.VITE_WHOP_PRO_YEARLY_ID || '',
        },
        premium: {
            monthly: import.meta.env.VITE_WHOP_PREMIUM_MONTHLY_ID || '',
            yearly: import.meta.env.VITE_WHOP_PREMIUM_YEARLY_ID || '',
        }
    },
    urls: {
        success: import.meta.env.VITE_WHOP_SUCCESS_URL || window.location.origin + '/payment?status=success',
        cancel: import.meta.env.VITE_WHOP_CANCEL_URL || window.location.origin + '/payment?status=cancel',
    }
};

export const getWhopProduct = (plan: string, cycle: 'monthly' | 'yearly') => {
    const planKey = plan.toLowerCase() as keyof typeof WHOP_CONFIG.products;
    if (!WHOP_CONFIG.products[planKey]) return null;

    return {
        id: WHOP_CONFIG.products[planKey][cycle],
        plan,
        cycle
    };
};

export const getWhopCheckoutUrl = (productId: string, userId?: string) => {
    // Construct the checkout URL
    // You can pass metadata to Whop to track who purchased
    const metadata = userId ? `?metadata={"user_id":"${userId}"}` : '';

    // Basic Whop checkout URL structure
    // Verify strictly with Whop docs if this is "https://whop.com/checkout/{id}" 
    // or a specific direct link provided in the dashboard.
    // For now we'll assume the standard direct checkout link format but allow it to be easily changed.

    // NOTE: If using a direct link from dashboard, it might be slightly different.
    // We will assume 'productId' passed here IS the full link slug or ID used in the URL.

    return `https://whop.com/checkout/${productId}${metadata}`;
};
