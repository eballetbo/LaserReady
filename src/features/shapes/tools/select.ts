import { BaseTool, IEditorContext } from '../../../core/tools/base';
import { Geometry, Point, Rect } from '../../../core/math/geometry';
import { IShape } from '../../../types/core';
import { ResizeShapeCommand } from '../commands/resize';
import { MoveShapeCommand } from '../commands/move';
import { RotateShapeCommand } from '../commands/rotate';

interface ControlHit {
    type: 'rotate' | 'resize';
    handle?: string;
}

export class SelectTool extends BaseTool {
    isDraggingShape: boolean;
    isRotating: boolean;
    isResizing: boolean;
    dragStart: Point | null;
    initialShapeStates: any[]; // Ideally should be PathShape[] but using any for now to match method calls
    initialBounds: Rect | null;
    resizeHandle: string | null;
    rotationCenter: Point | null;
    rotateStartAngle: number;
    isDragSelecting: boolean;
    selectionBox: { x: number; y: number; width: number; height: number; style: { fill: string; stroke: string } } | null;

    constructor(editor: IEditorContext) {
        super(editor);
        this.isDraggingShape = false;
        this.isRotating = false;
        this.isResizing = false;
        this.dragStart = null;
        this.initialShapeStates = [];
        this.initialBounds = null;
        this.resizeHandle = null;
        this.rotationCenter = null;
        this.rotateStartAngle = 0;
        this.isDragSelecting = false;
        this.selectionBox = null;
    }

    onMouseDown(e: MouseEvent): void {
        const { x, y } = this.editor.getMousePos(e);

        // Check for control handles first (if we have any selection)
        if (this.editor.selectedShapes.length > 0) {
            const hit = this.getClickedControl(x, y);
            if (hit) {
                const bounds = Geometry.getCombinedBounds(this.editor.selectedShapes);
                if (bounds) {
                    if (hit.type === 'rotate') {
                        this.isRotating = true;
                        this.rotationCenter = { x: bounds.cx!, y: bounds.cy! };
                        this.rotateStartAngle = Math.atan2(y - bounds.cy!, x - bounds.cx!);
                        this.initialShapeStates = this.editor.selectedShapes.map(s => s.clone());
                    } else if (hit.type === 'resize' && hit.handle) {
                        this.isResizing = true;
                        this.resizeHandle = hit.handle;
                        this.initialShapeStates = this.editor.selectedShapes.map(s => s.clone());
                        this.initialBounds = bounds;
                        this.dragStart = { x, y };
                    }
                }
                return;
            }
        }

        let clickedShape: IShape | null = null;
        // Hit test in reverse order (top to bottom)
        for (let i = this.editor.shapes.length - 1; i >= 0; i--) {
            const shape = this.editor.shapes[i];
            if (shape.type === 'text') {
                const bounds = shape.getBounds();
                if (x >= bounds.minX && x <= bounds.maxX && y >= bounds.minY && y <= bounds.maxY) {
                    clickedShape = shape;
                    break;
                }
            } else if (Geometry.isPointInBezierPath(this.editor.ctx, shape, x, y)) {
                clickedShape = shape;
                break;
            }
        }

        if (clickedShape) {
            if (e.ctrlKey || e.metaKey) {
                // Ctrl/Cmd + Click: Toggle selection
                const currentSelection = this.editor.selectedShapes;
                const index = currentSelection.findIndex(s => s.id === clickedShape.id);
                if (index > -1) {
                    // Remove: create new array without this shape
                    this.editor.selectedShapes = currentSelection.filter(s => s.id !== clickedShape.id);
                } else {
                    // Add: create new array with this shape
                    this.editor.selectedShapes = [...currentSelection, clickedShape];
                }
            } else if (e.shiftKey) {
                // Shift + Click: Add to selection (not toggle)
                const currentSelection = this.editor.selectedShapes;
                if (!currentSelection.some(s => s.id === clickedShape.id)) {
                    this.editor.selectedShapes = [...currentSelection, clickedShape];
                }
            } else {
                // Single Click: Deselect all, select clicked
                this.editor.selectedShapes = [clickedShape];
            }
            this.isDraggingShape = true;
            this.dragStart = { x, y };
            // Capture initial state for MoveCommand
            this.initialShapeStates = this.editor.selectedShapes.map(shape => shape.clone());
        } else {
            // Clicked empty space
            if (!e.shiftKey) {
                this.editor.selectedShapes = [];
            }
            this.isDragSelecting = true;
            this.dragStart = { x, y };
        }
        this.editor.render();
    }

