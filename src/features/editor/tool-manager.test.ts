import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ToolManager } from './tool-manager';
import { PathShape } from '../shapes/models/path';
import { PathNode } from '../shapes/models/node';
import { useStore } from '../../store/useStore';
import { InputManager } from './input';

describe('ToolManager', () => {
    let toolManager: ToolManager;
    let mockEditor: any;

    beforeEach(() => {
        useStore.setState({
            shapes: [],
            selectedShapes: [],
            selectedNodeIndices: [],
            tool: 'select',
            activeLayerId: 'layer-1'
        });

        const canvas = document.createElement('canvas');
        canvas.width = 800;
        canvas.height = 600;
        const ctx = canvas.getContext('2d')!;

        const inputManager = new InputManager(canvas);

        mockEditor = {
            canvas,
            ctx,
            renderer: { drawScene: vi.fn(), drawSnapMarker: vi.fn(), updateDashAnimation: vi.fn() },
            inputManager,
            history: { execute: vi.fn((cmd) => cmd.execute()), undo: vi.fn(), redo: vi.fn() },
            activeLayerId: 'layer-1',
            config: { handleRadius: 5 },
            getMousePos: vi.fn(() => ({ x: 50, y: 50 })),
            render: vi.fn(),
            startAction: vi.fn(),
            endAction: vi.fn(),
            groupSelected: vi.fn(),
            ungroupSelected: vi.fn(),
            get shapes() { return useStore.getState().shapes; },
            set shapes(v: any) { useStore.getState().setShapes(v); },
            get selectedShapes() {
                const state = useStore.getState();
                return state.shapes.filter(s => state.selectedShapes.includes(s.id));
            },
            set selectedShapes(v: any[]) { useStore.getState().setSelectedShapes(v.map(s => s.id)); },
            get selectedNodeIndices() { return useStore.getState().selectedNodeIndices; },
            set selectedNodeIndices(v: number[]) { useStore.getState().setSelectedNodeIndices(v); },
            selectedShape: null,
            activePath: null,
            previewPoint: null,
            selectionBox: null,
            previewOrigin: null,
            zoom: 1,
            pan: { x: 0, y: 0 },
            snapManager: {
                snapPoint: vi.fn(() => ({ type: 'none', point: { x: 0, y: 0 } })),
                clear: vi.fn(),
                settings: { enabled: false },
                activeSnap: null
            },
            toolManager: null as any,
        };

        toolManager = new ToolManager(mockEditor, inputManager);
        mockEditor.toolManager = toolManager;
    });

    describe('Delete/Backspace delegation to active tool', () => {
        it('should delegate Delete key to NodeEditTool when in node-edit mode', () => {
            const shape = new PathShape([
                new PathNode(0, 0),
                new PathNode(100, 0),
                new PathNode(100, 100),
                new PathNode(0, 100)
            ], true, 'layer-1');

            useStore.setState({
                shapes: [shape],
                selectedShapes: [shape.id],
                selectedNodeIndices: [1]
            });

            toolManager.setTool('node-edit');

            const deleteEvent = new KeyboardEvent('keydown', { key: 'Delete' });
            toolManager['handleKeyDown'](deleteEvent);

            const updatedShapes = useStore.getState().shapes;
            expect(updatedShapes[0].nodes!.length).toBe(3);
        });

        it('should delegate Backspace key to NodeEditTool when in node-edit mode', () => {
            const shape = new PathShape([
                new PathNode(0, 0),
                new PathNode(100, 0),
                new PathNode(100, 100),
                new PathNode(0, 100)
            ], true, 'layer-1');

            useStore.setState({
                shapes: [shape],
                selectedShapes: [shape.id],
                selectedNodeIndices: [2]
            });

            toolManager.setTool('node-edit');

            const backspaceEvent = new KeyboardEvent('keydown', { key: 'Backspace' });
            toolManager['handleKeyDown'](backspaceEvent);

            const updatedShapes = useStore.getState().shapes;
            expect(updatedShapes[0].nodes!.length).toBe(3);
        });

        it('should not crash when Delete is pressed with no selected nodes in node-edit mode', () => {
            const shape = new PathShape([
                new PathNode(0, 0),
                new PathNode(100, 0),
                new PathNode(100, 100)
            ], true, 'layer-1');

            useStore.setState({
                shapes: [shape],
                selectedShapes: [shape.id],
                selectedNodeIndices: []
            });

            toolManager.setTool('node-edit');

            const deleteEvent = new KeyboardEvent('keydown', { key: 'Delete' });
            expect(() => toolManager['handleKeyDown'](deleteEvent)).not.toThrow();

            expect(useStore.getState().shapes[0].nodes!.length).toBe(3);
        });
    });
});
