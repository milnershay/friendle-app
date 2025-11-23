import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST, GET, DELETE } from './route';
import { NextRequest } from 'next/server';
import { cookies } from 'next/headers';

// Create a stateful mock for the cookie store
const cookieStore = new Map<string, { name: string; value: string }>();
const mockGet = vi.fn((key: string) => cookieStore.get(key));
const mockSet = vi.fn((key: string, value: string) => {
    cookieStore.set(key, { name: key, value });
});
const mockDelete = vi.fn((key: string) => cookieStore.delete(key));

// Mock next/headers
vi.mock('next/headers', () => ({
    cookies: () => ({
        get: mockGet,
        set: mockSet,
        delete: mockDelete,
    }),
}));

describe('/api/admin/auth', () => {
    const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'friendle_admin_2024';

    beforeEach(() => {
        vi.clearAllMocks();
        cookieStore.clear();
    });

    // Test POST (Login)
    describe('POST', () => {
        it('should log in successfully with the correct password', async () => {
            const req = { json: async () => ({ password: ADMIN_PASSWORD }) } as NextRequest;
            const res = await POST(req);
            const body = await res.json();

            expect(res.status).toBe(200);
            expect(body.success).toBe(true);
            expect(mockSet).toHaveBeenCalledWith('admin_session', expect.any(String), expect.any(Object));
        });

        it('should fail to log in with an incorrect password', async () => {
            const req = { json: async () => ({ password: 'wrong_password' }) } as NextRequest;
            const res = await POST(req);
            const body = await res.json();

            expect(res.status).toBe(401);
            expect(body.success).toBe(false);
            expect(body.error).toBe('Invalid password');
        });
    });

    // Test GET (Check Auth)
    describe('GET', () => {
        it('should return authenticated: true when logged in', async () => {
            const sessionToken = Buffer.from(`${ADMIN_PASSWORD}:${Date.now()}`).toString('base64');
            cookieStore.set('admin_session', { name: 'admin_session', value: sessionToken });

            const req = {} as NextRequest;
            const res = await GET(req);
            const body = await res.json();

            expect(res.status).toBe(200);
            expect(body.authenticated).toBe(true);
        });

        it('should return authenticated: false when not logged in', async () => {
            const req = {} as NextRequest;
            const res = await GET(req);
            const body = await res.json();

            expect(res.status).toBe(401);
            expect(body.authenticated).toBe(false);
        });
    });

    // Test DELETE (Logout)
    describe('DELETE', () => {
        it('should log out successfully', async () => {
            cookieStore.set('admin_session', { name: 'admin_session', value: 'some_token' });
            const req = {} as NextRequest;
            const res = await DELETE(req);
            const body = await res.json();

            expect(res.status).toBe(200);
            expect(body.success).toBe(true);
            expect(mockDelete).toHaveBeenCalledWith('admin_session');
        });
    });
});
