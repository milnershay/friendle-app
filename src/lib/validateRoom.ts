import { RoomData, RoomSettings } from '@/hooks/useRoom';

export function validateRoomSettings(settings: unknown): settings is RoomSettings {
  // Use !! to ensure a boolean is always returned
  return !!(
    settings &&
    typeof settings === 'object' &&
    typeof settings.wordLength === 'number' &&
    settings.wordLength >= 4 &&
    settings.wordLength <= 6 &&
    typeof settings.language === 'string' &&
    (settings.language === 'en' || settings.language === 'he') &&
    Array.isArray(settings.customQueue)
  );
}

export function sanitizeRoomData(data: unknown): RoomData {
  const defaultSettings: RoomSettings = {
    wordLength: 5,
    customQueue: [],
    language: 'en',
    isPublic: true,
  };

  const roomData = data as Partial<RoomData>;
  const incomingSettings = roomData.settings || {};

  // Start with defaults, layer incoming settings on top to preserve valid custom values
  const finalSettings = {
    ...defaultSettings,
    ...incomingSettings,
  };

  // Validate and correct each field individually, falling back to the default if invalid
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

  return {
    ...data,
    settings: finalSettings,
  };
}
