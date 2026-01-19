import { RoomData, RoomSettings } from "@/hooks/useRoom";
import { useTranslation } from "@/lib/i18n";
import { Loader } from "lucide-react";
import toast from "react-hot-toast";

interface RoomLobbyProps {
    room: RoomData;
    isHost: boolean;
    loading: string | null;
    onStartGame: () => void;
    onUpdateSettings: (settings: Partial<RoomSettings>) => void;
}

export default function RoomLobby({
    room,
    isHost,
    onStartGame,
    onUpdateSettings,
    loading
}: RoomLobbyProps) {
    const t = useTranslation(room.settings.language || 'en');

    const handleCopyRoomCode = () => {
        navigator.clipboard.writeText(room.id);
        toast.success(t.room.codeCopied);
    };

    return (
        <div className="w-full max-w-md mx-auto p-6">
            <div className="text-center mb-10">
                <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-3xl">👋</span>
                </div>
                <h2 className="text-2xl md:text-3xl font-black mb-2 bg-gradient-to-r from-white to-slate-400 text-transparent bg-clip-text">
                    {t.room.waitingForPlayers}
                </h2>
                <p className="text-slate-400 mb-6">{t.room.shareRoomCode}</p>

                <button
                    onClick={handleCopyRoomCode}
                    className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 inline-flex items-center gap-4 group hover:bg-slate-800 transition-colors"
                >
                    <span className="text-slate-400 text-sm uppercase tracking-wider">{t.room.roomCode || "Room Code"}</span>
                    <span className="text-2xl font-mono font-bold text-white">{room.id}</span>
                    <svg className="w-5 h-5 text-slate-500 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                </button>
            </div>

            {isHost ? (
                <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-6 mb-6">
                    <h3 className="font-bold text-white mb-4 flex items-center gap-2">
                        <span className="w-1 h-5 bg-indigo-500 rounded-full"></span>
                        {t.room.gameSettings}
                    </h3>

                    <div className="space-y-4">
                        {/* Language */}
                        <div>
                            <label className="block text-sm font-medium text-slate-400 mb-2">{t.room.language || "Language"}</label>
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
                            <label className="block text-sm font-medium text-slate-400 mb-2">{t.room.wordLength || "Word Length"}</label>
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
                </div>
            ) : (
                <div className="text-center mb-6">
                    <p className="text-slate-400">Waiting for the host to start...</p>
                </div>
            )}

            <button
                onClick={onStartGame}
                disabled={!isHost || loading === 'start'}
                className="w-full bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold py-4 px-6 rounded-xl text-lg shadow-lg shadow-green-900/20 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:from-slate-600 disabled:to-slate-700 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-2"
            >
                {loading === 'start' && <Loader className="animate-spin" size={20} />}
                {isHost ? t.room.startGame : "Waiting for Host"}
            </button>
        </div>
    );
}
