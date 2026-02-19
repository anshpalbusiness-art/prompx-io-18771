-- ═══════════════════════ Workflow Templates ═══════════════════════
create table public.workflow_templates (
  id uuid not null default gen_random_uuid(),
  title text not null,
  description text,
  category text not null default 'general',
  tags text[] default '{}',
  nodes jsonb not null default '[]'::jsonb,
  edges jsonb not null default '[]'::jsonb,
  is_public boolean default false,
  use_count integer default 0,
  author_id uuid references auth.users(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  primary key (id)
);

-- Enable RLS
alter table public.workflow_templates enable row level security;

-- Anyone can read public templates
create policy "Public templates are viewable by all"
  on public.workflow_templates for select
  using (is_public = true);

-- Authenticated users can read their own (public or private)
create policy "Users can view their own templates"
  on public.workflow_templates for select
  using (auth.uid() = author_id);

-- Users can create templates
create policy "Users can create templates"
  on public.workflow_templates for insert
  with check (auth.uid() = author_id);

-- Users can update their own templates
create policy "Users can update own templates"
  on public.workflow_templates for update
  using (auth.uid() = author_id);

-- Users can delete their own templates
create policy "Users can delete own templates"
  on public.workflow_templates for delete
  using (auth.uid() = author_id);
