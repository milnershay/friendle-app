import { describe, it, expect } from 'vitest';
import { validateRoomSettings, sanitizeRoomData } from './validateRoom';
import { RoomData, RoomSettings } from '@/hooks/useRoom';

describe('validateRoomSettings', () => {
  const validSettings: RoomSettings = {
    wordLength: 5,
    customQueue: [],
    language: 'en',
    isPublic: true,
  };

  it('should return true for valid settings', () => {
    expect(validateRoomSettings(validSettings)).toBe(true);
  });

  it('should return false for null or undefined settings', () => {
    expect(validateRoomSettings(null)).toBe(false);
    expect(validateRoomSettings(undefined)).toBe(false);
  });

  it('should return false for invalid wordLength', () => {
    expect(validateRoomSettings({ ...validSettings, wordLength: 3 })).toBe(false);
    expect(validateRoomSettings({ ...validSettings, wordLength: 7 })).toBe(false);
    expect(validateRoomSettings({ ...validSettings, wordLength: '5' })).toBe(false);
  });

  it('should return false for invalid language', () => {
    expect(validateRoomSettings({ ...validSettings, language: 'es' })).toBe(false);
    expect(validateRoomSettings({ ...validSettings, language: 123 })).toBe(false);
  });

  it('should return false for invalid customQueue', () => {
    expect(validateRoomSettings({ ...validSettings, customQueue: 'not-an-array' })).toBe(false);
  });
});

describe('sanitizeRoomData', () => {
  const defaultSettings: RoomSettings = {
    wordLength: 5,
    customQueue: [],
    language: 'en',
    isPublic: true,
  };

  it('should return the same data if settings are valid', () => {
    const roomData: Partial<RoomData> = {
      settings: {
        wordLength: 6,
        customQueue: [],
        language: 'he',
        isPublic: false,
      },
    };
    const sanitized = sanitizeRoomData(roomData);
    expect(sanitized.settings).toEqual(roomData.settings);
  });

  it('should add default settings if settings are missing', () => {
    const roomData: Partial<RoomData> = {};
    const sanitized = sanitizeRoomData(roomData);
    expect(sanitized.settings).toEqual(defaultSettings);
  });

  it('should merge defaults for incomplete settings', () => {
    const roomData: Partial<RoomData> = {
      settings: {
        wordLength: 4,
      },
    };
    const sanitized = sanitizeRoomData(roomData);
    expect(sanitized.settings).toEqual({
      ...defaultSettings,
      wordLength: 4,
    });
  });

  it('should overwrite invalid fields with defaults during merge', () => {
    const roomData = {
      settings: {
        language: 'es', // invalid
        wordLength: 6, // valid
      },
    };
    const sanitized = sanitizeRoomData(roomData);
    expect(sanitized.settings).toEqual({
      ...defaultSettings,
      language: 'en', // Overwritten with default
      wordLength: 6, // Kept
    });
  });
});
