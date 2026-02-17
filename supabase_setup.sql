-- ═══════════════════════════════════════════════════════════════════
-- Blockchain E-Voting System – Supabase SQL Setup
-- Run this in the Supabase SQL Editor (Dashboard > SQL Editor)
-- ═══════════════════════════════════════════════════════════════════

-- ── Enable UUID extension ────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── Voters Table ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS voters (
    id          UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    voter_id    TEXT UNIQUE NOT NULL,
    name        TEXT NOT NULL,
    email       TEXT NOT NULL,
    has_voted   BOOLEAN DEFAULT FALSE,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── Admins Table ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS admins (
    id          UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id     UUID NOT NULL REFERENCES auth.users(id),
    email       TEXT NOT NULL,
    role        TEXT DEFAULT 'admin',
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── Candidates Table ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS candidates (
    id          UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name        TEXT UNIQUE NOT NULL,
    party       TEXT NOT NULL,
    description TEXT DEFAULT '',
    vote_count  INTEGER DEFAULT 0,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── Votes Table ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS votes (
    id              UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    voter_id        TEXT NOT NULL REFERENCES voters(voter_id),
    candidate_name  TEXT NOT NULL,
    block_hash      TEXT NOT NULL,
    previous_hash   TEXT NOT NULL,
    timestamp       FLOAT NOT NULL,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(voter_id)  -- Enforce one vote per voter at DB level
);

-- ── Indexes ──────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_voters_voter_id ON voters(voter_id);
CREATE INDEX IF NOT EXISTS idx_votes_voter_id ON votes(voter_id);
CREATE INDEX IF NOT EXISTS idx_admins_user_id ON admins(user_id);
CREATE INDEX IF NOT EXISTS idx_candidates_name ON candidates(name);

-- ── Row Level Security (RLS) ─────────────────────────────────────

-- Enable RLS on all tables
ALTER TABLE voters ENABLE ROW LEVEL SECURITY;
ALTER TABLE admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;

-- PUBLIC read access on candidates (voters need to see them)
CREATE POLICY "Anyone can view candidates"
    ON candidates FOR SELECT
    USING (true);

-- PUBLIC read access on voters (for voter login)
CREATE POLICY "Anyone can view voters"
    ON voters FOR SELECT
    USING (true);

-- Allow inserts and updates for API (via service role / anon with RLS relaxed)
-- In production, use service_role key for admin ops.
-- For development, we allow anon access:

CREATE POLICY "Allow insert voters"
    ON voters FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Allow update voters"
    ON voters FOR UPDATE
    USING (true);

CREATE POLICY "Allow insert candidates"
    ON candidates FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Allow update candidates"
    ON candidates FOR UPDATE
    USING (true);

CREATE POLICY "Allow insert votes"
    ON votes FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Allow select votes"
    ON votes FOR SELECT
    USING (true);

CREATE POLICY "Allow select admins"
    ON admins FOR SELECT
    USING (true);

CREATE POLICY "Allow insert admins"
    ON admins FOR INSERT
    WITH CHECK (true);

-- ═══════════════════════════════════════════════════════════════════
-- DONE! Your database is ready.
-- Next steps:
--   1. Copy your Supabase URL and anon key to .env
--   2. Run: python create_admin.py admin@evoting.com Admin123!
--   3. Run: python seed_data.py
--   4. Run: python app.py
-- ═══════════════════════════════════════════════════════════════════
