# Administration & Maintenance

This guide covers the administration and maintenance of the Friendle application.

## Admin Panel

The application includes a basic admin panel at `/admin`.

**Default URL:** `https://your-domain.com/admin`

### Access Control

The admin panel is protected by a password.

**Default Password:** `friendle_admin_2024` (Change this in production!)

**To change the admin password:**
1. Go to your deployment settings (e.g., Vercel Dashboard).
2. Settings → Environment Variables.
3. Add or update `NEXT_PUBLIC_ADMIN_PASSWORD` with your custom password.
4. Redeploy the application.

**Security Note:**
Currently, the admin panel uses simple client-side password verification. For high-security environments, implementing Firebase Authentication with admin claims is recommended.

### Features

- **View Statistics:** See real-time room counts, total players, and active vs. inactive rooms.
- **Room Cleanup:** Manually trigger cleanup of old rooms.

## Room Cleanup System

To maintain database performance and manage costs, old rooms should be cleaned up regularly.

### Automated Cleanup Utilities

Located in `src/lib/roomCleanup.ts`, the following utilities are available:

1. **`cleanupOldRooms(maxAgeHours)`**
   - Removes rooms older than the specified hours.
   - Only deletes rooms that are inactive (no recent updates).
   - Returns deletion statistics.
   - Safe to run periodically as it preserves active games.

2. **`deleteRoom(roomId)`**
   - Manually deletes a specific room.

3. **`getRoomStats()`**
   - Returns total rooms count, active vs. old rooms, and player stats.

### Setting up Automated Cleanup

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

**Option B: Manual Cleanup via Admin Panel**

1. Log in to the Admin Panel (`/admin`).
2. Use the "Cleanup" buttons to remove rooms older than 1 hour, 24 hours, or 7 days.

## Monitoring

### Vercel Dashboard
- View deployment history.
- Check analytics and error logs.
- Manage environment variables.

### Firebase Console
- **Realtime Database:** Monitor usage, connections, and data volume.
- **Security Rules:** Verify rules are active and blocking unauthorized access.
- **Usage & Billing:** Set up budget alerts to prevent unexpected costs.
