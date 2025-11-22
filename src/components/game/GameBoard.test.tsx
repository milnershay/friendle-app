import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
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
    });

    it.skip('handles typing and backspace', async () => {
        render(
            <GameBoard
                currentWord="TESTS"
                onGuess={() => { }}
                gameState="playing"
                guesses={[]}
            />
        );

        console.log('Dispatching A');
        fireEvent.keyDown(document, { key: 'A', bubbles: true });
        expect(await screen.findByText('A')).toBeDefined();

        console.log('Dispatching B');
        fireEvent.keyDown(document, { key: 'B', bubbles: true });
        expect(await screen.findByText('B')).toBeDefined();

        console.log('Dispatching Backspace');
        fireEvent.keyDown(document, { key: 'Backspace', bubbles: true });
        // B should be gone. A should remain.
        expect(screen.queryByText('B')).toBeNull();
        expect(screen.getByText('A')).toBeDefined();
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
            fireEvent.keyDown(document, { key: char });
        });

        fireEvent.keyDown(document, { key: 'Enter' });
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
            fireEvent.keyDown(document, { key: char });
        });

        fireEvent.keyDown(document, { key: 'Enter' });
        expect(onGuessMock).not.toHaveBeenCalled();
    });
});
