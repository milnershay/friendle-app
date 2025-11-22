"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import { ref, onValue, set, update, get, onDisconnect } from "firebase/database";
import GameBoard from "@/components/game/GameBoard";
import { WORD_LISTS } from "@/lib/wordLists";
import { useTranslation, getStoredLanguage, type Language } from "@/lib/i18n";

interface GameHistory {
    date: number; // timestamp
    language: 'en' | 'he';
    wordLength: number;
    guessCount: number; // how many guesses it took
    timeTaken: number; // seconds
    won: boolean;
}

interface CategoryStats {
    games: number;
    avgGuesses: number;
    avgTime: number;
    wins: number;
}

interface PlayerStats {
    'en-4'?: CategoryStats;
    'en-5'?: CategoryStats;
    'en-6'?: CategoryStats;
    'he-4'?: CategoryStats;
    'he-5'?: CategoryStats;
    'he-6'?: CategoryStats;
}

interface Player {
    id: string;
    username: string;
    score: number;
    status: 'waiting' | 'playing' | 'won' | 'lost';
    guesses?: string; // Stored as JSON string in Firebase
    timeTaken?: number;
    endTime?: number;
    history?: string; // Stored as JSON string - GameHistory[]
    stats?: string; // Stored as JSON string - PlayerStats
}

// Helper function to parse guesses from Firebase
const parseGuesses = (guesses?: string): string[] => {
    if (!guesses) return [];
    try {
        return JSON.parse(guesses);
    } catch {
        return [];
    }
};

// Helper function to parse history
const parseHistory = (history?: string): GameHistory[] => {
    if (!history) return [];
    try {
        return JSON.parse(history);
    } catch {
        return [];
    }
};

// Helper function to parse stats
const parseStats = (stats?: string): PlayerStats => {
    if (!stats) return {};
    try {
        return JSON.parse(stats);
    } catch {
        return {};
    }
};

// Helper to get category key
const getCategoryKey = (lang: 'en' | 'he', length: number): keyof PlayerStats => {
    return `${lang}-${length}` as keyof PlayerStats;
};

interface RoutineGame {
    language: 'en' | 'he';
    wordLength: 4 | 5 | 6;
}

interface RoomSettings {
    wordLength: number;
    customQueue: { word: string; suggester: string }[];
    maxGuesses?: number;
    language: 'en' | 'he';
    dailyRoutine?: RoutineGame[]; // NEW: Custom game sequence
    useRoutine?: boolean; // NEW: Whether to use daily routine
}

interface RoomData {
    id: string;
    players: Record<string, Player>; // Firebase uses objects for lists usually
    gameState: 'waiting' | 'playing' | 'finished';
    currentWord: string | null;
    currentSuggester?: string | null;
    startTime: number;
    settings: RoomSettings;
    wordQueue: { word: string; suggester: string }[];
    routineIndex?: number; // NEW: Current position in daily routine
    dailyRound?: number; // NEW: Which round today (resets daily)
    lastResetDate?: string; // NEW: ISO date for tracking daily resets
}

