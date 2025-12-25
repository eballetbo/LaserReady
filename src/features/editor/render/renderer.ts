import { Geometry } from '../../../core/math/geometry';
import { IShape, ILayer, OperationMode } from '../../../types/core';
import {
    DEFAULT_GRID_COLOR,
    DEFAULT_GRID_LINE_WIDTH,
    DEFAULT_LAYER_COLOR,
    DEFAULT_STROKE_WIDTH,
    SELECTION_LINE_WIDTH,
    PEN_PREVIEW_COLOR,
    PEN_DASH_PATTERN,
    ROTATION_HANDLE_OFFSET,
    DEFAULT_FONT_SIZE,
    DEFAULT_FONT_FAMILY,
    TEXT_LINE_HEIGHT_MULTIPLIER,
    TEXT_STROKE_WIDTH,
    POINT_EQUALITY_THRESHOLD
} from '../../../config/constants';

export interface RendererConfig {
    gridSpacing?: number;
    anchorSize: number;
    handleRadius: number;
    colorAnchor: string;
    colorHandle: string;
    colorHandleLine: string;
    colorStroke: string;
    colorFill: string;
    colorSelection: string;
    [key: string]: any;
}

export class CanvasRenderer {
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;

    constructor(canvas: HTMLCanvasElement) {
        this.canvas = canvas;
        const context = canvas.getContext('2d');
        if (!context) {
            throw new Error('Failed to get 2D context');
        }
        this.ctx = context;
    }

