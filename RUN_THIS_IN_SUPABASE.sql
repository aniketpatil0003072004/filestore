-- ==========================================
-- 1. Create table for storing face data
-- ==========================================
CREATE TABLE IF NOT EXISTS user_faces (
  id BIGSERIAL PRIMARY KEY,
  user_token TEXT NOT NULL UNIQUE,
  face_descriptor JSONB NOT NULL,
  face_image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  FOREIGN KEY (user_token) REFERENCES user_tokens(token) ON DELETE CASCADE
);

-- ==========================================
-- 2. Enable Security (RLS)
-- ==========================================
ALTER TABLE user_faces ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- 3. Safely Re-Create Access Policies (Table)
-- ==========================================

-- Drop our specific policies if they exist (to allow updates)
DROP POLICY IF EXISTS "Face Auth: Read Access" ON user_faces;
DROP POLICY IF EXISTS "Face Auth: Insert Access" ON user_faces;
DROP POLICY IF EXISTS "Face Auth: Update Access" ON user_faces;

-- Create new policies with unique names
CREATE POLICY "Face Auth: Read Access"
  ON user_faces FOR SELECT
  USING (true);

CREATE POLICY "Face Auth: Insert Access"
  ON user_faces FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Face Auth: Update Access"
  ON user_faces FOR UPDATE
  USING (true);

-- ==========================================
-- 4. Storage Bucket Setup
-- ==========================================

-- Create bucket if missing
INSERT INTO storage.buckets (id, name, public)
VALUES ('screenshots', 'screenshots', true)
ON CONFLICT (id) DO NOTHING;

-- ==========================================
-- 5. Safely Create Storage Policies
-- ==========================================
-- We use unique names ("Screenshots Public Read") to avoid "already exists" errors 
-- with generic policies like "Public Access"

-- 1. Drop our specific policies if they exist
DROP POLICY IF EXISTS "Screenshots Public Read" ON storage.objects;
DROP POLICY IF EXISTS "Screenshots Upload Access" ON storage.objects;

-- 2. Create the policies
CREATE POLICY "Screenshots Public Read"
  ON storage.objects FOR SELECT
  USING ( bucket_id = 'screenshots' );

CREATE POLICY "Screenshots Upload Access"
  ON storage.objects FOR INSERT
  WITH CHECK ( bucket_id = 'screenshots' );
