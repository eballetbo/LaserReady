
import { test, expect } from '@playwright/test';

test.describe('Shape Manipulation', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('http://localhost:5173');
        // Wait for app to load
        await expect(page.getByTestId('main-canvas')).toBeVisible();
        await page.waitForTimeout(500);
    });

    test('Move a shape', async ({ page }) => {
        // 1. Draw a rectangle
        await page.getByRole('button', { name: /Shapes|Rect/i }).first().click();
        await page.getByRole('button', { name: /Rectangle/i }).click();

        const canvas = page.getByTestId('main-canvas');
        const box = await canvas.boundingBox();
        if (!box) throw new Error('Canvas not found');

        // Force Zoom to 1 and Pan to 0,0 to ensure 1:1 mapping for mouse moves
        await page.evaluate(() => {
            const store = (window as any).useStore.getState();
            store.setZoom(1);
            store.setPan({ x: 0, y: 0 });
        });
        // Small wait for render
        await page.waitForTimeout(100);

        // Draw at 100,100 to 200,200 (100x100)
        await page.mouse.move(box.x + 100, box.y + 100);
        await page.mouse.down();
        await page.mouse.move(box.x + 200, box.y + 200);
        await page.mouse.up();


        // Verify initial position
        const initialX = await page.evaluate(() => {
            const shape = (window as any).useStore.getState().shapes[0];
            return shape.getBounds().minX;
        });

        // 2. Select it (click center)
        // Switch to Select tool (should be auto, but valid to ensure)
        await page.getByRole('button', { name: /Select/i }).first().click();

        // Move: Drag from center (150, 150) to (250, 250) (+100, +100)
        await page.mouse.move(box.x + 150, box.y + 150);
        await page.mouse.down();
        await page.mouse.move(box.x + 250, box.y + 250);
        await page.mouse.up();

        // Verify new position
        const finalX = await page.evaluate(() => {
            const shape = (window as any).useStore.getState().shapes[0];
            return shape.getBounds().minX;
        });

        // Should have moved +100 (approx)
        expect(Math.abs((finalX - initialX) - 100)).toBeLessThan(5); // Tolerance for snapping/floating point
    });

    test('Resize a shape', async ({ page }) => {
        // 1. Draw a rectangle
        await page.getByRole('button', { name: /Shapes|Rect/i }).first().click();
        await page.getByRole('button', { name: /Rectangle/i }).click();

        const canvas = page.getByTestId('main-canvas');
        const box = await canvas.boundingBox();
        if (!box) throw new Error('Canvas not found');

        // Force Zoom to 1 and Pan to 0,0
        await page.evaluate(() => {
            const store = (window as any).useStore.getState();
            store.setZoom(1);
            store.setPan({ x: 0, y: 0 });
        });
        await page.waitForTimeout(100);

        // Draw at 100,100 to 200,200
        await page.mouse.move(box.x + 100, box.y + 100);
        await page.mouse.down();
        await page.mouse.move(box.x + 200, box.y + 200);
        await page.mouse.up();

        // 2. Select tool
        await page.getByRole('button', { name: /Select/i }).first().click();

        // Click the shape to select it and show handles
        await page.mouse.click(box.x + 150, box.y + 150);

        // 3. Drag SE handle (at 200, 200)
        // We target slightly inside/outside or exact? 
        // Handle is centered at corner.
        // Let's drag from 200, 200 to 300, 300
        await page.mouse.move(box.x + 200, box.y + 200);
        await page.mouse.down();
        await page.mouse.move(box.x + 300, box.y + 300);
        await page.mouse.up();

        // Verify dimensions
        const width = await page.evaluate(() => {
            const shape = (window as any).useStore.getState().shapes[0];
            return shape.getBounds().width;
        });

        // Should be approx 200 now (100 -> 200)
        expect(Math.abs(width - 200)).toBeLessThan(5);
    });
});
