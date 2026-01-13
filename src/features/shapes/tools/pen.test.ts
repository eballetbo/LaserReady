import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PenTool } from './pen';
import { PathShape } from '../models/path';
import { useStore } from '../../../store/useStore';

describe('PenTool', () => {
    let mockEditor: any;
    let tool: PenTool;

    beforeEach(() => {
        useStore.setState({
            shapes: [],
            selectedShapes: [],
            tool: 'pen',
            activeLayerId: 'layer-1'
        });

        const canvas = document.createElement('canvas');
        mockEditor = {
            canvas,
            ctx: canvas.getContext('2d'),
            get shapes() { return useStore.getState().shapes; },
            set shapes(value) { useStore.setState({ shapes: value }); },
            activePath: null,
            previewPoint: null,
            activeLayerId: 'layer-1',
            getMousePos: vi.fn((e: MouseEvent) => ({ x: e.clientX, y: e.clientY })),
            render: vi.fn(),
            history: {
                execute: vi.fn((cmd) => cmd.execute()),
            },
            snapManager: {
                snapPoint: vi.fn(() => ({ type: 'none', point: { x: 0, y: 0 } })),
                clear: vi.fn(),
                activeSnap: null
            }
        };

        tool = new PenTool(mockEditor);
    });

    it('should NOT add a node on right click (contextmenu trigger)', () => {
        // 1. Start path with left click
        tool.onMouseDown(new MouseEvent('mousedown', { clientX: 0, clientY: 0, button: 0 }));

        expect(mockEditor.activePath).not.toBeNull();
        expect(mockEditor.activePath.nodes.length).toBe(1);

        // 2. Add second node with left click
        tool.onMouseDown(new MouseEvent('mousedown', { clientX: 100, clientY: 0, button: 0 }));
        expect(mockEditor.activePath.nodes.length).toBe(2);

        // 3. Right click at (100, 100) - Should be ignored by onMouseDown
        // NOTE: Browsers fire mousedown (button 2) BEFORE contextmenu
        tool.onMouseDown(new MouseEvent('mousedown', { clientX: 100, clientY: 100, button: 2 }));

        // 🔴 EXPECTATION: Node count should still be 2. 
        // CURRENT BUG: It will be 3 because onMouseDown doesn't check button.
        expect(mockEditor.activePath.nodes.length).toBe(2);

        // 4. Trigger context menu to finish path
        tool.onContextMenu(new MouseEvent('contextmenu', { clientX: 100, clientY: 100 }));

        // Path should be committed (added to shapes) and activePath cleared
        expect(mockEditor.shapes.length).toBe(1);
        expect(mockEditor.activePath).toBeNull();

        // Use verify the final shape
        const finalShape = mockEditor.shapes[0] as PathShape;
        expect(finalShape.nodes.length).toBe(2);
    });
});
