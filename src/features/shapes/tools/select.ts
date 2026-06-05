import { BaseTool, IEditorContext } from '../../../core/tools/base';
import { Geometry, Point, Rect } from '../../../core/math/geometry';
import { IShape } from '../types';
import { ResizeShapeCommand } from '../commands/resize';
import { MoveShapeCommand } from '../commands/move';
import { RotateShapeCommand } from '../commands/rotate';
import { captureSnapshot, restoreSnapshot, ShapeSnapshot } from '../utils/snapshot';

interface ControlHit {
    type: 'rotate' | 'resize';
    handle?: string;
}

export class SelectTool extends BaseTool {
    isDraggingShape: boolean;
    isRotating: boolean;
    isResizing: boolean;
    dragStart: Point | null;
    private initialSnapshots: ShapeSnapshot[];
    initialBounds: Rect | null;
    resizeHandle: string | null;
    rotationCenter: Point | null;
    rotateStartAngle: number;
    isDragSelecting: boolean;
    selectionBox: { x: number; y: number; width: number; height: number; style: { fill: string; stroke: string } } | null;
    dragOrigin: Point | null = null;
    snapCandidates: Point[] = [];

    constructor(editor: IEditorContext) {
        super(editor);
        this.isDraggingShape = false;
        this.isRotating = false;
        this.isResizing = false;
        this.dragStart = null;
        this.initialSnapshots = [];
        this.initialBounds = null;
        this.resizeHandle = null;
        this.rotationCenter = null;
        this.rotateStartAngle = 0;
        this.isDragSelecting = false;
        this.selectionBox = null;
    }

    private captureSelectedSnapshots(): void {
        this.initialSnapshots = this.editor.selectedShapes.map(s => captureSnapshot(s));
    }

    private restoreSelectedFromSnapshots(): void {
        this.editor.selectedShapes.forEach((shape, i) => {
            const snapshot = this.initialSnapshots[i];
            if (snapshot) restoreSnapshot(shape, snapshot);
        });
    }

    onMouseDown(e: MouseEvent): void {
        const { x, y } = this.editor.getMousePos(e);

        if (this.editor.selectedShapes.length > 0) {
            const hit = this.getClickedControl(x, y);
            if (hit) {
                const bounds = Geometry.getCombinedBounds(this.editor.selectedShapes);
                if (bounds) {
                    if (hit.type === 'rotate') {
                        this.isRotating = true;
                        this.rotationCenter = { x: bounds.cx!, y: bounds.cy! };
                        this.rotateStartAngle = Math.atan2(y - bounds.cy!, x - bounds.cx!);
                        this.captureSelectedSnapshots();
                    } else if (hit.type === 'resize' && hit.handle) {
                        this.isResizing = true;
                        this.resizeHandle = hit.handle;
                        this.captureSelectedSnapshots();
                        this.initialBounds = bounds;
                        this.dragStart = { x, y };
                    }
                }
                return;
            }
        }

        let clickedShape: IShape | null = null;
        for (let i = this.editor.shapes.length - 1; i >= 0; i--) {
            const shape = this.editor.shapes[i];
            if (this.hitTestShape(shape, x, y)) {
                clickedShape = shape;
                break;
            }
        }

        if (clickedShape) {
            if (e.ctrlKey || e.metaKey) {
                const currentSelection = this.editor.selectedShapes;
                const index = currentSelection.findIndex(s => s.id === clickedShape.id);
                if (index > -1) {
                    this.editor.selectedShapes = currentSelection.filter(s => s.id !== clickedShape.id);
                } else {
                    this.editor.selectedShapes = [...currentSelection, clickedShape];
                }
            } else if (e.shiftKey) {
                const currentSelection = this.editor.selectedShapes;
                if (!currentSelection.some(s => s.id === clickedShape.id)) {
                    this.editor.selectedShapes = [...currentSelection, clickedShape];
                }
            } else {
                const isAlreadySelected = this.editor.selectedShapes.some(s => s.id === clickedShape!.id);
                if (!isAlreadySelected) {
                    this.editor.selectedShapes = [clickedShape];
                }
            }

            if (this.editor.selectedShapes.length > 0) {
                this.editor.snapManager.clear();
                this.isDraggingShape = true;
                this.dragStart = { x, y };
                this.dragOrigin = { x, y };
                this.captureSelectedSnapshots();

                this.snapCandidates = [];
                this.snapCandidates.push({ x: 0, y: 0 });

                const sourceShape = clickedShape || (this.editor.selectedShapes.length === 1 ? this.editor.selectedShapes[0] : null);

                if (sourceShape && sourceShape.nodes) {
                    sourceShape.nodes.forEach(node => {
                        this.snapCandidates.push({
                            x: node.x - x,
                            y: node.y - y
                        });
                    });

                    if (sourceShape.getBounds) {
                        const b = sourceShape.getBounds();
                        this.snapCandidates.push({
                            x: b.cx - x,
                            y: b.cy - y
                        });
                    }
                }
            }
        } else {
            if (!e.shiftKey) {
                this.editor.selectedShapes = [];
            }
            this.editor.snapManager.clear();
            this.isDragSelecting = true;
            this.dragStart = { x, y };
        }
        this.editor.render();
    }

