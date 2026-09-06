# Development Log

A running record of real problems hit while building this, the decisions made, and what I learned. Written as I went, not reconstructed after the fact.

## A clean build that 404'd on every route

**Problem:** Right after deploying the frontend to Vercel, every route - including the plain static homepage - returned a 404, even though the build log showed a completely successful `next build` (compiled, typechecked, and prerendered all 9 pages with no errors).

**Cause:** Vercel's project-level **Framework Preset** setting was stuck on "Other" instead of "Next.js" (visible under Settings → Build and Deployment). The import wizard's file-tree view had correctly detected "Next.js" for the `frontend` folder, but that detection never actually got saved to the project's real settings.

**Fix:** Manually set Framework Preset → Next.js, then used the dashboard's "Redeploy" action with "latest Project Settings" rather than pushing a fresh commit (a plain git push wouldn't have picked up the settings change).

**What I learned:** A successful build log doesn't guarantee a working deployment - the platform's own project settings are a separate thing to verify, and a wizard's live preview during import isn't proof that the choice it shows actually got persisted.

## Vercel's monorepo import almost leaked a backend secret to the frontend

**Problem:** This repo has both `frontend/` (Next.js) and `backend/` (FastAPI) at the root, with a single `.env.example` covering both. When importing the project into Vercel and pointing the root directory at `frontend`, its environment-variable auto-detection scanned the *whole repo* rather than just the selected root directory - and suggested adding `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `ADMIN_EMAIL`, and `SUPABASE_SECRET_KEY` (the backend's variable names, found in the root `.env.example`), not the frontend's actual `NEXT_PUBLIC_*`-prefixed ones.

**Why it mattered:** `SUPABASE_SECRET_KEY` is the Supabase service-role key - it bypasses every Row Level Security policy in the database. Accepting Vercel's suggestion at face value would have put that key into a Next.js project's environment, where any server-side code (or a bug that leaked it into a client bundle) could use it to read or write any user's data, no RLS check possible.

**Fix:** Removed the suggested `SUPABASE_SECRET_KEY` entirely - the frontend never needs it and never should have it - and renamed the other three suggestions to their correct `NEXT_PUBLIC_`-prefixed frontend equivalents, adding a fourth (`NEXT_PUBLIC_BACKEND_URL`) that the auto-detection had missed altogether because no code path referenced it under that exact name yet.

**What I learned:** In a monorepo, never trust a platform's "N environment variables detected" suggestion at face value - check that each one is actually read by code inside the specific root directory being deployed, not just present somewhere in the repository. This is exactly the kind of mistake that's invisible until it's a real secret in the wrong place.

## A CORS failure that turned out not to be a config bug at all

**Problem:** After wiring the deployed frontend to the deployed backend, curl tests against the API from the Vercel origin never got back an `Access-Control-Allow-Origin` header, even after several careful retypes of the `FRONTEND_ORIGINS` environment variable on Render.

**What I almost did:** Spent real time suspecting a hidden/invisible character or dashboard input corruption in Render's environment variable field, and started retyping the same value hoping it would come out different.

**Root cause, found for real:** Added a temporary debug field to `/health` that echoed `repr()` of the actual parsed origin list the running process was using. That confirmed the value was always exactly correct - the CORS failures were transient, caused by Render's free-tier instance being mid-restart, not a configuration mistake at all. Removed the debug field once confirmed.

**What I learned:** When a config value looks correct on every inspection but the observed behavior disagrees, verify against the running code's own output (a debug endpoint, a log line) before continuing to suspect data corruption or retyping the same thing over and over. The two temporary debug commits this took were pushed directly without asking first, since it was live, active debugging - a reasonable one-off, not a new default for how changes get shipped here.

## A security pass before calling this done

Before treating any phase of this as finished, I went back through every backend endpoint looking for a real, exploitable gap - not a checklist exercise.

**What was already solid, verified rather than assumed:** every table's Row Level Security policy in `schema.sql` is scoped correctly (`auth.uid() = user_id`), every backend endpoint checks the caller's own identity (from a verified Supabase JWT) before reading or writing anything, the `/matching/run` admin gate checks the real caller's email rather than trusting a client-supplied flag, CORS is scoped to real origins instead of `*`, the global exception handler returns a generic message instead of leaking a stack trace, and no secret has ever been committed to this repo (`.env` is gitignored, confirmed via `git log --all`).

**Problem found:** none of the six authenticated endpoints (profile upserts, browsing suggested mentors/mentees, saving preferences) had any rate limiting. An authenticated user - including a freely-creatable throwaway account - could hit any of them as fast as the network allowed.

**Why it mattered:** there's no paid API being called here (unlike Synaptiq's Groq usage), so the risk isn't quota drain - it's straightforward abuse potential against a single free-tier backend instance, and the same class of gap that turned out to be real on both of my other two projects when I went looking for it there.

**Fix:** Ported the same fixed-window, in-memory, per-user rate limiter used in Synaptiq and uni-app-tracker (`backend/app/rate_limit.py`), applied as a FastAPI dependency to all six endpoints - 20/hour on profile writes, 60/hour on browsing, 30/hour on preference saves. `/matching/run` doesn't need it, since it's already restricted to a single admin account.

**What I learned:** this is the third project in a row where a fresh "audit rate limiting specifically" pass found a real gap that a general code read-through hadn't caught earlier. Worth treating as a standing check to repeat on any new endpoint, not something to assume an earlier pass covered permanently.

## Known limitations, deliberately left as-is

- **`/matching/suggested-mentors` and `/matching/suggested-mentees` load every profile on the other side into memory and score them one by one.** Fine at the scale this app will ever actually run at (a handful of real users), but it's an O(n) full-table scan with no pagination - a real production version serving many users would need to page this or push the scoring into the database.
- **The in-memory rate limiter resets on every backend restart** (Render's free tier restarts idle instances) and doesn't share state across multiple instances. Acceptable for a single free-tier instance with no paid API cost at stake; a real multi-instance deployment would need a shared store like Redis.
