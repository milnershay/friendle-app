"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Users, Trophy, Grid3x3, Copy, Check, Sparkles, Delete } from "lucide-react"
import { validateUsername, validateRoomCode, sanitizeText, checkRateLimit, getRateLimitKey } from "@/lib/validation"
import { useTranslation, getStoredLanguage, setStoredLanguage, type Language } from "@/lib/i18n"

export default function Home() {
  const router = useRouter()
  const [username, setUsername] = useState("")
  const [roomCode, setRoomCode] = useState("")
  const [activeRoom] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [language, setLanguage] = useState<Language>('en')
  const t = useTranslation(language)

  useEffect(() => {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLanguage(getStoredLanguage());
  }, []);

  const handleLanguageChange = (newLang: Language) => {
      setLanguage(newLang);
      setStoredLanguage(newLang);
  };

  const keyboardRows = [
    ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"],
    ["A", "S", "D", "F", "G", "H", "J", "K", "L"],
    ["ENTER", "Z", "X", "C", "V", "B", "N", "M", "BACKSPACE"],
  ]

  const leaderboard = [
    { name: "Alice", score: 95, wins: 12 },
    { name: "Bob", score: 87, wins: 9 },
    { name: "Charlie", score: 82, wins: 8 },
  ]

  const wordleGrid = [
    [
      { letter: "S", state: "absent" },
      { letter: "T", state: "absent" },
      { letter: "A", state: "present" },
      { letter: "R", state: "absent" },
      { letter: "E", state: "present" },
    ],
    [
      { letter: "P", state: "absent" },
      { letter: "L", state: "present" },
      { letter: "A", state: "present" },
      { letter: "N", state: "absent" },
      { letter: "E", state: "correct" },
    ],
    [
      { letter: "A", state: "correct" },
      { letter: "P", state: "absent" },
      { letter: "P", state: "absent" },
      { letter: "L", state: "correct" },
      { letter: "E", state: "correct" },
    ],
  ]

  const handleCopyRoomCode = () => {
    if (activeRoom) {
      navigator.clipboard.writeText(activeRoom)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleCreateRoom = () => {
    const sanitizedUsername = sanitizeText(username)
    const usernameValidation = validateUsername(sanitizedUsername)
    if (!usernameValidation.valid) {
        return alert(usernameValidation.error)
    }

    const rateLimitKey = getRateLimitKey('create_room')
    const rateLimit = checkRateLimit(rateLimitKey, 5, 60000)
    if (!rateLimit.allowed) {
        return alert(`Too many rooms created. Please try again in ${rateLimit.retryAfter} seconds`)
    }

    const newRoomId = Math.random().toString(36).substring(2, 8).toUpperCase()
    router.push(`/room/${newRoomId}?username=${encodeURIComponent(sanitizedUsername)}`)
  }

  const handleJoinRoom = () => {
    const sanitizedUsername = sanitizeText(username)
    const usernameValidation = validateUsername(sanitizedUsername)
    if (!usernameValidation.valid) {
        return alert(usernameValidation.error)
    }

    const sanitizedRoomId = sanitizeText(roomCode)
    const roomValidation = validateRoomCode(sanitizedRoomId)
    if (!roomValidation.valid) {
        return alert(roomValidation.error)
    }

    router.push(`/room/${sanitizedRoomId.toUpperCase()}?username=${encodeURIComponent(sanitizedUsername)}`)
  }

  return (
    <div className="min-h-screen bg-slate-950 relative overflow-hidden font-sans selection:bg-blue-500/30" dir={language === 'he' ? 'rtl' : 'ltr'}>

      {/* Language Switcher */}
      <div className="absolute top-4 right-4 z-50 flex gap-2">
          <button
             onClick={() => handleLanguageChange('en')}
             className={`px-3 py-1 rounded-full text-xs font-bold transition-all duration-300 border border-white/10 ${language === 'en' ? 'bg-white text-slate-950 shadow-[0_0_15px_rgba(255,255,255,0.3)]' : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white'}`}
          >
            EN
          </button>
          <button
             onClick={() => handleLanguageChange('he')}
             className={`px-3 py-1 rounded-full text-xs font-bold transition-all duration-300 border border-white/10 ${language === 'he' ? 'bg-white text-slate-950 shadow-[0_0_15px_rgba(255,255,255,0.3)]' : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white'}`}
          >
            HE
          </button>
      </div>

      <div className="fixed inset-0 z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] bg-blue-600/20 rounded-full blur-[100px] animate-pulse duration-[4000ms]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] bg-purple-600/20 rounded-full blur-[100px] animate-pulse duration-[5000ms] delay-1000" />
        <div className="absolute top-[40%] left-[50%] -translate-x-1/2 w-[40vw] h-[40vw] bg-emerald-500/10 rounded-full blur-[100px] animate-pulse duration-[7000ms] delay-500" />
      </div>

      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.03)_1px,transparent_1px)] bg-[size:64px_64px] [mask-image:radial-gradient(ellipse_at_center,transparent_20%,black)] pointer-events-none z-0" />

      <div className="relative z-10 max-w-md md:max-w-[1600px] mx-auto px-4 py-6 md:px-12 md:py-20 flex flex-col gap-6 md:gap-10">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-4 md:mb-12">
          <div className="text-center md:text-left rtl:md:text-right">
            <h1 className="text-5xl md:text-7xl font-bold mb-2 bg-gradient-to-b from-white to-white/60 bg-clip-text text-transparent tracking-tighter drop-shadow-[0_0_30px_rgba(255,255,255,0.1)]">
              {t.home.title}
            </h1>
            <p className="text-slate-400 text-sm md:text-lg tracking-wide font-medium">{t.home.subtitle}</p>
          </div>

          {activeRoom && (
            <div className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-2xl p-4 md:px-12 md:py-7 shadow-[0_8px_32px_rgba(0,0,0,0.2),0_0_0_1px_rgba(255,255,255,0.05)_inset] w-full md:w-auto">
              <div className="flex items-center justify-between md:justify-start gap-4 md:gap-6">
                <div>
                  <p className="text-[10px] text-slate-400 uppercase tracking-[0.2em] font-bold mb-1">{t.home.roomCode}</p>
                  <p className="text-2xl md:text-3xl font-mono font-bold text-white tracking-[0.2em] drop-shadow-[0_2px_8px_rgba(255,255,255,0.1)]">
                    {activeRoom}
                  </p>
                </div>
                <Button
                  onClick={handleCopyRoomCode}
                  className="bg-white/10 hover:bg-white/20 border border-white/20 text-white h-12 w-12 md:h-14 md:w-14 p-0 rounded-xl md:rounded-2xl transition-all duration-300 shadow-lg active:scale-95"
                >
                  {copied ? <Check className="h-5 w-5" /> : <Copy className="h-5 w-5" />}
                </Button>
              </div>
            </div>
          )}
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-10 pb-20 md:pb-0">
          {/* Get Started / Controls Section */}
          <div className="order-2 lg:order-1 lg:col-span-1 space-y-6">
            <div className="bg-white/5 backdrop-blur-3xl border border-white/10 rounded-[2rem] p-6 md:p-10 shadow-[0_8px_32px_rgba(0,0,0,0.3),0_0_0_1px_rgba(255,255,255,0.05)_inset]">
              <div className="flex items-center gap-4 mb-8">
                <div className="h-10 w-10 md:h-12 md:w-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-[0_8px_16px_rgba(59,130,246,0.3)]">
                  <Users className="h-5 w-5 text-white" />
                </div>
                <h2 className="text-xl md:text-2xl font-bold text-white tracking-tight">{t.home.playerTitle}</h2>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-3 uppercase tracking-widest">
                    {t.home.username}
                  </label>
                  <Input
                    type="text"
                    placeholder={t.home.usernamePlaceholder}
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full bg-black/20 backdrop-blur-md border-transparent focus:border-white/20 text-white placeholder:text-slate-600 h-14 rounded-xl px-5 text-lg transition-all duration-300 shadow-[inset_0_2px_4px_rgba(0,0,0,0.3)] rtl:text-right"
                  />
                </div>

                <Button
                  onClick={handleCreateRoom}
                  className="relative w-full overflow-hidden group bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 hover:from-blue-400 hover:via-indigo-400 hover:to-purple-400 text-white font-bold text-lg h-16 rounded-2xl shadow-[0_8px_24px_rgba(99,102,246,0.25)] transition-all duration-300 hover:shadow-[0_12px_32px_rgba(99,102,246,0.4)] hover:scale-[1.02] border border-white/10"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 rtl:translate-x-[100%] rtl:group-hover:translate-x-[-100%]" />
                  <span className="relative z-10 flex items-center justify-center gap-2">
                    {t.home.createRoom} <Sparkles className="w-5 h-5" />
                  </span>
                </Button>

                <div className="relative flex py-2 items-center">
                  <div className="flex-grow border-t border-white/10"></div>
                  <span className="flex-shrink mx-4 text-slate-500 text-[10px] uppercase tracking-widest font-bold">
                    {t.home.or}
                  </span>
                  <div className="flex-grow border-t border-white/10"></div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-3 uppercase tracking-widest">
                    {t.home.or} {t.home.roomCode}
                  </label>
                  <div className="flex gap-3">
                    <Input
                      type="text"
                      placeholder={t.home.roomCodePlaceholder}
                      value={roomCode}
                      onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                      className="flex-1 bg-black/20 backdrop-blur-md border-transparent focus:border-white/20 text-white placeholder:text-slate-600 h-16 rounded-2xl px-5 text-xl font-mono tracking-[0.2em] text-center uppercase shadow-[inset_0_2px_4px_rgba(0,0,0,0.3)]"
                    />
                    <Button
                      onClick={handleJoinRoom}
                      className="bg-white/10 hover:bg-white/20 border border-white/10 text-white font-bold px-8 h-16 rounded-2xl transition-all duration-300"
                    >
                      {t.home.join}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Game Section - Main Content */}
          <div className="order-1 lg:order-2 lg:col-span-1">
            <div className="bg-white/5 backdrop-blur-[40px] border border-white/10 rounded-[2.5rem] p-6 md:p-8 shadow-[0_20px_40px_rgba(0,0,0,0.4),0_0_0_1px_rgba(255,255,255,0.05)_inset] relative overflow-hidden group">
              {/* Glass sheen effect */}
              <div className="absolute -top-20 -right-20 w-60 h-60 bg-white/[0.03] rounded-full blur-3xl pointer-events-none" />

              <div className="flex items-center justify-between mb-8 relative z-10">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shadow-[0_0_20px_rgba(16,185,129,0.3)]">
                    <Grid3x3 className="h-5 w-5 text-white" />
                  </div>
                  <h2 className="text-xl font-bold text-white tracking-tight">{t.home.dailyTitle}</h2>
                </div>
                <div className="bg-black/30 px-3 py-1 rounded-full border border-white/5">
                  <span className="text-xs font-mono text-emerald-400">3/6</span>
                </div>
              </div>

              <div className="space-y-3 mb-8" dir="ltr">
                {wordleGrid.map((row, rowIndex) => (
                  <div key={rowIndex} className="flex gap-2 md:gap-3 justify-center">
                    {row.map((cell, cellIndex) => (
                      <div
                        key={cellIndex}
                        className={`h-14 w-14 md:h-[64px] md:w-[64px] rounded-xl md:rounded-2xl flex items-center justify-center text-2xl md:text-3xl font-bold transition-all duration-500 transform hover:scale-105 cursor-default select-none
                          ${
                            cell.state === "correct"
                              ? "bg-gradient-to-b from-emerald-500 to-emerald-600 text-white shadow-[0_4px_12px_rgba(16,185,129,0.4),inset_0_1px_1px_rgba(255,255,255,0.4)] border-0"
                              : cell.state === "present"
                                ? "bg-gradient-to-b from-amber-400 to-orange-500 text-white shadow-[0_4px_12px_rgba(245,158,11,0.4),inset_0_1px_1px_rgba(255,255,255,0.4)] border-0"
                                : "bg-white/[0.03] backdrop-blur-sm border border-white/5 text-white shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]"
                          }
                        `}
                      >
                        {cell.letter}
                      </div>
                    ))}
                  </div>
                ))}

                {[...Array(3)].map((_, i) => (
                  <div key={`empty-${i}`} className="flex gap-2 md:gap-3 justify-center">
                    {[...Array(5)].map((_, j) => (
                      <div
                        key={j}
                        className="h-14 w-14 md:h-[64px] md:w-[64px] rounded-xl md:rounded-2xl bg-black/20 backdrop-blur-sm border border-white/5 shadow-[inset_0_2px_4px_rgba(0,0,0,0.2)]"
                      />
                    ))}
                  </div>
                ))}
              </div>

              <div className="mt-8 space-y-2" dir="ltr">
                {keyboardRows.map((row, i) => (
                  <div key={i} className="flex justify-center gap-1.5">
                    {row.map((key) => (
                      <button
                        key={key}
                        className={`
                          h-12 md:h-14 rounded-lg md:rounded-xl font-bold text-xs md:text-sm transition-all duration-150 active:scale-95 select-none flex items-center justify-center shadow-[0_2px_0_rgba(0,0,0,0.2)]
                          ${key.length > 1 ? "px-3 md:px-4 text-[10px] md:text-xs w-auto" : "w-8 md:w-10"}
                          ${
                            ["A", "E", "L", "P", "S"].includes(key)
                              ? "bg-slate-700 text-white hover:bg-slate-600"
                              : ["N"].includes(key)
                                ? "bg-emerald-500 text-white shadow-[0_0_15px_rgba(16,185,129,0.4)]"
                                : "bg-white/10 text-white hover:bg-white/20"
                          }
                        `}
                      >
                        {key === "BACKSPACE" ? <Delete className="w-5 h-5" /> : key === "ENTER" ? "ENTER" : key}
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Leaderboard Section */}
          <div className="order-3 lg:order-3 lg:col-span-1">
            <div className="bg-white/5 backdrop-blur-3xl border border-white/10 rounded-[2rem] p-6 md:p-10 shadow-[0_8px_32px_rgba(0,0,0,0.3),0_0_0_1px_rgba(255,255,255,0.05)_inset] h-full">
              <div className="flex items-center gap-4 mb-8">
                <div className="h-10 w-10 md:h-12 md:w-12 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-[0_8px_24px_rgba(251,191,36,0.3)]">
                  <Trophy className="h-5 w-5 text-white" />
                </div>
                <h2 className="text-xl md:text-2xl font-bold text-white tracking-tight">{t.home.ranksTitle}</h2>
              </div>

              <div className="space-y-4">
                {leaderboard.map((player, index) => (
                  <div
                    key={index}
                    className="group bg-white/[0.03] backdrop-blur-md border border-white/5 rounded-2xl p-4 md:p-5 hover:bg-white/[0.08] transition-all duration-300 cursor-pointer"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div
                          className={`h-10 w-10 rounded-xl flex items-center justify-center font-bold text-sm
                            ${
                              index === 0
                                ? "bg-gradient-to-br from-amber-300 to-orange-400 text-white shadow-lg shadow-amber-500/20"
                                : "bg-white/5 text-slate-400"
                            }
                          `}
                        >
                          #{index + 1}
                        </div>
                        <div>
                          <p className="font-bold text-white text-base">{player.name}</p>
                          <p className="text-xs text-slate-500">{player.wins} {t.home.wins}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-xl font-mono font-bold text-white">{player.score}</span>
                      </div>
                    </div>
                    {/* Progress bar based on score (mock) */}
                    <div className="mt-3 h-1 w-full bg-white/5 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-blue-400 to-emerald-400 rounded-full"
                        style={{ width: `${(player.score / 100) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Mobile specific stats row */}
              <div className="mt-8 grid grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-white/5 border border-white/5 text-center">
                  <div className="text-2xl font-bold text-white">12</div>
                  <div className="text-[10px] uppercase tracking-wider text-slate-500 mt-1">{t.home.played}</div>
                </div>
                <div className="p-4 rounded-2xl bg-white/5 border border-white/5 text-center">
                  <div className="text-2xl font-bold text-emerald-400">75%</div>
                  <div className="text-[10px] uppercase tracking-wider text-slate-500 mt-1">{t.home.winRate}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
