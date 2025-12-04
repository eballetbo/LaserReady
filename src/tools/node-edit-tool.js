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
                this.draggingItem = hit;
                return;
            }
        }

        // If we didn't hit a control, maybe we want to select a different shape?
        // For now, let's keep it simple and just clear selection if clicking empty space
        // Or maybe we should allow selecting another shape to edit its nodes?
        // Let's check if we hit another shape
        let clickedShape = null;
        for (let i = this.editor.shapes.length - 1; i >= 0; i--) {
            if (Geometry.isPointInBezierPath(this.editor.ctx, this.editor.shapes[i], x, y)) {
                clickedShape = this.editor.shapes[i];
                break;
            }
        }

        if (clickedShape) {
            this.editor.selectedShapes = [clickedShape];
            this.editor.render();
        } else {
            // Deselect if clicking empty space? 
            // Usually node edit tool keeps selection active or selects nothing.
            // Let's keep current selection if nothing clicked, or deselect?
            // Original behavior: "if (clickedShape) this.selectedShape = clickedShape"
            // It didn't explicitly deselect in the loop, but "else { this.selectedShape = null }" was there.
            this.editor.selectedShapes = [];
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

    getClickedControl(x, y) {
        const config = this.editor.config;
        const tol2 = (config.handleRadius + 3) ** 2;
        const anchorTol2 = (config.anchorSize / 2 + 2) ** 2;
        const shape = this.editor.selectedShapes[0];

        for (let i = 0; i < shape.nodes.length; i++) {
            const n = shape.nodes[i];
            if (Geometry.getDistance({ x, y }, { x: n.x, y: n.y }) <= anchorTol2) return { type: 'anchor', index: i };
            if (Geometry.getDistance({ x, y }, n.cpIn) <= tol2) return { type: 'in', index: i };
            if (Geometry.getDistance({ x, y }, n.cpOut) <= tol2) return { type: 'out', index: i };
        }
        return null;
    }

    handleDrag(x, y) {
        const node = this.editor.selectedShapes[0].nodes[this.draggingItem.index];

        if (this.draggingItem.type === 'anchor') {
            const dx = x - node.x;
            const dy = y - node.y;
            node.translate(dx, dy);
        } else if (this.draggingItem.type === 'in') {
            node.cpIn.x = x; node.cpIn.y = y;
        } else if (this.draggingItem.type === 'out') {
            node.cpOut.x = x; node.cpOut.y = y;
        }
    }
}
