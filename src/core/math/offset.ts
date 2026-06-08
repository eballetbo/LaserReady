import { PathShape } from '../../features/shapes/models/path';
import { scope, toPaperPath, fromPaperItem } from './paper-scope';

export type JoinStyle = 'round' | 'miter' | 'bevel';

const ZERO = new scope.Point(0, 0);
const DEFAULT_MITER_LIMIT = 4;

function lineLineIntersect(
    p1: paper.Point, d1: paper.Point,
    p2: paper.Point, d2: paper.Point
): paper.Point | null {
    const cross = d1.x * d2.y - d1.y * d2.x;
    if (Math.abs(cross) < 1e-10) return null;
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const t = (dx * d2.y - dy * d2.x) / cross;
    return new scope.Point(p1.x + t * d1.x, p1.y + t * d1.y);
}

function createBevelPath(
    vertex: paper.Point,
    n1: paper.Point,
    n2: paper.Point
): paper.Path {
    return new scope.Path({
        segments: [vertex.add(n1), vertex.add(n2), vertex.subtract(n2), vertex.subtract(n1)],
        closed: true
    });
}

function createJoinGeometry(
    vertex: paper.Point,
    prevDir: paper.Point | null,
    nextDir: paper.Point | null,
    radius: number,
    join: JoinStyle,
    miterLimit: number
): paper.Item {
    if (!prevDir || !nextDir) {
        return new scope.Path.Circle(vertex, radius);
    }

    const n1 = prevDir.normalize().multiply(radius).rotate(90, ZERO);
    const n2 = nextDir.normalize().multiply(radius).rotate(90, ZERO);

    switch (join) {
        case 'round':
            return new scope.Path.Circle(vertex, radius);

        case 'bevel':
            return createBevelPath(vertex, n1, n2);

        case 'miter': {
            const d1 = prevDir.normalize();
            const d2 = nextDir.normalize();

            const outerMiter = lineLineIntersect(vertex.add(n1), d1, vertex.add(n2), d2);
            const innerMiter = lineLineIntersect(vertex.subtract(n1), d1, vertex.subtract(n2), d2);

            if (!outerMiter || !innerMiter) {
                return createBevelPath(vertex, n1, n2);
            }

            const miterLen = outerMiter.subtract(vertex).length;
            if (miterLimit > 0 && miterLen > miterLimit * radius) {
                return createBevelPath(vertex, n1, n2);
            }

            return new scope.Path({
                segments: [
                    vertex.add(n1), outerMiter, vertex.add(n2),
                    vertex.subtract(n2), innerMiter, vertex.subtract(n1)
                ],
                closed: true
            });
        }
    }
}

/**
 * Offsets a shape by a given distance.
 *
 * @param shape The input PathShape
 * @param distance The offset distance (positive for outward, negative for inward)
 * @param options Join style and miter limit
 * @returns Array of resulting PathShapes
 */
