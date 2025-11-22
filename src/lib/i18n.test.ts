import { describe, it, expect, beforeEach } from 'vitest';
import { useTranslation, getStoredLanguage, setStoredLanguage, translations } from './i18n';

describe('i18n', () => {
    describe('useTranslation', () => {
        it('returns English translations by default', () => {
            const t = useTranslation();
            expect(t).toEqual(translations.en);
            expect(t.common.english).toBe('English');
        });

        it('returns English translations when specified', () => {
            const t = useTranslation('en');
            expect(t).toEqual(translations.en);
        });

        it('returns Hebrew translations when specified', () => {
            const t = useTranslation('he');
            expect(t).toEqual(translations.he);
            expect(t.common.english).toBe('אנגלית');
        });
    });

    describe('storage', () => {
        beforeEach(() => {
            // Clear localStorage before each test
            window.localStorage.clear();
        });

        it('getStoredLanguage returns default en if empty', () => {
            expect(getStoredLanguage()).toBe('en');
        });

        it('setStoredLanguage saves language', () => {
            setStoredLanguage('he');
            expect(localStorage.getItem('friendle_language')).toBe('he');
            expect(getStoredLanguage()).toBe('he');
        });

        it('getStoredLanguage handles invalid values gracefully', () => {
            localStorage.setItem('friendle_language', 'fr'); // Invalid
            expect(getStoredLanguage()).toBe('en'); // Should fallback to default
        });

        it('setStoredLanguage works for en', () => {
             setStoredLanguage('en');
             expect(localStorage.getItem('friendle_language')).toBe('en');
             expect(getStoredLanguage()).toBe('en');
        });
    });
});
