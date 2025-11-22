# Firebase Setup Guide

## Current Status
✅ Firebase configuration added to `.env.local`  
⚠️ Realtime Database URL needs verification

## Next Steps

### 1. Create/Verify Realtime Database

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your **friendle-100** project
3. Click **"Realtime Database"** in the left sidebar
4. If you see "Create Database":
   - Click it
   - Choose a region close to you (e.g., `us-central1` or `europe-west1`)
   - Start in **test mode** for now

### 2. Get the Correct Database URL

Once created, you'll see the database URL at the top of the page. It will look like one of these:
- `https://friendle-100-default-rtdb.firebaseio.com` (US Central, legacy)
- `https://friendle-100-default-rtdb.europe-west1.firebasedatabase.app` (Europe)
- `https://friendle-100-default-rtdb.asia-southeast1.firebasedatabase.app` (Asia)

### 3. Update Database Rules (Important!)

Click the **"Rules"** tab and paste this:

```json
{
  "rules": {
    ".read": true,
    ".write": true
  }
}
```

Then click **"Publish"**.

> [!WARNING]
> These rules allow anyone to read/write. For production, you'd want to add authentication and stricter rules.

### 4. Share the URL

Once you have the exact database URL from step 2, share it and I'll update the `.env.local` file!
