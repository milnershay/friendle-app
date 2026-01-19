"use client"

import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ArrowRight, ArrowLeft, Plus, LogIn, Loader } from "lucide-react"
import toast from "react-hot-toast"
import { useTranslation, getStoredLanguage, setStoredLanguage, type Language } from "@/lib/i18n"

function HomeContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [username, setUsername] = useState("")
  const [roomCode, setRoomCode] = useState("")
  const [step, setStep] = useState(0) // 0: Choose Action, 1: Create Room, 2: Join with Code, 3: Enter Username for Join
  const [language, setLanguage] = useState<Language>('en')
  const t = useTranslation(language)

  useEffect(() => {
    setLanguage(getStoredLanguage());

    // Check for ?join= parameter to pre-fill room code
    const joinCode = searchParams.get('join');
    if (joinCode) {
      setRoomCode(joinCode.toUpperCase());
      setStep(3); // Go directly to username entry
    }
  }, [searchParams]);

  const handleLanguageChange = (newLang: Language) => {
    setLanguage(newLang);
    setStoredLanguage(newLang);
  };

  const handleCreateRoom = () => {
    const trimmedUsername = username.trim()
    if (!trimmedUsername || trimmedUsername.length < 1 || trimmedUsername.length > 20) {
      return toast.error("Username must be 1-20 characters")
    }
    const newRoomId = Math.random().toString(36).substring(2, 8).toUpperCase()
    router.push(`/room/${newRoomId}?username=${encodeURIComponent(trimmedUsername)}&language=${language}`)
  }

  const handleRoomCodeSubmit = () => {
    const trimmedCode = roomCode.trim().toUpperCase()
    if (!trimmedCode || trimmedCode.length < 4 || trimmedCode.length > 10) {
      return toast.error("Invalid room code")
    }
    setStep(3)
  }

  const handleJoinSubmit = () => {
    const trimmedUsername = username.trim()
    if (!trimmedUsername || trimmedUsername.length < 1 || trimmedUsername.length > 20) {
      return toast.error("Username must be 1-20 characters")
    }
    const trimmedCode = roomCode.trim().toUpperCase()
    router.push(`/room/${trimmedCode}?username=${encodeURIComponent(trimmedUsername)}&language=${language}`)
  }

  const handleKeyDown = (e: React.KeyboardEvent, action: () => void) => {
    if (e.key === 'Enter') action()
  }

  return (
    <div className="min-h-screen bg-slate-950 relative overflow-hidden font-sans flex flex-col items-center justify-center" dir={language === 'he' ? 'rtl' : 'ltr'}>

      {/* Language Switcher */}
      <div className="absolute top-4 right-4 z-50 flex gap-2">
        <button
          onClick={() => handleLanguageChange('en')}
          className={`px-3 py-1 rounded-full text-xs font-bold transition-all border border-white/10 ${language === 'en' ? 'bg-white text-slate-950' : 'bg-white/5 text-slate-400 hover:bg-white/10'}`}
        >
          EN
        </button>
        <button
          onClick={() => handleLanguageChange('he')}
          className={`px-3 py-1 rounded-full text-xs font-bold transition-all border border-white/10 ${language === 'he' ? 'bg-white text-slate-950' : 'bg-white/5 text-slate-400 hover:bg-white/10'}`}
        >
          HE
        </button>
      </div>

      {/* Background Effects */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] bg-blue-600/20 rounded-full blur-[100px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] bg-purple-600/20 rounded-full blur-[100px]" />
      </div>

      {/* Main Content */}
      <div className="relative z-10 flex-grow flex flex-col items-center justify-center w-full px-6">
        <div className="w-full max-w-md">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-5xl md:text-6xl font-bold mb-2 bg-gradient-to-b from-white to-white/60 bg-clip-text text-transparent tracking-tighter">
              {t.home.title}
            </h1>
            <p className="text-slate-400 text-sm md:text-base">{t.home.subtitle}</p>
          </div>

          {/* Card */}
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2rem] p-8 shadow-xl">

            {/* Step 0: Choose Action */}
            {step === 0 && (
              <div className="space-y-4">
                <Button
                  onClick={() => setStep(1)}
                  className="w-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-400 hover:to-purple-400 text-white font-bold text-lg h-14 rounded-xl"
                >
                  <Plus className="w-5 h-5 mr-2" /> {t.home.createRoom}
                </Button>

                <div className="relative flex py-2 items-center">
                  <div className="flex-grow border-t border-white/10"></div>
                  <span className="flex-shrink mx-4 text-slate-500 text-xs uppercase tracking-widest">{t.home.or}</span>
                  <div className="flex-grow border-t border-white/10"></div>
                </div>

                <Button
                  onClick={() => setStep(2)}
                  className="w-full bg-white/10 hover:bg-white/20 border border-white/10 text-white font-bold text-lg h-14 rounded-xl"
                >
                  <LogIn className="w-5 h-5 mr-2" /> {t.home.joinWithCode}
                </Button>
              </div>
            )}

            {/* Step 1: Create Room - Enter Username */}
            {step === 1 && (
              <div className="space-y-6">
                <button onClick={() => setStep(0)} className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors">
                  <ArrowLeft className="w-4 h-4 rtl:rotate-180" />
                  <span className="text-xs font-bold uppercase tracking-widest">{t.common.back}</span>
                </button>
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-3 uppercase tracking-widest text-center">
                    {t.home.username}
                  </label>
                  <Input
                    type="text"
                    placeholder={t.home.usernamePlaceholder}
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    onKeyDown={(e) => handleKeyDown(e, handleCreateRoom)}
                    className="w-full bg-black/20 border-transparent focus:border-white/20 text-white placeholder:text-slate-600 h-14 rounded-xl px-6 text-center text-xl"
                    autoFocus
                  />
                </div>
                <Button onClick={handleCreateRoom} className="w-full bg-white text-slate-950 hover:bg-slate-200 font-bold text-lg h-14 rounded-xl">
                  {t.home.createRoom} <ArrowRight className="w-5 h-5 ml-2 rtl:rotate-180" />
                </Button>
              </div>
            )}

            {/* Step 2: Join Room - Enter Room Code */}
            {step === 2 && (
              <div className="space-y-6">
                <button onClick={() => setStep(0)} className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors">
                  <ArrowLeft className="w-4 h-4 rtl:rotate-180" />
                  <span className="text-xs font-bold uppercase tracking-widest">{t.common.back}</span>
                </button>
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-3 uppercase tracking-widest text-center">
                    {t.home.roomCode}
                  </label>
                  <Input
                    type="text"
                    placeholder={t.home.roomCodePlaceholder}
                    value={roomCode}
                    onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                    onKeyDown={(e) => handleKeyDown(e, handleRoomCodeSubmit)}
                    className="w-full bg-black/20 border-transparent focus:border-white/20 text-white placeholder:text-slate-600 h-14 rounded-xl px-6 text-2xl font-mono tracking-[0.2em] text-center uppercase"
                    autoFocus
                  />
                </div>
                <Button onClick={handleRoomCodeSubmit} className="w-full bg-white text-slate-950 hover:bg-slate-200 font-bold text-lg h-14 rounded-xl">
                  {t.common.next} <ArrowRight className="w-5 h-5 ml-2 rtl:rotate-180" />
                </Button>
              </div>
            )}

            {/* Step 3: Join Room - Enter Username */}
            {step === 3 && (
              <div className="space-y-6">
                <button onClick={() => setStep(2)} className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors">
                  <ArrowLeft className="w-4 h-4 rtl:rotate-180" />
                  <span className="text-xs font-bold uppercase tracking-widest">{t.common.back}</span>
                </button>
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-3 uppercase tracking-widest text-center">
                    {t.home.username}
                  </label>
                  <Input
                    type="text"
                    placeholder={t.home.usernamePlaceholder}
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    onKeyDown={(e) => handleKeyDown(e, handleJoinSubmit)}
                    className="w-full bg-black/20 border-transparent focus:border-white/20 text-white placeholder:text-slate-600 h-14 rounded-xl px-6 text-center text-xl"
                    autoFocus
                  />
                </div>
                <Button onClick={handleJoinSubmit} className="w-full bg-white text-slate-950 hover:bg-slate-200 font-bold text-lg h-14 rounded-xl">
                  {t.home.join}
                </Button>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  )
}

function LoadingFallback() {
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <Loader className="w-8 h-8 text-white animate-spin" />
    </div>
  )
}

export default function Home() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <HomeContent />
    </Suspense>
  )
}
