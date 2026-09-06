-- Run this in the Supabase SQL editor for a new/empty Wayfind project.
-- Kept here for reference; there's no automated migration runner, so this
-- is the source of truth for what should exist in the database.

create table mentee_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  seeking_guidance_on text not null,
  circumstance_tags text[] not null default '{}',
  other_tag_text text,
  bio text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table mentee_profiles enable row level security;

create policy "Mentee profiles are viewable by any authenticated user"
  on mentee_profiles for select
  to authenticated
  using (true);

create policy "Users can insert their own mentee profile"
  on mentee_profiles for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users can update their own mentee profile"
  on mentee_profiles for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create table mentor_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  mentors_in text not null,
  background text not null,
  background_tags text[] not null default '{}',
  other_tag_text text,
  availability_count int not null default 1,
  bio text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table mentor_profiles enable row level security;

create policy "Mentor profiles are viewable by any authenticated user"
  on mentor_profiles for select
  to authenticated
  using (true);

create policy "Users can insert their own mentor profile"
  on mentor_profiles for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users can update their own mentor profile"
  on mentor_profiles for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Ranked preference lists for Gale-Shapley matching. Unlike profiles,
-- these are private - a user's own ranking of the other side should never
-- be visible to anyone but them (and later, the backend's admin client
-- when the actual matching run happens).
create table mentee_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  ranked_mentor_ids uuid[] not null default '{}',
  locked boolean not null default false,
  updated_at timestamptz not null default now()
);

alter table mentee_preferences enable row level security;

create policy "Users can view their own mentee preferences"
  on mentee_preferences for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can insert their own mentee preferences"
  on mentee_preferences for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users can update their own mentee preferences"
  on mentee_preferences for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create table mentor_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  ranked_mentee_ids uuid[] not null default '{}',
  locked boolean not null default false,
  updated_at timestamptz not null default now()
);

alter table mentor_preferences enable row level security;

create policy "Users can view their own mentor preferences"
  on mentor_preferences for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can insert their own mentor preferences"
  on mentor_preferences for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users can update their own mentor preferences"
  on mentor_preferences for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
