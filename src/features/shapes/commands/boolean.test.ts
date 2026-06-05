import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BooleanCommand } from './boolean';
import { PathShape } from '../models/path';
import { PathNode } from '../models/node';
import { useStore } from '../../../store/useStore';
import { BooleanOperations } from '../../../core/math/boolean';

describe('BooleanCommand', () => {
    let shape1: PathShape;
    let shape2: PathShape;

    beforeEach(() => {
        shape1 = new PathShape([
            new PathNode(0, 0), new PathNode(100, 0),
            new PathNode(100, 100), new PathNode(0, 100)
        ], true, 'layer-1');

        shape2 = new PathShape([
            new PathNode(50, 50), new PathNode(150, 50),
            new PathNode(150, 150), new PathNode(50, 150)
        ], true, 'layer-1');

        useStore.setState({
            shapes: [shape1, shape2],
            selectedShapes: [shape1.id, shape2.id],
            activeLayerId: 'layer-1'
        });
    });

    it('should preserve original shapes when boolean operation returns null', () => {
        vi.spyOn(BooleanOperations, 'perform').mockReturnValueOnce(null);

        const command = new BooleanCommand([shape1, shape2], 'subtract');
        command.execute();

        const { shapes } = useStore.getState();
        expect(shapes.length).toBe(2);
        expect(shapes.find(s => s.id === shape1.id)).toBeDefined();
        expect(shapes.find(s => s.id === shape2.id)).toBeDefined();
    });

    it('should preserve original shapes when boolean operation returns empty array', () => {
        vi.spyOn(BooleanOperations, 'perform').mockReturnValueOnce([]);

        const command = new BooleanCommand([shape1, shape2], 'intersect');
        command.execute();

        const { shapes } = useStore.getState();
        expect(shapes.length).toBe(2);
        expect(shapes.find(s => s.id === shape1.id)).toBeDefined();
        expect(shapes.find(s => s.id === shape2.id)).toBeDefined();
    });

    it('should replace originals with result on successful operation', () => {
        const command = new BooleanCommand([shape1, shape2], 'unite');
        command.execute();

        const { shapes } = useStore.getState();
        expect(shapes.find(s => s.id === shape1.id)).toBeUndefined();
        expect(shapes.find(s => s.id === shape2.id)).toBeUndefined();
        expect(shapes.length).toBeGreaterThan(0);
    });

    it('should restore originals on undo after successful operation', () => {
        const command = new BooleanCommand([shape1, shape2], 'unite');
        command.execute();

        expect(useStore.getState().shapes.find(s => s.id === shape1.id)).toBeUndefined();

        command.undo();

        const { shapes } = useStore.getState();
        expect(shapes.find(s => s.id === shape1.id)).toBeDefined();
        expect(shapes.find(s => s.id === shape2.id)).toBeDefined();
    });
});
