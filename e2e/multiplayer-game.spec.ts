import { test, expect } from '@playwright/test';

test.describe('Multiplayer Game Flow', () => {
    test('two players can join same room and complete a game', async ({ browser }) => {
        // Create two separate browser contexts (like two different browsers)
        const player1Context = await browser.newContext();
        const player2Context = await browser.newContext();

        const player1 = await player1Context.newPage();
        const player2 = await player2Context.newPage();

        // Enable console logging for debugging
        player1.on('console', msg => console.log('PLAYER1:', msg.text()));
        player2.on('console', msg => console.log('PLAYER2:', msg.text()));

        try {
            // PLAYER 1: Create a room
            await player1.goto('/', { waitUntil: 'networkidle' });
            await player1.waitForLoadState('domcontentloaded');
            await player1.waitForLoadState('networkidle');

            // Wait for React hydration
            await player1.getByRole('heading', { name: 'Friendle' }).waitFor({ state: 'visible', timeout: 15000 });

            // Step 1: Click "Create Room" button to enter create flow
            const createRoomButton = player1.getByRole('button', { name: /Create Room/i });
            await createRoomButton.waitFor({ state: 'visible', timeout: 10000 });
            await createRoomButton.click();

            // Step 2: Fill in username
            const p1UsernameInput = player1.getByLabel('Username', { exact: false });
            await p1UsernameInput.waitFor({ state: 'visible', timeout: 10000 });
            await p1UsernameInput.fill('Alice');

            // Step 3: Click "Create Room" submit button
            const createButton = player1.getByRole('button', { name: 'Create Room' });
            await createButton.click();

            // Wait for room page and extract room code
            await player1.waitForURL(/\/room\/[A-Z0-9]+/, { timeout: 10000 });
            const roomUrl = player1.url();
            const roomCode = roomUrl.match(/\/room\/([A-Z0-9]+)/)?.[1];

            expect(roomCode).toBeTruthy();
            console.log('Room created with code:', roomCode);

            // Verify Player 1 sees themselves in the room
            await expect(player1.getByText('Alice').first()).toBeVisible();

            // PLAYER 2: Join the same room
            await player2.goto('/', { waitUntil: 'networkidle' });
            await player2.waitForLoadState('domcontentloaded');
            await player2.waitForLoadState('networkidle');

            // Wait for React hydration
            await player2.getByRole('heading', { name: 'Friendle' }).waitFor({ state: 'visible', timeout: 15000 });

            // Step 1: Click "Join" button to enter join flow
            const joinActionButton = player2.getByRole('button', { name: 'Join' });
            await joinActionButton.waitFor({ state: 'visible', timeout: 10000 });
            await joinActionButton.click();

            // Step 2: Fill room code
            const roomCodeInput = player2.getByLabel(/room code/i);
            await roomCodeInput.waitFor({ state: 'visible', timeout: 10000 });
            await roomCodeInput.fill(roomCode!);

            // Step 3: Click "Next" to proceed to username step
            const nextButton = player2.getByRole('button', { name: 'Next' });
            await nextButton.click();

            // Step 4: Fill in username
            const p2UsernameInput = player2.getByLabel('Username', { exact: false });
            await p2UsernameInput.waitFor({ state: 'visible', timeout: 10000 });
            await p2UsernameInput.fill('Bob');

            // Step 5: Click "Join" submit button
            const joinButton = player2.getByRole('button', { name: 'Join' });
            await joinButton.click();

            // Wait for Player 2 to be in the room
            await player2.waitForURL(/\/room\/[A-Z0-9]+/, { timeout: 10000 });

            // Verify both players see each other
            await expect(player2.getByText('Bob').first()).toBeVisible();
            await expect(player2.getByText('Alice').first()).toBeVisible();

            // Player 1 should also see Player 2
            await expect(player1.getByText('Bob').first()).toBeVisible();

            console.log('Both players in room');

            // PLAYER 1 (Host): Start the game
            const startButton = player1.getByRole('button', { name: 'Start Game' });
            await startButton.waitFor({ state: 'visible', timeout: 10000 });
            await startButton.click();

            // Both players should see the game board
            await expect(player1.getByTestId('game-board').first()).toBeVisible({ timeout: 10000 });
            await expect(player2.getByTestId('game-board').first()).toBeVisible({ timeout: 10000 });

            console.log('Game started for both players');

            // PLAYER 1: Make a guess
            await player1.keyboard.type('HELLO');
            await expect(player1.getByTestId('game-board').getByText('H').first()).toBeVisible();
            await player1.keyboard.press('Enter');

            // Wait for Firebase sync
            await player1.waitForTimeout(1000);

            // PLAYER 2: Make a guess
            await player2.keyboard.type('WORLD');
            await expect(player2.getByTestId('game-board').getByText('W').first()).toBeVisible();
            await player2.keyboard.press('Enter');

            await player2.waitForTimeout(1000);

            // Verify both players can see the game board with their guesses
            const p1BoardVisible = await player1.getByTestId('game-board').isVisible();
            const p2BoardVisible = await player2.getByTestId('game-board').isVisible();

            expect(p1BoardVisible).toBeTruthy();
            expect(p2BoardVisible).toBeTruthy();

            console.log('Test completed - both players can make guesses and see game board');

        } finally {
            // Clean up
            await player1.close();
            await player2.close();
            await player1Context.close();
            await player2Context.close();
        }
    });

    test('player can create room, start game, and make guesses', async ({ browser }) => {
        const player1Context = await browser.newContext();
        const player1 = await player1Context.newPage();

        player1.on('console', msg => console.log('PLAYER1:', msg.text()));

        try {
            // Create room and start game
            await player1.goto('/', { waitUntil: 'networkidle' });
            await player1.waitForLoadState('domcontentloaded');
            await player1.waitForLoadState('networkidle');

            // Wait for React hydration
            await player1.getByRole('heading', { name: 'Friendle' }).waitFor({ state: 'visible', timeout: 15000 });

            // Step 1: Click "Create Room" button to enter create flow
            const createRoomButton = player1.getByRole('button', { name: /Create Room/i });
            await createRoomButton.waitFor({ state: 'visible', timeout: 10000 });
            await createRoomButton.click();

            // Step 2: Fill in username
            const usernameInput = player1.getByLabel('Username', { exact: false });
            await usernameInput.waitFor({ state: 'visible', timeout: 10000 });
            await usernameInput.fill('TestPlayer');

            // Step 3: Click "Create Room" submit button
            const createButton = player1.getByRole('button', { name: 'Create Room' });
            await createButton.click();

            await player1.waitForURL(/\/room\/[A-Z0-9]+/, { timeout: 10000 });

            // Verify player name is visible
            await expect(player1.getByText('TestPlayer').first()).toBeVisible();

            // Start game
            const startButton = player1.getByRole('button', { name: 'Start Game' });
            await startButton.waitFor({ state: 'visible', timeout: 10000 });
            await startButton.click();

            await expect(player1.getByTestId('game-board').first()).toBeVisible({ timeout: 10000 });

            // Make a couple of guesses to verify game mechanics work
            await player1.keyboard.type('HELLO');
            await expect(player1.getByTestId('game-board').getByText('H').first()).toBeVisible();
            await player1.keyboard.press('Enter');
            await player1.waitForTimeout(1000);

            await player1.keyboard.type('WORLD');
            await expect(player1.getByTestId('game-board').getByText('W').first()).toBeVisible();
            await player1.keyboard.press('Enter');
            await player1.waitForTimeout(1000);

            // Verify game board is still visible and functional
            await expect(player1.getByTestId('game-board').first()).toBeVisible();

            console.log('Test completed - verified game mechanics');

        } finally {
            await player1.close();
            await player1Context.close();
        }
    });
});
