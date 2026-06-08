
import { Command } from '../../../core/commands/command';
import { useStore } from '../../../store/useStore';
import { IShape } from '../types';
import { GroupShape } from '../models/group';

export class GroupCommand implements Command {
    private shapesToGroup: IShape[];
    private groupShape: GroupShape | null = null;
    private originalIds: string[];
    private originalIndices: number[] = [];
    readonly label = 'Group';

    constructor(shapes: IShape[]) {
        this.shapesToGroup = shapes;
        this.originalIds = shapes.map(s => s.id);
    }

    execute(): void {
        const { shapes, setShapes, setSelectedShapes } = useStore.getState();

        if (!this.groupShape) {
            this.groupShape = new GroupShape(this.shapesToGroup);
        }

        this.originalIndices = this.originalIds.map(id => shapes.findIndex(s => s.id === id));
        const validIndices = this.originalIndices.filter(i => i !== -1);
        const insertIdx = validIndices.length > 0 ? Math.min(...validIndices) : 0;

        const newShapes = shapes.filter(s => !this.originalIds.includes(s.id));
        newShapes.splice(insertIdx, 0, this.groupShape);

        setShapes(newShapes);
        setSelectedShapes([this.groupShape.id]);
    }

    undo(): void {
        const { shapes, setShapes, setSelectedShapes } = useStore.getState();

        if (!this.groupShape) return;

        const newShapes = shapes.filter(s => s.id !== this.groupShape!.id);

        this.shapesToGroup.forEach((shape, i) => {
            const idx = this.originalIndices[i];
            newShapes.splice(idx, 0, shape);
        });

        setShapes(newShapes);
        setSelectedShapes(this.originalIds);
    }
}
