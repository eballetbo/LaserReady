import { test, expect } from '@playwright/test';

test.describe('Shape Tools', () => {
    // Helper to select a shape tool from the submenu
    const selectShapeTool = async (page: any, toolName: RegExp | string) => {
        const shapesBtn = page.getByRole('button', { name: /Shapes|Rectangle/i }).first();
        await shapesBtn.click();
        const toolBtn = page.getByTitle(toolName);
        await toolBtn.click();
    };

    // Helper to draw and verify shape
    const drawAndVerifyShape = async (page: any, toolNameRegex: RegExp | string, shapeType: string, strictBounds: boolean = false) => {
        await page.goto('/');

        // Use generic "Shapes" button first if visible, or assume we need to open menu
        await selectShapeTool(page, toolNameRegex);

        const canvas = page.getByTestId('main-canvas');
        const box = await canvas.boundingBox();
        if (!box) throw new Error('Canvas not found');

        // Draw in middle of canvas
        const startX = box.x + 100;
        const startY = box.y + 100;
        const endX = box.x + 300;
        const endY = box.y + 300;

        await page.mouse.move(startX, startY);
        await page.mouse.down();
        await page.mouse.move(endX, endY, { steps: 10 });
        await page.mouse.up();

        const result = await page.evaluate(
            ({ startX, startY, endX, endY, shapeType }: { startX: number, startY: number, endX: number, endY: number, shapeType: string }) => {
                // @ts-ignore
                const state = window.store.getState();
                const { zoom, pan } = state;

                const canvases = document.querySelectorAll('canvas');
                // Prefer testid, fallback to first
                const canvasEl = document.querySelector('[data-testid="main-canvas"]') || document.querySelector('canvas');
                if (!canvasEl) return { foundShape: false, debug: { error: 'No canvas' }, expectedResults: {}, actualBounds: null };

                const canvasRect = canvasEl.getBoundingClientRect();
                const worldStartX = (startX - canvasRect.left - pan.x) / zoom;
                const worldStartY = (startY - canvasRect.top - pan.y) / zoom;
                const worldEndX = (endX - canvasRect.left - pan.x) / zoom;
                const worldEndY = (endY - canvasRect.top - pan.y) / zoom;

                const shapes = Object.values(state.shapes);
                let shape = shapes.find((s: any) => s.type === shapeType) as any;

                if (!shape) return {
                    foundShape: false,
                    debug: { zoom, pan, canvasRect: { top: canvasRect.top, left: canvasRect.left }, startX, startY, canvasCount: canvases.length },
                    expectedResults: { worldStartX, worldStartY, worldEndX, worldEndY },
                    actualBounds: null
                };

                const nodes = shape.nodes;
                let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
                nodes.forEach((n: any) => {
                    minX = Math.min(minX, n.x);
                    minY = Math.min(minY, n.y);
                    maxX = Math.max(maxX, n.x);
                    maxY = Math.max(maxY, n.y);
                });
                return {
                    foundShape: true,
                    debug: { zoom, pan, canvasRect: { top: canvasRect.top, left: canvasRect.left }, startX, startY, canvasCount: canvases.length },
                    expectedResults: { worldStartX, worldStartY, worldEndX, worldEndY },
                    actualBounds: { minX, minY, maxX, maxY }
                };
            }, { startX, startY, endX, endY, shapeType });

        const { foundShape, actualBounds, expectedResults } = result;

        expect(foundShape).toBe(true);
        expect(actualBounds).not.toBeNull();

        const expWidth = Math.abs(expectedResults.worldEndX - expectedResults.worldStartX);
        const expHeight = Math.abs(expectedResults.worldEndY - expectedResults.worldStartY);
        const actWidth = actualBounds!.maxX - actualBounds!.minX;
        const actHeight = actualBounds!.maxY - actualBounds!.minY;

        if (strictBounds) {
            expect(actWidth).toBeCloseTo(expWidth, 0);
            expect(actHeight).toBeCloseTo(expHeight, 0);
            expect(actualBounds!.minX).toBeCloseTo(expectedResults.worldStartX, 0);
            expect(actualBounds!.minY).toBeCloseTo(expectedResults.worldStartY, 0);
        } else {
            expect(actWidth).toBeGreaterThan(1);
            expect(actHeight).toBeGreaterThan(1);
        }
    };

    test('should draw a rectangle', async ({ page }) => {
        // Rectangle is separate mostly because it might be the default or different type ('rect')
        // But let's verify it with the robust logic
        // 'rect' tool, 'rect' shape type
        await drawAndVerifyShape(page, /Rectangle/i, 'rect', true);
    });

    test('should draw a triangle', async ({ page }) => {
        // Triangle is polygon with 3 sides. 
        // We will perform the check manually for sides if we want, but type check is 'polygon'.
        // Wait, Toolbar sets tool 'triangle', registry uses 'PolygonTool(3)', which creates 'polygon' shape with {sides: 3}
        // So validation should check param?
        // For now let's just use the robust dragging check.
        await drawAndVerifyShape(page, /Triangle/i, 'polygon', true);
    });

    test('should draw a pentagon', async ({ page }) => {
        await drawAndVerifyShape(page, /Pentagon/i, 'polygon', true);
    });

    test('should draw a hexagon', async ({ page }) => {
        await drawAndVerifyShape(page, /Polygon/i, 'polygon', true);
    });

    test('should draw a star', async ({ page }) => {
        await drawAndVerifyShape(page, /Star/i, 'star', true);
    });
});
