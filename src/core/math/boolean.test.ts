
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
    describe('unite', () => {
        it('should unite two overlapping rectangles into one shape', () => {
            const rect1 = createRect(100, 100, 100, 100); // 100,100 -> 200,200
            const rect2 = createRect(150, 150, 100, 100); // 150,150 -> 250,250

            const result = BooleanOperations.unite([rect1, rect2]);

            expect(result.length).toBe(1);
            const bounds = result[0].getBounds();
            expect(bounds.minX).toBe(100);
            expect(bounds.minY).toBe(100);
            expect(bounds.maxX).toBe(250);
            expect(bounds.maxY).toBe(250);
        });

        it('should unite two disjoint rectangles into one compound shape', () => {
            const rect1 = createRect(0, 0, 10, 10);
            const rect2 = createRect(100, 100, 10, 10);

            const result = BooleanOperations.unite([rect1, rect2]);
            // If paper returns CompoundPath, fromPaperItem creates multiple PathShapes
            expect(result.length).toBe(2);
        });
    });

    describe('subtract', () => {
        it('should subtract one rectangle from another', () => {
            const rect1 = createRect(100, 100, 100, 100); // Base rect: 100,100 -> 200,200
            const rect2 = createRect(150, 150, 100, 100); // Cutter rect: 150,150 -> 250,250

            // Subtract rect2 from rect1
            const result = BooleanOperations.subtract([rect1, rect2]);

            // Expected L-shape or similar.
            expect(result.length).toBe(1);

            // The bounds of the remaining shape should be:
            // minX=100, maxX=200
            // minY=100, maxY=200
            // But the corner (150,150) -> (200,200) is removed.

            // The bounds of the remaining shape should be: 
            const bounds = result[0].getBounds();
            expect(bounds.minX).toBe(100);
            expect(bounds.maxX).toBe(200);
            expect(bounds.minY).toBe(100);
            expect(bounds.maxY).toBe(200);
        });
    });

    describe('intersect', () => {
        it('should return the intersection of two overlapping rectangles', () => {
            const rect1 = createRect(100, 100, 100, 100); // 100,100 -> 200,200
            const rect2 = createRect(150, 150, 100, 100); // 150,150 -> 250,250

            const result = BooleanOperations.intersect([rect1, rect2]);

            expect(result.length).toBe(1);

            // Intersection is 150,150 to 200,200
            const bounds = result[0].getBounds();
            expect(bounds.minX).toBe(150);
            expect(bounds.minY).toBe(150);
            expect(bounds.maxX).toBe(200);
            expect(bounds.maxY).toBe(200);
        });

        it('should return empty result (or empty shape) for disjoint shapes', () => {
            const rect1 = createRect(0, 0, 10, 10);
            const rect2 = createRect(100, 100, 10, 10);

            const result = BooleanOperations.intersect([rect1, rect2]);
            // Current implementation returns 1 shape with 0 nodes for disjoint intersection
            if (result.length > 0) {
                expect(result[0].nodes.length).toBe(0);
            } else {
                expect(result.length).toBe(0);
            }
        });
    });

    describe('exclude', () => {
        it('should exclude the intersection area', () => {
            const rect1 = createRect(100, 100, 100, 100); // 100,100 -> 200,200
            const rect2 = createRect(150, 150, 100, 100); // 150,150 -> 250,250

            const result = BooleanOperations.exclude([rect1, rect2]);

            // Result should be 2 shapes? Or 1 compound shape?
            // Usually 'exclude' (XOR) returns a compound path if the single continuous path isn't possible,
            // or multiple paths.
            // In this case, we have the L-shape from rect1-rect2 and the L-shape from rect2-rect1.
            // They touch at two points (150,200) and (200,150). They might be considered one compound path.

            // Depending on implementation, might return 1 compound path converted to >1 PathShapes, or 1 PathShape if connected.
            expect(result.length).toBeGreaterThan(0);
        });
    });
});
