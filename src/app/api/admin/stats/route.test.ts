import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from './route';
import { NextRequest } from 'next/server';

// Mock Firebase
const mockDb = {
  ref: vi.fn().mockReturnThis(),
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

describe('GET /api/admin/stats', () => {
  const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'friendle_admin_2024';

  beforeEach(() => {
    vi.clearAllMocks();
    cookieStore.clear();
  });

  const createMockRequest = (sessionCookie?: { name: string; value: string; }) => {
    if (sessionCookie) {
        cookieStore.set(sessionCookie.name, sessionCookie);
    }
    return {} as NextRequest;
  };

  const createAdminSession = () => {
    return { name: 'admin_session', value: Buffer.from(`${ADMIN_PASSWORD}:${Date.now()}`).toString('base64') };
  };

  it('should return 401 Unauthorized if not authenticated', async () => {
    const req = createMockRequest();
    const res = await GET(req);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe('Unauthorized');
  });

  it('should return stats successfully when authenticated', async () => {
    const session = createAdminSession();
    const req = createMockRequest(session);

    const now = Date.now();
    const mockRooms = {
      room1: { createdAt: now - 5000, players: { p1: {}, p2: {} } }, // Active
      room2: { createdAt: now - 3 * 3600 * 1000, players: { p3: {} } }, // Inactive
      room3: { createdAt: now - 30 * 3600 * 1000, players: { p4: {} } }, // Old
    };

    mockDb.once.mockResolvedValue({ val: () => mockRooms });

    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body.totalRooms).toBe(3);
    expect(body.activeRooms).toBe(1);
    expect(body.oldRooms).toBe(1);
    expect(body.totalPlayers).toBe(4);
  });

  it('should handle an empty database gracefully', async () => {
    const session = createAdminSession();
    const req = createMockRequest(session);

    mockDb.once.mockResolvedValue({ val: () => null });

    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body.totalRooms).toBe(0);
    expect(body.activeRooms).toBe(0);
    expect(body.oldRooms).toBe(0);
    expect(body.totalPlayers).toBe(0);
  });

  it('should handle database errors', async () => {
    const session = createAdminSession();
    const req = createMockRequest(session);

    mockDb.once.mockRejectedValue(new Error('DB read failed'));

    const res = await GET(req);
    expect(res.status).toBe(500);
    const body = await res.json();

    expect(body.error).toBe('Failed to retrieve stats');
    expect(body.details).toBe('DB read failed');
  });
});
