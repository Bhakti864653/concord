-- Gives `matches` a real surrogate primary key instead of using
-- mentee_user_id as the PK. mentee_user_id being the PK meant a mentee
-- could only ever have one row in `matches`, ever - so any rematch/block
-- (which ends a match rather than deleting it) permanently blocked that
-- mentee from ever being matched again, crashing the actual matching run
-- with a primary-key violation. The partial unique index below replaces
-- the old PK's uniqueness with the real invariant: at most one *active*
-- match per mentee at a time, while ended matches (and their chat/notes/
-- goals/sessions) stick around as a real archive.
--
-- Run this once, as one block, in the Supabase SQL editor.

-- 1. Give matches a real id, keep mentee_user_id as a plain column. Drop
--    the dependent tables' old FKs (which point at the old PK index)
--    first, so dropping that old PK below doesn't fail on dependents.
alter table matches add column id uuid default gen_random_uuid();
update matches set id = gen_random_uuid() where id is null;
alter table matches alter column id set not null;
alter table messages drop constraint messages_match_mentee_id_fkey;
alter table match_notes drop constraint match_notes_match_mentee_id_fkey;
alter table match_goals drop constraint match_goals_match_mentee_id_fkey;
alter table match_sessions drop constraint match_sessions_match_mentee_id_fkey;
alter table rematch_requests drop constraint rematch_requests_match_mentee_id_fkey;
alter table reports drop constraint reports_match_mentee_id_fkey;
alter table matches drop constraint matches_pkey;
alter table matches add primary key (id);
create unique index matches_one_active_per_mentee on matches (mentee_user_id) where status = 'active';

-- 2. messages: has data - add match_id, backfill from the old FK, then drop the old column.
alter table messages add column match_id uuid references matches(id) on delete cascade;
update messages set match_id = m.id from matches m where m.mentee_user_id = messages.match_mentee_id;
alter table messages alter column match_id set not null;
drop index if exists messages_match_mentee_id_created_at_idx;
create index messages_match_id_created_at_idx on messages (match_id, created_at);
drop policy "Match participants can read their messages" on messages;
drop policy "Match participants can send messages" on messages;
create policy "Match participants can read their messages" on messages for select to authenticated using (exists (select 1 from matches m where m.id = messages.match_id and (m.mentee_user_id = auth.uid() or m.mentor_user_id = auth.uid())));
create policy "Match participants can send messages" on messages for insert to authenticated with check (sender_id = auth.uid() and exists (select 1 from matches m where m.id = messages.match_id and (m.mentee_user_id = auth.uid() or m.mentor_user_id = auth.uid())));
alter table messages drop column match_mentee_id;

-- 3. match_notes: empty - just swap the column, no backfill needed.
alter table match_notes add column match_id uuid references matches(id) on delete cascade;
alter table match_notes alter column match_id set not null;
drop index if exists match_notes_match_mentee_id_created_at_idx;
create index match_notes_match_id_created_at_idx on match_notes (match_id, created_at);
drop policy "Match participants can read notes" on match_notes;
drop policy "Match participants can add notes" on match_notes;
create policy "Match participants can read notes" on match_notes for select to authenticated using (exists (select 1 from matches m where m.id = match_notes.match_id and (m.mentee_user_id = auth.uid() or m.mentor_user_id = auth.uid())));
create policy "Match participants can add notes" on match_notes for insert to authenticated with check (author_id = auth.uid() and exists (select 1 from matches m where m.id = match_notes.match_id and (m.mentee_user_id = auth.uid() or m.mentor_user_id = auth.uid())));
alter table match_notes drop column match_mentee_id;

-- 4. match_goals: empty - swap the column, update the max-3 trigger function.
alter table match_goals add column match_id uuid references matches(id) on delete cascade;
alter table match_goals alter column match_id set not null;
drop index if exists match_goals_match_mentee_id_idx;
create index match_goals_match_id_idx on match_goals (match_id);
drop policy "Match participants can read goals" on match_goals;
drop policy "Match participants can add goals" on match_goals;
drop policy "Match participants can edit goals" on match_goals;
drop policy "Match participants can delete goals" on match_goals;
create policy "Match participants can read goals" on match_goals for select to authenticated using (exists (select 1 from matches m where m.id = match_goals.match_id and (m.mentee_user_id = auth.uid() or m.mentor_user_id = auth.uid())));
create policy "Match participants can add goals" on match_goals for insert to authenticated with check (created_by = auth.uid() and exists (select 1 from matches m where m.id = match_goals.match_id and (m.mentee_user_id = auth.uid() or m.mentor_user_id = auth.uid())));
create policy "Match participants can edit goals" on match_goals for update to authenticated using (exists (select 1 from matches m where m.id = match_goals.match_id and (m.mentee_user_id = auth.uid() or m.mentor_user_id = auth.uid()))) with check (exists (select 1 from matches m where m.id = match_goals.match_id and (m.mentee_user_id = auth.uid() or m.mentor_user_id = auth.uid())));
-- 5. match_milestones' policies join through match_goals.match_mentee_id -
--    re-point them at match_id BEFORE dropping that column below, or the
--    drop fails on this still-dependent policy.
drop policy "Match participants can read milestones" on match_milestones;
drop policy "Match participants can add milestones" on match_milestones;
drop policy "Match participants can edit milestones" on match_milestones;
drop policy "Match participants can delete milestones" on match_milestones;
create policy "Match participants can read milestones" on match_milestones for select to authenticated using (exists (select 1 from match_goals g join matches m on m.id = g.match_id where g.id = match_milestones.goal_id and (m.mentee_user_id = auth.uid() or m.mentor_user_id = auth.uid())));
create policy "Match participants can add milestones" on match_milestones for insert to authenticated with check (exists (select 1 from match_goals g join matches m on m.id = g.match_id where g.id = match_milestones.goal_id and (m.mentee_user_id = auth.uid() or m.mentor_user_id = auth.uid())));
create policy "Match participants can edit milestones" on match_milestones for update to authenticated using (exists (select 1 from match_goals g join matches m on m.id = g.match_id where g.id = match_milestones.goal_id and (m.mentee_user_id = auth.uid() or m.mentor_user_id = auth.uid()))) with check (exists (select 1 from match_goals g join matches m on m.id = g.match_id where g.id = match_milestones.goal_id and (m.mentee_user_id = auth.uid() or m.mentor_user_id = auth.uid())));
create policy "Match participants can delete milestones" on match_milestones for delete to authenticated using (exists (select 1 from match_goals g join matches m on m.id = g.match_id where g.id = match_milestones.goal_id and (m.mentee_user_id = auth.uid() or m.mentor_user_id = auth.uid())));

