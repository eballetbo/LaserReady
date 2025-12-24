import { describe, it, expect } from 'vitest';
import { Geometry, Point, Rect } from './geometry';

describe('Geometry', () => {
    describe('getDistance', () => {
        it('should calculate squared distance between two points', () => {
            const p1: Point = { x: 0, y: 0 };
            const p2: Point = { x: 3, y: 4 };

            // Distance squared = 3^2 + 4^2 = 9 + 16 = 25
            expect(Geometry.getDistance(p1, p2)).toBe(25);
        });

        it('should return 0 for same point', () => {
            const p: Point = { x: 5, y: 5 };
            expect(Geometry.getDistance(p, p)).toBe(0);
        });
    });

    describe('rotatePoint', () => {
        it('should rotate point 90 degrees around origin', () => {
            const point: Point = { x: 1, y: 0 };
            const center: Point = { x: 0, y: 0 };
            const angle = Math.PI / 2; // 90 degrees

            const rotated = Geometry.rotatePoint(point, center, angle);

            // After 90° rotation clockwise, (1,0) becomes (0,1)
            expect(rotated.x).toBeCloseTo(0, 5);
            expect(rotated.y).toBeCloseTo(1, 5);
        });

        it('should not change point when rotating around itself', () => {
            const point: Point = { x: 5, y: 5 };
            const rotated = Geometry.rotatePoint(point, point, Math.PI);

            expect(rotated.x).toBeCloseTo(point.x, 5);
            expect(rotated.y).toBeCloseTo(point.y, 5);
        });
    });

    describe('calculateBoundingBox', () => {
        it('should calculate correct bounding box for multiple points', () => {
            const nodes: Point[] = [
                { x: 0, y: 0 },
                { x: 10, y: 5 },
                { x: 5, y: 10 }
            ];

            const bbox = Geometry.calculateBoundingBox(nodes);

            expect(bbox.minX).toBe(0);
            expect(bbox.minY).toBe(0);
            expect(bbox.maxX).toBe(10);
            expect(bbox.maxY).toBe(10);
            expect(bbox.width).toBe(10);
            expect(bbox.height).toBe(10);
            expect(bbox.cx).toBe(5);
            expect(bbox.cy).toBe(5);
        });

        it('should handle single point', () => {
            const nodes: Point[] = [{ x: 5, y: 5 }];
            const bbox = Geometry.calculateBoundingBox(nodes);

            expect(bbox.minX).toBe(5);
            expect(bbox.maxX).toBe(5);
            expect(bbox.width).toBe(0);
            expect(bbox.height).toBe(0);
        });
    });

    describe('isRectInRect', () => {
        it('should return true when r1 is completely inside r2', () => {
            const r1: Rect = { minX: 2, minY: 2, maxX: 4, maxY: 4 };
            const r2: Rect = { minX: 0, minY: 0, maxX: 10, maxY: 10 };

            expect(Geometry.isRectInRect(r1, r2)).toBe(true);
        });

        it('should return false when r1 overlaps but not contained', () => {
            const r1: Rect = { minX: 5, minY: 5, maxX: 15, maxY: 15 };
            const r2: Rect = { minX: 0, minY: 0, maxX: 10, maxY: 10 };

            expect(Geometry.isRectInRect(r1, r2)).toBe(false);
        });

        it('should return false when r1 is outside r2', () => {
            const r1: Rect = { minX: 20, minY: 20, maxX: 25, maxY: 25 };
            const r2: Rect = { minX: 0, minY: 0, maxX: 10, maxY: 10 };

            expect(Geometry.isRectInRect(r1, r2)).toBe(false);
        });
    });

    describe('getCombinedBounds', () => {
        it('should return null for empty array', () => {
            expect(Geometry.getCombinedBounds([])).toBeNull();
        });

        it('should combine bounds of multiple shapes', () => {
            const shapes = [
                {
                    getBounds: () => ({ minX: 0, minY: 0, maxX: 5, maxY: 5 })
                },
                {
                    getBounds: () => ({ minX: 10, minY: 10, maxX: 20, maxY: 20 })
                }
            ];

            const combined = Geometry.getCombinedBounds(shapes);

            expect(combined).not.toBeNull();
            expect(combined?.minX).toBe(0);
            expect(combined?.minY).toBe(0);
            expect(combined?.maxX).toBe(20);
            expect(combined?.maxY).toBe(20);
            expect(combined?.width).toBe(20);
            expect(combined?.height).toBe(20);
        });
    });
});
