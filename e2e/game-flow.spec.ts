import { test, expect } from '@playwright/test';

test('game flow', async ({ page }) => {
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    page.on('dialog', async dialog => {
        console.log('DIALOG:', dialog.message());
        await dialog.accept();
    });

    await page.goto('/', { waitUntil: 'networkidle' });

    await page.getByRole('heading', { name: 'Friendle' }).waitFor({ state: 'visible', timeout: 15000 });

    const createRoomButton = page.getByRole('button', { name: /Create New Room/i });
    await createRoomButton.waitFor({ state: 'visible', timeout: 10000 });
    await createRoomButton.click();

    const usernameInput = page.getByLabel('Username', { exact: false });
    await usernameInput.waitFor({ state: 'visible', timeout: 10000 });
    await usernameInput.fill('TestUser');

    const finalCreateButton = page.getByRole('button', { name: 'Create Room' });
    await finalCreateButton.waitFor({ state: 'visible' });
    await finalCreateButton.click();

    await page.waitForURL(/\/room\/[A-Z0-9]+/, { timeout: 10000 });

    const startButton = page.getByRole('button', { name: 'Start Game' });
    await startButton.waitFor({ state: 'visible', timeout: 10000 });
    await startButton.click();

    await expect(page.getByTestId('game-board')).toBeVisible({ timeout: 30000 });

    await page.keyboard.type('HELLO');

    await expect(page.getByTestId('game-board').getByText('H').first()).toBeVisible();

    await page.keyboard.press('Enter');

    await page.keyboard.type('WORLD');
    await expect(page.getByTestId('game-board').getByText('W').first()).toBeVisible();
});
