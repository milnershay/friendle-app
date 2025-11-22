/**
 * Supported languages in the application.
 */
export type Language = 'en' | 'he';

/**
 * Dictionary of translations for all supported languages.
 * Organized by language code ('en', 'he') and then by section.
 */
export const translations = {
    en: {
        // Home page
        home: {
            title: 'Friendle',
            username: 'Username',
            usernamePlaceholder: 'Enter your name',
            createRoom: 'Create New Room',
            or: 'OR JOIN EXISTING',
            roomCode: 'Room Code',
            roomCodePlaceholder: 'CODE',
            join: 'Join',
            adminPanel: 'Admin Panel',
            selectLanguage: 'Language',
        },
        // Room page
        room: {
            roomCode: 'Room',
            leaderboard: 'Leaderboard',
            players: 'Players',
            you: 'You',
            game: 'Game',
            waiting: '⏳ Waiting...',
            playing: '⚡ Playing',
            solved: '✓ Solved',
            failed: '✗ Failed',
            reset: 'Reset',
            gameSettings: 'Game Settings',
            language: 'Language',
            wordLength: 'Word Length',
            customQueue: 'Custom Queue',
            addWord: 'Add word...',
            startGame: 'Start Game',
            playAgain: 'Play Again',
            gameInProgress: 'Game in progress...',
            switchToGame: 'Switch to Game tab to play',
            skipWord: 'Skip Word',
            resetRound: 'Reset Round',
            waitingForPlayers: 'Waiting for players...',
            shareRoomCode: 'Share the room code with your friends to start playing!',
            customQueueActive: 'Custom Word Queue Active',
            wordsReady: 'words ready.',
            gameOver: 'Game Over! 🎉',
            theWordWas: 'The word was',
            suggestedBy: '💡 Suggested by',
            leaveRoom: 'Leave Room',
            confirmLeave: 'Are you sure you want to leave this room?',
        },
        // Admin page
        admin: {
            title: 'Room Admin',
            backToHome: '← Back to Home',
            statistics: 'Room Statistics',
            loadStats: 'Load Stats',
            loading: 'Loading...',
            totalRooms: 'Total Rooms',
            activeRooms: 'Active Rooms',
            oldRooms: 'Old Rooms (24h+)',
            totalPlayers: 'Total Players',
            cleanup: 'Cleanup Old Rooms',
            cleanupDescription: 'Remove rooms that haven\'t been updated in the specified time period and have no scores.',
            oneHour: '1 Hour',
            twentyFourHours: '24 Hours',
            sevenDays: '7 Days',
            warning: '⚠️ Warning',
            warningText: 'This admin panel is not password-protected. In production, you should:',
            warningList: [
                'Add authentication (Firebase Auth, NextAuth, etc.)',
                'Use Firebase Cloud Functions for automated cleanup',
                'Set up Firebase Security Rules to restrict write access',
                'Monitor database usage in Firebase Console'
            ]
        },
        // Common
        common: {
            english: 'English',
            hebrew: 'Hebrew',
            confirm: 'Confirm',
            cancel: 'Cancel',
        }
    },
    he: {
        // Home page
        home: {
            title: 'פרנדל',
            username: 'שם משתמש',
            usernamePlaceholder: 'הזן את שמך',
            createRoom: 'צור חדר חדש',
            or: 'או הצטרף לחדר קיים',
            roomCode: 'קוד חדר',
            roomCodePlaceholder: 'קוד',
            join: 'הצטרף',
            adminPanel: 'פאנל ניהול',
            selectLanguage: 'שפה',
        },
        // Room page
        room: {
            roomCode: 'חדר',
            leaderboard: 'טבלת מובילים',
            players: 'שחקנים',
            you: 'את/ה',
            game: 'משחק',
            waiting: '⏳ ממתין...',
            playing: '⚡ משחק',
            solved: '✓ פתור',
            failed: '✗ נכשל',
            reset: 'איפוס',
            gameSettings: 'הגדרות משחק',
            language: 'שפה',
            wordLength: 'אורך מילה',
            customQueue: 'תור מותאם',
            addWord: 'הוסף מילה...',
            startGame: 'התחל משחק',
            playAgain: 'שחק שוב',
            gameInProgress: 'המשחק בעיצומו...',
            switchToGame: 'עבור ללשונית המשחק כדי לשחק',
            skipWord: 'דלג על מילה',
            resetRound: 'אפס סיבוב',
            waitingForPlayers: 'ממתין לשחקנים...',
            shareRoomCode: 'שתף את קוד החדר עם חבריך כדי להתחיל לשחק!',
            customQueueActive: 'תור מילים מותאם פעיל',
            wordsReady: 'מילים מוכנות.',
            gameOver: 'המשחק נגמר! 🎉',
            theWordWas: 'המילה הייתה',
            suggestedBy: '💡 הוצעה על ידי',
            leaveRoom: 'עזוב חדר',
            confirmLeave: 'האם אתה בטוח שברצונך לעזוב את החדר?',
        },
        // Admin page
        admin: {
            title: 'ניהול חדרים',
            backToHome: '← חזרה לדף הבית',
            statistics: 'סטטיסטיקת חדרים',
            loadStats: 'טען סטטיסטיקה',
            loading: 'טוען...',
            totalRooms: 'סך חדרים',
            activeRooms: 'חדרים פעילים',
            oldRooms: 'חדרים ישנים (24+ שעות)',
            totalPlayers: 'סך שחקנים',
            cleanup: 'נקה חדרים ישנים',
            cleanupDescription: 'הסר חדרים שלא עודכנו בפרק הזמן שצוין וללא ניקוד.',
            oneHour: 'שעה אחת',
            twentyFourHours: '24 שעות',
            sevenDays: '7 ימים',
            warning: '⚠️ אזהרה',
            warningText: 'פאנל הניהול אינו מוגן בסיסמה. בייצור, עליך:',
            warningList: [
                'להוסיף אימות (Firebase Auth, NextAuth וכו\')',
                'להשתמש ב-Firebase Cloud Functions לניקוי אוטומטי',
                'להגדיר Firebase Security Rules להגבלת גישת כתיבה',
                'לנטר שימוש במסד הנתונים בקונסול Firebase'
            ]
        },
        // Common
        common: {
            english: 'אנגלית',
            hebrew: 'עברית',
            confirm: 'אישור',
            cancel: 'ביטול',
        }
    }
};

/**
 * Hook to retrieve translations for a specific language.
 *
 * @param language - The language code ('en' or 'he'). Defaults to 'en'.
 * @returns The translation object for the specified language.
 */
export function useTranslation(language: Language = 'en') {
    return translations[language];
}

/**
 * Retrieves the preferred language stored in localStorage.
 *
 * @returns The stored language code ('en' or 'he'). Defaults to 'en' if not found or running server-side.
 */
export function getStoredLanguage(): Language {
    if (typeof window === 'undefined') return 'en';
    const stored = localStorage.getItem('friendle_language');
    return (stored === 'he' ? 'he' : 'en') as Language;
}

/**
 * Stores the user's preferred language in localStorage.
 *
 * @param language - The language code to store ('en' or 'he').
 */
export function setStoredLanguage(language: Language) {
    if (typeof window === 'undefined') return;
    localStorage.setItem('friendle_language', language);
}
