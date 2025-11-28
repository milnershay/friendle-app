import { test, expect } from '@playwright/test';

test.describe('Smoke Tests', () => {
    test('homepage loads and shows main actions', async ({ page }) => {
        await page.goto('/');

        // Wait for page to load
        await page.waitForLoadState('networkidle');

        // Verify main heading
        await expect(page.getByRole('heading', { name: 'Friendle' })).toBeVisible({ timeout: 15000 });

        // Verify main action buttons are present
        const createButton = page.getByRole('button', { name: /Create Room/i });
        const joinButton = page.getByRole('button', { name: 'Join' });

        await expect(createButton.first()).toBeVisible();
        await expect(joinButton.first()).toBeVisible();
    });
});
