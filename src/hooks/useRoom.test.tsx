import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useRoom, type RoomData } from './useRoom';
import { ref, onValue, set, update, get, remove, runTransaction } from 'firebase/database';

// Mock dependencies
vi.mock('@/lib/firebase', () => ({
    db: {},
}));

vi.mock('firebase/database', () => ({
    ref: vi.fn(),
    onValue: vi.fn(),
    set: vi.fn(),
    update: vi.fn(),
    get: vi.fn(),
    remove: vi.fn(),
    runTransaction: vi.fn(),
    onDisconnect: vi.fn(() => ({ update: vi.fn() })),
}));

vi.mock('react-hot-toast', () => ({
    default: {
        error: vi.fn(),
        success: vi.fn(),
        dismiss: vi.fn(),
    },
}));

// Mock hooks
vi.mock('./useConnectionStatus', () => ({
    useConnectionStatus: () => ({ isOnline: true, isConnectedToFirebase: true }),
}));

vi.mock('./useAuth', () => ({
    useAuth: () => ({ user: { uid: 'user123' }, loading: false }),
}));

const mockUpdateUserStats = vi.fn();
vi.mock('./useUserStats', () => ({
    useUserStats: () => ({ updateUserStats: mockUpdateUserStats }),
}));

// Mock word list for startGame
vi.mock('@/lib/wordLists', () => ({
    WORD_LISTS: {
        en: { 5: ['HELLO'] }
    }
}));

type OnValueCallback = (snapshot: { exists: () => boolean; val: () => unknown }) => void;

