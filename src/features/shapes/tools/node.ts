import { BaseTool } from '../../../core/tools/base';
import { CanvasController } from '../../editor/controller';
import { Geometry } from '../../../core/math/geometry';
import { MoveNodeCommand, ChangeNodeTypeCommand, InsertNodeCommand, DeleteNodeCommand } from '../commands/node';
import { ConvertSegmentToLineCommand, ConvertSegmentToCurveCommand } from '../commands/segment';
import { PathNode } from '../models/node';

type DragTargetType = 'ANCHOR' | 'HANDLE_IN' | 'HANDLE_OUT' | 'SEGMENT';

interface DragState {
    type: DragTargetType;
    nodeIndex: number; // The primary node being dragged
    initialNodes: Map<number, PathNode>; // Initial state of all selected nodes (or just the dragged one)
    initialOppositeHandle?: { x: number; y: number }; // For symmetric/smooth editing
    dragStartMouse?: { x: number; y: number }; // Capture mouse position at drag start
}

export class NodeEditTool extends BaseTool {
    dragState: DragState | null;
    declare editor: CanvasController;
    lastClickTime: number = 0;
    readonly DOUBLE_CLICK_THRESHOLD = 300; // ms
    lastMousePos: { x: number; y: number } | null = null;
    rubberBandStart: { x: number; y: number } | null = null;

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
        this.editor.selectedNodeIndices = [];
        this.editor.selectionBox = null;
        this.editor.render();
    }

    onMouseDown(e: MouseEvent) {
        const { x, y } = this.editor.getMousePos(e); // World coordinates
        this.dragState = null;
        this.rubberBandStart = null;
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
        if (!shape.nodes) {
            this.handleSelectionClick(x, y);
            return;
        }

        const isShift = e.shiftKey;

        // 1. Hit Test Anchors (High Priority)
        const anchorIndex = this.getHitAnchor(x, y, shape);
        if (anchorIndex !== -1) {
            // Double Click Anchor -> Delete Node
            if (isDoubleClick) {
                const command = new DeleteNodeCommand(shape.id, anchorIndex);
                this.editor.history.execute(command);
                // Update selection if needed (indices shift, but simpler to clear or revalidate)
                // For simplicity, deselect or select nearest
                this.editor.selectedNodeIndices = [];
                this.editor.render();
                return;
            }

            // Selection Logic
            if (isShift) {
                // Toggle selection
                const currentIndices = new Set(this.editor.selectedNodeIndices);
                if (currentIndices.has(anchorIndex)) {
                    currentIndices.delete(anchorIndex);
                } else {
                    currentIndices.add(anchorIndex);
                }
                this.editor.selectedNodeIndices = Array.from(currentIndices);
            } else {
                // If clicked node is not already selected, select only it
                // If it IS selected, keep selection (to allow dragging multiple nodes)
                if (!this.editor.selectedNodeIndices.includes(anchorIndex)) {
                    this.editor.selectedNodeIndices = [anchorIndex];
                }
            }

            // Initialize Drag State for ALL selected nodes
            const initialNodes = new Map<number, PathNode>();
            if (shape.nodes) {
                const nodes = shape.nodes;
                this.editor.selectedNodeIndices.forEach(idx => {
                    if (nodes[idx]) {
                        initialNodes.set(idx, nodes[idx].clone());
                    }
                });
            }

            this.dragState = {
                type: 'ANCHOR',
                nodeIndex: anchorIndex, // The leader node
                initialNodes: initialNodes
            };
            this.editor.render();
            return;
        }

        // 2. Hit Test Handles
        // Check handles for ALL selected nodes or just the primary?
        // Usually we check handles for any node that has handles visible.
        // Handles are visible for selected nodes.
        let hitHandleFound = false;

        // Iterate over selected nodes to find a hit handle
        for (const index of this.editor.selectedNodeIndices) {
            if (index >= 0 && index < shape.nodes.length) {
                const node = shape.nodes[index];
                const handleParam = this.getHitHandle(x, y, node);
                if (handleParam) {
                    // Start dragging this handle
                    // Note: Handle drag usually affects only ONE node's handle
                    const initialNodes = new Map<number, PathNode>();
                    initialNodes.set(index, node.clone());

                    this.dragState = {
                        type: handleParam,
                        nodeIndex: index,
                        initialNodes: initialNodes,
                        initialOppositeHandle: handleParam === 'HANDLE_IN' ? { ...node.cpOut } : { ...node.cpIn }
                    };
                    hitHandleFound = true;
                    break;
                }
            }
        }
        if (hitHandleFound) {
            this.editor.render();
            return;
        }

        // 3. Check Segment Logic (Double Click -> Insert, Drag -> Move Segment)
        const hitSegment = this.getHitSegment(x, y, shape);
        if (hitSegment) {
            if (isDoubleClick) {
                const command = new InsertNodeCommand(shape.id, hitSegment.index, hitSegment.t);
                this.editor.history.execute(command);
                // Select the new node (it is inserted at index + 1)
                this.editor.selectedNodeIndices = [hitSegment.index + 1];
                this.editor.render();
                return;
            } else {
                // Prepare for Segment Dragging
                const i1 = hitSegment.index;
                const i2 = (i1 + 1) % shape.nodes.length;
                const initialNodes = new Map<number, PathNode>();

                // Store state for both endpoints of the segment
                if (shape.nodes[i1]) initialNodes.set(i1, shape.nodes[i1].clone());
                if (shape.nodes[i2]) initialNodes.set(i2, shape.nodes[i2].clone());

                this.dragState = {
                    type: 'SEGMENT',
                    nodeIndex: i1,
                    initialNodes: initialNodes,
                    dragStartMouse: { x, y }
                };
                this.editor.render();
                return;
            }
        }

        // 4. Multi-Select (Rubberband) or Deselect
        if (!isShift) {
            // If not clicking anything, clear selection (unless starting rubberband?)
            // Inkscape: Click on empty space clears selection. Drag starts rubberband.
            this.editor.selectedNodeIndices = [];
        }

        // Start rubberband
        this.rubberBandStart = { x, y };
        this.editor.render();
    }

    onMouseMove(e: MouseEvent) {
        let { x, y } = this.editor.getMousePos(e);
        this.lastMousePos = { x, y };

        // Handling Drag
        if (this.dragState && this.editor.selectedShapes.length === 1) {
            const shape = this.editor.selectedShapes[0];
            if (!shape.nodes) return;

            // SNAP LOGIC
            // Exclude current shape to avoid snapping to self (and the moving node)
            const snapResult = this.editor.snapManager.snapPoint({ x, y }, [shape.id]);
            if (snapResult.type !== 'none') {
                x = snapResult.point.x;
                y = snapResult.point.y;
            }

            const nodes = shape.nodes;

            const leaderIndex = this.dragState.nodeIndex;
            const leaderInitial = this.dragState.initialNodes.get(leaderIndex);

            if (!leaderInitial) return;

            if (this.dragState.type === 'ANCHOR') {
                // Move all selected nodes by delta
                const dx = x - leaderInitial.x;
                const dy = y - leaderInitial.y;

                this.dragState.initialNodes.forEach((initialNode, index) => {
                    const node = nodes[index];
                    if (node) {
                        node.translate(x - node.x + (initialNode.x - node.x) /* correction? No. */, 0);
                        // Simpler: node.x = initial.x + dx
                        node.x = initialNode.x + dx;
                        node.y = initialNode.y + dy;
                        node.cpIn.x = initialNode.cpIn.x + dx;
                        node.cpIn.y = initialNode.cpIn.y + dy;
                        node.cpOut.x = initialNode.cpOut.x + dx;
                        node.cpOut.y = initialNode.cpOut.y + dy;
                    }
                });

            } else if (this.dragState.type === 'HANDLE_IN' || this.dragState.type === 'HANDLE_OUT') {
                // Handle Movement (Single Node Control Point)
                const node = nodes[leaderIndex];
                const type = node.type || 'corner';
                const initialNode = leaderInitial;

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
                    const angle = Math.atan2(vy, vx);
                    const oppositeAngle = angle + Math.PI;

                    let len = 0;
                    if (type === 'symmetric') {
                        len = Math.sqrt(vx * vx + vy * vy);
                    } else { // smooth
                        // Keep existing length of opposite handle
                        const initialOpposite = this.dragState.initialOppositeHandle || oppositeHandle;
                        const odx = initialOpposite.x - initialNode.x; // Use initial vector length
                        const ody = initialOpposite.y - initialNode.y;
                        len = Math.sqrt(odx * odx + ody * ody);
                    }

                    oppositeHandle.x = node.x + Math.cos(oppositeAngle) * len;
                    oppositeHandle.y = node.y + Math.sin(oppositeAngle) * len;
                }
            } else if (this.dragState.type === 'SEGMENT') {
                // Segment Dragging logic
                // Method: Translate adjacent handles (prev.cpOut and next.cpIn) by delta

                const startMouse = this.dragState.dragStartMouse!;
                const dx = x - startMouse.x;
                const dy = y - startMouse.y;

                const i1 = this.dragState.nodeIndex;
                const i2 = (i1 + 1) % shape.nodes.length;

                const initialNode1 = this.dragState.initialNodes.get(i1);
                const initialNode2 = this.dragState.initialNodes.get(i2);

                if (initialNode1 && initialNode2) {
                    const node1 = nodes[i1];
                    const node2 = nodes[i2];

                    // Move p1.cpOut
                    node1.cpOut.x = initialNode1.cpOut.x + dx;
                    node1.cpOut.y = initialNode1.cpOut.y + dy;

                    // Move p2.cpIn
                    node2.cpIn.x = initialNode2.cpIn.x + dx;
                    node2.cpIn.y = initialNode2.cpIn.y + dy;

                    // If handles were previously zero-length (on top of anchor), this effectively deploys them.
                    // This creates a natural behavior where dragging a line curves it.
                }
            }

            this.editor.render();
            return;
        }

        // Handling RubberBand
        if (this.rubberBandStart) {
            const minX = Math.min(this.rubberBandStart.x, x);
            const minY = Math.min(this.rubberBandStart.y, y);
            const width = Math.abs(x - this.rubberBandStart.x);
            const height = Math.abs(y - this.rubberBandStart.y);

            this.editor.selectionBox = {
                x: minX,
                y: minY,
                width,
                height,
                style: { stroke: '#0066ff', fill: 'rgba(0, 102, 255, 0.1)' }
            };

            // Select nodes inside box
            // Use temporary selection? 
            // Inkscape selects on release, but showing live is nicer.
            // Let's select on release to avoid constant state updates/flickering if expensive.
            // But live feedback is better.
            // Let's do live feedback if not too many nodes.
            this.selectNodesInBox(minX, minY, width, height, e.shiftKey);

            this.editor.render();
            return;
        }

        // Handling Cursor Hover
        this.updateCursor(x, y);
    }

    onMouseUp() {
        if (this.dragState && this.editor.selectedShapes.length === 1) {
            const shape = this.editor.selectedShapes[0];
            if (shape.nodes) {
                // Check if changed
                let anyChanged = false;
                const changes: { index: number, oldNode: PathNode, newNode: PathNode }[] = [];

                const nodes = shape.nodes;
                this.dragState.initialNodes.forEach((initialNode, index) => {
                    const node = nodes[index];
                    if (node) {
                        const hasChanged =
                            node.x !== initialNode.x || node.y !== initialNode.y ||
                            node.cpIn.x !== initialNode.cpIn.x || node.cpIn.y !== initialNode.cpIn.y ||
                            node.cpOut.x !== initialNode.cpOut.x || node.cpOut.y !== initialNode.cpOut.y;

                        if (hasChanged) {
                            anyChanged = true;
                            changes.push({
                                index,
                                oldNode: initialNode,
                                newNode: node.clone()
                            });
                        }
                    }
                });

                if (anyChanged) {
                    const command = new MoveNodeCommand(shape.id, changes);
                    this.editor.history.execute(command);
                }
            }
        }

        this.dragState = null;
        this.rubberBandStart = null;
        if (this.editor.selectionBox) {
            this.editor.selectionBox = null;
            this.editor.render();
        }
    }

    onKeyDown(e: KeyboardEvent) {
        if (!this.editor.selectedShapes.length) return;

        const shape = this.editor.selectedShapes[0];
        if (!shape.nodes) return;

        // Use selectedNodeIndices properly
        const indices = this.editor.selectedNodeIndices;

        // Helper to get target node for segment operation
        // If multiple nodes selected, ambiguous. Use first?
        // Or check hovered segment.
        const getTargetNodeIndex = (): number | null => {
            if (indices.length === 1) return indices[0];
            if (this.lastMousePos) {
                const hit = this.getHitSegment(this.lastMousePos.x, this.lastMousePos.y, shape);
                if (hit) return hit.index;
            }
            return null;
        };

        // Delete selected nodes
        if (e.key === 'Delete' || e.key === 'Backspace' || e.key.toLowerCase() === 'd') {
            if (indices.length === 0) return;
            const command = new DeleteNodeCommand(shape.id, indices);
            this.editor.history.execute(command);
            this.editor.selectedNodeIndices = [];
            this.editor.render();
            return;
        }

        // Change Node Type (affects all selected)
        if (e.key.toLowerCase() === 's') {
            if (indices.length === 0) return;
            // Batch commands or update ChangeNodeTypeCommand to handle multiple?
            // ChangeNodeTypeCommand currently handles one. Let's execute one for each.
            // But this creates multiple history steps. Ideally ChangeNodeTypeCommand should handle multiple.
            // For now, I'll loop. Providing a composite command is better but out of scope?
            // "onMouseDrag... move ALL selected nodes" is the only one explicitly requiring simultaneous update.
            // But type change logically should apply to all.
            // I'll stick to single for now or minimal changes. 
            // Better: loop and execute but ideally wrapped in transaction if available.
            // Since history doesn't have transactions, it will be multiple undos. Acceptable for Phase 1.
            indices.forEach(idx => {
                this.editor.history.execute(new ChangeNodeTypeCommand(shape.id, idx, 'smooth'));
            });
            this.editor.render();
            return;
        }
        else if (e.key.toLowerCase() === 'c') {
            if (indices.length === 0) return;
            indices.forEach(idx => {
                this.editor.history.execute(new ChangeNodeTypeCommand(shape.id, idx, 'corner'));
            });
            this.editor.render();
            return;
        }

        // Convert Segment to Line (L)
        if (e.key.toLowerCase() === 'l') {
            const targetIndex = getTargetNodeIndex();
            if (targetIndex !== null) {
                const command = new ConvertSegmentToLineCommand(shape.id, targetIndex);
                this.editor.history.execute(command);
                this.editor.render();
            }
            return;
        }

        // Convert Segment to Curve (B)
        if (e.key.toLowerCase() === 'b') {
            const targetIndex = getTargetNodeIndex();
            if (targetIndex !== null) {
                const command = new ConvertSegmentToCurveCommand(shape.id, targetIndex);
                this.editor.history.execute(command);
                this.editor.render();
            }
            return;
        }
    }

    // --- Helpers ---

    private selectNodesInBox(x: number, y: number, w: number, h: number, append: boolean) {
        if (this.editor.selectedShapes.length !== 1) return;
        const shape = this.editor.selectedShapes[0];
        if (!shape.nodes) return;

        const indices: number[] = append ? [...this.editor.selectedNodeIndices] : [];
        const currentSet = new Set(indices);

        shape.nodes.forEach((node: PathNode, index: number) => {
            if (node.x >= x && node.x <= x + w && node.y >= y && node.y <= y + h) {
                if (!currentSet.has(index)) {
                    currentSet.add(index);
                }
            } else if (!append) {
                // If not appending and outside, ensure removed (already done by starting empty)
            }
        });

        this.editor.selectedNodeIndices = Array.from(currentSet);
    }

    private handleSelectionClick(x: number, y: number) {
        const clickedShape = this.findShapeAt(x, y);
        if (clickedShape) {
            this.editor.selectedShapes = [clickedShape];
            this.editor.selectedNodeIndices = [];
        } else {
            this.editor.selectedShapes = [];
            this.editor.selectedNodeIndices = [];
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
        const r = (this.editor.config.handleRadius + 2) / this.editor.zoom;
        if (Geometry.getDistance({ x, y }, node.cpIn) <= r * r) return 'HANDLE_IN';
        if (Geometry.getDistance({ x, y }, node.cpOut) <= r * r) return 'HANDLE_OUT';
        return null;
    }

    private getHitAnchor(x: number, y: number, shape: any): number {
        const r = (this.editor.config.anchorSize / 2 + 3) / this.editor.zoom;
        for (let i = 0; i < shape.nodes.length; i++) {
            const node = shape.nodes[i];
            if (Geometry.getDistance({ x, y }, { x: node.x, y: node.y }) <= r * r) {
                return i;
            }
        }
        return -1;
    }

    private getHitSegment(x: number, y: number, shape: any): { index: number, t: number } | null {
        const threshold = 10;
        const toleranceSq = threshold * threshold;

        let bestDistSq = Infinity;
        let bestHit = null;

        for (let i = 0; i < shape.nodes.length; i++) {
            if (i === shape.nodes.length - 1 && !shape.closed) break;

            const nextIndex = (i + 1) % shape.nodes.length;
            const p0 = shape.nodes[i];
            const p3 = shape.nodes[nextIndex];

            const STEPS = 50;
            for (let s = 1; s < STEPS; s++) {
                const t = s / STEPS;
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

        // Check Handles (all selected)
        for (const index of this.editor.selectedNodeIndices) {
            if (shape.nodes[index] && this.getHitHandle(x, y, shape.nodes[index])) {
                this.editor.canvas.style.cursor = 'grab';
                return;
            }
        }

        // Check Anchors (any)
        if (this.getHitAnchor(x, y, shape) !== -1) {
            this.editor.canvas.style.cursor = 'crosshair';
            return;
        }

        // Check Segment
        if (this.getHitSegment(x, y, shape)) {
            this.editor.canvas.style.cursor = 'pointer'; // Or 'move' or generic hand
            return;
        }

        this.editor.canvas.style.cursor = 'default';
    }
}