    onMouseMove(e: MouseEvent): void {
        const { x, y } = this.editor.getMousePos(e);
        this.editor.canvas.style.cursor = 'default';

        if (this.isRotating && this.editor.selectedShapes.length > 0 && this.rotationCenter) {
            const rawAngle = Math.atan2(y - this.rotationCenter.y, x - this.rotationCenter.x);
            const snappedAngle = this.editor.snapManager.snapAngle(rawAngle - this.rotateStartAngle, e.shiftKey);
            const deltaAngle = e.shiftKey ? snappedAngle : rawAngle - this.rotateStartAngle;

            this.editor.selectedShapes.forEach((shape, i) => {
                const snapshot = this.initialSnapshots[i];
                if (!snapshot) return;
                restoreSnapshot(shape, snapshot);
                if (shape.rotate) {
                    shape.rotate(deltaAngle, this.rotationCenter!);
                }
            });

            this.editor.render();
            return;
        }

        if (this.isResizing && this.editor.selectedShapes.length > 0) {
            this.handleResize(x, y);
            this.editor.render();
            return;
        }

        if (this.isDragSelecting && this.dragStart) {
            const width = x - this.dragStart.x;
            const height = y - this.dragStart.y;

            const isCrossing = width < 0;
            const style = isCrossing
                ? { fill: 'rgba(0, 255, 0, 0.1)', stroke: 'green' }
                : { fill: 'rgba(255, 0, 0, 0.1)', stroke: 'red' };

            this.selectionBox = {
                x: isCrossing ? x : this.dragStart.x,
                y: this.dragStart.y < y ? this.dragStart.y : y,
                width: Math.abs(width),
                height: Math.abs(height),
                style
            };

            this.editor.selectionBox = this.selectionBox;
            this.editor.render();
            return;
        }

        if (!this.isDraggingShape) {
            if (this.editor.selectedShapes.length > 0 && this.getClickedControl(x, y)) {
                this.editor.canvas.style.cursor = 'grab';
            } else {
                let hover = false;
                for (const s of this.editor.shapes) {
                    if (this.hitTestShape(s, x, y)) {
                        hover = true;
                        break;
                    }
                }
                if (hover) {
                    this.editor.canvas.style.cursor = 'move';
                }
            }
        }

        if (this.isDraggingShape && this.editor.selectedShapes.length > 0 && this.dragOrigin && this.initialSnapshots.length > 0) {
            const rawDx = x - this.dragOrigin.x;
            const rawDy = y - this.dragOrigin.y;

            let bestSnapDelta = { x: 0, y: 0 };
            let bestSnapDistSq = Infinity;
            let foundSnap = false;

            const excludeIds = this.editor.selectedShapes.map(s => s.id);
            const currentMouse = { x, y };

            if (this.snapCandidates && this.snapCandidates.length > 0) {
                for (const offset of this.snapCandidates) {
                    const probe = {
                        x: currentMouse.x + offset.x,
                        y: currentMouse.y + offset.y
                    };

                    const res = this.editor.snapManager.snapPoint(probe, excludeIds);

                    if (res.type !== 'none') {
                        const dx = res.point.x - probe.x;
                        const dy = res.point.y - probe.y;
                        const distSq = dx * dx + dy * dy;

                        let effectiveDistSq = distSq;
                        if (res.type !== 'grid') {
                            effectiveDistSq *= 0.5;
                        }

                        if (effectiveDistSq < bestSnapDistSq) {
                            bestSnapDistSq = effectiveDistSq;
                            bestSnapDelta = { x: dx, y: dy };
                            foundSnap = true;
                            this.editor.snapManager.activeSnap = res;
                        }
                    }
                }
            } else {
                const res = this.editor.snapManager.snapPoint(currentMouse, excludeIds);
                if (res.type !== 'none') {
                    bestSnapDelta = {
                        x: res.point.x - currentMouse.x,
                        y: res.point.y - currentMouse.y
                    };
                    foundSnap = true;
                    this.editor.snapManager.activeSnap = res;
                }
            }

            if (!foundSnap) {
                this.editor.snapManager.clear();
            }

            const totalDx = rawDx + bestSnapDelta.x;
            const totalDy = rawDy + bestSnapDelta.y;

            this.editor.selectedShapes.forEach((shape, i) => {
                const snapshot = this.initialSnapshots[i];
                if (!snapshot) return;
                restoreSnapshot(shape, snapshot);
                if (shape.move) {
                    shape.move(totalDx, totalDy);
                }
            });

            this.editor.render();
        }
    }

