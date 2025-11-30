# Bug Report - Friendle App
**Generated:** 2025-11-30
**Status:** Needs fixing

## 🔴 Critical Bugs (App Breaking)

### 1. **TypeError: Cannot read properties of undefined (reading 'language')**
**Severity:** CRITICAL
**Impact:** App crashes on room page load
**Affected Files:**
- `src/components/room/GameView.tsx:12`
- `src/components/room/PlayerList.tsx:14`
- `src/components/room/RoomLobby.tsx:30, 39`
- `src/components/room/ResultsView.tsx:17`
- `src/utils/shareResults.ts`

**Problem:**
All these components access `room.settings.language` or other properties of `room.settings` without checking if `settings` exists. When Firebase loads a room or during initial state, `room.settings` can be `undefined`, causing crashes.

**Example:**
```typescript
// GameView.tsx line 12
const t = useTranslation(room.settings.language || 'en'); // ❌ Crashes if settings is undefined

// Should be:
const t = useTranslation(room.settings?.language || 'en'); // ✅ Optional chaining
```

**Evidence:**
- E2E test logs show: `TypeError: Cannot read properties of undefined (reading 'language')`
- All 4 E2E tests failing due to this issue

**Fix Required:**
- Add optional chaining (`?.`) to all `room.settings` accesses
- OR ensure `settings` is always defined in RoomData initialization

---

### 2. **All E2E Tests Failing (4/4 failures)**
**Severity:** CRITICAL (for CI/CD)
**Impact:** Cannot merge PRs, CI pipeline broken
**Tests Failing:**
1. `e2e/game-flow.spec.ts` - Start button not visible
2. `e2e/multiplayer-game.spec.ts` (2 tests) - Player names not visible
3. `e2e/multiplayer-input.spec.ts` - "Waiting..." text not found

**Root Cause:**
Related to Bug #1 - components crash due to undefined settings, preventing UI from rendering.

**Evidence:**
From test output (test-output.log):
```
Error: expect(locator).toBeVisible() failed
Locator: getByText('Alice').first()
Expected: visible
Timeout: 5000ms
Error: element(s) not found
```

**Fix Required:**
- Fix Bug #1 (settings undefined)
- Possibly update test selectors if UI changed
- Ensure Firebase emulator setup is correct

---

## 🟡 Medium Priority Bugs

### 3. **React Warning: Missing Keys in PlayerList**
**Severity:** MEDIUM
**Impact:** Console warnings, potential rendering issues
**Affected File:** `src/components/room/PlayerList.tsx:72`

**Problem:**
React warning: "Each child in a list should have a unique 'key' prop"

**Evidence:**
```
Check the render method of `PlayerList`.
```

**Current Code:**
```typescript
.map((player, index) => (
  <div key={player.id} className={...}> // Key is present but warning still shows
```

**Investigation Needed:**
- Check if `player.id` values are unique
- Check if there's another map without keys
- Verify all list iterations have proper keys

---

### 4. **"You are offline" Banner Shows When Online**
**Severity:** MEDIUM
**Impact:** Confusing UX, false negative
**Affected File:** `src/components/ConnectionStatus.tsx`

**Problem:**
The yellow offline banner appears even when the user is online.

**Evidence:**
Dev server HTML output shows:
```html
<div role="status" aria-live="polite" class="... bg-yellow-500 ...">
  You are offline. Please check your internet connection.
</div>
```

**Investigation Needed:**
- Check `useConnectionStatus` hook logic
- Verify browser online/offline detection
- Check Firebase connection state detection

---

## 🔵 Low Priority / Minor Issues

### 5. **Potential Race Condition in Room Initialization**
**Severity:** LOW
**Impact:** Theoretical issue, may not manifest
**Affected File:** `src/hooks/useRoom.ts:263`

**Observation:**
When creating a new room, `settings` is always defined:
```typescript
settings: { wordLength: 5, customQueue: [], language: roomLanguage, isPublic: true }
```

However, old rooms in Firebase may not have this field, or there may be a brief moment during loading where it's undefined.

**Fix Suggested:**
- Add Firebase migration script for old rooms
- OR add default settings in the RoomData type interface

---

### 6. **TypeScript Type Safety Issues**
**Severity:** LOW
**Impact:** Future maintenance harder

**Observation:**
RoomData interface defines `settings: RoomSettings` (required, not optional), but in practice it can be undefined. This is a type/reality mismatch.

**Fix Suggested:**
```typescript
// Option 1: Make it optional in the type
export interface RoomData {
    // ...
    settings?: RoomSettings; // Reflect reality
}

// Option 2: Ensure it's never undefined
// Use default values in Firebase reads
```

---

## 📋 Test Suite Summary

**Unit Tests:** ✅ **85/85 passing**
**Lint:** ✅ **0 errors**
**E2E Tests:** ❌ **0/4 passing** (all failing)
**Build:** ❔ Not tested in this session

---

## 🎯 Recommended Fix Priority

1. **IMMEDIATE:** Fix Bug #1 (settings undefined) - This will likely fix Bug #2 as well
2. **HIGH:** Investigate and fix Bug #4 (offline banner)
3. **MEDIUM:** Fix Bug #3 (React keys warning)
4. **LOW:** Address type safety (Bug #6)
5. **OPTIONAL:** Migration for old rooms (Bug #5)

---

## 🚀 Suggested Approach

### Option A: Quick Fixes (Claude directly)
- Fix Bug #1 with optional chaining in all affected files (~10 min)
- Test E2E to verify fixes
- Fix remaining issues

### Option B: Jules Tasks (Asynchronous)
Create separate Jules tasks for:
1. "Fix undefined room.settings crashes across all components"
2. "Fix offline banner showing incorrectly"
3. "Fix React keys warning in PlayerList"
4. "Add comprehensive error boundaries and type safety"

### Option C: Hybrid (Recommended)
- **Claude:** Quick fix Bug #1 now (critical, simple)
- **Jules:** Handle Bugs #3, #4 in parallel
- **Jules:** Add comprehensive testing + error handling

---

## 📊 Files That Need Changes

### Definitely Need Fixes:
1. `src/components/room/GameView.tsx`
2. `src/components/room/PlayerList.tsx`
3. `src/components/room/RoomLobby.tsx`
4. `src/components/room/ResultsView.tsx`
5. `src/utils/shareResults.ts`
6. `src/components/ConnectionStatus.tsx`

### Possibly Need Changes:
7. `src/hooks/useRoom.ts` (type definition or default handling)
8. E2E test files (if selectors need updating)

---

**Total Bugs Found:** 6
**Critical:** 2
**Medium:** 2
**Low:** 2
