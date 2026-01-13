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

        // Calculate world threshold based on current zoom
        const worldThreshold = this.settings.threshold / this.controller.zoom;
        const worldThresholdSq = worldThreshold * worldThreshold;

        let bestObjectSnap: SnapResult | null = null;
        let objectMinDistSq = Infinity;

        // 1. Object Snap (High Priority)
        if (this.settings.objects) {
            const shapes = this.controller.shapes;

            shapes.forEach(shape => {
                if (excludeShapeIds.includes(shape.id)) return;
                if ((shape as any).visible === false) return;

                // A. Vertices (Endpoints)
                if (shape.nodes) {
                    shape.nodes.forEach(node => {
                        const distSq = Geometry.getDistance(candidate, node);
                        if (distSq < worldThresholdSq && distSq < objectMinDistSq) {
                            bestObjectSnap = {
                                point: { x: node.x, y: node.y },
                                type: 'endpoint',
                                sourceShapeId: shape.id
                            };
                            objectMinDistSq = distSq;
                        }
                    });

                    // B. Midpoints
                    for (let i = 0; i < shape.nodes.length; i++) {
                        if (!shape.closed && i === shape.nodes.length - 1) continue;

                        const n1 = shape.nodes[i];
                        const n2 = shape.nodes[(i + 1) % shape.nodes.length];

                        let midX: number, midY: number;

                        // Check if it's a bezier curve
                        const isCurve = (n1.cpOut && (n1.cpOut.x !== n1.x || n1.cpOut.y !== n1.y)) ||
                            (n2.cpIn && (n2.cpIn.x !== n2.x || n2.cpIn.y !== n2.y));

                        if (isCurve) {
                            const mt3 = 0.125;
                            const t3 = 0.125;
                            const mtt = 0.375;
                            midX = mt3 * n1.x + mtt * n1.cpOut.x + mtt * n2.cpIn.x + t3 * n2.x;
                            midY = mt3 * n1.y + mtt * n1.cpOut.y + mtt * n2.cpIn.y + t3 * n2.y;
                        } else {
                            midX = (n1.x + n2.x) / 2;
                            midY = (n1.y + n2.y) / 2;
                        }

                        const distSq = Geometry.getDistance(candidate, { x: midX, y: midY });
                        if (distSq < worldThresholdSq && distSq < objectMinDistSq) {
                            bestObjectSnap = {
                                point: { x: midX, y: midY },
                                type: 'midpoint',
                                sourceShapeId: shape.id
                            };
                            objectMinDistSq = distSq;
                        }
                    }
                }

                // C. Center
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

                    if (distSq < worldThresholdSq && distSq < objectMinDistSq) {
                        bestObjectSnap = {
                            point: { x: cx, y: cy },
                            sourceShapeId: shape.id,
                            type: 'center'
                        };
                        objectMinDistSq = distSq;
                    }
                }
            });
        }

        // If Object Snap found, return it immediately (Strict Priority)
        // This ensures endpoints/midpoints always win over grid
        if (bestObjectSnap) {
            this.activeSnap = bestObjectSnap;
            return bestObjectSnap;
        }

        // 2. Grid Snap (Low Priority)
        if (this.settings.grid) {
            const spacing = this.controller.config.gridSpacing || DEFAULT_GRID_SPACING;
            const snapX = Math.round(candidate.x / spacing) * spacing;
            const snapY = Math.round(candidate.y / spacing) * spacing;

            const distSq = Geometry.getDistance(candidate, { x: snapX, y: snapY });

            if (distSq < worldThresholdSq) {
                const gridSnap: SnapResult = {
                    point: { x: snapX, y: snapY },
                    type: 'grid'
                };
                this.activeSnap = gridSnap;
                return gridSnap;
            }
        }

        // No snap
        this.activeSnap = null;
        return { point: candidate, type: 'none' };
    }
}
