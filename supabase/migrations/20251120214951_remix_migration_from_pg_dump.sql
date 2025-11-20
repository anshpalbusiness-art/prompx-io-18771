--
-- PostgreSQL database dump
--


-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.7

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--



--
-- Name: app_role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.app_role AS ENUM (
    'admin',
    'user'
);


--
-- Name: auto_assign_admin_role(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.auto_assign_admin_role() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  -- Check if user's email is in admin_emails table
  IF EXISTS (SELECT 1 FROM public.admin_emails WHERE email = NEW.email) THEN
    -- Insert admin role if not already exists
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: check_usage_limit(uuid, text, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.check_usage_limit(_user_id uuid, _resource_type text, _period_days integer DEFAULT 30) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_subscription RECORD;
  v_usage_count INTEGER;
  v_limit INTEGER;
  v_period_start TIMESTAMP WITH TIME ZONE;
  v_is_admin BOOLEAN;
BEGIN
  -- Check if user is admin
  v_is_admin := public.has_role(_user_id, 'admin');
  
  -- Admins have unlimited access
  IF v_is_admin THEN
    RETURN jsonb_build_object(
      'limit', -1,
      'used', 0,
      'remaining', -1,
      'has_access', true,
      'is_admin', true
    );
  END IF;
  
  -- Get user's subscription and plan
  SELECT us.*, sp.limits
  INTO v_subscription
  FROM user_subscriptions us
  JOIN subscription_plans sp ON us.plan_id = sp.id
  WHERE us.user_id = _user_id AND us.status = 'active'
  LIMIT 1;
  
  -- If no subscription, assume free plan
  IF v_subscription IS NULL THEN
    SELECT limits INTO v_subscription
    FROM subscription_plans
    WHERE plan_type = 'free'
    LIMIT 1;
  END IF;
  
  -- Get the limit for this resource type
  v_limit := (v_subscription.limits->>'prompts_per_month')::INTEGER;
  
  -- Calculate period start
  v_period_start := now() - (_period_days || ' days')::INTERVAL;
  
  -- Get current usage
  SELECT COALESCE(SUM(count), 0)
  INTO v_usage_count
  FROM usage_tracking
  WHERE user_id = _user_id
    AND resource_type = _resource_type
    AND period_start >= v_period_start;
  
  -- Return usage info
  RETURN jsonb_build_object(
    'limit', v_limit,
    'used', v_usage_count,
    'remaining', CASE WHEN v_limit = -1 THEN -1 ELSE GREATEST(0, v_limit - v_usage_count) END,
    'has_access', v_limit = -1 OR v_usage_count < v_limit,
    'is_admin', false
  );
END;
$$;


--
-- Name: clear_plaintext_api_key(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.clear_plaintext_api_key() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  -- Only clear the api_key if a hash exists
  -- This allows the key to be temporarily set during creation
  IF NEW.api_key IS NOT NULL AND NEW.api_key_hash IS NOT NULL THEN
    NEW.api_key := NULL;
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: create_audit_log(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.create_audit_log() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  INSERT INTO prompt_audit_logs (
    user_id,
    action,
    resource_type,
    resource_id,
    details
  ) VALUES (
    auth.uid(),
    TG_OP,
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    jsonb_build_object(
      'old', to_jsonb(OLD),
      'new', to_jsonb(NEW)
    )
  );
  RETURN COALESCE(NEW, OLD);
END;
$$;


--
-- Name: generate_api_key_hash(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.generate_api_key_hash(_api_key text) RETURNS text
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  RETURN crypt(_api_key, gen_salt('bf', 10));
END;
$$;


--
-- Name: handle_new_user(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  INSERT INTO public.profiles (id, email, username)
  VALUES (new.id, new.email, new.raw_user_meta_data->>'username');
  RETURN new;
END;
$$;


--
-- Name: has_role(uuid, public.app_role); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.has_role(_user_id uuid, _role public.app_role) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;


--
-- Name: increment_listing_views(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.increment_listing_views(listing_id uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  UPDATE marketplace_listings
  SET views = views + 1
  WHERE id = listing_id;
END;
$$;


--
-- Name: is_team_owner(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_team_owner(_user_id uuid, _team_id uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.teams
    WHERE id = _team_id
      AND owner_id = _user_id
  )
$$;


--
-- Name: prevent_plaintext_api_key(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.prevent_plaintext_api_key() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  -- Only allow api_key to be set during initial insert, then clear it
  IF TG_OP = 'UPDATE' AND NEW.api_key IS NOT NULL THEN
    RAISE EXCEPTION 'Cannot update plaintext API key. Use key rotation instead.';
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: sync_existing_admins(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.sync_existing_admins() RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, role)
  SELECT p.id, 'admin'::app_role
  FROM public.profiles p
  INNER JOIN public.admin_emails ae ON p.email = ae.email
  WHERE NOT EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = p.id AND ur.role = 'admin'
  );
END;
$$;


--
-- Name: track_usage(uuid, text, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.track_usage(_user_id uuid, _resource_type text, _count integer DEFAULT 1) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_period_start TIMESTAMP WITH TIME ZONE;
  v_period_end TIMESTAMP WITH TIME ZONE;
  v_existing_record RECORD;
BEGIN
  -- Calculate current period (monthly)
  v_period_start := date_trunc('month', now());
  v_period_end := v_period_start + INTERVAL '1 month';
  
  -- Check if there's already a record for this period
  SELECT * INTO v_existing_record
  FROM usage_tracking
  WHERE user_id = _user_id
    AND resource_type = _resource_type
    AND period_start = v_period_start;
  
  IF v_existing_record IS NULL THEN
    -- Insert new record
    INSERT INTO usage_tracking (user_id, resource_type, count, period_start, period_end)
    VALUES (_user_id, _resource_type, _count, v_period_start, v_period_end);
  ELSE
    -- Update existing record
    UPDATE usage_tracking
    SET count = count + _count
    WHERE user_id = _user_id
      AND resource_type = _resource_type
      AND period_start = v_period_start;
  END IF;
  
  RETURN jsonb_build_object(
    'success', true,
    'tracked', _count
  );
END;
$$;


--
-- Name: update_ai_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_ai_updated_at() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


--
-- Name: update_leaderboard(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_leaderboard() RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  -- Update weekly scores
  WITH weekly_scores AS (
    SELECT 
      user_id,
      SUM(engagement_score + (conversions * 10) + (shares * 5)) as score
    FROM prompt_performance
    WHERE period_start >= NOW() - INTERVAL '7 days'
    GROUP BY user_id
  )
  INSERT INTO leaderboard (user_id, weekly_score, category)
  SELECT user_id, score, 'weekly'
  FROM weekly_scores
  ON CONFLICT (user_id, category) 
  DO UPDATE SET 
    weekly_score = EXCLUDED.weekly_score,
    updated_at = NOW();

  -- Update ranks
  WITH ranked_users AS (
    SELECT 
      user_id,
      category,
      ROW_NUMBER() OVER (PARTITION BY category ORDER BY weekly_score DESC) as new_rank
    FROM leaderboard
    WHERE category = 'weekly'
  )
  UPDATE leaderboard l
  SET rank = ru.new_rank
  FROM ranked_users ru
  WHERE l.user_id = ru.user_id AND l.category = ru.category;
END;
$$;


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


--
-- Name: update_user_reputation(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_user_reputation() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  seller_user_id UUID;
  new_avg NUMERIC;
  total_ratings INTEGER;
BEGIN
  -- Get seller_id from marketplace listing
  SELECT seller_id INTO seller_user_id
  FROM marketplace_listings
  WHERE id = NEW.prompt_id;
  
  IF seller_user_id IS NOT NULL THEN
    -- Calculate new average and total
    SELECT 
      COALESCE(AVG(rating), 0),
      COUNT(*)
    INTO new_avg, total_ratings
    FROM prompt_ratings pr
    JOIN marketplace_listings ml ON pr.prompt_id = ml.id
    WHERE ml.seller_id = seller_user_id;
    
    -- Update profile
    UPDATE profiles
    SET 
      avg_prompt_rating = new_avg,
      total_prompt_ratings = total_ratings,
      reputation_score = (new_avg * 100) + (total_ratings * 10)
    WHERE id = seller_user_id;
  END IF;
  
  RETURN NEW;
END;
$$;


--
-- Name: validate_api_key_hash(text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.validate_api_key_hash(_api_key text, _api_key_hash text) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  RETURN crypt(_api_key, _api_key_hash) = _api_key_hash;
END;
$$;


SET default_table_access_method = heap;

--
-- Name: ab_test_experiments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ab_test_experiments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    test_name text NOT NULL,
    description text,
    control_variant text NOT NULL,
    treatment_variant text NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    sample_size integer DEFAULT 0,
    control_conversions integer DEFAULT 0,
    treatment_conversions integer DEFAULT 0,
    statistical_significance numeric,
    confidence_level numeric DEFAULT 0.95,
    winner text,
    started_at timestamp with time zone,
    ended_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    auto_declare_winner boolean DEFAULT false,
    metadata jsonb DEFAULT '{}'::jsonb,
    CONSTRAINT ab_test_experiments_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'active'::text, 'paused'::text, 'completed'::text, 'archived'::text])))
);


--
-- Name: ab_test_results; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ab_test_results (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    test_id uuid NOT NULL,
    variant text NOT NULL,
    metric_name text NOT NULL,
    metric_value numeric(10,2) NOT NULL,
    sample_size integer DEFAULT 1 NOT NULL,
    recorded_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: ab_tests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ab_tests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    test_name text NOT NULL,
    description text,
    variant_a_prompt text NOT NULL,
    variant_b_prompt text NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    completed_at timestamp with time zone
);


--
-- Name: adaptive_models; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.adaptive_models (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    model_type text NOT NULL,
    model_version integer DEFAULT 1 NOT NULL,
    model_data jsonb NOT NULL,
    accuracy_score numeric,
    training_samples integer DEFAULT 0,
    last_trained_at timestamp with time zone DEFAULT now(),
    is_active boolean DEFAULT true,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: admin_emails; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.admin_emails (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    email text NOT NULL,
    added_by uuid,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: agent_analytics; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.agent_analytics (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    agent_id uuid NOT NULL,
    user_id uuid NOT NULL,
    conversation_id uuid,
    response_time_ms integer,
    tokens_used integer,
    model_used text,
    success boolean DEFAULT true,
    error_message text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: agent_conversations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.agent_conversations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    agent_id uuid NOT NULL,
    title text,
    messages jsonb DEFAULT '[]'::jsonb NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: ai_insights; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ai_insights (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    insight_type text NOT NULL,
    analysis_data jsonb DEFAULT '{}'::jsonb NOT NULL,
    context jsonb DEFAULT '{}'::jsonb,
    confidence_score numeric DEFAULT 0.8,
    created_at timestamp with time zone DEFAULT now(),
    expires_at timestamp with time zone,
    is_actionable boolean DEFAULT true,
    action_taken boolean DEFAULT false,
    CONSTRAINT ai_insights_insight_type_check CHECK ((insight_type = ANY (ARRAY['performance'::text, 'prediction'::text, 'optimization'::text, 'insights'::text, 'trends'::text, 'recommendations'::text, 'anomalies'::text])))
);


--
-- Name: ai_learning_patterns; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ai_learning_patterns (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    pattern_type text NOT NULL,
    pattern_data jsonb DEFAULT '{}'::jsonb NOT NULL,
    success_rate numeric DEFAULT 0.0,
    usage_count integer DEFAULT 0,
    last_used_at timestamp with time zone,
    confidence numeric DEFAULT 0.5,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: analytics_metrics; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.analytics_metrics (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    metric_type text NOT NULL,
    metric_value numeric(10,2) NOT NULL,
    prompt_id uuid,
    workflow_id uuid,
    recorded_at timestamp with time zone DEFAULT now() NOT NULL,
    metadata jsonb
);


--
-- Name: api_key_audit_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.api_key_audit_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    api_key_id uuid NOT NULL,
    user_id uuid NOT NULL,
    action text NOT NULL,
    ip_address text,
    user_agent text,
    success boolean DEFAULT true,
    error_message text,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: api_keys; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.api_keys (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    key_name text NOT NULL,
    api_key text NOT NULL,
    is_active boolean DEFAULT true,
    last_used_at timestamp with time zone,
    requests_count integer DEFAULT 0,
    rate_limit_per_hour integer DEFAULT 100,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    expires_at timestamp with time zone,
    api_key_hash text,
    key_prefix text,
    last_rotated_at timestamp with time zone,
    CONSTRAINT api_keys_hash_required CHECK (((is_active = false) OR ((is_active = true) AND (api_key_hash IS NOT NULL))))
);


--
-- Name: auto_optimization_jobs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.auto_optimization_jobs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    prompt_id uuid,
    status text DEFAULT 'pending'::text NOT NULL,
    trigger_reason text NOT NULL,
    original_prompt text NOT NULL,
    optimized_prompt text,
    improvement_score numeric,
    optimization_insights jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    completed_at timestamp with time zone,
    error_message text,
    CONSTRAINT auto_optimization_jobs_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'running'::text, 'completed'::text, 'failed'::text])))
);


--
-- Name: badges; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.badges (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    description text NOT NULL,
    icon text NOT NULL,
    category text NOT NULL,
    tier text DEFAULT 'bronze'::text NOT NULL,
    requirements jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: benchmark_results; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.benchmark_results (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    prompt_text text NOT NULL,
    model_name text NOT NULL,
    response_text text NOT NULL,
    response_time_ms integer NOT NULL,
    clarity_score integer,
    originality_score integer,
    depth_score integer,
    overall_score integer,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT benchmark_results_clarity_score_check CHECK (((clarity_score >= 0) AND (clarity_score <= 100))),
    CONSTRAINT benchmark_results_depth_score_check CHECK (((depth_score >= 0) AND (depth_score <= 100))),
    CONSTRAINT benchmark_results_originality_score_check CHECK (((originality_score >= 0) AND (originality_score <= 100))),
    CONSTRAINT benchmark_results_overall_score_check CHECK (((overall_score >= 0) AND (overall_score <= 100)))
);


--
-- Name: bias_filters; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bias_filters (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    filter_name text NOT NULL,
    bias_type text NOT NULL,
    keywords text[] NOT NULL,
    severity text DEFAULT 'medium'::text NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: compliance_monitoring; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.compliance_monitoring (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    prompt_id uuid,
    agent_id uuid,
    compliance_type text NOT NULL,
    severity text NOT NULL,
    status text DEFAULT 'detected'::text NOT NULL,
    issue_description text NOT NULL,
    detection_method text,
    auto_remediation_applied boolean DEFAULT false,
    remediation_suggestion text,
    detected_at timestamp with time zone DEFAULT now(),
    resolved_at timestamp with time zone,
    resolved_by uuid,
    metadata jsonb DEFAULT '{}'::jsonb,
    CONSTRAINT compliance_monitoring_severity_check CHECK ((severity = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text, 'critical'::text]))),
    CONSTRAINT compliance_monitoring_status_check CHECK ((status = ANY (ARRAY['detected'::text, 'reviewed'::text, 'resolved'::text, 'false_positive'::text])))
);


--
-- Name: compliance_rules; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.compliance_rules (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    rule_name text NOT NULL,
    description text,
    rule_type text NOT NULL,
    industry text,
    severity text DEFAULT 'medium'::text NOT NULL,
    detection_pattern text NOT NULL,
    remediation_guidance text,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: compliance_violations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.compliance_violations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    prompt_id uuid NOT NULL,
    violation_type text NOT NULL,
    severity text NOT NULL,
    description text NOT NULL,
    detected_at timestamp with time zone DEFAULT now(),
    resolved_at timestamp with time zone,
    resolved_by uuid,
    resolution_notes text,
    auto_detected boolean DEFAULT true
);


--
-- Name: context_suggestions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.context_suggestions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    context_type text NOT NULL,
    context_value text NOT NULL,
    suggestions jsonb NOT NULL,
    relevance_score numeric NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    expires_at timestamp with time zone DEFAULT (now() + '7 days'::interval)
);


--
-- Name: global_insights; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.global_insights (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    insight_type text NOT NULL,
    title text NOT NULL,
    description text NOT NULL,
    confidence_score numeric DEFAULT 0.5,
    impact_score numeric DEFAULT 0.5,
    supporting_data jsonb,
    category text,
    platform text,
    created_at timestamp with time zone DEFAULT now(),
    expires_at timestamp with time zone
);


--
-- Name: global_prompt_patterns; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.global_prompt_patterns (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    pattern_type text NOT NULL,
    pattern_name text NOT NULL,
    pattern_description text,
    success_rate numeric DEFAULT 0,
    usage_count integer DEFAULT 0,
    avg_improvement numeric DEFAULT 0,
    category text,
    platform text,
    example_pattern jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: global_topic_trends; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.global_topic_trends (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    topic_name text NOT NULL,
    trend_direction text NOT NULL,
    popularity_score numeric DEFAULT 0,
    growth_rate numeric DEFAULT 0,
    related_topics text[],
    category text,
    platform text,
    period_start timestamp with time zone NOT NULL,
    period_end timestamp with time zone NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: industry_templates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.industry_templates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    industry text NOT NULL,
    template_name text NOT NULL,
    template_prompt text NOT NULL,
    description text,
    platform text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: leaderboard; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.leaderboard (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    total_score integer DEFAULT 0,
    weekly_score integer DEFAULT 0,
    monthly_score integer DEFAULT 0,
    rank integer,
    category text DEFAULT 'overall'::text NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: learned_patterns; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.learned_patterns (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    pattern_type text NOT NULL,
    pattern_name text NOT NULL,
    pattern_data jsonb NOT NULL,
    success_rate numeric DEFAULT 0 NOT NULL,
    usage_count integer DEFAULT 0,
    last_successful_at timestamp with time zone,
    confidence_score numeric DEFAULT 0.5 NOT NULL,
    context_tags jsonb DEFAULT '[]'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: legal_prompt_packs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.legal_prompt_packs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    pack_name text NOT NULL,
    industry text NOT NULL,
    compliance_standards text[],
    prompt_title text NOT NULL,
    prompt_content text NOT NULL,
    use_case text NOT NULL,
    compliance_notes text,
    is_verified boolean DEFAULT false,
    verified_by text,
    verified_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: marketplace_listings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.marketplace_listings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    seller_id uuid NOT NULL,
    title text NOT NULL,
    description text NOT NULL,
    prompt_content text NOT NULL,
    category text NOT NULL,
    tags text[],
    price numeric(10,2) NOT NULL,
    is_workflow boolean DEFAULT false,
    workflow_steps jsonb,
    preview_available boolean DEFAULT true,
    preview_content text,
    downloads integer DEFAULT 0,
    views integer DEFAULT 0,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT marketplace_listings_price_check CHECK ((price >= (0)::numeric))
);


--
-- Name: optimization_insights; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.optimization_insights (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    category text NOT NULL,
    industry text,
    platform text,
    insight_type text NOT NULL,
    pattern_description text NOT NULL,
    pattern_data jsonb DEFAULT '{}'::jsonb NOT NULL,
    success_rate numeric,
    sample_size integer DEFAULT 0,
    avg_improvement numeric,
    confidence_level text,
    statistical_significance numeric,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT optimization_insights_confidence_level_check CHECK ((confidence_level = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text]))),
    CONSTRAINT optimization_insights_insight_type_check CHECK ((insight_type = ANY (ARRAY['winning_pattern'::text, 'best_practice'::text, 'avoid_pattern'::text, 'trend'::text])))
);


--
-- Name: optimization_recommendations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.optimization_recommendations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    recommendation_type text NOT NULL,
    title text NOT NULL,
    description text NOT NULL,
    expected_impact numeric DEFAULT 0.0,
    effort_level text,
    priority integer DEFAULT 0,
    status text DEFAULT 'pending'::text,
    implementation_notes text,
    actual_impact numeric,
    created_at timestamp with time zone DEFAULT now(),
    implemented_at timestamp with time zone,
    expires_at timestamp with time zone,
    CONSTRAINT optimization_recommendations_effort_level_check CHECK ((effort_level = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text]))),
    CONSTRAINT optimization_recommendations_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'accepted'::text, 'rejected'::text, 'implemented'::text])))
);


