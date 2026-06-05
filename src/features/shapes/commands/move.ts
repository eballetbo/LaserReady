import { Command } from '../../../core/commands/command';
import { useStore } from '../../../store/useStore';
import { CanvasController } from '../../editor/controller';
import { IShape } from '../types';

export class MoveShapeCommand implements Command {
    private shapeIds: string[];
    private dx: number;
    private dy: number;

    constructor(_editor: CanvasController, shapes: IShape[], dx: number, dy: number) {
        this.shapeIds = shapes.map(s => s.id);
        this.dx = dx;
        this.dy = dy;
    }

    execute(): void {
        const { shapes, setShapes } = useStore.getState();
        shapes.forEach(shape => {
            if (this.shapeIds.includes(shape.id) && shape.move) {
                shape.move(this.dx, this.dy);
            }
        });
        setShapes([...shapes]);
    }

    undo(): void {
        const { shapes, setShapes } = useStore.getState();
        shapes.forEach(shape => {
            if (this.shapeIds.includes(shape.id) && shape.move) {
                shape.move(-this.dx, -this.dy);
            }
        });
        setShapes([...shapes]);
    }
}
