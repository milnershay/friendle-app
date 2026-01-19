# useRoom Hook - Comprehensive Bug Analysis Report

## Executive Summary

The `useRoom.ts` hook is the core state management for Friendle's multiplayer Wordle experience. This analysis identified **13 significant bugs**, **8 error handling gaps**, and **6 architectural concerns** that could lead to data loss, race conditions, and inconsistent game state.

---

## Critical Bugs Found

### 1. Race Condition in Transaction Handling (Line 138-161: `joinRoom`)

**Severity:** HIGH

**Issue:**
```typescript
const { committed, snapshot } = await runTransaction(roomRef, (currentRoom) => {
    if (!currentRoom) {
        return;  // ⚠️ PROBLEM: Returns undefined - transaction aborts silently
    }
    // ... update logic
    return currentRoom;
});

if (committed) {
    const newPlayerCount = snapshot.child('playerCount').val();
    // Handle public rooms
}
```

**Problems:**
- When a room doesn't exist, `return;` with no value returns `undefined`
- Transaction aborts but `committed` might still be `true` or return unexpected state
- No error handling if snapshot read fails after transaction
- Public room update logic doesn't retry on failure

**Impact:**
- Players may appear to join but not actually be added to room
- Player count gets out of sync with public rooms listing
- No notification to user that join failed

**Recommended Fix:**
```typescript
if (!currentRoom) {
    throw new Error("Room does not exist");
}
// ... rest of logic
```

---

### 2. Missing Null Check in submitGuess (Line 393-394)

**Severity:** HIGH

**Issue:**
```typescript
const player = room.players[userId];
if (!player || player.status !== 'playing') return;
```

**Problems:**
- Room is already checked for null at line 391, but `room.players` could be undefined
- `room.players[userId]` could be null, returning without feedback
- No error state is set to inform user

**Impact:**
- Silent failures when submitting guesses
- Player won't know their guess didn't register
- No console error to help debug

**Recommended Fix:**
```typescript
if (!room?.players || !room.players[userId]) {
    console.error("Player not found in room");
    return;
}
```

---

### 3. Off-by-One Error in Routine Index Calculation (Line 461-465)

**Severity:** MEDIUM

**Issue:**
```typescript
if (room.settings.useRoutine && room.settings.dailyRoutine && room.settings.dailyRoutine.length > 0) {
    const routine = room.settings.dailyRoutine;
    // The routineIndex is updated *for the next round*, so we look at the one that just finished.
    const nextGameIndex = room.routineIndex ?? 1;  // ⚠️ Default is 1, not 0!
    const actualIndex = (nextGameIndex - 1 + routine.length) % routine.length;
    // ...
}
```

**Problems:**
- Default value of `1` assumes routineIndex exists, but first game would have `routineIndex: 0`
- This causes stats to be recorded for the wrong routine game on first game
- The modulo arithmetic is correct but the initial assumption is flawed

**Impact:**
- Stats incorrectly categorized for first routine game in a session
- Users' statistics become inaccurate
- Routine games might use wrong language/length combination

**Recommended Fix:**
```typescript
const nextGameIndex = room.routineIndex ?? 0;  // Default to 0
const actualIndex = (nextGameIndex === 0 ? routine.length - 1 : nextGameIndex - 1);
```

---

### 4. Missing Error Handling in startGame Transaction (Line 285-365)

**Severity:** HIGH

**Issue:**
```typescript
const transaction = async () => {
    const roomRef = ref(db, `rooms/${roomId}`);
    await runTransaction(roomRef, (currentRoom: RoomData | null) => {
        if (!currentRoom) return; // ⚠️ Silent abort
        // ... complex logic with no error handling
        return { ...currentRoom, ... };
    });
    toast.success("Game started!");
    await remove(ref(db, `public_rooms/${roomId}`));  // ⚠️ Separate operation, can fail
};

await safeWrite(transaction)
    .catch(() => setError("Failed to start game"))
    .finally(() => setActionLoading(null));
```

