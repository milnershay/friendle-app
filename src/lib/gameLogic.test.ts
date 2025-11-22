import { describe, it, expect } from 'vitest';
import { checkGuess, LetterStatus } from './gameLogic';

describe('checkGuess', () => {
    it('should return all correct for exact match', () => {
        const result = checkGuess('HELLO', 'HELLO');
        expect(result).toEqual<LetterStatus[]>(['correct', 'correct', 'correct', 'correct', 'correct']);
    });

    it('should return all absent for no matching letters', () => {
        const result = checkGuess('ABCDE', 'FGHIJ');
        expect(result).toEqual<LetterStatus[]>(['absent', 'absent', 'absent', 'absent', 'absent']);
    });

    it('should handle present letters correctly', () => {
        const result = checkGuess('HELLO', 'WORLD');
        // H: absent
        // E: absent
        // L: present (matches L in WORLD)
        // L: absent (only one L in WORLD, used by first L?) Wait, WORLD has L at index 3.
        // O: present (matches O in WORLD)

        // Let's trace logic:
        // Target: W O R L D
        // Guess:  H E L L O

        // Pass 1 (Correct): None.
        // Pass 2 (Present):
        // H: not in WORLD -> absent
        // E: not in WORLD -> absent
        // L (idx 2): found in WORLD at idx 3. Mark target[3] used. Result[2] = present.
        // L (idx 3): target[3] is used. Not found elsewhere. -> absent.
        // O (idx 4): found in WORLD at idx 1. Mark target[1] used. Result[4] = present.

        console.log('Result:', result);
        expect(result).toEqual<LetterStatus[]>(['absent', 'absent', 'absent', 'correct', 'present']);
    });

    it('should handle duplicate letters where one is correct and one is present', () => {
        // Target: A P P L E
        // Guess:  P A P E R

        // Pass 1 (Correct):
        // P (idx 0) != A
        // A (idx 1) != P
        // P (idx 2) == P -> Correct. Target[2] used.
        // E (idx 3) != L
        // R (idx 4) != E

        // Pass 2 (Present):
        // P (idx 0): Found in Target at idx 1. Mark target[1] used. Result[0] = present.
        // A (idx 1): Found in Target at idx 0. Mark target[0] used. Result[1] = present.
        // P (idx 2): Skipped (correct).
        // E (idx 3): Found in Target at idx 4. Mark target[4] used. Result[3] = present.
        // R (idx 4): Not found. Result[4] = absent.

        const result = checkGuess('PAPER', 'APPLE');
        expect(result).toEqual<LetterStatus[]>(['present', 'present', 'correct', 'present', 'absent']);
    });

    it('should handle duplicate letters where target has fewer instances', () => {
        // Target: A B C D E
        // Guess:  A A A A A

        // Pass 1:
        // A (idx 0) == A -> Correct. Target[0] used.

        // Pass 2:
        // A (idx 1): Target[0] used. No other A. -> Absent.
        // ... all absent.

        const result = checkGuess('AAAAA', 'ABCDE');
        expect(result).toEqual<LetterStatus[]>(['correct', 'absent', 'absent', 'absent', 'absent']);
    });
});
