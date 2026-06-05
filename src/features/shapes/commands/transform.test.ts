import { describe, it, expect, beforeEach } from 'vitest';
import { TransformCommand } from './transform';
import { UpdateParamsCommand } from './update-params';
import { useStore } from '../../../store/useStore';
import { PathShape } from '../models/path';
import { PathNode } from '../models/node';

describe('TransformCommand', () => {
    beforeEach(() => {
        useStore.setState({ shapes: [], selectedShapes: [] });
    });

    it('should apply transform and allow undo', () => {
        const shape = new PathShape([new PathNode(10, 20), new PathNode(30, 40)], false);
        useStore.setState({ shapes: [shape] });

        const command = new TransformCommand([shape], (shapes) => {
            shapes.forEach(s => s.move?.(50, 60));
        });
        command.execute();

        expect(shape.nodes[0].x).toBe(60);
        expect(shape.nodes[0].y).toBe(80);

        command.undo();
        expect(shape.nodes[0].x).toBe(10);
        expect(shape.nodes[0].y).toBe(20);
    });

    it('should handle scale transforms', () => {
        const shape = new PathShape([new PathNode(0, 0), new PathNode(100, 0)], false);
        useStore.setState({ shapes: [shape] });

        const command = new TransformCommand([shape], (shapes) => {
            shapes.forEach(s => s.scale?.(2, 1, { x: 0, y: 0 }));
        });
        command.execute();

        expect(shape.nodes[1].x).toBe(200);

        command.undo();
        expect(shape.nodes[1].x).toBe(100);
    });
});

describe('UpdateParamsCommand', () => {
    beforeEach(() => {
        useStore.setState({ shapes: [], selectedShapes: [] });
    });

    it('should update params and allow undo', () => {
        const shape = new PathShape(
            [new PathNode(0, 0), new PathNode(100, 0), new PathNode(50, 87)],
            true, 'layer-1', 'polygon', { sides: 3 }
        );
        useStore.setState({ shapes: [shape] });

        const command = new UpdateParamsCommand(shape.id, 'sides', 3, 6);
        command.execute();

        const updated = useStore.getState().shapes[0];
        expect(updated.params?.sides).toBe(6);

        command.undo();
        const restored = useStore.getState().shapes[0];
        expect(restored.params?.sides).toBe(3);
    });
});
