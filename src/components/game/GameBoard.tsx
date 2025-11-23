"use client";

import { useEffect, useState } from "react";
import { checkGuess, LetterStatus, KEYBOARD_LAYOUTS } from "@/lib/gameLogic";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Utility function to merge Tailwind CSS classes.
 *
 * @param inputs - The classes to merge.
 * @returns The merged class string.
 */
function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

/**
 * Props for the GameBoard component.
 */
interface GameBoardProps {
    /** The target word for the current game. Used for client-side validation. */
    currentWord: string | null;
    /** Callback function to handle a player's guess. */
    onGuess: (guess: string) => void;
    /** The current state of the game for the player. */
    gameState: 'playing' | 'won' | 'lost' | 'finished';
    /** An array of guesses made by the player so far. */
    guesses: string[];
    /** The language of the game ('en' or 'he'). Defaults to 'en'. */
    language?: 'en' | 'he';
    /** The length of the target word. Defaults to 5. */
    wordLength?: number;
}

/**
 * The main game board component containing the grid and the keyboard.
 * Handles user input via mouse/touch (virtual keyboard) and physical keyboard.
 *
 * @param props - The props for the GameBoard component.
 * @returns The rendered GameBoard component.
 */
export default function GameBoard({ currentWord, onGuess, gameState, guesses, language = 'en', wordLength = 5 }: GameBoardProps) {
    const [currentGuess, setCurrentGuess] = useState("");

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (gameState !== 'playing') return;

            if (e.key === "Enter") {
                if (currentGuess.length === wordLength) {
                    onGuess(currentGuess.toUpperCase());
                    setCurrentGuess("");
                    // Attempt to dismiss keyboard on mobile
                    if (document.activeElement instanceof HTMLElement) {
                        document.activeElement.blur();
                    }
                }
            } else if (e.key === "Backspace") {
                setCurrentGuess(prev => prev.slice(0, -1));
            } else if (/^[a-zA-Z\u0590-\u05FF]$/.test(e.key)) { // Support Hebrew chars
                if (currentGuess.length < wordLength) {
                    setCurrentGuess(prev => prev + e.key.toUpperCase());
                }
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [currentGuess, gameState, onGuess, wordLength]);

    // Calculate letter statuses for keyboard
    const letterStatuses: Record<string, LetterStatus> = {};
    guesses.forEach((guess) => {
        if (!currentWord) return;
        const statuses = checkGuess(guess, currentWord);
        guess.split('').forEach((letter, i) => {
            const status = statuses[i];
            const currentStatus = letterStatuses[letter];
            if (status === 'correct') {
                letterStatuses[letter] = 'correct';
            } else if (status === 'present' && currentStatus !== 'correct') {
                letterStatuses[letter] = 'present';
            } else if (status === 'absent' && currentStatus !== 'correct' && currentStatus !== 'present') {
                letterStatuses[letter] = 'absent';
            }
        });
    });

    const keyboardLayout = KEYBOARD_LAYOUTS[language as keyof typeof KEYBOARD_LAYOUTS] || KEYBOARD_LAYOUTS.en;

    return (
        <div data-testid="game-board" className="flex flex-col items-center gap-2 md:gap-8 w-full max-w-lg mx-auto pb-2 px-1" dir={language === 'he' ? 'rtl' : 'ltr'}>
            {/* Grid */}
            <div className="grid gap-1 md:gap-2 w-full max-w-[min(330px,100%)] mx-auto" style={{ gridTemplateRows: `repeat(6, minmax(0, 1fr))` }}>
                {Array.from({ length: 6 }).map((_, rowIndex) => {
                    const guess = guesses[rowIndex];
                    const isCurrentRow = rowIndex === guesses.length;
                    const rowContent = isCurrentRow ? currentGuess : (guess || "");

                    let statuses: LetterStatus[] = Array(wordLength).fill('empty');
                    if (guess && currentWord) {
                        statuses = checkGuess(guess, currentWord);
                    }

                    return (
                        <div key={rowIndex} className="grid gap-1 md:gap-2" style={{ gridTemplateColumns: `repeat(${wordLength}, minmax(0, 1fr))` }}>
                            {Array.from({ length: wordLength }).map((_, colIndex) => {
                                const letter = rowContent[colIndex] || "";
                                const status = isCurrentRow ? 'empty' : statuses[colIndex];

                                return (
                                    <div
                                        key={colIndex}
                                        className={cn(
                                            "flex items-center justify-center text-xl sm:text-2xl md:text-3xl font-bold rounded border-2 transition-all duration-500 aspect-square w-full h-full",
                                            status === 'empty' && "border-slate-600 bg-slate-800 text-white",
                                            status === 'correct' && "border-green-600 bg-green-600 text-white",
                                            status === 'present' && "border-yellow-600 bg-yellow-600 text-white",
                                            status === 'absent' && "border-slate-700 bg-slate-700 text-slate-400",
                                            isCurrentRow && letter && "border-slate-400 animate-pulse"
                                        )}
                                    >
                                        {letter}
                                    </div>
                                );
                            })}
                        </div>
                    );
                })}
            </div>

            {/* Keyboard */}
            <div className="w-full max-w-[min(500px,100%)] flex flex-col gap-1 md:gap-2 touch-manipulation mt-2" dir="ltr">
                {/* Always LTR for keyboard layout consistency, keys themselves can be Hebrew */}
                {keyboardLayout.map((row, i) => (
                    <div key={i} className="flex justify-center gap-1 md:gap-1 w-full">
                        {row.map((key) => {
                            const status = letterStatuses[key] || 'empty';
                            return (
                                <button
                                    key={key}
                                    onClick={() => {
                                        if (gameState !== 'playing') return;
                                        if (key === 'ENTER') {
                                            if (currentGuess.length === wordLength) {
                                                onGuess(currentGuess.toUpperCase());
                                                setCurrentGuess("");
                                            }
                                        } else if (key === 'BACKSPACE') {
                                            setCurrentGuess(prev => prev.slice(0, -1));
                                        } else {
                                            if (currentGuess.length < wordLength) {
                                                setCurrentGuess(prev => prev + key);
                                            }
                                        }
                                    }}
                                    className={cn(
                                        "py-3.5 sm:py-4 px-0.5 sm:px-1 md:px-3 md:py-5 rounded-lg font-bold text-sm md:text-base transition-all flex-1 active:scale-95 active:opacity-70 touch-manipulation select-none shadow-md cursor-pointer",
                                        status === 'empty' && "bg-slate-600 active:bg-slate-500 text-white",
                                        status === 'correct' && "bg-green-600 text-white",
                                        status === 'present' && "bg-yellow-600 text-white",
                                        status === 'absent' && "bg-slate-800 text-slate-500",
                                        key.length > 1 && "flex-[1.5] text-[0.65rem] md:text-sm font-bold uppercase"
                                    )}
                                    style={{ WebkitTapHighlightColor: 'transparent' }}
                                >
                                    {key === 'BACKSPACE' ? '←' : key === 'ENTER' ? '↵' : key}
                                </button>
                            );
                        })}
                    </div>
                ))}
            </div>
        </div>
    );
}
