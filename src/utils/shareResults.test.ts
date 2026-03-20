import { describe, it, expect } from 'vitest';
import { generateShareText } from './shareResults';
import { Player, RoomData } from '@/hooks/useRoom';

describe('generateShareText', () => {
    const mockRoomData: RoomData = {
        id: 'room123',
        type: 'private',
        players: {},
        gameState: 'finished',
        currentWord: 'APPLE',
        startTime: 0,
        createdAt: 0,
        lastActivity: 0,
        settings: { wordLength: 5, language: 'en', maxGuesses: 6 }
    };

    const mockPlayer: Player = {
        id: 'player1',
        username: 'User1',
        score: 0,
        status: 'playing',
        guesses: JSON.stringify([])
    };

    it('returns error message if currentWord is missing', () => {
        const roomWithoutWord = { ...mockRoomData, currentWord: null };
        expect(generateShareText(mockPlayer, roomWithoutWord)).toBe('Error generating results.');
    });

    it('generates correct text for single player win', () => {
        const player: Player = {
            ...mockPlayer,
            status: 'won',
            guesses: JSON.stringify(['APPLE']),
            timeTaken: 10.5
        };
        const room: RoomData = {
            ...mockRoomData,
            players: { [player.id]: player }
        };

        const expected = `Friendle 🎯 1/6 in 11s\n\n🟩🟩🟩🟩🟩\n\nhttps://friendle.app`;
        expect(generateShareText(player, room)).toBe(expected);
    });

    it('generates correct text for single player loss', () => {
        const player: Player = {
            ...mockPlayer,
            status: 'lost',
            guesses: JSON.stringify(['WRONG', 'WRONG', 'WRONG', 'WRONG', 'WRONG', 'WRONG']),
            timeTaken: 60
        };
        const room: RoomData = {
            ...mockRoomData,
            players: { [player.id]: player }
        };

        const expected = `Friendle ❌ X/6\n\n⬛⬛⬛⬛⬛\n⬛⬛⬛⬛⬛\n⬛⬛⬛⬛⬛\n⬛⬛⬛⬛⬛\n⬛⬛⬛⬛⬛\n⬛⬛⬛⬛⬛\n\nhttps://friendle.app`;
        expect(generateShareText(player, room)).toBe(expected);
    });

    it('generates correct text for multiplayer win', () => {
        const player1: Player = {
            ...mockPlayer,
            status: 'won',
            guesses: JSON.stringify(['APPLE']),
            timeTaken: 10,
            finalScore: 100
        };
        const player2: Player = {
            id: 'player2',
            username: 'User2',
            score: 0,
            status: 'lost',
            guesses: JSON.stringify(['WRONG', 'WRONG', 'WRONG', 'WRONG', 'WRONG', 'WRONG']),
            timeTaken: 60,
            finalScore: 0
        };
        const room: RoomData = {
            ...mockRoomData,
            players: { [player1.id]: player1, [player2.id]: player2 }
        };

        const expected = `Friendle Multiplayer 🏆 1st place\n\n🟩🟩🟩🟩🟩\n\n1/6 in 10s\nPlayed with 1 friends.\n\nJoin us: https://friendle.app/room/room123`;
        expect(generateShareText(player1, room)).toBe(expected);
    });

    it('generates correct text for multiplayer loss', () => {
        const player1: Player = {
            ...mockPlayer,
            status: 'lost',
            guesses: JSON.stringify(['WRONG', 'WRONG', 'WRONG', 'WRONG', 'WRONG', 'WRONG']),
            timeTaken: 60,
            finalScore: 0
        };
        const player2: Player = {
            id: 'player2',
            username: 'User2',
            score: 0,
            status: 'won',
            guesses: JSON.stringify(['APPLE']),
            timeTaken: 10,
            finalScore: 100
        };
        const room: RoomData = {
            ...mockRoomData,
            players: { [player1.id]: player1, [player2.id]: player2 }
        };

        const expected = `Friendle Multiplayer 💔\n\n⬛⬛⬛⬛⬛\n⬛⬛⬛⬛⬛\n⬛⬛⬛⬛⬛\n⬛⬛⬛⬛⬛\n⬛⬛⬛⬛⬛\n⬛⬛⬛⬛⬛\n\nX/6 in 60s\nPlayed with 1 friends.\n\nJoin us: https://friendle.app/room/room123`;
        expect(generateShareText(player1, room)).toBe(expected);
    });

    it('correctly maps grid colors based on guesses', () => {
        const player: Player = {
            ...mockPlayer,
            status: 'playing',
            guesses: JSON.stringify(['ALONE'])
        };
        const room: RoomData = {
            ...mockRoomData,
            players: { [player.id]: player }
        };

        const result = generateShareText(player, room);

        // A is correct (🟩)
        // L is present (🟨)
        // O is absent (⬛)
        // N is absent (⬛)
        // E is present (🟨)
        // ALONE -> APPLE:
        // A -> A (correct - 🟩)
        // L -> L (present - 🟨, actually L is in APPLE but O, N, E are not. Let's check APPLE and ALONE)
        // Wait, APPLE has no O, N. E is in APPLE! (E is correct? No, E is index 4. APPLE index 4 is E. So ALONE index 4 is E. It is correct - 🟩).
        // Let's re-verify: target=APPLE, guess=ALONE.
        // A - match
        // L - in target (index 3) - present
        // O - no match
        // N - no match
        // E - match
        // So 🟩🟨⬛⬛🟩

        const expectedGrid = '🟩🟨⬛⬛🟩';
        expect(result).toContain(expectedGrid);
    });
});
