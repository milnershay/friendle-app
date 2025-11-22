"use client";

import { useState, useEffect } from "react";
import { cleanupOldRooms, getRoomStats } from "@/lib/roomCleanup";
import { useRouter } from "next/navigation";

/**
 * The Admin page component.
 * Allows administrators to view room statistics and perform cleanup operations.
 * Requires authentication via a secure server-side session.
 *
 * @returns The rendered Admin page.
 */
export default function AdminPage() {
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<string>("");
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [checkingAuth, setCheckingAuth] = useState(true);
    const [password, setPassword] = useState("");
    const [authError, setAuthError] = useState("");
    const router = useRouter();

    useEffect(() => {
        // Check if already authenticated via server-side session
        checkAuthStatus();
    }, []);

    const checkAuthStatus = async () => {
        try {
            const response = await fetch('/api/admin/auth');
            const data = await response.json();
            setIsAuthenticated(data.authenticated);
        } catch (error) {
            setIsAuthenticated(false);
        } finally {
            setCheckingAuth(false);
        }
    };

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setAuthError("");
        setLoading(true);

        try {
            const response = await fetch('/api/admin/auth', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password }),
            });

            const data = await response.json();

            if (data.success) {
                setIsAuthenticated(true);
                setPassword("");
            } else {
                setAuthError("Incorrect password");
                setPassword("");
            }
        } catch (error) {
            setAuthError("Authentication failed. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = async () => {
        try {
            await fetch('/api/admin/auth', { method: 'DELETE' });
        } catch (error) {
            // Ignore error
        }
        setIsAuthenticated(false);
        router.push("/");
    };

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

    // Show loading while checking auth
    if (checkingAuth) {
        return (
            <main className="min-h-screen text-white flex flex-col items-center justify-center p-4">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
                    <p className="text-slate-400">Checking authentication...</p>
                </div>
            </main>
        );
    }

    // Show login form if not authenticated
    if (!isAuthenticated) {
        return (
            <main className="min-h-screen text-white flex flex-col items-center justify-center p-4 md:p-24 relative overflow-hidden">
                {/* Background decoration */}
                <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
                    <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-600/20 rounded-full blur-[100px]"></div>
                    <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-600/20 rounded-full blur-[100px]"></div>
                </div>

                <div className="max-w-md w-full">
                    <h1 className="text-4xl md:text-5xl font-black bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 text-transparent bg-clip-text mb-8 text-center">
                        Admin Login
                    </h1>

                    <div className="glass p-8 rounded-2xl">
                        <form onSubmit={handleLogin} className="space-y-6">
                            <div>
                                <label className="block text-sm font-bold mb-2 text-slate-300">
                                    Admin Password
                                </label>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full p-4 rounded-xl bg-slate-800/50 border border-slate-600 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 focus:outline-none transition-all text-lg"
                                    placeholder="Enter admin password"
                                    autoFocus
                                />
                                {authError && (
                                    <p className="mt-2 text-sm text-red-400">{authError}</p>
                                )}
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-4 px-6 rounded-xl transition-all active:scale-[0.98] shadow-lg"
                            >
                                {loading ? 'Authenticating...' : 'Login'}
                            </button>
                        </form>

                        <div className="mt-6 pt-6 border-t border-slate-700/50">
                            <button
                                onClick={() => router.push("/")}
                                className="w-full bg-slate-700 hover:bg-slate-600 text-white font-bold py-3 px-6 rounded-xl transition-all active:scale-[0.98]"
                            >
                                ← Back to Home
                            </button>
                        </div>
                    </div>

                    <div className="mt-6 glass p-4 rounded-xl text-sm text-slate-400">
                        <p className="font-semibold text-green-400 mb-2">🔒 Secure Authentication</p>
                        <p className="text-xs">
                            Admin access is protected with server-side authentication. The password is stored securely and never exposed to the browser.
                        </p>
                        <p className="mt-2 text-xs">
                            To access: Navigate directly to <code className="bg-slate-800/50 px-1 rounded">/admin</code>
                        </p>
                    </div>
                </div>
            </main>
        );
    }

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
                    <div className="flex gap-2">
                        <button
                            onClick={handleLogout}
                            className="bg-red-600 hover:bg-red-500 px-4 py-2 rounded-lg transition-colors text-sm font-semibold"
                        >
                            Logout
                        </button>
                        <button
                            onClick={() => router.push("/")}
                            className="bg-slate-700 hover:bg-slate-600 px-4 py-2 rounded-lg transition-colors text-sm"
                        >
                            ← Back to Home
                        </button>
                    </div>
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
                    <h2 className="text-xl font-bold mb-2 text-green-400">🔒 Security Notes</h2>
                    <p className="text-sm text-slate-400 mb-2">
                        Admin panel uses secure server-side authentication:
                    </p>
                    <ul className="list-disc list-inside text-sm text-slate-400 mt-2 space-y-1">
                        <li>Password stored server-side only (not exposed in browser)</li>
                        <li>HTTP-only cookies prevent JavaScript access</li>
                        <li>Session expires after 24 hours</li>
                        <li>Change password via <code className="bg-slate-800/50 px-1 rounded text-xs">ADMIN_PASSWORD</code> env var (not NEXT_PUBLIC_)</li>
                        <li>No admin link on homepage (access via /admin URL)</li>
                    </ul>
                </div>
            </div>
        </main>
    );
}
