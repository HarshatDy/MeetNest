# Neighborly App - Supabase Database Schema

This document outlines the database schemas used in the Supabase backend for the Neighborly application.

## Overview

Neighborly uses Supabase as the primary database for user management, local caching, and offline functionality. The schema is designed to support the core functionality while providing efficient query patterns.

## Tables

### `users`

Stores user account information and authentication details.

```sql
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY NOT NULL,
  email TEXT NOT NULL UNIQUE,
  display_name TEXT,
  password TEXT NOT NULL, -- In production, use Supabase Auth instead
  society TEXT,
  role TEXT NOT NULL DEFAULT 'Member' CHECK (role IN ('President', 'Treasurer', 'Member', 'Tenant', 'Unverified')),
  is_logged_in BOOLEAN DEFAULT FALSE,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_logged_in ON users(is_logged_in);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_society ON users(society);
```

- **Purpose**: Stores user authentication and profile information
- **Fields**:
  - `id`: Unique user identifier
  - `email`: User's email address (unique)
  - `display_name`: User's display name
  - `password`: User's password (in production, use Supabase Auth)
  - `society`: User's society/neighborhood
  - `role`: User's role (President, Treasurer, Member, Tenant, Unverified)
  - `is_logged_in`: Whether user is currently logged in
  - `created_at`: Account creation timestamp
  - `updated_at`: Last update timestamp

### `preferences`

Stores user preferences and settings as key-value pairs.

```sql
CREATE TABLE IF NOT EXISTS preferences (
  id SERIAL PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  value TEXT NOT NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_preferences_key ON preferences(key);
```

- **Purpose**: Stores key-value pairs for application settings and user preferences
- **Fields**:
  - `id`: Auto-incrementing unique identifier
  - `key`: Preference name/identifier (unique)
  - `value`: JSON-stringified preference value

### `otp_verification`

Manages one-time passwords for user verification.

```sql
CREATE TABLE IF NOT EXISTS otp_verification (
  id SERIAL PRIMARY KEY,
  email TEXT NOT NULL,
  userid TEXT NOT NULL,
  otp TEXT NOT NULL,
  created_at BIGINT NOT NULL,
  attempts INTEGER DEFAULT 0,
  verified BOOLEAN DEFAULT FALSE
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_otp_email ON otp_verification(email);
CREATE INDEX IF NOT EXISTS idx_otp_userid ON otp_verification(userid);
```

- **Purpose**: Manages OTP verification for user registration and login
- **Fields**:
  - `id`: Auto-incrementing unique identifier
  - `email`: User's email address
  - `userid`: User ID being verified
  - `otp`: One-time password code
  - `created_at`: OTP creation timestamp
  - `attempts`: Number of verification attempts
  - `verified`: Whether OTP has been successfully verified

### `posts_cache`

Caches posts from the network for offline access.

```sql
CREATE TABLE IF NOT EXISTS posts_cache (
  id TEXT PRIMARY KEY NOT NULL,
  data TEXT NOT NULL,
  timestamp BIGINT NOT NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_posts_cache_timestamp ON posts_cache(timestamp);
```

- **Purpose**: Local cache of posts to improve performance and enable offline reading
- **Fields**:
  - `id`: Unique post identifier (matches the server-side ID)
  - `data`: JSON-stringified post data
  - `timestamp`: Cache timestamp for invalidation

### `draft_posts`

Stores locally-created posts that haven't been published yet.

```sql
CREATE TABLE IF NOT EXISTS draft_posts (
  id TEXT PRIMARY KEY NOT NULL,
  data TEXT NOT NULL,
  timestamp BIGINT NOT NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_draft_posts_timestamp ON draft_posts(timestamp);
```

- **Purpose**: Stores draft posts until they're ready to be published
- **Fields**:
  - `id`: Unique draft identifier
  - `data`: JSON-stringified post data
  - `timestamp`: Creation or last edit timestamp

### `posts`

Stores user-created posts for the timeline feature.

```sql
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

-- Indexes
CREATE INDEX IF NOT EXISTS idx_posts_user ON posts(user_id);
CREATE INDEX IF NOT EXISTS idx_posts_society ON posts(society_id);
CREATE INDEX IF NOT EXISTS idx_posts_created ON posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_global ON posts(is_global);
CREATE INDEX IF NOT EXISTS idx_posts_approval ON posts(approval_status);
```

