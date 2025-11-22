# Friendle - Multiplayer Wordle Game

Friendle is a real-time multiplayer Wordle game where friends can play together and compete on a leaderboard! Built with Next.js 16, React 19, and Firebase Realtime Database.

## Features

### 🎮 Multiplayer Gameplay
- **Real-time Sync**: Play simultaneously with friends. All actions are synchronized in real-time using Firebase.
- **Room System**: Create or join rooms with unique 6-character codes.
- **Live Progress**: See everyone's progress live as they play.

### 🏆 Leaderboard & Scoring
- **Ranked Leaderboard**: Players are ranked by score.
- **Medals**: Gold 🥇, Silver 🥈, Bronze 🥉 medals for top 3 players.
- **Stats Tracking**: Track solve times, guess counts, and success rates.
- **Persistent Scores**: Scores persist across multiple rounds within a room.

### 🎯 Game Modes
- **Languages**: Support for **English** and **Hebrew**.
- **Variable Word Lengths**: Choose between 4, 5, or 6 letter words.
- **Daily Routine**: Play a preset sequence of games (e.g., English 5-letter -> Hebrew 5-letter).
- **Custom Word Queue**: Players can add their own words to the queue with attribution.

### 👑 Host Controls
- **Start Game**: Begin a new round for everyone.
- **Skip Word**: End the current round immediately.
- **Reset Round**: Clear the current game and return everyone to the waiting lobby.
- **Clear Scores**: Reset all player scores to zero.
- **Game Settings**: Configure language, word length, and daily routine settings.

### 🎨 Beautiful UI
- **Glassmorphism Design**: Modern UI with backdrop blur and gradients.
- **Responsive**: Fully optimized for both desktop and mobile devices.
- **Dark Mode**: Optimized dark theme for comfortable playing.
- **Animations**: Smooth transitions and interaction effects.

## Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn
- A Firebase project

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/yourusername/friendle.git
   cd friendle
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure Environment Variables:**
   Create a `.env.local` file in the root directory and add your Firebase credentials:
   ```env
   NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_domain
   NEXT_PUBLIC_FIREBASE_DATABASE_URL=your_database_url
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_bucket
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

   # Optional: Admin Password for /admin panel
   NEXT_PUBLIC_ADMIN_PASSWORD=your_secure_password
   ```

4. **Run the development server:**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) with your browser.

## Documentation

Detailed documentation is available in the `docs/` directory:

- **[Deployment Guide](docs/deployment.md)**: Instructions for deploying to production (Vercel, Firebase, Docker).
- **[Administration](docs/administration.md)**: Admin panel usage and room cleanup procedures.
- **[Firebase Setup](docs/firebase-setup.md)**: Detailed instructions for setting up Firebase.
- **[Security](docs/security.md)**: Security best practices and considerations.
- **[Localization](docs/localization.md)**: Guide for adding new languages.
- **[GitHub Actions](docs/github-actions.md)**: CI/CD pipeline information.
- **[Developer Guide (CLAUDE.md)](CLAUDE.md)**: Architectural overview and development context.

## Project Structure

```
src/
├── app/                  # Next.js App Router pages and API routes
│   ├── admin/            # Admin panel
│   ├── api/              # API routes (cleanup, auth)
│   ├── room/[roomId]/    # Game room page
│   ├── layout.tsx        # Root layout
│   └── page.tsx          # Home page
├── components/           # React components
│   ├── game/             # Game-specific components (GameBoard)
│   └── ui/               # UI components (Logo)
├── lib/                  # Utility libraries
│   ├── firebase.ts       # Firebase initialization
│   ├── gameLogic.ts      # Wordle game logic
│   ├── i18n.ts           # Internationalization
│   ├── roomCleanup.ts    # Room management utilities
│   ├── validation.ts     # Input validation
│   └── wordLists.ts      # Word dictionaries
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License.
