import { BaseTool } from './base-tool.js';
import { PathNode } from '../model/path-node';
import { PathShape } from '../model/path-shape';
import { Geometry } from '../math/geometry.js';

export class PenTool extends BaseTool {
    constructor(editor) {
        super(editor);
        this.draggingItem = null;
    }

    onMouseDown(e) {
        const { x, y } = this.editor.getMousePos(e);

        if (!this.editor.activePath) {
            // Start new path
            const startNode = new PathNode(x, y);
            this.editor.activePath = new PathShape([startNode], false, this.editor.activeLayerId);
            this.editor.shapes.push(this.editor.activePath);
            this.editor.selectedShape = this.editor.activePath;
            this.draggingItem = { type: 'anchor', index: 0 };
        } else {
            // Continue path
            const startNode = this.editor.activePath.nodes[0];
            const distToStart = Geometry.getDistance({ x, y }, { x: startNode.x, y: startNode.y });
            const snapDist2 = (this.editor.config.anchorSize + 5) ** 2;

            if (this.editor.activePath.nodes.length > 2 && distToStart <= snapDist2) {
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

    onMouseMove(e) {
        const { x, y } = this.editor.getMousePos(e);
        this.editor.canvas.style.cursor = 'crosshair';
        this.editor.previewPoint = { x, y };

        if (this.editor.activePath && this.draggingItem) {
            const node = this.editor.activePath.nodes[this.draggingItem.index];
            node.cpOut.x = x;
            node.cpOut.y = y;
            node.cpIn.x = node.x - (x - node.x);
            node.cpIn.y = node.y - (y - node.y);
        }
        this.editor.render();
    }

    onMouseUp(e) {
        this.draggingItem = null;
    }

    onKeyDown(e) {
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
                this.editor.selectedShape = null;
                this.editor.render();
            }
        }
    }
}
