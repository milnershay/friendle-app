import { RoomData, Player } from "@/hooks/useRoom";
import RoomLobby from "@/components/room/RoomLobby";
import GameView from "@/components/room/GameView";

interface RoomContentProps {
  room: RoomData;
  myPlayer: Player | undefined;
  isHost: boolean;
  actionLoading: string | null;
  startGame: () => void;
  updateSettings: (settings: Partial<RoomData['settings']>) => void;
  addCustomWord: (word: string) => void;
  handleToggleRoutine: () => void;
  handleAddToRoutine: (lang: 'en' | 'he', length: 4 | 5 | 6) => void;
  handleRemoveFromRoutine: (index: number) => void;
  submitGuess: (guess: string) => void;
}

export default function RoomContent({
  room,
  myPlayer,
  isHost,
  actionLoading,
  startGame,
  updateSettings,
  addCustomWord,
  handleToggleRoutine,
  handleAddToRoutine,
  handleRemoveFromRoutine,
  submitGuess,
}: RoomContentProps) {
  return (
    <>
      {room.gameState === 'waiting' ? (
        <RoomLobby
          room={room}
          isHost={isHost}
          loading={actionLoading}
          onStartGame={startGame}
          onUpdateSettings={updateSettings}
          onAddCustomWord={addCustomWord}
          onToggleRoutine={handleToggleRoutine}
          onAddToRoutine={handleAddToRoutine}
          onRemoveFromRoutine={handleRemoveFromRoutine}
        />
      ) : (
        <GameView
          room={room}
          myPlayer={myPlayer}
          onGuess={submitGuess}
        />
      )}
    </>
  );
}
