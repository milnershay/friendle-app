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
- See `docs/firebase-setup.md` for database setup instructions
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
See `docs/deployment.md` for complete instructions. Key steps:
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
- Easy to add new languages - see `docs/localization.md`

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

## Working with Jules (AI Coding Agent)

**Jules** is Google's AI coding agent that works asynchronously to complete development tasks. Use Jules to delegate complex, time-consuming work while you focus on other priorities.

### When to Use Jules

Use Jules for:
- 🔧 **Complex refactoring** - Restructuring code, updating dependencies, improving architecture
- 🧪 **Test implementation** - Writing unit tests, e2e tests, test infrastructure setup
- 📚 **Documentation** - Writing/updating docs, adding JSDoc comments, creating guides
- 🏗️ **Infrastructure tasks** - CI/CD setup, deployment configs, build optimizations
- 🐛 **Bug fixes** - Investigating and fixing specific bugs with clear reproduction steps
- ✨ **Feature implementation** - Well-defined features with clear requirements

**Important:** Jules works best with **atomic, well-scoped tasks**. Break large work into smaller, independent tasks that can run in parallel.

### Jules CLI Commands

#### Creating a New Task

```bash
jules remote new --repo . --session "Your detailed task description here"
```

**Best practices for task descriptions:**
- ✅ Be specific and detailed about what needs to be done
- ✅ List acceptance criteria and success metrics
- ✅ Include relevant file paths or areas of the codebase
- ✅ Specify testing requirements
- ✅ Mention any constraints or things to avoid
- ❌ Don't be vague or open-ended
- ❌ Don't combine multiple unrelated tasks

**Example task for this project:**
```bash
jules remote new --repo . --session "Fix E2E tests with Firebase Emulators

**Goal:** Make all 4 e2e tests pass reliably using Firebase Emulator Suite

**Tasks:**
1. Install Firebase Emulator Suite
2. Create firebase.json configuration for emulators
3. Update playwright.config.ts to start/stop emulators before/after tests
4. Update .env.test to use emulator URLs (localhost:9000, etc.)
5. Ensure all tests pass: npm run test:e2e

**Success Criteria:**
- All 4 e2e tests passing
- Tests run in CI without Firebase credentials
- Tests are fast and reliable
- No external Firebase calls during testing
"
```

#### Listing Sessions

**Show all remote sessions:**
```bash
jules remote list --session
```

**Show connected repositories:**
```bash
jules remote list --repo
```

#### Checking Session Status

**View session in Jules dashboard:**
1. Run `jules` to open the interactive dashboard
2. Browse sessions, view diffs, and review changes
3. Or visit the session URL directly: `https://jules.google.com/session/{session_id}`

**Check for PRs from Jules:**
```bash
gh pr list --author google-labs-jules[bot]
```

**Check for Jules branches:**
```bash
git fetch --all && git branch -r | grep jules
```

#### Retrieving Completed Work

When Jules completes a task, it creates a PR on GitHub. Review and merge as normal:

```bash
# List Jules PRs
gh pr list --author google-labs-jules[bot]

# Review a specific PR
gh pr view <pr_number>

# Or pull changes directly from a session
jules remote pull --session <session_id>
```

### Jules Workflow for This Project

**1. Create Task:**
```bash
jules remote new --repo . --session "<detailed description>"
```
Note the session ID returned.

**2. Monitor Progress:**
Jules works asynchronously. Check `docs/jules-status.md` or run:
```bash
gh pr list --author google-labs-jules[bot]
```

**3. Review PR:**
When Jules creates a PR:
- Review the code changes
- Check CI status (lint, test, build)
- Test locally if needed
- Request changes or approve

**4. Merge:**
```bash
gh pr merge <pr_number> --squash
```

### Active Jules Tasks

Track active Jules tasks in `docs/jules-status.md` or check session URLs:
- https://jules.google.com/session/{session_id}

### Parallel Task Execution

For multiple independent tasks, create separate sessions:

```bash
# Task 1: Add tests
jules remote new --repo . --session "Write unit tests for GameBoard component"

# Task 2: Update docs (runs in parallel)
jules remote new --repo . --session "Update architecture documentation"

# Task 3: Fix bug (runs in parallel)
jules remote new --repo . --session "Fix leaderboard sorting bug when scores are equal"
```

All three tasks will run simultaneously, each creating its own PR when complete.

### Tips for Success

1. **Be specific**: More detail = better results
2. **One task = One concern**: Don't mix refactoring + new features
3. **Include context**: Reference relevant files, patterns, or examples
4. **Set clear goals**: Define what "done" looks like
5. **Test requirements**: Always specify testing expectations
6. **Atomic tasks**: Each task should be independently mergeable
7. **Review thoroughly**: Jules is powerful but still needs human review

### Example Tasks for Friendle

Good task examples:

```bash
# ✅ Good: Specific, scoped, testable
jules remote new --repo . --session "Add loading skeleton to RoomPage

Show loading skeleton while room data is loading instead of blank screen.
Use existing RoomSkeleton component.
Test: Verify skeleton appears during loading state."

# ✅ Good: Clear refactoring with constraints
jules remote new --repo . --session "Extract player status logic to custom hook

Move player status calculation from RoomPage to usePlayerStatus hook.
Don't change any behavior, just extract and refactor.
Ensure all tests still pass."

# ❌ Bad: Too vague
jules remote new --repo . --session "Improve the app"

# ❌ Bad: Multiple unrelated tasks
jules remote new --repo . --session "Add dark mode, fix bugs, and update dependencies"
```

### Troubleshooting

**If Jules isn't creating PRs:**
- Check session status at https://jules.google.com/session/{session_id}
- Verify repo is properly connected: `jules remote list --repo`
- Check for error messages in the session

**If Jules PR has failing tests:**
- Review the changes locally
- Run tests: `npm run lint && npm run test && npm run build`
- Comment on the PR with specific issues
- Jules may create a follow-up commit to fix issues

**If you need to stop a task:**
- Sessions complete asynchronously - there's no "cancel" command
- If a PR is created but not wanted, simply close it
- Future: Jules may add session cancellation

