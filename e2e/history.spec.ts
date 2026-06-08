import { test } from '@playwright/test';

test.describe('History (Undo/Redo)', () => {
    test('should undo and redo drawing', async ({ page }) => {
        await page.goto('/');

        // 1. Draw a shape (Rectangle)
        const shapesBtn = page.getByRole('button', { name: /Shapes|Rect/i }).first();
        await shapesBtn.click();

        const canvas = page.getByTestId('main-canvas');
        const box = await canvas.boundingBox();
        if (!box) throw new Error('Canvas not found');

        await page.mouse.move(box.x + 100, box.y + 100);
        await page.mouse.down();
        await page.mouse.move(box.x + 200, box.y + 200);
        await page.mouse.up();

        // Validate shape added
        await page.waitForFunction(() => {
            // @ts-ignore
            return Object.keys(window.store.getState().shapes).length === 1;
        });

        // 2. Undo
        // Find Undo button. Usually has an icon defined in Toolbar or top bar.
        // If keybinding is easier: Control+Z
        await page.keyboard.press('Control+z');

        // Validate shape removed
        await page.waitForFunction(() => {
            // @ts-ignore
            return Object.keys(window.store.getState().shapes).length === 0;
        });

        // 3. Redo
        // Control+Shift+Z or Control+y
        await page.keyboard.press('Control+Shift+z');

        // Validate shape returned
        await page.waitForFunction(() => {
            // @ts-ignore
            return Object.keys(window.store.getState().shapes).length === 1;
        });
    });
});
