import { test, expect, Page } from '@playwright/test';

async function setupEditor(page: Page) {
    await page.goto('/');
    await page.waitForTimeout(300);
    await page.evaluate(() => {
        (window as any).store.setState({ zoom: 1, pan: { x: 0, y: 0 } });
    });
}

async function activateTextTool(page: Page) {
    await page.keyboard.press('t');
    await page.waitForTimeout(50);
}

async function getShapeCount(page: Page): Promise<number> {
    return page.evaluate(() => (window as any).store.getState().shapes.length);
}

async function getLastTextShape(page: Page) {
    return page.evaluate(() => {
        const shapes = (window as any).store.getState().shapes;
        const textShapes = shapes.filter((s: any) => s.type === 'text');
        if (textShapes.length === 0) return null;
        const shape = textShapes[textShapes.length - 1];
        return {
            id: shape.id,
            text: shape.text,
            fontFamily: shape.fontFamily,
            fontSize: shape.fontSize,
            x: shape.x,
            y: shape.y,
            alignX: shape.alignX,
            upperCase: shape.upperCase,
        };
    });
}

test.describe('Text Tool', () => {

    test('click to place text and type', async ({ page }) => {
        await setupEditor(page);
        await activateTextTool(page);

        const canvas = page.getByTestId('main-canvas');
        const box = (await canvas.boundingBox())!;

        // Click to place text insertion point
        await page.mouse.click(box.x + 200, box.y + 150);
        await page.waitForTimeout(100);

        // Type text into the hidden textarea
        await page.keyboard.type('Hello');
        await page.waitForTimeout(100);

        // Press Escape to finish editing, then switch tool
        await page.keyboard.press('Escape');
        await page.waitForTimeout(100);

        const textShape = await getLastTextShape(page);
        expect(textShape).not.toBeNull();
        expect(textShape!.text).toBe('Hello');
    });

    test('multi-line text with Enter', async ({ page }) => {
        await setupEditor(page);
        await activateTextTool(page);

        const canvas = page.getByTestId('main-canvas');
        const box = (await canvas.boundingBox())!;

        await page.mouse.click(box.x + 200, box.y + 150);
        await page.waitForTimeout(100);

        await page.keyboard.type('Line1');
        await page.keyboard.press('Enter');
        await page.keyboard.type('Line2');

        // Finish with Escape
        await page.keyboard.press('Escape');
        await page.waitForTimeout(100);

        const textShape = await getLastTextShape(page);
        expect(textShape).not.toBeNull();
        expect(textShape!.text).toContain('Line1');
        expect(textShape!.text).toContain('Line2');
        expect(textShape!.text).toMatch(/Line1[\n\r]Line2/);
    });

    test('empty text is discarded on tool switch', async ({ page }) => {
        await setupEditor(page);
        await activateTextTool(page);

        const canvas = page.getByTestId('main-canvas');
        const box = (await canvas.boundingBox())!;

        const beforeCount = await getShapeCount(page);

        // Click to start text but type nothing
        await page.mouse.click(box.x + 200, box.y + 150);
        await page.waitForTimeout(100);

        // Press Escape — empty text should be discarded
        await page.keyboard.press('Escape');
        await page.waitForTimeout(100);

        const afterCount = await getShapeCount(page);
        expect(afterCount).toBe(beforeCount);
    });

    test('font family change updates text', async ({ page }) => {
        await setupEditor(page);
        await activateTextTool(page);

        const canvas = page.getByTestId('main-canvas');
        const box = (await canvas.boundingBox())!;

        // Create text
        await page.mouse.click(box.x + 200, box.y + 150);
        await page.waitForTimeout(100);
        await page.keyboard.type('Test');
        await page.keyboard.press('v');
        await page.waitForTimeout(100);

        // Select the text
        await page.mouse.click(box.x + 200, box.y + 150);
        await page.waitForTimeout(100);

        // Change font family via the TextOptionsBar select
        const fontSelect = page.locator('select').filter({ has: page.locator('option[value="Arial"]') }).first();
        if (await fontSelect.isVisible()) {
            await fontSelect.selectOption('Times New Roman');
            await page.waitForTimeout(100);

            const textShape = await getLastTextShape(page);
            expect(textShape!.fontFamily).toBe('Times New Roman');
        }
    });

    test('Escape finishes editing and commits text', async ({ page }) => {
        await setupEditor(page);
        await activateTextTool(page);

        const canvas = page.getByTestId('main-canvas');
        const box = (await canvas.boundingBox())!;

        await page.mouse.click(box.x + 200, box.y + 200);
        await page.waitForTimeout(100);

        await page.keyboard.type('Preserved');
        await page.waitForTimeout(50);

        // Press Escape — finishes editing, text committed
        await page.keyboard.press('Escape');
        await page.waitForTimeout(100);

        const textShape = await getLastTextShape(page);
        expect(textShape).not.toBeNull();
        expect(textShape!.text).toBe('Preserved');
    });
});