create policy "Match participants can delete goals" on match_goals for delete to authenticated using (exists (select 1 from matches m where m.id = match_goals.match_id and (m.mentee_user_id = auth.uid() or m.mentor_user_id = auth.uid())));
alter table match_goals drop column match_mentee_id;

create or replace function enforce_max_goals_per_match() returns trigger as $$
begin
  if (select count(*) from match_goals where match_id = new.match_id) >= 3 then
    raise exception 'A match can have at most 3 shared goals';
  end if;
  return new;
end;
$$ language plpgsql;

-- 6. match_sessions: empty - swap the column.
alter table match_sessions add column match_id uuid references matches(id) on delete cascade;
alter table match_sessions alter column match_id set not null;
drop index if exists match_sessions_match_mentee_id_idx;
create index match_sessions_match_id_idx on match_sessions (match_id, scheduled_for);
drop policy "Match participants can read sessions" on match_sessions;
drop policy "Match participants can add sessions" on match_sessions;
drop policy "Match participants can delete sessions" on match_sessions;
create policy "Match participants can read sessions" on match_sessions for select to authenticated using (exists (select 1 from matches m where m.id = match_sessions.match_id and (m.mentee_user_id = auth.uid() or m.mentor_user_id = auth.uid())));
create policy "Match participants can add sessions" on match_sessions for insert to authenticated with check (created_by = auth.uid() and exists (select 1 from matches m where m.id = match_sessions.match_id and (m.mentee_user_id = auth.uid() or m.mentor_user_id = auth.uid())));
create policy "Match participants can delete sessions" on match_sessions for delete to authenticated using (exists (select 1 from matches m where m.id = match_sessions.match_id and (m.mentee_user_id = auth.uid() or m.mentor_user_id = auth.uid())));

-- 7. session_checkins' insert policy joins through match_sessions.match_mentee_id -
--    re-point it BEFORE dropping that column below, same reasoning as milestones above.
drop policy "Users can add their own check-ins" on session_checkins;
create policy "Users can add their own check-ins" on session_checkins for insert to authenticated with check (auth.uid() = user_id and exists (select 1 from match_sessions s join matches m on m.id = s.match_id where s.id = session_checkins.session_id and (m.mentee_user_id = auth.uid() or m.mentor_user_id = auth.uid())));

alter table match_sessions drop column match_mentee_id;

-- 8. rematch_requests: has data - add match_id, backfill, drop the old column.
alter table rematch_requests add column match_id uuid references matches(id) on delete cascade;
update rematch_requests set match_id = m.id from matches m where m.mentee_user_id = rematch_requests.match_mentee_id;
alter table rematch_requests alter column match_id set not null;
alter table rematch_requests drop column match_mentee_id;

-- 9. reports: empty - swap the column.
alter table reports add column match_id uuid references matches(id) on delete cascade;
alter table reports alter column match_id set not null;
alter table reports drop column match_mentee_id;

-- 10. Notification-creating trigger functions: point at the new columns
--     and put the real match id in the payload instead of mentee_user_id.
create or replace function notify_new_match() returns trigger as $$
begin
  insert into notifications (user_id, kind, payload)
  values (new.mentee_user_id, 'match_created', jsonb_build_object('match_id', new.id, 'mentor_user_id', new.mentor_user_id));
  insert into notifications (user_id, kind, payload)
  values (new.mentor_user_id, 'match_created', jsonb_build_object('match_id', new.id, 'mentor_user_id', new.mentor_user_id));
  return new;
end;
$$ language plpgsql security definer;

create or replace function notify_new_message() returns trigger as $$
declare
  recipient uuid;
begin
  select case when m.mentee_user_id = new.sender_id then m.mentor_user_id else m.mentee_user_id end
  into recipient
  from matches m
  where m.id = new.match_id;

  if recipient is not null then
    insert into notifications (user_id, kind, payload)
    values (recipient, 'new_message', jsonb_build_object('match_id', new.match_id, 'message_id', new.id));
  end if;
  return new;
end;
$$ language plpgsql security definer;
