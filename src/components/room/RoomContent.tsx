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
  submitGuess: (guess: string) => void;
}

export default function RoomContent({
  room,
  myPlayer,
  isHost,
  actionLoading,
  startGame,
  updateSettings,
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
