import { describe, it, expect } from 'vitest';
import { WORD_LISTS, ALPHABETS } from './wordLists';

describe('Word Lists', () => {
    it('should have English word lists for lengths 4, 5, 6', () => {
        expect(WORD_LISTS.en[4]).toBeDefined();
        expect(WORD_LISTS.en[5]).toBeDefined();
        expect(WORD_LISTS.en[6]).toBeDefined();
    });

    it('should have Hebrew word lists for lengths 4, 5, 6', () => {
        expect(WORD_LISTS.he[4]).toBeDefined();
        expect(WORD_LISTS.he[5]).toBeDefined();
        expect(WORD_LISTS.he[6]).toBeDefined();
    });

    it('should have non-empty word lists', () => {
        expect(WORD_LISTS.en[5].length).toBeGreaterThan(0);
        expect(WORD_LISTS.he[5].length).toBeGreaterThan(0);
    });

    it('should have correct alphabet definitions', () => {
        expect(ALPHABETS.en.length).toBe(26);
        expect(ALPHABETS.he.length).toBe(22);
    });

    it('words should be uppercase or valid format', () => {
        // Check first few words
        expect(WORD_LISTS.en[5][0]).toMatch(/^[A-Z]+$/);
        expect(WORD_LISTS.he[5][0]).toMatch(/^[\u0590-\u05FF]+$/);
    });
});
