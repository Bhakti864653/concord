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

-- Shared session notes for a matched pair - same participants-only
-- pattern as messages, written directly from the frontend.
create table match_notes (
  id uuid primary key default gen_random_uuid(),
  match_mentee_id uuid not null references matches(mentee_user_id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now()
);

create index match_notes_match_mentee_id_created_at_idx on match_notes (match_mentee_id, created_at);

alter table match_notes enable row level security;

create policy "Match participants can read notes"
  on match_notes for select
  to authenticated
  using (
    exists (
      select 1 from matches m
      where m.mentee_user_id = match_notes.match_mentee_id
        and (m.mentee_user_id = auth.uid() or m.mentor_user_id = auth.uid())
    )
  );

create policy "Match participants can add notes"
  on match_notes for insert
  to authenticated
  with check (
    author_id = auth.uid()
    and exists (
      select 1 from matches m
      where m.mentee_user_id = match_notes.match_mentee_id
        and (m.mentee_user_id = auth.uid() or m.mentor_user_id = auth.uid())
    )
  );

-- Notifications are never inserted by app code - two triggers below create
-- them whenever a match or message row is inserted, so a notification
-- fires regardless of what actually did the insert (the backend's admin
-- client for matches, a direct client insert with the anon key for
-- messages). No insert policy for regular users; only select/update.
create table notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null,
  payload jsonb not null default '{}',
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index notifications_user_id_read_at_idx on notifications (user_id, read_at);

alter table notifications enable row level security;

create policy "Users can view their own notifications"
  on notifications for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can mark their own notifications read"
  on notifications for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create or replace function notify_new_match() returns trigger as $$
begin
  insert into notifications (user_id, kind, payload)
  values (
    new.mentee_user_id, 'match_created',
    jsonb_build_object('match_mentee_id', new.mentee_user_id, 'mentor_user_id', new.mentor_user_id)
  );
  insert into notifications (user_id, kind, payload)
  values (
    new.mentor_user_id, 'match_created',
    jsonb_build_object('match_mentee_id', new.mentee_user_id, 'mentor_user_id', new.mentor_user_id)
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_match_created
  after insert on matches
  for each row execute function notify_new_match();

create or replace function notify_new_message() returns trigger as $$
declare
  recipient uuid;
begin
  select case when m.mentee_user_id = new.sender_id then m.mentor_user_id else m.mentee_user_id end
  into recipient
  from matches m
  where m.mentee_user_id = new.match_mentee_id;

  if recipient is not null then
    insert into notifications (user_id, kind, payload)
    values (
      recipient, 'new_message',
      jsonb_build_object('match_mentee_id', new.match_mentee_id, 'message_id', new.id)
    );
  end if;
  return new;
end;
$$ language plpgsql security definer;

create trigger on_message_created
  after insert on messages
  for each row execute function notify_new_message();

-- Lets the notification bell subscribe to new rows the same way chat does.
alter publication supabase_realtime add table notifications;

-- Shared goals for a matched pair, capped at 3 (enforced by a trigger,
-- since a check constraint can't count sibling rows). Same
-- participants-only RLS shape as match_notes, but both sides can also
-- update/delete since a goal is jointly owned, not append-only.
create table match_goals (
  id uuid primary key default gen_random_uuid(),
  match_mentee_id uuid not null references matches(mentee_user_id) on delete cascade,
  title text not null check (char_length(title) between 1 and 300),
  deadline date,
  notes text check (notes is null or char_length(notes) <= 2000),
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index match_goals_match_mentee_id_idx on match_goals (match_mentee_id);

alter table match_goals enable row level security;

create policy "Match participants can read goals"
  on match_goals for select
  to authenticated
  using (
    exists (
      select 1 from matches m
      where m.mentee_user_id = match_goals.match_mentee_id
        and (m.mentee_user_id = auth.uid() or m.mentor_user_id = auth.uid())
    )
  );

create policy "Match participants can add goals"
  on match_goals for insert
  to authenticated
  with check (
    created_by = auth.uid()
    and exists (
      select 1 from matches m
      where m.mentee_user_id = match_goals.match_mentee_id
        and (m.mentee_user_id = auth.uid() or m.mentor_user_id = auth.uid())
    )
  );

create policy "Match participants can edit goals"
  on match_goals for update
  to authenticated
  using (
    exists (
      select 1 from matches m
      where m.mentee_user_id = match_goals.match_mentee_id
        and (m.mentee_user_id = auth.uid() or m.mentor_user_id = auth.uid())
    )
  )
  with check (
    exists (
      select 1 from matches m
      where m.mentee_user_id = match_goals.match_mentee_id
        and (m.mentee_user_id = auth.uid() or m.mentor_user_id = auth.uid())
    )
  );

create policy "Match participants can delete goals"
  on match_goals for delete
  to authenticated
  using (
    exists (
      select 1 from matches m
      where m.mentee_user_id = match_goals.match_mentee_id
        and (m.mentee_user_id = auth.uid() or m.mentor_user_id = auth.uid())
    )
  );

create or replace function enforce_max_goals_per_match() returns trigger as $$
begin
  if (select count(*) from match_goals where match_mentee_id = new.match_mentee_id) >= 3 then
    raise exception 'A match can have at most 3 shared goals';
  end if;
  return new;
end;
$$ language plpgsql;

create trigger on_goal_insert_check_max
  before insert on match_goals
  for each row execute function enforce_max_goals_per_match();

-- Milestones belong to one goal, with no direct link to a match row - RLS
-- reaches the pair's identity by joining through match_goals -> matches.
create table match_milestones (
  id uuid primary key default gen_random_uuid(),
  goal_id uuid not null references match_goals(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 300),
  done boolean not null default false,
  created_at timestamptz not null default now()
);

create index match_milestones_goal_id_idx on match_milestones (goal_id);

alter table match_milestones enable row level security;

create policy "Match participants can read milestones"
  on match_milestones for select
  to authenticated
  using (
    exists (
      select 1 from match_goals g
      join matches m on m.mentee_user_id = g.match_mentee_id
      where g.id = match_milestones.goal_id
        and (m.mentee_user_id = auth.uid() or m.mentor_user_id = auth.uid())
    )
  );

create policy "Match participants can add milestones"
  on match_milestones for insert
  to authenticated
  with check (
    exists (
      select 1 from match_goals g
      join matches m on m.mentee_user_id = g.match_mentee_id
      where g.id = match_milestones.goal_id
        and (m.mentee_user_id = auth.uid() or m.mentor_user_id = auth.uid())
    )
  );

create policy "Match participants can edit milestones"
  on match_milestones for update
  to authenticated
  using (
    exists (
      select 1 from match_goals g
      join matches m on m.mentee_user_id = g.match_mentee_id
      where g.id = match_milestones.goal_id
        and (m.mentee_user_id = auth.uid() or m.mentor_user_id = auth.uid())
    )
  )
  with check (
    exists (
      select 1 from match_goals g
      join matches m on m.mentee_user_id = g.match_mentee_id
      where g.id = match_milestones.goal_id
        and (m.mentee_user_id = auth.uid() or m.mentor_user_id = auth.uid())
    )
  );

create policy "Match participants can delete milestones"
  on match_milestones for delete
  to authenticated
  using (
    exists (
      select 1 from match_goals g
      join matches m on m.mentee_user_id = g.match_mentee_id
      where g.id = match_milestones.goal_id
        and (m.mentee_user_id = auth.uid() or m.mentor_user_id = auth.uid())
    )
  );

-- An actual scheduled date+time for a session, distinct from the loose
-- day/time-of-day `availability` tags - gives post-session check-ins
-- something concrete to compute "has this passed" against. Either
-- participant can log one; same participants-only shape as match_goals,
-- no update policy since a session is just a timestamp (delete-and-redo
-- covers "I got the time wrong").
create table match_sessions (
  id uuid primary key default gen_random_uuid(),
  match_mentee_id uuid not null references matches(mentee_user_id) on delete cascade,
  scheduled_for timestamptz not null,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create index match_sessions_match_mentee_id_idx on match_sessions (match_mentee_id, scheduled_for);

alter table match_sessions enable row level security;

create policy "Match participants can read sessions"
  on match_sessions for select
  to authenticated
  using (
    exists (
      select 1 from matches m
      where m.mentee_user_id = match_sessions.match_mentee_id
        and (m.mentee_user_id = auth.uid() or m.mentor_user_id = auth.uid())
    )
  );

create policy "Match participants can add sessions"
  on match_sessions for insert
  to authenticated
  with check (
    created_by = auth.uid()
    and exists (
      select 1 from matches m
      where m.mentee_user_id = match_sessions.match_mentee_id
        and (m.mentee_user_id = auth.uid() or m.mentor_user_id = auth.uid())
    )
  );

create policy "Match participants can delete sessions"
  on match_sessions for delete
  to authenticated
  using (
    exists (
      select 1 from matches m
      where m.mentee_user_id = match_sessions.match_mentee_id
        and (m.mentee_user_id = auth.uid() or m.mentor_user_id = auth.uid())
    )
  );

-- Private post-session check-ins - deliberately NOT participants-scoped
-- like every other match_* table above: a check-in is only ever visible to
-- the person who wrote it, never their match partner, so RLS is scoped to
-- auth.uid() = user_id alone. One check-in per user per session.
create table session_checkins (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references match_sessions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  did_happen boolean not null,
  helpfulness int check (helpfulness between 1 and 5),
  continue_wanted boolean not null,
  focus_next text check (focus_next is null or char_length(focus_next) <= 1000),
  created_at timestamptz not null default now(),
  unique (session_id, user_id)
);

create index session_checkins_user_id_idx on session_checkins (user_id);

alter table session_checkins enable row level security;

create policy "Users can read their own check-ins"
  on session_checkins for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can add their own check-ins"
  on session_checkins for insert
  to authenticated
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from match_sessions s
      join matches m on m.mentee_user_id = s.match_mentee_id
      where s.id = session_checkins.session_id
        and (m.mentee_user_id = auth.uid() or m.mentor_user_id = auth.uid())
    )
  );
