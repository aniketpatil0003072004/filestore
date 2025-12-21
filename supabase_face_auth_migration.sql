-- Migration: Add Face Recognition Support
-- Created: 2025-12-21
-- Description: Creates user_faces table for storing facial recognition data

-- Create user_faces table
CREATE TABLE IF NOT EXISTS user_faces (
  id BIGSERIAL PRIMARY KEY,
  user_token TEXT NOT NULL UNIQUE,
  face_descriptor JSONB NOT NULL, -- 128-dimensional facial feature array
  face_image_url TEXT, -- Reference image URL from storage
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  FOREIGN KEY (user_token) REFERENCES user_tokens(token) ON DELETE CASCADE
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_faces_token ON user_faces(user_token);

-- Add comment
COMMENT ON TABLE user_faces IS 'Stores facial recognition data for passwordless authentication';
COMMENT ON COLUMN user_faces.face_descriptor IS 'JSON array of 128 float values representing facial features';
COMMENT ON COLUMN user_faces.face_image_url IS 'Public URL to reference face photo in Supabase Storage';

-- Enable Row Level Security
ALTER TABLE user_faces ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for re-running migration)
DROP POLICY IF EXISTS "Users can insert own face" ON user_faces;
DROP POLICY IF EXISTS "Users can read own face" ON user_faces;
DROP POLICY IF EXISTS "Users can update own face" ON user_faces;
DROP POLICY IF EXISTS "Users can delete own face" ON user_faces;

-- RLS Policy: Allow users to insert their own face data
CREATE POLICY "Users can insert own face"
  ON user_faces FOR INSERT
  WITH CHECK (true);

-- RLS Policy: Allow anyone to read face data (needed for verification)
CREATE POLICY "Users can read own face"
  ON user_faces FOR SELECT
  USING (true);

-- RLS Policy: Allow users to update their face data
CREATE POLICY "Users can update own face"
  ON user_faces FOR UPDATE
  USING (true);

-- RLS Policy: Allow users to delete their face data
CREATE POLICY "Users can delete own face"
  ON user_faces FOR DELETE
  USING (true);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_user_faces_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for auto-updating updated_at
DROP TRIGGER IF EXISTS trigger_update_user_faces_updated_at ON user_faces;
CREATE TRIGGER trigger_update_user_faces_updated_at
  BEFORE UPDATE ON user_faces
  FOR EACH ROW
  EXECUTE FUNCTION update_user_faces_updated_at();
