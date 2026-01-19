import { useState, useEffect, useCallback, useRef } from "react";
import toast from "react-hot-toast";
import { db } from "@/lib/firebase";
import { useAuth } from "./useAuth";
import { useUserStats } from "./useUserStats";
import { ref, onValue, set, update, get, remove, runTransaction } from "firebase/database";
import { WORD_LISTS } from "@/lib/wordLists";

// --- Types ---

export interface GameHistory {
    date: number;
    language: 'en' | 'he';
    wordLength: number;
    guessCount: number;
    timeTaken: number;
    won: boolean;
}

export interface Player {
    id: string;
    username: string;
    score: number;
    status: 'waiting' | 'playing' | 'won' | 'lost';
    guesses?: string;
    timeTaken?: number;
    startTime?: number;
    endTime?: number;
    finalScore?: number;
}

export interface RoomSettings {
    wordLength: number;
    language: 'en' | 'he';
    maxGuesses?: number;
}

export interface RoomData {
    id: string;
    players: Record<string, Player>;
    gameState: 'waiting' | 'playing' | 'finished';
    currentWord: string | null;
    startTime: number;
    settings: RoomSettings;
}

// --- Helpers ---

export const parseGuesses = (guesses?: string): string[] => {
    if (!guesses) return [];
    try { return JSON.parse(guesses); } catch { return []; }
};

// --- Hook ---

