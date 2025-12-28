-- Create the app_reviews table
create table if not exists app_reviews (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id),
  rating smallint not null check (rating >= 1 and rating <= 5),
  comment text,
  source text default 'page', -- 'popup', 'page', etc.
  created_at timestamptz default now()
);

-- Enable RLS
alter table app_reviews enable row level security;

-- Policy: Anyone can insert (anonymous reviews allowed if user_id is null, or authenticated)
create policy "Anyone can insert reviews"
  on app_reviews for insert
  with check (true);

-- Policy: Users can only read their own reviews (or basic privacy)
create policy "Users can read own reviews"
  on app_reviews for select
  using ((select auth.uid()) = user_id);

-- Policy: Admin can read all (assuming service role or admin flag logic elsewhere, 
-- but for standard RLS, service role bypasses anyway. 
-- If you need specific admin user access via client, add that policy here.)
