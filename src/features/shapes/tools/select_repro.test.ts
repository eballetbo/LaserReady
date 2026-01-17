import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Geometry } from '../../../core/math/geometry';
import { PathShape } from '../models/path';
import { PathNode } from '../models/node';
import { ChangeNodeTypeCommand, DeleteNodeCommand } from '../commands/node';
import { useStore } from '../../../store/useStore';

// Mock Canvas Context
const mockCtx = {
    save: vi.fn(),
    restore: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    bezierCurveTo: vi.fn(),
    lineTo: vi.fn(),
    closePath: vi.fn(),
    isPointInPath: vi.fn(),
    isPointInStroke: vi.fn(),
    lineWidth: 1
} as unknown as CanvasRenderingContext2D;

describe('Hit Testing Reproduction', () => {

    beforeEach(() => {
        vi.clearAllMocks();
        // Default behavior: isPointInStroke returns true if we say so, 
        // but since we can't easily mock complex geometry hit testing in jsdom/node 
        // without a real canvas, we might need to rely on the fact that the code CALLS the methods correctly.
        // OR we can trust that isPointInBezierPath logic is sound IF it uses the NEW coordinates.
    });

    it('should use updated node coordinates for hit testing', () => {
        // 1. Create a path: (0,0) -> (100,0)
        const node1 = new PathNode(0, 0);
        node1.cpIn = { x: 0, y: 0 };
        node1.cpOut = { x: 0, y: 0 };

        const node2 = new PathNode(100, 0); // Corner, line
        node2.cpIn = { x: 100, y: 0 };
        node2.cpOut = { x: 100, y: 0 };

        const shape = new PathShape([node1, node2], false);

        // 2. Modify node 2 to (100, 100) -> Diagonal line
        shape.nodes[1].x = 100;
        shape.nodes[1].y = 100;

        // 3. Call isPointInBezierPath
        Geometry.isPointInBezierPath(mockCtx, shape, 50, 50, 5);

        // 4. Verify ctx.bezierCurveTo was called with NEW coords
        // The loop in geometry.ts:
        // moveTo(node0)
        // bezierCurveTo(node0.cpOut, node1.cpIn, node1)

        expect(mockCtx.moveTo).toHaveBeenCalledWith(0, 0);
        expect(mockCtx.bezierCurveTo).toHaveBeenCalledWith(
            0, 0,    // cpOut of node 0
            100, 0,  // cpIn of node 1 (we didn't update cpIn yet!)
            100, 100 // x,y of node 1
        );

        // Wait, if I only updated x/y but NOT cpIn/cpOut? 
        // In `MoveNodeCommand`, we update everything.
    });

    it('should update control points in MoveNodeCommand logic', () => {
        // MoveNodeCommand updates x, y, cpIn, cpOut.
        const node1 = new PathNode(0, 0);
        const node2 = new PathNode(100, 0);
        const shape = new PathShape([node1, node2], false);

        // Simulate MoveNodeCommand execution
        const newNodeState = { x: 100, y: 100, cpIn: { x: 90, y: 90 }, cpOut: { x: 110, y: 110 } };

        const targetNode = shape.nodes[1];
        targetNode.x = newNodeState.x;
        targetNode.y = newNodeState.y;
        targetNode.cpIn = newNodeState.cpIn;
        targetNode.cpOut = newNodeState.cpOut; // This is a reference assignment if coming from object
        // But checking `MoveNodeCommand`:
        // targetNode.cpOut.x = this.newNode.cpOut.x;
        // So it copies values. 

        // Let's verify geometry calls
        Geometry.isPointInBezierPath(mockCtx, shape, 50, 50, 5);

        expect(mockCtx.bezierCurveTo).toHaveBeenCalledWith(
            0, 0,
            90, 90,
            100, 100
        );
    });

    it('should maintain prototype after ChangeNodeTypeCommand', () => {
        // This ensures the shape remains a PathShape and has clone/getBounds methods
        const node1 = new PathNode(0, 0);
        const node2 = new PathNode(100, 0);
        const shape = new PathShape([node1, node2], false);
        const shapeId = shape.id;

        // Mock store
        useStore.setState({ shapes: [shape] });

        // Change type of node 0 to smooth
        const cmd = new ChangeNodeTypeCommand(shapeId, 0, 'smooth');
        cmd.execute();

        const updatedShape = useStore.getState().shapes[0];

        // Check if it is still a PathShape instance (has clone)
        expect(updatedShape).toBeInstanceOf(PathShape);
        expect(typeof updatedShape.clone).toBe('function');
        expect(typeof updatedShape.getBounds).toBe('function');
    });
    it('should maintain prototype after DeleteNodeCommand', () => {
        // Create shape with 3 nodes so we can delete one
        const node1 = new PathNode(0, 0);
        const node2 = new PathNode(100, 0);
        const node3 = new PathNode(100, 100);
        const shape = new PathShape([node1, node2, node3], false);
        const shapeId = shape.id;

        useStore.setState({ shapes: [shape] });

        const cmd = new DeleteNodeCommand(shapeId, 1); // Delete middle node
        cmd.execute();

        const updatedShape = useStore.getState().shapes[0];

        expect(updatedShape).toBeInstanceOf(PathShape);
        expect(typeof updatedShape.clone).toBe('function');
        expect(updatedShape.nodes!.length).toBe(2);
    });
});

