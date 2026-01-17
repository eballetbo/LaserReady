import paper from 'paper';
import { PathShape } from '../../features/shapes/models/path';
import { PathNode } from '../../features/shapes/models/node';

// Initialize a headless PaperScope for offset operations
const scope = new paper.PaperScope();
scope.setup(new paper.Size(1000, 1000));

export type JoinStyle = 'round' | 'miter' | 'bevel';

/**
 * Converts a PathShape to a paper.Path
 */
const toPaperPath = (shape: PathShape): paper.Path => {
    const path = new scope.Path({
        closed: shape.closed
    });

    shape.nodes.forEach(node => {
        // Paper.js handles are relative to the point
        const point = new scope.Point(node.x, node.y);
        const handleIn = new scope.Point(node.cpIn.x - node.x, node.cpIn.y - node.y);
        const handleOut = new scope.Point(node.cpOut.x - node.x, node.cpOut.y - node.y);

        path.add(new scope.Segment(point, handleIn, handleOut));
    });

    return path;
};

/**
 * Converts a paper.Path (or CompoundPath) to an array of PathShapes
 */
const fromPaperItem = (item: paper.Item): PathShape[] => {
    const shapes: PathShape[] = [];

    const processPath = (path: paper.Path) => {
        if (!path.segments || path.segments.length === 0) return;

        const nodes = path.segments.map(seg => {
            const x = seg.point.x;
            const y = seg.point.y;
            // Convert relative handles back to absolute control points
            const cpInX = x + seg.handleIn.x;
            const cpInY = y + seg.handleIn.y;
            const cpOutX = x + seg.handleOut.x;
            const cpOutY = y + seg.handleOut.y;

            return new PathNode(x, y, cpInX, cpInY, cpOutX, cpOutY);
        });
        shapes.push(new PathShape(nodes, path.closed));
    };

    if (item instanceof scope.CompoundPath) {
        item.children.forEach(child => processPath(child as paper.Path));
    } else if (item instanceof scope.Path) {
        processPath(item);
    }

    return shapes;
};

/**
 * Offsets a shape by a given distance.
 * 
 * @param shape The input PathShape
 * @param distance The offset distance (positive for outward, negative for inward)
 * @param options Styling options for the offset
 * @returns Array of resulting PathShapes
 */
export function offsetShape(
    shape: PathShape,
    distance: number,
    _options: { join?: JoinStyle, limit?: number } = {}
): PathShape[] {
    if (Math.abs(distance) < 1e-5) {
        return [shape.clone()];
    }

    const path = toPaperPath(shape);
    const radius = Math.abs(distance);

    // Manual Stroke Expansion (since path.expand is missing in this paper.js build)
    // 1. Flatten to convert curves to segments
    // 0.25 error gives decent curve approximation
    const flatOptions = { insert: false };
    const flat = path.clone(flatOptions) as paper.Path;
    flat.flatten(0.25);

    const strokeItems: paper.Item[] = [];

    // 2. Create geometry for stroke
    // We create a "Sausage" for each segment.
    const segments = flat.segments;
    const len = segments.length;
    const closed = path.closed;
    const loopLimit = closed ? len : len - 1;

    for (let i = 0; i < len; i++) {
        const p1 = segments[i].point;

        // Add round join/cap at vertex
        // Use a circle for every vertex (simplest "round" join/cap)
        const circle = new scope.Path.Circle(p1, radius);
        strokeItems.push(circle);

        // Add rect for segment
        if (i < loopLimit) {
            const nextIdx = (i + 1) % len;
            const p2 = segments[nextIdx].point;

            // Calculate normal
            const vec = p2.subtract(p1);
            if (vec.length < 1e-4) continue; // Skip tiny segments

            // Normalize then scale (avoids argument count ambiguity in some TS defs)
            const normal = vec.normalize().multiply(radius).rotate(90, new scope.Point(0, 0));

            // 4 corners of the thick line segment
            const c1 = p1.add(normal);
            const c2 = p1.subtract(normal);
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
    let stroke: paper.Item = strokeItems[0];
    for (let i = 1; i < strokeItems.length; i++) {
        // @ts-ignore
        const united = stroke.unite(strokeItems[i], { insert: false });
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
    let result: paper.Item;

    if (distance > 0) {
        // OUTWARD: Union Stroke + Original
        // @ts-ignore
        result = stroke.unite(path, { insert: false });
    } else {
        // INWARD: Original - Stroke
        // @ts-ignore
        result = path.subtract(stroke, { insert: false });
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
    let hull: paper.Item = items[0];
    for (let i = 1; i < items.length; i++) {
        // @ts-ignore
        const united = hull.unite(items[i], { insert: false });
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
