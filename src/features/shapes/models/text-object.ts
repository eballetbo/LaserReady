import { TextMeasurer } from '../../../utils/text-measurer';

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

export class TextObject {
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
    // Legacy properties that might exist but are handled by layers
    fillColor?: string;
    strokeColor?: string;
    strokeWidth?: number;

    constructor(x: number, y: number, text: string = '', style: TextStyle = {}, layerId: string = 'layer-1') {
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

        return {
            minX: this.x,
            minY: this.y - this.fontSize * this.scaleY,
            maxX: this.x + w,
            maxY: this.y - this.fontSize * this.scaleY + h,
            width: w,
            height: h,
            cx: this.x + w / 2,
            cy: this.y - this.fontSize * this.scaleY + h / 2
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
        this.scaleX *= sx;
        this.scaleY *= sy;

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
