import { test, expect, Page } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PIXELS_PER_MM = 3.779527559;

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

async function getShapeCount(page: Page): Promise<number> {
    return page.evaluate(() => (window as any).store.getState().shapes.length);
}

test.describe('Persistence - Auto-save', () => {

    test('auto-save triggers after shape creation', async ({ page }) => {
        await setupEditor(page);
        await drawRectangle(page);

        // Wait for auto-save debounce (500ms) + some buffer
        await page.waitForTimeout(800);

        // Verify IndexedDB was written
        const savedProject = await page.evaluate(async () => {
            return new Promise((resolve) => {
                const request = indexedDB.open('LaserReady', 1);
                request.onsuccess = () => {
                    const db = request.result;
                    const tx = db.transaction('autosave', 'readonly');
                    const store = tx.objectStore('autosave');
                    const get = store.get('current-session');
                    get.onsuccess = () => resolve(get.result);
                    get.onerror = () => resolve(null);
                };
                request.onerror = () => resolve(null);
            });
        });

        expect(savedProject).not.toBeNull();
        expect((savedProject as any).shapes.length).toBe(1);
        expect((savedProject as any).version).toBe(1);
    });

    test('session restore on page reload', async ({ page }) => {
        await setupEditor(page);

        // Draw 2 shapes
        await drawRectangle(page);
        await drawRectangle(page);

        await expect.poll(() => getShapeCount(page)).toBe(2);

        // Wait for auto-save debounce
        await page.waitForTimeout(800);

        // Reload the page
        await page.reload();
        await page.waitForTimeout(500);

        // Shapes should be restored
        await expect.poll(() => getShapeCount(page)).toBe(2);
    });
});

