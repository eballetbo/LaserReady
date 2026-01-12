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

    drawMaterialBounds(width: number, height: number): void {
        this.ctx.save();

        // Drop Shadow
        this.ctx.shadowColor = 'rgba(0,0,0,0.2)';
        this.ctx.shadowBlur = 20;
        this.ctx.shadowOffsetX = 0;
        this.ctx.shadowOffsetY = 10;

        // Page Background
        this.ctx.fillStyle = '#ffffff';
        this.ctx.fillRect(0, 0, width, height);

        // Border
        this.ctx.strokeStyle = '#e5e5e5'; // Light border
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(0, 0, width, height);

        this.ctx.restore();
    }

    drawGrid(spacing: number = 40, zoom: number, pan: { x: number; y: number }, materialWidth?: number, materialHeight?: number): void {
        const { width, height } = this.canvas;

        // If material bounds are provided, use them. Otherwise default to viewport (infinite-like)


        // Use infinite bounds if no material, or restricted bounds if material
        const effectiveMinX = materialWidth !== undefined ? 0 : -pan.x / zoom;
        const effectiveMaxX = materialWidth !== undefined ? materialWidth : (width - pan.x) / zoom;
        const effectiveMinY = materialHeight !== undefined ? 0 : -pan.y / zoom;
        const effectiveMaxY = materialHeight !== undefined ? materialHeight : (height - pan.y) / zoom;

        const step = spacing;

        this.ctx.strokeStyle = DEFAULT_GRID_COLOR;
        this.ctx.lineWidth = DEFAULT_GRID_LINE_WIDTH / zoom;

        this.ctx.beginPath();

        // Vertical lines
        // Align to step
        const firstVerticalLine = Math.floor(effectiveMinX / step) * step;
        const loopStartX = firstVerticalLine < effectiveMinX ? firstVerticalLine + step : firstVerticalLine;

        for (let x = loopStartX; x <= effectiveMaxX; x += step) {
            // For material bound, y lines go from 0 to materialHeight
            // For infinite, they go from minY to maxY
            this.ctx.moveTo(x, effectiveMinY);
            this.ctx.lineTo(x, effectiveMaxY);
        }

        // Horizontal lines
        const firstHorizontalLine = Math.floor(effectiveMinY / step) * step;
        const loopStartY = firstHorizontalLine < effectiveMinY ? firstHorizontalLine + step : firstHorizontalLine;

        for (let y = loopStartY; y <= effectiveMaxY; y += step) {
            this.ctx.moveTo(effectiveMinX, y);
            this.ctx.lineTo(effectiveMaxX, y);
        }

        this.ctx.stroke();
    }

    drawScene(
        shapes: IShape[],
        selectedShapes: IShape[],
        layers: ILayer[],
        config: RendererConfig,
        toolType: string,
        activePath: IShape | null,
        previewPoint: { x: number; y: number } | null,
        selectionBox: any | null,
        zoom: number = 1,
        pan: { x: number; y: number } = { x: 0, y: 0 },
        selectedNodeIndex: number | null = null,
        previewOrigin: { x: number; y: number } | null = null,
        material: { width: number; height: number } | null = null
    ): void {
        this.clear();

        this.ctx.save();
        this.ctx.translate(pan.x, pan.y);
        this.ctx.scale(zoom, zoom);

        // 1. Draw Material Page (Canvas Area)
        if (material) {
            this.drawMaterialBounds(material.width, material.height);
        }

        // 2. Draw Grid (Restricted to Material if available)
        this.drawGrid(config.gridSpacing, zoom, pan, material ? material.width : undefined, material ? material.height : undefined);

        shapes.forEach(shape => {
            const isSelected = selectedShapes.includes(shape);
            this.renderShape(shape, isSelected, selectedShapes, layers, config, toolType, isSelected ? selectedNodeIndex : null, zoom);
        });

        if (selectedShapes.length > 0 && toolType === 'select') {
            const combinedBounds = Geometry.getCombinedBounds(selectedShapes);
            if (combinedBounds) {
                this.drawSelectionBounds(combinedBounds, config, zoom);
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
        selectedNodeIndex: number | null,
        zoom: number
    ): void {
        const layer = layers ? layers.find(l => l.id === shape.layerId) : null;
        const layerColor = layer ? layer.color : DEFAULT_LAYER_COLOR;
        const layerMode = layer ? layer.mode : 'CUT';

        if (shape.type === 'group') {
            this.drawGroup(shape, isSelected, selectedShapes, layers, config, toolType, selectedNodeIndex, zoom);
        } else if (shape.type === 'text') {
            this.drawText(shape, isSelected, config, layerColor, layerMode);
        } else {
            this.drawPath(shape, isSelected, config, layerColor, layerMode);
            if (isSelected && toolType === 'node-edit') {
                this.drawNodes(shape, config, selectedNodeIndex, zoom);
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
        selectedNodeIndex: number | null,
        zoom: number
    ) {
        if (!group.children) return;

        // Draw children inheriting selection state from group

        group.children.forEach((child: any) => {
            // Pass isSelected (inheriting from group) so children render with selection color (blue)
            // This ensures visual feedback that the group contents are selected
            this.renderShape(child, isSelected, selectedShapes, layers, config, toolType, null, zoom);
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
                this.drawSelectionBounds(bounds, config, zoom);
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

    drawNodes(shape: any, config: RendererConfig, selectedNodeIndex: number | null, zoom: number): void {
        const anchorSize = config.anchorSize / zoom;
        const handleRadius = config.handleRadius / zoom;
        const lineWidth = DEFAULT_GRID_LINE_WIDTH / zoom;

        // 1. Draw Anchors (Squares) first
        // 1. Draw Anchors
        shape.nodes.forEach((n: any, i: number) => {
            // Selected node is Red, others are anchor color
            this.ctx.fillStyle = i === selectedNodeIndex ? '#FF0000' : config.colorAnchor;

            // Draw Circle for Smooth/Symmetric, Square for Corner
            if (n.type === 'smooth' || n.type === 'symmetric') {
                this.ctx.beginPath();
                this.ctx.arc(n.x, n.y, anchorSize / 2, 0, Math.PI * 2);
                this.ctx.fill();
            } else {
                this.ctx.fillRect(n.x - anchorSize / 2, n.y - anchorSize / 2, anchorSize, anchorSize);
            }
        });

        // 2. Draw Handles (Lines + Circles) ONLY for selected node
        if (selectedNodeIndex !== null && selectedNodeIndex >= 0 && selectedNodeIndex < shape.nodes.length) {
            const n = shape.nodes[selectedNodeIndex];

            // Helper to check if handle is at anchor
            const isAtAnchor = (p: any) => Math.abs(p.x - n.x) < POINT_EQUALITY_THRESHOLD && Math.abs(p.y - n.y) < POINT_EQUALITY_THRESHOLD;

            this.ctx.strokeStyle = config.colorHandleLine;
            this.ctx.lineWidth = lineWidth;
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
                this.drawCircle(n.cpIn.x, n.cpIn.y, handleRadius, config.colorHandle);
            }
            if (!isAtAnchor(n.cpOut)) {
                this.drawCircle(n.cpOut.x, n.cpOut.y, handleRadius, config.colorHandle);
            }
        }
    }

    drawSelectionBounds(bounds: any, config: RendererConfig, zoom: number): void {
        const anchorSize = config.anchorSize / zoom;
        const handleRadius = config.handleRadius / zoom;
        const lineWidth = DEFAULT_GRID_LINE_WIDTH / zoom;
        const rotationHandleOffset = ROTATION_HANDLE_OFFSET / zoom;

        // Draw rotation handle
        const handleX = bounds.cx;
        const handleY = bounds.minY - rotationHandleOffset;

        this.ctx.beginPath();
        this.ctx.moveTo(bounds.cx, bounds.minY);
        this.ctx.lineTo(handleX, handleY);
        this.ctx.strokeStyle = config.colorSelection;
        this.ctx.lineWidth = lineWidth;
        this.ctx.stroke();

        this.drawCircle(handleX, handleY, handleRadius, config.colorSelection);

        // Draw bounding box
        this.ctx.strokeStyle = config.colorSelection;
        this.ctx.lineWidth = lineWidth;
        this.ctx.strokeRect(bounds.minX, bounds.minY, bounds.width, bounds.height);

        // Draw 8 resize handles
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
            this.ctx.fillRect(h.x - anchorSize / 2, h.y - anchorSize / 2, anchorSize, anchorSize);
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
