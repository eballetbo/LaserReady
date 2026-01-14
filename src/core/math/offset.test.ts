import { describe, it, expect } from 'vitest';
import { offsetShape, offsetShapes } from './offset';
import { PathShape } from '../../features/shapes/models/path';
import { PathNode } from '../../features/shapes/models/node';

// Helper to create a simple 100x100 rectangle starting at 0,0
const createRect = (types: 'corner' | 'smooth' = 'corner'): PathShape => {
    const nodes = [
        new PathNode(0, 0, 0, 0, 0, 0, types),
        new PathNode(100, 0, 100, 0, 100, 0, types),
        new PathNode(100, 100, 100, 100, 100, 100, types),
        new PathNode(0, 100, 0, 100, 0, 100, types)
    ];
    return new PathShape(nodes, true); // closed
};

describe('Offset Math Engine', () => {
    it('should return a larger shape for outward offset', () => {
        const rect = createRect();
        const offsetDist = 10;

        const result = offsetShape(rect, offsetDist, { join: 'miter' });

        expect(result).toHaveLength(1);
        const offsetRect = result[0];
        const bounds = offsetRect.getBounds();

        // Original: 0,0 to 100,100 (W=100, H=100)
        // Offset +10: -10,-10 to 110,110 (W=120, H=120)

        expect(Math.round(bounds.width)).toBe(120);
        expect(Math.round(bounds.height)).toBe(120);
        expect(Math.round(bounds.minX)).toBe(-10);
    });

    it('should return a smaller shape for inward offset', () => {
        const rect = createRect();
        const offsetDist = -10;

        const result = offsetShape(rect, offsetDist, { join: 'miter' });

        expect(result).toHaveLength(1);
        const offsetRect = result[0];
        const bounds = offsetRect.getBounds();

        // Original: 0,0 to 100,100
        // Offset -10: 10,10 to 90,90 (W=80, H=80)

        expect(Math.round(bounds.width)).toBe(80);
        expect(Math.round(bounds.height)).toBe(80);
        expect(Math.round(bounds.minX)).toBe(10);
    });

    it('should handle round joins', () => {
        const rect = createRect();
        const offsetDist = 10;
        const result = offsetShape(rect, offsetDist, { join: 'round' });

        expect(result).toHaveLength(1);
        // Round join adds nodes for the arcs at corners
        expect(result[0].nodes.length).toBeGreaterThan(4);
    });

    it('should return empty result if inward offset consumes shape', () => {
        const rect = createRect();
        const offsetDist = -60; // Radius > half width (50)

        const result = offsetShape(rect, offsetDist);

        expect(result.length).toBe(0);
    });

    it('should unite multiple shapes when offsetting (offsetShapes)', () => {
        // Two overlapping rectangles
        const r1 = createRect(); // 0,0 to 100,100
        const r2 = createRect();
        // Move r2 to 50,50 (overlap)
        r2.nodes.forEach(n => n.translate(50, 50)); // 50,50 to 150,150

        // Offset their union by 10
        const result = offsetShapes([r1, r2], 10);

        expect(result).toHaveLength(1); // Should be one big shape
        const bounds = result[0].getBounds();

        // Expected Union Bounds: 0,0 to 150,150
        // Expanded by 10: -10,-10 to 160,160
        expect(Math.round(bounds.minX)).toBe(-10);
        expect(Math.round(bounds.maxX)).toBe(160);
    });
});
