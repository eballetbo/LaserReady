import { describe, it, expect } from 'vitest';
import { offsetShape, offsetShapes } from './offset';
import { PathShape } from '../../features/shapes/models/path';
import { PathNode } from '../../features/shapes/models/node';

const createRect = (types: 'corner' | 'smooth' = 'corner'): PathShape => {
    const nodes = [
        new PathNode(0, 0, 0, 0, 0, 0, types),
        new PathNode(100, 0, 100, 0, 100, 0, types),
        new PathNode(100, 100, 100, 100, 100, 100, types),
        new PathNode(0, 100, 0, 100, 0, 100, types)
    ];
    return new PathShape(nodes, true);
};

describe('Offset Math Engine', () => {
    it('should return a larger shape for outward offset with miter join', () => {
        const rect = createRect();
        const result = offsetShape(rect, 10, { join: 'miter' });

        expect(result).toHaveLength(1);
        const bounds = result[0].getBounds();

        expect(Math.round(bounds.width)).toBe(120);
        expect(Math.round(bounds.height)).toBe(120);
        expect(Math.round(bounds.minX)).toBe(-10);
    });

    it('should return a smaller shape for inward offset with miter join', () => {
        const rect = createRect();
        const result = offsetShape(rect, -10, { join: 'miter' });

        expect(result).toHaveLength(1);
        const bounds = result[0].getBounds();

        expect(Math.round(bounds.width)).toBe(80);
        expect(Math.round(bounds.height)).toBe(80);
        expect(Math.round(bounds.minX)).toBe(10);
    });

    it('should produce arcs at corners with round join', () => {
        const rect = createRect();
        const roundResult = offsetShape(rect, 10, { join: 'round' });
        const miterResult = offsetShape(rect, 10, { join: 'miter' });

        expect(roundResult).toHaveLength(1);
        expect(miterResult).toHaveLength(1);
        // Round join produces arc segments at corners → more nodes than miter
        expect(roundResult[0].nodes.length).toBeGreaterThan(miterResult[0].nodes.length);
    });

    it('should produce flat corners with bevel join', () => {
        const rect = createRect();
        const bevelResult = offsetShape(rect, 10, { join: 'bevel' });
        const roundResult = offsetShape(rect, 10, { join: 'round' });

        expect(bevelResult).toHaveLength(1);
        // Bevel produces fewer nodes than round (no arcs)
        expect(bevelResult[0].nodes.length).toBeLessThan(roundResult[0].nodes.length);
        // Bevel bounds are still approximately correct
        const bounds = bevelResult[0].getBounds();
        expect(Math.round(bounds.width)).toBe(120);
        expect(Math.round(bounds.height)).toBe(120);
    });

    it('should fall back to bevel when miter limit is exceeded', () => {
        // Create acute triangle where miter would extend far
        const nodes = [
            new PathNode(50, 0, 50, 0, 50, 0, 'corner'),
            new PathNode(100, 100, 100, 100, 100, 100, 'corner'),
            new PathNode(0, 100, 0, 100, 0, 100, 'corner')
        ];
        const triangle = new PathShape(nodes, true);

        // Very tight miter limit forces bevel fallback at acute angles
        const tightLimit = offsetShape(triangle, 5, { join: 'miter', limit: 1 });
        const looseMiter = offsetShape(triangle, 5, { join: 'miter', limit: 10 });

        expect(tightLimit).toHaveLength(1);
        expect(looseMiter).toHaveLength(1);
        // Loose miter extends further at the acute apex
        expect(looseMiter[0].getBounds().minY).toBeLessThan(tightLimit[0].getBounds().minY);
    });

    it('should return empty result if inward offset consumes shape', () => {
        const rect = createRect();
        const result = offsetShape(rect, -60);

        expect(result.length).toBe(0);
    });

    it('should default to round join when no option specified', () => {
        const rect = createRect();
        const defaultResult = offsetShape(rect, 10);
        const roundResult = offsetShape(rect, 10, { join: 'round' });

        expect(defaultResult).toHaveLength(1);
        expect(roundResult).toHaveLength(1);
        // Default and explicit round should produce similar node counts
        expect(Math.abs(defaultResult[0].nodes.length - roundResult[0].nodes.length)).toBeLessThanOrEqual(1);
    });

    it('should unite multiple shapes when offsetting (offsetShapes)', () => {
        const r1 = createRect();
        const r2 = createRect();
        r2.nodes.forEach(n => n.translate(50, 50));

        const result = offsetShapes([r1, r2], 10);

        expect(result).toHaveLength(1);
        const bounds = result[0].getBounds();
        expect(Math.round(bounds.minX)).toBe(-10);
        expect(Math.round(bounds.maxX)).toBe(160);
    });
});
