import { db } from '@/lib/firebase';
import { ref, get, update } from 'firebase/database';

// Define the shape of a Room and its Settings for type safety
interface RoomSettings {
  wordLength: number;
  customQueue: unknown[];
  language: 'en' | 'he';
  isPublic: boolean;
}

interface Room {
  settings?: Partial<RoomSettings>;
  [key: string]: unknown;
}

const defaultSettings: RoomSettings = {
  wordLength: 5,
  customQueue: [],
  language: 'en',
  isPublic: true,
};

function sanitizeSettings(existingSettings: Partial<RoomSettings> | undefined): RoomSettings {
    const settings = existingSettings || {};
    const finalSettings = { ...defaultSettings, ...settings };

    // Validate and correct each field individually
    if (typeof finalSettings.wordLength !== 'number' || finalSettings.wordLength < 4 || finalSettings.wordLength > 6) {
        finalSettings.wordLength = defaultSettings.wordLength;
    }
    if (typeof finalSettings.language !== 'string' || (finalSettings.language !== 'en' && finalSettings.language !== 'he')) {
        finalSettings.language = defaultSettings.language;
    }
    if (!Array.isArray(finalSettings.customQueue)) {
        finalSettings.customQueue = defaultSettings.customQueue;
    }
    if (typeof finalSettings.isPublic !== 'boolean') {
        finalSettings.isPublic = defaultSettings.isPublic;
    }
    return finalSettings;
}

async function migrateRoom(roomId: string, room: Room, dryRun: boolean): Promise<boolean> {
  const originalSettingsJSON = JSON.stringify(room.settings);
  const sanitizedSettings = sanitizeSettings(room.settings);
  const sanitizedSettingsJSON = JSON.stringify(sanitizedSettings);

  const needsMigration = originalSettingsJSON !== sanitizedSettingsJSON;

  if (needsMigration) {
      if (dryRun) {
        console.log(`[DRY RUN] Room ${roomId}: Settings would be changed from ${originalSettingsJSON} to ${sanitizedSettingsJSON}`);
      } else {
        console.log(`Room ${roomId}: Migrating settings.`);
        await update(ref(db, `rooms/${roomId}`), { settings: sanitizedSettings });
      }
  }

  return needsMigration;
}

async function migrateRoomSettings() {
  const args = process.argv.slice(2);
  const dryRun = !args.includes('--force');
  const roomFlagIndex = args.findIndex(arg => arg === '--room');
  const specificRoomId = roomFlagIndex !== -1 && args[roomFlagIndex + 1] ? args[roomFlagIndex + 1] : null;

  console.log(dryRun ? 'Running in dry-run mode. No changes will be saved.' : 'Running in force mode. Changes WILL be saved.');
  if (specificRoomId) {
    console.log(`Targeting specific room: ${specificRoomId}`);
  }

  let migratedCount = 0;
  let skippedCount = 0;
  let totalCount = 0;

  try {
    if (specificRoomId) {
      const roomRef = ref(db, `rooms/${specificRoomId}`);
      const snapshot = await get(roomRef);
      if (snapshot.exists()) {
        const room = snapshot.val() as Room;
        totalCount = 1;
        const migrated = await migrateRoom(specificRoomId, room, dryRun);
        if (migrated) {
          migratedCount++;
        } else {
          skippedCount++;
        }
      } else {
        console.error(`Error: Room with ID '${specificRoomId}' not found.`);
        return;
      }
    } else {
      const roomsRef = ref(db, 'rooms');
      const snapshot = await get(roomsRef);
      const rooms = snapshot.val() as Record<string, Room> | null;

      if (!rooms) {
        console.log('No rooms found to migrate.');
        return;
      }

      totalCount = Object.keys(rooms).length;
      for (const [roomId, room] of Object.entries(rooms)) {
        const migrated = await migrateRoom(roomId, room, dryRun);
        if (migrated) {
          migratedCount++;
        } else {
          skippedCount++;
        }
      }
    }

    console.log('\n--- Migration Summary ---');
    console.log(`Total rooms scanned: ${totalCount}`);
    console.log(`Rooms migrated:      ${migratedCount}`);
    console.log(`Rooms skipped:       ${skippedCount}`);
    console.log('-------------------------');

  } catch (error) {
    console.error('An unexpected error occurred during migration:', error);
  }
  // The process hangs without this, likely due to the open DB connection.
  process.exit(0);
}

migrateRoomSettings();
