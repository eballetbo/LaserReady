import { describe, it, expect, beforeEach } from 'vitest';
import { MoveNodeCommand } from './move-node';
import { useStore } from '../../../store/useStore';
import { PathNode } from '../models/node';

describe('MoveNodeCommand', () => {
    const shapeId = 'test-shape';
    let initialNode: PathNode;
    let targetNode: PathNode;

    beforeEach(() => {
        // Reset store
        useStore.setState({
            shapes: [{
                id: shapeId,
                type: 'path',
                nodes: [
                    new PathNode(0, 0), // index 0
                    new PathNode(10, 10) // index 1 (we will move this)
                ]
            }]
        } as any);

        initialNode = new PathNode(10, 10);
        targetNode = new PathNode(20, 20);
        // Modify handles for target
        targetNode.cpIn.x = 15;
        targetNode.cpIn.y = 15;
    });

    it('should move the node on execute', () => {
        const command = new MoveNodeCommand(shapeId, 1, initialNode, targetNode);
        command.execute();

        const state = useStore.getState();
        const shape = state.shapes.find(s => s.id === shapeId);
        expect(shape?.nodes).toBeDefined();
        const node = shape!.nodes![1];

        expect(node?.x).toBe(20);
        expect(node?.y).toBe(20);
        expect(node?.cpIn.x).toBe(15);
    });

    it('should revert the node on undo', () => {
        const command = new MoveNodeCommand(shapeId, 1, initialNode, targetNode);
        command.execute();
        command.undo();

        const state = useStore.getState();
        const shape = state.shapes.find(s => s.id === shapeId);
        expect(shape?.nodes).toBeDefined();
        const node = shape!.nodes![1];

        expect(node?.x).toBe(10);
        expect(node?.y).toBe(10);
        expect(node?.cpIn.x).toBe(10); // Default was x
    });
});
