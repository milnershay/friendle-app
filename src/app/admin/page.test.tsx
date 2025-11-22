import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AdminPage from './page';
import { useRouter } from 'next/navigation';
import * as roomCleanup from '@/lib/roomCleanup';

vi.mock('next/navigation', () => ({
    useRouter: vi.fn(),
}));

vi.mock('@/lib/roomCleanup', () => ({
    cleanupOldRooms: vi.fn(),
    getRoomStats: vi.fn(),
}));

describe('AdminPage', () => {
    const mockRouter = { push: vi.fn() };
    const mockFetch = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
        (useRouter as Mock).mockReturnValue(mockRouter);
        vi.stubGlobal('fetch', mockFetch);
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it('shows login form when not authenticated', async () => {
        mockFetch.mockResolvedValueOnce({
            json: () => Promise.resolve({ authenticated: false })
        });

        render(<AdminPage />);

        await waitFor(() => expect(screen.getByText('Admin Login')).toBeTruthy());
    });

    it('handles successful login', async () => {
        mockFetch.mockResolvedValueOnce({
            json: () => Promise.resolve({ authenticated: false })
        });

        render(<AdminPage />);
        await waitFor(() => expect(screen.getByText('Admin Login')).toBeTruthy());

        mockFetch.mockResolvedValueOnce({
            json: () => Promise.resolve({ success: true })
        });

        const passwordInput = screen.getByPlaceholderText('Enter admin password');
        fireEvent.change(passwordInput, { target: { value: 'secret' } });
        fireEvent.click(screen.getByText('Login'));

        await waitFor(() => expect(screen.getByText('Room Admin')).toBeTruthy());
    });

    it('handles failed login', async () => {
        mockFetch.mockResolvedValueOnce({
            json: () => Promise.resolve({ authenticated: false })
        });

        render(<AdminPage />);
        await waitFor(() => expect(screen.getByText('Admin Login')).toBeTruthy());

        mockFetch.mockResolvedValueOnce({
            json: () => Promise.resolve({ success: false })
        });

        const passwordInput = screen.getByPlaceholderText('Enter admin password');
        fireEvent.change(passwordInput, { target: { value: 'wrong' } });
        fireEvent.click(screen.getByText('Login'));

        await waitFor(() => expect(screen.getByText('Incorrect password')).toBeTruthy());
    });

    it('loads stats when authenticated', async () => {
         mockFetch.mockResolvedValueOnce({
            json: () => Promise.resolve({ authenticated: true })
        });

        (roomCleanup.getRoomStats as Mock).mockResolvedValue({
            totalRooms: 10,
            activeRooms: 5,
            oldRooms: 5,
            totalPlayers: 20
        });

        render(<AdminPage />);
        await waitFor(() => expect(screen.getByText('Room Admin')).toBeTruthy());

        fireEvent.click(screen.getByText('Load Stats'));

        await waitFor(() => expect(screen.getByText('10')).toBeTruthy()); // Total Rooms
        expect(roomCleanup.getRoomStats).toHaveBeenCalled();
    });

    it('runs cleanup', async () => {
         mockFetch.mockResolvedValueOnce({
            json: () => Promise.resolve({ authenticated: true })
        });

        (roomCleanup.cleanupOldRooms as Mock).mockResolvedValue({ deleted: 2, total: 10 });
        (roomCleanup.getRoomStats as Mock).mockResolvedValue({});

        render(<AdminPage />);
        await waitFor(() => expect(screen.getByText('Room Admin')).toBeTruthy());

        fireEvent.click(screen.getByRole('button', { name: '24 Hours' }));

        await waitFor(() => expect(roomCleanup.cleanupOldRooms).toHaveBeenCalledWith(24));
        await waitFor(() => expect(roomCleanup.getRoomStats).toHaveBeenCalled());

        fireEvent.click(screen.getByRole('button', { name: '1 Hour' }));
        await waitFor(() => expect(roomCleanup.cleanupOldRooms).toHaveBeenCalledWith(1));

        fireEvent.click(screen.getByRole('button', { name: '7 Days' }));
        await waitFor(() => expect(roomCleanup.cleanupOldRooms).toHaveBeenCalledWith(168));
    });

    it('renders loading state', async () => {
        mockFetch.mockReturnValue(new Promise(() => {})); // Never resolves
        render(<AdminPage />);
        expect(screen.getByText('Checking authentication...')).toBeTruthy();
    });

    it('handles logout', async () => {
         mockFetch.mockResolvedValueOnce({
            json: () => Promise.resolve({ authenticated: true })
        });
        mockFetch.mockResolvedValueOnce({ ok: true }); // Logout API

        render(<AdminPage />);
        await waitFor(() => expect(screen.getByText('Room Admin')).toBeTruthy());

        fireEvent.click(screen.getByText('Logout'));

        await waitFor(() => expect(mockRouter.push).toHaveBeenCalledWith('/'));
    });
});