--
-- Name: persona_templates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.persona_templates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    title text NOT NULL,
    description text NOT NULL,
    avatar_icon text NOT NULL,
    personality_traits jsonb DEFAULT '[]'::jsonb NOT NULL,
    communication_style text NOT NULL,
    expertise_areas text[] DEFAULT '{}'::text[] NOT NULL,
    prompt_prefix text NOT NULL,
    example_phrases text[] DEFAULT '{}'::text[] NOT NULL,
    color_theme text DEFAULT 'blue'::text NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: personalized_recommendations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.personalized_recommendations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    recommendation_type text NOT NULL,
    title text NOT NULL,
    description text NOT NULL,
    content jsonb NOT NULL,
    relevance_score numeric NOT NULL,
    reason text,
    based_on jsonb DEFAULT '[]'::jsonb,
    is_viewed boolean DEFAULT false,
    is_applied boolean DEFAULT false,
    is_dismissed boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    expires_at timestamp with time zone,
    metadata jsonb DEFAULT '{}'::jsonb,
    CONSTRAINT personalized_recommendations_relevance_score_check CHECK (((relevance_score >= (0)::numeric) AND (relevance_score <= (1)::numeric)))
);


--
-- Name: predictive_alerts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.predictive_alerts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    alert_type text NOT NULL,
    severity text NOT NULL,
    title text NOT NULL,
    description text NOT NULL,
    predicted_impact numeric,
    confidence_score numeric,
    recommended_actions jsonb DEFAULT '[]'::jsonb,
    is_read boolean DEFAULT false,
    is_dismissed boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    expires_at timestamp with time zone,
    metadata jsonb DEFAULT '{}'::jsonb,
    CONSTRAINT predictive_alerts_severity_check CHECK ((severity = ANY (ARRAY['info'::text, 'warning'::text, 'critical'::text])))
);


