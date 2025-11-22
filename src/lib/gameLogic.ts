export const WORD_LENGTH = 5; // Default, but can be overridden

export type LetterStatus = 'correct' | 'present' | 'absent' | 'empty';

export interface LetterState {
    key: string;
    status: LetterStatus;
}

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

export const KEYBOARD_LAYOUTS = {
    en: [
        ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
        ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
        ['ENTER', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', 'BACKSPACE'],
    ],
    he: [
        ['ק', 'ר', 'א', 'ט', 'ו', 'ן', 'ם', 'פ'],
        ['ש', 'ד', 'ג', 'כ', 'ע', 'י', 'ח', 'ל', 'ך', 'ף'],
        ['ז', 'ס', 'ב', 'ה', 'נ', 'מ', 'צ', 'ת', 'ץ'],
        ['ENTER', 'BACKSPACE']
    ]
};
