import paper from 'paper';
import { PathShape } from '../model/path-shape.js';
import { PathNode } from '../model/path-node.js';


// Initialize a headless PaperScope for SVG importing
const scope = new paper.PaperScope();
scope.setup(new paper.Size(1000, 1000));

export const SVGImporter = {
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

            // Extract styles
            const style = {
                strokeColor: path.strokeColor ? path.strokeColor.toCSS(true) : undefined,
                strokeWidth: path.strokeWidth,
                fillColor: path.fillColor ? path.fillColor.toCSS(true) : undefined
            };

            shapes.push(new PathShape(nodes, path.closed, style));
        };

        const traverse = (node) => {
            if (node instanceof scope.CompoundPath) {
                // CompoundPath children usually share the style of the parent
                const parentStyle = {
                    strokeColor: node.strokeColor,
                    strokeWidth: node.strokeWidth,
                    fillColor: node.fillColor
                };

                node.children.forEach(child => {
                    // Apply parent style if child lacks it
                    if (!child.strokeColor && parentStyle.strokeColor) child.strokeColor = parentStyle.strokeColor;
                    if (!child.strokeWidth && parentStyle.strokeWidth) child.strokeWidth = parentStyle.strokeWidth;
                    if (!child.fillColor && parentStyle.fillColor) child.fillColor = parentStyle.fillColor;
                    processPath(child);
                });
            } else if (node instanceof scope.Path) {
                processPath(node);
            } else if (node.children) {
                node.children.forEach(child => traverse(child));
            }
        };

        traverse(item);

        return shapes;
    },

    /**
     * Imports an SVG string and returns an array of PathShapes.
     * @param {string} svgString 
     * @returns {Array<PathShape>}
     */
    importSVG(svgString) {
        // Create a temporary item to hold the imported SVG
        const item = scope.project.importSVG(svgString, {
            expandShapes: true, // Convert rects, circles, etc. to paths
            insert: false,      // Don't insert into the active layer
            applyMatrix: true   // Apply transforms to geometry
        });

        if (!item) return [];

        const shapes = this.fromPaperItem(item);

        // Cleanup
        item.remove();

        return shapes;
    }
};