test.describe('Persistence - .laser Project File', () => {

    test('export .laser project file via Ctrl+S', async ({ page }) => {
        await setupEditor(page);
        await drawRectangle(page);

        const downloadPromise = page.waitForEvent('download', { timeout: 3000 });
        await page.keyboard.press('Control+s');

        const download = await downloadPromise;
        expect(download.suggestedFilename()).toBe('design.laser');

        // Read and verify content
        const stream = await download.createReadStream();
        const chunks: Buffer[] = [];
        for await (const chunk of stream) {
            chunks.push(Buffer.from(chunk));
        }
        const content = Buffer.concat(chunks).toString('utf-8');
        const project = JSON.parse(content);

        expect(project.version).toBe(1);
        expect(project.shapes).toHaveLength(1);
        expect(project.layers).toBeDefined();
        expect(project.material).toBeDefined();
        expect(project.material.width).toBeGreaterThan(0);
        expect(project.material.height).toBeGreaterThan(0);
    });

    test('import valid .laser project file', async ({ page }) => {
        await setupEditor(page);
        expect(await getShapeCount(page)).toBe(0);

        // Create a valid .laser project
        const project = {
            version: 1,
            shapes: [
                {
                    id: 'shape-1', type: 'rect', closed: true, layerId: 'default',
                    nodes: [
                        { x: 100, y: 100, cpIn: { x: 100, y: 100 }, cpOut: { x: 100, y: 100 }, type: 'corner' },
                        { x: 200, y: 100, cpIn: { x: 200, y: 100 }, cpOut: { x: 200, y: 100 }, type: 'corner' },
                        { x: 200, y: 200, cpIn: { x: 200, y: 200 }, cpOut: { x: 200, y: 200 }, type: 'corner' },
                        { x: 100, y: 200, cpIn: { x: 100, y: 200 }, cpOut: { x: 100, y: 200 }, type: 'corner' },
                    ]
                },
                {
                    id: 'shape-2', type: 'rect', closed: true, layerId: 'default',
                    nodes: [
                        { x: 300, y: 300, cpIn: { x: 300, y: 300 }, cpOut: { x: 300, y: 300 }, type: 'corner' },
                        { x: 400, y: 300, cpIn: { x: 400, y: 300 }, cpOut: { x: 400, y: 300 }, type: 'corner' },
                        { x: 400, y: 400, cpIn: { x: 400, y: 400 }, cpOut: { x: 400, y: 400 }, type: 'corner' },
                        { x: 300, y: 400, cpIn: { x: 300, y: 400 }, cpOut: { x: 300, y: 400 }, type: 'corner' },
                    ]
                }
            ],
            layers: [{ id: 'default', name: 'Layer 1', color: '#ff0000', mode: 'cut', visible: true }],
            activeLayerId: 'default',
            material: { width: 300 * PIXELS_PER_MM, height: 200 * PIXELS_PER_MM },
        };

        const filePath = path.resolve(__dirname, 'assets/test-project.laser');
        fs.writeFileSync(filePath, JSON.stringify(project));

        try {
            await page.setInputFiles('input[type="file"]', filePath);

            await expect.poll(() => getShapeCount(page)).toBe(2);

            // Verify material was restored
            const material = await page.evaluate(() => {
                const state = (window as any).store.getState();
                return state.material;
            });
            expect(material.width).toBeCloseTo(300 * PIXELS_PER_MM, 0);
            expect(material.height).toBeCloseTo(200 * PIXELS_PER_MM, 0);
        } finally {
            fs.unlinkSync(filePath);
        }
    });

    test('corrupted project file rejected on import', async ({ page }) => {
        await setupEditor(page);
        await drawRectangle(page);
        expect(await getShapeCount(page)).toBe(1);

        // Create an invalid .laser file (missing version)
        const invalidProject = {
            shapes: [{ id: 's1', type: 'rect', nodes: [] }],
            layers: [{ id: 'default', name: 'Layer 1', color: '#ff0000', mode: 'cut', visible: true }],
            material: { width: 100, height: 100 },
        };

        const filePath = path.resolve(__dirname, 'assets/test-invalid.laser');
        fs.writeFileSync(filePath, JSON.stringify(invalidProject));

        try {
            await page.setInputFiles('input[type="file"]', filePath);
            await page.waitForTimeout(500);

            // Canvas state should be unchanged (still 1 shape from before)
            expect(await getShapeCount(page)).toBe(1);
        } finally {
            fs.unlinkSync(filePath);
        }
    });

    test('.laser round-trip preserves shapes', async ({ page }) => {
        await setupEditor(page);
        await drawRectangle(page);
        expect(await getShapeCount(page)).toBe(1);

        // Get original shape data
        const originalBounds = await page.evaluate(() => {
            const shape = (window as any).store.getState().shapes[0];
            let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
            shape.nodes.forEach((n: any) => {
                minX = Math.min(minX, n.x);
                minY = Math.min(minY, n.y);
                maxX = Math.max(maxX, n.x);
                maxY = Math.max(maxY, n.y);
            });
            return { width: maxX - minX, height: maxY - minY };
        });

        // Export via Ctrl+S
        const downloadPromise = page.waitForEvent('download', { timeout: 3000 });
        await page.keyboard.press('Control+s');
        const download = await downloadPromise;

        const savedPath = path.resolve(__dirname, 'assets/test-roundtrip.laser');
        await download.saveAs(savedPath);

        // Clear canvas
        await page.evaluate(() => {
            (window as any).store.getState().setShapes([]);
        });
        await page.waitForTimeout(100);
        expect(await getShapeCount(page)).toBe(0);

        // Re-import
        try {
            await page.setInputFiles('input[type="file"]', savedPath);
            await page.waitForTimeout(300);

            expect(await getShapeCount(page)).toBe(1);

            // Verify geometry is preserved
            const restoredBounds = await page.evaluate(() => {
                const shape = (window as any).store.getState().shapes[0];
                let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
                shape.nodes.forEach((n: any) => {
                    minX = Math.min(minX, n.x);
                    minY = Math.min(minY, n.y);
                    maxX = Math.max(maxX, n.x);
                    maxY = Math.max(maxY, n.y);
                });
                return { width: maxX - minX, height: maxY - minY };
            });

            expect(restoredBounds.width).toBeCloseTo(originalBounds.width, 2);
            expect(restoredBounds.height).toBeCloseTo(originalBounds.height, 2);
        } finally {
            fs.unlinkSync(savedPath);
        }
    });

    test('shape deserialization preserves types', async ({ page }) => {
        await setupEditor(page);

        // Create a project with PathShape and TextObject
        const project = {
            version: 1,
            shapes: [
                {
                    id: 'path-1', type: 'rect', closed: true, layerId: 'default',
                    nodes: [
                        { x: 10, y: 10, cpIn: { x: 10, y: 10 }, cpOut: { x: 10, y: 10 }, type: 'corner' },
                        { x: 50, y: 10, cpIn: { x: 50, y: 10 }, cpOut: { x: 50, y: 10 }, type: 'corner' },
                        { x: 50, y: 50, cpIn: { x: 50, y: 50 }, cpOut: { x: 50, y: 50 }, type: 'corner' },
                        { x: 10, y: 50, cpIn: { x: 10, y: 50 }, cpOut: { x: 10, y: 50 }, type: 'corner' },
                    ]
                },
                {
                    id: 'text-1', type: 'text', layerId: 'default',
                    content: 'Hello',
                    x: 100, y: 100,
                    fontFamily: 'Arial', fontSize: 24,
                    nodes: []
                }
            ],
            layers: [{ id: 'default', name: 'Layer 1', color: '#ff0000', mode: 'cut', visible: true }],
            activeLayerId: 'default',
            material: { width: 300, height: 200 },
        };

        const filePath = path.resolve(__dirname, 'assets/test-types.laser');
        fs.writeFileSync(filePath, JSON.stringify(project));

        try {
            await page.setInputFiles('input[type="file"]', filePath);

            await expect.poll(() => getShapeCount(page)).toBe(2);

            // Verify shapes retained their types
            const shapeTypes = await page.evaluate(() => {
                const shapes = (window as any).store.getState().shapes;
                return shapes.map((s: any) => ({
                    type: s.type,
                    hasBounds: typeof s.getBounds === 'function',
                }));
            });

            expect(shapeTypes[0].type).toBe('rect');
            expect(shapeTypes[0].hasBounds).toBe(true);
            expect(shapeTypes[1].type).toBe('text');
            expect(shapeTypes[1].hasBounds).toBe(true);
        } finally {
            fs.unlinkSync(filePath);
        }
    });
});
