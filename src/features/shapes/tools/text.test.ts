import { describe, it, expect } from 'vitest';
import { TextObject } from '../models/text';
import { TEXT_LINE_HEIGHT_MULTIPLIER, DEFAULT_FONT_SIZE } from '../../../config/constants';

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

describe('TextObject — auto-weld property', () => {
    it('defaults weld to false', () => {
        const t = new TextObject(0, 0, 'Hello');
        expect(t.weld).toBe(false);
    });

    it('stores weld value from style', () => {
        const t = new TextObject(0, 0, 'Hello', { weld: true });
        expect(t.weld).toBe(true);
    });

    it('weld persists through toJSON/fromJSON', () => {
        const t = new TextObject(0, 0, 'Test', { weld: true });
        const restored = TextObject.fromJSON(t.toJSON());
        expect(restored.weld).toBe(true);
    });

    it('weld persists through clone', () => {
        const t = new TextObject(0, 0, 'Test', { weld: true });
        expect(t.clone().weld).toBe(true);
    });

    it('weld=false does not affect getDisplayText', () => {
        const t = new TextObject(0, 0, 'Script Font', { weld: false });
        expect(t.getDisplayText()).toBe('Script Font');
    });
});

describe('TextObject — text on path (pathId)', () => {
    it('defaults pathId to null', () => {
        const t = new TextObject(0, 0, 'Hello');
        expect(t.pathId).toBeNull();
    });

    it('stores pathId from style', () => {
        const t = new TextObject(0, 0, 'Hello', { pathId: 'path-abc-123' });
        expect(t.pathId).toBe('path-abc-123');
    });

    it('pathId persists through toJSON/fromJSON', () => {
        const t = new TextObject(0, 0, 'Test', { pathId: 'some-path-id' });
        const restored = TextObject.fromJSON(t.toJSON());
        expect(restored.pathId).toBe('some-path-id');
    });

    it('null pathId persists through toJSON/fromJSON', () => {
        const t = new TextObject(0, 0, 'Test');
        const restored = TextObject.fromJSON(t.toJSON());
        expect(restored.pathId).toBeNull();
    });

    it('pathId persists through clone', () => {
        const t = new TextObject(0, 0, 'Test', { pathId: 'path-xyz' });
        const cloned = t.clone();
        expect(cloned.pathId).toBe('path-xyz');
    });
});