--
-- Name: predictive_models; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.predictive_models (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    model_type text NOT NULL,
    model_data jsonb DEFAULT '{}'::jsonb NOT NULL,
    accuracy numeric DEFAULT 0.0,
    training_data_count integer DEFAULT 0,
    last_trained_at timestamp with time zone,
    predictions_made integer DEFAULT 0,
    successful_predictions integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.profiles (
    id uuid NOT NULL,
    email text,
    username text,
    avatar_url text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    reputation_score integer DEFAULT 0,
    total_prompt_ratings integer DEFAULT 0,
    avg_prompt_rating numeric DEFAULT 0
);


--
-- Name: prompt_agents; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.prompt_agents (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    name text NOT NULL,
    description text,
    system_prompt text NOT NULL,
    category text NOT NULL,
    model text DEFAULT 'google/gemini-2.5-flash'::text,
    temperature numeric DEFAULT 0.7,
    max_tokens integer DEFAULT 2000,
    is_public boolean DEFAULT false,
    tags text[] DEFAULT '{}'::text[],
    usage_count integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: prompt_audit_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.prompt_audit_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    action text NOT NULL,
    resource_type text NOT NULL,
    resource_id uuid NOT NULL,
    team_id uuid,
    details jsonb DEFAULT '{}'::jsonb,
    ip_address text,
    user_agent text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: prompt_compliance_checks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.prompt_compliance_checks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    prompt_text text NOT NULL,
    check_results jsonb NOT NULL,
    compliance_score integer,
    checked_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: prompt_deployments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.prompt_deployments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    prompt_version_id uuid NOT NULL,
    team_id uuid,
    environment text DEFAULT 'production'::text NOT NULL,
    deployed_by uuid NOT NULL,
    deployed_at timestamp with time zone DEFAULT now(),
    status text DEFAULT 'active'::text NOT NULL,
    deployment_notes text,
    rollback_reason text
);


--
-- Name: prompt_feedback; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.prompt_feedback (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    prompt_id uuid,
    agent_id uuid,
    original_prompt text NOT NULL,
    optimized_prompt text,
    variation_id text,
    feedback_type text NOT NULL,
    ctr numeric,
    engagement_score numeric,
    conversion_rate numeric,
    bounce_rate numeric,
    time_on_page integer,
    shares_count integer DEFAULT 0,
    likes_count integer DEFAULT 0,
    comments_count integer DEFAULT 0,
    rating integer,
    user_comment text,
    context jsonb DEFAULT '{}'::jsonb,
    improvements jsonb DEFAULT '{}'::jsonb,
    learned_patterns jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT prompt_feedback_feedback_type_check CHECK ((feedback_type = ANY (ARRAY['manual'::text, 'automatic'::text, 'metric'::text]))),
    CONSTRAINT prompt_feedback_rating_check CHECK (((rating >= 1) AND (rating <= 5)))
);


--
-- Name: prompt_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.prompt_history (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    original_prompt text NOT NULL,
    optimized_prompt text NOT NULL,
    platform text NOT NULL,
    rating integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT prompt_history_rating_check CHECK (((rating >= 1) AND (rating <= 5)))
);


--
-- Name: prompt_metrics; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.prompt_metrics (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    prompt_id uuid NOT NULL,
    execution_time_ms integer,
    tokens_used integer,
    cost numeric(10,4),
    success boolean DEFAULT true,
    error_message text,
    user_id uuid,
    team_id uuid,
    executed_at timestamp with time zone DEFAULT now(),
    metadata jsonb DEFAULT '{}'::jsonb
);


--
-- Name: prompt_network_insights; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.prompt_network_insights (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    insight_type text NOT NULL,
    title text NOT NULL,
    description text,
    affected_prompts uuid[],
    affected_topics uuid[],
    confidence_score numeric DEFAULT 0.5,
    actionable_suggestion text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: prompt_nodes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.prompt_nodes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    prompt_text text NOT NULL,
    prompt_type text NOT NULL,
    category text,
    platform text,
    keywords text[],
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: prompt_performance; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.prompt_performance (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    prompt_id uuid NOT NULL,
    user_id uuid NOT NULL,
    conversions integer DEFAULT 0,
    engagement_score integer DEFAULT 0,
    views integer DEFAULT 0,
    shares integer DEFAULT 0,
    period_start timestamp with time zone NOT NULL,
    period_end timestamp with time zone NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: prompt_purchases; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.prompt_purchases (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    listing_id uuid NOT NULL,
    buyer_id uuid NOT NULL,
    price numeric(10,2) NOT NULL,
    purchased_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: prompt_ratings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.prompt_ratings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    prompt_id uuid NOT NULL,
    user_id uuid NOT NULL,
    rating integer NOT NULL,
    review text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    helpful_count integer DEFAULT 0,
    not_helpful_count integer DEFAULT 0,
    CONSTRAINT prompt_ratings_rating_check CHECK (((rating >= 1) AND (rating <= 5)))
);


--
-- Name: prompt_relationships; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.prompt_relationships (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    source_prompt_id uuid NOT NULL,
    target_prompt_id uuid NOT NULL,
    relationship_type text NOT NULL,
    strength numeric DEFAULT 1.0,
    ai_confidence numeric DEFAULT 1.0,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: prompt_stars; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.prompt_stars (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    prompt_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: prompt_topic_links; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.prompt_topic_links (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    prompt_id uuid NOT NULL,
    topic_id uuid NOT NULL,
    relevance_score numeric DEFAULT 1.0,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: prompt_topics; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.prompt_topics (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    topic_name text NOT NULL,
    description text,
    parent_topic_id uuid,
    prompt_count integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: prompt_variations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.prompt_variations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    base_prompt text NOT NULL,
    variation_name text NOT NULL,
    variation_prompt text NOT NULL,
    variation_type text NOT NULL,
    impressions integer DEFAULT 0,
    clicks integer DEFAULT 0,
    conversions integer DEFAULT 0,
    total_engagement numeric DEFAULT 0,
    confidence_score numeric DEFAULT 0,
    is_winner boolean DEFAULT false,
    test_status text DEFAULT 'active'::text,
    started_at timestamp with time zone DEFAULT now(),
    ended_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT prompt_variations_test_status_check CHECK ((test_status = ANY (ARRAY['active'::text, 'completed'::text, 'paused'::text])))
);


--
-- Name: prompt_versions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.prompt_versions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    prompt_id uuid NOT NULL,
    version_number integer NOT NULL,
    prompt_text text NOT NULL,
    changelog text,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    is_production boolean DEFAULT false,
    metadata jsonb DEFAULT '{}'::jsonb
);


--
-- Name: public_profiles; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.public_profiles AS
 SELECT id,
    username,
    avatar_url,
    avg_prompt_rating,
    total_prompt_ratings,
    reputation_score,
    created_at,
    updated_at
   FROM public.profiles;


--
-- Name: rating_votes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.rating_votes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    rating_id uuid NOT NULL,
    is_helpful boolean NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: saved_workflows; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.saved_workflows (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    name text NOT NULL,
    description text,
    steps jsonb NOT NULL,
    tags text[],
    is_public boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: subscription_plans; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.subscription_plans (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    plan_name text NOT NULL,
    plan_type text NOT NULL,
    price_monthly numeric DEFAULT 0 NOT NULL,
    price_yearly numeric DEFAULT 0 NOT NULL,
    features jsonb DEFAULT '{}'::jsonb NOT NULL,
    limits jsonb DEFAULT '{}'::jsonb NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT subscription_plans_plan_type_check CHECK ((plan_type = ANY (ARRAY['free'::text, 'pro'::text, 'team'::text, 'enterprise'::text])))
);


--
-- Name: team_members; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.team_members (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    team_id uuid NOT NULL,
    user_id uuid NOT NULL,
    role text DEFAULT 'member'::text NOT NULL,
    joined_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: team_prompts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.team_prompts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    team_id uuid NOT NULL,
    created_by uuid NOT NULL,
    title text NOT NULL,
    original_prompt text NOT NULL,
    optimized_prompt text,
    platform text,
    category text,
    is_workflow boolean DEFAULT false,
    workflow_steps jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE ONLY public.team_prompts REPLICA IDENTITY FULL;


--
-- Name: teams; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.teams (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    description text,
    owner_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: top_rated_prompts; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.top_rated_prompts AS
SELECT
    NULL::uuid AS id,
    NULL::text AS title,
    NULL::text AS description,
    NULL::uuid AS seller_id,
    NULL::numeric(10,2) AS price,
    NULL::text AS category,
    NULL::integer AS downloads,
    NULL::integer AS views,
    NULL::numeric AS avg_rating,
    NULL::bigint AS rating_count,
    NULL::bigint AS star_count;


--
-- Name: trending_prompts; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.trending_prompts WITH (security_invoker='true') AS
 SELECT ml.id,
    ml.title,
    ml.description,
    ml.seller_id,
    ml.price,
    ml.category,
    ml.downloads,
    ml.views,
    ml.created_at,
    COALESCE(avg(pr.rating), (0)::numeric) AS avg_rating,
    count(DISTINCT pr.id) AS rating_count,
    count(DISTINCT ps.id) AS star_count,
    (((((COALESCE(avg(pr.rating), (0)::numeric) * (20)::numeric) + ((count(DISTINCT ps.id) * 2))::numeric) + ((ml.downloads * 3))::numeric) + ((ml.views)::numeric * 0.1)) + ((100)::numeric * exp((- (EXTRACT(epoch FROM (now() - ml.created_at)) / (2592000)::numeric))))) AS trending_score
   FROM ((public.marketplace_listings ml
     LEFT JOIN public.prompt_ratings pr ON ((pr.prompt_id = ml.id)))
     LEFT JOIN public.prompt_stars ps ON ((ps.prompt_id = ml.id)))
  WHERE (ml.is_active = true)
  GROUP BY ml.id, ml.title, ml.description, ml.seller_id, ml.price, ml.category, ml.downloads, ml.views, ml.created_at
  ORDER BY (((((COALESCE(avg(pr.rating), (0)::numeric) * (20)::numeric) + ((count(DISTINCT ps.id) * 2))::numeric) + ((ml.downloads * 3))::numeric) + ((ml.views)::numeric * 0.1)) + ((100)::numeric * exp((- (EXTRACT(epoch FROM (now() - ml.created_at)) / (2592000)::numeric))))) DESC;


--
-- Name: usage_tracking; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.usage_tracking (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    resource_type text NOT NULL,
    count integer DEFAULT 1,
    metadata jsonb,
    period_start timestamp with time zone NOT NULL,
    period_end timestamp with time zone NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT usage_tracking_resource_type_check CHECK ((resource_type = ANY (ARRAY['prompt_optimization'::text, 'workflow_execution'::text, 'api_call'::text, 'compliance_check'::text])))
);


--
-- Name: user_achievements; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_achievements (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    badge_id uuid NOT NULL,
    earned_at timestamp with time zone DEFAULT now() NOT NULL,
    progress jsonb DEFAULT '{}'::jsonb
);


--
-- Name: user_activity; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_activity (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    activity_type text NOT NULL,
    duration_seconds integer,
    metadata jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: user_behavior; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_behavior (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    behavior_type text NOT NULL,
    context jsonb DEFAULT '{}'::jsonb NOT NULL,
    success_score numeric,
    metadata jsonb DEFAULT '{}'::jsonb,
    recorded_at timestamp with time zone DEFAULT now()
);


--
-- Name: user_personas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_personas (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    template_id uuid,
    name text NOT NULL,
    custom_instructions text,
    is_active boolean DEFAULT true,
    usage_count integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: user_preferences; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_preferences (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    niche text,
    style text,
    preferred_tone text,
    preferred_length text DEFAULT 'moderate'::text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: user_roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    role public.app_role NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: user_subscriptions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_subscriptions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    plan_id uuid NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    billing_cycle text DEFAULT 'monthly'::text NOT NULL,
    current_period_start timestamp with time zone DEFAULT now() NOT NULL,
    current_period_end timestamp with time zone NOT NULL,
    cancel_at_period_end boolean DEFAULT false,
    stripe_subscription_id text,
    stripe_customer_id text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT user_subscriptions_billing_cycle_check CHECK ((billing_cycle = ANY (ARRAY['monthly'::text, 'yearly'::text]))),
    CONSTRAINT user_subscriptions_status_check CHECK ((status = ANY (ARRAY['active'::text, 'cancelled'::text, 'expired'::text, 'trialing'::text])))
);


--
-- Name: ab_test_experiments ab_test_experiments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ab_test_experiments
    ADD CONSTRAINT ab_test_experiments_pkey PRIMARY KEY (id);


--
-- Name: ab_test_results ab_test_results_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ab_test_results
    ADD CONSTRAINT ab_test_results_pkey PRIMARY KEY (id);


--
-- Name: ab_tests ab_tests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ab_tests
    ADD CONSTRAINT ab_tests_pkey PRIMARY KEY (id);


--
-- Name: adaptive_models adaptive_models_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.adaptive_models
    ADD CONSTRAINT adaptive_models_pkey PRIMARY KEY (id);


--
-- Name: admin_emails admin_emails_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_emails
    ADD CONSTRAINT admin_emails_email_key UNIQUE (email);


--
-- Name: admin_emails admin_emails_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_emails
    ADD CONSTRAINT admin_emails_pkey PRIMARY KEY (id);


--
-- Name: agent_analytics agent_analytics_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_analytics
    ADD CONSTRAINT agent_analytics_pkey PRIMARY KEY (id);


--
-- Name: agent_conversations agent_conversations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_conversations
    ADD CONSTRAINT agent_conversations_pkey PRIMARY KEY (id);


--
-- Name: ai_insights ai_insights_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_insights
    ADD CONSTRAINT ai_insights_pkey PRIMARY KEY (id);


--
-- Name: ai_learning_patterns ai_learning_patterns_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_learning_patterns
    ADD CONSTRAINT ai_learning_patterns_pkey PRIMARY KEY (id);


--
-- Name: analytics_metrics analytics_metrics_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.analytics_metrics
    ADD CONSTRAINT analytics_metrics_pkey PRIMARY KEY (id);


--
-- Name: api_key_audit_logs api_key_audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.api_key_audit_logs
    ADD CONSTRAINT api_key_audit_logs_pkey PRIMARY KEY (id);


--
-- Name: api_keys api_keys_api_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.api_keys
    ADD CONSTRAINT api_keys_api_key_key UNIQUE (api_key);


--
-- Name: api_keys api_keys_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.api_keys
    ADD CONSTRAINT api_keys_pkey PRIMARY KEY (id);


--
-- Name: auto_optimization_jobs auto_optimization_jobs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auto_optimization_jobs
    ADD CONSTRAINT auto_optimization_jobs_pkey PRIMARY KEY (id);


--
-- Name: badges badges_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.badges
    ADD CONSTRAINT badges_pkey PRIMARY KEY (id);


--
-- Name: benchmark_results benchmark_results_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.benchmark_results
    ADD CONSTRAINT benchmark_results_pkey PRIMARY KEY (id);


--
-- Name: bias_filters bias_filters_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bias_filters
    ADD CONSTRAINT bias_filters_pkey PRIMARY KEY (id);


--
-- Name: compliance_monitoring compliance_monitoring_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.compliance_monitoring
    ADD CONSTRAINT compliance_monitoring_pkey PRIMARY KEY (id);


--
-- Name: compliance_rules compliance_rules_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.compliance_rules
    ADD CONSTRAINT compliance_rules_pkey PRIMARY KEY (id);


--
-- Name: compliance_violations compliance_violations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.compliance_violations
    ADD CONSTRAINT compliance_violations_pkey PRIMARY KEY (id);


--
-- Name: context_suggestions context_suggestions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.context_suggestions
    ADD CONSTRAINT context_suggestions_pkey PRIMARY KEY (id);


--
-- Name: context_suggestions context_suggestions_user_id_context_type_context_value_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.context_suggestions
    ADD CONSTRAINT context_suggestions_user_id_context_type_context_value_key UNIQUE (user_id, context_type, context_value);


--
-- Name: global_insights global_insights_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.global_insights
    ADD CONSTRAINT global_insights_pkey PRIMARY KEY (id);


--
-- Name: global_prompt_patterns global_prompt_patterns_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.global_prompt_patterns
    ADD CONSTRAINT global_prompt_patterns_pkey PRIMARY KEY (id);


--
-- Name: global_topic_trends global_topic_trends_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.global_topic_trends
    ADD CONSTRAINT global_topic_trends_pkey PRIMARY KEY (id);


--
-- Name: industry_templates industry_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.industry_templates
    ADD CONSTRAINT industry_templates_pkey PRIMARY KEY (id);


--
-- Name: leaderboard leaderboard_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leaderboard
    ADD CONSTRAINT leaderboard_pkey PRIMARY KEY (id);


--
-- Name: leaderboard leaderboard_user_id_category_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leaderboard
    ADD CONSTRAINT leaderboard_user_id_category_key UNIQUE (user_id, category);


--
-- Name: learned_patterns learned_patterns_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.learned_patterns
    ADD CONSTRAINT learned_patterns_pkey PRIMARY KEY (id);


--
-- Name: legal_prompt_packs legal_prompt_packs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.legal_prompt_packs
    ADD CONSTRAINT legal_prompt_packs_pkey PRIMARY KEY (id);


--
-- Name: marketplace_listings marketplace_listings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.marketplace_listings
    ADD CONSTRAINT marketplace_listings_pkey PRIMARY KEY (id);


--
-- Name: optimization_insights optimization_insights_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.optimization_insights
    ADD CONSTRAINT optimization_insights_pkey PRIMARY KEY (id);


--
-- Name: optimization_recommendations optimization_recommendations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.optimization_recommendations
    ADD CONSTRAINT optimization_recommendations_pkey PRIMARY KEY (id);


--
-- Name: persona_templates persona_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.persona_templates
    ADD CONSTRAINT persona_templates_pkey PRIMARY KEY (id);


--
-- Name: personalized_recommendations personalized_recommendations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.personalized_recommendations
    ADD CONSTRAINT personalized_recommendations_pkey PRIMARY KEY (id);


--
-- Name: predictive_alerts predictive_alerts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.predictive_alerts
    ADD CONSTRAINT predictive_alerts_pkey PRIMARY KEY (id);


--
-- Name: predictive_models predictive_models_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.predictive_models
    ADD CONSTRAINT predictive_models_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


--
-- Name: prompt_agents prompt_agents_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prompt_agents
    ADD CONSTRAINT prompt_agents_pkey PRIMARY KEY (id);


--
-- Name: prompt_audit_logs prompt_audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prompt_audit_logs
    ADD CONSTRAINT prompt_audit_logs_pkey PRIMARY KEY (id);


--
-- Name: prompt_compliance_checks prompt_compliance_checks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prompt_compliance_checks
    ADD CONSTRAINT prompt_compliance_checks_pkey PRIMARY KEY (id);


--
-- Name: prompt_deployments prompt_deployments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prompt_deployments
    ADD CONSTRAINT prompt_deployments_pkey PRIMARY KEY (id);


--
-- Name: prompt_feedback prompt_feedback_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prompt_feedback
    ADD CONSTRAINT prompt_feedback_pkey PRIMARY KEY (id);


--
-- Name: prompt_history prompt_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prompt_history
    ADD CONSTRAINT prompt_history_pkey PRIMARY KEY (id);


--
-- Name: prompt_metrics prompt_metrics_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prompt_metrics
    ADD CONSTRAINT prompt_metrics_pkey PRIMARY KEY (id);


--
-- Name: prompt_network_insights prompt_network_insights_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prompt_network_insights
    ADD CONSTRAINT prompt_network_insights_pkey PRIMARY KEY (id);


--
-- Name: prompt_nodes prompt_nodes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prompt_nodes
    ADD CONSTRAINT prompt_nodes_pkey PRIMARY KEY (id);


--
-- Name: prompt_performance prompt_performance_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prompt_performance
    ADD CONSTRAINT prompt_performance_pkey PRIMARY KEY (id);


--
-- Name: prompt_purchases prompt_purchases_listing_id_buyer_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prompt_purchases
    ADD CONSTRAINT prompt_purchases_listing_id_buyer_id_key UNIQUE (listing_id, buyer_id);


--
-- Name: prompt_purchases prompt_purchases_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prompt_purchases
    ADD CONSTRAINT prompt_purchases_pkey PRIMARY KEY (id);


--
-- Name: prompt_ratings prompt_ratings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prompt_ratings
    ADD CONSTRAINT prompt_ratings_pkey PRIMARY KEY (id);


--
-- Name: prompt_ratings prompt_ratings_prompt_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prompt_ratings
    ADD CONSTRAINT prompt_ratings_prompt_id_user_id_key UNIQUE (prompt_id, user_id);


--
-- Name: prompt_relationships prompt_relationships_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prompt_relationships
    ADD CONSTRAINT prompt_relationships_pkey PRIMARY KEY (id);


--
-- Name: prompt_relationships prompt_relationships_source_prompt_id_target_prompt_id_rela_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prompt_relationships
    ADD CONSTRAINT prompt_relationships_source_prompt_id_target_prompt_id_rela_key UNIQUE (source_prompt_id, target_prompt_id, relationship_type);


--
-- Name: prompt_stars prompt_stars_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prompt_stars
    ADD CONSTRAINT prompt_stars_pkey PRIMARY KEY (id);


--
-- Name: prompt_stars prompt_stars_user_id_prompt_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prompt_stars
    ADD CONSTRAINT prompt_stars_user_id_prompt_id_key UNIQUE (user_id, prompt_id);


--
-- Name: prompt_topic_links prompt_topic_links_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prompt_topic_links
    ADD CONSTRAINT prompt_topic_links_pkey PRIMARY KEY (id);


--
-- Name: prompt_topic_links prompt_topic_links_prompt_id_topic_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prompt_topic_links
    ADD CONSTRAINT prompt_topic_links_prompt_id_topic_id_key UNIQUE (prompt_id, topic_id);


--
-- Name: prompt_topics prompt_topics_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prompt_topics
    ADD CONSTRAINT prompt_topics_pkey PRIMARY KEY (id);


--
-- Name: prompt_topics prompt_topics_user_id_topic_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prompt_topics
    ADD CONSTRAINT prompt_topics_user_id_topic_name_key UNIQUE (user_id, topic_name);


--
-- Name: prompt_variations prompt_variations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prompt_variations
    ADD CONSTRAINT prompt_variations_pkey PRIMARY KEY (id);


--
-- Name: prompt_versions prompt_versions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prompt_versions
    ADD CONSTRAINT prompt_versions_pkey PRIMARY KEY (id);


--
-- Name: prompt_versions prompt_versions_prompt_id_version_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prompt_versions
    ADD CONSTRAINT prompt_versions_prompt_id_version_number_key UNIQUE (prompt_id, version_number);


--
-- Name: rating_votes rating_votes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rating_votes
    ADD CONSTRAINT rating_votes_pkey PRIMARY KEY (id);


--
-- Name: rating_votes rating_votes_user_id_rating_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rating_votes
    ADD CONSTRAINT rating_votes_user_id_rating_id_key UNIQUE (user_id, rating_id);


--
-- Name: saved_workflows saved_workflows_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.saved_workflows
    ADD CONSTRAINT saved_workflows_pkey PRIMARY KEY (id);


--
-- Name: subscription_plans subscription_plans_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscription_plans
    ADD CONSTRAINT subscription_plans_pkey PRIMARY KEY (id);


--
-- Name: subscription_plans subscription_plans_plan_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscription_plans
    ADD CONSTRAINT subscription_plans_plan_name_key UNIQUE (plan_name);


--
-- Name: team_members team_members_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_members
    ADD CONSTRAINT team_members_pkey PRIMARY KEY (id);


--
-- Name: team_members team_members_team_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_members
    ADD CONSTRAINT team_members_team_id_user_id_key UNIQUE (team_id, user_id);


--
-- Name: team_prompts team_prompts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_prompts
    ADD CONSTRAINT team_prompts_pkey PRIMARY KEY (id);


--
-- Name: teams teams_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.teams
    ADD CONSTRAINT teams_pkey PRIMARY KEY (id);


--
-- Name: usage_tracking usage_tracking_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usage_tracking
    ADD CONSTRAINT usage_tracking_pkey PRIMARY KEY (id);


--
-- Name: user_achievements user_achievements_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_achievements
    ADD CONSTRAINT user_achievements_pkey PRIMARY KEY (id);


--
-- Name: user_achievements user_achievements_user_id_badge_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_achievements
    ADD CONSTRAINT user_achievements_user_id_badge_id_key UNIQUE (user_id, badge_id);


--
-- Name: user_activity user_activity_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_activity
    ADD CONSTRAINT user_activity_pkey PRIMARY KEY (id);


--
-- Name: user_behavior user_behavior_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_behavior
    ADD CONSTRAINT user_behavior_pkey PRIMARY KEY (id);


--
-- Name: user_personas user_personas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_personas
    ADD CONSTRAINT user_personas_pkey PRIMARY KEY (id);


--
-- Name: user_preferences user_preferences_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_preferences
    ADD CONSTRAINT user_preferences_pkey PRIMARY KEY (id);


--
-- Name: user_preferences user_preferences_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_preferences
    ADD CONSTRAINT user_preferences_user_id_key UNIQUE (user_id);


--
-- Name: user_roles user_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_pkey PRIMARY KEY (id);


--
-- Name: user_roles user_roles_user_id_role_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_role_key UNIQUE (user_id, role);


--
-- Name: user_subscriptions user_subscriptions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_subscriptions
    ADD CONSTRAINT user_subscriptions_pkey PRIMARY KEY (id);


--
-- Name: user_subscriptions user_subscriptions_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_subscriptions
    ADD CONSTRAINT user_subscriptions_user_id_key UNIQUE (user_id);


--
-- Name: idx_ab_test_experiments_user_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ab_test_experiments_user_status ON public.ab_test_experiments USING btree (user_id, status);


--
-- Name: idx_ab_test_results_test_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ab_test_results_test_id ON public.ab_test_results USING btree (test_id);


--
-- Name: idx_ab_tests_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ab_tests_user_id ON public.ab_tests USING btree (user_id);


--
-- Name: idx_adaptive_models_user_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_adaptive_models_user_active ON public.adaptive_models USING btree (user_id, is_active);


--
-- Name: idx_agent_analytics_agent_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_agent_analytics_agent_id ON public.agent_analytics USING btree (agent_id);


--
-- Name: idx_agent_analytics_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_agent_analytics_created_at ON public.agent_analytics USING btree (created_at DESC);


--
-- Name: idx_agent_conversations_agent_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_agent_conversations_agent_id ON public.agent_conversations USING btree (agent_id);


--
-- Name: idx_agent_conversations_updated_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_agent_conversations_updated_at ON public.agent_conversations USING btree (updated_at DESC);


--
-- Name: idx_agent_conversations_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_agent_conversations_user_id ON public.agent_conversations USING btree (user_id);


--
-- Name: idx_ai_insights_actionable; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ai_insights_actionable ON public.ai_insights USING btree (is_actionable) WHERE (is_actionable = true);


--
-- Name: idx_ai_insights_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ai_insights_created ON public.ai_insights USING btree (created_at DESC);


--
-- Name: idx_ai_insights_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ai_insights_type ON public.ai_insights USING btree (insight_type);


--
-- Name: idx_ai_insights_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ai_insights_user_id ON public.ai_insights USING btree (user_id);


--
-- Name: idx_ai_learning_success; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ai_learning_success ON public.ai_learning_patterns USING btree (success_rate DESC);


--
-- Name: idx_ai_learning_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ai_learning_type ON public.ai_learning_patterns USING btree (pattern_type);


--
-- Name: idx_ai_learning_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ai_learning_user_id ON public.ai_learning_patterns USING btree (user_id);


--
-- Name: idx_analytics_metrics_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_analytics_metrics_type ON public.analytics_metrics USING btree (metric_type);


--
-- Name: idx_analytics_metrics_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_analytics_metrics_user_id ON public.analytics_metrics USING btree (user_id);


--
-- Name: idx_api_keys_api_key; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_api_keys_api_key ON public.api_keys USING btree (api_key);


--
-- Name: idx_api_keys_hash; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_api_keys_hash ON public.api_keys USING btree (api_key_hash);


--
-- Name: idx_api_keys_prefix; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_api_keys_prefix ON public.api_keys USING btree (key_prefix);


--
-- Name: idx_api_keys_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_api_keys_user_id ON public.api_keys USING btree (user_id);


--
-- Name: idx_audit_logs_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_logs_created ON public.prompt_audit_logs USING btree (created_at DESC);


--
-- Name: idx_audit_logs_team; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_logs_team ON public.prompt_audit_logs USING btree (team_id);


--
-- Name: idx_audit_logs_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_logs_user ON public.prompt_audit_logs USING btree (user_id);


--
-- Name: idx_auto_optimization_jobs_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_auto_optimization_jobs_created ON public.auto_optimization_jobs USING btree (created_at DESC);


--
-- Name: idx_auto_optimization_jobs_user_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_auto_optimization_jobs_user_status ON public.auto_optimization_jobs USING btree (user_id, status);


--
-- Name: idx_benchmark_results_user_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_benchmark_results_user_created ON public.benchmark_results USING btree (user_id, created_at DESC);


--
-- Name: idx_bias_filters_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bias_filters_type ON public.bias_filters USING btree (bias_type);


--
-- Name: idx_compliance_checks_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_compliance_checks_user ON public.prompt_compliance_checks USING btree (user_id);


--
-- Name: idx_compliance_monitoring_severity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_compliance_monitoring_severity ON public.compliance_monitoring USING btree (severity);


--
-- Name: idx_compliance_monitoring_user_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_compliance_monitoring_user_status ON public.compliance_monitoring USING btree (user_id, status);


--
-- Name: idx_compliance_rules_industry; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_compliance_rules_industry ON public.compliance_rules USING btree (industry);


--
-- Name: idx_compliance_rules_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_compliance_rules_type ON public.compliance_rules USING btree (rule_type);


--
-- Name: idx_compliance_violations_severity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_compliance_violations_severity ON public.compliance_violations USING btree (severity);


--
-- Name: idx_compliance_violations_unresolved; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_compliance_violations_unresolved ON public.compliance_violations USING btree (resolved_at) WHERE (resolved_at IS NULL);


--
-- Name: idx_context_suggestions_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_context_suggestions_user ON public.context_suggestions USING btree (user_id, expires_at);


--
-- Name: idx_global_insights_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_global_insights_category ON public.global_insights USING btree (category);


--
-- Name: idx_global_insights_confidence; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_global_insights_confidence ON public.global_insights USING btree (confidence_score DESC);


--
-- Name: idx_global_insights_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_global_insights_type ON public.global_insights USING btree (insight_type);


--
-- Name: idx_global_patterns_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_global_patterns_category ON public.global_prompt_patterns USING btree (category);


--
-- Name: idx_global_patterns_platform; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_global_patterns_platform ON public.global_prompt_patterns USING btree (platform);


--
-- Name: idx_global_patterns_success; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_global_patterns_success ON public.global_prompt_patterns USING btree (success_rate DESC);


--
-- Name: idx_global_trends_platform; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_global_trends_platform ON public.global_topic_trends USING btree (platform);


--
-- Name: idx_global_trends_popularity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_global_trends_popularity ON public.global_topic_trends USING btree (popularity_score DESC);


--
-- Name: idx_global_trends_topic; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_global_trends_topic ON public.global_topic_trends USING btree (topic_name);


--
-- Name: idx_learned_patterns_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_learned_patterns_user ON public.learned_patterns USING btree (user_id, pattern_type);


--
-- Name: idx_legal_packs_industry; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_legal_packs_industry ON public.legal_prompt_packs USING btree (industry);


--
-- Name: idx_marketplace_listings_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_marketplace_listings_category ON public.marketplace_listings USING btree (category);


--
-- Name: idx_marketplace_listings_is_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_marketplace_listings_is_active ON public.marketplace_listings USING btree (is_active);


--
-- Name: idx_marketplace_listings_seller_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_marketplace_listings_seller_id ON public.marketplace_listings USING btree (seller_id);


--
-- Name: idx_optimization_impact; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_optimization_impact ON public.optimization_recommendations USING btree (expected_impact DESC);


--
-- Name: idx_optimization_insights_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_optimization_insights_category ON public.optimization_insights USING btree (category);


--
-- Name: idx_optimization_insights_confidence; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_optimization_insights_confidence ON public.optimization_insights USING btree (confidence_level);


--
-- Name: idx_optimization_priority; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_optimization_priority ON public.optimization_recommendations USING btree (priority DESC);


--
-- Name: idx_optimization_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_optimization_status ON public.optimization_recommendations USING btree (status);


--
-- Name: idx_optimization_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_optimization_user_id ON public.optimization_recommendations USING btree (user_id);


--
-- Name: idx_personalized_recommendations_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_personalized_recommendations_user ON public.personalized_recommendations USING btree (user_id, is_dismissed, relevance_score DESC);


--
-- Name: idx_predictive_accuracy; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_predictive_accuracy ON public.predictive_models USING btree (accuracy DESC);


--
-- Name: idx_predictive_alerts_user_read; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_predictive_alerts_user_read ON public.predictive_alerts USING btree (user_id, is_read, is_dismissed);


--
-- Name: idx_predictive_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_predictive_type ON public.predictive_models USING btree (model_type);


--
-- Name: idx_predictive_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_predictive_user_id ON public.predictive_models USING btree (user_id);


--
-- Name: idx_prompt_agents_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_prompt_agents_category ON public.prompt_agents USING btree (category);


--
-- Name: idx_prompt_agents_is_public; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_prompt_agents_is_public ON public.prompt_agents USING btree (is_public);


--
-- Name: idx_prompt_agents_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_prompt_agents_user_id ON public.prompt_agents USING btree (user_id);


--
-- Name: idx_prompt_deployments_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_prompt_deployments_status ON public.prompt_deployments USING btree (status);


--
-- Name: idx_prompt_deployments_team; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_prompt_deployments_team ON public.prompt_deployments USING btree (team_id);


--
-- Name: idx_prompt_feedback_agent_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_prompt_feedback_agent_id ON public.prompt_feedback USING btree (agent_id);


--
-- Name: idx_prompt_feedback_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_prompt_feedback_created_at ON public.prompt_feedback USING btree (created_at DESC);


--
-- Name: idx_prompt_feedback_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_prompt_feedback_user_id ON public.prompt_feedback USING btree (user_id);


--
-- Name: idx_prompt_metrics_executed; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_prompt_metrics_executed ON public.prompt_metrics USING btree (executed_at DESC);


--
-- Name: idx_prompt_metrics_prompt; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_prompt_metrics_prompt ON public.prompt_metrics USING btree (prompt_id);


--
-- Name: idx_prompt_metrics_team; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_prompt_metrics_team ON public.prompt_metrics USING btree (team_id);


--
-- Name: idx_prompt_nodes_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_prompt_nodes_category ON public.prompt_nodes USING btree (category);


--
-- Name: idx_prompt_nodes_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_prompt_nodes_created_at ON public.prompt_nodes USING btree (created_at DESC);


--
-- Name: idx_prompt_nodes_keywords; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_prompt_nodes_keywords ON public.prompt_nodes USING gin (keywords);


--
-- Name: idx_prompt_nodes_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_prompt_nodes_user_id ON public.prompt_nodes USING btree (user_id);


--
-- Name: idx_prompt_purchases_buyer_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_prompt_purchases_buyer_id ON public.prompt_purchases USING btree (buyer_id);


--
-- Name: idx_prompt_purchases_listing_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_prompt_purchases_listing_id ON public.prompt_purchases USING btree (listing_id);


--
-- Name: idx_prompt_ratings_prompt; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_prompt_ratings_prompt ON public.prompt_ratings USING btree (prompt_id);


--
-- Name: idx_prompt_ratings_prompt_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_prompt_ratings_prompt_id ON public.prompt_ratings USING btree (prompt_id);


--
-- Name: idx_prompt_ratings_rating; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_prompt_ratings_rating ON public.prompt_ratings USING btree (rating);


--
-- Name: idx_prompt_relationships_source; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_prompt_relationships_source ON public.prompt_relationships USING btree (source_prompt_id);


--
-- Name: idx_prompt_relationships_target; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_prompt_relationships_target ON public.prompt_relationships USING btree (target_prompt_id);


--
-- Name: idx_prompt_relationships_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_prompt_relationships_type ON public.prompt_relationships USING btree (relationship_type);


--
-- Name: idx_prompt_stars_prompt; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_prompt_stars_prompt ON public.prompt_stars USING btree (prompt_id);


--
-- Name: idx_prompt_stars_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_prompt_stars_user ON public.prompt_stars USING btree (user_id);


--
-- Name: idx_prompt_topic_links_prompt; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_prompt_topic_links_prompt ON public.prompt_topic_links USING btree (prompt_id);


--
-- Name: idx_prompt_topic_links_topic; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_prompt_topic_links_topic ON public.prompt_topic_links USING btree (topic_id);


--
-- Name: idx_prompt_topics_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_prompt_topics_user_id ON public.prompt_topics USING btree (user_id);


--
-- Name: idx_prompt_variations_test_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_prompt_variations_test_status ON public.prompt_variations USING btree (test_status);


--
-- Name: idx_prompt_variations_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_prompt_variations_user_id ON public.prompt_variations USING btree (user_id);


--
-- Name: idx_prompt_versions_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_prompt_versions_created ON public.prompt_versions USING btree (created_at DESC);


--
-- Name: idx_prompt_versions_prompt; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_prompt_versions_prompt ON public.prompt_versions USING btree (prompt_id);


--
-- Name: idx_rating_votes_rating; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_rating_votes_rating ON public.rating_votes USING btree (rating_id);


--
-- Name: idx_saved_workflows_is_public; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_saved_workflows_is_public ON public.saved_workflows USING btree (is_public);


--
-- Name: idx_saved_workflows_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_saved_workflows_user_id ON public.saved_workflows USING btree (user_id);


--
-- Name: idx_team_members_team_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_team_members_team_id ON public.team_members USING btree (team_id);


--
-- Name: idx_team_members_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_team_members_user_id ON public.team_members USING btree (user_id);


--
-- Name: idx_team_prompts_team_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_team_prompts_team_id ON public.team_prompts USING btree (team_id);


--
-- Name: idx_usage_tracking_period; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_usage_tracking_period ON public.usage_tracking USING btree (period_start, period_end);


--
-- Name: idx_usage_tracking_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_usage_tracking_user_id ON public.usage_tracking USING btree (user_id);


--
-- Name: idx_user_activity_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_activity_type ON public.user_activity USING btree (activity_type);


--
-- Name: idx_user_activity_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_activity_user_id ON public.user_activity USING btree (user_id);


--
-- Name: idx_user_behavior_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_behavior_type ON public.user_behavior USING btree (behavior_type);


--
-- Name: idx_user_behavior_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_behavior_user_id ON public.user_behavior USING btree (user_id, recorded_at DESC);


--
-- Name: idx_user_subscriptions_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_subscriptions_status ON public.user_subscriptions USING btree (status);


--
-- Name: idx_user_subscriptions_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_subscriptions_user_id ON public.user_subscriptions USING btree (user_id);


--
-- Name: top_rated_prompts _RETURN; Type: RULE; Schema: public; Owner: -
--

CREATE OR REPLACE VIEW public.top_rated_prompts WITH (security_invoker='true') AS
 SELECT ml.id,
    ml.title,
    ml.description,
    ml.seller_id,
    ml.price,
    ml.category,
    ml.downloads,
    ml.views,
    COALESCE(avg(pr.rating), (0)::numeric) AS avg_rating,
    count(DISTINCT pr.id) AS rating_count,
    count(DISTINCT ps.id) AS star_count
   FROM ((public.marketplace_listings ml
     LEFT JOIN public.prompt_ratings pr ON ((pr.prompt_id = ml.id)))
     LEFT JOIN public.prompt_stars ps ON ((ps.prompt_id = ml.id)))
  WHERE (ml.is_active = true)
  GROUP BY ml.id
 HAVING (count(DISTINCT pr.id) >= 3)
  ORDER BY COALESCE(avg(pr.rating), (0)::numeric) DESC, (count(DISTINCT pr.id)) DESC;


--
-- Name: profiles assign_admin_on_profile_create; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER assign_admin_on_profile_create AFTER INSERT ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.auto_assign_admin_role();


--
-- Name: prompt_deployments audit_prompt_deployments; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER audit_prompt_deployments AFTER INSERT OR DELETE OR UPDATE ON public.prompt_deployments FOR EACH ROW EXECUTE FUNCTION public.create_audit_log();


--
-- Name: prompt_versions audit_prompt_versions; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER audit_prompt_versions AFTER INSERT OR DELETE OR UPDATE ON public.prompt_versions FOR EACH ROW EXECUTE FUNCTION public.create_audit_log();


--
-- Name: api_keys auto_clear_api_key; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER auto_clear_api_key BEFORE INSERT ON public.api_keys FOR EACH ROW EXECUTE FUNCTION public.clear_plaintext_api_key();


--
-- Name: api_keys enforce_api_key_security; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER enforce_api_key_security BEFORE UPDATE ON public.api_keys FOR EACH ROW EXECUTE FUNCTION public.prevent_plaintext_api_key();


--
-- Name: ab_test_experiments update_ab_test_experiments_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_ab_test_experiments_updated_at BEFORE UPDATE ON public.ab_test_experiments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: agent_conversations update_agent_conversations_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_agent_conversations_updated_at BEFORE UPDATE ON public.agent_conversations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: ai_learning_patterns update_ai_learning_patterns_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_ai_learning_patterns_updated_at BEFORE UPDATE ON public.ai_learning_patterns FOR EACH ROW EXECUTE FUNCTION public.update_ai_updated_at();


--
-- Name: compliance_rules update_compliance_rules_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_compliance_rules_updated_at BEFORE UPDATE ON public.compliance_rules FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: global_prompt_patterns update_global_patterns_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_global_patterns_updated_at BEFORE UPDATE ON public.global_prompt_patterns FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: learned_patterns update_learned_patterns_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_learned_patterns_updated_at BEFORE UPDATE ON public.learned_patterns FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: legal_prompt_packs update_legal_prompt_packs_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_legal_prompt_packs_updated_at BEFORE UPDATE ON public.legal_prompt_packs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: marketplace_listings update_marketplace_listings_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_marketplace_listings_updated_at BEFORE UPDATE ON public.marketplace_listings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: optimization_insights update_optimization_insights_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_optimization_insights_updated_at BEFORE UPDATE ON public.optimization_insights FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: predictive_models update_predictive_models_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_predictive_models_updated_at BEFORE UPDATE ON public.predictive_models FOR EACH ROW EXECUTE FUNCTION public.update_ai_updated_at();


--
-- Name: profiles update_profiles_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: prompt_agents update_prompt_agents_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_prompt_agents_updated_at BEFORE UPDATE ON public.prompt_agents FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: prompt_feedback update_prompt_feedback_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_prompt_feedback_updated_at BEFORE UPDATE ON public.prompt_feedback FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: prompt_nodes update_prompt_nodes_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_prompt_nodes_updated_at BEFORE UPDATE ON public.prompt_nodes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: prompt_variations update_prompt_variations_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_prompt_variations_updated_at BEFORE UPDATE ON public.prompt_variations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: prompt_ratings update_reputation_on_rating; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_reputation_on_rating AFTER INSERT ON public.prompt_ratings FOR EACH ROW EXECUTE FUNCTION public.update_user_reputation();


--
-- Name: saved_workflows update_saved_workflows_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_saved_workflows_updated_at BEFORE UPDATE ON public.saved_workflows FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: subscription_plans update_subscription_plans_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_subscription_plans_updated_at BEFORE UPDATE ON public.subscription_plans FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: team_prompts update_team_prompts_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_team_prompts_updated_at BEFORE UPDATE ON public.team_prompts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: teams update_teams_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_teams_updated_at BEFORE UPDATE ON public.teams FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: user_personas update_user_personas_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_user_personas_updated_at BEFORE UPDATE ON public.user_personas FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: user_preferences update_user_preferences_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_user_preferences_updated_at BEFORE UPDATE ON public.user_preferences FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: user_subscriptions update_user_subscriptions_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_user_subscriptions_updated_at BEFORE UPDATE ON public.user_subscriptions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: ab_test_results ab_test_results_test_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ab_test_results
    ADD CONSTRAINT ab_test_results_test_id_fkey FOREIGN KEY (test_id) REFERENCES public.ab_tests(id) ON DELETE CASCADE;


--
-- Name: admin_emails admin_emails_added_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_emails
    ADD CONSTRAINT admin_emails_added_by_fkey FOREIGN KEY (added_by) REFERENCES auth.users(id);


--
-- Name: agent_analytics agent_analytics_agent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_analytics
    ADD CONSTRAINT agent_analytics_agent_id_fkey FOREIGN KEY (agent_id) REFERENCES public.prompt_agents(id) ON DELETE CASCADE;


--
-- Name: agent_analytics agent_analytics_conversation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_analytics
    ADD CONSTRAINT agent_analytics_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES public.agent_conversations(id) ON DELETE CASCADE;


--
-- Name: agent_conversations agent_conversations_agent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_conversations
    ADD CONSTRAINT agent_conversations_agent_id_fkey FOREIGN KEY (agent_id) REFERENCES public.prompt_agents(id) ON DELETE CASCADE;


--
-- Name: ai_insights ai_insights_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_insights
    ADD CONSTRAINT ai_insights_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: ai_learning_patterns ai_learning_patterns_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_learning_patterns
    ADD CONSTRAINT ai_learning_patterns_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: api_key_audit_logs api_key_audit_logs_api_key_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.api_key_audit_logs
    ADD CONSTRAINT api_key_audit_logs_api_key_id_fkey FOREIGN KEY (api_key_id) REFERENCES public.api_keys(id) ON DELETE CASCADE;


--
-- Name: api_keys api_keys_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.api_keys
    ADD CONSTRAINT api_keys_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: auto_optimization_jobs auto_optimization_jobs_prompt_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auto_optimization_jobs
    ADD CONSTRAINT auto_optimization_jobs_prompt_id_fkey FOREIGN KEY (prompt_id) REFERENCES public.prompt_history(id) ON DELETE CASCADE;


--
-- Name: compliance_violations compliance_violations_resolved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.compliance_violations
    ADD CONSTRAINT compliance_violations_resolved_by_fkey FOREIGN KEY (resolved_by) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: leaderboard leaderboard_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leaderboard
    ADD CONSTRAINT leaderboard_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: optimization_recommendations optimization_recommendations_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.optimization_recommendations
    ADD CONSTRAINT optimization_recommendations_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: predictive_models predictive_models_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.predictive_models
    ADD CONSTRAINT predictive_models_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: profiles profiles_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: prompt_audit_logs prompt_audit_logs_team_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prompt_audit_logs
    ADD CONSTRAINT prompt_audit_logs_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE CASCADE;


--
-- Name: prompt_audit_logs prompt_audit_logs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prompt_audit_logs
    ADD CONSTRAINT prompt_audit_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: prompt_deployments prompt_deployments_deployed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prompt_deployments
    ADD CONSTRAINT prompt_deployments_deployed_by_fkey FOREIGN KEY (deployed_by) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: prompt_deployments prompt_deployments_prompt_version_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prompt_deployments
    ADD CONSTRAINT prompt_deployments_prompt_version_id_fkey FOREIGN KEY (prompt_version_id) REFERENCES public.prompt_versions(id) ON DELETE CASCADE;


--
-- Name: prompt_deployments prompt_deployments_team_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prompt_deployments
    ADD CONSTRAINT prompt_deployments_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE CASCADE;


--
-- Name: prompt_feedback prompt_feedback_agent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prompt_feedback
    ADD CONSTRAINT prompt_feedback_agent_id_fkey FOREIGN KEY (agent_id) REFERENCES public.prompt_agents(id) ON DELETE CASCADE;


--
-- Name: prompt_history prompt_history_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prompt_history
    ADD CONSTRAINT prompt_history_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: prompt_metrics prompt_metrics_team_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prompt_metrics
    ADD CONSTRAINT prompt_metrics_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE CASCADE;


--
-- Name: prompt_metrics prompt_metrics_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prompt_metrics
    ADD CONSTRAINT prompt_metrics_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: prompt_network_insights prompt_network_insights_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prompt_network_insights
    ADD CONSTRAINT prompt_network_insights_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id);


--
-- Name: prompt_nodes prompt_nodes_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prompt_nodes
    ADD CONSTRAINT prompt_nodes_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id);


--
-- Name: prompt_performance prompt_performance_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prompt_performance
    ADD CONSTRAINT prompt_performance_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: prompt_purchases prompt_purchases_listing_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prompt_purchases
    ADD CONSTRAINT prompt_purchases_listing_id_fkey FOREIGN KEY (listing_id) REFERENCES public.marketplace_listings(id) ON DELETE CASCADE;


--
-- Name: prompt_relationships prompt_relationships_source_prompt_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prompt_relationships
    ADD CONSTRAINT prompt_relationships_source_prompt_id_fkey FOREIGN KEY (source_prompt_id) REFERENCES public.prompt_nodes(id) ON DELETE CASCADE;


--
-- Name: prompt_relationships prompt_relationships_target_prompt_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prompt_relationships
    ADD CONSTRAINT prompt_relationships_target_prompt_id_fkey FOREIGN KEY (target_prompt_id) REFERENCES public.prompt_nodes(id) ON DELETE CASCADE;


--
-- Name: prompt_stars prompt_stars_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prompt_stars
    ADD CONSTRAINT prompt_stars_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: prompt_topic_links prompt_topic_links_prompt_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prompt_topic_links
    ADD CONSTRAINT prompt_topic_links_prompt_id_fkey FOREIGN KEY (prompt_id) REFERENCES public.prompt_nodes(id) ON DELETE CASCADE;


--
-- Name: prompt_topic_links prompt_topic_links_topic_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prompt_topic_links
    ADD CONSTRAINT prompt_topic_links_topic_id_fkey FOREIGN KEY (topic_id) REFERENCES public.prompt_topics(id) ON DELETE CASCADE;


--
-- Name: prompt_topics prompt_topics_parent_topic_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prompt_topics
    ADD CONSTRAINT prompt_topics_parent_topic_id_fkey FOREIGN KEY (parent_topic_id) REFERENCES public.prompt_topics(id) ON DELETE CASCADE;


--
-- Name: prompt_topics prompt_topics_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prompt_topics
    ADD CONSTRAINT prompt_topics_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id);


--
-- Name: prompt_versions prompt_versions_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prompt_versions
    ADD CONSTRAINT prompt_versions_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: rating_votes rating_votes_rating_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rating_votes
    ADD CONSTRAINT rating_votes_rating_id_fkey FOREIGN KEY (rating_id) REFERENCES public.prompt_ratings(id) ON DELETE CASCADE;


--
-- Name: rating_votes rating_votes_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rating_votes
    ADD CONSTRAINT rating_votes_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: saved_workflows saved_workflows_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.saved_workflows
    ADD CONSTRAINT saved_workflows_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: team_members team_members_team_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_members
    ADD CONSTRAINT team_members_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE CASCADE;


--
-- Name: team_prompts team_prompts_team_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_prompts
    ADD CONSTRAINT team_prompts_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE CASCADE;


--
-- Name: usage_tracking usage_tracking_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usage_tracking
    ADD CONSTRAINT usage_tracking_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: user_achievements user_achievements_badge_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_achievements
    ADD CONSTRAINT user_achievements_badge_id_fkey FOREIGN KEY (badge_id) REFERENCES public.badges(id) ON DELETE CASCADE;


--
-- Name: user_achievements user_achievements_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_achievements
    ADD CONSTRAINT user_achievements_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: user_personas user_personas_template_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_personas
    ADD CONSTRAINT user_personas_template_id_fkey FOREIGN KEY (template_id) REFERENCES public.persona_templates(id) ON DELETE SET NULL;


--
-- Name: user_personas user_personas_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_personas
    ADD CONSTRAINT user_personas_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: user_preferences user_preferences_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_preferences
    ADD CONSTRAINT user_preferences_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: user_roles user_roles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: user_subscriptions user_subscriptions_plan_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_subscriptions
    ADD CONSTRAINT user_subscriptions_plan_id_fkey FOREIGN KEY (plan_id) REFERENCES public.subscription_plans(id);


--
-- Name: user_subscriptions user_subscriptions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_subscriptions
    ADD CONSTRAINT user_subscriptions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: admin_emails Admins can add admin emails; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can add admin emails" ON public.admin_emails FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: admin_emails Admins can delete admin emails; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete admin emails" ON public.admin_emails FOR DELETE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: admin_emails Admins can view admin emails; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view admin emails" ON public.admin_emails FOR SELECT USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: subscription_plans Anyone can view active plans; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view active plans" ON public.subscription_plans FOR SELECT USING ((is_active = true));


--
-- Name: industry_templates Anyone can view templates; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view templates" ON public.industry_templates FOR SELECT USING (true);


--
-- Name: compliance_violations Authorized users can resolve violations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authorized users can resolve violations" ON public.compliance_violations FOR UPDATE TO authenticated USING (((resolved_by = auth.uid()) OR (resolved_by IS NULL)));


--
-- Name: prompt_purchases Buyers can view their purchases; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Buyers can view their purchases" ON public.prompt_purchases FOR SELECT USING ((auth.uid() = buyer_id));


--
-- Name: marketplace_listings Everyone can view active listings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Everyone can view active listings" ON public.marketplace_listings FOR SELECT USING (((is_active = true) OR (seller_id = auth.uid())));


--
-- Name: persona_templates Everyone can view active persona templates; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Everyone can view active persona templates" ON public.persona_templates FOR SELECT USING ((is_active = true));


--
-- Name: badges Everyone can view badges; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Everyone can view badges" ON public.badges FOR SELECT USING (true);


--
-- Name: bias_filters Everyone can view bias filters; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Everyone can view bias filters" ON public.bias_filters FOR SELECT USING ((is_active = true));


--
-- Name: compliance_rules Everyone can view compliance rules; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Everyone can view compliance rules" ON public.compliance_rules FOR SELECT USING ((is_active = true));


--
-- Name: global_insights Everyone can view global insights; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Everyone can view global insights" ON public.global_insights FOR SELECT TO authenticated USING (true);


--
-- Name: global_prompt_patterns Everyone can view global patterns; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Everyone can view global patterns" ON public.global_prompt_patterns FOR SELECT TO authenticated USING (true);


--
-- Name: global_topic_trends Everyone can view global trends; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Everyone can view global trends" ON public.global_topic_trends FOR SELECT TO authenticated USING (true);


--
-- Name: leaderboard Everyone can view leaderboard; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Everyone can view leaderboard" ON public.leaderboard FOR SELECT USING (true);


--
-- Name: prompt_stars Everyone can view stars; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Everyone can view stars" ON public.prompt_stars FOR SELECT TO authenticated USING (true);


--
-- Name: legal_prompt_packs Everyone can view verified legal prompts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Everyone can view verified legal prompts" ON public.legal_prompt_packs FOR SELECT USING ((is_verified = true));


--
-- Name: rating_votes Everyone can view votes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Everyone can view votes" ON public.rating_votes FOR SELECT TO authenticated USING (true);


--
-- Name: user_roles Only admins can delete roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Only admins can delete roles" ON public.user_roles FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: user_roles Only admins can insert roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Only admins can insert roles" ON public.user_roles FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: user_roles Only admins can update roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Only admins can update roles" ON public.user_roles FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: team_prompts Prompt creators can delete their prompts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Prompt creators can delete their prompts" ON public.team_prompts FOR DELETE USING ((auth.uid() = created_by));


--
-- Name: team_prompts Prompt creators can update their prompts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Prompt creators can update their prompts" ON public.team_prompts FOR UPDATE USING ((auth.uid() = created_by));


--
-- Name: saved_workflows Public workflows are viewable by everyone; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public workflows are viewable by everyone" ON public.saved_workflows FOR SELECT USING ((is_public = true));


--
-- Name: marketplace_listings Sellers can create listings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Sellers can create listings" ON public.marketplace_listings FOR INSERT WITH CHECK ((auth.uid() = seller_id));


--
-- Name: marketplace_listings Sellers can delete their listings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Sellers can delete their listings" ON public.marketplace_listings FOR DELETE USING ((auth.uid() = seller_id));


--
-- Name: marketplace_listings Sellers can update their listings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Sellers can update their listings" ON public.marketplace_listings FOR UPDATE USING ((auth.uid() = seller_id));


--
-- Name: prompt_purchases Sellers can view sales of their listings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Sellers can view sales of their listings" ON public.prompt_purchases FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.marketplace_listings
  WHERE ((marketplace_listings.id = prompt_purchases.listing_id) AND (marketplace_listings.seller_id = auth.uid())))));


--
-- Name: global_insights Service role can manage global insights; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role can manage global insights" ON public.global_insights TO service_role USING (true) WITH CHECK (true);


--
-- Name: global_prompt_patterns Service role can manage global patterns; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role can manage global patterns" ON public.global_prompt_patterns TO service_role USING (true) WITH CHECK (true);


--
-- Name: global_topic_trends Service role can manage global trends; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role can manage global trends" ON public.global_topic_trends TO service_role USING (true) WITH CHECK (true);


--
-- Name: predictive_alerts System can create alerts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "System can create alerts" ON public.predictive_alerts FOR INSERT WITH CHECK (true);


--
-- Name: api_key_audit_logs System can create audit logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "System can create audit logs" ON public.api_key_audit_logs FOR INSERT WITH CHECK (true);


--
-- Name: compliance_monitoring System can create compliance monitoring records; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "System can create compliance monitoring records" ON public.compliance_monitoring FOR INSERT WITH CHECK (true);


--
-- Name: personalized_recommendations System can create recommendations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "System can create recommendations" ON public.personalized_recommendations FOR INSERT WITH CHECK (true);


--
-- Name: compliance_violations System can create violations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "System can create violations" ON public.compliance_violations FOR INSERT TO authenticated WITH CHECK (true);


--
-- Name: user_achievements System can insert achievements; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "System can insert achievements" ON public.user_achievements FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: prompt_audit_logs System can insert audit logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "System can insert audit logs" ON public.prompt_audit_logs FOR INSERT TO authenticated WITH CHECK ((auth.uid() = user_id));


--
-- Name: prompt_metrics System can insert metrics; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "System can insert metrics" ON public.prompt_metrics FOR INSERT TO authenticated WITH CHECK (true);


--
-- Name: adaptive_models System can manage models; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "System can manage models" ON public.adaptive_models USING ((auth.uid() = user_id));


--
-- Name: context_suggestions System can manage suggestions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "System can manage suggestions" ON public.context_suggestions USING ((auth.uid() = user_id));


--
-- Name: team_prompts Team members can create team prompts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Team members can create team prompts" ON public.team_prompts FOR INSERT WITH CHECK (((auth.uid() = created_by) AND (EXISTS ( SELECT 1
   FROM public.team_members
  WHERE ((team_members.team_id = team_prompts.team_id) AND (team_members.user_id = auth.uid()))))));


