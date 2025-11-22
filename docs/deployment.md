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

See [github-actions.md](./github-actions.md) for complete setup instructions.

#### Avoiding Double Deployments

This project uses **GitHub Actions** for deployments to maintain CI/CD control. To prevent double deployments (one from Vercel's git integration and one from GitHub Actions):

1. Go to your Vercel project settings.
2. Under "Git" settings, disable automatic deployments:
   - **Production Branch**: Leave empty or disable
   - **Preview Branches**: Disable if you want GitHub Actions to handle all deploys

The `.github/workflows/deploy-vercel.yml` workflow will handle all production deployments when you push to `main`.

#### Release Process

To create a new release with version bump:

```bash
# Bump version (patch: 0.1.0 → 0.1.1)
npm run release patch

# Bump version (minor: 0.1.0 → 0.2.0)
npm run release minor

# Bump version (major: 0.1.0 → 1.0.0)
npm run release major
```

This will:
1. Bump version in `package.json` and `package-lock.json`
2. Update `CHANGELOG.md` with new version and date
3. Create a git commit and tag
4. Push the tag to trigger deployment with the new version

### Option 2: Firebase Hosting

Firebase Hosting provides global CDN, automatic SSL, and easy rollback.

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
  # ... other env vars
  friendle
```

## Post-Deployment

### 1. Verify Deployment

- [ ] Visit your production URL
- [ ] Create a test room
- [ ] Join with second device
- [ ] Play a full game
- [ ] Check admin panel works
- [ ] Test language switching

### 2. Custom Domain Setup (Vercel)

To add a custom domain (e.g., friendle.com):

1. Go to Vercel Dashboard
2. Project Settings → Domains
3. Add your domain
4. Update your DNS records as shown
5. Vercel will automatically provision SSL

### 3. Monitor Firebase Usage

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
5. **Rate limiting** per IP/user

## Cost Estimates

**Firebase Free Tier:**
- 100 simultaneous connections
- 1 GB storage
- 10 GB/month bandwidth

**Small Scale (100 daily users):**
- ~$0-5/month (likely free tier)

**Medium Scale (1000 daily users):**
- ~$20-50/month (depending on usage patterns)
