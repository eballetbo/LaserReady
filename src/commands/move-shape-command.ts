import { Command } from '../core/commands/command';
import { useStore } from '../store/useStore';
import { PathShape } from '../features/shapes/path-shape';

export class MoveShapeCommand implements Command {
    private shapesToMove: PathShape[];
    private dx: number;
    private dy: number;

    constructor(shapesToMove: PathShape[], dx: number, dy: number) {
        this.shapesToMove = shapesToMove;
        this.dx = dx;
        this.dy = dy;
    }

    execute(): void {
        // We mutate the shapes directly because they are mutable objects in our model currently.
        // However, to be Redux/Zustand pure, we should clone. 
        // But PathEditor expects mutation for performance during drag?
        // If we clone every frame of drag, it might be slow.
        // BUT, the command pattern implies atomic operations.
        // If this command is executed 60fps, we want to update the store 60fps.

        // Let's stick to the pattern: Mutate then update store to trigger re-render.
        this.shapesToMove.forEach(shape => {
            shape.move(this.dx, this.dy);
        });

        // Trigger store update
        const { shapes, setShapes } = useStore.getState();
        // Since we mutated objects inside the array, we need to create a new array reference
        setShapes([...shapes]);
    }

    undo(): void {
        this.shapesToMove.forEach(shape => {
            shape.move(-this.dx, -this.dy);
        });

        const { shapes, setShapes } = useStore.getState();
        setShapes([...shapes]);
    }
}
