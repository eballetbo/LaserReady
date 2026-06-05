import { describe, it, expect, beforeEach } from 'vitest';
import { useStore } from '../../../store/useStore';
import { TextObject } from '../models/text';
import { ChangeTextStyleCommand } from './text';

describe('ChangeTextStyleCommand — shape mutation triggers store update', () => {
    let textObj: TextObject;

    beforeEach(() => {
        textObj = new TextObject(100, 200, 'abcd', { fontSize: 24, fontFamily: 'Arial' });
        useStore.setState({ shapes: [textObj], selectedShapes: [textObj.id] });
    });

    it('fontFamily change is reflected in store shapes after command execute', () => {
        const cmd = new ChangeTextStyleCommand(textObj.id, { fontFamily: 'Arial' }, { fontFamily: 'Times New Roman' });
        cmd.execute();

        const shapes = useStore.getState().shapes;
        const updatedShape = shapes.find(s => s.id === textObj.id) as any;
        expect(updatedShape.fontFamily).toBe('Times New Roman');
    });

    it('store shapes array reference changes after command (triggers subscribers)', () => {
        const shapesBefore = useStore.getState().shapes;
        const cmd = new ChangeTextStyleCommand(textObj.id, { fontFamily: 'Arial' }, { fontFamily: 'Times New Roman' });
        cmd.execute();
        const shapesAfter = useStore.getState().shapes;

        // The array reference must be different to trigger Zustand subscribers
        expect(shapesAfter).not.toBe(shapesBefore);
    });

    it('selected shape object reflects the mutation', () => {
        const cmd = new ChangeTextStyleCommand(textObj.id, { fontFamily: 'Arial' }, { fontFamily: 'Times New Roman' });
        cmd.execute();

        // The shape in the store should have the new value
        const { shapes, selectedShapes } = useStore.getState();
        const selected = shapes.filter(s => selectedShapes.includes(s.id));
        expect((selected[0] as any).fontFamily).toBe('Times New Roman');
    });
});
