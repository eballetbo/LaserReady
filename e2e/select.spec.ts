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

async function activateSelectTool(page: Page) {
    await page.keyboard.press('v');
    await page.waitForTimeout(50);
}

async function getSelectedIds(page: Page): Promise<string[]> {
    return page.evaluate(() => (window as any).store.getState().selectedShapes);
}

async function getShapeIds(page: Page): Promise<string[]> {
    return page.evaluate(() => (window as any).store.getState().shapes.map((s: any) => s.id));
}

function canvasPos(box: { x: number; y: number }, x: number, y: number) {
    return { x: box.x + x, y: box.y + y };
}

test.describe('Select Tool', () => {

    test('click to select a shape', async ({ page }) => {
        await setupEditor(page);
        await drawRectangleAt(page, 100, 100, 200, 200);
        await drawRectangleAt(page, 300, 300, 400, 400);
        await activateSelectTool(page);

        const canvas = page.getByTestId('main-canvas');
        const box = (await canvas.boundingBox())!;

        // Click on first shape (center at 150, 150)
        await page.mouse.click(box.x + 150, box.y + 150);
        await page.waitForTimeout(50);

        const ids = await getShapeIds(page);
        const selected = await getSelectedIds(page);
        expect(selected).toHaveLength(1);
        expect(selected[0]).toBe(ids[0]);
    });

    test('click empty area deselects all', async ({ page }) => {
        await setupEditor(page);
        await drawRectangleAt(page, 100, 100, 200, 200);
        await activateSelectTool(page);

        const canvas = page.getByTestId('main-canvas');
        const box = (await canvas.boundingBox())!;

        // Select shape
        await page.mouse.click(box.x + 150, box.y + 150);
        await page.waitForTimeout(50);
        expect(await getSelectedIds(page)).toHaveLength(1);

        // Click empty area
        await page.mouse.click(box.x + 400, box.y + 400);
        await page.waitForTimeout(50);
        expect(await getSelectedIds(page)).toHaveLength(0);
    });

    test('shift+click adds to selection', async ({ page }) => {
        await setupEditor(page);
        await drawRectangleAt(page, 100, 100, 200, 200);
        await drawRectangleAt(page, 300, 100, 400, 200);
        await activateSelectTool(page);

        const canvas = page.getByTestId('main-canvas');
        const box = (await canvas.boundingBox())!;

        // Select first shape
        await page.mouse.click(box.x + 150, box.y + 150);
        await page.waitForTimeout(50);
        expect(await getSelectedIds(page)).toHaveLength(1);

        // Shift+click second shape
        await page.keyboard.down('Shift');
        await page.mouse.click(box.x + 350, box.y + 150);
        await page.keyboard.up('Shift');
        await page.waitForTimeout(50);

        expect(await getSelectedIds(page)).toHaveLength(2);
    });

    test('click another shape replaces selection', async ({ page }) => {
        await setupEditor(page);
        await drawRectangleAt(page, 100, 100, 200, 200);
        await drawRectangleAt(page, 300, 100, 400, 200);
        await activateSelectTool(page);

        const canvas = page.getByTestId('main-canvas');
        const box = (await canvas.boundingBox())!;

        // Select first shape
        await page.mouse.click(box.x + 150, box.y + 150);
        await page.waitForTimeout(50);
        const ids = await getShapeIds(page);
        expect(await getSelectedIds(page)).toContain(ids[0]);

        // Click second shape (without shift) — replaces selection
        await page.mouse.click(box.x + 350, box.y + 150);
        await page.waitForTimeout(50);

        const selected = await getSelectedIds(page);
        expect(selected).toHaveLength(1);
        expect(selected[0]).toBe(ids[1]);
    });

    test('rubber-band enclosing selection (left-to-right)', async ({ page }) => {
        await setupEditor(page);
        // Shape A inside region
        await drawRectangleAt(page, 100, 100, 150, 150);
        // Shape B inside region
        await drawRectangleAt(page, 160, 100, 210, 150);
        // Shape C far away
        await drawRectangleAt(page, 400, 400, 450, 450);
        await activateSelectTool(page);

        const canvas = page.getByTestId('main-canvas');
        const box = (await canvas.boundingBox())!;

        // Drag left-to-right enclosing A and B
        await page.mouse.move(box.x + 80, box.y + 80);
        await page.mouse.down();
        await page.mouse.move(box.x + 230, box.y + 170, { steps: 5 });
        await page.mouse.up();
        await page.waitForTimeout(50);

        const selected = await getSelectedIds(page);
        expect(selected.length).toBeGreaterThanOrEqual(2);

        const ids = await getShapeIds(page);
        expect(selected).toContain(ids[0]);
        expect(selected).toContain(ids[1]);
        expect(selected).not.toContain(ids[2]);
    });

    test('rubber-band crossing selection (right-to-left)', async ({ page }) => {
        await setupEditor(page);
        // Shape A fully inside drag zone
        await drawRectangleAt(page, 150, 150, 200, 200);
        // Shape B partially overlapping drag zone
        await drawRectangleAt(page, 220, 150, 300, 200);
        await activateSelectTool(page);

        const canvas = page.getByTestId('main-canvas');
        const box = (await canvas.boundingBox())!;

        // Drag right-to-left (crossing mode)
        await page.mouse.move(box.x + 250, box.y + 100);
        await page.mouse.down();
        await page.mouse.move(box.x + 130, box.y + 220, { steps: 5 });
        await page.mouse.up();
        await page.waitForTimeout(50);

        const selected = await getSelectedIds(page);
        expect(selected.length).toBe(2);
    });

    test('move selected shape', async ({ page }) => {
        await setupEditor(page);
        await drawRectangleAt(page, 100, 100, 200, 200);
        await activateSelectTool(page);

        const canvas = page.getByTestId('main-canvas');
        const box = (await canvas.boundingBox())!;

        // Select shape
        await page.mouse.click(box.x + 150, box.y + 150);
        await page.waitForTimeout(50);

        const initialBounds = await page.evaluate(() => {
            const shape = (window as any).store.getState().shapes[0];
            return shape.getBounds();
        });

        // Drag shape +100, +100
        await page.mouse.move(box.x + 150, box.y + 150);
        await page.mouse.down();
        await page.mouse.move(box.x + 250, box.y + 250, { steps: 5 });
        await page.mouse.up();
        await page.waitForTimeout(50);

        const finalBounds = await page.evaluate(() => {
            const shape = (window as any).store.getState().shapes[0];
            return shape.getBounds();
        });

        expect(finalBounds.minX - initialBounds.minX).toBeCloseTo(100, -1);
        expect(finalBounds.minY - initialBounds.minY).toBeCloseTo(100, -1);
    });

    test('move with undo', async ({ page }) => {
        await setupEditor(page);
        await drawRectangleAt(page, 100, 100, 200, 200);
        await activateSelectTool(page);

        const canvas = page.getByTestId('main-canvas');
        const box = (await canvas.boundingBox())!;

        // Select and move
        await page.mouse.click(box.x + 150, box.y + 150);
        await page.waitForTimeout(50);

        const before = await page.evaluate(() => {
            const shape = (window as any).store.getState().shapes[0];
            return shape.getBounds();
        });

        await page.mouse.move(box.x + 150, box.y + 150);
        await page.mouse.down();
        await page.mouse.move(box.x + 250, box.y + 250, { steps: 5 });
        await page.mouse.up();
        await page.waitForTimeout(50);

        // Undo
        await page.keyboard.press('Control+z');
        await page.waitForTimeout(100);

        const after = await page.evaluate(() => {
            const shape = (window as any).store.getState().shapes[0];
            return shape.getBounds();
        });

        expect(after.minX).toBeCloseTo(before.minX, -1);
        expect(after.minY).toBeCloseTo(before.minY, -1);
    });

    test('resize via SE handle', async ({ page }) => {
        await setupEditor(page);
        await drawRectangleAt(page, 100, 100, 200, 200);
        await activateSelectTool(page);

        const canvas = page.getByTestId('main-canvas');
        const box = (await canvas.boundingBox())!;

        // Select shape
        await page.mouse.click(box.x + 150, box.y + 150);
        await page.waitForTimeout(50);

        // Drag SE handle (bottom-right corner ~200,200)
        await page.mouse.move(box.x + 200, box.y + 200);
        await page.mouse.down();
        await page.mouse.move(box.x + 300, box.y + 300, { steps: 5 });
        await page.mouse.up();
        await page.waitForTimeout(50);

        const bounds = await page.evaluate(() => {
            const shape = (window as any).store.getState().shapes[0];
            return shape.getBounds();
        });

        expect(bounds.width).toBeCloseTo(200, -1);
        expect(bounds.height).toBeCloseTo(200, -1);
    });

    test('resize with undo', async ({ page }) => {
        await setupEditor(page);
        await drawRectangleAt(page, 100, 100, 200, 200);
        await activateSelectTool(page);

        const canvas = page.getByTestId('main-canvas');
        const box = (await canvas.boundingBox())!;

        await page.mouse.click(box.x + 150, box.y + 150);
        await page.waitForTimeout(50);

        const before = await page.evaluate(() => {
            const shape = (window as any).store.getState().shapes[0];
            return shape.getBounds();
        });

        // Resize via SE handle
        await page.mouse.move(box.x + 200, box.y + 200);
        await page.mouse.down();
        await page.mouse.move(box.x + 300, box.y + 300, { steps: 5 });
        await page.mouse.up();
        await page.waitForTimeout(50);

        // Undo
        await page.keyboard.press('Control+z');
        await page.waitForTimeout(100);

        const after = await page.evaluate(() => {
            const shape = (window as any).store.getState().shapes[0];
            return shape.getBounds();
        });

        expect(after.width).toBeCloseTo(before.width, -1);
    });

    test('rotate shape', async ({ page }) => {
        await setupEditor(page);
        await drawRectangleAt(page, 100, 100, 200, 200);
        await activateSelectTool(page);

        const canvas = page.getByTestId('main-canvas');
        const box = (await canvas.boundingBox())!;

        // Select shape
        await page.mouse.click(box.x + 150, box.y + 150);
        await page.waitForTimeout(50);

        const before = await page.evaluate(() => {
            const shape = (window as any).store.getState().shapes[0];
            return shape.nodes.map((n: any) => ({ x: n.x, y: n.y }));
        });

        // Rotation handle is 30px above the top-center of the selection
        // For a 100x100 shape at (100,100)-(200,200), top-center is (150, 100)
        // Rotation handle is at (150, 70)
        await page.mouse.move(box.x + 150, box.y + 70);
        await page.mouse.down();
        await page.mouse.move(box.x + 220, box.y + 100, { steps: 10 });
        await page.mouse.up();
        await page.waitForTimeout(50);

        const after = await page.evaluate(() => {
            const shape = (window as any).store.getState().shapes[0];
            return shape.nodes.map((n: any) => ({ x: n.x, y: n.y }));
        });

        // At least one node should have moved
        const moved = before.some((b: any, i: number) =>
            Math.abs(b.x - after[i].x) > 1 || Math.abs(b.y - after[i].y) > 1
        );
        expect(moved).toBe(true);
    });

    test('keyboard shortcut V activates select tool', async ({ page }) => {
        await setupEditor(page);

        // Start with pen tool
        await page.keyboard.press('p');
        await page.waitForTimeout(50);
        const toolBefore = await page.evaluate(() => (window as any).store.getState().tool);
        expect(toolBefore).toBe('pen');

        // Press V to activate select
        await page.keyboard.press('v');
        await page.waitForTimeout(50);
        const toolAfter = await page.evaluate(() => (window as any).store.getState().tool);
        expect(toolAfter).toBe('select');
    });
});
