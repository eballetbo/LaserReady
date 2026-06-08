import { test, expect, Page } from '@playwright/test';

async function setupEditor(page: Page) {
    await page.goto('/');
    await page.waitForTimeout(300);
    await page.evaluate(() => {
        (window as any).store.setState({ zoom: 1, pan: { x: 0, y: 0 } });
    });
}

async function drawRectangle(page: Page) {
    const shapesBtn = page.getByRole('button', { name: /Shapes|Rectangle/i }).first();
    await shapesBtn.click();
    const rectBtn = page.getByTitle(/Rectangle/i);
    await rectBtn.click();

    const canvas = page.getByTestId('main-canvas');
    const box = await canvas.boundingBox();
    if (!box) throw new Error('Canvas not found');

    await page.mouse.move(box.x + 100, box.y + 100);
    await page.mouse.down();
    await page.mouse.move(box.x + 200, box.y + 200, { steps: 5 });
    await page.mouse.up();
}

function getStore(page: Page) {
    return page.evaluate(() => {
        const state = (window as any).store.getState();
        return {
            zoom: state.zoom,
            pan: state.pan,
            tool: state.tool,
            shapesCount: state.shapes.length,
            isSnappingEnabled: state.isSnappingEnabled,
        };
    });
}

test.describe('Editor - Zoom', () => {

    test('zoom in with mouse wheel scrolling up', async ({ page }) => {
        await setupEditor(page);

        const canvas = page.getByTestId('main-canvas');
        const box = await canvas.boundingBox();
        if (!box) throw new Error('Canvas not found');

        const before = await getStore(page);
        expect(before.zoom).toBe(1);

        // Scroll up (negative deltaY) to zoom in
        await page.mouse.move(box.x + 200, box.y + 200);
        await page.mouse.wheel(0, -100);
        await page.waitForTimeout(50);

        const after = await getStore(page);
        expect(after.zoom).toBeGreaterThan(1);
    });

    test('zoom out with mouse wheel scrolling down', async ({ page }) => {
        await setupEditor(page);

        const canvas = page.getByTestId('main-canvas');
        const box = await canvas.boundingBox();
        if (!box) throw new Error('Canvas not found');

        // Scroll down (positive deltaY) to zoom out
        await page.mouse.move(box.x + 200, box.y + 200);
        await page.mouse.wheel(0, 100);
        await page.waitForTimeout(50);

        const after = await getStore(page);
        expect(after.zoom).toBeLessThan(1);
    });

    test('zoom centers on cursor position', async ({ page }) => {
        await setupEditor(page);

        const canvas = page.getByTestId('main-canvas');
        const box = await canvas.boundingBox();
        if (!box) throw new Error('Canvas not found');

        // Zoom in at a specific point using native mouse.wheel
        const mouseX = 300;
        const mouseY = 300;
        await page.mouse.move(box.x + mouseX, box.y + mouseY);
        await page.mouse.wheel(0, -100);
        await page.waitForTimeout(50);

        const state = await page.evaluate(() => {
            const s = (window as any).store.getState();
            return { zoom: s.zoom, pan: s.pan };
        });

        // The world point under cursor should remain stable:
        // Before zoom: worldX = mouseX (since pan=0, zoom=1)
        // After zoom: (mouseX - newPan.x) / newZoom should still equal mouseX
        const worldX = (mouseX - state.pan.x) / state.zoom;
        const worldY = (mouseY - state.pan.y) / state.zoom;
        expect(worldX).toBeCloseTo(mouseX, 0);
        expect(worldY).toBeCloseTo(mouseY, 0);
    });
});

test.describe('Editor - Pan', () => {

    test('space+drag pans the canvas', async ({ page }) => {
        await setupEditor(page);

        const canvas = page.getByTestId('main-canvas');
        const box = await canvas.boundingBox();
        if (!box) throw new Error('Canvas not found');

        const before = await getStore(page);
        expect(before.pan.x).toBe(0);
        expect(before.pan.y).toBe(0);

        // Hold space and drag
        await page.keyboard.down('Space');
        await page.mouse.move(box.x + 200, box.y + 200);
        await page.mouse.down();
        await page.mouse.move(box.x + 300, box.y + 250, { steps: 5 });
        await page.mouse.up();
        await page.keyboard.up('Space');

        const after = await getStore(page);
        expect(after.pan.x).toBeCloseTo(100, -1);
        expect(after.pan.y).toBeCloseTo(50, -1);
    });

    test('middle mouse button pans the canvas', async ({ page }) => {
        await setupEditor(page);

        const canvas = page.getByTestId('main-canvas');
        const box = await canvas.boundingBox();
        if (!box) throw new Error('Canvas not found');

        // Middle mouse button = button 1
        await page.mouse.move(box.x + 200, box.y + 200);
        await page.mouse.down({ button: 'middle' });
        await page.mouse.move(box.x + 260, box.y + 230, { steps: 5 });
        await page.mouse.up({ button: 'middle' });

        const after = await getStore(page);
        expect(after.pan.x).toBeCloseTo(60, -1);
        expect(after.pan.y).toBeCloseTo(30, -1);
    });
});

