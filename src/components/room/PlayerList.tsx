import { RoomData, parseGuesses } from "@/hooks/useRoom";
import { useTranslation } from "@/lib/i18n";

interface PlayerListProps {
    room: RoomData;
    userId: string;
    onLeaveRoom: () => void;
    onResetScores: () => void;
    isHost: boolean;
}

export default function PlayerList({ room, userId, onLeaveRoom, onResetScores, isHost }: PlayerListProps) {
    const t = useTranslation(room.settings.language || 'en');
    const playerList = Object.values(room.players || {});

    return (
        <div className="w-full h-full flex flex-col">
            <div className="hidden md:block mb-8">
                <div className="flex items-center justify-between mb-2">
                    <h1 className="text-3xl font-black bg-gradient-to-r from-indigo-400 to-purple-400 text-transparent bg-clip-text">{t.home.title}</h1>
                    <button
                        onClick={onLeaveRoom}
                        className="text-slate-400 hover:text-white transition-colors p-2"
                        title={t.room.leaveRoom}
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                    </button>
                </div>
                <p className="text-slate-400 text-sm flex items-center gap-2">
                    {t.room.roomCode}: <span className="font-mono text-white bg-white/10 px-2 py-1 rounded select-all border border-white/5">{room.id}</span>
                </p>
            </div>

            {/* Mobile Room Code */}
            <div className="md:hidden mb-6 p-4 bg-white/5 rounded-xl text-center border border-white/5">
                <p className="text-slate-400 text-xs uppercase tracking-widest mb-1">{t.room.roomCode}</p>
                <p className="text-3xl font-mono font-bold select-all tracking-wider">{room.id}</p>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar">
                <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 flex items-center justify-between">
                    <span className="flex items-center gap-2">
                        {t.room.leaderboard} <span className="bg-white/10 px-1.5 py-0.5 rounded-full text-[10px]">{playerList.length}</span>
                    </span>
                    {isHost && playerList.some(p => p.score > 0) && (
                        <button
                            onClick={() => window.confirm("Are you sure you want to reset all scores to zero?") && onResetScores()}
                            className="text-[10px] bg-red-500/20 text-red-400 hover:bg-red-500/30 px-2 py-1 rounded transition-colors"
                            title={t.room.reset}
                        >
                            {t.room.reset}
                        </button>
                    )}
                </h2>
                <div className="space-y-2.5">
                    {playerList
                        .sort((a, b) => b.score - a.score)
                        .map((player, index) => (
                            <div key={player.id} className={`p-3.5 rounded-lg flex items-center gap-3 transition-all ${player.id === userId ? 'bg-indigo-600/15 border-2 border-indigo-500/50' : 'bg-slate-800/60 border border-slate-700 hover:border-slate-600'}`}>
                                <div className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold text-sm ${index === 0 ? 'bg-yellow-500 text-yellow-950' :
                                    index === 1 ? 'bg-slate-400 text-slate-950' :
                                        index === 2 ? 'bg-amber-700 text-amber-50' :
                                            'bg-slate-700 text-slate-300'
                                    }`}>
                                    {index + 1}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="font-semibold text-sm flex items-center gap-2 text-white">
                                        <span className="truncate">{player.username}</span>
                                        {player.id === userId && <span className="text-xs bg-indigo-500/20 text-indigo-300 px-1.5 py-0.5 rounded font-medium">You</span>}
                                    </div>
                                    <div className="text-xs text-slate-400 mt-0.5">
                                        {player.status === 'waiting' && 'Waiting...'}
                                        {player.status === 'playing' && <span className="text-yellow-400">Playing • {parseGuesses(player.guesses).length}/{room.settings.maxGuesses || 6}</span>}
                                        {player.status === 'won' && <span className="text-green-400">Solved in {player.timeTaken?.toFixed(1)}s (+{player.finalScore})</span>}
                                        {player.status === 'lost' && <span className="text-red-400">Failed</span>}
                                    </div>
                                </div>
                                <div className="text-xl font-bold text-white bg-slate-700/50 w-12 h-12 rounded-lg flex items-center justify-center border border-slate-600">{player.score}</div>
                            </div>
                        ))}
                </div>
            </div>
        </div>
    );
}
