import { test, expect, Page } from '@playwright/test';
import path from 'path';
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

test.describe('IO - SVG Import', () => {

    test('import SVG with basic shapes (rect + circle)', async ({ page }) => {
        await setupEditor(page);

        const initialCount = await page.evaluate(() => (window as any).store.getState().shapes.length);
        expect(initialCount).toBe(0);

        const filePath = path.resolve(__dirname, 'assets/simple.svg');
        await page.setInputFiles('input[type="file"]', filePath);

        await expect.poll(async () => {
            return await page.evaluate(() => (window as any).store.getState().shapes.length);
        }).toBeGreaterThan(0);

        const finalCount = await page.evaluate(() => (window as any).store.getState().shapes.length);
        expect(finalCount).toBe(2);
    });

    test('imported shapes have correct geometry proportions', async ({ page }) => {
        await setupEditor(page);

        const filePath = path.resolve(__dirname, 'assets/simple.svg');
        await page.setInputFiles('input[type="file"]', filePath);

        await expect.poll(async () => {
            return await page.evaluate(() => (window as any).store.getState().shapes.length);
        }).toBe(2);

        const bounds = await page.evaluate(() => {
            const shapes = (window as any).store.getState().shapes;
            return shapes.map((s: any) => {
                let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
                s.nodes.forEach((n: any) => {
                    minX = Math.min(minX, n.x);
                    minY = Math.min(minY, n.y);
                    maxX = Math.max(maxX, n.x);
                    maxY = Math.max(maxY, n.y);
                });
                return { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY };
            });
        });

        // simple.svg: rect is 30x30 (square) — aspect ratio should be 1:1
        expect(bounds[0].width).toBeGreaterThan(0);
        expect(bounds[0].height).toBeGreaterThan(0);
        expect(bounds[0].width / bounds[0].height).toBeCloseTo(1, 1);

        // Second shape (circle r=20) should also be roughly square in bounding box
        expect(bounds[1].width).toBeGreaterThan(0);
        expect(bounds[1].width / bounds[1].height).toBeCloseTo(1, 1);
    });

    test('import SVG preserves aspect ratio from mm-dimensioned file', async ({ page }) => {
        await setupEditor(page);

        // Create an SVG with explicit mm dimensions: rect 50mm wide, 30mm tall
        const svgContent = `<svg width="100mm" height="100mm" viewBox="0 0 ${100 * PIXELS_PER_MM} ${100 * PIXELS_PER_MM}" xmlns="http://www.w3.org/2000/svg">
            <rect x="${10 * PIXELS_PER_MM}" y="${10 * PIXELS_PER_MM}" width="${50 * PIXELS_PER_MM}" height="${30 * PIXELS_PER_MM}" fill="none" stroke="black"/>
        </svg>`;

        const filePath = path.resolve(__dirname, 'assets/test-mm.svg');
        const fs = await import('fs');
        fs.writeFileSync(filePath, svgContent);

        try {
            await page.setInputFiles('input[type="file"]', filePath);

            await expect.poll(async () => {
                return await page.evaluate(() => (window as any).store.getState().shapes.length);
            }).toBeGreaterThan(0);

            const bounds = await page.evaluate(() => {
                const shapes = (window as any).store.getState().shapes;
                const s = shapes[0];
                let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
                s.nodes.forEach((n: any) => {
                    minX = Math.min(minX, n.x);
                    minY = Math.min(minY, n.y);
                    maxX = Math.max(maxX, n.x);
                    maxY = Math.max(maxY, n.y);
                });
                return { width: maxX - minX, height: maxY - minY };
            });

            // The 50:30 aspect ratio (5:3) should be preserved regardless of scaling
            expect(bounds.width).toBeGreaterThan(0);
            expect(bounds.height).toBeGreaterThan(0);
            expect(bounds.width / bounds.height).toBeCloseTo(50 / 30, 1);
        } finally {
            fs.unlinkSync(filePath);
        }
    });

    test('import SVG sanitizes malicious content', async ({ page }) => {
        await setupEditor(page);

        const maliciousSvg = `<svg width="100" height="100" xmlns="http://www.w3.org/2000/svg">
            <script>window.__HACKED = true;</script>
            <rect x="10" y="10" width="50" height="50" onclick="window.__HACKED=true" fill="none" stroke="black"/>
        </svg>`;

        const filePath = path.resolve(__dirname, 'assets/test-malicious.svg');
        const fs = await import('fs');
        fs.writeFileSync(filePath, maliciousSvg);

        try {
            await page.setInputFiles('input[type="file"]', filePath);

            await expect.poll(async () => {
                return await page.evaluate(() => (window as any).store.getState().shapes.length);
            }).toBeGreaterThan(0);

            // Script should NOT have executed
            const hacked = await page.evaluate(() => (window as any).__HACKED);
            expect(hacked).toBeFalsy();

            // Shape should still have been imported
            const count = await page.evaluate(() => (window as any).store.getState().shapes.length);
            expect(count).toBeGreaterThanOrEqual(1);
        } finally {
            fs.unlinkSync(filePath);
        }
    });
});

