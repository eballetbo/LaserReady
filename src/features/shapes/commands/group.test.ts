
import { describe, it, expect, beforeEach } from 'vitest';
import { useStore } from '../../../store/useStore';
import { GroupCommand } from './group';
import { UngroupCommand } from './ungroup';
import { PathShape } from '../models/path';
import { GroupShape } from '../models/group';
import { PathNode } from '../models/node';

// Setup Mock Store
const validShape1 = new PathShape([new PathNode(0, 0), new PathNode(10, 10)]);
const validShape2 = new PathShape([new PathNode(20, 20), new PathNode(30, 30)]);

describe('Group/Ungroup Commands', () => {
    beforeEach(() => {
        useStore.setState({
            shapes: [validShape1, validShape2],
            selectedShapes: [],
            activeLayerId: 'layer-1'
        });
    });

    it('should group selected shapes', () => {
        const command = new GroupCommand([validShape1, validShape2]);
        command.execute();

        const { shapes, selectedShapes } = useStore.getState();

        // Should have 1 shape (the group)
        expect(shapes.length).toBe(1);
        expect(shapes[0].type).toBe('group');
        expect((shapes[0] as GroupShape).children.length).toBe(2);

        // Group should be selected
        expect(selectedShapes).toEqual([shapes[0].id]);
    });

    it('should ungroup a group', () => {
        // First, create the group state
        const groupCommand = new GroupCommand([validShape1, validShape2]);
        groupCommand.execute();

        const group = useStore.getState().shapes[0] as GroupShape;

        // Now ungroup
        const ungroupCommand = new UngroupCommand([group]);
        ungroupCommand.execute();

        const { shapes, selectedShapes } = useStore.getState();

        // Should have returned to 2 shapes
        expect(shapes.length).toBe(2);

        // Children should be selected
        expect(selectedShapes).toHaveLength(2);
        expect(selectedShapes).toContain(validShape1.id);
        expect(selectedShapes).toContain(validShape2.id);
    });

    it('should undo grouping', () => {
        const command = new GroupCommand([validShape1, validShape2]);
        command.execute();
        command.undo();

        const { shapes } = useStore.getState();
        expect(shapes.length).toBe(2);
        // IDs should be preserved (checking via reference or ID)
        expect(shapes.find(s => s.id === validShape1.id)).toBeDefined();
    });
});
