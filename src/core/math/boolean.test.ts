
import { describe, it, expect } from 'vitest';
import { BooleanOperations } from './boolean';
import { PathShape } from '../../features/shapes/models/path';
import { PathNode } from '../../features/shapes/models/node';

// Mock PathShape/Node creation helpers
function createRect(x: number, y: number, w: number, h: number): PathShape {
    const nodes = [
        new PathNode(x, y),
        new PathNode(x + w, y),
        new PathNode(x + w, y + h),
        new PathNode(x, y + h)
    ];

    // Set CP handles for straight lines (rect)
    nodes.forEach(n => {
        n.cpIn = { x: n.x, y: n.y };
        n.cpOut = { x: n.x, y: n.y };
    });

    return new PathShape(
        nodes,
        true, // closed
        'layer1',
        'rect'
    );
}

describe('BooleanOperations', () => {
    it('should unite two overlapping rectangles into one shape', () => {
        const rect1 = createRect(100, 100, 100, 100); // 100,100 -> 200,200
        const rect2 = createRect(150, 150, 100, 100); // 150,150 -> 250,250

        const result = BooleanOperations.unite([rect1, rect2]);

        expect(result.length).toBe(1);

        // Optional: Perform bounds check or point check
        const bounds = result[0].getBounds();
        // Min should be 100, 100
        // Max should be 250, 250
        // But union is a 6-sided polygon.
        expect(bounds.minX).toBe(100);
        expect(bounds.minY).toBe(100);
        expect(bounds.maxX).toBe(250);
        expect(bounds.maxY).toBe(250);
    });

    it('should unite two disjoint rectangles into one compound shape (represented as array in this impl?)', () => {
        // This implementation returns PathShape[]. 
        // If paper returns CompoundPath, fromPaperItem creates multiple PathShapes?
        // Let's check logic:
        // item.children.forEach(child => processPath(child));
        // So if disjoint, it returns 2 shapes.

        const rect1 = createRect(0, 0, 10, 10);
        const rect2 = createRect(100, 100, 10, 10);

        const result = BooleanOperations.unite([rect1, rect2]);
        expect(result.length).toBe(2);
    });
});