    onMouseUp(e: MouseEvent): void {
        if (this.isRotating && this.editor.selectedShapes.length > 0 && this.rotationCenter) {
            const { x, y } = this.editor.getMousePos(e);

            this.restoreSelectedFromSnapshots();

            const finalRawAngle = Math.atan2(y - this.rotationCenter.y, x - this.rotationCenter.x);
            const finalSnapped = this.editor.snapManager.snapAngle(finalRawAngle - this.rotateStartAngle, e.shiftKey);
            const deltaAngle = e.shiftKey ? finalSnapped : finalRawAngle - this.rotateStartAngle;

            if (Math.abs(deltaAngle) > 0.001) {
                const command = new RotateShapeCommand(
                    this.editor.selectedShapes,
                    deltaAngle,
                    this.rotationCenter
                );
                this.editor.history.execute(command);
            }
        }

        if (this.isDraggingShape && this.editor.selectedShapes.length > 0 && this.initialSnapshots.length > 0) {
            const shape = this.editor.selectedShapes[0];
            const snapshot = this.initialSnapshots[0];

            let totalDx = 0;
            let totalDy = 0;

            const currentBounds = shape.getBounds ? shape.getBounds() : shape;
            const originalBounds = snapshot.type === 'path' && snapshot.nodes
                ? { minX: Math.min(...snapshot.nodes.map((n: any) => n.x)), minY: Math.min(...snapshot.nodes.map((n: any) => n.y)) }
                : { minX: snapshot.x ?? 0, minY: snapshot.y ?? 0 };

            if (currentBounds && originalBounds) {
                totalDx = (currentBounds.minX ?? 0) - originalBounds.minX;
                totalDy = (currentBounds.minY ?? 0) - originalBounds.minY;
            }

            if (Math.abs(totalDx) > 0.01 || Math.abs(totalDy) > 0.01) {
                this.restoreSelectedFromSnapshots();

                const command = new MoveShapeCommand(
                    this.editor,
                    this.editor.selectedShapes,
                    totalDx,
                    totalDy
                );
                this.editor.history.execute(command);
            }
            this.editor.snapManager.clear();
        }

        if (this.isResizing && this.editor.selectedShapes.length > 0 && this.initialBounds && this.dragStart) {
            const { x, y } = this.editor.getMousePos(e);

            this.restoreSelectedFromSnapshots();

            const bounds = this.initialBounds;
            let sx = 1, sy = 1;
            let fixedX = 0, fixedY = 0;

            const getScale = (current: number, start: number, fixed: number): number => {
                if (Math.abs(start - fixed) < 1e-6) return 1;
                return (current - fixed) / (start - fixed);
            };

            switch (this.resizeHandle) {
                case 'nw':
                    fixedX = bounds.maxX; fixedY = bounds.maxY;
                    sx = getScale(x, this.dragStart.x, fixedX);
                    sy = getScale(y, this.dragStart.y, fixedY);
                    break;
                case 'n':
                    fixedX = bounds.cx!; fixedY = bounds.maxY;
                    sy = getScale(y, this.dragStart.y, fixedY);
                    break;
                case 'ne':
                    fixedX = bounds.minX; fixedY = bounds.maxY;
                    sx = getScale(x, this.dragStart.x, fixedX);
                    sy = getScale(y, this.dragStart.y, fixedY);
                    break;
                case 'e':
                    fixedX = bounds.minX; fixedY = bounds.cy!;
                    sx = getScale(x, this.dragStart.x, fixedX);
                    break;
                case 'se':
                    fixedX = bounds.minX; fixedY = bounds.minY;
                    sx = getScale(x, this.dragStart.x, fixedX);
                    sy = getScale(y, this.dragStart.y, fixedY);
                    break;
                case 's':
                    fixedX = bounds.cx!; fixedY = bounds.minY;
                    sy = getScale(y, this.dragStart.y, fixedY);
                    break;
                case 'sw':
                    fixedX = bounds.maxX; fixedY = bounds.minY;
                    sx = getScale(x, this.dragStart.x, fixedX);
                    sy = getScale(y, this.dragStart.y, fixedY);
                    break;
                case 'w':
                    fixedX = bounds.maxX; fixedY = bounds.cy!;
                    sx = getScale(x, this.dragStart.x, fixedX);
                    break;
            }

            if (['nw', 'ne', 'se', 'sw'].includes(this.resizeHandle!)) {
                const s = Math.max(Math.abs(sx), Math.abs(sy));
                sx = s * Math.sign(sx);
                sy = s * Math.sign(sy);
            }

            const epsilon = 0.0001;
            if (Math.abs(sx - 1) > epsilon || Math.abs(sy - 1) > epsilon) {
                const command = new ResizeShapeCommand(
                    this.editor.selectedShapes,
                    sx,
                    sy,
                    { x: fixedX, y: fixedY }
                );
                this.editor.history.execute(command);
            }
        }

        if (this.isDragSelecting && this.dragStart) {
            const { x, y } = this.editor.getMousePos(e);

            const rect: Rect = {
                minX: Math.min(this.dragStart.x, x),
                maxX: Math.max(this.dragStart.x, x),
                minY: Math.min(this.dragStart.y, y),
                maxY: Math.max(this.dragStart.y, y)
            };

            const isEnclosing = (x - this.dragStart.x) > 0;

            const newSelection: IShape[] = [];
            this.editor.shapes.forEach((shape: IShape) => {
                const shapeBounds = shape.getBounds ? shape.getBounds() : { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0, cx: 0, cy: 0 };
                if (isEnclosing) {
                    if (Geometry.rectContainsRect(rect, shapeBounds)) {
                        newSelection.push(shape);
                    }
                } else {
                    if (Geometry.rectIntersectsRect(rect, shapeBounds)) {
                        newSelection.push(shape);
                    }
                }
            });

            if (e.shiftKey) {
                const existing = this.editor.selectedShapes;
                const combined = [...existing];
                newSelection.forEach(s => {
                    if (!combined.find(e => e.id === s.id)) {
                        combined.push(s);
                    }
                });
                this.editor.selectedShapes = combined;
            } else {
                this.editor.selectedShapes = newSelection;
            }

            this.selectionBox = null;
            this.editor.selectionBox = null;
            this.editor.render();
        }

        this.isDraggingShape = false;
        this.isRotating = false;
        this.isResizing = false;
        this.isDragSelecting = false;
        this.initialSnapshots = [];
        this.initialBounds = null;
        this.dragStart = null;
        this.dragOrigin = null;
        this.resizeHandle = null;
    }

