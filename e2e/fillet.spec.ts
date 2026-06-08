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

async function activateFilletTool(page: Page) {
    await page.keyboard.press('f');
    await page.waitForTimeout(50);
}

async function setFilletRadius(page: Page, radiusMm: number) {
    await page.evaluate((r) => {
        (window as any).store.getState().setFilletRadius(r);
    }, radiusMm * PIXELS_PER_MM);
}

async function _getShapeNodes(page: Page, shapeIndex: number = 0) {
    return page.evaluate((idx) => {
        const shape = (window as any).store.getState().shapes[idx];
        if (!shape || !shape.nodes) return [];
        return shape.nodes.map((n: any) => ({
            x: n.x, y: n.y,
            type: n.type,
        }));
    }, shapeIndex);
}

async function getNodeCount(page: Page, shapeIndex: number = 0): Promise<number> {
    return page.evaluate((idx) => {
        const shape = (window as any).store.getState().shapes[idx];
        return shape?.nodes?.length ?? 0;
    }, shapeIndex);
}

test.describe('Fillet Tool', () => {

    test('round fillet with positive radius', async ({ page }) => {
        await setupEditor(page);
        await drawRectangleAt(page, 100, 100, 200, 200);

        // Set fillet radius to 5mm
        await setFilletRadius(page, 5);
        await activateFilletTool(page);

        const canvas = page.getByTestId('main-canvas');
        const box = (await canvas.boundingBox())!;

        const beforeCount = await getNodeCount(page);
        expect(beforeCount).toBe(4);

        // Click on the top-left corner node (at ~100, 100)
        await page.mouse.click(box.x + 100, box.y + 100);
        await page.waitForTimeout(100);

        const afterCount = await getNodeCount(page);
        expect(afterCount).toBe(5);
    });

    test('reject fillet on smooth node', async ({ page }) => {
        await setupEditor(page);

        // Draw with pen tool creating a smooth node
        await page.keyboard.press('p');
        await page.waitForTimeout(50);
        const canvas = page.getByTestId('main-canvas');
        const box = (await canvas.boundingBox())!;

        // Create a path with a smooth node (click+drag)
        await page.mouse.move(box.x + 100, box.y + 150);
        await page.mouse.down();
        await page.mouse.move(box.x + 130, box.y + 150, { steps: 3 });
        await page.mouse.up();

        await page.mouse.click(box.x + 200, box.y + 100);
        await page.mouse.click(box.x + 300, box.y + 150);
        await page.keyboard.press('Enter');
        await page.waitForTimeout(100);

        const nodeCount = await getNodeCount(page);

        // Activate fillet tool
        await setFilletRadius(page, 5);
        await activateFilletTool(page);

        // Click on the smooth node (first node)
        await page.mouse.click(box.x + 100, box.y + 150);
        await page.waitForTimeout(100);

        // Node count should remain the same
        expect(await getNodeCount(page)).toBe(nodeCount);
    });

    test('oversized radius is clamped (fillet still applies with max possible)', async ({ page }) => {
        await setupEditor(page);

        // Draw a small rectangle (30x30px)
        await drawRectangleAt(page, 150, 150, 180, 180);
        await page.waitForTimeout(100);

        expect(await getNodeCount(page)).toBe(4);

        // Set radius much larger than edges — implementation clamps rather than rejects
        await setFilletRadius(page, 100);
        await activateFilletTool(page);

        const canvas = page.getByTestId('main-canvas');
        const box = (await canvas.boundingBox())!;

        // Click on the top-left corner
        await page.mouse.click(box.x + 150, box.y + 150);
        await page.waitForTimeout(100);

        // Fillet is applied with clamped radius (adds nodes)
        expect(await getNodeCount(page)).toBe(5);
    });

    test('undo fillet restores original shape', async ({ page }) => {
        await setupEditor(page);
        await drawRectangleAt(page, 100, 100, 200, 200);

        await setFilletRadius(page, 5);
        await activateFilletTool(page);

        const canvas = page.getByTestId('main-canvas');
        const box = (await canvas.boundingBox())!;

        expect(await getNodeCount(page)).toBe(4);

        // Apply fillet
        await page.mouse.click(box.x + 100, box.y + 100);
        await page.waitForTimeout(100);
        expect(await getNodeCount(page)).toBe(5);

        // Undo
        await page.keyboard.press('Control+z');
        await page.waitForTimeout(100);
        expect(await getNodeCount(page)).toBe(4);
    });

    test('fillet only applies to corner nodes (not endpoints of open path)', async ({ page }) => {
        await setupEditor(page);

        // Draw an open path (3 nodes)
        await page.keyboard.press('p');
        await page.waitForTimeout(50);
        const canvas = page.getByTestId('main-canvas');
        const box = (await canvas.boundingBox())!;

        await page.mouse.click(box.x + 100, box.y + 200);
        await page.mouse.click(box.x + 150, box.y + 100);
        await page.mouse.click(box.x + 200, box.y + 200);
        await page.keyboard.press('Enter');
        await page.waitForTimeout(100);

        expect(await getNodeCount(page)).toBe(3);

        await setFilletRadius(page, 5);
        await activateFilletTool(page);

        // Click on first endpoint — should NOT fillet (it's an endpoint)
        await page.mouse.click(box.x + 100, box.y + 200);
        await page.waitForTimeout(100);
        expect(await getNodeCount(page)).toBe(3);

        // Click on the middle node — SHOULD fillet (it's an interior node)
        await page.mouse.click(box.x + 150, box.y + 100);
        await page.waitForTimeout(100);
        expect(await getNodeCount(page)).toBe(4);
    });
});
