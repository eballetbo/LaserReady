
import { Command } from '../../../core/commands/command';
import { useStore } from '../../../store/useStore';
import { IShape } from '../types';
import { GroupShape } from '../models/group';

export class UngroupCommand implements Command {
    private groupsToUngroup: GroupShape[];
    private originalGroupIds: string[];
    // We need to track children per group to restore on undo?
    // Actually the GroupShape instance itself holds the children.
    // If we remove GroupShape from store, the object still exists in memory here.
    // So undo just puts the GroupShape back.
    // AND removes the children from the root list.

    constructor(groups: GroupShape[]) {
        this.groupsToUngroup = groups;
        this.originalGroupIds = groups.map(g => g.id);
    }

    private originalGroupIndices: number[] = [];

    execute(): void {
        const { shapes, setShapes, setSelectedShapes } = useStore.getState();

        this.originalGroupIndices = this.originalGroupIds.map(id => shapes.findIndex(s => s.id === id));

        let newShapes = shapes.filter(s => !this.originalGroupIds.includes(s.id));
        let allChildren: IShape[] = [];

        this.groupsToUngroup.forEach((group, gi) => {
            if (group.children) {
                const insertIdx = this.originalGroupIndices[gi];
                newShapes.splice(insertIdx, 0, ...group.children);
                allChildren.push(...group.children);
            }
        });

        setShapes(newShapes);
        setSelectedShapes(allChildren.map(c => c.id));
    }

    undo(): void {
        const { shapes, setShapes, setSelectedShapes } = useStore.getState();

        const childrenIds: string[] = [];
        this.groupsToUngroup.forEach(g => {
            if (g.children) {
                g.children.forEach(c => childrenIds.push(c.id));
            }
        });

        const newShapes = shapes.filter(s => !childrenIds.includes(s.id));

        this.groupsToUngroup.forEach((group, gi) => {
            const idx = this.originalGroupIndices[gi];
            newShapes.splice(idx, 0, group);
        });

        setShapes(newShapes);
        setSelectedShapes(this.originalGroupIds);
    }
}
