import { BaseTool } from '../../../core/tools/base';
import { CanvasController } from '../../editor/controller';
import { Geometry } from '../../../core/math/geometry';
import { MoveNodeCommand } from '../commands/move-node';
import { PathNode } from '../models/node';

type DragTargetType = 'ANCHOR' | 'HANDLE_IN' | 'HANDLE_OUT';

interface DragState {
    type: DragTargetType;
    nodeIndex: number;
    initialNode: PathNode;
}

export class NodeEditTool extends BaseTool {
    dragState: DragState | null;
    declare editor: CanvasController;

    constructor(editor: CanvasController) {
        super(editor);
        this.dragState = null;
    }

    onActivate() {
        this.editor.canvas.style.cursor = 'default';
        this.editor.render();
    }

    onDeactivate() {
        this.editor.canvas.style.cursor = 'default';
        this.editor.selectedNodeIndex = null;
        this.editor.render();
    }

    onMouseDown(e: MouseEvent) {
        const { x, y } = this.editor.getMousePos(e);
        this.dragState = null;

        const selection = this.editor.selectedShapes;
        // Only support single path editing for now
        if (selection.length !== 1) {
            this.handleSelectionClick(x, y);
            return;
        }

        const shape = selection[0];
        // Ensure it's a path shape or compatible
        if (!shape.nodes) {
            this.handleSelectionClick(x, y);
            return;
        }

        // 1. Hit Test Handles (High Priority)
        if (this.editor.selectedNodeIndex !== null) {
            const index = this.editor.selectedNodeIndex;
            if (index >= 0 && index < shape.nodes.length) {
                const node = shape.nodes[index];
                const handleParam = this.getHitHandle(x, y, node);
                if (handleParam) {
                    this.dragState = {
                        type: handleParam,
                        nodeIndex: index,
                        initialNode: node.clone()
                    };
                    this.editor.render();
                    return;
                }
            }
        }

        // 2. Hit Test Anchors
        const anchorIndex = this.getHitAnchor(x, y, shape);
        if (anchorIndex !== -1) {
            this.editor.selectedNodeIndex = anchorIndex;
            const node = shape.nodes[anchorIndex];

            // Check for Alt key to reset handles or smooth
            if (e.altKey) {
                // Future: Smooth logic
            }

            this.dragState = {
                type: 'ANCHOR',
                nodeIndex: anchorIndex,
                initialNode: node.clone()
            };
            this.editor.render();
            return;
        }

        // 3. Clicked empty space or valid shape body
        this.handleSelectionClick(x, y);
    }

    onMouseMove(e: MouseEvent) {
        const { x, y } = this.editor.getMousePos(e);

        // Handling Drag
        if (this.dragState && this.editor.selectedShapes.length === 1) {
            const shape = this.editor.selectedShapes[0];
            if (!shape.nodes) return;
            const node = shape.nodes[this.dragState.nodeIndex];

            if (this.dragState.type === 'ANCHOR') {
                const dx = x - node.x;
                const dy = y - node.y;
                node.translate(dx, dy);
            } else if (this.dragState.type === 'HANDLE_IN') {
                node.cpIn.x = x;
                node.cpIn.y = y;
            } else if (this.dragState.type === 'HANDLE_OUT') {
                node.cpOut.x = x;
                node.cpOut.y = y;
            }

            this.editor.render();
            return;
        }

        // Handling Cursor Hover
        this.updateCursor(x, y);
    }

    onMouseUp(e: MouseEvent) {
        if (this.dragState && this.editor.selectedShapes.length === 1) {
            const shape = this.editor.selectedShapes[0];
            if (!shape.nodes) return;
            const node = shape.nodes[this.dragState.nodeIndex];
            const initial = this.dragState.initialNode;

            // Check if changed
            const hasChanged =
                node.x !== initial.x || node.y !== initial.y ||
                node.cpIn.x !== initial.cpIn.x || node.cpIn.y !== initial.cpIn.y ||
                node.cpOut.x !== initial.cpOut.x || node.cpOut.y !== initial.cpOut.y;

            if (hasChanged) {
                // Execute command
                const command = new MoveNodeCommand(
                    shape.id,
                    this.dragState.nodeIndex,
                    initial,
                    node.clone()
                );
                this.editor.history.execute(command);
            }
        }
        this.dragState = null;
    }

    onKeyDown(e: KeyboardEvent) {
        // Delete selected node
        if ((e.key === 'Delete' || e.key === 'Backspace') && this.editor.selectedNodeIndex !== null) {
            // TODO: Implement DeleteNodeCommand
            // For now just ignore or let editor handle shape deletion if no node selected
        }
    }

    // --- Helpers ---

    private handleSelectionClick(x: number, y: number) {
        // Try to select a shape under cursor
        const clickedShape = this.findShapeAt(x, y);
        if (clickedShape) {
            this.editor.selectedShapes = [clickedShape];
            this.editor.selectedNodeIndex = null;
        } else {
            this.editor.selectedShapes = [];
            this.editor.selectedNodeIndex = null;
        }
        this.editor.render();
    }

    private findShapeAt(x: number, y: number): any | null {
        for (let i = this.editor.shapes.length - 1; i >= 0; i--) {
            if (Geometry.isPointInBezierPath(this.editor.ctx, this.editor.shapes[i], x, y)) {
                return this.editor.shapes[i];
            }
        }
        return null;
    }

    private getHitHandle(x: number, y: number, node: PathNode): DragTargetType | null {
        const r = this.editor.config.handleRadius + 2; // Tolerance
        if (Geometry.getDistance({ x, y }, node.cpIn) <= r) return 'HANDLE_IN';
        if (Geometry.getDistance({ x, y }, node.cpOut) <= r) return 'HANDLE_OUT';
        return null;
    }

    private getHitAnchor(x: number, y: number, shape: any): number {
        const r = this.editor.config.anchorSize / 2 + 3; // Tolerance
        for (let i = 0; i < shape.nodes.length; i++) {
            const node = shape.nodes[i];
            if (Geometry.getDistance({ x, y }, { x: node.x, y: node.y }) <= r) {
                return i;
            }
        }
        return -1;
    }

    private updateCursor(x: number, y: number) {
        if (this.editor.selectedShapes.length !== 1) {
            this.editor.canvas.style.cursor = 'default';
            return;
        }

        const shape = this.editor.selectedShapes[0];
        if (!shape.nodes) return;

        // Check Handles
        if (this.editor.selectedNodeIndex !== null) {
            const index = this.editor.selectedNodeIndex;
            if (index < shape.nodes.length) {
                if (this.getHitHandle(x, y, shape.nodes[index])) {
                    this.editor.canvas.style.cursor = 'grab';
                    return;
                }
            }
        }

        // Check Anchors
        if (this.getHitAnchor(x, y, shape) !== -1) {
            this.editor.canvas.style.cursor = 'crosshair';
            return;
        }

        this.editor.canvas.style.cursor = 'default';
    }
}
