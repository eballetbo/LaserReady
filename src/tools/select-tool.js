import { BaseTool } from './base-tool.js';
import { Geometry } from '../math/geometry.js';

export class SelectTool extends BaseTool {
    constructor(editor) {
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

    onMouseDown(e) {
        const { x, y } = this.editor.getMousePos(e);

        // Check for control handles first (if we have any selection)
        if (this.editor.selectedShapes.length > 0) {
            const hit = this.getClickedControl(x, y);
            if (hit) {
                const bounds = Geometry.getCombinedBounds(this.editor.selectedShapes);
                if (hit.type === 'rotate') {
                    this.isRotating = true;
                    this.rotationCenter = { x: bounds.cx, y: bounds.cy };
                    this.rotateStartAngle = Math.atan2(y - bounds.cy, x - bounds.cy);
                    this.initialShapeStates = this.editor.selectedShapes.map(s => s.clone());
                } else if (hit.type === 'resize') {
                    this.isResizing = true;
                    this.resizeHandle = hit.handle;
                    this.initialShapeStates = this.editor.selectedShapes.map(s => s.clone());
                    this.initialBounds = bounds;
                    this.dragStart = { x, y };
                }
                return;
            }
        }

        let clickedShape = null;
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
            if (e.shiftKey) {
                // Toggle selection
                const index = this.editor.selectedShapes.indexOf(clickedShape);
                if (index > -1) {
                    this.editor.selectedShapes.splice(index, 1);
                } else {
                    this.editor.selectedShapes.push(clickedShape);
                }
            } else {
                // If clicked shape is not already selected, select it exclusively
                // If it IS selected, keep selection (might be starting a drag of multiple items)
                if (!this.editor.selectedShapes.includes(clickedShape)) {
                    this.editor.selectedShapes = [clickedShape];
                }
            }
            this.isDraggingShape = true;
            this.dragStart = { x, y };
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

    onMouseMove(e) {
        const { x, y } = this.editor.getMousePos(e);
        this.editor.canvas.style.cursor = 'default';

        if (this.isRotating && this.editor.selectedShapes.length > 0) {
            const currentAngle = Math.atan2(y - this.rotationCenter.y, x - this.rotationCenter.x);
            const deltaAngle = currentAngle - this.rotateStartAngle;

            this.editor.selectedShapes.forEach((shape, i) => {
                const original = this.initialShapeStates[i];
                const newShape = original.clone();
                newShape.rotate(deltaAngle, this.rotationCenter);

                // Update the shape in the editor's list
                const index = this.editor.shapes.indexOf(shape);
                if (index !== -1) {
                    this.editor.shapes[index] = newShape;
                    // Update reference in selectedShapes
                    this.editor.selectedShapes[i] = newShape;
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

        if (this.isDragSelecting) {
            const width = x - this.dragStart.x;
            const height = y - this.dragStart.y;

            // Determine style based on direction (Right=Red/Enclosing, Left=Green/Crossing)
            const isCrossing = width < 0;
            const style = isCrossing
                ? { fill: 'rgba(0, 255, 0, 0.1)', stroke: 'green' }
                : { fill: 'rgba(255, 0, 0, 0.1)', stroke: 'red' };

            this.selectionBox = {
                x: isCrossing ? x : this.dragStart.x,
                y: this.dragStart.y < y ? this.dragStart.y : y, // Normalize Y for drawing
                width: Math.abs(width),
                height: Math.abs(height),
                style
            };

            // Pass selectionBox to render
            this.editor.renderer.drawScene(
                this.editor.shapes,
                this.editor.selectedShapes,
                this.editor.config,
                this.editor.tool,
                this.editor.activePath,
                this.editor.previewPoint,
                this.selectionBox
            );
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

        if (this.isDraggingShape && this.editor.selectedShapes.length > 0) {
            const dx = x - this.dragStart.x;
            const dy = y - this.dragStart.y;

            this.editor.selectedShapes.forEach(shape => {
                shape.move(dx, dy);
            });

            this.dragStart = { x, y };
            this.editor.render();
        }
    }

    onMouseUp(e) {
        if (this.isDragSelecting) {
            const { x, y } = this.editor.getMousePos(e);
            const width = x - this.dragStart.x;
            const height = y - this.dragStart.y;

            // Normalize rect for intersection checks
            const rect = {
                minX: Math.min(this.dragStart.x, x),
                maxX: Math.max(this.dragStart.x, x),
                minY: Math.min(this.dragStart.y, y),
                maxY: Math.max(this.dragStart.y, y)
            };

            const isCrossing = width < 0;

            const newSelection = [];
            this.editor.shapes.forEach(shape => {
                if (isCrossing) {
                    if (Geometry.isShapeIntersectingRect(shape, rect)) {
                        newSelection.push(shape);
                    }
                } else {
                    if (Geometry.isShapeInRect(shape, rect)) {
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

            this.selectionBox = null;
            this.editor.render();
        }

        this.isDraggingShape = false;
        this.isRotating = false;
        this.isResizing = false;
        this.isDragSelecting = false;
        this.initialShapeStates = [];
        this.initialBounds = null;
    }

    onKeyDown(e) {
        if (e.key === 'Escape') {
            this.editor.selectedShapes = [];
            this.editor.render();
        }
    }

    getClickedControl(x, y) {
        const config = this.editor.config;
        const tol2 = (config.handleRadius + 3) ** 2;
        const anchorTol2 = (config.anchorSize / 2 + 2) ** 2;

        const bounds = Geometry.getCombinedBounds(this.editor.selectedShapes);
        if (!bounds) return null;

        // Check rotation handle
        const handleX = bounds.cx;
        const handleY = bounds.minY - 20;
        if (Geometry.getDistance({ x, y }, { x: handleX, y: handleY }) <= tol2) {
            return { type: 'rotate' };
        }

        // Check 8 resize handles
        const handles = [
            { type: 'nw', x: bounds.minX, y: bounds.minY },
            { type: 'n', x: bounds.cx, y: bounds.minY },
            { type: 'ne', x: bounds.maxX, y: bounds.minY },
            { type: 'e', x: bounds.maxX, y: bounds.cy },
            { type: 'se', x: bounds.maxX, y: bounds.maxY },
            { type: 's', x: bounds.cx, y: bounds.maxY },
            { type: 'sw', x: bounds.minX, y: bounds.maxY },
            { type: 'w', x: bounds.minX, y: bounds.cy }
        ];

        for (const h of handles) {
            if (Geometry.getDistance({ x, y }, { x: h.x, y: h.y }) <= anchorTol2) {
                return { type: 'resize', handle: h.type };
            }
        }
        return null;
    }

    handleResize(x, y) {
        const bounds = this.initialBounds;
        let sx = 1, sy = 1;
        let fixedX = 0, fixedY = 0;

        const getScale = (current, start, fixed) => {
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
                fixedX = bounds.cx; fixedY = bounds.maxY;
                sy = getScale(y, this.dragStart.y, fixedY);
                break;
            case 'ne':
                fixedX = bounds.minX; fixedY = bounds.maxY;
                sx = getScale(x, this.dragStart.x, fixedX);
                sy = getScale(y, this.dragStart.y, fixedY);
                break;
            case 'e':
                fixedX = bounds.minX; fixedY = bounds.cy;
                sx = getScale(x, this.dragStart.x, fixedX);
                break;
            case 'se':
                fixedX = bounds.minX; fixedY = bounds.minY;
                sx = getScale(x, this.dragStart.x, fixedX);
                sy = getScale(y, this.dragStart.y, fixedY);
                break;
            case 's':
                fixedX = bounds.cx; fixedY = bounds.minY;
                sy = getScale(y, this.dragStart.y, fixedY);
                break;
            case 'sw':
                fixedX = bounds.maxX; fixedY = bounds.minY;
                sx = getScale(x, this.dragStart.x, fixedX);
                sy = getScale(y, this.dragStart.y, fixedY);
                break;
            case 'w':
                fixedX = bounds.maxX; fixedY = bounds.cy;
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
            const newShape = original.clone();
            newShape.scale(sx, sy, { x: fixedX, y: fixedY });

            const index = this.editor.shapes.indexOf(shape);
            if (index !== -1) {
                this.editor.shapes[index] = newShape;
                this.editor.selectedShapes[i] = newShape;
            }
        });
    }
}
