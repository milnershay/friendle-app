import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Home from './page';
import * as navigation from 'next/navigation';

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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (navigation.useRouter as any).mockReturnValue({
            push: pushMock,
        });
    });

    it('renders the home page correctly', () => {
        render(<Home />);

        expect(screen.getByText(/Friendle/i)).toBeDefined();
        expect(screen.getByPlaceholderText('Enter name')).toBeDefined();
        expect(screen.getByText('Create Room')).toBeDefined();
        expect(screen.getByText('Join')).toBeDefined();
    });

    it('allows entering username', () => {
        render(<Home />);
        const input = screen.getByPlaceholderText('Enter name');
        fireEvent.change(input, { target: { value: 'TestUser' } });
        expect((input as HTMLInputElement).value).toBe('TestUser');
    });

    it('creates a room with valid username', async () => {
        render(<Home />);

        const usernameInput = screen.getByPlaceholderText('Enter name');
        fireEvent.change(usernameInput, { target: { value: 'TestUser' } });

        const createButton = screen.getByText('Create Room');
        fireEvent.click(createButton);

        await waitFor(() => {
            expect(pushMock).toHaveBeenCalledWith(expect.stringMatching(/\/room\/.*username=TestUser/));
        });
    });

    it('alerts on invalid username when creating room', () => {
        const alertMock = vi.spyOn(window, 'alert').mockImplementation(() => {});
        render(<Home />);

        const createButton = screen.getByText('Create Room');
        fireEvent.click(createButton); // Empty username

        expect(alertMock).toHaveBeenCalled();
    });

    it('joins a room with valid username and room code', async () => {
        render(<Home />);

        const usernameInput = screen.getByPlaceholderText('Enter name');
        fireEvent.change(usernameInput, { target: { value: 'TestUser' } });

        const roomInput = screen.getByPlaceholderText('CODE');
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

        const usernameInput = screen.getByPlaceholderText('Enter name');
        fireEvent.change(usernameInput, { target: { value: 'TestUser' } });

        const roomInput = screen.getByPlaceholderText('CODE');
        fireEvent.change(roomInput, { target: { value: '!!' } });

        const joinButton = screen.getByText('Join');
        fireEvent.click(joinButton);

        expect(alertMock).toHaveBeenCalled();
    });

    it('changes language to Hebrew', () => {
        render(<Home />);

        const heButton = screen.getByText('HE');
        fireEvent.click(heButton);

        expect(screen.getByText('צור חדר')).toBeDefined();
        expect(screen.getByPlaceholderText('הזן שם')).toBeDefined();
    });
});