export default function RoomPage() {
    const { roomId } = useParams();
    const searchParams = useSearchParams();
    const username = searchParams.get("username");
    const router = useRouter();

    const [room, setRoom] = useState<RoomData | null>(null);
    const [error, setError] = useState("");
    const [newWord, setNewWord] = useState("");
    const [language, setLanguage] = useState<Language>('en');
    const [showStats, setShowStats] = useState(false);
    const [routineLang, setRoutineLang] = useState<'en' | 'he'>('en');
    const [routineLength, setRoutineLength] = useState<4 | 5 | 6>(5);
    const [showResultsModal, setShowResultsModal] = useState(false);
    const t = useTranslation(language);

    useEffect(() => {
        setLanguage(getStoredLanguage());
    }, []);

    // We need a stable ID for the user. 
    // In Firebase, we can generate one or use auth. 
    // For this anonymous app, let's generate one and store in localStorage, 
    // OR just use username as key if we trust it's unique enough for friends.
    // Let's use a random ID but persist it in session/local storage? 
    // Actually, for simplicity, let's generate a random ID on mount and keep it in ref.
    // If they refresh, they get a new ID? That breaks reconnection.
    // Let's use localStorage to persist ID for this room.
    const [userId, setUserId] = useState<string>("");

    useEffect(() => {
        if (!username) {
            router.push("/");
            return;
        }

        // Get or create User ID
        let storedId = localStorage.getItem(`friendle_uid_${roomId}`);
        if (!storedId) {
            storedId = Math.random().toString(36).substring(2, 15);
            localStorage.setItem(`friendle_uid_${roomId}`, storedId);
        }
        setUserId(storedId);

        const roomRef = ref(db, `rooms/${roomId}`);
        const playerRef = ref(db, `rooms/${roomId}/players/${storedId}`);

        // Subscribe to room updates
        const unsubscribe = onValue(roomRef, (snapshot) => {
            if (snapshot.exists()) {
                setRoom(snapshot.val());
            } else {
                // Room doesn't exist, initialize it if we are the first?
                // Or maybe we just initialize it below.
            }
        });

        // Join Room
        get(roomRef).then((snapshot) => {
            const currentRoom = snapshot.val();

            if (!currentRoom) {
                // Create Room
                const initialRoom: RoomData = {
                    id: roomId as string,
                    players: {
                        [storedId]: { id: storedId, username: username!, score: 0, status: 'waiting', guesses: JSON.stringify([]) }
                    },
                    gameState: 'waiting',
                    currentWord: "",
                    startTime: 0,
                    settings: { wordLength: 5, customQueue: [], language: 'en' },
                    wordQueue: []
                };
                set(roomRef, initialRoom);
            } else {
                // Join existing
                // Check if player exists (reconnection)
                if (!currentRoom.players || !currentRoom.players[storedId]) {
                    update(ref(db, `rooms/${roomId}/players`), {
                        [storedId]: { id: storedId, username: username!, score: 0, status: 'waiting', guesses: JSON.stringify([]) }
                    });
                } else {
                    // Reconnected, maybe update status if we tracked online/offline
                }
            }
        });

        // Handle disconnect (optional cleanup)
        // onDisconnect(playerRef).remove(); // Don't remove for persistence!

        return () => {
            unsubscribe();
        };
    }, [roomId, username, router]);

    const startGame = () => {
        if (!room) {
            console.error("Cannot start game: room is null");
            return;
        }

        try {
            let wordObj: { word: string; suggester?: string } | undefined;
            let newQueue = [...(room.wordQueue || [])];
            let gameLang: 'en' | 'he';
            let gameLength: number;

            // Check if using daily routine
            if (room.settings.useRoutine && room.settings.dailyRoutine && room.settings.dailyRoutine.length > 0) {
                const routine = room.settings.dailyRoutine;
                const currentIndex = room.routineIndex || 0;
                const nextIndex = (currentIndex + 1) % routine.length;
                const currentGame = routine[currentIndex];

                gameLang = currentGame.language;
                gameLength = currentGame.wordLength;

                // Get word for this category
                // @ts-ignore
                const words = WORD_LISTS[gameLang]?.[gameLength] || WORD_LISTS.en[5];
                const randomWord = words[Math.floor(Math.random() * words.length)];
                wordObj = { word: randomWord };

                // Update routine index for next game
                update(ref(db, `rooms/${roomId}`), {
                    routineIndex: nextIndex
                });
            } else if (newQueue.length > 0) {
                wordObj = newQueue.shift();
                gameLang = room.settings.language || 'en';
                gameLength = room.settings.wordLength || 5;
            } else {
                gameLang = room.settings.language || 'en';
                gameLength = room.settings.wordLength || 5;
                // @ts-ignore
                const words = WORD_LISTS[gameLang]?.[gameLength] || WORD_LISTS.en[5];
                const randomWord = words[Math.floor(Math.random() * words.length)];
                wordObj = { word: randomWord };
            }

            const word = wordObj?.word;

            // Reset players
            const updatedPlayers = { ...room.players };
            Object.keys(updatedPlayers).forEach(key => {
                updatedPlayers[key] = {
                    ...updatedPlayers[key],
                    status: 'playing',
                    guesses: JSON.stringify([]),
                };
                // Remove endTime and timeTaken properties entirely
                delete updatedPlayers[key].endTime;
                delete updatedPlayers[key].timeTaken;
            });

            console.log("Starting game with word:", word);

            const updatePayload: any = {
                currentWord: word?.toUpperCase(),
                currentSuggester: wordObj?.suggester || null,
                gameState: 'playing',
                startTime: Date.now(),
                wordQueue: newQueue,
                players: updatedPlayers
            };

            // Update settings to match the current game (important for routines)
            updatePayload['settings/wordLength'] = gameLength;
            updatePayload['settings/language'] = gameLang;

            update(ref(db, `rooms/${roomId}`), updatePayload).then(() => {
                console.log("Game started successfully");
            }).catch((error) => {
                console.error("Failed to start game:", error);
                setError(`Failed to start game: ${error.message}`);
            });
        } catch (error) {
            console.error("Error in startGame:", error);
            setError(`Error starting game: ${error}`);
        }
    };

    const handleGuess = (guess: string) => {
        if (!room || room.gameState !== 'playing' || !userId) return;

        const player = room.players[userId];
        if (!player) return;

        if (guess.length !== room.settings.wordLength) return;

        const currentGuesses = parseGuesses(player.guesses);
        const newGuesses = [...currentGuesses, guess];
        let newStatus = player.status;
        let newScore = player.score;

        const updateData: any = {
            guesses: JSON.stringify(newGuesses),
            status: newStatus,
            score: newScore,
        };

        let gameCompleted = false;
        let won = false;
        let finalTime = 0;

        if (guess === room.currentWord) {
            newStatus = 'won';
            const endTime = Date.now();
            const timeTaken = (endTime - room.startTime) / 1000;
            newScore += 1;
            updateData.status = 'won';
            updateData.score = newScore;
            updateData.endTime = endTime;
            updateData.timeTaken = timeTaken;
            gameCompleted = true;
            won = true;
            finalTime = timeTaken;
        } else if (newGuesses.length >= (room.settings.maxGuesses || 6)) {
            newStatus = 'lost';
            updateData.status = 'lost';
            const endTime = Date.now();
            const timeTaken = (endTime - room.startTime) / 1000;
            updateData.endTime = endTime;
            updateData.timeTaken = timeTaken;
            gameCompleted = true;
            won = false;
            finalTime = timeTaken;
        }

        // If game completed, update history and stats
        if (gameCompleted) {
            const history = parseHistory(player.history);
            const stats = parseStats(player.stats);

            // Determine game category
            let gameLang: 'en' | 'he' = room.settings.language || 'en';
            let gameLength = room.settings.wordLength || 5;

            // If using routine, get current game's settings
            if (room.settings.useRoutine && room.settings.dailyRoutine && room.settings.dailyRoutine.length > 0) {
                const routine = room.settings.dailyRoutine;
                // routineIndex points to the NEXT game. We want the current one (previous index).
                // Use ?? to handle undefined/null but respect 0.
                const nextGameIndex = room.routineIndex ?? 1;
                const actualIndex = (nextGameIndex - 1 + routine.length) % routine.length;
                const currentGame = routine[actualIndex];
                gameLang = currentGame.language;
                gameLength = currentGame.wordLength;
            }

            // Add to history
            const gameRecord: GameHistory = {
                date: Date.now(),
                language: gameLang,
                wordLength: gameLength,
                guessCount: newGuesses.length,
                timeTaken: finalTime,
                won
            };
            history.push(gameRecord);

            // Update stats for this category
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

        // Update my player state
        update(ref(db, `rooms/${roomId}/players/${userId}`), updateData);

        // Check Game Over (Client side check, ideally cloud function but this works for MVP)
        // We need to check if ALL players are done.
        // Since we only update ourself, we can check if everyone else is done in the local state `room`.
        // But `room` might be slightly stale. 
        // Actually, every client checks "Is everyone done?" on every update. 
        // If so, the LAST client to finish triggers game over.
        // Or just let the host trigger it? 
        // Let's try: if I finish, I check if everyone else is finished.

        // We need to use the *latest* state. We can't easily know if others just finished.
        // Simple approach: The Host (or anyone) watches for all finished and updates gameState.
        // Let's do it in a separate effect or just here optimistically.
    };

    // Effect to check for game over
    useEffect(() => {
        if (!room || room.gameState !== 'playing') return;

        const players = Object.values(room.players || {});
        if (players.length === 0) return;

        const allFinished = players.every(p => p.status === 'won' || p.status === 'lost');

        if (allFinished) {
            // Only one person needs to update this. Let's say the Host (first key sorted?).
            // Or just anyone. If multiple update, it's fine, idempotent.
            const updatePayload: any = {
                gameState: 'finished'
            };

            // Increment daily round if using routine
            if (room.settings.useRoutine) {
                updatePayload.dailyRound = (room.dailyRound || 0) + 1;
            }

            update(ref(db, `rooms/${roomId}`), updatePayload);
        }
    }, [room, roomId]);

    // Effect to show results modal and auto-advance
    useEffect(() => {
        if (!room || room.gameState !== 'finished') {
            setShowResultsModal(false);
            return;
        }

        // Show results modal
        setShowResultsModal(true);

        // Auto-advance to next game after 5 seconds if using routine
        if (room.settings.useRoutine) {
            const timer = setTimeout(() => {
                setShowResultsModal(false);
                // Small delay before starting next game for smooth transition
                setTimeout(() => {
                    startGame();
                }, 500);
            }, 5000);

            return () => clearTimeout(timer);
        }
    }, [room?.gameState, room?.settings.useRoutine]);


    const updateSettings = (newSettings: Partial<RoomSettings>) => {
        if (room) {
            update(ref(db, `rooms/${roomId}/settings`), newSettings);
        }
    };

    const addToRoutine = () => {
        if (!room) return;
        const currentRoutine = room.settings.dailyRoutine || [];
        const newGame: RoutineGame = { language: routineLang, wordLength: routineLength };
        updateSettings({ dailyRoutine: [...currentRoutine, newGame] });
    };

    const removeFromRoutine = (index: number) => {
        if (!room) return;
        const currentRoutine = room.settings.dailyRoutine || [];
        const newRoutine = currentRoutine.filter((_, i) => i !== index);
        updateSettings({ dailyRoutine: newRoutine });
    };

    const toggleRoutine = () => {
        if (!room) return;
        const newValue = !room.settings.useRoutine;
        updateSettings({ useRoutine: newValue });
        if (newValue && (!room.settings.dailyRoutine || room.settings.dailyRoutine.length === 0)) {
            // Initialize with a default routine
            updateSettings({
                dailyRoutine: [
                    { language: 'en', wordLength: 5 },
                    { language: 'he', wordLength: 5 }
                ]
            });
        }
    };

    const addCustomWord = () => {
        if (!newWord || !room) return;
        const currentQueue = room.settings.customQueue || [];
        const wordEntry = { word: newWord.toUpperCase(), suggester: username || "Anonymous" };
        const updatedQueue = [...currentQueue, wordEntry];

        update(ref(db, `rooms/${roomId}`), {
            wordQueue: updatedQueue, // Update active queue
            "settings/customQueue": updatedQueue // Update settings record
        });
        setNewWord("");
    };

    const resetRound = () => {
        if (!room || !isHost) return;

        const updatedPlayers = { ...room.players };
        Object.keys(updatedPlayers).forEach(key => {
            updatedPlayers[key] = {
                ...updatedPlayers[key],
                status: 'waiting',
                guesses: JSON.stringify([]),
            };
            delete updatedPlayers[key].endTime;
            delete updatedPlayers[key].timeTaken;
        });

        update(ref(db, `rooms/${roomId}`), {
            gameState: 'waiting',
            currentWord: "",
            currentSuggester: null,
            players: updatedPlayers
        });
    };

    const skipWord = () => {
        if (!room || !isHost || room.gameState !== 'playing') return;

        update(ref(db, `rooms/${roomId}`), {
            gameState: 'finished'
        });
    };

    const clearScores = () => {
        if (!room || !isHost) return;
        if (!confirm("Are you sure you want to reset all scores?")) return;

        const updatedPlayers = { ...room.players };
        Object.keys(updatedPlayers).forEach(key => {
            updatedPlayers[key].score = 0;
        });

        update(ref(db, `rooms/${roomId}/players`), updatedPlayers);
    };

    const leaveRoom = () => {
        if (confirm(t.room.confirmLeave)) {
            // Clean up localStorage for this room
            localStorage.removeItem(`friendle_uid_${roomId}`);
            router.push('/');
        }
    };

    // Mobile view state
    const [activeTab, setActiveTab] = useState<'game' | 'players'>('game');

    if (error) return <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white p-4">
        <div className="bg-red-900/50 border border-red-500 rounded-xl p-6 max-w-md glass">
            <h2 className="text-xl font-bold mb-2 text-red-400">Error</h2>
            <p>{error}</p>
            <button onClick={() => router.push("/")} className="mt-4 bg-slate-700 hover:bg-slate-600 px-4 py-2 rounded-lg transition-colors">Go Home</button>
        </div>
    </div>;
    if (!room) return <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white">
        <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
            <p className="text-slate-400 text-sm animate-pulse">Connecting to room {roomId}</p>
        </div>
    </div>;

    const myPlayer = room.players && room.players[userId];
    const playerList = Object.values(room.players || {});
    const isHost = playerList[0]?.id === userId;

    return (
        <main className="min-h-screen text-white flex flex-col md:flex-row safe-area-inset relative overflow-hidden">
            {/* Background decoration */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-600/10 rounded-full blur-[100px]"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-600/10 rounded-full blur-[100px]"></div>
            </div>

            {/* Mobile Header / Tabs */}
            <div className="md:hidden glass p-3 flex justify-between items-center sticky top-0 z-10 safe-top border-b border-white/10">
                <div className="flex items-center gap-2">
                    <button
                        onClick={leaveRoom}
                        className="text-slate-400 hover:text-white transition-colors"
                        title={t.room.leaveRoom}
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                    </button>
                    <h1 className="text-lg font-black bg-gradient-to-r from-indigo-400 to-purple-400 text-transparent bg-clip-text">{t.home.title}</h1>
                    <span className="text-xs bg-white/10 px-2 py-0.5 rounded font-mono border border-white/5">{roomId}</span>
                </div>
                <div className="flex gap-1 bg-black/20 rounded-lg p-1">
                    <button
                        onClick={() => setActiveTab('game')}
                        className={`px-4 py-1.5 rounded-md text-sm font-bold transition-all ${activeTab === 'game' ? 'bg-white/10 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
                    >
                        {t.room.game}
                    </button>
                    <button
                        onClick={() => setActiveTab('players')}
                        className={`px-4 py-1.5 rounded-md text-sm font-bold transition-all ${activeTab === 'players' ? 'bg-white/10 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
                    >
                        {t.room.players}
                    </button>
                </div>
            </div>

            {/* Sidebar (Desktop: always visible, Mobile: controlled by tab) */}
            <div className={`
        w-full md:w-80 glass md:border-r border-white/10 p-6 flex-col
        ${activeTab === 'players' ? 'flex' : 'hidden md:flex'}
      `}>
                <div className="hidden md:block mb-8">
                    <div className="flex items-center justify-between mb-2">
                        <h1 className="text-3xl font-black bg-gradient-to-r from-indigo-400 to-purple-400 text-transparent bg-clip-text">{t.home.title}</h1>
                        <button
                            onClick={leaveRoom}
                            className="text-slate-400 hover:text-white transition-colors p-2"
                            title={t.room.leaveRoom}
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                            </svg>
                        </button>
                    </div>
                    <p className="text-slate-400 text-sm flex items-center gap-2">
                        {t.room.roomCode}: <span className="font-mono text-white bg-white/10 px-2 py-1 rounded select-all border border-white/5">{roomId}</span>
                        {room.settings.useRoutine && room.dailyRound && (
                            <span className="text-xs bg-purple-500/20 text-purple-300 px-2 py-1 rounded border border-purple-500/20">
                                Round {room.dailyRound}
                            </span>
                        )}
                    </p>
                </div>

                {/* Mobile Room Code */}
                <div className="md:hidden mb-6 p-4 bg-white/5 rounded-xl text-center border border-white/5">
                    <p className="text-slate-400 text-xs uppercase tracking-widest mb-1">{t.room.roomCode}</p>
                    <p className="text-3xl font-mono font-bold select-all tracking-wider">{roomId}</p>
                    {room.settings.useRoutine && room.dailyRound && (
                        <p className="text-xs text-purple-300 mt-2 bg-purple-500/20 px-2 py-1 rounded inline-block border border-purple-500/20">
                            Round {room.dailyRound}
                        </p>
                    )}
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 flex items-center justify-between">
                        <span className="flex items-center gap-2">
                            {t.room.leaderboard} <span className="bg-white/10 px-1.5 py-0.5 rounded-full text-[10px]">{playerList.length}</span>
                        </span>
                        {isHost && playerList.some(p => p.score > 0) && (
                            <button
                                onClick={clearScores}
                                className="text-[10px] bg-red-500/20 text-red-400 hover:bg-red-500/30 px-2 py-1 rounded transition-colors"
                                title={t.room.reset}
                            >
                                {t.room.reset}
                            </button>
                        )}
                    </h2>
                    <div className="space-y-2">
                        {playerList
                            .sort((a, b) => b.score - a.score)
                            .map((player, index) => (
                                <div key={player.id} className={`p-3 rounded-xl flex items-center gap-3 transition-all ${player.id === userId ? 'bg-white/10 border border-white/10 shadow-lg' : 'bg-white/5 border border-transparent hover:bg-white/10'}`}>
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-sm ${index === 0 ? 'bg-gradient-to-br from-yellow-400 to-yellow-600 text-yellow-900' :
                                        index === 1 ? 'bg-gradient-to-br from-slate-300 to-slate-500 text-slate-900' :
                                            index === 2 ? 'bg-gradient-to-br from-amber-600 to-amber-800 text-amber-100' :
                                                'bg-black/20 text-slate-500'
                                        }`}>
                                        {index + 1}
                                    </div>
                                    <div className="flex-1">
                                        <div className="font-bold text-sm flex items-center gap-2">
                                            {player.username}
                                            {player.id === userId && <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-1.5 py-0.5 rounded uppercase tracking-wider">You</span>}
                                        </div>
                                        <div className="text-xs text-slate-400 mt-0.5">
                                            {player.status === 'waiting' && '⏳ Waiting...'}
                                            {player.status === 'playing' && <span className="text-yellow-400">⚡ Playing ({parseGuesses(player.guesses).length}/{room.settings.maxGuesses || 6})</span>}
                                            {player.status === 'won' && <span className="text-green-400 font-bold">✓ Solved ({player.timeTaken?.toFixed(1)}s)</span>}
                                            {player.status === 'lost' && <span className="text-red-400">✗ Failed</span>}
                                        </div>
                                    </div>
                                    <div className="text-2xl font-black text-slate-300 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 w-12 h-12 rounded-xl flex items-center justify-center border border-white/10">{player.score}</div>
                                </div>
                            ))}
                    </div>

                    {/* Stats Section */}
                    {userId && room.players[userId] && (
                        <div className="mt-6">
                            <button
                                onClick={() => setShowStats(!showStats)}
                                className="w-full flex items-center justify-between p-3 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 transition-all mb-3"
                            >
                                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">📊 Your Stats</span>
                                <span className="text-xs text-slate-500">{showStats ? '▼' : '▶'}</span>
                            </button>

                            {showStats && (
                                <div className="space-y-3">
                                    {(Object.keys(parseStats(room.players[userId].stats)) as Array<keyof PlayerStats>).map((categoryKey) => {
                                        const stats = parseStats(room.players[userId].stats)[categoryKey];
                                        if (!stats || stats.games === 0) return null;

                                        const [lang, length] = categoryKey.split('-');
                                        const winRate = ((stats.wins / stats.games) * 100).toFixed(0);

                                        return (
                                            <div key={categoryKey} className="p-3 bg-white/5 rounded-lg border border-white/10">
                                                <div className="flex items-center justify-between mb-2">
                                                    <span className="text-sm font-bold text-indigo-400">
                                                        {lang.toUpperCase()}-{length}
                                                    </span>
                                                    <span className="text-xs text-slate-400">{stats.games} games</span>
                                                </div>
                                                <div className="grid grid-cols-3 gap-2 text-xs">
                                                    <div className="bg-black/20 p-2 rounded text-center">
                                                        <div className="text-green-400 font-bold">{winRate}%</div>
                                                        <div className="text-[10px] text-slate-500">Win</div>
                                                    </div>
                                                    <div className="bg-black/20 p-2 rounded text-center">
                                                        <div className="text-yellow-400 font-bold">{stats.avgGuesses.toFixed(1)}</div>
                                                        <div className="text-[10px] text-slate-500">Avg Guesses</div>
                                                    </div>
                                                    <div className="bg-black/20 p-2 rounded text-center">
                                                        <div className="text-blue-400 font-bold">{stats.avgTime.toFixed(1)}s</div>
                                                        <div className="text-[10px] text-slate-500">Avg Time</div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                    {Object.keys(parseStats(room.players[userId].stats)).length === 0 && (
                                        <div className="p-4 bg-white/5 rounded-lg border border-white/10 text-center text-xs text-slate-400">
                                            Play some games to see your stats!
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {isHost && room.gameState === 'waiting' && (
                    <div className="mt-6 p-5 bg-white/5 rounded-xl border border-white/10">
                        <h3 className="font-bold mb-4 text-xs uppercase text-slate-400 tracking-widest">{t.room.gameSettings}</h3>
                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <label className="text-sm font-medium text-slate-300">Language</label>
                                <select
                                    value={room.settings.language || 'en'}
                                    onChange={(e) => updateSettings({ language: e.target.value as 'en' | 'he' })}
                                    className="bg-black/20 text-sm p-2 rounded-lg border border-white/10 focus:border-indigo-500 focus:outline-none transition-colors"
                                >
                                    <option value="en">English</option>
                                    <option value="he">Hebrew</option>
                                </select>
                            </div>
                            <div className="flex justify-between items-center">
                                <label className="text-sm font-medium text-slate-300">Word Length</label>
                                <div className="flex bg-black/20 rounded-lg p-1 border border-white/10">
                                    {[4, 5, 6].map(len => (
                                        <button
                                            key={len}
                                            onClick={() => updateSettings({ wordLength: len })}
                                            className={`px-3 py-1 rounded text-xs font-bold transition-all ${room.settings.wordLength === len ? 'bg-indigo-500 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
                                        >
                                            {len}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <label className="text-xs block mb-2 text-slate-400 uppercase tracking-wider">Custom Queue ({room.wordQueue?.length || 0})</label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={newWord}
                                        onChange={(e) => setNewWord(e.target.value)}
                                        className="bg-black/20 text-sm p-2 rounded-lg border border-white/10 flex-1 min-w-0 focus:border-indigo-500 focus:outline-none transition-colors"
                                        placeholder="Add word..."
                                        dir={room.settings.language === 'he' ? 'rtl' : 'ltr'}
                                    />
                                    <button onClick={addCustomWord} className="bg-indigo-600 hover:bg-indigo-500 px-3 rounded-lg text-white font-bold transition-colors">+</button>
                                </div>
                            </div>

                            {/* Daily Routine Configuration */}
                            <div className="pt-4 border-t border-white/10">
                                <div className="flex items-center justify-between mb-3">
                                    <label className="text-xs text-slate-400 uppercase tracking-wider">Daily Routine</label>
                                    <button
                                        onClick={toggleRoutine}
                                        className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${room.settings.useRoutine ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-white/5 text-slate-400 border border-white/10'}`}
                                    >
                                        {room.settings.useRoutine ? '✓ Enabled' : 'Disabled'}
                                    </button>
                                </div>

                                {room.settings.useRoutine && (
                                    <>
                                        <div className="mb-3 p-3 bg-black/20 rounded-lg border border-white/10">
                                            <div className="text-xs text-slate-400 mb-2">Add to routine:</div>
                                            <div className="flex gap-2">
                                                <select
                                                    value={routineLang}
                                                    onChange={(e) => setRoutineLang(e.target.value as 'en' | 'he')}
                                                    className="bg-black/30 text-xs p-2 rounded border border-white/10"
                                                >
                                                    <option value="en">EN</option>
                                                    <option value="he">HE</option>
                                                </select>
                                                <select
                                                    value={routineLength}
                                                    onChange={(e) => setRoutineLength(Number(e.target.value) as 4 | 5 | 6)}
                                                    className="bg-black/30 text-xs p-2 rounded border border-white/10"
                                                >
                                                    <option value={4}>4</option>
                                                    <option value={5}>5</option>
                                                    <option value={6}>6</option>
                                                </select>
                                                <button
                                                    onClick={addToRoutine}
                                                    className="bg-indigo-600 hover:bg-indigo-500 px-3 rounded text-white font-bold text-xs"
                                                >
                                                    Add
                                                </button>
                                            </div>
                                        </div>

                                        {room.settings.dailyRoutine && room.settings.dailyRoutine.length > 0 && (
                                            <div className="space-y-1">
                                                <div className="text-xs text-slate-400 mb-2">Current routine ({room.settings.dailyRoutine.length} games):</div>
                                                {room.settings.dailyRoutine.map((game, index) => (
                                                    <div key={index} className="flex items-center justify-between bg-black/20 p-2 rounded border border-white/10">
                                                        <span className="text-xs font-medium">
                                                            {index + 1}. {game.language.toUpperCase()}-{game.wordLength}
                                                            {index === ((room.routineIndex || 0) % (room.settings.dailyRoutine?.length || 1)) && (
                                                                <span className="ml-2 text-green-400">← Next</span>
                                                            )}
                                                        </span>
                                                        <button
                                                            onClick={() => removeFromRoutine(index)}
                                                            className="text-red-400 hover:text-red-300 text-xs font-bold"
                                                        >
                                                            ×
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {room.gameState === 'waiting' || room.gameState === 'finished' ? (
                    <button
                        onClick={startGame}
                        className="mt-6 w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 text-white font-bold py-4 px-4 rounded-xl transition-all active:scale-[0.98] shadow-lg shadow-green-900/20 text-lg uppercase tracking-wide"
                    >
                        {room.gameState === 'finished' ? t.room.playAgain : t.room.startGame}
                    </button>
                ) : (
                    <div className="mt-6 space-y-2">
                        <div className="text-center p-4 bg-white/5 rounded-xl border border-white/5">
                            <div className="animate-pulse text-indigo-400 font-bold mb-1">{t.room.gameInProgress}</div>
                            <div className="text-xs text-slate-400">{t.room.switchToGame}</div>
                        </div>
                        {isHost && (
                            <div className="flex gap-2">
                                <button
                                    onClick={skipWord}
                                    className="flex-1 bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 font-bold py-2 px-3 rounded-lg transition-all active:scale-[0.98] text-sm border border-yellow-500/20"
                                    title={t.room.skipWord}
                                >
                                    {t.room.skipWord}
                                </button>
                                <button
                                    onClick={resetRound}
                                    className="flex-1 bg-red-500/20 hover:bg-red-500/30 text-red-400 font-bold py-2 px-3 rounded-lg transition-all active:scale-[0.98] text-sm border border-red-500/20"
                                    title={t.room.resetRound}
                                >
                                    {t.room.resetRound}
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Main Game Area */}
            <div className={`
        flex-1 p-2 md:p-8 flex flex-col items-center justify-center overflow-y-auto
        ${activeTab === 'game' ? 'flex' : 'hidden md:flex'}
      `}>
                {room.gameState === 'waiting' ? (
                    <div className="text-center mt-4 md:mt-0 max-w-md mx-auto px-4">
                        <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6 animate-bounce">
                            <span className="text-4xl">👋</span>
                        </div>
                        <h2 className="text-2xl md:text-5xl font-black mb-4 bg-gradient-to-r from-white to-slate-400 text-transparent bg-clip-text">{t.room.waitingForPlayers}</h2>
                        <p className="text-slate-400 text-lg mb-8">{t.room.shareRoomCode}</p>

                        {room.wordQueue?.length > 0 && (
                            <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-xl p-4 inline-block">
                                <p className="text-sm text-indigo-300 font-medium">✨ {t.room.customQueueActive}: <span className="font-bold text-white">{room.wordQueue.length}</span> {t.room.wordsReady}</p>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="w-full max-w-lg flex flex-col items-center">
                        {room.gameState === 'finished' && (
                            <div className="mb-8 text-center glass p-6 rounded-2xl border-white/10 animate-in fade-in zoom-in duration-300">
                                <h2 className="text-3xl md:text-4xl font-black mb-2 text-white">{t.room.gameOver}</h2>
                                <p className="text-xl text-slate-300 mb-2">{t.room.theWordWas}</p>
                                <div className="text-4xl md:text-5xl font-black bg-gradient-to-r from-green-400 to-emerald-500 text-transparent bg-clip-text mb-4 tracking-widest">
                                    {room.currentWord}
                                </div>
                                {/* @ts-ignore */}
                                {room.currentSuggester && (
                                    /* @ts-ignore */
                                    <div className="inline-block bg-white/10 px-3 py-1 rounded-full text-sm text-slate-300 border border-white/5">
                                        {t.room.suggestedBy} <span className="text-indigo-300 font-bold">{room.currentSuggester}</span>
                                    </div>
                                )}
                            </div>
                        )}

                        <GameBoard
                            currentWord={room.currentWord}
                            onGuess={handleGuess}
                            gameState={myPlayer?.status === 'playing' ? 'playing' : (myPlayer?.status === 'won' ? 'won' : (myPlayer?.status === 'lost' ? 'lost' : 'finished'))}
                            guesses={parseGuesses(myPlayer?.guesses)}
                            language={room.settings.language || 'en'}
                            wordLength={room.currentWord ? room.currentWord.length : (room.settings.wordLength || 5)}
                        />
                    </div>
                )}
            </div>

            {/* Results Modal */}
            {showResultsModal && room && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
                    <div className="glass max-w-2xl w-full rounded-2xl p-6 md:p-8 border border-white/20 animate-in zoom-in duration-300">
                        <div className="text-center mb-6">
                            <h2 className="text-3xl md:text-4xl font-black mb-2 text-white">
                                {t.room.gameOver}
                            </h2>
                            {room.settings.useRoutine && (
                                <p className="text-sm text-slate-400 mb-2">
                                    Round {room.dailyRound || 1} • Game {((room.routineIndex || 1) % (room.settings.dailyRoutine?.length || 1)) + 1} of {room.settings.dailyRoutine?.length || 1}
                                </p>
                            )}
                            <p className="text-xl text-slate-300 mb-2">{t.room.theWordWas}</p>
                            <div className="text-4xl md:text-5xl font-black bg-gradient-to-r from-green-400 to-emerald-500 text-transparent bg-clip-text mb-4 tracking-widest">
                                {room.currentWord}
                            </div>
                        </div>

                        <div className="space-y-3 mb-6">
                            {playerList
                                .sort((a, b) => {
                                    // Winners first, then by guess count, then by time
                                    if (a.status === 'won' && b.status !== 'won') return -1;
                                    if (a.status !== 'won' && b.status === 'won') return 1;
                                    if (a.status === 'won' && b.status === 'won') {
                                        const aGuesses = parseGuesses(a.guesses).length;
                                        const bGuesses = parseGuesses(b.guesses).length;
                                        if (aGuesses !== bGuesses) return aGuesses - bGuesses;
                                        return (a.timeTaken || 999999) - (b.timeTaken || 999999);
                                    }
                                    return 0;
                                })
                                .map((player, index) => {
                                    const guessCount = parseGuesses(player.guesses).length;
                                    const isWinner = player.status === 'won';
                                    return (
                                        <div
                                            key={player.id}
                                            className={`flex items-center justify-between p-4 rounded-xl border transition-all ${
                                                isWinner
                                                    ? 'bg-green-500/10 border-green-500/30'
                                                    : 'bg-white/5 border-white/10'
                                            }`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                                                    isWinner
                                                        ? 'bg-green-500/20 text-green-400'
                                                        : 'bg-white/10 text-slate-400'
                                                }`}>
                                                    {index + 1}
                                                </div>
                                                <div>
                                                    <div className="font-bold text-white">{player.username}</div>
                                                    <div className="text-xs text-slate-400">
                                                        {isWinner
                                                            ? `${guessCount} ${guessCount === 1 ? 'guess' : 'guesses'}`
                                                            : 'Did not solve'
                                                        }
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                {isWinner && player.timeTaken && (
                                                    <div className="text-sm font-mono text-slate-300">
                                                        {player.timeTaken.toFixed(1)}s
                                                    </div>
                                                )}
                                                {isWinner && (
                                                    <div className="text-xs text-green-400">✓ Won</div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                        </div>

                        {room.settings.useRoutine ? (
                            <div className="text-center">
                                <p className="text-sm text-slate-400 mb-3">
                                    Next game starting in a few seconds...
                                </p>
                                <div className="flex gap-2 justify-center">
                                    <button
                                        onClick={() => {
                                            setShowResultsModal(false);
                                            setTimeout(() => startGame(), 300);
                                        }}
                                        className="bg-green-500/20 hover:bg-green-500/30 text-green-400 font-bold py-2 px-6 rounded-lg transition-all border border-green-500/20"
                                    >
                                        Start Now
                                    </button>
                                    <button
                                        onClick={() => setShowResultsModal(false)}
                                        className="bg-white/10 hover:bg-white/20 text-white font-bold py-2 px-6 rounded-lg transition-all border border-white/10"
                                    >
                                        Close
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center">
                                <button
                                    onClick={() => setShowResultsModal(false)}
                                    className="bg-white/10 hover:bg-white/20 text-white font-bold py-3 px-8 rounded-lg transition-all border border-white/10"
                                >
                                    Close
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </main>
    );
}