- **Purpose**: Stores all user-created posts for the timeline
- **Fields**:
  - `id`: Unique post identifier
  - `user_id`: Author reference
  - `society_id`: Society the post belongs to
  - `title`: Post title (optional)
  - `content`: Post text content
  - `image_urls`: JSON array of image URLs
  - `created_at`: Creation timestamp
  - `updated_at`: Last update timestamp
  - `is_global`: Whether post appears in global timeline
  - `has_challenge`: Whether post has an associated challenge
  - `approval_status`: For moderation by Presidents (auto-approved for Presidents/Treasurers)
  - `approval_notes`: Notes related to moderation

### `post_interactions`

Tracks likes, comments, and shares on posts.

```sql
CREATE TABLE IF NOT EXISTS post_interactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id TEXT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('like', 'comment', 'share')),
  content TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  parent_id UUID REFERENCES post_interactions(id) ON DELETE CASCADE
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_post_interactions_post ON post_interactions(post_id);
CREATE INDEX IF NOT EXISTS idx_post_interactions_user ON post_interactions(user_id);
CREATE INDEX IF NOT EXISTS idx_post_interactions_type ON post_interactions(type);
CREATE INDEX IF NOT EXISTS idx_post_interactions_parent ON post_interactions(parent_id);
```

- **Purpose**: Tracks all user interactions with posts
- **Fields**:
  - `id`: Unique interaction identifier
  - `post_id`: Reference to the post
  - `user_id`: User who interacted
  - `type`: Type of interaction
  - `content`: Comment text or share note
  - `created_at`: When interaction occurred
  - `parent_id`: For threaded comments (replies)

### `events`

Stores event information and RSVP tracking.

```sql
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

-- Indexes
CREATE INDEX IF NOT EXISTS idx_events_society ON events(society_id);
CREATE INDEX IF NOT EXISTS idx_events_status ON events(status);
CREATE INDEX IF NOT EXISTS idx_events_date ON events(date);
CREATE INDEX IF NOT EXISTS idx_events_organizer ON events(organizer_id);
CREATE INDEX IF NOT EXISTS idx_events_approval ON events(approval_status);
```

- **Purpose**: Stores local event details
- **Fields**:
  - `id`: Unique event identifier
  - `title`: Event name
  - `description`: Event details
  - `society_id`: Society hosting the event
  - `location`: Event location
  - `date`: Event start date/time
  - `end_date`: Event end date/time
  - `organizer_id`: User organizing the event
  - `status`: Current status
  - `is_intersociety`: Whether multiple societies are involved
  - `created_at`: When event was created
  - `updated_at`: Last update timestamp
  - `approval_status`: For events created by regular Members/Tenants
  - `approval_notes`: Notes on approval decision

### `event_participants`

Tracks RSVPs and attendance for events.

```sql
CREATE TABLE IF NOT EXISTS event_participants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('going', 'maybe', 'not_going', 'attended')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_event_participants_event ON event_participants(event_id);
CREATE INDEX IF NOT EXISTS idx_event_participants_user ON event_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_event_participants_status ON event_participants(status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_event_participant ON event_participants(event_id, user_id);
```

- **Purpose**: Tracks user RSVPs for events
- **Fields**:
  - `id`: Unique participation record ID
  - `event_id`: Reference to the event
  - `user_id`: Participating user
  - `status`: RSVP status
  - `created_at`: When RSVP was created
  - `updated_at`: Last update timestamp

### `tournaments`

Stores tournament information.

```sql
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

-- Indexes
CREATE INDEX IF NOT EXISTS idx_tournaments_society ON tournaments(society_id);
CREATE INDEX IF NOT EXISTS idx_tournaments_status ON tournaments(status);
CREATE INDEX IF NOT EXISTS idx_tournaments_start_date ON tournaments(start_date);
CREATE INDEX IF NOT EXISTS idx_tournaments_organizer ON tournaments(organizer_id);
```

- **Purpose**: Stores tournament information
- **Fields**:
  - `id`: Unique tournament identifier
  - `name`: Tournament name
  - `description`: Tournament details
  - `society_id`: Primary society
  - `start_date`: Tournament start date
  - `end_date`: Tournament end date
  - `organizer_id`: User organizing tournament
  - `status`: Current status
  - `is_intersociety`: Whether multiple societies are involved
  - `max_participants`: Maximum participants allowed
  - `created_at`: When tournament was created
  - `updated_at`: Last update timestamp
  - `approval_status`: For tournaments created by Members/Tenants