    onKeyDown(_e: KeyboardEvent): void {
        // Escape key is handled globally in PathEditor
    }

    onDeactivate(): void {
        this.editor.snapManager.clear();
    }

    getClickedControl(x: number, y: number): ControlHit | null {
        const config = this.editor.config;
        const zoom = this.editor.zoom;

        const screenHandleRadius = config.handleRadius + 3;
        const screenAnchorSize = config.anchorSize / 2 + 2;

        const worldHandleHitRadius = screenHandleRadius / zoom;
        const worldAnchorHitRadius = screenAnchorSize / zoom;

        const tol2 = worldHandleHitRadius ** 2;
        const anchorTol2 = worldAnchorHitRadius ** 2;

        const bounds = Geometry.getCombinedBounds(this.editor.selectedShapes);
        if (!bounds) return null;

        const ROTATION_HANDLE_OFFSET = 30;
        const handleOffset = ROTATION_HANDLE_OFFSET / zoom;

        const handleX = bounds.cx!;
        const handleY = bounds.minY - handleOffset;
        if (Geometry.getDistance({ x, y }, { x: handleX, y: handleY }) <= tol2) {
            return { type: 'rotate' };
        }

        const handles = [
            { type: 'nw', x: bounds.minX, y: bounds.minY },
            { type: 'n', x: bounds.cx!, y: bounds.minY },
            { type: 'ne', x: bounds.maxX, y: bounds.minY },
            { type: 'e', x: bounds.maxX, y: bounds.cy! },
            { type: 'se', x: bounds.maxX, y: bounds.maxY },
            { type: 's', x: bounds.cx!, y: bounds.maxY },
            { type: 'sw', x: bounds.minX, y: bounds.maxY },
            { type: 'w', x: bounds.minX, y: bounds.cy! }
        ];

        for (const h of handles) {
            if (Geometry.getDistance({ x, y }, { x: h.x, y: h.y }) <= anchorTol2) {
                return { type: 'resize', handle: h.type as string };
            }
        }
        return null;
    }

