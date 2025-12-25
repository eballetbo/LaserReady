import { Command } from '../../../core/commands/command';
import { useStore } from '../../../store/useStore';
import { PathShape } from '../models/path';

export class CreateShapeCommand implements Command {
    private shape: PathShape;

    constructor(shape: PathShape) {
        this.shape = shape;
    }

    execute(): void {
        const { shapes, setShapes } = useStore.getState();
        // Avoid duplicate if it's already there (defensive)
        if (!shapes.find(s => s.id === this.shape.id)) {
            setShapes([...shapes, this.shape]);
        }
    }

    undo(): void {
        const { shapes, setShapes } = useStore.getState();
        setShapes(shapes.filter(s => s.id !== this.shape.id));
    }
}
