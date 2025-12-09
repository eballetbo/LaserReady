import { Geometry } from '../math/geometry.js';

export class CanvasRenderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
    }

    clear() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    drawGrid(spacing = 40) {
        this.ctx.strokeStyle = '#f0f0f0';
        this.ctx.lineWidth = 1;
        this.ctx.beginPath();
        const step = spacing;
        for (let i = 0; i < this.canvas.width; i += step) { this.ctx.moveTo(i, 0); this.ctx.lineTo(i, this.canvas.height); }
        for (let i = 0; i < this.canvas.height; i += step) { this.ctx.moveTo(0, i); this.ctx.lineTo(this.canvas.width, i); }
        this.ctx.stroke();
    }

    drawScene(shapes, selectedShapes, config, toolType, activePath, previewPoint, selectionBox, zoom = 1, pan = { x: 0, y: 0 }, selectedNodeIndex = null) {
        this.clear();

        this.ctx.save();
        this.ctx.translate(pan.x, pan.y);
        this.ctx.scale(zoom, zoom);

        // Draw grid (scaled? or infinite? Let's scale it for now)
        // Actually, if we scale the grid, the lines get thicker.
        // We probably want to draw the grid BEFORE transform, but adjusted for pan/zoom.
        // Or just draw it here and let it scale. 
        // Let's try drawing it here first.
        this.drawGrid(config.gridSpacing);

        shapes.forEach(shape => {
            const isSelected = selectedShapes.includes(shape);

            if (shape.type === 'text') {
                this.drawText(shape, isSelected, config);
            } else {
                this.drawPath(shape, isSelected, config);
                if (isSelected && toolType === 'node-edit') {
                    this.drawNodes(shape, config, selectedNodeIndex);
                }
            }
        });

        if (selectedShapes.length > 0 && toolType === 'select') {
            const combinedBounds = Geometry.getCombinedBounds(selectedShapes);
            if (combinedBounds) {
                this.drawSelectionBounds(combinedBounds, config);
            }
        }

        // Draw preview line for Pen tool
        if (toolType === 'pen' && activePath && previewPoint) {
            this.drawPenPreview(activePath, previewPoint);
        }

        // Draw selection box
        if (selectionBox) {
            this.drawSelectionBox(selectionBox);
        }

        this.ctx.restore();
    }

    drawPath(shape, isSelected, config) {
        if (shape.nodes.length < 2) return;

        this.ctx.beginPath();
        this.ctx.moveTo(shape.nodes[0].x, shape.nodes[0].y);

        for (let i = 0; i < shape.nodes.length; i++) {
            let nextNode;
            if (i === shape.nodes.length - 1) {
                if (!shape.closed) break;
                nextNode = shape.nodes[0];
            } else {
                nextNode = shape.nodes[i + 1];
            }

            this.ctx.bezierCurveTo(
                shape.nodes[i].cpOut.x, shape.nodes[i].cpOut.y,
                nextNode.cpIn.x, nextNode.cpIn.y,
                nextNode.x, nextNode.y
            );
        }

        if (shape.closed) this.ctx.closePath();

        if (shape.closed) this.ctx.closePath();

        // Use shape properties if available, otherwise config defaults
        this.ctx.fillStyle = shape.fillColor || config.colorFill;
        this.ctx.fill();

        const strokeColor = shape.strokeColor || config.colorStroke;
        const strokeWidth = shape.strokeWidth !== undefined ? shape.strokeWidth : 2;

        if (strokeWidth > 0) {
            this.ctx.strokeStyle = isSelected ? config.colorSelection : strokeColor;
            this.ctx.lineWidth = strokeWidth;
            this.ctx.stroke();
        }

        // Selection overlay (always draw if selected, to show selection even if shape is invisible)
        if (isSelected) {
            this.ctx.strokeStyle = config.colorSelection;
            this.ctx.lineWidth = 2;
            this.ctx.stroke();
            this.ctx.fillStyle = config.colorSelection;
            this.ctx.fill();
        }
    }

    drawNodes(shape, config, selectedNodeIndex) {
        // 1. Draw Anchors (Squares) first
        shape.nodes.forEach((n, i) => {
            this.ctx.fillStyle = i === selectedNodeIndex ? config.colorSelection : config.colorAnchor;
            const size = config.anchorSize;
            this.ctx.fillRect(n.x - size / 2, n.y - size / 2, size, size);
        });

        // 2. Draw Handles (Lines + Circles) ONLY for selected node
        if (selectedNodeIndex !== null && selectedNodeIndex >= 0 && selectedNodeIndex < shape.nodes.length) {
            const n = shape.nodes[selectedNodeIndex];

            // Helper to check if handle is at anchor
            const isAtAnchor = (p) => Math.abs(p.x - n.x) < 0.1 && Math.abs(p.y - n.y) < 0.1;

            this.ctx.strokeStyle = config.colorHandleLine;
            this.ctx.lineWidth = 1;
            this.ctx.beginPath();

            // Draw In Handle if not at anchor
            if (!isAtAnchor(n.cpIn)) {
                this.ctx.moveTo(n.x, n.y);
                this.ctx.lineTo(n.cpIn.x, n.cpIn.y);
            }

            // Draw Out Handle if not at anchor
            if (!isAtAnchor(n.cpOut)) {
                this.ctx.moveTo(n.x, n.y);
                this.ctx.lineTo(n.cpOut.x, n.cpOut.y);
            }
            this.ctx.stroke();

            // Draw Handle Circles
            if (!isAtAnchor(n.cpIn)) {
                this.drawCircle(n.cpIn.x, n.cpIn.y, config.handleRadius, config.colorHandle);
            }
            if (!isAtAnchor(n.cpOut)) {
                this.drawCircle(n.cpOut.x, n.cpOut.y, config.handleRadius, config.colorHandle);
            }
        }
    }

    drawSelectionBounds(bounds, config) {

        // Draw rotation handle
        const handleX = bounds.cx;
        const handleY = bounds.minY - 20;

        this.ctx.beginPath();
        this.ctx.moveTo(bounds.cx, bounds.minY);
        this.ctx.lineTo(handleX, handleY);
        this.ctx.strokeStyle = config.colorSelection;
        this.ctx.stroke();

        this.drawCircle(handleX, handleY, config.handleRadius, config.colorSelection);

        // Draw bounding box
        this.ctx.strokeStyle = config.colorSelection;
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(bounds.minX, bounds.minY, bounds.width, bounds.height);

        // Draw 8 resize handles
        const size = config.anchorSize;
        this.ctx.fillStyle = config.colorAnchor;

        const handles = [
            { x: bounds.minX, y: bounds.minY }, // nw
            { x: bounds.cx, y: bounds.minY },   // n
            { x: bounds.maxX, y: bounds.minY }, // ne
            { x: bounds.maxX, y: bounds.cy },   // e
            { x: bounds.maxX, y: bounds.maxY }, // se
            { x: bounds.cx, y: bounds.maxY },   // s
            { x: bounds.minX, y: bounds.maxY }, // sw
            { x: bounds.minX, y: bounds.cy }    // w
        ];

        handles.forEach(h => {
            this.ctx.fillRect(h.x - size / 2, h.y - size / 2, size, size);
        });
    }

    drawCircle(x, y, r, color) {
        this.ctx.beginPath();
        this.ctx.arc(x, y, r, 0, Math.PI * 2);
        this.ctx.fillStyle = color;
        this.ctx.fill();
    }

    drawPenPreview(activePath, previewPoint) {
        if (activePath.nodes.length === 0) return;
        const lastNode = activePath.nodes[activePath.nodes.length - 1];
        this.ctx.beginPath();
        this.ctx.moveTo(lastNode.x, lastNode.y);
        this.ctx.lineTo(previewPoint.x, previewPoint.y);
        this.ctx.strokeStyle = '#999';
        this.ctx.lineWidth = 1;
        this.ctx.setLineDash([5, 5]);
        this.ctx.stroke();
        this.ctx.setLineDash([]);
    }

    drawSelectionBox(box) {
        this.ctx.fillStyle = box.style.fill;
        this.ctx.strokeStyle = box.style.stroke;
        this.ctx.lineWidth = 1;
        this.ctx.fillRect(box.x, box.y, box.width, box.height);
        this.ctx.strokeRect(box.x, box.y, box.width, box.height);
    }

    drawText(textObject, isSelected, config) {
        this.ctx.save();

        // Font settings
        const fontStyle = textObject.fontStyle || 'normal';
        const fontWeight = textObject.fontWeight || 'normal';
        const fontSize = textObject.fontSize || 24;
        const fontFamily = textObject.fontFamily || 'Arial';
        this.ctx.font = `${fontStyle} ${fontWeight} ${fontSize}px ${fontFamily}`;

        // Colors
        this.ctx.fillStyle = textObject.fillColor || config.colorStroke; // Default to black/stroke color

        // Apply rotation and scaling
        // We translate to the text position (x, y)
        this.ctx.translate(textObject.x, textObject.y);

        // Apply rotation
        if (textObject.rotation) {
            this.ctx.rotate(textObject.rotation);
        }

        // Apply scaling
        if (textObject.scaleX !== undefined || textObject.scaleY !== undefined) {
            this.ctx.scale(textObject.scaleX || 1, textObject.scaleY || 1);
        }

        // Draw text
        // Since we translated to (x, y), we draw at (0, 0) relative to the new origin
        // But wait, textObject.y is the top-left of the bounding box (roughly), 
        // whereas fillText expects baseline y.
        // In getBounds, we assumed y is top-left?
        // No, in getBounds: minY: this.y - this.fontSize
        // So this.y is the baseline of the first line.

        const lines = textObject.text.split('\n');
        const lineHeight = fontSize * 1.2;

        lines.forEach((line, i) => {
            // We draw at 0, 0 + offset because we already translated to (x, y)
            this.ctx.fillText(line, 0, 0 + i * lineHeight);
            if (textObject.strokeWidth > 0 && textObject.strokeColor) {
                this.ctx.strokeStyle = textObject.strokeColor;
                this.ctx.lineWidth = textObject.strokeWidth;
                this.ctx.strokeText(line, 0, 0 + i * lineHeight);
            }
        });

        // Restore context
        this.ctx.restore();

        // We need to return early or skip the original drawing loop because we handled it here
        // Helper to keep the method structure valid since I'm replacing a block inside drawText
        // Actually, I should replace the whole drawText method to be safe and clean.
        // But the tool asks for a chunk.
        // Let's replace the whole drawText method content.

        // Draw selection overlay separately (in world space)
        if (isSelected) {
            const bounds = textObject.getBounds(); // This is AABB
            this.ctx.strokeStyle = config.colorSelection;
            this.ctx.lineWidth = 1;
            this.ctx.strokeRect(bounds.minX, bounds.minY, bounds.width, bounds.height);
        }
    }
}
