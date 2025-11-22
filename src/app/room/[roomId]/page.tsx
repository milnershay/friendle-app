"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import { ref, onValue, set, update, get, onDisconnect } from "firebase/database";
import GameBoard from "@/components/game/GameBoard";
import { WORD_LISTS } from "@/lib/wordLists";
import { useTranslation, getStoredLanguage, type Language } from "@/lib/i18n";

interface Player {
    id: string;
    username: string;
    score: number;
    status: 'waiting' | 'playing' | 'won' | 'lost';
    guesses?: string[];
    timeTaken?: number;
    endTime?: number;
}

interface RoomSettings {
    wordLength: number;
    customQueue: { word: string; suggester: string }[];
    maxGuesses?: number;
    language: 'en' | 'he';
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
                        [storedId]: { id: storedId, username: username!, score: 0, status: 'waiting', guesses: [] }
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
                        [storedId]: { id: storedId, username: username!, score: 0, status: 'waiting', guesses: [] }
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

            if (newQueue.length > 0) {
                wordObj = newQueue.shift();
            } else {
                const lang = room.settings.language || 'en';
                const len = room.settings.wordLength || 5;
                // @ts-ignore
                const words = WORD_LISTS[lang]?.[len] || WORD_LISTS.en[5];
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
                    guesses: [],
                };
                // Remove endTime and timeTaken properties entirely
                delete updatedPlayers[key].endTime;
                delete updatedPlayers[key].timeTaken;
            });

            console.log("Starting game with word:", word);

            update(ref(db, `rooms/${roomId}`), {
                currentWord: word?.toUpperCase(),
                currentSuggester: wordObj?.suggester || null,
                gameState: 'playing',
                startTime: Date.now(),
                wordQueue: newQueue,
                players: updatedPlayers
            }).then(() => {
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

        const newGuesses = [...(player.guesses || []), guess];
        let newStatus = player.status;
        let newScore = player.score;

        const updateData: any = {
            guesses: newGuesses,
            status: newStatus,
            score: newScore,
        };

        if (guess === room.currentWord) {
            newStatus = 'won';
            const endTime = Date.now();
            const timeTaken = (endTime - room.startTime) / 1000;
            newScore += 1;
            updateData.status = 'won';
            updateData.score = newScore;
            updateData.endTime = endTime;
            updateData.timeTaken = timeTaken;
        } else if (newGuesses.length >= (room.settings.maxGuesses || 6)) {
            newStatus = 'lost';
            updateData.status = 'lost';
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
            update(ref(db, `rooms/${roomId}`), {
                gameState: 'finished'
            });
        }
    }, [room, roomId]);


    const updateSettings = (newSettings: Partial<RoomSettings>) => {
        if (room) {
            update(ref(db, `rooms/${roomId}/settings`), newSettings);
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
                guesses: [],
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
                    <h1 className="text-lg font-black bg-gradient-to-r from-indigo-400 to-purple-400 text-transparent bg-clip-text">Friendle</h1>
                    <span className="text-xs bg-white/10 px-2 py-0.5 rounded font-mono border border-white/5">{roomId}</span>
                </div>
                <div className="flex gap-1 bg-black/20 rounded-lg p-1">
                    <button
                        onClick={() => setActiveTab('game')}
                        className={`px-4 py-1.5 rounded-md text-sm font-bold transition-all ${activeTab === 'game' ? 'bg-white/10 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
                    >
                        Game
                    </button>
                    <button
                        onClick={() => setActiveTab('players')}
                        className={`px-4 py-1.5 rounded-md text-sm font-bold transition-all ${activeTab === 'players' ? 'bg-white/10 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
                    >
                        Players
                    </button>
                </div>
            </div>

            {/* Sidebar (Desktop: always visible, Mobile: controlled by tab) */}
            <div className={`
        w-full md:w-80 glass md:border-r border-white/10 p-6 flex-col
        ${activeTab === 'players' ? 'flex' : 'hidden md:flex'}
      `}>
                <div className="hidden md:block mb-8">
                    <h1 className="text-3xl font-black bg-gradient-to-r from-indigo-400 to-purple-400 text-transparent bg-clip-text mb-2">Friendle</h1>
                    <p className="text-slate-400 text-sm flex items-center gap-2">
                        Room: <span className="font-mono text-white bg-white/10 px-2 py-1 rounded select-all border border-white/5">{roomId}</span>
                    </p>
                </div>

                {/* Mobile Room Code */}
                <div className="md:hidden mb-6 p-4 bg-white/5 rounded-xl text-center border border-white/5">
                    <p className="text-slate-400 text-xs uppercase tracking-widest mb-1">Room Code</p>
                    <p className="text-3xl font-mono font-bold select-all tracking-wider">{roomId}</p>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 flex items-center justify-between">
                        <span className="flex items-center gap-2">
                            Leaderboard <span className="bg-white/10 px-1.5 py-0.5 rounded-full text-[10px]">{playerList.length}</span>
                        </span>
                        {isHost && playerList.some(p => p.score > 0) && (
                            <button
                                onClick={clearScores}
                                className="text-[10px] bg-red-500/20 text-red-400 hover:bg-red-500/30 px-2 py-1 rounded transition-colors"
                                title="Reset all scores"
                            >
                                Reset
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
                                            {player.status === 'playing' && <span className="text-yellow-400">⚡ Playing ({player.guesses?.length || 0}/{room.settings.maxGuesses || 6})</span>}
                                            {player.status === 'won' && <span className="text-green-400 font-bold">✓ Solved ({player.timeTaken?.toFixed(1)}s)</span>}
                                            {player.status === 'lost' && <span className="text-red-400">✗ Failed</span>}
                                        </div>
                                    </div>
                                    <div className="text-2xl font-black text-slate-300 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 w-12 h-12 rounded-xl flex items-center justify-center border border-white/10">{player.score}</div>
                                </div>
                            ))}
                    </div>
                </div>

                {isHost && room.gameState === 'waiting' && (
                    <div className="mt-6 p-5 bg-white/5 rounded-xl border border-white/10">
                        <h3 className="font-bold mb-4 text-xs uppercase text-slate-400 tracking-widest">Game Settings</h3>
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
                        </div>
                    </div>
                )}

                {room.gameState === 'waiting' || room.gameState === 'finished' ? (
                    <button
                        onClick={startGame}
                        className="mt-6 w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 text-white font-bold py-4 px-4 rounded-xl transition-all active:scale-[0.98] shadow-lg shadow-green-900/20 text-lg uppercase tracking-wide"
                    >
                        {room.gameState === 'finished' ? 'Play Again' : 'Start Game'}
                    </button>
                ) : (
                    <div className="mt-6 space-y-2">
                        <div className="text-center p-4 bg-white/5 rounded-xl border border-white/5">
                            <div className="animate-pulse text-indigo-400 font-bold mb-1">Game in progress...</div>
                            <div className="text-xs text-slate-400">Switch to Game tab to play</div>
                        </div>
                        {isHost && (
                            <div className="flex gap-2">
                                <button
                                    onClick={skipWord}
                                    className="flex-1 bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 font-bold py-2 px-3 rounded-lg transition-all active:scale-[0.98] text-sm border border-yellow-500/20"
                                    title="End current round"
                                >
                                    Skip Word
                                </button>
                                <button
                                    onClick={resetRound}
                                    className="flex-1 bg-red-500/20 hover:bg-red-500/30 text-red-400 font-bold py-2 px-3 rounded-lg transition-all active:scale-[0.98] text-sm border border-red-500/20"
                                    title="Reset to waiting"
                                >
                                    Reset Round
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
                    <div className="text-center mt-10 md:mt-0 max-w-md mx-auto">
                        <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6 animate-bounce">
                            <span className="text-4xl">👋</span>
                        </div>
                        <h2 className="text-3xl md:text-5xl font-black mb-4 bg-gradient-to-r from-white to-slate-400 text-transparent bg-clip-text">Waiting for players...</h2>
                        <p className="text-slate-400 text-lg mb-8">Share the room code with your friends to start playing!</p>

                        {room.wordQueue?.length > 0 && (
                            <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-xl p-4 inline-block">
                                <p className="text-sm text-indigo-300 font-medium">✨ Custom Word Queue Active: <span className="font-bold text-white">{room.wordQueue.length}</span> words ready.</p>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="w-full max-w-lg flex flex-col items-center">
                        {room.gameState === 'finished' && (
                            <div className="mb-8 text-center glass p-6 rounded-2xl border-white/10 animate-in fade-in zoom-in duration-300">
                                <h2 className="text-3xl md:text-4xl font-black mb-2 text-white">Game Over! 🎉</h2>
                                <p className="text-xl text-slate-300 mb-2">The word was</p>
                                <div className="text-4xl md:text-5xl font-black bg-gradient-to-r from-green-400 to-emerald-500 text-transparent bg-clip-text mb-4 tracking-widest">
                                    {room.currentWord}
                                </div>
                                {/* @ts-ignore */}
                                {room.currentSuggester && (
                                    /* @ts-ignore */
                                    <div className="inline-block bg-white/10 px-3 py-1 rounded-full text-sm text-slate-300 border border-white/5">
                                        💡 Suggested by <span className="text-indigo-300 font-bold">{room.currentSuggester}</span>
                                    </div>
                                )}
                            </div>
                        )}

                        <GameBoard
                            currentWord={room.currentWord}
                            onGuess={handleGuess}
                            gameState={myPlayer?.status === 'playing' ? 'playing' : (myPlayer?.status === 'won' ? 'won' : (myPlayer?.status === 'lost' ? 'lost' : 'finished'))}
                            guesses={myPlayer?.guesses || []}
                            language={room.settings.language || 'en'}
                            wordLength={room.currentWord ? room.currentWord.length : (room.settings.wordLength || 5)}
                        />
                    </div>
                )}
            </div>
        </main>
    );
}
