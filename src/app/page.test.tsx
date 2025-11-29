import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Home from './page';
import * as navigation from 'next/navigation';
import toast from 'react-hot-toast';

// Mock useRouter
vi.mock('next/navigation', () => ({
    useRouter: vi.fn(),
}));

// Mock react-hot-toast
vi.mock('react-hot-toast', () => ({
    default: {
        error: vi.fn(),
    },
}));

describe('Home Page - New Flow', () => {
    const pushMock = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
        (navigation.useRouter as vi.Mock).mockReturnValue({
            push: pushMock,
        });
        // Mock localStorage for language settings
        Storage.prototype.getItem = vi.fn(() => 'en');
        Storage.prototype.setItem = vi.fn();
    });

    it('renders the initial action choice (step 0)', async () => {
        render(<Home />);
        expect(await screen.findByText('Create Room')).toBeDefined();
        expect(await screen.findByText('Join Random Room')).toBeDefined();
        expect(await screen.findByText('Join with Code')).toBeDefined();
        expect(screen.queryByLabelText('Username')).toBeNull();
    });

    it('navigates to create room flow (step 1)', async () => {
        render(<Home />);
        fireEvent.click(await screen.findByText('Create Room'));
        expect(await screen.findByLabelText('Username')).toBeDefined();
        expect(await screen.findByText('Create Room')).toBeDefined();
    });

    it('navigates to join room flow (step 2)', async () => {
        render(<Home />);
        fireEvent.click(await screen.findByText('Join with Code'));
        expect(await screen.findByLabelText('Room Code')).toBeDefined();
        expect(await screen.findByText('Next')).toBeDefined();
    });

    it('allows creating a room with a valid username', async () => {
        render(<Home />);
        fireEvent.click(await screen.findByText('Create Room'));

        const usernameInput = await screen.findByLabelText('Username');
        fireEvent.change(usernameInput, { target: { value: 'TestUser' } });
        fireEvent.click(await screen.findByText('Create Room'));

        await waitFor(() => {
            expect(pushMock).toHaveBeenCalledWith(expect.stringMatching(/\/room\/[A-Z0-9]{6}\?username=TestUser/));
        });
    });

    it('validates username on create room submission', async () => {
        render(<Home />);
        fireEvent.click(await screen.findByText('Create Room'));
        fireEvent.click(await screen.findByText('Create Room')); // Empty username
        expect(toast.error).toHaveBeenCalledWith('Username cannot be empty');
        expect(pushMock).not.toHaveBeenCalled();
    });

    it('allows joining a room with valid code and username', async () => {
        render(<Home />);
        fireEvent.click(await screen.findByText('Join with Code'));

        const roomInput = await screen.findByLabelText('Room Code');
        fireEvent.change(roomInput, { target: { value: 'VALID6' } });
        fireEvent.click(await screen.findByText('Next'));

        const usernameInput = await screen.findByLabelText('Username');
        fireEvent.change(usernameInput, { target: { value: 'Joiner' } });
        fireEvent.click(await screen.findByText('Join'));

        await waitFor(() => {
            expect(pushMock).toHaveBeenCalledWith('/room/VALID6?username=Joiner&language=en');
        });
    });

    it('validates room code before asking for username', async () => {
        render(<Home />);
        fireEvent.click(await screen.findByText('Join with Code'));

        const roomInput = await screen.findByLabelText('Room Code');
        fireEvent.change(roomInput, { target: { value: 'INVALID' } }); // Too long
        fireEvent.click(await screen.findByText('Next'));

        expect(toast.error).toHaveBeenCalledWith('Room code must be exactly 6 characters');
        expect(screen.queryByLabelText('Username')).toBeNull();
    });

    it('supports back button navigation', async () => {
        render(<Home />);
        // Step 0 -> 1 (Create)
        fireEvent.click(await screen.findByText('Create Room'));
        expect(await screen.findByLabelText('Username')).toBeDefined();
        // Step 1 -> 0
        fireEvent.click(await screen.findByText('Back'));
        expect(await screen.findByText('Create Room')).toBeDefined();

        // Step 0 -> 2 (Join)
        fireEvent.click(await screen.findByText('Join with Code'));
        expect(await screen.findByLabelText('Room Code')).toBeDefined();
        // Step 2 -> 3
        fireEvent.change(await screen.findByLabelText('Room Code'), { target: { value: 'ABCDEF' } });
        fireEvent.click(await screen.findByText('Next'));
        expect(await screen.findByLabelText('Username')).toBeDefined();
        // Step 3 -> 2
        fireEvent.click(await screen.findByText('Back'));
        expect(await screen.findByLabelText('Room Code')).toBeDefined();
        // Step 2 -> 0
        fireEvent.click(await screen.findByText('Back'));
        expect(await screen.findByText('Create Room')).toBeDefined();
    });

    it('changes language and maintains state', async () => {
        render(<Home />);
        const heButton = await screen.findByText('HE');
        fireEvent.click(heButton);

        // Check if main buttons are translated
        expect(await screen.findByText('צור חדר')).toBeDefined();
        expect(await screen.findByText('הצטרף עם קוד')).toBeDefined();

        // Navigate to create flow and check translation
        fireEvent.click(await screen.findByText('צור חדר'));
        expect(await screen.findByLabelText('שם משתמש')).toBeDefined();
        expect(await screen.findByText('צור חדר')).toBeDefined();
    });
});
