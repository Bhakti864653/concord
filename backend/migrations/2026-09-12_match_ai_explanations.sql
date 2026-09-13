-- Adds match_ai_explanations: the AI-written "why you may work well
-- together" narrative shown above the existing rules-based explanation.
-- A separate table (not new columns on `matches`) since this data has a
-- different lifecycle - regenerable, provider-touched, retriable - from
-- the immutable match row itself. match_id is the primary key (not a
-- separate id + unique FK) so writes are always an upsert keyed on it:
-- there is no way for a duplicate row, or a duplicate generation, to
-- exist for the same match.
--
-- Run this once, as one block, in the Supabase SQL editor.

create table match_ai_explanations (
  match_id uuid primary key references matches(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'ready', 'failed')),
  explanation text,
  model text,
  prompt_version text,
  generated_at timestamptz,
  -- A coarse, safe-to-store failure category only (e.g. "timeout",
  -- "rate_limited", "provider_error") - never a raw provider error body,
  -- which could contain request/account details that don't belong in the
  -- database at all, let alone in a table match participants can read.
  error_code text,
  created_at timestamptz not null default now()
);

alter table match_ai_explanations enable row level security;

-- Match participants can read the result (or its pending/failed status),
-- same participant check every other match-scoped table in this schema
-- uses. Deliberately no insert/update/delete policy for `authenticated` -
-- only the backend's service-role client (which bypasses RLS entirely, the
-- same as every other admin-only write in this app) is ever allowed to
-- write this table. A normal client cannot create, edit, or overwrite an
-- AI explanation under any circumstance.
create policy "Match participants can read their AI explanation"
  on match_ai_explanations for select
  to authenticated
  using (
    exists (
      select 1 from matches m
      where m.id = match_ai_explanations.match_id
        and (m.mentee_user_id = auth.uid() or m.mentor_user_id = auth.uid())
    )
  );
