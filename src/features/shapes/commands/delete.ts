import { Command } from '../../../core/commands/command';
import { useStore } from '../../../store/useStore';
import { IShape } from '../types';

export class DeleteShapeCommand implements Command {
    private shapesToDelete: IShape[];
    private previousSelectedIds: string[];
    private originalIndices: number[] = [];

    constructor(shapesToDelete: IShape[]) {
        this.shapesToDelete = shapesToDelete;
        this.previousSelectedIds = useStore.getState().selectedShapes;
    }

    execute(): void {
        const { shapes, setShapes, setSelectedShapes } = useStore.getState();

        const idsToDelete = this.shapesToDelete.map(s => s.id);
        this.originalIndices = idsToDelete.map(id => shapes.findIndex(s => s.id === id));

        const newShapes = shapes.filter(s => !idsToDelete.includes(s.id));
        setShapes(newShapes);
        setSelectedShapes([]);
    }

    undo(): void {
        const { shapes, setShapes, setSelectedShapes } = useStore.getState();

        const restoredShapes = [...shapes];
        this.shapesToDelete.forEach((shape, i) => {
            const idx = this.originalIndices[i];
            if (idx === -1) {
                restoredShapes.push(shape);
            } else {
                restoredShapes.splice(Math.min(idx, restoredShapes.length), 0, shape);
            }
        });

        setShapes(restoredShapes);
        setSelectedShapes(this.previousSelectedIds);
    }
}
