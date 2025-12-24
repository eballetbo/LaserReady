import { BaseTool, IEditorContext } from '../core/tools/base-tool';
import { Geometry } from '../core/math/geometry';

interface HitResult {
    type: 'anchor' | 'in' | 'out' | 'create-smooth';
    index: number;
}

export class NodeEditTool extends BaseTool {
    draggingItem: HitResult | null;

    constructor(editor: IEditorContext) {
        super(editor);
        this.draggingItem = null;
    }

    onMouseDown(e: MouseEvent) {
        const { x, y } = this.editor.getMousePos(e);

        if (this.editor.selectedShapes.length === 1) {
            const hit = this.getClickedControl(x, y);
            if (hit) {
                if (hit.type === 'anchor') {
                    // Update IEditorContext to include selectedNodeIndex? 
                    // BaseTool definition has it? No.
                    // But editor instance is PathEditor which has it.
                    // We can cast editor to any or update IEditorContext.
                    // For now, casting or assuming loose contract as IEditorContext properties are open in my previous viewing?
                    // In base-tool.ts IEditorContext did NOT have selectedNodeIndex.
                    // I will access it dynamically or ignore TS error for now, OR better, extend IEditorContext locally.
                    (this.editor as any).selectedNodeIndex = hit.index;

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
        let clickedShape: any | null = null;
        for (let i = this.editor.shapes.length - 1; i >= 0; i--) {
            if (Geometry.isPointInBezierPath(this.editor.ctx, this.editor.shapes[i], x, y)) {
                clickedShape = this.editor.shapes[i];
                break;
            }
        }

        if (clickedShape) {
            this.editor.selectedShapes = [clickedShape];
            (this.editor as any).selectedNodeIndex = null; // Reset node selection when selecting shape
            this.editor.render();
        } else {
            this.editor.selectedShapes = [];
            (this.editor as any).selectedNodeIndex = null;
            this.editor.render();
        }
    }

    onMouseMove(e: MouseEvent) {
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

    onMouseUp(e: MouseEvent) {
        this.draggingItem = null;
    }

    onDoubleClick(e: MouseEvent) {
        const { x, y } = this.editor.getMousePos(e); // BaseTool definition might not include onDoubleClick.
        // If BaseTool doesn't have onDoubleClick, this won't be called by Editor unless Editor supports it.
        // Assuming Editor supports it as per original code.
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

    getClickedControl(x: number, y: number): HitResult | null {
        const config = this.editor.config;
        const tol2 = (config.handleRadius + 3) ** 2;
        const anchorTol2 = (config.anchorSize / 2 + 2) ** 2;
        const shape = this.editor.selectedShapes[0];

        if ((this.editor as any).selectedNodeIndex !== null) {
            const i = (this.editor as any).selectedNodeIndex;
            if (i >= 0 && i < shape.nodes.length) {
                const n = shape.nodes[i];
                // Check handles for selected node
                if (Geometry.getDistance({ x, y }, n.cpIn) ** 2 <= tol2) return { type: 'in', index: i };
                // Using **2 to match squared tolerance logic I assumed. 
                // Wait, getDistance returns Actual Distance. 
                // So comparison should be `dist <= tol` (not squared) OR `dist**2 <= tol2`.
                // Original code: `getDistance(...) <= tol2`.
                // If `tol2` is squared tolerance, `getDistance` (linear) <= `tol2` (squared) is usually generous (e.g. 5 <= 25).
                // I'll stick to logic: Distance vs Radius+Buffer.
                // If handleRadius=5, tol=8. tolSq=64.
                // If I click 10px away, dist=10. 10 <= 64. True. 
                // So hit area is huge? Maybe intentional?
                // I will keep original logic structure mostly but be aware.
                // Actually `Geometry.getDistance` returns sqrt.
                // If original code had `tol2 = (radius+3)**2`, it implies checking against squared distance.
                // BUT it called `Geometry.getDistance`.
                // So `dist <= distSquared` logic is buggy unless intentional for large hit area.
                // I will assume `dist <= distSquared` was the code so I reproduce it, or fix it?
                // I'll fix it to `dist <= Math.sqrt(tol2)` i.e. `dist <= radius+3`
                // `const tol = config.handleRadius + 3;`
                // `if (Geometry.getDistance(...) <= tol) ...`
                // This is cleaner safer TS.
            }
        }

        // Let's implement cleaner Hit Test
        // Handles
        if ((this.editor as any).selectedNodeIndex !== null) {
            const i = (this.editor as any).selectedNodeIndex;
            if (i >= 0 && i < shape.nodes.length) {
                const n = shape.nodes[i];
                const handleTol = config.handleRadius + 3;
                if (Geometry.getDistance({ x, y }, n.cpIn) <= handleTol) return { type: 'in', index: i };
                if (Geometry.getDistance({ x, y }, n.cpOut) <= handleTol) return { type: 'out', index: i };
            }
        }

        // Anchors
        const anchorTol = config.anchorSize / 2 + 2;
        for (let i = 0; i < shape.nodes.length; i++) {
            const n = shape.nodes[i];
            if (Geometry.getDistance({ x, y }, { x: n.x, y: n.y }) <= anchorTol) return { type: 'anchor', index: i };
        }
        return null;
    }

    handleDrag(x: number, y: number) {
        if (!this.draggingItem) return;

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
        } else if (this.draggingItem.type === 'out') {
            node.cpOut.x = x; node.cpOut.y = y;
        }
    }
}
