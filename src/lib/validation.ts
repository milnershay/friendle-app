/**
 * Input validation and rate limiting utilities
 */

// Validation constants
export const VALIDATION = {
  USERNAME: {
    MIN_LENGTH: 1,
    MAX_LENGTH: 30,
    PATTERN: /^[a-zA-Z0-9\u0590-\u05FF\s_-]+$/, // Alphanumeric + Hebrew + spaces, underscore, dash
  },
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

// Rate limiting storage
interface RateLimitEntry {
  count: number;
  firstAttempt: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

/**
 * Validate username
 */
export function validateUsername(username: string): { valid: boolean; error?: string } {
  if (!username || username.trim().length === 0) {
    return { valid: false, error: 'Username cannot be empty' };
  }

  const trimmed = username.trim();

  if (trimmed.length < VALIDATION.USERNAME.MIN_LENGTH) {
    return { valid: false, error: `Username must be at least ${VALIDATION.USERNAME.MIN_LENGTH} character` };
  }

  if (trimmed.length > VALIDATION.USERNAME.MAX_LENGTH) {
    return { valid: false, error: `Username must be at most ${VALIDATION.USERNAME.MAX_LENGTH} characters` };
  }

  if (!VALIDATION.USERNAME.PATTERN.test(trimmed)) {
    return { valid: false, error: 'Username can only contain letters, numbers, spaces, underscores, and dashes' };
  }

  return { valid: true };
}

/**
 * Validate room code format
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
 * Validate custom word
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
 * Rate limiting for room creation
 * Limits to maxAttempts per windowMs
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
 * Sanitize text input (remove excessive whitespace, trim)
 */
export function sanitizeText(text: string): string {
  return text.trim().replace(/\s+/g, ' ');
}

/**
 * Generate a rate limit key based on user identifier
 * Uses localStorage user ID if available, otherwise falls back to a session ID
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
        userId = Math.random().toString(36).substring(2);
        sessionStorage.setItem('friendle_session_id', userId);
      }
    }
  }

  return `${action}_${userId}`;
}

/**
 * Clear rate limit for a specific key (useful for testing)
 */
export function clearRateLimit(key: string): void {
  rateLimitStore.delete(key);
}

/**
 * Clear all rate limits (useful for testing)
 */
export function clearAllRateLimits(): void {
  rateLimitStore.clear();
}
