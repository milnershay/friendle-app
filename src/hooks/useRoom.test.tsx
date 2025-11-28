import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import { useRoom } from './useRoom';
import * as firebaseDatabase from 'firebase/database';
import { useConnectionStatus } from './useConnectionStatus';
import { useAuth } from './useAuth';
import { useUserStats } from './useUserStats';

// Mock dependencies
vi.mock('@/lib/firebase', () => ({
  db: {},
}));

vi.mock('./useConnectionStatus', () => ({
  useConnectionStatus: vi.fn(),
}));

vi.mock('./useAuth', () => ({
  useAuth: vi.fn(),
}));

vi.mock('./useUserStats', () => ({
  useUserStats: vi.fn(),
}));

vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
    dismiss: vi.fn(),
  },
}));

vi.mock('@/lib/wordLists', () => ({
  WORD_LISTS: {
    en: { 5: ['HELLO'] },
    he: { 5: ['SHALOM'] }
  }
}));

vi.mock('firebase/database', () => {
    return {
        ref: vi.fn(),
        onValue: vi.fn(),
        set: vi.fn(),
        update: vi.fn(),
        get: vi.fn(),
        remove: vi.fn(),
        runTransaction: vi.fn(),
        onDisconnect: vi.fn(() => ({
            update: vi.fn(),
        })),
    }
});

