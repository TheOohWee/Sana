-- ============================================
-- SANA — Database Migration
-- Run this in the Supabase SQL Editor
-- ============================================

-- 1. PROFILES
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL DEFAULT '',
  display_name TEXT,
  bio TEXT DEFAULT '',
  location TEXT DEFAULT '',
  avatar_url TEXT,
  two_factor_enabled BOOLEAN DEFAULT FALSE,
  total_focus_minutes INTEGER DEFAULT 0,
  daily_wins INTEGER DEFAULT 0,
  weekly_wins INTEGER DEFAULT 0,
  monthly_wins INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. PARTIES
CREATE TABLE parties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  purpose TEXT DEFAULT '',
  created_by UUID REFERENCES profiles(id) ON DELETE CASCADE,
  invite_code TEXT UNIQUE DEFAULT encode(gen_random_bytes(6), 'hex'),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. PARTY MEMBERS
CREATE TABLE party_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  party_id UUID REFERENCES parties(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member' CHECK (role IN ('owner', 'member')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(party_id, user_id)
);

-- 4. TIME ENTRIES
CREATE TABLE time_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  party_id UUID REFERENCES parties(id) ON DELETE SET NULL,
  duration_minutes INTEGER NOT NULL,
  note TEXT DEFAULT '',
  source TEXT NOT NULL CHECK (source IN ('pomodoro', 'manual')),
  category TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  date DATE DEFAULT CURRENT_DATE
);

-- 5. PARTY MESSAGES
CREATE TABLE party_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  party_id UUID REFERENCES parties(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. WINS
CREATE TABLE wins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  party_id UUID REFERENCES parties(id) ON DELETE CASCADE,
  period_type TEXT NOT NULL CHECK (period_type IN ('daily', 'weekly', 'monthly')),
  period_start DATE NOT NULL,
  awarded_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, party_id, period_type, period_start)
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX idx_time_entries_user_date ON time_entries(user_id, date);
CREATE INDEX idx_time_entries_party_date ON time_entries(party_id, date);
CREATE INDEX idx_party_members_user ON party_members(user_id);
CREATE INDEX idx_party_members_party ON party_members(party_id);
CREATE INDEX idx_party_messages_party ON party_messages(party_id, created_at);
CREATE INDEX idx_wins_user ON wins(user_id);
CREATE INDEX idx_wins_party ON wins(party_id, period_type, period_start);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE parties ENABLE ROW LEVEL SECURITY;
ALTER TABLE party_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE party_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE wins ENABLE ROW LEVEL SECURITY;

-- PROFILES policies
CREATE POLICY "Anyone can view profiles"
  ON profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- PARTIES policies
CREATE POLICY "Members can view their parties"
  ON parties FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM party_members
      WHERE party_members.party_id = parties.id
        AND party_members.user_id = auth.uid()
        AND party_members.status = 'accepted'
    )
    OR parties.created_by = auth.uid()
  );

CREATE POLICY "Anyone can view party by invite code"
  ON parties FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create parties"
  ON parties FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Owner can update party"
  ON parties FOR UPDATE
  USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Owner can delete party"
  ON parties FOR DELETE
  USING (auth.uid() = created_by);

-- Helper function to avoid RLS recursion on party_members
CREATE OR REPLACE FUNCTION get_user_party_ids(p_user_id UUID)
RETURNS SETOF UUID AS $$
  SELECT party_id FROM party_members WHERE user_id = p_user_id;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- PARTY MEMBERS policies
CREATE POLICY "Users can view own memberships"
  ON party_members FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can view co-members"
  ON party_members FOR SELECT
  USING (party_id IN (SELECT get_user_party_ids(auth.uid())));

CREATE POLICY "Owner or self can insert member"
  ON party_members FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM parties
      WHERE parties.id = party_members.party_id
        AND parties.created_by = auth.uid()
    )
  );

CREATE POLICY "Users can update own membership"
  ON party_members FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Owner can update members"
  ON party_members FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM parties
      WHERE parties.id = party_members.party_id
        AND parties.created_by = auth.uid()
    )
  );

CREATE POLICY "Users can delete own membership"
  ON party_members FOR DELETE
  USING (auth.uid() = user_id);

-- TIME ENTRIES policies
CREATE POLICY "Users can view own entries"
  ON time_entries FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Party members can view party entries"
  ON time_entries FOR SELECT
  USING (
    party_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM party_members
      WHERE party_members.party_id = time_entries.party_id
        AND party_members.user_id = auth.uid()
        AND party_members.status = 'accepted'
    )
  );

CREATE POLICY "Users can insert own entries"
  ON time_entries FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own entries"
  ON time_entries FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own entries"
  ON time_entries FOR DELETE
  USING (auth.uid() = user_id);

-- PARTY MESSAGES policies
CREATE POLICY "Party members can view messages"
  ON party_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM party_members
      WHERE party_members.party_id = party_messages.party_id
        AND party_members.user_id = auth.uid()
        AND party_members.status = 'accepted'
    )
  );

CREATE POLICY "Party members can send messages"
  ON party_messages FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM party_members
      WHERE party_members.party_id = party_messages.party_id
        AND party_members.user_id = auth.uid()
        AND party_members.status = 'accepted'
    )
  );

-- WINS policies
CREATE POLICY "Party members can view wins"
  ON wins FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM party_members
      WHERE party_members.party_id = wins.party_id
        AND party_members.user_id = auth.uid()
        AND party_members.status = 'accepted'
    )
  );

CREATE POLICY "System can insert wins"
  ON wins FOR INSERT
  WITH CHECK (true);

-- ============================================
-- FUNCTIONS
-- ============================================

