import { describe, it, expect, beforeEach } from 'vitest';
import { SnapManager } from './snapping';
import { CanvasController } from './controller';
import { PathNode } from '../shapes/models/node';
import { MINOR_GRID_SPACING } from '../../config/constants';

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
        it('should snap to nearest 1mm grid point', () => {
            const g = MINOR_GRID_SPACING;
            const candidate = { x: g * 3 + g * 0.2, y: g * 5 + g * 0.2 };
            const result = snapManager.snapPoint(candidate);
            expect(result.type).toBe('grid');
            expect(result.point.x).toBeCloseTo(g * 3, 5);
            expect(result.point.y).toBeCloseTo(g * 5, 5);
        });

        it('should not snap if outside threshold', () => {
            const g = MINOR_GRID_SPACING;
            // Place candidate exactly between two grid lines (max distance)
            const mid = g * 3 + g * 0.5;
            // Distance to nearest grid line = g/2 ≈ 1.89
            // Set threshold smaller than that distance
            snapManager.settings.threshold = 0.5;
            const result = snapManager.snapPoint({ x: mid, y: mid });
            expect(result.type).toBe('none');
            expect(result.point).toEqual({ x: mid, y: mid });
        });

        it('should respect zoom for threshold', () => {
            const g = MINOR_GRID_SPACING;
            mockController.zoom = 1;
            // Place candidate at the midpoint between grid lines
            const mid = g * 4 + g * 0.5; // distance to nearest = g/2 ≈ 1.89
            snapManager.settings.threshold = 1; // world threshold = 1 < 1.89 → no snap

            expect(snapManager.snapPoint({ x: mid, y: 0 }).type).toBe('none');

            // Zoom out → world threshold = 1 / 0.25 = 4 > 1.89 → should snap
            mockController.zoom = 0.25;
            const result = snapManager.snapPoint({ x: mid, y: 0 });
            expect(result.type).toBe('grid');
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
