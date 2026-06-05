import { describe, it, expect } from 'vitest';
import { exportToSVG } from './svg-export';
import { PathShape } from '../shapes/models/path';
import { PathNode } from '../shapes/models/node';
import { PIXELS_PER_MM } from '../../config/constants';

// Mock XMLSerializer for Node environment if not present
// Vitest with happy-dom/jsdom should have it, but just in case.
if (typeof global.XMLSerializer === 'undefined') {
    global.XMLSerializer = class {
        serializeToString(node: Node) {
            return (node as any).outerHTML;
        }
    } as any;
}

// Mock Paper.js if needed, but exportToSVG uses it internally.
// We assume canvas is available in the test environment (jsdom/happy-dom).
import paper from 'paper';

// Mock toPath for PointText since jsdom/headless paper might not support it
if (!(paper.PointText.prototype as any).toPath) {
    (paper.PointText.prototype as any).toPath = function (this: any) {
        // Return a dummy path representing the vectorized text
        const path = new paper.Path();
        path.name = 'vectorized-text';
        // Add a segment so it's not empty and renders
        path.add(new paper.Point(this.point));
        path.add(new paper.Point(this.point.x + 10, this.point.y));
        return path;
    };
}

describe('SVG Export', () => {
    it('should export SVG with physical units (mm)', () => {
        // Arrange
        const widthPixels = 100 * PIXELS_PER_MM;
        const heightPixels = 50 * PIXELS_PER_MM;

        // Create a simple shape (rectangle)
        // 0,0 -> 100,0 -> 100,50 -> 0,50
        const nodes = [
            new PathNode(0, 0),
            new PathNode(widthPixels, 0),
            new PathNode(widthPixels, heightPixels),
            new PathNode(0, heightPixels)
        ];

        const shape = new PathShape(nodes, true, 'layer-1', 'path', {
            strokeColor: 'black',
            strokeWidth: 1
        });

        // Act
        const svgString = exportToSVG([shape], widthPixels, heightPixels);

        // Assert
        // We expect width="100.00mm" and height="50.00mm"

        // Log for debugging
        console.log('Exported SVG:', svgString);

        expect(svgString).toContain('width="100.00mm"');
        expect(svgString).toContain('height="50.00mm"');
        expect(svgString).toContain(`viewBox="0 0 ${widthPixels} ${heightPixels}"`);
    });

    it('should maintain correct scale for different sizes', () => {
        const sizeMM = 200;
        const pixels = sizeMM * PIXELS_PER_MM;

        const svgString = exportToSVG([], pixels, pixels);

        expect(svgString).toContain('width="200.00mm"');
        expect(svgString).toContain('height="200.00mm"');
    });

    it('should export shape style properties (strokeColor, fillColor)', () => {
        const nodes = [
            new PathNode(0, 0),
            new PathNode(100, 0),
            new PathNode(100, 100),
            new PathNode(0, 100)
        ];

        const shape = new PathShape(nodes, true, 'layer-1', 'path', {});
        shape.strokeColor = '#ff0000';
        shape.strokeWidth = 2;
        shape.fillColor = '#00ff00';

        const svgString = exportToSVG([shape], 500, 500);

        expect(svgString).toContain('ff0000');
        expect(svgString).toContain('00ff00');
    });

    it('should not crash on group shapes and export their children', () => {
        const child1 = new PathShape([
            new PathNode(0, 0), new PathNode(50, 0),
            new PathNode(50, 50), new PathNode(0, 50)
        ], true, 'layer-1');

        const child2 = new PathShape([
            new PathNode(60, 0), new PathNode(110, 0),
            new PathNode(110, 50), new PathNode(60, 50)
        ], true, 'layer-1');

        const group = {
            id: 'group-1',
            type: 'group',
            layerId: 'layer-1',
            closed: true,
            children: [child1, child2]
        };

        expect(() => {
            const svgString = exportToSVG([group] as any, 500, 500);
            expect(svgString).toContain('<path');
        }).not.toThrow();
    });

    it('should use default black stroke when shape has no styles', () => {
        const shape = new PathShape([
            new PathNode(0, 0), new PathNode(100, 0),
            new PathNode(100, 100), new PathNode(0, 100)
        ], true, 'layer-1');

        const svgString = exportToSVG([shape], 500, 500);

        expect(svgString).toContain('stroke');
    });

    it('should vectorize text elements', () => {
        // Arrange
        const textShape = {
            id: 'text-1',
            type: 'text',
            x: 100,
            y: 100,
            text: 'Hello',
            fontSize: 20,
            fontFamily: 'Arial',
            fillColor: 'black',
            scaleX: 1,
            scaleY: 1,
            rotation: 0,
            closed: false,
            layerId: 'layer-1'
        };

        // Act
        const svgString = exportToSVG([textShape] as any, 500, 500);

        // Assert
        // Should NOT contain <text> tag
        expect(svgString).not.toContain('<text');

        // Should contain <path> tags (letters are paths)
        // Note: Paper.js might create <g> for compound paths
        expect(svgString).toContain('<path');
    });
});