**Problems:**
- If `currentRoom` is null, transaction silently aborts but no error is set
- No check if transaction actually committed
- `remove()` on public_rooms can fail independently, but error is swallowed
- If room creation fails during startGame, both operations fail but only generic error shown

**Impact:**
- Game appears to start but never actually starts
- Public room listing not cleaned up, showing finished game as available
- Players stuck in "starting" state with no feedback

**Recommended Fix:**
```typescript
const transaction = async () => {
    const roomRef = ref(db, `rooms/${roomId}`);
    const { committed, snapshot } = await runTransaction(roomRef, (currentRoom: RoomData | null) => {
        if (!currentRoom) {
            throw new Error("Room no longer exists");
        }
        // ... logic
        return updatedRoom;
    });
    
    if (!committed) {
        throw new Error("Failed to update room state");
    }
    
    toast.success("Game started!");
    try {
        await remove(ref(db, `public_rooms/${roomId}`));
    } catch (err) {
        console.warn("Failed to remove from public rooms:", err);
        // Don't fail the whole operation for this
    }
};
```

---

### 5. Concurrent Submission Race Condition (Line 389-492)

**Severity:** MEDIUM

**Issue:**
```typescript
const submitGuess = useCallback(async (guess: string) => {
    if (isSubmittingRef.current) return;  // Prevents concurrent submissions
    if (!room || room.gameState !== 'playing' || !userId) return;

    isSubmittingRef.current = true;
    try {
        // ... guess processing
        // Calls checkGameOver() which does async get() and update()
        if (gameCompleted) {
            checkGameOver();  // ⚠️ Not awaited! Fire-and-forget
        }
    } finally {
        isSubmittingRef.current = false;
    }
}, [room, roomId, userId, checkGameOver, updateUserStats]);
```

**Problems:**
- `checkGameOver()` is not awaited, fires asynchronously
- If another guess comes in before checkGameOver completes, game state might not be final
- `isSubmittingRef` is set to false before checkGameOver finishes
- Two players finishing simultaneously could both call checkGameOver without proper race condition handling

**Impact:**
- Game could transition to "finished" multiple times
- Players could submit guesses after the game should be over
- Leaderboard updates might be out of order

**Recommended Fix:**
```typescript
if (gameCompleted) {
    // Don't await, but ensure only one checkGameOver runs at a time
    checkGameOver().catch(err => {
        console.error("Failed to check game over:", err);
        // Handle error appropriately
    });
}
```

Or add a flag to prevent multiple concurrent checkGameOver calls.

---

### 6. Initialization Race Condition (Line 220-225)

**Severity:** MEDIUM

**Issue:**
```typescript
useEffect(() => {
    // ... onValue subscription
    const unsubscribe = onValue(roomRef, (snapshot) => {
        setRoomLoading(false);
        if (snapshot.exists()) {
            const data = snapshot.val() as RoomData;
            // ... check players ...
            
            // If I am not in the players list, join automatically
            if (!data.players || !data.players[userId]) {
                joinRoom();  // ⚠️ Called every time room updates if not joined!
            }
        } else {
            // Room doesn't exist, create it
            initializeRoom();
        }
    }, (err) => {
        console.error("Firebase error:", err);
        setError(err.message);
        setRoomLoading(false);
    });

    return () => unsubscribe();
}, [roomId, userId, username, joinRoom]);
```

**Problems:**
- `joinRoom` is in dependency array, so every time it changes, effect re-runs
- `joinRoom` changes when dependencies change, causing infinite re-runs during initial load
- If `joinRoom` fails, it's retried on every room update
- No debouncing or deduplication of join attempts

**Impact:**
- Multiple join attempts for same player
- Player count increments incorrectly
- Duplicate Firebase operations

