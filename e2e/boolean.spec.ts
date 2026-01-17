
import { test, expect } from '@playwright/test';

test.describe('Boolean Operations', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('http://localhost:5173');
        await expect(page.getByTestId('main-canvas')).toBeVisible();
        await page.waitForTimeout(500); // Wait for initialization
    });

    test('Unite two overlapping shapes', async ({ page }) => {
        // 1. Draw Rect 1
        await page.getByRole('button', { name: /Shapes|Rect/i }).first().click();
        await page.getByRole('button', { name: /Rectangle/i }).click();

        const canvas = page.getByTestId('main-canvas');
        const box = await canvas.boundingBox();
        if (!box) throw new Error('Canvas not found');

        // Rect 1 at 100,100 size 100x100
        await page.mouse.move(box.x + 100, box.y + 100);
        await page.mouse.down();
        await page.mouse.move(box.x + 200, box.y + 200);
        await page.mouse.up();

        // 2. Draw Rect 2 Overlapping (150,150)
        await page.mouse.move(box.x + 150, box.y + 150);
        await page.mouse.down();
        await page.mouse.move(box.x + 250, box.y + 250);
        await page.mouse.up();

        // Verify 2 shapes
        const count = await page.evaluate(() => (window as any).useStore.getState().shapes.length);
        expect(count).toBe(2);

        // 3. Select both
        // Switch to Select
        await page.getByRole('button', { name: /Select/i }).first().click();
        // Drag selection box around both
        await page.mouse.move(box.x + 50, box.y + 50);
        await page.mouse.down();
        await page.mouse.move(box.x + 300, box.y + 300);
        await page.mouse.up();

        // check multiple selection in UI (buttons should appear)
        // Click "Unite"
        await page.getByRole('button', { name: /Unite/i }).click();

        // Verify 1 shape remains
        const newCount = await page.evaluate(() => (window as any).useStore.getState().shapes.length);
        expect(newCount).toBe(1);
    });
});
