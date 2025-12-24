import paper from 'paper';
import { PathShape } from '../../features/shapes/path-shape';
import { PathNode } from '../../features/shapes/path-node';

// Initialize a headless PaperScope for math operations
const scope = new paper.PaperScope();
scope.setup(new paper.Size(1000, 1000)); // Size doesn't matter much for pure math

type BooleanOperation = 'unite' | 'subtract' | 'intersect' | 'exclude';

export const BooleanOperations = {
    /**
     * Converts a PathShape to a paper.Path
     */
    toPaperPath(shape: PathShape): paper.Path {
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
    },

    /**
     * Converts a paper.Path (or CompoundPath) to an array of PathShapes
     */
    fromPaperItem(item: paper.Item): PathShape[] {
        const shapes: PathShape[] = [];

        const processPath = (path: paper.Path) => {
            if (!path.segments) return;
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
    },

    /**
     * Performs a boolean operation on an array of shapes.
     * @returns {Array<PathShape>} Resulting shapes
     */
    perform(shapes: PathShape[], operation: BooleanOperation): PathShape[] {
        if (!shapes || shapes.length < 2) return shapes;

        // Convert all to paper paths
        const items = shapes.map(s => this.toPaperPath(s));

        // Perform operation sequentially
        let result: paper.Item = items[0];

        // We need to cast dynamic operation name or use specific methods, but checking string works for now with any/keyof cast if needed
        // but paper.PathItem has these methods.

        for (let i = 1; i < items.length; i++) {
            const next = items[i];

            // paper.js types issue: unite/subtract etc might not be on Item directly but PathItem. Path extends PathItem.
            // result starts as Path (from toPaperPath).
            // Boolean ops return PathItem.

            const opMethod = (result as any)[operation];
            if (typeof opMethod === 'function') {
                const temp = opMethod.call(result, next);
                result = temp;
            }
        }

        // Convert result back
        const resultShapes = this.fromPaperItem(result);

        // Cleanup paper items to avoid memory leaks
        items.forEach(i => i.remove());
        if (result !== items[0]) result.remove(); // Remove final result from scope

        return resultShapes;
    },

    unite(shapes: PathShape[]) { return this.perform(shapes, 'unite'); },
    subtract(shapes: PathShape[]) { return this.perform(shapes, 'subtract'); },
    intersect(shapes: PathShape[]) { return this.perform(shapes, 'intersect'); },
    exclude(shapes: PathShape[]) { return this.perform(shapes, 'exclude'); }
};