--
-- Name: prompt_deployments Team members can view deployments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Team members can view deployments" ON public.prompt_deployments FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.team_members
  WHERE ((team_members.team_id = prompt_deployments.team_id) AND (team_members.user_id = auth.uid())))));


--
-- Name: team_prompts Team members can view team prompts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Team members can view team prompts" ON public.team_prompts FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.team_members
  WHERE ((team_members.team_id = team_prompts.team_id) AND (team_members.user_id = auth.uid())))));


--
-- Name: teams Team members can view their teams; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Team members can view their teams" ON public.teams FOR SELECT USING (((auth.uid() = owner_id) OR (id IN ( SELECT team_members.team_id
   FROM public.team_members
  WHERE (team_members.user_id = auth.uid())))));


--
-- Name: compliance_violations Team members can view violations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Team members can view violations" ON public.compliance_violations FOR SELECT TO authenticated USING (true);


--
-- Name: team_members Team owners can add members; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Team owners can add members" ON public.team_members FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.teams
  WHERE ((teams.id = team_members.team_id) AND (teams.owner_id = auth.uid())))));


--
-- Name: teams Team owners can delete their teams; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Team owners can delete their teams" ON public.teams FOR DELETE USING ((auth.uid() = owner_id));


--
-- Name: prompt_deployments Team owners can manage deployments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Team owners can manage deployments" ON public.prompt_deployments TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.teams
  WHERE ((teams.id = prompt_deployments.team_id) AND (teams.owner_id = auth.uid())))));


