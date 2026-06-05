
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

        if (!this.resultShapes) {
            const result = BooleanOperations.perform(this.originalShapes, this.operation);

            if (!result || result.length === 0) {
                console.warn(`Boolean '${this.operation}' produced no result — originals preserved.`);
                return;
            }

            this.resultShapes = result;
            this.resultShapes.forEach(s => s.layerId = activeLayerId);
        }

        const originalIds = this.originalShapes.map(s => s.id);
        const keptShapes = shapes.filter(s => !originalIds.includes(s.id));
        const newShapes = [...keptShapes, ...this.resultShapes];

        setShapes(newShapes);
        setSelectedShapes(this.resultShapes.map(s => s.id));
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
