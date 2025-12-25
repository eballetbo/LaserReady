import { describe, it, expect, vi, beforeEach } from 'vitest';
import { HistoryManager } from './history';
import { RectTool } from '../shapes/registry';
import { SelectTool } from '../shapes/tools/select';
import { PathShape } from '../shapes/models/path';
import { PathNode } from '../shapes/models/node';
import { useStore } from '../../store/useStore';

// Mock getMousePos since we don't have a real DOM/Canvas
const mockGetMousePos = (e: MouseEvent) => ({ x: e.clientX, y: e.clientY });

describe('Undo/Redo Integration Tests', () => {
    let history: HistoryManager;
    let mockEditor: any;

    beforeEach(() => {
        // Reset Store
        useStore.setState({ shapes: [], selectedShapes: [] });

        history = new HistoryManager();

        const mockCtx = {
            save: vi.fn(),
            restore: vi.fn(),
            beginPath: vi.fn(),
            moveTo: vi.fn(),
            lineTo: vi.fn(),
            bezierCurveTo: vi.fn(),
            closePath: vi.fn(),
            isPointInPath: vi.fn(() => true), // hit test always passes
            fill: vi.fn(),
            stroke: vi.fn(),
            translate: vi.fn(),
            rotate: vi.fn(),
            scale: vi.fn()
        };

        mockEditor = {
            canvas: { style: {}, getContext: () => mockCtx } as any,
            ctx: mockCtx,
            history: history,
            activeLayerId: 'layer-1',
            config: { handleRadius: 5 },
            getMousePos: vi.fn(mockGetMousePos),
            render: vi.fn(),

            // Proxy properties to store
            get shapes() { return useStore.getState().shapes; },
            set shapes(v) { useStore.getState().setShapes(v); },

            get selectedShapes() {
                const state = useStore.getState();
                return state.shapes.filter(s => state.selectedShapes.includes(s.id));
            },
            set selectedShapes(v: any[]) { useStore.getState().setSelectedShapes(v.map(s => s.id)); },

            // Temporary property used by Creation Tools
            selectedShape: null
        };
    });

    it('should correctly handle multiple shape creations and undo them one by one', () => {
        const tool = new RectTool(mockEditor);
        const createdIds: string[] = [];

        // 1. Create 3 Shapes
        for (let i = 0; i < 3; i++) {
            // MouseDown
            const downEvent = new MouseEvent('mousedown', { clientX: i * 10, clientY: i * 10 });
            tool.onMouseDown(downEvent);
            const shape = mockEditor.selectedShape;
            createdIds.push(shape.id);

            // Drag a bit (MouseMove)
            tool.onMouseMove(new MouseEvent('mousemove', { clientX: i * 10 + 20, clientY: i * 10 + 20 }));

            // MouseUp (Commit)
            tool.onMouseUp(new MouseEvent('mouseup'));

            // Assert: Shape is in store, history stack increased
            expect(mockEditor.shapes.length).toBe(i + 1);
            expect(history['undoStack'].length).toBe(i + 1);
            expect(mockEditor.selectedShape).toBeNull(); // CRITICAL FIX VERIFICATION
        }

        expect(mockEditor.shapes.length).toBe(3);

        // 2. Undo 3 times
        history.undo();
        expect(mockEditor.shapes.length).toBe(2);
        expect(mockEditor.shapes.find((s: any) => s.id === createdIds[2])).toBeUndefined();

        history.undo();
        expect(mockEditor.shapes.length).toBe(1);
        expect(mockEditor.shapes.find((s: any) => s.id === createdIds[1])).toBeUndefined();

        history.undo();
        expect(mockEditor.shapes.length).toBe(0);

        // 3. Redo 3 times
        history.redo();
        expect(mockEditor.shapes.length).toBe(1);
        expect(mockEditor.shapes[0].id).toBe(createdIds[0]);

        history.redo();
        expect(mockEditor.shapes.length).toBe(2);

        history.redo();
        expect(mockEditor.shapes.length).toBe(3);
    });

    it('should create only one history entry for a continuous drag move (granularity)', () => {
        // Setup: One shape in store
        const shape = new PathShape([
            new PathNode(0, 0), new PathNode(100, 0),
            new PathNode(100, 100), new PathNode(0, 100)
        ], true);
        useStore.getState().setShapes([shape]);

        const tool = new SelectTool(mockEditor);

        // 1. Select the shape
        tool.onMouseDown(new MouseEvent('mousedown', { clientX: 50, clientY: 50 }));
        expect(mockEditor.selectedShapes.length).toBe(1);

        // 2. Drag (Multiple MouseMoves)
        tool.onMouseMove(new MouseEvent('mousemove', { clientX: 60, clientY: 50 })); // +10px
        tool.onMouseMove(new MouseEvent('mousemove', { clientX: 70, clientY: 50 })); // +20px total
        tool.onMouseMove(new MouseEvent('mousemove', { clientX: 100, clientY: 50 })); // +50px total

        // History should NOT change during drag
        expect(history['undoStack'].length).toBe(0);

        // 3. MouseUp (Commit)
        tool.onMouseUp(new MouseEvent('mouseup', { clientX: 100, clientY: 50 }));

        // History should now have EXACTLY 1 entry
        expect(history['undoStack'].length).toBe(1);

        // Verify Move
        const movedShape = mockEditor.shapes[0];
        // Original x=0. Total delta = 100 - 50 = 50. New X should be 0 + 50 = 50?
        // Wait, onMouseDown was at 50,50.
        // Node 0 was at 0,0.
        // Final mouse at 100,50. Delta X = 50.
        // Node 0 should be at 50,0.
        expect(movedShape.nodes[0].x).toBe(50);

        // 4. Undo
        history.undo();
        const undoneShape = mockEditor.shapes[0];
        expect(undoneShape.nodes[0].x).toBe(0); // Back to start
        expect(history['undoStack'].length).toBe(0);
    });
});
