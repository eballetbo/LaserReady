import { CanvasController } from './controller';
import { Geometry, Point } from '../../core/math/geometry';
import { DEFAULT_GRID_SPACING } from '../../config/constants';

export interface SnapResult {
    point: Point;
    type: 'none' | 'grid' | 'endpoint' | 'midpoint' | 'center';
    sourceShapeId?: string;
}

export interface SnapSettings {
    enabled: boolean;
    grid: boolean;
    objects: boolean;
    threshold: number; // In screen pixels
}

export class SnapManager {
    private controller: CanvasController;

    settings: SnapSettings = {
        enabled: true,
        grid: true,
        objects: true,
        threshold: 10
    };

    activeSnap: SnapResult | null = null;

    constructor(controller: CanvasController) {
        this.controller = controller;
    }

    clear() {
        this.activeSnap = null;
    }

    /**
     * Calculates the best snap point for a given candidate point.
     * @param candidate The point to snap (in world coordinates)
     * @param excludeShapeIds Optional list of shape IDs to ignore (e.g. shapes being dragged)
     */
    snapPoint(candidate: Point, excludeShapeIds: string[] = []): SnapResult {
        if (!this.settings.enabled) {
            this.activeSnap = null;
            return { point: candidate, type: 'none' };
        }

        let bestSnap: SnapResult = {
            type: 'none',
            point: { ...candidate }
        };
        // We will minimize squared distance
        let minDistSq = Infinity;

        // Calculate world threshold based on current zoom
        // threshold (px) / zoom = threshold (world units)
        const worldThreshold = this.settings.threshold / this.controller.zoom;
        const worldThresholdSq = worldThreshold * worldThreshold;

        // 1. Grid Snap
        if (this.settings.grid) {
            const spacing = this.controller.config.gridSpacing || DEFAULT_GRID_SPACING;
            const snapX = Math.round(candidate.x / spacing) * spacing;
            const snapY = Math.round(candidate.y / spacing) * spacing;

            const distSq = Geometry.getDistance(candidate, { x: snapX, y: snapY });

            if (distSq < worldThresholdSq && distSq < minDistSq) {
                bestSnap.point = { x: snapX, y: snapY };
                bestSnap.type = 'grid';
                minDistSq = distSq;
            }
        }

        // 2. Object Snap
        if (this.settings.objects) {
            const shapes = this.controller.shapes;

            shapes.forEach(shape => {
                if (excludeShapeIds.includes(shape.id)) return;
                if ((shape as any).visible === false) return; // Skip invisible (if we had visibility flag, robust check)

                // A. Vertices (Endpoints)
                if (shape.nodes) {
                    shape.nodes.forEach(node => {
                        const distSq = Geometry.getDistance(candidate, node);
                        if (distSq < worldThresholdSq && distSq < minDistSq) {
                            bestSnap.point = { x: node.x, y: node.y };
                            bestSnap.type = 'endpoint';
                            bestSnap.sourceShapeId = shape.id;
                            minDistSq = distSq;
                        }
                    });

                    // B. Midpoints
                    for (let i = 0; i < shape.nodes.length; i++) {
                        // For open shapes, skip last segment logic if i is last
                        if (!shape.closed && i === shape.nodes.length - 1) continue;

                        const n1 = shape.nodes[i];
                        const n2 = shape.nodes[(i + 1) % shape.nodes.length];

                        // Simple midpoint (for straight lines). 
                        // For Bezier, exact midpoint is at t=0.5 but might not lie on the straight line.
                        // Ideally we snap to the curve midpoint.
                        // Let's use geometry lerp/eval for t=0.5
                        // If it's a straight line (no control points), it matches straight midpoint.

                        let midX: number, midY: number;

                        // Check if it's a bezier curve
                        // If n1.cpOut != n1 or n2.cpIn != n2
                        const isCurve = (n1.cpOut && (n1.cpOut.x !== n1.x || n1.cpOut.y !== n1.y)) ||
                            (n2.cpIn && (n2.cpIn.x !== n2.x || n2.cpIn.y !== n2.y));

                        if (isCurve) {
                            // Bezier midpoint at t=0.5
                            // B(t) = (1-t)^3 P0 + 3(1-t)^2 t P1 + 3(1-t) t^2 P2 + t^3 P3
                            // t = 0.5, (1-t) = 0.5
                            const mt3 = 0.125; // 0.5^3
                            const t3 = 0.125;
                            const mtt = 0.375; // 3 * 0.5 * 0.5 * 0.5

                            // P0=n1, P1=n1.cpOut, P2=n2.cpIn, P3=n2
                            midX = mt3 * n1.x + mtt * n1.cpOut.x + mtt * n2.cpIn.x + t3 * n2.x;
                            midY = mt3 * n1.y + mtt * n1.cpOut.y + mtt * n2.cpIn.y + t3 * n2.y;
                        } else {
                            midX = (n1.x + n2.x) / 2;
                            midY = (n1.y + n2.y) / 2;
                        }

                        const distSq = Geometry.getDistance(candidate, { x: midX, y: midY });
                        if (distSq < worldThresholdSq && distSq < minDistSq) {
                            bestSnap.point = { x: midX, y: midY };
                            bestSnap.type = 'midpoint';
                            bestSnap.sourceShapeId = shape.id;
                            minDistSq = distSq;
                        }
                    }
                }

                // C. Center
                // We use calculateBezierBoundingBox for accuracy, or fallback to nodes
                let bounds;
                if (shape.getBounds) {
                    bounds = shape.getBounds();
                } else if (shape.nodes) {
                    bounds = Geometry.calculateBezierBoundingBox(shape.nodes, shape.closed);
                }

                if (bounds) {
                    const cx = (bounds.minX + bounds.maxX) / 2;
                    const cy = (bounds.minY + bounds.maxY) / 2;
                    const distSq = Geometry.getDistance(candidate, { x: cx, y: cy });

                    if (distSq < worldThresholdSq && distSq < minDistSq) {
                        bestSnap.point = { x: cx, y: cy };
                        bestSnap.type = 'center';
                        bestSnap.sourceShapeId = shape.id;
                        minDistSq = distSq;
                    }
                }
            });
        }

        if (minDistSq === Infinity) {
            bestSnap.type = 'none';
        }

        this.activeSnap = bestSnap.type !== 'none' ? bestSnap : null;
        return bestSnap;
    }
}
