-- PromptX Memory System Migration
-- Adds tables for comprehensive user memory and behavior tracking

-- User Memory Table
CREATE TABLE IF NOT EXISTS public.user_memory (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    memory_key text NOT NULL,
    memory_value text NOT NULL,
    memory_type text NOT NULL CHECK (memory_type IN ('fact', 'preference', 'context', 'history', 'tone', 'style', 'project', 'workflow', 'contact')),
    category text,
    confidence numeric DEFAULT 1.0 CHECK (confidence >= 0 AND confidence <= 1),
    source text DEFAULT 'user', -- 'user', 'learned', 'imported'
    expires_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Chat Sessions Table
CREATE TABLE IF NOT EXISTS public.chat_sessions (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    session_id text NOT NULL,
    messages jsonb DEFAULT '[]'::jsonb NOT NULL,
    context_summary text,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    ended_at timestamp with time zone,
    metadata jsonb DEFAULT '{}'::jsonb
);

-- User Behavior Analytics Table
CREATE TABLE IF NOT EXISTS public.user_behavior_analytics (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    behavior_type text NOT NULL CHECK (behavior_type IN ('panel_open', 'model_used', 'agent_used', 'feature_used', 'workflow_run')),
    target_id text NOT NULL,
    count integer DEFAULT 1,
    last_used_at timestamp with time zone DEFAULT now(),
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    UNIQUE(user_id, behavior_type, target_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_memory_user_id ON public.user_memory(user_id);
CREATE INDEX IF NOT EXISTS idx_user_memory_type ON public.user_memory(memory_type);
CREATE INDEX IF NOT EXISTS idx_user_memory_user_type ON public.user_memory(user_id, memory_type);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_id ON public.chat_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_session_id ON public.chat_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_user_behavior_user_id ON public.user_behavior_analytics(user_id);
CREATE INDEX IF NOT EXISTS idx_user_behavior_type ON public.user_behavior_analytics(behavior_type);

-- Updated at trigger for user_memory
CREATE TRIGGER update_user_memory_updated_at 
    BEFORE UPDATE ON public.user_memory 
    FOR EACH ROW 
    EXECUTE FUNCTION public.update_updated_at_column();

-- Row Level Security
ALTER TABLE public.user_memory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_behavior_analytics ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_memory
CREATE POLICY "Users can view their own memories" 
    ON public.user_memory FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own memories" 
    ON public.user_memory FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own memories" 
    ON public.user_memory FOR UPDATE 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own memories" 
    ON public.user_memory FOR DELETE 
    USING (auth.uid() = user_id);

-- RLS Policies for chat_sessions
CREATE POLICY "Users can view their own chat sessions" 
    ON public.chat_sessions FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own chat sessions" 
    ON public.chat_sessions FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own chat sessions" 
    ON public.chat_sessions FOR UPDATE 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own chat sessions" 
    ON public.chat_sessions FOR DELETE 
    USING (auth.uid() = user_id);

-- RLS Policies for user_behavior_analytics
CREATE POLICY "Users can view their own behavior" 
    ON public.user_behavior_analytics FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own behavior" 
    ON public.user_behavior_analytics FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own behavior" 
    ON public.user_behavior_analytics FOR UPDATE 
    USING (auth.uid() = user_id);

-- Extend user_preferences with additional fields (if not exists)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_preferences' AND column_name = 'favorite_models') THEN
        ALTER TABLE public.user_preferences ADD COLUMN favorite_models text[] DEFAULT '{}';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_preferences' AND column_name = 'favorite_agents') THEN
        ALTER TABLE public.user_preferences ADD COLUMN favorite_agents text[] DEFAULT '{}';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_preferences' AND column_name = 'communication_style') THEN
        ALTER TABLE public.user_preferences ADD COLUMN communication_style text;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_preferences' AND column_name = 'projects') THEN
        ALTER TABLE public.user_preferences ADD COLUMN projects jsonb DEFAULT '[]'::jsonb;
    END IF;
END $$;
