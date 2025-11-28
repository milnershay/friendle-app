
import { renderHook, waitFor } from '@testing-library/react';
import { useRoom } from './useRoom';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import * as firebaseDatabase from 'firebase/database';

// Mock Firebase
vi.mock('firebase/database', async () => {
    return {
        getDatabase: vi.fn(),
        ref: vi.fn(),
        onValue: vi.fn(),
        runTransaction: vi.fn(),
        set: vi.fn(),
        update: vi.fn(),
        get: vi.fn(),
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
    useUserStats: () => ({ updateUserStats: vi.fn() })
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
        const onValueMock = vi.mocked(firebaseDatabase.onValue).mockImplementation((ref, callback) => {
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
            } as any);
            return vi.fn();
        });

        let capturedUpdateFn: (currentData: any) => any;
        const runTransactionMock = vi.mocked(firebaseDatabase.runTransaction).mockImplementation(async (ref, updateFn) => {
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
});
