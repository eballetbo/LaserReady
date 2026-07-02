import { BaseTool } from '../../../core/tools/base';
import { CanvasController } from '../../editor/controller';
import { MoveNodeCommand, ChangeNodeTypeCommand, InsertNodeCommand, DeleteNodeCommand } from '../commands/node';
import { ConvertSegmentToLineCommand, ConvertSegmentToCurveCommand } from '../commands/segment';
import { PathNode } from '../models/node';
import { NodeHitTester } from './node-hit-test';
import { useStore } from '../../../store/useStore';

type DragTargetType = 'ANCHOR' | 'HANDLE_IN' | 'HANDLE_OUT' | 'SEGMENT';

type NodeEditState =
    | { kind: 'idle' }
    | { kind: 'dragging'; type: DragTargetType; nodeIndex: number; initialNodes: Map<number, PathNode>; initialOppositeHandle?: { x: number; y: number }; dragStartMouse?: { x: number; y: number } }
    | { kind: 'rubberband'; origin: { x: number; y: number } };

export class NodeEditTool extends BaseTool {
    private state: NodeEditState = { kind: 'idle' };
    declare editor: CanvasController;
    private hitTester: NodeHitTester;
    private lastClickTime: number = 0;
    private readonly DOUBLE_CLICK_THRESHOLD = 300;
    private lastMousePos: { x: number; y: number } | null = null;

    constructor(editor: CanvasController) {
        super(editor);
        this.hitTester = new NodeHitTester(editor.config, editor.zoom, editor.ctx);
    }

    onActivate() {
        this.editor.canvas.style.cursor = 'default';
        this.editor.render();
    }

    onDeactivate() {
        this.state = { kind: 'idle' };
        this.editor.canvas.style.cursor = 'default';
        this.editor.selectedNodeIndices = [];
        const store = useStore.getState();
        store.setHoveredNodeIndex(-1);
        store.setHoveredSegmentIndex(-1);
        store.setSelectedSegmentIndices([]);
        this.editor.selectionBox = null;
        this.editor.render();
    }

    onMouseDown(e: MouseEvent) {
        const { x, y } = this.editor.getMousePos(e);
        this.state = { kind: 'idle' };
        this.hitTester.update(this.editor.zoom);

        const now = Date.now();
        const isDoubleClick = (now - this.lastClickTime) < this.DOUBLE_CLICK_THRESHOLD;
        this.lastClickTime = now;

        const selection = this.editor.selectedShapes;
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

        // 1. Hit Test Anchors
        const anchorIndex = this.hitTester.getHitAnchor(x, y, shape);
        if (anchorIndex !== -1) {
            if (isDoubleClick) {
                this.editor.history.execute(new DeleteNodeCommand(shape.id, anchorIndex));
                this.editor.selectedNodeIndices = [];
                useStore.getState().setSelectedSegmentIndices([]);
                this.editor.render();
                return;
            }

            if (isShift) {
                const currentIndices = new Set(this.editor.selectedNodeIndices);
                if (currentIndices.has(anchorIndex)) {
                    currentIndices.delete(anchorIndex);
                } else {
                    currentIndices.add(anchorIndex);
                }
                this.editor.selectedNodeIndices = Array.from(currentIndices);
            } else {
                if (!this.editor.selectedNodeIndices.includes(anchorIndex)) {
                    this.editor.selectedNodeIndices = [anchorIndex];
                }
            }
            useStore.getState().setSelectedSegmentIndices([]);

            const initialNodes = new Map<number, PathNode>();
            this.editor.selectedNodeIndices.forEach(idx => {
                if (shape.nodes[idx]) initialNodes.set(idx, shape.nodes[idx].clone());
            });

            this.state = { kind: 'dragging', type: 'ANCHOR', nodeIndex: anchorIndex, initialNodes };
            this.editor.render();
            return;
        }

        // 2. Hit Test Handles
        for (const index of this.editor.selectedNodeIndices) {
            if (index >= 0 && index < shape.nodes.length) {
                const node = shape.nodes[index];
                const handleParam = this.hitTester.getHitHandle(x, y, node);
                if (handleParam) {
                    const initialNodes = new Map<number, PathNode>();
                    initialNodes.set(index, node.clone());

                    this.state = {
                        kind: 'dragging',
                        type: handleParam,
                        nodeIndex: index,
                        initialNodes,
                        initialOppositeHandle: handleParam === 'HANDLE_IN' ? { ...node.cpOut } : { ...node.cpIn }
                    };
                    this.editor.render();
                    return;
                }
            }
        }

        // 3. Hit Test Segments
        const hitSegment = this.hitTester.getHitSegment(x, y, shape);
        if (hitSegment) {
            if (isDoubleClick) {
                this.editor.history.execute(new InsertNodeCommand(shape.id, hitSegment.index, hitSegment.t));
                this.editor.selectedNodeIndices = [hitSegment.index + 1];
                useStore.getState().setSelectedSegmentIndices([]);
                this.editor.render();
                return;
            }

            const segIdx = hitSegment.index;
            const store = useStore.getState();
            if (isShift) {
                const current = new Set(store.selectedSegmentIndices);
                if (current.has(segIdx)) {
                    current.delete(segIdx);
                } else {
                    current.add(segIdx);
                }
                store.setSelectedSegmentIndices(Array.from(current));
            } else {
                store.setSelectedSegmentIndices([segIdx]);
                this.editor.selectedNodeIndices = [];
            }

            const i1 = segIdx;
            const i2 = (i1 + 1) % shape.nodes.length;
            const initialNodes = new Map<number, PathNode>();
            if (shape.nodes[i1]) initialNodes.set(i1, shape.nodes[i1].clone());
            if (shape.nodes[i2]) initialNodes.set(i2, shape.nodes[i2].clone());

            this.state = {
                kind: 'dragging',
                type: 'SEGMENT',
                nodeIndex: i1,
                initialNodes,
                dragStartMouse: { x, y }
            };
            this.editor.render();
            return;
        }

        // 4. Rubberband or deselect
        if (!isShift) {
            this.editor.selectedNodeIndices = [];
            useStore.getState().setSelectedSegmentIndices([]);
        }
        this.state = { kind: 'rubberband', origin: { x, y } };
        this.editor.render();
    }

