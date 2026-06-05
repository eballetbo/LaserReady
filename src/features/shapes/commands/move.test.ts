import { describe, it, expect, beforeEach } from 'vitest';
import { useStore } from '../../../store/useStore';
import { MoveShapeCommand } from './move';
import { PathShape } from '../models/path';
import { PathNode } from '../models/node';
import { CanvasController } from '../../editor/controller';

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

describe('MoveShapeCommand', () => {
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

    it('moves shape by dx, dy', () => {
        const cmd = new MoveShapeCommand(null as unknown as CanvasController, [shape1], 15, 20);
        cmd.execute();

        const moved = useStore.getState().shapes.find(s => s.id === 's1') as PathShape;
        expect(moved.nodes[0].x).toBeCloseTo(15);
        expect(moved.nodes[0].y).toBeCloseTo(20);
        expect(moved.nodes[2].x).toBeCloseTo(25);
        expect(moved.nodes[2].y).toBeCloseTo(30);
    });

    it('undo reverses the move', () => {
        const cmd = new MoveShapeCommand(null as unknown as CanvasController, [shape1], 15, 20);
        cmd.execute();
        cmd.undo();

        const restored = useStore.getState().shapes.find(s => s.id === 's1') as PathShape;
        expect(restored.nodes[0].x).toBeCloseTo(0);
        expect(restored.nodes[0].y).toBeCloseTo(0);
    });

    it('only moves specified shapes', () => {
        const cmd = new MoveShapeCommand(null as unknown as CanvasController, [shape1], 5, 5);
        cmd.execute();

        const untouched = useStore.getState().shapes.find(s => s.id === 's2') as PathShape;
        expect(untouched.nodes[0].x).toBeCloseTo(50);
        expect(untouched.nodes[0].y).toBeCloseTo(50);
    });

    it('moves multiple shapes simultaneously', () => {
        const cmd = new MoveShapeCommand(null as unknown as CanvasController, [shape1, shape2], 10, -5);
        cmd.execute();

        const shapes = useStore.getState().shapes;
        const s1 = shapes.find(s => s.id === 's1') as PathShape;
        const s2 = shapes.find(s => s.id === 's2') as PathShape;

        expect(s1.nodes[0].x).toBeCloseTo(10);
        expect(s1.nodes[0].y).toBeCloseTo(-5);
        expect(s2.nodes[0].x).toBeCloseTo(60);
        expect(s2.nodes[0].y).toBeCloseTo(45);
    });
});
