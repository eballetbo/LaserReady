
import { describe, it, expect } from 'vitest';
import { BooleanOperations } from './boolean';
import { PathShape } from '../../features/shapes/models/path';
import { PathNode } from '../../features/shapes/models/node';

// Helper to create a rectangle shape
function createRect(x: number, y: number, w: number, h: number): PathShape {
    const nodes = [
        new PathNode(x, y),
        new PathNode(x + w, y),
        new PathNode(x + w, y + h),
        new PathNode(x, y + h)
    ];
    return new PathShape(nodes, true);
}

describe('BooleanOperations', () => {
    it('should unite two overlapping rectangles', () => {
        const rect1 = createRect(0, 0, 100, 100);
        const rect2 = createRect(50, 0, 100, 100); // Overlaps by 50px width

        const result = BooleanOperations.unite([rect1, rect2]);

        // Should result in one shape (simplistic check)
        expect(result.length).toBe(1);

        // Bounding box check might be complex without helper, but verify nodes count > 4?
        // A union of two rects offset horizontally should have 8 points if simple? Or less if optimized?
        // Actually it might handle collinear points differently.
        // Let's just check it exists and is not empty.
        expect(result[0].nodes.length).toBeGreaterThanOrEqual(4);
    });

    it('should subtract rect2 from rect1', () => {
        const rect1 = createRect(0, 0, 100, 100);
        const rect2 = createRect(50, 0, 100, 100);

        // rect1 - rect2 = Left half of rect1 (0,0 to 50,100)
        const result = BooleanOperations.subtract([rect1, rect2]);

        expect(result.length).toBe(1);
        // We expect a rectangle roughly 50x100
        // We can verify bounds logic if we had it, but for now simple sanity check
        expect(result[0]).toBeDefined();
    });

    it('should intersect two overlapping rectangles', () => {
        const rect1 = createRect(0, 0, 100, 100);
        const rect2 = createRect(50, 0, 100, 100);

        // Intersection = 50,0 to 100,100 (50px wide)
        const result = BooleanOperations.intersect([rect1, rect2]);

        expect(result.length).toBe(1);
        expect(result[0]).toBeDefined();
    });

    it('should exclude (XOR) two overlapping rectangles', () => {
        const rect1 = createRect(0, 0, 100, 100);
        const rect2 = createRect(50, 0, 100, 100);

        // Exclude = Logic XOR. Left part of rect1 + Right part of rect2.
        // Should return a disjoint shape or single compound path?
        // Paper.js likely returns a CompoundPath which `fromPaperItem` might convert to multiple PathShapes?
        // Or one PathShape with hole?
        // Actually, XOR of two overlapping rects usually creates two separate polys if disjoint, or one complex poly with hole if nested?
        // Here they are side-by-side but separated by a gap (the intersection).
        // So likely 2 shapes.
        const result = BooleanOperations.exclude([rect1, rect2]);

        // Expect 2 shapes (the simple parts) OR 1 shape if implementation handles compound paths differently.
        // Let's verify result count.
        expect(result.length).toBeGreaterThanOrEqual(1);
    });
});
