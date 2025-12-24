import { Command } from '../../../core/commands/command';
import { useStore } from '../../../store/useStore';
import { PathShape } from '../models/path';
import { PathNode } from '../models/node';
import { Point } from '../../../core/math/geometry';

/**
 * STEP 4: Command to resize shapes with undo/redo support.
 * Stores original nodes state for restoration.
 */
export class ResizeShapeCommand implements Command {
    private shapesToResize: PathShape[];
    private sx: number;
    private sy: number;
    private origin: Point;
    private originalStates: Array<{ nodes: PathNode[]; rotation?: number }>;

    constructor(shapesToResize: PathShape[], sx: number, sy: number, origin: Point) {
        this.shapesToResize = shapesToResize;
        this.sx = sx;
        this.sy = sy;
        this.origin = origin;

        // Store original state for undo
        this.originalStates = shapesToResize.map(shape => ({
            nodes: shape.nodes.map(n => n.clone()),
            rotation: (shape as any).rotation
        }));
    }

    execute(): void {
        // Apply scale to each shape
        this.shapesToResize.forEach(shape => {
            shape.scale(this.sx, this.sy, this.origin);
        });

        // Trigger store update to re-render
        const { shapes, setShapes } = useStore.getState();
        setShapes([...shapes]);
    }

    undo(): void {
        // Restore original state for each shape
        this.shapesToResize.forEach((shape, i) => {
            const original = this.originalStates[i];

            // Restore nodes
            shape.nodes = original.nodes.map(n => n.clone());

            // Restore rotation if it existed
            if (original.rotation !== undefined) {
                (shape as any).rotation = original.rotation;
            }
        });

        // Trigger store update
        const { shapes, setShapes } = useStore.getState();
        setShapes([...shapes]);
    }
}
