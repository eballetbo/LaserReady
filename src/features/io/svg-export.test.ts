
import { describe, it, expect, vi } from 'vitest';
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
});
