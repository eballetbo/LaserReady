import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SelectTool } from './select';
import { PathShape } from '../models/path';
import { PathNode } from '../models/node';
import { useStore } from '../../../store/useStore';

describe('SelectTool - Resize Bug', () => {
    let mockEditor: any;
    let tool: SelectTool;
    let testShape: PathShape;

    beforeEach(() => {
        // Reset store
        useStore.setState({
            shapes: [],
            selectedShapes: [],
            tool: 'select'
        });

        // Create mock editor context
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d')!;

        // Create a simple square shape
        testShape = new PathShape([
            new PathNode(0, 0),
            new PathNode(100, 0),
            new PathNode(100, 100),
            new PathNode(0, 100)
        ], true);
        testShape.id = 'test-shape';

        useStore.setState({
            shapes: [testShape],
            selectedShapes: [testShape.id]
        });

        mockEditor = {
            canvas,
            ctx,
            get shapes() { return useStore.getState().shapes; },
            get selectedShapes() {
                const { shapes, selectedShapes } = useStore.getState();
                return shapes.filter(s => selectedShapes.includes(s.id));
            },
            set selectedShapes(value: any[]) {
                useStore.getState().setSelectedShapes(value.map(s => s.id));
            },
            tool: 'select',
            activePath: null,
            previewPoint: null,
            config: {
                handleRadius: 5,
                anchorSize: 8
            },
            getMousePos: vi.fn((e: MouseEvent) => ({ x: e.clientX, y: e.clientY })),
            render: vi.fn(),
            moveSelected: vi.fn(),
            history: {
                execute: vi.fn((cmd: any) => cmd.execute()),
                undo: vi.fn(),
                redo: vi.fn()
            },
            renderer: {
                drawScene: vi.fn()
            }
        };

        tool = new SelectTool(mockEditor);
    });

    it('🔴 RED: should maintain selection after resize operation', () => {
        // Step 1: User clicks on the 'w' (west) resize handle
        const handleX = 0;  // minX of the shape
        const handleY = 50; // cy of the shape

        const mouseDownEvent = new MouseEvent('mousedown', {
            clientX: handleX,
            clientY: handleY
        });
        tool.onMouseDown(mouseDownEvent);

        // Verify resize mode activated
        expect(tool.isResizing).toBe(true);
        expect(tool.resizeHandle).toBe('w');

        // Step 2: User drags to resize
        const mouseMoveEvent = new MouseEvent('mousemove', {
            clientX: handleX - 50, // Drag left to make wider
            clientY: handleY
        });
        tool.onMouseMove(mouseMoveEvent);

        // Shape should have been resized
        expect(mockEditor.render).toHaveBeenCalled();

        // Step 3: User releases mouse
        const mouseUpEvent = new MouseEvent('mouseup', {
            clientX: handleX - 50,
            clientY: handleY
        });
        tool.onMouseUp(mouseUpEvent);

        // 🔴 THIS WILL FAIL: Selection should still be active after resize
        expect(mockEditor.selectedShapes).toContain(testShape);
        expect(mockEditor.selectedShapes.length).toBe(1);

        // 🔴 THIS WILL FAIL: Resize state should be properly cleared
        expect(tool.isResizing).toBe(false);
        expect(tool.isDraggingShape).toBe(false);
        expect(tool.dragStart).toBeNull();
    });

    it('🔴 RED: should not confuse resize with move operation', () => {
        // Click on resize handle
        const handleX = 100; // maxX
        const handleY = 50;  // cy

        tool.onMouseDown(new MouseEvent('mousedown', {
            clientX: handleX,
            clientY: handleY
        }));

        expect(tool.isResizing).toBe(true);
        expect(tool.isDraggingShape).toBe(false); // Should NOT be dragging

        // Move mouse - should trigger resize, not move
        tool.onMouseMove(new MouseEvent('mousemove', {
            clientX: handleX + 30,
            clientY: handleY
        }));

        // 🔴 THIS WILL FAIL: moveSelected should NOT have been called
        expect(mockEditor.moveSelected).not.toHaveBeenCalled();
    });
});