### `tournament_participants`

Tracks tournament registrations.

```sql
CREATE TABLE IF NOT EXISTS tournament_participants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tournament_id TEXT NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  registration_status TEXT NOT NULL CHECK (registration_status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_tournament_participants_tournament ON tournament_participants(tournament_id);
CREATE INDEX IF NOT EXISTS idx_tournament_participants_user ON tournament_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_tournament_participants_status ON tournament_participants(registration_status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_tournament_participant ON tournament_participants(tournament_id, user_id);
```

- **Purpose**: Tracks tournament registrations
- **Fields**:
  - `id`: Unique registration record ID
  - `tournament_id`: Reference to tournament
  - `user_id`: Participating user
  - `registration_status`: Registration status
  - `created_at`: When registration was created
  - `updated_at`: Last update timestamp

### `challenges`

Stores challenge information created on activity posts.

```sql
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

-- Indexes
CREATE INDEX IF NOT EXISTS idx_challenges_creator ON challenges(creator_id);
CREATE INDEX IF NOT EXISTS idx_challenges_post ON challenges(post_id);
CREATE INDEX IF NOT EXISTS idx_challenges_status ON challenges(status);
CREATE INDEX IF NOT EXISTS idx_challenges_expiry ON challenges(expiry_date);
```

- **Purpose**: Defines challenges that users can activate on their activity posts
- **Fields**:
  - `id`: Unique challenge identifier
  - `post_id`: Reference to post where challenge was activated
  - `creator_id`: User who created the challenge
  - `title`: Challenge title
  - `description`: Detailed challenge description
  - `status`: Current status (active, completed, expired)
  - `criteria`: Rules to determine the winner
  - `reward`: What the winner receives (optional)
  - `created_at`: Challenge creation timestamp
  - `start_date`: When the challenge officially begins
  - `expiry_date`: Deadline for challenge completion
  - `max_participants`: Limit on number of participants (null = unlimited)
  - `visibility`: Who can see and participate in the challenge

### `challenge_requests`

Tracks users requesting to participate in challenges.

```sql
CREATE TABLE IF NOT EXISTS challenge_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  challenge_id UUID NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
  requester_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  message TEXT,
  status TEXT NOT NULL CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_challenge_requests_challenge ON challenge_requests(challenge_id);
CREATE INDEX IF NOT EXISTS idx_challenge_requests_requester ON challenge_requests(requester_id);
CREATE INDEX IF NOT EXISTS idx_challenge_requests_status ON challenge_requests(status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_challenge_requester ON challenge_requests(challenge_id, requester_id);
```

- **Purpose**: Manages requests from users wanting to participate in challenges
- **Fields**:
  - `id`: Unique request identifier
  - `challenge_id`: Reference to the challenge
  - `requester_id`: User requesting to participate
  - `message`: Optional message with request
  - `status`: Request status (pending, accepted, rejected)
  - `created_at`: Request creation timestamp
  - `updated_at`: Last update timestamp

### `challenge_participants`

Tracks active participants in challenges.

```sql
CREATE TABLE IF NOT EXISTS challenge_participants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  challenge_id UUID NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status TEXT NOT NULL CHECK (status IN ('active', 'withdrawn', 'completed', 'disqualified')),
  final_score NUMERIC DEFAULT NULL,
  rank INTEGER DEFAULT NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_challenge_participants_challenge ON challenge_participants(challenge_id);
CREATE INDEX IF NOT EXISTS idx_challenge_participants_user ON challenge_participants(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_challenge_participant ON challenge_participants(challenge_id, user_id);
```

- **Purpose**: Tracks users who are participating in challenges
- **Fields**:
  - `id`: Unique participant entry identifier
  - `challenge_id`: Reference to the challenge
  - `user_id`: Participating user
  - `joined_at`: When user joined the challenge
  - `status`: Participation status
  - `final_score`: Final result/score in the challenge
  - `rank`: Final ranking in the challenge

### `challenge_attempts`

Records individual attempts by challenge participants.

```sql
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

-- Indexes
CREATE INDEX IF NOT EXISTS idx_challenge_attempts_participant ON challenge_attempts(participant_id);
CREATE INDEX IF NOT EXISTS idx_challenge_attempts_date ON challenge_attempts(attempt_date);
CREATE INDEX IF NOT EXISTS idx_challenge_attempts_verified ON challenge_attempts(verified);
```

