import { describe, it, expect, vi, type Mock } from 'vitest';
import { getApps, initializeApp, getApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';

vi.mock('firebase/app', () => ({
    getApps: vi.fn(),
    initializeApp: vi.fn(),
    getApp: vi.fn(),
}));
vi.mock('firebase/database', () => ({
    getDatabase: vi.fn(),
}));

describe('Firebase Config', () => {
    it('initializes firebase app if not exists', async () => {
        vi.resetModules();
        (getApps as Mock).mockReturnValue([]);
        await import('./firebase');
        expect(initializeApp).toHaveBeenCalled();
        expect(getDatabase).toHaveBeenCalled();
    });

    it('uses existing app if exists', async () => {
        vi.resetModules();
        (getApps as Mock).mockReturnValue([{}]);
        await import('./firebase');
        expect(getApp).toHaveBeenCalled();
    });
});
