-- Run this in the Supabase SQL editor for a new/empty Concord project.
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

-- Result of the most recent Gale-Shapley run. Written only by the backend's
-- admin client (an admin-gated endpoint, not directly by users), but each
-- side of a match should be able to see who they were paired with.
create table matches (
  mentee_user_id uuid primary key references mentee_profiles(user_id) on delete cascade,
  mentor_user_id uuid not null references mentor_profiles(user_id) on delete cascade,
  matched_at timestamptz not null default now()
);

alter table matches enable row level security;

create policy concord_matches_select
  on matches for select
  to authenticated
  using (auth.uid() = mentee_user_id or auth.uid() = mentor_user_id);

-- Direct messages between a matched pair. Written straight from the
-- frontend (not through the FastAPI backend) - RLS alone fully expresses
-- the access rule ("only the two people in this match, only as yourself"),
-- so there's no extra validation a backend round-trip would add. Uses
-- matches.mentee_user_id as the match's own id throughout, since it's
-- already unique per match.
create table messages (
  id uuid primary key default gen_random_uuid(),
  match_mentee_id uuid not null references matches(mentee_user_id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now()
);

create index messages_match_mentee_id_created_at_idx on messages (match_mentee_id, created_at);

alter table messages enable row level security;

create policy "Match participants can read their messages"
  on messages for select
  to authenticated
  using (
    exists (
      select 1 from matches m
      where m.mentee_user_id = messages.match_mentee_id
        and (m.mentee_user_id = auth.uid() or m.mentor_user_id = auth.uid())
    )
  );

create policy "Match participants can send messages"
  on messages for insert
  to authenticated
  with check (
    sender_id = auth.uid()
    and exists (
      select 1 from matches m
      where m.mentee_user_id = messages.match_mentee_id
        and (m.mentee_user_id = auth.uid() or m.mentor_user_id = auth.uid())
    )
  );

-- Lets Supabase Realtime broadcast new rows to subscribed clients (the chat
-- UI listens on this instead of polling).
alter publication supabase_realtime add table messages;

-- Simple day+time-of-day availability tags (e.g. "mon-evening"), not a
-- real calendar - written directly from the frontend, same reasoning as
-- messages. Everyone can manage their own row; a matched partner gets
-- read-only access to it too, so both sides of a match can see overlap.
create table availability (
  user_id uuid primary key references auth.users(id) on delete cascade,
  slots text[] not null default '{}',
  updated_at timestamptz not null default now()
);

alter table availability enable row level security;

create policy "Users manage their own availability"
  on availability for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Matched partners can view each other's availability"
  on availability for select
  to authenticated
  using (
    exists (
      select 1 from matches m
      where (m.mentee_user_id = auth.uid() and m.mentor_user_id = availability.user_id)
         or (m.mentor_user_id = auth.uid() and m.mentee_user_id = availability.user_id)
    )
  );
