# Friendle Agent Context

## Project Overview
Friendle is a real-time multiplayer Wordle game.
- **Framework:** Next.js 16 (App Router), React 19
- **Styling:** Tailwind CSS 4
- **Backend:** Firebase Realtime Database (No custom backend, client writes directly to DB)
- **Testing:** Vitest (Unit), Playwright (E2E)

## Development Lifecycle Commands
Use these exact commands. Do not assume standard aliases exist unless listed here.

| Action | Command | Notes |
| :--- | :--- | :--- |
| **Install** | `npm install` | |
| **Dev Server** | `npm run dev` | Runs on localhost:3000 |
| **Lint** | `npm run lint` | Uses ESLint |
| **Unit Tests** | `npm test` | Runs Vitest |
| **E2E Tests** | `npm run test:e2e` | Runs Playwright |
| **Build** | `npm run build` | |
| **Check Env** | `npm run check:env` | Verifies required Firebase env vars are set |

## Architecture & Conventions

### State Management (Firebase)
- **Source of Truth:** Firebase Realtime Database (`/rooms/{roomId}`) is the absolute source of truth.
- **Sync:** Clients subscribe via `onValue()`. There is no dedicated backend API for game moves; clients validate and update Firebase directly.
- **Schema:**
    - `rooms/{id}/gameState`: 'waiting' | 'playing' | 'finished'
    - `rooms/{id}/players/{uid}`: Stores individual scores and guesses.

### Game Logic
- **Location:** `src/lib/gameLogic.ts`
- **Validation:** Logic is pure. `checkGuess()` returns letter statuses ('correct', 'present', 'absent').
- **Word Lists:** stored in `src/lib/wordLists.ts`.

### Styling (Tailwind 4)
- Use Tailwind v4 syntax (CSS variables for theme values).
- Global styles are in `src/app/globals.css`.
- UI Components are in `src/components/ui`.

### Localization
- **Files:** `src/lib/i18n.ts`
- **Supported:** English ('en'), Hebrew ('he').
- **RTL:** The app supports RTL layouts for Hebrew. Ensure UI changes are RTL-compatible.

## Directory Structure
- `src/app`: Next.js App Router pages.
- `src/app/api`: Next.js API routes (admin/cleanup only).
- `src/lib`: Core logic (Firebase, Game Rules, Validation).
- `src/components/game`: Game-specific UI (Board, Keyboard).

## Critical Rules for Agents
1. **Firebase Config:** Do not attempt to initialize Firebase without checking `src/lib/firebase.ts`.
2. **Environment:** The app requires `NEXT_PUBLIC_FIREBASE_*` variables. If tests fail due to missing env vars, mock the firebase modules.
3. **Imports:** Use the `@/` alias for imports from `src/` (e.g., `import { ... } from '@/lib/utils'`).
4. **Formatting:** Follow the existing `.eslintrc.json` rules.
