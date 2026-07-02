import { Geometry, Point, Rect } from '../../../core/math/geometry';
import { IShape, ILayer, OperationMode } from '../../../types/core';
import { SnapResult } from '../snapping';
import { SelectionBox } from '../../../core/tools/base';
import { PathNode } from '../../shapes/models/node';

interface TextRenderData {
    id?: string;
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

export interface TextEditingState {
    textId: string;
    cursorPosition: number;
}
import {
    DEFAULT_GRID_COLOR,
    DEFAULT_GRID_LINE_WIDTH,
    MINOR_GRID_SPACING,
    MINOR_GRID_COLOR,
    MINOR_GRID_MIN_SCREEN_PX,
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
    NODE_HANDLE_CIRCLE_RADIUS,
    NODE_CIRCLE_RADIUS,
    NODE_CIRCLE_STROKE,
    NODE_CIRCLE_FILL,
    NODE_SELECTED_FILL,
    NODE_SELECTED_STROKE,
    NODE_HOVER_RING_OFFSET,
    NODE_HOVER_RING_COLOR,
    SEGMENT_HOVER_COLOR,
    SEGMENT_SELECTED_COLOR,
    SEGMENT_HOVER_WIDTH
} from '../../../config/constants';

import { drawDistanceHelper } from './distance-helper';

import { RendererConfig } from './types';

export interface CanvasLayers {
    background: HTMLCanvasElement;
    content: HTMLCanvasElement;
    overlay: HTMLCanvasElement;
}

export class CanvasRenderer {
    private bgCanvas: HTMLCanvasElement;
    private contentCanvas: HTMLCanvasElement;
    private overlayCanvas: HTMLCanvasElement;
    private bgCtx: CanvasRenderingContext2D;
    private contentCtx: CanvasRenderingContext2D;
    private overlayCtx: CanvasRenderingContext2D;

    private ctx!: CanvasRenderingContext2D;
    private lineDashOffset: number = 0;
    private textEditing: TextEditingState | null = null;

    constructor(layers: CanvasLayers) {
        this.bgCanvas = layers.background;
        this.contentCanvas = layers.content;
        this.overlayCanvas = layers.overlay;

        this.bgCtx = this.bgCanvas.getContext('2d')!;
        this.contentCtx = this.contentCanvas.getContext('2d')!;
        this.overlayCtx = this.overlayCanvas.getContext('2d')!;

        this.ctx = this.overlayCtx;
    }

    drawBackground(
        zoom: number,
        pan: { x: number; y: number },
        material: { width: number; height: number } | null,
        config: RendererConfig
    ): void {
        this.ctx = this.bgCtx;
        this.ctx.clearRect(0, 0, this.bgCanvas.width, this.bgCanvas.height);
        this.ctx.save();
        this.ctx.translate(pan.x, pan.y);
        this.ctx.scale(zoom, zoom);

        if (material) {
            this.drawMaterialBounds(material.width, material.height);
        }
        this.drawGrid(config.gridSpacing, zoom, pan, material?.width, material?.height);

        this.ctx.restore();
    }

    drawContent(
        shapes: IShape[],
        layers: ILayer[],
        config: RendererConfig,
        toolType: string,
        zoom: number,
        pan: { x: number; y: number }
    ): void {
        this.ctx = this.contentCtx;
        this.ctx.clearRect(0, 0, this.contentCanvas.width, this.contentCanvas.height);
        this.ctx.save();
        this.ctx.translate(pan.x, pan.y);
        this.ctx.scale(zoom, zoom);

        const viewport: Rect = {
            minX: -pan.x / zoom,
            minY: -pan.y / zoom,
            maxX: (-pan.x + this.contentCanvas.width) / zoom,
            maxY: (-pan.y + this.contentCanvas.height) / zoom,
            width: this.contentCanvas.width / zoom,
            height: this.contentCanvas.height / zoom,
            cx: (-pan.x + this.contentCanvas.width / 2) / zoom,
            cy: (-pan.y + this.contentCanvas.height / 2) / zoom,
        };

        shapes.forEach(shape => {
            if (!this.isShapeInViewport(shape, viewport)) return;
            this.renderShape(shape, false, [], layers, config, toolType, zoom);
        });

        this.ctx.restore();
    }

