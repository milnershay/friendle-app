/**
 * Input validation and rate limiting utilities
 */

/**
 * Validation constants used throughout the application.
 */
export const VALIDATION = {
  ROOM_CODE: {
    LENGTH: 6,
    PATTERN: /^[A-Z0-9]{6}$/,
  },
  WORD: {
    MIN_LENGTH: 4,
    MAX_LENGTH: 6,
    PATTERN_EN: /^[A-Z]+$/,
    PATTERN_HE: /^[\u0590-\u05FF]+$/,
  },
} as const;

/**
 * Internal interface for tracking rate limit entries.
 */
interface RateLimitEntry {
  count: number;
  firstAttempt: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

/**
 * Validates a room code format.
 *
 * @param code - The room code to validate.
 * @returns An object containing a boolean `valid` status and an optional `error` message.
 */
export function validateRoomCode(code: string): { valid: boolean; error?: string } {
  if (!code || code.length === 0) {
    return { valid: false, error: 'Room code cannot be empty' };
  }

  const upper = code.toUpperCase();

  if (upper.length !== VALIDATION.ROOM_CODE.LENGTH) {
    return { valid: false, error: `Room code must be exactly ${VALIDATION.ROOM_CODE.LENGTH} characters` };
  }

  if (!VALIDATION.ROOM_CODE.PATTERN.test(upper)) {
    return { valid: false, error: 'Room code can only contain letters and numbers' };
  }

  return { valid: true };
}

/**
 * Validates a custom word for the game queue.
 *
 * @param word - The word to validate.
 * @param language - The language of the word ('en' or 'he').
 * @param length - The expected length of the word.
 * @returns An object containing a boolean `valid` status and an optional `error` message.
 */
export function validateWord(word: string, language: 'en' | 'he', length: number): { valid: boolean; error?: string } {
  if (!word || word.trim().length === 0) {
    return { valid: false, error: 'Word cannot be empty' };
  }

  const trimmed = word.trim().toUpperCase();

  if (trimmed.length !== length) {
    return { valid: false, error: `Word must be exactly ${length} letters` };
  }

  const pattern = language === 'en' ? VALIDATION.WORD.PATTERN_EN : VALIDATION.WORD.PATTERN_HE;
  if (!pattern.test(trimmed)) {
    return { valid: false, error: `Word can only contain ${language === 'en' ? 'English' : 'Hebrew'} letters` };
  }

  return { valid: true };
}

/**
 * Checks if a user is within the rate limit for a specific action.
 *
 * @param key - The unique key for the rate limit bucket (usually based on user ID and action).
 * @param maxAttempts - The maximum number of allowed attempts within the window. Defaults to 5.
 * @param windowMs - The time window in milliseconds. Defaults to 60000 (1 minute).
 * @returns An object containing a boolean `allowed` status and an optional `retryAfter` duration in seconds.
 */
export function checkRateLimit(
  key: string,
  maxAttempts: number = 5,
  windowMs: number = 60000 // 1 minute
): { allowed: boolean; retryAfter?: number } {
  const now = Date.now();
  const entry = rateLimitStore.get(key);

  // No previous attempts or window expired
  if (!entry || now - entry.firstAttempt > windowMs) {
    rateLimitStore.set(key, {
      count: 1,
      firstAttempt: now,
    });
    return { allowed: true };
  }

  // Within window
  if (entry.count < maxAttempts) {
    entry.count++;
    return { allowed: true };
  }

  // Rate limit exceeded
  const retryAfter = Math.ceil((entry.firstAttempt + windowMs - now) / 1000);
  return { allowed: false, retryAfter };
}

/**
 * Sanitizes text input by trimming and removing excessive whitespace.
 *
 * @param text - The text to sanitize.
 * @returns The sanitized text.
 */
export function sanitizeText(text: string): string {
  return text.trim().replace(/\s+/g, ' ');
}

/**
 * Generates a rate limit key based on user identifier.
 * Uses localStorage user ID if available, otherwise falls back to a session ID.
 *
 * @param action - The action identifier (e.g., 'create_room').
 * @returns A unique key for rate limiting.
 */
export function getRateLimitKey(action: string): string {
  // Try to get a stable identifier
  let userId = '';

  if (typeof window !== 'undefined') {
    // Try to get from localStorage
    const keys = Object.keys(localStorage);
    const uidKey = keys.find(key => key.startsWith('friendle_uid_'));
    if (uidKey) {
      userId = localStorage.getItem(uidKey) || '';
    }

    // Fallback to session storage
    if (!userId) {
      userId = sessionStorage.getItem('friendle_session_id') || '';
      if (!userId) {
        userId = crypto.randomUUID();
        sessionStorage.setItem('friendle_session_id', userId);
      }
    }
  }

  return `${action}_${userId}`;
}

/**
 * Clears the rate limit for a specific key.
 * Useful for testing or resetting limits.
 *
 * @param key - The key to clear.
 */
export function clearRateLimit(key: string): void {
  rateLimitStore.delete(key);
}

/**
 * Clears all rate limits.
 * Useful for testing.
 */
export function clearAllRateLimits(): void {
  rateLimitStore.clear();
}
