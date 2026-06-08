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

type SelectState =
    | { kind: 'idle' }
    | { kind: 'dragging'; origin: Point; snapshots: ShapeSnapshot[]; snapCandidates: Point[] }
    | { kind: 'rotating'; center: Point; startAngle: number; snapshots: ShapeSnapshot[] }
    | { kind: 'resizing'; handle: string; origin: Point; bounds: Rect; snapshots: ShapeSnapshot[] }
    | { kind: 'marquee'; origin: Point };

function computeResizeScale(
    handle: string,
    origin: Point,
    current: Point,
    bounds: Rect
): { sx: number; sy: number; fixedX: number; fixedY: number } {
    let sx = 1, sy = 1;
    let fixedX = 0, fixedY = 0;

    const getScale = (cur: number, start: number, fixed: number): number => {
        if (Math.abs(start - fixed) < 1e-6) return 1;
        return (cur - fixed) / (start - fixed);
    };

    switch (handle) {
        case 'nw':
            fixedX = bounds.maxX; fixedY = bounds.maxY;
            sx = getScale(current.x, origin.x, fixedX);
            sy = getScale(current.y, origin.y, fixedY);
            break;
        case 'n':
            fixedX = bounds.cx!; fixedY = bounds.maxY;
            sy = getScale(current.y, origin.y, fixedY);
            break;
        case 'ne':
            fixedX = bounds.minX; fixedY = bounds.maxY;
            sx = getScale(current.x, origin.x, fixedX);
            sy = getScale(current.y, origin.y, fixedY);
            break;
        case 'e':
            fixedX = bounds.minX; fixedY = bounds.cy!;
            sx = getScale(current.x, origin.x, fixedX);
            break;
        case 'se':
            fixedX = bounds.minX; fixedY = bounds.minY;
            sx = getScale(current.x, origin.x, fixedX);
            sy = getScale(current.y, origin.y, fixedY);
            break;
        case 's':
            fixedX = bounds.cx!; fixedY = bounds.minY;
            sy = getScale(current.y, origin.y, fixedY);
            break;
        case 'sw':
            fixedX = bounds.maxX; fixedY = bounds.minY;
            sx = getScale(current.x, origin.x, fixedX);
            sy = getScale(current.y, origin.y, fixedY);
            break;
        case 'w':
            fixedX = bounds.maxX; fixedY = bounds.cy!;
            sx = getScale(current.x, origin.x, fixedX);
            break;
    }

    if (['nw', 'ne', 'se', 'sw'].includes(handle)) {
        const s = Math.max(Math.abs(sx), Math.abs(sy));
        sx = s * Math.sign(sx);
        sy = s * Math.sign(sy);
    }

    return { sx, sy, fixedX, fixedY };
}

export class SelectTool extends BaseTool {
    private state: SelectState = { kind: 'idle' };
    selectionBox: { x: number; y: number; width: number; height: number; style: { fill: string; stroke: string } } | null = null;

    constructor(editor: IEditorContext) {
        super(editor);
    }

    private captureSnapshots(): ShapeSnapshot[] {
        return this.editor.selectedShapes.map(s => captureSnapshot(s));
    }

    private restoreFromSnapshots(snapshots: ShapeSnapshot[]): void {
        this.editor.selectedShapes.forEach((shape, i) => {
            const snapshot = snapshots[i];
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
                        this.state = {
                            kind: 'rotating',
                            center: { x: bounds.cx!, y: bounds.cy! },
                            startAngle: Math.atan2(y - bounds.cy!, x - bounds.cx!),
                            snapshots: this.captureSnapshots()
                        };
                    } else if (hit.type === 'resize' && hit.handle) {
                        this.state = {
                            kind: 'resizing',
                            handle: hit.handle,
                            origin: { x, y },
                            bounds,
                            snapshots: this.captureSnapshots()
                        };
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
                const snapCandidates: Point[] = [{ x: 0, y: 0 }];
                const sourceShape = clickedShape || (this.editor.selectedShapes.length === 1 ? this.editor.selectedShapes[0] : null);

                if (sourceShape?.nodes) {
                    sourceShape.nodes.forEach(node => {
                        snapCandidates.push({ x: node.x - x, y: node.y - y });
                    });
                    if (sourceShape.getBounds) {
                        const b = sourceShape.getBounds();
                        snapCandidates.push({ x: b.cx - x, y: b.cy - y });
                    }
                }

                this.state = {
                    kind: 'dragging',
                    origin: { x, y },
                    snapshots: this.captureSnapshots(),
                    snapCandidates
                };
            }
        } else {
            if (!e.shiftKey) {
                this.editor.selectedShapes = [];
            }
            this.editor.snapManager.clear();
            this.state = { kind: 'marquee', origin: { x, y } };
        }
        this.editor.render();
    }

