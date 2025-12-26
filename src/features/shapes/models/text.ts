import { TextMeasurer } from '../../../utils/text-measure';
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

export interface Point {
    x: number;
    y: number;
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

        const cos = Math.cos(this.rotation);
        const sin = Math.sin(this.rotation);

        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

        corners.forEach(p => {
            // Rotate
            const rx = p.x * cos - p.y * sin;
            const ry = p.x * sin + p.y * cos;
            // Translate back to world
            const wx = this.x + rx;
            const wy = this.y + ry;

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
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        const dx = this.x - center.x;
        const dy = this.y - center.y;

        this.x = center.x + dx * cos - dy * sin;
        this.y = center.y + dx * sin + dy * cos;

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

    static fromJSON(json: any): TextObject {
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
