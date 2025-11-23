import { useState } from "react";
import { RoomData, parseGuesses, parseStats, PlayerStats } from "@/hooks/useRoom";
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
    const [showStats, setShowStats] = useState(false);

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
                <p className="text-3xl font-mono font-bold select-all tracking-wider">{room.id}</p>
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
                                        <span className={`w-2 h-2 rounded-full ${player.online ? 'bg-green-500' : 'bg-slate-600'}`}></span>
                                        <span className="truncate">{player.username}</span>
                                        {player.id === userId && <span className="text-xs bg-indigo-500/20 text-indigo-300 px-1.5 py-0.5 rounded font-medium">You</span>}
                                    </div>
                                    <div className="text-xs text-slate-400 mt-0.5 pl-4">
                                        {player.status === 'waiting' && 'Waiting...'}
                                        {player.status === 'playing' && <span className="text-yellow-400">Playing • {parseGuesses(player.guesses).length}/{room.settings.maxGuesses || 6}</span>}
                                        {player.status === 'won' && <span className="text-green-400">Solved • {player.timeTaken?.toFixed(1)}s</span>}
                                        {player.status === 'lost' && <span className="text-red-400">Failed</span>}
                                    </div>
                                </div>
                                <div className="text-xl font-bold text-white bg-slate-700/50 w-12 h-12 rounded-lg flex items-center justify-center border border-slate-600">{player.score}</div>
                            </div>
                        ))}
                </div>

                {/* Stats Section */}
                {userId && room.players[userId] && (
                    <div className="mt-6">
                        <button
                            onClick={() => setShowStats(!showStats)}
                            className="w-full flex items-center justify-between p-3 bg-slate-800/60 hover:bg-slate-800/80 rounded-lg border border-slate-700 transition-all"
                        >
                            <span className="text-sm font-semibold text-slate-200">📊 Your Stats</span>
                            <span className="text-xs text-slate-400">{showStats ? '▼' : '▶'}</span>
                        </button>

                        {showStats && (
                            <div className="space-y-2.5 mt-3">
                                {(Object.keys(parseStats(room.players[userId].stats)) as Array<keyof PlayerStats>).map((categoryKey) => {
                                    const stats = parseStats(room.players[userId].stats)[categoryKey];
                                    if (!stats || stats.games === 0) return null;

                                    const [lang, length] = categoryKey.split('-');
                                    const winRate = ((stats.wins / stats.games) * 100).toFixed(0);

                                    return (
                                        <div key={categoryKey} className="p-3.5 bg-slate-800/60 rounded-lg border border-slate-700">
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
        </div>
    );
}
