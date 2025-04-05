/**
 * This script displays the SQL schema needed to initialize the Supabase database.
 * Run with: npm run display:schema
 */

const fs = require('fs');
const path = require('path');

// Color codes for terminal output
const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  blue: "\x1b[34m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  red: "\x1b[31m"
};

// The complete Supabase schema
const supabaseSchema = `
-- Neighborly App - Supabase Database Schema
--
-- Run this script in your Supabase SQL Editor to initialize the database schema
-- This includes all tables, indexes, and security policies needed for the application

-- Create extension for UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create all tables
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY NOT NULL,
  email TEXT NOT NULL UNIQUE,
  display_name TEXT,
  password TEXT NOT NULL,
  society TEXT,
  role TEXT NOT NULL DEFAULT 'Unverified' CHECK (role IN ('President', 'Treasurer', 'Member', 'Tenant', 'Unverified')),
  is_logged_in BOOLEAN DEFAULT FALSE,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS preferences (
  id SERIAL PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS otp_verification (
  id SERIAL PRIMARY KEY,
  email TEXT NOT NULL,
  userid TEXT NOT NULL,
  otp TEXT NOT NULL,
  created_at BIGINT NOT NULL,
  attempts INTEGER DEFAULT 0,
  verified BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS posts_cache (
  id TEXT PRIMARY KEY NOT NULL,
  data TEXT NOT NULL,
  timestamp BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS draft_posts (
  id TEXT PRIMARY KEY NOT NULL,
  data TEXT NOT NULL,
  timestamp BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS posts (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  society_id TEXT,
  title TEXT,
  content TEXT NOT NULL,
  image_urls JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_global BOOLEAN DEFAULT FALSE,
  has_challenge BOOLEAN DEFAULT FALSE,
  approval_status TEXT DEFAULT 'approved' CHECK (approval_status IN ('pending', 'approved', 'rejected')),
  approval_notes TEXT
);

CREATE TABLE IF NOT EXISTS post_interactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id TEXT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('like', 'comment', 'share')),
  content TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  parent_id UUID REFERENCES post_interactions(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  society_id TEXT NOT NULL,
  location TEXT NOT NULL,
  date TIMESTAMP WITH TIME ZONE NOT NULL,
  end_date TIMESTAMP WITH TIME ZONE,
  organizer_id TEXT NOT NULL REFERENCES users(id),
  status TEXT NOT NULL CHECK (status IN ('scheduled', 'ongoing', 'completed')),
  is_intersociety BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  approval_status TEXT DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'rejected')),
  approval_notes TEXT
);

CREATE TABLE IF NOT EXISTS event_participants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('going', 'maybe', 'not_going', 'attended')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tournaments (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  society_id TEXT NOT NULL,
  start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  end_date TIMESTAMP WITH TIME ZONE NOT NULL,
  organizer_id TEXT NOT NULL REFERENCES users(id),
  status TEXT NOT NULL CHECK (status IN ('scheduled', 'ongoing', 'completed')),
  is_intersociety BOOLEAN DEFAULT FALSE,
  max_participants INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  approval_status TEXT DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'rejected'))
);

CREATE TABLE IF NOT EXISTS tournament_participants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tournament_id TEXT NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  registration_status TEXT NOT NULL CHECK (registration_status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS challenges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id TEXT NOT NULL,
  creator_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL CHECK (status IN ('active', 'completed', 'expired')),
  criteria TEXT NOT NULL,
  reward TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expiry_date TIMESTAMP WITH TIME ZONE NOT NULL,
  max_participants INTEGER DEFAULT NULL,
  visibility TEXT NOT NULL DEFAULT 'public' CHECK (visibility IN ('public', 'society', 'private'))
);

CREATE TABLE IF NOT EXISTS challenge_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  challenge_id UUID NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
  requester_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  message TEXT,
  status TEXT NOT NULL CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS challenge_participants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  challenge_id UUID NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status TEXT NOT NULL CHECK (status IN ('active', 'withdrawn', 'completed', 'disqualified')),
  final_score NUMERIC DEFAULT NULL,
  rank INTEGER DEFAULT NULL
);

CREATE TABLE IF NOT EXISTS challenge_attempts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  participant_id UUID NOT NULL REFERENCES challenge_participants(id) ON DELETE CASCADE,
  attempt_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  score NUMERIC NOT NULL,
  evidence JSONB NOT NULL DEFAULT '{}'::jsonb,
  notes TEXT,
  verified BOOLEAN DEFAULT FALSE,
  verified_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  verified_at TIMESTAMP WITH TIME ZONE
);

-- Create standard indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_logged_in ON users(is_logged_in);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_society ON users(society);
CREATE INDEX IF NOT EXISTS idx_preferences_key ON preferences(key);
CREATE INDEX IF NOT EXISTS idx_otp_email ON otp_verification(email);
CREATE INDEX IF NOT EXISTS idx_otp_userid ON otp_verification(userid);
CREATE INDEX IF NOT EXISTS idx_posts_cache_timestamp ON posts_cache(timestamp);
CREATE INDEX IF NOT EXISTS idx_draft_posts_timestamp ON draft_posts(timestamp);

-- Create indexes for posts and interactions
CREATE INDEX IF NOT EXISTS idx_posts_user ON posts(user_id);
CREATE INDEX IF NOT EXISTS idx_posts_society ON posts(society_id);
CREATE INDEX IF NOT EXISTS idx_posts_created ON posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_global ON posts(is_global);
CREATE INDEX IF NOT EXISTS idx_posts_approval ON posts(approval_status);
CREATE INDEX IF NOT EXISTS idx_post_interactions_post ON post_interactions(post_id);
CREATE INDEX IF NOT EXISTS idx_post_interactions_user ON post_interactions(user_id);
CREATE INDEX IF NOT EXISTS idx_post_interactions_type ON post_interactions(type);
CREATE INDEX IF NOT EXISTS idx_post_interactions_parent ON post_interactions(parent_id);

-- Create indexes for events and participants
CREATE INDEX IF NOT EXISTS idx_events_society ON events(society_id);
CREATE INDEX IF NOT EXISTS idx_events_status ON events(status);
CREATE INDEX IF NOT EXISTS idx_events_date ON events(date);
CREATE INDEX IF NOT EXISTS idx_events_organizer ON events(organizer_id);
CREATE INDEX IF NOT EXISTS idx_events_approval ON events(approval_status);
CREATE INDEX IF NOT EXISTS idx_event_participants_event ON event_participants(event_id);
CREATE INDEX IF NOT EXISTS idx_event_participants_user ON event_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_event_participants_status ON event_participants(status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_event_participant ON event_participants(event_id, user_id);

-- Create indexes for tournaments
CREATE INDEX IF NOT EXISTS idx_tournaments_society ON tournaments(society_id);
CREATE INDEX IF NOT EXISTS idx_tournaments_status ON tournaments(status);
CREATE INDEX IF NOT EXISTS idx_tournaments_start_date ON tournaments(start_date);
CREATE INDEX IF NOT EXISTS idx_tournaments_organizer ON tournaments(organizer_id);
CREATE INDEX IF NOT EXISTS idx_tournament_participants_tournament ON tournament_participants(tournament_id);
CREATE INDEX IF NOT EXISTS idx_tournament_participants_user ON tournament_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_tournament_participants_status ON tournament_participants(registration_status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_tournament_participant ON tournament_participants(tournament_id, user_id);

-- Create indexes for challenge tables
CREATE INDEX IF NOT EXISTS idx_challenges_creator ON challenges(creator_id);
CREATE INDEX IF NOT EXISTS idx_challenges_post ON challenges(post_id);
CREATE INDEX IF NOT EXISTS idx_challenges_status ON challenges(status);
CREATE INDEX IF NOT EXISTS idx_challenges_expiry ON challenges(expiry_date);
CREATE INDEX IF NOT EXISTS idx_challenge_requests_challenge ON challenge_requests(challenge_id);
CREATE INDEX IF NOT EXISTS idx_challenge_requests_requester ON challenge_requests(requester_id);
CREATE INDEX IF NOT EXISTS idx_challenge_requests_status ON challenge_requests(status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_challenge_requester ON challenge_requests(challenge_id, requester_id);
CREATE INDEX IF NOT EXISTS idx_challenge_participants_challenge ON challenge_participants(challenge_id);
CREATE INDEX IF NOT EXISTS idx_challenge_participants_user ON challenge_participants(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_challenge_participant ON challenge_participants(challenge_id, user_id);
CREATE INDEX IF NOT EXISTS idx_challenge_attempts_participant ON challenge_attempts(participant_id);
CREATE INDEX IF NOT EXISTS idx_challenge_attempts_date ON challenge_attempts(attempt_date);
CREATE INDEX IF NOT EXISTS idx_challenge_attempts_verified ON challenge_attempts(verified);

-- Security rules based on user roles
-- Disable RLS for users table (allowing unrestricted access)
ALTER TABLE users DISABLE ROW LEVEL SECURITY;

-- User RLS policies are now removed/disabled
-- Note: If you need to re-enable security later, uncomment and run these policies
/*
CREATE POLICY users_select_policy ON users FOR SELECT USING (true);
CREATE POLICY users_update_policy ON users FOR UPDATE USING (auth.uid()::text = id);
CREATE POLICY users_self_registration_policy ON users 
  FOR INSERT WITH CHECK (
    role = 'Unverified'
  );
CREATE POLICY users_admin_insert_policy ON users 
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid()::text AND role IN ('President', 'Treasurer')
    )
  );
CREATE POLICY users_member_invite_policy ON users 
  FOR INSERT WITH CHECK (
    role = 'Unverified' AND
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid()::text AND role IN ('Member')
    )
  );
*/

-- Post policies based on role
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

-- Anyone can read approved posts
CREATE POLICY posts_select_policy ON posts FOR SELECT USING (
  approval_status = 'approved' OR auth.uid()::text = user_id
);

-- Presidents and Treasurers can post without approval
CREATE POLICY posts_insert_policy_leaders ON posts 
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid()::text AND role IN ('President', 'Treasurer')
    )
  );

-- Members and Tenants can create posts that need approval
CREATE POLICY posts_insert_policy_members ON posts 
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid()::text AND role IN ('Member', 'Tenant')
    )
  );

-- Only Presidents can approve posts
CREATE POLICY posts_update_approval_policy ON posts 
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid()::text AND role = 'President'
    )
  );

-- Event policies based on role
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- Only Presidents and Treasurers can create events
CREATE POLICY events_insert_policy ON events 
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid()::text AND role IN ('President', 'Treasurer')
    )
  );

-- Challenge tables RLS policies
ALTER TABLE challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenge_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenge_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenge_attempts ENABLE ROW LEVEL SECURITY;

-- Challenges readable by anyone, writable by creator
CREATE POLICY challenges_select_policy ON challenges 
  FOR SELECT USING (
    visibility = 'public' OR 
    (visibility = 'society' AND EXISTS (
      SELECT 1 FROM users u 
      WHERE u.id = auth.uid()::text AND u.society = (
        SELECT us.society FROM users us WHERE us.id = creator_id
      )
    )) OR 
    creator_id = auth.uid()::text
  );

CREATE POLICY challenges_insert_policy ON challenges 
  FOR INSERT WITH CHECK (auth.uid()::text = creator_id);

CREATE POLICY challenges_update_policy ON challenges 
  FOR UPDATE USING (auth.uid()::text = creator_id);

-- Request policies
CREATE POLICY challenge_requests_select_policy ON challenge_requests 
  FOR SELECT USING (
    requester_id = auth.uid()::text OR 
    EXISTS (
      SELECT 1 FROM challenges c 
      WHERE c.id = challenge_id AND c.creator_id = auth.uid()::text
    )
  );

CREATE POLICY challenge_requests_insert_policy ON challenge_requests 
  FOR INSERT WITH CHECK (auth.uid()::text = requester_id);

-- Participant policies
CREATE POLICY challenge_participants_select_policy ON challenge_participants 
  FOR SELECT USING (true);  -- All participants visible

CREATE POLICY challenge_participants_insert_policy ON challenge_participants 
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM challenges c 
      WHERE c.id = challenge_id AND c.creator_id = auth.uid()::text
    )
  );

-- Attempt policies
CREATE POLICY challenge_attempts_select_policy ON challenge_attempts 
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM challenge_participants cp 
      JOIN challenges c ON cp.challenge_id = c.id
      WHERE cp.id = participant_id AND (cp.user_id = auth.uid()::text OR c.creator_id = auth.uid()::text)
    )
  );

CREATE POLICY challenge_attempts_insert_policy ON challenge_attempts 
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM challenge_participants cp 
      WHERE cp.id = participant_id AND cp.user_id = auth.uid()::text
    )
  );
`;

// Display instructions and SQL schema
console.log(`${colors.bright}${colors.blue}=== Neighborly - Supabase Schema ===\n${colors.reset}`);
console.log(`${colors.yellow}Instructions:${colors.reset}`);
console.log(`1. Navigate to your Supabase project dashboard`);
console.log(`2. Go to the SQL Editor`);
console.log(`3. Create a new query`);
console.log(`4. Copy and paste the SQL below`);
console.log(`5. Run the query to create all necessary tables and indexes\n`);

console.log(`${colors.green}=== SQL Schema ===\n${colors.reset}`);
console.log(supabaseSchema);

console.log(`\n${colors.yellow}Note:${colors.reset} This will set up the complete database structure with security policies based on user roles.`);
console.log(`For existing databases, consider running only the parts you need to update.`);
