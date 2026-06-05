
import { Geometry, Point } from '../../../core/math/geometry';
import { IShape } from '../types';

export interface TextStyle {
    fontSize?: number;
    fontFamily?: string;
    fontWeight?: string;
    fontStyle?: string;
    fillColor?: string;
    strokeColor?: string;
    strokeWidth?: number;
    rotation?: number;
    scaleX?: number;
    scaleY?: number;
}

export interface Bounds {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
    width: number;
    height: number;
    cx: number;
    cy: number;
}

export class TextObject implements IShape {
    id: string;
    x: number;
    y: number;
    text: string;
    layerId: string;
    fontSize: number;
    fontFamily: string;
    fontWeight: string;
    fontStyle: string;
    rotation: number;
    scaleX: number;
    scaleY: number;
    type: string;
    closed: boolean = false;
    // Legacy properties that might exist but are handled by layers
    fillColor?: string;
    strokeColor?: string;
    strokeWidth?: number;

    constructor(x: number, y: number, text: string = '', style: TextStyle = {}, layerId: string = 'layer-1') {
        this.id = crypto.randomUUID();
        this.x = x;
        this.y = y;
        this.text = text;
        this.layerId = layerId;
        this.fontSize = style.fontSize || 24;
        this.fontFamily = style.fontFamily || 'Arial';
        this.fontWeight = style.fontWeight || 'normal';
        this.fontStyle = style.fontStyle || 'normal';
        // Removed properties handled by layer: fillColor, strokeColor, strokeWidth
        this.rotation = style.rotation || 0;
        this.scaleX = style.scaleX || 1;
        this.scaleY = style.scaleY || 1;
        this.type = 'text';
    }

    getBounds(): Bounds {
        let maxWidth = 0;
        const lines = this.text.split('\n');
        const lineHeight = this.fontSize * 1.2;
        const height = lines.length * lineHeight;

        lines.forEach(line => {
            const width = TextMeasurer.measure(line, this.fontSize, this.fontFamily, this.fontWeight, this.fontStyle);
            if (width > maxWidth) maxWidth = width;
        });

        const w = maxWidth * Math.abs(this.scaleX);
        const h = height * Math.abs(this.scaleY);

        // Previous logic assumed anchor was at baseline left
        // Corners relative to anchor (0,0 in local space)
        // Note: minY = y - fontSize * scaleY implies top is at -fontSize*scaleY relative to anchor y.

        const top = -this.fontSize * this.scaleY;
        const bottom = -this.fontSize * this.scaleY + h;
        const left = 0;
        const right = w;

        const corners = [
            { x: left, y: top },
            { x: right, y: top },
            { x: right, y: bottom },
            { x: left, y: bottom }
        ];

        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

        corners.forEach(p => {
            // Corners are relative to anchor (0,0) before rotation.
            // But TextObject position (this.x, this.y) is the anchor in world space.
            // Rotated point relative to anchor:
            const rotated = Geometry.rotatePoint(p, { x: 0, y: 0 }, this.rotation);
            // Translate to world
            const wx = this.x + rotated.x;
            const wy = this.y + rotated.y;

            minX = Math.min(minX, wx);
            minY = Math.min(minY, wy);
            maxX = Math.max(maxX, wx);
            maxY = Math.max(maxY, wy);
        });

        return {
            minX,
            minY,
            maxX,
            maxY,
            width: maxX - minX,
            height: maxY - minY,
            cx: (minX + maxX) / 2,
            cy: (minY + maxY) / 2
        };
    }

    move(dx: number, dy: number): void {
        this.x += dx;
        this.y += dy;
    }

    rotate(angle: number, center: Point): void {
        // Rotate position
        const p = Geometry.rotatePoint({ x: this.x, y: this.y }, center, angle);
        this.x = p.x;
        this.y = p.y;

        // Update rotation angle
        this.rotation += angle;
    }

    scale(sx: number, sy: number, center: Point): void {
        const isUniform = Math.abs(Math.abs(sx) - Math.abs(sy)) < 0.001;

        if (isUniform) {
            // Apply to fontSize
            this.fontSize *= Math.abs(sx);

            // Handle flips
            if (sx < 0) this.scaleX *= -1;
            if (sy < 0) this.scaleY *= -1;
        } else {
            this.scaleX *= sx;
            this.scaleY *= sy;
        }

        this.x = center.x + (this.x - center.x) * sx;
        this.y = center.y + (this.y - center.y) * sy;
    }

    clone(): TextObject {
        return new TextObject(this.x, this.y, this.text, {
            fontSize: this.fontSize,
            fontFamily: this.fontFamily,
            fontWeight: this.fontWeight,
            fontStyle: this.fontStyle,
            fillColor: this.fillColor,
            strokeColor: this.strokeColor,
            strokeWidth: this.strokeWidth,
            rotation: this.rotation,
            scaleX: this.scaleX,
            scaleY: this.scaleY
        }, this.layerId);
    }

    toJSON(): Record<string, unknown> {
        return {
            id: this.id,
            type: this.type,
            x: this.x,
            y: this.y,
            text: this.text,
            layerId: this.layerId,
            fontSize: this.fontSize,
            fontFamily: this.fontFamily,
            fontWeight: this.fontWeight,
            fontStyle: this.fontStyle,
            fillColor: this.fillColor,
            strokeColor: this.strokeColor,
            strokeWidth: this.strokeWidth,
            rotation: this.rotation,
            scaleX: this.scaleX,
            scaleY: this.scaleY
        };
    }

    static fromJSON(json: Record<string, unknown>): TextObject {
        return new TextObject(json.x, json.y, json.text, {
            fontSize: json.fontSize,
            fontFamily: json.fontFamily,
            fontWeight: json.fontWeight,
            fontStyle: json.fontStyle,
            fillColor: json.fillColor,
            strokeColor: json.strokeColor,
            strokeWidth: json.strokeWidth,
            rotation: json.rotation,
            scaleX: json.scaleX,
            scaleY: json.scaleY
        }, json.layerId || 'layer-1');
    }
}

/**
 * Internal helper for measuring text dimensions using an off-screen canvas.
 */
class TextMeasurer {
    private static canvas: HTMLCanvasElement | null = null;
    private static ctx: CanvasRenderingContext2D | null = null;

    static measure(
        text: string,
        fontSize: number,
        fontFamily: string,
        fontWeight: string = 'normal',
        fontStyle: string = 'normal'
    ): number {
        if (!this.canvas) {
            this.canvas = document.createElement('canvas');
            this.ctx = this.canvas.getContext('2d');
        }

        if (this.ctx) {
            this.ctx.font = `${fontStyle} ${fontWeight} ${fontSize}px ${fontFamily}`;
            const metrics = this.ctx.measureText(text);
            return metrics.width;
        }

        // Fallback if context is not available
        return text.length * (fontSize * 0.6);
    }
}
