/**
 * Default word length for the game.
 * This value can be overridden by room settings.
 */
export const WORD_LENGTH = 5;

/**
 * Represents the status of a letter in a guess.
 * - 'correct': Letter is in the correct position (Green).
 * - 'present': Letter is in the word but in the wrong position (Yellow).
 * - 'absent': Letter is not in the word (Gray).
 * - 'empty': Placeholder for when no letter has been entered.
 */
export type LetterStatus = 'correct' | 'present' | 'absent' | 'empty';

/**
 * Represents the state of a single key on the keyboard.
 */
export interface LetterState {
    /** The character on the key (e.g., 'A', 'B'). */
    key: string;
    /** The current status of the key based on guesses. */
    status: LetterStatus;
}

/**
 * Evaluates a guess against the target word and determines the status of each letter.
 *
 * The evaluation is done in two passes:
 * 1. Find correct letters (Green).
 * 2. Find present letters (Yellow), handling duplicates correctly.
 *
 * @param guess - The word guessed by the player.
 * @param target - The target word to be guessed.
 * @returns An array of LetterStatus corresponding to each character in the guess.
 */
export function checkGuess(guess: string, target: string): LetterStatus[] {
    const result: LetterStatus[] = Array(guess.length).fill('absent');
    const targetChars = target.split('');
    const guessChars = guess.split('');

    // First pass: find correct letters
    guessChars.forEach((char, i) => {
        if (char === targetChars[i]) {
            result[i] = 'correct';
            targetChars[i] = ''; // Mark as used
            guessChars[i] = ''; // Mark as handled
        }
    });

    // Second pass: find present letters
    guessChars.forEach((char, i) => {
        if (char === '') return; // Already handled
        const targetIndex = targetChars.indexOf(char);
        if (targetIndex !== -1) {
            result[i] = 'present';
            targetChars[targetIndex] = ''; // Mark as used
        }
    });

    return result;
}

/**
 * Keyboard layouts for supported languages.
 * Organized as rows of keys.
 */
export const KEYBOARD_LAYOUTS = {
    en: [
        ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
        ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
        ['ENTER', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', 'BACKSPACE'],
    ],
    he: [
        ['ק', 'ר', 'א', 'ט', 'ו', 'ן', 'ם', 'פ', 'ש', 'ד', 'ג'],
        ['כ', 'ע', 'י', 'ח', 'ל', 'ך', 'ף', 'ז', 'ס'],
        ['ENTER', 'ב', 'ה', 'נ', 'מ', 'צ', 'ת', 'ץ', 'BACKSPACE']
    ]
};
