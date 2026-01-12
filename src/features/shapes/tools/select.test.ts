import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SelectTool } from './select';
import { PathShape } from '../models/path';
import { PathNode } from '../models/node';
import { useStore } from '../../../store/useStore';
import { Geometry } from '../../../core/math/geometry';

// Mock Geometry.isPointInBezierPath to avoid canvas API limitations in jsdom
vi.spyOn(Geometry, 'isPointInBezierPath').mockImplementation((ctx, shape, x, y) => {
    // Simple bounding box hit test for testing
    const bounds = Geometry.calculateBoundingBox(shape.nodes || []);
    return x >= bounds.minX && x <= bounds.maxX && y >= bounds.minY && y <= bounds.maxY;
});

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
            zoom: 1,
            pan: { x: 0, y: 0 },
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

describe('SelectTool - Click Selection with Modifiers', () => {
    let mockEditor: any;
    let tool: SelectTool;
    let shapeA: PathShape;
    let shapeB: PathShape;
    let shapeC: PathShape;

    beforeEach(() => {
        // Reset Zustand store
        useStore.setState({
            shapes: [],
            selectedShapes: [],
            layers: [],
            activeLayerId: 'layer-1',
            zoom: 1,
            tool: 'select'
        });

        // Create test shapes
        shapeA = new PathShape([
            new PathNode(0, 0),
            new PathNode(50, 0),
            new PathNode(50, 50),
            new PathNode(0, 50)
        ], true);
        shapeA.id = 'shape-a';

        shapeB = new PathShape([
            new PathNode(100, 0),
            new PathNode(150, 0),
            new PathNode(150, 50),
            new PathNode(100, 50)
        ], true);
        shapeB.id = 'shape-b';

        shapeC = new PathShape([
            new PathNode(200, 0),
            new PathNode(250, 0),
            new PathNode(250, 50),
            new PathNode(200, 50)
        ], true);
        shapeC.id = 'shape-c';

        // Initialize store with shapes
        useStore.setState({
            shapes: [shapeA, shapeB, shapeC]
        });

        // Create mock editor
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d')!;

        mockEditor = {
            canvas,
            ctx,
            get shapes() {
                return useStore.getState().shapes;
            },
            get selectedShapes() {
                const { shapes, selectedShapes } = useStore.getState();
                return shapes.filter(s => selectedShapes.includes(s.id));
            },
            set selectedShapes(value) {
                const ids = value.map(s => s.id);
                useStore.getState().setSelectedShapes(ids);
            },
            tool: 'select',
            activePath: null,
            previewPoint: null,
            selectionBox: null,
            zoom: 1,
            pan: { x: 0, y: 0 },
            config: {
                handleRadius: 5,
                anchorSize: 8
            },
            getMousePos: vi.fn((e: MouseEvent) => ({ x: e.clientX, y: e.clientY })),
            render: vi.fn()
        };

        tool = new SelectTool(mockEditor);
    });

    describe('Single Click (no modifiers)', () => {
        it('should select only the clicked shape', () => {
            // Click on shape A
            const event = new MouseEvent('mousedown', { clientX: 25, clientY: 25 });
            tool.onMouseDown(event);

            const selected = mockEditor.selectedShapes;
            expect(selected.length).toBe(1);
            expect(selected[0].id).toBe('shape-a');
        });

        it('should deselect other shapes when clicking a new one', () => {
            // First select A
            mockEditor.selectedShapes = [shapeA];

            // Then click B
            const event = new MouseEvent('mousedown', { clientX: 125, clientY: 25 });
            tool.onMouseDown(event);

            const selected = mockEditor.selectedShapes;
            expect(selected.length).toBe(1);
            expect(selected[0].id).toBe('shape-b');
        });
    });

    describe('Shift + Click (add to selection)', () => {
        it('should add shape to existing selection', () => {
            // Select A first
            mockEditor.selectedShapes = [shapeA];

            // Shift+Click B
            const event = new MouseEvent('mousedown', {
                clientX: 125,
                clientY: 25,
                shiftKey: true
            });
            tool.onMouseDown(event);

            const selected = mockEditor.selectedShapes;
            expect(selected.length).toBe(2);
            expect(selected.map((s: PathShape) => s.id).sort()).toEqual(['shape-a', 'shape-b']);
        });

        it('should not duplicate if shape already selected', () => {
            // Select A first
            mockEditor.selectedShapes = [shapeA];

            // Shift+Click A again
            const event = new MouseEvent('mousedown', {
                clientX: 25,
                clientY: 25,
                shiftKey: true
            });
            tool.onMouseDown(event);

            const selected = mockEditor.selectedShapes;
            expect(selected.length).toBe(1);
            expect(selected[0].id).toBe('shape-a');
        });

        it('should allow building multi-selection', () => {
            // Click A
            tool.onMouseDown(new MouseEvent('mousedown', { clientX: 25, clientY: 25 }));
            expect(mockEditor.selectedShapes.length).toBe(1);

            // Shift+Click B
            tool.onMouseDown(new MouseEvent('mousedown', {
                clientX: 125,
                clientY: 25,
                shiftKey: true
            }));
            expect(mockEditor.selectedShapes.length).toBe(2);

            // Shift+Click C
            tool.onMouseDown(new MouseEvent('mousedown', {
                clientX: 225,
                clientY: 25,
                shiftKey: true
            }));
            expect(mockEditor.selectedShapes.length).toBe(3);
        });
    });

    describe('Ctrl/Cmd + Click (toggle selection)', () => {
        it('should add shape if not selected (Ctrl)', () => {
            mockEditor.selectedShapes = [shapeA];

            const event = new MouseEvent('mousedown', {
                clientX: 125,
                clientY: 25,
                ctrlKey: true
            });
            tool.onMouseDown(event);

            const selected = mockEditor.selectedShapes;
            expect(selected.length).toBe(2);
            expect(selected.map((s: PathShape) => s.id).sort()).toEqual(['shape-a', 'shape-b']);
        });

        it('should add shape if not selected (Cmd)', () => {
            mockEditor.selectedShapes = [shapeA];

            const event = new MouseEvent('mousedown', {
                clientX: 125,
                clientY: 25,
                metaKey: true
            });
            tool.onMouseDown(event);

            const selected = mockEditor.selectedShapes;
            expect(selected.length).toBe(2);
        });

        it('should remove shape if already selected', () => {
            mockEditor.selectedShapes = [shapeA, shapeB];

            const event = new MouseEvent('mousedown', {
                clientX: 25,
                clientY: 25,
                ctrlKey: true
            });
            tool.onMouseDown(event);

            const selected = mockEditor.selectedShapes;
            expect(selected.length).toBe(1);
            expect(selected[0].id).toBe('shape-b');
        });

        it('should handle toggle with multi-selection', () => {
            // Select A and B
            mockEditor.selectedShapes = [shapeA, shapeB];

            // Ctrl+Click C (add)
            tool.onMouseDown(new MouseEvent('mousedown', {
                clientX: 225,
                clientY: 25,
                ctrlKey: true
            }));
            expect(mockEditor.selectedShapes.length).toBe(3);

            // Ctrl+Click B (remove)
            tool.onMouseDown(new MouseEvent('mousedown', {
                clientX: 125,
                clientY: 25,
                ctrlKey: true
            }));
            expect(mockEditor.selectedShapes.length).toBe(2);
            expect(mockEditor.selectedShapes.map((s: PathShape) => s.id).sort()).toEqual(['shape-a', 'shape-c']);
        });
    });

    describe('State Triggering (Zustand)', () => {
        it('should trigger state update on selection change', () => {
            tool.onMouseDown(new MouseEvent('mousedown', { clientX: 25, clientY: 25 }));

            // Verify state update (via setSelectedShapes)
            expect(useStore.getState().selectedShapes).toEqual(['shape-a']);
        });

        it('should create new array references, not mutate', () => {
            const initialSelection = mockEditor.selectedShapes;

            tool.onMouseDown(new MouseEvent('mousedown', {
                clientX: 125,
                clientY: 25,
                shiftKey: true
            }));

            const newSelection = mockEditor.selectedShapes;
            // Reference should be different (new array)
            expect(newSelection).not.toBe(initialSelection);
        });
    });
});

