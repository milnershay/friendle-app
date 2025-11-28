import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useRoom } from './useRoom';

const { mockUpdateUserStats } = vi.hoisted(() => {
    return { mockUpdateUserStats: vi.fn() };
});

// Mocks
vi.mock('@/lib/firebase', () => ({
    db: {},
    auth: {}
}));

vi.mock('./useAuth', () => ({
    useAuth: () => ({
        user: { uid: 'user1' },
        loading: false
    })
}));

vi.mock('./useConnectionStatus', () => ({
    useConnectionStatus: () => ({
        isOnline: true,
        isConnectedToFirebase: true
    })
}));

vi.mock('./useUserStats', () => ({
    useUserStats: () => ({
        updateUserStats: mockUpdateUserStats
    })
}));

vi.mock('react-hot-toast', () => ({
    default: {
        success: vi.fn(),
        error: vi.fn(),
    }
}));

// Mock Firebase Database
vi.mock('firebase/database', () => {
    return {
        ref: vi.fn((db, path) => ({ path })),
        onValue: vi.fn((query, callback) => {
            if (query.path === '.info/connected') {
                 callback({ val: () => true });
            } else if (query.path && query.path.startsWith('rooms/')) {
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
                    })
                 });
            }
            return () => {};
        }),
        update: vi.fn().mockResolvedValue(undefined),
        get: vi.fn().mockResolvedValue({ val: () => null }),
        remove: vi.fn(),
        set: vi.fn(),
        runTransaction: vi.fn(),
        onDisconnect: vi.fn().mockReturnValue({ update: vi.fn() }),
    };
});

describe('useRoom Bug Reproduction', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should trigger updateUserStats exactly once on double submission of winning guess', async () => {
        const roomId = 'room1';
        const username = 'TestUser';

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

        // Verify updateUserStats called twice
        expect(mockUpdateUserStats).toHaveBeenCalledTimes(1);
    });
});
