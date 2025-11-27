import { test, expect } from '@playwright/test';

test('matchmaking flow', async ({ page, context }) => {
  // Player 1 creates a room
  await page.goto('/');
  await page.getByRole('button', { name: 'Create Room' }).click();
  await page.getByLabel('Username').fill('Player 1');
  await page.getByRole('button', { name: 'Create Room' }).click();
  await expect(page).toHaveURL(/room\/.*/);
  const roomUrl = page.url();

  // Player 2 joins the same room via matchmaking
  const page2 = await context.newPage();
  await page2.goto('/');
  await page2.getByRole('button', { name: 'Join Random Room' }).click();
  await page2.getByLabel('Username').fill('Player 2');
  await page2.getByRole('button', { name: 'Join Random Room' }).click();
  await expect(page2).toHaveURL(roomUrl);

  // Verify both players are in the room
  await expect(page.getByText('Player 1')).toBeVisible();
  await expect(page.getByText('Player 2')).toBeVisible();
  await expect(page2.getByText('Player 1')).toBeVisible();
  await expect(page2.getByText('Player 2')).toBeVisible();
});
