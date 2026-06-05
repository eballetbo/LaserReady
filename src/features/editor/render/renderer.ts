import { Geometry, Point, Rect } from '../../../core/math/geometry';
import { IShape, ILayer, OperationMode } from '../../../types/core';
import { SnapResult } from '../snapping';
import { SelectionBox } from '../../../core/tools/base';
import { PathNode } from '../../shapes/models/node';

interface TextRenderData {
    x: number;
    y: number;
    text: string;
    fontSize?: number;
    fontFamily?: string;
    fontWeight?: string;
    fontStyle?: string;
    rotation?: number;
    scaleX?: number;
    scaleY?: number;
    hSpace?: number;
    vSpace?: number;
    alignX?: 'left' | 'center' | 'right';
    alignY?: 'top' | 'middle' | 'bottom';
    upperCase?: boolean;
    bend?: number;
    distort?: boolean;
    getBounds?(): Rect;
    getDisplayText?(): string;
    getLineHeight?(): number;
    measureLineWidth?(line: string): number;
}
import {
    DEFAULT_GRID_COLOR,
    DEFAULT_GRID_LINE_WIDTH,
    DEFAULT_LAYER_COLOR,
    DEFAULT_STROKE_WIDTH,
    PEN_PREVIEW_COLOR,
    SELECTION_DASH_PATTERN,
    SELECTION_DASH_SPEED,
    ROTATION_HANDLE_OFFSET,
    DEFAULT_FONT_SIZE,
    DEFAULT_FONT_FAMILY,
    TEXT_LINE_HEIGHT_MULTIPLIER,
    TEXT_STROKE_WIDTH,
    POINT_EQUALITY_THRESHOLD,
    NODE_SKELETON_COLOR,
    NODE_HANDLE_LINE_COLOR,
    NODE_SKELETON_WIDTH,
    NODE_HANDLE_CIRCLE_RADIUS
} from '../../../config/constants';

import { RendererConfig } from './types';

