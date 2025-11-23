import { useState, useEffect, useCallback, useRef } from "react";
import toast from "react-hot-toast";
import { db } from "@/lib/firebase";
import { ref, onValue, set, update, get, runTransaction, onDisconnect } from "firebase/database";
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
    endTime?: number;
    history?: string; // JSON string
    stats?: string; // JSON string
    firstGuessTime?: number;
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
}

export interface RoomData {
    id: string;
    players: Record<string, Player>;
    gameState: 'waiting' | 'playing' | 'finished';
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

const getCategoryKey = (lang: 'en' | 'he', length: number): keyof PlayerStats => {
    return `${lang}-${length}` as keyof PlayerStats;
};

// --- Hook ---

export function useRoom(roomId: string, username: string | null) {
    const [room, setRoom] = useState<RoomData | null>(null);
    const [userId, setUserId] = useState<string>("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const prevPlayersRef = useRef<Record<string, Player> | null>(null);

    // Initialize User ID
    useEffect(() => {
        if (!username) return;
        let storedId = localStorage.getItem(`friendle_uid_${roomId}`);
        if (!storedId) {
            storedId = Math.random().toString(36).substring(2, 15);
            localStorage.setItem(`friendle_uid_${roomId}`, storedId);
        }
        setUserId(storedId);
    }, [roomId, username]);

    // Join existing room helper
    const joinRoom = useCallback(async () => {
        if (!userId || !username) return;
        try {
            await update(ref(db, `rooms/${roomId}/players`), {
                [userId]: {
                    id: userId,
                    username,
                    score: 0,
                    status: 'waiting',
                    guesses: JSON.stringify([])
                }
            });
        } catch (err) {
            console.error("Error joining room:", err);
            setError("Failed to join room");
        }
    }, [roomId, userId, username]);

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
            }
        });

        const unsubscribe = onValue(roomRef, (snapshot) => {
            setLoading(false);
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
            setLoading(false);
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
                    settings: { wordLength: 5, customQueue: [], language: 'en' },
                    wordQueue: []
                };
                await set(roomRef, initialRoom);
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
        try {
            const roomRef = ref(db, `rooms/${roomId}`);
            toast.success("Game started!");
            await runTransaction(roomRef, (currentRoom: RoomData | null) => {
                if (!currentRoom) return;

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
                    delete updatedPlayers[key].firstGuessTime;
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
        } catch (err) {
            console.error("Failed to start game:", err);
            setError("Failed to start game");
        } finally {
            setActionLoading(null);
        }
    }, [room, roomId]);

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
            await update(ref(db, `rooms/${roomId}`), updatePayload);
        }
    }, [roomId]);

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
        let firstGuessT = player.firstGuessTime;
        if (newGuesses.length === 1 && !firstGuessT) {
            firstGuessT = Date.now();
            updateData.firstGuessTime = firstGuessT;
        }

        let gameCompleted = false;
        let won = false;
        let finalTime = 0;

        if (guess === room.currentWord) {
            const endTime = Date.now();
            const startTime = firstGuessT || room.startTime;
            const timeTaken = (endTime - startTime) / 1000;

            newScore += 1;
            updateData.status = 'won';
            updateData.score = newScore;
            updateData.endTime = endTime;
            updateData.timeTaken = timeTaken;
            gameCompleted = true;
            won = true;
            finalTime = timeTaken;
        } else if (newGuesses.length >= (room.settings.maxGuesses || 6)) {
            updateData.status = 'lost';
            const endTime = Date.now();
            const startTime = firstGuessT || room.startTime;
            const timeTaken = (endTime - startTime) / 1000;

            updateData.endTime = endTime;
            updateData.timeTaken = timeTaken;
            gameCompleted = true;
            won = false;
            finalTime = timeTaken;
        } else {
            updateData.status = 'playing';
        }

        // Update Stats if completed
        if (gameCompleted) {
            const history = parseHistory(player.history);
            const stats = parseStats(player.stats);

            let gameLang: 'en' | 'he' = room.settings.language || 'en';
            let gameLength = room.settings.wordLength || 5;

            // Routine adjustment for stats
            if (room.settings.useRoutine && room.settings.dailyRoutine && room.settings.dailyRoutine.length > 0) {
                const routine = room.settings.dailyRoutine;
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
            history.push(gameRecord);

            const categoryKey = getCategoryKey(gameLang, gameLength);
            const currentStats = stats[categoryKey] || { games: 0, avgGuesses: 0, avgTime: 0, wins: 0 };

            const newGames = currentStats.games + 1;
            const newWins = currentStats.wins + (won ? 1 : 0);
            const newAvgGuesses = ((currentStats.avgGuesses * currentStats.games) + newGuesses.length) / newGames;
            const newAvgTime = ((currentStats.avgTime * currentStats.games) + finalTime) / newGames;

            stats[categoryKey] = {
                games: newGames,
                avgGuesses: newAvgGuesses,
                avgTime: newAvgTime,
                wins: newWins
            };

            updateData.history = JSON.stringify(history);
            updateData.stats = JSON.stringify(stats);
        }

        await update(ref(db, `rooms/${roomId}/players/${userId}`), updateData);

        // Check for Game Over (Everyone finished)
        // We do this optimistically. If I finished, check if everyone else is done.
        if (gameCompleted) {
            checkGameOver();
        }
    }, [room, roomId, userId, checkGameOver]);

    const updateSettings = useCallback(async (newSettings: Partial<RoomSettings>) => {
        await update(ref(db, `rooms/${roomId}/settings`), newSettings);
        toast.success("Settings updated!");
    }, [roomId]);

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
            delete updatedPlayers[key].firstGuessTime;
        });

            await update(ref(db, `rooms/${roomId}`), {
                gameState: 'waiting',
                currentWord: "",
                currentSuggester: null,
                players: updatedPlayers
            });
        } catch (err) {
            console.error("Failed to reset round:", err);
            setError("Failed to reset round");
        } finally {
            setActionLoading(null);
        }
    }, [room, roomId]);

    const skipWord = useCallback(async () => {
        await update(ref(db, `rooms/${roomId}`), {
            gameState: 'finished'
        });
    }, [roomId]);

    const clearScores = useCallback(async () => {
        if (!room) return;
        const updatedPlayers = { ...room.players };
        Object.keys(updatedPlayers).forEach(key => {
            updatedPlayers[key].score = 0;
        });
        await update(ref(db, `rooms/${roomId}/players`), updatedPlayers);
    }, [room, roomId]);

    const addCustomWord = useCallback(async (word: string) => {
        if (!room) return;
        const currentQueue = room.settings.customQueue || [];
        const wordEntry = { word: word.toUpperCase(), suggester: username || "Anonymous" };
        const updatedQueue = [...currentQueue, wordEntry];

        await update(ref(db, `rooms/${roomId}`), {
            wordQueue: updatedQueue,
            "settings/customQueue": updatedQueue
        });
    }, [room, roomId, username]);

    return {
        room,
        userId,
        loading,
        error,
        actionLoading,
        startGame,
        submitGuess,
        updateSettings,
        resetRound,
        skipWord,
        clearScores,
        addCustomWord
    };
}
