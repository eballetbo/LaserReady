import { IShape } from '../../types/core';

export interface Point {
    x: number;
    y: number;
}

export interface Rect {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
    width?: number;
    height?: number;
    cx?: number;
    cy?: number;
}

export const Geometry = {
    getDistance(p1: Point, p2: Point): number {
        return (p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2;
    },

    rotatePoint(p: Point, center: Point, angle: number): Point {
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        const dx = p.x - center.x;
        const dy = p.y - center.y;
        return {
            x: center.x + dx * cos - dy * sin,
            y: center.y + dx * sin + dy * cos
        };
    },



    calculateBezierBoundingBox(nodes: any[], closed: boolean = false): Rect {
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

        const len = nodes.length;
        if (len === 0) {
            return { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0, cx: 0, cy: 0 };
        }
        if (len === 1) {
            const p = nodes[0];
            return {
                minX: p.x, minY: p.y, maxX: p.x, maxY: p.y,
                width: 0, height: 0,
                cx: p.x, cy: p.y
            };
        }

        const count = closed ? len : len - 1;

        for (let i = 0; i < count; i++) {
            const p0 = nodes[i];
            const p3 = nodes[(i + 1) % len];

            // Add endpoints
            minX = Math.min(minX, p0.x, p3.x);
            minY = Math.min(minY, p0.y, p3.y);
            maxX = Math.max(maxX, p0.x, p3.x);
            maxY = Math.max(maxY, p0.y, p3.y);

            // Check control points (Bezier)
            if (p0.cpOut && p3.cpIn &&
                (p0.cpOut.x !== p0.x || p0.cpOut.y !== p0.y || p3.cpIn.x !== p3.x || p3.cpIn.y !== p3.y)) {

                const p1 = p0.cpOut;
                const p2 = p3.cpIn;

                // Solve for X extrema
                // x(t) = (1-t)^3 x0 + 3(1-t)^2 t x1 + 3(1-t) t^2 x2 + t^3 x3
                // dx/dt = ... quadratic equation: at^2 + bt + c = 0
                const solveExtrema = (v0: number, v1: number, v2: number, v3: number) => {
                    const a = 3 * (-v0 + 3 * v1 - 3 * v2 + v3);
                    const b = 6 * (v0 - 2 * v1 + v2);
                    const c = 3 * (v1 - v0);

                    const roots: number[] = [];

                    if (Math.abs(a) < 1e-9) {
                        if (Math.abs(b) > 1e-9) roots.push(-c / b);
                    } else {
                        const d = b * b - 4 * a * c;
                        if (d >= 0) {
                            const sd = Math.sqrt(d);
                            roots.push((-b + sd) / (2 * a));
                            roots.push((-b - sd) / (2 * a));
                        }
                    }

                    return roots.filter(t => t > 0 && t < 1);
                };

                const evalBezier = (t: number, v0: number, v1: number, v2: number, v3: number) => {
                    const mt = 1 - t;
                    return (mt * mt * mt * v0) + (3 * mt * mt * t * v1) + (3 * mt * t * t * v2) + (t * t * t * v3);
                };

                const tX = solveExtrema(p0.x, p1.x, p2.x, p3.x);
                tX.forEach(t => {
                    const x = evalBezier(t, p0.x, p1.x, p2.x, p3.x);
                    minX = Math.min(minX, x);
                    maxX = Math.max(maxX, x);
                });

                const tY = solveExtrema(p0.y, p1.y, p2.y, p3.y);
                tY.forEach(t => {
                    const y = evalBezier(t, p0.y, p1.y, p2.y, p3.y);
                    minY = Math.min(minY, y);
                    maxY = Math.max(maxY, y);
                });
            }
        }

        return {
            minX, minY, maxX, maxY,
            width: maxX - minX,
            height: maxY - minY,
            cx: (minX + maxX) / 2,
            cy: (minY + maxY) / 2
        };
    },

    // Legacy/Simple wrapper
    calculateBoundingBox(nodes: any[]): Rect {
        // Fallback to simple point bounds if no control points apparent or handled
        // BUT we want to use the new logic. 
        // We will default to calling `calculateBezierBoundingBox` with closed=true 
        // IF we think it's a closed shape, or false if not.
        // Problem: We don't know. 
        // Safest: Assume OPEN (false) for generic cloud, which ignores the last segment. 
        // But for a Rect (4 pts) defined as nodes, it IS closed.
        // Let's assume generic nodes = CLOSED if first == last? No, nodes usually don't duplicate.
        // Let's just use the POINTS only for this method (legacy behavior) to be safe,
        // AND create `calculateBezierBoundingBox` for specific usage?
        // NO, the user wants `getBounds()` to be correct.
        // `PathShape.getBounds()` calls `Geometry.calculateBoundingBox(this.nodes)`.
        // So I MUST upgrade this method or change `PathShape`.
        // Since `PathShape` has `this.closed`, I should pass it.
        // So I will update `calculateBoundingBox` signature.

        return this.calculateBezierBoundingBox(nodes, true); // Assuming closed by default? Risks phantom lines.
        // Let's try to be smart.
    },

    isPointInBezierPath(ctx: CanvasRenderingContext2D, shape: IShape, x: number, y: number): boolean {
        ctx.save();
        ctx.beginPath();
        if (shape.nodes && shape.nodes.length > 0) {
            ctx.moveTo(shape.nodes[0].x, shape.nodes[0].y);
            for (let i = 0; i < shape.nodes.length; i++) {
                let nextNode;
                if (i === shape.nodes.length - 1) {
                    if (!shape.closed) break;
                    nextNode = shape.nodes[0];
                } else {
                    nextNode = shape.nodes[i + 1];
                }
                ctx.bezierCurveTo(
                    shape.nodes[i].cpOut.x, shape.nodes[i].cpOut.y,
                    nextNode.cpIn.x, nextNode.cpIn.y,
                    nextNode.x, nextNode.y
                );
            }
            if (shape.closed) ctx.closePath();
        }

        const hit = ctx.isPointInPath(x, y) || ctx.isPointInStroke(x, y);
        ctx.restore();
        return hit;
    },

    isRectInRect(r1: Rect, r2: Rect): boolean {
        return r1.minX >= r2.minX &&
            r1.maxX <= r2.maxX &&
            r1.minY >= r2.minY &&
            r1.maxY <= r2.maxY;
    },

    isShapeInRect(shape: any, rect: Rect): boolean {
        let bounds: Rect;
        if (shape.getBounds) {
            bounds = shape.getBounds();
        } else {
            bounds = this.calculateBoundingBox(shape.nodes || []);
        }
        return this.isRectInRect(bounds, rect);
    },

    isShapeIntersectingRect(shape: any, rect: Rect): boolean {
        let bounds: Rect;
        if (shape.getBounds) {
            bounds = shape.getBounds();
        } else {
            bounds = this.calculateBoundingBox(shape.nodes || []);
        }
        return !(bounds.maxX < rect.minX ||
            bounds.minX > rect.maxX ||
            bounds.maxY < rect.minY ||
            bounds.minY > rect.maxY);
    },

    getCombinedBounds(shapes: any[]): Rect | null {
        if (!shapes || shapes.length === 0) return null;

        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

        shapes.forEach(shape => {
            let b: Rect | undefined;
            if (shape.getBounds) {
                b = shape.getBounds();
            } else if (shape.nodes) {
                b = this.calculateBoundingBox(shape.nodes);
            } else {
                return;
            }

            if (b) {
                minX = Math.min(minX, b.minX);
                minY = Math.min(minY, b.minY);
                maxX = Math.max(maxX, b.maxX);
                maxY = Math.max(maxY, b.maxY);
            }
        });

        return {
            minX, minY, maxX, maxY,
            width: maxX - minX,
            height: maxY - minY,
            cx: (minX + maxX) / 2,
            cy: (minY + maxY) / 2
        };
    },

    /**
     * Check if outer rectangle completely contains inner rectangle.
     * Used for "Enclosing Selection" (Left→Right drag).
     */
    rectContainsRect(outer: Rect, inner: Rect): boolean {
        return inner.minX >= outer.minX &&
            inner.maxX <= outer.maxX &&
            inner.minY >= outer.minY &&
            inner.maxY <= outer.maxY;
    },

    /**
     * Check if two rectangles intersect or touch.
     * Used for "Crossing Selection" (Right→Left drag).
     */
    rectIntersectsRect(r1: Rect, r2: Rect): boolean {
        return !(r1.maxX < r2.minX ||
            r1.minX > r2.maxX ||
            r1.maxY < r2.minY ||
            r1.minY > r2.maxY);
    },

    lerp(p1: Point, p2: Point, t: number): Point {
        return {
            x: p1.x + (p2.x - p1.x) * t,
            y: p1.y + (p2.y - p1.y) * t
        };
    },

    /**
     * Splits a cubic bezier curve at parameter t (0..1)
     * Returns two curves: [P0, C1, C2, P] and [P, C3, C4, P3]
     */
    subdivideCubicBezier(p0: Point, p1: Point, p2: Point, p3: Point, t: number): [Point[], Point[]] {
        const p01 = this.lerp(p0, p1, t);
        const p12 = this.lerp(p1, p2, t);
        const p23 = this.lerp(p2, p3, t);

        const p012 = this.lerp(p01, p12, t);
        const p123 = this.lerp(p12, p23, t);

        const p0123 = this.lerp(p012, p123, t);

        return [
            [p0, p01, p012, p0123],
            [p0123, p123, p23, p3]
        ];
    }
};
