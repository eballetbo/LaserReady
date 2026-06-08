import { Geometry } from '../../../core/math/geometry';
import { PathNode } from '../models/node';
import { IShape } from '../types';

type DragTargetType = 'ANCHOR' | 'HANDLE_IN' | 'HANDLE_OUT' | 'SEGMENT';

interface HitTestConfig {
    anchorSize: number;
    handleRadius: number;
}

export class NodeHitTester {
    constructor(
        private config: HitTestConfig,
        private zoom: number,
        private ctx: CanvasRenderingContext2D
    ) { }

    update(zoom: number) {
        this.zoom = zoom;
    }

    findShapeAt(x: number, y: number, shapes: IShape[]): IShape | null {
        for (let i = shapes.length - 1; i >= 0; i--) {
            if (Geometry.isPointInBezierPath(this.ctx, shapes[i], x, y)) {
                return shapes[i];
            }
        }
        return null;
    }

    getHitAnchor(x: number, y: number, shape: IShape): number {
        if (!shape.nodes) return -1;
        const r = (this.config.anchorSize / 2 + 3) / this.zoom;
        const rSq = r * r;
        for (let i = 0; i < shape.nodes.length; i++) {
            const node = shape.nodes[i];
            if (Geometry.getDistance({ x, y }, { x: node.x, y: node.y }) <= rSq) {
                return i;
            }
        }
        return -1;
    }

    getHitHandle(x: number, y: number, node: PathNode): DragTargetType | null {
        const r = (this.config.handleRadius + 2) / this.zoom;
        const rSq = r * r;
        if (Geometry.getDistance({ x, y }, node.cpIn) <= rSq) return 'HANDLE_IN';
        if (Geometry.getDistance({ x, y }, node.cpOut) <= rSq) return 'HANDLE_OUT';
        return null;
    }

    getHitSegment(x: number, y: number, shape: IShape): { index: number; t: number } | null {
        if (!shape.nodes) return null;
        const threshold = 10;
        const toleranceSq = threshold * threshold;

        let bestDistSq = Infinity;
        let bestHit: { index: number; t: number } | null = null;

        for (let i = 0; i < shape.nodes.length; i++) {
            if (i === shape.nodes.length - 1 && !shape.closed) break;

            const nextIndex = (i + 1) % shape.nodes.length;
            const p0 = shape.nodes[i];
            const p3 = shape.nodes[nextIndex];

            const bounds = getSegmentBounds(p0, p3);
            if (!isPointNearBounds(x, y, bounds, threshold)) continue;

            const steps = getStepCount(p0, p3);

            for (let s = 1; s < steps; s++) {
                const t = s / steps;
                const mt = 1 - t;
                const mt2 = mt * mt;
                const mt3 = mt2 * mt;
                const t2 = t * t;
                const t3 = t2 * t;

                const bx = mt3 * p0.x + 3 * mt2 * t * p0.cpOut.x + 3 * mt * t2 * p3.cpIn.x + t3 * p3.x;
                const by = mt3 * p0.y + 3 * mt2 * t * p0.cpOut.y + 3 * mt * t2 * p3.cpIn.y + t3 * p3.y;

                const dx = x - bx;
                const dy = y - by;
                const dSq = dx * dx + dy * dy;

                if (dSq < toleranceSq && dSq < bestDistSq) {
                    bestDistSq = dSq;
                    bestHit = { index: i, t };
                }
            }
        }
        return bestHit;
    }
}

function getSegmentBounds(n1: PathNode, n2: PathNode) {
    const xs = [n1.x, n1.cpOut.x, n2.cpIn.x, n2.x];
    const ys = [n1.y, n1.cpOut.y, n2.cpIn.y, n2.y];
    return {
        minX: Math.min(...xs), minY: Math.min(...ys),
        maxX: Math.max(...xs), maxY: Math.max(...ys)
    };
}

function isPointNearBounds(
    x: number, y: number,
    bounds: { minX: number; minY: number; maxX: number; maxY: number },
    threshold: number
): boolean {
    return x >= bounds.minX - threshold &&
        x <= bounds.maxX + threshold &&
        y >= bounds.minY - threshold &&
        y <= bounds.maxY + threshold;
}

function getStepCount(n1: PathNode, n2: PathNode): number {
    const isLine =
        (Math.abs(n1.cpOut.x - n1.x) < 0.01 && Math.abs(n1.cpOut.y - n1.y) < 0.01) &&
        (Math.abs(n2.cpIn.x - n2.x) < 0.01 && Math.abs(n2.cpIn.y - n2.y) < 0.01);

    if (isLine) return 2;

    const handleDist1 = Math.hypot(n1.cpOut.x - n1.x, n1.cpOut.y - n1.y);
    const handleDist2 = Math.hypot(n2.cpIn.x - n2.x, n2.cpIn.y - n2.y);
    const maxHandleDist = Math.max(handleDist1, handleDist2);
    return Math.max(3, Math.min(20, Math.ceil(maxHandleDist / 10)));
}