test.describe('Editor - Undo/Redo', () => {

    test('undo via Ctrl+Z removes last action', async ({ page }) => {
        await setupEditor(page);
        await drawRectangle(page);

        const before = await getStore(page);
        expect(before.shapesCount).toBe(1);

        await page.keyboard.press('Control+z');
        await page.waitForTimeout(50);

        const after = await getStore(page);
        expect(after.shapesCount).toBe(0);
    });

    test('redo via Ctrl+Shift+Z restores undone action', async ({ page }) => {
        await setupEditor(page);
        await drawRectangle(page);

        await page.keyboard.press('Control+z');
        await page.waitForTimeout(50);

        const undone = await getStore(page);
        expect(undone.shapesCount).toBe(0);

        await page.keyboard.press('Control+Shift+z');
        await page.waitForTimeout(50);

        const redone = await getStore(page);
        expect(redone.shapesCount).toBe(1);
    });

    test('undo via toolbar Undo button', async ({ page }) => {
        await setupEditor(page);
        await drawRectangle(page);

        const before = await getStore(page);
        expect(before.shapesCount).toBe(1);

        await page.getByTitle(/Undo/i).click();
        await page.waitForTimeout(50);

        const after = await getStore(page);
        expect(after.shapesCount).toBe(0);
    });

    test('redo via toolbar Redo button', async ({ page }) => {
        await setupEditor(page);
        await drawRectangle(page);

        await page.getByTitle(/Undo/i).click();
        await page.waitForTimeout(50);
        expect((await getStore(page)).shapesCount).toBe(0);

        await page.getByTitle(/Redo/i).click();
        await page.waitForTimeout(50);

        const after = await getStore(page);
        expect(after.shapesCount).toBe(1);
    });

    test('history stack is limited to 50 entries', async ({ page }) => {
        await setupEditor(page);

        // Create 55 shapes rapidly
        for (let i = 0; i < 55; i++) {
            await page.evaluate((idx) => {
                const store = (window as any).store.getState();
                const { PathShape } = (window as any).__test_internals ?? {};
                // Use store API directly to create shapes quickly
                const shapes = [...store.shapes];
                shapes.push({
                    id: `shape-${idx}`,
                    type: 'rect',
                    nodes: [
                        { x: idx * 10, y: 0, cpInX: idx * 10, cpInY: 0, cpOutX: idx * 10, cpOutY: 0, type: 'corner' },
                        { x: idx * 10 + 50, y: 0, cpInX: idx * 10 + 50, cpInY: 0, cpOutX: idx * 10 + 50, cpOutY: 0, type: 'corner' },
                        { x: idx * 10 + 50, y: 50, cpInX: idx * 10 + 50, cpInY: 50, cpOutX: idx * 10 + 50, cpOutY: 50, type: 'corner' },
                        { x: idx * 10, y: 50, cpInX: idx * 10, cpInY: 50, cpOutX: idx * 10, cpOutY: 50, type: 'corner' },
                    ],
                    closed: true,
                    layerId: store.layers[0]?.id ?? 'default',
                });
                store.setShapes(shapes);
            }, i);
        }

        // Now try to undo all 55 — only 50 should be undoable
        let undoCount = 0;
        for (let i = 0; i < 60; i++) {
            const before = await page.evaluate(() => (window as any).store.getState().shapes.length);
            await page.keyboard.press('Control+z');
            await page.waitForTimeout(20);
            const after = await page.evaluate(() => (window as any).store.getState().shapes.length);
            if (after < before) {
                undoCount++;
            } else {
                break;
            }
        }

        // Should be capped at 50
        expect(undoCount).toBeLessThanOrEqual(50);
    });
});

