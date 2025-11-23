import { useState } from "react";
import toast from "react-hot-toast";
import { RoomData, RoomSettings } from "@/hooks/useRoom";
import { useTranslation } from "@/lib/i18n";
import { Loader } from "lucide-react";

interface RoomLobbyProps {
    room: RoomData;
    isHost: boolean;
    loading: string | null;
    onStartGame: () => void;
    onUpdateSettings: (settings: Partial<RoomSettings>) => void;
    onAddCustomWord: (word: string) => void;
    onToggleRoutine: () => void;
    onAddToRoutine: (lang: 'en' | 'he', length: 4 | 5 | 6) => void;
    onRemoveFromRoutine: (index: number) => void;
}

export default function RoomLobby({
    room,
    isHost,
    onStartGame,
    onUpdateSettings,
    onAddCustomWord,
    onToggleRoutine,
    onAddToRoutine,
    onRemoveFromRoutine,
    loading
}: RoomLobbyProps) {
    const t = useTranslation(room.settings.language || 'en');
    const [newWord, setNewWord] = useState("");
    const [routineLang, setRoutineLang] = useState<'en' | 'he'>('en');
    const [routineLength, setRoutineLength] = useState<4 | 5 | 6>(5);

    const handleAddWord = () => {
        const trimmedWord = newWord.trim().toUpperCase();
        if (!trimmedWord) return;

        if (trimmedWord.length !== room.settings.wordLength) {
            toast.error(`Word must be ${room.settings.wordLength} letters long.`);
            return;
        }

        if (room.wordQueue?.some(item => item.word === trimmedWord)) {
            toast.error("Word is already in the queue.");
            return;
        }

        onAddCustomWord(trimmedWord);
        setNewWord("");
        toast.success(`"${trimmedWord}" added to the queue.`);
    };

    const handleCopyRoomCode = () => {
        navigator.clipboard.writeText(room.id);
        toast.success(t.room.codeCopied);
    };

    return (
        <div className="w-full max-w-2xl mx-auto p-6">
            <div className="text-center mb-12">
                <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6 animate-bounce">
                    <span className="text-4xl">👋</span>
                </div>
                <h2 className="text-3xl md:text-5xl font-black mb-4 bg-gradient-to-r from-white to-slate-400 text-transparent bg-clip-text">
                    {t.room.waitingForPlayers}
                </h2>
                <p className="text-slate-400 text-lg mb-8">{t.room.shareRoomCode}</p>

                <button
                    onClick={handleCopyRoomCode}
                    className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 inline-flex items-center gap-4 group hover:bg-slate-800 transition-colors"
                    title="Copy to clipboard"
                >
                    <span className="text-slate-400 text-sm uppercase tracking-wider">Room Code</span>
                    <span className="text-2xl font-mono font-bold text-white">{room.id}</span>
                    <svg
                        className="w-5 h-5 text-slate-500 group-hover:text-white transition-colors"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                        />
                    </svg>
                </button>
            </div>

            {!isHost && (
                <div className="text-center mb-8">
                    <p className="text-slate-400 text-lg">Waiting for the host to start the game...</p>
                </div>
            )}

            {isHost && (
                <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-6 mb-8 backdrop-blur-sm">
                    <h3 className="font-bold text-lg text-white mb-6 flex items-center gap-2">
                        <span className="w-1 h-6 bg-indigo-500 rounded-full"></span>
                        Host Controls
                    </h3>

                    <div className="grid gap-6 md:grid-cols-2">
                        {/* Language */}
                        <div>
                            <label className="block text-sm font-medium text-slate-400 mb-2">Language</label>
                            <div className="flex bg-slate-900/50 rounded-lg p-1 border border-slate-700">
                                <button
                                    onClick={() => onUpdateSettings({ language: 'en' })}
                                    className={`flex-1 py-2 rounded-md text-sm font-bold transition-all ${room.settings.language === 'en' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                                >
                                    English
                                </button>
                                <button
                                    onClick={() => onUpdateSettings({ language: 'he' })}
                                    className={`flex-1 py-2 rounded-md text-sm font-bold transition-all ${room.settings.language === 'he' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                                >
                                    עברית
                                </button>
                            </div>
                        </div>

                        {/* Word Length */}
                        <div>
                            <label className="block text-sm font-medium text-slate-400 mb-2">Word Length</label>
                            <div className="flex bg-slate-900/50 rounded-lg p-1 border border-slate-700">
                                {[4, 5, 6].map(len => (
                                    <button
                                        key={len}
                                        onClick={() => onUpdateSettings({ wordLength: len })}
                                        className={`flex-1 py-2 rounded-md text-sm font-bold transition-all ${room.settings.wordLength === len ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                                    >
                                        {len}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Custom Queue */}
                    <div className="mt-6 pt-6 border-t border-slate-700/50">
                        <label className="block text-sm font-medium text-slate-400 mb-2">
                            Custom Words ({room.wordQueue?.length || 0})
                        </label>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={newWord}
                                onChange={(e) => setNewWord(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleAddWord()}
                                className="flex-1 bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-2 text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 transition-colors"
                                placeholder="Add a custom word..."
                            />
                            <button
                                onClick={handleAddWord}
                                className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg font-bold transition-colors"
                            >
                                +
                            </button>
                        </div>
                    </div>

                    {/* Daily Routine */}
                    <div className="mt-6 pt-6 border-t border-slate-700/50">
                        <div className="flex items-center justify-between mb-4">
                            <label className="text-sm font-medium text-slate-400">Daily Routine Mode</label>
                            <button
                                onClick={onToggleRoutine}
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${room.settings.useRoutine ? 'bg-green-500' : 'bg-slate-700'}`}
                            >
                                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${room.settings.useRoutine ? 'translate-x-6' : 'translate-x-1'}`} />
                            </button>
                        </div>

                        {room.settings.useRoutine && (
                            <div className="bg-slate-900/30 rounded-lg p-4 border border-slate-700/50">
                                <div className="flex gap-2 mb-4">
                                    <select
                                        value={routineLang}
                                        onChange={(e) => setRoutineLang(e.target.value as 'en' | 'he')}
                                        className="bg-slate-800 border border-slate-600 rounded px-2 py-1 text-sm"
                                    >
                                        <option value="en">EN</option>
                                        <option value="he">HE</option>
                                    </select>
                                    <select
                                        value={routineLength}
                                        onChange={(e) => setRoutineLength(Number(e.target.value) as 4 | 5 | 6)}
                                        className="bg-slate-800 border border-slate-600 rounded px-2 py-1 text-sm"
                                    >
                                        <option value={4}>4</option>
                                        <option value={5}>5</option>
                                        <option value={6}>6</option>
                                    </select>
                                    <button
                                        onClick={() => onAddToRoutine(routineLang, routineLength)}
                                        className="text-xs bg-indigo-600 px-3 py-1 rounded font-bold"
                                    >
                                        Add
                                    </button>
                                </div>

                                <div className="space-y-2 max-h-40 overflow-y-auto">
                                    {room.settings.dailyRoutine?.map((game, i) => (
                                        <div key={i} className="flex justify-between items-center bg-slate-800 px-3 py-2 rounded text-sm">
                                            <span>{i + 1}. {game.language.toUpperCase()}-{game.wordLength}</span>
                                            <button onClick={() => onRemoveFromRoutine(i)} className="text-red-400 hover:text-red-300">×</button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            <button
                onClick={onStartGame}
                disabled={!isHost || loading === 'start'}
                className="w-full bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold py-4 px-6 rounded-xl text-xl shadow-lg shadow-green-900/20 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:from-slate-600 disabled:to-slate-700 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-2"
            >
                {loading === 'start' && <Loader className="animate-spin" size={20} />}
                {isHost ? t.room.startGame : 'Waiting for Host'}
            </button>
        </div>
    );
}
