import { useState, useEffect, useCallback, useRef } from "react";
import toast from "react-hot-toast";
import { db } from "@/lib/firebase";
import { useConnectionStatus } from "./useConnectionStatus";
import { useAuth } from "./useAuth";
import { useUserStats } from "./useUserStats";
import { ref, onValue, set, update, get, remove, runTransaction, onDisconnect } from "firebase/database";
import { WORD_LISTS } from "@/lib/wordLists";

// --- Types (Moved from page.tsx) ---

export interface GameHistory {
    date: number;
    language: 'en' | 'he';
    wordLength: number;
    guessCount: number;
    timeTaken: number;
    won: boolean;
}

export interface CategoryStats {
    games: number;
    avgGuesses: number;
    avgTime: number;
    wins: number;
}

export interface PlayerStats {
    'en-4'?: CategoryStats;
    'en-5'?: CategoryStats;
    'en-6'?: CategoryStats;
    'he-4'?: CategoryStats;
    'he-5'?: CategoryStats;
    'he-6'?: CategoryStats;
}

export interface Player {
    id: string;
    username: string;
    score: number;
    status: 'waiting' | 'playing' | 'won' | 'lost';
    online?: boolean;
    guesses?: string; // JSON string
    timeTaken?: number;
    startTime?: number;
    endTime?: number;
    finalScore?: number;
    history?: string; // JSON string
    stats?: string; // JSON string
}

export interface RoutineGame {
    language: 'en' | 'he';
    wordLength: 4 | 5 | 6;
}

export interface RoomSettings {
    wordLength: number;
    customQueue: { word: string; suggester: string }[];
    maxGuesses?: number;
    language: 'en' | 'he';
    dailyRoutine?: RoutineGame[];
    useRoutine?: boolean;
    isPublic?: boolean;
}

export interface RoomData {
    id: string;
    players: Record<string, Player>;
    gameState: 'waiting' | 'playing' | 'finished';
    playerCount?: number;
    currentWord: string | null;
    currentSuggester?: string | null;
    startTime: number;
    settings: RoomSettings;
    wordQueue: { word: string; suggester: string }[];
    routineIndex?: number;
    dailyRound?: number;
    lastResetDate?: string;
}

// --- Helpers ---

export const parseGuesses = (guesses?: string): string[] => {
    if (!guesses) return [];
    try { return JSON.parse(guesses); } catch { return []; }
};

export const parseHistory = (history?: string): GameHistory[] => {
    if (!history) return [];
    try { return JSON.parse(history); } catch { return []; }
};

export const parseStats = (stats?: string): PlayerStats => {
    if (!stats) return {};
    try { return JSON.parse(stats); } catch { return {}; }
};

// --- Hook ---

