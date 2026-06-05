/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import paper from 'paper';
import { SVGImportService, SVGImporter } from './svg-import';
import { PathShape } from '../shapes/models/path';
import { PathNode } from '../shapes/models/node';

// Paper.js default DPI is 72. 
// Web browsers usually default to 96 DPI, but Paper.js internally often uses 72 unless configured.
// Web default DPI is 96.
// Our new parser enforces this for physical units.
const DPI = 96;

describe('SVGImportService (Unit & Physical Dimensions)', () => {
    beforeEach(() => {
        // Mock SVGImporter.importSVG to avoid Paper.js crash and simulate 72 DPI imports
        vi.spyOn(SVGImporter, 'importSVG').mockImplementation((svgString: string) => {
            // Simulate Paper.js importing "1in" as 72 pixels (default internal resolution usually 72)
            // Or "100" as 100 pixels.

            // Simple mock: Regex to find width/height and return shape with those dimensions
            // If "in" or "mm" is found, Return 72 * value (simulating Paper's native 72DPI handling)
            // If px or number, return value.

            let width = 100;
            let height = 100;

            const wMatch = svgString.match(/width="([^"]+)"/);
            const hMatch = svgString.match(/height="([^"]+)"/);

            const parseMockUnit = (val: string) => {
                const n = parseFloat(val);
                if (val.includes('in')) return n * 72;
                if (val.includes('mm')) return (n / 25.4) * 72;
                return n;
            };

            if (wMatch) width = parseMockUnit(wMatch[1]);
            if (hMatch) height = parseMockUnit(hMatch[1]);

            // If viewbox is 0 0 72 72 and width is 1in, Paper creates a 72x72 object.

            // Create a mock PathShape
            const nodes = [
                new PathNode(0, 0),
                new PathNode(width, 0),
                new PathNode(width, height),
                new PathNode(0, height)
            ];

            // Ensure getBounds works
            const shape = new PathShape(nodes, true, 'layer-1', 'rect');
            return [shape];
        });
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('sanity check: strict mock is active', () => {
        const shapes = SVGImporter.importSVG('<svg width="100" height="100"></svg>');
        expect(shapes[0].getBounds().width).toBe(100);
    });

    it('should import 1 inch as 96 pixels (assuming 96 DPI enforcement)', () => {
        // 1in box
        const svg = `<svg width="1in" height="1in" viewBox="0 0 72 72"><rect x="0" y="0" width="1in" height="1in" /></svg>`;

        const shapes = SVGImportService.import(svg);
        expect(shapes).toBeDefined();
        expect(shapes.length).toBeGreaterThan(0);

        // Asserting existence to satisfy linter
        const shape = shapes[0];
        if (!shape) throw new Error('Shape not found');

        const bounds = shape.getBounds();

        // Detailed check
        console.log(`1in Test - Width: ${bounds.width}, Height: ${bounds.height}`);

        // Strict check: if it comes back as 1 (ignoring units), this will fail.
        expect(bounds.width).toBeCloseTo(DPI, 0.1);
        expect(bounds.height).toBeCloseTo(DPI, 0.1);
    });

    it('should treat 25.4mm exactly the same as 1 inch', () => {
        // 25.4mm box (should be exactly 1 inch)
        const svg = `<svg width="25.4mm" height="25.4mm" viewBox="0 0 72 72"><rect x="0" y="0" width="25.4mm" height="25.4mm" /></svg>`;

        const shapes = SVGImportService.import(svg);
        expect(shapes).toBeDefined();
        expect(shapes.length).toBeGreaterThan(0);

        const shape = shapes[0];
        if (!shape) throw new Error('Shape not found');

        const bounds = shape.getBounds();

        console.log(`25.4mm Test - Width: ${bounds.width}, Height: ${bounds.height}`);

        expect(bounds.width).toBeCloseTo(DPI, 0.1);
        expect(bounds.height).toBeCloseTo(DPI, 0.1);
    });

    it('should import raw pixels/numbers as-is', () => {
        // 100x100 user units (px)
        const svg = `<svg width="100" height="100"><rect x="0" y="0" width="100" height="100" /></svg>`;

        const shapes = SVGImportService.import(svg);
        const shape = shapes[0];
        if (!shape) throw new Error('Shape not found');

        const bounds = shape.getBounds();

        expect(bounds.width).toBeCloseTo(100, 0.1);
        expect(bounds.height).toBeCloseTo(100, 0.1);
    });

    it('should handle viewBox properly when dimensions match aspect ratio', () => {
        // ViewBox 0 0 100 100, but displayed in 50x50 space.
        // If width="50px" and viewBox="0 0 100 100", a rect of 100x100 inside should scale down to 50x50.
        const svg = `<svg width="50" height="50" viewBox="0 0 100 100"><rect x="0" y="0" width="100" height="100" /></svg>`;

        const shapes = SVGImportService.import(svg);
        const shape = shapes[0];
        if (!shape) throw new Error('Shape not found');

        const bounds = shape.getBounds();

        // Should be scaled down to 50
        expect(bounds.width).toBeCloseTo(50, 0.1);
        expect(bounds.height).toBeCloseTo(50, 0.1);
    });
});

describe('SVGImporter.fromPaperItem (style mapping)', () => {
    it('should store imported styles on shape properties, not in params', () => {
        const scope = new paper.PaperScope();
        scope.setup(new paper.Size(100, 100));

        const path = new scope.Path({
            segments: [
                new scope.Segment(new scope.Point(0, 0)),
                new scope.Segment(new scope.Point(100, 0)),
                new scope.Segment(new scope.Point(100, 100))
            ],
            closed: true,
            strokeColor: new paper.Color('red'),
            strokeWidth: 3,
            fillColor: new paper.Color('blue')
        });

        const shapes = SVGImporter.fromPaperItem(path);

        expect(shapes.length).toBe(1);
        expect(shapes[0].strokeColor).toBeDefined();
        expect(shapes[0].strokeWidth).toBe(3);
        expect(shapes[0].fillColor).toBeDefined();
        expect(shapes[0].params).toEqual({});
    });
});
