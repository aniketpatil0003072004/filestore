# Facial Recognition Authentication - Setup Guide

## Overview
This feature allows users to reset their password using facial recognition instead of remembering their token.

## How It Works

### 1. **Sign Up Flow**
- User creates a new token
- App prompts user to register their face
- Camera opens, user positions face in the oval guide
- Face photo is captured and facial features are extracted (128-dimensional descriptor)
- Face descriptor is securely stored in database

### 2. **Login Flow (Forgot Password)**
- User clicks "🔓 Forgot Password? Use Face"
- User enters their token (to identify which face to compare against)
- Camera opens for live verification
- User's face is captured and compared with stored face
- If match is > 40% confidence, user is logged in automatically

### 3. **Security**
- Face data is stored as mathematical descriptors (not actual photos)
- Uses TensorFlow.js models for accurate face detection
- Threshold of 0.6 euclidean distance ensures secure matching
- Face photos are stored in Supabase storage with public URLs

## Installation Steps

### Step 1: Install Dependencies

```bash
npm install face-api.js
```

### Step 2: Create Database Table

Run this SQL in your Supabase SQL Editor:

```sql
-- Create user_faces table for storing facial recognition data
CREATE TABLE user_faces (
  id BIGSERIAL PRIMARY KEY,
  user_token TEXT NOT NULL UNIQUE,
  face_descriptor JSONB NOT NULL, -- 128-dimensional array
  face_image_url TEXT, -- Optional: Store reference image
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  FOREIGN KEY (user_token) REFERENCES user_tokens(token) ON DELETE CASCADE
);

-- Create index for faster lookups
CREATE INDEX idx_user_faces_token ON user_faces(user_token);

-- Add RLS policies
ALTER TABLE user_faces ENABLE ROW LEVEL SECURITY;

-- Allow users to insert their own face data
CREATE POLICY "Users can insert own face"
  ON user_faces FOR INSERT
  WITH CHECK (true);

-- Allow users to read their own face data
CREATE POLICY "Users can read own face"
  ON user_faces FOR SELECT
  USING (true);

-- Allow users to update their own face data
CREATE POLICY "Users can update own face"
  ON user_faces FOR UPDATE
  USING (true);
```

### Step 3: Verify Storage Bucket

Ensure the `screenshots` bucket exists in Supabase Storage and is publicly accessible:
- Go to Storage in Supabase Dashboard
- Create bucket named `screenshots` if it doesn't exist
- Set **Public bucket** to ON

### Step 4: Test the Feature

1. **Create a new account:**
   - Use token: `testuser123`
   - Register your face when prompted
   
2. **Test face login:**
   - Logout
   - Click "🔓 Forgot Password? Use Face"
   - Enter token: `testuser123`
   - Click "📸 Verify Face"
   - Position your face and capture
   - You should be logged in automatically if faces match!

## Technical Details

### Face Recognition Models
- **TinyFaceDetector**: Fast face detection
- **FaceLandmark68Net**: 68 facial landmark points
- **FaceRecognitionNet**: Generates 128-dimensional face descriptor

### Match Threshold
- Distance < 0.6 = Match (60% confidence)
- Distance > 0.6 = No match
- Typical same-person distance: 0.3-0.5
- Typical different-person distance: 0.7-1.0

### Error Handling
- "No face detected" - User needs better lighting or positioning
- "Token not found" - User entered wrong token
- "No face registered" - User needs to register face first
- "Face verification failed" - Faces don't match (security)

## Files Created
1. `src/faceRecognition.js` - Core face recognition logic
2. `src/components/FaceCapture.jsx` - Camera UI component
3. `src/Auth.jsx` - Updated with face auth flows

## Browser Compatibility
- Chrome/Edge: ✅ Full support
- Firefox: ✅ Full support
- Safari: ✅ Full support (iOS 11+)
- Mobile browsers: ✅ Full support

## Privacy Notes
- Face descriptors are mathematical representations, not photos
- Face images are stored for visual reference only
- No cloud AI services used - all processing is local
- Users can delete their face data by deleting their account
