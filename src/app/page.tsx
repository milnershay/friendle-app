"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { db } from "@/lib/firebase"
import { ref, get } from "firebase/database"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Users, ArrowRight, ArrowLeft, Plus, LogIn } from "lucide-react"
import toast from "react-hot-toast"
import { validateUsername, validateRoomCode, sanitizeText, checkRateLimit, getRateLimitKey } from "@/lib/validation"
import { useTranslation, getStoredLanguage, setStoredLanguage, type Language } from "@/lib/i18n"

export default function Home() {
  const router = useRouter()
  const [username, setUsername] = useState("")
  const [roomCode, setRoomCode] = useState("")
  const [step, setStep] = useState(0) // 0: Choose Action, 1: Create Room, 2: Join with Code, 3: Join with Code (Username), 4: Join Random (Username)
  const [noRoomsAvailable, setNoRoomsAvailable] = useState(false);
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

  const handleUsernameForRandomJoin = () => {
    setNoRoomsAvailable(false);
    const sanitizedUsername = sanitizeText(username)
    const usernameValidation = validateUsername(sanitizedUsername)
    if (!usernameValidation.valid) {
        if (usernameValidation.error) {
            return toast.error(usernameValidation.error)
        }
    }
    handleJoinRandomRoom(sanitizedUsername);
  };

  const handleJoinRandomRoom = async (sanitizedUsername: string) => {
    if (!db) {
      toast.error('Firebase is not initialized. Please check your configuration.');
      return;
    }
    const publicRoomsRef = ref(db, 'public_rooms');
    const snapshot = await get(publicRoomsRef);
    const publicRooms = snapshot.val();

    if (!publicRooms) {
      setNoRoomsAvailable(true);
      return;
    }

    const availableRooms = Object.keys(publicRooms).filter(roomId => publicRooms[roomId].playerCount < 8);

    if (availableRooms.length === 0) {
      setNoRoomsAvailable(true);
      return;
    }

    const randomRoomId = availableRooms[Math.floor(Math.random() * availableRooms.length)];
    router.push(`/room/${randomRoomId}?username=${encodeURIComponent(sanitizedUsername)}&language=${language}`);
  };

  const handleCreateRoom = () => {
    const sanitizedUsername = sanitizeText(username)
    const usernameValidation = validateUsername(sanitizedUsername)
    if (!usernameValidation.valid) {
        if (usernameValidation.error) {
            return toast.error(usernameValidation.error)
        }
    }

    const rateLimitKey = getRateLimitKey('create_room')
    const rateLimit = checkRateLimit(rateLimitKey, 5, 60000)
    if (!rateLimit.allowed) {
      return toast.error(`Too many rooms created. Please try again in ${rateLimit.retryAfter} seconds`)
    }

    const newRoomId = Math.random().toString(36).substring(2, 8).toUpperCase()
    router.push(`/room/${newRoomId}?username=${encodeURIComponent(sanitizedUsername)}&language=${language}`)
  }

  const handleRoomCodeSubmit = () => {
    const sanitizedRoomId = sanitizeText(roomCode)
    const roomValidation = validateRoomCode(sanitizedRoomId)
    if (!roomValidation.valid) {
        if (roomValidation.error) {
            return toast.error(roomValidation.error)
        }
    }
    setStep(3)
  }

  const handleJoinSubmit = () => {
    const sanitizedUsername = sanitizeText(username)
    const usernameValidation = validateUsername(sanitizedUsername)
    if (!usernameValidation.valid) {
        if (usernameValidation.error) {
            return toast.error(usernameValidation.error)
        }
    }

    const sanitizedRoomId = sanitizeText(roomCode)
    const roomValidation = validateRoomCode(sanitizedRoomId)
    if (!roomValidation.valid) {
        if (roomValidation.error) {
            return toast.error(roomValidation.error)
        }
    }

    router.push(`/room/${sanitizedRoomId.toUpperCase()}?username=${encodeURIComponent(sanitizedUsername)}&language=${language}`)
  }

  const handleKeyDown = (e: React.KeyboardEvent, action: () => void) => {
    if (e.key === 'Enter') {
      action()
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 relative overflow-hidden font-sans selection:bg-blue-500/30 flex flex-col items-center justify-center" dir={language === 'he' ? 'rtl' : 'ltr'}>

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

      {/* Background Effects */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] bg-blue-600/20 rounded-full blur-[100px] animate-pulse duration-[4000ms]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] bg-purple-600/20 rounded-full blur-[100px] animate-pulse duration-[5000ms] delay-1000" />
        <div className="absolute top-[40%] left-[50%] -translate-x-1/2 w-[40vw] h-[40vw] bg-emerald-500/10 rounded-full blur-[100px] animate-pulse duration-[7000ms] delay-500" />
      </div>

      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.03)_1px,transparent_1px)] bg-[size:64px_64px] [mask-image:radial-gradient(ellipse_at_center,transparent_20%,black)] pointer-events-none z-0" />

      {/* Main Content */}
      <div className="relative z-10 flex-grow flex flex-col items-center justify-center w-full px-6">

        <div className="w-full max-w-md">
          {/* Header */}
          <div className="text-center mb-12">
          <h1 className="text-5xl md:text-6xl font-bold mb-2 bg-gradient-to-b from-white to-white/60 bg-clip-text text-transparent tracking-tighter drop-shadow-[0_0_30px_rgba(255,255,255,0.1)]">
            {t.home.title}
          </h1>
          <p className="text-slate-400 text-sm md:text-base tracking-wide font-medium">{t.home.subtitle}</p>
        </div>

        {/* Card */}
        <div className="bg-white/5 backdrop-blur-3xl border border-white/10 rounded-[2rem] p-8 shadow-[0_8px_32px_rgba(0,0,0,0.3),0_0_0_1px_rgba(255,255,255,0.05)_inset]">

          {/* Step 0: Choose Action (Create or Join) */}
          {step === 0 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <Button
                onClick={() => setStep(1)}
                className="relative w-full overflow-hidden group bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 hover:from-blue-400 hover:via-indigo-400 hover:to-purple-400 text-white font-bold text-lg h-16 rounded-xl shadow-[0_8px_24px_rgba(99,102,246,0.25)] transition-all duration-300 hover:shadow-[0_12px_32px_rgba(99,102,246,0.4)] hover:scale-[1.02] border border-white/10"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 rtl:translate-x-[100%] rtl:group-hover:translate-x-[-100%]" />
                <span className="relative z-10 flex items-center justify-center gap-3">
                  <Plus className="w-6 h-6" /> {t.home.createRoom}
                </span>
              </Button>

              <div className="relative flex py-2 items-center">
                <div className="flex-grow border-t border-white/10"></div>
                <span className="flex-shrink mx-4 text-slate-500 text-[10px] uppercase tracking-widest font-bold">
                  {t.home.or}
                </span>
                <div className="flex-grow border-t border-white/10"></div>
              </div>

              <Button
                onClick={() => setStep(4)}
                className="w-full bg-white/10 hover:bg-white/20 border border-white/10 text-white font-bold text-lg h-16 rounded-xl transition-all duration-300 flex items-center justify-center gap-3"
              >
                <Users className="w-6 h-6" /> {t.home.joinRandom}
              </Button>

              <div className="relative flex py-2 items-center">
                <div className="flex-grow border-t border-white/10"></div>
                <span className="flex-shrink mx-4 text-slate-500 text-[10px] uppercase tracking-widest font-bold">
                  {t.home.or}
                </span>
                <div className="flex-grow border-t border-white/10"></div>
              </div>

              <Button
                onClick={() => setStep(2)}
                className="w-full bg-black/20 hover:bg-black/30 border border-white/10 text-slate-300 font-bold text-base h-12 rounded-xl transition-all duration-300 flex items-center justify-center gap-3"
              >
                <LogIn className="w-5 h-5" /> {t.home.joinWithCode}
              </Button>
            </div>
          )}

          {/* Step 1: Create Room - Enter Username */}
          {step === 1 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <button onClick={() => setStep(0)} className="flex items-center gap-2 mb-2 text-slate-400 cursor-pointer hover:text-white transition-colors">
                <ArrowLeft className="w-4 h-4 rtl:rotate-180" />
                <span className="text-xs font-bold uppercase tracking-widest">{t.common.back}</span>
              </button>
              <div className="flex items-center justify-center mb-2">
                <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-[0_8px_16px_rgba(59,130,246,0.3)]">
                  <Users className="h-6 w-6 text-white" />
                </div>
              </div>
              <div>
                <label htmlFor="username" className="block text-xs font-bold text-slate-400 mb-3 uppercase tracking-widest text-center">
                  {t.home.username}
                </label>
                <Input
                  id="username"
                  type="text"
                  placeholder={t.home.usernamePlaceholder}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  onKeyDown={(e) => handleKeyDown(e, handleCreateRoom)}
                  className="w-full bg-black/20 backdrop-blur-md border-transparent focus:border-white/20 text-white placeholder:text-slate-600 h-16 rounded-xl px-6 text-center text-xl transition-all duration-300 shadow-[inset_0_2px_4px_rgba(0,0,0,0.3)]"
                  autoFocus
                />
              </div>
              <Button
                onClick={handleCreateRoom}
                className="w-full bg-white text-slate-950 hover:bg-slate-200 font-bold text-lg h-14 rounded-xl shadow-lg transition-all duration-300"
              >
                {t.home.createRoom} <ArrowRight className="w-5 h-5 ml-2 rtl:rotate-180" />
              </Button>
            </div>
          )}

          {/* Step 2: Join Room - Enter Room Code */}
          {step === 2 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <button onClick={() => setStep(0)} className="flex items-center gap-2 mb-2 text-slate-400 cursor-pointer hover:text-white transition-colors">
                <ArrowLeft className="w-4 h-4 rtl:rotate-180" />
                <span className="text-xs font-bold uppercase tracking-widest">{t.common.back}</span>
              </button>
              <div>
                <label htmlFor="room-code" className="block text-xs font-bold text-slate-400 mb-3 uppercase tracking-widest text-center">
                  {t.home.roomCode}
                </label>
                <Input
                  id="room-code"
                  type="text"
                  placeholder={t.home.roomCodePlaceholder}
                  value={roomCode}
                  onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                  onKeyDown={(e) => handleKeyDown(e, handleRoomCodeSubmit)}
                  className="w-full bg-black/20 backdrop-blur-md border-transparent focus:border-white/20 text-white placeholder:text-slate-600 h-16 rounded-xl px-6 text-2xl font-mono tracking-[0.2em] text-center uppercase shadow-[inset_0_2px_4px_rgba(0,0,0,0.3)]"
                  autoFocus
                />
              </div>
              <Button
                onClick={handleRoomCodeSubmit}
                className="w-full bg-white text-slate-950 hover:bg-slate-200 font-bold text-lg h-14 rounded-xl shadow-lg transition-all duration-300"
              >
                {t.common.next} <ArrowRight className="w-5 h-5 ml-2 rtl:rotate-180" />
              </Button>
            </div>
          )}

          {/* Step 3: Join Room - Enter Username */}
          {step === 3 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <button onClick={() => setStep(2)} className="flex items-center gap-2 mb-2 text-slate-400 cursor-pointer hover:text-white transition-colors">
                <ArrowLeft className="w-4 h-4 rtl:rotate-180" />
                <span className="text-xs font-bold uppercase tracking-widest">{t.common.back}</span>
              </button>
              <div className="flex items-center justify-center mb-2">
                <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-[0_8px_16px_rgba(59,130,246,0.3)]">
                  <Users className="h-6 w-6 text-white" />
                </div>
              </div>
              <div>
                <label htmlFor="join-username" className="block text-xs font-bold text-slate-400 mb-3 uppercase tracking-widest text-center">
                  {t.home.username}
                </label>
                <Input
                  id="join-username"
                  type="text"
                  placeholder={t.home.usernamePlaceholder}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  onKeyDown={(e) => handleKeyDown(e, handleJoinSubmit)}
                  className="w-full bg-black/20 backdrop-blur-md border-transparent focus:border-white/20 text-white placeholder:text-slate-600 h-16 rounded-xl px-6 text-center text-xl transition-all duration-300 shadow-[inset_0_2px_4px_rgba(0,0,0,0.3)]"
                  autoFocus
                />
              </div>
              <Button
                onClick={handleJoinSubmit}
                className="w-full bg-white text-slate-950 hover:bg-slate-200 font-bold text-lg h-14 rounded-xl shadow-lg transition-all duration-300"
              >
                {t.home.join}
              </Button>
            </div>
          )}

          {/* Step 4: Join Random Room - Enter Username */}
          {step === 4 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <button onClick={() => setStep(0)} className="flex items-center gap-2 mb-2 text-slate-400 cursor-pointer hover:text-white transition-colors">
                <ArrowLeft className="w-4 h-4 rtl:rotate-180" />
                <span className="text-xs font-bold uppercase tracking-widest">{t.common.back}</span>
              </button>
              <div className="flex items-center justify-center mb-2">
                <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-[0_8px_16px_rgba(59,130,246,0.3)]">
                  <Users className="h-6 w-6 text-white" />
                </div>
              </div>
              <div>
                <label htmlFor="join-random-username" className="block text-xs font-bold text-slate-400 mb-3 uppercase tracking-widest text-center">
                  {t.home.username}
                </label>
                <Input
                  id="join-random-username"
                  type="text"
                  placeholder={t.home.usernamePlaceholder}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  onKeyDown={(e) => handleKeyDown(e, handleUsernameForRandomJoin)}
                  className="w-full bg-black/20 backdrop-blur-md border-transparent focus:border-white/20 text-white placeholder:text-slate-600 h-16 rounded-xl px-6 text-center text-xl transition-all duration-300 shadow-[inset_0_2px_4px_rgba(0,0,0,0.3)]"
                  autoFocus
                />
              </div>
              {noRoomsAvailable && (
                <div className="text-center bg-red-500/10 border border-red-500/20 text-red-300 text-xs rounded-lg p-3 animate-in fade-in duration-300">
                  <p className="font-bold">{t.home.noRoomsTitle}</p>
                  <p className="text-red-300/80">{t.home.noRoomsSubtitle}</p>
                </div>
              )}
              <Button
                onClick={handleUsernameForRandomJoin}
                className="w-full bg-white text-slate-950 hover:bg-slate-200 font-bold text-lg h-14 rounded-xl shadow-lg transition-all duration-300"
              >
                {t.home.joinRandom} <ArrowRight className="w-5 h-5 ml-2 rtl:rotate-180" />
              </Button>
            </div>
          )}


        </div>
        </div>
      </div>
    </div>
  )
}