--
-- Name: team_members Team owners can remove members; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Team owners can remove members" ON public.team_members FOR DELETE USING ((EXISTS ( SELECT 1
   FROM public.teams
  WHERE ((teams.id = team_members.team_id) AND (teams.owner_id = auth.uid())))));


--
-- Name: teams Team owners can update their teams; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Team owners can update their teams" ON public.teams FOR UPDATE USING ((auth.uid() = owner_id));


--
-- Name: team_members Team owners can view all members; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Team owners can view all members" ON public.team_members FOR SELECT USING (public.is_team_owner(auth.uid(), team_id));


--
-- Name: prompt_audit_logs Team owners can view team audit logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Team owners can view team audit logs" ON public.prompt_audit_logs FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.teams
  WHERE ((teams.id = prompt_audit_logs.team_id) AND (teams.owner_id = auth.uid())))));


--
-- Name: prompt_metrics Team owners can view team metrics; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Team owners can view team metrics" ON public.prompt_metrics FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.teams
  WHERE ((teams.id = prompt_metrics.team_id) AND (teams.owner_id = auth.uid())))));


--
-- Name: rating_votes Users can change their votes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can change their votes" ON public.rating_votes FOR UPDATE TO authenticated USING ((auth.uid() = user_id));


--
-- Name: prompt_topic_links Users can create links for their prompts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create links for their prompts" ON public.prompt_topic_links FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.prompt_nodes
  WHERE ((prompt_nodes.id = prompt_topic_links.prompt_id) AND (prompt_nodes.user_id = auth.uid())))));