- **Purpose**: Tracks individual challenge attempts and results
- **Fields**:
  - `id`: Unique attempt identifier
  - `participant_id`: Reference to challenge participant
  - `attempt_date`: When the attempt was made
  - `score`: Numerical score or result of the attempt
  - `evidence`: JSON containing proof (e.g., photo/video URLs)
  - `notes`: Additional information about the attempt
  - `verified`: Whether the attempt has been verified
  - `verified_by`: User who verified the attempt
  - `verified_at`: When the attempt was verified

## Initial Setup

To initialize the schema in your Supabase project:

1. Navigate to your Supabase project dashboard
2. Go to the SQL Editor
3. Create a new query and paste the following SQL:

```sql
-- Create all tables
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY NOT NULL,
  email TEXT NOT NULL UNIQUE,
  display_name TEXT,
  password TEXT NOT NULL,
  society TEXT,
  role TEXT NOT NULL DEFAULT 'Member' CHECK (role IN ('President', 'Treasurer', 'Member', 'Tenant', 'Unverified')),
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

-- Challenge feature tables
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

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
```

4. Run the query to create all necessary tables and indexes

## Security Rules

In Supabase, Row Level Security (RLS) should be configured based on user roles:

```sql
-- Example RLS policy for users table
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Users can read all other users but only update their own profile
CREATE POLICY users_select_policy ON users FOR SELECT USING (true);
CREATE POLICY users_update_policy ON users FOR UPDATE USING (auth.uid() = id);

-- Post policies based on role
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

-- Anyone can read approved posts
CREATE POLICY posts_select_policy ON posts FOR SELECT USING (
  approval_status = 'approved' OR auth.uid() = user_id
);

-- Presidents and Treasurers can post without approval
CREATE POLICY posts_insert_policy_leaders ON posts 
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role IN ('President', 'Treasurer')
    )
  );

-- Members and Tenants can create posts that need approval
CREATE POLICY posts_insert_policy_members ON posts 
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role IN ('Member', 'Tenant')
    )
  );

-- Only Presidents can approve posts
CREATE POLICY posts_update_approval_policy ON posts 
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'President'
    )
  );

-- Event policies based on role
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- Only Presidents and Treasurers can create events
CREATE POLICY events_insert_policy ON events 
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role IN ('President', 'Treasurer')
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
      WHERE u.id = auth.uid() AND u.society = (
        SELECT us.society FROM users us WHERE us.id = creator_id
      )
    )) OR 
    creator_id = auth.uid()
  );

CREATE POLICY challenges_insert_policy ON challenges 
  FOR INSERT WITH CHECK (auth.uid() = creator_id);

CREATE POLICY challenges_update_policy ON challenges 
  FOR UPDATE USING (auth.uid() = creator_id);

-- Request policies
CREATE POLICY challenge_requests_select_policy ON challenge_requests 
  FOR SELECT USING (
    requester_id = auth.uid() OR 
    EXISTS (
      SELECT 1 FROM challenges c 
      WHERE c.id = challenge_id AND c.creator_id = auth.uid()
    )
  );

CREATE POLICY challenge_requests_insert_policy ON challenge_requests 
  FOR INSERT WITH CHECK (auth.uid() = requester_id);

-- Participant policies
CREATE POLICY challenge_participants_select_policy ON challenge_participants 
  FOR SELECT USING (true);  -- All participants visible

CREATE POLICY challenge_participants_insert_policy ON challenge_participants 
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM challenges c 
      WHERE c.id = challenge_id AND c.creator_id = auth.uid()
    )
  );

-- Attempt policies
CREATE POLICY challenge_attempts_select_policy ON challenge_attempts 
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM challenge_participants cp 
      JOIN challenges c ON cp.challenge_id = c.id
      WHERE cp.id = participant_id AND (cp.user_id = auth.uid() OR c.creator_id = auth.uid())
    )
  );

CREATE POLICY challenge_attempts_insert_policy ON challenge_attempts 
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM challenge_participants cp 
      WHERE cp.id = participant_id AND cp.user_id = auth.uid()
    )
  );
```

The security rules ensure that users can only perform actions appropriate to their roles, as defined in the membership and actions documents.