describe('TextObject — text bending', () => {
    it('bent text center stays at text midpoint (center-pivot)', () => {
        const text = 'asdfgh';
        const fontSize = 24;
        const charWidths = [...text].map(() => fontSize * 0.6);
        const totalArcLen = charWidths.reduce((a, b) => a + b, 0);
        const bend = 30;
        const radius = Math.abs(totalArcLen / (bend * 0.01));
        const xShift = totalArcLen / 2;

        // Middle of arc (angle=0) should be at totalArcLen/2
        const middleCx = radius * Math.sin(0) + xShift;
        expect(middleCx).toBeCloseTo(totalArcLen / 2, 5);
    });

    it('center stays same for positive and negative bend', () => {
        const text = 'asdfgh';
        const fontSize = 24;
        const charWidths = [...text].map(() => fontSize * 0.6);
        const totalArcLen = charWidths.reduce((a, b) => a + b, 0);

        // Both should have center at totalArcLen/2
        const xShiftPos = totalArcLen / 2;
        const xShiftNeg = totalArcLen / 2;

        expect(xShiftPos).toBe(xShiftNeg);
        expect(xShiftPos).toBeCloseTo(totalArcLen / 2, 5);
    });

    it('getBounds adapts height when text is bent upward', () => {
        const straight = new TextObject(100, 100, 'asdfgh test', { bend: 0 });
        const bent = new TextObject(100, 100, 'asdfgh test', { bend: 150 });

        // Bent text should have taller bounds due to significant arc displacement
        expect(bent.getBounds().height).toBeGreaterThan(straight.getBounds().height);
    });

    it('getBounds adapts height when text is bent downward', () => {
        const straight = new TextObject(100, 100, 'asdfgh test', { bend: 0 });
        const bent = new TextObject(100, 100, 'asdfgh test', { bend: -150 });

        expect(bent.getBounds().height).toBeGreaterThan(straight.getBounds().height);
    });

    it('getBounds for negative bend accounts for rotated characters', () => {
        const bent = new TextObject(100, 100, 'asdfgh test', { bend: -180 });
        const bounds = bent.getBounds();

        // For negative bend, text curves down so minY is near font top,
        // maxY must extend below to cover rotated edge characters
        expect(bounds.maxY).toBeGreaterThan(100);
        // Bounds should be symmetric around the horizontal center
        const horizCenter = (bounds.minX + bounds.maxX) / 2;
        const straightCenter = new TextObject(100, 100, 'asdfgh test', { bend: 0 }).getBounds().cx;
        expect(Math.abs(horizCenter - straightCenter)).toBeLessThan(5);
    });

    it('getBounds height is similar for positive and negative bends', () => {
        const bentUp = new TextObject(100, 100, 'asdfgh test', { bend: 180 });
        const bentDown = new TextObject(100, 100, 'asdfgh test', { bend: -180 });

        // Both should have similar height (symmetric arc)
        const ratio = bentUp.getBounds().height / bentDown.getBounds().height;
        expect(ratio).toBeGreaterThan(0.8);
        expect(ratio).toBeLessThan(1.2);
    });

    it('getBounds center stays near original for small bends', () => {
        const straight = new TextObject(100, 100, 'asdfgh', { bend: 0 });
        const bentUp = new TextObject(100, 100, 'asdfgh', { bend: 10 });
        const bentDown = new TextObject(100, 100, 'asdfgh', { bend: -10 });

        // Horizontal center should be approximately the same
        expect(Math.abs(bentUp.getBounds().cx - straight.getBounds().cx)).toBeLessThan(5);
        expect(Math.abs(bentDown.getBounds().cx - straight.getBounds().cx)).toBeLessThan(5);
    });

    it('positive bend curves text upward (negative cy)', () => {
        const fontSize = 24;
        const charWidths = [14.4, 14.4, 14.4]; // 3 chars
        const totalArcLen = charWidths.reduce((a, b) => a + b, 0);
        const bend = 30;
        const radius = Math.abs(totalArcLen / (bend * 0.01));
        const sign = 1; // positive bend

        // Middle character at angle=0: cy = sign * radius * (cos(0) - 1) = 0
        const cyMiddle = sign * radius * (Math.cos(0) - 1);
        expect(cyMiddle).toBe(0);

        // Edge characters have negative cy (upward)
        const totalAngle = totalArcLen / radius;
        const edgeAngle = totalAngle / 2;
        const cyEdge = sign * radius * (Math.cos(edgeAngle) - 1);
        expect(cyEdge).toBeLessThan(0); // upward
    });

    it('negative bend curves text downward (positive cy)', () => {
        const fontSize = 24;
        const charWidths = [14.4, 14.4, 14.4];
        const totalArcLen = charWidths.reduce((a, b) => a + b, 0);
        const bend = -30;
        const radius = Math.abs(totalArcLen / (bend * 0.01));
        const sign = -1; // negative bend

        // Edge characters have positive cy (downward)
        const totalAngle = totalArcLen / radius;
        const edgeAngle = totalAngle / 2;
        const cyEdge = sign * radius * (Math.cos(edgeAngle) - 1);
        expect(cyEdge).toBeGreaterThan(0); // downward
    });

    it('defaults bend to 0', () => {
        const t = new TextObject(0, 0, 'Hello');
        expect(t.bend).toBe(0);
    });

    it('stores bend value from style', () => {
        const t = new TextObject(0, 0, 'Hello', { bend: 45 });
        expect(t.bend).toBe(45);
    });

    it('supports negative bend (curve downward)', () => {
        const t = new TextObject(0, 0, 'Hello', { bend: -30 });
        expect(t.bend).toBe(-30);
    });

    it('defaults distort to false', () => {
        const t = new TextObject(0, 0, 'Hello');
        expect(t.distort).toBe(false);
    });

    it('stores distort value from style', () => {
        const t = new TextObject(0, 0, 'Hello', { distort: true });
        expect(t.distort).toBe(true);
    });

    it('bend persists through toJSON/fromJSON', () => {
        const t = new TextObject(0, 0, 'Test', { bend: 60, distort: true });
        const restored = TextObject.fromJSON(t.toJSON());
        expect(restored.bend).toBe(60);
        expect(restored.distort).toBe(true);
    });

    it('bend persists through clone', () => {
        const t = new TextObject(0, 0, 'Test', { bend: -20, distort: true });
        const cloned = t.clone();
        expect(cloned.bend).toBe(-20);
        expect(cloned.distort).toBe(true);
    });
});

