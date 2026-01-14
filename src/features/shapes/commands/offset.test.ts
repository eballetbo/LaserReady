import { describe, it, expect, beforeEach } from 'vitest';
import { OffsetCommand } from './offset';
import { useStore } from '../../../store/useStore';
import { PathShape } from '../models/path';
import { PathNode } from '../models/node';

// Helper to create a simple rectangle PathShape
const createRect = (id: string, x: number, y: number, w: number, h: number): PathShape => {
    const nodes = [
        new PathNode(x, y),
        new PathNode(x + w, y),
        new PathNode(x + w, y + h),
        new PathNode(x, y + h)
    ];
    return new PathShape(nodes, true, 'layer-1', 'path', {}, id);
};

describe('OffsetCommand', () => {
    let s1: PathShape;

    beforeEach(() => {
        useStore.setState({
            shapes: [],
            selectedShapes: [],
            addShapes: (newShapes) => useStore.setState(state => ({ shapes: [...state.shapes, ...newShapes] })),
            removeShapes: (ids) => useStore.setState(state => ({ shapes: state.shapes.filter(s => !ids.includes(s.id)) })),
            setSelectedShapes: (ids) => useStore.setState({ selectedShapes: ids }),
            updateShape: (updated) => useStore.setState(state => ({
                shapes: state.shapes.map(s => s.id === updated.id ? updated : s)
            }))
        } as any);

        s1 = createRect('s1', 0, 0, 100, 100);
        useStore.getState().setShapes([s1]);
    });

    it('should create a copy when offset options.copies is true', () => {
        const cmd = new OffsetCommand(['s1'], { distance: 10, copies: true });
        cmd.execute();

        const shapes = useStore.getState().shapes;
        expect(shapes.length).toBe(2); // Original + New

        const original = shapes.find(s => s.id === 's1');
        const newShape = shapes.find(s => s.id !== 's1');

        expect(original).toBeDefined();
        expect(newShape).toBeDefined();

        // Verify offset approximate size
        // Original 100x100 -> Offset +10 -> 120x120
        const bounds = newShape!.getBounds();
        expect(Math.round(bounds.width)).toBe(120);
    });

    it('should replace original when offset options.copies is false', () => {
        const cmd = new OffsetCommand(['s1'], { distance: 10, copies: false });
        cmd.execute();

        const shapes = useStore.getState().shapes;
        expect(shapes.length).toBe(1); // Replaced

        const shape = shapes[0];
        // If it replaced, it might have a new ID because we implemented it as "remove old, add new"
        // Let's check logic: toRemove is original. newShapes are added.
        // ID should be different unless we explicitly kept it.
        // My implementation adds new shapes with new IDs.

        expect(shape.id).not.toBe('s1');

        const bounds = shape.getBounds();
        expect(Math.round(bounds.width)).toBe(120);
    });

    it('should undo creation of copies', () => {
        const cmd = new OffsetCommand(['s1'], { distance: 10, copies: true });
        cmd.execute();
        expect(useStore.getState().shapes.length).toBe(2);

        cmd.undo();
        const shapes = useStore.getState().shapes;
        expect(shapes.length).toBe(1);
        expect(shapes[0].id).toBe('s1');
    });

    it('should undo replacement of original', () => {
        const cmd = new OffsetCommand(['s1'], { distance: 10, copies: false });
        cmd.execute();

        // s1 removed, s2 added
        expect(useStore.getState().shapes.length).toBe(1);
        expect(useStore.getState().shapes[0].id).not.toBe('s1');

        cmd.undo();

        const shapes = useStore.getState().shapes;
        expect(shapes.length).toBe(1);
        expect(shapes[0].id).toBe('s1');
    });
});
