import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import RoomPage from './page';
import * as firebaseDb from 'firebase/database';
import { useRouter, useParams, useSearchParams } from 'next/navigation';

// Mock Next.js navigation
vi.mock('next/navigation', () => ({
    useRouter: vi.fn(),
    useParams: vi.fn(),
    useSearchParams: vi.fn(),
}));

// Mock Firebase Database
vi.mock('firebase/database', () => {
    return {
        getDatabase: vi.fn(() => ({})),
        ref: vi.fn((_db, path) => `ref://${path}`),
        onValue: vi.fn(),
        get: vi.fn(() => Promise.resolve({ val: () => null, exists: () => false })),
        set: vi.fn(() => Promise.resolve()),
        update: vi.fn(() => Promise.resolve()),
        runTransaction: vi.fn(() => Promise.resolve({ committed: true, snapshot: { val: () => ({}) } })),
        off: vi.fn(),
    };
});

// Mock Firebase Init
vi.mock('@/lib/firebase', () => ({
    db: {},
}));

// Mock Word Lists
vi.mock('@/lib/wordLists', () => ({
    WORD_LISTS: {
        en: {
            5: ['APPLE', 'BERRY', 'CHERY'],
        },
        he: {
            5: ['תפוח'],
        }
    }
}));

describe('RoomPage', () => {
    const mockRouter = { push: vi.fn() };
    const mockRoomId = 'test-room-123';
    const mockUsername = 'TestUser';

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let onValueCallback: (snapshot: any) => void;

    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.clear();

        // Setup Router
        (useRouter as Mock).mockReturnValue(mockRouter);
        (useParams as Mock).mockReturnValue({ roomId: mockRoomId });

        // Setup SearchParams
        const mockSearchParams = new URLSearchParams();
        mockSearchParams.set('username', mockUsername);
        (useSearchParams as Mock).mockReturnValue(mockSearchParams);

        // Setup Firebase onValue
        (firebaseDb.onValue as Mock).mockImplementation((_ref, callback) => {
            onValueCallback = callback;
            return vi.fn();
        });
    });

    it('redirects to home if no username is provided', () => {
        (useSearchParams as Mock).mockReturnValue(new URLSearchParams());

        render(<RoomPage />);

        expect(mockRouter.push).toHaveBeenCalledWith('/');
    });

    it('shows loading state initially', () => {
        render(<RoomPage />);
        expect(screen.getByText(/Connecting to room/i)).toBeTruthy();
    });

    it('creates a new room if it does not exist', async () => {
        (firebaseDb.get as Mock).mockResolvedValue({
            val: () => null,
            exists: () => false,
        });

        render(<RoomPage />);

        await waitFor(() => expect(firebaseDb.get).toHaveBeenCalled());

        await waitFor(() => expect(firebaseDb.set).toHaveBeenCalledWith(
            expect.stringMatching(/^ref:\/\//),
            expect.objectContaining({
                id: mockRoomId,
                gameState: 'waiting',
                players: expect.any(Object),
            })
        ));

        const createdRoomState = {
            id: mockRoomId,
            gameState: 'waiting',
            players: {
                'some-uid': { username: mockUsername, score: 0, status: 'waiting' }
            },
            settings: { wordLength: 5, language: 'en' }
        };

        act(() => {
            if (onValueCallback) {
                onValueCallback({
                    exists: () => true,
                    val: () => createdRoomState
                });
            }
        });

        expect(screen.getByText(mockUsername)).toBeTruthy();
        expect(screen.getByText('Start Game')).toBeTruthy();
    });

    it('joins an existing room', async () => {
        const existingRoom = {
            id: mockRoomId,
            gameState: 'waiting',
            players: {
                'other-uid': { id: 'other-uid', username: 'OtherUser', score: 0, status: 'waiting' }
            },
            settings: { wordLength: 5, language: 'en' }
        };

        (firebaseDb.get as Mock).mockResolvedValue({
            val: () => existingRoom,
            exists: () => true,
        });

        render(<RoomPage />);

        await waitFor(() => expect(firebaseDb.get).toHaveBeenCalled());

        await waitFor(() => expect(firebaseDb.update).toHaveBeenCalledWith(
            expect.stringMatching(/^ref:\/\//),
            expect.objectContaining({
               // players update
            })
        ));

        const updateCall = (firebaseDb.update as Mock).mock.calls[0];
        const updatePayload = updateCall[1];
        const keys = Object.keys(updatePayload);
        expect(keys.length).toBe(1);
        expect(updatePayload[keys[0]].username).toBe(mockUsername);
    });

    it('starts the game when host clicks Start Game', async () => {
        const myUid = 'my-uid';
        localStorage.setItem(`friendle_uid_${mockRoomId}`, myUid);

        const roomState = {
            id: mockRoomId,
            gameState: 'waiting',
            players: {
                [myUid]: { id: myUid, username: mockUsername, score: 0, status: 'waiting' }
            },
            settings: { wordLength: 5, language: 'en', customQueue: [] }
        };

        (firebaseDb.get as Mock).mockResolvedValue({ val: () => roomState });

        render(<RoomPage />);

        act(() => {
            if (onValueCallback) onValueCallback({ exists: () => true, val: () => roomState });
        });

        const startButton = screen.getByText('Start Game');
        fireEvent.click(startButton);

        expect(firebaseDb.runTransaction).toHaveBeenCalled();

        const transactionCall = (firebaseDb.runTransaction as Mock).mock.calls[0];
        const transactionUpdater = transactionCall[1];
        const newState = transactionUpdater(roomState);

        expect(newState.gameState).toBe('playing');
        expect(newState.currentWord).toBeTruthy();
        expect(newState.players[myUid].status).toBe('playing');
    });

    it('handles gameplay: making a guess', async () => {
        const myUid = 'my-uid';
        localStorage.setItem(`friendle_uid_${mockRoomId}`, myUid);

        const roomState = {
            id: mockRoomId,
            gameState: 'playing',
            currentWord: 'APPLE',
            players: {
                [myUid]: {
                    id: myUid,
                    username: mockUsername,
                    score: 0,
                    status: 'playing',
                    guesses: JSON.stringify([])
                }
            },
            settings: { wordLength: 5, language: 'en', maxGuesses: 6 },
            startTime: Date.now()
        };

        render(<RoomPage />);

        act(() => {
            if (onValueCallback) onValueCallback({ exists: () => true, val: () => roomState });
        });

        fireEvent.keyDown(window, { key: 'B' });
        fireEvent.keyDown(window, { key: 'E' });
        fireEvent.keyDown(window, { key: 'R' });
        fireEvent.keyDown(window, { key: 'R' });
        fireEvent.keyDown(window, { key: 'Y' });
        fireEvent.keyDown(window, { key: 'Enter' });

        await waitFor(() => expect(firebaseDb.update).toHaveBeenCalled());

        const calls = (firebaseDb.update as Mock).mock.calls;
        const lastCall = calls[calls.length - 1];
        const updateData = lastCall[1];

        expect(updateData.status).toBe('playing');
        expect(updateData.guesses).toContain('BERRY');
    });

    it('handles winning the game', async () => {
        const myUid = 'my-uid';
        localStorage.setItem(`friendle_uid_${mockRoomId}`, myUid);

        const roomState = {
            id: mockRoomId,
            gameState: 'playing',
            currentWord: 'APPLE',
            players: {
                [myUid]: {
                    id: myUid,
                    username: mockUsername,
                    score: 0,
                    status: 'playing',
                    guesses: JSON.stringify([])
                }
            },
            settings: { wordLength: 5, language: 'en', maxGuesses: 6 },
            startTime: Date.now()
        };

        render(<RoomPage />);
        act(() => {
            if (onValueCallback) onValueCallback({ exists: () => true, val: () => roomState });
        });

        'APPLE'.split('').forEach(char => fireEvent.keyDown(window, { key: char }));
        fireEvent.keyDown(window, { key: 'Enter' });

        await waitFor(() => expect(firebaseDb.update).toHaveBeenCalled());

        const calls = (firebaseDb.update as Mock).mock.calls;
        const lastCall = calls[calls.length - 1];
        const updateData = lastCall[1];

        expect(updateData.status).toBe('won');
        expect(updateData.score).toBe(1);
    });

    it('updates room settings', async () => {
        const myUid = 'my-uid';
        localStorage.setItem(`friendle_uid_${mockRoomId}`, myUid);

        const roomState = {
            id: mockRoomId,
            gameState: 'waiting',
            players: { [myUid]: { id: myUid, username: mockUsername, score: 0, status: 'waiting' } },
            settings: { wordLength: 5, language: 'en' }
        };

        (firebaseDb.get as Mock).mockResolvedValue({ val: () => roomState });
        render(<RoomPage />);
        act(() => { if (onValueCallback) onValueCallback({ exists: () => true, val: () => roomState }); });

        // Find Language Select (first combobox)
        const languageSelect = screen.getAllByRole('combobox')[0];
        fireEvent.change(languageSelect, { target: { value: 'he' } });

        expect(firebaseDb.update).toHaveBeenCalledWith(
            expect.stringMatching(/settings$/),
            expect.objectContaining({ language: 'he' })
        );
    });

    it('adds custom word to queue', async () => {
        const myUid = 'my-uid';
        localStorage.setItem(`friendle_uid_${mockRoomId}`, myUid);

        const roomState = {
            id: mockRoomId,
            gameState: 'waiting',
            players: { [myUid]: { id: myUid, username: mockUsername, score: 0, status: 'waiting' } },
            settings: { wordLength: 5, language: 'en', customQueue: [] },
            wordQueue: []
        };

        (firebaseDb.get as Mock).mockResolvedValue({ val: () => roomState });
        render(<RoomPage />);
        act(() => { if (onValueCallback) onValueCallback({ exists: () => true, val: () => roomState }); });

        const input = screen.getByPlaceholderText('Add word...');
        fireEvent.change(input, { target: { value: 'CUSTOM' } });
        fireEvent.click(screen.getByText('+'));

        expect(firebaseDb.update).toHaveBeenCalledWith(
            expect.stringMatching(/test-room-123$/),
            expect.objectContaining({
                wordQueue: expect.arrayContaining([expect.objectContaining({ word: 'CUSTOM' })])
            })
        );
    });

    it('host can skip word', async () => {
        const myUid = 'my-uid';
        localStorage.setItem(`friendle_uid_${mockRoomId}`, myUid);

        const roomState = {
            id: mockRoomId,
            gameState: 'playing',
            players: { [myUid]: { id: myUid, username: mockUsername, score: 0, status: 'playing' } },
            settings: { wordLength: 5, language: 'en' }
        };

        (firebaseDb.get as Mock).mockResolvedValue({ val: () => roomState });
        render(<RoomPage />);
        act(() => { if (onValueCallback) onValueCallback({ exists: () => true, val: () => roomState }); });

        fireEvent.click(screen.getByTitle(/Skip/i));

        expect(firebaseDb.update).toHaveBeenCalledWith(
            expect.stringMatching(/test-room-123$/),
            expect.objectContaining({ gameState: 'finished' })
        );
    });

    it('host can reset round', async () => {
        const myUid = 'my-uid';
        localStorage.setItem(`friendle_uid_${mockRoomId}`, myUid);

        const roomState = {
            id: mockRoomId,
            gameState: 'playing',
            players: { [myUid]: { id: myUid, username: mockUsername, score: 0, status: 'won' } },
            settings: { wordLength: 5, language: 'en' }
        };

        (firebaseDb.get as Mock).mockResolvedValue({ val: () => roomState });
        render(<RoomPage />);
        act(() => { if (onValueCallback) onValueCallback({ exists: () => true, val: () => roomState }); });

        fireEvent.click(screen.getByTitle(/Reset Round/i));

        expect(firebaseDb.update).toHaveBeenCalledWith(
            expect.stringMatching(/test-room-123$/),
            expect.objectContaining({ gameState: 'waiting' })
        );
    });

    it('host can clear scores', async () => {
        const myUid = 'my-uid';
        localStorage.setItem(`friendle_uid_${mockRoomId}`, myUid);
        vi.spyOn(window, 'confirm').mockReturnValue(true);

        const roomState = {
            id: mockRoomId,
            gameState: 'waiting',
            players: { [myUid]: { id: myUid, username: mockUsername, score: 10, status: 'waiting' } },
            settings: { wordLength: 5, language: 'en' }
        };

        (firebaseDb.get as Mock).mockResolvedValue({ val: () => roomState });
        render(<RoomPage />);
        act(() => { if (onValueCallback) onValueCallback({ exists: () => true, val: () => roomState }); });

        fireEvent.click(screen.getByTitle(/Reset/i));

        expect(window.confirm).toHaveBeenCalled();
        expect(firebaseDb.update).toHaveBeenCalledWith(
            expect.stringMatching(/players$/),
            expect.objectContaining({
                [myUid]: expect.objectContaining({ score: 0 })
            })
        );
    });

    it('toggles stats visibility and renders stats', async () => {
        const myUid = 'my-uid';
        localStorage.setItem(`friendle_uid_${mockRoomId}`, myUid);

        const stats = { 'en-5': { games: 10, wins: 5, avgGuesses: 4, avgTime: 60 } };
        const roomState = {
            id: mockRoomId,
            gameState: 'waiting',
            players: {
                [myUid]: {
                    id: myUid,
                    username: mockUsername,
                    score: 0,
                    status: 'waiting',
                    stats: JSON.stringify(stats)
                }
            },
            settings: { wordLength: 5, language: 'en' }
        };

        (firebaseDb.get as Mock).mockResolvedValue({ val: () => roomState });
        render(<RoomPage />);
        await waitFor(() => expect(firebaseDb.onValue).toHaveBeenCalled());
        act(() => { onValueCallback({ exists: () => true, val: () => roomState }); });

        const toggleBtn = screen.getByText(/Your Stats/i);
        fireEvent.click(toggleBtn);

        expect(screen.getByText('EN-5')).toBeTruthy();
        expect(screen.getByText('50%')).toBeTruthy(); // Win rate
    });

    it.skip('shows results modal when game is finished', async () => {
        const myUid = 'my-uid';
        localStorage.setItem(`friendle_uid_${mockRoomId}`, myUid);

        const roomState = {
            id: mockRoomId,
            gameState: 'finished',
            currentWord: 'FINAL',
            players: {
                [myUid]: { id: myUid, username: mockUsername, score: 1, status: 'won', guesses: JSON.stringify(['FINAL']), timeTaken: 10 }
            },
            settings: { wordLength: 5, language: 'en' }
        };

        (firebaseDb.get as Mock).mockResolvedValue({ val: () => roomState });
        render(<RoomPage />);
        await waitFor(() => expect(firebaseDb.onValue).toHaveBeenCalled());
        act(() => { onValueCallback({ exists: () => true, val: () => ({ ...roomState }) }); });

        // Modal should be visible
        await waitFor(() => expect(screen.getByText(/The Word Was/i)).toBeTruthy());
        expect(screen.getByText('FINAL')).toBeTruthy();

        // Close modal
        fireEvent.click(screen.getByText('Close'));
        await waitFor(() => expect(screen.queryByText(/The Word Was/i)).toBeNull());
    });

    it('toggles daily routine', async () => {
        const myUid = 'my-uid';
        localStorage.setItem(`friendle_uid_${mockRoomId}`, myUid);

        const roomState = {
            id: mockRoomId,
            gameState: 'waiting',
            players: { [myUid]: { id: myUid, username: mockUsername, score: 0, status: 'waiting' } },
            settings: { wordLength: 5, language: 'en', useRoutine: false }
        };

        (firebaseDb.get as Mock).mockResolvedValue({ val: () => roomState });
        render(<RoomPage />);
        await waitFor(() => expect(firebaseDb.onValue).toHaveBeenCalled());
        act(() => { onValueCallback({ exists: () => true, val: () => ({ ...roomState }) }); });

        // Toggle Routine
        fireEvent.click(screen.getByText('Disabled'));
        expect(firebaseDb.update).toHaveBeenCalledWith(
            expect.stringMatching(/settings$/),
            expect.objectContaining({ useRoutine: true })
        );
    });

    it.skip('adds to daily routine', async () => {
        const myUid = 'my-uid';
        localStorage.setItem(`friendle_uid_${mockRoomId}`, myUid);

        const roomState = {
            id: mockRoomId,
            gameState: 'waiting',
            players: { [myUid]: { id: myUid, username: mockUsername, score: 0, status: 'waiting' } },
            settings: { wordLength: 5, language: 'en', useRoutine: true, dailyRoutine: [] }
        };

        (firebaseDb.get as Mock).mockResolvedValue({ val: () => roomState });
        render(<RoomPage />);
        await waitFor(() => expect(firebaseDb.onValue).toHaveBeenCalled());
        act(() => { onValueCallback({ exists: () => true, val: () => ({ ...roomState }) }); });

        // Add to routine
        await waitFor(() => expect(screen.getByText('Add')).toBeTruthy());
        fireEvent.click(screen.getByText('Add'));
        expect(firebaseDb.update).toHaveBeenCalledWith(
            expect.stringMatching(/settings$/),
            expect.objectContaining({
                dailyRoutine: expect.arrayContaining([expect.objectContaining({ language: 'en', wordLength: 5 })])
            })
        );
    });

    it('switches tabs in mobile view', async () => {
        const roomState = {
            id: mockRoomId,
            gameState: 'playing',
            players: {
                'p1': { id: 'p1', username: 'Player1', score: 0, status: 'playing' }
            },
            settings: { wordLength: 5, language: 'en' }
        };
        (firebaseDb.get as Mock).mockResolvedValue({ val: () => roomState });
        render(<RoomPage />);
        await waitFor(() => expect(firebaseDb.onValue).toHaveBeenCalled());
        act(() => { onValueCallback({ exists: () => true, val: () => roomState }); });

        fireEvent.click(screen.getByText('Players'));
        fireEvent.click(screen.getByText('Game'));
    });
});
