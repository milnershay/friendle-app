import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { cleanupOldRooms, deleteRoom, getRoomStats } from './roomCleanup';
import { get, remove } from 'firebase/database';

// Mock firebase
vi.mock('@/lib/firebase', () => ({
    db: {},
}));

vi.mock('firebase/database', () => ({
    ref: vi.fn(),
    set: vi.fn(),
    get: vi.fn(),
    remove: vi.fn(),
}));

describe('roomCleanup', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('cleanupOldRooms', () => {
        it('handles no rooms', async () => {
            (get as Mock).mockResolvedValue({
                exists: () => false,
            });

            const result = await cleanupOldRooms();
            expect(result).toEqual({ deleted: 0, total: 0 });
            expect(remove).not.toHaveBeenCalled();
        });

        it('deletes old empty rooms', async () => {
            const now = Date.now();
            const oldTime = now - (25 * 60 * 60 * 1000); // 25 hours ago

            const rooms = {
                'room1': { startTime: oldTime, players: {} }, // Old and empty -> delete
                'room2': { startTime: now, players: {} }, // New and empty -> keep
            };

            (get as Mock).mockResolvedValue({
                exists: () => true,
                val: () => rooms,
            });

            const result = await cleanupOldRooms(24);

            expect(result.deleted).toBe(1);
            expect(result.total).toBe(2);
            expect(remove).toHaveBeenCalledTimes(1);
            // Check if called with correct ref path (implementation details, might be tricky to check precise args for mocked ref)
        });

        it('deletes old rooms with no scores', async () => {
             const now = Date.now();
             const oldTime = now - (25 * 60 * 60 * 1000);

             const rooms = {
                 'room1': {
                     startTime: oldTime,
                     players: {
                         'p1': { score: 0 },
                         'p2': { score: 0 }
                     }
                 }, // Old and no scores -> delete
                 'room2': {
                     startTime: oldTime,
                     players: {
                         'p1': { score: 10 }
                     }
                 }, // Old but has scores -> keep (active game essentially)
             };

             (get as Mock).mockResolvedValue({
                 exists: () => true,
                 val: () => rooms,
             });

             const result = await cleanupOldRooms(24);

             expect(result.deleted).toBe(1);
             expect(remove).toHaveBeenCalledTimes(1);
        });
    });

    describe('deleteRoom', () => {
        it('deletes a specific room', async () => {
            (remove as Mock).mockResolvedValue(undefined);

            const result = await deleteRoom('room123');
            expect(result).toBe(true);
            expect(remove).toHaveBeenCalled();
        });

        it('handles errors', async () => {
            (remove as Mock).mockRejectedValue(new Error('Delete failed'));

            const result = await deleteRoom('room123');
            expect(result).toBe(false);
        });
    });

    describe('getRoomStats', () => {
        it('returns stats correctly', async () => {
            const now = Date.now();
            const oldTime = now - (25 * 60 * 60 * 1000);

            const rooms = {
                'room1': { startTime: now, players: { 'p1': {}, 'p2': {} } }, // Active, 2 players
                'room2': { startTime: oldTime, players: { 'p3': {} } }, // Old, 1 player
                'room3': { startTime: now, players: {} }, // Active, 0 players
            };

            (get as Mock).mockResolvedValue({
                exists: () => true,
                val: () => rooms,
            });

            const stats = await getRoomStats();

            expect(stats.totalRooms).toBe(3);
            expect(stats.activeRooms).toBe(2); // room1, room3
            expect(stats.oldRooms).toBe(1); // room2
            expect(stats.totalPlayers).toBe(3); // 2 + 1 + 0
            expect(stats.avgPlayersPerRoom).toBe("1.0"); // 3 / 3
        });

        it('handles empty DB', async () => {
            (get as Mock).mockResolvedValue({
                exists: () => false,
            });

            const stats = await getRoomStats();

            expect(stats.totalRooms).toBe(0);
            expect(stats.totalPlayers).toBe(0);
        });
    });
});
