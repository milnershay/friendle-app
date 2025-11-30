import { Player, RoomData, parseGuesses } from "@/hooks/useRoom";
import { checkGuess } from "@/lib/gameLogic";

function getPlayerRank(player: Player, room: RoomData): string {
    const players = Object.values(room.players || {}).sort((a, b) => {
        if (a.status === 'won' && b.status !== 'won') return -1;
        if (a.status !== 'won' && b.status === 'won') return 1;
        if (a.status === 'won' && b.status === 'won') {
            return (b.finalScore || 0) - (a.finalScore || 0);
        }
        return 0;
    });
    const rank = players.findIndex(p => p.id === player.id);
    if (rank === -1) return '';
    const rankNum = rank + 1;
    if (rankNum % 100 >= 11 && rankNum % 100 <= 13) {
        return `${rankNum}th`;
    }
    switch (rankNum % 10) {
        case 1: return `${rankNum}st`;
        case 2: return `${rankNum}nd`;
        case 3: return `${rankNum}rd`;
        default: return `${rankNum}th`;
    }
}

export function generateShareText(player: Player, room: RoomData): string {
    if (!room.currentWord) return "Error generating results.";

    const guesses = parseGuesses(player.guesses);
    const grid = guesses.map(guess =>
        checkGuess(guess, room.currentWord!)
            .map(status => {
                if (status === 'correct') return '🟩';
                if (status === 'present') return '🟨';
                return '⬛';
            }).join('')
    ).join('\n');

    const maxGuesses = room.settings?.maxGuesses || 6;
    const attempts = player.status === 'won' ? `${guesses.length}/${maxGuesses}` : `X/${maxGuesses}`;
    const time = player.timeTaken ? `in ${player.timeTaken.toFixed(0)}s` : '';

    const isMultiplayer = Object.keys(room.players).length > 1;

    if (isMultiplayer) {
        const rank = getPlayerRank(player, room);
        const header = player.status === 'won'
            ? `Friendle Multiplayer 🏆 ${rank} place`
            : `Friendle Multiplayer 💔`;

        return `${header}

${grid}

${attempts} ${time}
Played with ${Object.keys(room.players).length -1} friends.

Join us: https://friendle.app/room/${room.id}`;
    }

    // Single player format
    const header = player.status === 'won'
        ? `Friendle 🎯 ${attempts} ${time}`
        : `Friendle ❌ ${attempts}`;

    return `${header}

${grid}

https://friendle.app`;
}
