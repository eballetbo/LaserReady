
import { describe, it, expect, beforeEach } from 'vitest';
import { useStore } from '../../../store/useStore';
import { GroupCommand } from './group';
import { UngroupCommand } from './ungroup';
import { ResizeShapeCommand } from './resize';
import { RotateShapeCommand } from './rotate';
import { PathShape } from '../models/path';
import { GroupShape } from '../models/group';
import { PathNode } from '../models/node';
import { Point } from '../../../core/math/geometry';

// Setup Mock Data
const createShape1 = () => {
    const s = new PathShape([
        new PathNode(0, 0),
        new PathNode(10, 0),
        new PathNode(10, 10),
        new PathNode(0, 10)
    ]);
    s.id = 'shape-1';
    return s;
};

const createShape2 = () => {
    const s = new PathShape([
        new PathNode(20, 20),
        new PathNode(30, 20),
        new PathNode(30, 30),
        new PathNode(20, 30)
    ]);
    s.id = 'shape-2';
    return s;
};

describe('Group Commands & Transformations', () => {
    let validShape1: PathShape;
    let validShape2: PathShape;

    beforeEach(() => {
        // Create fresh instances for each test to avoid mutation side-effects
        validShape1 = createShape1();
        validShape2 = createShape2();

        useStore.setState({
            shapes: [validShape1, validShape2],
            selectedShapes: [],
            activeLayerId: 'layer-1'
        });
    });

    it('should group selected shapes', () => {
        const command = new GroupCommand([validShape1, validShape2]);
        command.execute();

        const { shapes, selectedShapes } = useStore.getState();

        // Should have 1 shape (the group)
        expect(shapes.length).toBe(1);
        expect(shapes[0].type).toBe('group');
        expect((shapes[0] as GroupShape).children.length).toBe(2);

        // Group should be selected
        expect(selectedShapes).toEqual([shapes[0].id]);
    });

    it('should ungroup a group', () => {
        // First, create the group state
        const groupCommand = new GroupCommand([validShape1, validShape2]);
        groupCommand.execute();

        const group = useStore.getState().shapes[0] as GroupShape;

        // Now ungroup
        const ungroupCommand = new UngroupCommand([group]);
        ungroupCommand.execute();

        const { shapes, selectedShapes } = useStore.getState();

        // Should have returned to 2 shapes
        expect(shapes.length).toBe(2);

        // Children should be selected
        expect(selectedShapes).toHaveLength(2);
        expect(selectedShapes).toContain(validShape1.id);
        expect(selectedShapes).toContain(validShape2.id);
    });

    it('should undo grouping', () => {
        const command = new GroupCommand([validShape1, validShape2]);
        command.execute();
        command.undo();

        const { shapes } = useStore.getState();
        expect(shapes.length).toBe(2);
        // IDs should be preserved (checking via reference or ID)
        expect(shapes.find(s => s.id === validShape1.id)).toBeDefined();
    });

    it('should resize a group and its children', () => {
        // 1. Group the shapes
        const groupCommand = new GroupCommand([useStore.getState().shapes[0], useStore.getState().shapes[1]]);
        groupCommand.execute();
        const group = useStore.getState().shapes[0] as GroupShape;

        expect(group).toBeDefined();
        // 2. Resize Group by 2x from (0,0)
        const resizeCommand = new ResizeShapeCommand(
            [group],
            2, // sx
            2, // sy
            { x: 0, y: 0 } // origin
        );
        resizeCommand.execute();

        // 3. Verify Group Children Transformations
        // Child 1: (0,0)->(10,10) scaled 2x from (0,0) should be (0,0)->(20,20)
        const child1 = group.children.find(c => c.id === 'shape-1') as PathShape;
        expect(child1).toBeDefined();
        // Check nodes
        expect(child1.nodes[2].x).toBeCloseTo(20); // (10 * 2)
        expect(child1.nodes[2].y).toBeCloseTo(20);

        // Child 2: (20,20)->(30,30) scaled 2x from (0,0) should be (40,40)->(60,60)
        const child2 = group.children.find(c => c.id === 'shape-2') as PathShape;
        expect(child2).toBeDefined();
        expect(child2.nodes[0].x).toBeCloseTo(40); // (20 * 2)
        expect(child2.nodes[0].y).toBeCloseTo(40);
        expect(child2.nodes[2].x).toBeCloseTo(60); // (30 * 2)
    });

    it('should undo group resize correctly', () => {
        // 1. Group
        const groupCommand = new GroupCommand([validShape1, validShape2]);
        groupCommand.execute();
        const group = useStore.getState().shapes[0] as GroupShape;

        // 2. Resize
        const resizeCommand = new ResizeShapeCommand(
            [group],
            2, 2, { x: 0, y: 0 }
        );
        resizeCommand.execute();

        // Verify partial state before undo
        const c1_transformed = (group.children.find(c => c.id === validShape1.id) as PathShape);
        expect(c1_transformed.nodes[2].x).toBeCloseTo(20);

        // 3. Undo Resize
        resizeCommand.undo();

        // 4. Verify Restoration
        // Get fresh reference from store
        const groupRestored = useStore.getState().shapes[0] as GroupShape;
        const c1_restored = groupRestored.children.find(c => c.id === validShape1.id) as PathShape;
        const c2_restored = groupRestored.children.find(c => c.id === validShape2.id) as PathShape;

        // Child 1 should be back to (0,0)->(10,10)
        expect(c1_restored.nodes[2].x).toBeCloseTo(10);
        expect(c1_restored.nodes[2].y).toBeCloseTo(10);

        // Child 2 should be back to (20,20)->(30,30)
        expect(c2_restored.nodes[0].x).toBeCloseTo(20);
    });

    it('should rotate a group and its children', () => {
        const groupCommand = new GroupCommand([validShape1, validShape2]);
        groupCommand.execute();
        const group = useStore.getState().shapes[0] as GroupShape;

        // Rotate 90 degrees around (0,0)
        const rotateCommand = new RotateShapeCommand(
            [group],
            Math.PI / 2, // 90 deg
            { x: 0, y: 0 }
        );
        rotateCommand.execute();

        const child1 = group.children.find(c => c.id === 'shape-1') as PathShape;

        // Node at (10, 0) should be at (0, 10)
        expect(child1.nodes[1].x).toBeCloseTo(0);
        expect(child1.nodes[1].y).toBeCloseTo(10);

        // Node at (10, 10) should be at (-10, 10)
        expect(child1.nodes[2].x).toBeCloseTo(-10);
        expect(child1.nodes[2].y).toBeCloseTo(10);
    });

    it('should undo group rotation', () => {
        const groupCommand = new GroupCommand([validShape1, validShape2]);
        groupCommand.execute();
        const group = useStore.getState().shapes[0] as GroupShape;

        const rotateCommand = new RotateShapeCommand(
            [group],
            Math.PI / 2,
            { x: 0, y: 0 }
        );
        rotateCommand.execute();

        rotateCommand.undo();

        // Check restored
        const c1_restored = (useStore.getState().shapes[0] as GroupShape).children[0] as PathShape;
        expect(c1_restored.nodes[1].x).toBeCloseTo(10);
        expect(c1_restored.nodes[1].y).toBeCloseTo(0);
    });
});
