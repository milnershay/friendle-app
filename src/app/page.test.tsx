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

    it('renders the home page correctly (step 0)', () => {
        render(<Home />);

        expect(screen.getByText(/Friendle/i)).toBeDefined();
        expect(screen.getByPlaceholderText('Enter name')).toBeDefined();
        // Create Room/Join Room should not be visible yet
        expect(screen.queryByText('Create Room')).toBeNull();
    });

    it('allows entering username and proceeding to menu', () => {
        render(<Home />);
        const input = screen.getByPlaceholderText('Enter name');
        fireEvent.change(input, { target: { value: 'TestUser' } });

        const nextButton = screen.getByText('Next');
        fireEvent.click(nextButton);

        expect(screen.getByText('Create Room')).toBeDefined();
        expect(screen.getByText('Join')).toBeDefined();
    });

    it('creates a room with valid username', async () => {
        render(<Home />);

        // Step 0 -> 1
        const usernameInput = screen.getByPlaceholderText('Enter name');
        fireEvent.change(usernameInput, { target: { value: 'TestUser' } });
        fireEvent.click(screen.getByText('Next'));

        // Step 1 -> Create
        const createButton = screen.getByText('Create Room');
        fireEvent.click(createButton);

        await waitFor(() => {
            expect(pushMock).toHaveBeenCalledWith(expect.stringMatching(/\/room\/.*username=TestUser/));
        });
    });

    it('alerts on invalid username when trying to proceed', () => {
        const alertMock = vi.spyOn(window, 'alert').mockImplementation(() => {});
        render(<Home />);

        const nextButton = screen.getByText('Next');
        fireEvent.click(nextButton); // Empty username

        expect(alertMock).toHaveBeenCalled();
        expect(screen.queryByText('Create Room')).toBeNull(); // Should not advance
    });

    it('joins a room with valid username and room code', async () => {
        render(<Home />);

        // Step 0 -> 1
        const usernameInput = screen.getByPlaceholderText('Enter name');
        fireEvent.change(usernameInput, { target: { value: 'TestUser' } });
        fireEvent.click(screen.getByText('Next'));

        // Step 1 -> 2
        const joinMenuButton = screen.getByText('Join');
        fireEvent.click(joinMenuButton);

        // Step 2
        expect(screen.getByPlaceholderText('CODE')).toBeDefined();

        const roomInput = screen.getByPlaceholderText('CODE');
        fireEvent.change(roomInput, { target: { value: 'ABCDEF' } });

        // Click Join in Step 2
        // Since "Join" text is on both buttons (menu and submit), we need to be specific or rely on visibility.
        // React Testing Library will find the visible one usually, or all.
        // In Step 2, Step 1 is hidden, so only one "Join" button should be visible/rendered.
        const joinSubmitButton = screen.getByText('Join');
        fireEvent.click(joinSubmitButton);

        await waitFor(() => {
            expect(pushMock).toHaveBeenCalledWith('/room/ABCDEF?username=TestUser');
        });
    });

    it('alerts on invalid room code', () => {
        const alertMock = vi.spyOn(window, 'alert').mockImplementation(() => {});
        render(<Home />);

        // Step 0 -> 1
        const usernameInput = screen.getByPlaceholderText('Enter name');
        fireEvent.change(usernameInput, { target: { value: 'TestUser' } });
        fireEvent.click(screen.getByText('Next'));

        // Step 1 -> 2
        fireEvent.click(screen.getByText('Join'));

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

        expect(screen.getByPlaceholderText('הזן שם')).toBeDefined();
        expect(screen.getByText('הבא')).toBeDefined();

        // Enter username to check next steps translations
        const input = screen.getByPlaceholderText('הזן שם');
        fireEvent.change(input, { target: { value: 'User' } });
        fireEvent.click(screen.getByText('הבא'));

        expect(screen.getByText('צור חדר')).toBeDefined();
    });
});
