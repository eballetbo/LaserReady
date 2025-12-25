
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

    execute(): void {
        const { shapes, setShapes, setSelectedShapes } = useStore.getState();

        // Remove groups
        let newShapes = shapes.filter(s => !this.originalGroupIds.includes(s.id));

        let allChildren: IShape[] = [];

        // Add children of each group
        this.groupsToUngroup.forEach(group => {
            if (group.children) {
                newShapes.push(...group.children);
                allChildren.push(...group.children);
            }
        });

        setShapes(newShapes);
        setSelectedShapes(allChildren.map(c => c.id));
    }

    undo(): void {
        const { shapes, setShapes, setSelectedShapes } = useStore.getState();

        // We need to remove the children that were ungrouped.
        // And put the groups back.

        const childrenIds: string[] = [];
        this.groupsToUngroup.forEach(g => {
            if (g.children) {
                g.children.forEach(c => childrenIds.push(c.id));
            }
        });

        // Remove children from root
        const newShapes = shapes.filter(s => !childrenIds.includes(s.id));

        // Add groups back
        newShapes.push(...this.groupsToUngroup);

        setShapes(newShapes);
        setSelectedShapes(this.originalGroupIds);
    }
}
