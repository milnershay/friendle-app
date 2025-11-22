import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { POST, GET, DELETE } from './route';
import { NextRequest } from 'next/server';
import { cookies } from 'next/headers';

vi.mock('next/headers', () => ({
    cookies: vi.fn(),
}));

describe('Admin Auth API', () => {
    const mockCookies = {
        set: vi.fn(),
        get: vi.fn(),
        delete: vi.fn(),
    };

    beforeEach(() => {
        vi.clearAllMocks();
        (cookies as Mock).mockResolvedValue(mockCookies);
    });

    it('POST: logs in with correct password', async () => {
        const req = new NextRequest('http://localhost', {
            method: 'POST',
            body: JSON.stringify({ password: 'friendle_admin_2024' })
        });

        const res = await POST(req);
        const data = await res.json();

        expect(res.status).toBe(200);
        expect(data.success).toBe(true);
        expect(mockCookies.set).toHaveBeenCalled();
    });

    it('POST: fails with wrong password', async () => {
        const req = new NextRequest('http://localhost', {
            method: 'POST',
            body: JSON.stringify({ password: 'wrong' })
        });

        const res = await POST(req);
        expect(res.status).toBe(401);
    });

    it('GET: returns true if valid cookie', async () => {
        const token = Buffer.from('friendle_admin_2024:' + Date.now()).toString('base64');
        mockCookies.get.mockReturnValue({ value: token });

        const req = new NextRequest('http://localhost');
        const res = await GET(req);
        const data = await res.json();

        expect(data.authenticated).toBe(true);
    });

    it('GET: returns false if no cookie', async () => {
        mockCookies.get.mockReturnValue(null);

        const req = new NextRequest('http://localhost');
        const res = await GET(req);
        const data = await res.json();

        expect(data.authenticated).toBe(false);
    });

    it('DELETE: logs out', async () => {
        const req = new NextRequest('http://localhost');
        const res = await DELETE(req);

        expect(mockCookies.delete).toHaveBeenCalledWith('admin_session');
        expect(res.status).toBe(200);
    });
});