    private isShapeInViewport(shape: IShape, viewport: Rect): boolean {
        const bounds = shape.getBounds ? shape.getBounds() : null;
        if (!bounds) return true;
        return Geometry.rectIntersectsRect(bounds, viewport);
    }

    drawOverlay(
        shapes: IShape[],
        selectedShapes: IShape[],
        layers: ILayer[],
        config: RendererConfig,
        toolType: string,
        activePath: IShape | null,
        previewPoint: { x: number; y: number } | null,
        selectionBox: SelectionBox | null,
        zoom: number,
        pan: { x: number; y: number },
        selectedNodeIndices: number[],
        selectedSegmentIndices: number[],
        hoveredNodeIndex: number,
        hoveredSegmentIndex: number,
        previewOrigin: { x: number; y: number } | null,
        textEditing: TextEditingState | null,
        snapResult: SnapResult | null
    ): void {
        this.textEditing = textEditing;
        this.ctx = this.overlayCtx;
        this.ctx.clearRect(0, 0, this.overlayCanvas.width, this.overlayCanvas.height);
        this.ctx.save();
        this.ctx.translate(pan.x, pan.y);
        this.ctx.scale(zoom, zoom);

        // Selected shape outlines (dashed marching ants)
        selectedShapes.forEach(shape => {
            if (shape.type === 'group' && shape.children) {
                shape.children.forEach((child: IShape) => {
                    this.drawSelectionOutline(child, config, zoom);
                });
            } else {
                this.drawSelectionOutline(shape, config, zoom);
            }
        });

        // Selection bounds + handles
        if (selectedShapes.length > 0 && toolType === 'select') {
            const combinedBounds = Geometry.getCombinedBounds(selectedShapes);
            if (combinedBounds) {
                this.drawSelectionBounds(combinedBounds, config, zoom);
            }
        }

        // Selection dimension helpers (width + height)
        if (selectedShapes.length > 0 && (toolType === 'select' || toolType === 'node-edit')) {
            const dimBounds = Geometry.getCombinedBounds(selectedShapes);
            if (dimBounds) {
                drawDistanceHelper(this.ctx, { x: dimBounds.minX, y: dimBounds.maxY }, { x: dimBounds.maxX, y: dimBounds.maxY }, zoom);
                drawDistanceHelper(this.ctx, { x: dimBounds.maxX, y: dimBounds.maxY }, { x: dimBounds.maxX, y: dimBounds.minY }, zoom);
            }
        }

        // Single-selected group bounds
        if (selectedShapes.length === 1 && selectedShapes[0].type === 'group') {
            const group = selectedShapes[0];
            const bounds = group.getBounds
                ? group.getBounds()
                : Geometry.getCombinedBounds(group.children || []);
            if (bounds && toolType === 'select') {
                this.drawSelectionBounds(bounds, config, zoom);
            }
        }

        // Pen tool preview line
        if (toolType === 'pen' && activePath && previewPoint) {
            this.drawPenPreview(activePath, previewPoint, zoom, previewOrigin);
        }

        // Rubber-band selection box
        if (selectionBox) {
            this.drawSelectionBox(selectionBox);
        }

        // Node edit overlay
        if (toolType === 'node-edit') {
            this.drawNodeOverlay(selectedShapes, selectedNodeIndices, selectedSegmentIndices, hoveredNodeIndex, hoveredSegmentIndex, zoom, config);
        }

        // Text cursor
        if (textEditing) {
            const textShape = shapes.find(s => s.id === textEditing.textId);
            if (textShape) {
                this.drawTextCursorForShape(textShape as TextRenderData, textEditing.cursorPosition, zoom);
            }
        }

        this.ctx.restore();

        // Snap markers (separate coordinate space)
        if (snapResult) {
            this.drawSnapMarker(snapResult, zoom, pan);
        }
    }

