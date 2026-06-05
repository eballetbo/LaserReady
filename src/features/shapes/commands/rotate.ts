import { Command } from '../../../core/commands/command';
import { useStore } from '../../../store/useStore';
import { IShape } from '../types';
import { Point } from '../../../core/math/geometry';
import { captureSnapshot, restoreSnapshot, ShapeSnapshot } from '../utils/snapshot';

export class RotateShapeCommand implements Command {
    private shapesToRotate: IShape[];
    private angle: number;
    private center: Point;
    private snapshots: ShapeSnapshot[];

    constructor(shapesToRotate: IShape[], angle: number, center: Point) {
        this.shapesToRotate = shapesToRotate;
        this.angle = angle;
        this.center = center;
        this.snapshots = shapesToRotate.map(captureSnapshot);
    }

    execute(): void {
        this.shapesToRotate.forEach(shape => {
            if (shape.rotate) {
                shape.rotate(this.angle, this.center);
            }
        });

        const { shapes, setShapes } = useStore.getState();
        setShapes([...shapes]);
    }

    undo(): void {
        this.shapesToRotate.forEach((shape, i) => {
            restoreSnapshot(shape, this.snapshots[i]);
        });

        const { shapes, setShapes } = useStore.getState();
        setShapes([...shapes]);
    }
}
