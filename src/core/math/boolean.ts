import paper from 'paper';
import { PathShape } from '../../features/shapes/models/path';
import { PathNode } from '../../features/shapes/models/node';

// Initialize a headless PaperScope for math operations
const scope = new paper.PaperScope();
scope.setup(new paper.Size(1000, 1000)); // Size doesn't matter much for pure math

type BooleanOperation = 'unite' | 'subtract' | 'intersect' | 'exclude';

export const BooleanOperations = {
    /**
     * Returns the headless PaperScope used for boolean operations.
     */
    getPaperScope(): typeof paper {
        return scope;
    },

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
     * @returns {Array<PathShape> | null} Resulting shapes or null if failed
     */
    perform(shapes: PathShape[], operation: BooleanOperation): PathShape[] | null {
        if (!shapes || shapes.length < 2) return shapes;

        // Convert all to paper paths
        let items: paper.Path[] = [];

        try {
            items = shapes.map(s => this.toPaperPath(s));

            // Perform operation sequentially
            let result: paper.PathItem = items[0];

            for (let i = 1; i < items.length; i++) {
                const next = items[i];
                switch (operation) {
                    case 'unite':
                        result = result.unite(next);
                        break;
                    case 'subtract':
                        result = result.subtract(next);
                        break;
                    case 'intersect':
                        result = result.intersect(next);
                        break;
                    case 'exclude':
                        result = result.exclude(next);
                        break;
                }
            }

            // Convert result back
            const resultShapes = this.fromPaperItem(result);

            // Remove final result from scope if it's a new item (operations usually create new items)
            if (result !== items[0]) result.remove();

            return resultShapes;
        } catch (error) {
            console.error(`Boolean operation '${operation}' failed:`, error);
            return null;
        } finally {
            // Cleanup paper items to avoid memory leaks
            items.forEach(i => i.remove());
        }
    },

    unite(shapes: PathShape[]): PathShape[] | null { return this.perform(shapes, 'unite'); },
    subtract(shapes: PathShape[]): PathShape[] | null { return this.perform(shapes, 'subtract'); },
    intersect(shapes: PathShape[]): PathShape[] | null { return this.perform(shapes, 'intersect'); },
    exclude(shapes: PathShape[]): PathShape[] | null { return this.perform(shapes, 'exclude'); }
};
