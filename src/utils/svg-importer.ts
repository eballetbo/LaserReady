import paper from 'paper';
import { PathShape } from '../features/shapes/path-shape';
import { PathNode } from '../features/shapes/path-node';

// Initialize a headless PaperScope for SVG importing
const scope = new paper.PaperScope();
scope.setup(new paper.Size(1000, 1000));

export const SVGImporter = {
    /**
     * Converts a paper.Path (or CompoundPath) to an array of PathShapes
     */
    fromPaperItem(item: paper.Item): PathShape[] {
        const shapes: PathShape[] = [];

        const processPath = (path: paper.Path) => {
            if (!path.segments) return; // Guard against unexpected objects
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

            shapes.push(new PathShape(nodes, path.closed, 'imported-layer', null, style)); // Added default layerId, null type, and style as params
        };

        const traverse = (node: paper.Item) => {
            if (node instanceof scope.CompoundPath) {
                // CompoundPath children usually share the style of the parent
                // Need to cast to CompoundPath to access children typed correctly or use generic Item children
                const compound = node as paper.CompoundPath;
                const parentStyle = {
                    strokeColor: compound.strokeColor,
                    strokeWidth: compound.strokeWidth,
                    fillColor: compound.fillColor
                };

                if (compound.children) {
                    compound.children.forEach(child => {
                        const pathChild = child as paper.Path; // Check strictly if needed but CompoundPath children are usually paths
                        // Apply parent style if child lacks it
                        if (!pathChild.strokeColor && parentStyle.strokeColor) pathChild.strokeColor = parentStyle.strokeColor;
                        if (!pathChild.strokeWidth && parentStyle.strokeWidth) pathChild.strokeWidth = parentStyle.strokeWidth;
                        if (!pathChild.fillColor && parentStyle.fillColor) pathChild.fillColor = parentStyle.fillColor;
                        processPath(pathChild);
                    });
                }
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
     */
    importSVG(svgString: string): PathShape[] {
        // Create a temporary item to hold the imported SVG
        const item = scope.project.importSVG(svgString, {
            expandShapes: true, // Convert rects, circles, etc. to paths
            insert: false,      // Don't insert into the active layer
            applyMatrix: true   // Apply transforms to geometry
        }) as paper.Item; // Cast result

        if (!item) return [];

        const shapes = this.fromPaperItem(item);

        // Cleanup
        item.remove();

        return shapes;
    }
};
