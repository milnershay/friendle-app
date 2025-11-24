import { Trophy } from "lucide-react";

const achievementDetails: { [key: string]: { name: string; description: string } } = {
    'first_win': { name: 'First Victory', description: 'Win your first game.' },
    '5_win_streak': { name: 'On a Roll', description: 'Achieve a 5 win streak.' },
    '10_games_played': { name: 'Getting Started', description: 'Play 10 games.' },
    'perfect_game': { name: 'Flawless', description: 'Win a game in a single guess.' },
    'speed_demon': { name: 'Speed Demon', description: 'Win a game in under 30 seconds.' },
};

interface Props {
    achievements: string[];
}

const AchievementsList: React.FC<Props> = ({ achievements }) => {
    return (
        <div>
            <h3 className="text-lg font-bold text-yellow-400 mb-2">Achievements</h3>
            {achievements.length === 0 ? (
                <p className="text-slate-400 italic">No achievements unlocked yet. Keep playing!</p>
            ) : (
                <div className="space-y-2">
                    {achievements.map(id => (
                        <div key={id} className="flex items-center gap-3 bg-slate-800/50 p-3 rounded-lg">
                            <Trophy className="text-yellow-500" />
                            <div>
                                <h4 className="font-semibold text-white">{achievementDetails[id]?.name || 'Unknown Achievement'}</h4>
                                <p className="text-sm text-slate-300">{achievementDetails[id]?.description || '...'}</p>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default AchievementsList;
