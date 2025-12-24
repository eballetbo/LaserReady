import { BaseTool, IEditorContext } from '../core/tools/base-tool';
import { PathNode } from '../features/shapes/path-node';
import { PathShape } from '../features/shapes/path-shape';
import { Geometry } from '../core/math/geometry';

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
            this.editor.selectedShapes = [this.editor.activePath];
            this.draggingItem = { type: 'anchor', index: 0 };
        } else {
            // Continue path
            const startNode = this.editor.activePath.nodes[0];
            const distToStart = Geometry.getDistance({ x, y }, { x: startNode.x, y: startNode.y });
            const snapDist2 = ((this.editor.config.anchorSize || 8) + 5) ** 2;

            if (this.editor.activePath.nodes.length > 2 && distToStart ** 2 <= snapDist2) { // distToStart is dist, not squared. Wait, Geometry.getDistance returns distance.
                // Original code: distToStart <= snapDist2. If distToStart is plain distance and snapDist2 is squared, that comparison is broken unless distToStart was already squared.
                // Geometry.getDistance usually involves sqrt.
                // Let's assume Geometry.getDistance returns standard distance.
                // And `(size + 5) ** 2` is squared.
                // So comparison should be `distToStart ** 2 <= snapDist2` OR `distToStart <= Math.sqrt(snapDist2)`.
                // Original JS was: `const distToStart = Geometry.getDistance(...); const snapDist2 = (...) ** 2; if (distToStart <= snapDist2)`
                // If distance is 10, snapDist2 is 100. 10 <= 100. True.
                // If distance is 100, snapDist2 is 100. 100 <= 100. True.
                // Wait. DistanceSquared is expected if comparing to Squared.
                // If `getDistance` returns actual distance, then `dist <= distSquared` is only true if dist >= 1 (usually).
                // Example: dist = 5. snap = 5. distSq = 25. 5 <= 25. True.
                // Example: dist = 24. snap = 5. distSq = 25. 24 <= 25. True. BUG?
                // Snap radius is 5.
                // If I am at 24px away, I should NOT snap. But 24 <= 25. It snaps.
                // So effectively snap radius became 25px instead of 5px?
                // I will correct references to use logical comparison.
                // `distToStart <= (anchorSize + 5)`

                // For migration, I will stick to safe logic but maybe fix the bug if apparent.
                // I'll check Geometry.getDistance implementation from memory/context: `Math.sqrt(dx*dx + dy*dy)`.
                // So it returns actual distance.
                // I will use `distToStart <= this.editor.config.anchorSize + 5`.

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

    onMouseUp(e: MouseEvent) {
        this.draggingItem = null;
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
