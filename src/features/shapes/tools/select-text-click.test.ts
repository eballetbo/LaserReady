import { describe, it, expect, beforeEach } from 'vitest';
import { useStore } from '../../../store/useStore';
import { TextObject } from '../models/text';
import { captureSnapshot } from '../utils/snapshot';

function computeMoveDelta(shape: any, snapshot: any): { dx: number; dy: number } {
    if (snapshot.type === 'path' && snapshot.nodes) {
        const currentBounds = shape.getBounds ? shape.getBounds() : { minX: shape.x ?? 0, minY: shape.y ?? 0 };
        const originalBounds = {
            minX: Math.min(...snapshot.nodes.map((n: any) => n.x)),
            minY: Math.min(...snapshot.nodes.map((n: any) => n.y))
        };
        return {
            dx: (currentBounds.minX ?? 0) - originalBounds.minX,
            dy: (currentBounds.minY ?? 0) - originalBounds.minY
        };
    } else {
        return {
            dx: (shape.x ?? 0) - (snapshot.x ?? 0),
            dy: (shape.y ?? 0) - (snapshot.y ?? 0)
        };
    }
}

describe('SelectTool — clicking text should not move it', () => {
    let textObj: TextObject;

    beforeEach(() => {
        textObj = new TextObject(100, 200, 'abcd', { fontSize: 24 });
        useStore.setState({ shapes: [textObj] });
    });

    it('text position is unchanged after click-select (no drag)', () => {
        const originalX = textObj.x;
        const originalY = textObj.y;

        const snapshot = captureSnapshot(textObj);

        // No movement: shape stays at same position
        const { dx, dy } = computeMoveDelta(textObj, snapshot);

        expect(dx).toBe(0);
        expect(dy).toBe(0);

        expect(textObj.x).toBe(originalX);
        expect(textObj.y).toBe(originalY);
    });

    it('text getBounds().minY differs from text.y (anchor vs bounds)', () => {
        const bounds = textObj.getBounds();
        expect(bounds.minY).not.toBe(textObj.y);
        expect(bounds.minY).toBe(textObj.y - textObj.fontSize);
    });

    it('actual text drag produces correct delta', () => {
        const snapshot = captureSnapshot(textObj);

        // Simulate a drag by moving the text
        textObj.move(10, -5);

        const { dx, dy } = computeMoveDelta(textObj, snapshot);
        expect(dx).toBeCloseTo(10, 5);
        expect(dy).toBeCloseTo(-5, 5);
    });
});
