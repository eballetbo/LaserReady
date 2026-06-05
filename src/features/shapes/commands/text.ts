import { Command } from '../../../core/commands/command';
import { useStore } from '../../../store/useStore';

export class ChangeTextCommand implements Command {
    private shapeId: string;
    private oldText: string;
    private newText: string;

    constructor(shapeId: string, oldText: string, newText: string) {
        this.shapeId = shapeId;
        this.oldText = oldText;
        this.newText = newText;
    }

    execute(): void {
        const { shapes, setShapes } = useStore.getState();
        const newShapes = shapes.map(s => {
            if (s.id === this.shapeId) {
                const clone = s.clone!();
                (clone as any).text = this.newText;
                return clone;
            }
            return s;
        });
        setShapes(newShapes);
    }

    undo(): void {
        const { shapes, setShapes } = useStore.getState();
        const newShapes = shapes.map(s => {
            if (s.id === this.shapeId) {
                const clone = s.clone!();
                (clone as any).text = this.oldText;
                return clone;
            }
            return s;
        });
        setShapes(newShapes);
    }
}
