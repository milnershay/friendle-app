"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import { ref, set, get } from "firebase/database";
import { useTranslation, getStoredLanguage, setStoredLanguage, type Language } from "@/lib/i18n";
import { validateUsername, validateRoomCode, sanitizeText, checkRateLimit, getRateLimitKey } from "@/lib/validation";

export default function Home() {
    const [username, setUsername] = useState("");
    const [roomId, setRoomId] = useState("");
    const [language, setLanguage] = useState<Language>('en');
    const router = useRouter();
    const t = useTranslation(language);

    useEffect(() => {
        setLanguage(getStoredLanguage());
    }, []);

    const handleLanguageChange = (newLang: Language) => {
        setLanguage(newLang);
        setStoredLanguage(newLang);
    };

    const createRoom = async () => {
        // Validate username
        const sanitizedUsername = sanitizeText(username);
        const usernameValidation = validateUsername(sanitizedUsername);
        if (!usernameValidation.valid) {
            return alert(usernameValidation.error);
        }

        // Rate limiting
        const rateLimitKey = getRateLimitKey('create_room');
        const rateLimit = checkRateLimit(rateLimitKey, 5, 60000); // 5 rooms per minute
        if (!rateLimit.allowed) {
            return alert(
                language === 'he'
                    ? `יצרת יותר מדי חדרים. נסה שוב בעוד ${rateLimit.retryAfter} שניות`
                    : `Too many rooms created. Please try again in ${rateLimit.retryAfter} seconds`
            );
        }

        const newRoomId = Math.random().toString(36).substring(2, 8).toUpperCase();
        router.push(`/room/${newRoomId}?username=${encodeURIComponent(sanitizedUsername)}`);
    };

    const joinRoom = async () => {
        // Validate username
        const sanitizedUsername = sanitizeText(username);
        const usernameValidation = validateUsername(sanitizedUsername);
        if (!usernameValidation.valid) {
            return alert(usernameValidation.error);
        }

        // Validate room code
        const sanitizedRoomId = sanitizeText(roomId);
        const roomValidation = validateRoomCode(sanitizedRoomId);
        if (!roomValidation.valid) {
            return alert(roomValidation.error);
        }

        router.push(`/room/${sanitizedRoomId.toUpperCase()}?username=${encodeURIComponent(sanitizedUsername)}`);
    };

    return (
        <main className="flex min-h-screen flex-col items-center justify-center p-4 md:p-24 text-white relative overflow-hidden" dir={language === 'he' ? 'rtl' : 'ltr'}>
            {/* Background decoration */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-600/20 rounded-full blur-[100px]"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-600/20 rounded-full blur-[100px]"></div>
            </div>

            {/* Language selector */}
            <div className="absolute top-4 right-4 md:top-8 md:right-8">
                <select
                    value={language}
                    onChange={(e) => handleLanguageChange(e.target.value as Language)}
                    className="bg-white/10 backdrop-blur-md border border-white/20 text-white rounded-lg px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all"
                >
                    <option value="en">{t.common.english}</option>
                    <option value="he">{t.common.hebrew}</option>
                </select>
            </div>

            <h1 className="text-5xl md:text-8xl font-black mb-6 md:mb-12 bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 text-transparent bg-clip-text tracking-tight drop-shadow-lg text-center">
                {t.home.title}
            </h1>

            <div className="glass p-6 md:p-10 rounded-2xl shadow-2xl w-full max-w-md">
                <div className="space-y-6">
                    <div>
                        <label className="block text-sm font-bold mb-2 text-slate-300 uppercase tracking-wider">{t.home.username}</label>
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && createRoom()}
                            maxLength={30}
                            className="w-full p-4 rounded-xl bg-slate-800/50 border border-slate-600 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 focus:outline-none transition-all text-lg placeholder:text-slate-500"
                            placeholder={t.home.usernamePlaceholder}
                        />
                    </div>

                    <div className="pt-6 border-t border-slate-700/50">
                        <button
                            onClick={createRoom}
                            className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold py-4 px-6 rounded-xl transition-all active:scale-[0.98] shadow-lg hover:shadow-indigo-500/25 mb-6 text-lg"
                        >
                            {t.home.createRoom}
                        </button>

                        <div className="relative flex py-2 items-center mb-6">
                            <div className="flex-grow border-t border-slate-700/50"></div>
                            <span className="flex-shrink-0 mx-4 text-slate-400 text-sm font-medium">{t.home.or}</span>
                            <div className="flex-grow border-t border-slate-700/50"></div>
                        </div>

                        <div className="flex gap-3">
                            <input
                                type="text"
                                value={roomId}
                                onChange={(e) => setRoomId(e.target.value.toUpperCase())}
                                onKeyDown={(e) => e.key === 'Enter' && joinRoom()}
                                maxLength={6}
                                className="flex-1 p-4 rounded-xl bg-slate-800/50 border border-slate-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all text-lg placeholder:text-slate-500 uppercase font-mono"
                                placeholder={t.home.roomCodePlaceholder}
                            />
                            <button
                                onClick={joinRoom}
                                className="bg-slate-700 hover:bg-slate-600 text-white font-bold py-4 px-8 rounded-xl transition-all active:scale-[0.98] border border-slate-600"
                            >
                                {t.home.join}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

        </main>
    );
}
