import paper from 'paper';
import { PathShape } from '../model/path-shape';
import { PathNode } from '../model/path-node';

// Initialize a headless PaperScope for math operations
const scope = new paper.PaperScope();
scope.setup(new paper.Size(1000, 1000)); // Size doesn't matter much for pure math

export const BooleanOperations = {
    /**
     * Converts a PathShape to a paper.Path
     * @param {PathShape} shape 
     * @returns {paper.Path}
     */
    toPaperPath(shape) {
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
     * @param {paper.PathItem} item 
     * @returns {Array<PathShape>}
     */
    fromPaperItem(item) {
        const shapes = [];

        const processPath = (path) => {
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
            item.children.forEach(child => processPath(child));
        } else if (item instanceof scope.Path) {
            processPath(item);
        }

        return shapes;
    },

    /**
     * Performs a boolean operation on an array of shapes.
     * @param {Array<PathShape>} shapes 
     * @param {string} operation - 'unite', 'subtract', 'intersect', 'exclude'
     * @returns {Array<PathShape>} Resulting shapes
     */
    perform(shapes, operation) {
        if (!shapes || shapes.length < 2) return shapes;

        // Convert all to paper paths
        const items = shapes.map(s => this.toPaperPath(s));

        // Perform operation sequentially
        let result = items[0];
        for (let i = 1; i < items.length; i++) {
            const next = items[i];
            const temp = result[operation](next);
            // result and next are not needed anymore, but 'temp' is the new result
            // Paper.js boolean ops return a new item
            result = temp;
        }

        // Convert result back
        const resultShapes = this.fromPaperItem(result);

        // Cleanup paper items to avoid memory leaks
        items.forEach(i => i.remove());
        if (result !== items[0]) result.remove(); // Remove final result from scope

        return resultShapes;
    },

    unite(shapes) { return this.perform(shapes, 'unite'); },
    subtract(shapes) { return this.perform(shapes, 'subtract'); },
    intersect(shapes) { return this.perform(shapes, 'intersect'); },
    exclude(shapes) { return this.perform(shapes, 'exclude'); }
};