describe('SelectTool - Multi-Select Move', () => {
    let mockEditor: any;
    let tool: SelectTool;
    let shape1: PathShape;
    let shape2: PathShape;

    beforeEach(() => {
        // Reset store
        useStore.setState({
            shapes: [],
            selectedShapes: [],
            tool: 'select'
        });

        // Create two shapes
        shape1 = new PathShape([
            new PathNode(0, 0),
            new PathNode(100, 0),
            new PathNode(100, 100),
            new PathNode(0, 100)
        ], true);
        shape1.id = 's1';

        shape2 = new PathShape([
            new PathNode(200, 0),
            new PathNode(300, 0),
            new PathNode(300, 100),
            new PathNode(200, 100)
        ], true);
        shape2.id = 's2';

        useStore.setState({
            shapes: [shape1, shape2]
        });

        mockEditor = {
            canvas: document.createElement('canvas'),
            ctx: document.createElement('canvas').getContext('2d'),
            get shapes() { return useStore.getState().shapes; },
            get selectedShapes() {
                const { shapes, selectedShapes } = useStore.getState();
                return shapes.filter(s => selectedShapes.includes(s.id));
            },
            set selectedShapes(value: any[]) {
                useStore.getState().setSelectedShapes(value.map(s => s.id));
            },
            tool: 'select',
            zoom: 1,
            pan: { x: 0, y: 0 },
            config: { handleRadius: 6, anchorSize: 8 },
            getMousePos: vi.fn((e: MouseEvent) => ({ x: e.clientX, y: e.clientY })),
            render: vi.fn(),
            history: { execute: vi.fn() }
        };

        tool = new SelectTool(mockEditor);

        // Mock hitTestShape
        (tool as any).hitTestShape = (shape: any, x: number, y: number) => {
            if (shape.id === 's1' && x < 100) return true;
            return false;
        };
    });

    it('should maintain multi-selection when clicking on an already selected shape', () => {
        // 1. Select both shapes
        mockEditor.selectedShapes = [shape1, shape2];

        // 2. Click on shape1 (x=10, y=10)
        // Without the fix, this would deselect shape2
        tool.onMouseDown({ clientX: 10, clientY: 10, ctrlKey: false, shiftKey: false, metaKey: false } as MouseEvent);

        // EXPECTATION: Both shapes should still be selected
        expect(mockEditor.selectedShapes.length).toBe(2);
        expect(mockEditor.selectedShapes.map((s: any) => s.id)).toContain('s1');
        expect(mockEditor.selectedShapes.map((s: any) => s.id)).toContain('s2');

        // 3. Simulate Drag
        tool.onMouseMove({ clientX: 60, clientY: 60 } as MouseEvent);

        // 4. Mouse Up
        tool.onMouseUp({ clientX: 60, clientY: 60 } as MouseEvent);

        // Verify move
        // Since we are mocking everything, we mainly care that selection was preserved
        expect(tool.isDraggingShape).toBe(false);
    });
});
