import { test, expect } from '@playwright/test';

test('game flow', async ({ page }) => {
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    page.on('dialog', async dialog => {
        console.log('DIALOG:', dialog.message());
        await dialog.accept();
    });

    await page.goto('/');

    // Fill username
    await page.getByPlaceholder('Enter your name').fill('TestUser');

    // Click Create Room
    await page.getByRole('button', { name: 'Create New Room' }).click();

    // Wait for Start Game button and click it
    await page.getByRole('button', { name: 'Start Game' }).click();

    // Wait for game board
    await expect(page.getByTestId('game-board')).toBeVisible({ timeout: 30000 });

    // Type a guess (assuming word length 5)
    await page.keyboard.type('HELLO');

    // Check if letters appear in the grid
    // The grid cells contain the letters.
    // We can look for text "H", "E", "L", "L", "O"
    await expect(page.getByTestId('game-board').getByText('H').first()).toBeVisible();

    // Press Enter
    await page.keyboard.press('Enter');

    // Since we don't know the real word, we can just check that the row changed style (not empty anymore)
    // Or check that we moved to the next row (if not correct).
    // But for a basic smoke test, just ensuring no crash is good.

    // Let's check that the input is cleared (or rather, we are on next row and typing new things works)
    // Actually, GameBoard clears `currentGuess` state on submit.

    // Type next guess
    await page.keyboard.type('WORLD');
    await expect(page.getByTestId('game-board').getByText('W').first()).toBeVisible();
});