**Recommended Fix:**
```typescript
const [hasJoined, setHasJoined] = useState(false);

useEffect(() => {
    if (!userId || !username || hasJoined) return;
    
    const joinAttempt = async () => {
        try {
            await joinRoom();
            setHasJoined(true);
        } catch (err) {
            console.error("Failed to join:", err);
            // Will retry on next room update
        }
    };
    
    const unsubscribe = onValue(roomRef, (snapshot) => {
        if (snapshot.exists()) {
            const data = snapshot.val() as RoomData;
            if (!data.players?.[userId] && !hasJoined) {
                joinAttempt();
            }
        } else {
            initializeRoom();
        }
    });
    
    return () => unsubscribe();
}, [roomId, userId, username, hasJoined]);
```

---

### 7. Missing Guard in leaveRoom Transaction (Line 587-590)

**Severity:** MEDIUM

**Issue:**
```typescript
const leaveRoom = useCallback(async () => {
    if (!userId) return;
    const action = async () => {
        const roomRef = ref(db, `rooms/${roomId}`);
        const { committed, snapshot } = await runTransaction(roomRef, (currentRoom) => {
            if (!currentRoom) return;  // ⚠️ Silent abort again
            
            if (currentRoom.players && currentRoom.players[userId]) {
                delete currentRoom.players[userId];
            }
            currentRoom.playerCount = Object.keys(currentRoom.players || {}).length;
            return currentRoom;
        });

        if (committed) {
            // ... public room cleanup
        }
    };
    // ...
}, [userId, roomId, safeWrite]);
```

**Problems:**
- Same issue as `joinRoom`: `return;` without value aborts transaction
- No error if `currentRoom` doesn't exist (room already deleted by another player)
- Public room cleanup assumes transaction succeeded even if room is already gone
- Race condition if last two players leave simultaneously

**Impact:**
- Player records might not be cleaned up
- Public rooms not properly updated when last player leaves
- Room might not be deleted if last player fails to leave properly

**Recommended Fix:**
Same pattern as joinRoom - throw error if room doesn't exist.

---

### 8. Stats Update Called Without Await (Line 478)

**Severity:** MEDIUM

**Issue:**
```typescript
if (gameCompleted) {
    // ...
    const gameRecord: GameHistory = { /* ... */ };
    
    // This handles all persistent stat calculations and achievements
    updateUserStats(gameRecord);  // ⚠️ Not awaited!
}

await safeWrite(async () => update(ref(db, `rooms/${roomId}/players/${userId}`), updateData));
```

**Problems:**
- `updateUserStats` is fire-and-forget, could fail silently
- If stats update fails, user doesn't know
- Stats might not be saved if app crashes before operation completes
- No error handling for stats update failures

**Impact:**
- Game records lost
- Statistics inaccurate
- Achievements not awarded even if earned

**Recommended Fix:**
```typescript
if (gameCompleted) {
    try {
        await updateUserStats(gameRecord);
    } catch (err) {
        console.error("Failed to update stats:", err);
        toast.error("Failed to save game stats. Your game was recorded but stats may not update.");
        // Queue for retry
    }
}
```

---

### 9. Public Room Cleanup Inconsistency (Line 156-161, 360)

**Severity:** MEDIUM

**Issue:**
```typescript
// In joinRoom (line 157):
if (newPlayerCount >= 8) {
    await remove(ref(db, `public_rooms/${roomId}`));
} else if (snapshot.child('settings/isPublic').val()) {
    await update(ref(db, `public_rooms/${roomId}`), { playerCount: newPlayerCount });
}

// In startGame (line 360):
await remove(ref(db, `public_rooms/${roomId}`));

// In resetRound (line 535-540):
if (room.settings.isPublic) {
    await set(ref(db, `public_rooms/${roomId}`), {
        playerCount: room.playerCount || 1,
        createdAt: Date.now(),
    });
}
```

**Problems:**
- Inconsistent logic for updating public rooms
- No check if `createdAt` already exists before overwriting
- Race condition if room becomes full then player leaves
- `isPublic` changes aren't always propagated to public_rooms collection

**Impact:**
- Public rooms list has stale data
- Finished games still appear in "available" rooms
- Full rooms reappear in listing after someone leaves if timing is wrong

