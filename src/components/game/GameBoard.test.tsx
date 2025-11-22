import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import GameBoard from './GameBoard';

describe('GameBoard', () => {
    it('renders the grid correctly', () => {
        render(
            <GameBoard
                currentWord="TESTS"
                onGuess={() => { }}
                gameState="playing"
                guesses={[]}
            />
        );

        expect(screen.getAllByRole('button').length).toBeGreaterThan(0); // Keyboard buttons
        expect(screen.getByTestId('game-board')).toBeDefined();
    });

    it('handles typing and backspace via keyboard', async () => {
        render(
            <GameBoard
                currentWord="TESTS"
                onGuess={() => { }}
                gameState="playing"
                guesses={[]}
            />
        );

        fireEvent.keyDown(window, { key: 'A' });
        await waitFor(() => {
             const cells = screen.getAllByText('A');
             expect(cells.length).toBeGreaterThanOrEqual(1);
        });

        fireEvent.keyDown(window, { key: 'B' });
        await waitFor(() => {
             expect(screen.getAllByText('B').length).toBeGreaterThanOrEqual(1);
        });
    });

    it('handles on-screen keyboard interactions', async () => {
        const onGuessMock = vi.fn();
        render(
            <GameBoard
                currentWord="TESTS"
                onGuess={onGuessMock}
                gameState="playing"
                guesses={[]}
            />
        );

        // Click 'A'
        const buttonA = screen.getByRole('button', { name: 'A' });
        fireEvent.click(buttonA);

        // Click 'B'
        const buttonB = screen.getByRole('button', { name: 'B' });
        fireEvent.click(buttonB);

        // Click Backspace (←)
        const backspace = screen.getByRole('button', { name: '←' });
        fireEvent.click(backspace);

        // Should have A but not B
        // We can verify this by typing more letters to fill the row and submitting
        const buttonC = screen.getByRole('button', { name: 'C' });
        fireEvent.click(buttonC);
        const buttonD = screen.getByRole('button', { name: 'D' });
        fireEvent.click(buttonD);
        const buttonE = screen.getByRole('button', { name: 'E' });
        fireEvent.click(buttonE);
        const buttonF = screen.getByRole('button', { name: 'F' });
        fireEvent.click(buttonF);

        // Now we have ACDEF (5 letters)
        const enter = screen.getByRole('button', { name: '↵' });
        fireEvent.click(enter);

        expect(onGuessMock).toHaveBeenCalledWith('ACDEF');
    });

    it('submits guess on Enter when full', async () => {
        const onGuessMock = vi.fn();
        render(
            <GameBoard
                currentWord="TESTS"
                onGuess={onGuessMock}
                gameState="playing"
                guesses={[]}
            />
        );

        // Type 5 letters
        ['H', 'E', 'L', 'L', 'O'].forEach(char => {
            fireEvent.keyDown(window, { key: char });
        });

        fireEvent.keyDown(window, { key: 'Enter' });
        expect(onGuessMock).toHaveBeenCalledWith('HELLO');
    });

    it('does not submit incomplete guess', async () => {
        const onGuessMock = vi.fn();
        render(
            <GameBoard
                currentWord="TESTS"
                onGuess={onGuessMock}
                gameState="playing"
                guesses={[]}
            />
        );

        // Type 4 letters
        ['H', 'E', 'L', 'L'].forEach(char => {
            fireEvent.keyDown(window, { key: char });
        });

        fireEvent.keyDown(window, { key: 'Enter' });
        expect(onGuessMock).not.toHaveBeenCalled();
    });

    it('displays guesses with correct coloring', () => {
        render(
            <GameBoard
                currentWord="APPLE"
                onGuess={() => { }}
                gameState="playing"
                guesses={['APPLY']}
            />
        );

        const correctCells = document.getElementsByClassName('bg-green-600');
        expect(correctCells.length).toBeGreaterThan(0);
    });

    it('ignores input when game is not playing', () => {
        const onGuessMock = vi.fn();
        render(
            <GameBoard
                currentWord="TESTS"
                onGuess={onGuessMock}
                gameState="won"
                guesses={['TESTS']} // Game finished
            />
        );

        // Try to type
        fireEvent.keyDown(window, { key: 'A' });

        // Try to submit
        fireEvent.keyDown(window, { key: 'Enter' });

        expect(onGuessMock).not.toHaveBeenCalled();

        // Try to click keyboard
        const buttonA = screen.getByRole('button', { name: 'A' });
        fireEvent.click(buttonA);

        // Since we can't easily inspect internal state, we rely on onGuess not being called
        // and maybe checking if 'A' appears in a new row (which doesn't exist if game finished)
        // But here we provided guesses=['TESTS'], so grid is full-ish or at least has 1 row.
    });

     it('ignores invalid keys', () => {
        const onGuessMock = vi.fn();
        render(
            <GameBoard
                currentWord="TESTS"
                onGuess={onGuessMock}
                gameState="playing"
                guesses={[]}
            />
        );

        fireEvent.keyDown(window, { key: '1' });
        fireEvent.keyDown(window, { key: '?' });

        // Fill with valid keys to check if invalid ones were ignored
        ['A', 'B', 'C', 'D', 'E'].forEach(char => {
            fireEvent.keyDown(window, { key: char });
        });

        fireEvent.keyDown(window, { key: 'Enter' });

        // If 1 or ? were accepted, the guess would be like '1?ABC' (first 5) or something
        // If ignored, it should be 'ABCDE'
        expect(onGuessMock).toHaveBeenCalledWith('ABCDE');
     });

     it('handles Hebrew layout and input', () => {
         const onGuessMock = vi.fn();
         render(
             <GameBoard
                 currentWord="שלום"
                 onGuess={onGuessMock}
                 gameState="playing"
                 guesses={[]}
                 language="he"
                 wordLength={4}
             />
         );

         expect(screen.getByText('א')).toBeDefined();

         fireEvent.keyDown(window, { key: 'ש' });
         fireEvent.keyDown(window, { key: 'ל' });
         fireEvent.keyDown(window, { key: 'ו' });
         fireEvent.keyDown(window, { key: 'ם' });

         fireEvent.keyDown(window, { key: 'Enter' });
         expect(onGuessMock).toHaveBeenCalledWith('שלום');
     });
});