    /** @deprecated Use drawBackground + drawContent + drawOverlay instead */
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
        material: { width: number; height: number } | null = null,
        textEditing: TextEditingState | null = null
    ): void {
        this.drawBackground(zoom, pan, material, config);
        this.drawContent(shapes, layers, config, toolType, zoom, pan);
        this.drawOverlay(
            shapes, selectedShapes, layers, config, toolType,
            activePath, previewPoint, selectionBox, zoom, pan,
            selectedNodeIndices, [], -1, -1, previewOrigin, textEditing, null
        );
    }

    private drawSelectionOutline(shape: IShape, config: RendererConfig, zoom: number): void {
        if (shape.type === 'text') {
            const bounds = shape.getBounds ? shape.getBounds() : null;
            if (bounds) {
                this.setSelectionStyle(zoom, config.colorSelection);
                this.ctx.strokeRect(bounds.minX, bounds.minY, bounds.width, bounds.height);
                this.ctx.setLineDash([]);
            }
            return;
        }

        if (shape.type === 'group' && shape.children) {
            shape.children.forEach((child: IShape) => {
                this.drawSelectionOutline(child, config, zoom);
            });
            return;
        }

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

        this.setSelectionStyle(zoom, config.colorSelection);
        this.ctx.stroke();
        this.ctx.setLineDash([]);
    }

    private drawTextCursorForShape(textObject: TextRenderData, cursorPos: number, zoom: number): void {
        const fontStyle = textObject.fontStyle || 'normal';
        const fontWeight = textObject.fontWeight || 'normal';
        const fontSize = textObject.fontSize || DEFAULT_FONT_SIZE;
        const fontFamily = textObject.fontFamily || DEFAULT_FONT_FAMILY;
        const hSpace = textObject.hSpace || 0;
        const alignX = textObject.alignX || 'left';

        this.ctx.save();
        this.ctx.font = `${fontStyle} ${fontWeight} ${fontSize}px ${fontFamily}`;
        this.ctx.translate(textObject.x, textObject.y);
        if (textObject.rotation) this.ctx.rotate(textObject.rotation);
        if (textObject.scaleX !== undefined || textObject.scaleY !== undefined) {
            this.ctx.scale(textObject.scaleX || 1, textObject.scaleY || 1);
        }

        const lineHeight = textObject.getLineHeight
            ? textObject.getLineHeight()
            : fontSize * TEXT_LINE_HEIGHT_MULTIPLIER * (1 + (textObject.vSpace || 0) / 100);

        const blinkOn = Math.floor(Date.now() / 530) % 2 === 0;
        if (blinkOn) {
            this.drawTextCursor(textObject, cursorPos, fontSize, lineHeight, hSpace, alignX);
        }
        this.ctx.restore();

        // Ensure we suppress unused zoom warning
        void zoom;
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

    private drawMaterialBounds(width: number, height: number): void {
        this.ctx.save();
        this.ctx.shadowColor = 'rgba(0,0,0,0.2)';
        this.ctx.shadowBlur = 20;
        this.ctx.shadowOffsetX = 0;
        this.ctx.shadowOffsetY = 10;
        this.ctx.fillStyle = '#ffffff';
        this.ctx.fillRect(0, 0, width, height);
        this.ctx.strokeStyle = '#e5e5e5';
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(0, 0, width, height);
        this.ctx.restore();
    }

    private drawGrid(spacing: number = 40, zoom: number, pan: { x: number; y: number }, materialWidth?: number, materialHeight?: number): void {
        const { width, height } = this.bgCanvas;
        const effectiveMinX = materialWidth !== undefined ? 0 : -pan.x / zoom;
        const effectiveMaxX = materialWidth !== undefined ? materialWidth : (width - pan.x) / zoom;
        const effectiveMinY = materialHeight !== undefined ? 0 : -pan.y / zoom;
        const effectiveMaxY = materialHeight !== undefined ? materialHeight : (height - pan.y) / zoom;

        // Minor grid (1mm) -- only when zoomed in enough to be visible
        const minorScreenPx = MINOR_GRID_SPACING * zoom;
        if (minorScreenPx >= MINOR_GRID_MIN_SCREEN_PX) {
            const minorStep = MINOR_GRID_SPACING;
            this.ctx.strokeStyle = MINOR_GRID_COLOR;
            this.ctx.lineWidth = 0.5 / zoom;
            this.ctx.beginPath();

            const minorStartX = Math.ceil(effectiveMinX / minorStep) * minorStep;
            for (let x = minorStartX; x <= effectiveMaxX; x += minorStep) {
                this.ctx.moveTo(x, effectiveMinY);
                this.ctx.lineTo(x, effectiveMaxY);
            }

            const minorStartY = Math.ceil(effectiveMinY / minorStep) * minorStep;
            for (let y = minorStartY; y <= effectiveMaxY; y += minorStep) {
                this.ctx.moveTo(effectiveMinX, y);
                this.ctx.lineTo(effectiveMaxX, y);
            }

            this.ctx.stroke();
        }

        // Major grid (10mm)
        const step = spacing;
        this.ctx.strokeStyle = DEFAULT_GRID_COLOR;
        this.ctx.lineWidth = DEFAULT_STROKE_WIDTH / zoom;
        this.ctx.beginPath();

        const firstVerticalLine = Math.floor(effectiveMinX / step) * step;
        const loopStartX = firstVerticalLine < effectiveMinX ? firstVerticalLine + step : firstVerticalLine;
        for (let x = loopStartX; x <= effectiveMaxX; x += step) {
            this.ctx.moveTo(x, effectiveMinY);
            this.ctx.lineTo(x, effectiveMaxY);
        }

        const firstHorizontalLine = Math.floor(effectiveMinY / step) * step;
        const loopStartY = firstHorizontalLine < effectiveMinY ? firstHorizontalLine + step : firstHorizontalLine;
        for (let y = loopStartY; y <= effectiveMaxY; y += step) {
            this.ctx.moveTo(effectiveMinX, y);
            this.ctx.lineTo(effectiveMaxX, y);
        }

        this.ctx.stroke();
    }

    private drawGroup(
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
            this.renderShape(child, isSelected, selectedShapes, layers, config, toolType, zoom);
        });
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