export class CanvasRenderer {
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    private lineDashOffset: number = 0;

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
        this.ctx.lineWidth = DEFAULT_STROKE_WIDTH / zoom;

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
        selectionBox: SelectionBox | null,
        zoom: number = 1,
        pan: { x: number; y: number } = { x: 0, y: 0 },
        selectedNodeIndices: number[] = [],
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
            this.renderShape(shape, isSelected, selectedShapes, layers, config, toolType, zoom);
        });

        if (selectedShapes.length > 0 && toolType === 'select') {
            const combinedBounds = Geometry.getCombinedBounds(selectedShapes);
            if (combinedBounds) {
                this.drawSelectionBounds(combinedBounds, config, zoom);
            }
        }

        // Draw preview line for Pen tool
        if (toolType === 'pen' && activePath && previewPoint) {
            this.drawPenPreview(activePath, previewPoint, zoom, previewOrigin);
        }


        // Draw selection box
        if (selectionBox) {
            this.drawSelectionBox(selectionBox);
        }


        // Draw Node Overlay (Last, on top)
        if (toolType === 'node-edit') {
            this.drawNodeOverlay(selectedShapes, selectedNodeIndices, zoom, config);
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
        zoom: number
    ): void {
        const layer = layers ? layers.find(l => l.id === shape.layerId) : null;
        const layerColor = layer ? layer.color : DEFAULT_LAYER_COLOR;
        const layerMode = layer ? layer.mode : 'CUT';

        if (shape.type === 'group') {
            this.drawGroup(shape, isSelected, selectedShapes, layers, config, toolType, zoom);
        } else if (shape.type === 'text') {
            this.drawText(shape, isSelected, config, layerColor, layerMode, zoom);
        } else {
            this.drawPath(shape, isSelected, config, layerColor, layerMode, zoom);
        }
    }

    drawGroup(
        group: IShape & { children?: IShape[] },
        isSelected: boolean,
        selectedShapes: IShape[],
        layers: ILayer[],
        config: RendererConfig,
        toolType: string,
        zoom: number
    ) {
        if (!group.children) return;

        group.children.forEach((child: IShape) => {
            // Pass isSelected (inheriting from group) so children render with selection color (blue)
            // This ensures visual feedback that the group contents are selected
            this.renderShape(child, isSelected, selectedShapes, layers, config, toolType, zoom);
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

    drawPath(shape: IShape, isSelected: boolean, config: RendererConfig, layerColor: string, layerMode: OperationMode, zoom: number): void {
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

        // 3. Stroke Color and Style
        if (isSelected) {
            // Selected: Use grey dashed stroke
            this.setSelectionStyle(zoom, config.colorSelection);
        } else {
            // Normal: Use shape/layer color
            const strokeColor = shape.strokeColor || layerColor;
            this.ctx.strokeStyle = strokeColor;
            this.ctx.lineWidth = Math.max(strokeWidth, 1 / zoom);
        }
        this.ctx.stroke();
        this.ctx.setLineDash([]);
    }

    drawNodeOverlay(selectedShapes: IShape[], selectedNodeIndices: number[], zoom: number, config: RendererConfig): void {
        const anchorSize = config.anchorSize / zoom;
        const skeletonWidth = NODE_SKELETON_WIDTH / zoom;
        const handleCircleRadius = NODE_HANDLE_CIRCLE_RADIUS / zoom;
        const lineWidth = DEFAULT_GRID_LINE_WIDTH / zoom;

        selectedShapes.forEach(shape => {
            if (!shape.nodes || shape.nodes.length < 2) return;

            // 1. Draw Path Skeleton (Thin hairline)
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

            this.ctx.strokeStyle = NODE_SKELETON_COLOR;
            this.ctx.lineWidth = skeletonWidth;
            this.ctx.stroke();

            // 2. Draw Handles first (behind nodes)
            // Draw for all selected nodes
            const indicesSet = new Set(selectedNodeIndices);

            shape.nodes.forEach((n: PathNode, i: number) => {
                if (indicesSet.has(i)) {
                    const isAtAnchor = (p: Point) => Math.abs(p.x - n.x) < POINT_EQUALITY_THRESHOLD && Math.abs(p.y - n.y) < POINT_EQUALITY_THRESHOLD;

                    this.ctx.strokeStyle = NODE_HANDLE_LINE_COLOR;
                    this.ctx.lineWidth = lineWidth;

                    // Draw In Handle
                    if (!isAtAnchor(n.cpIn)) {
                        this.ctx.beginPath();
                        this.ctx.moveTo(n.x, n.y);
                        this.ctx.lineTo(n.cpIn.x, n.cpIn.y);
                        this.ctx.stroke();
                        this.drawCircle(n.cpIn.x, n.cpIn.y, handleCircleRadius, config.colorHandle);
                    }

                    // Draw Out Handle
                    if (!isAtAnchor(n.cpOut)) {
                        this.ctx.beginPath();
                        this.ctx.moveTo(n.x, n.y);
                        this.ctx.lineTo(n.cpOut.x, n.cpOut.y);
                        this.ctx.stroke();
                        this.drawCircle(n.cpOut.x, n.cpOut.y, handleCircleRadius, config.colorHandle);
                    }
                }
            });

            shape.nodes.forEach((n: PathNode, i: number) => {
                const isSelected = indicesSet.has(i);

                // Color Logic
                let fillColor = '#FFFFFF';
                let strokeColor = '#000000';

                if (isSelected) {
                    fillColor = '#FF0000'; // Red for selected
                    strokeColor = '#AA0000';
                } else {
                    fillColor = '#FFFFFF'; // White for unselected
                    strokeColor = '#666666';
                }

                // Override for type if needed? 
                // LightBurn uses: Green Square = Start, Smooth = Circle, Corner = Square
                // Inkscape uses: Diamond = Corner, Square = Smooth/Symmetric

                // Let's implement Inkscape style as requested
                const type = n.type || 'corner';

                this.ctx.fillStyle = fillColor;
                this.ctx.strokeStyle = strokeColor;
                this.ctx.lineWidth = lineWidth;

                if (type === 'corner') {
                    // Diamond
                    // Draw rotated square
                    this.ctx.beginPath();
                    this.ctx.moveTo(n.x, n.y - anchorSize / 2);
                    this.ctx.lineTo(n.x + anchorSize / 2, n.y);
                    this.ctx.lineTo(n.x, n.y + anchorSize / 2);
                    this.ctx.lineTo(n.x - anchorSize / 2, n.y);
                    this.ctx.closePath();
                    this.ctx.fill();
                    this.ctx.stroke();
                } else {
                    // Smooth/Symmetric -> Square
                    this.ctx.fillRect(n.x - anchorSize / 2, n.y - anchorSize / 2, anchorSize, anchorSize);
                    this.ctx.strokeRect(n.x - anchorSize / 2, n.y - anchorSize / 2, anchorSize, anchorSize);
                }

                // Special Highlight for Start Node?
                if (i === 0) {
                    // Maybe a slightly larger border?
                }
            });
        });
    }

    private setSelectionStyle(zoom: number, color: string): void {
        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = DEFAULT_STROKE_WIDTH / zoom;
        this.ctx.setLineDash(SELECTION_DASH_PATTERN.map(v => v / zoom));
        this.ctx.lineDashOffset = -this.lineDashOffset / zoom;
    }

    /**
     * Updates the dash offset for the marching ants animation.
     * Should be called on each animation frame.
     */
    updateDashAnimation(deltaTime: number): void {
        this.lineDashOffset += (SELECTION_DASH_SPEED * deltaTime) / 1000;
        // Reset to prevent overflow (sum of dash pattern)
        const patternSum = SELECTION_DASH_PATTERN[0] + SELECTION_DASH_PATTERN[1];
        if (this.lineDashOffset >= patternSum) {
            this.lineDashOffset -= patternSum;
        }
    }

    drawSelectionBounds(bounds: Rect, config: RendererConfig, zoom: number): void {
        const anchorSize = config.anchorSize / zoom;
        const handleRadius = config.handleRadius / zoom;
        const lineWidth = DEFAULT_STROKE_WIDTH / zoom;
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
        // this.setSelectionStyle(zoom, config.colorSelection);
        // this.ctx.strokeRect(bounds.minX, bounds.minY, bounds.width, bounds.height);
        // this.ctx.setLineDash([]);

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

    drawPenPreview(activePath: IShape, previewPoint: { x: number; y: number }, zoom: number, origin: { x: number; y: number } | null = null): void {
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
        this.ctx.lineWidth = DEFAULT_STROKE_WIDTH / zoom;
        this.ctx.stroke();
        this.ctx.setLineDash([]);
    }

    drawSelectionBox(box: SelectionBox): void {
        this.ctx.fillStyle = box.style.fill;
        this.ctx.strokeStyle = box.style.stroke;
        this.ctx.lineWidth = DEFAULT_GRID_LINE_WIDTH;
        this.ctx.fillRect(box.x, box.y, box.width, box.height);
        this.ctx.strokeRect(box.x, box.y, box.width, box.height);
    }

    drawText(textObject: TextRenderData, isSelected: boolean, config: RendererConfig, layerColor: string, layerMode: OperationMode, zoom: number): void {
        this.ctx.save();

        const fontStyle = textObject.fontStyle || 'normal';
        const fontWeight = textObject.fontWeight || 'normal';
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

        const displayText = textObject.getDisplayText
            ? textObject.getDisplayText()
            : (textObject.upperCase ? (textObject.text || '').toUpperCase() : (textObject.text || ''));
        const lines = displayText.split('\n');
        const lineHeight = textObject.getLineHeight
            ? textObject.getLineHeight()
            : fontSize * TEXT_LINE_HEIGHT_MULTIPLIER * (1 + (textObject.vSpace || 0) / 100);
        const hSpace = textObject.hSpace || 0;
        const alignX = textObject.alignX || 'left';
        const bend = textObject.bend || 0;

        if (bend !== 0) {
            this.drawBentText(lines, fontSize, hSpace, bend, textObject.distort || false, layerColor, layerMode);
        } else {
            const totalWidth = textObject.measureLineWidth
                ? Math.max(...lines.map(l => textObject.measureLineWidth!(l)))
                : undefined;

            const alignY = textObject.alignY || 'top';
            let blockYOffset = 0;
            const totalHeight = lines.length * lineHeight;
            if (alignY === 'middle') blockYOffset = -totalHeight / 2;
            else if (alignY === 'bottom') blockYOffset = -totalHeight;

            lines.forEach((line: string, i: number) => {
                let xOffset = 0;
                if (totalWidth !== undefined && alignX !== 'left') {
                    const lineW = textObject.measureLineWidth!(line);
                    if (alignX === 'center') xOffset = (totalWidth - lineW) / 2;
                    else if (alignX === 'right') xOffset = totalWidth - lineW;
                }

                const y = blockYOffset + i * lineHeight;

                if (hSpace === 0) {
                    if (layerMode === 'ENGRAVE') {
                        this.ctx.fillStyle = layerColor;
                        this.ctx.fillText(line, xOffset, y);
                    } else {
                        this.ctx.strokeStyle = layerColor;
                        this.ctx.lineWidth = TEXT_STROKE_WIDTH;
                        this.ctx.strokeText(line, xOffset, y);
                    }
                } else {
                    const extraPerChar = fontSize * (hSpace / 100);
                    let cx = xOffset;
                    for (const char of line) {
                        if (layerMode === 'ENGRAVE') {
                            this.ctx.fillStyle = layerColor;
                            this.ctx.fillText(char, cx, y);
                        } else {
                            this.ctx.strokeStyle = layerColor;
                            this.ctx.lineWidth = TEXT_STROKE_WIDTH;
                            this.ctx.strokeText(char, cx, y);
                        }
                        cx += this.ctx.measureText(char).width + extraPerChar;
                    }
                }
            });
        }

        this.ctx.restore();

        if (isSelected) {
            const bounds = textObject.getBounds ? textObject.getBounds() : { minX: textObject.x, minY: textObject.y, width: 100, height: 20 };
            this.setSelectionStyle(zoom, config.colorSelection);
            this.ctx.strokeRect(bounds.minX, bounds.minY, bounds.width, bounds.height);
            this.ctx.setLineDash([]);
        }
    }

    private drawBentText(
        lines: string[],
        fontSize: number,
        hSpace: number,
        bend: number,
        _distort: boolean,
        layerColor: string,
        layerMode: OperationMode
    ): void {
        const line = lines.join(' ');
        if (line.length === 0) return;

        const extraPerChar = fontSize * (hSpace / 100);
        const charWidths: number[] = [];
        for (const char of line) {
            charWidths.push(this.ctx.measureText(char).width + extraPerChar);
        }
        const totalArcLen = charWidths.reduce((a, b) => a + b, 0) - extraPerChar;

        // bend is a curvature value: radius = totalArcLen / bend (in radians mapped from bend factor)
        // Positive bend curves upward, negative curves downward
        const radius = Math.abs(totalArcLen / (bend * 0.01));
        const direction = bend > 0 ? -1 : 1;

        const totalAngle = totalArcLen / radius;
        let currentAngle = -totalAngle / 2;

        const chars = [...line];
        for (let i = 0; i < chars.length; i++) {
            const charWidth = charWidths[i] ?? 0;
            const halfAngle = (charWidth / 2) / radius;
            currentAngle += halfAngle;

            const cx = Math.sin(currentAngle) * radius * direction * -1;
            const cy = (Math.cos(currentAngle) - 1) * radius * direction;

            this.ctx.save();
            this.ctx.translate(cx, cy);
            this.ctx.rotate(currentAngle * direction * -1);

            if (layerMode === 'ENGRAVE') {
                this.ctx.fillStyle = layerColor;
                this.ctx.fillText(chars[i]!, -charWidth / 2, 0);
            } else {
                this.ctx.strokeStyle = layerColor;
                this.ctx.lineWidth = TEXT_STROKE_WIDTH;
                this.ctx.strokeText(chars[i]!, -charWidth / 2, 0);
            }

            this.ctx.restore();
            currentAngle += halfAngle;
        }
    }

    drawSnapMarker(snap: SnapResult, zoom: number, pan: { x: number; y: number }): void {
        const MARKER_SIZE = 10 / zoom; // 10px screen size
        const LINE_WIDTH = 2 / zoom;
        const COLOR = '#FF00FF'; // Magenta for high contrast

        this.ctx.save();
        this.ctx.translate(pan.x, pan.y);
        this.ctx.scale(zoom, zoom);

        this.ctx.strokeStyle = COLOR;
        this.ctx.lineWidth = LINE_WIDTH;
        this.ctx.fillStyle = 'rgba(255, 0, 255, 0.2)'; // Transparent fill

        const { x, y } = snap.point;

        this.ctx.beginPath();

        switch (snap.type) {
            case 'endpoint':
                // Square
                this.ctx.strokeRect(x - MARKER_SIZE / 2, y - MARKER_SIZE / 2, MARKER_SIZE, MARKER_SIZE);
                break;

            case 'midpoint':
                // Triangle
                this.ctx.moveTo(x, y - MARKER_SIZE / 2);
                this.ctx.lineTo(x + MARKER_SIZE / 2, y + MARKER_SIZE / 2);
                this.ctx.lineTo(x - MARKER_SIZE / 2, y + MARKER_SIZE / 2);
                this.ctx.closePath();
                this.ctx.stroke();
                break;

            case 'center':
                // Circle
                this.ctx.arc(x, y, MARKER_SIZE / 2, 0, Math.PI * 2);
                this.ctx.stroke();
                break;

            case 'grid': {
                const size = MARKER_SIZE / 2;
                this.ctx.moveTo(x - size, y);
                this.ctx.lineTo(x + size, y);
                this.ctx.moveTo(x, y - size);
                this.ctx.lineTo(x, y + size);
                this.ctx.stroke();
                break;
            }
        }

        this.ctx.restore();
    }
}
