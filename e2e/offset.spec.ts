import { test, expect, Page } from '@playwright/test';

const PIXELS_PER_MM = 3.779527559;

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

async function activateOffsetTool(page: Page) {
    await page.keyboard.press('o');
    await page.waitForTimeout(50);
}

async function setOffsetDistance(page: Page, distanceMm: number) {
    await page.evaluate((d) => {
        (window as any).store.getState().setOffsetDistance(d);
    }, distanceMm * PIXELS_PER_MM);
}

async function getShapeCount(page: Page): Promise<number> {
    return page.evaluate(() => (window as any).store.getState().shapes.length);
}

async function getShapeBounds(page: Page, shapeIndex: number) {
    return page.evaluate((idx) => {
        const shape = (window as any).store.getState().shapes[idx];
        if (!shape) return null;
        return shape.getBounds();
    }, shapeIndex);
}

test.describe('Offset Tool', () => {

    test('outward offset creates larger shape', async ({ page }) => {
        await setupEditor(page);
        await drawRectangleAt(page, 100, 100, 200, 200);

        const originalBounds = await getShapeBounds(page, 0);
        expect(originalBounds).not.toBeNull();

        await setOffsetDistance(page, 5);
        await activateOffsetTool(page);

        const canvas = page.getByTestId('main-canvas');
        const box = (await canvas.boundingBox())!;

        // Hover over the shape to trigger preview computation
        await page.mouse.move(box.x + 150, box.y + 150);
        await page.waitForTimeout(200);

        // Click to apply offset
        await page.mouse.click(box.x + 150, box.y + 150);
        await page.waitForTimeout(200);

        // Should have added a new shape (offset copy)
        const count = await getShapeCount(page);
        expect(count).toBeGreaterThanOrEqual(2);

        // New offset shape should be larger
        const newBounds = await getShapeBounds(page, count - 1);
        expect(newBounds).not.toBeNull();
        expect(newBounds!.width).toBeGreaterThan(originalBounds!.width);
        expect(newBounds!.height).toBeGreaterThan(originalBounds!.height);
    });

    test('inward offset creates smaller shape', async ({ page }) => {
        await setupEditor(page);
        await drawRectangleAt(page, 100, 100, 250, 250);

        const originalBounds = await getShapeBounds(page, 0);

        await setOffsetDistance(page, -5);
        await activateOffsetTool(page);

        const canvas = page.getByTestId('main-canvas');
        const box = (await canvas.boundingBox())!;

        // Hover and click
        await page.mouse.move(box.x + 175, box.y + 175);
        await page.waitForTimeout(200);
        await page.mouse.click(box.x + 175, box.y + 175);
        await page.waitForTimeout(200);

        const count = await getShapeCount(page);
        expect(count).toBeGreaterThanOrEqual(2);

        const newBounds = await getShapeBounds(page, count - 1);
        expect(newBounds).not.toBeNull();
        expect(newBounds!.width).toBeLessThan(originalBounds!.width);
        expect(newBounds!.height).toBeLessThan(originalBounds!.height);
    });

    test('offset undo removes the offset shape', async ({ page }) => {
        await setupEditor(page);
        await drawRectangleAt(page, 100, 100, 200, 200);

        expect(await getShapeCount(page)).toBe(1);

        await setOffsetDistance(page, 5);
        await activateOffsetTool(page);

        const canvas = page.getByTestId('main-canvas');
        const box = (await canvas.boundingBox())!;

        // Hover and apply offset
        await page.mouse.move(box.x + 150, box.y + 150);
        await page.waitForTimeout(200);
        await page.mouse.click(box.x + 150, box.y + 150);
        await page.waitForTimeout(200);

        const countAfter = await getShapeCount(page);
        expect(countAfter).toBeGreaterThan(1);

        // Undo
        await page.keyboard.press('Control+z');
        await page.waitForTimeout(100);

        expect(await getShapeCount(page)).toBe(1);
    });

    test('offset does not crash on degenerate path', async ({ page }) => {
        await setupEditor(page);

        // Create a tiny path (degenerate)
        await page.keyboard.press('p');
        await page.waitForTimeout(50);
        const canvas = page.getByTestId('main-canvas');
        const box = (await canvas.boundingBox())!;

        await page.mouse.click(box.x + 200, box.y + 200);
        await page.mouse.click(box.x + 201, box.y + 200);
        await page.mouse.click(box.x + 200, box.y + 201);
        await page.mouse.click(box.x + 200, box.y + 200); // close
        await page.waitForTimeout(100);

        expect(await getShapeCount(page)).toBe(1);

        // Large inward offset that would self-intersect
        await setOffsetDistance(page, -50);
        await activateOffsetTool(page);

        // Hover and click — should not crash
        await page.mouse.move(box.x + 200, box.y + 200);
        await page.waitForTimeout(200);
        await page.mouse.click(box.x + 200, box.y + 200);
        await page.waitForTimeout(200);

        // Page should still be alive (no crash)
        const alive = await page.evaluate(() => true);
        expect(alive).toBe(true);
    });
});
