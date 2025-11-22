# Deployment Guide

This guide covers deploying Friendle to production.

## Pre-Deployment Checklist

### 1. Environment Variables

Create `.env.local` (development) and `.env.production` (production) with:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_domain
NEXT_PUBLIC_FIREBASE_DATABASE_URL=your_database_url
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

**✅ Verify all variables are set:**
```bash
npm run check:env
```

### 2. Firebase Configuration

**Deploy Database Rules:**
```bash
firebase deploy --only database
```

**Verify rules are active:**
- Go to Firebase Console → Realtime Database → Rules
- Check that rules match `database.rules.json`

### 3. Security Checklist

- [ ] Firebase security rules deployed and tested
- [ ] Environment variables configured for production
- [ ] Admin panel protected (add authentication before production!)
- [ ] CORS configured if using custom domain
- [ ] HTTPS enabled (automatic with Firebase Hosting)
- [ ] Security headers configured in `firebase.json`

### 4. Code Quality

```bash
# Run linter
npm run lint

# Build and check for errors
npm run build

# Test the production build locally
npm run start
```

### 5. Testing

- [ ] Test room creation
- [ ] Test joining with code
- [ ] Test multiplayer gameplay (minimum 2 players)
- [ ] Test on mobile devices (iOS Safari, Android Chrome)
- [ ] Test both English and Hebrew languages
- [ ] Test RTL layout in Hebrew
- [ ] Test host controls (reset, skip, clear scores)
- [ ] Test leave room functionality
- [ ] Test admin panel

## Deployment Options

### Option 1: GitHub Actions + Vercel (Recommended for CI/CD)

**Automated deployment on every push to main!**

GitHub Actions provides:
- Automatic testing (lint, unit tests, E2E)
- Automatic deployment to Vercel on push to `main`
- Preview deployments on pull requests (optional)
- Build verification before deployment

**Setup:**

See [GITHUB_ACTIONS.md](./GITHUB_ACTIONS.md) for complete setup instructions.

**Quick summary:**
1. Configure GitHub Secrets (Firebase env vars + Vercel credentials)
2. Push to `main` branch
3. GitHub Actions automatically runs tests and deploys to Vercel

**Status:** ✅ Workflows configured in `.github/workflows/`

---

### Option 2: Firebase Hosting

Firebase Hosting provides:
- Global CDN
- Automatic SSL
- Easy rollback
- Preview channels

**Initial Setup:**
```bash
# Install Firebase CLI
npm install -g firebase-tools

# Login
firebase login

# Initialize (select Hosting and Database)
firebase init
```

**Deploy:**
```bash
# Build static export
npm run build:export

# Deploy everything
firebase deploy

# Or deploy only hosting
firebase deploy --only hosting

# Or deploy only database rules
firebase deploy --only database
```

**Preview Before Deploy:**
```bash
firebase hosting:channel:deploy preview
```

### Option 3: Vercel (Manual)

**Quick Deploy:**
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Production deploy
vercel --prod
```

**Environment Variables:**
- Add all `NEXT_PUBLIC_*` variables in Vercel dashboard
- Project Settings → Environment Variables

### Option 4: Docker

**Build Image:**
```bash
docker build -t friendle .
```

**Run Locally:**
```bash
docker run -p 3000:3000 \
  -e NEXT_PUBLIC_FIREBASE_API_KEY=your_key \
  -e NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_domain \
  # ... other env vars
  friendle
```

**Deploy to Cloud:**
- Push to Docker Hub or GitHub Container Registry
- Deploy to Cloud Run, ECS, or Kubernetes

### Option 5: Static Export + Any CDN

**Build Static Export:**
```bash
npm run build:export
```

This creates an `out/` directory with static files.

**Deploy to:**
- Netlify: Drag and drop `out/` folder
- Cloudflare Pages: Connect git repo
- AWS S3 + CloudFront
- Any static hosting provider

## Post-Deployment

### 1. Verify Deployment

- [ ] Visit your production URL
- [ ] Create a test room
- [ ] Join with second device
- [ ] Play a full game
- [ ] Check admin panel works
- [ ] Test language switching

### 2. Monitor Firebase Usage

**Set up budget alerts:**
1. Firebase Console → Usage and billing
2. Set up budget alerts for:
   - Database reads/writes
   - Storage
   - Bandwidth

**Expected Usage:**
- ~10-20 reads per player per second during active game
- ~5-10 writes per player per game
- Minimal storage (rooms are small JSON objects)

### 3. Set Up Room Cleanup

**Option A: Cloud Function (Recommended)**

Create a scheduled Firebase Cloud Function:

```typescript
import * as functions from 'firebase-functions';
import { cleanupOldRooms } from './roomCleanup';

