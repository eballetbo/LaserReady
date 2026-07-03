import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NodeEditTool } from './node';
import { CanvasController } from '../../editor/controller';
import { PathShape } from '../models/path';
import { PathNode } from '../models/node';
import { useStore } from '../../../store/useStore';
import { createMockContext } from '../../../test-utils/mock-editor';

// Mock CanvasController, following the pattern used in segment_drag.test.ts
class MockEditor extends CanvasController {
    constructor() {
        const mockCanvas = {
            getContext: vi.fn(() => createMockContext()),
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
        this.history = { execute: vi.fn((cmd) => cmd.execute()) } as any;
        this.render = vi.fn();
        this.getMousePos = vi.fn((e: any) => ({ x: e.clientX, y: e.clientY }));
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

describe('NodeEditTool', () => {
    let tool: NodeEditTool;
    let editor: any;
    let shape: PathShape;

    beforeEach(() => {
        useStore.setState({
            selectedNodeIndices: [],
            selectedSegmentIndices: [],
            hoveredNodeIndex: -1,
            hoveredSegmentIndex: -1
        });

        editor = new MockEditor();
        tool = new NodeEditTool(editor);

        // A simple 100x100 closed rectangle with straight (non-curved) edges.
        shape = new PathShape([
            new PathNode(0, 0),
            new PathNode(100, 0),
            new PathNode(100, 100),
            new PathNode(0, 100)
        ], true);
        editor.shapes = [shape];
        editor.selectedShapes = [shape];
    });

    describe('node selection', () => {
        it('clicking an anchor selects it', () => {
            tool.onMouseDown({ clientX: 0, clientY: 0, shiftKey: false } as MouseEvent);

            expect(editor.selectedNodeIndices).toEqual([0]);
        });

        it('shift+click adds a second node to the selection', () => {
            tool.onMouseDown({ clientX: 0, clientY: 0, shiftKey: false } as MouseEvent);
            tool.onMouseUp();
            (tool as any).lastClickTime = 0; // avoid false double-click detection between clicks
            tool.onMouseDown({ clientX: 100, clientY: 0, shiftKey: true } as MouseEvent);

            expect(editor.selectedNodeIndices.sort()).toEqual([0, 1]);
        });

        it('shift+click on an already-selected node removes it from the selection', () => {
            tool.onMouseDown({ clientX: 0, clientY: 0, shiftKey: false } as MouseEvent);
            tool.onMouseUp();
            (tool as any).lastClickTime = 0;
            tool.onMouseDown({ clientX: 0, clientY: 0, shiftKey: true } as MouseEvent);

            expect(editor.selectedNodeIndices).toEqual([]);
        });

        it('selecting a node clears any active segment selection', () => {
            useStore.getState().setSelectedSegmentIndices([0]);

            tool.onMouseDown({ clientX: 0, clientY: 0, shiftKey: false } as MouseEvent);

            expect(useStore.getState().selectedSegmentIndices).toEqual([]);
        });

        it('clicking empty space deselects all nodes', () => {
            editor.selectedNodeIndices = [0];

            tool.onMouseDown({ clientX: 500, clientY: 500, shiftKey: false } as MouseEvent);

            expect(editor.selectedNodeIndices).toEqual([]);
        });
    });

    describe('segment selection', () => {
        it('clicking a segment (not an anchor) selects the segment instead of nodes', () => {
            // Midpoint of the top edge, between (0,0) and (100,0).
            tool.onMouseDown({ clientX: 50, clientY: 0, shiftKey: false } as MouseEvent);

            expect(useStore.getState().selectedSegmentIndices).toEqual([0]);
            expect(editor.selectedNodeIndices).toEqual([]);
        });

        it('shift+click toggles a second segment into the selection', () => {
            tool.onMouseDown({ clientX: 50, clientY: 0, shiftKey: false } as MouseEvent);
            tool.onMouseUp();
            (tool as any).lastClickTime = 0; // avoid false double-click detection between clicks
            tool.onMouseDown({ clientX: 100, clientY: 50, shiftKey: true } as MouseEvent);

            expect(useStore.getState().selectedSegmentIndices.sort()).toEqual([0, 1]);
        });
    });

    describe('dragging a node', () => {
        it('drags a selected anchor node and commits a MoveNodeCommand on mouse up', () => {
            tool.onMouseDown({ clientX: 0, clientY: 0, shiftKey: false } as MouseEvent);
            tool.onMouseMove({ clientX: 20, clientY: 20 } as MouseEvent);

            expect(shape.nodes[0].x).toBe(20);
            expect(shape.nodes[0].y).toBe(20);

            tool.onMouseUp();

            expect(editor.history.execute).toHaveBeenCalled();
            const call = editor.history.execute.mock.calls[0][0];
            expect(call.constructor.name).toBe('MoveNodeCommand');
        });
    });

    describe('keyboard shortcuts', () => {
        it('arrow key nudges the selected node by 1px', () => {
            editor.selectedNodeIndices = [0];

            tool.onKeyDown({ key: 'ArrowRight', shiftKey: false, preventDefault: vi.fn() } as unknown as KeyboardEvent);

            expect(shape.nodes[0].x).toBe(1);
        });

        it('shift+arrow nudges the selected node by 10px', () => {
            editor.selectedNodeIndices = [0];

            tool.onKeyDown({ key: 'ArrowRight', shiftKey: true, preventDefault: vi.fn() } as unknown as KeyboardEvent);

            expect(shape.nodes[0].x).toBe(10);
        });

        it('"s" sets the selected node type to smooth', () => {
            editor.selectedNodeIndices = [0];

            tool.onKeyDown({ key: 's' } as KeyboardEvent);

            expect(editor.selectedShapes[0].nodes[0].type).toBe('smooth');
        });

        it('"c" sets the selected node type to corner', () => {
            shape.nodes[0].type = 'smooth';
            editor.selectedNodeIndices = [0];

            tool.onKeyDown({ key: 'c' } as KeyboardEvent);

            expect(editor.selectedShapes[0].nodes[0].type).toBe('corner');
        });

        it('Delete removes the selected node from the path', () => {
            editor.selectedNodeIndices = [0];

            tool.onKeyDown({ key: 'Delete' } as KeyboardEvent);

            expect(editor.selectedShapes[0].nodes.length).toBe(3);
            expect(editor.selectedNodeIndices).toEqual([]);
        });
    });

    describe('double-click', () => {
        it('double-clicking an anchor deletes that node', () => {
            tool.onMouseDown({ clientX: 0, clientY: 0, shiftKey: false } as MouseEvent);
            tool.onMouseUp();
            tool.onMouseDown({ clientX: 0, clientY: 0, shiftKey: false } as MouseEvent);

            expect(editor.selectedShapes[0].nodes.length).toBe(3);
        });

        it('double-clicking a segment inserts a new node', () => {
            tool.onMouseDown({ clientX: 50, clientY: 0, shiftKey: false } as MouseEvent);
            tool.onMouseUp();
            tool.onMouseDown({ clientX: 50, clientY: 0, shiftKey: false } as MouseEvent);

            expect(editor.selectedShapes[0].nodes.length).toBe(5);
        });
    });

    describe('hover state', () => {
        it('hovering over a node sets hoveredNodeIndex in the store', () => {
            tool.onMouseMove({ clientX: 0, clientY: 0 } as MouseEvent);

            expect(useStore.getState().hoveredNodeIndex).toBe(0);
        });

        it('hovering over a segment (away from any node) sets hoveredSegmentIndex', () => {
            tool.onMouseMove({ clientX: 50, clientY: 0 } as MouseEvent);

            expect(useStore.getState().hoveredSegmentIndex).toBe(0);
            expect(useStore.getState().hoveredNodeIndex).toBe(-1);
        });
    });

    describe('onDeactivate', () => {
        it('clears node/segment selection and hover state', () => {
            editor.selectedNodeIndices = [0];
            useStore.getState().setSelectedSegmentIndices([0]);
            useStore.getState().setHoveredNodeIndex(1);
            useStore.getState().setHoveredSegmentIndex(1);

            tool.onDeactivate();

            expect(editor.selectedNodeIndices).toEqual([]);
            expect(useStore.getState().selectedSegmentIndices).toEqual([]);
            expect(useStore.getState().hoveredNodeIndex).toBe(-1);
            expect(useStore.getState().hoveredSegmentIndex).toBe(-1);
        });
    });
});
