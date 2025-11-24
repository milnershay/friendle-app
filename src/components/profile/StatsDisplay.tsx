import { UserStats } from "@/hooks/useUserStats";
import { TrendingUp, TrendingDown, Repeat, Clock, Star, BarChart2 } from "lucide-react";

interface StatCardProps {
    icon: React.ReactNode;
    label: string;
    value: string | number;
    color: string;
}

const StatCard: React.FC<StatCardProps> = ({ icon, label, value, color }) => (
    <div className="bg-slate-800/50 p-4 rounded-lg flex flex-col items-center justify-center text-center">
        <div className={`mb-2 text-${color}-400`}>{icon}</div>
        <p className="text-sm text-slate-300 font-medium">{label}</p>
        <p className={`text-2xl font-bold text-${color}-300`}>{value}</p>
    </div>
);

interface Props {
    stats: UserStats;
}

const StatsDisplay: React.FC<Props> = ({ stats }) => {
    return (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4 text-white">
            <StatCard icon={<BarChart2 />} label="Total Games" value={stats.totalGames} color="blue" />
            <StatCard icon={<TrendingUp />} label="Win %" value={`${stats.totalGames > 0 ? ((stats.totalWins / stats.totalGames) * 100).toFixed(0) : 0}%`} color="green" />
            <StatCard icon={<TrendingDown />} label="Current Streak" value={stats.currentStreak} color="yellow" />
            <StatCard icon={<Repeat />} label="Max Streak" value={stats.maxStreak} color="purple" />
            <StatCard icon={<Clock />} label="Avg. Time" value={`${stats.avgTime.toFixed(1)}s`} color="cyan" />
            <StatCard icon={<Star />} label="Best Time" value={stats.bestTime ? `${stats.bestTime.toFixed(1)}s` : 'N/A'} color="pink" />
        </div>
    );
};

export default StatsDisplay;