export const scheduledCleanup = functions.pubsub
  .schedule('every 24 hours')
  .onRun(async (context) => {
    await cleanupOldRooms(24); // Clean rooms older than 24 hours
    return null;
  });
```

**Option B: Manual Cleanup**

Run periodically via admin panel or cron job:
```bash
# Visit /admin and click cleanup buttons
```

### 4. Add Admin Authentication

⚠️ **CRITICAL**: The admin panel (`/admin`) has no authentication!

**Before production, add authentication:**

```typescript
// src/app/admin/page.tsx
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminPage() {
  const router = useRouter();

  useEffect(() => {
    const password = prompt('Enter admin password:');
    if (password !== process.env.NEXT_PUBLIC_ADMIN_PASSWORD) {
      router.push('/');
    }
  }, []);

  // ... rest of component
}
```

Or use Firebase Authentication with admin role.

## Rollback

### Firebase Hosting

```bash
# List recent deployments
firebase hosting:clone

# Rollback to previous version
firebase hosting:rollback
```

### Vercel

```bash
# List deployments
vercel ls

# Promote a previous deployment
vercel promote [deployment-url]
```

## Troubleshooting

### Build Fails

```bash
# Clear cache
rm -rf .next out node_modules
npm install
npm run build
```

### Database Connection Issues

- Verify Firebase config in `.env.production`
- Check Firebase Console for quota limits
- Verify database rules allow read/write

### Mobile Issues

- Test on real devices, not just simulators
- Check Safari console for iOS issues
- Verify viewport meta tag in `layout.tsx`

### Performance Issues

**Monitor Firebase:**
- Firebase Console → Realtime Database → Usage
- Look for excessive reads/writes

**Optimize:**
- Implement client-side caching
- Reduce polling frequency
- Add database indexes if needed

## Scaling Considerations

### Current Architecture

- Suitable for 100s of concurrent rooms
- Each room = 2-6 players
- Realtime Database handles this easily

### If You Grow Larger

**Consider:**
1. **Cloud Functions** for server-side validation
2. **Firebase App Check** to prevent abuse
3. **Database sharding** by region
4. **Analytics** (Firebase Analytics, Mixpanel)
5. **Error tracking** (Sentry, LogRocket)
6. **Rate limiting** per IP/user

## Cost Estimates

**Firebase Free Tier:**
- 100 simultaneous connections
- 1 GB storage
- 10 GB/month bandwidth

**Small Scale (100 daily users):**
- ~$0-5/month (likely free tier)

**Medium Scale (1000 daily users):**
- ~$20-50/month (depending on usage patterns)

**Optimization Tips:**
- Clean up old rooms regularly
- Use `.indexOn` for queries
- Implement client-side caching
- Compress data where possible

## Security Best Practices

1. **Never commit `.env` files** to git
2. **Use environment variables** for all sensitive data
3. **Deploy security rules** before going live
4. **Add rate limiting** to prevent abuse
5. **Monitor database** for unusual activity
6. **Protect admin routes** with authentication
7. **Use Firebase App Check** for production
8. **Keep dependencies updated** regularly

## Support

For issues:
1. Check Firebase Console for errors
2. Check browser console for client errors
3. Review this deployment guide
4. Check `FIREBASE_SETUP.md` for config issues

## Quick Reference

```bash
# Development
npm run dev

# Build for production
npm run build

# Build static export
npm run build:export

# Test production build
npm start

# Deploy to Firebase
firebase deploy

# Deploy with preview
firebase hosting:channel:deploy preview

# Check environment
npm run check:env
```
