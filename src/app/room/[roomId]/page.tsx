"use client";

import { useState, useEffect } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { useRoom } from "@/hooks/useRoom";
import RoomLobby from "@/components/room/RoomLobby";
import GameView from "@/components/room/GameView";
import ResultsView from "@/components/room/ResultsView";
import PlayerList from "@/components/room/PlayerList";
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
        startGame,
        submitGuess,
        updateSettings,
        resetRound,
        clearScores,
        addCustomWord,
        skipWord
    } = useRoom(roomId as string, username);

    const [activeTab, setActiveTab] = useState<'game' | 'players'>('game');

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
            <div className="bg-red-900/50 border border-red-500 rounded-xl p-6 max-w-md glass">
                <h2 className="text-xl font-bold mb-2 text-red-400">Error</h2>
                <p>{error}</p>
                <button onClick={() => router.push("/")} className="mt-4 bg-slate-700 hover:bg-slate-600 px-4 py-2 rounded-lg transition-colors">Go Home</button>
            </div>
        </div>
    );

    if (loading || !room) return (
        <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white">
            <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
                <p className="text-slate-400 text-sm animate-pulse">Connecting to room {roomId}</p>
            </div>
        </div>
    );
    const myPlayer = room.players && room.players[userId];
    const playerList = Object.values(room.players || {});
    const isHost = playerList[0]?.id === userId;

    const handleLeaveRoom = () => {
        if (confirm(t.room.confirmLeave)) {
            localStorage.removeItem(`friendle_uid_${roomId}`);
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
                        aria-label={t.room.leaveRoom}
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
                        onClick={() => setActiveTab('game')}
                        aria-pressed={activeTab === 'game'}
                        className={`px-4 py-1.5 rounded-md text-sm font-bold transition-all ${activeTab === 'game' ? 'bg-white/10 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
                    >
                        {t.room.game}
                    </button>
                    <button
                        onClick={() => setActiveTab('players')}
                        aria-pressed={activeTab === 'players'}
                        className={`px-4 py-1.5 rounded-md text-sm font-bold transition-all ${activeTab === 'players' ? 'bg-white/10 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
                    >
                        {t.room.players}
                    </button>
                </div>
            </div>

            {/* Sidebar (Desktop: always visible, Mobile: controlled by tab) */}
            <div className={`
                w-full md:w-80 glass md:border-r border-white/10 p-6 flex-col
                ${activeTab === 'players' ? 'flex' : 'hidden md:flex'}
            `}>
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
                            onClick={skipWord}
                            className="flex-1 bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 font-bold py-2 px-3 rounded-lg transition-all active:scale-[0.98] text-sm border border-yellow-500/20"
                            aria-label={t.room.skipWord}
                            title={t.room.skipWord}
                        >
                            {t.room.skipWord}
                        </button>
                        <button
                            onClick={resetRound}
                            className="flex-1 bg-red-500/20 hover:bg-red-500/30 text-red-400 font-bold py-2 px-3 rounded-lg transition-all active:scale-[0.98] text-sm border border-red-500/20"
                            aria-label={t.room.resetRound}
                            title={t.room.resetRound}
                        >
                            {t.room.resetRound}
                        </button>
                    </div>
                )}
            </div>

            {/* Main Game Area */}
            <div className={`
                flex-1 p-2 md:p-8 flex flex-col items-center justify-center overflow-y-auto
                ${activeTab === 'game' ? 'flex' : 'hidden md:flex'}
            `}>
                {room.gameState === 'waiting' ? (
                    <RoomLobby
                        room={room}
                        isHost={isHost}
                        onStartGame={startGame}
                        onUpdateSettings={updateSettings}
                        onAddCustomWord={addCustomWord}
                        onToggleRoutine={handleToggleRoutine}
                        onAddToRoutine={handleAddToRoutine}
                        onRemoveFromRoutine={handleRemoveFromRoutine}
                    />
                ) : (
                    <GameView
                        room={room}
                        myPlayer={myPlayer}
                        onGuess={submitGuess}
                    />
                )}
            </div>

            {/* Results Modal */}
            {showResults && (
                <ResultsView
                    room={room}
                    onClose={() => setResultsDismissed(true)}
                    onStartGame={startGame}
                />
            )}
        </main>
    );
}
