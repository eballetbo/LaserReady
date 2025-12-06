import { BaseTool } from './base-tool.js';
import { Geometry } from '../math/geometry.js';

export class NodeEditTool extends BaseTool {
    constructor(editor) {
        super(editor);
        this.draggingItem = null;
    }

    onMouseDown(e) {
        const { x, y } = this.editor.getMousePos(e);

        if (this.editor.selectedShapes.length === 1) {
            const hit = this.getClickedControl(x, y);
            if (hit) {
                if (hit.type === 'anchor') {
                    this.editor.selectedNodeIndex = hit.index;

                    if (e.altKey) {
                        // Alt + Drag on Anchor -> Create Smooth (pull out handles)
                        this.draggingItem = { type: 'create-smooth', index: hit.index };
                    } else {
                        // Normal Drag on Anchor
                        this.draggingItem = hit;
                    }
                } else {
                    // Dragging a handle
                    this.draggingItem = hit;
                }
                this.editor.render();
                return;
            }
        }

        // If clicking empty space or another shape
        let clickedShape = null;
        for (let i = this.editor.shapes.length - 1; i >= 0; i--) {
            if (Geometry.isPointInBezierPath(this.editor.ctx, this.editor.shapes[i], x, y)) {
                clickedShape = this.editor.shapes[i];
                break;
            }
        }

        if (clickedShape) {
            this.editor.selectedShapes = [clickedShape];
            this.editor.selectedNodeIndex = null; // Reset node selection when selecting shape
            this.editor.render();
        } else {
            this.editor.selectedShapes = [];
            this.editor.selectedNodeIndex = null;
            this.editor.render();
        }
    }

    onMouseMove(e) {
        const { x, y } = this.editor.getMousePos(e);
        this.editor.canvas.style.cursor = 'default';

        if (this.draggingItem && this.editor.selectedShapes.length === 1) {
            this.handleDrag(x, y);
            this.editor.render();
            return;
        }

        // Cursor updates
        if (this.editor.selectedShapes.length === 1) {
            const hit = this.getClickedControl(x, y);
            if (hit) {
                this.editor.canvas.style.cursor = 'grab';
            }
        }
    }

    onMouseUp(e) {
        this.draggingItem = null;
    }

    onDoubleClick(e) {
        const { x, y } = this.editor.getMousePos(e);
        if (this.editor.selectedShapes.length === 1) {
            const hit = this.getClickedControl(x, y);
            if (hit && hit.type === 'anchor') {
                // Double click anchor -> Reset to Sharp
                const node = this.editor.selectedShapes[0].nodes[hit.index];
                node.cpIn.x = node.x; node.cpIn.y = node.y;
                node.cpOut.x = node.x; node.cpOut.y = node.y;
                this.editor.render();
            }
        }
    }

    getClickedControl(x, y) {
        const config = this.editor.config;
        const tol2 = (config.handleRadius + 3) ** 2;
        const anchorTol2 = (config.anchorSize / 2 + 2) ** 2;
        const shape = this.editor.selectedShapes[0];

        // Check handles first (if visible/selected), then anchors?
        // Actually, if handles are visible, we should check them.
        // But handles are only visible for selectedNodeIndex.

        if (this.editor.selectedNodeIndex !== null) {
            const i = this.editor.selectedNodeIndex;
            if (i >= 0 && i < shape.nodes.length) {
                const n = shape.nodes[i];
                // Check handles for selected node
                if (Geometry.getDistance({ x, y }, n.cpIn) <= tol2) return { type: 'in', index: i };
                if (Geometry.getDistance({ x, y }, n.cpOut) <= tol2) return { type: 'out', index: i };
            }
        }

        // Check anchors
        for (let i = 0; i < shape.nodes.length; i++) {
            const n = shape.nodes[i];
            if (Geometry.getDistance({ x, y }, { x: n.x, y: n.y }) <= anchorTol2) return { type: 'anchor', index: i };
        }
        return null;
    }

    handleDrag(x, y) {
        const shape = this.editor.selectedShapes[0];
        const node = shape.nodes[this.draggingItem.index];

        if (this.draggingItem.type === 'anchor') {
            const dx = x - node.x;
            const dy = y - node.y;
            node.translate(dx, dy);
        } else if (this.draggingItem.type === 'create-smooth') {
            // Pull out cpOut to mouse
            node.cpOut.x = x; node.cpOut.y = y;
            // Mirror cpIn
            const dx = x - node.x;
            const dy = y - node.y;
            node.cpIn.x = node.x - dx;
            node.cpIn.y = node.y - dy;
        } else if (this.draggingItem.type === 'in') {
            node.cpIn.x = x; node.cpIn.y = y;
            // Optional: Mirror cpOut if smooth? For now independent or let user decide.
            // Illustrator default: independent unless shift held? Or smooth node type?
            // Let's keep independent for now to allow breaking curves.
        } else if (this.draggingItem.type === 'out') {
            node.cpOut.x = x; node.cpOut.y = y;
        }
    }
}
