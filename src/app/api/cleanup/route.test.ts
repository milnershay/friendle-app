import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { GET } from './route';
import { NextRequest } from 'next/server';
import * as adminDb from 'firebase-admin/database';

vi.mock('firebase-admin/app', () => ({
    initializeApp: vi.fn(),
    getApps: vi.fn(() => []),
}));

vi.mock('firebase-admin/database', () => ({
    getDatabase: vi.fn(),
}));

describe('Cleanup API', () => {
    const mockRef = vi.fn();
    const mockDb = { ref: mockRef };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let mockRoomsRef: any;

    beforeEach(() => {
        vi.clearAllMocks();
        process.env.CRON_SECRET = 'secret';
        process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL = 'url';

        const mockRemove = vi.fn().mockResolvedValue(undefined);
        const mockChildRef = { remove: mockRemove };

        mockRoomsRef = {
            once: vi.fn(),
            child: vi.fn(() => mockChildRef),
        };

        (adminDb.getDatabase as Mock).mockReturnValue(mockDb);
        mockRef.mockReturnValue(mockRoomsRef);
    });

    it('returns 401 if unauthorized', async () => {
        const req = new NextRequest('http://localhost/api/cleanup');
        const res = await GET(req);
        expect(res.status).toBe(401);
    });

    it('cleans up rooms', async () => {
        const req = new NextRequest('http://localhost/api/cleanup', {
            headers: { authorization: 'Bearer secret' }
        });

        const mockRooms = {
             'room1': { createdAt: Date.now() - 25 * 3600 * 1000, players: {} }, // 25h old -> delete
             'room2': { createdAt: Date.now(), players: { p1: {} } }, // new -> keep
        };

        mockRoomsRef.once.mockResolvedValue({ val: () => mockRooms });

        const res = await GET(req);
        const data = await res.json();

        expect(res.status).toBe(200);
        expect(data.deletedCount).toBe(1);
        expect(mockRoomsRef.child).toHaveBeenCalledWith('room1');
    });

    it('handles errors', async () => {
        const req = new NextRequest('http://localhost/api/cleanup', {
            headers: { authorization: 'Bearer secret' }
        });

        mockRoomsRef.once.mockRejectedValue(new Error('DB Error'));

        const res = await GET(req);
        const data = await res.json();

        expect(res.status).toBe(500);
        expect(data.error).toBe('Cleanup failed');
    });
});
