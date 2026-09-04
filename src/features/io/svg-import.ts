import paper from 'paper';
import DOMPurify from 'dompurify';
import { PathShape } from '../../features/shapes/models/path';
import { PathNode } from '../../features/shapes/models/node';

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
            if (!path.segments || path.segments.length === 0) return;
            const nodes = path.segments.map(seg => {
                const x = seg.point.x;
                const y = seg.point.y;
                const cpInX = x + seg.handleIn.x;
                const cpInY = y + seg.handleIn.y;
                const cpOutX = x + seg.handleOut.x;
                const cpOutY = y + seg.handleOut.y;

                return new PathNode(x, y, cpInX, cpInY, cpOutX, cpOutY);
            });

            const strokeColor = path.strokeColor ? path.strokeColor.toCSS(true) : undefined;
            const strokeWidth = path.strokeWidth || undefined;
            const fillColor = path.fillColor ? path.fillColor.toCSS(true) : undefined;
            const dashArray = path.dashArray && path.dashArray.length > 0 ? [...path.dashArray] : undefined;
            const opacity = (path.opacity !== undefined && path.opacity < 1) ? path.opacity : undefined;

            const shape = new PathShape(nodes, path.closed, 'imported-layer', 'path', {}, undefined, strokeColor, strokeWidth, fillColor);
            if (dashArray) shape.dashArray = dashArray;
            if (opacity !== undefined) shape.opacity = opacity;
            shapes.push(shape);
        };

        const traverse = (node: paper.Item) => {
            try {
                if (node instanceof scope.CompoundPath) {
                    const compound = node as paper.CompoundPath;
                    const parentStyle = {
                        strokeColor: compound.strokeColor,
                        strokeWidth: compound.strokeWidth,
                        fillColor: compound.fillColor,
                        dashArray: compound.dashArray
                    };

                    if (compound.children) {
                        compound.children.forEach(child => {
                            const pathChild = child as paper.Path;
                            if (!pathChild.strokeColor && parentStyle.strokeColor) pathChild.strokeColor = parentStyle.strokeColor;
                            if (!pathChild.strokeWidth && parentStyle.strokeWidth) pathChild.strokeWidth = parentStyle.strokeWidth;
                            if (!pathChild.fillColor && parentStyle.fillColor) pathChild.fillColor = parentStyle.fillColor;
                            if ((!pathChild.dashArray || pathChild.dashArray.length === 0) && parentStyle.dashArray) {
                                pathChild.dashArray = parentStyle.dashArray;
                            }
                            processPath(pathChild);
                        });
                    }
                } else if (node instanceof scope.Path) {
                    processPath(node);
                } else if (node.children) {
                    node.children.forEach(child => traverse(child));
                }
            } catch (e) {
                console.warn('SVG import: skipping unprocessable element', e);
            }
        };

        traverse(item);

        return shapes;
    },

    /**
     * Imports an SVG string and returns an array of PathShapes.
     */
    importSVG(svgString: string): PathShape[] {
        const sanitized = DOMPurify.sanitize(svgString, {
            USE_PROFILES: { svg: true, svgFilters: true },
            ADD_TAGS: ['use'],
            FORBID_TAGS: ['script', 'foreignObject'],
            FORBID_ATTR: ['onload', 'onerror', 'onclick', 'onmouseover']
        });

        const item = scope.project.importSVG(sanitized, {
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

import { Geometry } from '../../core/math/geometry';
import { IShape } from '../../features/shapes/types';
import { SVGAttributeParser } from './svg-parser';

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

        // Parse attributes to determine physical scale
        const attributes = SVGAttributeParser.parseRootAttributes(svgString);

        // Parse SVG using basic importer
        const shapes = SVGImporter.importSVG(svgString);

        if (!shapes || shapes.length === 0) {
            throw new Error('No valid shapes found in SVG');
        }

        // Apply scaling if physical dimensions differ from imported dimensions
        if (attributes && attributes.widthPx) {
            // Calculate effective bounds of the raw import
            const bounds = Geometry.getCombinedBounds(shapes);
            const importedWidth = bounds ? bounds.width : 0;

            let scaleFactor = 1;
            let shouldScale = false;

            if (importedWidth > 0 && Math.abs(importedWidth - attributes.widthPx) > 0.1) {
                if (attributes.viewBox) {
                    // If viewBox exists, trust the ratio: Physical / Imported
                    // (Assuming imported width initially matches viewBox width in user units)
                    scaleFactor = attributes.widthPx / importedWidth;
                    shouldScale = true;
                } else {
                    // No viewBox, trust physical width overrides
                    scaleFactor = attributes.widthPx / importedWidth;
                    shouldScale = true;
                }
            }

            if (shouldScale) {
                shapes.forEach(shape => {
                    if (shape.nodes) {
                        shape.nodes.forEach(node => {
                            node.x *= scaleFactor;
                            node.y *= scaleFactor;
                            node.cpIn.x *= scaleFactor;
                            node.cpIn.y *= scaleFactor;
                            node.cpOut.x *= scaleFactor;
                            node.cpOut.y *= scaleFactor;
                        });
                    }

                    // Scale stroke width proportionally with the shape geometry
                    if (typeof shape.strokeWidth === 'number') {
                        shape.strokeWidth *= scaleFactor;
                    }
                });
            }
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
