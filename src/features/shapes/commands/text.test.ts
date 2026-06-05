import { describe, it, expect, beforeEach } from 'vitest';
import { useStore } from '../../../store/useStore';
import { ChangeTextStyleCommand } from './text';
import { TextObject } from '../models/text';

describe('ChangeTextStyleCommand — undo/redo for all text properties', () => {
    let textObj: TextObject;

    beforeEach(() => {
        textObj = new TextObject(100, 100, 'Hello', {
            fontSize: 24,
            fontFamily: 'Arial',
            hSpace: 0,
            vSpace: 0,
            alignX: 'left',
            alignY: 'top',
            upperCase: false,
            bend: 0,
            distort: false,
            weld: false,
            pathId: null,
        });
        useStore.setState({ shapes: [textObj] });
    });

    it('changes hSpace and undoes it', () => {
        const cmd = new ChangeTextStyleCommand(textObj.id, { hSpace: 0 }, { hSpace: 25 });
        cmd.execute();
        expect(textObj.hSpace).toBe(25);
        cmd.undo();
        expect(textObj.hSpace).toBe(0);
    });

    it('changes vSpace and undoes it', () => {
        const cmd = new ChangeTextStyleCommand(textObj.id, { vSpace: 0 }, { vSpace: 50 });
        cmd.execute();
        expect(textObj.vSpace).toBe(50);
        cmd.undo();
        expect(textObj.vSpace).toBe(0);
    });

    it('changes alignX and undoes it', () => {
        const cmd = new ChangeTextStyleCommand(textObj.id, { alignX: 'left' }, { alignX: 'center' });
        cmd.execute();
        expect(textObj.alignX).toBe('center');
        cmd.undo();
        expect(textObj.alignX).toBe('left');
    });

    it('changes alignY and undoes it', () => {
        const cmd = new ChangeTextStyleCommand(textObj.id, { alignY: 'top' }, { alignY: 'bottom' });
        cmd.execute();
        expect(textObj.alignY).toBe('bottom');
        cmd.undo();
        expect(textObj.alignY).toBe('top');
    });

    it('changes upperCase and undoes it', () => {
        const cmd = new ChangeTextStyleCommand(textObj.id, { upperCase: false }, { upperCase: true });
        cmd.execute();
        expect(textObj.upperCase).toBe(true);
        cmd.undo();
        expect(textObj.upperCase).toBe(false);
    });

    it('changes bend and undoes it', () => {
        const cmd = new ChangeTextStyleCommand(textObj.id, { bend: 0 }, { bend: 45 });
        cmd.execute();
        expect(textObj.bend).toBe(45);
        cmd.undo();
        expect(textObj.bend).toBe(0);
    });

    it('changes distort and undoes it', () => {
        const cmd = new ChangeTextStyleCommand(textObj.id, { distort: false }, { distort: true });
        cmd.execute();
        expect(textObj.distort).toBe(true);
        cmd.undo();
        expect(textObj.distort).toBe(false);
    });

    it('changes weld and undoes it', () => {
        const cmd = new ChangeTextStyleCommand(textObj.id, { weld: false }, { weld: true });
        cmd.execute();
        expect(textObj.weld).toBe(true);
        cmd.undo();
        expect(textObj.weld).toBe(false);
    });

    it('changes pathId and undoes it', () => {
        const cmd = new ChangeTextStyleCommand(textObj.id, { pathId: null }, { pathId: 'path-123' });
        cmd.execute();
        expect(textObj.pathId).toBe('path-123');
        cmd.undo();
        expect(textObj.pathId).toBeNull();
    });

    it('changes multiple properties at once', () => {
        const cmd = new ChangeTextStyleCommand(
            textObj.id,
            { hSpace: 0, vSpace: 0, alignX: 'left' },
            { hSpace: 20, vSpace: 30, alignX: 'right' }
        );
        cmd.execute();
        expect(textObj.hSpace).toBe(20);
        expect(textObj.vSpace).toBe(30);
        expect(textObj.alignX).toBe('right');
        cmd.undo();
        expect(textObj.hSpace).toBe(0);
        expect(textObj.vSpace).toBe(0);
        expect(textObj.alignX).toBe('left');
    });

    it('original fontFamily/fontSize still works', () => {
        const cmd = new ChangeTextStyleCommand(textObj.id, { fontSize: 24 }, { fontSize: 48 });
        cmd.execute();
        expect(textObj.fontSize).toBe(48);
        cmd.undo();
        expect(textObj.fontSize).toBe(24);
    });
});
