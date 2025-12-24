import { BaseTool, IEditorContext } from '../../../core/tools/base';
import { PathNode } from '../models/node';
import { PathShape } from '../models/path';
import { Geometry } from '../../../core/math/geometry';

interface DraggingItem {
    type: string;
    index: number;
}

export class PenTool extends BaseTool {
    draggingItem: DraggingItem | null;

    constructor(editor: IEditorContext) {
        super(editor);
        this.draggingItem = null;
    }

    onMouseDown(e: MouseEvent) {
        const { x, y } = this.editor.getMousePos(e);

        if (!this.editor.activePath) {
            // Start new path
            const startNode = new PathNode(x, y);
            this.editor.activePath = new PathShape([startNode], false, this.editor.activeLayerId);
            this.editor.shapes.push(this.editor.activePath);
            // set selectedShape is not in IEditorContext, usage implies checking where it is.
            // In base-tool IEditorContext I defined selectedShapes: any[]. But here code uses this.editor.selectedShape = ...
            // Need to fix IEditorContext or code?
            // "this.editor.selectedShapes = [this.editor.activePath];" is correct array usage.
            // Previous code: this.editor.selectedShape = ... (Singular). I suspect invalid JS or editor has a setter?
            // Looking at path-editor.js, it has `selectedShapes` (array). It does NOT have `selectedShape` (scalar).
            // So `this.editor.selectedShape = ...` in original JS might have been a bug or I missed a getter/setter.
            // PathEditor has `activePath`.
            // I will use `this.editor.selectedShapes = [this.editor.activePath];`.
            // Don't select activePath - it should render in layer color (black), not selection color (blue)
            this.draggingItem = { type: 'anchor', index: 0 };
        } else {
            // Continue path
            const startNode = this.editor.activePath.nodes[0];
            const distToStart = Geometry.getDistance({ x, y }, { x: startNode.x, y: startNode.y });

            // Snap radius: 25px for easier closing
            const snapRadius = 25;

            if (this.editor.activePath.nodes.length > 2 && distToStart <= snapRadius) {
                // Close path
                this.editor.activePath.closed = true;
                this.editor.activePath = null;
                this.editor.previewPoint = null;
            } else {
                // Add new node
                const newNode = new PathNode(x, y);
                this.editor.activePath.nodes.push(newNode);
                this.draggingItem = { type: 'anchor', index: this.editor.activePath.nodes.length - 1 };
            }
        }
        this.editor.render();
    }

    onMouseMove(e: MouseEvent) {
        const { x, y } = this.editor.getMousePos(e);

        // Only show preview and crosshair when actively drawing
        if (this.editor.activePath) {
            this.editor.canvas.style.cursor = 'crosshair';
            this.editor.previewPoint = { x, y };

            if (this.draggingItem) {
                const node = this.editor.activePath.nodes[this.draggingItem.index];
                node.cpOut.x = x;
                node.cpOut.y = y;
                node.cpIn.x = node.x - (x - node.x);
                node.cpIn.y = node.y - (y - node.y);
            }
            this.editor.render();
        } else {
            // Reset cursor when not drawing
            this.editor.canvas.style.cursor = 'default';
        }
    }

    onMouseUp(e: MouseEvent) {
        this.draggingItem = null;
    }

    onContextMenu(e: MouseEvent): void {
        console.log('DEBUG: PenTool.onContextMenu called, activePath:', !!this.editor.activePath);
        e.preventDefault(); // Prevent browser context menu

        // Right-click finishes the path without closing it
        if (this.editor.activePath) {
            console.log('DEBUG: Finishing path with', this.editor.activePath.nodes.length, 'nodes');

            // Remove the last node (the one being drawn with preview line)
            if (this.editor.activePath.nodes.length > 1) {
                this.editor.activePath.nodes.pop();
                console.log('DEBUG: Removed last node, now', this.editor.activePath.nodes.length, 'nodes');
            }

            this.editor.activePath = null;
            this.editor.previewPoint = null;
            this.editor.render();
        }
    }

    onKeyDown(e: KeyboardEvent) {
        if (this.editor.activePath) {
            if (e.key === 'Enter') {
                this.editor.activePath = null;
                this.editor.previewPoint = null;
                this.editor.render();
            } else if (e.key === 'Escape') {
                const index = this.editor.shapes.indexOf(this.editor.activePath);
                if (index > -1) {
                    this.editor.shapes.splice(index, 1);
                }
                this.editor.activePath = null;
                this.editor.previewPoint = null;
                this.editor.selectedShapes = [];
                this.editor.render();
            }
        }
    }
}
