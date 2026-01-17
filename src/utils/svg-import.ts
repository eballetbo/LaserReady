import paper from 'paper';
import { PathShape } from '../features/shapes/models/path';
import { PathNode } from '../features/shapes/models/node';

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

            shapes.push(new PathShape(nodes, path.closed, 'imported-layer', undefined, style)); // Added default layerId, null type, and style as params
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

import { Geometry } from '../core/math/geometry';
import { IShape } from '../features/shapes/types';

export interface SVGImportOptions {
    /** Optional position to center the imported shapes */
    position?: { x: number; y: number } | null;
    /** Layer ID to assign to all imported shapes */
    layerId?: string;
}

/**
 * Extended SVGImporter with high-level import functionality.
 * Adds positioning and layer assignment on top of basic SVG parsing.
 */
export const SVGImportService = {
    /**
     * Imports an SVG string with optional positioning and layer assignment.
     * 
     * @param svgString - The SVG content as a string
     * @param options - Import options (position, layerId)
     * @returns Array of IShape objects ready to be added to the store
     * @throws Error if SVG parsing fails or no shapes found
     */
    import(svgString: string, options: SVGImportOptions = {}): IShape[] {
        const { position = null, layerId } = options;
        
        // Parse SVG using basic importer
        const shapes = SVGImporter.importSVG(svgString);
        
        if (!shapes || shapes.length === 0) {
            throw new Error('No valid shapes found in SVG');
        }
        
        // Position shapes if a target position is provided
        if (position) {
            this.positionShapes(shapes, position);
        }
        
        // Assign layer ID if provided
        if (layerId) {
            shapes.forEach(shape => shape.layerId = layerId);
        }
        
        return shapes;
    },
    
    /**
     * Positions shapes by translating them so their combined center
     * is at the specified position.
     */
    positionShapes(shapes: IShape[], targetPosition: { x: number; y: number }): void {
        const bounds = Geometry.getCombinedBounds(shapes);
        
        if (!bounds || !bounds.width || !bounds.height) {
            return;
        }
        
        // Calculate current center
        const centerX = bounds.minX + bounds.width / 2;
        const centerY = bounds.minY + bounds.height / 2;
        
        // Calculate translation delta
        const dx = targetPosition.x - centerX;
        const dy = targetPosition.y - centerY;
        
        // Translate all shapes
        shapes.forEach(shape => {
            if (shape.nodes) {
                shape.nodes.forEach(node => {
                    node.x += dx;
                    node.y += dy;
                    node.cpIn.x += dx;
                    node.cpIn.y += dy;
                    node.cpOut.x += dx;
                    node.cpOut.y += dy;
                });
            }
        });
    }
};
