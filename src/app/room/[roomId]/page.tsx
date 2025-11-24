"use client";

import { useState, useEffect } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { Loader, User as UserIcon } from "lucide-react";
import { useRoom } from "@/hooks/useRoom";
import { useUserStats } from "@/hooks/useUserStats";
import ProfileModal from "@/components/profile/ProfileModal";
import RoomContent from "@/components/room/RoomContent";
import GameView from "@/components/room/GameView";
import ResultsView from "@/components/room/ResultsView";
import PlayerList from "@/components/room/PlayerList";
import RoomSkeleton from "@/components/room/RoomSkeleton";
import { useTranslation } from "@/lib/i18n";

export default function RoomPage() {
    const { roomId } = useParams();
    const searchParams = useSearchParams();
    const username = searchParams.get("username");
    const router = useRouter();

    const {
        room,
        userId,
        loading,
        error,
        actionLoading,
        startGame,
        submitGuess,
        updateSettings,
        resetRound,
        clearScores,
        addCustomWord,
        skipWord
    } = useRoom(roomId as string, username);

    const { profile, loading: profileLoading, updateUsername } = useUserStats();
    const [isProfileModalOpen, setProfileModalOpen] = useState(false);

    const [activeTab, setActiveTab] = useState<'game' | 'players'>('game');
    const [prevTab, setPrevTab] = useState<'game' | 'players'>('game');

    const handleTabChange = (tab: 'game' | 'players') => {
        setPrevTab(activeTab);
        setActiveTab(tab);
    };

    // Always call hooks at the top level
    const [resultsDismissed, setResultsDismissed] = useState(false);

    // Reset dismissed state when game state changes to playing or waiting
    useEffect(() => {
        if (room?.gameState === 'waiting' || room?.gameState === 'playing') {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setResultsDismissed(false);
        }
    }, [room?.gameState]);

    const showResults = room?.gameState === 'finished' && !resultsDismissed;

    const t = useTranslation(room?.settings?.language || 'en');

    if (error) return (
        <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white p-4">
            <div className="bg-red-900/50 border border-red-500 rounded-xl p-6 max-w-md glass text-center">
                <h2 className="text-xl font-bold mb-2 text-red-400">Connection Error</h2>
                <p className="text-red-300 mb-4">{error}</p>
                <p className="text-sm text-slate-400 mb-6">Could not connect to the room. Please check your internet connection and try again.</p>
                <div className="flex gap-4">
                    <button onClick={() => window.location.reload()} className="flex-1 bg-purple-600 hover:bg-purple-500 px-4 py-2 rounded-lg transition-colors font-semibold">Retry</button>
                    <button onClick={() => router.push("/")} className="flex-1 bg-slate-700 hover:bg-slate-600 px-4 py-2 rounded-lg transition-colors">Go Home</button>
                </div>
            </div>
        </div>
    );

    if (loading || !room || profileLoading) return <RoomSkeleton />;
    const myPlayer = room.players && room.players[userId];
    const playerList = Object.values(room.players || {});
    const isHost = playerList[0]?.id === userId;

    const handleLeaveRoom = () => {
        if (window.confirm(t.room.confirmLeave)) {
            // No longer using localStorage for UID
            router.push('/');
        }
    };

    const handleToggleRoutine = () => {
        if (!room.settings.useRoutine && (!room.settings.dailyRoutine || room.settings.dailyRoutine.length === 0)) {
            updateSettings({
                useRoutine: true,
                dailyRoutine: [
                    { language: 'en', wordLength: 5 },
                    { language: 'he', wordLength: 5 }
                ]
            });
        } else {
            updateSettings({ useRoutine: !room.settings.useRoutine });
        }
    };

    const handleAddToRoutine = (lang: 'en' | 'he', length: 4 | 5 | 6) => {
        const currentRoutine = room.settings.dailyRoutine || [];
        updateSettings({ dailyRoutine: [...currentRoutine, { language: lang, wordLength: length }] });
    };

    const handleRemoveFromRoutine = (index: number) => {
        const currentRoutine = room.settings.dailyRoutine || [];
        updateSettings({ dailyRoutine: currentRoutine.filter((_, i) => i !== index) });
    };

    return (
        <main className="min-h-screen text-white flex flex-col md:flex-row safe-area-inset relative overflow-hidden bg-slate-900">
            {/* Background decoration */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-600/10 rounded-full blur-[100px]"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-600/10 rounded-full blur-[100px]"></div>
            </div>

            {/* Mobile Header / Tabs */}
            <div className="md:hidden glass p-3 flex justify-between items-center sticky top-0 z-10 safe-top border-b border-white/10">
                <div className="flex items-center gap-2">
                    <button
                        onClick={handleLeaveRoom}
                        className="text-slate-400 hover:text-white transition-colors"
                        title={t.room.leaveRoom}
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                    </button>
                    <h1 className="text-lg font-black bg-gradient-to-r from-indigo-400 to-purple-400 text-transparent bg-clip-text">{t.home.title}</h1>
                    <span className="text-xs bg-white/10 px-2 py-0.5 rounded font-mono border border-white/5">{roomId}</span>
                </div>
                <div className="flex gap-1 bg-black/20 rounded-lg p-1">
                    <button
                        onClick={() => handleTabChange('game')}
                        className={`px-4 py-1.5 rounded-md text-sm font-bold transition-all ${activeTab === 'game' ? 'bg-white/10 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
                    >
                        {t.room.game}
                    </button>
                    <button
                        onClick={() => handleTabChange('players')}
                        className={`px-4 py-1.5 rounded-md text-sm font-bold transition-all ${activeTab === 'players' ? 'bg-white/10 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
                    >
                        {t.room.players}
                    </button>
                </div>
                <button
                    onClick={() => setProfileModalOpen(true)}
                    className="text-slate-400 hover:text-white transition-colors"
                    title="View Profile"
                >
                    <UserIcon />
                </button>
            </div>

            {/* Mobile Content Area */}
            <div className="md:hidden flex-1 relative">
                {/* Players List */}
                <div className={`
                    absolute top-0 left-0 w-full h-full p-6 flex-col
                    transition-transform duration-300 ease-in-out
                    ${activeTab === 'players' ? 'translate-x-0' : (prevTab === 'players' ? '-translate-x-full' : 'translate-x-full')}
                `}>
                    <PlayerList
                        room={room}
                        userId={userId}
                        onLeaveRoom={handleLeaveRoom}
                        onResetScores={clearScores}
                        isHost={isHost}
                    />
                </div>

                {/* Main Game Area */}
                <div className={`
                    absolute top-0 left-0 w-full h-full p-2 flex flex-col items-center justify-center overflow-y-auto
                    transition-transform duration-300 ease-in-out
                    ${activeTab === 'game' ? 'translate-x-0' : (prevTab === 'game' ? 'translate-x-full' : '-translate-x-full')}
                `}>
                    <RoomContent
                        room={room}
                        myPlayer={myPlayer}
                        isHost={isHost}
                        actionLoading={actionLoading}
                        startGame={startGame}
                        updateSettings={updateSettings}
                        addCustomWord={addCustomWord}
                        handleToggleRoutine={handleToggleRoutine}
                        handleAddToRoutine={handleAddToRoutine}
                        handleRemoveFromRoutine={handleRemoveFromRoutine}
                        submitGuess={submitGuess}
                    />
                </div>
            </div>

            {/* --- Desktop Layout --- */}

            {/* Sidebar (Desktop only) */}
            <div className="w-full md:w-80 glass md:border-r border-white/10 p-6 flex-col hidden md:flex">
                <PlayerList
                    room={room}
                    userId={userId}
                    onLeaveRoom={handleLeaveRoom}
                    onResetScores={clearScores}
                    isHost={isHost}
                />

                {room.gameState !== 'waiting' && room.gameState !== 'finished' && isHost && (
                    <div className="mt-4 flex gap-2">
                        <button
                            onClick={() => window.confirm("Are you sure you want to skip this word for everyone?") && skipWord()}
                            className="flex-1 bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 font-bold py-2 px-3 rounded-lg transition-all active:scale-[0.98] text-sm border border-yellow-500/20"
                            title={t.room.skipWord}
                        >
                            {t.room.skipWord}
                        </button>
                        <button
                            onClick={() => window.confirm("Are you sure you want to reset the round? This will end the current game for everyone.") && resetRound()}
                            disabled={actionLoading === 'reset'}
                            className="flex-1 bg-red-500/20 hover:bg-red-500/30 text-red-400 font-bold py-2 px-3 rounded-lg transition-all active:scale-[0.98] text-sm border border-red-500/20 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            title={t.room.resetRound}
                        >
                            {actionLoading === 'reset' && <Loader className="animate-spin" size={16} />}
                            {t.room.resetRound}
                        </button>
                    </div>
                )}
            </div>

            {/* Main Game Area (Desktop only) */}
            <div className="flex-1 p-2 md:p-8 flex-col items-center justify-center overflow-y-auto hidden md:flex">
                <RoomContent
                    room={room}
                    myPlayer={myPlayer}
                    isHost={isHost}
                    actionLoading={actionLoading}
                    startGame={startGame}
                    updateSettings={updateSettings}
                    addCustomWord={addCustomWord}
                    handleToggleRoutine={handleToggleRoutine}
                    handleAddToRoutine={handleAddToRoutine}
                    handleRemoveFromRoutine={handleRemoveFromRoutine}
                    submitGuess={submitGuess}
                />
            </div>

            {/* Results Modal */}
            {showResults && (
                <ResultsView
                    room={room}
                    onClose={() => setResultsDismissed(true)}
                    onStartGame={startGame}
                    onResetRound={resetRound}
                />
            )}

            {/* Profile Modal */}
            {isProfileModalOpen && profile && (
                <ProfileModal
                    profile={profile}
                    updateUsername={updateUsername}
                    onClose={() => setProfileModalOpen(false)}
                />
            )}
        </main>
    );
}
