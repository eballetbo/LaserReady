import { describe, it, expect, beforeEach } from 'vitest';
import { DistributeCommand } from './distribute';
import { useStore } from '../../../store/useStore';
import { IShape } from '../types';
import { Rect } from '../../../core/math/geometry';

class MockShape implements IShape {
    id: string;
    type = 'mock';
    layerId = 'layer1';
    closed = true;
    x: number;
    y: number;
    width: number;
    height: number;

    constructor(id: string, x: number, y: number, width: number, height: number) {
        this.id = id;
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
    }

    move(dx: number, dy: number) {
        this.x += dx;
        this.y += dy;
    }

    getBounds(): Rect {
        return {
            minX: this.x,
            minY: this.y,
            maxX: this.x + this.width,
            maxY: this.y + this.height,
            width: this.width,
            height: this.height,
            cx: this.x + this.width / 2,
            cy: this.y + this.height / 2
        };
    }
}

describe('DistributeCommand', () => {
    let s1: MockShape; // Left/Top
    let s2: MockShape; // Middle
    let s3: MockShape; // Right/Bottom

    beforeEach(() => {
        useStore.setState({
            shapes: [],
            material: { width: 1000, height: 1000 }
        } as any);

        // Horizontal setup:
        // s1: x=0, w=10. Center = 5.
        // s2: x=20, w=10. Center = 25.
        // s3: x=100, w=10. Center = 105.
        // Span = 105 - 5 = 100.
        // Step = 100 / 2 = 50.
        // Target s2 center = 5 + 50 = 55.
        // s2 current center = 25.
        // Delta = 30.

        s1 = new MockShape('s1', 0, 0, 10, 10);
        s2 = new MockShape('s2', 20, 20, 10, 10);
        s3 = new MockShape('s3', 100, 100, 10, 10);

        useStore.getState().setShapes([s1, s2, s3]);
    });

    it('should distribute horizontally', () => {
        const cmd = new DistributeCommand(['s1', 's2', 's3'], 'horizontal');
        cmd.execute();

        // s1 (First) should not move
        expect(s1.x).toBe(0);

        // s3 (Last) should not move
        expect(s3.x).toBe(100);

        // s2 (Middle) should move
        // Initial Center: 25
        // Target Center: 55
        // Expected x: 55 - 5 = 50
        expect(s2.x).toBe(50);
    });

    it('should handle unsorted input ids', () => {
        // Pass ids in random order
        const cmd = new DistributeCommand(['s2', 's3', 's1'], 'horizontal');
        cmd.execute();

        expect(s2.x).toBe(50);
    });

    it('should do nothing if less than 3 shapes', () => {
        const cmd = new DistributeCommand(['s1', 's3'], 'horizontal');
        cmd.execute();

        expect(s1.x).toBe(0); // Unchanged
        expect(s3.x).toBe(100); // Unchanged
    });

    it('should distribute vertically', () => {
        // s1 y=0, h=10, cy=5
        // s2 y=20, h=10, cy=25
        // s3 y=100, h=10, cy=105
        // Same math as horizontal

        const cmd = new DistributeCommand(['s1', 's2', 's3'], 'vertical');
        cmd.execute();

        expect(s2.y).toBe(50);
    });

    it('should undo', () => {
        const cmd = new DistributeCommand(['s1', 's2', 's3'], 'horizontal');
        cmd.execute();
        expect(s2.x).toBe(50);

        cmd.undo();
        expect(s2.x).toBe(20);
    });
});
