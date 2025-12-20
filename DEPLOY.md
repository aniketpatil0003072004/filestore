# 🚀 Quick Deploy to Vercel (Recommended)

## Step 1: Install Vercel CLI

```bash
npm install -g vercel
```

## Step 2: Build & Deploy

```bash
npm run build
vercel --prod
```

## Step 3: Follow Prompts

- Login with GitHub/Email
- Select project settings (defaults are fine)
- Wait for deployment
- You'll get a URL like: `https://video.aiprocotor.store

## Step 4: Install on Mobile

1. Open the URL on your phone
2. Click "📱 Install App" or browser menu → "Install"
3. Done! Now you can share videos directly to your app!

---

# Alternative: Netlify

```bash
npm install -g netlify-cli
netlify login
npm run build
netlify deploy --prod --dir=dist
```

---

# Testing Locally

```bash
npm run dev
```

Then open: http://localhost:5173

**Note:** Share Target API only works on deployed HTTPS sites!
