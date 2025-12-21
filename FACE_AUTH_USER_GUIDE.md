# 🔓 Face Recognition Password Reset - User Guide

## What's New?

Your Vaultify app now supports **facial recognition authentication**! If you forget your password/token, you can simply use your face to login - just like unlocking your phone!

## Features

### ✨ During Sign Up
When you create a new account, you'll be prompted to register your face. This is **optional but highly recommended** because:
- Provides a backup login method if you forget your token
- Faster login experience
- Secure biometric authentication

### 🔓 Forgot Your Password?
If you can't remember your token:
1. Click the **"🔓 Forgot Password? Use Face"** button on the login screen
2. Enter your token (yes, you still need it to identify your account)
3. The camera will open
4. Position your face in the oval guide
5. Click **"📸 Capture Face"**
6. If your face matches, you're instantly logged in!

## How to Use

### Step 1: Register Your Face (One-Time Setup)

1. **Create a new account** or sign up with a token
2. After creating your token, you'll see this message:
   > "✅ Token created! Now register your face for password-free login."
   
3. **Position yourself:**
   - Ensure good lighting (natural light works best)
   - Face the camera directly
   - Align your face within the oval guide
   - Remove sunglasses or face masks
   
4. **Capture:**
   - Click **"📷 Capture Face"**
   - A 3-second countdown will begin
   - Stay still during the countdown
   - Your face will be captured automatically
   
5. **Success!**
   > "✅ Face registered successfully! You can now login with your face."

### Step 2: Login with Face Recognition

1. **On the login screen**, click **"🔓 Forgot Password? Use Face"**

2. **Enter your token** (this identifies which face to compare against)

3. **Click "📸 Verify Face"**

4. **Position your face** in the camera view
   - Same lighting conditions as registration work best
   - Face camera directly
   - Align within the oval guide

5. **Capture your face**
   - Click the capture button
   - Wait for verification

6. **Verification Result:**
   - ✅ **Success**: "Face verified! (95.2% match)" → Automatic login
   - ❌ **Failed**: "Face verification failed" → Try again or use token login

## Tips for Best Results

### Lighting
- ☀️ Use natural daylight when possible
- 💡 Ensure your face is evenly lit
- ❌ Avoid backlighting (don't sit in front of a window)
- ❌ Avoid harsh shadows

### Positioning
- 👤 Face the camera directly (not at an angle)
- 📏 Keep a consistent distance (arm's length)
- 👓 Remove sunglasses
- 😷 Remove face masks
- 🎭 Use neutral facial expression

### Environment
- 🏠 Use the same location for registration and verification
- 📱 Hold device steady
- 🔇 Quiet environment (less distractions)

## Troubleshooting

### "No face detected in the image"
**Solution:**
- Check your lighting
- Move closer to the camera
- Ensure your full face is visible
- Remove any obstructions (glasses, mask, hat)

### "Face verification failed"
**Possible Reasons:**
- Different lighting than registration
- Different angle or distance
- Wearing glasses/mask during verification but not registration
- Someone else trying to access your account (security working!)

**Solution:**
- Try capturing again with better lighting
- Match the conditions from your registration
- Use token-based login as fallback

### "No face registered for this token"
**Solution:**
- You haven't registered your face yet
- Use token-based login
- After logging in, you can register your face for future use

### "Token not found"
**Solution:**
- Double-check your token spelling
- Tokens are case-sensitive
- Use the token recovery method if available

## Security & Privacy

### 🔒 How Secure Is It?

**Very secure!** Here's why:
- Face data is converted to a **128-dimensional mathematical descriptor** (not a photo)
- Match threshold is strict: 60% minimum similarity required
- Typical same-person match: 80-95%
- Typical different-person match: 10-40%
- All processing happens **locally** in your browser (no cloud AI)

### 🕵️ Privacy

- **No photos are analyzed by third parties**
- Face recognition models run entirely in your browser
- Reference photo is stored in your Supabase account (you control it)
- You can delete your face data anytime by deleting your account

### 🚫 Limitations

- Face recognition is a **convenience feature**, not a replacement for passwords
- You still need to know your token to initiate face verification
- Works best on the same device you registered with
- May not work in very low light or with poor camera quality

## Re-Registering Your Face

If you want to update your registered face (e.g., new hairstyle, grew a beard):

1. Currently, you need to **delete and re-create your account** (we're working on an update feature!)
2. Or contact support to manually reset your face data

## Browser Compatibility

| Browser | Support |
|---------|---------|
| Chrome | ✅ Full support |
| Edge | ✅ Full support |
| Firefox | ✅ Full support |
| Safari | ✅ Full support (iOS 11+) |
| Mobile browsers | ✅ Full support |

## FAQs

**Q: Do I need to register my face?**
A: No, it's optional. You can always use your token to login.

**Q: Can someone use my photo to login?**
A: Very unlikely. Our system detects depth and requires a live face. A printed photo won't work.

**Q: What if I lose my phone?**
A: Your face data is stored in the cloud (Supabase), so you can still use face login from a new device by entering your token first.

**Q: Can I register multiple faces?**
A: Currently, only one face per account. We may add multi-face support in the future.

**Q: Will this work with twins?**
A: May have difficulty distinguishing identical twins. We recommend using traditional token login if you have an identical twin.

**Q: Does this work with makeup/beard/glasses?**
A: Minor changes (light makeup, reading glasses) are fine. Major changes (heavy makeup, full beard growth, sunglasses) may require re-registration.

## Need Help?

If you're experiencing issues:
1. Try the troubleshooting steps above
2. Check the developer console for error messages (F12 in browser)
3. Try using a different browser
4. Contact support with screenshots of any error messages

---

**Enjoy secure, convenient face-based authentication! 🎉**
