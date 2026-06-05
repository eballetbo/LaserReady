import { CanvasController } from './controller';
import { InputManager } from './input';
import { useStore } from '../../store/useStore';
import { BaseTool as Tool } from '../../core/tools/base';
import { SelectTool } from '../shapes/tools/select';
import { RectTool, CircleTool, PolygonTool, StarTool } from '../shapes/registry';
import { TextTool } from '../shapes/tools/text';
import { PenTool } from '../shapes/tools/pen';
import { NodeEditTool } from '../shapes/tools/node';
import { FilletTool } from '../shapes/tools/fillet';
import { OffsetTool } from '../shapes/tools/offset';

// ToolType is likely defined in types.ts or inferred, but let's define it here or import if found.
// Based on controller, it uses string literals.
export type ToolType = 'select' | 'rect' | 'circle' | 'triangle' | 'pentagon' | 'polygon' | 'star' | 'pen' | 'text' | 'node-edit' | 'fillet' | 'hand' | 'offset';

export class ToolManager {
    private editor: CanvasController;
    private inputManager: InputManager;

    tools: Record<string, Tool>;
    activeTool: Tool;
    private _currentToolType: ToolType = 'select';

    constructor(editor: CanvasController, inputManager: InputManager) {
        this.editor = editor;
        this.inputManager = inputManager;

        // Initialize Tools
        this.tools = {
            select: new SelectTool(editor),
            rect: new RectTool(editor),
            circle: new CircleTool(editor),
            text: new TextTool(editor),
            triangle: new PolygonTool(editor, 3),
            pentagon: new PolygonTool(editor, 5),
            polygon: new PolygonTool(editor, 6), // 6 sides
            star: new StarTool(editor),
            pen: new PenTool(editor),
            'node-edit': new NodeEditTool(editor),
            fillet: new FilletTool(editor),
            offset: new OffsetTool(editor)
        };

        // Set initial tool
        this.activeTool = this.tools.select;

        this.initEvents();
    }

    get currentToolType(): ToolType {
        return this._currentToolType;
    }

    setTool(type: ToolType) {
        if (this._currentToolType === type) return;

        if (this.activeTool) {
            this.activeTool.onDeactivate();
        }

        // Clear selection when switching away from select tool
        if (this._currentToolType === 'select' && type !== 'select' && type !== 'node-edit' && type !== 'offset') {
            useStore.getState().setSelectedShapes([]);
        }

        this._currentToolType = type;
        this.activeTool = this.tools[type] || this.tools.select;

        if (this.activeTool) {
            this.activeTool.onActivate();
        }

        // Update Zustand store to trigger UI updates
        // Cast to any if store type doesn't match exactly our local definition yet
        useStore.getState().setTool(type as any);
    }

    private initEvents() {
        this.inputManager.on('down', (_x, _y, e) => {
            this.activeTool?.onMouseDown(e);
        });

        this.inputManager.on('move', (_x, _y, e) => {
            this.activeTool?.onMouseMove(e);
        });

        this.inputManager.on('up', (_x, _y, e) => {
            this.activeTool?.onMouseUp(e);
        });

        this.inputManager.on('contextmenu', (_x, _y, e) => {
            this.activeTool?.onContextMenu(e);
        });

        this.inputManager.on('keydown', (e) => {
            this.handleKeyDown(e);
        });
    }

    private handleKeyDown(e: KeyboardEvent) {
        // SPECS.md § 3: Escape key switches to SelectTool from any other tool
        if (e.key === 'Escape' && this._currentToolType !== 'select') {
            this.setTool('select');
            this.editor.render();
            return;
        }

        // Delete/Backspace: delegate to active tool (e.g. node-edit deletes nodes)
        if (e.key === 'Delete' || e.key === 'Backspace') {
            this.activeTool?.onKeyDown(e);
            return;
        }

        if ((e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'y')) return;

        // Group (Ctrl+G) - Global command
        if ((e.ctrlKey || e.metaKey) && e.key === 'g') {
            e.preventDefault();
            this.editor.groupSelected();
            return;
        }

        // Ungroup (Ctrl+U) - Global command
        if ((e.ctrlKey || e.metaKey) && e.key === 'u') {
            e.preventDefault();
            this.editor.ungroupSelected();
            return;
        }

        this.activeTool?.onKeyDown(e);
    }
}
