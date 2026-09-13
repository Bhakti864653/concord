-- Adds bounded-retry bookkeeping columns to match_ai_explanations, for a
-- database that already ran the 2026-09-12_match_ai_explanations.sql
-- migration (that file's `create table` now includes these columns
-- directly, so this is only needed on top of an existing table).
--
-- Safe to run even if the columns already exist. Run this once, as one
-- block, in the Supabase SQL editor. No RLS changes - the existing
-- "Match participants can read their AI explanation" select policy
-- already covers these new columns, and there is still no insert/update/
-- delete policy for `authenticated`, so only the backend's service-role
-- client can ever write them.

alter table match_ai_explanations
  add column if not exists attempt_count integer not null default 0;

alter table match_ai_explanations
  add column if not exists last_attempt_at timestamptz;

alter table match_ai_explanations
  add column if not exists next_retry_at timestamptz;
