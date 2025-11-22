import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Home from './page';
import * as navigation from 'next/navigation';
import * as validation from '@/lib/validation';

// Mock useRouter
vi.mock('next/navigation', () => ({
    useRouter: vi.fn(),
}));

// Mock firebase
vi.mock('@/lib/firebase', () => ({
    db: {},
}));

vi.mock('firebase/database', () => ({
    ref: vi.fn(),
    set: vi.fn(),
    get: vi.fn(),
}));

describe('Home Page', () => {
    const pushMock = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
        (navigation.useRouter as any).mockReturnValue({
            push: pushMock,
        });
    });

    it('renders the home page correctly', () => {
        render(<Home />);

        expect(screen.getByText(/Friendle/i)).toBeDefined();
        expect(screen.getByPlaceholderText('Enter your name')).toBeDefined(); // Fixed placeholder
        expect(screen.getByText('Create New Room')).toBeDefined(); // Fixed button text
    });

    it('allows entering username', () => {
        render(<Home />);
        const input = screen.getByPlaceholderText('Enter your name');
        fireEvent.change(input, { target: { value: 'TestUser' } });
        expect((input as HTMLInputElement).value).toBe('TestUser');
    });

    it('creates a room with valid username', async () => {
        render(<Home />);

        const usernameInput = screen.getByPlaceholderText('Enter your name');
        fireEvent.change(usernameInput, { target: { value: 'TestUser' } });

        const createButton = screen.getByText('Create New Room');
        fireEvent.click(createButton);

        await waitFor(() => {
            expect(pushMock).toHaveBeenCalledWith(expect.stringMatching(/\/room\/.*username=TestUser/));
        });
    });

    it('alerts on invalid username when creating room', () => {
        const alertMock = vi.spyOn(window, 'alert').mockImplementation(() => {});
        render(<Home />);

        const createButton = screen.getByText('Create New Room');
        fireEvent.click(createButton); // Empty username

        expect(alertMock).toHaveBeenCalled();
    });

    it('joins a room with valid username and room code', async () => {
        render(<Home />);

        const usernameInput = screen.getByPlaceholderText('Enter your name');
        fireEvent.change(usernameInput, { target: { value: 'TestUser' } });

        const roomInput = screen.getByPlaceholderText('CODE'); // Fixed placeholder
        fireEvent.change(roomInput, { target: { value: 'ABCDEF' } });

        const joinButton = screen.getByText('Join');
        fireEvent.click(joinButton);

        await waitFor(() => {
            expect(pushMock).toHaveBeenCalledWith('/room/ABCDEF?username=TestUser');
        });
    });

    it('alerts on invalid room code', () => {
        const alertMock = vi.spyOn(window, 'alert').mockImplementation(() => {});
        render(<Home />);

        const usernameInput = screen.getByPlaceholderText('Enter your name');
        fireEvent.change(usernameInput, { target: { value: 'TestUser' } });

        const roomInput = screen.getByPlaceholderText('CODE');
        fireEvent.change(roomInput, { target: { value: '!!' } });

        const joinButton = screen.getByText('Join');
        fireEvent.click(joinButton);

        expect(alertMock).toHaveBeenCalled();
    });

    it('changes language', () => {
        render(<Home />);

        const select = screen.getByRole('combobox');
        fireEvent.change(select, { target: { value: 'he' } });

        // Check if text changed to Hebrew
        expect(screen.getByText('צור חדר חדש')).toBeDefined(); // Updated to match "Create New Room" in Hebrew from i18n.ts
    });
});
