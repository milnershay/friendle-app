import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from './route';
import { NextRequest } from 'next/server';

// Mock Firebase
const mockDb = {
  ref: vi.fn().mockReturnThis(),
  child: vi.fn().mockReturnThis(),
  remove: vi.fn().mockResolvedValue(null),
  once: vi.fn(),
};
vi.mock('firebase-admin/app', () => ({
  getApps: () => [{}],
  initializeApp: () => {},
}));
vi.mock('firebase-admin/database', () => ({
  getDatabase: () => mockDb,
}));

// Create a stateful mock for the cookie store
const cookieStore = new Map<string, { name: string; value: string }>();
const mockGet = vi.fn((key: string) => cookieStore.get(key));

vi.mock('next/headers', () => ({
    cookies: () => ({
        get: mockGet,
    }),
}));

describe('POST /api/admin/cleanup', () => {
  const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'friendle_admin_2024';

  beforeEach(() => {
    vi.clearAllMocks();
    cookieStore.clear();
  });

  const createMockRequest = (body: unknown, sessionCookie?: { name: string; value: string; }) => {
    if (sessionCookie) {
        cookieStore.set(sessionCookie.name, sessionCookie);
    }
    return {
      json: async () => body,
    } as NextRequest;
  };

  const createAdminSession = () => {
    return { name: 'admin_session', value: Buffer.from(`${ADMIN_PASSWORD}:${Date.now()}`).toString('base64') };
  };

  it('should return 401 Unauthorized if not authenticated', async () => {
    const req = createMockRequest({ hours: 24 });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it('should return 400 for invalid hours parameter', async () => {
    const session = createAdminSession();
    const req1 = createMockRequest({ hours: 'invalid' }, session);
    const res1 = await POST(req1);
    expect(res1.status).toBe(400);

    const req2 = createMockRequest({ hours: -1 }, session);
    const res2 = await POST(req2);
    expect(res2.status).toBe(400);
  });

  it('should delete old rooms correctly', async () => {
    const session = createAdminSession();
    const req = createMockRequest({ hours: 2 }, session);

    const now = Date.now();
    const mockRooms = {
      room1: { updatedAt: now - 30 * 60 * 1000 }, // Active, should not be deleted
      room2: { updatedAt: now - 3 * 60 * 60 * 1000 }, // Old, should be deleted
      room3: { createdAt: now - 4 * 60 * 60 * 1000 }, // Old, should be deleted
      room4: { updatedAt: now - 5 * 60 * 60 * 1000 }, // Old, should be deleted
    };
    mockDb.once.mockResolvedValue({ val: () => mockRooms });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body.totalRooms).toBe(4);
    expect(body.deletedCount).toBe(3);
    expect(mockDb.child).toHaveBeenCalledTimes(3);
    expect(mockDb.child).toHaveBeenCalledWith('room2');
    expect(mockDb.child).toHaveBeenCalledWith('room3');
    expect(mockDb.child).toHaveBeenCalledWith('room4');
  });

  it('should not delete active rooms even if they are older than cutoff', async () => {
    const session = createAdminSession();
    const req = createMockRequest({ hours: 1 }, session);

    const now = Date.now();
    const mockRooms = {
        room1: { updatedAt: now - 30 * 60 * 1000 }, // Active, should not be deleted
        room2: { updatedAt: now - 90 * 60 * 1000 }, // Inactive, should be deleted
    };
    mockDb.once.mockResolvedValue({ val: () => mockRooms });

    const res = await POST(req);
    const body = await res.json();

    expect(body.deletedCount).toBe(1);
    expect(mockDb.child).toHaveBeenCalledWith('room2');
    expect(mockDb.child).not.toHaveBeenCalledWith('room1');
  });
});