--
-- Name: prompt_purchases Users can create purchases; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create purchases" ON public.prompt_purchases FOR INSERT WITH CHECK ((auth.uid() = buyer_id));


--
-- Name: prompt_ratings Users can create ratings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create ratings" ON public.prompt_ratings FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: prompt_relationships Users can create relationships for their prompts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create relationships for their prompts" ON public.prompt_relationships FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.prompt_nodes
  WHERE ((prompt_nodes.id = prompt_relationships.source_prompt_id) AND (prompt_nodes.user_id = auth.uid())))));


--
-- Name: teams Users can create teams; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create teams" ON public.teams FOR INSERT WITH CHECK ((auth.uid() = owner_id));


--
-- Name: ab_tests Users can create tests; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create tests" ON public.ab_tests FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: api_keys Users can create their own API keys; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create their own API keys" ON public.api_keys FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: prompt_agents Users can create their own agents; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create their own agents" ON public.prompt_agents FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: agent_conversations Users can create their own conversations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create their own conversations" ON public.agent_conversations FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: prompt_feedback Users can create their own feedback; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create their own feedback" ON public.prompt_feedback FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: optimization_insights Users can create their own insights; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create their own insights" ON public.optimization_insights FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: prompt_network_insights Users can create their own insights; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create their own insights" ON public.prompt_network_insights FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: auto_optimization_jobs Users can create their own optimization jobs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create their own optimization jobs" ON public.auto_optimization_jobs FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: user_personas Users can create their own personas; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create their own personas" ON public.user_personas FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: prompt_topics Users can create their own topics; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create their own topics" ON public.prompt_topics FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: prompt_variations Users can create their own variations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create their own variations" ON public.prompt_variations FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: saved_workflows Users can create their own workflows; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create their own workflows" ON public.saved_workflows FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: prompt_versions Users can create versions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create versions" ON public.prompt_versions FOR INSERT TO authenticated WITH CHECK ((created_by = auth.uid()));