    onMouseMove(e: MouseEvent): void {
        const { x, y } = this.editor.getMousePos(e);
        this.editor.canvas.style.cursor = 'default';

        switch (this.state.kind) {
            case 'rotating': {
                const { center, startAngle, snapshots } = this.state;
                if (this.editor.selectedShapes.length === 0) return;
                const rawAngle = Math.atan2(y - center.y, x - center.x);
                const snappedAngle = this.editor.snapManager.snapAngle(rawAngle - startAngle, e.shiftKey);
                const deltaAngle = e.shiftKey ? snappedAngle : rawAngle - startAngle;

                this.editor.selectedShapes.forEach((shape, i) => {
                    const snapshot = snapshots[i];
                    if (!snapshot) return;
                    restoreSnapshot(shape, snapshot);
                    if (shape.rotate) shape.rotate(deltaAngle, center);
                });
                this.editor.render();
                return;
            }

            case 'resizing': {
                if (this.editor.selectedShapes.length === 0) return;
                const { handle, origin, bounds, snapshots } = this.state;
                const { sx, sy, fixedX, fixedY } = computeResizeScale(handle, origin, { x, y }, bounds);

                this.editor.selectedShapes.forEach((shape, i) => {
                    const snapshot = snapshots[i];
                    if (!snapshot) return;
                    restoreSnapshot(shape, snapshot);
                    if (shape.scale) shape.scale(sx, sy, { x: fixedX, y: fixedY });
                });
                this.editor.render();
                return;
            }

            case 'marquee': {
                const { origin } = this.state;
                const width = x - origin.x;
                const height = y - origin.y;
                const isCrossing = width < 0;
                const style = isCrossing
                    ? { fill: 'rgba(0, 255, 0, 0.1)', stroke: 'green' }
                    : { fill: 'rgba(255, 0, 0, 0.1)', stroke: 'red' };

                this.selectionBox = {
                    x: isCrossing ? x : origin.x,
                    y: origin.y < y ? origin.y : y,
                    width: Math.abs(width),
                    height: Math.abs(height),
                    style
                };
                this.editor.selectionBox = this.selectionBox;
                this.editor.render();
                return;
            }

            case 'dragging': {
                if (this.editor.selectedShapes.length === 0) return;
                const { origin, snapshots, snapCandidates } = this.state;
                const rawDx = x - origin.x;
                const rawDy = y - origin.y;

                let bestSnapDelta = { x: 0, y: 0 };
                let bestSnapDistSq = Infinity;
                let foundSnap = false;
                const excludeIds = this.editor.selectedShapes.map(s => s.id);
                const currentMouse = { x, y };

                if (snapCandidates.length > 0) {
                    for (const offset of snapCandidates) {
                        const probe = { x: currentMouse.x + offset.x, y: currentMouse.y + offset.y };
                        const res = this.editor.snapManager.snapPoint(probe, excludeIds);

                        if (res.type !== 'none') {
                            const dx = res.point.x - probe.x;
                            const dy = res.point.y - probe.y;
                            let effectiveDistSq = dx * dx + dy * dy;
                            if (res.type !== 'grid') effectiveDistSq *= 0.5;

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
                        bestSnapDelta = { x: res.point.x - currentMouse.x, y: res.point.y - currentMouse.y };
                        foundSnap = true;
                        this.editor.snapManager.activeSnap = res;
                    }
                }

                if (!foundSnap) this.editor.snapManager.clear();

                const totalDx = rawDx + bestSnapDelta.x;
                const totalDy = rawDy + bestSnapDelta.y;

                this.editor.selectedShapes.forEach((shape, i) => {
                    const snapshot = snapshots[i];
                    if (!snapshot) return;
                    restoreSnapshot(shape, snapshot);
                    if (shape.move) shape.move(totalDx, totalDy);
                });
                this.editor.render();
                return;
            }

            case 'idle': {
                if (this.editor.selectedShapes.length > 0 && this.getClickedControl(x, y)) {
                    this.editor.canvas.style.cursor = 'grab';
                } else {
                    for (const s of this.editor.shapes) {
                        if (this.hitTestShape(s, x, y)) {
                            this.editor.canvas.style.cursor = 'move';
                            break;
                        }
                    }
                }
                return;
            }
        }
    }

    onMouseUp(e: MouseEvent): void {
        switch (this.state.kind) {
            case 'rotating': {
                const { center, startAngle, snapshots } = this.state;
                if (this.editor.selectedShapes.length > 0) {
                    const { x, y } = this.editor.getMousePos(e);
                    this.restoreFromSnapshots(snapshots);

                    const finalRawAngle = Math.atan2(y - center.y, x - center.x);
                    const finalSnapped = this.editor.snapManager.snapAngle(finalRawAngle - startAngle, e.shiftKey);
                    const deltaAngle = e.shiftKey ? finalSnapped : finalRawAngle - startAngle;

                    if (Math.abs(deltaAngle) > 0.001) {
                        this.editor.history.execute(new RotateShapeCommand(
                            this.editor.selectedShapes, deltaAngle, center
                        ));
                    }
                }
                break;
            }

            case 'dragging': {
                const { snapshots } = this.state;
                if (this.editor.selectedShapes.length > 0 && snapshots.length > 0) {
                    const shape = this.editor.selectedShapes[0];
                    const snapshot = snapshots[0];

                    let totalDx = 0;
                    let totalDy = 0;

                    if (snapshot.type === 'path' && snapshot.nodes) {
                        const currentBounds = shape.getBounds ? shape.getBounds() : { minX: shape.x ?? 0, minY: shape.y ?? 0 };
                        const originalBounds = {
                            minX: Math.min(...snapshot.nodes.map((n: any) => n.x)),
                            minY: Math.min(...snapshot.nodes.map((n: any) => n.y))
                        };
                        totalDx = (currentBounds.minX ?? 0) - originalBounds.minX;
                        totalDy = (currentBounds.minY ?? 0) - originalBounds.minY;
                    } else {
                        totalDx = (shape.x ?? 0) - (snapshot.x ?? 0);
                        totalDy = (shape.y ?? 0) - (snapshot.y ?? 0);
                    }

                    if (Math.abs(totalDx) > 0.01 || Math.abs(totalDy) > 0.01) {
                        this.restoreFromSnapshots(snapshots);
                        this.editor.history.execute(new MoveShapeCommand(
                            this.editor, this.editor.selectedShapes, totalDx, totalDy
                        ));
                    }
                    this.editor.snapManager.clear();
                }
                break;
            }

            case 'resizing': {
                const { handle, origin, bounds, snapshots } = this.state;
                if (this.editor.selectedShapes.length > 0) {
                    const { x, y } = this.editor.getMousePos(e);
                    this.restoreFromSnapshots(snapshots);

                    const { sx, sy, fixedX, fixedY } = computeResizeScale(handle, origin, { x, y }, bounds);

                    const epsilon = 0.0001;
                    if (Math.abs(sx - 1) > epsilon || Math.abs(sy - 1) > epsilon) {
                        this.editor.history.execute(new ResizeShapeCommand(
                            this.editor.selectedShapes, sx, sy, { x: fixedX, y: fixedY }
                        ));
                    }
                }
                break;
            }

            case 'marquee': {
                const { origin } = this.state;
                const { x, y } = this.editor.getMousePos(e);

                const rect: Rect = {
                    minX: Math.min(origin.x, x),
                    maxX: Math.max(origin.x, x),
                    minY: Math.min(origin.y, y),
                    maxY: Math.max(origin.y, y)
                };
                const isEnclosing = (x - origin.x) > 0;

                const newSelection: IShape[] = [];
                this.editor.shapes.forEach((shape: IShape) => {
                    const shapeBounds = shape.getBounds ? shape.getBounds() : { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0, cx: 0, cy: 0 };
                    if (isEnclosing) {
                        if (Geometry.rectContainsRect(rect, shapeBounds)) newSelection.push(shape);
                    } else {
                        if (Geometry.rectIntersectsRect(rect, shapeBounds)) newSelection.push(shape);
                    }
                });

                if (e.shiftKey) {
                    const existing = this.editor.selectedShapes;
                    const combined = [...existing];
                    newSelection.forEach(s => {
                        if (!combined.find(ex => ex.id === s.id)) combined.push(s);
                    });
                    this.editor.selectedShapes = combined;
                } else {
                    this.editor.selectedShapes = newSelection;
                }

                this.selectionBox = null;
                this.editor.selectionBox = null;
                this.editor.render();
                break;
            }

            case 'idle':
                break;
        }

        this.state = { kind: 'idle' };
    }

    onKeyDown(_e: KeyboardEvent): void {
        // Escape is handled globally by ToolManager
    }

    onDeactivate(): void {
        this.state = { kind: 'idle' };
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
}