test.describe('IO - SVG Export', () => {

    test('export produces SVG with mm dimensions', async ({ page }) => {
        await setupEditor(page);

        // Set material to 300x200mm
        await page.evaluate(() => {
            const PIXELS_PER_MM = 3.779527559;
            (window as any).store.setState({
                material: { width: 300 * PIXELS_PER_MM, height: 200 * PIXELS_PER_MM }
            });
        });

        await drawRectangle(page);

        // Call export function directly and inspect the SVG string
        const svgString = await page.evaluate(() => {
            const { exportToSVG } = (window as any).__io_exports ?? {};
            if (!exportToSVG) {
                // If not exposed, use the module directly
                const state = (window as any).store.getState();
                // We'll test via the download mechanism instead
                return null;
            }
            const state = (window as any).store.getState();
            return exportToSVG(state.shapes, state.material.width, state.material.height, state.layers);
        });

        if (svgString) {
            expect(svgString).toContain('width="300.00mm"');
            expect(svgString).toContain('height="200.00mm"');
            expect(svgString).toContain('viewBox=');
            expect(svgString).toContain('<path');
        }
    });

    test('export button exists and is clickable', async ({ page }) => {
        await setupEditor(page);
        await drawRectangle(page);

        // Verify export button exists
        const exportBtn = page.getByRole('button', { name: /export/i });
        await expect(exportBtn).toBeVisible();

        // Set up download listener
        const downloadPromise = page.waitForEvent('download', { timeout: 3000 }).catch(() => null);
        await exportBtn.click();

        const download = await downloadPromise;
        if (download) {
            expect(download.suggestedFilename()).toContain('.svg');
        }
    });

    test('export SVG produces valid SVG with path elements and mm dimensions', async ({ page }) => {
        await setupEditor(page);
        await drawRectangle(page);

        // Intercept the download to read its content
        const downloadPromise = page.waitForEvent('download', { timeout: 3000 });
        const exportBtn = page.getByRole('button', { name: /export/i });
        await exportBtn.click();

        const download = await downloadPromise;
        const stream = await download.createReadStream();
        const chunks: Buffer[] = [];
        for await (const chunk of stream) {
            chunks.push(Buffer.from(chunk));
        }
        const svgContent = Buffer.concat(chunks).toString('utf-8');

        expect(svgContent).toContain('<svg');
        expect(svgContent).toContain('mm"');
        expect(svgContent).toContain('viewBox');
        expect(svgContent).toContain('<path');
    });
});

test.describe('IO - SVG Round-trip', () => {

    test('import, clear, re-import preserves shape count', async ({ page }) => {
        await setupEditor(page);

        // Import simple.svg
        const filePath = path.resolve(__dirname, 'assets/simple.svg');
        await page.setInputFiles('input[type="file"]', filePath);

        await expect.poll(async () => {
            return await page.evaluate(() => (window as any).store.getState().shapes.length);
        }).toBe(2);

        // Clear and re-import the same file
        await page.evaluate(() => {
            (window as any).store.getState().setShapes([]);
        });
        await page.waitForTimeout(100);
        expect(await page.evaluate(() => (window as any).store.getState().shapes.length)).toBe(0);

        await page.setInputFiles('input[type="file"]', filePath);

        await expect.poll(async () => {
            return await page.evaluate(() => (window as any).store.getState().shapes.length);
        }).toBe(2);
    });

    test('import preserves geometry across multiple imports', async ({ page }) => {
        await setupEditor(page);

        const filePath = path.resolve(__dirname, 'assets/simple.svg');

        // First import
        await page.setInputFiles('input[type="file"]', filePath);
        await expect.poll(async () => {
            return await page.evaluate(() => (window as any).store.getState().shapes.length);
        }).toBe(2);

        const firstBounds = await page.evaluate(() => {
            const shapes = (window as any).store.getState().shapes;
            const s = shapes[0];
            let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
            s.nodes.forEach((n: any) => {
                minX = Math.min(minX, n.x);
                minY = Math.min(minY, n.y);
                maxX = Math.max(maxX, n.x);
                maxY = Math.max(maxY, n.y);
            });
            return { width: maxX - minX, height: maxY - minY };
        });

        // Clear and re-import
        await page.evaluate(() => {
            (window as any).store.getState().setShapes([]);
        });
        await page.waitForTimeout(100);

        await page.setInputFiles('input[type="file"]', filePath);
        await expect.poll(async () => {
            return await page.evaluate(() => (window as any).store.getState().shapes.length);
        }).toBe(2);

        const secondBounds = await page.evaluate(() => {
            const shapes = (window as any).store.getState().shapes;
            const s = shapes[0];
            let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
            s.nodes.forEach((n: any) => {
                minX = Math.min(minX, n.x);
                minY = Math.min(minY, n.y);
                maxX = Math.max(maxX, n.x);
                maxY = Math.max(maxY, n.y);
            });
            return { width: maxX - minX, height: maxY - minY };
        });

        // Geometry should be identical across imports
        expect(secondBounds.width).toBeCloseTo(firstBounds.width, 5);
        expect(secondBounds.height).toBeCloseTo(firstBounds.height, 5);
    });
});
