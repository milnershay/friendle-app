# Deployment Guide - Friendle

## Firebase Hosting (Recommended - FREE)

### Prerequisites
✅ Firebase project created (`friendle-100`)  
✅ Realtime Database configured  
✅ `.env.local` with Firebase credentials

### Steps

1. **Install Firebase CLI**
   ```bash
   npm install -g firebase-tools
   ```

2. **Login to Firebase**
   ```bash
   firebase login
   ```

3. **Initialize Firebase Hosting**
   ```bash
   firebase init hosting
   ```
   - Select your project: `friendle-100`
   - Public directory: `out`
   - Configure as single-page app: `Yes`
   - Set up automatic builds: `No`

4. **Update `package.json`** (already done)
   ```json
   {
     "scripts": {
       "build": "next build && next export"
     }
   }
   ```

5. **Build and Deploy**
   ```bash
   npm run build
   firebase deploy --only hosting
   ```

6. **Set Environment Variables**
   
   In Firebase Console:
   - Go to Hosting → Settings
   - Add environment variables (Firebase loads from project automatically)

### Your App URL
After deployment: `https://friendle-100.web.app`

---

## Alternative: Docker (Render/Railway)

### Render.com
1. Create a new **Web Service**
2. Connect your GitHub repo
3. Settings:
   - Environment: Docker
   - Add environment variables from `.env.local`
4. Deploy

### Railway.app
1. Create new project → Deploy from GitHub
2. Add environment variables
3. Deploy automatically

---

## Local Testing

```bash
npm run dev
```

Then open: http://localhost:3000

---

## Environment Variables Required

```
NEXT_PUBLIC_FIREBASE_API_KEY=your_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_domain
NEXT_PUBLIC_FIREBASE_DATABASE_URL=your_db_url
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```