describe('useRoom', () => {
    const roomId = 'room123';
    const username = 'TestPlayer';
    const userId = 'user123';

    let roomCallback: OnValueCallback;

    beforeEach(() => {
        vi.clearAllMocks();

        (ref as Mock).mockImplementation((_, path) => ({ key: path }));

        // Capture the onValue callback for the room
        (onValue as Mock).mockImplementation((query, cb) => {
            if (query.key === `rooms/${roomId}`) {
                roomCallback = cb;
            }
            return vi.fn(); // unsubscribe
        });

        // Default implementation
        (runTransaction as Mock).mockImplementation(async () => {
            return { committed: true, snapshot: { val: () => ({}), child: () => ({ val: () => 0 }) } };
        });
    });

    it('subscribes to room updates', () => {
        renderHook(() => useRoom(roomId, username));
        expect(ref).toHaveBeenCalledWith(expect.anything(), `rooms/${roomId}`);
        expect(onValue).toHaveBeenCalled();
    });

    it('creates room if not exists', async () => {
        (get as Mock).mockResolvedValue({ val: () => null });

        renderHook(() => useRoom(roomId, username));

        act(() => {
            if (roomCallback) {
                roomCallback({ exists: () => false, val: () => null });
            }
        });

        await waitFor(() => {
            expect(set).toHaveBeenCalledWith(
                expect.objectContaining({ key: `rooms/${roomId}` }),
                expect.objectContaining({
                    id: roomId,
                    gameState: 'waiting',
                    players: expect.objectContaining({
                        [userId]: expect.objectContaining({ username })
                    })
                })
            );
        });
    });

    it('joins room if exists but user missing', async () => {
        const existingRoom = {
            id: roomId,
            players: { 'other': { id: 'other' } },
            gameState: 'waiting'
        };

        // Mock transaction for join
        (runTransaction as Mock).mockImplementation(async (...args) => {
            const txFn = args[1];
            const result = txFn(existingRoom);
            return { committed: true, snapshot: { child: () => ({ val: () => result }) } };
        });

        renderHook(() => useRoom(roomId, username));

        act(() => {
            if (roomCallback) {
                roomCallback({ exists: () => true, val: () => existingRoom });
            }
        });

        await waitFor(() => {
            expect(runTransaction).toHaveBeenCalled();
        });
    });

    it('starts game', async () => {
        const { result } = renderHook(() => useRoom(roomId, username));

        // Simulate room loaded state
        const roomData = {
            id: roomId,
            players: { [userId]: { id: userId, status: 'waiting' } },
            gameState: 'waiting',
            settings: { wordLength: 5, language: 'en' },
            wordQueue: []
        };

        act(() => {
            if (roomCallback) {
                roomCallback({ exists: () => true, val: () => roomData });
            }
        });

        // Mock transaction for startGame
        let transactionResult: RoomData | undefined;
        (runTransaction as Mock).mockImplementation(async (...args) => {
            const txFn = args[1];
            transactionResult = txFn(roomData);
            return { committed: true, snapshot: { val: () => transactionResult } };
        });

        await act(async () => {
            await result.current.startGame();
        });

        expect(runTransaction).toHaveBeenCalled();
        expect(transactionResult).toBeDefined();
        expect(transactionResult!.gameState).toBe('playing');
        expect(transactionResult!.currentWord).toBe('HELLO'); // From mock
        expect(transactionResult!.players[userId].status).toBe('playing');
    });

    it('submits a correct guess', async () => {
        const { result } = renderHook(() => useRoom(roomId, username));

        const roomData = {
            id: roomId,
            players: { [userId]: { id: userId, status: 'playing', score: 0, guesses: '[]', startTime: Date.now() - 1000 } },
            gameState: 'playing',
            currentWord: 'HELLO',
            settings: { wordLength: 5, language: 'en', maxGuesses: 6 },
            startTime: Date.now() - 1000
        };

        act(() => {
            if (roomCallback) {
                roomCallback({ exists: () => true, val: () => roomData });
            }
        });

        await act(async () => {
            await result.current.submitGuess('HELLO');
        });

        expect(update).toHaveBeenCalledWith(
            expect.objectContaining({ key: `rooms/${roomId}/players/${userId}` }),
            expect.objectContaining({
                status: 'won',
                finalScore: expect.any(Number)
            })
        );
        expect(mockUpdateUserStats).toHaveBeenCalled();
    });

    it('submits an incorrect guess', async () => {
        const { result } = renderHook(() => useRoom(roomId, username));

        const roomData = {
            id: roomId,
            players: { [userId]: { id: userId, status: 'playing', score: 0, guesses: '[]', startTime: Date.now() } },
            gameState: 'playing',
            currentWord: 'HELLO',
            settings: { wordLength: 5, language: 'en', maxGuesses: 6 }
        };

        act(() => {
            if (roomCallback) {
                roomCallback({ exists: () => true, val: () => roomData });
            }
        });

        await act(async () => {
            await result.current.submitGuess('WORLD');
        });

        expect(update).toHaveBeenCalledWith(
            expect.objectContaining({ key: `rooms/${roomId}/players/${userId}` }),
            expect.objectContaining({
                status: 'playing',
                guesses: JSON.stringify(['WORLD'])
            })
        );
        expect(mockUpdateUserStats).not.toHaveBeenCalled(); // Not game over yet
    });

    it('handles game over (loss)', async () => {
        const { result } = renderHook(() => useRoom(roomId, username));

        // 5 existing guesses, max 6
        const guesses = ['AAAAA', 'BBBBB', 'CCCCC', 'DDDDD', 'EEEEE'];
        const roomData = {
            id: roomId,
            players: { [userId]: { id: userId, status: 'playing', score: 0, guesses: JSON.stringify(guesses), startTime: Date.now() } },
            gameState: 'playing',
            currentWord: 'HELLO',
            settings: { wordLength: 5, language: 'en', maxGuesses: 6 }
        };

        act(() => {
            if (roomCallback) {
                roomCallback({ exists: () => true, val: () => roomData });
            }
        });

        await act(async () => {
            await result.current.submitGuess('FFFFF'); // 6th guess
        });

        expect(update).toHaveBeenCalledWith(
            expect.objectContaining({ key: `rooms/${roomId}/players/${userId}` }),
            expect.objectContaining({
                status: 'lost',
                finalScore: 0
            })
        );
        expect(mockUpdateUserStats).toHaveBeenCalled();
    });

    it('updates settings', async () => {
        const { result } = renderHook(() => useRoom(roomId, username));

        // Mock room existing
        const roomData = { id: roomId, players: { [userId]: {} } };
        act(() => {
            if (roomCallback) {
                roomCallback({ exists: () => true, val: () => roomData });
            }
        });

        await act(async () => {
            await result.current.updateSettings({ isPublic: false });
        });

        expect(update).toHaveBeenCalledWith(
            expect.objectContaining({ key: `rooms/${roomId}/settings` }),
            { isPublic: false }
        );
        expect(remove).toHaveBeenCalledWith(
            expect.objectContaining({ key: `public_rooms/${roomId}` })
        );
    });

    it('leaves room', async () => {
        const { result } = renderHook(() => useRoom(roomId, username));

        // Mock room with 1 player (us)
        const roomData = {
            id: roomId,
            players: { [userId]: { id: userId } },
            playerCount: 1,
            settings: { isPublic: true }
        };

        // Mock transaction for leaveRoom
        (runTransaction as Mock).mockImplementation(async (...args) => {
            const txFn = args[1];
            const currentRoom = { ...roomData };
            // Simulate the modification happening inside transaction
            const res = txFn(currentRoom);

            // If we deleted the only player, players might be empty
            let newPlayerCount = 0;
            if (res && res.players) {
                 newPlayerCount = Object.keys(res.players).length;
            }

            return {
                committed: true,
                snapshot: {
                    child: (k: string) => ({ val: () => k === 'playerCount' ? newPlayerCount : res[k] })
                }
            };
        });

        act(() => {
            if (roomCallback) {
                roomCallback({ exists: () => true, val: () => roomData });
            }
        });

        await act(async () => {
            await result.current.leaveRoom();
        });

        // Since we were the last player, room should be removed
        expect(remove).toHaveBeenCalledWith(expect.objectContaining({ key: `rooms/${roomId}` }));
        expect(remove).toHaveBeenCalledWith(expect.objectContaining({ key: `public_rooms/${roomId}` }));
    });
});