    onMouseMove(e: MouseEvent) {
        let { x, y } = this.editor.getMousePos(e);
        this.lastMousePos = { x, y };

        switch (this.state.kind) {
            case 'dragging': {
                if (this.editor.selectedShapes.length !== 1) return;
                const shape = this.editor.selectedShapes[0];
                if (!shape.nodes) return;

                const snapResult = this.editor.snapManager.snapPoint({ x, y }, [shape.id]);
                if (snapResult.type !== 'none') {
                    x = snapResult.point.x;
                    y = snapResult.point.y;
                }

                const { type, nodeIndex, initialNodes } = this.state;
                const nodes = shape.nodes;
                const leaderInitial = initialNodes.get(nodeIndex);
                if (!leaderInitial) return;

                if (type === 'ANCHOR') {
                    const dx = x - leaderInitial.x;
                    const dy = y - leaderInitial.y;

                    initialNodes.forEach((initialNode, index) => {
                        const node = nodes[index];
                        if (node) {
                            node.x = initialNode.x + dx;
                            node.y = initialNode.y + dy;
                            node.cpIn.x = initialNode.cpIn.x + dx;
                            node.cpIn.y = initialNode.cpIn.y + dy;
                            node.cpOut.x = initialNode.cpOut.x + dx;
                            node.cpOut.y = initialNode.cpOut.y + dy;
                        }
                    });
                } else if (type === 'HANDLE_IN' || type === 'HANDLE_OUT') {
                    const node = nodes[nodeIndex];
                    const nodeType = node.type || 'corner';
                    const initialNode = leaderInitial;

                    const isIn = type === 'HANDLE_IN';
                    const targetHandle = isIn ? node.cpIn : node.cpOut;
                    const oppositeHandle = isIn ? node.cpOut : node.cpIn;

                    targetHandle.x = x;
                    targetHandle.y = y;

                    if (nodeType === 'smooth' || nodeType === 'symmetric') {
                        const vx = x - node.x;
                        const vy = y - node.y;
                        const angle = Math.atan2(vy, vx) + Math.PI;

                        let len: number;
                        if (nodeType === 'symmetric') {
                            len = Math.sqrt(vx * vx + vy * vy);
                        } else {
                            const initialOpposite = this.state.initialOppositeHandle || oppositeHandle;
                            const odx = initialOpposite.x - initialNode.x;
                            const ody = initialOpposite.y - initialNode.y;
                            len = Math.sqrt(odx * odx + ody * ody);
                        }

                        oppositeHandle.x = node.x + Math.cos(angle) * len;
                        oppositeHandle.y = node.y + Math.sin(angle) * len;
                    }
                } else if (type === 'SEGMENT') {
                    const startMouse = this.state.dragStartMouse!;
                    const dx = x - startMouse.x;
                    const dy = y - startMouse.y;

                    const i1 = nodeIndex;
                    const i2 = (i1 + 1) % shape.nodes.length;
                    const initialNode1 = initialNodes.get(i1);
                    const initialNode2 = initialNodes.get(i2);

                    if (initialNode1 && initialNode2) {
                        nodes[i1].cpOut.x = initialNode1.cpOut.x + dx;
                        nodes[i1].cpOut.y = initialNode1.cpOut.y + dy;
                        nodes[i2].cpIn.x = initialNode2.cpIn.x + dx;
                        nodes[i2].cpIn.y = initialNode2.cpIn.y + dy;
                    }
                }

                this.editor.render();
                return;
            }

            case 'rubberband': {
                const { origin } = this.state;
                const minX = Math.min(origin.x, x);
                const minY = Math.min(origin.y, y);
                const width = Math.abs(x - origin.x);
                const height = Math.abs(y - origin.y);

                this.editor.selectionBox = {
                    x: minX, y: minY, width, height,
                    style: { stroke: '#0066ff', fill: 'rgba(0, 102, 255, 0.1)' }
                };

                this.selectNodesInBox(minX, minY, width, height, e.shiftKey);
                this.editor.render();
                return;
            }

            case 'idle': {
                this.updateHoveredNode(x, y);
                this.updateCursor(x, y);
                return;
            }
        }
    }