**Recommended Fix:**
```typescript
const updatePublicRoomListing = async (isPublic: boolean, playerCount: number) => {
    const publicRoomRef = ref(db, `public_rooms/${roomId}`);
    if (isPublic && playerCount < 8) {
        const snapshot = await get(publicRoomRef);
        if (snapshot.exists()) {
            await update(publicRoomRef, { playerCount });
        } else {
            await set(publicRoomRef, {
                playerCount,
                createdAt: Date.now(),
            });
        }
    } else if (!isPublic || playerCount >= 8) {
        await remove(publicRoomRef);
    }
};
```

---

### 10. Word Queue Update Inconsistency (Line 572-574)

**Severity:** MEDIUM

**Issue:**
```typescript
const addCustomWord = useCallback(async (word: string) => {
    if (!room) return;
    const action = async () => {
        const currentQueue = room.settings.customQueue || [];
        const wordEntry = { word: word.toUpperCase(), suggester: username || "Anonymous" };
        const updatedQueue = [...currentQueue, wordEntry];

        await update(ref(db, `rooms/${roomId}`), {
            wordQueue: updatedQueue,
            "settings/customQueue": updatedQueue  // ⚠️ Updates both locations
        });
    };
    await safeWrite(action);
}, [room, roomId, username, safeWrite]);
```

**Problems:**
- Updates both `wordQueue` and `settings/customQueue` separately
- If first update succeeds but second fails, data gets out of sync
- No indication to user if operation partially fails
- Later code assumes `wordQueue` and `settings.customQueue` are the same

**Impact:**
- Word queue becomes inconsistent
- Custom words might not appear in queue for new games
- Admin UI shows different words than game actually uses

**Recommended Fix:**
```typescript
// Decide: is it wordQueue or settings.customQueue?
// Update only one source of truth, or use transaction to update both atomically
```

---

### 11. Unhandled Promise Rejection in Initial Room Load (Line 238-282)

**Severity:** MEDIUM

**Issue:**
```typescript
const initializeRoom = useCallback(async () => {
    if (!userId || !username) return;
    const roomRef = ref(db, `rooms/${roomId}`);

    try {
        const snapshot = await get(roomRef);
        const currentRoom = snapshot.val();

        if (!currentRoom) {
            // Create new room
            await set(roomRef, initialRoom);
            await set(ref(db, `public_rooms/${roomId}`), { ... });  // ⚠️ No error handling if this fails
        } else {
            // Join existing room
            if (!currentRoom.players || !currentRoom.players[userId]) {
                joinRoom();  // ⚠️ Not awaited, not error handled
            }
        }
    } catch (err) {
        console.error("Error initializing room:", err);
        setError("Failed to join room");
    }
}, [roomId, userId, username, joinRoom, preferredLanguage]);
```

**Problems:**
- `joinRoom()` not awaited on existing room join
- `set()` for public rooms might fail with no retry
- Generic error message doesn't specify what failed
- If public room creation fails, main room exists but not listed publicly

**Impact:**
- User gets "Failed to join room" but actually joined the room
- New rooms don't appear in public listing
- Confusing UX with misleading errors

**Recommended Fix:**
```typescript
try {
    const snapshot = await get(roomRef);
    const currentRoom = snapshot.val();

    if (!currentRoom) {
        await set(roomRef, initialRoom);
        try {
            await set(ref(db, `public_rooms/${roomId}`), { ... });
        } catch (err) {
            console.warn("Failed to add to public rooms, but room created:", err);
            // Non-critical, continue
        }
    } else {
        if (!currentRoom.players?.[userId]) {
            await joinRoom();
        }
    }
} catch (err) {
    console.error("Error initializing room:", err);
    setError(`Failed to initialize room: ${err.message}`);
    throw; // Re-throw for safeWrite to handle
}
```

---

### 12. Settings Update Without Validation (Line 494-508)

**Severity:** LOW-MEDIUM

