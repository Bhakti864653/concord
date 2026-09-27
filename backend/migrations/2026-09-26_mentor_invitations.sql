-- Mentor invitations and explicit mentor participation.
--
-- "Open enrollment, closed matching": anyone can register, but a mentor is only shown to mentees,
-- rankable, and matchable after they complete onboarding, consent to being shown, and opt into
-- matching. People who are only invited are never profiles at all - they exist solely as
-- mentor_invitations rows, which nothing in the matching engine reads.
--
-- Run once in the Supabase SQL editor. Safe to re-run (every statement is idempotent).

------------------------------------------------------------------------------------------------
-- 1. Mentor participation state
------------------------------------------------------------------------------------------------
alter table mentor_profiles add column if not exists onboarding_completed_at timestamptz;
alter table mentor_profiles add column if not exists visible_to_mentees boolean not null default false;
alter table mentor_profiles add column if not exists matching_opted_in_at timestamptz;
-- Set only by the operator (service role). A suspended mentor is never eligible.
alter table mentor_profiles add column if not exists suspended_at timestamptz;

-- Existing mentors joined under the previous rules, where creating a mentor profile (with a
-- capacity) *was* the act of joining matching. Carry that over so they don't silently vanish from
-- matching. New mentors from now on must opt in explicitly. Only touches rows never set before.
update mentor_profiles
set onboarding_completed_at = created_at,
    visible_to_mentees = true,
    matching_opted_in_at = created_at
where onboarding_completed_at is null
  and matching_opted_in_at is null
  and visible_to_mentees = false;

-- Participation flags are written only by the backend (service role), after it has checked every
-- onboarding step. Signed-in users keep insert/update rights on their own profile content, but
-- no longer on these columns. (RLS "own row" policies are unchanged; this narrows the columns.)
revoke insert, update on mentor_profiles from anon, authenticated;
grant insert (user_id, mentors_in, background, background_tags, other_tag_text, availability_count, bio)
  on mentor_profiles to authenticated;
grant update (mentors_in, background, background_tags, other_tag_text, availability_count, bio, updated_at)
  on mentor_profiles to authenticated;

------------------------------------------------------------------------------------------------
-- 2. Invitations
------------------------------------------------------------------------------------------------
create table if not exists mentor_invitations (
  id uuid primary key default gen_random_uuid(),
  inviter_user_id uuid not null references auth.users(id) on delete cascade,
  -- Keyed hash of a lowercased email, only if one was given. The address itself is never stored,
  -- because nothing sends email (links are shared by the inviter).
  invited_email_hash text,
  safe_display_name text not null check (char_length(safe_display_name) between 1 and 80),
  organization_or_field text check (char_length(organization_or_field) <= 120),
  invitation_message text check (char_length(invitation_message) <= 500),
  -- Shown on the invitation page only if the inviter chose to share it.
  inviter_display_name text check (char_length(inviter_display_name) <= 40),
  -- sha256 of the random token. The raw token exists only in the link the inviter shares.
  token_hash text unique,
  status text not null default 'draft' check (
    status in ('draft', 'ready_to_share', 'sent', 'opened', 'accepted', 'declined', 'expired', 'revoked')
  ),
  expires_at timestamptz,
  opened_at timestamptz,
  accepted_at timestamptz,
  declined_at timestamptz,
  revoked_at timestamptz,
  claimed_by_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists mentor_invitations_inviter_idx on mentor_invitations (inviter_user_id);

alter table mentor_invitations enable row level security;

-- An inviter can read their own invitations (the app reads them through the backend, which
-- applies the same ownership check). There are deliberately no insert/update/delete policies:
-- creating, confirming, revoking, opening, declining, and claiming all go through server logic
-- that hashes tokens, enforces rate limits, and validates each status change. Nobody can mark an
-- invitation accepted by writing to the table.
drop policy if exists "Inviters can view their own invitations" on mentor_invitations;
create policy "Inviters can view their own invitations"
  on mentor_invitations for select
  to authenticated
  using (auth.uid() = inviter_user_id);

-- Column-level: even their own row never exposes the token hash, the email hash, or who claimed it.
revoke all on mentor_invitations from anon, authenticated;
grant select (id, inviter_user_id, safe_display_name, organization_or_field, invitation_message,
              inviter_display_name, status, expires_at, opened_at, accepted_at, declined_at,
              revoked_at, created_at, updated_at)
  on mentor_invitations to authenticated;
