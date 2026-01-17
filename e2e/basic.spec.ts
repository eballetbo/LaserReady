import { test, expect } from '@playwright/test';

test.describe('Basic Editor Functionality', () => {

    test('App loads and shows canvas', async ({ page }) => {
        await page.goto('/');
        // Check if canvas exists and is visible
        await expect(page.getByTestId('main-canvas')).toBeVisible();

        // Check if toolbar exists
        await expect(page.getByText('Select')).toBeVisible();
    });

    test('Draw a rectangle', async ({ page }) => {
        await page.goto('/');

        // Select Rectangle tool
        // We use getByRole for the main button as per tools.spec.ts
        await page.getByRole('button', { name: /Shapes|Rect/i }).first().click();

        const canvas = page.getByTestId('main-canvas');
        const box = await canvas.boundingBox();
        if (!box) throw new Error('Canvas not found');

        // Perform drag operation
        await page.mouse.move(box.x + 100, box.y + 100);
        await page.mouse.down();
        await page.mouse.move(box.x + 200, box.y + 200);
        await page.mouse.up();

        // Verify shape was added to store
        const shapeCount = await page.evaluate(() => {
            // Access the exposed store
            return (window as any).useStore.getState().shapes.length;
        });

        expect(shapeCount).toBe(1);
    });

    test('Undo/Redo', async ({ page }) => {
        await page.goto('/');

        // 1. Draw a shape first
        await page.getByRole('button', { name: /Shapes|Rect/i }).first().click();

        const canvas = page.getByTestId('main-canvas');
        const box = await canvas.boundingBox();
        if (!box) throw new Error('Canvas not found');

        await page.mouse.move(box.x + 100, box.y + 100);
        await page.mouse.down();
        await page.mouse.move(box.x + 200, box.y + 200);
        await page.mouse.up();

        // Verify Drawn
        const initialCount = await page.evaluate(() => (window as any).useStore.getState().shapes.length);
        expect(initialCount).toBe(1);

        // 2. Undo
        // The title in Toolbar/App is likely "Undo (Ctrl+Z)" or similar
        // We use a regex to be flexible
        await page.getByTitle(/Undo/i).click();

        // Verify Empty
        const countAfterUndo = await page.evaluate(() => (window as any).useStore.getState().shapes.length);
        expect(countAfterUndo).toBe(0);

        // 3. Redo
        await page.getByTitle(/Redo/i).click();

        // Verify Returned
        const countAfterRedo = await page.evaluate(() => (window as any).useStore.getState().shapes.length);
        expect(countAfterRedo).toBe(1);
    });

});