    clear(): void {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    drawGrid(spacing: number = 40): void {
        this.ctx.strokeStyle = DEFAULT_GRID_COLOR;
        this.ctx.lineWidth = DEFAULT_GRID_LINE_WIDTH;
        this.ctx.beginPath();
        const step = spacing;
        for (let i = 0; i < this.canvas.width; i += step) { this.ctx.moveTo(i, 0); this.ctx.lineTo(i, this.canvas.height); }
        for (let i = 0; i < this.canvas.height; i += step) { this.ctx.moveTo(0, i); this.ctx.lineTo(this.canvas.width, i); }
        this.ctx.stroke();
    }

    drawScene(
        shapes: IShape[],
        selectedShapes: IShape[],
        layers: ILayer[],
        config: RendererConfig,
        toolType: string,
        activePath: IShape | null, // PathShape
        previewPoint: { x: number; y: number } | null,
        selectionBox: any | null,
        zoom: number = 1,
        pan: { x: number; y: number } = { x: 0, y: 0 },
        selectedNodeIndex: number | null = null,
        previewOrigin: { x: number; y: number } | null = null
    ): void {
        this.clear();

        this.ctx.save();
        this.ctx.translate(pan.x, pan.y);
        this.ctx.scale(zoom, zoom);

        this.drawGrid(config.gridSpacing);

        shapes.forEach(shape => {
            const isSelected = selectedShapes.includes(shape);
            this.renderShape(shape, isSelected, selectedShapes, layers, config, toolType, selectedNodeIndex);
        });

        if (selectedShapes.length > 0 && toolType === 'select') {
            const combinedBounds = Geometry.getCombinedBounds(selectedShapes);
            if (combinedBounds) {
                this.drawSelectionBounds(combinedBounds, config);
            }
        }

        // Draw preview line for Pen tool
        if (toolType === 'pen' && activePath && previewPoint) {
            this.drawPenPreview(activePath, previewPoint, previewOrigin);
        }

        // Draw selection box
        if (selectionBox) {
            this.drawSelectionBox(selectionBox);
        }

        this.ctx.restore();
    }

    renderShape(
        shape: IShape,
        isSelected: boolean,
        selectedShapes: IShape[],
        layers: ILayer[],
        config: RendererConfig,
        toolType: string,
        selectedNodeIndex: number | null
    ): void {
        const layer = layers ? layers.find(l => l.id === shape.layerId) : null;
        const layerColor = layer ? layer.color : DEFAULT_LAYER_COLOR;
        const layerMode = layer ? layer.mode : 'CUT';

        if (shape.type === 'group') {
            this.drawGroup(shape, isSelected, selectedShapes, layers, config, toolType, selectedNodeIndex);
        } else if (shape.type === 'text') {
            this.drawText(shape, isSelected, config, layerColor, layerMode);
        } else {
            this.drawPath(shape, isSelected, config, layerColor, layerMode);
            if (isSelected && toolType === 'node-edit') {
                this.drawNodes(shape, config, selectedNodeIndex);
            }
        }
    }

    drawGroup(
        group: any,
        isSelected: boolean,
        selectedShapes: IShape[],
        layers: ILayer[],
        config: RendererConfig,
        toolType: string,
        selectedNodeIndex: number | null
    ) {
        if (!group.children) return;

        // Draw children inheriting selection state from group

        group.children.forEach((child: any) => {
            // Pass isSelected (inheriting from group) so children render with selection color (blue)
            // This ensures visual feedback that the group contents are selected
            this.renderShape(child, isSelected, selectedShapes, layers, config, toolType, null);
        });

        // Only draw group bounds if it is explicitly selected AND is the only thing selected.
        // 1. includes(group): Prevents nested children from drawing bounds when parent is selected.
        // 2. length === 1: Prevents individual bounds when multiple items are selected (global box is used).
        if (selectedShapes.includes(group) && selectedShapes.length === 1) {
            // Draw selection bounds for group
            // We need group bounds.
            // Assuming group.getBounds() or Geometry.getCombinedBounds(group.children)
            let bounds;
            if (group.getBounds) {
                bounds = group.getBounds();
            } else {
                bounds = Geometry.getCombinedBounds(group.children);
            }

            if (bounds) {
                this.drawSelectionBounds(bounds, config);
            }
        }
    }

    drawPath(shape: any, isSelected: boolean, config: RendererConfig, layerColor: string, layerMode: OperationMode): void {
        if (!shape.nodes || shape.nodes.length < 2) return;

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

        // Style resolution: Shape Override -> Layer Default -> Fallback

        // 1. Fill Override
        if (shape.fillColor) {
            this.ctx.fillStyle = shape.fillColor;
            this.ctx.fill();
        } else if (layerMode === 'ENGRAVE') {
            // Default Engrave behavior
            this.ctx.fillStyle = layerColor;
            this.ctx.fill();
        } else {
            // For CUT/SCORE, maybe just a very transparent fill for selection hit area visual?
            // Or maintain default config fill.
            this.ctx.fillStyle = config.colorFill;
            this.ctx.fill();
        }

        // 2. Stroke Width Override
        const strokeWidth = shape.strokeWidth !== undefined ? shape.strokeWidth : DEFAULT_STROKE_WIDTH;

        // 3. Stroke Color Override
        const strokeColor = isSelected ? config.colorSelection : (shape.strokeColor || layerColor);

        this.ctx.strokeStyle = strokeColor;
        this.ctx.lineWidth = strokeWidth;
        this.ctx.stroke();

        // Selection overlay (always draw if selected, to show selection even if shape is invisible)
        if (isSelected) {
            this.ctx.strokeStyle = config.colorSelection;
            this.ctx.lineWidth = SELECTION_LINE_WIDTH;
            this.ctx.stroke();
            // Optional: Extra fill for selection
            this.ctx.fillStyle = config.colorSelection;
            this.ctx.fill();
        }
    }

    drawNodes(shape: any, config: RendererConfig, selectedNodeIndex: number | null): void {
        // 1. Draw Anchors (Squares) first
        shape.nodes.forEach((n: any, i: number) => {
            this.ctx.fillStyle = i === selectedNodeIndex ? config.colorSelection : config.colorAnchor;
            const size = config.anchorSize;
            this.ctx.fillRect(n.x - size / 2, n.y - size / 2, size, size);
        });

        // 2. Draw Handles (Lines + Circles) ONLY for selected node
        if (selectedNodeIndex !== null && selectedNodeIndex >= 0 && selectedNodeIndex < shape.nodes.length) {
            const n = shape.nodes[selectedNodeIndex];

            // Helper to check if handle is at anchor
            const isAtAnchor = (p: any) => Math.abs(p.x - n.x) < POINT_EQUALITY_THRESHOLD && Math.abs(p.y - n.y) < POINT_EQUALITY_THRESHOLD;

            this.ctx.strokeStyle = config.colorHandleLine;
            this.ctx.lineWidth = DEFAULT_GRID_LINE_WIDTH;
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

    drawSelectionBounds(bounds: any, config: RendererConfig): void {

        // Draw rotation handle
        const handleX = bounds.cx;
        const handleY = bounds.minY - ROTATION_HANDLE_OFFSET;

        this.ctx.beginPath();
        this.ctx.moveTo(bounds.cx, bounds.minY);
        this.ctx.lineTo(handleX, handleY);
        this.ctx.strokeStyle = config.colorSelection;
        this.ctx.stroke();

        this.drawCircle(handleX, handleY, config.handleRadius, config.colorSelection);

        // Draw bounding box
        this.ctx.strokeStyle = config.colorSelection;
        this.ctx.lineWidth = DEFAULT_GRID_LINE_WIDTH;
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

    drawCircle(x: number, y: number, r: number, color: string): void {
        this.ctx.beginPath();
        this.ctx.arc(x, y, r, 0, Math.PI * 2);
        this.ctx.fillStyle = color;
        this.ctx.fill();
    }

    drawPenPreview(activePath: any, previewPoint: { x: number; y: number }, origin: { x: number; y: number } | null = null): void {
        if (!activePath.nodes || activePath.nodes.length === 0) return;

        let startPoint = origin;
        if (!startPoint) {
            const lastNode = activePath.nodes[activePath.nodes.length - 1];
            startPoint = { x: lastNode.x, y: lastNode.y };
        }

        this.ctx.beginPath();
        this.ctx.moveTo(startPoint.x, startPoint.y);
        this.ctx.lineTo(previewPoint.x, previewPoint.y);
        this.ctx.strokeStyle = PEN_PREVIEW_COLOR;
        this.ctx.lineWidth = DEFAULT_GRID_LINE_WIDTH;
        this.ctx.setLineDash(PEN_DASH_PATTERN);
        this.ctx.stroke();
        this.ctx.setLineDash([]);
    }

    drawSelectionBox(box: any): void {
        this.ctx.fillStyle = box.style.fill;
        this.ctx.strokeStyle = box.style.stroke;
        this.ctx.lineWidth = DEFAULT_GRID_LINE_WIDTH;
        this.ctx.fillRect(box.x, box.y, box.width, box.height);
        this.ctx.strokeRect(box.x, box.y, box.width, box.height);
    }

    drawText(textObject: any, isSelected: boolean, config: RendererConfig, layerColor: string, layerMode: OperationMode): void {
        this.ctx.save();

        // Font settings
        const fontStyle = textObject.fontStyle || DEFAULT_FONT_FAMILY;
        const fontWeight = textObject.fontWeight || DEFAULT_FONT_FAMILY;
        const fontSize = textObject.fontSize || DEFAULT_FONT_SIZE;
        const fontFamily = textObject.fontFamily || DEFAULT_FONT_FAMILY;
        this.ctx.font = `${fontStyle} ${fontWeight} ${fontSize}px ${fontFamily}`;

        this.ctx.translate(textObject.x, textObject.y);

        if (textObject.rotation) {
            this.ctx.rotate(textObject.rotation);
        }

        if (textObject.scaleX !== undefined || textObject.scaleY !== undefined) {
            this.ctx.scale(textObject.scaleX || 1, textObject.scaleY || 1);
        }

        const lines = (textObject.text || '').split('\n');
        const lineHeight = fontSize * TEXT_LINE_HEIGHT_MULTIPLIER;

        lines.forEach((line: string, i: number) => {
            if (layerMode === 'ENGRAVE') {
                this.ctx.fillStyle = layerColor;
                this.ctx.fillText(line, 0, 0 + i * lineHeight);
            } else {
                // CUT/SCORE: Stroke text
                this.ctx.strokeStyle = layerColor;
                this.ctx.lineWidth = TEXT_STROKE_WIDTH;
                this.ctx.strokeText(line, 0, 0 + i * lineHeight);
            }
        });

        this.ctx.restore();

        // Draw selection overlay separately (in world space)
        if (isSelected) {
            // This might be expensive if using measure
            // Ideally textObject has a `getBounds()` method we can assume exists
            const bounds = textObject.getBounds ? textObject.getBounds() : { minX: textObject.x, minY: textObject.y, width: 100, height: 20 };
            this.ctx.strokeStyle = config.colorSelection;
            this.ctx.lineWidth = DEFAULT_GRID_LINE_WIDTH;
            this.ctx.strokeRect(bounds.minX, bounds.minY, bounds.width, bounds.height);
        }
    }
}
