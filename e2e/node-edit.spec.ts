import { test, expect, Page } from '@playwright/test';

async function setupEditor(page: Page) {
    await page.goto('/');
    await page.waitForTimeout(300);
    await page.evaluate(() => {
        (window as any).store.setState({ zoom: 1, pan: { x: 0, y: 0 } });
    });
}

async function createRectangleInStore(page: Page) {
    await page.evaluate(() => {
        const store = (window as any).store.getState();
        const PathShape = (window as any).PathShape;
        if (PathShape) {
            const shape = new PathShape([
                { x: 100, y: 100, cpIn: { x: 100, y: 100 }, cpOut: { x: 100, y: 100 }, type: 'corner' },
                { x: 200, y: 100, cpIn: { x: 200, y: 100 }, cpOut: { x: 200, y: 100 }, type: 'corner' },
                { x: 200, y: 200, cpIn: { x: 200, y: 200 }, cpOut: { x: 200, y: 200 }, type: 'corner' },
                { x: 100, y: 200, cpIn: { x: 100, y: 200 }, cpOut: { x: 100, y: 200 }, type: 'corner' },
            ], true, store.layers[0]?.id ?? 'default');
            store.addShapes([shape]);
        }
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

async function selectShapeAndActivateNodeEdit(page: Page) {
    // Select tool, click the shape, then switch to node-edit
    await page.keyboard.press('v');
    await page.waitForTimeout(50);
    const canvas = page.getByTestId('main-canvas');
    const box = (await canvas.boundingBox())!;
    await page.mouse.click(box.x + 150, box.y + 150);
    await page.waitForTimeout(50);

    // Activate node-edit tool
    await page.keyboard.press('n');
    await page.waitForTimeout(50);
}

async function getShapeNodes(page: Page) {
    return page.evaluate(() => {
        const shape = (window as any).store.getState().shapes[0];
        if (!shape || !shape.nodes) return [];
        return shape.nodes.map((n: any) => ({
            x: n.x, y: n.y,
            type: n.type,
            cpIn: { x: n.cpIn.x, y: n.cpIn.y },
            cpOut: { x: n.cpOut.x, y: n.cpOut.y },
        }));
    });
}


test.describe('Node Edit Tool', () => {

    test('click to select a node and drag moves it', async ({ page }) => {
        await setupEditor(page);
        await drawRectangleAt(page, 100, 100, 200, 200);
        await selectShapeAndActivateNodeEdit(page);

        const canvas = page.getByTestId('main-canvas');
        const box = (await canvas.boundingBox())!;

        const nodesBefore = await getShapeNodes(page);

        // Click on the first node — selects it
        await page.mouse.click(box.x + nodesBefore[0].x, box.y + nodesBefore[0].y);
        // Wait enough to avoid double-click detection (300ms threshold)
        await page.waitForTimeout(350);

        // Drag from the selected node location
        await page.mouse.move(box.x + nodesBefore[0].x, box.y + nodesBefore[0].y);
        await page.mouse.down();
        await page.mouse.move(box.x + nodesBefore[0].x + 15, box.y + nodesBefore[0].y + 15, { steps: 5 });
        await page.mouse.up();
        await page.waitForTimeout(50);

        const nodesAfter = await getShapeNodes(page);
        // Only node 0 should move (proving it was selected)
        expect(nodesAfter[0].x).toBeCloseTo(nodesBefore[0].x + 15, -1);
        expect(nodesAfter[1].x).toBeCloseTo(nodesBefore[1].x, -1);
    });

    test('drag to move a node', async ({ page }) => {
        await setupEditor(page);
        await drawRectangleAt(page, 100, 100, 200, 200);
        await selectShapeAndActivateNodeEdit(page);

        const canvas = page.getByTestId('main-canvas');
        const box = (await canvas.boundingBox())!;

        const nodesBefore = await getShapeNodes(page);
        const targetNode = nodesBefore[0];

        // Single drag — click selects and initiates drag simultaneously
        await page.mouse.move(box.x + targetNode.x, box.y + targetNode.y);
        await page.mouse.down();
        await page.mouse.move(box.x + targetNode.x + 30, box.y + targetNode.y + 30, { steps: 5 });
        await page.mouse.up();
        await page.waitForTimeout(50);

        const nodesAfter = await getShapeNodes(page);
        expect(nodesAfter[0].x).toBeCloseTo(targetNode.x + 30, -1);
        expect(nodesAfter[0].y).toBeCloseTo(targetNode.y + 30, -1);
    });

    test('change node type to smooth with S key', async ({ page }) => {
        await setupEditor(page);
        await drawRectangleAt(page, 100, 100, 200, 200);
        await selectShapeAndActivateNodeEdit(page);

        const canvas = page.getByTestId('main-canvas');
        const box = (await canvas.boundingBox())!;

        const nodes = await getShapeNodes(page);
        expect(nodes[0].type).toBe('corner');

        // Select first node
        await page.mouse.click(box.x + nodes[0].x, box.y + nodes[0].y);
        await page.waitForTimeout(50);

        // Press S for smooth
        await page.keyboard.press('s');
        await page.waitForTimeout(50);

        const nodesAfter = await getShapeNodes(page);
        expect(nodesAfter[0].type).toBe('smooth');
    });

    test('change node type to corner with C key', async ({ page }) => {
        await setupEditor(page);
        await drawRectangleAt(page, 100, 100, 200, 200);
        await selectShapeAndActivateNodeEdit(page);

        const canvas = page.getByTestId('main-canvas');
        const box = (await canvas.boundingBox())!;

        const nodes = await getShapeNodes(page);

        // Make node smooth via store directly for reliable initial state
        await page.evaluate(() => {
            const shape = (window as any).store.getState().shapes[0];
            shape.nodes[0].type = 'smooth';
        });

        // Select the node
        await page.mouse.click(box.x + nodes[0].x, box.y + nodes[0].y);
        await page.waitForTimeout(50);

        // Press C for corner
        await page.keyboard.press('c');
        await page.waitForTimeout(50);

        const cornerNode = (await getShapeNodes(page))[0];
        expect(cornerNode.type).toBe('corner');
    });

    test('delete node with Delete key', async ({ page }) => {
        await setupEditor(page);
        await drawRectangleAt(page, 100, 100, 200, 200);
        await selectShapeAndActivateNodeEdit(page);

        const canvas = page.getByTestId('main-canvas');
        const box = (await canvas.boundingBox())!;

        const nodesBefore = await getShapeNodes(page);
        expect(nodesBefore.length).toBe(4);

        // Select a node
        await page.mouse.click(box.x + nodesBefore[0].x, box.y + nodesBefore[0].y);
        await page.waitForTimeout(50);

        // Delete it
        await page.keyboard.press('Delete');
        await page.waitForTimeout(50);

        const nodesAfter = await getShapeNodes(page);
        expect(nodesAfter.length).toBe(3);
    });

    test('insert node by double-clicking segment', async ({ page }) => {
        await setupEditor(page);
        await drawRectangleAt(page, 100, 100, 200, 200);
        await selectShapeAndActivateNodeEdit(page);

        const canvas = page.getByTestId('main-canvas');
        const box = (await canvas.boundingBox())!;

        const nodesBefore = await getShapeNodes(page);
        expect(nodesBefore.length).toBe(4);

        // Double-click on the midpoint of the top segment (between node 0 and 1)
        const midX = (nodesBefore[0].x + nodesBefore[1].x) / 2;
        const midY = (nodesBefore[0].y + nodesBefore[1].y) / 2;

        await page.mouse.dblclick(box.x + midX, box.y + midY);
        await page.waitForTimeout(100);

        const nodesAfter = await getShapeNodes(page);
        expect(nodesAfter.length).toBe(5);
    });

    test('move node with undo', async ({ page }) => {
        await setupEditor(page);
        await drawRectangleAt(page, 100, 100, 200, 200);
        await selectShapeAndActivateNodeEdit(page);

        const canvas = page.getByTestId('main-canvas');
        const box = (await canvas.boundingBox())!;

        const nodesBefore = await getShapeNodes(page);
        const originalX = nodesBefore[0].x;
        const originalY = nodesBefore[0].y;

        // Single drag to select and move
        await page.mouse.move(box.x + originalX, box.y + originalY);
        await page.mouse.down();
        await page.mouse.move(box.x + originalX + 50, box.y + originalY + 50, { steps: 5 });
        await page.mouse.up();
        await page.waitForTimeout(50);

        // Verify moved
        const movedNodes = await getShapeNodes(page);
        expect(movedNodes[0].x).toBeCloseTo(originalX + 50, -1);

        // Undo
        await page.keyboard.press('Control+z');
        await page.waitForTimeout(100);

        const undoneNodes = await getShapeNodes(page);
        expect(undoneNodes[0].x).toBeCloseTo(originalX, -1);
        expect(undoneNodes[0].y).toBeCloseTo(originalY, -1);
    });

    test('shift+click adds to node selection and both move', async ({ page }) => {
        await setupEditor(page);
        await drawRectangleAt(page, 100, 100, 200, 200);
        await selectShapeAndActivateNodeEdit(page);

        const canvas = page.getByTestId('main-canvas');
        const box = (await canvas.boundingBox())!;

        const nodesBefore = await getShapeNodes(page);

        // Select first node
        await page.mouse.click(box.x + nodesBefore[0].x, box.y + nodesBefore[0].y);
        await page.waitForTimeout(350);

        // Shift+click second node
        await page.keyboard.down('Shift');
        await page.mouse.click(box.x + nodesBefore[1].x, box.y + nodesBefore[1].y);
        await page.keyboard.up('Shift');
        await page.waitForTimeout(350);

        // Verify both are selected by dragging — both should move
        await page.mouse.move(box.x + nodesBefore[0].x, box.y + nodesBefore[0].y);
        await page.mouse.down();
        await page.mouse.move(box.x + nodesBefore[0].x + 20, box.y + nodesBefore[0].y + 20, { steps: 5 });
        await page.mouse.up();
        await page.waitForTimeout(50);

        const nodesAfter = await getShapeNodes(page);
        // Both node 0 and node 1 should have moved
        expect(nodesAfter[0].x).toBeCloseTo(nodesBefore[0].x + 20, -1);
        expect(nodesAfter[1].x).toBeCloseTo(nodesBefore[1].x + 20, -1);
        // Node 2 should NOT have moved
        expect(nodesAfter[2].x).toBeCloseTo(nodesBefore[2].x, -1);
    });
});
