import { describe, it, expect } from 'vitest';
import { TextObject } from '../models/text';
import { TEXT_LINE_HEIGHT_MULTIPLIER } from '../../../config/constants';

describe('TextObject — horizontal character spacing (hSpace)', () => {
    it('defaults hSpace to 0', () => {
        const t = new TextObject(0, 0, 'Hello');
        expect(t.hSpace).toBe(0);
    });

    it('stores hSpace from style', () => {
        const t = new TextObject(0, 0, 'Hello', { hSpace: 25 });
        expect(t.hSpace).toBe(25);
    });

    it('measureLineWidth increases with positive hSpace', () => {
        const normal = new TextObject(0, 0, 'ABCDE');
        const spaced = new TextObject(0, 0, 'ABCDE', { hSpace: 50 });

        const normalWidth = normal.measureLineWidth('ABCDE');
        const spacedWidth = spaced.measureLineWidth('ABCDE');

        expect(spacedWidth).toBeGreaterThan(normalWidth);
        const expectedExtra = spaced.fontSize * (50 / 100) * 4;
        expect(spacedWidth - normalWidth).toBeCloseTo(expectedExtra, 1);
    });

    it('measureLineWidth decreases with negative hSpace', () => {
        const normal = new TextObject(0, 0, 'ABCDE');
        const tight = new TextObject(0, 0, 'ABCDE', { hSpace: -20 });

        expect(tight.measureLineWidth('ABCDE')).toBeLessThan(normal.measureLineWidth('ABCDE'));
    });

    it('single character is not affected by hSpace', () => {
        const normal = new TextObject(0, 0, 'A');
        const spaced = new TextObject(0, 0, 'A', { hSpace: 50 });

        expect(spaced.measureLineWidth('A')).toBe(normal.measureLineWidth('A'));
    });

    it('getBounds width reflects hSpace', () => {
        const normal = new TextObject(0, 0, 'HELLO');
        const spaced = new TextObject(0, 0, 'HELLO', { hSpace: 30 });

        expect(spaced.getBounds().width).toBeGreaterThan(normal.getBounds().width);
    });

    it('hSpace persists through toJSON/fromJSON', () => {
        const original = new TextObject(0, 0, 'Test', { hSpace: 15 });
        const restored = TextObject.fromJSON(original.toJSON());
        expect(restored.hSpace).toBe(15);
    });

    it('hSpace persists through clone', () => {
        const original = new TextObject(0, 0, 'Test', { hSpace: -10 });
        const cloned = original.clone();
        expect(cloned.hSpace).toBe(-10);
    });
});

describe('TextObject — vertical line spacing (vSpace)', () => {
    it('defaults vSpace to 0', () => {
        const t = new TextObject(0, 0, 'Hello');
        expect(t.vSpace).toBe(0);
    });

    it('stores vSpace from style', () => {
        const t = new TextObject(0, 0, 'A\nB', { vSpace: 50 });
        expect(t.vSpace).toBe(50);
    });

    it('getLineHeight increases with positive vSpace', () => {
        const normal = new TextObject(0, 0, 'A');
        const spaced = new TextObject(0, 0, 'A', { vSpace: 50 });

        const normalLH = normal.getLineHeight();
        const spacedLH = spaced.getLineHeight();

        expect(spacedLH).toBeGreaterThan(normalLH);
        expect(spacedLH).toBeCloseTo(normalLH * 1.5, 5);
    });

    it('getLineHeight decreases with negative vSpace', () => {
        const normal = new TextObject(0, 0, 'A');
        const tight = new TextObject(0, 0, 'A', { vSpace: -25 });

        expect(tight.getLineHeight()).toBeLessThan(normal.getLineHeight());
        expect(tight.getLineHeight()).toBeCloseTo(normal.getLineHeight() * 0.75, 5);
    });

    it('getBounds height reflects vSpace for multi-line text', () => {
        const normal = new TextObject(0, 0, 'A\nB\nC');
        const spaced = new TextObject(0, 0, 'A\nB\nC', { vSpace: 100 });

        const normalH = normal.getBounds().height;
        const spacedH = spaced.getBounds().height;

        expect(spacedH).toBeGreaterThan(normalH);
        expect(spacedH).toBeCloseTo(normalH * 2, 1);
    });

    it('single-line text height is affected by vSpace (line height changes)', () => {
        const normal = new TextObject(0, 0, 'Hello');
        const spaced = new TextObject(0, 0, 'Hello', { vSpace: 50 });

        expect(spaced.getBounds().height).toBeGreaterThan(normal.getBounds().height);
    });

    it('vSpace persists through toJSON/fromJSON', () => {
        const original = new TextObject(0, 0, 'Test', { vSpace: 30 });
        const restored = TextObject.fromJSON(original.toJSON());
        expect(restored.vSpace).toBe(30);
    });

    it('vSpace persists through clone', () => {
        const original = new TextObject(0, 0, 'Test', { vSpace: -15 });
        const cloned = original.clone();
        expect(cloned.vSpace).toBe(-15);
    });
});

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
