import { describe, it, expect, beforeEach } from 'vitest';
import { ConvertSegmentToLineCommand, ConvertSegmentToCurveCommand } from './segment';
import { useStore } from '../../../store/useStore';
import { PathNode } from '../models/node';

describe('Segment Commands', () => {
    let shapeId: string;
    let initialShapes: any[];


    beforeEach(() => {
        useStore.setState({ shapes: [] });
        shapeId = 'test-shape';

        // Create a simple path with 2 nodes (1 segment)
        const node1 = new PathNode(0, 0, 0, 0, 0, 0, 'corner');
        const node2 = new PathNode(100, 0, 100, 0, 100, 0, 'corner');

        // Mock shape object
        const shape = {
            id: shapeId,
            nodes: [node1, node2],
            clone: function () {
                return {
                    ...this,
                    nodes: this.nodes.map((n: any) => n.clone())
                };
            },
            closed: false
        };

        initialShapes = [shape];
        useStore.setState({ shapes: initialShapes });
    });

    describe('ConvertSegmentToCurveCommand', () => {
        it('should convert a line segment to a curve', () => {
            const command = new ConvertSegmentToCurveCommand(shapeId, 0);
            command.execute();

            const shapes = useStore.getState().shapes;
            const updatedShape = shapes[0];
            const n1 = updatedShape.nodes[0];
            const n2 = updatedShape.nodes[1];

            // Handles should be extended
            expect(n1.cpOut.x).toBeGreaterThan(0);
            expect(n1.cpOut.y).toBeCloseTo(0); // Horizontal segment
            expect(n2.cpIn.x).toBeLessThan(100);
            expect(n2.cpIn.y).toBeCloseTo(0);

            // Distance should be 1/3 of 100 = 33.333
            expect(n1.cpOut.x).toBeCloseTo(33.333);
            expect(n2.cpIn.x).toBeCloseTo(66.666);
        });

        it('should support undo', () => {
            const command = new ConvertSegmentToCurveCommand(shapeId, 0);
            command.execute();
            command.undo();

            const shapes = useStore.getState().shapes;
            const updatedShape = shapes[0];
            const n1 = updatedShape.nodes[0];
            const n2 = updatedShape.nodes[1];

            expect(n1.cpOut.x).toBe(0);
            expect(n2.cpIn.x).toBe(100);
        });
    });

    describe('ConvertSegmentToLineCommand', () => {
        beforeEach(() => {
            // Setup a curved segment
            const shapes = useStore.getState().shapes;
            const shape = shapes[0];
            shape.nodes[0].cpOut = { x: 30, y: 10 };
            shape.nodes[1].cpIn = { x: 70, y: -10 };
        });

        it('should convert a curved segment to a line', () => {
            const command = new ConvertSegmentToLineCommand(shapeId, 0);
            command.execute();

            const shapes = useStore.getState().shapes;
            const updatedShape = shapes[0];
            const n1 = updatedShape.nodes[0];
            const n2 = updatedShape.nodes[1];

            // Handles should be retracted to anchors
            expect(n1.cpOut.x).toBe(n1.x);
            expect(n1.cpOut.y).toBe(n1.y);
            expect(n2.cpIn.x).toBe(n2.x);
            expect(n2.cpIn.y).toBe(n2.y);
        });

        it('should support undo', () => {
            const command = new ConvertSegmentToLineCommand(shapeId, 0);
            command.execute();
            command.undo();

            const shapes = useStore.getState().shapes;
            const updatedShape = shapes[0];
            const n1 = updatedShape.nodes[0];
            const n2 = updatedShape.nodes[1];

            expect(n1.cpOut.x).toBe(30);
            expect(n1.cpOut.y).toBe(10);
            expect(n2.cpIn.x).toBe(70);
            expect(n2.cpIn.y).toBe(-10);
        });
    });
});