**Issue:**
```typescript
const updateSettings = useCallback(async (newSettings: Partial<RoomSettings>) => {
    const action = async () => {
        await update(ref(db, `rooms/${roomId}/settings`), newSettings);  // ⚠️ No validation
        if (newSettings.isPublic === true) {
            await set(ref(db, `public_rooms/${roomId}`), {
                playerCount: room?.playerCount || 1,
                createdAt: Date.now(),  // ⚠️ Overwrites existing createdAt
            });
        } else if (newSettings.isPublic === false) {
            await remove(ref(db, `public_rooms/${roomId}`));
        }
        toast.success("Settings updated!");
    };
    await safeWrite(action);
}, [roomId, safeWrite, room]);
```

**Problems:**
- No validation of settings values (negative word length, null language, etc.)
- `createdAt` timestamp overwritten when toggling public status
- No rollback if update partially fails
- Room reference can be stale at callback time

**Impact:**
- Invalid game configurations possible
- Creation timestamp lost
- Silent failures if updates fail

**Recommended Fix:**
```typescript
const updateSettings = useCallback(async (newSettings: Partial<RoomSettings>) => {
    // Validate settings
    if (newSettings.wordLength && (newSettings.wordLength < 4 || newSettings.wordLength > 6)) {
        toast.error("Word length must be between 4 and 6");
        return;
    }
    if (newSettings.language && !['en', 'he'].includes(newSettings.language)) {
        toast.error("Invalid language");
        return;
    }
    
    const action = async () => {
        await update(ref(db, `rooms/${roomId}/settings`), newSettings);
        // ... rest
    };
    await safeWrite(action);
}, [roomId, safeWrite]);
```

---

### 13. Missing Null Checks in clearScores (Line 553-563)

**Severity:** LOW

**Issue:**
```typescript
const clearScores = useCallback(async () => {
    if (!room) return;
    const action = async () => {
        const updatedPlayers = { ...room.players };  // ⚠️ room.players could be undefined
        Object.keys(updatedPlayers).forEach(key => {
            updatedPlayers[key].score = 0;
        });
        await update(ref(db, `rooms/${roomId}/players`), updatedPlayers);
    };
    await safeWrite(action);
}, [room, roomId, safeWrite]);
```

**Problems:**
- No null check for `room.players`
- Would throw error if room has no players

**Impact:**
- Clear scores button could crash the component

**Recommended Fix:**
```typescript
const updatedPlayers = { ...(room.players || {}) };
```

---

## Error Handling Gaps

### Gap 1: No Error Handling in Presence Updates (Line 177-179)

```typescript
onValue(connectedRef, (snap) => {
    if (snap.val() === true) {
        const con = onDisconnect(myPlayerRef);
        con.update({ online: false });
        update(myPlayerRef, { online: true });  // ⚠️ No error handling
    }
});
```

**Impact:** Silent failures when marking player as online
**Fix:** Add try-catch or error callback

---

### Gap 2: No Error Handling in onDisconnect Setup (Line 177-178)

```typescript
const con = onDisconnect(myPlayerRef);
con.update({ online: false });  // ⚠️ No error handling
```

**Impact:** Offline detection may not work
**Fix:** Handle errors from onDisconnect operations

---

### Gap 3: No Retry Logic for Failed joinRoom (Line 163)

```typescript
await safeWrite(action).catch(() => setError("Failed to join room"));
```

**Problems:**
- One-time failure, no retry
- Player stuck in loading state with error
- No guidance on how to resolve

**Impact:** User must manually refresh page
**Fix:** Implement automatic retry with exponential backoff

---

### Gap 4: checkGameOver Silent Failures (Line 369-387)

```typescript
const checkGameOver = useCallback(async () => {
    const snapshot = await get(ref(db, `rooms/${roomId}`));
    const freshRoom = snapshot.val() as RoomData;
    if (!freshRoom || freshRoom.gameState !== 'playing') return;  // ⚠️ Silent return

    const players = Object.values(freshRoom.players || {});
    const allFinished = players.every(p => p.status === 'won' || p.status === 'lost');

    if (allFinished) {
        const updatePayload: Record<string, unknown> = {
            gameState: 'finished'
        };
        if (freshRoom.settings.useRoutine) {
            updatePayload.dailyRound = (freshRoom.dailyRound || 0) + 1;
        }
         await safeWrite(async () => update(ref(db, `rooms/${roomId}`), updatePayload));
    }
}, [roomId, safeWrite]);
```

