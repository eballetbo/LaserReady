import { test, expect } from '@playwright/test';

test.describe('Shape Tools', () => {
    test('should draw a rectangle', async ({ page }) => {
        await page.goto('/');

        // Select Rectangle tool
        // The accessible name might be 'Shapes' or 'Rectangle' depending on translation mock.
        // Based on Toolbar.tsx, label is t('shapes'). Let's assume default English 'Shapes'.
        // Or we can query by button that contains the Square icon logic, but text is safer if we know it.
        // Ideally we'd ensure translations are deterministic.
        // For now, let's target the button that likely has "Shapes" or "Rectangle" label.
        // Falling back to class-based or ensuring we click the right thing.
        // Actually, let's try to locate by title or aria-label if possible.
        // Toolbar.tsx passes `label` to Button.

        // Simulating user action: Click the Shapes button.
        // If the label is "Shapes", let's try that.
        const shapesBtn = page.getByRole('button', { name: /Shapes|Rect/i }).first();
        await shapesBtn.click();

        // Canvas interaction
        // Canvas interaction
        const canvas = page.getByTestId('main-canvas');
        const box = await canvas.boundingBox();
        if (!box) throw new Error('Canvas not found');

        const startX = box.x + 100;
        const startY = box.y + 100;
        const endX = box.x + 300;
        const endY = box.y + 200;

        // Perform drag to draw
        await page.mouse.move(startX, startY);
        await page.mouse.down();
        await page.mouse.move(endX, endY);
        await page.mouse.up();

        // Verification
        // Since we can't easily inspect the canvas pixels without screenshot matching (which is flaky without setup),
        // we'll rely on side-effects if possible, e.g., Layers panel updating.
        // Assuming there is a "Layer" panel or some text indicating item count.
        // If not, we can inspect window.store if exposed, but that's not pure E2E.
        // A visual regression snapshot would be ideal here if formatted.
        // For this MVP test, let's assume we can query the internal store via evaluate for verification,
        // as strictly "UI only" verification implies checking pixels or complex sidebar trees.

        await page.waitForFunction(() => {
            // @ts-ignore
            const state = window.store.getState();
            return Object.keys(state.shapes).length === 1;
        });

        // If we reach here, it passed
    });
});