    onMouseUp() {
        if (this.state.kind === 'dragging' && this.editor.selectedShapes.length === 1) {
            const shape = this.editor.selectedShapes[0];
            if (shape.nodes) {
                const changes: { index: number; oldNode: PathNode; newNode: PathNode }[] = [];

                this.state.initialNodes.forEach((initialNode, index) => {
                    const node = shape.nodes[index];
                    if (node) {
                        const hasChanged =
                            node.x !== initialNode.x || node.y !== initialNode.y ||
                            node.cpIn.x !== initialNode.cpIn.x || node.cpIn.y !== initialNode.cpIn.y ||
                            node.cpOut.x !== initialNode.cpOut.x || node.cpOut.y !== initialNode.cpOut.y;

                        if (hasChanged) {
                            changes.push({ index, oldNode: initialNode, newNode: node.clone() });
                        }
                    }
                });

                if (changes.length > 0) {
                    this.editor.history.execute(new MoveNodeCommand(shape.id, changes));
                }
            }
        }

        const wasRubberband = this.state.kind === 'rubberband';
        this.state = { kind: 'idle' };

        if (wasRubberband && this.editor.selectionBox) {
            this.editor.selectionBox = null;
            this.editor.render();
        }
    }

    onKeyDown(e: KeyboardEvent) {
        if (!this.editor.selectedShapes.length) return;

        const shape = this.editor.selectedShapes[0];
        if (!shape.nodes) return;

        const indices = this.editor.selectedNodeIndices;

        const getTargetNodeIndex = (): number | null => {
            if (indices.length === 1) {
                const idx = indices[0];
                if (!shape.closed && idx === shape.nodes.length - 1) return null;
                return idx;
            }
            if (this.lastMousePos) {
                this.hitTester.update(this.editor.zoom);
                const hit = this.hitTester.getHitSegment(this.lastMousePos.x, this.lastMousePos.y, shape);
                if (hit) return hit.index;
            }
            return null;
        };

        if (e.key === 'Delete' || e.key === 'Backspace' || e.key.toLowerCase() === 'd') {
            if (indices.length === 0) return;
            this.editor.history.execute(new DeleteNodeCommand(shape.id, indices));
            this.editor.selectedNodeIndices = [];
            this.editor.render();
            return;
        }

        if (e.key.toLowerCase() === 's') {
            if (indices.length === 0) return;
            indices.forEach(idx => {
                this.editor.history.execute(new ChangeNodeTypeCommand(shape.id, idx, 'smooth'));
            });
            this.editor.render();
            return;
        }

        if (e.key.toLowerCase() === 'c') {
            if (indices.length === 0) return;
            indices.forEach(idx => {
                this.editor.history.execute(new ChangeNodeTypeCommand(shape.id, idx, 'corner'));
            });
            this.editor.render();
            return;
        }

        if (e.key.toLowerCase() === 'l') {
            const targetIndex = getTargetNodeIndex();
            if (targetIndex !== null) {
                this.editor.history.execute(new ConvertSegmentToLineCommand(shape.id, targetIndex));
                this.editor.render();
            }
            return;
        }

        if (e.key.toLowerCase() === 'b') {
            const targetIndex = getTargetNodeIndex();
            if (targetIndex !== null) {
                this.editor.history.execute(new ConvertSegmentToCurveCommand(shape.id, targetIndex));
                this.editor.render();
            }
            return;
        }
    }