--
-- Name: prompt_relationships Users can delete relationships for their prompts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete relationships for their prompts" ON public.prompt_relationships FOR DELETE USING ((EXISTS ( SELECT 1
   FROM public.prompt_nodes
  WHERE ((prompt_nodes.id = prompt_relationships.source_prompt_id) AND (prompt_nodes.user_id = auth.uid())))));


--
-- Name: api_keys Users can delete their own API keys; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own API keys" ON public.api_keys FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: prompt_agents Users can delete their own agents; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own agents" ON public.prompt_agents FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: benchmark_results Users can delete their own benchmarks; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own benchmarks" ON public.benchmark_results FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: agent_conversations Users can delete their own conversations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own conversations" ON public.agent_conversations FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: prompt_feedback Users can delete their own feedback; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own feedback" ON public.prompt_feedback FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: user_personas Users can delete their own personas; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own personas" ON public.user_personas FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: prompt_nodes Users can delete their own prompt nodes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own prompt nodes" ON public.prompt_nodes FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: prompt_ratings Users can delete their own ratings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own ratings" ON public.prompt_ratings FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: ab_tests Users can delete their own tests; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own tests" ON public.ab_tests FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: prompt_variations Users can delete their own variations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own variations" ON public.prompt_variations FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: saved_workflows Users can delete their own workflows; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own workflows" ON public.saved_workflows FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: ab_test_results Users can insert results for their tests; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert results for their tests" ON public.ab_test_results FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.ab_tests
  WHERE ((ab_tests.id = ab_test_results.test_id) AND (ab_tests.user_id = auth.uid())))));


--
-- Name: ai_insights Users can insert their own AI insights; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own AI insights" ON public.ai_insights FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: user_activity Users can insert their own activity; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own activity" ON public.user_activity FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: agent_analytics Users can insert their own analytics; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own analytics" ON public.agent_analytics FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: user_behavior Users can insert their own behavior; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own behavior" ON public.user_behavior FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: benchmark_results Users can insert their own benchmarks; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own benchmarks" ON public.benchmark_results FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: prompt_compliance_checks Users can insert their own compliance checks; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own compliance checks" ON public.prompt_compliance_checks FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: prompt_history Users can insert their own history; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own history" ON public.prompt_history FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: leaderboard Users can insert their own leaderboard entry; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own leaderboard entry" ON public.leaderboard FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: analytics_metrics Users can insert their own metrics; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own metrics" ON public.analytics_metrics FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: prompt_performance Users can insert their own performance; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own performance" ON public.prompt_performance FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: user_preferences Users can insert their own preferences; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own preferences" ON public.user_preferences FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: profiles Users can insert their own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK ((auth.uid() = id));


--
-- Name: prompt_nodes Users can insert their own prompt nodes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own prompt nodes" ON public.prompt_nodes FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: user_subscriptions Users can insert their own subscription; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own subscription" ON public.user_subscriptions FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: usage_tracking Users can insert their own usage; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own usage" ON public.usage_tracking FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: ab_test_experiments Users can manage their own experiments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can manage their own experiments" ON public.ab_test_experiments USING ((auth.uid() = user_id));


--
-- Name: ai_learning_patterns Users can manage their own learning patterns; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can manage their own learning patterns" ON public.ai_learning_patterns USING ((auth.uid() = user_id));


--
-- Name: learned_patterns Users can manage their own patterns; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can manage their own patterns" ON public.learned_patterns USING ((auth.uid() = user_id));


--
-- Name: predictive_models Users can manage their own predictive models; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can manage their own predictive models" ON public.predictive_models USING ((auth.uid() = user_id));


--
-- Name: user_preferences Users can manage their own preferences; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can manage their own preferences" ON public.user_preferences USING ((auth.uid() = user_id));


--
-- Name: optimization_recommendations Users can manage their own recommendations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can manage their own recommendations" ON public.optimization_recommendations USING ((auth.uid() = user_id));


--
-- Name: prompt_stars Users can star prompts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can star prompts" ON public.prompt_stars FOR INSERT TO authenticated WITH CHECK ((auth.uid() = user_id));


--
-- Name: prompt_stars Users can unstar prompts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can unstar prompts" ON public.prompt_stars FOR DELETE TO authenticated USING ((auth.uid() = user_id));


--
-- Name: ai_insights Users can update their own AI insights; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own AI insights" ON public.ai_insights FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: api_keys Users can update their own API keys; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own API keys" ON public.api_keys FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: prompt_agents Users can update their own agents; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own agents" ON public.prompt_agents FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: predictive_alerts Users can update their own alerts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own alerts" ON public.predictive_alerts FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: compliance_monitoring Users can update their own compliance issues; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own compliance issues" ON public.compliance_monitoring FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: agent_conversations Users can update their own conversations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own conversations" ON public.agent_conversations FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: prompt_feedback Users can update their own feedback; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own feedback" ON public.prompt_feedback FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: prompt_history Users can update their own history; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own history" ON public.prompt_history FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: leaderboard Users can update their own leaderboard entry; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own leaderboard entry" ON public.leaderboard FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: auto_optimization_jobs Users can update their own optimization jobs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own optimization jobs" ON public.auto_optimization_jobs FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: prompt_performance Users can update their own performance; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own performance" ON public.prompt_performance FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: user_personas Users can update their own personas; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own personas" ON public.user_personas FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: user_preferences Users can update their own preferences; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own preferences" ON public.user_preferences FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: profiles Users can update their own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE TO authenticated USING ((auth.uid() = id)) WITH CHECK ((auth.uid() = id));


