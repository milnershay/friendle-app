import { describe, it, expect } from 'vitest';
import { WORD_LISTS } from './wordLists';

describe('Hebrew Word Lists', () => {
    it('should have correct word lengths for 4-letter words', () => {
        const words = WORD_LISTS.he[4];
        expect(words.length).toBeGreaterThanOrEqual(180);
        words.forEach(word => {
            expect(word.length).toBe(4);
        });
    });

    it('should have correct word lengths for 5-letter words', () => {
        const words = WORD_LISTS.he[5];
        expect(words.length).toBeGreaterThanOrEqual(180);
        words.forEach(word => {
            expect(word.length).toBe(5);
        });
    });

    it('should have correct word lengths for 6-letter words', () => {
        const words = WORD_LISTS.he[6];
        expect(words.length).toBeGreaterThanOrEqual(180);
        words.forEach(word => {
            expect(word.length).toBe(6);
        });
    });

    it('should contain only valid Hebrew characters', () => {
        const allWords = [
            ...WORD_LISTS.he[4],
            ...WORD_LISTS.he[5],
            ...WORD_LISTS.he[6]
        ];
        const hebrewRegex = /^[\u0590-\u05FF]+$/;
        allWords.forEach(word => {
            expect(word).toMatch(hebrewRegex);
        });
    });
});
