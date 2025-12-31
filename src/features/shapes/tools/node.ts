import { BaseTool } from '../../../core/tools/base';
import { CanvasController } from '../../editor/controller';
import { Geometry } from '../../../core/math/geometry';
import { MoveNodeCommand, ChangeNodeTypeCommand, InsertNodeCommand, DeleteNodeCommand } from '../commands/node';
import { PathNode } from '../models/node';

type DragTargetType = 'ANCHOR' | 'HANDLE_IN' | 'HANDLE_OUT';

interface DragState {
    type: DragTargetType;
    nodeIndex: number;
    initialNode: PathNode;
    initialOppositeHandle?: { x: number; y: number }; // For symmetric/smooth editing
}

export class NodeEditTool extends BaseTool {
    dragState: DragState | null;
    declare editor: CanvasController;
    lastClickTime: number = 0;
    readonly DOUBLE_CLICK_THRESHOLD = 300; // ms

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
        const now = Date.now();
        const isDoubleClick = (now - this.lastClickTime) < this.DOUBLE_CLICK_THRESHOLD;
        this.lastClickTime = now;

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
                        initialNode: node.clone(),
                        initialOppositeHandle: handleParam === 'HANDLE_IN' ? { ...node.cpOut } : { ...node.cpIn }
                    };
                    this.editor.render();
                    return;
                }
            }
        }

        // 2. Hit Test Anchors
        const anchorIndex = this.getHitAnchor(x, y, shape);
        if (anchorIndex !== -1) {
            // Handle Double Click on Anchor -> Delete Node
            if (isDoubleClick) {
                const command = new DeleteNodeCommand(shape.id, anchorIndex);
                // We use editor logic to execute? The base tool doesn't have execute helper usually.
                // But editor.history has execute.
                this.editor.history.execute(command);
                this.editor.selectedNodeIndex = null; // Deselect after delete
                this.editor.render();
                return;
            }

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

        // 3. Double Click on Segment -> Insert Node
        if (isDoubleClick) {
            const hit = this.getHitSegment(x, y, shape);
            if (hit) {
                const command = new InsertNodeCommand(shape.id, hit.index, hit.t);
                this.editor.history.execute(command);
                // Select the new node (it is inserted at index + 1)
                this.editor.selectedNodeIndex = hit.index + 1;
                this.editor.render();
                return;
            }
        }

        // 4. Clicked empty space or valid shape body
        this.handleSelectionClick(x, y);
    }

    onMouseMove(e: MouseEvent) {
        const { x, y } = this.editor.getMousePos(e);

        // Handling Drag
        if (this.dragState && this.editor.selectedShapes.length === 1) {
            const shape = this.editor.selectedShapes[0];
            if (!shape.nodes) return;
            const node = shape.nodes[this.dragState.nodeIndex];
            const type = node.type || 'corner';

            if (this.dragState.type === 'ANCHOR') {
                const dx = x - node.x;
                const dy = y - node.y;
                node.translate(dx, dy);
            } else {
                // Handle Movement
                const isIn = this.dragState.type === 'HANDLE_IN';
                const targetHandle = isIn ? node.cpIn : node.cpOut;
                const oppositeHandle = isIn ? node.cpOut : node.cpIn;

                // Move the dragged handle
                targetHandle.x = x;
                targetHandle.y = y;

                // Adjust opposite handle based on type
                if (type === 'smooth' || type === 'symmetric') {
                    // Vector from Node to New Handle Position
                    const vx = x - node.x;
                    const vy = y - node.y;

                    // Normalize angle
                    const angle = Math.atan2(vy, vx);

                    // Opposite handle should be at angle + PI
                    const oppositeAngle = angle + Math.PI;

                    // Calculate length for opposite handle
                    let len = 0;
                    if (type === 'symmetric') {
                        // Same length as dragged handle
                        len = Math.sqrt(vx * vx + vy * vy);
                    } else { // smooth
                        // Keep existing length of opposite handle
                        const odx = oppositeHandle.x - node.x;
                        const ody = oppositeHandle.y - node.y;
                        len = Math.sqrt(odx * odx + ody * ody);
                    }

                    // Set new position
                    oppositeHandle.x = node.x + Math.cos(oppositeAngle) * len;
                    oppositeHandle.y = node.y + Math.sin(oppositeAngle) * len;
                }
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
        if (!this.editor.selectedShapes.length || this.editor.selectedNodeIndex === null) return;

        const shape = this.editor.selectedShapes[0];
        if (!shape.nodes) return;

        const index = this.editor.selectedNodeIndex;

        // Delete selected node
        if (e.key === 'Delete' || e.key === 'Backspace' || e.key.toLowerCase() === 'd') {
            const command = new DeleteNodeCommand(shape.id, index);
            this.editor.history.execute(command);
            this.editor.selectedNodeIndex = null;
            this.editor.render();
            return;
        }

        // Change Node Type
        if (e.key.toLowerCase() === 's') {
            const command = new ChangeNodeTypeCommand(shape.id, index, 'smooth');
            this.editor.history.execute(command);
            this.editor.render();
        }
        else if (e.key.toLowerCase() === 'c') {
            const command = new ChangeNodeTypeCommand(shape.id, index, 'corner');
            this.editor.history.execute(command);
            this.editor.render();
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
        if (Geometry.getDistance({ x, y }, node.cpIn) <= r * r) return 'HANDLE_IN'; // optimize distance check
        if (Geometry.getDistance({ x, y }, node.cpOut) <= r * r) return 'HANDLE_OUT';
        return null;
    }

    private getHitAnchor(x: number, y: number, shape: any): number {
        const r = this.editor.config.anchorSize / 2 + 3; // Tolerance
        for (let i = 0; i < shape.nodes.length; i++) {
            const node = shape.nodes[i];
            // Geometry.getDistance returns squared distance
            if (Geometry.getDistance({ x, y }, { x: node.x, y: node.y }) <= r * r) {
                return i;
            }
        }
        return -1;
    }

    private getHitSegment(x: number, y: number, shape: any): { index: number, t: number } | null {
        // Approximate closest point on stroke
        const threshold = 10; // pixels
        const toleranceSq = threshold * threshold;

        let bestDistSq = Infinity;
        let bestHit = null;

        for (let i = 0; i < shape.nodes.length; i++) {
            // Segment i connects i to i+1
            if (i === shape.nodes.length - 1 && !shape.closed) break;

            const nextIndex = (i + 1) % shape.nodes.length;
            const p0 = shape.nodes[i];
            const p3 = shape.nodes[nextIndex];

            // Sample 50 points for better precision
            const STEPS = 50;
            for (let s = 1; s < STEPS; s++) {
                const t = s / STEPS;
                // Calculate bezier point manually
                // B(t) = (1-t)^3 P0 + 3(1-t)^2 t P1 + 3(1-t) t^2 P2 + t^3 P3
                const mt = 1 - t;
                const mt2 = mt * mt;
                const mt3 = mt2 * mt;
                const t2 = t * t;
                const t3 = t2 * t;

                const bx = mt3 * p0.x + 3 * mt2 * t * p0.cpOut.x + 3 * mt * t2 * p3.cpIn.x + t3 * p3.x;
                const by = mt3 * p0.y + 3 * mt2 * t * p0.cpOut.y + 3 * mt * t2 * p3.cpIn.y + t3 * p3.y;

                const dx = x - bx;
                const dy = y - by;
                const dSq = dx * dx + dy * dy;

                if (dSq < toleranceSq && dSq < bestDistSq) {
                    bestDistSq = dSq;
                    bestHit = { index: i, t: t };
                }
            }
        }
        return bestHit;
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
