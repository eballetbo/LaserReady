import { describe, it, expect, beforeEach } from 'vitest';
import { useStore } from '../../../store/useStore';
import { DeleteShapeCommand } from './delete';
import { PathShape } from '../models/path';
import { PathNode } from '../models/node';

const createShape = (id: string) => {
    const s = new PathShape([
        new PathNode(0, 0),
        new PathNode(10, 0),
        new PathNode(10, 10),
        new PathNode(0, 10)
    ]);
    s.id = id;
    return s;
};

describe('DeleteShapeCommand', () => {
    let shapeA: PathShape;
    let shapeB: PathShape;
    let shapeC: PathShape;

    beforeEach(() => {
        shapeA = createShape('a');
        shapeB = createShape('b');
        shapeC = createShape('c');
        useStore.setState({
            shapes: [shapeA, shapeB, shapeC],
            selectedShapes: ['b']
        });
    });

    it('removes the specified shapes', () => {
        const cmd = new DeleteShapeCommand([shapeB]);
        cmd.execute();

        const { shapes } = useStore.getState();
        expect(shapes.length).toBe(2);
        expect(shapes.map(s => s.id)).toEqual(['a', 'c']);
    });

    it('clears selection after delete', () => {
        const cmd = new DeleteShapeCommand([shapeB]);
        cmd.execute();

        expect(useStore.getState().selectedShapes).toEqual([]);
    });

    it('undo restores shape at original index', () => {
        const cmd = new DeleteShapeCommand([shapeB]);
        cmd.execute();
        cmd.undo();

        const ids = useStore.getState().shapes.map(s => s.id);
        expect(ids).toEqual(['a', 'b', 'c']);
    });

    it('undo restores previous selection', () => {
        const cmd = new DeleteShapeCommand([shapeB]);
        cmd.execute();
        cmd.undo();

        expect(useStore.getState().selectedShapes).toEqual(['b']);
    });

    it('handles deleting multiple shapes and preserves order on undo', () => {
        const cmd = new DeleteShapeCommand([shapeA, shapeC]);
        cmd.execute();

        expect(useStore.getState().shapes.map(s => s.id)).toEqual(['b']);

        cmd.undo();
        expect(useStore.getState().shapes.map(s => s.id)).toEqual(['a', 'b', 'c']);
    });

    it('handles deleting from the end', () => {
        const cmd = new DeleteShapeCommand([shapeC]);
        cmd.execute();

        expect(useStore.getState().shapes.map(s => s.id)).toEqual(['a', 'b']);

        cmd.undo();
        expect(useStore.getState().shapes.map(s => s.id)).toEqual(['a', 'b', 'c']);
    });
});
