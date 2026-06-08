import { Command } from '../../../core/commands/command';
import { useStore } from '../../../store/useStore';
import { IShape } from '../types';

export class ImportShapesCommand implements Command {
    private shapes: IShape[];
    readonly label = 'Import';

    constructor(shapes: IShape[]) {
        this.shapes = shapes;
    }

    execute(): void {
        useStore.getState().addShapes(this.shapes);
        useStore.getState().setSelectedShapes(this.shapes.map(s => s.id));
    }

    undo(): void {
        const ids = this.shapes.map(s => s.id);
        useStore.getState().removeShapes(ids);
    }
}
