import { describe, it, expect } from 'vitest';

// This test validates the logic used in RoomPage to calculate the current game index
// based on the routineIndex stored in Firebase.
describe('Room Routine Index Logic', () => {
    const routineLength = 2;

    // Helper to simulate the logic in RoomPage
    const getActualIndex = (roomRoutineIndex: number | undefined) => {
        const nextGameIndex = roomRoutineIndex ?? 1;
        return (nextGameIndex - 1 + routineLength) % routineLength;
    };

    it('should calculate index correctly when routineIndex is 1', () => {
        // This means next game is 1, so current game was 0.
        const index = getActualIndex(1);
        expect(index).toBe(0);
    });

    it('should calculate index correctly when routineIndex is 0', () => {
        // This means next game is 0, so current game was 1 (wrapped).
        const index = getActualIndex(0);
        expect(index).toBe(1);
    });

    it('should calculate index correctly when routineIndex is undefined', () => {
        // Defaults to 1, so current game was 0.
        const index = getActualIndex(undefined);
        expect(index).toBe(0);
    });

    it('should work for larger routine lengths', () => {
        // Logic adaptation for test
        const length = 5;
        const getIndex = (idx: number | undefined) => ((idx ?? 1) - 1 + length) % length;

        expect(getIndex(1)).toBe(0);
        expect(getIndex(2)).toBe(1);
        expect(getIndex(4)).toBe(3);
        expect(getIndex(0)).toBe(4); // Wrap around
    });
});
