import { describe, it, expect } from 'vitest';
import { TextObject } from '../models/text';
import { TEXT_LINE_HEIGHT_MULTIPLIER } from '../../../config/constants';

describe('TextTool — multi-line text support', () => {
    it('TextObject stores newlines in text property', () => {
        const t = new TextObject(100, 200, 'Line 1\nLine 2\nLine 3');
        expect(t.text).toBe('Line 1\nLine 2\nLine 3');
    });

    it('getBounds height accounts for multiple lines', () => {
        const singleLine = new TextObject(0, 0, 'Hello');
        const multiLine = new TextObject(0, 0, 'Hello\nWorld');
        const threeLine = new TextObject(0, 0, 'A\nB\nC');

        const singleBounds = singleLine.getBounds();
        const multiBounds = multiLine.getBounds();
        const threeBounds = threeLine.getBounds();

        const lineHeight = 24 * TEXT_LINE_HEIGHT_MULTIPLIER;
        expect(singleBounds.height).toBeCloseTo(lineHeight, 1);
        expect(multiBounds.height).toBeCloseTo(2 * lineHeight, 1);
        expect(threeBounds.height).toBeCloseTo(3 * lineHeight, 1);
    });

    it('getBounds width uses the widest line', () => {
        const t = new TextObject(0, 0, 'Short\nA much longer line');
        const bounds = t.getBounds();

        const shortOnly = new TextObject(0, 0, 'Short');
        const longOnly = new TextObject(0, 0, 'A much longer line');

        expect(bounds.width).toBeCloseTo(longOnly.getBounds().width, 1);
        expect(bounds.width).toBeGreaterThan(shortOnly.getBounds().width);
    });

    it('toJSON and fromJSON preserve newlines', () => {
        const original = new TextObject(50, 75, 'Line 1\nLine 2');
        const json = original.toJSON();
        const restored = TextObject.fromJSON(json);

        expect(restored.text).toBe('Line 1\nLine 2');
        expect(restored.x).toBe(50);
        expect(restored.y).toBe(75);
    });

    it('clone preserves multi-line text', () => {
        const original = new TextObject(10, 20, 'First\nSecond\nThird');
        const cloned = original.clone();

        expect(cloned.text).toBe('First\nSecond\nThird');
        expect(cloned.id).not.toBe(original.id);
    });

    it('empty lines are preserved', () => {
        const t = new TextObject(0, 0, 'Above\n\nBelow');
        expect(t.text.split('\n')).toHaveLength(3);

        const bounds = t.getBounds();
        const lineHeight = 24 * TEXT_LINE_HEIGHT_MULTIPLIER;
        expect(bounds.height).toBeCloseTo(3 * lineHeight, 1);
    });
});
