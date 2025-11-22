# Friendle - Multiplayer Wordle Game

A real-time multiplayer Wordle game where friends can play together and compete on a leaderboard!

## Features

### 🎮 Multiplayer Gameplay
- Create or join rooms with unique 6-character codes
- Real-time synchronization using Firebase Realtime Database
- Play simultaneously with friends
- See everyone's progress live

### 🏆 Leaderboard & Scoring
- Ranked leaderboard sorted by score
- Gold 🥇, Silver 🥈, Bronze 🥉 medals for top 3 players
- Track solve times and success rates
- Persistent scores across multiple rounds

### 🎯 Game Modes
- **English & Hebrew** word support
- **Variable word lengths**: 4, 5, or 6 letters
- **Custom word queue**: Add your own words with attribution
- Maximum 6 guesses per word

### 👑 Host Controls
- **Start Game**: Begin a new round
- **Skip Word**: End current round immediately
- **Reset Round**: Clear game and return to waiting
- **Clear Scores**: Reset all player scores
- **Game Settings**: Configure language and word length

### 🎨 Beautiful UI
- Glassmorphism design with backdrop blur
- Gradient backgrounds and text
- Responsive mobile & desktop layouts
- Smooth animations and transitions
- Custom styled scrollbars
- Dark theme optimized

### 🌍 Full Localization
- **English and Hebrew** support throughout the entire app
- Language selector on home page (persists in localStorage)
- RTL (Right-to-Left) support for Hebrew
- Easy to add more languages via `src/lib/i18n.ts`

### 📱 Mobile Optimized
- Touch-friendly keyboard
- Tab navigation (Game/Players)
- Optimized for iPhone and Android
- Safari-specific fixes
- **Leave room button** on mobile and desktop

## Getting Started

### Development
```bash
npm install
npm run dev
```
Open [http://localhost:3000](http://localhost:3000)

### Building
```bash
npm run build
npm start
```

### Linting
```bash
npm run lint
```

## Firebase Setup

1. Create a Firebase project at [console.firebase.google.com](https://console.firebase.google.com/)
2. Enable Realtime Database
3. Create `.env.local` with your Firebase credentials:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_domain
NEXT_PUBLIC_FIREBASE_DATABASE_URL=your_database_url
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

See `FIREBASE_SETUP.md` for detailed instructions.

## Admin Panel

Access `/admin` to:
- View room statistics (total, active, old rooms)
- Clean up old/inactive rooms
- Monitor player counts

⚠️ **Production**: Add authentication before deploying!

## Room Cleanup

Automatically clean up old rooms to save database space:

```typescript
import { cleanupOldRooms } from '@/lib/roomCleanup';

// Clean up rooms older than 24 hours
await cleanupOldRooms(24);
```

Consider setting up a Cloud Function to run this periodically.

## Tech Stack

- **Next.js 16** - React framework with App Router
- **React 19** - UI library
- **TypeScript** - Type safety
- **Firebase** - Realtime Database for multiplayer sync
- **Tailwind CSS 4** - Styling with custom design system
- **Lucide React** - Icons

## Project Structure

```
src/
├── app/
│   ├── page.tsx              # Home page (create/join room)
│   ├── room/[roomId]/        # Game room page
│   └── admin/                # Admin panel
├── components/
│   └── game/
│       └── GameBoard.tsx     # Wordle game board & keyboard
├── lib/
│   ├── firebase.ts           # Firebase initialization
│   ├── gameLogic.ts          # Wordle logic & keyboard layouts
│   ├── wordLists.ts          # Word lists by language/length
│   └── roomCleanup.ts        # Room cleanup utilities
```

## Deployment

### Firebase Hosting
```bash
npm run build
firebase deploy --only hosting
```

### Docker
```bash
docker build -t friendle .
docker run -p 3000:3000 friendle
```

See `DEPLOY.md` for detailed deployment instructions.

## Documentation

- `CLAUDE.md` - Developer guide for Claude Code
- `FIREBASE_SETUP.md` - Firebase configuration guide
- `DEPLOY.md` - Deployment instructions and checklist
- `SECURITY.md` - Security guide and best practices
- `LOCALIZATION.md` - Guide for adding new languages
- `IMPROVEMENTS.md` - Recent improvements and features

## Contributing

Feel free to submit issues and pull requests!

## License

MIT

---

Built with ❤️ using Next.js and Firebase