**Problems:**
- No error handling for `get()` operation
- Silent returns provide no feedback
- No logging to understand why game over check failed
- Room state check might be stale

**Impact:** Game doesn't transition to finished state
**Fix:** Add proper error handling and logging

---

### Gap 5: No Error Handling in resetRound (Line 543-545)

```typescript
await safeWrite(action)
    .catch(() => setError("Failed to reset round"))
    .finally(() => setActionLoading(null));
```

**Problems:**
- Generic error message
- No retry mechanism
- Player count might be stale in setRound

---

### Gap 6: leaveRoom Error Not Re-thrown (Line 623-626)

```typescript
await safeWrite(action).catch((err) => {
    console.error("Failed to leave room:", err);
    toast.error("Failed to leave room. Please try again.");
});
```

**Problems:**
- Error is caught but not re-thrown
- Component can't tell if leave succeeded or failed
- Navigation might happen even if leave failed

---

### Gap 7: No Error Handling in Player Join/Leave Notifications (Line 201-212)

```typescript
currentPlayerIds.forEach(id => {
    if (!prevPlayerIds.includes(id) && id !== userId) {
        toast(`${currentPlayers[id].username} has joined the room.`);  // ⚠️ currentPlayers[id] could be undefined
    }
});
```

**Problems:**
- Could crash if player data is missing
- No error handling

---

### Gap 8: Unhandled Database Errors in onValue (Line 227-231)

```typescript
}, (err) => {
    console.error("Firebase error:", err);
    setError(err.message);
    setRoomLoading(false);
});
```

**Problems:**
- Only sets error state once
- No recovery mechanism
- Subscription stops working but component doesn't indicate this
- Long error messages might not be user-friendly

---

## Architectural Concerns

### 1. Transaction Abort Pattern is Fragile

All transactions follow this pattern:
```typescript
await runTransaction(ref, (data) => {
    if (!data) return;  // Abort silently
    // ... mutations
    return data;
});
```

**Problem:** Firebase doesn't clearly document when transaction aborts vs completes. Using `return;` with no value is unreliable.

**Recommendation:** Always check `committed` flag and throw errors for abort conditions.

---

### 2. No Queue for Offline Operations

The `safeWrite` wrapper checks online status but doesn't queue operations:
```typescript
const safeWrite = useCallback(async <T extends (...args: any[]) => Promise<any>>(
    action: T,
    ...args: Parameters<T>
): Promise<ReturnType<T> | void> => {
    if (!isOnline || !isConnectedToFirebase) {
        toast.error("You are offline. Your action will be saved when you reconnect.", { id: "offline-toast" });
        // In a future step, we would queue this action.
        // For now, we just prevent it and notify the user.
        return;
    }
    // ...
}, [isOnline, isConnectedToFirebase]);
```

**Problem:** Operations are lost if offline, users have no way to retry
**Impact:** Player data lost, guesses don't register, rooms can't be joined
**Recommendation:** Implement operation queueing using localStorage

---

### 3. Race Condition Between joinRoom and initializeRoom

```typescript
if (!data.players || !data.players[userId]) {
    joinRoom();  // Called on every room update
}
```

And in initializeRoom:
```typescript
if (!currentRoom.players || !currentRoom.players[userId]) {
    joinRoom();
}
```

**Problem:** Multiple code paths trigger joins
**Impact:** Duplicate join operations, inflated player counts

---

### 4. Stale Closure in resetRound and clearScores

```typescript
const resetRound = useCallback(async () => {
    if (!room) return;
    const action = async () => {
        const updatedPlayers = { ...room.players };  // ⚠️ Stale room reference
        // ...
    };
}, [room, roomId, safeWrite]);

const clearScores = useCallback(async () => {
    if (!room) return;
    const action = async () => {
        const updatedPlayers = { ...room.players };  // ⚠️ Stale room reference
        // ...
    };
}, [room, roomId, safeWrite]);
```