    private selectNodesInBox(x: number, y: number, w: number, h: number, append: boolean) {
        if (this.editor.selectedShapes.length !== 1) return;
        const shape = this.editor.selectedShapes[0];
        if (!shape.nodes) return;

        const indices: number[] = append ? [...this.editor.selectedNodeIndices] : [];
        const currentSet = new Set(indices);

        shape.nodes.forEach((node: PathNode, index: number) => {
            if (node.x >= x && node.x <= x + w && node.y >= y && node.y <= y + h) {
                currentSet.add(index);
            }
        });

        this.editor.selectedNodeIndices = Array.from(currentSet);
    }

    private handleSelectionClick(x: number, y: number) {
        this.hitTester.update(this.editor.zoom);
        const clickedShape = this.hitTester.findShapeAt(x, y, this.editor.shapes);
        if (clickedShape) {
            this.editor.selectedShapes = [clickedShape];
            this.editor.selectedNodeIndices = [];
        } else {
            this.editor.selectedShapes = [];
            this.editor.selectedNodeIndices = [];
        }
        this.editor.render();
    }

    private updateHoveredNode(x: number, y: number) {
        const store = useStore.getState();
        if (this.editor.selectedShapes.length !== 1) {
            if (store.hoveredNodeIndex !== -1) store.setHoveredNodeIndex(-1);
            if (store.hoveredSegmentIndex !== -1) store.setHoveredSegmentIndex(-1);
            return;
        }
        const shape = this.editor.selectedShapes[0];
        if (!shape.nodes) {
            if (store.hoveredNodeIndex !== -1) store.setHoveredNodeIndex(-1);
            if (store.hoveredSegmentIndex !== -1) store.setHoveredSegmentIndex(-1);
            return;
        }
        this.hitTester.update(this.editor.zoom);

        let changed = false;

        const hitNode = this.hitTester.getHitAnchor(x, y, shape);
        if (hitNode !== store.hoveredNodeIndex) {
            store.setHoveredNodeIndex(hitNode);
            changed = true;
        }

        // Only check segment hover when no node or handle is hovered
        const segHit = hitNode === -1 ? this.hitTester.getHitSegment(x, y, shape) : null;
        const segIdx = segHit ? segHit.index : -1;
        if (segIdx !== store.hoveredSegmentIndex) {
            store.setHoveredSegmentIndex(segIdx);
            changed = true;
        }

        if (changed) this.editor.render();
    }

    private updateCursor(x: number, y: number) {
        if (this.editor.selectedShapes.length !== 1) {
            this.editor.canvas.style.cursor = 'default';
            return;
        }

        const shape = this.editor.selectedShapes[0];
        if (!shape.nodes) return;

        this.hitTester.update(this.editor.zoom);

        for (const index of this.editor.selectedNodeIndices) {
            if (shape.nodes[index] && this.hitTester.getHitHandle(x, y, shape.nodes[index])) {
                this.editor.canvas.style.cursor = 'grab';
                return;
            }
        }

        if (this.hitTester.getHitAnchor(x, y, shape) !== -1) {
            this.editor.canvas.style.cursor = 'crosshair';
            return;
        }

        if (this.hitTester.getHitSegment(x, y, shape)) {
            this.editor.canvas.style.cursor = 'pointer';
            return;
        }

        this.editor.canvas.style.cursor = 'default';
    }
}
