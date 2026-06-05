import { describe, it, expect, beforeEach } from 'vitest';
import { ChangeNodeTypeCommand, DeleteNodeCommand } from './node';
import { useStore } from '../../../store/useStore';
import { PathNode } from '../models/node';
import { PathShape } from '../models/path';

describe('Node Commands - Prototype Preservation', () => {
    beforeEach(() => {
        useStore.setState({ shapes: [], selectedShapes: [] });
    });

    it('should maintain PathShape prototype after ChangeNodeTypeCommand', () => {
        const node1 = new PathNode(0, 0);
        const node2 = new PathNode(100, 0);
        const shape = new PathShape([node1, node2], false);

        useStore.setState({ shapes: [shape] });

        const cmd = new ChangeNodeTypeCommand(shape.id, 0, 'smooth');
        cmd.execute();

        const updatedShape = useStore.getState().shapes[0];
        expect(updatedShape).toBeInstanceOf(PathShape);
        expect(typeof updatedShape.clone).toBe('function');
        expect(typeof updatedShape.getBounds).toBe('function');
    });

    it('should maintain PathShape prototype after DeleteNodeCommand', () => {
        const node1 = new PathNode(0, 0);
        const node2 = new PathNode(100, 0);
        const node3 = new PathNode(100, 100);
        const shape = new PathShape([node1, node2, node3], false);

        useStore.setState({ shapes: [shape] });

        const cmd = new DeleteNodeCommand(shape.id, 1);
        cmd.execute();

        const updatedShape = useStore.getState().shapes[0];
        expect(updatedShape).toBeInstanceOf(PathShape);
        expect(typeof updatedShape.clone).toBe('function');
        expect(updatedShape.nodes!.length).toBe(2);
    });
});
