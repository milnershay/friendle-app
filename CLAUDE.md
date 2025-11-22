# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Friendle is a multiplayer Wordle game built with Next.js 16, React 19, and Firebase Realtime Database. Players can create or join rooms using unique room codes and compete to solve Wordle puzzles together in real-time.

## Development Commands

**Development server:**
```bash
npm run dev
```
Opens on http://localhost:3000

**Production build:**
```bash
npm run build
npm start
```

**Linting:**
```bash
npm run lint
```

## Firebase Configuration

The app requires Firebase environment variables in `.env.local`:
- Firebase configuration is in `src/lib/firebase.ts`
- Missing `firebaseConfig` variable must be defined in firebase.ts before the app initialization
- See `FIREBASE_SETUP.md` for database setup instructions
- Database rules are open (test mode) - needs proper security for production

## Architecture

### State Management & Real-time Sync

**Firebase Realtime Database** is the single source of truth:
- Room data structure: `rooms/{roomId}` contains:
  - `players`: Record of player objects keyed by userId
  - `gameState`: 'waiting' | 'playing' | 'finished'
  - `currentWord`: The target word (visible client-side for MVP)
  - `settings`: Room configuration (wordLength, customQueue, maxGuesses)
  - `wordQueue`: Queue of custom words to use

**User Identity:**
- UserId generated randomly on first visit and persisted in localStorage by room (`friendle_uid_{roomId}`)
- Usernames provided at entry but not authenticated
- First player to join becomes the host (based on player order)

**Real-time Synchronization:**
- `onValue()` subscription in `src/app/room/[roomId]/page.tsx` listens to room updates
- All clients update Firebase directly (no backend validation in MVP)
- Game state transitions triggered by any client when conditions met

### File Structure

**Pages:**
- `src/app/page.tsx`: Landing page for creating/joining rooms
- `src/app/room/[roomId]/page.tsx`: Main game room with player management and game orchestration

**Components:**
- `src/components/game/GameBoard.tsx`: Wordle grid, keyboard, and game logic UI

**Libraries:**
- `src/lib/firebase.ts`: Firebase initialization (⚠️ needs firebaseConfig defined)
- `src/lib/gameLogic.ts`: Pure functions for checking guesses and letter statuses

**Styling:**
- Tailwind CSS 4 with custom config
- Responsive design with mobile-first approach
- Mobile uses tabs to switch between game and player views

### Game Flow

1. **Room Creation/Joining:**
   - Generate 6-character room code (uppercase alphanumeric)
   - Navigate to `/room/{roomId}?username={username}`
   - Room created in Firebase on first join

2. **Waiting State:**
   - Host can configure settings (word length, custom word queue)
   - Any player can start the game once ready
   - Room code displayed for sharing

3. **Playing State:**
   - Word selected from custom queue or random default list
   - All players play simultaneously with independent guess tracking
   - Client-side guess validation using `checkGuess()` from gameLogic.ts
   - Player status updates: 'playing' → 'won' | 'lost'

4. **Finished State:**
   - Triggered when all players reach 'won' or 'lost' status
   - Any client can detect completion and update gameState
   - Shows final word and player scores
   - "Play Again" button to start new round

### Key Implementation Details

**Wordle Logic:**
- `checkGuess()` returns array of LetterStatus: 'correct' | 'present' | 'absent' | 'empty'
- Two-pass algorithm: first marks correct positions, then finds present letters
- Keyboard colors updated based on aggregate letter statuses across all guesses

**Firebase Patterns:**
- `onValue()` for real-time subscriptions
- `update()` for partial updates to avoid overwriting concurrent changes
- `get()` for one-time reads (e.g., checking room existence)

**Player Tracking:**
- Each player object tracks: username, score, status, guesses[], timeTaken, endTime
- Scores persist across rounds and are displayed in a ranked leaderboard
- Guesses array resets on new game start
- Leaderboard shows rankings with gold/silver/bronze badges for top 3 players

**Room Management (Host Controls):**
- **Reset Round**: Clears current game and returns all players to waiting state
- **Skip Word**: Ends current round immediately (during gameplay)
- **Clear Scores**: Resets all player scores to 0 (confirmation required)
- **Settings**: Host can change language (English/Hebrew) and word length (4/5/6 letters)
- **Custom Word Queue**: Add custom words with suggester attribution

**Room Cleanup:**
- `src/lib/roomCleanup.ts` provides utilities for cleaning old/inactive rooms
- `cleanupOldRooms(maxAgeHours)`: Removes rooms older than specified hours with no activity
- `deleteRoom(roomId)`: Manually delete a specific room
- `getRoomStats()`: Get statistics about active vs old rooms
- Cleanup should be run periodically (e.g., via cron job or serverless function)

## Deployment

**Firebase Hosting (Primary):**
See `DEPLOY.md` for complete instructions. Key steps:
```bash
npm run build
firebase deploy --only hosting
```

**Docker (Alternative):**
Dockerfile provided for platforms like Render or Railway.

## UI/UX Features

**Keyboard:**
- ENTER button displays ↵ symbol instead of text
- BACKSPACE button displays ← symbol
- Language-specific layouts (English QWERTY, Hebrew)
- Visual feedback with color coding for letter status

**Leaderboard:**
- Real-time ranking sorted by score (highest first)
- Top 3 players get special badge colors (gold, silver, bronze)
- Shows current player status with emojis (⏳ waiting, ⚡ playing, ✓ won, ✗ lost)
- Displays solve time for winners
- Host can reset all scores

**Visual Design:**
- Glassmorphism effects with backdrop blur
- Gradient backgrounds and text
- Custom scrollbar styling
- Responsive mobile/desktop layouts
- Tab-based navigation on mobile (Game/Players)

## Localization (i18n)

**Full app internationalization** with easy language switching:
- All UI text stored in `src/lib/i18n.ts`
- Language preference persists in localStorage
- RTL support for Hebrew (and other RTL languages)
- Easy to add new languages - see `LOCALIZATION.md`

**Currently supported:**
- English (`en`)
- Hebrew (`he`)

**To use in components:**
```typescript
import { useTranslation, getStoredLanguage, type Language } from '@/lib/i18n';
const [language, setLanguage] = useState<Language>('en');
const t = useTranslation(language);
// Use: t.home.title, t.room.startGame, etc.
```

## Room Management

**Leave Room:**
- Desktop: Exit icon button in top-right of sidebar
- Mobile: Back arrow in top-left of header
- Confirms before leaving
- Cleans up localStorage for that room
- Returns to home page

## Path Aliases

TypeScript configured with `@/*` pointing to `src/*` for imports.

## Maintenance

**Room Cleanup:**
To clean up old rooms, you can call the cleanup utility:
```typescript
import { cleanupOldRooms } from '@/lib/roomCleanup';
// Clean up rooms older than 24 hours
await cleanupOldRooms(24);
```

Consider setting up a scheduled task (cron job, cloud function) to run cleanup regularly.
