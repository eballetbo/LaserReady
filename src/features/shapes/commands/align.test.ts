import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AlignCommand } from './align';
import { useStore } from '../../../store/useStore';
import { IShape } from '../types';
import { Rect } from '../../../core/math/geometry';

// Mock IShape implementation
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

describe('AlignCommand', () => {
    let s1: MockShape;
    let s2: MockShape;

    beforeEach(() => {
        useStore.setState({
            shapes: [],
            material: { width: 1000, height: 1000 }
        } as any);

        s1 = new MockShape('s1', 10, 10, 50, 50); // Bounds: 10-60, center 35
        s2 = new MockShape('s2', 100, 100, 100, 100); // Bounds: 100-200, center 150

        useStore.getState().setShapes([s1, s2]);
    });

    it('should align left to selection', () => {
        // Selection Bounds: minX = 10 (s1)
        // target = 10
        // s1 is at 10 -> moves 0
        // s2 is at 100 -> moves -90 to 10

        const cmd = new AlignCommand(['s1', 's2'], 'left', 'selection');
        cmd.execute();

        expect(s1.x).toBe(10);
        expect(s2.x).toBe(10);
    });

    it('should align right to selection', () => {
        // Selection Bounds: maxX = 200 (s2)
        // target = 200
        // s1 (maxX 60) -> moves +140 to make maxX 200. New x = 200 - 50 = 150.
        // s2 (maxX 200) -> moves 0.

        const cmd = new AlignCommand(['s1', 's2'], 'right', 'selection');
        cmd.execute();

        expect(s1.x).toBe(150);
        expect(s2.x).toBe(100);
    });

    it('should align center-h to selection', () => {
        // Selection Bounds: minX 10, maxX 200. Width 190. Center = 10 + 95 = 105.
        // s1 (cx 35) -> moves +70 to 105. New x = 105 - 25 = 80.
        // s2 (cx 150) -> moves -45 to 105. New x = 105 - 50 = 55.

        const cmd = new AlignCommand(['s1', 's2'], 'center-h', 'selection');
        cmd.execute();

        expect(s1.x).toBe(80);
        expect(s2.x).toBe(55);
    });

    it('should align top to page', () => {
        // Page minY = 0
        // s1 (y 10) -> moves -10 to 0.
        // s2 (y 100) -> moves -100 to 0.

        const cmd = new AlignCommand(['s1', 's2'], 'top', 'page');
        cmd.execute();

        expect(s1.y).toBe(0);
        expect(s2.y).toBe(0);
    });

    it('should align center-v to page', () => {
        // Page cy = 500
        // s1 (cy 35) -> moves +465 to 500. New y = 500 - 25 = 475.

        const cmd = new AlignCommand(['s1'], 'center-v', 'page');
        cmd.execute();

        expect(s1.y).toBe(475);
    });

    it('should undo correcty', () => {
        const cmd = new AlignCommand(['s1', 's2'], 'left', 'selection');
        cmd.execute();

        expect(s2.x).toBe(10); // Moved

        cmd.undo();

        expect(s2.x).toBe(100); // Restored
    });
});
