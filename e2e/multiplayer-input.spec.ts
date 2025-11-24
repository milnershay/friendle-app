import { test, expect } from '@playwright/test';

test.describe('Multiplayer Input', () => {
    test('second player can type after game starts', async ({ browser }) => {
        const p1Context = await browser.newContext();
        const p2Context = await browser.newContext();
        const p1 = await p1Context.newPage();
        const p2 = await p2Context.newPage();

        // Player 1 creates room
        await p1.goto('/');
        await p1.waitForLoadState('networkidle');

        // Step 1: Click "Create Room" button
        await p1.getByRole('button', { name: /Create Room/i }).click();

        // Step 2: Fill username
        await p1.getByPlaceholder('Enter name').fill('Player1');

        // Step 3: Click "Create Room" submit button
        await p1.getByRole('button', { name: 'Create Room' }).click();

        await expect(p1.getByText('Waiting...')).toBeVisible();

        const roomUrl = p1.url();
        const roomId = roomUrl.split('/').pop()?.split('?')[0];

        // Player 2 joins room
        await p2.goto('/');
        await p2.waitForLoadState('networkidle');

        // Step 1: Click "Join" button
        await p2.getByRole('button', { name: 'Join' }).click();

        // Step 2: Fill room code
        await p2.getByPlaceholder('CODE').fill(roomId!);

        // Step 3: Click "Next"
        await p2.getByRole('button', { name: 'Next' }).click();

        // Step 4: Fill username
        await p2.getByPlaceholder('Enter name').fill('Player2');

        // Step 5: Click "Join" submit button
        await p2.getByRole('button', { name: 'Join' }).click();

        await expect(p2.getByText('Waiting...')).toBeVisible();

        // Player 1 starts game
        await p1.getByRole('button', { name: 'Start Game' }).click();

        // Both should see game board
        await expect(p1.getByTestId('game-board')).toBeVisible();
        await expect(p2.getByTestId('game-board')).toBeVisible();

        // Player 2 tries to type via physical keyboard
        await p2.keyboard.type('A');
        await expect(p2.getByTestId('game-board').locator('text=A').first()).toBeVisible();

        // Player 2 tries to type via virtual keyboard
        await p2.getByRole('button', { name: 'B', exact: true }).click();
        await expect(p2.getByTestId('game-board').locator('text=B').first()).toBeVisible();
    });
});
