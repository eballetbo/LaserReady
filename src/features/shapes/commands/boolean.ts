
import { Command } from '../../../core/commands/command';
import { useStore } from '../../../store/useStore';
import { BooleanOperations } from '../../../core/math/boolean';
import { PathShape } from '../models/path';

type BooleanOperationType = 'unite' | 'subtract' | 'intersect' | 'exclude';

export class BooleanCommand implements Command {
    private originalShapes: PathShape[];
    private resultShapes: PathShape[] | null = null;
    private operation: BooleanOperationType;
    private originalSelection: string[];

    constructor(shapes: PathShape[], operation: BooleanOperationType) {
        this.originalShapes = shapes;
        this.operation = operation;
        // Capture selection IDs to restore on undo
        this.originalSelection = shapes.map(s => s.id);
    }

    execute(): void {
        const { shapes, setShapes, setSelectedShapes, activeLayerId } = useStore.getState();

        // Calculate result if not already done (lazy calculation to keep constructor light, 
        // but ensure deterministic result for redo)
        if (!this.resultShapes) {
            // Perform operation
            // Note: BooleanOperations returns NEW instances
            this.resultShapes = BooleanOperations.perform(this.originalShapes, this.operation);

            // Assign active layer to new shapes (or inherit?)
            // Usually result inherits from primary shape or active layer.
            // Let's use activeLayerId for simplicity as per Controller logic.
            this.resultShapes.forEach(s => s.layerId = activeLayerId);
        }

        // Remove original shapes from store
        const originalIds = this.originalShapes.map(s => s.id);
        const keptShapes = shapes.filter(s => !originalIds.includes(s.id));

        // Add result shapes
        // Use non-null assertion as we populated it
        const newShapes = [...keptShapes, ...this.resultShapes!];

        setShapes(newShapes);

        // Select the new result shapes
        setSelectedShapes(this.resultShapes!.map(s => s.id));
    }

    undo(): void {
        const { shapes, setShapes, setSelectedShapes } = useStore.getState();

        // Remove result shapes
        const resultIds = this.resultShapes!.map(s => s.id);
        const keptShapes = shapes.filter(s => !resultIds.includes(s.id));

        // Restore original shapes
        // We must put them back. Order might matter for z-index? 
        // Ideally we'd splice them back at their original indices, but for now append is standard.
        // Or if we want to be fancy, we could try to restore relative order.
        // Let's stick to append for simplicity/stability.
        const restoredShapes = [...keptShapes, ...this.originalShapes];

        setShapes(restoredShapes);

        // Restore selection
        setSelectedShapes(this.originalSelection);
    }
}