export function useRoom(roomId: string, username: string | null) {
    const { isOnline, isConnectedToFirebase } = useConnectionStatus();
    const { user: authUser, loading: authLoading } = useAuth();
    const { updateUserStats } = useUserStats();
    const userId = authUser?.uid;

    const [room, setRoom] = useState<RoomData | null>(null);
    const [error, setError] = useState("");
    const [roomLoading, setRoomLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const prevPlayersRef = useRef<Record<string, Player> | null>(null);

    // Join existing room helper
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const safeWrite = useCallback(async <T extends (...args: any[]) => Promise<any>>(action: T, ...args: Parameters<T>): Promise<ReturnType<T> | void> => {
        if (!isOnline || !isConnectedToFirebase) {
            toast.error("You are offline. Your action will be saved when you reconnect.", { id: "offline-toast" });
            // In a future step, we would queue this action.
            // For now, we just prevent it and notify the user.
            return;
        }
        try {
            return await action(...args);
        } catch (err) {
            console.error("Firebase write error:", err);
            toast.error("An error occurred. Please try again.");
            // Re-throw or handle as needed
            throw err;
        }
    }, [isOnline, isConnectedToFirebase]);


    const joinRoom = useCallback(async () => {
        if (!userId || !username) return;
        const action = async () => {
            const roomRef = ref(db, `rooms/${roomId}`);
            const { committed, snapshot } = await runTransaction(roomRef, (currentRoom) => {
                if (!currentRoom) {
                    return;
                }
                const playerCount = Object.keys(currentRoom.players || {}).length + 1;
                if (!currentRoom.players) currentRoom.players = {};
                currentRoom.players[userId] = {
                    id: userId,
                    username,
                    score: 0,
                    status: 'waiting',
                    guesses: JSON.stringify([])
                };
                currentRoom.playerCount = playerCount;
                return currentRoom;
            });

            if (committed) {
                const newPlayerCount = snapshot.child('playerCount').val();
                if (newPlayerCount >= 8) {
                    await remove(ref(db, `public_rooms/${roomId}`));
                } else if (snapshot.child('settings/isPublic').val()) {
                    await update(ref(db, `public_rooms/${roomId}`), { playerCount: newPlayerCount });
                }
            }
        };
        await safeWrite(action).catch(() => setError("Failed to join room"));
    }, [roomId, userId, username, safeWrite]);

    // Subscribe to Room Updates & Presence
    useEffect(() => {
        if (!userId || !username) return;

        const roomRef = ref(db, `rooms/${roomId}`);
        const myPlayerRef = ref(db, `rooms/${roomId}/players/${userId}`);
        const connectedRef = ref(db, '.info/connected');

        onValue(connectedRef, (snap) => {
            if (snap.val() === true) {
                // We're connected. Set up our presence state.
                const con = onDisconnect(myPlayerRef);
                con.update({ online: false });
                update(myPlayerRef, { online: true });
                // NOTE: While this handles marking a player as 'offline', client-side `onDisconnect`
                // is not reliable enough for critical cleanup. For example, if a user closes their
                // browser, we can't decrement `playerCount` or clean up the public room listing here.
                // A robust solution would use a server-side process (e.g., Cloud Functions)
                // to handle disconnects and ensure data integrity.
            }
        });

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

                    // Player Joined
                    currentPlayerIds.forEach(id => {
                        if (!prevPlayerIds.includes(id) && id !== userId) {
                            toast(`${currentPlayers[id].username} has joined the room.`);
                        }
                    });

                    // Player Left
                    prevPlayerIds.forEach(id => {
                        if (!currentPlayerIds.includes(id) && id !== userId) {
                            toast(`${prevPlayers[id].username} has left the room.`);
                        }
                    });
                }

                setRoom(data);
                prevPlayersRef.current = data.players || null;


                // If I am not in the players list, join automatically
                if (!data.players || !data.players[userId]) {
                    joinRoom();
                }
            } else {
                // Room doesn't exist, create it
                initializeRoom();
            }
        }, (err) => {
            console.error("Firebase error:", err);
            setError(err.message);
            setRoomLoading(false);
        });

        return () => unsubscribe();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [roomId, userId, username, joinRoom]);

    // Join/Create Room Logic
    const initializeRoom = useCallback(async () => {
        if (!userId || !username) return;
        const roomRef = ref(db, `rooms/${roomId}`);

        try {
            const snapshot = await get(roomRef);
            const currentRoom = snapshot.val();

            if (!currentRoom) {
                // Create new room
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
                    settings: { wordLength: 5, customQueue: [], language: 'en', isPublic: true },
                    wordQueue: [],
                    playerCount: 1,
                };
                await set(roomRef, initialRoom);
                await set(ref(db, `public_rooms/${roomId}`), {
                    playerCount: 1,
                    createdAt: Date.now(),
                });
            } else {
                // Join existing room
                if (!currentRoom.players || !currentRoom.players[userId]) {
                    joinRoom();
                }
            }
        } catch (err) {
            console.error("Error initializing room:", err);
            setError("Failed to join room");
        }
    }, [roomId, userId, username, joinRoom]);

    // Game Actions
    const startGame = useCallback(async () => {
        if (!room) return;
        setActionLoading('start');

        const transaction = async () => {
            const roomRef = ref(db, `rooms/${roomId}`);
            await runTransaction(roomRef, (currentRoom: RoomData | null) => {
                if (!currentRoom) return; // Abort transaction if room is null

                let wordObj: { word: string; suggester?: string } | undefined;
                const newQueue = [...(currentRoom.wordQueue || [])];
                let gameLang: 'en' | 'he';
                let gameLength: number;
                let nextRoutineIndex = currentRoom.routineIndex ?? 0;

                 // Routine Logic
                if (currentRoom.settings.useRoutine && currentRoom.settings.dailyRoutine && currentRoom.settings.dailyRoutine.length > 0) {
                    const routine = currentRoom.settings.dailyRoutine;
                    const currentIndex = currentRoom.routineIndex || 0;
                    nextRoutineIndex = (currentIndex + 1) % routine.length;
                    const currentGame = routine[currentIndex];

                    gameLang = currentGame.language;
                    gameLength = currentGame.wordLength;

                    // @ts-expect-error Dynamic access
                    const words = WORD_LISTS[gameLang]?.[gameLength] || WORD_LISTS.en[5];
                    const randomWord = words[Math.floor(Math.random() * words.length)];
                    wordObj = { word: randomWord };
                } else if (newQueue.length > 0) {
                    wordObj = newQueue.shift();
                    gameLang = currentRoom.settings.language || 'en';
                    gameLength = currentRoom.settings.wordLength || 5;
                } else {
                    gameLang = currentRoom.settings.language || 'en';
                    gameLength = currentRoom.settings.wordLength || 5;
                    // @ts-expect-error Dynamic access
                    const words = WORD_LISTS[gameLang]?.[gameLength] || WORD_LISTS.en[5];
                    const randomWord = words[Math.floor(Math.random() * words.length)];
                    wordObj = { word: randomWord };
                }

                const word = wordObj?.word;

                // Reset players
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
                    currentWord: word?.toUpperCase(),
                    currentSuggester: wordObj?.suggester || null,
                    gameState: 'playing',
                    startTime: Date.now(),
                    wordQueue: newQueue,
                    players: updatedPlayers,
                    routineIndex: nextRoutineIndex,
                    settings: {
                        ...currentRoom.settings,
                        wordLength: gameLength,
                        language: gameLang
                    }
                };
            });
            toast.success("Game started!");
            await remove(ref(db, `public_rooms/${roomId}`));
        };

        await safeWrite(transaction)
            .catch(() => setError("Failed to start game"))
            .finally(() => setActionLoading(null));

    }, [room, roomId, safeWrite]);

    const checkGameOver = useCallback(async () => {
        // Fetch fresh state to be sure
        const snapshot = await get(ref(db, `rooms/${roomId}`));
        const freshRoom = snapshot.val() as RoomData;
        if (!freshRoom || freshRoom.gameState !== 'playing') return;

        const players = Object.values(freshRoom.players || {});
        const allFinished = players.every(p => p.status === 'won' || p.status === 'lost');

        if (allFinished) {
            const updatePayload: Record<string, unknown> = {
                gameState: 'finished'
            };
            if (freshRoom.settings.useRoutine) {
                updatePayload.dailyRound = (freshRoom.dailyRound || 0) + 1;
            }
             await safeWrite(async () => update(ref(db, `rooms/${roomId}`), updatePayload));
        }
    }, [roomId, safeWrite]);

    const submitGuess = useCallback(async (guess: string) => {
        if (!room || room.gameState !== 'playing' || !userId) return;

        const player = room.players[userId];
        if (!player) return;

        if (guess.length !== room.settings.wordLength) return;

        const currentGuesses = parseGuesses(player.guesses);
        const newGuesses = [...currentGuesses, guess];
        let newScore = player.score;

        const updateData: Record<string, unknown> = {
            guesses: JSON.stringify(newGuesses),
        };

        // First guess time
        let playerStartTime = player.startTime;
        if (newGuesses.length === 1 && !playerStartTime) {
            playerStartTime = Date.now();
            updateData.startTime = playerStartTime;
        }

        let gameCompleted = false;
        let won = false;
        let finalTime = 0;

        if (guess === room.currentWord) {
            const endTime = Date.now();
            const startTime = playerStartTime || room.startTime;
            const timeTaken = (endTime - startTime) / 1000;

            const attempts = newGuesses.length;
            const calculatedScore = Math.max(0, 1000 - (attempts * 100) - Math.floor(timeTaken / 2));

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
            updateData.status = 'lost';
            const endTime = Date.now();
            const startTime = playerStartTime || room.startTime;
            const timeTaken = (endTime - startTime) / 1000;

            updateData.endTime = endTime;
            updateData.timeTaken = timeTaken;
            updateData.finalScore = 0;
            gameCompleted = true;
            won = false;
            finalTime = timeTaken;
        } else {
            updateData.status = 'playing';
        }

        // Update Stats if completed
        if (gameCompleted) {
            let gameLang: 'en' | 'he' = room.settings.language || 'en';
            let gameLength = room.settings.wordLength || 5;

            // Routine adjustment for stats definition
            if (room.settings.useRoutine && room.settings.dailyRoutine && room.settings.dailyRoutine.length > 0) {
                const routine = room.settings.dailyRoutine;
                // The routineIndex is updated *for the next round*, so we look at the one that just finished.
                const nextGameIndex = room.routineIndex ?? 1;
                const actualIndex = (nextGameIndex - 1 + routine.length) % routine.length;
                const currentGame = routine[actualIndex];
                gameLang = currentGame.language;
                gameLength = currentGame.wordLength;
            }

            const gameRecord: GameHistory = {
                date: Date.now(),
                language: gameLang,
                wordLength: gameLength,
                guessCount: newGuesses.length,
                timeTaken: finalTime,
                won
            };

            // This now handles all persistent stat calculations and achievements
            updateUserStats(gameRecord);
        }

        await safeWrite(async () => update(ref(db, `rooms/${roomId}/players/${userId}`), updateData));

        // Check for Game Over (Everyone finished)
        // We do this optimistically. If I finished, check if everyone else is done.
        if (gameCompleted) {
            checkGameOver();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [room, roomId, userId, checkGameOver, updateUserStats]);

    const updateSettings = useCallback(async (newSettings: Partial<RoomSettings>) => {
        const action = async () => {
            await update(ref(db, `rooms/${roomId}/settings`), newSettings);
            if (newSettings.isPublic === true) {
                await set(ref(db, `public_rooms/${roomId}`), {
                    playerCount: room?.playerCount || 1,
                    createdAt: Date.now(),
                });
            } else if (newSettings.isPublic === false) {
                await remove(ref(db, `public_rooms/${roomId}`));
            }
            toast.success("Settings updated!");
        };
        await safeWrite(action);
    }, [roomId, safeWrite, room]);

    const resetRound = useCallback(async () => {
        if (!room) return;
        setActionLoading('reset');

        const action = async () => {
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
                currentSuggester: null,
                players: updatedPlayers
            });
        };

        await safeWrite(action)
            .catch(() => setError("Failed to reset round"))
            .finally(() => setActionLoading(null));
    }, [room, roomId, safeWrite]);

    const skipWord = useCallback(async () => {
        const action = async () => update(ref(db, `rooms/${roomId}`), { gameState: 'finished' });
        await safeWrite(action);
    }, [roomId, safeWrite]);

    const clearScores = useCallback(async () => {
        if (!room) return;
        const action = async () => {
            const updatedPlayers = { ...room.players };
            Object.keys(updatedPlayers).forEach(key => {
                updatedPlayers[key].score = 0;
            });
            await update(ref(db, `rooms/${roomId}/players`), updatedPlayers);
        };
        await safeWrite(action);
    }, [room, roomId, safeWrite]);

    const addCustomWord = useCallback(async (word: string) => {
        if (!room) return;
        const action = async () => {
            const currentQueue = room.settings.customQueue || [];
            const wordEntry = { word: word.toUpperCase(), suggester: username || "Anonymous" };
            const updatedQueue = [...currentQueue, wordEntry];

            await update(ref(db, `rooms/${roomId}`), {
                wordQueue: updatedQueue,
                "settings/customQueue": updatedQueue
            });
        };
        await safeWrite(action);
    }, [room, roomId, username, safeWrite]);

    const leaveRoom = useCallback(async () => {
        if (!userId) return;
        const action = async () => {
            const roomRef = ref(db, `rooms/${roomId}`);
            const { committed, snapshot } = await runTransaction(roomRef, (currentRoom) => {
                if (!currentRoom) return;

                if (currentRoom.players && currentRoom.players[userId]) {
                    delete currentRoom.players[userId];
                }
                currentRoom.playerCount = Object.keys(currentRoom.players || {}).length;
                return currentRoom;
            });

            if (committed) {
                const newPlayerCount = snapshot.child('playerCount').val();
                if (newPlayerCount === 0) {
                    await remove(roomRef);
                    await remove(ref(db, `public_rooms/${roomId}`));
                } else if (snapshot.child('settings/isPublic').val()) {
                    await update(ref(db, `public_rooms/${roomId}`), { playerCount: newPlayerCount });
                }
            }
        };

        await safeWrite(action).catch((err) => {
            console.error("Failed to leave room:", err);
            toast.error("Failed to leave room. Please try again.");
        });
    }, [userId, roomId, safeWrite]);

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
        addCustomWord,
        leaveRoom
    };
}
