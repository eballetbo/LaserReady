import { describe, it, expect, beforeEach } from 'vitest';
import { BreakPathCommand } from './break-path';
import { useStore } from '../../../store/useStore';
import { PathShape } from '../models/path';
import { PathNode } from '../models/node';

describe('BreakPathCommand', () => {
    beforeEach(() => {
        useStore.setState({ shapes: [] });
    });

    it('should break a closed path into an open path', () => {
        // Setup: Closed square [0,0], [10,0], [10,10], [0,10]
        const nodes = [
            new PathNode(0, 0),
            new PathNode(10, 0),
            new PathNode(10, 10),
            new PathNode(0, 10)
        ];
        const shape = new PathShape(nodes, true); // Closed
        useStore.setState({ shapes: [shape] });

        // Break at index 1 ([10,0])
        const command = new BreakPathCommand(shape.id, 1);
        command.execute();

        const state = useStore.getState();
        const updatedShape = state.shapes[0] as PathShape;

        // Should be Open
        expect(updatedShape.closed).toBe(false);

        // Should have 5 nodes (start duplicated at end)
        // Order: 1, 2, 3, 0, 1'
        expect(updatedShape.nodes.length).toBe(5);
        expect(updatedShape.nodes[0].x).toBe(10); // Node 1
        expect(updatedShape.nodes[0].y).toBe(0);
        expect(updatedShape.nodes[4].x).toBe(10); // Node 1 duplicate
        expect(updatedShape.nodes[4].y).toBe(0);
        expect(updatedShape.nodes[4]).not.toBe(updatedShape.nodes[0]); // Different instance
    });

    it('should undo break closed path', () => {
        const nodes = [
            new PathNode(0, 0),
            new PathNode(10, 0),
            new PathNode(10, 10),
            new PathNode(0, 10)
        ];
        const shape = new PathShape(nodes, true);
        useStore.setState({ shapes: [shape] });

        const command = new BreakPathCommand(shape.id, 1);
        command.execute();
        command.undo();

        const state = useStore.getState();
        const restoredShape = state.shapes[0] as PathShape;

        expect(restoredShape.closed).toBe(true);
        expect(restoredShape.nodes.length).toBe(4);
        expect(restoredShape.nodes[0].x).toBe(0);
    });

    it('should split an open path into two paths', () => {
        // Setup: Line [0,0] -> [10,0] -> [20,0]
        const nodes = [
            new PathNode(0, 0),
            new PathNode(10, 0),
            new PathNode(20, 0)
        ];
        const shape = new PathShape(nodes, false); // Open
        useStore.setState({ shapes: [shape] });

        // Break at index 1 ([10,0])
        const command = new BreakPathCommand(shape.id, 1);
        command.execute();

        const state = useStore.getState();
        expect(state.shapes.length).toBe(2);

        const shapeA = state.shapes.find(s => s.id === shape.id) as PathShape;
        const shapeB = state.shapes.find(s => s.id !== shape.id) as PathShape;

        // Shape A: 0..1 ([0,0], [10,0])
        expect(shapeA.nodes.length).toBe(2);
        expect(shapeA.nodes[0].x).toBe(0);
        expect(shapeA.nodes[1].x).toBe(10);

        // Shape B: 1..2 ([10,0], [20,0])
        expect(shapeB).toBeDefined();
        expect(shapeB.nodes.length).toBe(2);
        expect(shapeB.nodes[0].x).toBe(10);
        expect(shapeB.nodes[1].x).toBe(20);
    });

    it('should undo split open path', () => {
        const nodes = [
            new PathNode(0, 0),
            new PathNode(10, 0),
            new PathNode(20, 0)
        ];
        const shape = new PathShape(nodes, false);
        useStore.setState({ shapes: [shape] });

        const command = new BreakPathCommand(shape.id, 1);
        command.execute();
        command.undo();

        const state = useStore.getState();
        expect(state.shapes.length).toBe(1);

        const restoredShape = state.shapes[0] as PathShape;
        expect(restoredShape.nodes.length).toBe(3);
        expect(restoredShape.nodes[2].x).toBe(20);
    });
});
