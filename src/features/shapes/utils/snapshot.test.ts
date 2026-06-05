import { describe, it, expect } from 'vitest';
import { captureSnapshot, restoreSnapshot } from './snapshot';
import { PathShape } from '../models/path';
import { PathNode } from '../models/node';
import { TextObject } from '../models/text';
import { GroupShape } from '../models/group';

describe('captureSnapshot / restoreSnapshot', () => {
    it('should capture and restore a path shape', () => {
        const shape = new PathShape([new PathNode(10, 20), new PathNode(30, 40)], true, 'layer-1');

        const snapshot = captureSnapshot(shape);
        expect(snapshot.type).toBe('path');
        expect(snapshot.nodes).toHaveLength(2);

        // Mutate the shape
        shape.nodes[0].x = 999;
        shape.nodes[0].y = 888;

        // Restore
        restoreSnapshot(shape, snapshot);
        expect(shape.nodes[0].x).toBe(10);
        expect(shape.nodes[0].y).toBe(20);
    });

    it('should capture and restore a text shape', () => {
        const shape = new TextObject(50, 60, 'Hello', { fontSize: 24, scaleX: 1, scaleY: 1 }, 'layer-1');

        const snapshot = captureSnapshot(shape);
        expect(snapshot.type).toBe('text');
        expect(snapshot.fontSize).toBe(24);

        // Mutate
        shape.x = 100;
        shape.fontSize = 48;

        // Restore
        restoreSnapshot(shape, snapshot);
        expect(shape.x).toBe(50);
        expect(shape.fontSize).toBe(24);
    });

    it('should capture and restore a group shape', () => {
        const child1 = new PathShape([new PathNode(0, 0)], false, 'layer-1');
        const child2 = new PathShape([new PathNode(10, 10)], false, 'layer-1');
        const group = new GroupShape([child1, child2]);

        const snapshot = captureSnapshot(group);
        expect(snapshot.type).toBe('group');
        expect(snapshot.children).toHaveLength(2);

        // Mutate children
        (group.children[0] as PathShape).nodes[0].x = 999;

        // Restore
        restoreSnapshot(group, snapshot);
        expect((group.children[0] as PathShape).nodes[0].x).toBe(0);
    });

    it('should preserve shape identity (same object) after restore', () => {
        const shape = new PathShape([new PathNode(5, 5)], false);
        const snapshot = captureSnapshot(shape);
        const originalId = shape.id;

        shape.nodes[0].x = 100;
        restoreSnapshot(shape, snapshot);

        expect(shape.id).toBe(originalId);
        expect(shape.nodes[0].x).toBe(5);
    });
});
