"use client";

import { useState, useEffect, useCallback } from "react";
import toast from "react-hot-toast";
import { db } from "@/lib/firebase";
import { ref, set, get, update, runTransaction } from "firebase/database";
import { useAuth } from "./useAuth";
import type { GameHistory } from "./useRoom";

// --- Types ---

export interface UserStats {
    totalGames: number;
    totalWins: number;
    totalLosses: number;
    avgGuesses: number;
    avgTime: number;
    bestTime: number | null;
    currentStreak: number;
    maxStreak: number;
}

export interface RoomHistoryEntry {
    roomId: string;
    roomName?: string;
    lastJoined: number;
    playerCount?: number;
}

export interface UserProfile {
    uid: string;
    username: string;
    createdAt: number; // Storing as a simple timestamp
    stats: UserStats;
    gameHistory: GameHistory[]; // last 50
    achievements: string[];
    roomHistory?: RoomHistoryEntry[]; // last 10 rooms
    activeRoom?: string; // Current room the user is in (ensures single-room constraint)
}

export interface UseUserStatsReturn {
    profile: UserProfile | null;
    loading: boolean;
    error: string | null;
    updateUserStats: (gameResult: GameHistory) => Promise<void>;
    updateUsername: (newUsername: string) => Promise<void>;
    addRoomToHistory: (roomEntry: RoomHistoryEntry) => Promise<void>;
}

/**
 * A hook to manage a user's profile and statistics in Firebase.
 * It handles creating, fetching, and updating the user's data.
 *
 * @returns {UseUserStatsReturn} An object with the user's profile, loading/error states, and update functions.
 */
