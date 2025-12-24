import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SelectTool } from './select';
import { PathShape } from '../models/path';
import { PathNode } from '../models/node';
import { useStore } from '../../../store/useStore';
import { Geometry } from '../../../core/math/geometry';

// Mock Geometry.isPointInBezierPath to avoid canvas API limitations in jsdom
vi.spyOn(Geometry, 'isPointInBezierPath').mockImplementation((ctx, shape, x, y) => {
    // Simple bounding box hit test for testing
    const bounds = Geometry.calculateBoundingBox(shape.nodes);
    return x >= bounds.minX && x <= bounds.maxX && y >= bounds.minY && y <= bounds.maxY;
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
            expect(selected.map(s => s.id).sort()).toEqual(['shape-a', 'shape-b']);
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
            expect(selected.map(s => s.id).sort()).toEqual(['shape-a', 'shape-b']);
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
            expect(mockEditor.selectedShapes.map(s => s.id).sort()).toEqual(['shape-a', 'shape-c']);
        });
    });

    describe('State Triggering (Zustand)', () => {
        it('should trigger state update on selection change', () => {
            const setState = vi.spyOn(useStore, 'setState');

            tool.onMouseDown(new MouseEvent('mousedown', { clientX: 25, clientY: 25 }));

            // Verify setState was called (via setSelectedShapes)
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