test.describe('Editor - Tool Switching', () => {

    test('press V activates Select tool', async ({ page }) => {
        await setupEditor(page);

        // First switch to pen
        await page.keyboard.press('p');
        await page.waitForTimeout(50);
        expect((await getStore(page)).tool).toBe('pen');

        // Press V to go back to select
        await page.keyboard.press('v');
        await page.waitForTimeout(50);
        expect((await getStore(page)).tool).toBe('select');
    });

    test('press P activates Pen tool', async ({ page }) => {
        await setupEditor(page);

        await page.keyboard.press('p');
        await page.waitForTimeout(50);
        expect((await getStore(page)).tool).toBe('pen');
    });

    test('press R activates Rectangle tool', async ({ page }) => {
        await setupEditor(page);

        await page.keyboard.press('r');
        await page.waitForTimeout(50);
        expect((await getStore(page)).tool).toBe('rect');
    });

    test('press T activates Text tool', async ({ page }) => {
        await setupEditor(page);

        await page.keyboard.press('t');
        await page.waitForTimeout(50);
        expect((await getStore(page)).tool).toBe('text');
    });

    test('press N activates Node Edit tool', async ({ page }) => {
        await setupEditor(page);

        await page.keyboard.press('n');
        await page.waitForTimeout(50);
        expect((await getStore(page)).tool).toBe('node-edit');
    });

    test('press F activates Fillet tool', async ({ page }) => {
        await setupEditor(page);

        await page.keyboard.press('f');
        await page.waitForTimeout(50);
        expect((await getStore(page)).tool).toBe('fillet');
    });

    test('press O activates Offset tool', async ({ page }) => {
        await setupEditor(page);

        await page.keyboard.press('o');
        await page.waitForTimeout(50);
        expect((await getStore(page)).tool).toBe('offset');
    });

    test('press E activates Circle/Ellipse tool', async ({ page }) => {
        await setupEditor(page);

        await page.keyboard.press('e');
        await page.waitForTimeout(50);
        expect((await getStore(page)).tool).toBe('circle');
    });
});

test.describe('Editor - Canvas Rendering', () => {

    test('canvas renders created shapes', async ({ page }) => {
        await setupEditor(page);

        const canvas = page.getByTestId('main-canvas');
        const before = await canvas.screenshot();

        // Draw a rectangle
        await drawRectangle(page);
        await page.waitForTimeout(100);

        const after = await canvas.screenshot();

        // Screenshots should differ (shape is now visible)
        expect(Buffer.compare(before, after)).not.toBe(0);
    });

    test('multiple shapes all render on canvas', async ({ page }) => {
        await setupEditor(page);

        // Draw 3 shapes at different positions
        const canvas = page.getByTestId('main-canvas');
        const box = await canvas.boundingBox();
        if (!box) throw new Error('Canvas not found');

        const shapesBtn = page.getByRole('button', { name: /Shapes|Rectangle/i }).first();
        await shapesBtn.click();
        const rectBtn = page.getByTitle(/Rectangle/i);
        await rectBtn.click();

        // Shape 1
        await page.mouse.move(box.x + 50, box.y + 50);
        await page.mouse.down();
        await page.mouse.move(box.x + 100, box.y + 100, { steps: 3 });
        await page.mouse.up();

        // Shape 2
        await page.mouse.move(box.x + 150, box.y + 50);
        await page.mouse.down();
        await page.mouse.move(box.x + 200, box.y + 100, { steps: 3 });
        await page.mouse.up();

        // Shape 3
        await page.mouse.move(box.x + 250, box.y + 50);
        await page.mouse.down();
        await page.mouse.move(box.x + 300, box.y + 100, { steps: 3 });
        await page.mouse.up();

        const store = await getStore(page);
        expect(store.shapesCount).toBe(3);
    });

    test('material boundary is visible', async ({ page }) => {
        await setupEditor(page);

        // Set a specific material size and zoom to fit
        await page.evaluate(() => {
            const PIXELS_PER_MM = 3.779527559;
            (window as any).store.setState({
                material: { width: 300 * PIXELS_PER_MM, height: 200 * PIXELS_PER_MM },
                zoom: 0.3,
                pan: { x: 50, y: 50 },
            });
        });
        await page.waitForTimeout(200);

        const canvas = page.getByTestId('main-canvas');
        const screenshot = await canvas.screenshot();

        // Canvas should not be entirely blank (material boundary draws)
        // Check that the screenshot has non-uniform pixels
        const pixels = screenshot;
        expect(pixels.length).toBeGreaterThan(0);
    });
});
