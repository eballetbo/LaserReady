import { test, expect, Page } from '@playwright/test';

async function setupEditor(page: Page) {
    await page.goto('/');
    await page.waitForTimeout(300);
    await page.evaluate(() => {
        (window as any).store.setState({ zoom: 1, pan: { x: 0, y: 0 } });
    });
}

async function drawRectangleAt(page: Page, x1: number, y1: number, x2: number, y2: number) {
    const shapesBtn = page.getByRole('button', { name: /Shapes|Rectangle/i }).first();
    await shapesBtn.click();
    const rectBtn = page.getByTitle(/Rectangle/i);
    await rectBtn.click();

    const canvas = page.getByTestId('main-canvas');
    const box = await canvas.boundingBox();
    if (!box) throw new Error('Canvas not found');

    await page.mouse.move(box.x + x1, box.y + y1);
    await page.mouse.down();
    await page.mouse.move(box.x + x2, box.y + y2, { steps: 5 });
    await page.mouse.up();
}

async function selectAll(page: Page) {
    await page.keyboard.press('v');
    await page.waitForTimeout(50);
    await page.keyboard.press('Control+a');
    await page.waitForTimeout(100);
}

async function getShapeCount(page: Page): Promise<number> {
    return page.evaluate(() => (window as any).store.getState().shapes.length);
}

test.describe('Boolean Operations', () => {

    test('unite two overlapping rectangles', async ({ page }) => {
        await setupEditor(page);

        // Draw two overlapping rectangles
        await drawRectangleAt(page, 100, 100, 200, 200);
        await drawRectangleAt(page, 150, 150, 250, 250);

        expect(await getShapeCount(page)).toBe(2);

        // Select both
        await selectAll(page);

        // Click Unite button
        await page.getByRole('button', { name: /Unite/i }).click();
        await page.waitForTimeout(100);

        expect(await getShapeCount(page)).toBe(1);
    });

    test('subtract one shape from another', async ({ page }) => {
        await setupEditor(page);

        // Draw two overlapping rectangles
        await drawRectangleAt(page, 100, 100, 200, 200);
        await drawRectangleAt(page, 150, 150, 250, 250);

        expect(await getShapeCount(page)).toBe(2);

        await selectAll(page);

        // Click Subtract
        await page.getByRole('button', { name: /Subtract/i }).click();
        await page.waitForTimeout(100);

        // Subtract produces a result shape (or may produce 1 shape from 2)
        expect(await getShapeCount(page)).toBe(1);
    });

    test('intersect two overlapping shapes', async ({ page }) => {
        await setupEditor(page);

        await drawRectangleAt(page, 100, 100, 200, 200);
        await drawRectangleAt(page, 150, 150, 250, 250);

        expect(await getShapeCount(page)).toBe(2);

        await selectAll(page);

        // Click Intersect
        await page.getByRole('button', { name: /Intersect/i }).click();
        await page.waitForTimeout(100);

        // Intersection should produce the overlapping region
        expect(await getShapeCount(page)).toBe(1);

        // Verify the result is smaller than both originals
        const bounds = await page.evaluate(() => {
            const shape = (window as any).store.getState().shapes[0];
            return shape.getBounds();
        });
        // The overlap region is roughly 50x50
        expect(bounds.width).toBeLessThan(100);
        expect(bounds.height).toBeLessThan(100);
    });

    test('exclude two overlapping shapes', async ({ page }) => {
        await setupEditor(page);

        await drawRectangleAt(page, 100, 100, 200, 200);
        await drawRectangleAt(page, 150, 150, 250, 250);

        expect(await getShapeCount(page)).toBe(2);

        await selectAll(page);

        // Click Exclude
        await page.getByRole('button', { name: /Exclude/i }).click();
        await page.waitForTimeout(100);

        // Exclude removes the overlapping area, keeping the rest
        const count = await getShapeCount(page);
        expect(count).toBeGreaterThanOrEqual(1);
    });

    test('boolean with fewer than 2 shapes does nothing', async ({ page }) => {
        await setupEditor(page);
        await drawRectangleAt(page, 100, 100, 200, 200);

        expect(await getShapeCount(page)).toBe(1);

        // Select the single shape
        await page.keyboard.press('v');
        await page.waitForTimeout(50);
        const canvas = page.getByTestId('main-canvas');
        const box = (await canvas.boundingBox())!;
        await page.mouse.click(box.x + 150, box.y + 150);
        await page.waitForTimeout(100);

        // Boolean buttons should not be visible with only 1 shape selected
        const uniteBtn = page.getByRole('button', { name: /Unite/i });
        await expect(uniteBtn).toHaveCount(0);
    });

    test('boolean operation undo restores originals', async ({ page }) => {
        await setupEditor(page);

        await drawRectangleAt(page, 100, 100, 200, 200);
        await drawRectangleAt(page, 150, 150, 250, 250);

        expect(await getShapeCount(page)).toBe(2);

        await selectAll(page);

        // Unite
        await page.getByRole('button', { name: /Unite/i }).click();
        await page.waitForTimeout(100);
        expect(await getShapeCount(page)).toBe(1);

        // Undo
        await page.keyboard.press('Control+z');
        await page.waitForTimeout(100);
        expect(await getShapeCount(page)).toBe(2);
    });
});