export function useRoom(roomId: string, username: string | null, preferredLanguage: 'en' | 'he' | null = null) {
    const { user: authUser, loading: authLoading } = useAuth();
    const { updateUserStats } = useUserStats();
    const userId = authUser?.uid;

    const [room, setRoom] = useState<RoomData | null>(null);
    const [error, setError] = useState("");
    const [roomLoading, setRoomLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const prevPlayersRef = useRef<Record<string, Player> | null>(null);
    const isSubmittingRef = useRef(false);

    // Join existing room (only if we have a username - new players)
    const joinRoom = useCallback(async () => {
        if (!userId || !username) return;
        try {
            const roomRef = ref(db, `rooms/${roomId}`);
            await runTransaction(roomRef, (currentRoom) => {
                if (!currentRoom) return;
                if (!currentRoom.players) currentRoom.players = {};
                // Only add if not already in room
                if (!currentRoom.players[userId]) {
                    currentRoom.players[userId] = {
                        id: userId,
                        username,
                        score: 0,
                        status: 'waiting',
                        guesses: JSON.stringify([])
                    };
                }
                return currentRoom;
            });
        } catch (err) {
            console.error("Failed to join room:", err);
            setError("Failed to join room");
        }
    }, [roomId, userId, username]);

    // Subscribe to room updates
    useEffect(() => {
        // Allow subscription if we have userId - returning players don't need username
        if (!userId) return;

        const roomRef = ref(db, `rooms/${roomId}`);

        const unsubscribe = onValue(roomRef, (snapshot) => {
            setRoomLoading(false);
            if (snapshot.exists()) {
                const data = snapshot.val() as RoomData;

                // Player join/leave notifications
                if (prevPlayersRef.current && userId) {
                    const prevPlayers = prevPlayersRef.current;
                    const currentPlayers = data.players || {};
                    const prevPlayerIds = Object.keys(prevPlayers);
                    const currentPlayerIds = Object.keys(currentPlayers);

                    currentPlayerIds.forEach(id => {
                        if (!prevPlayerIds.includes(id) && id !== userId) {
                            toast(`${currentPlayers[id].username} joined`);
                        }
                    });

                    prevPlayerIds.forEach(id => {
                        if (!currentPlayerIds.includes(id) && id !== userId) {
                            toast(`${prevPlayers[id].username} left`);
                        }
                    });
                }

                setRoom(data);
                prevPlayersRef.current = data.players || null;

                // Auto-join if not in players list AND we have a username
                if ((!data.players || !data.players[userId]) && username) {
                    joinRoom();
                }
            } else {
                // Room doesn't exist, create it (only if we have a username)
                if (username) {
                    initializeRoom();
                }
            }
        }, (err) => {
            console.error("Firebase error:", err);
            setError(err.message);
            setRoomLoading(false);
        });

        return () => unsubscribe();
    }, [roomId, userId, username, joinRoom]);

    // Create new room
    const initializeRoom = useCallback(async () => {
        if (!userId || !username) return;
        const roomRef = ref(db, `rooms/${roomId}`);

        try {
            const snapshot = await get(roomRef);
            if (!snapshot.exists()) {
                const roomLanguage = preferredLanguage || 'en';
                const initialRoom: RoomData = {
                    id: roomId,
                    players: {
                        [userId]: {
                            id: userId,
                            username,
                            score: 0,
                            status: 'waiting',
                            guesses: JSON.stringify([])
                        }
                    },
                    gameState: 'waiting',
                    currentWord: "",
                    startTime: 0,
                    settings: { wordLength: 5, language: roomLanguage },
                };
                await set(roomRef, initialRoom);
            } else if (!snapshot.val().players?.[userId]) {
                joinRoom();
            }
        } catch (err) {
            console.error("Error initializing room:", err);
            setError("Failed to create room");
        }
    }, [roomId, userId, username, joinRoom, preferredLanguage]);

    // Start game
    const startGame = useCallback(async () => {
        if (!room) return;
        setActionLoading('start');

        try {
            const roomRef = ref(db, `rooms/${roomId}`);
            await runTransaction(roomRef, (currentRoom: RoomData | null) => {
                if (!currentRoom) return;

                const lang = currentRoom.settings.language || 'en';
                const length = currentRoom.settings.wordLength || 5;

                // @ts-expect-error Dynamic access
                const words = WORD_LISTS[lang]?.[length] || WORD_LISTS.en[5];
                const randomWord = words[Math.floor(Math.random() * words.length)];

                // Reset all players
                const updatedPlayers = { ...(currentRoom.players || {}) };
                Object.keys(updatedPlayers).forEach(key => {
                    updatedPlayers[key] = {
                        ...updatedPlayers[key],
                        status: 'playing',
                        guesses: JSON.stringify([]),
                    };
                    delete updatedPlayers[key].endTime;
                    delete updatedPlayers[key].timeTaken;
                    delete updatedPlayers[key].startTime;
                    delete updatedPlayers[key].finalScore;
                });

                return {
                    ...currentRoom,
                    currentWord: randomWord.toUpperCase(),
                    gameState: 'playing',
                    startTime: Date.now(),
                    players: updatedPlayers,
                };
            });
            toast.success("Game started!");
        } catch (err) {
            console.error("Failed to start game:", err);
            setError("Failed to start game");
        } finally {
            setActionLoading(null);
        }
    }, [room, roomId]);

    // Check if all players finished
    const checkGameOver = useCallback(async () => {
        const snapshot = await get(ref(db, `rooms/${roomId}`));
        const freshRoom = snapshot.val() as RoomData;
        if (!freshRoom || freshRoom.gameState !== 'playing') return;

        const players = Object.values(freshRoom.players || {});
        const allFinished = players.every(p => p.status === 'won' || p.status === 'lost');

        if (allFinished) {
            await update(ref(db, `rooms/${roomId}`), { gameState: 'finished' });
        }
    }, [roomId]);

    // Submit a guess
    const submitGuess = useCallback(async (guess: string) => {
        if (isSubmittingRef.current) return;
        if (!room || room.gameState !== 'playing' || !userId) return;

        const player = room.players[userId];
        if (!player || player.status !== 'playing') return;
        if (guess.length !== room.settings.wordLength) return;

        isSubmittingRef.current = true;
        try {
            const currentGuesses = parseGuesses(player.guesses);
            const newGuesses = [...currentGuesses, guess];
            let newScore = player.score;

            const updateData: Record<string, unknown> = {
                guesses: JSON.stringify(newGuesses),
            };

            // Track start time on first guess
            let playerStartTime = player.startTime;
            if (newGuesses.length === 1 && !playerStartTime) {
                playerStartTime = Date.now();
                updateData.startTime = playerStartTime;
            }

            let gameCompleted = false;
            let won = false;
            let finalTime = 0;

            if (guess === room.currentWord) {
                // Won!
                const endTime = Date.now();
                const timeTaken = (endTime - (playerStartTime || room.startTime)) / 1000;
                const calculatedScore = Math.max(0, 1000 - (newGuesses.length * 100) - Math.floor(timeTaken / 2));

                newScore += calculatedScore;
                updateData.status = 'won';
                updateData.score = newScore;
                updateData.endTime = endTime;
                updateData.timeTaken = timeTaken;
                updateData.finalScore = calculatedScore;
                gameCompleted = true;
                won = true;
                finalTime = timeTaken;
            } else if (newGuesses.length >= (room.settings.maxGuesses || 6)) {
                // Lost
                const endTime = Date.now();
                const timeTaken = (endTime - (playerStartTime || room.startTime)) / 1000;

                updateData.status = 'lost';
                updateData.endTime = endTime;
                updateData.timeTaken = timeTaken;
                updateData.finalScore = 0;
                gameCompleted = true;
                won = false;
                finalTime = timeTaken;
            }

            // Update stats if game completed
            if (gameCompleted) {
                const gameRecord: GameHistory = {
                    date: Date.now(),
                    language: room.settings.language || 'en',
                    wordLength: room.settings.wordLength || 5,
                    guessCount: newGuesses.length,
                    timeTaken: finalTime,
                    won
                };
                updateUserStats(gameRecord);
            }

            await update(ref(db, `rooms/${roomId}/players/${userId}`), updateData);

            if (gameCompleted) {
                checkGameOver();
            }
        } finally {
            isSubmittingRef.current = false;
        }
    }, [room, roomId, userId, checkGameOver, updateUserStats]);

    // Update room settings
    const updateSettings = useCallback(async (newSettings: Partial<RoomSettings>) => {
        try {
            await update(ref(db, `rooms/${roomId}/settings`), newSettings);
        } catch (err) {
            console.error("Failed to update settings:", err);
            toast.error("Failed to update settings");
        }
    }, [roomId]);

    // Reset to waiting state
    const resetRound = useCallback(async () => {
        if (!room) return;
        setActionLoading('reset');

        try {
            const updatedPlayers = { ...room.players };
            Object.keys(updatedPlayers).forEach(key => {
                updatedPlayers[key] = {
                    ...updatedPlayers[key],
                    status: 'waiting',
                    guesses: JSON.stringify([]),
                };
                delete updatedPlayers[key].endTime;
                delete updatedPlayers[key].timeTaken;
                delete updatedPlayers[key].startTime;
                delete updatedPlayers[key].finalScore;
            });

            await update(ref(db, `rooms/${roomId}`), {
                gameState: 'waiting',
                currentWord: "",
                players: updatedPlayers
            });
        } catch (err) {
            console.error("Failed to reset round:", err);
            setError("Failed to reset round");
        } finally {
            setActionLoading(null);
        }
    }, [room, roomId]);

    // Skip current word
    const skipWord = useCallback(async () => {
        try {
            await update(ref(db, `rooms/${roomId}`), { gameState: 'finished' });
        } catch (err) {
            console.error("Failed to skip word:", err);
        }
    }, [roomId]);

    // Clear all scores
    const clearScores = useCallback(async () => {
        if (!room) return;
        try {
            const updatedPlayers = { ...room.players };
            Object.keys(updatedPlayers).forEach(key => {
                updatedPlayers[key].score = 0;
            });
            await update(ref(db, `rooms/${roomId}/players`), updatedPlayers);
        } catch (err) {
            console.error("Failed to clear scores:", err);
        }
    }, [room, roomId]);

    // Leave room
    const leaveRoom = useCallback(async () => {
        if (!userId) return;
        try {
            const roomRef = ref(db, `rooms/${roomId}`);
            const { committed, snapshot } = await runTransaction(roomRef, (currentRoom) => {
                if (!currentRoom) return;
                if (currentRoom.players?.[userId]) {
                    delete currentRoom.players[userId];
                }
                return currentRoom;
            });

            if (committed) {
                const remainingPlayers = Object.keys(snapshot.val()?.players || {}).length;
                if (remainingPlayers === 0) {
                    await remove(roomRef);
                }
            }
        } catch (err) {
            console.error("Failed to leave room:", err);
            toast.error("Failed to leave room");
        }
    }, [userId, roomId]);

    return {
        room,
        userId,
        loading: authLoading || roomLoading,
        error,
        actionLoading,
        startGame,
        submitGuess,
        updateSettings,
        resetRound,
        skipWord,
        clearScores,
        leaveRoom
    };
}
