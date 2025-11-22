import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
    validateUsername,
    validateRoomCode,
    validateWord,
    checkRateLimit,
    sanitizeText,
    getRateLimitKey,
    clearAllRateLimits
} from './validation';

describe('Validation', () => {
    describe('validateUsername', () => {
        it('accepts valid usernames', () => {
            expect(validateUsername('Player1').valid).toBe(true);
            expect(validateUsername('User Name').valid).toBe(true);
            expect(validateUsername('שלום').valid).toBe(true);
            expect(validateUsername('user-name_1').valid).toBe(true);
        });

        it('rejects empty usernames', () => {
            expect(validateUsername('').valid).toBe(false);
            expect(validateUsername('   ').valid).toBe(false);
        });

        it('rejects long usernames', () => {
            const longName = 'a'.repeat(31);
            expect(validateUsername(longName).valid).toBe(false);
        });

        it('rejects invalid characters', () => {
            expect(validateUsername('User@Name').valid).toBe(false);
            expect(validateUsername('<script>').valid).toBe(false);
        });
    });

    describe('validateRoomCode', () => {
        it('accepts valid room codes', () => {
            expect(validateRoomCode('ABCDEF').valid).toBe(true);
            expect(validateRoomCode('123456').valid).toBe(true);
            expect(validateRoomCode('AB12CD').valid).toBe(true);
        });

        it('rejects invalid lengths', () => {
            expect(validateRoomCode('ABC').valid).toBe(false);
            expect(validateRoomCode('ABCDEFG').valid).toBe(false);
        });

        it('rejects invalid characters', () => {
            expect(validateRoomCode('ABCDE$').valid).toBe(false);
            expect(validateRoomCode('abc def').valid).toBe(false);
        });
    });

    describe('validateWord', () => {
        it('accepts valid English words', () => {
            expect(validateWord('APPLE', 'en', 5).valid).toBe(true);
            expect(validateWord('apple', 'en', 5).valid).toBe(true); // Case insensitive
        });

        it('accepts valid Hebrew words', () => {
            expect(validateWord('תפוח', 'he', 4).valid).toBe(true);
        });

        it('rejects incorrect length', () => {
            expect(validateWord('APPLE', 'en', 4).valid).toBe(false);
            expect(validateWord('APPLE', 'en', 6).valid).toBe(false);
        });

        it('rejects mixed languages', () => {
            expect(validateWord('APPLא', 'en', 5).valid).toBe(false);
            expect(validateWord('שלום', 'en', 4).valid).toBe(false);
            expect(validateWord('HELO', 'he', 4).valid).toBe(false);
        });
    });

    describe('checkRateLimit', () => {
        beforeEach(() => {
            clearAllRateLimits();
        });

        it('allows attempts within limit', () => {
            const key = 'test_action';
            expect(checkRateLimit(key, 3, 1000).allowed).toBe(true);
            expect(checkRateLimit(key, 3, 1000).allowed).toBe(true);
            expect(checkRateLimit(key, 3, 1000).allowed).toBe(true);
        });

        it('blocks attempts exceeding limit', () => {
            const key = 'test_action';
            checkRateLimit(key, 2, 1000);
            checkRateLimit(key, 2, 1000);
            const result = checkRateLimit(key, 2, 1000);
            expect(result.allowed).toBe(false);
            expect(result.retryAfter).toBeGreaterThan(0);
        });

        it('resets after window expires', async () => {
            vi.useFakeTimers();
            const key = 'test_action';
            checkRateLimit(key, 1, 1000);
            expect(checkRateLimit(key, 1, 1000).allowed).toBe(false);

            vi.advanceTimersByTime(1001);

            expect(checkRateLimit(key, 1, 1000).allowed).toBe(true);
            vi.useRealTimers();
        });
    });

    describe('sanitizeText', () => {
        it('trims and collapses whitespace', () => {
            expect(sanitizeText('  hello   world  ')).toBe('hello world');
            expect(sanitizeText('foo\nbar')).toBe('foo bar');
        });
    });

    describe('getRateLimitKey', () => {
        it('returns a key based on action', () => {
            const key = getRateLimitKey('test');
            expect(key).toContain('test_');
        });

        it('uses sessionStorage if available', () => {
            // Assuming jsdom environment
            const key1 = getRateLimitKey('test');
            const key2 = getRateLimitKey('test');
            expect(key1).toBe(key2); // Should be stable for same session
        });
    });
});
