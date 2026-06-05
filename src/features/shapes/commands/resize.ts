import { Command } from '../../../core/commands/command';
import { useStore } from '../../../store/useStore';
import { IShape } from '../types';
import { Point } from '../../../core/math/geometry';
import { captureSnapshot, restoreSnapshot, ShapeSnapshot } from '../utils/snapshot';

export class ResizeShapeCommand implements Command {
    private shapesToResize: IShape[];
    private sx: number;
    private sy: number;
    private origin: Point;
    private snapshots: ShapeSnapshot[];

    constructor(shapesToResize: IShape[], sx: number, sy: number, origin: Point) {
        this.shapesToResize = shapesToResize;
        this.sx = sx;
        this.sy = sy;
        this.origin = origin;
        this.snapshots = shapesToResize.map(captureSnapshot);
    }

    execute(): void {
        this.shapesToResize.forEach(shape => {
            if (shape.scale) {
                shape.scale(this.sx, this.sy, this.origin);
            }
        });

        const { shapes, setShapes } = useStore.getState();
        setShapes([...shapes]);
    }

    undo(): void {
        this.shapesToResize.forEach((shape, i) => {
            restoreSnapshot(shape, this.snapshots[i]);
        });

        const { shapes, setShapes } = useStore.getState();
        setShapes([...shapes]);
    }
}
