import { test, expect } from '@playwright/test';

test('game flow', async ({ page }) => {
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    page.on('dialog', async dialog => {
        console.log('DIALOG:', dialog.message());
        await dialog.accept();
    });

    await page.goto('/', { waitUntil: 'networkidle' });

    await page.getByRole('heading', { name: 'Friendle' }).waitFor({ state: 'visible', timeout: 15000 });

    // Custom wait: Wait for the app to be out of the initial loading state.
    // This is crucial for tests involving authentication or async data fetching on startup.
    await page.waitForFunction(() => !document.body.getAttribute('data-loading'), { timeout: 15000 });

    // Step 1: Click "Create Room" button to enter create flow
    const createRoomButton = page.getByRole('button', { name: /Create Room/i });
    await createRoomButton.waitFor({ state: 'visible', timeout: 10000 });
    await createRoomButton.click();

    // Step 2: Fill in username
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

    await expect(page.getByTestId('game-board').first()).toBeVisible({ timeout: 30000 });

    await page.keyboard.type('HELLO');

    await expect(page.getByTestId('game-board').getByText('H').first()).toBeVisible();

    await page.keyboard.press('Enter');

    await page.keyboard.type('WORLD');
    await expect(page.getByTestId('game-board').getByText('W').first()).toBeVisible();
});
