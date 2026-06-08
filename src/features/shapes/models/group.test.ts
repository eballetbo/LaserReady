import { describe, it, expect } from 'vitest';
import { GroupShape } from './group';
import { PathShape } from './path';
import { PathNode } from './node';

const createRect = (id: string, x: number, y: number, w: number, h: number): PathShape => {
    const nodes = [
        new PathNode(x, y),
        new PathNode(x + w, y),
        new PathNode(x + w, y + h),
        new PathNode(x, y + h)
    ];
    const shape = new PathShape(nodes, true, 'layer-1', 'rect', {}, id);
    return shape;
};

describe('GroupShape', () => {
    describe('fromJSON', () => {
        it('should restore x/y from serialized data', () => {
            const child1 = createRect('c1', 10, 20, 50, 50);
            const child2 = createRect('c2', 100, 200, 30, 30);
            const group = new GroupShape([child1, child2]);

            group.move(5, 5);

            const json = group.toJSON();
            const restored = GroupShape.fromJSON(json as Record<string, unknown>);

            expect(restored.x).toBe(group.x);
            expect(restored.y).toBe(group.y);
        });

        it('should restore all properties through roundtrip', () => {
            const child1 = createRect('c1', 0, 0, 10, 10);
            const group = new GroupShape([child1]);
            group.rotation = 1.5;
            group.strokeColor = '#ff0000';
            group.strokeWidth = 2;
            group.fillColor = '#00ff00';

            const json = group.toJSON();
            const restored = GroupShape.fromJSON(json as Record<string, unknown>);

            expect(restored.id).toBe(group.id);
            expect(restored.layerId).toBe(group.layerId);
            expect(restored.rotation).toBe(1.5);
            expect(restored.strokeColor).toBe('#ff0000');
            expect(restored.strokeWidth).toBe(2);
            expect(restored.fillColor).toBe('#00ff00');
            expect(restored.children).toHaveLength(1);
        });

        it('should handle nested groups', () => {
            const leaf = createRect('leaf', 0, 0, 10, 10);
            const inner = new GroupShape([leaf]);
            const outer = new GroupShape([inner]);

            const json = outer.toJSON();
            const restored = GroupShape.fromJSON(json as Record<string, unknown>);

            expect(restored.children).toHaveLength(1);
            expect(restored.children[0].type).toBe('group');
            const restoredInner = restored.children[0] as GroupShape;
            expect(restoredInner.children).toHaveLength(1);
            expect(restoredInner.children[0].type).toBe('rect');
        });
    });

    describe('clone', () => {
        it('should deep clone children with class methods intact', () => {
            const child = createRect('c1', 0, 0, 10, 10);
            const group = new GroupShape([child]);

            const cloned = group.clone();

            expect(cloned.id).not.toBe(group.id);
            expect(cloned.children).toHaveLength(1);
            expect(typeof cloned.children[0].clone).toBe('function');
            expect(typeof cloned.children[0].getBounds).toBe('function');

            cloned.children[0].move!(5, 5);
            expect(child.nodes[0].x).toBe(0);
        });
    });
});
