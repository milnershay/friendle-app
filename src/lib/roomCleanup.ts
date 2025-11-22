import { ref, get, remove } from "firebase/database";
import { db } from "./firebase";

interface RoomData {
    startTime?: number;
    players?: Record<string, { score: number }>;
    [key: string]: unknown;
}

/**
 * Clean up old/inactive rooms from Firebase
 * Removes rooms that haven't been updated in the specified time period
 */
export async function cleanupOldRooms(maxAgeHours: number = 24) {
    try {
        const roomsRef = ref(db, 'rooms');
        const snapshot = await get(roomsRef);

        if (!snapshot.exists()) {
            console.log("No rooms to clean up");
            return { deleted: 0, total: 0 };
        }

        const rooms = snapshot.val() as Record<string, RoomData>;
        const now = Date.now();
        const maxAge = maxAgeHours * 60 * 60 * 1000; // Convert hours to milliseconds

        let deletedCount = 0;
        let totalRooms = 0;

        for (const [roomId, roomData] of Object.entries(rooms)) {
            totalRooms++;
            const room = roomData;

            // Check last activity time
            const lastActivity = room.startTime || 0;
            const age = now - lastActivity;

            // Delete if:
            // 1. Room is older than maxAge
            // 2. Room has no players OR all players are in waiting state with no scores
            const hasNoActivity = age > maxAge;
            const isEmpty = !room.players || Object.keys(room.players).length === 0;
            const hasNoScores = room.players && Object.values(room.players).every((p) => p.score === 0);

            if (hasNoActivity && (isEmpty || hasNoScores)) {
                console.log(`Deleting old room: ${roomId} (age: ${(age / 1000 / 60 / 60).toFixed(1)} hours)`);
                await remove(ref(db, `rooms/${roomId}`));
                deletedCount++;
            }
        }

        console.log(`Cleanup complete: ${deletedCount} rooms deleted out of ${totalRooms} total`);
        return { deleted: deletedCount, total: totalRooms };
    } catch (error) {
        console.error("Error during room cleanup:", error);
        throw error;
    }
}

/**
 * Clean up a specific room by ID
 */
export async function deleteRoom(roomId: string) {
    try {
        await remove(ref(db, `rooms/${roomId}`));
        console.log(`Room ${roomId} deleted`);
        return true;
    } catch (error) {
        console.error(`Error deleting room ${roomId}:`, error);
        return false;
    }
}

/**
 * Get room statistics
 */
export async function getRoomStats() {
    try {
        const roomsRef = ref(db, 'rooms');
        const snapshot = await get(roomsRef);

        if (!snapshot.exists()) {
            return {
                totalRooms: 0,
                activeRooms: 0,
                oldRooms: 0,
                totalPlayers: 0
            };
        }

        const rooms = snapshot.val() as Record<string, RoomData>;
        const now = Date.now();
        const maxAge = 24 * 60 * 60 * 1000; // 24 hours

        let totalRooms = 0;
        let activeRooms = 0;
        let oldRooms = 0;
        let totalPlayers = 0;

        for (const roomData of Object.values(rooms)) {
            totalRooms++;
            const room = roomData;

            const lastActivity = room.startTime || 0;
            const age = now - lastActivity;

            if (age < maxAge) {
                activeRooms++;
            } else {
                oldRooms++;
            }

            if (room.players) {
                totalPlayers += Object.keys(room.players).length;
            }
        }

        return {
            totalRooms,
            activeRooms,
            oldRooms,
            totalPlayers,
            avgPlayersPerRoom: totalRooms > 0 ? (totalPlayers / totalRooms).toFixed(1) : 0
        };
    } catch (error) {
        console.error("Error getting room stats:", error);
        throw error;
    }
}
