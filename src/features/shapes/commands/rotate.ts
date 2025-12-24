import { Command } from '../../../core/commands/command';
import { useStore } from '../../../store/useStore';
import { PathShape } from '../models/path';
import { PathNode } from '../models/node';
import { Point } from '../../../core/math/geometry';

/**
 * Command to rotate shapes with undo/redo support.
 * Stores original nodes state for restoration.
 */
export class RotateShapeCommand implements Command {
    private shapesToRotate: PathShape[];
    private angle: number;
    private center: Point;
    private originalStates: Array<{ nodes: PathNode[] }>;

    constructor(shapesToRotate: PathShape[], angle: number, center: Point) {
        this.shapesToRotate = shapesToRotate;
        this.angle = angle;
        this.center = center;

        // Store original state for undo
        this.originalStates = shapesToRotate.map(shape => ({
            nodes: shape.nodes.map(n => n.clone())
        }));
    }

    execute(): void {
        // Apply rotation to each shape
        this.shapesToRotate.forEach(shape => {
            shape.rotate(this.angle, this.center);
        });

        // Trigger store update to re-render
        const { shapes, setShapes } = useStore.getState();
        setShapes([...shapes]);
    }

    undo(): void {
        // Restore original state for each shape
        this.shapesToRotate.forEach((shape, i) => {
            const original = this.originalStates[i];
            shape.nodes = original.nodes.map(n => n.clone());
        });

        // Trigger store update
        const { shapes, setShapes } = useStore.getState();
        setShapes([...shapes]);
    }
}
