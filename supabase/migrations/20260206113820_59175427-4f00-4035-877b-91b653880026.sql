
-- ============================================================
-- 1. Fix Security Definer Views → Recreate as SECURITY INVOKER
-- ============================================================

-- Recreate public_profiles view with SECURITY INVOKER
DROP VIEW IF EXISTS public_profiles;
CREATE VIEW public_profiles WITH (security_invoker = true) AS
SELECT id, username, avatar_url, avg_prompt_rating, total_prompt_ratings, reputation_score, created_at, updated_at
FROM profiles;

-- Recreate trending_prompts view with SECURITY INVOKER
DROP VIEW IF EXISTS trending_prompts;
CREATE VIEW trending_prompts WITH (security_invoker = true) AS
SELECT ml.id, ml.title, ml.description, ml.seller_id, ml.price, ml.category, ml.downloads, ml.views, ml.created_at,
  COALESCE(avg(pr.rating), 0) AS avg_rating,
  count(DISTINCT pr.id) AS rating_count,
  count(DISTINCT ps.id) AS star_count,
  (COALESCE(avg(pr.rating), 0) * 20 + count(DISTINCT ps.id) * 2 + ml.downloads * 3 + ml.views * 0.1 + 100 * exp(-(EXTRACT(epoch FROM (now() - ml.created_at)) / 2592000))) AS trending_score
FROM marketplace_listings ml
LEFT JOIN prompt_ratings pr ON pr.prompt_id = ml.id
LEFT JOIN prompt_stars ps ON ps.prompt_id = ml.id
WHERE ml.is_active = true
GROUP BY ml.id, ml.title, ml.description, ml.seller_id, ml.price, ml.category, ml.downloads, ml.views, ml.created_at
ORDER BY trending_score DESC;

-- Recreate top_rated_prompts view with SECURITY INVOKER
DROP VIEW IF EXISTS top_rated_prompts;
CREATE VIEW top_rated_prompts WITH (security_invoker = true) AS
SELECT ml.id, ml.title, ml.description, ml.seller_id, ml.price, ml.category, ml.downloads, ml.views,
  COALESCE(avg(pr.rating), 0) AS avg_rating,
  count(DISTINCT pr.id) AS rating_count,
  count(DISTINCT ps.id) AS star_count
FROM marketplace_listings ml
LEFT JOIN prompt_ratings pr ON pr.prompt_id = ml.id
LEFT JOIN prompt_stars ps ON ps.prompt_id = ml.id
WHERE ml.is_active = true
GROUP BY ml.id
HAVING count(DISTINCT pr.id) >= 3
ORDER BY avg_rating DESC, rating_count DESC;

-- ============================================================
-- 2. Fix overly permissive INSERT/ALL policies
--    Replace WITH CHECK (true) with proper auth checks
-- ============================================================

-- api_key_audit_logs: restrict to authenticated users inserting their own logs
DROP POLICY IF EXISTS "System can create audit logs" ON api_key_audit_logs;
CREATE POLICY "Authenticated users can create their own audit logs"
  ON api_key_audit_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- compliance_monitoring: restrict to authenticated users
DROP POLICY IF EXISTS "System can create compliance monitoring records" ON compliance_monitoring;
CREATE POLICY "Users can create their own compliance records"
  ON compliance_monitoring FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- compliance_violations: keep open for system but require auth
DROP POLICY IF EXISTS "System can create violations" ON compliance_violations;
CREATE POLICY "Authenticated users can create violations"
  ON compliance_violations FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- personalized_recommendations: restrict to authenticated
DROP POLICY IF EXISTS "System can create recommendations" ON personalized_recommendations;
CREATE POLICY "Authenticated users can receive recommendations"
  ON personalized_recommendations FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- predictive_alerts: restrict to authenticated
DROP POLICY IF EXISTS "System can create alerts" ON predictive_alerts;
CREATE POLICY "Authenticated users can receive alerts"
  ON predictive_alerts FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- prompt_metrics: restrict to user's own metrics
DROP POLICY IF EXISTS "System can insert metrics" ON prompt_metrics;
CREATE POLICY "Users can insert their own metrics"
  ON prompt_metrics FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- global_insights: remove ALL true policy, keep SELECT true
DROP POLICY IF EXISTS "Service role can manage global insights" ON global_insights;

-- global_prompt_patterns: remove ALL true policy, keep SELECT true
DROP POLICY IF EXISTS "Service role can manage global patterns" ON global_prompt_patterns;

-- global_topic_trends: remove ALL true policy, keep SELECT true
DROP POLICY IF EXISTS "Service role can manage global trends" ON global_topic_trends;
