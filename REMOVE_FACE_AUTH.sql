-- ==========================================
-- REVERT SCRIPT: REMOVE FACE RECOGNITION
-- ==========================================

-- 1. Drop Policies
DROP POLICY IF EXISTS "Enable read access for all users" ON user_faces;
DROP POLICY IF EXISTS "Enable insert access" ON user_faces;
DROP POLICY IF EXISTS "Enable update access" ON user_faces;
DROP POLICY IF EXISTS "Users can read own face" ON user_faces;
DROP POLICY IF EXISTS "Users can insert own face" ON user_faces;
DROP POLICY IF EXISTS "Users can update own face" ON user_faces;
DROP POLICY IF EXISTS "Face Auth: Read Access" ON user_faces;
DROP POLICY IF EXISTS "Face Auth: Insert Access" ON user_faces;
DROP POLICY IF EXISTS "Face Auth: Update Access" ON user_faces;

-- 2. Drop Table
DROP TABLE IF EXISTS user_faces;

-- 3. Cleanup Storage Policies
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Upload Access" ON storage.objects;
DROP POLICY IF EXISTS "Screenshots Public Read" ON storage.objects;
DROP POLICY IF EXISTS "Screenshots Upload Access" ON storage.objects;

-- 4. Note: We usually keep the 'screenshots' bucket in case other features used it,
-- but if you want to completely remove it and its contents:
-- DELETE FROM storage.objects WHERE bucket_id = 'screenshots';
-- DELETE FROM storage.buckets WHERE id = 'screenshots';