    onMouseMove(e: MouseEvent): void {
        const { x, y } = this.editor.getMousePos(e);
        this.editor.canvas.style.cursor = 'default';


        if (this.isRotating && this.editor.selectedShapes.length > 0 && this.rotationCenter) {
            const currentAngle = Math.atan2(y - this.rotationCenter.y, x - this.rotationCenter.x);
            const deltaAngle = currentAngle - this.rotateStartAngle;

            // Rotate preview: restore original, then apply rotation in-place
            this.editor.selectedShapes.forEach((shape, i) => {
                const original = this.initialShapeStates[i];
                // Restore nodes to original state first
                shape.nodes = original.nodes.map((n: any) => n.clone());
                // Then apply current rotation
                shape.rotate(deltaAngle, this.rotationCenter);
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

            // Determine style based on direction
            // Left→Right (width > 0) = Enclosing (Blue)
            // Right→Left (width < 0) = Crossing (Red)
            const isCrossing = width < 0;
            const style = isCrossing
                ? { fill: 'rgba(0, 255, 0, 0.1)', stroke: 'green' }       // Crossing
                : { fill: 'rgba(255, 0, 0, 0.1)', stroke: 'red' };    // Enclosing

            this.selectionBox = {
                x: isCrossing ? x : this.dragStart.x,
                y: this.dragStart.y < y ? this.dragStart.y : y, // Normalize Y for drawing
                width: Math.abs(width),
                height: Math.abs(height),
                style
            };

            // Assign to editor so PathEditor can pass it to renderer
            this.editor.selectionBox = this.selectionBox;

            // Trigger normal render which will include the selection box
            this.editor.render();
            return;
        }

        // Cursor updates
        if (this.editor.selectedShapes.length > 0 && this.getClickedControl(x, y)) {
            this.editor.canvas.style.cursor = 'grab';
        } else {
            let hover = false;
            for (const s of this.editor.shapes) {
                if (s.type === 'text') {
                    const b = s.getBounds();
                    if (x >= b.minX && x <= b.maxX && y >= b.minY && y <= b.maxY) {
                        hover = true;
                        break;
                    }
                } else if (Geometry.isPointInBezierPath(this.editor.ctx, s, x, y)) {
                    hover = true;
                    break;
                }
            }
            if (hover) {
                this.editor.canvas.style.cursor = 'move';
            }
        }

        if (this.isDraggingShape && this.editor.selectedShapes.length > 0 && this.dragStart) {
            const dx = x - this.dragStart.x;
            const dy = y - this.dragStart.y;

            // Direct mutation for preview (avoids history spam)
            this.editor.selectedShapes.forEach(shape => {
                if ('move' in shape) {
                    (shape as any).move(dx, dy);
                }
            });

            this.dragStart = { x, y };
            this.editor.render();
        }
    }

    onMouseUp(e: MouseEvent): void {
        // Handle rotation with RotateCommand for undo/redo
        if (this.isRotating && this.editor.selectedShapes.length > 0 && this.rotationCenter) {
            const { x, y } = this.editor.getMousePos(e);

            // Restore shapes to original state first
            this.editor.selectedShapes.forEach((shape, i) => {
                const original = this.initialShapeStates[i];
                if (shape.nodes && original.nodes) {
                    shape.nodes = original.nodes.map((n: any) => n.clone());
                }
            });

            // Calculate final rotation angle
            const currentAngle = Math.atan2(y - this.rotationCenter.y, x - this.rotationCenter.x);
            const deltaAngle = currentAngle - this.rotateStartAngle;

            // Only create command if there was actual rotation
            if (Math.abs(deltaAngle) > 0.001) {
                const command = new RotateShapeCommand(
                    this.editor.selectedShapes as any[],
                    deltaAngle,
                    this.rotationCenter
                );
                this.editor.history.execute(command);
            }
        }

        // STEP 6: Handle drag/move with MoveCommand for undo/redo
        // STEP 6: Handle drag/move with MoveCommand for undo/redo
        if (this.isDraggingShape && this.editor.selectedShapes.length > 0 && this.dragStart && this.initialShapeStates.length > 0) {
            // Calculate total displacement by comparing current first node with initial first node
            // Note: This matches the logic that shapes were mutually moved by same delta

            // NOTE: We can't rely on 'dragStart' for total delta because it was reset during drag
            // We must compare current state with initial state.

            const shape = this.editor.selectedShapes[0];
            const original = this.initialShapeStates[0];

            // Assume PathShape with nodes
            // Delta = current - original
            let totalDx = 0;
            let totalDy = 0;

            if (shape.nodes && shape.nodes.length > 0 && original.nodes && original.nodes.length > 0) {
                totalDx = shape.nodes[0].x - original.nodes[0].x;
                totalDy = shape.nodes[0].y - original.nodes[0].y;
            }

            // Only create command if there was actual movement
            if (Math.abs(totalDx) > 0.01 || Math.abs(totalDy) > 0.01) {
                // Restore to original positions first
                // (They were mutated during onMouseMove for preview)
                this.editor.selectedShapes.forEach((shape, i) => {
                    const original = this.initialShapeStates[i];
                    if (shape.nodes && original.nodes) {
                        shape.nodes = original.nodes.map((n: any) => n.clone());
                    }
                });

                // Execute move via Command (which applies the delta AND pushes to history)
                const command = new MoveShapeCommand(
                    this.editor.selectedShapes as any[],
                    totalDx,
                    totalDy
                ); // FIX: Removed trailing comma inside call
                this.editor.history.execute(command);
            }
        }

        // STEP 5: Handle resize with ResizeCommand for undo/redo
        if (this.isResizing && this.editor.selectedShapes.length > 0 && this.initialBounds && this.dragStart) {
            const { x, y } = this.editor.getMousePos(e);

            // First, restore shapes to original state
            // (They were mutated during onMouseMove for preview)
            this.editor.selectedShapes.forEach((shape, i) => {
                const original = this.initialShapeStates[i];
                if (shape.nodes && original.nodes) {
                    shape.nodes = original.nodes.map((n: any) => n.clone());
                }
            });

            // Calculate final scale factors
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

            // Execute resize via Command for undo/redo support
            const command = new ResizeShapeCommand(
                this.editor.selectedShapes as any[],
                sx,
                sy,
                { x: fixedX, y: fixedY }
            );
            this.editor.history.execute(command);
        }

        if (this.isDragSelecting && this.dragStart) {
            const { x, y } = this.editor.getMousePos(e);
            const width = x - this.dragStart.x;
            const height = y - this.dragStart.y;

            // Normalize rect for intersection checks
            const rect: Rect = {
                minX: Math.min(this.dragStart.x, x),
                maxX: Math.max(this.dragStart.x, x),
                minY: Math.min(this.dragStart.y, y),
                maxY: Math.max(this.dragStart.y, y)
            };

            // Determine selection mode based on drag direction
            const isEnclosing = width > 0; // Left→Right = Enclosing

            const newSelection: IShape[] = [];
            this.editor.shapes.forEach((shape: IShape) => {
                const shapeBounds = shape.getBounds();

                if (isEnclosing) {
                    // Enclosing: Shape must be 100% inside selection rect
                    if (Geometry.rectContainsRect(rect, shapeBounds)) {
                        newSelection.push(shape);
                    }
                } else {
                    // Crossing: Shape just needs to touch/intersect
                    if (Geometry.rectIntersectsRect(rect, shapeBounds)) {
                        newSelection.push(shape);
                    }
                }
            });

            // If Shift is held, add to existing selection
            if (e.shiftKey) {
                newSelection.forEach(s => {
                    if (!this.editor.selectedShapes.includes(s)) {
                        this.editor.selectedShapes.push(s);
                    }
                });
            } else {
                this.editor.selectedShapes = newSelection;
            }

            // Clear selection box after selection is complete
            this.selectionBox = null;
            this.editor.selectionBox = null;
            this.editor.render();
        }

        this.isDraggingShape = false;
        this.isRotating = false;
        this.isResizing = false;
        this.isDragSelecting = false;
        this.initialShapeStates = [];
        this.initialBounds = null;
        this.dragStart = null;  // FIX: Reset to prevent move/resize confusion
        this.resizeHandle = null;  // FIX: Clear resize handle reference
    }

    onKeyDown(e: KeyboardEvent): void {
        // Escape key is handled globally in PathEditor
        // SelectTool-specific key handling can go here
    }

    getClickedControl(x: number, y: number): ControlHit | null {
        const config = this.editor.config;
        const tol2 = (config.handleRadius + 3) ** 2;
        const anchorTol2 = (config.anchorSize / 2 + 2) ** 2;

        const bounds = Geometry.getCombinedBounds(this.editor.selectedShapes);
        if (!bounds) return null;

        // Check rotation handle
        const handleX = bounds.cx!;
        const handleY = bounds.minY - 20;
        if (Geometry.getDistance({ x, y }, { x: handleX, y: handleY }) <= tol2) {
            return { type: 'rotate' };
        }

        // Check 8 resize handles
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

        if (['nw', 'ne', 'se', 'sw'].includes(this.resizeHandle)) {
            const s = Math.max(Math.abs(sx), Math.abs(sy));
            sx = s * Math.sign(sx);
            sy = s * Math.sign(sy);
        }

        this.editor.selectedShapes.forEach((shape, i) => {
            const original = this.initialShapeStates[i];
            const scaledShape = original.clone();
            scaledShape.scale(sx, sy, { x: fixedX, y: fixedY });

            // FIX: Instead of replacing the shape instance, copy the transformed nodes
            // This preserves the shape reference and maintains selection
            if (shape.nodes && scaledShape.nodes) {
                shape.nodes = scaledShape.nodes.map((n: any) => n.clone());
            }

            // Also copy other properties that might have changed
            if ('rotation' in shape && 'rotation' in scaledShape) {
                (shape as any).rotation = (scaledShape as any).rotation;
            }
        });
    }
}
