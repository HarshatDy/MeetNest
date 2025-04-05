-- SQL script to initialize Supabase database schema
-- Run this in the Supabase SQL Editor

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY NOT NULL,
  email TEXT NOT NULL UNIQUE,
  display_name TEXT,
  password TEXT NOT NULL,
  society TEXT,
  is_logged_in BOOLEAN DEFAULT FALSE,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL
);

-- Create preferences table
CREATE TABLE IF NOT EXISTS preferences (
  id SERIAL PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  value TEXT NOT NULL
);

-- Create posts_cache table
CREATE TABLE IF NOT EXISTS posts_cache (
  id TEXT PRIMARY KEY NOT NULL,
  data TEXT NOT NULL,
  timestamp BIGINT NOT NULL
);

-- Create draft_posts table
CREATE TABLE IF NOT EXISTS draft_posts (
  id TEXT PRIMARY KEY NOT NULL,
  data TEXT NOT NULL,
  timestamp BIGINT NOT NULL
);

-- Create otp_verification table
CREATE TABLE IF NOT EXISTS otp_verification (
  id SERIAL PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  userid TEXT NOT NULL, 
  otp TEXT NOT NULL,
  created_at BIGINT NOT NULL,
  attempts INTEGER DEFAULT 0,
  verified BOOLEAN DEFAULT FALSE
);

-- Add schema version to preferences
INSERT INTO preferences (key, value)
VALUES ('schema_version', '1.0')
ON CONFLICT (key) 
DO UPDATE SET value = '1.0';