export function offsetShape(
    shape: PathShape,
    distance: number,
    options: { join?: JoinStyle, limit?: number } = {}
): PathShape[] {
    if (Math.abs(distance) < 1e-5) {
        return [shape.clone()];
    }

    const join = options.join ?? 'round';
    const miterLimit = options.limit ?? DEFAULT_MITER_LIMIT;

    const path = toPaperPath(shape);
    const radius = Math.abs(distance);

    const flatOptions = { insert: false };
    const flat = path.clone(flatOptions) as paper.Path;
    flat.flatten(0.25);

    const strokeItems: paper.Item[] = [];

    const segments = flat.segments;
    const len = segments.length;
    const closed = path.closed;
    const loopLimit = closed ? len : len - 1;

    for (let i = 0; i < len; i++) {
        const vertex = segments[i].point;

        let prevDir: paper.Point | null = null;
        let nextDir: paper.Point | null = null;

        if (closed || i > 0) {
            const prevIdx = (i - 1 + len) % len;
            const diff = vertex.subtract(segments[prevIdx].point);
            if (diff.length >= 1e-4) prevDir = diff;
        }
        if (closed || i < len - 1) {
            const nextIdx = (i + 1) % len;
            const diff = segments[nextIdx].point.subtract(vertex);
            if (diff.length >= 1e-4) nextDir = diff;
        }

        strokeItems.push(createJoinGeometry(vertex, prevDir, nextDir, radius, join, miterLimit));

        if (i < loopLimit) {
            const nextIdx = (i + 1) % len;
            const p2 = segments[nextIdx].point;

            const vec = p2.subtract(vertex);
            if (vec.length < 1e-4) continue;

            const normal = vec.normalize().multiply(radius).rotate(90, ZERO);

            const c1 = vertex.add(normal);
            const c2 = vertex.subtract(normal);
            const c3 = p2.subtract(normal);
            const c4 = p2.add(normal);

            const rect = new scope.Path({
                segments: [c1, c2, c3, c4],
                closed: true
            });
            strokeItems.push(rect);
        }
    }

    if (strokeItems.length === 0) {
        path.remove();
        return [];
    }

    // 3. Unite all stroke items to form a single "Donut" (Stroke)
    // We unite sequentially.
    let stroke: paper.PathItem = strokeItems[0] as paper.PathItem;
    for (let i = 1; i < strokeItems.length; i++) {
        const united = stroke.unite(strokeItems[i] as paper.PathItem, { insert: false });
        // remove old stroke if it was an intermediate result (not an original item)
        // If i=1, stroke is strokeItems[0] (should keep or remove? We created it, we should remove if not needed)
        // Wait, united is a NEW item. 
        // We can safely remove the inputs to unite if we don't need them.

        // Remove 'stroke' if it's not the first original item (or even if it is, since we have new result)
        // Actually, best practice:
        // result = op(a, b). a and b exist.
        // We want to discard a and b.
        if (i === 1) strokeItems[0].remove(); // Remove first item
        strokeItems[i].remove(); // Remove current item
        // intermediate stroke
        if (i > 1) stroke.remove();

        stroke = united;
    }

    // Ensure last result is not removed

    // 4. Boolean with original path
    let result: paper.PathItem;

    if (distance > 0) {
        result = stroke.unite(path as paper.PathItem, { insert: false });
    } else {
        result = (path as paper.PathItem).subtract(stroke, { insert: false });
    }

    // Convert back
    const finalShapes = fromPaperItem(result);

    // Cleanup
    path.remove();
    flat.remove();
    stroke.remove();
    if (result !== stroke) result.remove();

    return finalShapes;
}

/**
 * Offsets multiple shapes, treating them as a single unioned geometry.
 * Useful for offsetting Groups or multi-selections.
 */
export function offsetShapes(
    shapes: PathShape[],
    distance: number,
    options: { join?: JoinStyle, limit?: number } = {}
): PathShape[] {
    if (!shapes || shapes.length === 0) return [];
    if (shapes.length === 1) return offsetShape(shapes[0], distance, options);

    // 1. Convert all to Paper items
    const items = shapes.map(s => toPaperPath(s));

    // 2. Unite them all into one geometry
    let hull: paper.PathItem = items[0] as paper.PathItem;
    for (let i = 1; i < items.length; i++) {
        const united = hull.unite(items[i] as paper.PathItem, { insert: false });
        if (i > 1) hull.remove(); // Remove intermediate
        hull = united;
    }

    // Remove individual items from scope (except hull if it was one of them, but hull is new from unite)
    items.forEach((item, i) => {
        if (i === 0 && hull === item) return; // Should not happen with unite logic usually
        item.remove();
    });

    // 3. Offset the hull
    // We need to access the internal logic of offsetShape but for a paper Item?
    // offsetShape expects PathShape. 
    // We can convert hull back to PathShape, then call offsetShape.
    const hullShapes = fromPaperItem(hull);
    hull.remove();

    // It's possible hull became multiple shapes (disjoint).
    // offsetShape takes *one* Shape.
    // So we map map.

    const results: PathShape[] = [];
    hullShapes.forEach(s => {
        results.push(...offsetShape(s, distance, options));
    });

    return results;
}
