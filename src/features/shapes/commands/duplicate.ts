import { Command } from '../../../core/commands/command';
import { useStore } from '../../../store/useStore';
import { IShape } from '../types';

const DUPLICATE_OFFSET = 10;

export class DuplicateCommand implements Command {
    private sourceIds: string[];
    private duplicatedShapes: IShape[] = [];

    constructor(sourceShapes: IShape[]) {
        this.sourceIds = sourceShapes.map(s => s.id);
        this.duplicatedShapes = sourceShapes.map(shape => {
            const clone = shape.clone!();
            clone.id = crypto.randomUUID();
            if (clone.move) clone.move(DUPLICATE_OFFSET, DUPLICATE_OFFSET);
            return clone;
        });
    }

    execute(): void {
        useStore.getState().addShapes(this.duplicatedShapes);
        useStore.getState().setSelectedShapes(this.duplicatedShapes.map(s => s.id));
    }

    undo(): void {
        const ids = this.duplicatedShapes.map(s => s.id);
        useStore.getState().removeShapes(ids);
        useStore.getState().setSelectedShapes(this.sourceIds);
    }
}
