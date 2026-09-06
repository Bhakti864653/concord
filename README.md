# Wayfind

A mentorship-matching platform. Mentees (looking for guidance on a career,
field, or path) and mentors (who've already walked that path) create
profiles; matching will eventually run on the **Gale-Shapley stable
matching algorithm**, using each side's actual preferences rather than a
plain similarity score.

## Current status

Just the foundation: auth, profile creation for both user types, and the
row-level security that lets everyone browse profiles but only edit their
own. The matching engine itself hasn't been built yet.

## Stack

Same as [Synaptiq](https://github.com/Bhakti864653/synaptiq), my other
project: Next.js (frontend) + FastAPI (backend) + Supabase (Postgres, Auth).

- **Frontend**: Next.js App Router, TypeScript, Tailwind CSS
- **Backend**: FastAPI, talks to Supabase via the service-role key for
  writes that need validation (profile creation/updates)
- **Database/Auth**: Supabase — Postgres with Row Level Security, email/password auth

## Local setup

### 1. Supabase project

Create a new Supabase project, then run `backend/schema.sql` in its SQL
editor to create `mentee_profiles`/`mentor_profiles` and their RLS
policies.

Grab three values from Project Settings → API:
- Project URL
- `anon`/publishable key
- `service_role`/secret key (careful — this bypasses RLS, backend-only)

### 2. Backend

```
cd backend
python -m venv venv
venv\Scripts\activate        # Windows
pip install -r requirements.txt
```

Copy `.env.example` (repo root) to `.env` and fill in the three Supabase
values above.

```
uvicorn app.main:app --reload --port 8000
```

### 3. Frontend

```
cd frontend
npm install
```

`frontend/.env.local` already exists with placeholders — fill in the
Supabase URL/publishable key (same two values as above) and leave
`NEXT_PUBLIC_BACKEND_URL` as `http://localhost:8000` for local dev.

```
npm run dev
```

Visit `http://localhost:3000`.