CREATE OR REPLACE FUNCTION get_party_ranking(
  p_party_id UUID,
  p_start_date DATE,
  p_end_date DATE
)
RETURNS TABLE (
  user_id UUID,
  username TEXT,
  display_name TEXT,
  avatar_url TEXT,
  total_minutes BIGINT,
  rank BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id AS user_id,
    p.username,
    p.display_name,
    p.avatar_url,
    COALESCE(SUM(te.duration_minutes), 0)::BIGINT AS total_minutes,
    RANK() OVER (ORDER BY COALESCE(SUM(te.duration_minutes), 0) DESC)::BIGINT AS rank
  FROM party_members pm
  JOIN profiles p ON p.id = pm.user_id
  LEFT JOIN time_entries te ON te.user_id = p.id
    AND te.party_id = p_party_id
    AND te.date BETWEEN p_start_date AND p_end_date
  WHERE pm.party_id = p_party_id
    AND pm.status = 'accepted'
  GROUP BY p.id, p.username, p.display_name, p.avatar_url
  ORDER BY total_minutes DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get heatmap data for a user
CREATE OR REPLACE FUNCTION get_user_heatmap(
  p_user_id UUID,
  p_start_date DATE,
  p_end_date DATE
)
RETURNS TABLE (
  date DATE,
  total_minutes BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    te.date,
    COALESCE(SUM(te.duration_minutes), 0)::BIGINT AS total_minutes
  FROM time_entries te
  WHERE te.user_id = p_user_id
    AND te.date BETWEEN p_start_date AND p_end_date
  GROUP BY te.date
  ORDER BY te.date;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to calculate and award wins
CREATE OR REPLACE FUNCTION calculate_wins(
  p_period_type TEXT,
  p_start_date DATE,
  p_end_date DATE
)
RETURNS VOID AS $$
DECLARE
  party_record RECORD;
  winner_record RECORD;
  max_minutes BIGINT;
BEGIN
  FOR party_record IN SELECT id FROM parties LOOP
    max_minutes := 0;

    FOR winner_record IN
      SELECT
        pm.user_id,
        COALESCE(SUM(te.duration_minutes), 0)::BIGINT AS total_minutes
      FROM party_members pm
      LEFT JOIN time_entries te ON te.user_id = pm.user_id
        AND te.party_id = party_record.id
        AND te.date BETWEEN p_start_date AND p_end_date
      WHERE pm.party_id = party_record.id
        AND pm.status = 'accepted'
      GROUP BY pm.user_id
      ORDER BY total_minutes DESC
    LOOP
      IF winner_record.total_minutes = 0 THEN
        EXIT;
      END IF;

      IF max_minutes = 0 THEN
        max_minutes := winner_record.total_minutes;
      END IF;

      IF winner_record.total_minutes = max_minutes THEN
        INSERT INTO wins (user_id, party_id, period_type, period_start)
        VALUES (winner_record.user_id, party_record.id, p_period_type, p_start_date)
        ON CONFLICT (user_id, party_id, period_type, period_start) DO NOTHING;

        IF p_period_type = 'daily' THEN
          UPDATE profiles SET daily_wins = daily_wins + 1 WHERE id = winner_record.user_id;
        ELSIF p_period_type = 'weekly' THEN
          UPDATE profiles SET weekly_wins = weekly_wins + 1 WHERE id = winner_record.user_id;
        ELSIF p_period_type = 'monthly' THEN
          UPDATE profiles SET monthly_wins = monthly_wins + 1 WHERE id = winner_record.user_id;
        END IF;
      ELSE
        EXIT;
      END IF;
    END LOOP;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update total_focus_minutes on profile when time entry is added
CREATE OR REPLACE FUNCTION update_total_focus_minutes()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE profiles
  SET total_focus_minutes = total_focus_minutes + NEW.duration_minutes,
      updated_at = NOW()
  WHERE id = NEW.user_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_time_entry_insert
  AFTER INSERT ON time_entries
  FOR EACH ROW
  EXECUTE FUNCTION update_total_focus_minutes();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, display_name, avatar_url)
  VALUES (
    NEW.id,
    '',
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', '')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- ============================================
-- CRON JOBS (requires pg_cron extension)
-- Run these after enabling pg_cron in Supabase dashboard
-- ============================================

-- Enable the extension (run this first in Supabase SQL Editor):
-- CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Daily win calculation at 00:05 UTC
-- SELECT cron.schedule(
--   'calculate-daily-wins',
--   '5 0 * * *',
--   $$SELECT calculate_wins('daily', CURRENT_DATE - 1, CURRENT_DATE - 1)$$
-- );

-- Weekly win calculation Monday at 00:10 UTC
-- SELECT cron.schedule(
--   'calculate-weekly-wins',
--   '10 0 * * 1',
--   $$SELECT calculate_wins('weekly', CURRENT_DATE - 7, CURRENT_DATE - 1)$$
-- );

-- Monthly win calculation 1st of month at 00:15 UTC
-- SELECT cron.schedule(
--   'calculate-monthly-wins',
--   '15 0 1 * *',
--   $$SELECT calculate_wins('monthly', (CURRENT_DATE - INTERVAL '1 month')::DATE, CURRENT_DATE - 1)$$
-- );

-- ============================================
-- STORAGE
-- ============================================
-- Create an 'avatars' bucket in Supabase Storage (set to public)
-- via the Supabase dashboard: Storage → New Bucket → "avatars" → Public

-- Storage policy for avatars
-- INSERT: authenticated users can upload to their own folder
-- SELECT: anyone can view
-- These are configured via the Supabase Dashboard under Storage → Policies

-- ============================================
-- REALTIME
-- ============================================
-- Enable realtime on these tables via Supabase Dashboard:
-- Database → Replication → Enable for: party_messages, time_entries, party_members
