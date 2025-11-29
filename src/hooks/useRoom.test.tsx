import { renderHook, waitFor, act } from '@testing-library/react';
import { useRoom } from './useRoom';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import * as firebaseDatabase from 'firebase/database';
import { type DataSnapshot } from 'firebase/database';

// Hoisted mock for tracking updateUserStats calls
const { mockUpdateUserStats } = vi.hoisted(() => {
    return { mockUpdateUserStats: vi.fn() };
});

// Mock Firebase
vi.mock('firebase/database', async () => {
    return {
        getDatabase: vi.fn(),
        ref: vi.fn((db, path) => ({ path })),
        onValue: vi.fn(),
        runTransaction: vi.fn(),
        set: vi.fn(),
        update: vi.fn().mockResolvedValue(undefined),
        get: vi.fn().mockResolvedValue({ val: () => null }),
        remove: vi.fn(),
        onDisconnect: vi.fn(() => ({ update: vi.fn() })),
    };
});

// Mock hooks
vi.mock('./useAuth', () => ({
    useAuth: () => ({ user: { uid: 'user1' }, loading: false })
}));

vi.mock('./useConnectionStatus', () => ({
    useConnectionStatus: () => ({ isOnline: true, isConnectedToFirebase: true })
}));

vi.mock('./useUserStats', () => ({
    useUserStats: () => ({ updateUserStats: mockUpdateUserStats })
}));

// Mock toast
vi.mock('react-hot-toast', () => ({
    default: {
        error: vi.fn(),
        success: vi.fn(),
    }
}));

describe('useRoom Bug Reproduction', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should correctly calculate playerCount when joining an existing room where user is already present', async () => {
        const roomId = 'room1';
        const username = 'Alice';

        // Mock onValue to trigger the callback
        vi.mocked(firebaseDatabase.onValue).mockImplementation((_ref, callback) => {
            // Simulate room data update where user is MISSING
            // This triggers joinRoom()
            callback({
                exists: () => true,
                val: () => ({
                    id: roomId,
                    players: { 'other': {} }, // User not here
                    gameState: 'waiting'
                }),
                child: () => ({ val: () => {} })
            } as unknown as DataSnapshot);
            return vi.fn();
        });

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let capturedUpdateFn: (currentData: any) => any;
        const runTransactionMock = vi.mocked(firebaseDatabase.runTransaction).mockImplementation(async (_ref, updateFn) => {
            capturedUpdateFn = updateFn;
            return { committed: true, snapshot: { val: () => ({}), child: () => ({ val: () => {} }) } };
        });

        // Trigger the hook
        renderHook(() => useRoom(roomId, username));

        // Wait for runTransaction to be called
        await waitFor(() => {
            expect(runTransactionMock).toHaveBeenCalled();
        });

        expect(capturedUpdateFn!).toBeDefined();

        // NOW: We test the captured update function with the "Bug" scenario.
        // Scenario: The DB actually HAS the player (race condition or refresh).
        const currentRoomState = {
            players: {
                'user1': { id: 'user1', username: 'Alice' }
            },
            playerCount: 1
        };

        const result = capturedUpdateFn!(currentRoomState);

        // BEFORE FIX: The logic adds 1 to Object.keys(players).length.
        // keys.length is 1. result.playerCount becomes 2.

        // AFTER FIX: result.playerCount should be 1.
        expect(result.playerCount).toBe(1);
    });

    it('should trigger updateUserStats exactly once on double submission of winning guess', async () => {
        const roomId = 'room1';
        const username = 'TestUser';

        // Mock onValue to return a room in playing state
        vi.mocked(firebaseDatabase.onValue).mockImplementation((query, callback) => {
            if (typeof query === 'object' && 'path' in query && query.path === '.info/connected') {
                callback({ val: () => true } as unknown as DataSnapshot);
            } else if (typeof query === 'object' && 'path' in query && query.path?.startsWith('rooms/')) {
                callback({
                    exists: () => true,
                    val: () => ({
                        id: 'room1',
                        gameState: 'playing',
                        currentWord: 'APPLE',
                        startTime: Date.now(),
                        settings: { wordLength: 5, language: 'en' },
                        players: {
                            user1: {
                                id: 'user1',
                                username: 'TestUser',
                                score: 0,
                                status: 'playing',
                                guesses: JSON.stringify(['PAPER', 'GRAPE', 'LEMON', 'BEACH'])
                            }
                        }
                    }),
                    child: () => ({ val: () => ({}) })
                } as unknown as DataSnapshot);
            }
            return () => {};
        });

        const { result } = renderHook(() => useRoom(roomId, username));

        // Wait for room to be loaded
        await waitFor(() => {
            expect(result.current.room).not.toBeNull();
        });

        const winningGuess = 'APPLE';

        // Call submitGuess twice concurrently
        await act(async () => {
            const p1 = result.current.submitGuess(winningGuess);
            const p2 = result.current.submitGuess(winningGuess);
            await Promise.all([p1, p2]);
        });

        // Verify updateUserStats called exactly once (not twice)
        expect(mockUpdateUserStats).toHaveBeenCalledTimes(1);
    });
});
