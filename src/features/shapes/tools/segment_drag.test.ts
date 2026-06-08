
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NodeEditTool } from './node';
import { CanvasController } from '../../editor/controller';
import { PathShape } from '../models/path';
import { PathNode } from '../models/node';

// Mock CanvasController
class MockEditor extends CanvasController {
    constructor() {
        const mockCanvas = {
            getContext: vi.fn(() => ({
                save: vi.fn(),
                restore: vi.fn(),
                beginPath: vi.fn(),
                moveTo: vi.fn(),
                bezierCurveTo: vi.fn(),
                isPointInPath: vi.fn(() => false),
                isPointInStroke: vi.fn(() => false),
                clearRect: vi.fn(),
                fillRect: vi.fn(),
                strokeRect: vi.fn(),
                scale: vi.fn(),
                translate: vi.fn(),
                setTransform: vi.fn()
            })),
            style: {},
            width: 800,
            height: 600,
            addEventListener: vi.fn(),
            removeEventListener: vi.fn()
        } as any;
        super({ background: mockCanvas, content: mockCanvas, overlay: mockCanvas });
        this.canvas = mockCanvas;
        this.ctx = mockCanvas.getContext('2d');
        this.selectedNodeIndices = [];
        this.history = { execute: vi.fn() } as any;
        this.render = vi.fn(); // This shadow might be late, but the method below handles super calls
        this.getMousePos = vi.fn((e) => ({ x: e.clientX, y: e.clientY }));
        this.config = { handleRadius: 4, anchorSize: 6 } as any;
        this.zoom = 1;
    }

    render() {
        // Stub
    }

    fitToScreen() {
        // Stub to prevent rendering
    }
}

describe('NodeEditTool - Segment Dragging', () => {
    let tool: NodeEditTool;
    let editor: any;
    let shape: PathShape;

    beforeEach(() => {
        editor = new MockEditor();
        tool = new NodeEditTool(editor);

        // Create a simple path: (0,0) --[Line]--> (100,0)
        shape = new PathShape();
        const n1 = new PathNode(0, 0);
        const n2 = new PathNode(100, 0);
        shape.nodes = [n1, n2];
        shape.closed = false;
        shape.nodes = [n1, n2];
        shape.closed = false;
        editor.shapes = [shape];
        editor.selectedShapes = [shape];
    });

    it('should detect segment hit on mouse down', () => {
        // Mock hit tester methods
        (tool as any).hitTester.getHitAnchor = vi.fn().mockReturnValue(-1);
        (tool as any).hitTester.getHitSegment = vi.fn().mockReturnValue({ index: 0, t: 0.5 });

        const event = { clientX: 50, clientY: 5, shiftKey: false } as MouseEvent;
        tool.onMouseDown(event);

        const state = (tool as any).state;
        expect(state.kind).toBe('dragging');
        expect(state.type).toBe('SEGMENT');
        expect(state.nodeIndex).toBe(0);
        expect(state.dragStartMouse).toEqual({ x: 50, y: 5 });
    });

    it('should drag segment by moving adjacent handles', () => {
        const n1 = shape.nodes[0];
        const n2 = shape.nodes[1];

        // Initial state
        n1.cpOut.x = 0; n1.cpOut.y = 0;
        n2.cpIn.x = 100; n2.cpIn.y = 0;

        // Force drag state
        const initialNodes = new Map();
        initialNodes.set(0, n1.clone());
        initialNodes.set(1, n2.clone());

        (tool as any).state = {
            kind: 'dragging',
            type: 'SEGMENT',
            nodeIndex: 0,
            initialNodes: initialNodes,
            dragStartMouse: { x: 50, y: 0 }
        };

        // Drag to (50, 20) -> Delta (0, 20)
        const mouseEvent = { clientX: 50, clientY: 20 } as MouseEvent;
        tool.onMouseMove(mouseEvent);

        // Expect handles to move by delta
        expect(n1.cpOut.x).toBe(0);
        expect(n1.cpOut.y).toBe(20);

        expect(n2.cpIn.x).toBe(100);
        expect(n2.cpIn.y).toBe(20);
    });

    it('should commit MoveNodeCommand on mouse up', () => {
        const initialNodes = new Map();
        initialNodes.set(0, shape.nodes[0].clone());
        initialNodes.set(1, shape.nodes[1].clone());

        (tool as any).state = {
            kind: 'dragging',
            type: 'SEGMENT',
            nodeIndex: 0,
            initialNodes: initialNodes,
            dragStartMouse: { x: 50, y: 0 }
        };

        // Simulate change
        shape.nodes[0].cpOut.y = 20;
        shape.nodes[1].cpIn.y = 20;

        tool.onMouseUp();

        expect(editor.history.execute).toHaveBeenCalled();
        const call = editor.history.execute.mock.calls[0][0];
        expect(call.constructor.name).toBe('MoveNodeCommand');
        expect((call as any).changes.length).toBe(2);
    });
});
