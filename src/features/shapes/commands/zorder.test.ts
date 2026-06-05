import { describe, it, expect, beforeEach } from 'vitest';
import { useStore } from '../../../store/useStore';
import { ZOrderCommand } from './zorder';
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

describe('ZOrderCommand', () => {
    let shapeA: PathShape;
    let shapeB: PathShape;
    let shapeC: PathShape;

    beforeEach(() => {
        shapeA = createShape('a');
        shapeB = createShape('b');
        shapeC = createShape('c');
        useStore.setState({
            shapes: [shapeA, shapeB, shapeC],
            selectedShapes: []
        });
    });

    it('bringToFront moves shape to end of array', () => {
        const cmd = new ZOrderCommand([shapeA], 'bringToFront');
        cmd.execute();

        const ids = useStore.getState().shapes.map(s => s.id);
        expect(ids).toEqual(['b', 'c', 'a']);
    });

    it('sendToBack moves shape to start of array', () => {
        const cmd = new ZOrderCommand([shapeC], 'sendToBack');
        cmd.execute();

        const ids = useStore.getState().shapes.map(s => s.id);
        expect(ids).toEqual(['c', 'a', 'b']);
    });

    it('bringForward swaps shape one position up', () => {
        const cmd = new ZOrderCommand([shapeA], 'bringForward');
        cmd.execute();

        const ids = useStore.getState().shapes.map(s => s.id);
        expect(ids).toEqual(['b', 'a', 'c']);
    });

    it('sendBackward swaps shape one position down', () => {
        const cmd = new ZOrderCommand([shapeC], 'sendBackward');
        cmd.execute();

        const ids = useStore.getState().shapes.map(s => s.id);
        expect(ids).toEqual(['a', 'c', 'b']);
    });

    it('bringForward does nothing if shape is already at top', () => {
        const cmd = new ZOrderCommand([shapeC], 'bringForward');
        cmd.execute();

        const ids = useStore.getState().shapes.map(s => s.id);
        expect(ids).toEqual(['a', 'b', 'c']);
    });

    it('sendBackward does nothing if shape is already at bottom', () => {
        const cmd = new ZOrderCommand([shapeA], 'sendBackward');
        cmd.execute();

        const ids = useStore.getState().shapes.map(s => s.id);
        expect(ids).toEqual(['a', 'b', 'c']);
    });

    it('undo restores original order', () => {
        const cmd = new ZOrderCommand([shapeA], 'bringToFront');
        cmd.execute();

        expect(useStore.getState().shapes.map(s => s.id)).toEqual(['b', 'c', 'a']);

        cmd.undo();
        expect(useStore.getState().shapes.map(s => s.id)).toEqual(['a', 'b', 'c']);
    });

    it('handles multiple shapes for bringToFront', () => {
        const cmd = new ZOrderCommand([shapeA, shapeB], 'bringToFront');
        cmd.execute();

        const ids = useStore.getState().shapes.map(s => s.id);
        expect(ids).toEqual(['c', 'a', 'b']);
    });
});