        if (shape.fillColor) {
            this.ctx.fillStyle = shape.fillColor;
            this.ctx.fill();
        } else if (layerMode === 'ENGRAVE') {
            this.ctx.fillStyle = layerColor;
            this.ctx.fill();
        } else {
            this.ctx.fillStyle = config.colorFill;
            this.ctx.fill();
        }

        const strokeWidth = shape.strokeWidth !== undefined ? shape.strokeWidth : DEFAULT_STROKE_WIDTH;

        if (isSelected) {
            this.setSelectionStyle(zoom, config.colorSelection);
        } else {
            const strokeColor = shape.strokeColor || layerColor;
            this.ctx.strokeStyle = strokeColor;
            this.ctx.lineWidth = Math.max(strokeWidth, 1 / zoom);
        }
        this.ctx.stroke();
        this.ctx.setLineDash([]);
    }

    drawNodeOverlay(selectedShapes: IShape[], selectedNodeIndices: number[], selectedSegmentIndices: number[], hoveredNodeIndex: number, hoveredSegmentIndex: number, zoom: number, config: RendererConfig): void {
        const skeletonWidth = NODE_SKELETON_WIDTH / zoom;
        const handleCircleRadius = NODE_HANDLE_CIRCLE_RADIUS / zoom;
        const lineWidth = DEFAULT_GRID_LINE_WIDTH / zoom;
        const nodeRadius = NODE_CIRCLE_RADIUS / zoom;
        const hoverRingRadius = (NODE_CIRCLE_RADIUS + NODE_HOVER_RING_OFFSET) / zoom;

        selectedShapes.forEach(shape => {
            if (!shape.nodes || shape.nodes.length < 2) return;

            // Path skeleton
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

            // Hovered segment highlight
            if (hoveredSegmentIndex >= 0 && hoveredSegmentIndex < shape.nodes.length) {
                const segEnd = shape.closed || hoveredSegmentIndex < shape.nodes.length - 1;
                if (segEnd) {
                    const n0 = shape.nodes[hoveredSegmentIndex];
                    const n1 = shape.nodes[(hoveredSegmentIndex + 1) % shape.nodes.length];
                    this.ctx.beginPath();
                    this.ctx.moveTo(n0.x, n0.y);
                    this.ctx.bezierCurveTo(n0.cpOut.x, n0.cpOut.y, n1.cpIn.x, n1.cpIn.y, n1.x, n1.y);
                    this.ctx.strokeStyle = SEGMENT_HOVER_COLOR;
                    this.ctx.lineWidth = SEGMENT_HOVER_WIDTH / zoom;
                    this.ctx.stroke();
                }
            }

            const indicesSet = new Set(selectedNodeIndices);
            const selSegSet = new Set(selectedSegmentIndices);

            // Selected segments
            selSegSet.forEach(segIdx => {
                if (segIdx < 0 || segIdx >= shape.nodes.length) return;
                if (segIdx === shape.nodes.length - 1 && !shape.closed) return;
                const n0 = shape.nodes[segIdx];
                const n1 = shape.nodes[(segIdx + 1) % shape.nodes.length];
                this.ctx.beginPath();
                this.ctx.moveTo(n0.x, n0.y);
                this.ctx.bezierCurveTo(n0.cpOut.x, n0.cpOut.y, n1.cpIn.x, n1.cpIn.y, n1.x, n1.y);
                this.ctx.strokeStyle = SEGMENT_SELECTED_COLOR;
                this.ctx.lineWidth = SEGMENT_HOVER_WIDTH / zoom;
                this.ctx.stroke();
            });

            // Control handles (only for selected nodes)
            shape.nodes.forEach((n: PathNode, i: number) => {
                if (indicesSet.has(i)) {
                    const isAtAnchor = (p: Point) => Math.abs(p.x - n.x) < POINT_EQUALITY_THRESHOLD && Math.abs(p.y - n.y) < POINT_EQUALITY_THRESHOLD;

                    this.ctx.strokeStyle = NODE_HANDLE_LINE_COLOR;
                    this.ctx.lineWidth = lineWidth;

                    if (!isAtAnchor(n.cpIn)) {
                        this.ctx.beginPath();
                        this.ctx.moveTo(n.x, n.y);
                        this.ctx.lineTo(n.cpIn.x, n.cpIn.y);
                        this.ctx.stroke();
                        this.drawCircle(n.cpIn.x, n.cpIn.y, handleCircleRadius, config.colorHandle);
                    }

                    if (!isAtAnchor(n.cpOut)) {
                        this.ctx.beginPath();
                        this.ctx.moveTo(n.x, n.y);
                        this.ctx.lineTo(n.cpOut.x, n.cpOut.y);
                        this.ctx.stroke();
                        this.drawCircle(n.cpOut.x, n.cpOut.y, handleCircleRadius, config.colorHandle);
                    }
                }
            });

            // Node circles
            shape.nodes.forEach((n: PathNode, i: number) => {
                const isSelected = indicesSet.has(i);
                const isHovered = !isSelected && i === hoveredNodeIndex;

                // Hover ring (outer circle, only when not selected)
                if (isHovered) {
                    this.ctx.beginPath();
                    this.ctx.arc(n.x, n.y, hoverRingRadius, 0, Math.PI * 2);
                    this.ctx.strokeStyle = NODE_HOVER_RING_COLOR;
                    this.ctx.lineWidth = 1.5 / zoom;
                    this.ctx.stroke();
                }

                // Node circle
                this.ctx.beginPath();
                this.ctx.arc(n.x, n.y, nodeRadius, 0, Math.PI * 2);
                this.ctx.lineWidth = lineWidth;

                if (isSelected) {
                    this.ctx.fillStyle = NODE_SELECTED_FILL;
                    this.ctx.strokeStyle = NODE_SELECTED_STROKE;
                    this.ctx.fill();
                } else {
                    this.ctx.fillStyle = NODE_CIRCLE_FILL;
                    this.ctx.strokeStyle = NODE_CIRCLE_STROKE;
                    this.ctx.fill();
                }
                this.ctx.stroke();
            });
        });
    }

    private setSelectionStyle(zoom: number, color: string): void {
        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = DEFAULT_STROKE_WIDTH / zoom;
        this.ctx.setLineDash(SELECTION_DASH_PATTERN.map(v => v / zoom));
        this.ctx.lineDashOffset = -this.lineDashOffset / zoom;
    }

    updateDashAnimation(deltaTime: number): void {
        this.lineDashOffset += (SELECTION_DASH_SPEED * deltaTime) / 1000;
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

        const handleX = bounds.cx;
        const handleY = bounds.minY - rotationHandleOffset;

        this.ctx.beginPath();
        this.ctx.moveTo(bounds.cx, bounds.minY);
        this.ctx.lineTo(handleX, handleY);
        this.ctx.strokeStyle = config.colorSelection;
        this.ctx.lineWidth = lineWidth;
        this.ctx.stroke();

        this.drawCircle(handleX, handleY, handleRadius, config.colorSelection);

        this.ctx.fillStyle = config.colorAnchor;
        const handles = [
            { x: bounds.minX, y: bounds.minY },
            { x: bounds.cx, y: bounds.minY },
            { x: bounds.maxX, y: bounds.minY },
            { x: bounds.maxX, y: bounds.cy },
            { x: bounds.maxX, y: bounds.maxY },
            { x: bounds.cx, y: bounds.maxY },
            { x: bounds.minX, y: bounds.maxY },
            { x: bounds.minX, y: bounds.cy }
        ];
        handles.forEach(h => {
            this.ctx.fillRect(h.x - anchorSize / 2, h.y - anchorSize / 2, anchorSize, anchorSize);
        });
    }

    private drawCircle(x: number, y: number, r: number, color: string): void {
        this.ctx.beginPath();
        this.ctx.arc(x, y, r, 0, Math.PI * 2);
        this.ctx.fillStyle = color;
        this.ctx.fill();
    }

    private drawPenPreview(activePath: IShape, previewPoint: { x: number; y: number }, zoom: number, origin: { x: number; y: number } | null = null): void {
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

        this.drawDistanceHelper(startPoint, previewPoint, zoom);
    }

    private drawDistanceHelper(
        from: { x: number; y: number },
        to: { x: number; y: number },
        zoom: number
    ): void {
        drawDistanceHelper(this.ctx, from, to, zoom);
    }

    private drawSelectionBox(box: SelectionBox): void {
        this.ctx.fillStyle = box.style.fill;
        this.ctx.strokeStyle = box.style.stroke;
        this.ctx.lineWidth = DEFAULT_GRID_LINE_WIDTH;
        this.ctx.fillRect(box.x, box.y, box.width, box.height);
        this.ctx.strokeRect(box.x, box.y, box.width, box.height);
    }

    private drawText(textObject: TextRenderData, isSelected: boolean, config: RendererConfig, layerColor: string, layerMode: OperationMode, zoom: number): void {
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
                ? lines.reduce((max, l) => Math.max(max, textObject.measureLineWidth!(l)), 0)
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

        // On content layer, suppress selection styling (overlay handles it)
        void isSelected;
        void config;
        void zoom;
    }

    private drawTextCursor(
        textObject: TextRenderData,
        cursorPos: number,
        fontSize: number,
        lineHeight: number,
        hSpace: number,
        alignX: 'left' | 'center' | 'right'
    ): void {
        const displayText = textObject.getDisplayText
            ? textObject.getDisplayText()
            : (textObject.text || '');
        const lines = displayText.split('\n');

        let remaining = cursorPos;
        let cursorLine = 0;
        let cursorCol = 0;
        for (let i = 0; i < lines.length; i++) {
            if (remaining <= lines[i]!.length) {
                cursorLine = i;
                cursorCol = remaining;
                break;
            }
            remaining -= lines[i]!.length + 1;
            if (i === lines.length - 1) {
                cursorLine = i;
                cursorCol = lines[i]!.length;
            }
        }

        const line = lines[cursorLine] || '';
        const textBeforeCursor = line.substring(0, cursorCol);

        const totalWidth = textObject.measureLineWidth
            ? lines.reduce((max, l) => Math.max(max, textObject.measureLineWidth!(l)), 0)
            : undefined;

        let lineXOffset = 0;
        if (totalWidth !== undefined && alignX !== 'left') {
            const lineW = textObject.measureLineWidth!(line);
            if (alignX === 'center') lineXOffset = (totalWidth - lineW) / 2;
            else if (alignX === 'right') lineXOffset = totalWidth - lineW;
        }

        let cursorX: number;
        if (hSpace === 0) {
            cursorX = lineXOffset + this.ctx.measureText(textBeforeCursor).width;
        } else {
            const extraPerChar = fontSize * (hSpace / 100);
            let cx = lineXOffset;
            for (const char of textBeforeCursor) {
                cx += this.ctx.measureText(char).width + extraPerChar;
            }
            cursorX = cx;
        }

        const alignY = textObject.alignY || 'top';
        let blockYOffset = 0;
        const totalHeight = lines.length * lineHeight;
        if (alignY === 'middle') blockYOffset = -totalHeight / 2;
        else if (alignY === 'bottom') blockYOffset = -totalHeight;

        const cursorY = blockYOffset + cursorLine * lineHeight;
        const cursorHeight = fontSize;

        this.ctx.save();
        this.ctx.strokeStyle = '#2563eb';
        this.ctx.lineWidth = 1.5;
        this.ctx.setLineDash([]);
        this.ctx.beginPath();
        this.ctx.moveTo(cursorX, cursorY - cursorHeight * 0.8);
        this.ctx.lineTo(cursorX, cursorY + cursorHeight * 0.2);
        this.ctx.stroke();
        this.ctx.restore();
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

        const radius = Math.abs(totalArcLen / (bend * 0.01));
        const sign = bend > 0 ? 1 : -1;

        const totalAngle = totalArcLen / radius;
        let currentAngle = -totalAngle / 2;

        const xShift = totalArcLen / 2;

        const chars = [...line];
        for (let i = 0; i < chars.length; i++) {
            const charWidth = charWidths[i] ?? 0;
            const halfAngle = (charWidth / 2) / radius;
            currentAngle += halfAngle;

            const cx = radius * Math.sin(currentAngle) + xShift;
            const cy = sign * radius * (Math.cos(currentAngle) - 1);
            const charRotation = -sign * currentAngle;

            this.ctx.save();
            this.ctx.translate(cx, cy);
            this.ctx.rotate(charRotation);

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
        this.ctx = this.overlayCtx;
        const MARKER_SIZE = 10 / zoom;
        const LINE_WIDTH = 2 / zoom;
        const COLOR = '#FF00FF';

        this.ctx.save();
        this.ctx.translate(pan.x, pan.y);
        this.ctx.scale(zoom, zoom);

        this.ctx.strokeStyle = COLOR;
        this.ctx.lineWidth = LINE_WIDTH;
        this.ctx.fillStyle = 'rgba(255, 0, 255, 0.2)';

        const { x, y } = snap.point;

        this.ctx.beginPath();

        switch (snap.type) {
            case 'endpoint':
                this.ctx.strokeRect(x - MARKER_SIZE / 2, y - MARKER_SIZE / 2, MARKER_SIZE, MARKER_SIZE);
                break;
            case 'midpoint':
                this.ctx.moveTo(x, y - MARKER_SIZE / 2);
                this.ctx.lineTo(x + MARKER_SIZE / 2, y + MARKER_SIZE / 2);
                this.ctx.lineTo(x - MARKER_SIZE / 2, y + MARKER_SIZE / 2);
                this.ctx.closePath();
                this.ctx.stroke();
                break;
            case 'center':
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
