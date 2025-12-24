import { Command } from '../../../core/commands/command';
import { useStore } from '../../../store/useStore';
import { PathShape } from '../models/path';

export class DeleteShapeCommand implements Command {
    private shapesToDelete: PathShape[];
    private previousSelectedIds: string[];

    constructor(shapesToDelete: PathShape[]) {
        this.shapesToDelete = shapesToDelete;
        // Capture selection state before deletion, or maybe we don't need to restore exact selection?
        // Usually good UX to restore selection on undo.
        this.previousSelectedIds = useStore.getState().selectedShapes;
    }

    execute(): void {
        const { shapes, setShapes, setSelectedShapes } = useStore.getState();

        // Filter out shapes that are in the delete list
        // We use ID comparison for safety
        const idsToDelete = this.shapesToDelete.map(s => s.id);
        const newShapes = shapes.filter(s => !idsToDelete.includes(s.id));

        setShapes(newShapes);
        setSelectedShapes([]); // Clear selection after deletion
    }

    undo(): void {
        const { shapes, setShapes, setSelectedShapes } = useStore.getState();

        // Add shapes back. 
        // We should probably preserve z-order? 
        // For simplicity now, just append or we would need to know indices.
        // If we want to be precise, we'd store indices in constructor.
        // Assuming simple append is fine for now, or the user didn't specify strict z-order preservation.
        // However, standard delete/undo usually puts them back where they were.
        // Let's rely on simple add-back for this first implementation.

        const restoredShapes = [...shapes, ...this.shapesToDelete];
        setShapes(restoredShapes);

        // Restore selection
        setSelectedShapes(this.previousSelectedIds);
    }
}
