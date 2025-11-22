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
            {room.gameState === 'finished' && (
                <div className="mb-8 text-center glass p-6 rounded-2xl border-white/10 animate-in fade-in zoom-in duration-300">
                    <h2 className="text-3xl md:text-4xl font-black mb-2 text-white">{t.room.gameOver}</h2>
                    <p className="text-xl text-slate-300 mb-2">{t.room.theWordWas}</p>
                    <div className="text-4xl md:text-5xl font-black bg-gradient-to-r from-green-400 to-emerald-500 text-transparent bg-clip-text mb-4 tracking-widest">
                        {room.currentWord}
                    </div>
                    {room.currentSuggester && (
                        <div className="inline-block bg-white/10 px-3 py-1 rounded-full text-sm text-slate-300 border border-white/5">
                            {t.room.suggestedBy} <span className="text-indigo-300 font-bold">{room.currentSuggester}</span>
                        </div>
                    )}
                </div>
            )}

            <GameBoard
                currentWord={room.currentWord}
                onGuess={onGuess}
                gameState={myPlayer?.status === 'playing' ? 'playing' : (myPlayer?.status === 'won' ? 'won' : (myPlayer?.status === 'lost' ? 'lost' : 'finished'))}
                guesses={parseGuesses(myPlayer?.guesses)}
                language={room.settings.language || 'en'}
                wordLength={room.currentWord ? room.currentWord.length : (room.settings.wordLength || 5)}
            />
        </div>
    );
}
