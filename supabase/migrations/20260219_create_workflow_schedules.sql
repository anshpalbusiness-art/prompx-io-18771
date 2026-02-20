-- Workflow Schedules table for server-side scheduled execution
CREATE TABLE IF NOT EXISTS public.workflow_schedules (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    workflow_id UUID NOT NULL REFERENCES public.saved_workflows(id) ON DELETE CASCADE,
    workflow_title TEXT NOT NULL DEFAULT '',
    interval TEXT NOT NULL DEFAULT 'daily',
    next_run BIGINT NOT NULL,
    last_run BIGINT,
    last_status TEXT DEFAULT 'pending',
    enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE public.workflow_schedules ENABLE ROW LEVEL SECURITY;

-- Users can manage their own schedules
CREATE POLICY "Users can view own schedules"
    ON public.workflow_schedules FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own schedules"
    ON public.workflow_schedules FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own schedules"
    ON public.workflow_schedules FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own schedules"
    ON public.workflow_schedules FOR DELETE
    USING (auth.uid() = user_id);
