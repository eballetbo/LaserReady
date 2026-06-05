import { describe, it, expect, beforeEach } from 'vitest';
import { SnapManager } from './snapping';
import { CanvasController } from './controller';
import { PathNode } from '../shapes/models/node';

// Mock CanvasController
const mockController = {
    config: {
        gridSpacing: 10
    },
    shapes: [],
    zoom: 1
} as unknown as CanvasController;

describe('SnapManager', () => {
    let snapManager: SnapManager;

    beforeEach(() => {
        snapManager = new SnapManager(mockController);
        // Reset controller state
        (mockController.shapes as any) = [];
        mockController.zoom = 1;
        snapManager.settings.threshold = 10;
        snapManager.settings.grid = true;
        snapManager.settings.objects = true;
    });

    describe('Grid Snapping', () => {
        it('should snap to nearest grid point', () => {
            const candidate = { x: 12, y: 12 }; // Nearest is 10,10
            const result = snapManager.snapPoint(candidate);
            expect(result.type).toBe('grid');
            expect(result.point).toEqual({ x: 10, y: 10 });
        });

        it('should not snap if outside threshold', () => {
            // const candidate = { x: 16, y: 16 }; // Unused
            // If threshold is 10, 5.6 is within threshold.
            // Nearest grid is 20,20. DistSq = 32. 
            // 10,10 DistSq = 36 + 36 = 72.

            // Let's test explicit outside. 
            // Grid 10. Point 15,15. Exactly middle.
            // Point 10 + 6 = 16. Dist to 10 = 6. Dist to 20 = 4. 4 < 10.

            // Set tiny threshold
            snapManager.settings.threshold = 1;
            const result = snapManager.snapPoint({ x: 12, y: 12 });
            expect(result.type).toBe('none');
            expect(result.point).toEqual({ x: 12, y: 12 });
        });

        it('should respect zoom for threshold', () => {
            // Setup: Grid spacing 10.
            mockController.zoom = 1;
            snapManager.settings.threshold = 4; // Pixel threshold 4. World thresh 4.

            // Candidate at 15, 0.
            // Nearest grid is 20, 0 (or 10,0). Distance to either is 5.
            // Dist 5 > Threshold 4. Should NOT snap.
            expect(snapManager.snapPoint({ x: 15, y: 0 }).type).toBe('none');

            // Zoom out.
            mockController.zoom = 0.5;
            // Pixel threshold 4 / Zoom 0.5 = World threshold 8.
            // Dist 5 < World threshold 8. Should SNAP.

            const result = snapManager.snapPoint({ x: 15, y: 0 });
            expect(result.type).toBe('grid');
            // It might snap to 10 or 20 dependent on rounding. 15 rounds to 20 in JS Math.round (1.5->2).
        });
    });

    describe('Object Snapping', () => {
        beforeEach(() => {
            snapManager.settings.grid = false; // Disable grid to test object isolation
            (mockController.shapes as any) = [{
                id: 's1',
                visible: true,
                closed: false,
                nodes: [
                    new PathNode(100, 100),
                    new PathNode(200, 100)
                ],
                getBounds: () => ({ minX: 100, maxX: 200, minY: 100, maxY: 100 })
            }];
        });

        it('should snap to endpoint', () => {
            const result = snapManager.snapPoint({ x: 102, y: 102 });
            expect(result.type).toBe('endpoint');
            expect(result.point).toEqual({ x: 100, y: 100 });
        });

        it('should snap to midpoint', () => {
            const result = snapManager.snapPoint({ x: 152, y: 102 });
            expect(result.type).toBe('midpoint');
            expect(result.point).toEqual({ x: 150, y: 100 });
        });

        it('should snap to center', () => {
            (mockController.shapes as any) = [{
                id: 'rect',
                visible: true,
                nodes: [], // Dummy
                getBounds: () => ({ minX: 0, maxX: 100, minY: 0, maxY: 100 }) // Center 50,50
            }];

            const result = snapManager.snapPoint({ x: 52, y: 52 });
            expect(result.type).toBe('center');
            expect(result.point).toEqual({ x: 50, y: 50 });
        });

        it('should exclude excluded shapes', () => {
            const result = snapManager.snapPoint({ x: 102, y: 102 }, ['s1']);
            expect(result.type).toBe('none');
        });
    });

    describe('Angle Snapping', () => {
        it('should snap to nearest 15-degree increment when constrained', () => {
            expect(snapManager.snapAngle(14 * Math.PI / 180, true)).toBeCloseTo(15 * Math.PI / 180);
            expect(snapManager.snapAngle(16 * Math.PI / 180, true)).toBeCloseTo(15 * Math.PI / 180);
        });

        it('should snap 0 to 0', () => {
            expect(snapManager.snapAngle(2 * Math.PI / 180, true)).toBeCloseTo(0);
        });

        it('should snap to 90 degrees', () => {
            expect(snapManager.snapAngle(89 * Math.PI / 180, true)).toBeCloseTo(90 * Math.PI / 180);
            expect(snapManager.snapAngle(91 * Math.PI / 180, true)).toBeCloseTo(90 * Math.PI / 180);
        });

        it('should not snap when constrain is false', () => {
            const angle = 17 * Math.PI / 180;
            expect(snapManager.snapAngle(angle, false)).toBeCloseTo(angle);
        });

        it('should handle negative angles', () => {
            expect(snapManager.snapAngle(-14 * Math.PI / 180, true)).toBeCloseTo(-15 * Math.PI / 180);
        });
    });
});
