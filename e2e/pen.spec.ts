import { test, expect, Page } from '@playwright/test';

async function setupEditor(page: Page) {
    await page.goto('/');
    await page.waitForTimeout(300);
    await page.evaluate(() => {
        (window as any).store.setState({ zoom: 1, pan: { x: 0, y: 0 } });
    });
}

async function activatePenTool(page: Page) {
    await page.keyboard.press('p');
    await page.waitForTimeout(50);
}

async function getShapeCount(page: Page): Promise<number> {
    return page.evaluate(() => (window as any).store.getState().shapes.length);
}

async function getLastShape(page: Page) {
    return page.evaluate(() => {
        const shapes = (window as any).store.getState().shapes;
        const shape = shapes[shapes.length - 1];
        if (!shape) return null;
        return {
            id: shape.id,
            closed: shape.closed,
            nodeCount: shape.nodes?.length ?? 0,
            nodes: shape.nodes?.map((n: any) => ({
                x: n.x, y: n.y,
                cpIn: { x: n.cpIn.x, y: n.cpIn.y },
                cpOut: { x: n.cpOut.x, y: n.cpOut.y },
            })) ?? [],
        };
    });
}

test.describe('Pen Tool', () => {

    test('draw closed triangle by clicking first node', async ({ page }) => {
        await setupEditor(page);
        await activatePenTool(page);

        const canvas = page.getByTestId('main-canvas');
        const box = (await canvas.boundingBox())!;

        // Place 3 nodes
        await page.mouse.click(box.x + 100, box.y + 100);
        await page.mouse.click(box.x + 200, box.y + 100);
        await page.mouse.click(box.x + 150, box.y + 200);

        // Click near first node to close (within snap radius of 25px)
        await page.mouse.click(box.x + 100, box.y + 100);
        await page.waitForTimeout(100);

        const shape = await getLastShape(page);
        expect(shape).not.toBeNull();
        expect(shape!.closed).toBe(true);
        expect(shape!.nodeCount).toBe(3);
    });

    test('draw open path with Enter', async ({ page }) => {
        await setupEditor(page);
        await activatePenTool(page);

        const canvas = page.getByTestId('main-canvas');
        const box = (await canvas.boundingBox())!;

        // Place 3 nodes
        await page.mouse.click(box.x + 100, box.y + 100);
        await page.mouse.click(box.x + 200, box.y + 100);
        await page.mouse.click(box.x + 300, box.y + 100);

        // Finish with Enter
        await page.keyboard.press('Enter');
        await page.waitForTimeout(100);

        const shape = await getLastShape(page);
        expect(shape).not.toBeNull();
        expect(shape!.closed).toBe(false);
        expect(shape!.nodeCount).toBe(3);
    });

    test('Escape switches tool and commits 2+ node path', async ({ page }) => {
        await setupEditor(page);
        await activatePenTool(page);

        const canvas = page.getByTestId('main-canvas');
        const box = (await canvas.boundingBox())!;

        // Place 2 nodes
        await page.mouse.click(box.x + 100, box.y + 100);
        await page.mouse.click(box.x + 200, box.y + 100);

        // Press Escape — tool manager switches to select, onDeactivate commits
        await page.keyboard.press('Escape');
        await page.waitForTimeout(100);

        // Path with 2 nodes should be committed
        const shape = await getLastShape(page);
        expect(shape).not.toBeNull();
        expect(shape!.nodeCount).toBe(2);
        expect(shape!.closed).toBe(false);

        // Tool should now be select
        const tool = await page.evaluate(() => (window as any).store.getState().tool);
        expect(tool).toBe('select');
    });

    test('click+drag creates smooth node with control handles', async ({ page }) => {
        await setupEditor(page);
        await activatePenTool(page);

        const canvas = page.getByTestId('main-canvas');
        const box = (await canvas.boundingBox())!;

        // Click+drag to create smooth node
        await page.mouse.move(box.x + 150, box.y + 150);
        await page.mouse.down();
        await page.mouse.move(box.x + 200, box.y + 150, { steps: 5 });
        await page.mouse.up();

        // Finish path with Enter
        await page.mouse.click(box.x + 250, box.y + 250);
        await page.keyboard.press('Enter');
        await page.waitForTimeout(100);

        const shape = await getLastShape(page);
        expect(shape).not.toBeNull();
        expect(shape!.nodeCount).toBe(2);

        // First node should have non-zero control handles (smooth)
        const node = shape!.nodes[0];
        const hasCurvedHandles = (
            Math.abs(node.cpOut.x - node.x) > 1 ||
            Math.abs(node.cpOut.y - node.y) > 1
        );
        expect(hasCurvedHandles).toBe(true);
    });

    test('discard single-node path on Escape', async ({ page }) => {
        await setupEditor(page);
        await activatePenTool(page);

        const canvas = page.getByTestId('main-canvas');
        const box = (await canvas.boundingBox())!;

        const beforeCount = await getShapeCount(page);

        // Place a single node
        await page.mouse.click(box.x + 150, box.y + 150);

        // Press Escape
        await page.keyboard.press('Escape');
        await page.waitForTimeout(100);

        // No shape should be created
        const afterCount = await getShapeCount(page);
        expect(afterCount).toBe(beforeCount);
    });

    test('shift constrains to 45 degrees', async ({ page }) => {
        await setupEditor(page);
        await activatePenTool(page);

        const canvas = page.getByTestId('main-canvas');
        const box = (await canvas.boundingBox())!;

        // Place first node
        await page.mouse.click(box.x + 200, box.y + 200);

        // Place second node with shift held at ~30 degrees (should snap to 0 or 45)
        await page.keyboard.down('Shift');
        await page.mouse.click(box.x + 300, box.y + 170);
        await page.keyboard.up('Shift');

        // Finish
        await page.keyboard.press('Enter');
        await page.waitForTimeout(100);

        const shape = await getLastShape(page);
        expect(shape).not.toBeNull();
        expect(shape!.nodeCount).toBe(2);

        // Check angle between nodes is a multiple of 45 degrees
        const n0 = shape!.nodes[0];
        const n1 = shape!.nodes[1];
        const dx = n1.x - n0.x;
        const dy = n1.y - n0.y;
        const angle = Math.atan2(dy, dx) * (180 / Math.PI);
        const snappedAngle = Math.round(angle / 45) * 45;
        expect(Math.abs(angle - snappedAngle)).toBeLessThan(1);
    });

    test('tool switch commits path with 2+ nodes', async ({ page }) => {
        await setupEditor(page);
        await activatePenTool(page);

        const canvas = page.getByTestId('main-canvas');
        const box = (await canvas.boundingBox())!;

        // Place 3 nodes
        await page.mouse.click(box.x + 100, box.y + 100);
        await page.mouse.click(box.x + 200, box.y + 150);
        await page.mouse.click(box.x + 300, box.y + 100);

        // Switch to Select tool — should auto-commit
        await page.keyboard.press('v');
        await page.waitForTimeout(100);

        const shape = await getLastShape(page);
        expect(shape).not.toBeNull();
        expect(shape!.nodeCount).toBe(3);
        expect(shape!.closed).toBe(false);
    });

    test('tool switch discards single-node path', async ({ page }) => {
        await setupEditor(page);
        await activatePenTool(page);

        const canvas = page.getByTestId('main-canvas');
        const box = (await canvas.boundingBox())!;

        const beforeCount = await getShapeCount(page);

        // Place single node
        await page.mouse.click(box.x + 150, box.y + 150);

        // Switch tool — single node should be discarded
        await page.keyboard.press('v');
        await page.waitForTimeout(100);

        const afterCount = await getShapeCount(page);
        expect(afterCount).toBe(beforeCount);
    });
});
