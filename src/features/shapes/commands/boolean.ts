import { Command } from '../../../core/commands/command';
import { useStore } from '../../../store/useStore';
import { BooleanOperations } from '../../../core/math/boolean';
import { PathShape } from '../models/path';
import { notify } from '../../ui/toast-utils';

type BooleanOperationType = 'unite' | 'subtract' | 'intersect' | 'exclude';

export class BooleanCommand implements Command {
    private originalShapes: PathShape[];
    private resultShapes: PathShape[] | null = null;
    private operation: BooleanOperationType;
    private originalSelection: string[];
    private originalIndices: number[] = [];
    readonly label: string;

    constructor(shapes: PathShape[], operation: BooleanOperationType) {
        this.originalShapes = shapes;
        this.operation = operation;
        this.originalSelection = shapes.map(s => s.id);
        this.label = `Boolean ${operation}`;
    }

    execute(): void {
        const { shapes, setShapes, setSelectedShapes, activeLayerId } = useStore.getState();

        if (!this.resultShapes) {
            const result = BooleanOperations.perform(this.originalShapes, this.operation);

            if (!result || result.length === 0) {
                notify(`Boolean '${this.operation}' produced no result — shapes may not overlap.`, 'warning');
                return;
            }

            this.resultShapes = result;
            this.resultShapes.forEach(s => s.layerId = activeLayerId);
        }

        const originalIds = this.originalShapes.map(s => s.id);
        this.originalIndices = originalIds.map(id => shapes.findIndex(s => s.id === id));

        const validIndices = this.originalIndices.filter(i => i !== -1);
        const insertIdx = validIndices.length > 0 ? Math.min(...validIndices) : 0;
        const keptShapes = shapes.filter(s => !originalIds.includes(s.id));
        keptShapes.splice(insertIdx, 0, ...this.resultShapes);

        setShapes(keptShapes);
        setSelectedShapes(this.resultShapes.map(s => s.id));
    }

    undo(): void {
        const { shapes, setShapes, setSelectedShapes } = useStore.getState();

        if (!this.resultShapes) return;

        const resultIds = this.resultShapes.map(s => s.id);
        const keptShapes = shapes.filter(s => !resultIds.includes(s.id));

        const restoredShapes = [...keptShapes];
        this.originalShapes.forEach((shape, i) => {
            const idx = this.originalIndices[i];
            restoredShapes.splice(idx, 0, shape);
        });

        setShapes(restoredShapes);
        setSelectedShapes(this.originalSelection);
    }
}
