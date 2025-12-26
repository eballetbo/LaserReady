import { Command } from '../../../core/commands/command';
import { useStore } from '../../../store/useStore';
import { IShape } from '../types';
import { Point } from '../../../core/math/geometry';

/**
 * STEP 4: Command to resize shapes with undo/redo support.
 * Stores original nodes state for restoration.
 */
export class ResizeShapeCommand implements Command {
    private shapesToResize: IShape[];
    private sx: number;
    private sy: number;
    private origin: Point;
    private originalStates: any[];

    constructor(shapesToResize: IShape[], sx: number, sy: number, origin: Point) {
        this.shapesToResize = shapesToResize;
        this.sx = sx;
        this.sy = sy;
        this.origin = origin;

        // Store original state for undo
        this.originalStates = shapesToResize.map(shape => {
            if (shape.type === 'group') {
                const g = shape as any; // GroupShape
                return {
                    type: 'group',
                    children: g.children ? g.children.map((c: any) => {
                        const clone = c.clone ? c.clone() : JSON.parse(JSON.stringify(c));
                        clone.id = c.id; // Preserve ID for history
                        return clone;
                    }) : [],
                    x: g.x,
                    y: g.y,
                    rotation: g.rotation
                };
            } else if (shape.nodes) {
                return {
                    type: 'path',
                    nodes: shape.nodes.map((n: any) => n.clone()),
                    rotation: (shape as any).rotation
                };
            }
            // Fallback for simple shapes without nodes or children (e.g. Rect/Circle if not path-based)
            return { ...shape };
        });
    }

    execute(): void {
        // Apply scale to each shape
        this.shapesToResize.forEach(shape => {
            if (typeof (shape as any).scale === 'function') {
                (shape as any).scale(this.sx, this.sy, this.origin);
            }
        });

        // Trigger store update to re-render
        const { shapes, setShapes } = useStore.getState();
        setShapes([...shapes]);
    }

    undo(): void {
        // Restore original state for each shape
        this.shapesToResize.forEach((shape, i) => {
            const original = this.originalStates[i];

            if (shape.type === 'group' && original.type === 'group') {
                const g = shape as any;
                g.children = original.children.map((c: any) => {
                    const clone = c.clone ? c.clone() : JSON.parse(JSON.stringify(c));
                    clone.id = c.id; // Preserve ID when restoring
                    return clone;
                });
                g.x = original.x;
                g.y = original.y;
                g.rotation = original.rotation;
            } else if (original.nodes && shape.nodes) {
                // Restore nodes
                shape.nodes = original.nodes.map((n: any) => n.clone());
                // Restore rotation if it existed
                if (original.rotation !== undefined) {
                    (shape as any).rotation = original.rotation;
                }
            } else {
                // Restore simple shape properties (x, y, scales, etc.)
                const { type, ...props } = original;
                Object.assign(shape, props);
            }
        });

        // Trigger store update
        const { shapes, setShapes } = useStore.getState();
        setShapes([...shapes]);
    }
}
