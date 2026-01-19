import { test, expect } from '@playwright/test';

test.describe('Shape Tools (Strict & Robust)', () => {

    // Strict helper that verifies absolute coordinate accuracy at specified Zoom
    const drawAndVerifyShapeStrict = async (page: any, toolNameRegex: RegExp | string, shapeType: string, expectedSides?: number, zoom: number = 1) => {
        await page.goto('/');

        // Wait for initial fitToScreen (which happens on mount) to complete
        // This prevents race conditions where fitToScreen overwrites our manual Pan setting
        await page.waitForTimeout(200);

        // Force precise state
        await page.evaluate(({ zoom }) => {
            // @ts-ignore
            if (window.store) {
                // @ts-ignore
                window.store.setState({ zoom, pan: { x: 0, y: 0 } });
            }
        }, { zoom });

        // Select Tool
        const shapesBtn = page.getByRole('button', { name: /Shapes|Rectangle/i }).first();
        await shapesBtn.click();
        const toolBtn = page.getByTitle(toolNameRegex);
        await toolBtn.click();

        const canvas = page.getByTestId('main-canvas');
        const box = await canvas.boundingBox();
        if (!box) throw new Error('Canvas not found');

        // Draw from 100,100 to 300,300 relative to viewport/canvas
        const relStartX = 100;
        const relStartY = 100;
        const width = 200;
        const height = 200;

        const startX = box.x + relStartX;
        const startY = box.y + relStartY;
        const endX = startX + width;
        const endY = startY + height;

        await page.mouse.move(startX, startY);
        await page.mouse.down();
        await page.mouse.move(endX, endY, { steps: 10 });
        await page.mouse.up();

        const result = await page.evaluate(({ shapeType, expectedSides }) => {
            // @ts-ignore
            const state = window.store.getState();
            const shapes = Object.values(state.shapes);
            const shape = shapes[shapes.length - 1] as any;

            if (!shape || shape.type !== shapeType) return null;
            if (expectedSides && shape.params?.sides !== expectedSides) return null;

            let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
            shape.nodes.forEach((n: any) => {
                minX = Math.min(minX, n.x);
                minY = Math.min(minY, n.y);
                maxX = Math.max(maxX, n.x);
                maxY = Math.max(maxY, n.y);
            });
            return { minX, minY, maxX, maxY };
        }, { shapeType, expectedSides });

        expect(result).not.toBeNull();

        // Expected World Coords = (ScreenRel / Zoom)
        // With Pan=0 and Zoom=Z:
        // WorldX = (100) / Z
        const expectedWorldX = relStartX / zoom;
        const expectedWorldY = relStartY / zoom;
        const expectedWorldWidth = width / zoom;
        const expectedWorldHeight = height / zoom;

        // Tolerance scales with zoom? No, closeTo checks abs diff.
        // If Zoom=0.5, coords are 200, 400.
        expect(result!.minX).toBeCloseTo(expectedWorldX, 1);
        expect(result!.minY).toBeCloseTo(expectedWorldY, 1);
        expect(result!.maxX).toBeCloseTo(expectedWorldX + expectedWorldWidth, 1);
        expect(result!.maxY).toBeCloseTo(expectedWorldY + expectedWorldHeight, 1);
    };

    test('should draw a rectangle (Zoom 1)', async ({ page }) => {
        await drawAndVerifyShapeStrict(page, /Rectangle/i, 'rect');
    });

    test('should draw a rectangle (Zoom 0.5)', async ({ page }) => {
        await drawAndVerifyShapeStrict(page, /Rectangle/i, 'rect', undefined, 0.5);
    });

    test('should draw a triangle', async ({ page }) => {
        await drawAndVerifyShapeStrict(page, /Triangle/i, 'polygon', 3);
    });

    test('should draw a pentagon', async ({ page }) => {
        await drawAndVerifyShapeStrict(page, /Pentagon/i, 'polygon', 5);
    });

    test('should draw a hexagon', async ({ page }) => {
        await drawAndVerifyShapeStrict(page, /Polygon/i, 'polygon', 6);
    });

    test('should draw a star (Center-to-Tip Interaction)', async ({ page }) => {
        await page.goto('/');

        // Wait for initial fitToScreen
        await page.waitForTimeout(200);

        // Force precise state (Zoom 1, Pan 0)
        await page.evaluate(() => {
            // @ts-ignore
            if (window.store) {
                // @ts-ignore
                window.store.setState({ zoom: 1, pan: { x: 0, y: 0 } });
            }
        });

        // Select Star Tool
        const shapesBtn = page.getByRole('button', { name: /Shapes|Rectangle/i }).first();
        await shapesBtn.click();
        const toolBtn = page.getByTitle(/Star/i);
        await toolBtn.click();

        const canvas = page.getByTestId('main-canvas');
        const box = await canvas.boundingBox();
        if (!box) throw new Error('Canvas not found');

        // Draw Star:
        // Center: (100, 100)
        // Mouse/Tip: (300, 100) -> Radius 200, Horizontal (Angle 0)
        const relCenterX = 100;
        const relCenterY = 100;
        const tipX = 300;
        const tipY = 100;

        await page.mouse.move(box.x + relCenterX, box.y + relCenterY);
        await page.mouse.down();
        // Move to define tip
        await page.mouse.move(box.x + tipX, box.y + tipY, { steps: 10 });
        await page.mouse.up();

        const result = await page.evaluate(() => {
            // @ts-ignore
            const state = window.store.getState();
            // @ts-ignore
            const shapes = Object.values(state.shapes);
            // @ts-ignore
            const shape = shapes[shapes.length - 1];

            if (!shape || shape.type !== 'star') return null;

            // We expect the first node (i=0) to be exactly at the mouse cursor position (tip)
            // because our rotation logic tries to align the first outer point with the mouse angle.
            // Mouse angle (100,100 -> 300,100) is 0 radians.
            // i=0 angle is rotation + 0 = 0 radians.
            // So Node[0] should be at cx + r*cos(0), cy + r*sin(0) => cx + r, cy.
            // Which is exactly equal to the mouse position.

            return {
                tipNode: shape.nodes[0],
                centerNode: shape.nodes[0], // placeholder
                nodeCount: shape.nodes.length
            };
        });

        expect(result).not.toBeNull();
        expect(result!.nodeCount).toBeGreaterThan(0);

        // Assert that the first node (Tip) is exactly where the mouse was release (+/- rounding)
        expect(result!.tipNode.x).toBeCloseTo(tipX, 0.1);
        expect(result!.tipNode.y).toBeCloseTo(tipY, 0.1);
    });

    // Remove old Star tests that used Bounding Box logic which is no longer applicable

});