**Problem:** If `room` state updates after callback is created, the async action uses stale data
**Impact:** Player updates might lose concurrent changes, or use outdated player list
**Recommendation:** Fetch fresh room state in the action, or use transaction with fresh read

---

### 5. No Transaction for Multi-Step Operations

Several operations do multiple Firebase writes:
```typescript
// startGame: write room, then remove from public
// initializeRoom: set room, then set public room
// addCustomWord: updates both wordQueue and settings/customQueue
```

**Problem:** Partial failures leave database in inconsistent state
**Impact:** Data corruption, game state inconsistencies
**Recommendation:** Use transactions for all multi-step operations

---

### 6. No Validation of User Permissions

- Any player can call `updateSettings` even if not host
- Any player can call `resetRound`, `skipWord`, `clearScores`
- No checks for room ownership or player role

**Impact:** Non-host players can disrupt games
**Recommendation:** Implement role-based access control in the hook or cloud rules

---

## Summary of Severity Levels

| Severity | Count | Issues |
|----------|-------|--------|
| CRITICAL | 0 | N/A |
| HIGH | 3 | Race conditions in transactions (1, 4, 5) |
| MEDIUM | 8 | Null checks, race conditions, validation |
| LOW | 2 | Minor null checks |
| **Total** | **13** | **Bugs** |

---

## Error Handling Summary

| Category | Count | Status |
|----------|-------|--------|
| Missing try-catch | 4 | Gap 1-4 |
| Unhandled promise rejections | 2 | Gap 6-7 |
| Silent failures | 5 | Multiple (joinRoom, checkGameOver, etc.) |
| Generic error messages | 3 | Gaps 5, 6 |
| No retry logic | 3 | Gap 3, resetRound, clearScores |
| **Total** | **17** | **Error Handling Issues** |

---

## Recommendations for Remediation

### Immediate Priority (This Week)
1. Fix transaction abort handling (bugs 1, 4, 7)
2. Add missing null checks (bugs 2, 13)
3. Add error handling to presence updates (gaps 1, 2)

### High Priority (This Sprint)
4. Fix initialization race condition (bug 6)
5. Implement offline operation queue (arch concern 2)
6. Add permission checks for admin functions (arch concern 6)

### Medium Priority (Next Sprint)
7. Implement atomic multi-step operations with transactions (arch concern 5)
8. Fix routine index calculation (bug 3)
9. Implement retry logic for failed operations (gap 3)

### Technical Debt
10. Add comprehensive error handling throughout
11. Add operation logging for debugging
12. Write unit tests for critical paths
13. Add TypeScript strict checks for null safety

---

## Testing Strategy

For each bug, add tests for:
1. Normal happy path
2. Network failure scenarios
3. Race conditions (concurrent operations)
4. Stale state handling
5. Partial failure recovery
6. Edge cases (empty rooms, single player, etc.)

Example test structure:
```typescript
describe('useRoom - joinRoom', () => {
    it('should handle room that no longer exists', () => { });
    it('should retry on failure', () => { });
    it('should handle concurrent joins', () => { });
    it('should update public rooms correctly', () => { });
});
```

---

## Files That Need Changes

1. `/Users/shay.milner/code/Friendle/src/hooks/useRoom.ts` - Primary file with all bugs
2. `/Users/shay.milner/code/Friendle/src/hooks/useConnectionStatus.ts` - Offline queue needed
3. Potentially database rules to enforce permissions
4. Test file needed: `src/hooks/__tests__/useRoom.test.ts`

---

## Additional Context

Recent commits show similar issues were fixed:
- `ab620e4`: "Fix inaccurate player count calculation in useRoom hook"
- `36698dc`: "Fix duplicate stats recording on concurrent guess submission"
- `58df023`: "Fix: Repair 'Join Random Room' matchmaking functionality"

These patterns suggest systematic issues with concurrent operations and race conditions throughout the codebase.