    private hitTestShape(shape: IShape, x: number, y: number): boolean {
        if (shape.type === 'group') {
            if (!shape.children) return false;
            return shape.children.some(child => this.hitTestShape(child, x, y));
        } else if (shape.type === 'text') {
            const bounds = shape.getBounds ? shape.getBounds() : null;
            if (!bounds) return false;
            return x >= bounds.minX && x <= bounds.maxX && y >= bounds.minY && y <= bounds.maxY;
        } else {
            const tolerance = 10 / this.editor.zoom;
            return Geometry.isPointInBezierPath(this.editor.ctx, shape, x, y, tolerance);
        }
    }

    handleResize(x: number, y: number): void {
        if (!this.initialBounds || !this.dragStart || !this.resizeHandle) return;

        const bounds = this.initialBounds;
        let sx = 1, sy = 1;
        let fixedX = 0, fixedY = 0;

        const getScale = (current: number, start: number, fixed: number): number => {
            if (Math.abs(start - fixed) < 1e-6) return 1;
            return (current - fixed) / (start - fixed);
        };

        switch (this.resizeHandle) {
            case 'nw':
                fixedX = bounds.maxX; fixedY = bounds.maxY;
                sx = getScale(x, this.dragStart.x, fixedX);
                sy = getScale(y, this.dragStart.y, fixedY);
                break;
            case 'n':
                fixedX = bounds.cx!; fixedY = bounds.maxY;
                sy = getScale(y, this.dragStart.y, fixedY);
                break;
            case 'ne':
                fixedX = bounds.minX; fixedY = bounds.maxY;
                sx = getScale(x, this.dragStart.x, fixedX);
                sy = getScale(y, this.dragStart.y, fixedY);
                break;
            case 'e':
                fixedX = bounds.minX; fixedY = bounds.cy!;
                sx = getScale(x, this.dragStart.x, fixedX);
                break;
            case 'se':
                fixedX = bounds.minX; fixedY = bounds.minY;
                sx = getScale(x, this.dragStart.x, fixedX);
                sy = getScale(y, this.dragStart.y, fixedY);
                break;
            case 's':
                fixedX = bounds.cx!; fixedY = bounds.minY;
                sy = getScale(y, this.dragStart.y, fixedY);
                break;
            case 'sw':
                fixedX = bounds.maxX; fixedY = bounds.minY;
                sx = getScale(x, this.dragStart.x, fixedX);
                sy = getScale(y, this.dragStart.y, fixedY);
                break;
            case 'w':
                fixedX = bounds.maxX; fixedY = bounds.cy!;
                sx = getScale(x, this.dragStart.x, fixedX);
                break;
        }

        if (['nw', 'ne', 'se', 'sw'].includes(this.resizeHandle!)) {
            const s = Math.max(Math.abs(sx), Math.abs(sy));
            sx = s * Math.sign(sx);
            sy = s * Math.sign(sy);
        }

        this.editor.selectedShapes.forEach((shape, i) => {
            const snapshot = this.initialSnapshots[i];
            if (!snapshot) return;
            restoreSnapshot(shape, snapshot);
            if (shape.scale) {
                shape.scale(sx, sy, { x: fixedX, y: fixedY });
            }
        });
    }
}
