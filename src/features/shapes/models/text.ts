
import { Geometry, Point } from '../../../core/math/geometry';
import { TEXT_LINE_HEIGHT_MULTIPLIER } from '../../../config/constants';
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
    hSpace?: number;
    vSpace?: number;
    alignX?: 'left' | 'center' | 'right';
    alignY?: 'top' | 'middle' | 'bottom';
    upperCase?: boolean;
    bend?: number;
    distort?: boolean;
    pathId?: string | null;
    weld?: boolean;
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
    hSpace: number;
    vSpace: number;
    alignX: 'left' | 'center' | 'right';
    alignY: 'top' | 'middle' | 'bottom';
    upperCase: boolean;
    bend: number;
    distort: boolean;
    pathId: string | null;
    weld: boolean;
    type: string;
    closed: boolean = false;
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
        this.rotation = style.rotation || 0;
        this.scaleX = style.scaleX || 1;
        this.scaleY = style.scaleY || 1;
        this.hSpace = style.hSpace || 0;
        this.vSpace = style.vSpace || 0;
        this.alignX = style.alignX || 'left';
        this.alignY = style.alignY || 'top';
        this.upperCase = style.upperCase || false;
        this.bend = style.bend || 0;
        this.distort = style.distort || false;
        this.pathId = style.pathId || null;
        this.weld = style.weld || false;
        this.type = 'text';
    }

    getDisplayText(): string {
        return this.upperCase ? this.text.toUpperCase() : this.text;
    }

    getLineHeight(): number {
        return this.fontSize * TEXT_LINE_HEIGHT_MULTIPLIER * (1 + this.vSpace / 100);
    }

    measureLineWidth(line: string): number {
        const baseWidth = TextMeasurer.measure(line, this.fontSize, this.fontFamily, this.fontWeight, this.fontStyle);
        if (this.hSpace === 0 || line.length <= 1) return baseWidth;
        const extraPerChar = this.fontSize * (this.hSpace / 100);
        return baseWidth + extraPerChar * (line.length - 1);
    }

    getBounds(): Bounds {
        let maxWidth = 0;
        const displayText = this.getDisplayText();
        const lines = displayText.split('\n');
        const lineHeight = this.getLineHeight();
        const height = lines.length * lineHeight;

        lines.forEach(line => {
            const width = this.measureLineWidth(line);
            if (width > maxWidth) maxWidth = width;
        });

        const w = maxWidth * Math.abs(this.scaleX);
        const h = height * Math.abs(this.scaleY);

        let corners: { x: number; y: number }[];

        if (this.bend !== 0) {
            corners = this.computeBentCorners(w, h);
        } else {
            const left = 0;
            const right = w;
            const top = -this.fontSize * this.scaleY;
            const bottom = -this.fontSize * this.scaleY + h;
            corners = [
                { x: left, y: top },
                { x: right, y: top },
                { x: right, y: bottom },
                { x: left, y: bottom }
            ];
        }

        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

        corners.forEach(p => {
            const rotated = Geometry.rotatePoint(p, { x: 0, y: 0 }, this.rotation);
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

    private computeBentCorners(w: number, h: number): { x: number; y: number }[] {
        const totalArcLen = w;
        const radius = Math.abs(totalArcLen / (this.bend * 0.01));
        const sign = this.bend > 0 ? 1 : -1;
        const totalAngle = totalArcLen / radius;
        const xShift = totalArcLen / 2;

        // Sample character positions along the arc to find extremes
        const numSamples = 10;
        let arcMinX = Infinity, arcMaxX = -Infinity;
        let arcMinY = Infinity, arcMaxY = -Infinity;

        for (let i = 0; i <= numSamples; i++) {
            const t = i / numSamples;
            const angle = -totalAngle / 2 + t * totalAngle;
            const cx = radius * Math.sin(angle) + xShift;
            const cy = sign * radius * (Math.cos(angle) - 1);

            arcMinX = Math.min(arcMinX, cx);
            arcMaxX = Math.max(arcMaxX, cx);
            arcMinY = Math.min(arcMinY, cy);
            arcMaxY = Math.max(arcMaxY, cy);
        }

        // Add font ascent/descent padding
        const ascent = this.fontSize * 0.8;
        const descent = this.fontSize * 0.2;
        const top = arcMinY - ascent;
        const bottom = arcMaxY + descent;

        return [
            { x: arcMinX, y: top },
            { x: arcMaxX, y: top },
            { x: arcMaxX, y: bottom },
            { x: arcMinX, y: bottom }
        ];
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
            scaleY: this.scaleY,
            hSpace: this.hSpace,
            vSpace: this.vSpace,
            alignX: this.alignX,
            alignY: this.alignY,
            upperCase: this.upperCase,
            bend: this.bend,
            distort: this.distort,
            pathId: this.pathId,
            weld: this.weld
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
            scaleY: this.scaleY,
            hSpace: this.hSpace,
            vSpace: this.vSpace,
            alignX: this.alignX,
            alignY: this.alignY,
            upperCase: this.upperCase,
            bend: this.bend,
            distort: this.distort,
            pathId: this.pathId,
            weld: this.weld
        };
    }

    static fromJSON(json: Record<string, unknown>): TextObject {
        return new TextObject(json.x as number, json.y as number, json.text as string, {
            fontSize: json.fontSize as number | undefined,
            fontFamily: json.fontFamily as string | undefined,
            fontWeight: json.fontWeight as string | undefined,
            fontStyle: json.fontStyle as string | undefined,
            fillColor: json.fillColor as string | undefined,
            strokeColor: json.strokeColor as string | undefined,
            strokeWidth: json.strokeWidth as number | undefined,
            rotation: json.rotation as number | undefined,
            scaleX: json.scaleX as number | undefined,
            scaleY: json.scaleY as number | undefined,
            hSpace: json.hSpace as number | undefined,
            vSpace: json.vSpace as number | undefined,
            alignX: json.alignX as 'left' | 'center' | 'right' | undefined,
            alignY: json.alignY as 'top' | 'middle' | 'bottom' | undefined,
            upperCase: json.upperCase as boolean | undefined,
            bend: json.bend as number | undefined,
            distort: json.distort as boolean | undefined,
            pathId: json.pathId as string | null | undefined,
            weld: json.weld as boolean | undefined
        }, (json.layerId as string) || 'layer-1');
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
