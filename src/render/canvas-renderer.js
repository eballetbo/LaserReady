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

    drawScene(shapes, selectedShapes, config, toolType, activePath, previewPoint, selectionBox, zoom = 1, pan = { x: 0, y: 0 }) {
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
            this.drawPath(shape, isSelected, config);

            if (isSelected && toolType === 'node-edit') {
                this.drawNodes(shape, config);
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

    drawNodes(shape, config) {
        this.ctx.strokeStyle = config.colorHandleLine;
        this.ctx.lineWidth = 1;
        this.ctx.beginPath();
        shape.nodes.forEach(n => {
            this.ctx.moveTo(n.x, n.y); this.ctx.lineTo(n.cpIn.x, n.cpIn.y);
            this.ctx.moveTo(n.x, n.y); this.ctx.lineTo(n.cpOut.x, n.cpOut.y);
        });
        this.ctx.stroke();

        shape.nodes.forEach(n => {
            this.drawCircle(n.cpIn.x, n.cpIn.y, config.handleRadius, config.colorHandle);
            this.drawCircle(n.cpOut.x, n.cpOut.y, config.handleRadius, config.colorHandle);

            this.ctx.fillStyle = config.colorAnchor;
            const size = config.anchorSize;
            this.ctx.fillRect(n.x - size / 2, n.y - size / 2, size, size);
        });
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
}
