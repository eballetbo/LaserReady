
import { Command } from '../../../core/commands/command';
import { useStore } from '../../../store/useStore';
import { IShape } from '../types';
import { GroupShape } from '../models/group';

export class GroupCommand implements Command {
    private shapesToGroup: IShape[];
    private groupShape: GroupShape | null = null;
    private originalIds: string[];

    constructor(shapes: IShape[]) {
        this.shapesToGroup = shapes;
        this.originalIds = shapes.map(s => s.id);
    }

    execute(): void {
        const { shapes, setShapes, setSelectedShapes } = useStore.getState();

        // If explicitly grouped before (redo), reuse the instance to preserve ID
        if (!this.groupShape) {
            this.groupShape = new GroupShape(this.shapesToGroup);
        }

        // Remove individual shapes
        const newShapes = shapes.filter(s => !this.originalIds.includes(s.id));

        // Add group
        newShapes.push(this.groupShape);

        setShapes(newShapes);
        setSelectedShapes([this.groupShape.id]);
    }

    undo(): void {
        const { shapes, setShapes, setSelectedShapes } = useStore.getState();

        if (!this.groupShape) return;

        // Remove group
        const newShapes = shapes.filter(s => s.id !== this.groupShape!.id);

        // Restore individual shapes
        // Append them back. 
        // Note: original z-order relative to other shapes is lost if we just append.
        // But relative z-order among themselves is preserved if shapesToGroup was sorted?
        // Usually shapesToGroup comes from selection, which might be arbitrary order?
        // Ideally we should insert them where the group was?
        // For now, appending is the mvp behavior.
        newShapes.push(...this.shapesToGroup);

        setShapes(newShapes);
        setSelectedShapes(this.originalIds);
    }
}
