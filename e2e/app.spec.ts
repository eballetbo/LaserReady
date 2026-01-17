import { test, expect } from '@playwright/test';

test.describe('Application Load', () => {
    test('should load the application and canvas', async ({ page }) => {
        // Navigate to the application
        await page.goto('/');

        // Check title (approximate)
        await expect(page).toHaveTitle(/LaserReady|Vite|laser-ready/i);

        // Verify canvas exists and is visible
        const canvas = page.getByTestId('main-canvas');
        await expect(canvas).toBeVisible();

        // Verify Toolbar exists
        await expect(page.getByRole('button', { name: /select/i })).toBeVisible(); // Assuming Select tool button exists and has aria-label or text
    });
});
