import { Command } from '../../../core/commands/command';
import { useStore } from '../../../store/useStore';
import { IShape } from '../types';
import { captureSnapshot, restoreSnapshot, ShapeSnapshot } from '../utils/snapshot';

/**
 * Generic transform command that captures shape state before/after
 * a move or scale operation, enabling undo/redo from the properties panel.
 */
export class TransformCommand implements Command {
    private shapeIds: string[];
    private beforeSnapshots: Map<string, ShapeSnapshot>;
    private applyFn: (shapes: IShape[]) => void;
    private applied = false;

    constructor(shapes: IShape[], applyFn: (shapes: IShape[]) => void) {
        this.shapeIds = shapes.map(s => s.id);
        this.applyFn = applyFn;

        this.beforeSnapshots = new Map();
        shapes.forEach(shape => {
            this.beforeSnapshots.set(shape.id, captureSnapshot(shape));
        });
    }

    execute(): void {
        if (!this.applied) {
            const { shapes } = useStore.getState();
            const targets = shapes.filter(s => this.shapeIds.includes(s.id));
            this.applyFn(targets);
            this.applied = true;
        }
        const { shapes, setShapes } = useStore.getState();
        setShapes([...shapes]);
    }

    undo(): void {
        const { shapes, setShapes } = useStore.getState();
        shapes.forEach(shape => {
            const snapshot = this.beforeSnapshots.get(shape.id);
            if (snapshot) restoreSnapshot(shape, snapshot);
        });
        setShapes([...shapes]);
    }
}
