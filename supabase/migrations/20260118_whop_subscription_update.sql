-- Add Whop subscription fields to subscriptions table
ALTER TABLE public.subscriptions 
ADD COLUMN IF NOT EXISTS whop_subscription_id TEXT,
ADD COLUMN IF NOT EXISTS whop_customer_id TEXT,
ADD COLUMN IF NOT EXISTS whop_product_id TEXT;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_subscriptions_whop_id ON public.subscriptions(whop_subscription_id);
