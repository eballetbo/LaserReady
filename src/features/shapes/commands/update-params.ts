import { Command } from '../../../core/commands/command';
import { useStore } from '../../../store/useStore';
import { updateShapeGeometry } from '../../editor/utils/geometry-updater';

/**
 * Command to update shape parameters (sides, points, innerRadius)
 * with undo/redo support. After updating params, regenerates geometry.
 */
export class UpdateParamsCommand implements Command {
    private shapeId: string;
    private key: string;
    private oldValue: number;
    private newValue: number;

    constructor(shapeId: string, key: string, oldValue: number, newValue: number) {
        this.shapeId = shapeId;
        this.key = key;
        this.oldValue = oldValue;
        this.newValue = newValue;
    }

    execute(): void {
        this.applyValue(this.newValue);
    }

    undo(): void {
        this.applyValue(this.oldValue);
    }

    private applyValue(value: number): void {
        const { shapes, setShapes } = useStore.getState();
        const shape = shapes.find(s => s.id === this.shapeId);
        if (!shape || !shape.params) return;

        shape.params[this.key] = value;
        updateShapeGeometry(shape);
        setShapes([...shapes]);
    }
}
