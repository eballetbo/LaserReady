import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PathShape } from '../models/path';
import { CanvasRenderer } from '../../editor/render/renderer';
import { useStore } from '../../../store/useStore';
import { UpdateStyleCommand } from './style';

describe('Shape Styling Logic', () => {
    beforeEach(() => {
        // Reset Store
        useStore.setState({ shapes: [], selectedShapes: [] });
    });

    it('should allow setting style properties on PathShape', () => {
        const shape = new PathShape([], true);

        // Default (undefined)
        expect(shape.strokeColor).toBeUndefined();
        expect(shape.fillColor).toBeUndefined();

        // Update
        shape.strokeColor = '#FF0000'; // Red
        shape.strokeWidth = 2;
        shape.fillColor = 'transparent';

        expect(shape.strokeColor).toBe('#FF0000');
        expect(shape.strokeWidth).toBe(2);
    });

    it('renderer should respect overrides', () => {
        // Mock Canvas Context
        const mockCtx = {
            save: vi.fn(),
            restore: vi.fn(),
            beginPath: vi.fn(),
            closePath: vi.fn(),
            moveTo: vi.fn(),
            lineTo: vi.fn(),
            bezierCurveTo: vi.fn(),
            stroke: vi.fn(),
            fill: vi.fn(),
            translate: vi.fn(),
            scale: vi.fn(),
            setLineDash: vi.fn(),
            clearRect: vi.fn(),
        } as any;

        const canvas = {
            getContext: () => mockCtx,
            width: 800,
            height: 600
        } as any;

        const renderer = new CanvasRenderer(canvas);

        // 1. Test Default (Black from Layer)
        const defaultShape = new PathShape([], true, 'layer-1');
        const config = {
            colorFill: '#defaultFill',
            colorSelection: '#sel',
            gridSpacing: 10,
            anchorSize: 8,
            handleRadius: 5,
            colorAnchor: '#aaa',
            colorHandle: '#bbb',
            colorHandleLine: '#ccc',
            colorStroke: '#333'
        };
        const layers = [{ id: 'layer-1', name: 'Layer 1', color: '#000000', mode: 'CUT' as any }]; // Default Black

        // We need nodes to draw
        defaultShape.nodes = [{ x: 0, y: 0, cpIn: { x: 0, y: 0 }, cpOut: { x: 0, y: 0 } } as any, { x: 10, y: 10, cpIn: { x: 10, y: 10 }, cpOut: { x: 10, y: 10 } } as any];

        renderer.drawScene(
            [defaultShape],
            [],
            layers,
            config,
            'select',
            null,
            null,
            null
        );

        // Expect strokeStyle to be layer color #000000
        expect(mockCtx.strokeStyle).toBe('#000000');


        // 2. Test Override (Red Cut)
        const redShape = new PathShape([], true, 'layer-1');
        redShape.nodes = defaultShape.nodes;
        redShape.strokeColor = '#FF0000';

        renderer.drawScene(
            [redShape],
            [],
            layers,
            config,
            'select',
            null,
            null,
            null
        );

        expect(mockCtx.strokeStyle).toBe('#FF0000');

        // 3. Test Override (Blue Score)
        const blueShape = new PathShape([], true, 'layer-1');
        blueShape.nodes = defaultShape.nodes;
        blueShape.strokeColor = '#0000FF';

        renderer.drawScene(
            [blueShape],
            [],
            layers,
            config,
            'select',
            null,
            null,
            null
        );

        expect(mockCtx.strokeStyle).toBe('#0000FF');
    });

    it('UpdateStyleCommand should update shape properties', () => {
        // Setup initial state
        const shape = new PathShape([], true, 'layer-1');
        useStore.setState({ shapes: [shape], selectedShapes: [shape.id] });

        const command = new UpdateStyleCommand([shape], { strokeColor: '#FF0000', strokeWidth: 5, fillColor: 'blue' });
        command.execute();

        const shapes = useStore.getState().shapes;
        const updatedShape = shapes[0] as PathShape;

        expect(updatedShape.strokeColor).toBe('#FF0000');
        expect(updatedShape.strokeWidth).toBe(5);
        expect(updatedShape.fillColor).toBe('blue');

        // Test Undo
        command.undo();
        const undoneShapes = useStore.getState().shapes;
        const undoneShape = undoneShapes[0] as PathShape;
        expect(undoneShape.strokeColor).toBeUndefined();
        expect(undoneShape.strokeWidth).toBeUndefined();
    });
});
