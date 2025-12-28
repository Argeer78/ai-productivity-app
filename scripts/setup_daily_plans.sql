-- Run this in your Supabase SQL Editor to enable the "Early Bird" badge data

create table if not exists daily_plans (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  plan_text text,
  created_at timestamptz default now()
);

-- Enable RLS
alter table daily_plans enable row level security;

-- Policies
create policy "Users can read own plans" 
  on daily_plans for select 
  using (auth.uid() = user_id);

create policy "Users can insert own plans" 
  on daily_plans for insert 
  with check (auth.uid() = user_id);

-- Optional: Index on user_id + created_at for faster dashboard loading
create index if not exists daily_plans_created_at_idx on daily_plans (user_id, created_at desc);
