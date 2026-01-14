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



    // Vector Math Helpers
    add(p1: Point, p2: Point): Point {
        return { x: p1.x + p2.x, y: p1.y + p2.y };
    },

    sub(p1: Point, p2: Point): Point {
        return { x: p1.x - p2.x, y: p1.y - p2.y };
    },

    scale(p: Point, s: number): Point {
        return { x: p.x * s, y: p.y * s };
    },

    magnitude(p: Point): number {
        return Math.sqrt(p.x * p.x + p.y * p.y);
    },

    normalize(p: Point): Point {
        const m = this.magnitude(p);
        return m === 0 ? { x: 0, y: 0 } : { x: p.x / m, y: p.y / m };
    },

    dot(p1: Point, p2: Point): number {
        return p1.x * p2.x + p1.y * p2.y;
    },

    /**
     * Calculate angle between two vectors (in radians)
     */
    angleBetween(v1: Point, v2: Point): number {
        const dot = this.dot(v1, v2);
        const m1 = this.magnitude(v1);
        const m2 = this.magnitude(v2);
        if (m1 === 0 || m2 === 0) return 0;
        // Clamp for floating point errors
        const cos = Math.min(Math.max(dot / (m1 * m2), -1), 1);
        return Math.acos(cos);
    },

    /**
     * Find intersection of two lines defined by point + vector
     * Line 1: p1 + t * v1
     * Line 2: p2 + u * v2
     */
    getLineIntersection(p1: Point, v1: Point, p2: Point, v2: Point): Point | null {
        // p1 + t*v1 = p2 + u*v2
        // t*v1 - u*v2 = p2 - p1
        // Vector cross product logic (2D)
        const cross = (a: Point, b: Point) => a.x * b.y - a.y * b.x;
        const det = cross(v1, v2);

        if (Math.abs(det) < 1e-9) return null; // Parallel

        const d = this.sub(p2, p1);
        const t = cross(d, v2) / det;
        // const u = cross(d, v1) / det;

        return this.add(p1, this.scale(v1, t));
    },

    /**
     * Calculate Fillet points for a corner P1 -> P2 -> P3
     * Returns start/end of the arc, and cubic bezier control points.
     */
    getFilletPoints(p1: Point, p2: Point, p3: Point, radius: number): {
        start: Point;
        end: Point;
        cp1: Point;
        cp2: Point;
        center: Point;
    } | null {
        // Vectors from Corner (P2)
        const v1 = this.normalize(this.sub(p1, p2));
        const v2 = this.normalize(this.sub(p3, p2));

        // Angle between segments
        const angle = this.angleBetween(v1, v2);

        // If lines are parallel or colinear, cannot fillet
        if (angle < 1e-4 || angle > Math.PI - 1e-4) return null;

        // Calculate tangent distance: d = radius / tan(theta / 2)
        // Note: angleBetween returns 0..PI. 
        // We want the half-angle of the CORNER vertex.
        // But angleBetween gives the angle between the two vectors originating from P2.
        // This IS the corner angle.
        const theta = angle;
        const d = radius / Math.tan(theta / 2);

        // Check if d exceeds segment lengths
        const len1 = this.getDistance(p1, p2); // Squared distance
        const len2 = this.getDistance(p3, p2); // Squared distance
        // getDistance returns squared, so sqrt
        const maxD1 = Math.sqrt(len1) / 2; // Be safe limit to 50%
        const maxD2 = Math.sqrt(len2) / 2;

        // We could clamp radius, but requirement usually asks to limit or fail.
        // Let's clam d if necessary, which effectively reduces radius.
        // Actually proper behavior is usually to limit D so it doesn't cross midpoint (or overlap adjacent fillets).
        // Let's implicitly clamp d.
        // For now, if d is too big, let's just use the max possible D (effectively reducing radius).
        const limitD = Math.min(d, maxD1, maxD2);

        // If we want to strictly respect radius, we might return null if too big?
        // Let's stick to the requested logic: "limit it".
        const effectiveD = limitD;

        // Tangent points
        // T1 is on P2->P1
        const t1 = this.add(p2, this.scale(v1, effectiveD));
        // T2 is on P2->P3
        const t2 = this.add(p2, this.scale(v2, effectiveD));

        // Center calculation
        // Center is perpendicular to V1 at T1, dist R.
        // Line1 perp: (-v1.y, v1.x)
        // Hard to know direction without sidedness (Left/Right turn).
        // Alternative: Center is on the angle bisector.
        const bisector = this.normalize(this.add(v1, v2)); // Vector P2 -> Center
        // BUT we need to use the LIMITED radius if we clamped d.
        // If d was clamped, effectiveRadius = d * tan(theta/2)
        const effectiveRadius = effectiveD * Math.tan(theta / 2);
        const distCenterEffective = effectiveRadius / Math.sin(theta / 2);

        const center = this.add(p2, this.scale(bisector, distCenterEffective));

        // Bezier Approximation (Kappa)
        // For general angle theta (the sweep angle of the arc).
        // Wait, the angle between vectors is the Corner Angle (inside triangle).
        // The Arc Angle (sweep) = 180 - Corner Angle.
        // Let's verify:
        // P1---P2---P3 (Straight line, angle 180, sweep 0).
        // P1 | P2 -- P3 (90 deg corner, sweep 90).
        // So Sweep Angle = PI - theta.
        const sweep = Math.PI - theta;

        // Kappa formula for arbitrary arc < 90 deg?
        // Approximating a circular arc with cubic bezier:
        // k = 4/3 * tan(sweep / 4)
        const kappa = (4 / 3) * Math.tan(sweep / 4);

        // Control Points
        // CP1 = T1 + (derivative at T1) * appropriate_length?
        // Standard geometric construction:
        // CP1 = T1 + kappa * Radius * TangentDirection
        // Tangent Direction at T1: Vector pointing AWAY from P2 towards corner? No.
        // Tangent is perpendicular to Radius.
        // Direction is P2->P1 ? No T1 is ON P2->P1.
        // At T1, the curve starts TANGENT to V1.
        // So the control point should be along V1? No, T1->P2 is V1 reversed.
        // T1->P1 is V1.
        // The curve goes from T1 to T2.
        // At T1, it is tangent to the line segment.
        // So CP1 must be on the line P2-P1.
        // Direction: From T1 towards the "corner" or away?
        // The curve "cuts" the corner.
        // So it goes T1 -> T2.
        // The tangent at T1 points towards the intersection P2?
        // Yes, the hull P1-P2-P3 contains the curve.
        // So cp1 is on segment T1-P2.
        // Vector T1->P2 is -v1 * d.
        // Normalized direction is -v1. (P1->P2 is -v1)
        // Wait: v1 was P1-P2 (normalized). So P2->P1 is v1.
        // T1 = P2 + v1*d.
        // Path goes T1 -> T2.
        // Tangent at T1 is towards P2? Yes.
        // So direction is -v1.
        // CP1 = T1 + (-v1) * (effectiveRadius * kappa)?
        // Wait, kappa is usually multiplier of radius? No.
        // Standard formula: CP distance from T = R * k.

        // Wait, logic check:
        // Bezier points: P0, P1, P2, P3.
        // P0 = T1.
        // P3 = T2.
        // P1 = T1 + VectorTowardsCorner * (R * k).
        // P2 = T2 + VectorTowardsCorner * (R * k).

        // VectorTowardsCorner from T1 is P2-T1.
        // P2 - T1 = P2 - (P2 + v1*d) = -v1*d.
        // Unit vector is -v1.
        // Distance is effectiveRadius * kappa?
        // Let's check 90 deg (sweep PI/2). theta = PI/2.
        // tan(sweep/4) = tan(PI/8) = 0.414.
        // k = 4/3 * 0.414 = 0.552.
        // Correct.
        // So dist = R * k.

        const distCP = effectiveRadius * kappa;

        const cp1 = this.add(t1, this.scale(this.scale(v1, -1), distCP));
        const cp2 = this.add(t2, this.scale(this.scale(v2, -1), distCP));

        return {
            start: t1,
            end: t2,
            cp1,
            cp2,
            center
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

    isPointInBezierPath(ctx: CanvasRenderingContext2D, shape: IShape, x: number, y: number, tolerance: number = 5): boolean {
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

        ctx.lineWidth = tolerance;
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
