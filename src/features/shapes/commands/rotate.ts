import { Command } from '../../../core/commands/command';
import { useStore } from '../../../store/useStore';
import { IShape } from '../types';
import { Point } from '../../../core/math/geometry';

/**
 * Command to rotate shapes with undo/redo support.
 * Stores original nodes state for restoration.
 */
export class RotateShapeCommand implements Command {
    private shapesToRotate: IShape[];
    private angle: number;
    private center: Point;
    private originalStates: any[];

    constructor(shapesToRotate: IShape[], angle: number, center: Point) {
        this.shapesToRotate = shapesToRotate;
        this.angle = angle;
        this.center = center;

        // Store original state for undo
        this.originalStates = shapesToRotate.map(shape => {
            if (shape.type === 'group') {
                const g = shape as any;
                return {
                    type: 'group',
                    children: g.children ? g.children.map((c: any) => {
                        const clone = c.clone ? c.clone() : JSON.parse(JSON.stringify(c));
                        clone.id = c.id; // Preserve ID
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
            return { type: 'other', ...shape };
        });
    }

    execute(): void {
        // Apply rotation to each shape
        this.shapesToRotate.forEach(shape => {
            if (typeof (shape as any).rotate === 'function') {
                (shape as any).rotate(this.angle, this.center);
            }
        });

        // Trigger store update to re-render
        const { shapes, setShapes } = useStore.getState();
        setShapes([...shapes]);
    }

    undo(): void {
        // Restore original state for each shape
        this.shapesToRotate.forEach((shape, i) => {
            const original = this.originalStates[i];

            if (shape.type === 'group' && original.type === 'group') {
                const g = shape as any;
                g.children = original.children.map((c: any) => {
                    const clone = c.clone ? c.clone() : JSON.parse(JSON.stringify(c));
                    clone.id = c.id; // Preserve ID
                    return clone;
                });
                g.x = original.x;
                g.y = original.y;
                g.rotation = original.rotation;
            } else if (original.nodes && shape.nodes) {
                shape.nodes = original.nodes.map((n: any) => n.clone());
                if (original.rotation !== undefined) {
                    (shape as any).rotation = original.rotation;
                }
            }
        });

        // Trigger store update
        const { shapes, setShapes } = useStore.getState();
        setShapes([...shapes]);
    }
}
