-- match_notes never had a delete policy - notes were permanent by design.
-- Adds one, scoped to the note's own author only (not any match
-- participant, unlike goals/sessions - a note reads as one person's own
-- reflection, not shared/jointly-owned content the way a goal or session
-- is), so you can delete your own notes but not your match's.
--
-- Run this once, as one block, in the Supabase SQL editor.

create policy "Note authors can delete their own notes"
  on match_notes for delete
  to authenticated
  using (author_id = auth.uid());