describe('useRoom', () => {
  const mockRoomId = 'test-room-123';
  const mockUsername = 'TestUser';
  const mockUserId = 'user-123';
  const mockUpdateUserStats = vi.fn();

  // Helper to simulate Firebase data updates
  let roomUpdateCallback: (snapshot: any) => void;
  let connectionUpdateCallback: (snapshot: any) => void;

  beforeEach(() => {
    vi.clearAllMocks();

    // Default Hook Mocks
    (useConnectionStatus as Mock).mockReturnValue({ isOnline: true, isConnectedToFirebase: true });
    (useAuth as Mock).mockReturnValue({ user: { uid: mockUserId }, loading: false });
    (useUserStats as Mock).mockReturnValue({ updateUserStats: mockUpdateUserStats });

    // Firebase Mocks
    (firebaseDatabase.ref as Mock).mockImplementation((db, path) => ({
        toString: () => path,
        key: path ? path.split('/').pop() : 'root'
    }));

    (firebaseDatabase.onValue as Mock).mockImplementation((query, callback) => {
        const path = query.toString();
        if (path === `rooms/${mockRoomId}`) {
            roomUpdateCallback = callback;
        } else if (path === '.info/connected') {
            connectionUpdateCallback = callback;
        }
        return vi.fn(); // unsubscribe
    });

    (firebaseDatabase.get as Mock).mockResolvedValue({
        exists: () => false,
        val: () => null,
    });
  });

  it('should initialize and subscribe to room updates', async () => {
    const { result } = renderHook(() => useRoom(mockRoomId, mockUsername));

    // Initially loading
    expect(result.current.loading).toBe(true);

    // Simulate connection
    act(() => {
        if (connectionUpdateCallback) connectionUpdateCallback({ val: () => true });
    });

    // Simulate room data update (room exists)
    const mockRoomData = {
        id: mockRoomId,
        gameState: 'waiting',
        players: {
            [mockUserId]: { username: mockUsername, id: mockUserId, status: 'waiting' }
        },
        settings: { wordLength: 5 }
    };

    act(() => {
        if (roomUpdateCallback) {
            roomUpdateCallback({
                exists: () => true,
                val: () => mockRoomData
            });
        }
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.room).toEqual(mockRoomData);
  });

  it('should create a new room if it does not exist', async () => {
    // Setup get to return null (room doesn't exist)
    (firebaseDatabase.get as Mock).mockResolvedValue({
        val: () => null
    });

    const { result } = renderHook(() => useRoom(mockRoomId, mockUsername));

    act(() => {
        if (roomUpdateCallback) {
            roomUpdateCallback({
                exists: () => false,
                val: () => null
            });
        }
    });

    await waitFor(() => {
        expect(firebaseDatabase.set).toHaveBeenCalledWith(
            expect.objectContaining({ toString: expect.any(Function) }),
            expect.objectContaining({
                id: mockRoomId,
                gameState: 'waiting'
            })
        );
    });
  });

  it('should auto-join if user is not in players list', async () => {
    const otherUserId = 'other-user';
    const mockRoomData = {
        id: mockRoomId,
        gameState: 'waiting',
        players: {
            [otherUserId]: { username: 'Other', id: otherUserId }
        }
    };

    // Mock runTransaction for join
    (firebaseDatabase.runTransaction as Mock).mockImplementation(async (ref, transactionUpdate) => {
        const currentData = { ...mockRoomData, playerCount: 1 };
        const newData = transactionUpdate(currentData);
        return {
            committed: true,
            snapshot: { child: (key: string) => ({ val: () => newData[key] }) }
        };
    });

    const { result } = renderHook(() => useRoom(mockRoomId, mockUsername));

    act(() => {
        if (roomUpdateCallback) {
            roomUpdateCallback({
                exists: () => true,
                val: () => mockRoomData
            });
        }
    });

    await waitFor(() => {
        expect(firebaseDatabase.runTransaction).toHaveBeenCalled();
    });
  });

  it('should start a game', async () => {
    const mockRoomData = {
        id: mockRoomId,
        gameState: 'waiting',
        players: {
            [mockUserId]: { username: mockUsername, id: mockUserId, status: 'waiting' }
        },
        settings: { wordLength: 5, language: 'en' },
        wordQueue: []
    };

    // Mock runTransaction to simulate game start update
    (firebaseDatabase.runTransaction as Mock).mockImplementation(async (ref, transactionUpdate) => {
        const newData = transactionUpdate(mockRoomData);
        expect(newData.gameState).toBe('playing');
        expect(newData.currentWord).toBe('HELLO'); // From mocked WORD_LISTS
        return { committed: true, snapshot: {} };
    });

    const { result } = renderHook(() => useRoom(mockRoomId, mockUsername));

    // Set initial state
    act(() => {
        if (roomUpdateCallback) roomUpdateCallback({ exists: () => true, val: () => mockRoomData });
    });

    await act(async () => {
        await result.current.startGame();
    });

    expect(firebaseDatabase.runTransaction).toHaveBeenCalled();
    // Also checks public room removal
    expect(firebaseDatabase.remove).toHaveBeenCalledWith(
        expect.objectContaining({ toString: expect.any(Function) })
    );
  });

  it('should submit a correct guess and win', async () => {
    const mockRoomData = {
        id: mockRoomId,
        gameState: 'playing',
        currentWord: 'HELLO',
        startTime: 1000,
        settings: { wordLength: 5 },
        players: {
            [mockUserId]: {
                username: mockUsername,
                id: mockUserId,
                status: 'playing',
                guesses: JSON.stringify([]),
                score: 0,
                startTime: 1000
            }
        }
    };

    const { result } = renderHook(() => useRoom(mockRoomId, mockUsername));

    act(() => {
        if (roomUpdateCallback) roomUpdateCallback({ exists: () => true, val: () => mockRoomData });
    });

    // Mock Date.now
    const now = 2000;
    vi.spyOn(Date, 'now').mockReturnValue(now);

    await act(async () => {
        await result.current.submitGuess('HELLO');
    });

    expect(firebaseDatabase.update).toHaveBeenCalledWith(
        expect.objectContaining({ toString: expect.any(Function) }),
        expect.objectContaining({
            status: 'won',
            finalScore: expect.any(Number),
            guesses: JSON.stringify(['HELLO'])
        })
    );

    // Check user stats update
    expect(mockUpdateUserStats).toHaveBeenCalledWith(expect.objectContaining({
        won: true,
        wordLength: 5
    }));

    vi.restoreAllMocks();
  });

  it('should submit an incorrect guess', async () => {
    const mockRoomData = {
        id: mockRoomId,
        gameState: 'playing',
        currentWord: 'HELLO',
        settings: { wordLength: 5, maxGuesses: 6 },
        players: {
            [mockUserId]: {
                username: mockUsername,
                id: mockUserId,
                status: 'playing',
                guesses: JSON.stringify([]),
                score: 0
            }
        }
    };

    const { result } = renderHook(() => useRoom(mockRoomId, mockUsername));
    act(() => {
        if (roomUpdateCallback) roomUpdateCallback({ exists: () => true, val: () => mockRoomData });
    });

    await act(async () => {
        await result.current.submitGuess('WORLD');
    });

    expect(firebaseDatabase.update).toHaveBeenCalledWith(
        expect.objectContaining({ toString: expect.any(Function) }),
        expect.objectContaining({
            status: 'playing',
            guesses: JSON.stringify(['WORLD'])
        })
    );

    // Stats should NOT be updated yet
    expect(mockUpdateUserStats).not.toHaveBeenCalled();
  });

  it('should handle leaving a room', async () => {
     const mockRoomData = {
        id: mockRoomId,
        players: {
            [mockUserId]: { username: mockUsername, id: mockUserId }
        },
        settings: { isPublic: true }
    };

    // Mock runTransaction for leave
    (firebaseDatabase.runTransaction as Mock).mockImplementation(async (ref, transactionUpdate) => {
        const newData = transactionUpdate(mockRoomData); // Logic removes player
        return {
            committed: true,
            snapshot: { child: (key: string) => ({ val: () => 0 }) } // 0 players left
        };
    });

    const { result } = renderHook(() => useRoom(mockRoomId, mockUsername));

    // Set initial state
    act(() => {
        if (roomUpdateCallback) roomUpdateCallback({ exists: () => true, val: () => mockRoomData });
    });

    await act(async () => {
        await result.current.leaveRoom();
    });

    expect(firebaseDatabase.runTransaction).toHaveBeenCalled();
    // Should remove room if 0 players
    expect(firebaseDatabase.remove).toHaveBeenCalled();
  });

  it('should prevent actions when offline', async () => {
      (useConnectionStatus as Mock).mockReturnValue({ isOnline: false, isConnectedToFirebase: false });

      const { result } = renderHook(() => useRoom(mockRoomId, mockUsername));

      // Try to start game
      await act(async () => {
          await result.current.startGame();
      });

      // Should not call firebase
      expect(firebaseDatabase.runTransaction).not.toHaveBeenCalled();
  });
});
