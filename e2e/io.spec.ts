
import { test, expect } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test.describe('File IO', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('http://localhost:5173');
        await expect(page.getByTestId('main-canvas')).toBeVisible();
        await page.waitForTimeout(500);
    });

    test('Import SVG file', async ({ page }) => {
        // Check initial state
        const initialCount = await page.evaluate(() => (window as any).useStore.getState().shapes.length);
        expect(initialCount).toBe(0);

        // Prepare file path
        const filePath = path.resolve(__dirname, 'assets/simple.svg');

        // Trigger file upload
        // We targeting the hidden input.
        // Note: The input is present in the DOM (App.tsx).
        await page.setInputFiles('input[type="file"]', filePath);

        // Wait for shapes to be added (import might be async internally but runs on FileReader onload)
        // We can poll or wait for condition
        await expect.poll(async () => {
            return await page.evaluate(() => (window as any).useStore.getState().shapes.length);
        }).toBeGreaterThan(0);

        const finalCount = await page.evaluate(() => (window as any).useStore.getState().shapes.length);
        // Simple.svg has 2 shapes (rect + circle)
        expect(finalCount).toBe(2);
    });
});
