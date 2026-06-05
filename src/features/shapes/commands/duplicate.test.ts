import { describe, it, expect, beforeEach } from 'vitest';
import { useStore } from '../../../store/useStore';
import { DuplicateCommand } from './duplicate';
import { PathShape } from '../models/path';
import { PathNode } from '../models/node';

const createShape = (id: string, x: number, y: number) => {
    const s = new PathShape([
        new PathNode(x, y),
        new PathNode(x + 10, y),
        new PathNode(x + 10, y + 10),
        new PathNode(x, y + 10)
    ]);
    s.id = id;
    return s;
};

describe('DuplicateCommand', () => {
    let shape1: PathShape;
    let shape2: PathShape;

    beforeEach(() => {
        shape1 = createShape('s1', 0, 0);
        shape2 = createShape('s2', 50, 50);
        useStore.setState({
            shapes: [shape1, shape2],
            selectedShapes: ['s1']
        });
    });

    it('creates a duplicate offset by 10px', () => {
        const cmd = new DuplicateCommand([shape1]);
        cmd.execute();

        const { shapes } = useStore.getState();
        expect(shapes.length).toBe(3);

        const duplicate = shapes[2];
        expect(duplicate.id).not.toBe('s1');
        const dupNodes = (duplicate as PathShape).nodes;
        expect(dupNodes[0].x).toBeCloseTo(10);
        expect(dupNodes[0].y).toBeCloseTo(10);
    });

    it('selects the duplicated shapes after execute', () => {
        const cmd = new DuplicateCommand([shape1]);
        cmd.execute();

        const { shapes, selectedShapes } = useStore.getState();
        const duplicateId = shapes[2].id;
        expect(selectedShapes).toEqual([duplicateId]);
    });

    it('undo removes the duplicate and restores selection', () => {
        const cmd = new DuplicateCommand([shape1]);
        cmd.execute();
        cmd.undo();

        const { shapes, selectedShapes } = useStore.getState();
        expect(shapes.length).toBe(2);
        expect(selectedShapes).toEqual(['s1']);
    });

    it('duplicates multiple shapes', () => {
        const cmd = new DuplicateCommand([shape1, shape2]);
        cmd.execute();

        const { shapes } = useStore.getState();
        expect(shapes.length).toBe(4);
    });
});