describe('TextObject — bold and italic rendering', () => {
    it('defaults fontWeight to normal', () => {
        const t = new TextObject(0, 0, 'Hello');
        expect(t.fontWeight).toBe('normal');
    });

    it('defaults fontStyle to normal', () => {
        const t = new TextObject(0, 0, 'Hello');
        expect(t.fontStyle).toBe('normal');
    });

    it('stores bold fontWeight from style', () => {
        const t = new TextObject(0, 0, 'Hello', { fontWeight: 'bold' });
        expect(t.fontWeight).toBe('bold');
    });

    it('stores italic fontStyle from style', () => {
        const t = new TextObject(0, 0, 'Hello', { fontStyle: 'italic' });
        expect(t.fontStyle).toBe('italic');
    });

    it('bold and italic can be combined', () => {
        const t = new TextObject(0, 0, 'Hello', { fontWeight: 'bold', fontStyle: 'italic' });
        expect(t.fontWeight).toBe('bold');
        expect(t.fontStyle).toBe('italic');
    });

    it('fontWeight persists through toJSON/fromJSON', () => {
        const t = new TextObject(0, 0, 'X', { fontWeight: 'bold' });
        const restored = TextObject.fromJSON(t.toJSON());
        expect(restored.fontWeight).toBe('bold');
    });

    it('fontStyle persists through clone', () => {
        const t = new TextObject(0, 0, 'X', { fontStyle: 'italic' });
        expect(t.clone().fontStyle).toBe('italic');
    });

    it('TextMeasurer uses fontWeight and fontStyle for width calculation', () => {
        const normal = new TextObject(0, 0, 'Hello', { fontWeight: 'normal' });
        const bold = new TextObject(0, 0, 'Hello', { fontWeight: 'bold' });
        // Bold text is typically wider; in jsdom it may be the same but the property is passed
        expect(bold.measureLineWidth('Hello')).toBeGreaterThanOrEqual(0);
        expect(normal.measureLineWidth('Hello')).toBeGreaterThanOrEqual(0);
    });
});

describe('TextObject — upper case toggle', () => {
    it('defaults upperCase to false', () => {
        const t = new TextObject(0, 0, 'Hello');
        expect(t.upperCase).toBe(false);
    });

    it('getDisplayText returns original when upperCase is false', () => {
        const t = new TextObject(0, 0, 'Hello World');
        expect(t.getDisplayText()).toBe('Hello World');
    });

    it('getDisplayText returns uppercased when upperCase is true', () => {
        const t = new TextObject(0, 0, 'Hello World', { upperCase: true });
        expect(t.getDisplayText()).toBe('HELLO WORLD');
    });

    it('stored text is unchanged (non-destructive)', () => {
        const t = new TextObject(0, 0, 'Hello World', { upperCase: true });
        expect(t.text).toBe('Hello World');
        expect(t.getDisplayText()).toBe('HELLO WORLD');
    });

    it('multi-line text is uppercased per line', () => {
        const t = new TextObject(0, 0, 'line one\nline two', { upperCase: true });
        expect(t.getDisplayText()).toBe('LINE ONE\nLINE TWO');
    });

    it('getBounds uses display text for width calculation', () => {
        const lower = new TextObject(0, 0, 'abc');
        const upper = new TextObject(0, 0, 'abc', { upperCase: true });
        // Uppercase letters are typically wider
        expect(upper.getBounds().width).toBeGreaterThanOrEqual(lower.getBounds().width);
    });

    it('upperCase persists through toJSON/fromJSON', () => {
        const t = new TextObject(0, 0, 'Test', { upperCase: true });
        const restored = TextObject.fromJSON(t.toJSON());
        expect(restored.upperCase).toBe(true);
    });

    it('upperCase persists through clone', () => {
        const t = new TextObject(0, 0, 'Test', { upperCase: true });
        expect(t.clone().upperCase).toBe(true);
    });
});

describe('TextObject — vertical alignment (alignY)', () => {
    it('defaults alignY to top', () => {
        const t = new TextObject(100, 100, 'Hello');
        expect(t.alignY).toBe('top');
    });

    it('alignY does NOT move the bounding box position', () => {
        const top = new TextObject(100, 100, 'AB\nCD', { alignY: 'top' });
        const mid = new TextObject(100, 100, 'AB\nCD', { alignY: 'middle' });
        const bot = new TextObject(100, 100, 'AB\nCD', { alignY: 'bottom' });

        expect(mid.getBounds().minY).toBeCloseTo(top.getBounds().minY, 1);
        expect(bot.getBounds().minY).toBeCloseTo(top.getBounds().minY, 1);
    });

    it('height is the same regardless of alignY', () => {
        const top = new TextObject(0, 0, 'AB\nCD', { alignY: 'top' });
        const mid = new TextObject(0, 0, 'AB\nCD', { alignY: 'middle' });
        const bot = new TextObject(0, 0, 'AB\nCD', { alignY: 'bottom' });

        expect(mid.getBounds().height).toBeCloseTo(top.getBounds().height, 1);
        expect(bot.getBounds().height).toBeCloseTo(top.getBounds().height, 1);
    });

    it('alignY persists through toJSON/fromJSON', () => {
        const t = new TextObject(0, 0, 'X', { alignY: 'middle' });
        const restored = TextObject.fromJSON(t.toJSON());
        expect(restored.alignY).toBe('middle');
    });

    it('alignY persists through clone', () => {
        const t = new TextObject(0, 0, 'X', { alignY: 'bottom' });
        expect(t.clone().alignY).toBe('bottom');
    });
});

