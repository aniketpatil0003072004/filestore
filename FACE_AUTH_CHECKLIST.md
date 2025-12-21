# 🚀 Face Recognition - Quick Start Checklist

## ✅ Completed (Already Done)

- [x] Installed `face-api.js` package
- [x] Created `faceRecognition.js` (core logic)
- [x] Created `FaceCapture.jsx` component (camera UI)
- [x] Updated `Auth.jsx` with face auth flows
- [x] Created SQL migration script
- [x] Created documentation

## 🔧 You Need To Do

### 1. Database Setup (5 minutes)

**Go to Supabase Dashboard:**
1. Open [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Click **SQL Editor** in left sidebar
4. Click **New Query**
5. Copy contents from `supabase_face_auth_migration.sql`
6. Paste into query editor
7. Click **Run** (bottom right)
8. Verify: Check **Table Editor** → Should see `user_faces` table

### 2. Storage Bucket Verification (2 minutes)

**In Supabase Dashboard:**
1. Click **Storage** in left sidebar
2. Find `screenshots` bucket
3. Click the bucket name
4. Click ⚙️ **Settings** (top right)
5. Ensure **Public bucket** toggle is **ON**
6. Save if changed

### 3. Test the Feature (10 minutes)

**A. Start Dev Server:**
```bash
cd e:\antigravity\video-organizer
npm run dev
```

**B. Test Sign Up + Face Registration:**
1. Open browser to `http://localhost:5173`
2. Click "New here? Create Token"
3. Enter token: `facetest123`
4. Click "Create Token"
5. Camera should open automatically
6. **Position your face** in the oval guide
7. Click "📷 Capture Face"
8. Wait for 3-2-1 countdown
9. Should see: "✅ Face registered successfully!"
10. Click "Enter Vault" to login normally

**C. Test Face Verification (Forgot Password):**
1. Logout (click Sign Out)
2. On login screen, click **"🔓 Forgot Password? Use Face"**
3. Enter token: `facetest123`
4. Click "📸 Verify Face"
5. Camera opens again
6. Position your face (same as registration)
7. Click "📷 Capture Face"
8. Should see: "✅ Face verified! (XX% match)"
9. Should auto-login to your vault!

**D. Test Error Cases:**
1. Try verification with **wrong token** → Should see error
2. Try verification with **different face** → Should fail match
3. Try registration with **no token** → Should see validation error

## 🐛 Troubleshooting

### Camera doesn't open?
**Solution:**
```
1. Check browser permissions (allow camera access)
2. Ensure using HTTPS in production (localhost is OK for dev)
3. Try different browser (Chrome recommended)
```

### "No face detected"?
**Solution:**
```
1. Improve lighting (face should be well-lit)
2. Move closer to camera
3. Remove sunglasses/mask
4. Ensure camera is working
```

### Face verification fails even with same person?
**Solution:**
```
1. Use same lighting as registration
2. Same distance from camera
3. Same facial expression (neutral)
4. If consistently fails, re-register face
```

### Database migration errors?
**Possible Issues:**
```sql
-- If user_tokens table doesn't exist, create it first:
CREATE TABLE IF NOT EXISTS user_tokens (
  id BIGSERIAL PRIMARY KEY,
  token TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Then run the face migration
```

## 📊 Verify It's Working

### Check Database
```sql
-- Run in Supabase SQL Editor
SELECT * FROM user_faces;
-- Should see your registered face data
```

### Check Storage
1. Go to Storage → screenshots bucket
2. Should see files like: `face_facetest123_1703123456789.jpg`

### Check Browser Console
```javascript
// Should see in console (F12):
✅ Face recognition models loaded
```

## 🎨 Customization Options

### Change Match Threshold (in faceRecognition.js):
```javascript
// Line ~35 - Make matching stricter or looser
const MATCH_THRESHOLD = 0.6; // Lower = stricter, Higher = looser
// 0.5 = Very strict (95%+ match required)
// 0.6 = Default (90%+ match required)
// 0.7 = Lenient (85%+ match required)
```

### Change Camera Mode (in FaceCapture.jsx):
```javascript
// Line ~32 - Use back camera instead
facingMode: 'environment', // 'user' for front, 'environment' for back
```

### Customize UI Colors (in Auth.jsx):
```javascript
// Line ~215 - Forgot password button gradient
background: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)',
// Change to your brand colors
```

## 📱 Mobile Testing

1. **Build for production:**
```bash
npm run build
```

2. **Serve over HTTPS** (required for camera on mobile):
```bash
# Option A: Use ngrok
npx ngrok http 5173

# Option B: Deploy to Vercel/Netlify
# Option C: Use local HTTPS dev server
```

3. **Test on mobile device:**
- Open HTTPS URL on mobile
- Allow camera permissions
- Test registration and verification

## ✨ Success Criteria

You know it's working when:
- ✅ Camera opens during signup
- ✅ Face is captured and saved
- ✅ Forgot password button appears on login
- ✅ Face verification camera opens
- ✅ Matching face grants access
- ✅ Different face is rejected
- ✅ Database has face_descriptor data
- ✅ Storage has face images

## 🎉 You're Done When...

- [ ] Database migration completed
- [ ] Storage bucket is public
- [ ] Test account created with face
- [ ] Face verification login works
- [ ] Error cases handled properly
- [ ] Works on mobile (if needed)

## 📞 Need Help?

**Common Issues:**
1. **Models not loading**: Check internet connection (models download from CDN)
2. **Camera black screen**: Check browser permissions
3. **Always fails match**: Re-register with better lighting
4. **SQL errors**: Ensure user_tokens table exists first

**Debug Mode:**
```javascript
// Add to faceRecognition.js for verbose logging
console.log('Face descriptor:', descriptor);
console.log('Match distance:', distance);
```

---

**Ready? Start with Step 1: Database Setup! 🚀**

Estimated total time: **15-20 minutes**
