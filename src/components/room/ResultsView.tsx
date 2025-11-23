import { RoomData, parseGuesses } from "@/hooks/useRoom";
import { useTranslation } from "@/lib/i18n";
import { useEffect } from "react";

interface ResultsViewProps {
    room: RoomData;
    onClose: () => void;
    onStartGame: () => void;
}

export default function ResultsView({ room, onClose, onStartGame }: ResultsViewProps) {
    const t = useTranslation(room.settings.language || 'en');
    const playerList = Object.values(room.players || {});

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };

        document.addEventListener('keydown', handleKeyDown);

        return () => {
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [onClose]);

    return (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="results-title">
            <div className="bg-slate-900 max-w-lg w-full rounded-xl p-6 border border-slate-700 shadow-2xl">
                <div className="text-center mb-6">
                    <h2 className="text-2xl md:text-3xl font-bold mb-2 text-white" id="results-title">
                        {t.room.gameOver}
                    </h2>
                    {room.settings.useRoutine && (
                        <p className="text-xs text-slate-400 mb-3">
                            Round {room.dailyRound || 1} • Game {((room.routineIndex || 1) % (room.settings.dailyRoutine?.length || 1)) + 1} of {room.settings.dailyRoutine?.length || 1}
                        </p>
                    )}
                    <p className="text-sm text-slate-400 mb-2">{t.room.theWordWas}</p>
                    <div className="text-3xl md:text-4xl font-bold text-green-400 mb-4 tracking-wide">
                        {room.currentWord}
                    </div>
                </div>

                <div className="space-y-3 mb-6 max-h-[40vh] overflow-y-auto custom-scrollbar">
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
                                    className={`flex items-center justify-between p-3 rounded-lg border ${isWinner
                                            ? 'bg-green-500/10 border-green-500/40'
                                            : 'bg-slate-800/60 border-slate-700'
                                        }`}
                                >
                                    <div className="flex items-center gap-2.5">
                                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-semibold text-xs ${isWinner
                                                ? 'bg-green-500/20 text-green-400'
                                                : 'bg-slate-700 text-slate-400'
                                            }`}>
                                            {index + 1}
                                        </div>
                                        <div>
                                            <div className="font-semibold text-sm text-white">{player.username}</div>
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
                                            <div className="text-sm font-semibold text-slate-200">
                                                {player.timeTaken.toFixed(1)}s
                                            </div>
                                        )}
                                        {isWinner && (
                                            <div className="text-xs text-green-400">Won</div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                </div>

                {room.settings.useRoutine ? (
                    <div className="text-center">
                        <p className="text-xs text-slate-400 mb-3">
                            Next game starts soon...
                        </p>
                        <div className="flex gap-2 justify-center">
                            <button
                                onClick={() => {
                                    onClose();
                                    setTimeout(() => onStartGame(), 300);
                                }}
                                className="bg-green-600 hover:bg-green-500 text-white font-semibold py-2.5 px-6 rounded-lg transition-all"
                            >
                                Start Now
                            </button>
                            <button
                                onClick={onClose}
                                className="bg-slate-700 hover:bg-slate-600 text-white font-semibold py-2.5 px-6 rounded-lg transition-all"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="text-center">
                        <button
                            onClick={onClose}
                            className="bg-slate-700 hover:bg-slate-600 text-white font-semibold py-3 px-8 rounded-lg transition-all"
                        >
                            Close
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
