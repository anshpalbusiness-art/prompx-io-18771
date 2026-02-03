// Follow this setup guide to integrate the valid imports: https://supabase.com/docs/guides/functions/quickstart

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const whopWebhookSecret = Deno.env.get('WHOP_WEBHOOK_SECRET')
const supabaseUrl = Deno.env.get('SUPABASE_URL')
const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

const supabase = createClient(supabaseUrl!, supabaseServiceRoleKey!)

serve(async (req) => {
    if (req.method !== 'POST') {
        return new Response('Method not allowed', { status: 405 })
    }

    try {
        const signature = req.headers.get('whop-signature')
        if (!signature) {
            // In production, you MUST verify the signature
            // return new Response('No signature', { status: 401 })
        }

        const payload = await req.json()
        const { action_type, data } = payload

        console.log(`Received Whop event: ${action_type}`)

        // Handle different webhook events
        if (action_type === 'payment.succeeded') {
            // data.metadata.user_id should have been passed in checkout URL
            const userId = data.metadata?.user_id

            if (userId) {
                // Create or update subscription
                await supabase.from('subscriptions').upsert({
                    user_id: userId,
                    status: 'active',
                    whop_subscription_id: data.subscription_id,
                    whop_product_id: data.product_id,
                    payment_method: 'whop',
                    amount: data.total_amount,
                    currency: data.currency,
                    current_period_end: new Date(data.current_period_end * 1000).toISOString(),
                    updated_at: new Date().toISOString()
                })
            }
        } else if (action_type === 'subscription.canceled') {
            const subscriptionId = data.id
            await supabase.from('subscriptions')
                .update({ status: 'canceled', updated_at: new Date().toISOString() })
                .eq('whop_subscription_id', subscriptionId)
        }

        return new Response(JSON.stringify({ received: true }), {
            headers: { "Content-Type": "application/json" },
            status: 200,
        })
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        console.error('Webhook error:', errorMessage)
        return new Response(
            JSON.stringify({ error: errorMessage }),
            { status: 400, headers: { "Content-Type": "application/json" } },
        )
    }
})
