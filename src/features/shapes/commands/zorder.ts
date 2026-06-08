import { Command } from '../../../core/commands/command';
import { useStore } from '../../../store/useStore';
import { IShape } from '../types';

type ZOrderOperation = 'bringForward' | 'sendBackward' | 'bringToFront' | 'sendToBack';

export class ZOrderCommand implements Command {
    private shapeIds: string[];
    private operation: ZOrderOperation;
    private previousOrder: string[] = [];
    readonly label = 'Reorder';

    constructor(shapes: IShape[], operation: ZOrderOperation) {
        this.shapeIds = shapes.map(s => s.id);
        this.operation = operation;
    }

    execute(): void {
        const { shapes, setShapes } = useStore.getState();
        this.previousOrder = shapes.map(s => s.id);

        const newShapes = [...shapes];
        const targetIds = new Set(this.shapeIds);

        switch (this.operation) {
            case 'bringToFront': {
                const targets = newShapes.filter(s => targetIds.has(s.id));
                const rest = newShapes.filter(s => !targetIds.has(s.id));
                setShapes([...rest, ...targets]);
                break;
            }
            case 'sendToBack': {
                const targets = newShapes.filter(s => targetIds.has(s.id));
                const rest = newShapes.filter(s => !targetIds.has(s.id));
                setShapes([...targets, ...rest]);
                break;
            }
            case 'bringForward': {
                for (let i = newShapes.length - 2; i >= 0; i--) {
                    if (targetIds.has(newShapes[i].id) && !targetIds.has(newShapes[i + 1].id)) {
                        [newShapes[i], newShapes[i + 1]] = [newShapes[i + 1], newShapes[i]];
                    }
                }
                setShapes(newShapes);
                break;
            }
            case 'sendBackward': {
                for (let i = 1; i < newShapes.length; i++) {
                    if (targetIds.has(newShapes[i].id) && !targetIds.has(newShapes[i - 1].id)) {
                        [newShapes[i], newShapes[i - 1]] = [newShapes[i - 1], newShapes[i]];
                    }
                }
                setShapes(newShapes);
                break;
            }
        }
    }

    undo(): void {
        const { shapes, setShapes } = useStore.getState();
        const shapeMap = new Map(shapes.map(s => [s.id, s]));
        const restored = this.previousOrder
            .map(id => shapeMap.get(id))
            .filter((s): s is IShape => s !== undefined);
        setShapes(restored);
    }
}
