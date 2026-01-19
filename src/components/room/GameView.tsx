import { RoomData, parseGuesses, Player } from "@/hooks/useRoom";
import GameBoard from "@/components/game/GameBoard";
import { useTranslation } from "@/lib/i18n";

interface GameViewProps {
    room: RoomData;
    myPlayer: Player | undefined;
    onGuess: (guess: string) => void;
}

export default function GameView({ room, myPlayer, onGuess }: GameViewProps) {
    const t = useTranslation(room.settings.language || 'en');

    return (
        <div className="w-full max-w-lg flex flex-col items-center">
            {myPlayer?.status === 'won' && (
                <div className="mb-4 text-center glass p-4 rounded-xl border-white/10 animate-in fade-in duration-300">
                    <p className="text-sm text-green-400">You solved it!</p>
                    <p className="text-xs text-slate-300">Score: +{myPlayer.finalScore} | Time: {myPlayer.timeTaken?.toFixed(1)}s | Attempts: {parseGuesses(myPlayer.guesses).length}</p>
                </div>
            )}

            {room.gameState === 'finished' && (
                <div className="mb-8 text-center glass p-6 rounded-2xl border-white/10 animate-in fade-in zoom-in duration-300">
                    <h2 className="text-3xl md:text-4xl font-black mb-2 text-white">{t.room.gameOver}</h2>
                    <p className="text-xl text-slate-300 mb-2">{t.room.theWordWas}</p>
                    <div className="text-4xl md:text-5xl font-black bg-gradient-to-r from-green-400 to-emerald-500 text-transparent bg-clip-text mb-4 tracking-widest">
                        {room.currentWord}
                    </div>
                </div>
            )}

            <GameBoard
                currentWord={room.currentWord}
                onGuess={onGuess}
                gameState={(() => {
                    if (room.gameState === 'finished') return 'finished';
                    if (myPlayer?.status === 'won') return 'won';
                    if (myPlayer?.status === 'lost') return 'lost';
                    if (room.gameState === 'playing') return 'playing';
                    return 'finished';
                })()}
                guesses={parseGuesses(myPlayer?.guesses)}
                language={room.settings.language || 'en'}
                wordLength={room.currentWord ? room.currentWord.length : (room.settings.wordLength || 5)}
            />
        </div>
    );
}