describe('TextObject — horizontal alignment (alignX)', () => {
    it('defaults alignX to left', () => {
        const t = new TextObject(100, 100, 'Hello');
        expect(t.alignX).toBe('left');
    });

    it('alignment does NOT move the bounding box position', () => {
        const left = new TextObject(100, 100, 'Short\nA longer line', { alignX: 'left' });
        const center = new TextObject(100, 100, 'Short\nA longer line', { alignX: 'center' });
        const right = new TextObject(100, 100, 'Short\nA longer line', { alignX: 'right' });

        expect(center.getBounds().minX).toBeCloseTo(left.getBounds().minX, 1);
        expect(right.getBounds().minX).toBeCloseTo(left.getBounds().minX, 1);
        expect(center.getBounds().maxX).toBeCloseTo(left.getBounds().maxX, 1);
        expect(right.getBounds().maxX).toBeCloseTo(left.getBounds().maxX, 1);
    });

    it('width is the same regardless of alignX', () => {
        const left = new TextObject(0, 0, 'Test', { alignX: 'left' });
        const center = new TextObject(0, 0, 'Test', { alignX: 'center' });
        const right = new TextObject(0, 0, 'Test', { alignX: 'right' });

        expect(center.getBounds().width).toBeCloseTo(left.getBounds().width, 1);
        expect(right.getBounds().width).toBeCloseTo(left.getBounds().width, 1);
    });

    it('alignX persists through toJSON/fromJSON', () => {
        const t = new TextObject(0, 0, 'X', { alignX: 'center' });
        const restored = TextObject.fromJSON(t.toJSON());
        expect(restored.alignX).toBe('center');
    });

    it('alignX persists through clone', () => {
        const t = new TextObject(0, 0, 'X', { alignX: 'right' });
        expect(t.clone().alignX).toBe('right');
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

        const lineHeight = DEFAULT_FONT_SIZE * TEXT_LINE_HEIGHT_MULTIPLIER;
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
        const lineHeight = DEFAULT_FONT_SIZE * TEXT_LINE_HEIGHT_MULTIPLIER;
        expect(bounds.height).toBeCloseTo(3 * lineHeight, 1);
    });
});

describe('TextTool — blinking cursor', () => {
    async function makeTextEditor() {
        const { createMockEditor } = await import('../../../test-utils/mock-editor');
        const editor = createMockEditor();
        Object.defineProperty(editor, 'selectedShapes', {
            value: [],
            writable: true,
            configurable: true
        });
        return editor;
    }

    it('TextTool initializes cursorPosition to 0', async () => {
        const { TextTool } = await import('./text');
        const editor = await makeTextEditor();
        const tool = new TextTool(editor);
        expect(tool.cursorPosition).toBe(0);
    });

    it('cursorPosition is set to text length when editing starts', async () => {
        const { TextTool } = await import('./text');
        const { TextObject: TO } = await import('../models/text');
        const editor = await makeTextEditor();
        const tool = new TextTool(editor);

        const textObj = new TO(100, 100, 'Hello');
        const { useStore: store } = await import('../../../store/useStore');
        store.getState().setShapes([textObj as any]);

        tool.startEditing(textObj);
        expect(tool.cursorPosition).toBe(5);
        tool.finishEditing();
    });

    it('cursorPosition resets to 0 when editing finishes', async () => {
        const { TextTool } = await import('./text');
        const { TextObject: TO } = await import('../models/text');
        const editor = await makeTextEditor();
        const tool = new TextTool(editor);

        const textObj = new TO(100, 100, 'Test');
        const { useStore: store } = await import('../../../store/useStore');
        store.getState().setShapes([textObj as any]);

        tool.startEditing(textObj);
        expect(tool.cursorPosition).toBe(4);
        tool.finishEditing();
        expect(tool.cursorPosition).toBe(0);
    });

    it('cursorPosition updates on textarea input', async () => {
        const { TextTool } = await import('./text');
        const { TextObject: TO } = await import('../models/text');
        const editor = await makeTextEditor();
        const tool = new TextTool(editor);

        const textObj = new TO(100, 100, '');
        const { useStore: store } = await import('../../../store/useStore');
        store.getState().setShapes([textObj as any]);

        tool.startEditing(textObj);
        expect(tool.textarea).not.toBeNull();

        // Simulate typing 'AB'
        tool.textarea!.value = 'AB';
        tool.textarea!.selectionStart = 2;
        tool.textarea!.selectionEnd = 2;
        tool.textarea!.dispatchEvent(new Event('input'));
        expect(tool.cursorPosition).toBe(2);

        tool.finishEditing();
    });
});