export const useUserStats = (): UseUserStatsReturn => {
    const { user: authUser } = useAuth();
    const uid = authUser?.uid;

    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [pendingStats, setPendingStats] = useState<GameHistory[]>([]);

    const processStatsUpdate = useCallback(async (gameResult: GameHistory) => {
        if (!uid) return;

        console.log("Processing stats for user:", uid, "Game result:", gameResult);
        const userRef = ref(db, `users/${uid}`);

        try {
            const { committed, snapshot } = await runTransaction(userRef, (currentProfile: UserProfile | null) => {
                if (currentProfile === null) {
                    return;
                }

                const newStats = { ...currentProfile.stats };
                const newHistory = [gameResult, ...currentProfile.gameHistory];

                newStats.totalGames += 1;
                newStats.totalWins += gameResult.won ? 1 : 0;
                newStats.totalLosses += gameResult.won ? 0 : 1;

                const totalGames = newStats.totalGames;
                newStats.avgGuesses = ((newStats.avgGuesses * (totalGames - 1)) + gameResult.guessCount) / totalGames;
                newStats.avgTime = ((newStats.avgTime * (totalGames - 1)) + gameResult.timeTaken) / totalGames;

                if (gameResult.won && (newStats.bestTime === null || gameResult.timeTaken < newStats.bestTime)) {
                    newStats.bestTime = gameResult.timeTaken;
                }

                if (gameResult.won) {
                    newStats.currentStreak += 1;
                    newStats.maxStreak = Math.max(newStats.maxStreak, newStats.currentStreak);
                } else {
                    newStats.currentStreak = 0;
                }

                if (newHistory.length > 50) {
                    newHistory.pop();
                }

                const currentAchievements = new Set(currentProfile.achievements);
                const checkAndAdd = (id: string) => !currentAchievements.has(id) && currentAchievements.add(id);

                if (gameResult.won) checkAndAdd('first_win');
                if (newStats.currentStreak >= 5) checkAndAdd('5_win_streak');
                if (newStats.totalGames >= 10) checkAndAdd('10_games_played');
                if (gameResult.won && gameResult.guessCount === 1) checkAndAdd('perfect_game');
                if (gameResult.won && gameResult.timeTaken < 30) checkAndAdd('speed_demon');

                const newAchievementsArray = Array.from(currentAchievements);

                return {
                    ...currentProfile,
                    stats: newStats,
                    gameHistory: newHistory,
                    achievements: newAchievementsArray,
                };
            });

            if (committed) {
                const newProfile = snapshot.val();
                const oldAchievements = profile?.achievements ?? [];
                const unlockedAchievements = newProfile.achievements.filter((ach: string) => !oldAchievements.includes(ach));

                setProfile(newProfile);
                toast.dismiss("stats-saving");
                toast.success("Game stats saved!");

                unlockedAchievements.forEach((ach: string) => {
                    toast.success(`Achievement Unlocked: ${ach.replace(/_/g, ' ')}!`);
                });
            }
        } catch (err) {
            console.error("Error updating stats:", err);
            toast.error("Failed to save stats. Retrying in 3 seconds...");
            setTimeout(() => {
                setPendingStats(prev => [gameResult, ...prev]);
            }, 3000);
        }
    }, [uid, profile]);

    useEffect(() => {
        if (profile && pendingStats.length > 0) {
            const statsToProcess = pendingStats[0];
            setPendingStats(prev => prev.slice(1));
            processStatsUpdate(statsToProcess);
        }
    }, [profile, pendingStats, processStatsUpdate]);

    useEffect(() => {
        if (!uid) {
            setLoading(false);
            setProfile(null);
            return;
        }

        if (!db) {
            console.error('Firebase database not initialized. Cannot load user profile.');
            setError('Firebase not configured. Please contact support.');
            setLoading(false);
            return;
        }

        const userRef = ref(db, `users/${uid}`);

        const fetchOrCreateProfile = async () => {
            setLoading(true);
            try {
                const snapshot = await get(userRef);

                if (snapshot.exists()) {
                    setProfile(snapshot.val());
                } else {
                    // Try to migrate from localStorage for a smoother transition
                    const legacyUsername = localStorage.getItem('friendle_username');

                    const newProfile: UserProfile = {
                        uid,
                        username: legacyUsername || `Player-${uid.substring(0, 5)}`,
                        createdAt: Date.now(),
                        stats: {
                            totalGames: 0,
                            totalWins: 0,
                            totalLosses: 0,
                            avgGuesses: 0,
                            avgTime: 0,
                            bestTime: null,
                            currentStreak: 0,
                            maxStreak: 0,
                        },
                        gameHistory: [],
                        achievements: [],
                    };
                    // Use `set` which is idempotent for creation
                    await set(userRef, newProfile);
                    setProfile(newProfile);
                }
            } catch (err) {
                console.error("Error fetching/creating user profile:", err);
                setError("Failed to load user profile.");
                toast.error("Failed to load your profile.");
            } finally {
                setLoading(false);
            }
        };

        fetchOrCreateProfile();
    }, [uid]);

    const updateUserStats = useCallback(async (gameResult: GameHistory) => {
        if (!uid) {
            console.warn("updateUserStats called without a user ID.");
            return;
        }

        if (profile) {
            await processStatsUpdate(gameResult);
        } else {
            console.log("Profile not loaded. Queuing stats update.");
            toast.loading("Saving stats...", { id: "stats-saving" });
            setPendingStats(prev => [...prev, gameResult]);
        }
    }, [uid, profile, processStatsUpdate]);

    // Function to update the username
    const updateUsername = useCallback(async (newUsername: string) => {
        if (!uid || !profile) return;
        if (newUsername.trim().length < 3 || newUsername.length > 15) {
            toast.error("Username must be between 3 and 15 characters.");
            return;
        }

        if (!db) {
            console.error('Firebase database not initialized. Cannot update username.');
            toast.error('Unable to update username. Please try again later.');
            return;
        }

        const userRef = ref(db, `users/${uid}`);
        try {
            await update(userRef, { username: newUsername.trim() });
            setProfile(prev => prev ? { ...prev, username: newUsername.trim() } : null);
            toast.success("Username updated!");
        } catch (err) {
            console.error("Error updating username:", err);
            toast.error("Failed to update username.");
        }
    }, [uid, profile]);

    // Function to add a room to history
    const addRoomToHistory = useCallback(async (roomEntry: RoomHistoryEntry) => {
        if (!uid || !profile) return;

        if (!db) {
            console.error('Firebase database not initialized. Cannot update room history.');
            return;
        }

        const userRef = ref(db, `users/${uid}`);
        try {
            const currentHistory = profile.roomHistory || [];

            // Remove existing entry for this room if it exists
            const filteredHistory = currentHistory.filter(entry => entry.roomId !== roomEntry.roomId);

            // Add new entry at the beginning
            const updatedHistory = [roomEntry, ...filteredHistory];

            // Keep only last 10 rooms
            const trimmedHistory = updatedHistory.slice(0, 10);

            await update(userRef, { roomHistory: trimmedHistory });
            setProfile(prev => prev ? { ...prev, roomHistory: trimmedHistory } : null);
        } catch (err) {
            console.error("Error updating room history:", err);
            // Silent fail - don't show error to user for this non-critical feature
        }
    }, [uid, profile]);

    return { profile, loading, error, updateUserStats, updateUsername, addRoomToHistory };
};
