"use client";

import { useState } from "react";
import { cleanupOldRooms, getRoomStats } from "@/lib/roomCleanup";
import { useRouter } from "next/navigation";

export default function AdminPage() {
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<string>("");
    const router = useRouter();

    const loadStats = async () => {
        setLoading(true);
        try {
            const data = await getRoomStats();
            setStats(data);
            setResult("");
        } catch (error) {
            setResult(`Error loading stats: ${error}`);
        } finally {
            setLoading(false);
        }
    };

    const runCleanup = async (hours: number) => {
        setLoading(true);
        setResult("");
        try {
            const { deleted, total } = await cleanupOldRooms(hours);
            setResult(`Cleanup complete: Deleted ${deleted} out of ${total} rooms`);
            // Reload stats after cleanup
            await loadStats();
        } catch (error) {
            setResult(`Error during cleanup: ${error}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <main className="min-h-screen text-white flex flex-col items-center justify-center p-4 md:p-24 relative overflow-hidden">
            {/* Background decoration */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-600/20 rounded-full blur-[100px]"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-600/20 rounded-full blur-[100px]"></div>
            </div>

            <div className="max-w-2xl w-full">
                <div className="flex items-center justify-between mb-8">
                    <h1 className="text-4xl md:text-5xl font-black bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 text-transparent bg-clip-text">
                        Room Admin
                    </h1>
                    <button
                        onClick={() => router.push("/")}
                        className="bg-slate-700 hover:bg-slate-600 px-4 py-2 rounded-lg transition-colors text-sm"
                    >
                        ← Back to Home
                    </button>
                </div>

                <div className="glass p-6 rounded-2xl mb-6">
                    <h2 className="text-xl font-bold mb-4 text-indigo-400">Room Statistics</h2>
                    <button
                        onClick={loadStats}
                        disabled={loading}
                        className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-600 text-white font-bold py-2 px-6 rounded-lg transition-all active:scale-[0.98] mb-4"
                    >
                        {loading ? "Loading..." : "Load Stats"}
                    </button>

                    {stats && (
                        <div className="grid grid-cols-2 gap-4 mt-4">
                            <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                                <div className="text-3xl font-black text-indigo-400">{stats.totalRooms}</div>
                                <div className="text-sm text-slate-400">Total Rooms</div>
                            </div>
                            <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                                <div className="text-3xl font-black text-green-400">{stats.activeRooms}</div>
                                <div className="text-sm text-slate-400">Active Rooms</div>
                            </div>
                            <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                                <div className="text-3xl font-black text-yellow-400">{stats.oldRooms}</div>
                                <div className="text-sm text-slate-400">Old Rooms (24h+)</div>
                            </div>
                            <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                                <div className="text-3xl font-black text-purple-400">{stats.totalPlayers}</div>
                                <div className="text-sm text-slate-400">Total Players</div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="glass p-6 rounded-2xl mb-6">
                    <h2 className="text-xl font-bold mb-4 text-red-400">Cleanup Old Rooms</h2>
                    <p className="text-sm text-slate-400 mb-4">
                        Remove rooms that haven't been updated in the specified time period and have no scores.
                    </p>

                    <div className="grid grid-cols-3 gap-3">
                        <button
                            onClick={() => runCleanup(1)}
                            disabled={loading}
                            className="bg-red-600/20 hover:bg-red-600/30 disabled:bg-slate-600/20 text-red-400 font-bold py-3 px-4 rounded-lg transition-all active:scale-[0.98] border border-red-500/20"
                        >
                            1 Hour
                        </button>
                        <button
                            onClick={() => runCleanup(24)}
                            disabled={loading}
                            className="bg-red-600/20 hover:bg-red-600/30 disabled:bg-slate-600/20 text-red-400 font-bold py-3 px-4 rounded-lg transition-all active:scale-[0.98] border border-red-500/20"
                        >
                            24 Hours
                        </button>
                        <button
                            onClick={() => runCleanup(168)}
                            disabled={loading}
                            className="bg-red-600/20 hover:bg-red-600/30 disabled:bg-slate-600/20 text-red-400 font-bold py-3 px-4 rounded-lg transition-all active:scale-[0.98] border border-red-500/20"
                        >
                            7 Days
                        </button>
                    </div>

                    {result && (
                        <div className="mt-4 p-4 bg-white/5 rounded-lg border border-white/10">
                            <p className="text-sm">{result}</p>
                        </div>
                    )}
                </div>

                <div className="glass p-6 rounded-2xl">
                    <h2 className="text-xl font-bold mb-2 text-yellow-400">⚠️ Warning</h2>
                    <p className="text-sm text-slate-400">
                        This admin panel is not password-protected. In production, you should:
                    </p>
                    <ul className="list-disc list-inside text-sm text-slate-400 mt-2 space-y-1">
                        <li>Add authentication (Firebase Auth, NextAuth, etc.)</li>
                        <li>Use Firebase Cloud Functions for automated cleanup</li>
                        <li>Set up Firebase Security Rules to restrict write access</li>
                        <li>Monitor database usage in Firebase Console</li>
                    </ul>
                </div>
            </div>
        </main>
    );
}