--
-- Name: prompt_nodes Users can update their own prompt nodes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own prompt nodes" ON public.prompt_nodes FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: prompt_ratings Users can update their own ratings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own ratings" ON public.prompt_ratings FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: personalized_recommendations Users can update their own recommendations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own recommendations" ON public.personalized_recommendations FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: user_subscriptions Users can update their own subscription; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own subscription" ON public.user_subscriptions FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: ab_tests Users can update their own tests; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own tests" ON public.ab_tests FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: prompt_topics Users can update their own topics; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own topics" ON public.prompt_topics FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: prompt_variations Users can update their own variations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own variations" ON public.prompt_variations FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: saved_workflows Users can update their own workflows; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own workflows" ON public.saved_workflows FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: prompt_ratings Users can view all ratings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view all ratings" ON public.prompt_ratings FOR SELECT USING (true);


--
-- Name: prompt_topic_links Users can view links for their prompts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view links for their prompts" ON public.prompt_topic_links FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.prompt_nodes
  WHERE ((prompt_nodes.id = prompt_topic_links.prompt_id) AND (prompt_nodes.user_id = auth.uid())))));


--
-- Name: user_achievements Users can view others' achievements; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view others' achievements" ON public.user_achievements FOR SELECT USING (true);


--
-- Name: prompt_agents Users can view public agents; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view public agents" ON public.prompt_agents FOR SELECT USING ((is_public = true));


--
-- Name: prompt_relationships Users can view relationships for their prompts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view relationships for their prompts" ON public.prompt_relationships FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.prompt_nodes
  WHERE ((prompt_nodes.id = prompt_relationships.source_prompt_id) AND (prompt_nodes.user_id = auth.uid())))));


--
-- Name: ab_test_results Users can view results for their tests; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view results for their tests" ON public.ab_test_results FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.ab_tests
  WHERE ((ab_tests.id = ab_test_results.test_id) AND (ab_tests.user_id = auth.uid())))));


--
-- Name: prompt_metrics Users can view their metrics; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their metrics" ON public.prompt_metrics FOR SELECT TO authenticated USING ((user_id = auth.uid()));


--
-- Name: ai_insights Users can view their own AI insights; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own AI insights" ON public.ai_insights FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: api_key_audit_logs Users can view their own API key audit logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own API key audit logs" ON public.api_key_audit_logs FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: api_keys Users can view their own API keys; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own API keys" ON public.api_keys FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: user_achievements Users can view their own achievements; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own achievements" ON public.user_achievements FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: user_activity Users can view their own activity; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own activity" ON public.user_activity FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: prompt_agents Users can view their own agents; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own agents" ON public.prompt_agents FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: predictive_alerts Users can view their own alerts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own alerts" ON public.predictive_alerts FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: agent_analytics Users can view their own analytics; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own analytics" ON public.agent_analytics FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: prompt_audit_logs Users can view their own audit logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own audit logs" ON public.prompt_audit_logs FOR SELECT TO authenticated USING ((user_id = auth.uid()));


--
-- Name: user_behavior Users can view their own behavior; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own behavior" ON public.user_behavior FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: benchmark_results Users can view their own benchmarks; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own benchmarks" ON public.benchmark_results FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: profiles Users can view their own complete profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own complete profile" ON public.profiles FOR SELECT TO authenticated USING ((auth.uid() = id));


--
-- Name: prompt_compliance_checks Users can view their own compliance checks; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own compliance checks" ON public.prompt_compliance_checks FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: compliance_monitoring Users can view their own compliance issues; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own compliance issues" ON public.compliance_monitoring FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: agent_conversations Users can view their own conversations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own conversations" ON public.agent_conversations FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: prompt_feedback Users can view their own feedback; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own feedback" ON public.prompt_feedback FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: prompt_history Users can view their own history; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own history" ON public.prompt_history FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: optimization_insights Users can view their own insights; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own insights" ON public.optimization_insights FOR SELECT USING (((auth.uid() = user_id) OR (user_id IS NULL)));


--
-- Name: prompt_network_insights Users can view their own insights; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own insights" ON public.prompt_network_insights FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: ai_learning_patterns Users can view their own learning patterns; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own learning patterns" ON public.ai_learning_patterns FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: team_members Users can view their own memberships; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own memberships" ON public.team_members FOR SELECT USING ((user_id = auth.uid()));


--
-- Name: analytics_metrics Users can view their own metrics; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own metrics" ON public.analytics_metrics FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: adaptive_models Users can view their own models; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own models" ON public.adaptive_models FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: auto_optimization_jobs Users can view their own optimization jobs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own optimization jobs" ON public.auto_optimization_jobs FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: learned_patterns Users can view their own patterns; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own patterns" ON public.learned_patterns FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: prompt_performance Users can view their own performance; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own performance" ON public.prompt_performance FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: user_personas Users can view their own personas; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own personas" ON public.user_personas FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: predictive_models Users can view their own predictive models; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own predictive models" ON public.predictive_models FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: user_preferences Users can view their own preferences; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own preferences" ON public.user_preferences FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: prompt_nodes Users can view their own prompt nodes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own prompt nodes" ON public.prompt_nodes FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: optimization_recommendations Users can view their own recommendations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own recommendations" ON public.optimization_recommendations FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: personalized_recommendations Users can view their own recommendations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own recommendations" ON public.personalized_recommendations FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: user_roles Users can view their own roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own roles" ON public.user_roles FOR SELECT TO authenticated USING ((auth.uid() = user_id));


--
-- Name: user_subscriptions Users can view their own subscription; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own subscription" ON public.user_subscriptions FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: context_suggestions Users can view their own suggestions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own suggestions" ON public.context_suggestions FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: ab_tests Users can view their own tests; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own tests" ON public.ab_tests FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: prompt_topics Users can view their own topics; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own topics" ON public.prompt_topics FOR SELECT USING (((user_id = auth.uid()) OR (user_id IS NULL)));


--
-- Name: usage_tracking Users can view their own usage; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own usage" ON public.usage_tracking FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: prompt_variations Users can view their own variations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own variations" ON public.prompt_variations FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: saved_workflows Users can view their own workflows; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own workflows" ON public.saved_workflows FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: prompt_versions Users can view versions of their prompts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view versions of their prompts" ON public.prompt_versions FOR SELECT TO authenticated USING ((created_by = auth.uid()));


--
-- Name: rating_votes Users can vote on ratings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can vote on ratings" ON public.rating_votes FOR INSERT TO authenticated WITH CHECK ((auth.uid() = user_id));


--
-- Name: ab_test_experiments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ab_test_experiments ENABLE ROW LEVEL SECURITY;

--
-- Name: ab_test_results; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ab_test_results ENABLE ROW LEVEL SECURITY;

--
-- Name: ab_tests; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ab_tests ENABLE ROW LEVEL SECURITY;

--
-- Name: adaptive_models; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.adaptive_models ENABLE ROW LEVEL SECURITY;

--
-- Name: admin_emails; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.admin_emails ENABLE ROW LEVEL SECURITY;

--
-- Name: agent_analytics; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.agent_analytics ENABLE ROW LEVEL SECURITY;

--
-- Name: agent_conversations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.agent_conversations ENABLE ROW LEVEL SECURITY;

--
-- Name: ai_insights; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ai_insights ENABLE ROW LEVEL SECURITY;

--
-- Name: ai_learning_patterns; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ai_learning_patterns ENABLE ROW LEVEL SECURITY;

--
-- Name: analytics_metrics; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.analytics_metrics ENABLE ROW LEVEL SECURITY;

--
-- Name: api_key_audit_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.api_key_audit_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: api_keys; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

--
-- Name: auto_optimization_jobs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.auto_optimization_jobs ENABLE ROW LEVEL SECURITY;

--
-- Name: badges; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.badges ENABLE ROW LEVEL SECURITY;

--
-- Name: benchmark_results; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.benchmark_results ENABLE ROW LEVEL SECURITY;

--
-- Name: bias_filters; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.bias_filters ENABLE ROW LEVEL SECURITY;

--
-- Name: compliance_monitoring; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.compliance_monitoring ENABLE ROW LEVEL SECURITY;

--
-- Name: compliance_rules; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.compliance_rules ENABLE ROW LEVEL SECURITY;

--
-- Name: compliance_violations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.compliance_violations ENABLE ROW LEVEL SECURITY;

--
-- Name: context_suggestions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.context_suggestions ENABLE ROW LEVEL SECURITY;

--
-- Name: global_insights; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.global_insights ENABLE ROW LEVEL SECURITY;

--
-- Name: global_prompt_patterns; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.global_prompt_patterns ENABLE ROW LEVEL SECURITY;

--
-- Name: global_topic_trends; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.global_topic_trends ENABLE ROW LEVEL SECURITY;

--
-- Name: industry_templates; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.industry_templates ENABLE ROW LEVEL SECURITY;

--
-- Name: leaderboard; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.leaderboard ENABLE ROW LEVEL SECURITY;

--
-- Name: learned_patterns; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.learned_patterns ENABLE ROW LEVEL SECURITY;

--
-- Name: legal_prompt_packs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.legal_prompt_packs ENABLE ROW LEVEL SECURITY;

--
-- Name: marketplace_listings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.marketplace_listings ENABLE ROW LEVEL SECURITY;

--
-- Name: optimization_insights; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.optimization_insights ENABLE ROW LEVEL SECURITY;

--
-- Name: optimization_recommendations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.optimization_recommendations ENABLE ROW LEVEL SECURITY;

--
-- Name: persona_templates; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.persona_templates ENABLE ROW LEVEL SECURITY;

--
-- Name: personalized_recommendations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.personalized_recommendations ENABLE ROW LEVEL SECURITY;

--
-- Name: predictive_alerts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.predictive_alerts ENABLE ROW LEVEL SECURITY;

--
-- Name: predictive_models; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.predictive_models ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: prompt_agents; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.prompt_agents ENABLE ROW LEVEL SECURITY;

--
-- Name: prompt_audit_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.prompt_audit_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: prompt_compliance_checks; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.prompt_compliance_checks ENABLE ROW LEVEL SECURITY;

--
-- Name: prompt_deployments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.prompt_deployments ENABLE ROW LEVEL SECURITY;

--
-- Name: prompt_feedback; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.prompt_feedback ENABLE ROW LEVEL SECURITY;

--
-- Name: prompt_history; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.prompt_history ENABLE ROW LEVEL SECURITY;

--
-- Name: prompt_metrics; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.prompt_metrics ENABLE ROW LEVEL SECURITY;

--
-- Name: prompt_network_insights; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.prompt_network_insights ENABLE ROW LEVEL SECURITY;

--
-- Name: prompt_nodes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.prompt_nodes ENABLE ROW LEVEL SECURITY;

--
-- Name: prompt_performance; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.prompt_performance ENABLE ROW LEVEL SECURITY;

--
-- Name: prompt_purchases; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.prompt_purchases ENABLE ROW LEVEL SECURITY;

--
-- Name: prompt_ratings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.prompt_ratings ENABLE ROW LEVEL SECURITY;

--
-- Name: prompt_relationships; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.prompt_relationships ENABLE ROW LEVEL SECURITY;

--
-- Name: prompt_stars; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.prompt_stars ENABLE ROW LEVEL SECURITY;

--
-- Name: prompt_topic_links; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.prompt_topic_links ENABLE ROW LEVEL SECURITY;

--
-- Name: prompt_topics; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.prompt_topics ENABLE ROW LEVEL SECURITY;

--
-- Name: prompt_variations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.prompt_variations ENABLE ROW LEVEL SECURITY;

--
-- Name: prompt_versions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.prompt_versions ENABLE ROW LEVEL SECURITY;

--
-- Name: rating_votes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.rating_votes ENABLE ROW LEVEL SECURITY;

--
-- Name: saved_workflows; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.saved_workflows ENABLE ROW LEVEL SECURITY;

--
-- Name: subscription_plans; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;

--
-- Name: team_members; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

--
-- Name: team_prompts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.team_prompts ENABLE ROW LEVEL SECURITY;

--
-- Name: teams; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;

--
-- Name: usage_tracking; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.usage_tracking ENABLE ROW LEVEL SECURITY;

--
-- Name: user_achievements; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;

--
-- Name: user_activity; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_activity ENABLE ROW LEVEL SECURITY;

--
-- Name: user_behavior; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_behavior ENABLE ROW LEVEL SECURITY;

--
-- Name: user_personas; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_personas ENABLE ROW LEVEL SECURITY;

--
-- Name: user_preferences; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

--
-- Name: user_roles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

--
-- Name: user_subscriptions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--


