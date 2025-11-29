import { renderHook, act, waitFor } from '@testing-library/react';
import { useUserStats } from './useUserStats';
import { useAuth } from './useAuth';
import { runTransaction, ref, get } from 'firebase/database';
import toast from 'react-hot-toast';
import { db } from '@/lib/firebase';

vi.mock('./useAuth');
vi.mock('firebase/database');
vi.mock('react-hot-toast');
vi.mock('@/lib/firebase', () => ({
    db: {}, // Mock db object
}));


const mockUseAuth = useAuth as vi.Mock;
const mockRunTransaction = runTransaction as vi.Mock;
const mockRef = ref as vi.Mock;
const mockGet = get as vi.Mock;


describe('useUserStats', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockUseAuth.mockReturnValue({ user: { uid: 'test-uid' } });
        mockRef.mockReturnValue({});
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('should queue stats updates when profile is not loaded and process them when it is', async () => {
        const gameResult1 = { date: Date.now(), won: true, guessCount: 3, timeTaken: 10 };
        const mockProfile = {
            uid: 'test-uid',
            username: 'test-user',
            stats: { totalGames: 0, totalWins: 0, totalLosses: 0, avgGuesses: 0, avgTime: 0, bestTime: null, currentStreak: 0, maxStreak: 0 },
            achievements: [],
            gameHistory: [],
        };
        const updatedProfileAfterTransaction = {
            ...mockProfile,
            stats: {
                totalGames: 1,
                totalWins: 1,
                totalLosses: 0,
                avgGuesses: 3,
                avgTime: 10,
                bestTime: 10,
                currentStreak: 1,
                maxStreak: 1,
            },
            gameHistory: [gameResult1],
            achievements: [ 'first_win', 'speed_demon' ]
        };


        // 1. Setup mocks
        let resolveGetPromise: (value: unknown) => void;
        const getPromise = new Promise(resolve => {
            resolveGetPromise = resolve;
        });
        mockGet.mockReturnValue(getPromise);
        mockRunTransaction.mockImplementation((ref, transactionUpdate) => {
            const result = transactionUpdate(mockProfile);
            return Promise.resolve({ committed: true, snapshot: { val: () => result } });
        });

        const { result } = renderHook(() => useUserStats());

        // 2. Initial state should be loading
        expect(result.current.loading).toBe(true);

        // 3. Call update while profile is loading
        await act(async () => {
            result.current.updateUserStats(gameResult1 as any);
        });

        // 4. Assert that queueing mechanism was triggered
        expect(toast.loading).toHaveBeenCalledWith('Saving stats...', { id: 'stats-saving' });
        expect(mockRunTransaction).not.toHaveBeenCalled(); // Should not run yet

        // 5. Simulate profile loading completion

        await act(async () => {
            resolveGetPromise({ exists: () => true, val: () => mockProfile });
            await getPromise; // wait for promise to resolve
        });

        // 6. Assert that the queued stat was processed
        await waitFor(() => {
            expect(result.current.loading).toBe(false);
        });

        await waitFor(() => {
            expect(mockRunTransaction).toHaveBeenCalled();
            expect(result.current.profile).toEqual(updatedProfileAfterTransaction);
            expect(toast.dismiss).toHaveBeenCalledWith('stats-saving');
            expect(toast.success).toHaveBeenCalledWith('Game stats saved!');
        });
    });

    it('should process multiple queued updates in order', async () => {
        const gameResult1 = { date: Date.now(), won: true, guessCount: 3, timeTaken: 10 };
        const gameResult2 = { date: Date.now(), won: false, guessCount: 6, timeTaken: 20 };

        const mockProfile = {
            uid: 'test-uid',
            username: 'test-user',
            stats: { totalGames: 0, totalWins: 0, totalLosses: 0, avgGuesses: 0, avgTime: 0, bestTime: null, currentStreak: 0, maxStreak: 0 },
            achievements: [],
            gameHistory: [],
        };

        const profileAfterFirstUpdate = {
            ...mockProfile,
            stats: { ...mockProfile.stats, totalGames: 1, totalWins: 1, avgGuesses: 3, avgTime: 10, bestTime: 10, currentStreak: 1, maxStreak: 1 },
            gameHistory: [gameResult1],
            achievements: ['first_win', 'speed_demon']
        };

        let resolveGetPromise: (value: unknown) => void;
        const getPromise = new Promise(resolve => {
            resolveGetPromise = resolve;
        });
        mockGet.mockReturnValue(getPromise);

        // Mock transaction to simulate the two updates
        mockRunTransaction
            .mockImplementationOnce((ref, transactionUpdate) => {
                const result = transactionUpdate(mockProfile);
                return Promise.resolve({ committed: true, snapshot: { val: () => result } });
            })
            .mockImplementationOnce((ref, transactionUpdate) => {
                const result = transactionUpdate(profileAfterFirstUpdate);
                return Promise.resolve({ committed: true, snapshot: { val: () => result } });
            });


        const { result } = renderHook(() => useUserStats());

        // Queue two updates while loading
        await act(async () => {
            result.current.updateUserStats(gameResult1 as any);
            result.current.updateUserStats(gameResult2 as any);
        });

        // Simulate profile loading
        await act(async () => {
            resolveGetPromise({ exists: () => true, val: () => mockProfile });
            await getPromise;
        });

        // Wait for both updates to be processed
        await waitFor(() => {
            expect(mockRunTransaction).toHaveBeenCalledTimes(2);
            expect(toast.success).toHaveBeenCalledWith('Game stats saved!');
        }, { timeout: 2000 }); // Increased timeout for multiple updates
    });
});
